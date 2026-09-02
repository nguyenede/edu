const db = require('../config/database');
const { sendSuccess, sendError } = require('../utils/response');
const { logAction } = require('../utils/logger');
const { getPagination } = require('../utils/pagination');
const bcrypt = require('bcrypt');
const { enforcePasswordPolicy } = require('../utils/passwordPolicy');

const classHasCapacity = async (classId, excludeStudentId = null) => {
  if (!classId) return true;
  const [[classInfo]] = await db.execute(`
    SELECT c.max_students,
      (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id AND s.status = 'active' AND (? IS NULL OR s.id <> ?)) AS current_students
    FROM classes c WHERE c.id = ?
  `, [excludeStudentId, excludeStudentId, classId]);
  if (!classInfo) return null;
  return Number(classInfo.current_students) < Number(classInfo.max_students);
};

exports.getStudents = async (req, res) => {
  try {
    const { search = '', class_id, status } = req.query;
    const { page, limit, offset } = getPagination(req.query);

    let query = `
      SELECT s.*, c.class_name 
      FROM students s 
      LEFT JOIN classes c ON s.class_id = c.id 
      WHERE 1=1
    `;
    const params = [];

    if (req.user.role === 'teacher') {
      if (!req.user.specificId) return sendSuccess(res, 'Students fetched', [], { page, limit, total: 0, totalPages: 0 });
      query += ` AND (
        c.homeroom_teacher_id = ? OR EXISTS (
          SELECT 1 FROM class_subjects cs WHERE cs.class_id = s.class_id AND cs.teacher_id = ?
        )
      )`;
      params.push(req.user.specificId, req.user.specificId);
    }

    if (search) {
      query += ` AND (s.full_name LIKE ? OR s.student_code LIKE ? OR s.email LIKE ? OR s.identity_number LIKE ? OR s.emergency_contact_phone LIKE ?)`;
      const searchVal = `%${search}%`;
      params.push(searchVal, searchVal, searchVal, searchVal, searchVal);
    }

    if (class_id) {
      query += ` AND s.class_id = ?`;
      params.push(class_id);
    }

    if (status) {
      query += ` AND s.status = ?`;
      params.push(status);
    }

    // Get total count
    const [countResult] = await db.execute(query.replace('s.*, c.class_name', 'COUNT(*) as total'), params);
    const total = countResult[0].total;

    // Get paginated data
    query += ` ORDER BY s.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [students] = await db.execute(query, params);

    return sendSuccess(res, 'Students fetched', students, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    return sendError(res, error.message);
  }
};

exports.getStudentById = async (req, res) => {
  try {
    const { id } = req.params;
    const [students] = await db.execute(`
      SELECT s.*, c.class_name 
      FROM students s 
      LEFT JOIN classes c ON s.class_id = c.id 
      WHERE s.id = ?
    `, [id]);

    if (students.length === 0) {
      return sendError(res, 'Student not found', 404);
    }

    return sendSuccess(res, 'Student fetched', students[0]);
  } catch (error) {
    return sendError(res, error.message);
  }
};

exports.createStudent = async (req, res) => {
  try {
    let {
      student_code, full_name, email, phone, gender, date_of_birth,
      place_of_birth, nationality, ethnicity, identity_number, identity_issue_date, identity_issue_place,
      address, permanent_address, emergency_contact_name, emergency_contact_phone,
      class_id, admission_date, previous_school, academic_year, status, note,
      create_account, password
    } = req.body;

    // Auto-generate student code if not provided
    if (!student_code) {
      const [[{ maxCode }]] = await db.execute(
        "SELECT MAX(CAST(SUBSTRING(student_code, 4) AS UNSIGNED)) as maxCode FROM students WHERE student_code LIKE 'STU%'"
      );
      const nextNum = (maxCode || 0) + 1;
      student_code = `STU${String(nextNum).padStart(6, '0')}`;
    }

    // Check if code exists
    const [existing] = await db.execute('SELECT id FROM students WHERE student_code = ?', [student_code]);
    if (existing.length > 0) {
      return sendError(res, 'Student code already exists', 400);
    }

    const hasCapacity = await classHasCapacity(class_id);
    if (hasCapacity === null) return sendError(res, 'Class not found', 404);
    if (!hasCapacity) return sendError(res, 'Lớp học đã đủ sĩ số tối đa', 409);

    if (create_account) await enforcePasswordPolicy(password);
    const passwordHash = create_account ? await bcrypt.hash(password, 12) : null;
    const connection = await db.getConnection();
    let newId;
    try {
      await connection.beginTransaction();
      let userId = null;
      if (create_account) {
        const [userResult] = await connection.execute(`
          INSERT INTO users (full_name, email, password_hash, phone, role, status)
          VALUES (?, ?, ?, ?, 'student', ?)
        `, [full_name, email, passwordHash, phone || null, (status || 'active') === 'active' ? 'active' : 'inactive']);
        userId = userResult.insertId;
      }
      const [result] = await connection.execute(`
        INSERT INTO students (
          user_id, student_code, full_name, email, phone, gender, date_of_birth,
          place_of_birth, nationality, ethnicity, identity_number, identity_issue_date, identity_issue_place,
          address, permanent_address, emergency_contact_name, emergency_contact_phone,
          class_id, admission_date, previous_school, academic_year, status, note
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        userId, student_code, full_name, email || null, phone || null, gender || null, date_of_birth || null,
        place_of_birth || null, nationality || null, ethnicity || null, identity_number || null, identity_issue_date || null, identity_issue_place || null,
        address || null, permanent_address || null, emergency_contact_name || null, emergency_contact_phone || null,
        class_id || null, admission_date || null, previous_school || null, academic_year || null, status || 'active', note || null
      ]);
      newId = result.insertId;
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      if (error.code === 'ER_DUP_ENTRY') return sendError(res, 'Email, mã học sinh hoặc số giấy tờ đã tồn tại', 409);
      throw error;
    } finally {
      connection.release();
    }
    await logAction(req, 'CREATE', 'student', newId, null, req.body);

    return sendSuccess(res, 'Student created', { id: newId, account_created: Boolean(create_account) }, {}, 201);
  } catch (error) {
    return sendError(res, error.message, error.status || 500);
  }
};

exports.updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const [oldStudents] = await db.execute('SELECT * FROM students WHERE id = ?', [id]);
    if (oldStudents.length === 0) {
      return sendError(res, 'Student not found', 404);
    }

    const {
      full_name, email, phone, gender, date_of_birth,
      place_of_birth, nationality, ethnicity, identity_number, identity_issue_date, identity_issue_place,
      address, permanent_address, emergency_contact_name, emergency_contact_phone,
      class_id, admission_date, previous_school, academic_year, status, note
    } = req.body;

    const hasCapacity = await classHasCapacity(class_id, id);
    if (hasCapacity === null) return sendError(res, 'Class not found', 404);
    if (!hasCapacity) return sendError(res, 'Lớp học đã đủ sĩ số tối đa', 409);

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute(`
        UPDATE students SET
          full_name = ?, email = ?, phone = ?, gender = ?, date_of_birth = ?,
          place_of_birth = ?, nationality = ?, ethnicity = ?, identity_number = ?,
          identity_issue_date = ?, identity_issue_place = ?, address = ?, permanent_address = ?,
          emergency_contact_name = ?, emergency_contact_phone = ?, class_id = ?, admission_date = ?,
          previous_school = ?, academic_year = ?, status = ?, note = ?
        WHERE id = ?
      `, [
        full_name, email || null, phone || null, gender || null, date_of_birth || null,
        place_of_birth || null, nationality || null, ethnicity || null, identity_number || null,
        identity_issue_date || null, identity_issue_place || null, address || null, permanent_address || null,
        emergency_contact_name || null, emergency_contact_phone || null, class_id || null, admission_date || null,
        previous_school || null, academic_year || null, status || 'active', note || null, id
      ]);
      if (oldStudents[0].user_id) {
        await connection.execute(`
          UPDATE users SET full_name = ?, email = COALESCE(?, email), phone = ?, status = ? WHERE id = ?
        `, [full_name, email || null, phone || null, (status || 'active') === 'active' ? 'active' : 'inactive', oldStudents[0].user_id]);
      }
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      if (error.code === 'ER_DUP_ENTRY') return sendError(res, 'Email tài khoản hoặc số giấy tờ đã được sử dụng', 409);
      throw error;
    } finally {
      connection.release();
    }

    await logAction(req, 'UPDATE', 'student', id, oldStudents[0], req.body);

    return sendSuccess(res, 'Student updated');
  } catch (error) {
    return sendError(res, error.message);
  }
};

exports.deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const [oldStudents] = await db.execute('SELECT * FROM students WHERE id = ?', [id]);
    if (oldStudents.length === 0) return sendError(res, 'Student not found', 404);
    if (oldStudents[0].user_id) {
      return sendError(res, 'Học sinh đang có tài khoản đăng nhập. Hãy chuyển trạng thái hồ sơ thay vì xóa.', 409);
    }

    const [[dependencies]] = await db.execute(`
      SELECT
        (SELECT COUNT(*) FROM grades WHERE student_id = ?) +
        (SELECT COUNT(*) FROM attendance WHERE student_id = ?) +
        (SELECT COUNT(*) FROM payments WHERE student_id = ?) +
        (SELECT COUNT(*) FROM student_parents WHERE student_id = ?) AS total
    `, [id, id, id, id]);
    if (Number(dependencies.total) > 0) {
      return sendError(res, 'Học sinh đang có dữ liệu học tập hoặc tài chính. Hãy chuyển trạng thái hồ sơ thay vì xóa.', 409);
    }
    
    const [result] = await db.execute('DELETE FROM students WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return sendError(res, 'Student not found', 404);
    }

    await logAction(req, 'DELETE', 'student', id, oldStudents[0], null);

    return sendSuccess(res, 'Student deleted');
  } catch (error) {
    return sendError(res, error.message);
  }
};

exports.getStudentParents = async (req, res) => {
  try {
    const { id } = req.params;
    const [parents] = await db.execute(`
      SELECT p.*, sp.is_primary, sp.id as mapping_id
      FROM parents p
      JOIN student_parents sp ON p.id = sp.parent_id
      WHERE sp.student_id = ?
    `, [id]);

    return sendSuccess(res, 'Parents fetched', parents);
  } catch (error) {
    return sendError(res, error.message);
  }
};

exports.addStudentParent = async (req, res) => {
  try {
    const { id: student_id } = req.params;
    const { parent_id, is_primary } = req.body;

    await db.execute(`
      INSERT INTO student_parents (student_id, parent_id, is_primary)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE is_primary = ?
    `, [student_id, parent_id, is_primary, is_primary]);

    return sendSuccess(res, 'Parent linked to student');
  } catch (error) {
    return sendError(res, error.message);
  }
};

exports.removeStudentParent = async (req, res) => {
  try {
    const { id: student_id, parentId: parent_id } = req.params;
    await db.execute('DELETE FROM student_parents WHERE student_id = ? AND parent_id = ?', [student_id, parent_id]);
    return sendSuccess(res, 'Parent unlinked from student');
  } catch (error) {
    return sendError(res, error.message);
  }
};

// --- Student OS Extended Modules: Health, Behavior and Heuristic AI Advisor ---

exports.getStudentHealth = async (req, res) => {
  try {
    const { id } = req.params;
    const [records] = await db.execute('SELECT * FROM student_health WHERE student_id = ?', [id]);
    if (records.length === 0) {
      return sendSuccess(res, 'Student health record fetched', {
        student_id: parseInt(id),
        height_cm: null,
        weight_kg: null,
        blood_type: '',
        allergies: '',
        medical_history: '',
        physical_status: ''
      });
    }
    return sendSuccess(res, 'Student health record fetched', records[0]);
  } catch (error) {
    return sendError(res, error.message);
  }
};

exports.updateStudentHealth = async (req, res) => {
  try {
    const { id } = req.params;
    const { height_cm, weight_kg, blood_type, allergies, medical_history, physical_status } = req.body;
    await db.execute(`
      INSERT INTO student_health (student_id, height_cm, weight_kg, blood_type, allergies, medical_history, physical_status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        height_cm = VALUES(height_cm), 
        weight_kg = VALUES(weight_kg), 
        blood_type = VALUES(blood_type), 
        allergies = VALUES(allergies), 
        medical_history = VALUES(medical_history), 
        physical_status = VALUES(physical_status)
    `, [id, height_cm || null, weight_kg || null, blood_type || '', allergies || '', medical_history || '', physical_status || '']);

    await logAction(req, 'UPDATE', 'student_health', id, null, req.body);

    return sendSuccess(res, 'Student health record updated');
  } catch (error) {
    return sendError(res, error.message);
  }
};

exports.getStudentBehavior = async (req, res) => {
  try {
    const { id } = req.params;
    const [records] = await db.execute('SELECT * FROM student_behavior WHERE student_id = ? ORDER BY date DESC', [id]);
    return sendSuccess(res, 'Student behavior records fetched', records);
  } catch (error) {
    return sendError(res, error.message);
  }
};

exports.addStudentBehavior = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, title, description, date, decision_number } = req.body;
    const [result] = await db.execute(`
      INSERT INTO student_behavior (student_id, type, title, description, date, decision_number)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [id, type, title, description, date || new Date().toISOString().split('T')[0], decision_number || '']);

    await logAction(req, 'CREATE', 'student_behavior', result.insertId, null, req.body);

    return sendSuccess(res, 'Student behavior record added', { id: result.insertId }, {}, 201);
  } catch (error) {
    return sendError(res, error.message);
  }
};

exports.deleteStudentBehavior = async (req, res) => {
  try {
    const { behaviorId } = req.params;
    const { id: studentId } = req.params;
    const [oldBehavior] = await db.execute('SELECT * FROM student_behavior WHERE id = ? AND student_id = ?', [behaviorId, studentId]);
    const [result] = await db.execute('DELETE FROM student_behavior WHERE id = ? AND student_id = ?', [behaviorId, studentId]);

    if (result.affectedRows === 0) {
      return sendError(res, 'Behavior record not found', 404);
    }

    await logAction(req, 'DELETE', 'student_behavior', behaviorId, oldBehavior[0], null);

    return sendSuccess(res, 'Student behavior record deleted');
  } catch (error) {
    return sendError(res, error.message);
  }
};

exports.getStudentAiPrediction = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 1. Fetch academic performance (GPA)
    const [grades] = await db.execute(`
      SELECT average_score FROM grades WHERE student_id = ?
    `, [id]);
    
    let totalScore = 0;
    let validGradesCount = 0;
    
    grades.forEach(g => {
      if (g.average_score !== null && g.average_score !== undefined) {
        totalScore += parseFloat(g.average_score);
        validGradesCount++;
      }
    });
    
    const studentGpa = validGradesCount > 0 ? (totalScore / validGradesCount) : null;
    
    // 2. Fetch attendance statistics
    const [attendance] = await db.execute(`
      SELECT status FROM attendance WHERE student_id = ?
    `, [id]);
    
    let totalDays = attendance.length;
    let presentDays = attendance.filter(a => a.status === 'present' || a.status === 'excused').length;
    let absentDays = attendance.filter(a => a.status === 'absent').length;
    
    const attendanceRate = totalDays > 0 ? (presentDays / totalDays) * 100 : 100;
    
    // 3. Compute Local AI Advisor logic
    let riskLevel = 'Low';
    let riskLevelVi = 'An toàn / Học lực Tốt';
    let predictionMessage = 'Học sinh đang có phong độ học tập tốt và ý thức chuyên cần cao.';
    let recommendation = 'Tiếp tục phát huy phong độ này. Khuyến khích học sinh tham gia các hoạt động ngoại khóa, nghiên cứu khoa học hoặc tham dự kỳ thi chọn học sinh giỏi cấp trường/thành phố để phát triển tối đa năng lực.';
    let confidence = 95; // Confidence score (%)
    
    if (studentGpa !== null) {
      if (studentGpa < 5.0 || attendanceRate < 80) {
        riskLevel = 'High';
        riskLevelVi = 'Nguy cơ Cao (Học yếu / Nghỉ nhiều)';
        predictionMessage = `Học sinh có GPA hiện tại thấp (${studentGpa.toFixed(1)}/10) và tỷ lệ chuyên cần đáng lo ngại (${attendanceRate.toFixed(1)}%). Có nguy cơ trượt tốt nghiệp hoặc lưu ban nếu không cải thiện kịp thời.`;
        recommendation = 'Yêu cầu phối hợp khẩn cấp giữa Giáo viên chủ nhiệm và Phụ huynh học sinh. Xây dựng kế hoạch phụ đạo 1 kèm 1 ngoài giờ đối với các môn dưới trung bình. Giáo viên chủ nhiệm cần theo dõi sát sao tình hình đi học hàng ngày của học sinh.';
        confidence = 88;
      } else if (studentGpa < 6.5 || attendanceRate < 90) {
        riskLevel = 'Medium';
        riskLevelVi = 'Nguy cơ Trung bình (Sức học trung bình)';
        predictionMessage = `Học sinh có lực học trung bình khá (GPA ${studentGpa.toFixed(1)}/10) và chuyên cần ở mức ổn định (${attendanceRate.toFixed(1)}%). Vẫn còn một số phần kiến thức nền tảng bị thiếu sót.`;
        recommendation = 'Khuyến khích học sinh tham gia các nhóm học tập cùng bạn bè. Giáo viên bộ môn nên tăng cường kiểm tra bài cũ và hỗ trợ giải đáp nhanh các thắc mắc cuối giờ. Đôn đốc học sinh hoàn thành đầy đủ bài tập về nhà.';
        confidence = 85;
      }
    } else {
      predictionMessage = 'Hệ thống chưa có đủ dữ liệu điểm số của học sinh này để thực hiện phân tích chuyên sâu.';
      recommendation = 'Vui lòng hoàn tất nhập điểm số các bài kiểm tra miệng, 15 phút hoặc giữa kỳ để kích hoạt tính năng phân tích dự đoán kết quả học tập tự động bằng AI.';
      confidence = 50;
    }
    
    return sendSuccess(res, 'AI learning prediction calculated successfully', {
      student_id: parseInt(id),
      gpa: studentGpa !== null ? parseFloat(studentGpa.toFixed(2)) : null,
      attendance_rate: parseFloat(attendanceRate.toFixed(1)),
      absent_days: absentDays,
      total_attendance_days: totalDays,
      risk_level: riskLevel,
      risk_level_vi: riskLevelVi,
      prediction_message: predictionMessage,
      recommendation: recommendation,
      confidence_score: confidence,
      analyzed_at: new Date().toISOString()
    });
  } catch (error) {
    return sendError(res, error.message);
  }
};
