const express = require('express');
const router = express.Router();
const subjectController = require('../controllers/subject.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');
const validation = require('../middlewares/validation.middleware');

router.get('/', protect, authorize('admin', 'teacher'), validation.pagination, validation.handleValidation, subjectController.getSubjects);
router.get('/:id', protect, authorize('admin', 'teacher'), ...validation.idParam(), subjectController.getSubjectById);
router.post('/', protect, authorize('admin'), validation.subjectCreate, subjectController.createSubject);
router.put('/:id', protect, authorize('admin'), ...validation.idParam(), validation.subject, subjectController.updateSubject);
router.delete('/:id', protect, authorize('admin'), ...validation.idParam(), subjectController.deleteSubject);

module.exports = router;
