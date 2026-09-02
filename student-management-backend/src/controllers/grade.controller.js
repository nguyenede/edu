const db = require('../config/database');
const { sendSuccess, sendError } = require('../utils/response');
const { getPagination } = require('../utils/pagination');

const calculateGrade = (values) => {
  const weights = {
    oral_score: 0.1,
    quiz_score: 0.15,
    test_score: 0.2,
    midterm_score: 0.25,
    final_score: 0.3
  };
  let totalWeight = 0;
  let weightedSum = 0;
  for (const [field, weight] of Object.entries(weights)) {
    const value = values[field];
    if (value !== null && value !== undefined && value !== '') {
      weightedSum += Number(value) * weight;
      totalWeight += weight;
    }
  }
  const average = totalWeight > 0 ? Number((weightedSum / totalWeight).toFixed(1)) : null;
  let letter = null;
  if (average !== null) {
    if (average >= 8.5) letter = 'A';
    else if (average >= 7) letter = 'B';
    else if (average >= 5.5) letter = 'C';
    else if (average >= 4) letter = 'D';
    else letter = 'F';
  }
  return { average, letter };
};

const teacherCanManageSubject = async (teacherId, classId, subjectId) => {
  const [[assignment]] = await db.execute(`
    SELECT 1 FROM class_subjects
    WHERE teacher_id = ? AND class_id = ? AND subject_id = ?
    LIMIT 1
  `, [teacherId, classId, subjectId]);
  return Boolean(assignment);
};

exports.getGrades = async (req, res) => {
  try {
    const { student_id, class_id, subject_id, semester, academic_year } = req.query;
    const { page, limit, offset } = getPagination(req.query);
    const { role, specificId } = req.user;

    let query = `
      SELECT g.*, s.full_name as student_name, s.student_code, c.class_name, sub.subject_name
      FROM grades g
      JOIN students s ON g.student_id = s.id
      JOIN classes c ON g.class_id = c.id
      JOIN subjects sub ON g.subject_id = sub.id
      WHERE 1=1
    `;
    const params = [];

    // Role-based filtering
    if (role === 'student') {
      query += ` AND g.student_id = ?`;
      params.push(specificId);
    } else if (role === 'parent') {
      query += ` AND g.student_id IN (SELECT student_id FROM student_parents WHERE parent_id = ?)`;
      params.push(specificId);
      if (student_id) {
        query += ` AND g.student_id = ?`;
        params.push(student_id);
      }
    } else {
      if (role === 'teacher') {
        if (!specificId) return sendSuccess(res, 'Grades fetched', [], { page, limit, total: 0, totalPages: 0 });
        query += ` AND EXISTS (
          SELECT 1 FROM class_subjects cs
          WHERE cs.class_id = g.class_id AND cs.subject_id = g.subject_id AND cs.teacher_id = ?
        )`;
        params.push(specificId);
      }
      if (student_id) {
        query += ` AND g.student_id = ?`;
        params.push(student_id);
      }
    }

    if (class_id) {
      query += ` AND g.class_id = ?`;
      params.push(class_id);
    }
    if (subject_id) {
      query += ` AND g.subject_id = ?`;
      params.push(subject_id);
    }
    if (semester) {
      query += ` AND g.semester = ?`;
      params.push(semester);
    }
    if (academic_year) {
      query += ` AND g.academic_year = ?`;
      params.push(academic_year);
    }

    const [countResult] = await db.execute(query.replace('g.*, s.full_name as student_name, s.student_code, c.class_name, sub.subject_name', 'COUNT(*) as total'), params);
    const total = countResult[0].total;

    query += ` ORDER BY g.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [grades] = await db.execute(query, params);

    return sendSuccess(res, 'Grades fetched', grades, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    return sendError(res, error.message);
  }
};

exports.updateGrade = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 1. Fetch current grade record to merge
    const [grades] = await db.execute('SELECT * FROM grades WHERE id = ?', [id]);
    if (grades.length === 0) {
      return sendError(res, 'Grade record not found', 404);
    }
    const current = grades[0];

    if (req.user.role === 'teacher' && !await teacherCanManageSubject(req.user.specificId, current.class_id, current.subject_id)) {
      return sendError(res, 'Bạn không được phân công nhập điểm cho lớp và môn này', 403);
    }

    // 2. Merge values: prioritize req.body, fall back to current db values
    const oral_score = req.body.oral_score !== undefined ? req.body.oral_score : current.oral_score;
    const quiz_score = req.body.quiz_score !== undefined ? req.body.quiz_score : current.quiz_score;
    const test_score = req.body.test_score !== undefined ? req.body.test_score : current.test_score;
    const midterm_score = req.body.midterm_score !== undefined ? req.body.midterm_score : current.midterm_score;
    const final_score = req.body.final_score !== undefined ? req.body.final_score : current.final_score;
    const note = req.body.note !== undefined ? req.body.note : current.note;

    const { average: avg, letter } = calculateGrade({ oral_score, quiz_score, test_score, midterm_score, final_score });

    // 4. Update the record
    await db.execute(`
      UPDATE grades SET 
        oral_score = ?, quiz_score = ?, test_score = ?, 
        midterm_score = ?, final_score = ?, average_score = ?, 
        grade_letter = ?, note = ?
      WHERE id = ?
    `, [oral_score, quiz_score, test_score, midterm_score, final_score, avg, letter, note || '', id]);

    return sendSuccess(res, 'Grade updated', { average_score: avg, grade_letter: letter });
  } catch (error) {
    return sendError(res, error.message);
  }
};

exports.createGrade = async (req, res) => {
  try {
    const {
      student_id, class_id, subject_id, semester, academic_year,
      oral_score = null, quiz_score = null, test_score = null,
      midterm_score = null, final_score = null, note = '', teacher_id: requestedTeacherId
    } = req.body;

    const [[student]] = await db.execute('SELECT class_id FROM students WHERE id = ?', [student_id]);
    if (!student) return sendError(res, 'Student not found', 404);
    if (Number(student.class_id) !== Number(class_id)) {
      return sendError(res, 'Học sinh không thuộc lớp đã chọn', 422);
    }

    let teacherId = requestedTeacherId || null;
    if (req.user.role === 'teacher') {
      teacherId = req.user.specificId;
      if (!await teacherCanManageSubject(teacherId, class_id, subject_id)) {
        return sendError(res, 'Bạn không được phân công nhập điểm cho lớp và môn này', 403);
      }
    }

    const [existing] = await db.execute(`
      SELECT id FROM grades 
      WHERE student_id = ? AND class_id = ? AND subject_id = ? AND semester = ? AND academic_year = ?
    `, [student_id, class_id, subject_id, semester, academic_year]);

    if (existing.length > 0) {
      return sendError(res, 'Grade record already exists for this student in this subject/semester', 400);
    }

    const { average, letter } = calculateGrade({ oral_score, quiz_score, test_score, midterm_score, final_score });

    const [result] = await db.execute(`
      INSERT INTO grades (
        student_id, class_id, subject_id, teacher_id, semester, academic_year,
        oral_score, quiz_score, test_score, midterm_score, final_score,
        average_score, grade_letter, note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      student_id, class_id, subject_id, teacherId, semester, academic_year,
      oral_score, quiz_score, test_score, midterm_score, final_score,
      average, letter, note
    ]);

    return sendSuccess(res, 'Grade record created', { id: result.insertId, average_score: average, grade_letter: letter }, {}, 201);
  } catch (error) {
    return sendError(res, error.message);
  }
};
