const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/schedule.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');
const validation = require('../middlewares/validation.middleware');

router.get('/', protect, scheduleController.getSchedules);
router.post('/', protect, authorize('admin'), validation.schedule, scheduleController.createSchedule);
router.put('/:id', protect, authorize('admin'), ...validation.idParam(), validation.schedule, scheduleController.updateSchedule);
router.delete('/:id', protect, authorize('admin'), ...validation.idParam(), scheduleController.deleteSchedule);

module.exports = router;
