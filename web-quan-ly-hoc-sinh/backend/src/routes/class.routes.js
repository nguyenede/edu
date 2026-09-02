const express = require('express');
const router = express.Router();
const classController = require('../controllers/class.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');
const validation = require('../middlewares/validation.middleware');

router.get('/', protect, authorize('admin', 'teacher'), validation.pagination, validation.handleValidation, classController.getClasses);
router.get('/:id', protect, authorize('admin', 'teacher'), ...validation.idParam(), classController.getClassById);
router.post('/', protect, authorize('admin'), validation.schoolClassCreate, classController.createClass);
router.put('/:id', protect, authorize('admin'), ...validation.idParam(), validation.schoolClass, classController.updateClass);
router.delete('/:id', protect, authorize('admin'), ...validation.idParam(), classController.deleteClass);

module.exports = router;
