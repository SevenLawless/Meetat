const express = require('express');
const db = require('../config/database');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all users (for mentions, assignments)
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { search, limit = 50 } = req.query;
    
    let query = 'SELECT id, email, name, role, created_at FROM users';
    const params = [];

    if (search) {
      query += ' WHERE name LIKE ? OR email LIKE ?';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY name ASC LIMIT ?';
    params.push(parseInt(limit));

    const [users] = await db.query(query, params);
    res.json({ users });
  } catch (error) {
    next(error);
  }
});

// Get user by ID
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const [users] = await db.query(
      'SELECT id, email, name, role, created_at FROM users WHERE id = ?',
      [req.params.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: users[0] });
  } catch (error) {
    next(error);
  }
});

// Update user profile
router.put('/profile', authenticate, async (req, res, next) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    await db.query(
      'UPDATE users SET name = ? WHERE id = ?',
      [name, req.userId]
    );

    res.json({ message: 'Profile updated', name });
  } catch (error) {
    next(error);
  }
});

// Admin: Update user role
router.put('/:id/role', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { role } = req.body;
    const userId = req.params.id;

    if (!['admin', 'user'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be admin or user' });
    }

    if (parseInt(userId) === req.userId) {
      return res.status(400).json({ error: 'Cannot change your own role' });
    }

    const [users] = await db.query('SELECT id FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    await db.query('UPDATE users SET role = ? WHERE id = ?', [role, userId]);

    res.json({ message: 'Role updated', userId: parseInt(userId), role });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

