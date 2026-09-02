const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendance.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');
const validation = require('../middlewares/validation.middleware');

router.get('/', protect, validation.pagination, validation.handleValidation, attendanceController.getAttendance);
router.post('/', protect, authorize('admin', 'teacher'), validation.attendance, attendanceController.markAttendance);
router.post('/bulk', protect, authorize('admin', 'teacher'), validation.attendanceBulk, attendanceController.bulkMarkAttendance);

module.exports = router;
