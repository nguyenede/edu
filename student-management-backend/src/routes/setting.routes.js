const express = require('express');
const router = express.Router();
const settingController = require('../controllers/setting.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

router.use(protect);
router.get('/', settingController.getSettings);

// Only admin can update settings
router.put('/:key', authorize('admin'), settingController.updateSetting);
router.post('/bulk', authorize('admin'), settingController.updateMultipleSettings);

module.exports = router;
