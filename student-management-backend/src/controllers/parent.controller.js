const db = require('../config/database');
const { sendSuccess, sendError } = require('../utils/response');
const bcrypt = require('bcrypt');
const { enforcePasswordPolicy } = require('../utils/passwordPolicy');

exports.getParents = async (req, res) => {
  try {
    const { search } = req.query;
    let query = 'SELECT DISTINCT p.* FROM parents p';
    let params = [];

    const filters = [];
    if (req.user.role === 'teacher') {
      query += ` JOIN student_parents sp ON sp.parent_id = p.id
        JOIN students s ON s.id = sp.student_id
        JOIN classes c ON c.id = s.class_id
        LEFT JOIN class_subjects cs ON cs.class_id = c.id`;
      filters.push('(c.homeroom_teacher_id = ? OR cs.teacher_id = ?)');
      params.push(req.user.specificId, req.user.specificId);
    }

    if (search) {
      filters.push('(p.full_name LIKE ? OR p.phone LIKE ? OR p.email LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (filters.length) query += ` WHERE ${filters.join(' AND ')}`;
    query += ' ORDER BY p.full_name LIMIT 100';

    const [parents] = await db.execute(query, params);
    return sendSuccess(res, 'Parents fetched', parents);
  } catch (error) {
    return sendError(res, error.message);
  }
};

exports.getStudentParents = async (req, res) => {
  try {
    const { id } = req.params;
    const [parents] = await db.execute(`
      SELECT p.*, sp.is_primary
      FROM parents p
      JOIN student_parents sp ON p.id = sp.parent_id
      WHERE sp.student_id = ?
    `, [id]);
    return sendSuccess(res, 'Student parents fetched', parents);
  } catch (error) {
    return sendError(res, error.message);
  }
};

exports.createParent = async (req, res) => {
  try {
    const { full_name, email, phone, relationship, address, create_account, password } = req.body;
    if (create_account) await enforcePasswordPolicy(password);
    const passwordHash = create_account ? await bcrypt.hash(password, 12) : null;
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      let userId = null;
      if (create_account) {
        const [userResult] = await connection.execute(`
          INSERT INTO users (full_name, email, password_hash, phone, role, status)
          VALUES (?, ?, ?, ?, 'parent', 'active')
        `, [full_name, email, passwordHash, phone || null]);
        userId = userResult.insertId;
      }
      const [result] = await connection.execute(`
        INSERT INTO parents (user_id, full_name, email, phone, relationship, address)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [userId, full_name, email || null, phone || null, relationship || null, address || null]);
      await connection.commit();
      return sendSuccess(res, 'Parent created', { id: result.insertId, account_created: Boolean(create_account) }, {}, 201);
    } catch (error) {
      await connection.rollback();
      if (error.code === 'ER_DUP_ENTRY') return sendError(res, 'Email tài khoản đã được sử dụng', 409);
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    return sendError(res, error.message, error.status || 500);
  }
};

exports.updateParent = async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, email, phone, relationship, address } = req.body;
    const [[parent]] = await db.execute('SELECT user_id FROM parents WHERE id = ?', [id]);
    if (!parent) return sendError(res, 'Parent not found', 404);
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute(`
        UPDATE parents SET full_name = ?, email = ?, phone = ?, relationship = ?, address = ? WHERE id = ?
      `, [full_name, email || null, phone || null, relationship || null, address || null, id]);
      if (parent.user_id) {
        await connection.execute(
          'UPDATE users SET full_name = ?, email = COALESCE(?, email), phone = ? WHERE id = ?',
          [full_name, email || null, phone || null, parent.user_id]
        );
      }
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      if (error.code === 'ER_DUP_ENTRY') return sendError(res, 'Email tài khoản đã được sử dụng', 409);
      throw error;
    } finally {
      connection.release();
    }
    return sendSuccess(res, 'Parent updated');
  } catch (error) {
    return sendError(res, error.message);
  }
};

exports.deleteParent = async (req, res) => {
  try {
    const { id } = req.params;
    const [[parent]] = await db.execute(`
      SELECT p.id, p.user_id, COUNT(sp.id) AS links
      FROM parents p LEFT JOIN student_parents sp ON sp.parent_id = p.id
      WHERE p.id = ? GROUP BY p.id, p.user_id
    `, [id]);
    if (!parent) return sendError(res, 'Parent not found', 404);
    if (parent.user_id || Number(parent.links) > 0) {
      return sendError(res, 'Phụ huynh đang có tài khoản hoặc liên kết học sinh. Hãy hủy liên kết trước khi xóa.', 409);
    }
    await db.execute('DELETE FROM parents WHERE id = ?', [id]);
    return sendSuccess(res, 'Parent deleted');
  } catch (error) {
    return sendError(res, error.message);
  }
};

exports.linkParent = async (req, res) => {
  try {
    const { student_id, parent_id, is_primary } = req.body;
    
    // Check if already linked
    const [[existing]] = await db.execute(
      'SELECT id FROM student_parents WHERE student_id = ? AND parent_id = ?',
      [student_id, parent_id]
    );

    if (existing) {
      return sendError(res, 'Phụ huynh đã được liên kết với học sinh này', 400);
    }

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      if (is_primary) {
        await connection.execute('UPDATE student_parents SET is_primary = FALSE WHERE student_id = ?', [student_id]);
      }
      await connection.execute(
        'INSERT INTO student_parents (student_id, parent_id, is_primary) VALUES (?, ?, ?)',
        [student_id, parent_id, Boolean(is_primary)]
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    return sendSuccess(res, 'Đã liên kết phụ huynh thành công');
  } catch (error) {
    return sendError(res, error.message);
  }
};

exports.unlinkParent = async (req, res) => {
  try {
    const { student_id, parent_id } = req.params;
    const [result] = await db.execute(
      'DELETE FROM student_parents WHERE student_id = ? AND parent_id = ?',
      [student_id, parent_id]
    );
    if (result.affectedRows === 0) return sendError(res, 'Liên kết không tồn tại', 404);
    return sendSuccess(res, 'Đã hủy liên kết phụ huynh');
  } catch (error) {
    return sendError(res, error.message);
  }
};
