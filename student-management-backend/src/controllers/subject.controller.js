const db = require('../config/database');
const { sendSuccess, sendError } = require('../utils/response');
const { getPagination } = require('../utils/pagination');

exports.getSubjects = async (req, res) => {
  try {
    const { search = '' } = req.query;
    const { page, limit, offset } = getPagination(req.query);

    let query = `SELECT * FROM subjects WHERE 1=1`;
    const params = [];

    if (req.user.role === 'teacher') {
      if (!req.user.specificId) return sendSuccess(res, 'Subjects fetched', [], { page, limit, total: 0, totalPages: 0 });
      query += ` AND EXISTS (
        SELECT 1 FROM class_subjects cs WHERE cs.subject_id = subjects.id AND cs.teacher_id = ?
      )`;
      params.push(req.user.specificId);
    }

    if (search) {
      query += ` AND (subject_name LIKE ? OR subject_code LIKE ?)`;
      const searchVal = `%${search}%`;
      params.push(searchVal, searchVal);
    }

    const [countResult] = await db.execute(query.replace('*', 'COUNT(*) as total'), params);
    const total = countResult[0].total;

    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [subjects] = await db.execute(query, params);

    return sendSuccess(res, 'Subjects fetched', subjects, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    return sendError(res, error.message);
  }
};

exports.getSubjectById = async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.role === 'teacher') {
      const [[assigned]] = await db.execute(
        'SELECT 1 FROM class_subjects WHERE subject_id = ? AND teacher_id = ? LIMIT 1',
        [id, req.user.specificId]
      );
      if (!assigned) return sendError(res, 'Bạn không được phân công môn học này', 403);
    }
    const [subjects] = await db.execute('SELECT * FROM subjects WHERE id = ?', [id]);

    if (subjects.length === 0) {
      return sendError(res, 'Subject not found', 404);
    }

    return sendSuccess(res, 'Subject fetched', subjects[0]);
  } catch (error) {
    return sendError(res, error.message);
  }
};

exports.createSubject = async (req, res) => {
  try {
    const { subject_code, subject_name, description, periods_per_week, status } = req.body;

    const [existing] = await db.execute('SELECT id FROM subjects WHERE subject_code = ?', [subject_code]);
    if (existing.length > 0) {
      return sendError(res, 'Subject code already exists', 400);
    }

    const [result] = await db.execute(`
      INSERT INTO subjects (subject_code, subject_name, description, periods_per_week, status)
      VALUES (?, ?, ?, ?, ?)
    `, [subject_code, subject_name, description || null, periods_per_week || 0, status || 'active']);

    return sendSuccess(res, 'Subject created', { id: result.insertId }, {}, 201);
  } catch (error) {
    return sendError(res, error.message);
  }
};

exports.updateSubject = async (req, res) => {
  try {
    const { id } = req.params;
    const { subject_name, description, periods_per_week, status } = req.body;

    const [result] = await db.execute(`
      UPDATE subjects SET subject_name = ?, description = ?, periods_per_week = ?, status = ?
      WHERE id = ?
    `, [subject_name, description || null, periods_per_week || 0, status || 'active', id]);

    if (result.affectedRows === 0) {
      return sendError(res, 'Subject not found', 404);
    }

    return sendSuccess(res, 'Subject updated');
  } catch (error) {
    return sendError(res, error.message);
  }
};

exports.deleteSubject = async (req, res) => {
  try {
    const { id } = req.params;
    const [[dependencies]] = await db.execute(`
      SELECT
        (SELECT COUNT(*) FROM grades WHERE subject_id = ?) +
        (SELECT COUNT(*) FROM schedules WHERE subject_id = ?) +
        (SELECT COUNT(*) FROM class_subjects WHERE subject_id = ?) AS total
    `, [id, id, id]);
    if (Number(dependencies.total) > 0) {
      return sendError(res, 'Môn học đang có dữ liệu liên quan. Hãy chuyển sang tạm dừng thay vì xóa.', 409);
    }
    const [result] = await db.execute('DELETE FROM subjects WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return sendError(res, 'Subject not found', 404);
    }

    return sendSuccess(res, 'Subject deleted');
  } catch (error) {
    return sendError(res, error.message);
  }
};
