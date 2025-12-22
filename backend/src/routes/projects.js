const express = require('express');
const db = require('../config/database');
const { authenticate, requireProjectMember, requireProjectOwner } = require('../middleware/auth');
const { auditLog } = require('../middleware/audit');
const { notifyProjectInvitation, notifyRoleChange } = require('../services/notificationService');

const router = express.Router();

// Get all projects for current user
router.get('/', authenticate, async (req, res, next) => {
  try {
    const [projects] = await db.query(
      `SELECT p.*, pm.role as member_role,
        (SELECT COUNT(*) FROM missions WHERE project_id = p.id) as mission_count,
        (SELECT COUNT(*) FROM tasks t JOIN missions m ON t.mission_id = m.id WHERE m.project_id = p.id) as task_count
       FROM projects p
       JOIN project_members pm ON p.id = pm.project_id
       WHERE pm.user_id = ?
       ORDER BY p.created_at DESC`,
      [req.userId]
    );

    res.json({ projects });
  } catch (error) {
    next(error);
  }
});

// Get single project
router.get('/:projectId', authenticate, async (req, res, next) => {
  try {
    const [projects] = await db.query(
      `SELECT p.*, pm.role as member_role
       FROM projects p
       JOIN project_members pm ON p.id = pm.project_id
       WHERE p.id = ? AND pm.user_id = ?`,
      [req.params.projectId, req.userId]
    );

    if (projects.length === 0) {
      return res.status(404).json({ error: 'Project not found or access denied' });
    }

    // Get project members
    const [members] = await db.query(
      `SELECT u.id, u.email, u.name, pm.role
       FROM users u
       JOIN project_members pm ON u.id = pm.user_id
       WHERE pm.project_id = ?`,
      [req.params.projectId]
    );

    res.json({ 
      project: { ...projects[0], members } 
    });
  } catch (error) {
    next(error);
  }
});

// Create project
router.post('/', authenticate, auditLog('project'), async (req, res, next) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    // Create project
    const [result] = await db.query(
      'INSERT INTO projects (name, description, owner_id, created_at) VALUES (?, ?, ?, NOW())',
      [name, description || null, req.userId]
    );

    const projectId = result.insertId;

    // Add owner as member
    await db.query(
      'INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)',
      [projectId, req.userId, 'owner']
    );

    res.status(201).json({
      id: projectId,
      name,
      description,
      owner_id: req.userId,
      member_role: 'owner'
    });
  } catch (error) {
    next(error);
  }
});

// Update project
router.put('/:projectId', authenticate, requireProjectOwner, auditLog('project'), async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const projectId = req.params.projectId;

    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    await db.query(
      'UPDATE projects SET name = ?, description = ? WHERE id = ?',
      [name, description || null, projectId]
    );

    res.json({ id: parseInt(projectId), name, description });
  } catch (error) {
    next(error);
  }
});

// Delete project
router.delete('/:projectId', authenticate, requireProjectOwner, auditLog('project'), async (req, res, next) => {
  try {
    const projectId = req.params.projectId;

    // Delete in order: task_attachments, task_comments, task_tags, task_assignments, tasks, missions, project_members, ad_metrics, ad_campaigns, project
    await db.query(`
      DELETE ta FROM task_attachments ta
      JOIN tasks t ON ta.task_id = t.id
      JOIN missions m ON t.mission_id = m.id
      WHERE m.project_id = ?
    `, [projectId]);

    await db.query(`
      DELETE tc FROM task_comments tc
      JOIN tasks t ON tc.task_id = t.id
      JOIN missions m ON t.mission_id = m.id
      WHERE m.project_id = ?
    `, [projectId]);

    await db.query(`
      DELETE tt FROM task_tags tt
      JOIN tasks t ON tt.task_id = t.id
      JOIN missions m ON t.mission_id = m.id
      WHERE m.project_id = ?
    `, [projectId]);

    await db.query(`
      DELETE tas FROM task_assignments tas
      JOIN tasks t ON tas.task_id = t.id
      JOIN missions m ON t.mission_id = m.id
      WHERE m.project_id = ?
    `, [projectId]);

    await db.query(`
      DELETE t FROM tasks t
      JOIN missions m ON t.mission_id = m.id
      WHERE m.project_id = ?
    `, [projectId]);

    await db.query('DELETE FROM missions WHERE project_id = ?', [projectId]);
    await db.query('DELETE FROM project_members WHERE project_id = ?', [projectId]);
    await db.query('DELETE FROM ad_metrics WHERE campaign_id IN (SELECT id FROM ad_campaigns WHERE project_id = ?)', [projectId]);
    await db.query('DELETE FROM ad_campaigns WHERE project_id = ?', [projectId]);
    await db.query('DELETE FROM projects WHERE id = ?', [projectId]);

    res.json({ message: 'Project deleted' });
  } catch (error) {
    next(error);
  }
});

// Add member to project
router.post('/:projectId/members', authenticate, requireProjectOwner, async (req, res, next) => {
  try {
    const { user_id, role = 'member' } = req.body;
    const projectId = req.params.projectId;

    if (!user_id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Check if user exists
    const [users] = await db.query('SELECT id, name FROM users WHERE id = ?', [user_id]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if already a member
    const [existing] = await db.query(
      'SELECT * FROM project_members WHERE project_id = ? AND user_id = ?',
      [projectId, user_id]
    );

    if (existing.length > 0) {
      return res.status(409).json({ error: 'User is already a member' });
    }

    // Add member
    await db.query(
      'INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)',
      [projectId, user_id, role]
    );

    // Get project name for notification
    const [projects] = await db.query('SELECT name FROM projects WHERE id = ?', [projectId]);

    // Notify the invited user
    await notifyProjectInvitation(user_id, req.userId, {
      project_id: parseInt(projectId),
      project_name: projects[0].name,
      role
    });

    res.status(201).json({
      message: 'Member added',
      user_id,
      user_name: users[0].name,
      role
    });
  } catch (error) {
    next(error);
  }
});

// Update member role
router.put('/:projectId/members/:userId', authenticate, requireProjectOwner, async (req, res, next) => {
  try {
    const { role } = req.body;
    const { projectId, userId } = req.params;

    if (!['owner', 'member'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Check if member exists
    const [existing] = await db.query(
      'SELECT * FROM project_members WHERE project_id = ? AND user_id = ?',
      [projectId, userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    await db.query(
      'UPDATE project_members SET role = ? WHERE project_id = ? AND user_id = ?',
      [role, projectId, userId]
    );

    // Get project name
    const [projects] = await db.query('SELECT name FROM projects WHERE id = ?', [projectId]);

    // Notify user of role change
    await notifyRoleChange(parseInt(userId), req.userId, {
      project_id: parseInt(projectId),
      project_name: projects[0].name,
      new_role: role
    });

    res.json({ message: 'Role updated', role });
  } catch (error) {
    next(error);
  }
});

// Remove member from project
router.delete('/:projectId/members/:userId', authenticate, requireProjectOwner, async (req, res, next) => {
  try {
    const { projectId, userId } = req.params;

    // Can't remove the owner
    const [project] = await db.query('SELECT owner_id FROM projects WHERE id = ?', [projectId]);
    if (project[0].owner_id === parseInt(userId)) {
      return res.status(400).json({ error: 'Cannot remove the project owner' });
    }

    await db.query(
      'DELETE FROM project_members WHERE project_id = ? AND user_id = ?',
      [projectId, userId]
    );

    res.json({ message: 'Member removed' });
  } catch (error) {
    next(error);
  }
});

// Get project members
router.get('/:projectId/members', authenticate, async (req, res, next) => {
  try {
    const [members] = await db.query(
      `SELECT u.id, u.email, u.name, pm.role
       FROM users u
       JOIN project_members pm ON u.id = pm.user_id
       WHERE pm.project_id = ?
       ORDER BY pm.role DESC, u.name ASC`,
      [req.params.projectId]
    );

    res.json({ members });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

