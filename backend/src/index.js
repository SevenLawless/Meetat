const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const config = require('./config');
const db = require('./config/database');
const { setupWebSocket } = require('./websocket');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const projectRoutes = require('./routes/projects');
const missionRoutes = require('./routes/missions');
const taskRoutes = require('./routes/tasks');
const commentRoutes = require('./routes/comments');
const notificationRoutes = require('./routes/notifications');
const todoRoutes = require('./routes/todos');
const campaignRoutes = require('./routes/campaigns');
const auditRoutes = require('./routes/audit');

const app = express();
const server = http.createServer(app);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', config.upload.dir);
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
const allowedOrigins = config.clientUrl
  ? [config.clientUrl]
  : ['http://localhost:5173', 'http://localhost:3000'];

// Add Railway preview URLs if in production
if (config.nodeEnv === 'production') {
  // Allow Railway preview deployments
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    allowedOrigins.push(`https://${process.env.RAILWAY_PUBLIC_DOMAIN}`);
  }
  // Also allow Railway's static URL if set
  if (process.env.RAILWAY_STATIC_URL) {
    allowedOrigins.push(process.env.RAILWAY_STATIC_URL);
  }
}

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || 
        config.nodeEnv === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files for uploads
app.use('/uploads', express.static(uploadsDir));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/missions', missionRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/todos', todoRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/audit', auditRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(config.nodeEnv === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Setup WebSocket
const wss = setupWebSocket(server);

// Make WebSocket server available globally for broadcasting
app.set('wss', wss);

// Start server
// Railway requires binding to 0.0.0.0, not just localhost
const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';
server.listen(config.port, host, () => {
  console.log(`\n🚀 Meetat API Server running on http://${host}:${config.port}`);
  console.log(`📡 WebSocket server ready`);
  console.log(`🔧 Environment: ${config.nodeEnv}`);
  console.log(`🌐 Client URL: ${config.clientUrl}\n`);
});

module.exports = { app, server };

