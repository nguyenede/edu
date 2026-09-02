const db = require('../config/database');
const { sendSuccess, sendError } = require('../utils/response');
const { getPagination } = require('../utils/pagination');
const { teacherCanManageClass } = require('../middlewares/access.middleware');

exports.getAttendance = async (req, res) => {
  try {
    const { class_id, date, student_id } = req.query;
    const { page, limit, offset } = getPagination(req.query);
    const { role, specificId } = req.user;

    let query = `
      SELECT a.*, s.full_name as student_name, s.student_code, c.class_name
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      JOIN classes c ON a.class_id = c.id
      WHERE 1=1
    `;
    const params = [];

    // Role-based filtering
    if (role === 'student') {
      query += ` AND a.student_id = ?`;
      params.push(specificId);
    } else if (role === 'parent') {
      query += ` AND a.student_id IN (SELECT student_id FROM student_parents WHERE parent_id = ?)`;
      params.push(specificId);
      if (student_id) {
        query += ` AND a.student_id = ?`;
        params.push(student_id);
      }
    } else {
      if (role === 'teacher') {
        if (!specificId) return sendSuccess(res, 'Attendance fetched', [], { page, limit, total: 0, totalPages: 0 });
        query += ` AND (
          c.homeroom_teacher_id = ? OR EXISTS (
            SELECT 1 FROM class_subjects cs WHERE cs.class_id = a.class_id AND cs.teacher_id = ?
          )
        )`;
        params.push(specificId, specificId);
      }
      if (student_id) {
        query += ` AND a.student_id = ?`;
        params.push(student_id);
      }
    }

    if (class_id) {
      query += ` AND a.class_id = ?`;
      params.push(class_id);
    }
    if (date) {
      query += ` AND a.date = ?`;
      params.push(date);
    }

    const [countResult] = await db.execute(query.replace('a.*, s.full_name as student_name, s.student_code, c.class_name', 'COUNT(*) as total'), params);
    const total = countResult[0].total;

    query += ` ORDER BY a.date DESC, s.full_name ASC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [attendance] = await db.execute(query, params);

    return sendSuccess(res, 'Attendance fetched', attendance, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    return sendError(res, error.message);
  }
};

exports.markAttendance = async (req, res) => {
  try {
    const { student_id, class_id, date, status, note } = req.body;
    const created_by = req.user.id;

    if (req.user.role === 'teacher' && !await teacherCanManageClass(req.user.specificId, class_id)) {
      return sendError(res, 'Bạn không được phân công điểm danh lớp này', 403);
    }

    const [[student]] = await db.execute('SELECT 1 FROM students WHERE id = ? AND class_id = ?', [student_id, class_id]);
    if (!student) return sendError(res, 'Học sinh không thuộc lớp đã chọn', 422);

    // Check if exists
    const [existing] = await db.execute('SELECT id FROM attendance WHERE student_id = ? AND date = ?', [student_id, date]);

    if (existing.length > 0) {
      await db.execute(`
        UPDATE attendance SET status = ?, note = ?, created_by = ?
        WHERE id = ?
      `, [status, note, created_by, existing[0].id]);
      return sendSuccess(res, 'Attendance updated');
    } else {
      await db.execute(`
        INSERT INTO attendance (student_id, class_id, date, status, note, created_by)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [student_id, class_id, date, status, note, created_by]);
      return sendSuccess(res, 'Attendance marked', {}, {}, 201);
    }
  } catch (error) {
    return sendError(res, error.message);
  }
};

exports.bulkMarkAttendance = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const { class_id, date, records } = req.body;
    const created_by = req.user.id;

    if (req.user.role === 'teacher' && !await teacherCanManageClass(req.user.specificId, class_id)) {
      await connection.rollback();
      return sendError(res, 'Bạn không được phân công điểm danh lớp này', 403);
    }

    const studentIds = [...new Set(records.map((record) => Number(record.student_id)))];
    const placeholders = studentIds.map(() => '?').join(',');
    const [classStudents] = await connection.execute(
      `SELECT id FROM students WHERE class_id = ? AND id IN (${placeholders})`,
      [class_id, ...studentIds]
    );
    if (classStudents.length !== studentIds.length) {
      await connection.rollback();
      return sendError(res, 'Danh sách điểm danh chứa học sinh không thuộc lớp', 422);
    }

    const valuePlaceholders = records.map(() => '(?, ?, ?, ?, ?, ?)').join(',');
    const values = records.flatMap((record) => [
      record.student_id, class_id, date, record.status, record.note || '', created_by
    ]);
    await connection.execute(`
      INSERT INTO attendance (student_id, class_id, date, status, note, created_by)
      VALUES ${valuePlaceholders}
      ON DUPLICATE KEY UPDATE
        class_id = VALUES(class_id), status = VALUES(status),
        note = VALUES(note), created_by = VALUES(created_by)
    `, values);

    await connection.commit();
    return sendSuccess(res, 'Bulk attendance marked');
  } catch (error) {
    await connection.rollback();
    return sendError(res, error.message);
  } finally {
    connection.release();
  }
};
