const db = require('../config/database');
const { sendSuccess, sendError } = require('../utils/response');
const { getPagination } = require('../utils/pagination');

const canReceiveNotification = async (notification, user) => {
  if (!notification || notification.status !== 'sent') return false;
  if (Number(notification.sender_id) === Number(user.id) || notification.audience_type === 'all') return true;
  const value = notification.audience_value;
  if (notification.audience_type === 'role') return value === user.role;
  if (['student', 'teacher', 'parent'].includes(notification.audience_type)) {
    return notification.audience_type === user.role && (!value || String(user.specificId) === String(value));
  }
  if (notification.audience_type === 'class') {
    if (!value) return false;
    if (user.role === 'student') {
      const [[row]] = await db.execute('SELECT 1 FROM students WHERE id = ? AND class_id = ?', [user.specificId, value]);
      return Boolean(row);
    }
    if (user.role === 'parent') {
      const [[row]] = await db.execute(`
        SELECT 1 FROM students s JOIN student_parents sp ON sp.student_id = s.id
        WHERE sp.parent_id = ? AND s.class_id = ? LIMIT 1
      `, [user.specificId, value]);
      return Boolean(row);
    }
    if (user.role === 'teacher') {
      const [[row]] = await db.execute(`
        SELECT 1 FROM classes c LEFT JOIN class_subjects cs ON cs.class_id = c.id
        WHERE c.id = ? AND (c.homeroom_teacher_id = ? OR cs.teacher_id = ?) LIMIT 1
      `, [value, user.specificId, user.specificId]);
      return Boolean(row);
    }
  }
  return false;
};

exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    const specificId = req.user.specificId;
    const { page, limit, offset } = getPagination(req.query, 20, 100);
    
    // Get notifications for this user based on role or specific audience
    // This is a simplified version
    let query = `
      SELECT n.*, nr.read_at, u.full_name as sender_name
      FROM notifications n
      LEFT JOIN notification_reads nr ON n.id = nr.notification_id AND nr.user_id = ?
      LEFT JOIN users u ON n.sender_id = u.id
      WHERE n.status = 'sent'
      AND (
        n.sender_id = ?
        OR n.audience_type = 'all'
        OR (n.audience_type = 'role' AND n.audience_value = ?)
        OR (n.audience_type = ? AND n.audience_type IN ('student', 'teacher', 'parent') AND (n.audience_value IS NULL OR n.audience_value = '' OR n.audience_value = ?))
        OR (n.audience_type = 'class' AND (
          (? = 'student' AND EXISTS (SELECT 1 FROM students s WHERE s.id = ? AND CAST(s.class_id AS CHAR) = n.audience_value))
          OR (? = 'parent' AND EXISTS (
            SELECT 1 FROM students s JOIN student_parents sp ON sp.student_id = s.id
            WHERE sp.parent_id = ? AND CAST(s.class_id AS CHAR) = n.audience_value
          ))
          OR (? = 'teacher' AND EXISTS (
            SELECT 1 FROM classes c LEFT JOIN class_subjects cs ON cs.class_id = c.id
            WHERE CAST(c.id AS CHAR) = n.audience_value AND (c.homeroom_teacher_id = ? OR cs.teacher_id = ?)
          ))
        ))
      )
      ORDER BY n.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const [notifications] = await db.execute(query, [
      userId, userId, role, role, String(specificId || ''),
      role, specificId || 0,
      role, specificId || 0,
      role, specificId || 0, specificId || 0,
      limit, offset
    ]);
    return sendSuccess(res, 'Notifications fetched', notifications, { page, limit });
  } catch (error) {
    return sendError(res, error.message);
  }
};

exports.createNotification = async (req, res) => {
  try {
    const { title, content, audience_type, audience_value, priority } = req.body;
    const sender_id = req.user.id;

    if (audience_type !== 'all' && !audience_value) {
      return sendError(res, 'Đối tượng nhận thông báo là bắt buộc', 422);
    }
    if (audience_type === 'role' && !['admin', 'teacher', 'student', 'parent'].includes(audience_value)) {
      return sendError(res, 'Vai trò nhận thông báo không hợp lệ', 422);
    }
    if (req.user.role === 'teacher') {
      if (!['class', 'student'].includes(audience_type)) {
        return sendError(res, 'Giáo viên chỉ được gửi thông báo tới lớp hoặc học sinh được phân công', 403);
      }
      let permitted = false;
      if (audience_type === 'class') {
        const [[assigned]] = await db.execute(`
          SELECT 1 FROM classes c LEFT JOIN class_subjects cs ON cs.class_id = c.id
          WHERE c.id = ? AND (c.homeroom_teacher_id = ? OR cs.teacher_id = ?) LIMIT 1
        `, [audience_value, req.user.specificId, req.user.specificId]);
        permitted = Boolean(assigned);
      } else {
        const [[assignedStudent]] = await db.execute(`
          SELECT 1 FROM students s JOIN classes c ON c.id = s.class_id
          LEFT JOIN class_subjects cs ON cs.class_id = c.id
          WHERE s.id = ? AND (c.homeroom_teacher_id = ? OR cs.teacher_id = ?) LIMIT 1
        `, [audience_value, req.user.specificId, req.user.specificId]);
        permitted = Boolean(assignedStudent);
      }
      if (!permitted) return sendError(res, 'Bạn không được phân công đối tượng nhận này', 403);
    }

    const [result] = await db.execute(`
      INSERT INTO notifications (title, content, sender_id, audience_type, audience_value, priority, status)
      VALUES (?, ?, ?, ?, ?, ?, 'sent')
    `, [title, content, sender_id, audience_type, audience_value, priority || 'normal']);

    return sendSuccess(res, 'Notification sent', { id: result.insertId }, {}, 201);
  } catch (error) {
    return sendError(res, error.message);
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const [[notification]] = await db.execute('SELECT * FROM notifications WHERE id = ?', [id]);
    if (!notification) return sendError(res, 'Notification not found', 404);
    if (!await canReceiveNotification(notification, req.user)) {
      return sendError(res, 'Bạn không có quyền truy cập thông báo này', 403);
    }

    await db.execute(`
      INSERT IGNORE INTO notification_reads (notification_id, user_id)
      VALUES (?, ?)
    `, [id, userId]);

    return sendSuccess(res, 'Notification marked as read');
  } catch (error) {
    return sendError(res, error.message);
  }
};
