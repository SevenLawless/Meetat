const express = require('express');
const db = require('../config/database');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { paginate, paginationResponse } = require('../utils/helpers');

const router = express.Router();

// Get audit logs (admin only)
router.get('/', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { 
      user_id, 
      object_type, 
      object_id, 
      action,
      start_date, 
      end_date, 
      page = 1, 
      limit = 50 
    } = req.query;

    const { limit: limitNum, offset } = paginate(page, limit);

    let query = `
      SELECT a.*, u.name as user_name, u.email as user_email
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE 1=1
    `;
    let countQuery = 'SELECT COUNT(*) as total FROM audit_logs a WHERE 1=1';
    const params = [];
    const countParams = [];

    if (user_id) {
      query += ' AND a.user_id = ?';
      countQuery += ' AND a.user_id = ?';
      params.push(user_id);
      countParams.push(user_id);
    }

    if (object_type) {
      query += ' AND a.object_type = ?';
      countQuery += ' AND a.object_type = ?';
      params.push(object_type);
      countParams.push(object_type);
    }

    if (object_id) {
      query += ' AND a.object_id = ?';
      countQuery += ' AND a.object_id = ?';
      params.push(object_id);
      countParams.push(object_id);
    }

    if (action) {
      query += ' AND a.action = ?';
      countQuery += ' AND a.action = ?';
      params.push(action);
      countParams.push(action);
    }

    if (start_date) {
      query += ' AND a.created_at >= ?';
      countQuery += ' AND a.created_at >= ?';
      params.push(start_date);
      countParams.push(start_date);
    }

    if (end_date) {
      query += ' AND a.created_at <= ?';
      countQuery += ' AND a.created_at <= ?';
      params.push(end_date);
      countParams.push(end_date);
    }

    query += ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?';
    params.push(limitNum, offset);

    const [logs] = await db.query(query, params);
    const [countResult] = await db.query(countQuery, countParams);

    // Parse changes JSON
    const parsedLogs = logs.map(log => ({
      ...log,
      changes: typeof log.changes === 'string' ? JSON.parse(log.changes) : log.changes
    }));

    res.json(paginationResponse(parsedLogs, countResult[0].total, page, limitNum));
  } catch (error) {
    next(error);
  }
});

// Get audit log for specific object
router.get('/object/:objectType/:objectId', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { objectType, objectId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const { limit: limitNum, offset } = paginate(page, limit);

    const [logs] = await db.query(
      `SELECT a.*, u.name as user_name, u.email as user_email
       FROM audit_logs a
       LEFT JOIN users u ON a.user_id = u.id
       WHERE a.object_type = ? AND a.object_id = ?
       ORDER BY a.created_at DESC
       LIMIT ? OFFSET ?`,
      [objectType, objectId, limitNum, offset]
    );

    const [countResult] = await db.query(
      'SELECT COUNT(*) as total FROM audit_logs WHERE object_type = ? AND object_id = ?',
      [objectType, objectId]
    );

    const parsedLogs = logs.map(log => ({
      ...log,
      changes: typeof log.changes === 'string' ? JSON.parse(log.changes) : log.changes
    }));

    res.json(paginationResponse(parsedLogs, countResult[0].total, page, limitNum));
  } catch (error) {
    next(error);
  }
});

// Get audit log for specific user's actions
router.get('/user/:userId', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const { limit: limitNum, offset } = paginate(page, limit);

    const [logs] = await db.query(
      `SELECT a.*, u.name as user_name, u.email as user_email
       FROM audit_logs a
       LEFT JOIN users u ON a.user_id = u.id
       WHERE a.user_id = ?
       ORDER BY a.created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limitNum, offset]
    );

    const [countResult] = await db.query(
      'SELECT COUNT(*) as total FROM audit_logs WHERE user_id = ?',
      [userId]
    );

    const parsedLogs = logs.map(log => ({
      ...log,
      changes: typeof log.changes === 'string' ? JSON.parse(log.changes) : log.changes
    }));

    res.json(paginationResponse(parsedLogs, countResult[0].total, page, limitNum));
  } catch (error) {
    next(error);
  }
});

// Get audit statistics
router.get('/stats', authenticate, requireAdmin, async (req, res, next) => {
  try {
    // Actions by type
    const [actionStats] = await db.query(
      `SELECT action, object_type, COUNT(*) as count
       FROM audit_logs
       GROUP BY action, object_type
       ORDER BY count DESC`
    );

    // Recent activity by user
    const [userActivity] = await db.query(
      `SELECT u.id, u.name, u.email, COUNT(*) as action_count,
        MAX(a.created_at) as last_action
       FROM audit_logs a
       JOIN users u ON a.user_id = u.id
       WHERE a.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
       GROUP BY u.id
       ORDER BY action_count DESC
       LIMIT 10`
    );

    // Activity over time (last 7 days)
    const [dailyActivity] = await db.query(
      `SELECT DATE(created_at) as date, COUNT(*) as count
       FROM audit_logs
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
       GROUP BY DATE(created_at)
       ORDER BY date ASC`
    );

    res.json({
      by_action: actionStats,
      top_users: userActivity,
      daily_activity: dailyActivity
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

