const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { protect } = require('../middlewares/auth.middleware');
const { uploadAvatar } = require('../middlewares/upload.middleware');
const { rateLimit } = require('express-rate-limit');
const validation = require('../middlewares/validation.middleware');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { success: false, message: 'Quá nhiều lần đăng nhập thất bại. Vui lòng thử lại sau.', errors: [] }
});

router.post('/login', loginLimiter, validation.login, authController.login);
router.get('/me', protect, authController.getMe);
router.put('/profile', protect, validation.profile, authController.updateProfile);
router.post('/change-password', protect, validation.password, authController.changePassword);
router.post('/avatar', protect, uploadAvatar.single('avatar'), authController.updateAvatar);
router.post('/logout', authController.logout);

module.exports = router;
