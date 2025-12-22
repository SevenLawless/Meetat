const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../config/database');
const notificationService = require('../services/notificationService');

const setupWebSocket = (server) => {
  const wss = new WebSocket.Server({ server, path: '/ws' });

  // Set WebSocket server in notification service
  notificationService.setWebSocketServer(wss);

  wss.on('connection', async (ws, req) => {
    console.log('WebSocket client connected');

    // Parse token from query string
    const url = new URL(req.url, 'http://localhost');
    const token = url.searchParams.get('token');

    if (!token) {
      ws.send(JSON.stringify({ type: 'error', message: 'No token provided' }));
      ws.close();
      return;
    }

    try {
      // Verify JWT
      const decoded = jwt.verify(token, config.jwt.secret);
      ws.userId = decoded.userId;

      // Get user's projects for room-based subscriptions
      const [projects] = await db.query(
        'SELECT project_id FROM project_members WHERE user_id = ?',
        [decoded.userId]
      );
      ws.projectIds = projects.map(p => p.project_id);

      // Store last event ID for reconnection sync
      ws.lastEventId = null;

      // Send connection success
      ws.send(JSON.stringify({
        type: 'connected',
        userId: ws.userId,
        projectIds: ws.projectIds
      }));

      // Handle messages from client
      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          await handleMessage(ws, message);
        } catch (error) {
          console.error('WebSocket message error:', error);
          ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
        }
      });

      ws.on('close', () => {
        console.log('WebSocket client disconnected:', ws.userId);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });

    } catch (error) {
      console.error('WebSocket auth error:', error);
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid token' }));
      ws.close();
    }
  });

  // Heartbeat to keep connections alive
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(interval);
  });

  return wss;
};

// Handle incoming WebSocket messages
const handleMessage = async (ws, message) => {
  switch (message.type) {
    case 'ping':
      ws.send(JSON.stringify({ type: 'pong' }));
      break;

    case 'subscribe_project':
      // Add project to user's subscriptions
      if (message.projectId && !ws.projectIds.includes(message.projectId)) {
        ws.projectIds.push(message.projectId);
        ws.send(JSON.stringify({
          type: 'subscribed',
          projectId: message.projectId
        }));
      }
      break;

    case 'unsubscribe_project':
      // Remove project from user's subscriptions
      ws.projectIds = ws.projectIds.filter(id => id !== message.projectId);
      ws.send(JSON.stringify({
        type: 'unsubscribed',
        projectId: message.projectId
      }));
      break;

    case 'sync':
      // Handle reconnection sync - get events since last event ID
      if (message.lastEventId) {
        await syncMissedEvents(ws, message.lastEventId);
      }
      break;

    case 'mark_event':
      // Store last event ID for sync
      ws.lastEventId = message.eventId;
      break;

    default:
      ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
  }
};

// Sync missed events since last event ID
const syncMissedEvents = async (ws, lastEventId) => {
  try {
    // Get notifications since the last event
    const [notifications] = await db.query(
      `SELECT * FROM notifications 
       WHERE user_id = ? AND id > ? 
       ORDER BY id ASC LIMIT 100`,
      [ws.userId, lastEventId]
    );

    ws.send(JSON.stringify({
      type: 'sync',
      notifications: notifications.map(n => ({
        ...n,
        payload: typeof n.payload === 'string' ? JSON.parse(n.payload) : n.payload
      }))
    }));
  } catch (error) {
    console.error('Sync error:', error);
    ws.send(JSON.stringify({ type: 'error', message: 'Sync failed' }));
  }
};

// Broadcast task update to project members
const broadcastTaskUpdate = (wss, projectId, task, action, excludeUserId = null) => {
  const message = JSON.stringify({
    type: 'task_update',
    action,
    task,
    projectId,
    timestamp: new Date().toISOString()
  });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN &&
        client.projectIds &&
        client.projectIds.includes(projectId) &&
        client.userId !== excludeUserId) {
      client.send(message);
    }
  });
};

module.exports = {
  setupWebSocket,
  broadcastTaskUpdate
};

