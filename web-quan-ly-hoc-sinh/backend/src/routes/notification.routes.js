const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');
const validation = require('../middlewares/validation.middleware');

router.get('/', protect, notificationController.getNotifications);
router.post('/', protect, authorize('admin', 'teacher'), validation.notification, notificationController.createNotification);
router.post('/:id/read', protect, ...validation.idParam(), notificationController.markAsRead);

module.exports = router;
