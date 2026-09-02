const db = require('../config/database');
const { sendSuccess, sendError } = require('../utils/response');

exports.getSchedules = async (req, res) => {
  try {
    const { role: userRole, specificId } = req.user;
    const { class_id, student_id, day_of_week, academic_year, semester } = req.query;
    
    let query = `
      SELECT sc.*, c.class_name, sub.subject_name, t.full_name as teacher_name
      FROM schedules sc
      JOIN classes c ON sc.class_id = c.id
      JOIN subjects sub ON sc.subject_id = sub.id
      JOIN teachers t ON sc.teacher_id = t.id
      WHERE 1=1
    `;
    const params = [];

    if (userRole === 'admin') {
      if (class_id) {
        query += ` AND sc.class_id = ?`;
        params.push(class_id);
      }
    } else if (userRole === 'teacher') {
      if (!specificId) return sendSuccess(res, 'Schedules fetched', []);
      query += ` AND sc.teacher_id = ?`;
      params.push(specificId);
    } else if (userRole === 'student') {
      const [[student]] = await db.execute('SELECT class_id FROM students WHERE id = ?', [specificId]);
      if (!student) return sendSuccess(res, 'Schedules fetched', []);
      query += ` AND sc.class_id = ?`;
      params.push(student.class_id);
    } else if (userRole === 'parent') {
      const [[student]] = await db.execute(`
        SELECT s.class_id
        FROM students s
        JOIN student_parents sp ON sp.student_id = s.id
        WHERE sp.parent_id = ? AND (? IS NULL OR s.id = ?)
        ORDER BY sp.is_primary DESC, s.id ASC
        LIMIT 1
      `, [specificId, student_id || null, student_id || null]);
      if (!student) return sendSuccess(res, 'Schedules fetched', []);
      query += ` AND sc.class_id = ?`;
      params.push(student.class_id);
    }

    if (day_of_week) {
      query += ` AND sc.day_of_week = ?`;
      params.push(day_of_week);
    }
    if (academic_year) {
      query += ` AND sc.academic_year = ?`;
      params.push(academic_year);
    }
    if (semester) {
      query += ` AND sc.semester = ?`;
      params.push(semester);
    }

    query += ` ORDER BY FIELD(sc.day_of_week, 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'), sc.start_time`;

    const [schedules] = await db.execute(query, params);
    return sendSuccess(res, 'Schedules fetched', schedules);
  } catch (error) {
    return sendError(res, error.message);
  }
};

exports.createSchedule = async (req, res) => {
  try {
    const { 
      class_id, subject_id, teacher_id, day_of_week, 
      start_time, end_time, room, semester, academic_year 
    } = req.body;

    if (!class_id) return sendError(res, 'Lớp học là bắt buộc', 422);
    if (start_time >= end_time) return sendError(res, 'Giờ kết thúc phải sau giờ bắt đầu', 422);

    const [[references]] = await db.execute(`
      SELECT c.id AS class_id, c.status AS class_status,
        sub.id AS subject_id, sub.status AS subject_status,
        t.id AS teacher_id, t.status AS teacher_status
      FROM classes c
      JOIN subjects sub ON sub.id = ?
      JOIN teachers t ON t.id = ?
      WHERE c.id = ?
    `, [subject_id, teacher_id, class_id]);
    if (!references) return sendError(res, 'Lớp, môn học hoặc giáo viên không tồn tại', 404);
    if (references.class_status !== 'active' || references.subject_status !== 'active' || references.teacher_status !== 'active') {
      return sendError(res, 'Chỉ có thể xếp lịch cho lớp, môn học và giáo viên đang hoạt động', 422);
    }

    // Check class, teacher and room conflicts.
    const [overlap] = await db.execute(`
      SELECT id,
        CASE
          WHEN class_id = ? THEN 'class'
          WHEN teacher_id = ? THEN 'teacher'
          WHEN room = ? AND ? <> '' THEN 'room'
        END AS conflict_type
      FROM schedules
      WHERE day_of_week = ?
      AND (class_id = ? OR teacher_id = ? OR (room = ? AND ? <> ''))
      AND start_time < ? AND end_time > ?
      AND semester = ? AND academic_year = ?
      LIMIT 1
    `, [class_id, teacher_id, room || '', room || '', day_of_week, class_id, teacher_id, room || '', room || '', end_time, start_time, semester, academic_year]);

    if (overlap.length > 0) {
      const labels = { class: 'lớp học', teacher: 'giáo viên', room: 'phòng học' };
      return sendError(res, `Trùng lịch ${labels[overlap[0].conflict_type] || 'học'}.`, 409);
    }

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const [result] = await connection.execute(`
        INSERT INTO schedules (
          class_id, subject_id, teacher_id, day_of_week,
          start_time, end_time, room, semester, academic_year
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [class_id, subject_id, teacher_id, day_of_week, start_time, end_time, room || null, semester, academic_year]);
      await connection.execute(`
        INSERT INTO class_subjects (class_id, subject_id, teacher_id, semester, academic_year)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE teacher_id = VALUES(teacher_id)
      `, [class_id, subject_id, teacher_id, semester, academic_year]);
      await connection.commit();
      return sendSuccess(res, 'Schedule created', { id: result.insertId }, {}, 201);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    return sendError(res, error.message);
  }
};

exports.updateSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const [[current]] = await db.execute('SELECT * FROM schedules WHERE id = ?', [id]);
    if (!current) return sendError(res, 'Schedule not found', 404);

    const class_id = req.body.class_id || current.class_id;
    const subject_id = req.body.subject_id || current.subject_id;
    const teacher_id = req.body.teacher_id || current.teacher_id;
    const day_of_week = req.body.day_of_week || current.day_of_week;
    const start_time = req.body.start_time || current.start_time;
    const end_time = req.body.end_time || current.end_time;
    const room = req.body.room ?? current.room;
    const semester = req.body.semester ?? current.semester;
    const academic_year = req.body.academic_year ?? current.academic_year;

    if (start_time >= end_time) return sendError(res, 'Giờ kết thúc phải sau giờ bắt đầu', 422);

    const [[references]] = await db.execute(`
      SELECT c.id AS class_id, c.status AS class_status,
        sub.id AS subject_id, sub.status AS subject_status,
        t.id AS teacher_id, t.status AS teacher_status
      FROM classes c JOIN subjects sub ON sub.id = ? JOIN teachers t ON t.id = ?
      WHERE c.id = ?
    `, [subject_id, teacher_id, class_id]);
    if (!references) return sendError(res, 'Lớp, môn học hoặc giáo viên không tồn tại', 404);
    if (references.class_status !== 'active' || references.subject_status !== 'active' || references.teacher_status !== 'active') {
      return sendError(res, 'Chỉ có thể xếp lịch cho lớp, môn học và giáo viên đang hoạt động', 422);
    }

    const [overlap] = await db.execute(`
      SELECT id FROM schedules
      WHERE id <> ? AND day_of_week = ?
      AND (class_id = ? OR teacher_id = ? OR (room = ? AND ? <> ''))
      AND start_time < ? AND end_time > ?
      AND semester = ? AND academic_year = ?
      LIMIT 1
    `, [id, day_of_week, class_id, teacher_id, room || '', room || '', end_time, start_time, semester, academic_year]);
    if (overlap.length > 0) return sendError(res, 'Thời khóa biểu bị trùng lớp, giáo viên hoặc phòng học', 409);

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const [result] = await connection.execute(`
        UPDATE schedules SET
          class_id = ?, subject_id = ?, teacher_id = ?, day_of_week = ?,
          start_time = ?, end_time = ?, room = ?, semester = ?, academic_year = ?
        WHERE id = ?
      `, [class_id, subject_id, teacher_id, day_of_week, start_time, end_time, room || null, semester, academic_year, id]);
      if (result.affectedRows === 0) {
        await connection.rollback();
        return sendError(res, 'Schedule not found', 404);
      }
      await connection.execute(`
        INSERT INTO class_subjects (class_id, subject_id, teacher_id, semester, academic_year)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE teacher_id = VALUES(teacher_id)
      `, [class_id, subject_id, teacher_id, semester, academic_year]);
      await connection.commit();
      return sendSuccess(res, 'Schedule updated');
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    return sendError(res, error.message);
  }
};

exports.deleteSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.execute('DELETE FROM schedules WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return sendError(res, 'Schedule not found', 404);
    }

    return sendSuccess(res, 'Schedule deleted');
  } catch (error) {
    return sendError(res, error.message);
  }
};
