const db = require('../config/database');

/**
 * Log an action to the audit_logs table
 * @param {number} userId - ID of the user performing the action
 * @param {string} action - Action performed (CREATE, UPDATE, DELETE, LOGIN, etc)
 * @param {string} entityType - Type of entity affected (STUDENT, GRADE, etc)
 * @param {number} entityId - ID of the entity affected
 * @param {object} details - Additional details (old/new values)
 */
const logAction = async (userId, action, entityType, entityId, details = null) => {
  try {
    await db.execute(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_value) VALUES (?, ?, ?, ?, ?)',
      [userId, action, entityType, entityId, details ? JSON.stringify(details) : null]
    );
  } catch (error) {
    console.error('Audit Log Error:', error);
    // Don't throw, we don't want audit logging to break the main app
  }
};

module.exports = { logAction };
