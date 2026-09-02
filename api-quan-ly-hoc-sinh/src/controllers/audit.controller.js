const db = require('../config/database');
const { sendSuccess, sendError } = require('../utils/response');
const { getPagination } = require('../utils/pagination');

exports.getAuditLogs = async (req, res) => {
  try {
    const { entity_type, action } = req.query;
    const { page, limit, offset } = getPagination(req.query, 20);

    let query = `
      SELECT al.*, u.full_name as user_name
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (entity_type) {
      query += ` AND al.entity_type = ?`;
      params.push(entity_type);
    }
    if (action) {
      query += ` AND al.action = ?`;
      params.push(action);
    }

    const [countResult] = await db.execute(query.replace('al.*, u.full_name as user_name', 'COUNT(*) as total'), params);
    const total = countResult[0].total;

    query += ` ORDER BY al.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [logs] = await db.execute(query, params);

    return sendSuccess(res, 'Audit logs fetched', logs, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    return sendError(res, error.message);
  }
};
