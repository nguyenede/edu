const express = require('express');
const router = express.Router();
const auditController = require('../controllers/audit.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');
const validation = require('../middlewares/validation.middleware');

router.get('/', protect, authorize('admin'), validation.pagination, validation.handleValidation, auditController.getAuditLogs);

module.exports = router;
