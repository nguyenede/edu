const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teacher.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');
const validation = require('../middlewares/validation.middleware');

router.get('/', protect, authorize('admin'), validation.pagination, validation.handleValidation, teacherController.getTeachers);
router.get('/:id', protect, authorize('admin'), ...validation.idParam(), teacherController.getTeacherById);
router.post('/', protect, authorize('admin'), validation.teacher, teacherController.createTeacher);
router.put('/:id', protect, authorize('admin'), ...validation.idParam(), validation.teacher, teacherController.updateTeacher);
router.delete('/:id', protect, authorize('admin'), ...validation.idParam(), teacherController.deleteTeacher);

module.exports = router;
