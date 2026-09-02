const db = require('../config/database');

const logAction = async (req, action, entityType, entityId, oldValue = null, newValue = null) => {
  try {
    const userId = req.user ? req.user.id : null;
    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];

    await db.execute(`
      INSERT INTO audit_logs (
        user_id, action, entity_type, entity_id, old_value, new_value, ip_address, user_agent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      userId, 
      action, 
      entityType, 
      entityId, 
      oldValue ? JSON.stringify(oldValue) : null, 
      newValue ? JSON.stringify(newValue) : null, 
      ipAddress, 
      userAgent
    ]);
  } catch (error) {
    console.error('Audit Log Error:', error);
  }
};

module.exports = { logAction };
