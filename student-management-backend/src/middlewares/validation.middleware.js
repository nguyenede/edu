const { body, param, query, validationResult } = require('express-validator');
const { sendError } = require('../utils/response');
const fs = require('fs');

const handleValidation = (req, res, next) => {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    if (req.file?.path) {
      try { fs.unlinkSync(req.file.path); } catch (_error) { /* best-effort cleanup */ }
    }
    return sendError(
      res,
      'Dữ liệu gửi lên không hợp lệ',
      422,
      result.array({ onlyFirstError: true }).map(({ path, msg }) => ({ field: path, message: msg }))
    );
  }
  next();
};

const optionalText = (field, max) => body(field).optional({ values: 'falsy' }).isString().trim().isLength({ max });
const optionalId = (field) => body(field).optional({ values: 'falsy' }).isInt({ min: 1 }).toInt();
const requiredId = (field) => body(field).isInt({ min: 1 }).toInt();
const accountFields = [
  body('create_account').optional().isBoolean().toBoolean(),
  body('password')
    .custom((value, { req }) => {
      if (!req.body.create_account && !value) return true;
      if (typeof value !== 'string' || value.length < 8 || value.length > 128) {
        throw new Error('Mật khẩu tài khoản phải có từ 8 đến 128 ký tự');
      }
      return true;
    }),
  body('create_account').custom((enabled, { req }) => {
    if (enabled && !req.body.email) throw new Error('Email là bắt buộc khi tạo tài khoản');
    return true;
  })
];

const idParam = (name = 'id') => [param(name).isInt({ min: 1 }).toInt(), handleValidation];
const pagination = [
  query('page').optional().isInt({ min: 1, max: 100000 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('search').optional().isString().trim().isLength({ max: 120 })
];

const login = [
  body('email').isEmail().normalizeEmail().isLength({ max: 120 }),
  body('password').isString().isLength({ min: 6, max: 128 }),
  handleValidation
];

const profile = [
  body('full_name').isString().trim().isLength({ min: 2, max: 100 }),
  optionalText('phone', 20),
  handleValidation
];

const password = [
  body('current_password').isString().isLength({ min: 6, max: 128 }),
  body('new_password')
    .isString()
    .isLength({ min: 8, max: 128 })
    .withMessage('Mật khẩu mới phải có từ 8 đến 128 ký tự'),
  handleValidation
];

const student = [
  optionalText('student_code', 30),
  body('full_name').isString().trim().isLength({ min: 2, max: 100 }),
  body('email').optional({ values: 'falsy' }).isEmail().normalizeEmail().isLength({ max: 120 }),
  optionalText('phone', 20),
  body('gender').optional().isIn(['male', 'female', 'other']),
  body('date_of_birth').isISO8601({ strict: true }).custom((value) => value <= new Date().toISOString().slice(0, 10)).withMessage('Ngày sinh là bắt buộc và không được ở tương lai'),
  optionalText('place_of_birth', 255),
  optionalText('nationality', 100),
  optionalText('ethnicity', 100),
  body('identity_number').optional({ values: 'falsy' }).isString().trim().matches(/^[A-Za-z0-9]{6,20}$/).withMessage('Số giấy tờ chỉ gồm 6-20 chữ cái hoặc chữ số'),
  body('identity_issue_date').optional({ values: 'falsy' }).isISO8601({ strict: true })
    .custom((value, { req }) => value <= new Date().toISOString().slice(0, 10) && (!req.body.date_of_birth || value >= req.body.date_of_birth))
    .withMessage('Ngày cấp giấy tờ phải từ ngày sinh đến hiện tại'),
  optionalText('identity_issue_place', 255),
  body('identity_number').custom((value, { req }) => {
    if (!value && (req.body.identity_issue_date || req.body.identity_issue_place)) throw new Error('Cần nhập số giấy tờ khi có thông tin cấp');
    return true;
  }),
  optionalText('address', 1000),
  optionalText('permanent_address', 1000),
  optionalText('emergency_contact_name', 100),
  body('emergency_contact_phone').optional({ values: 'falsy' }).isString().trim().matches(/^[0-9+().\s-]{7,20}$/).withMessage('Số điện thoại khẩn cấp không hợp lệ'),
  body('emergency_contact_name').custom((value, { req }) => {
    if (Boolean(value) !== Boolean(req.body.emergency_contact_phone)) throw new Error('Cần nhập đủ tên và số điện thoại liên hệ khẩn cấp');
    return true;
  }),
  requiredId('class_id'),
  body('admission_date').optional({ values: 'falsy' }).isISO8601({ strict: true }).custom((value) => value <= new Date().toISOString().slice(0, 10)).withMessage('Ngày nhập học không được ở tương lai'),
  optionalText('previous_school', 255),
  body('academic_year').isString().trim().matches(/^\d{4}-\d{4}$/).custom((value) => Number(value.slice(5)) === Number(value.slice(0, 4)) + 1).withMessage('Năm học phải có dạng 2026-2027'),
  body('status').optional().isIn(['active', 'inactive', 'graduated', 'suspended']),
  optionalText('note', 2000),
  ...accountFields,
  handleValidation
];

const teacher = [
  optionalText('teacher_code', 30),
  body('full_name').isString().trim().isLength({ min: 2, max: 100 }),
  body('email').optional({ values: 'falsy' }).isEmail().normalizeEmail().isLength({ max: 120 }),
  optionalText('phone', 20),
  body('gender').optional({ values: 'falsy' }).isIn(['male', 'female', 'other']),
  body('date_of_birth').optional({ values: 'falsy' }).isISO8601(),
  optionalText('specialization', 100), optionalText('degree', 100),
  body('hire_date').optional({ values: 'falsy' }).isISO8601(),
  body('status').optional().isIn(['active', 'inactive', 'retired']),
  ...accountFields,
  handleValidation
];

const schoolClass = [
  body('class_code').optional().isString().trim().isLength({ min: 1, max: 30 }),
  body('class_name').isString().trim().isLength({ min: 1, max: 100 }),
  optionalText('grade_level', 20),
  body('academic_year').isString().trim().matches(/^\d{4}-\d{4}$/),
  optionalId('homeroom_teacher_id'), optionalText('room', 50),
  body('max_students').optional().isInt({ min: 1, max: 200 }).toInt(),
  body('status').optional().isIn(['active', 'inactive', 'archived']),
  handleValidation
];

const schoolClassCreate = [
  body('class_code').isString().trim().isLength({ min: 1, max: 30 }),
  ...schoolClass.slice(1)
];

const subject = [
  body('subject_code').optional().isString().trim().isLength({ min: 1, max: 30 }),
  body('subject_name').isString().trim().isLength({ min: 1, max: 100 }),
  optionalText('description', 2000),
  body('periods_per_week').optional().isInt({ min: 0, max: 30 }).toInt(),
  body('status').optional().isIn(['active', 'inactive']),
  handleValidation
];

const subjectCreate = [
  body('subject_code').isString().trim().isLength({ min: 1, max: 30 }),
  ...subject.slice(1)
];

const payment = [
  requiredId('student_id'),
  body('payment_type').isIn(['tuition', 'insurance', 'service', 'uniform', 'books', 'meal', 'other']),
  body('amount').isFloat({ min: 1, max: 999999999999 }).toFloat(),
  body('due_date').isISO8601(), optionalText('description', 2000),
  handleValidation
];

const parentLink = [
  requiredId('parent_id'), body('is_primary').optional().isBoolean().toBoolean(), handleValidation
];

const parentLinkRequest = [
  requiredId('student_id'), requiredId('parent_id'), body('is_primary').optional().isBoolean().toBoolean(), handleValidation
];

const parent = [
  body('full_name').isString().trim().isLength({ min: 2, max: 100 }),
  body('email').optional({ values: 'falsy' }).isEmail().normalizeEmail().isLength({ max: 120 }),
  optionalText('phone', 20),
  body('relationship').optional({ values: 'falsy' }).isIn(['father', 'mother', 'guardian', 'other']),
  optionalText('address', 1000),
  ...accountFields,
  handleValidation
];

const globalSearch = [
  query('q').isString().trim().isLength({ min: 2, max: 100 }), handleValidation
];

const aiChat = [
  body('message').isString().trim().isLength({ min: 1, max: 2000 }), handleValidation
];

const health = [
  body('height_cm').optional({ values: 'falsy' }).isFloat({ min: 30, max: 300 }).toFloat(),
  body('weight_kg').optional({ values: 'falsy' }).isFloat({ min: 1, max: 500 }).toFloat(),
  body('blood_type').optional({ values: 'falsy' }).isIn(['A', 'B', 'AB', 'O', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
  optionalText('allergies', 2000), optionalText('medical_history', 5000), optionalText('physical_status', 100),
  handleValidation
];

const behavior = [
  body('type').isIn(['reward', 'discipline']),
  body('title').isString().trim().isLength({ min: 2, max: 200 }),
  optionalText('description', 5000), body('date').optional({ values: 'falsy' }).isISO8601(),
  optionalText('decision_number', 50), handleValidation
];

const scores = ['oral_score', 'quiz_score', 'test_score', 'midterm_score', 'final_score']
  .map((field) => body(field).optional({ nullable: true }).isFloat({ min: 0, max: 10 }).toFloat());

const gradeCreate = [
  requiredId('student_id'), requiredId('class_id'), requiredId('subject_id'), optionalId('teacher_id'),
  body('semester').isString().trim().isLength({ min: 1, max: 20 }),
  body('academic_year').isString().trim().isLength({ min: 4, max: 20 }),
  ...scores,
  optionalText('note', 2000),
  handleValidation
];

const gradeUpdate = [...scores, optionalText('note', 2000), handleValidation];

const attendance = [
  requiredId('student_id'), requiredId('class_id'),
  body('date').isISO8601({ strict: true }).custom((value) => value <= new Date().toISOString().slice(0, 10)).withMessage('Không thể điểm danh cho ngày tương lai'),
  body('status').isIn(['present', 'absent', 'late', 'excused']),
  optionalText('note', 1000),
  handleValidation
];

const attendanceBulk = [
  requiredId('class_id'),
  body('date').isISO8601({ strict: true }).custom((value) => value <= new Date().toISOString().slice(0, 10)).withMessage('Không thể điểm danh cho ngày tương lai'),
  body('records').isArray({ min: 1, max: 100 }),
  body('records.*.student_id').isInt({ min: 1 }).toInt(),
  body('records.*.status').isIn(['present', 'absent', 'late', 'excused']),
  body('records.*.note').optional({ values: 'falsy' }).isString().trim().isLength({ max: 1000 }),
  handleValidation
];

const schedule = [
  requiredId('class_id'), requiredId('subject_id'), requiredId('teacher_id'),
  body('day_of_week').isIn(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']),
  body('start_time').matches(/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/),
  body('end_time').matches(/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/),
  optionalText('room', 50),
  body('semester').isString().trim().isLength({ min: 1, max: 20 }),
  body('academic_year').isString().trim().matches(/^\d{4}-\d{4}$/),
  handleValidation
];

const notification = [
  body('title').isString().trim().isLength({ min: 2, max: 200 }),
  body('content').isString().trim().isLength({ min: 2, max: 10000 }),
  body('audience_type').isIn(['all', 'role', 'class', 'student', 'parent', 'teacher']),
  optionalText('audience_value', 100),
  body('priority').optional().isIn(['normal', 'important', 'urgent']),
  handleValidation
];

const uploadOwner = [
  body('owner_type').isIn(['student', 'teacher', 'user', 'class']),
  requiredId('owner_id'),
  handleValidation
];

module.exports = {
  handleValidation,
  idParam,
  pagination,
  login,
  profile,
  password,
  student,
  teacher,
  schoolClass,
  schoolClassCreate,
  subject,
  subjectCreate,
  payment,
  parentLink,
  parentLinkRequest,
  parent,
  globalSearch,
  aiChat,
  health,
  behavior,
  gradeCreate,
  gradeUpdate,
  attendance,
  attendanceBulk,
  schedule,
  notification,
  uploadOwner
};
