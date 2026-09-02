const db = require('../config/database');
const { sendError } = require('../utils/response');

const isPositiveId = (value) => Number.isInteger(Number(value)) && Number(value) > 0;

const canAccessStudent = async (user, studentId) => {
  if (!user || !isPositiveId(studentId)) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'teacher') {
    const [[assigned]] = await db.execute(`
      SELECT 1
      FROM students s
      JOIN classes c ON c.id = s.class_id
      LEFT JOIN class_subjects cs ON cs.class_id = c.id
      WHERE s.id = ? AND (c.homeroom_teacher_id = ? OR cs.teacher_id = ?)
      LIMIT 1
    `, [studentId, user.specificId, user.specificId]);
    return Boolean(assigned);
  }
  if (user.role === 'student') return Number(user.specificId) === Number(studentId);
  if (user.role === 'parent') {
    const [[linked]] = await db.execute(
      'SELECT 1 FROM student_parents WHERE student_id = ? AND parent_id = ? LIMIT 1',
      [studentId, user.specificId]
    );
    return Boolean(linked);
  }
  return false;
};

const requireStudentAccess = (paramName = 'id') => async (req, res, next) => {
  try {
    const studentId = req.params[paramName] || req.query.student_id || req.body.student_id;
    if (!isPositiveId(studentId)) {
      return sendError(res, 'Mã học sinh không hợp lệ', 400);
    }
    if (!await canAccessStudent(req.user, studentId)) {
      return sendError(res, 'Bạn không có quyền truy cập hồ sơ học sinh này', 403);
    }
    next();
  } catch (error) {
    next(error);
  }
};

const teacherCanManageClass = async (teacherId, classId) => {
  if (!isPositiveId(teacherId) || !isPositiveId(classId)) return false;
  const [[assignment]] = await db.execute(`
    SELECT 1
    FROM classes c
    LEFT JOIN class_subjects cs ON cs.class_id = c.id
    WHERE c.id = ? AND (c.homeroom_teacher_id = ? OR cs.teacher_id = ?)
    LIMIT 1
  `, [classId, teacherId, teacherId]);
  return Boolean(assignment);
};

module.exports = {
  canAccessStudent,
  requireStudentAccess,
  teacherCanManageClass,
  isPositiveId
};
