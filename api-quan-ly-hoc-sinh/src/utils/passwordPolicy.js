const db = require('../config/database');

const getPasswordMinLength = async () => {
  const [[setting]] = await db.execute(
    "SELECT setting_value FROM settings WHERE setting_key = 'password_min_length' LIMIT 1"
  );
  const configured = Number(setting?.setting_value || 8);
  return Number.isInteger(configured) && configured >= 8 && configured <= 128 ? configured : 8;
};

const enforcePasswordPolicy = async (password) => {
  const minimum = await getPasswordMinLength();
  if (typeof password !== 'string' || password.length < minimum || password.length > 128) {
    const error = new Error(`Mật khẩu phải có từ ${minimum} đến 128 ký tự`);
    error.status = 422;
    throw error;
  }
};

module.exports = { getPasswordMinLength, enforcePasswordPolicy };
