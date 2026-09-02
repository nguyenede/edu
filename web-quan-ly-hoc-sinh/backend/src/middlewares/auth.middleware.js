const { verifyToken } = require('../utils/jwt');
const { sendError } = require('../utils/response');
const db = require('../config/database');

exports.protect = async (req, res, next) => {
  try {
    const authorization = req.headers.authorization || '';
    const match = authorization.match(/^Bearer\s+(.+)$/i);
    const token = match?.[1];

    if (!token) {
      return sendError(res, 'Not authorized to access this route', 401);
    }

    try {
      const decoded = verifyToken(token);
      const [[user]] = await db.execute(
        'SELECT id, full_name, email, role, status, token_version FROM users WHERE id = ?',
        [decoded.id]
      );

      if (!user || user.status !== 'active') {
        return sendError(res, 'Tài khoản không tồn tại hoặc đã bị vô hiệu hóa', 401);
      }

      if (Number(decoded.tokenVersion || 0) !== Number(user.token_version || 0)) {
        return sendError(res, 'Phiên đăng nhập đã hết hiệu lực', 401);
      }

      let specificId = null;
      const roleTables = {
        student: 'students',
        teacher: 'teachers',
        parent: 'parents'
      };
      const roleTable = roleTables[user.role];
      if (roleTable) {
        const [[profile]] = await db.execute(`SELECT id FROM ${roleTable} WHERE user_id = ?`, [user.id]);
        specificId = profile?.id || null;
      }

      req.user = {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        specificId
      };
      next();
    } catch (err) {
      return sendError(res, 'Not authorized to access this route', 401);
    }
  } catch (error) {
    return sendError(res, 'Không thể xác thực phiên đăng nhập', 401);
  }
};

exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      const role = req.user?.role || 'anonymous';
      return sendError(res, `User role ${role} is not authorized to access this route`, 403);
    }
    next();
  };
};
