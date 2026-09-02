const db = require('../config/database');
const { sendSuccess, sendError } = require('../utils/response');
const { getPagination } = require('../utils/pagination');

exports.getClasses = async (req, res) => {
  try {
    const { search = '', academic_year } = req.query;
    const { page, limit, offset } = getPagination(req.query);

    let filterQuery = '';
    const params = [];

    if (req.user.role === 'teacher') {
      if (!req.user.specificId) return sendSuccess(res, 'Classes fetched', [], { page, limit, total: 0, totalPages: 0 });
      filterQuery += ` AND (
        c.homeroom_teacher_id = ? OR EXISTS (
          SELECT 1 FROM class_subjects cs WHERE cs.class_id = c.id AND cs.teacher_id = ?
        )
      )`;
      params.push(req.user.specificId, req.user.specificId);
    }

    if (search) {
      filterQuery += ` AND (c.class_name LIKE ? OR c.class_code LIKE ?)`;
      const searchVal = `%${search}%`;
      params.push(searchVal, searchVal);
    }

    if (academic_year) {
      filterQuery += ` AND c.academic_year = ?`;
      params.push(academic_year);
    }

    // Get total count
    const [countResult] = await db.execute(`
      SELECT COUNT(*) as total
      FROM classes c
      WHERE 1=1 ${filterQuery}
    `, params);
    const total = countResult[0].total;

    // Get paginated data
    const query = `
      SELECT c.*, t.full_name as homeroom_teacher_name,
      (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id) as student_count
      FROM classes c
      LEFT JOIN teachers t ON c.homeroom_teacher_id = t.id
      WHERE 1=1 ${filterQuery}
      ORDER BY c.created_at DESC LIMIT ? OFFSET ?
    `;
    params.push(limit, offset);

    const [classes] = await db.execute(query, params);

    return sendSuccess(res, 'Classes fetched', classes, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    return sendError(res, error.message);
  }
};

exports.getClassById = async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.role === 'teacher') {
      const [[assigned]] = await db.execute(`
        SELECT 1 FROM classes c LEFT JOIN class_subjects cs ON cs.class_id = c.id
        WHERE c.id = ? AND (c.homeroom_teacher_id = ? OR cs.teacher_id = ?) LIMIT 1
      `, [id, req.user.specificId, req.user.specificId]);
      if (!assigned) return sendError(res, 'Bạn không được phân công lớp này', 403);
    }
    const [classes] = await db.execute(`
      SELECT c.*, t.full_name as homeroom_teacher_name
      FROM classes c
      LEFT JOIN teachers t ON c.homeroom_teacher_id = t.id
      WHERE c.id = ?
    `, [id]);

    if (classes.length === 0) {
      return sendError(res, 'Class not found', 404);
    }

    return sendSuccess(res, 'Class fetched', classes[0]);
  } catch (error) {
    return sendError(res, error.message);
  }
};

exports.createClass = async (req, res) => {
  try {
    const { 
      class_code, class_name, grade_level, academic_year, 
      homeroom_teacher_id, room, max_students, status 
    } = req.body;

    const [existing] = await db.execute('SELECT id FROM classes WHERE class_code = ?', [class_code]);
    if (existing.length > 0) {
      return sendError(res, 'Class code already exists', 400);
    }

    const [result] = await db.execute(`
      INSERT INTO classes (
        class_code, class_name, grade_level, academic_year, 
        homeroom_teacher_id, room, max_students, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      class_code, class_name, grade_level || null, academic_year, 
      homeroom_teacher_id || null, room || null, max_students || 40, status || 'active'
    ]);

    return sendSuccess(res, 'Class created', { id: result.insertId }, {}, 201);
  } catch (error) {
    return sendError(res, error.message);
  }
};

exports.updateClass = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      class_name, grade_level, academic_year, 
      homeroom_teacher_id, room, max_students, status 
    } = req.body;

    const [result] = await db.execute(`
      UPDATE classes SET 
        class_name = ?, grade_level = ?, academic_year = ?, 
        homeroom_teacher_id = ?, room = ?, max_students = ?, status = ?
      WHERE id = ?
    `, [
      class_name, grade_level || null, academic_year, 
      homeroom_teacher_id || null, room || null, max_students || 40, status || 'active', id
    ]);

    if (result.affectedRows === 0) {
      return sendError(res, 'Class not found', 404);
    }

    return sendSuccess(res, 'Class updated');
  } catch (error) {
    return sendError(res, error.message);
  }
};

exports.deleteClass = async (req, res) => {
  try {
    const { id } = req.params;
    const [[dependencies]] = await db.execute(`
      SELECT
        (SELECT COUNT(*) FROM students WHERE class_id = ?) +
        (SELECT COUNT(*) FROM grades WHERE class_id = ?) +
        (SELECT COUNT(*) FROM schedules WHERE class_id = ?) +
        (SELECT COUNT(*) FROM class_subjects WHERE class_id = ?) AS total
    `, [id, id, id, id]);
    if (Number(dependencies.total) > 0) {
      return sendError(res, 'Lớp đang có dữ liệu liên quan. Hãy chuyển lớp sang trạng thái lưu trữ thay vì xóa.', 409);
    }
    const [result] = await db.execute('DELETE FROM classes WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return sendError(res, 'Class not found', 404);
    }

    return sendSuccess(res, 'Class deleted');
  } catch (error) {
    return sendError(res, error.message);
  }
};
