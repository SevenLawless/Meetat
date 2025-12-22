const db = require('../config/database');

// Audit log middleware - captures mutations
const auditLog = (objectType) => {
  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json.bind(res);
    
    // Override json to capture response
    res.json = async (data) => {
      try {
        // Only log mutations (POST, PUT, PATCH, DELETE)
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
          const action = getActionFromMethod(req.method);
          const objectId = req.params.id || req.params.taskId || req.params.missionId || 
                          req.params.projectId || data?.id || null;
          
          // Prepare changes object
          let changes = {};
          
          if (req.method === 'POST') {
            changes = { created: req.body };
          } else if (req.method === 'DELETE') {
            changes = { deleted: true };
          } else {
            changes = { updated: req.body };
          }

          // Don't log if response is an error
          if (res.statusCode >= 200 && res.statusCode < 300) {
            await db.query(
              `INSERT INTO audit_logs (user_id, action, object_type, object_id, changes, created_at)
               VALUES (?, ?, ?, ?, ?, NOW())`,
              [
                req.userId || null,
                action,
                objectType,
                objectId,
                JSON.stringify(changes)
              ]
            );
          }
        }
      } catch (error) {
        console.error('Audit log error:', error);
        // Don't fail the request if audit logging fails
      }
      
      return originalJson(data);
    };
    
    next();
  };
};

function getActionFromMethod(method) {
  switch (method) {
    case 'POST': return 'create';
    case 'PUT':
    case 'PATCH': return 'update';
    case 'DELETE': return 'delete';
    default: return 'unknown';
  }
}

// Direct audit log function for use in services
const logAudit = async (userId, action, objectType, objectId, changes) => {
  try {
    await db.query(
      `INSERT INTO audit_logs (user_id, action, object_type, object_id, changes, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [userId, action, objectType, objectId, JSON.stringify(changes)]
    );
  } catch (error) {
    console.error('Audit log error:', error);
  }
};

module.exports = {
  auditLog,
  logAudit
};

