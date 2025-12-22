const express = require('express');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { auditLog } = require('../middleware/audit');

const router = express.Router();

// Get all missions for a project
router.get('/project/:projectId', authenticate, async (req, res, next) => {
  try {
    const projectId = req.params.projectId;

    // Check access
    const [access] = await db.query(
      'SELECT * FROM project_members WHERE project_id = ? AND user_id = ?',
      [projectId, req.userId]
    );

    if (access.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const [missions] = await db.query(
      `SELECT m.*,
        (SELECT COUNT(*) FROM tasks WHERE mission_id = m.id) as task_count,
        (SELECT COUNT(*) FROM tasks WHERE mission_id = m.id AND status = 'done') as completed_count
       FROM missions m
       WHERE m.project_id = ?
       ORDER BY m.order_index ASC, m.id ASC`,
      [projectId]
    );

    res.json({ missions });
  } catch (error) {
    next(error);
  }
});

// Get single mission with tasks
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const [missions] = await db.query(
      `SELECT m.*, p.name as project_name
       FROM missions m
       JOIN projects p ON m.project_id = p.id
       WHERE m.id = ?`,
      [req.params.id]
    );

    if (missions.length === 0) {
      return res.status(404).json({ error: 'Mission not found' });
    }

    const mission = missions[0];

    // Check access
    const [access] = await db.query(
      'SELECT * FROM project_members WHERE project_id = ? AND user_id = ?',
      [mission.project_id, req.userId]
    );

    if (access.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get tasks
    const [tasks] = await db.query(
      `SELECT t.*,
        GROUP_CONCAT(DISTINCT u.name) as assigned_names
       FROM tasks t
       LEFT JOIN task_assignments ta ON t.id = ta.task_id
       LEFT JOIN users u ON ta.user_id = u.id
       WHERE t.mission_id = ?
       GROUP BY t.id
       ORDER BY t.created_at DESC`,
      [req.params.id]
    );

    res.json({ mission: { ...mission, tasks } });
  } catch (error) {
    next(error);
  }
});

// Create mission
router.post('/', authenticate, auditLog('mission'), async (req, res, next) => {
  try {
    const { project_id, name, description } = req.body;

    if (!project_id || !name) {
      return res.status(400).json({ error: 'Project ID and name are required' });
    }

    // Check access
    const [access] = await db.query(
      'SELECT * FROM project_members WHERE project_id = ? AND user_id = ?',
      [project_id, req.userId]
    );

    if (access.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get max order
    const [maxOrder] = await db.query(
      'SELECT MAX(order_index) as max_order FROM missions WHERE project_id = ?',
      [project_id]
    );

    const orderIndex = (maxOrder[0].max_order || 0) + 1;

    const [result] = await db.query(
      'INSERT INTO missions (project_id, name, description, order_index, created_at) VALUES (?, ?, ?, ?, NOW())',
      [project_id, name, description || null, orderIndex]
    );

    res.status(201).json({
      id: result.insertId,
      project_id,
      name,
      description,
      order_index: orderIndex,
      task_count: 0,
      completed_count: 0
    });
  } catch (error) {
    next(error);
  }
});

// Update mission
router.put('/:id', authenticate, auditLog('mission'), async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const missionId = req.params.id;

    // Get mission and check access
    const [missions] = await db.query('SELECT project_id FROM missions WHERE id = ?', [missionId]);

    if (missions.length === 0) {
      return res.status(404).json({ error: 'Mission not found' });
    }

    const [access] = await db.query(
      'SELECT * FROM project_members WHERE project_id = ? AND user_id = ?',
      [missions[0].project_id, req.userId]
    );

    if (access.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await db.query(
      'UPDATE missions SET name = ?, description = ? WHERE id = ?',
      [name, description || null, missionId]
    );

    res.json({ id: parseInt(missionId), name, description });
  } catch (error) {
    next(error);
  }
});

// Reorder missions
router.put('/reorder/:projectId', authenticate, async (req, res, next) => {
  try {
    const { order } = req.body; // Array of mission IDs in new order
    const projectId = req.params.projectId;

    // Check access
    const [access] = await db.query(
      'SELECT * FROM project_members WHERE project_id = ? AND user_id = ?',
      [projectId, req.userId]
    );

    if (access.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update order for each mission
    for (let i = 0; i < order.length; i++) {
      await db.query(
        'UPDATE missions SET order_index = ? WHERE id = ? AND project_id = ?',
        [i + 1, order[i], projectId]
      );
    }

    res.json({ message: 'Order updated' });
  } catch (error) {
    next(error);
  }
});

// Delete mission
router.delete('/:id', authenticate, auditLog('mission'), async (req, res, next) => {
  try {
    const missionId = req.params.id;

    // Get mission and check access
    const [missions] = await db.query('SELECT project_id FROM missions WHERE id = ?', [missionId]);

    if (missions.length === 0) {
      return res.status(404).json({ error: 'Mission not found' });
    }

    const [access] = await db.query(
      'SELECT * FROM project_members WHERE project_id = ? AND user_id = ?',
      [missions[0].project_id, req.userId]
    );

    if (access.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete related data
    await db.query('DELETE FROM task_attachments WHERE task_id IN (SELECT id FROM tasks WHERE mission_id = ?)', [missionId]);
    await db.query('DELETE FROM task_comments WHERE task_id IN (SELECT id FROM tasks WHERE mission_id = ?)', [missionId]);
    await db.query('DELETE FROM task_tags WHERE task_id IN (SELECT id FROM tasks WHERE mission_id = ?)', [missionId]);
    await db.query('DELETE FROM task_assignments WHERE task_id IN (SELECT id FROM tasks WHERE mission_id = ?)', [missionId]);
    await db.query('DELETE FROM tasks WHERE mission_id = ?', [missionId]);
    await db.query('DELETE FROM missions WHERE id = ?', [missionId]);

    res.json({ message: 'Mission deleted' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

