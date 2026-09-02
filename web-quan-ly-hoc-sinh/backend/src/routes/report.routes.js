const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');
const validation = require('../middlewares/validation.middleware');

router.get('/dashboard', protect, reportController.getDashboardStats);
router.get('/student-growth', protect, authorize('admin'), reportController.getStudentGrowth);
router.get('/grade-distribution', protect, authorize('admin'), reportController.getGradeDistribution);
router.get('/search', protect, authorize('admin', 'teacher'), validation.globalSearch, reportController.globalSearch);
router.post('/ai-advisor/chat', protect, validation.aiChat, reportController.aiAdvisorChat);

module.exports = router;
