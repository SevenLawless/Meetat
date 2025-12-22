const db = require('../config/database');

// Notification types
const NOTIFICATION_TYPES = {
  MENTION: 'mention',
  ASSIGNMENT: 'assignment',
  UNASSIGNMENT: 'unassignment',
  STATUS_CHANGE: 'status_change',
  COMMENT_ADDED: 'comment_added',
  TASK_DELETED: 'task_deleted',
  PROJECT_INVITATION: 'project_invitation',
  ROLE_CHANGE: 'role_change'
};

// WebSocket server reference (set from index.js)
let wss = null;

const setWebSocketServer = (wsServer) => {
  wss = wsServer;
};

// Create a notification
const createNotification = async (userId, actorId, type, payload) => {
  try {
    const [result] = await db.query(
      `INSERT INTO notifications (user_id, actor_id, type, payload, \`read\`, created_at)
       VALUES (?, ?, ?, ?, false, NOW())`,
      [userId, actorId, type, JSON.stringify(payload)]
    );

    // Fetch the notification with actor_name and actual created_at from database
    const [notifications] = await db.query(
      `SELECT n.*, u.name as actor_name 
       FROM notifications n
       LEFT JOIN users u ON n.actor_id = u.id
       WHERE n.id = ?`,
      [result.insertId]
    );

    if (notifications.length === 0) {
      throw new Error('Failed to retrieve created notification');
    }

    const dbNotification = notifications[0];
    
    // Parse payload if it's a string
    const parsedPayload = typeof dbNotification.payload === 'string' 
      ? JSON.parse(dbNotification.payload) 
      : dbNotification.payload;

    const notification = {
      id: dbNotification.id,
      user_id: dbNotification.user_id,
      actor_id: dbNotification.actor_id,
      actor_name: dbNotification.actor_name,
      type: dbNotification.type,
      payload: parsedPayload,
      read: dbNotification.read,
      created_at: dbNotification.created_at.toISOString()
    };

    // Send real-time notification via WebSocket
    broadcastToUser(userId, {
      type: 'notification',
      data: notification
    });

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

// Create notifications for multiple users
const createNotifications = async (userIds, actorId, type, payload) => {
  const notifications = [];
  for (const userId of userIds) {
    // Don't notify the actor themselves
    if (userId !== actorId) {
      const notification = await createNotification(userId, actorId, type, payload);
      notifications.push(notification);
    }
  }
  return notifications;
};

// Get notifications for a user
const getNotifications = async (userId, options = {}) => {
  const { limit = 50, offset = 0, unreadOnly = false } = options;
  
  let query = `
    SELECT n.*, u.name as actor_name 
    FROM notifications n
    LEFT JOIN users u ON n.actor_id = u.id
    WHERE n.user_id = ?
  `;
  
  const params = [userId];
  
  if (unreadOnly) {
    query += ' AND n.read = false';
  }
  
  query += ' ORDER BY n.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);
  
  const [notifications] = await db.query(query, params);
  
  // Parse payload JSON
  return notifications.map(n => ({
    ...n,
    payload: typeof n.payload === 'string' ? JSON.parse(n.payload) : n.payload
  }));
};

// Get unread count
const getUnreadCount = async (userId) => {
  const [result] = await db.query(
    'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND `read` = false',
    [userId]
  );
  return result[0].count;
};

// Mark notification as read
const markAsRead = async (notificationId, userId) => {
  await db.query(
    'UPDATE notifications SET `read` = true WHERE id = ? AND user_id = ?',
    [notificationId, userId]
  );
};

// Mark all as read
const markAllAsRead = async (userId) => {
  await db.query(
    'UPDATE notifications SET `read` = true WHERE user_id = ? AND `read` = false',
    [userId]
  );
};

// Bulk dismiss notifications
const bulkDismiss = async (notificationIds, userId) => {
  if (notificationIds.length === 0) return;
  
  const placeholders = notificationIds.map(() => '?').join(',');
  await db.query(
    `DELETE FROM notifications WHERE id IN (${placeholders}) AND user_id = ?`,
    [...notificationIds, userId]
  );
};

// Broadcast to specific user via WebSocket
const broadcastToUser = (userId, message) => {
  if (!wss) return;
  
  wss.clients.forEach(client => {
    if (client.userId === userId && client.readyState === 1) {
      client.send(JSON.stringify(message));
    }
  });
};

// Broadcast to all members of a project
const broadcastToProject = (projectId, message, excludeUserId = null) => {
  if (!wss) return;
  
  wss.clients.forEach(client => {
    if (client.projectIds && 
        client.projectIds.includes(projectId) && 
        client.userId !== excludeUserId &&
        client.readyState === 1) {
      client.send(JSON.stringify(message));
    }
  });
};

// Notify on mention
const notifyMentions = async (mentionedUserIds, actorId, payload) => {
  return createNotifications(mentionedUserIds, actorId, NOTIFICATION_TYPES.MENTION, payload);
};

// Notify on assignment
const notifyAssignment = async (userId, actorId, payload) => {
  return createNotification(userId, actorId, NOTIFICATION_TYPES.ASSIGNMENT, payload);
};

// Notify on unassignment
const notifyUnassignment = async (userId, actorId, payload) => {
  return createNotification(userId, actorId, NOTIFICATION_TYPES.UNASSIGNMENT, payload);
};

// Notify on status change
const notifyStatusChange = async (userIds, actorId, payload) => {
  return createNotifications(userIds, actorId, NOTIFICATION_TYPES.STATUS_CHANGE, payload);
};

// Notify on comment added
const notifyCommentAdded = async (userIds, actorId, payload) => {
  return createNotifications(userIds, actorId, NOTIFICATION_TYPES.COMMENT_ADDED, payload);
};

// Notify on task deletion
const notifyTaskDeleted = async (userIds, actorId, payload) => {
  return createNotifications(userIds, actorId, NOTIFICATION_TYPES.TASK_DELETED, payload);
};

// Notify on project invitation
const notifyProjectInvitation = async (userId, actorId, payload) => {
  return createNotification(userId, actorId, NOTIFICATION_TYPES.PROJECT_INVITATION, payload);
};

// Notify on role change
const notifyRoleChange = async (userId, actorId, payload) => {
  return createNotification(userId, actorId, NOTIFICATION_TYPES.ROLE_CHANGE, payload);
};

module.exports = {
  NOTIFICATION_TYPES,
  setWebSocketServer,
  createNotification,
  createNotifications,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  bulkDismiss,
  broadcastToUser,
  broadcastToProject,
  notifyMentions,
  notifyAssignment,
  notifyUnassignment,
  notifyStatusChange,
  notifyCommentAdded,
  notifyTaskDeleted,
  notifyProjectInvitation,
  notifyRoleChange
};

