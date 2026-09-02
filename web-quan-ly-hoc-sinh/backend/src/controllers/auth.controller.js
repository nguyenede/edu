const db = require('../config/database');
const { comparePassword, hashPassword } = require('../utils/password');
const { generateToken } = require('../utils/jwt');
const { sendSuccess, sendError } = require('../utils/response');
const { logAction } = require('../utils/logger');
const { enforcePasswordPolicy } = require('../utils/passwordPolicy');
const fs = require('fs/promises');
const path = require('path');

const isValidAvatarFile = async (file) => {
  const handle = await fs.open(file.path, 'r');
  try {
    const buffer = Buffer.alloc(12);
    await handle.read(buffer, 0, buffer.length, 0);
    if (file.mimetype === 'image/jpeg') return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    if (file.mimetype === 'image/png') return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    if (file.mimetype === 'image/webp') return buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP';
    return false;
  } finally {
    await handle.close();
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, 'Email and password are required', 400);
    }

    // Find user by email
    const [users] = await db.execute('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
    const user = users[0];

    if (!user) {
      return sendError(res, 'Invalid email or password', 401);
    }

    if (user.status !== 'active') {
      return sendError(res, 'Your account is ' + user.status, 403);
    }

    const isMatch = await comparePassword(password, user.password_hash);
    if (!isMatch) {
      return sendError(res, 'Invalid email or password', 401);
    }

    // Get specific ID based on role
    let specificId = null;
    if (user.role === 'student') {
      const [[student]] = await db.execute('SELECT id FROM students WHERE user_id = ?', [user.id]);
      specificId = student ? student.id : null;
    } else if (user.role === 'teacher') {
      const [[teacher]] = await db.execute('SELECT id FROM teachers WHERE user_id = ?', [user.id]);
      specificId = teacher ? teacher.id : null;
    } else if (user.role === 'parent') {
      const [[parent]] = await db.execute('SELECT id FROM parents WHERE user_id = ?', [user.id]);
      specificId = parent ? parent.id : null;
    }

    const token = generateToken(user);
    const safeUser = {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
      avatar_url: user.avatar_url,
      role: user.role,
      status: user.status,
      specificId
    };

    await db.execute('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id]);
    req.user = { id: user.id };
    await logAction(req, 'LOGIN', 'user', user.id, null, null);

    return sendSuccess(res, 'Login successful', {
      user: safeUser,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    return sendError(res, error.message);
  }
};

exports.getMe = async (req, res) => {
  try {
    const userId = req.user.id;
    const [users] = await db.execute('SELECT id, full_name, email, role, avatar_url, phone, status FROM users WHERE id = ?', [userId]);
    const user = users[0];

    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    // Get specific ID based on role
    let specificId = null;
    if (user.role === 'student') {
      const [[student]] = await db.execute('SELECT id FROM students WHERE user_id = ?', [user.id]);
      specificId = student ? student.id : null;
    } else if (user.role === 'teacher') {
      const [[teacher]] = await db.execute('SELECT id FROM teachers WHERE user_id = ?', [user.id]);
      specificId = teacher ? teacher.id : null;
    } else if (user.role === 'parent') {
      const [[parent]] = await db.execute('SELECT id FROM parents WHERE user_id = ?', [user.id]);
      specificId = parent ? parent.id : null;
    }
    
    user.specificId = specificId;

    return sendSuccess(res, 'User profile fetched', { user });
  } catch (error) {
    return sendError(res, error.message);
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { full_name, phone } = req.body;

    await db.execute(
      'UPDATE users SET full_name = ?, phone = ? WHERE id = ?',
      [full_name, phone, userId]
    );

    return sendSuccess(res, 'Profile updated successfully');
  } catch (error) {
    return sendError(res, error.message);
  }
};

exports.updateAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return sendError(res, 'No file uploaded', 400);
    }

    if (!await isValidAvatarFile(req.file)) {
      await fs.unlink(req.file.path).catch(() => {});
      return sendError(res, 'Nội dung file ảnh không hợp lệ', 422);
    }

    const userId = req.user.id;
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    const [[currentUser]] = await db.execute('SELECT avatar_url FROM users WHERE id = ?', [userId]);

    await db.execute('UPDATE users SET avatar_url = ? WHERE id = ?', [avatarUrl, userId]);

    if (currentUser?.avatar_url?.startsWith('/uploads/avatars/')) {
      const oldPath = path.join(__dirname, '../../uploads/avatars', path.basename(currentUser.avatar_url));
      await fs.unlink(oldPath).catch(() => {});
    }

    return sendSuccess(res, 'Avatar updated successfully', { avatar_url: avatarUrl });
  } catch (error) {
    if (req.file?.path) await fs.unlink(req.file.path).catch(() => {});
    return sendError(res, error.message);
  }
};

exports.changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { current_password, new_password } = req.body;

    const [users] = await db.execute('SELECT password_hash FROM users WHERE id = ?', [userId]);
    const user = users[0];

    if (!user) {
      return sendError(res, 'Tài khoản không tồn tại', 404);
    }

    const isMatch = await comparePassword(current_password, user.password_hash);
    if (!isMatch) {
      return sendError(res, 'Mật khẩu hiện tại không đúng', 400);
    }

    await enforcePasswordPolicy(new_password);
    const hashed = await hashPassword(new_password);
    await db.execute('UPDATE users SET password_hash = ?, token_version = token_version + 1 WHERE id = ?', [hashed, userId]);

    await logAction(req, 'CHANGE_PASSWORD', 'user', userId, null, null);

    return sendSuccess(res, 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.');
  } catch (error) {
    return sendError(res, error.message, error.status || 500);
  }
};

exports.logout = (req, res) => {
  return sendSuccess(res, 'Logged out successfully');
};
