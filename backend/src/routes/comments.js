const express = require('express');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { auditLog } = require('../middleware/audit');
const { parseMentions } = require('../utils/mentions');
const { notifyMentions, notifyCommentAdded, broadcastToProject } = require('../services/notificationService');

const router = express.Router();

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

// Get comments for a task
router.get('/task/:taskId', authenticate, async (req, res, next) => {
  try {
    const task = await checkTaskAccess(req.params.taskId, req.userId);
    if (!task) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const [comments] = await db.query(
      `SELECT c.*, u.name as author_name, u.email as author_email
       FROM task_comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.task_id = ?
       ORDER BY c.created_at ASC`,
      [req.params.taskId]
    );

    res.json({ comments });
  } catch (error) {
    next(error);
  }
});

// Add comment to task
router.post('/task/:taskId', authenticate, auditLog('comment'), async (req, res, next) => {
  try {
    const { content } = req.body;
    const taskId = req.params.taskId;

    if (!content) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    const task = await checkTaskAccess(taskId, req.userId);
    if (!task) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Create comment
    const [result] = await db.query(
      'INSERT INTO task_comments (task_id, user_id, content, created_at) VALUES (?, ?, ?, NOW())',
      [taskId, req.userId, content]
    );

    const commentId = result.insertId;

    // Get assigned users to notify
    const [assignedUsers] = await db.query(
      'SELECT user_id FROM task_assignments WHERE task_id = ?',
      [taskId]
    );
    const assignedUserIds = assignedUsers.map(a => a.user_id);

    // Notify assigned users about new comment
    await notifyCommentAdded(assignedUserIds, req.userId, {
      task_id: parseInt(taskId),
      task_title: task.title,
      comment_id: commentId,
      project_id: task.project_id
    });

    // Parse and notify mentions
    const mentionedUserIds = await parseMentions(content);
    if (mentionedUserIds.length > 0) {
      await notifyMentions(mentionedUserIds, req.userId, {
        task_id: parseInt(taskId),
        task_title: task.title,
        comment_id: commentId,
        project_id: task.project_id,
        context: 'comment'
      });
    }

    // Broadcast to project
    broadcastToProject(task.project_id, {
      type: 'comment_added',
      taskId: parseInt(taskId),
      comment: {
        id: commentId,
        content,
        user_id: req.userId,
        author_name: req.user.name
      }
    }, req.userId);

    res.status(201).json({
      id: commentId,
      task_id: parseInt(taskId),
      user_id: req.userId,
      author_name: req.user.name,
      content,
      created_at: new Date()
    });
  } catch (error) {
    next(error);
  }
});

// Update comment
router.put('/:id', authenticate, auditLog('comment'), async (req, res, next) => {
  try {
    const { content } = req.body;
    const commentId = req.params.id;

    if (!content) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    // Check if user owns the comment
    const [comments] = await db.query(
      'SELECT * FROM task_comments WHERE id = ? AND user_id = ?',
      [commentId, req.userId]
    );

    if (comments.length === 0) {
      return res.status(404).json({ error: 'Comment not found or not authorized' });
    }

    await db.query(
      'UPDATE task_comments SET content = ?, updated_at = NOW() WHERE id = ?',
      [content, commentId]
    );

    res.json({ id: parseInt(commentId), content });
  } catch (error) {
    next(error);
  }
});

// Delete comment
router.delete('/:id', authenticate, auditLog('comment'), async (req, res, next) => {
  try {
    const commentId = req.params.id;

    // Check if user owns the comment or is admin
    const [comments] = await db.query(
      'SELECT * FROM task_comments WHERE id = ?',
      [commentId]
    );

    if (comments.length === 0) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (comments[0].user_id !== req.userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this comment' });
    }

    await db.query('DELETE FROM task_comments WHERE id = ?', [commentId]);

    res.json({ message: 'Comment deleted' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

