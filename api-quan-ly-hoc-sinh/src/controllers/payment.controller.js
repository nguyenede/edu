const db = require('../config/database');
const { sendSuccess, sendError } = require('../utils/response');
const { getPagination } = require('../utils/pagination');

exports.getPayments = async (req, res) => {
  try {
    const { status, student_id, search = '' } = req.query;
    const { page, limit, offset } = getPagination(req.query);
    const { role, specificId } = req.user;

    const select = `
      SELECT
        p.id, p.invoice_code, p.student_id, p.payment_type, p.amount,
        p.due_date, p.paid_date, p.description, p.created_at, p.updated_at,
        p.status AS stored_status,
        CASE
          WHEN p.status = 'unpaid' AND p.due_date < CURDATE() THEN 'overdue'
          ELSE p.status
        END AS status,
        s.full_name as student_name, s.student_code, c.class_name
    `;
    const from = `
      FROM payments p
      JOIN students s ON p.student_id = s.id
      LEFT JOIN classes c ON s.class_id = c.id
      WHERE 1=1
    `;
    let filters = '';
    const params = [];

    // Role-based filtering
    if (role === 'student') {
      if (!specificId) return sendSuccess(res, 'Payments fetched', [], { page, limit, total: 0, totalPages: 0 });
      filters += ` AND p.student_id = ?`;
      params.push(specificId);
    } else if (role === 'parent') {
      if (!specificId) return sendSuccess(res, 'Payments fetched', [], { page, limit, total: 0, totalPages: 0 });
      filters += ` AND p.student_id IN (SELECT student_id FROM student_parents WHERE parent_id = ?)`;
      params.push(specificId);
    } else {
      if (student_id) {
        filters += ` AND p.student_id = ?`;
        params.push(student_id);
      }
    }

    if (status === 'overdue') {
      filters += ` AND (p.status = 'overdue' OR (p.status = 'unpaid' AND p.due_date < CURDATE()))`;
    } else if (status === 'unpaid') {
      filters += ` AND p.status = 'unpaid' AND p.due_date >= CURDATE()`;
    } else if (status) {
      filters += ` AND p.status = ?`;
      params.push(status);
    }

    if (search) {
      filters += ` AND (p.invoice_code LIKE ? OR s.full_name LIKE ? OR s.student_code LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    const [countResult] = await db.execute(`SELECT COUNT(*) as total ${from} ${filters}`, params);
    const total = countResult[0].total;

    params.push(limit, offset);

    const [payments] = await db.execute(`${select} ${from} ${filters} ORDER BY p.due_date DESC LIMIT ? OFFSET ?`, params);

    return sendSuccess(res, 'Payments fetched', payments, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    return sendError(res, error.message);
  }
};

exports.createPayment = async (req, res) => {
  try {
    const { student_id, payment_type, amount, due_date, description } = req.body;
    const invoice_code = 'INV-' + Date.now() + Math.floor(Math.random() * 1000);

    const [result] = await db.execute(`
      INSERT INTO payments (invoice_code, student_id, payment_type, amount, due_date, description, status)
      VALUES (?, ?, ?, ?, ?, ?, 'unpaid')
    `, [invoice_code, student_id, payment_type, amount, due_date, description || null]);

    return sendSuccess(res, 'Payment created', { id: result.insertId, invoice_code }, {}, 201);
  } catch (error) {
    return sendError(res, error.message);
  }
};

exports.markPaid = async (req, res) => {
  try {
    const { id } = req.params;
    const paid_date = new Date().toISOString().split('T')[0];

    const [result] = await db.execute(`
      UPDATE payments SET status = 'paid', paid_date = ?
      WHERE id = ?
    `, [paid_date, id]);

    if (result.affectedRows === 0) {
      return sendError(res, 'Payment record not found', 404);
    }

    return sendSuccess(res, 'Payment marked as paid');
  } catch (error) {
    return sendError(res, error.message);
  }
};
