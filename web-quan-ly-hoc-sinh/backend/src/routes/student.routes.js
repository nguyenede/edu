const express = require('express');
const router = express.Router();
const studentController = require('../controllers/student.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');
const { requireStudentAccess } = require('../middlewares/access.middleware');
const validation = require('../middlewares/validation.middleware');

router.get('/', protect, authorize('admin', 'teacher'), validation.pagination, validation.handleValidation, studentController.getStudents);
router.get('/:id', protect, ...validation.idParam(), requireStudentAccess(), studentController.getStudentById);
router.post('/', protect, authorize('admin'), validation.student, studentController.createStudent);
router.put('/:id', protect, authorize('admin'), ...validation.idParam(), validation.student, studentController.updateStudent);
router.delete('/:id', protect, authorize('admin'), ...validation.idParam(), studentController.deleteStudent);
router.get('/:id/parents', protect, ...validation.idParam(), requireStudentAccess(), studentController.getStudentParents);
router.post('/:id/parents', protect, authorize('admin'), ...validation.idParam(), validation.parentLink, studentController.addStudentParent);
router.delete('/:id/parents/:parentId', protect, authorize('admin'), ...validation.idParam(), ...validation.idParam('parentId'), studentController.removeStudentParent);

// Student Extended Modules: Health, Behavior and AI prediction
router.get('/:id/health', protect, ...validation.idParam(), requireStudentAccess(), studentController.getStudentHealth);
router.post('/:id/health', protect, authorize('admin', 'teacher'), ...validation.idParam(), requireStudentAccess(), validation.health, studentController.updateStudentHealth);
router.get('/:id/behavior', protect, ...validation.idParam(), requireStudentAccess(), studentController.getStudentBehavior);
router.post('/:id/behavior', protect, authorize('admin', 'teacher'), ...validation.idParam(), requireStudentAccess(), validation.behavior, studentController.addStudentBehavior);
router.delete('/:id/behavior/:behaviorId', protect, authorize('admin', 'teacher'), ...validation.idParam(), ...validation.idParam('behaviorId'), requireStudentAccess(), studentController.deleteStudentBehavior);
router.get('/:id/ai-prediction', protect, ...validation.idParam(), requireStudentAccess(), studentController.getStudentAiPrediction);

module.exports = router;
