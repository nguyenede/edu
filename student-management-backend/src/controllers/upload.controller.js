const db = require('../config/database');
const { sendSuccess, sendError } = require('../utils/response');
const { canAccessStudent, teacherCanManageClass } = require('../middlewares/access.middleware');
const fs = require('fs/promises');
const path = require('path');

const UPLOADS_BASE = path.resolve(__dirname, '../../uploads');

const removeUploadedFile = async (file) => {
  if (file?.path) await fs.unlink(file.path).catch(() => {});
};

const hasValidSignature = async (file) => {
  const handle = await fs.open(file.path, 'r');
  try {
    const buffer = Buffer.alloc(12);
    await handle.read(buffer, 0, buffer.length, 0);
    if (file.mimetype === 'image/jpeg') return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    if (file.mimetype === 'image/png') return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    if (file.mimetype === 'image/webp') return buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP';
    if (file.mimetype === 'application/pdf') return buffer.subarray(0, 5).toString() === '%PDF-';
    if (file.mimetype.includes('openxmlformats')) return buffer.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
    if (file.mimetype === 'application/msword' || file.mimetype === 'application/vnd.ms-excel') {
      return buffer.subarray(0, 4).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0]));
    }
    return false;
  } finally {
    await handle.close();
  }
};

const canAccessOwner = async (user, ownerType, ownerId, write = false) => {
  const id = Number(ownerId);
  if (!Number.isInteger(id) || id < 1) return false;
  if (user.role === 'admin') return true;

  if (ownerType === 'user') return id === Number(user.id);
  if (ownerType === 'teacher') return user.role === 'teacher' && id === Number(user.specificId);
  if (ownerType === 'student') {
    if (write && user.role === 'parent') return false;
    return canAccessStudent(user, id);
  }
  if (ownerType === 'class') {
    if (user.role === 'teacher') return teacherCanManageClass(user.specificId, id);
    if (write) return false;
    if (user.role === 'student') {
      const [[student]] = await db.execute('SELECT 1 FROM students WHERE id = ? AND class_id = ?', [user.specificId, id]);
      return Boolean(student);
    }
    if (user.role === 'parent') {
      const [[linked]] = await db.execute(`
        SELECT 1 FROM students s
        JOIN student_parents sp ON sp.student_id = s.id
        WHERE sp.parent_id = ? AND s.class_id = ? LIMIT 1
      `, [user.specificId, id]);
      return Boolean(linked);
    }
  }
  return false;
};

const resolveDocumentPath = (storedPath) => {
  const absolutePath = path.resolve(UPLOADS_BASE, 'documents', path.basename(storedPath));
  const documentsBase = path.resolve(UPLOADS_BASE, 'documents') + path.sep;
  return absolutePath.startsWith(documentsBase) ? absolutePath : null;
};

exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return sendError(res, 'Không có file nào được tải lên', 400);
    }

    if (!await hasValidSignature(req.file)) {
      await removeUploadedFile(req.file);
      return sendError(res, 'Nội dung file ảnh không hợp lệ', 422);
    }

    const fileUrl = `/uploads/avatars/${req.file.filename}`;
    
    // If it's a student/teacher avatar, we might want to update their record directly
    // but usually we just return the URL and let the caller decide
    
    return sendSuccess(res, 'Tải lên avatar thành công', { url: fileUrl });
  } catch (error) {
    return sendError(res, error.message);
  }
};

exports.uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return sendError(res, 'Không có file nào được tải lên', 400);
    }

    const { owner_type, owner_id } = req.body;
    if (!owner_type || !owner_id) {
      await removeUploadedFile(req.file);
      return sendError(res, 'Thiếu thông tin chủ sở hữu tài liệu', 400);
    }

    if (!await canAccessOwner(req.user, owner_type, owner_id, true)) {
      await removeUploadedFile(req.file);
      return sendError(res, 'Bạn không có quyền tải tài liệu lên đối tượng này', 403);
    }

    if (!await hasValidSignature(req.file)) {
      await removeUploadedFile(req.file);
      return sendError(res, 'Nội dung file không khớp với định dạng cho phép', 422);
    }

    const fileName = path.basename(req.file.originalname).replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 255) || req.file.filename;
    const filePath = `/uploads/documents/${req.file.filename}`;
    const fileType = req.file.mimetype;
    const fileSize = req.file.size;

    const [result] = await db.execute(`
      INSERT INTO files (owner_type, owner_id, file_name, file_path, file_type, file_size, uploaded_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [owner_type, owner_id, fileName, filePath, fileType, fileSize, req.user.id]);

    return sendSuccess(res, 'Tải lên tài liệu thành công', { 
      id: result.insertId,
      name: fileName,
      url: filePath
    }, {}, 201);
  } catch (error) {
    await removeUploadedFile(req.file);
    return sendError(res, error.message);
  }
};

exports.getFiles = async (req, res) => {
  try {
    const { owner_type, owner_id } = req.query;
    if (!owner_type || !owner_id) {
      return sendError(res, 'Thiếu thông tin truy vấn tài liệu', 400);
    }

    if (!await canAccessOwner(req.user, owner_type, owner_id, false)) {
      return sendError(res, 'Bạn không có quyền xem tài liệu này', 403);
    }

    const [files] = await db.execute(`
      SELECT * FROM files 
      WHERE owner_type = ? AND owner_id = ?
      ORDER BY created_at DESC
    `, [owner_type, owner_id]);

    return sendSuccess(res, 'Lấy danh sách tài liệu thành công', files);
  } catch (error) {
    return sendError(res, error.message);
  }
};

exports.downloadFile = async (req, res) => {
  try {
    const [[file]] = await db.execute('SELECT * FROM files WHERE id = ?', [req.params.id]);
    if (!file) return sendError(res, 'Tài liệu không tồn tại', 404);
    if (!await canAccessOwner(req.user, file.owner_type, file.owner_id, false)) {
      return sendError(res, 'Bạn không có quyền tải tài liệu này', 403);
    }

    const absolutePath = resolveDocumentPath(file.file_path);
    if (!absolutePath) return sendError(res, 'Đường dẫn tài liệu không hợp lệ', 400);

    await fs.access(absolutePath);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.download(absolutePath, file.file_name);
  } catch (error) {
    if (error.code === 'ENOENT') return sendError(res, 'File vật lý không còn tồn tại', 404);
    return sendError(res, error.message);
  }
};

exports.deleteFile = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 1. Get file info to delete from disk (optional, but good)
    const [files] = await db.execute('SELECT * FROM files WHERE id = ?', [id]);
    if (files.length === 0) {
      return sendError(res, 'Tài liệu không tồn tại', 404);
    }

    const file = files[0];
    const canDelete = req.user.role === 'admin' || Number(file.uploaded_by) === Number(req.user.id);
    if (!canDelete || !await canAccessOwner(req.user, file.owner_type, file.owner_id, true)) {
      return sendError(res, 'Bạn không có quyền xóa tài liệu này', 403);
    }

    // 2. Delete from DB
    await db.execute('DELETE FROM files WHERE id = ?', [id]);

    const absolutePath = resolveDocumentPath(file.file_path);
    if (absolutePath) await fs.unlink(absolutePath).catch(() => {});

    return sendSuccess(res, 'Xóa tài liệu thành công');
  } catch (error) {
    return sendError(res, error.message);
  }
};
