const express = require('express');
const router = express.Router();
const gradeController = require('../controllers/grade.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');
const validation = require('../middlewares/validation.middleware');

router.get('/', protect, validation.pagination, validation.handleValidation, gradeController.getGrades);
router.post('/', protect, authorize('admin', 'teacher'), validation.gradeCreate, gradeController.createGrade);
router.put('/:id', protect, authorize('admin', 'teacher'), ...validation.idParam(), validation.gradeUpdate, gradeController.updateGrade);

module.exports = router;
