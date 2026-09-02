const db = require('../config/database');
const { sendSuccess, sendError } = require('../utils/response');

const validateSettingValue = (key, value) => {
  if (!/^[a-z0-9_]{2,100}$/i.test(key) || typeof value !== 'string' || value.length > 5000) return false;
  const trimmed = value.trim();
  if (key === 'school_name') return trimmed.length >= 2 && trimmed.length <= 200;
  if (key === 'school_code') return /^[\p{L}\p{N}._ -]{1,50}$/u.test(trimmed);
  if (key === 'school_address') return trimmed.length >= 2 && trimmed.length <= 500;
  if (key === 'current_academic_year') {
    const match = trimmed.match(/^(\d{4})-(\d{4})$/);
    return Boolean(match && Number(match[2]) === Number(match[1]) + 1);
  }
  if (key === 'default_semester') return trimmed.length >= 1 && trimmed.length <= 50;
  if (key === 'password_min_length') return /^\d{1,3}$/.test(trimmed) && Number(trimmed) >= 8 && Number(trimmed) <= 128;
  return true;
};

exports.getSettings = async (req, res) => {
  try {
    const [settings] = await db.execute('SELECT * FROM settings');
    
    // Transform to object for easier use on frontend if needed
    const settingsObj = {};
    settings.forEach(s => {
      settingsObj[s.setting_key] = s.setting_value;
    });

    return sendSuccess(res, 'Settings fetched', { list: settings, object: settingsObj });
  } catch (error) {
    return sendError(res, error.message);
  }
};

exports.updateSetting = async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (!validateSettingValue(key, value)) {
      return sendError(res, 'Cấu hình không hợp lệ', 422);
    }

    const [result] = await db.execute('UPDATE settings SET setting_value = ? WHERE setting_key = ?', [value, key]);

    if (result.affectedRows === 0) {
      return sendError(res, 'Setting not found', 404);
    }

    return sendSuccess(res, 'Setting updated');
  } catch (error) {
    return sendError(res, error.message);
  }
};

exports.updateMultipleSettings = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { settings } = req.body; // Expecting { key1: val1, key2: val2 }

    if (!settings || typeof settings !== 'object' || Array.isArray(settings) || Object.keys(settings).length > 50) {
      return sendError(res, 'Danh sách cấu hình không hợp lệ', 422);
    }

    await connection.beginTransaction();
    for (const [key, value] of Object.entries(settings)) {
      if (!validateSettingValue(key, value)) {
        throw Object.assign(new Error('Cấu hình không hợp lệ'), { status: 422 });
      }
      const [result] = await connection.execute('UPDATE settings SET setting_value = ? WHERE setting_key = ?', [value, key]);
      if (result.affectedRows === 0) throw Object.assign(new Error(`Không tìm thấy cấu hình ${key}`), { status: 404 });
    }

    await connection.commit();

    return sendSuccess(res, 'Multiple settings updated');
  } catch (error) {
    await connection.rollback();
    return sendError(res, error.message, error.status || 500);
  } finally {
    connection.release();
  }
};
