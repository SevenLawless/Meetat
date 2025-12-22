const express = require('express');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { auditLog } = require('../middleware/audit');
const { parseMentions } = require('../utils/mentions');
const { 
  notifyMentions, 
  notifyAssignment, 
  notifyUnassignment, 
  notifyStatusChange,
  notifyTaskDeleted,
  broadcastToProject
} = require('../services/notificationService');
const upload = require('../middleware/upload');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Helper to check project access via mission
const checkMissionAccess = async (missionId, userId) => {
  const [missions] = await db.query(
    `SELECT m.*, pm.user_id
     FROM missions m
     JOIN project_members pm ON m.project_id = pm.project_id
     WHERE m.id = ? AND pm.user_id = ?`,
    [missionId, userId]
  );
  return missions.length > 0 ? missions[0] : null;
};

// Helper to check task access
const checkTaskAccess = async (taskId, userId) => {
  const [tasks] = await db.query(
    `SELECT t.*, m.project_id
     FROM tasks t
     JOIN missions m ON t.mission_id = m.id
     JOIN project_members pm ON m.project_id = pm.project_id
     WHERE t.id = ? AND pm.user_id = ?`,
    [taskId, userId]
  );
  return tasks.length > 0 ? tasks[0] : null;
};

// Get tasks for a mission
router.get('/mission/:missionId', authenticate, async (req, res, next) => {
  try {
    const mission = await checkMissionAccess(req.params.missionId, req.userId);
    if (!mission) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const [tasks] = await db.query(
      `SELECT t.*,
        IFNULL(
          (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', u.id, 'name', u.name, 'email', u.email))
           FROM task_assignments ta JOIN users u ON ta.user_id = u.id WHERE ta.task_id = t.id),
          CAST('[]' AS JSON)
        ) as assigned_users,
        IFNULL(
          (SELECT JSON_ARRAYAGG(tt.name) FROM task_tags tt WHERE tt.task_id = t.id),
          CAST('[]' AS JSON)
        ) as tags,
        (SELECT COUNT(*) FROM task_comments WHERE task_id = t.id) as comment_count,
        (SELECT COUNT(*) FROM task_attachments WHERE task_id = t.id) as attachment_count
       FROM tasks t
       WHERE t.mission_id = ?
       ORDER BY t.created_at DESC`,
      [req.params.missionId]
    );

    // Parse JSON fields - handle null/empty cases
    const parsedTasks = tasks.map(t => {
      try {
        return {
          ...t,
          assigned_users: t.assigned_users && t.assigned_users !== 'null' 
            ? (typeof t.assigned_users === 'string' ? JSON.parse(t.assigned_users) : t.assigned_users)
            : [],
          tags: t.tags && t.tags !== 'null'
            ? (typeof t.tags === 'string' ? JSON.parse(t.tags) : t.tags)
            : []
        };
      } catch (parseError) {
        console.error('Error parsing task JSON:', parseError, 'Task:', t.id);
        return {
          ...t,
          assigned_users: [],
          tags: []
        };
      }
    });

    res.json({ tasks: parsedTasks });
  } catch (error) {
    next(error);
  }
});

// Get single task with all details
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const task = await checkTaskAccess(req.params.id, req.userId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found or access denied' });
    }

    // Get assigned users
    const [assignedUsers] = await db.query(
      `SELECT u.id, u.name, u.email
       FROM users u
       JOIN task_assignments ta ON u.id = ta.user_id
       WHERE ta.task_id = ?`,
      [req.params.id]
    );

    // Get tags
    const [tags] = await db.query('SELECT name FROM task_tags WHERE task_id = ?', [req.params.id]);

    // Get comments
    const [comments] = await db.query(
      `SELECT c.*, u.name as author_name
       FROM task_comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.task_id = ?
       ORDER BY c.created_at ASC`,
      [req.params.id]
    );

    // Get attachments
    const [attachments] = await db.query(
      'SELECT id, filename, original_name, mimetype, size, created_at FROM task_attachments WHERE task_id = ?',
      [req.params.id]
    );

    res.json({
      task: {
        ...task,
        assigned_users: assignedUsers,
        tags: tags.map(t => t.name),
        comments,
        attachments
      }
    });
  } catch (error) {
    next(error);
  }
});

// Create task
router.post('/', authenticate, auditLog('task'), async (req, res, next) => {
  try {
    const { mission_id, title, description, status, priority, due_date, assigned_users, tags } = req.body;

    if (!mission_id || !title) {
      return res.status(400).json({ error: 'Mission ID and title are required' });
    }

    const mission = await checkMissionAccess(mission_id, req.userId);
    if (!mission) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Create task
    const [result] = await db.query(
      `INSERT INTO tasks (mission_id, title, description, status, priority, due_date, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        mission_id,
        title,
        description || null,
        status || 'todo',
        priority || 'medium',
        due_date || null
      ]
    );

    const taskId = result.insertId;

    // Add assignments
    if (assigned_users && assigned_users.length > 0) {
      for (const userId of assigned_users) {
        await db.query(
          'INSERT INTO task_assignments (task_id, user_id) VALUES (?, ?)',
          [taskId, userId]
        );
        
        // Notify assigned user
        await notifyAssignment(userId, req.userId, {
          task_id: taskId,
          task_title: title,
          project_id: mission.project_id
        });
      }
    }

    // Add tags
    if (tags && tags.length > 0) {
      for (const tag of tags) {
        await db.query(
          'INSERT INTO task_tags (task_id, name) VALUES (?, ?)',
          [taskId, tag]
        );
      }
    }

    // Parse mentions in description
    if (description) {
      const mentionedUserIds = await parseMentions(description);
      if (mentionedUserIds.length > 0) {
        await notifyMentions(mentionedUserIds, req.userId, {
          task_id: taskId,
          task_title: title,
          project_id: mission.project_id,
          context: 'task_description'
        });
      }
    }

    // Broadcast to project
    broadcastToProject(mission.project_id, {
      type: 'task_created',
      task: { id: taskId, title, mission_id, status: status || 'todo' }
    }, req.userId);

    res.status(201).json({
      id: taskId,
      mission_id,
      title,
      description,
      status: status || 'todo',
      priority: priority || 'medium',
      due_date,
      assigned_users: assigned_users || [],
      tags: tags || []
    });
  } catch (error) {
    next(error);
  }
});

// Update task
router.put('/:id', authenticate, auditLog('task'), async (req, res, next) => {
  try {
    const { title, description, status, priority, due_date, assigned_users, tags } = req.body;
    const taskId = req.params.id;

    const task = await checkTaskAccess(taskId, req.userId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found or access denied' });
    }

    const oldStatus = task.status;

    // Update task - convert empty string to null for due_date
    const dueDateValue = due_date !== undefined 
      ? (due_date === '' || due_date === null ? null : due_date) 
      : task.due_date;

    await db.query(
      `UPDATE tasks SET title = ?, description = ?, status = ?, priority = ?, due_date = ?, updated_at = NOW()
       WHERE id = ?`,
      [
        title || task.title,
        description !== undefined ? description : task.description,
        status || task.status,
        priority || task.priority,
        dueDateValue,
        taskId
      ]
    );

    // Handle assignment changes
    if (assigned_users !== undefined) {
      // Get current assignments
      const [currentAssignments] = await db.query(
        'SELECT user_id FROM task_assignments WHERE task_id = ?',
        [taskId]
      );
      const currentUserIds = currentAssignments.map(a => a.user_id);

      // Find new and removed assignments
      const newAssignments = assigned_users.filter(id => !currentUserIds.includes(id));
      const removedAssignments = currentUserIds.filter(id => !assigned_users.includes(id));

      // Remove old assignments
      if (removedAssignments.length > 0) {
        await db.query(
          `DELETE FROM task_assignments WHERE task_id = ? AND user_id IN (${removedAssignments.map(() => '?').join(',')})`,
          [taskId, ...removedAssignments]
        );
        
        for (const userId of removedAssignments) {
          await notifyUnassignment(userId, req.userId, {
            task_id: parseInt(taskId),
            task_title: title || task.title,
            project_id: task.project_id
          });
        }
      }

      // Add new assignments
      for (const userId of newAssignments) {
        await db.query('INSERT INTO task_assignments (task_id, user_id) VALUES (?, ?)', [taskId, userId]);
        await notifyAssignment(userId, req.userId, {
          task_id: parseInt(taskId),
          task_title: title || task.title,
          project_id: task.project_id
        });
      }
    }

    // Handle tag changes
    if (tags !== undefined) {
      await db.query('DELETE FROM task_tags WHERE task_id = ?', [taskId]);
      for (const tag of tags) {
        await db.query('INSERT INTO task_tags (task_id, name) VALUES (?, ?)', [taskId, tag]);
      }
    }

    // Notify on status change
    if (status && status !== oldStatus) {
      const [assignedUsers] = await db.query(
        'SELECT user_id FROM task_assignments WHERE task_id = ?',
        [taskId]
      );
      const userIds = assignedUsers.map(a => a.user_id);

      await notifyStatusChange(userIds, req.userId, {
        task_id: parseInt(taskId),
        task_title: title || task.title,
        old_status: oldStatus,
        new_status: status,
        project_id: task.project_id
      });
    }

    // Fetch complete updated task with all relationships for broadcast
    const [updatedTasks] = await db.query(
      `SELECT t.*,
        IFNULL(
          (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', u.id, 'name', u.name, 'email', u.email))
           FROM task_assignments ta JOIN users u ON ta.user_id = u.id WHERE ta.task_id = t.id),
          CAST('[]' AS JSON)
        ) as assigned_users,
        IFNULL(
          (SELECT JSON_ARRAYAGG(tt.name) FROM task_tags tt WHERE tt.task_id = t.id),
          CAST('[]' AS JSON)
        ) as tags,
        (SELECT COUNT(*) FROM task_comments WHERE task_id = t.id) as comment_count,
        (SELECT COUNT(*) FROM task_attachments WHERE task_id = t.id) as attachment_count
       FROM tasks t
       WHERE t.id = ?`,
      [taskId]
    );

    if (updatedTasks.length > 0) {
      const updatedTask = updatedTasks[0];
      // Parse JSON fields
      try {
        updatedTask.assigned_users = updatedTask.assigned_users && updatedTask.assigned_users !== 'null' 
          ? (typeof updatedTask.assigned_users === 'string' ? JSON.parse(updatedTask.assigned_users) : updatedTask.assigned_users)
          : [];
        updatedTask.tags = updatedTask.tags && updatedTask.tags !== 'null'
          ? (typeof updatedTask.tags === 'string' ? JSON.parse(updatedTask.tags) : updatedTask.tags)
          : [];
      } catch (parseError) {
        updatedTask.assigned_users = [];
        updatedTask.tags = [];
      }

      // Broadcast complete task to project
      broadcastToProject(task.project_id, {
        type: 'task_updated',
        task: updatedTask,
        mission_id: updatedTask.mission_id
      }, req.userId);
    }

    res.json({ message: 'Task updated', id: parseInt(taskId) });
  } catch (error) {
    next(error);
  }
});

// Delete task
router.delete('/:id', authenticate, auditLog('task'), async (req, res, next) => {
  try {
    const taskId = req.params.id;

    const task = await checkTaskAccess(taskId, req.userId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found or access denied' });
    }

    // Get assigned users for notification
    const [assignedUsers] = await db.query(
      'SELECT user_id FROM task_assignments WHERE task_id = ?',
      [taskId]
    );
    const userIds = assignedUsers.map(a => a.user_id);

    // Delete attachments from filesystem
    const [attachments] = await db.query('SELECT filename FROM task_attachments WHERE task_id = ?', [taskId]);
    for (const att of attachments) {
      const filePath = path.join(__dirname, '../../uploads', att.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Delete related data
    await db.query('DELETE FROM task_attachments WHERE task_id = ?', [taskId]);
    await db.query('DELETE FROM task_comments WHERE task_id = ?', [taskId]);
    await db.query('DELETE FROM task_tags WHERE task_id = ?', [taskId]);
    await db.query('DELETE FROM task_assignments WHERE task_id = ?', [taskId]);
    await db.query('DELETE FROM tasks WHERE id = ?', [taskId]);

    // Notify assigned users
    await notifyTaskDeleted(userIds, req.userId, {
      task_title: task.title,
      project_id: task.project_id
    });

    // Broadcast to project
    broadcastToProject(task.project_id, {
      type: 'task_deleted',
      taskId: parseInt(taskId)
    }, req.userId);

    res.json({ message: 'Task deleted' });
  } catch (error) {
    next(error);
  }
});

// Upload attachment
router.post('/:id/attachments', authenticate, upload.single('file'), async (req, res, next) => {
  try {
    const taskId = req.params.id;

    const task = await checkTaskAccess(taskId, req.userId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found or access denied' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const [result] = await db.query(
      `INSERT INTO task_attachments (task_id, filename, original_name, mimetype, size, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [taskId, req.file.filename, req.file.originalname, req.file.mimetype, req.file.size]
    );

    res.status(201).json({
      id: result.insertId,
      filename: req.file.filename,
      original_name: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });
  } catch (error) {
    next(error);
  }
});

// Delete attachment
router.delete('/:id/attachments/:attachmentId', authenticate, async (req, res, next) => {
  try {
    const { id: taskId, attachmentId } = req.params;

    const task = await checkTaskAccess(taskId, req.userId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found or access denied' });
    }

    const [attachments] = await db.query(
      'SELECT filename FROM task_attachments WHERE id = ? AND task_id = ?',
      [attachmentId, taskId]
    );

    if (attachments.length === 0) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    // Delete file
    const filePath = path.join(__dirname, '../../uploads', attachments[0].filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await db.query('DELETE FROM task_attachments WHERE id = ?', [attachmentId]);

    res.json({ message: 'Attachment deleted' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

