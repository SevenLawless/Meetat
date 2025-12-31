const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../config/database');

// Authenticate JWT token
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    
    const decoded = jwt.verify(token, config.jwt.secret);
    
    // Fetch user from database
    const [users] = await db.query(
      'SELECT id, email, name, role, created_at FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = users[0];
    req.userId = users[0].id;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    next(error);
  }
};

// Check if user is admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Check if user is marketing or admin
const requireMarketingAccess = (req, res, next) => {
  if (req.user.role !== 'marketing' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Marketing access required' });
  }
  next();
};

// Helper functions to check user roles
const isAdmin = (user) => user && user.role === 'admin';
const isMarketing = (user) => user && user.role === 'marketing';
const isNormal = (user) => user && user.role === 'normal';
const hasMarketingAccess = (user) => user && (user.role === 'marketing' || user.role === 'admin');

// Check if user is member of project
const requireProjectMember = async (req, res, next) => {
  try {
    const projectId = req.params.projectId || req.body.project_id || req.query.project_id;
    
    if (!projectId) {
      return res.status(400).json({ error: 'Project ID required' });
    }

    const [members] = await db.query(
      'SELECT * FROM project_members WHERE project_id = ? AND user_id = ?',
      [projectId, req.userId]
    );

    if (members.length === 0) {
      return res.status(403).json({ error: 'Not a member of this project' });
    }

    req.projectMember = members[0];
    next();
  } catch (error) {
    next(error);
  }
};

// Check if user is project owner
const requireProjectOwner = async (req, res, next) => {
  try {
    const projectId = req.params.projectId || req.body.project_id;
    
    if (!projectId) {
      return res.status(400).json({ error: 'Project ID required' });
    }

    const [projects] = await db.query(
      'SELECT * FROM projects WHERE id = ? AND owner_id = ?',
      [projectId, req.userId]
    );

    if (projects.length === 0) {
      return res.status(403).json({ error: 'Not the owner of this project' });
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  authenticate,
  requireAdmin,
  requireMarketingAccess,
  requireProjectMember,
  requireProjectOwner,
  isAdmin,
  isMarketing,
  isNormal,
  hasMarketingAccess
};

