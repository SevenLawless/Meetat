const express = require('express');
const { authenticate } = require('../middleware/auth');
const notificationService = require('../services/notificationService');

const router = express.Router();

// Get notifications for current user
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { limit = 50, offset = 0, unread_only = false } = req.query;

    const notifications = await notificationService.getNotifications(req.userId, {
      limit: parseInt(limit),
      offset: parseInt(offset),
      unreadOnly: unread_only === 'true'
    });

    const unreadCount = await notificationService.getUnreadCount(req.userId);

    res.json({
      notifications,
      unread_count: unreadCount
    });
  } catch (error) {
    next(error);
  }
});

// Get unread count
router.get('/unread-count', authenticate, async (req, res, next) => {
  try {
    const count = await notificationService.getUnreadCount(req.userId);
    res.json({ count });
  } catch (error) {
    next(error);
  }
});

// Mark notification as read
router.put('/:id/read', authenticate, async (req, res, next) => {
  try {
    await notificationService.markAsRead(req.params.id, req.userId);
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    next(error);
  }
});

// Mark all as read
router.put('/read-all', authenticate, async (req, res, next) => {
  try {
    await notificationService.markAllAsRead(req.userId);
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
});

// Delete single notification
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    await notificationService.bulkDismiss([req.params.id], req.userId);
    res.json({ message: 'Notification deleted' });
  } catch (error) {
    next(error);
  }
});

// Bulk dismiss notifications
router.post('/dismiss', authenticate, async (req, res, next) => {
  try {
    const { notification_ids } = req.body;

    if (!notification_ids || !Array.isArray(notification_ids)) {
      return res.status(400).json({ error: 'notification_ids array is required' });
    }

    await notificationService.bulkDismiss(notification_ids, req.userId);
    res.json({ message: 'Notifications dismissed' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

