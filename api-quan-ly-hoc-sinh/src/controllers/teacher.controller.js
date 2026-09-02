const db = require('../config/database');
const { sendSuccess, sendError } = require('../utils/response');
const { getPagination } = require('../utils/pagination');
const bcrypt = require('bcrypt');
const { enforcePasswordPolicy } = require('../utils/passwordPolicy');

exports.getTeachers = async (req, res) => {
  try {
    const { search = '', status } = req.query;
    const { page, limit, offset } = getPagination(req.query);

    let query = `
      SELECT t.*, (SELECT COUNT(*) FROM classes c WHERE c.homeroom_teacher_id = t.id) as class_count
      FROM teachers t
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ` AND (t.full_name LIKE ? OR t.teacher_code LIKE ? OR t.email LIKE ? OR t.specialization LIKE ?)`;
      const searchVal = `%${search}%`;
      params.push(searchVal, searchVal, searchVal, searchVal);
    }

    if (status) {
      query += ` AND t.status = ?`;
      params.push(status);
    }

    // Get total count
    const [countResult] = await db.execute(query.replace('t.*, (SELECT COUNT(*) FROM classes c WHERE c.homeroom_teacher_id = t.id) as class_count', 'COUNT(*) as total'), params);
    const total = countResult[0].total;

    // Get paginated data
    query += ` ORDER BY t.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [teachers] = await db.execute(query, params);

    return sendSuccess(res, 'Teachers fetched', teachers, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    return sendError(res, error.message);
  }
};

exports.getTeacherById = async (req, res) => {
  try {
    const { id } = req.params;
    const [teachers] = await db.execute(`
      SELECT t.* 
      FROM teachers t
      WHERE t.id = ?
    `, [id]);

    if (teachers.length === 0) {
      return sendError(res, 'Teacher not found', 404);
    }

    return sendSuccess(res, 'Teacher fetched', teachers[0]);
  } catch (error) {
    return sendError(res, error.message);
  }
};

exports.createTeacher = async (req, res) => {
  try {
    let {
      teacher_code, full_name, email, phone, gender, date_of_birth,
      specialization, degree, hire_date, status, create_account, password
    } = req.body;

    // Auto-generate teacher code if not provided
    if (!teacher_code) {
      const [[{ maxCode }]] = await db.execute(
        "SELECT MAX(CAST(SUBSTRING(teacher_code, 4) AS UNSIGNED)) as maxCode FROM teachers WHERE teacher_code LIKE 'TEA%'"
      );
      const nextNum = (maxCode || 0) + 1;
      teacher_code = `TEA${String(nextNum).padStart(4, '0')}`;
    }

    // Check if code exists
    const [existing] = await db.execute('SELECT id FROM teachers WHERE teacher_code = ?', [teacher_code]);
    if (existing.length > 0) {
      return sendError(res, 'Teacher code already exists', 400);
    }

    if (create_account) await enforcePasswordPolicy(password);
    const passwordHash = create_account ? await bcrypt.hash(password, 12) : null;
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      let userId = null;
      if (create_account) {
        const [userResult] = await connection.execute(`
          INSERT INTO users (full_name, email, password_hash, phone, role, status)
          VALUES (?, ?, ?, ?, 'teacher', ?)
        `, [full_name, email, passwordHash, phone || null, (status || 'active') === 'active' ? 'active' : 'inactive']);
        userId = userResult.insertId;
      }
      const [result] = await connection.execute(`
        INSERT INTO teachers (
          user_id, teacher_code, full_name, email, phone, gender, date_of_birth,
          specialization, degree, hire_date, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        userId, teacher_code, full_name, email || null, phone || null, gender || null, date_of_birth || null,
        specialization || null, degree || null, hire_date || null, status || 'active'
      ]);
      await connection.commit();
      return sendSuccess(res, 'Teacher created', { id: result.insertId, account_created: Boolean(create_account) }, {}, 201);
    } catch (error) {
      await connection.rollback();
      if (error.code === 'ER_DUP_ENTRY') return sendError(res, 'Email tài khoản hoặc mã giáo viên đã tồn tại', 409);
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    return sendError(res, error.message, error.status || 500);
  }
};

exports.updateTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      full_name, email, phone, gender, date_of_birth, 
      specialization, degree, hire_date, status 
    } = req.body;

    const [[teacher]] = await db.execute('SELECT user_id FROM teachers WHERE id = ?', [id]);
    if (!teacher) return sendError(res, 'Teacher not found', 404);
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute(`
        UPDATE teachers SET
          full_name = ?, email = ?, phone = ?, gender = ?, date_of_birth = ?,
          specialization = ?, degree = ?, hire_date = ?, status = ?
        WHERE id = ?
      `, [
        full_name, email || null, phone || null, gender || null, date_of_birth || null,
        specialization || null, degree || null, hire_date || null, status || 'active', id
      ]);
      if (teacher.user_id) {
        await connection.execute(`
          UPDATE users SET full_name = ?, email = COALESCE(?, email), phone = ?, status = ? WHERE id = ?
        `, [full_name, email || null, phone || null, (status || 'active') === 'active' ? 'active' : 'inactive', teacher.user_id]);
      }
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      if (error.code === 'ER_DUP_ENTRY') return sendError(res, 'Email tài khoản đã được sử dụng', 409);
      throw error;
    } finally {
      connection.release();
    }

    return sendSuccess(res, 'Teacher updated');
  } catch (error) {
    return sendError(res, error.message);
  }
};

exports.deleteTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    const [[teacher]] = await db.execute('SELECT user_id FROM teachers WHERE id = ?', [id]);
    if (!teacher) return sendError(res, 'Teacher not found', 404);
    if (teacher.user_id) {
      return sendError(res, 'Giáo viên đang có tài khoản đăng nhập. Hãy chuyển trạng thái hồ sơ thay vì xóa.', 409);
    }
    const [[dependencies]] = await db.execute(`
      SELECT
        (SELECT COUNT(*) FROM classes WHERE homeroom_teacher_id = ?) +
        (SELECT COUNT(*) FROM class_subjects WHERE teacher_id = ?) +
        (SELECT COUNT(*) FROM schedules WHERE teacher_id = ?) +
        (SELECT COUNT(*) FROM grades WHERE teacher_id = ?) AS total
    `, [id, id, id, id]);
    if (Number(dependencies.total) > 0) {
      return sendError(res, 'Giáo viên đang có dữ liệu phân công. Hãy chuyển sang trạng thái nghỉ thay vì xóa.', 409);
    }
    const [result] = await db.execute('DELETE FROM teachers WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return sendError(res, 'Teacher not found', 404);
    }

    return sendSuccess(res, 'Teacher deleted');
  } catch (error) {
    return sendError(res, error.message);
  }
};
