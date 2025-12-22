const express = require('express');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Get all personal todos for current user
router.get('/', authenticate, async (req, res, next) => {
  try {
    const [todos] = await db.query(
      `SELECT * FROM personal_todos 
       WHERE user_id = ? 
       ORDER BY order_index ASC, id ASC`,
      [req.userId]
    );

    res.json({ todos });
  } catch (error) {
    next(error);
  }
});

// Create personal todo
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { title, notes, reminder_at } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    // Get max order
    const [maxOrder] = await db.query(
      'SELECT MAX(order_index) as max_order FROM personal_todos WHERE user_id = ?',
      [req.userId]
    );

    const orderIndex = (maxOrder[0].max_order || 0) + 1;

    const [result] = await db.query(
      `INSERT INTO personal_todos (user_id, title, notes, order_index, completed, reminder_at, created_at)
       VALUES (?, ?, ?, ?, false, ?, NOW())`,
      [req.userId, title, notes || null, orderIndex, reminder_at || null]
    );

    res.status(201).json({
      id: result.insertId,
      title,
      notes,
      order_index: orderIndex,
      completed: false,
      reminder_at
    });
  } catch (error) {
    next(error);
  }
});

// Update personal todo
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const { title, notes, completed, reminder_at } = req.body;
    const todoId = req.params.id;

    // Check ownership
    const [todos] = await db.query(
      'SELECT * FROM personal_todos WHERE id = ? AND user_id = ?',
      [todoId, req.userId]
    );

    if (todos.length === 0) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    const todo = todos[0];

    await db.query(
      `UPDATE personal_todos 
       SET title = ?, notes = ?, completed = ?, reminder_at = ?, updated_at = NOW()
       WHERE id = ?`,
      [
        title !== undefined ? title : todo.title,
        notes !== undefined ? notes : todo.notes,
        completed !== undefined ? completed : todo.completed,
        reminder_at !== undefined ? reminder_at : todo.reminder_at,
        todoId
      ]
    );

    res.json({
      id: parseInt(todoId),
      title: title !== undefined ? title : todo.title,
      notes: notes !== undefined ? notes : todo.notes,
      completed: completed !== undefined ? completed : todo.completed,
      reminder_at: reminder_at !== undefined ? reminder_at : todo.reminder_at
    });
  } catch (error) {
    next(error);
  }
});

// Toggle todo completion
router.put('/:id/toggle', authenticate, async (req, res, next) => {
  try {
    const todoId = req.params.id;

    // Check ownership
    const [todos] = await db.query(
      'SELECT * FROM personal_todos WHERE id = ? AND user_id = ?',
      [todoId, req.userId]
    );

    if (todos.length === 0) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    const newCompleted = !todos[0].completed;

    await db.query(
      'UPDATE personal_todos SET completed = ?, updated_at = NOW() WHERE id = ?',
      [newCompleted, todoId]
    );

    res.json({ id: parseInt(todoId), completed: newCompleted });
  } catch (error) {
    next(error);
  }
});

// Reorder todos
router.put('/reorder', authenticate, async (req, res, next) => {
  try {
    const { order } = req.body; // Array of todo IDs in new order

    if (!order || !Array.isArray(order)) {
      return res.status(400).json({ error: 'Order array is required' });
    }

    // Update order for each todo
    for (let i = 0; i < order.length; i++) {
      await db.query(
        'UPDATE personal_todos SET order_index = ? WHERE id = ? AND user_id = ?',
        [i + 1, order[i], req.userId]
      );
    }

    res.json({ message: 'Order updated' });
  } catch (error) {
    next(error);
  }
});

// Delete personal todo
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const todoId = req.params.id;

    // Check ownership
    const [todos] = await db.query(
      'SELECT * FROM personal_todos WHERE id = ? AND user_id = ?',
      [todoId, req.userId]
    );

    if (todos.length === 0) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    await db.query('DELETE FROM personal_todos WHERE id = ?', [todoId]);

    res.json({ message: 'Todo deleted' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

