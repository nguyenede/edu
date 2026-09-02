const db = require('../config/database');
const { sendSuccess, sendError } = require('../utils/response');

exports.getDashboardStats = async (req, res) => {
  try {
    const { role, id: userId } = req.user;

    if (role === 'admin') {
      const [studentResult, teacherResult, classResult, paymentResult] = await Promise.all([
        db.execute("SELECT COUNT(*) as total FROM students WHERE status = 'active'"),
        db.execute("SELECT COUNT(*) as total FROM teachers WHERE status = 'active'"),
        db.execute("SELECT COUNT(*) as total FROM classes WHERE status = 'active'"),
        db.execute("SELECT SUM(amount) as total FROM payments WHERE status IN ('unpaid', 'overdue')")
      ]);
      return sendSuccess(res, 'Dashboard stats fetched', {
        students: studentResult[0][0].total,
        teachers: teacherResult[0][0].total,
        classes: classResult[0][0].total,
        pendingPayments: paymentResult[0][0].total || 0
      });
    }

    if (role === 'teacher') {
      const [[teacher]] = await db.execute('SELECT id FROM teachers WHERE user_id = ?', [userId]);
      if (!teacher) return sendError(res, 'Hồ sơ giáo viên không tồn tại', 404);
      const [[counts]] = await db.execute(`
        SELECT
          COUNT(DISTINCT c.id) AS classes,
          COUNT(DISTINCT s.id) AS students,
          COUNT(DISTINCT sc.id) AS scheduleItems
        FROM classes c
        LEFT JOIN class_subjects cs ON cs.class_id = c.id AND cs.teacher_id = ?
        LEFT JOIN students s ON s.class_id = c.id
        LEFT JOIN schedules sc ON sc.class_id = c.id AND sc.teacher_id = ?
        WHERE c.homeroom_teacher_id = ? OR cs.teacher_id = ?
      `, [teacher.id, teacher.id, teacher.id, teacher.id]);
      return sendSuccess(res, 'Teacher dashboard stats fetched', {
        students: counts.students || 0,
        classes: counts.classes || 0,
        scheduleItems: counts.scheduleItems || 0
      });
    }
    
    if (role === 'student') {
      // Find the student record associated with this user
      const [[student]] = await db.execute('SELECT id, class_id FROM students WHERE user_id = ?', [userId]);
      if (!student) return sendError(res, 'Hồ sơ học sinh không tồn tại', 404);

      const [[avgScore]] = await db.execute('SELECT AVG(average_score) as avg FROM grades WHERE student_id = ?', [student.id]);
      const [[attendance]] = await db.execute(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status IN ('present', 'excused') THEN 1 ELSE 0 END) as present
        FROM attendance WHERE student_id = ?
      `, [student.id]);
      const [[notifications]] = await db.execute(`
        SELECT COUNT(*) as unread FROM notifications n
        LEFT JOIN notification_reads nr ON n.id = nr.notification_id AND nr.user_id = ?
        WHERE nr.id IS NULL AND n.status = 'sent' AND (
          n.audience_type = 'all'
          OR (n.audience_type = 'role' AND n.audience_value = 'student')
          OR (n.audience_type = 'student' AND (n.audience_value IS NULL OR n.audience_value = '' OR n.audience_value = ?))
          OR (n.audience_type = 'class' AND n.audience_value = ?)
        )
      `, [userId, String(student.id), String(student.class_id || '')]);
      const [[pendingTuition]] = await db.execute("SELECT SUM(amount) as total FROM payments WHERE student_id = ? AND status IN ('unpaid', 'overdue')", [student.id]);
      const [gradeTrend] = await db.execute(`
        SELECT CONCAT(semester, ' • ', academic_year) AS name, ROUND(AVG(average_score), 2) AS grade
        FROM grades
        WHERE student_id = ? AND average_score IS NOT NULL
        GROUP BY academic_year, semester
        ORDER BY academic_year, semester
      `, [student.id]);

      const attendancePct = attendance.total > 0 ? Math.round((attendance.present / attendance.total) * 100) : 100;

      return sendSuccess(res, 'Student dashboard stats fetched', {
        avgGrade: avgScore.avg ? parseFloat(avgScore.avg).toFixed(1) : 'N/A',
        attendanceRate: attendancePct + '%',
        unreadNotifications: notifications.unread,
        pendingPayments: pendingTuition.total || 0,
        gradeTrend
      });
    }

    if (role === 'parent') {
      // Find children linked to this parent
      const [[parent]] = await db.execute('SELECT id FROM parents WHERE user_id = ?', [userId]);
      if (!parent) return sendError(res, 'Hồ sơ phụ huynh không tồn tại', 404);

      const [children] = await db.execute(`
        SELECT s.id, s.full_name, s.student_code, c.class_name,
          ROUND((SELECT AVG(g.average_score) FROM grades g WHERE g.student_id = s.id), 1) AS avgGrade,
          COALESCE((
            SELECT ROUND(100 * SUM(CASE WHEN a.status IN ('present', 'excused') THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0))
            FROM attendance a WHERE a.student_id = s.id
          ), 100) AS attendanceRate,
          COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.student_id = s.id AND p.status IN ('unpaid', 'overdue')), 0) AS pendingPayments
        FROM students s
        JOIN student_parents sp ON s.id = sp.student_id
        LEFT JOIN classes c ON s.class_id = c.id
        WHERE sp.parent_id = ?
      `, [parent.id]);

      return sendSuccess(res, 'Parent dashboard stats fetched', {
        childrenCount: children.length,
        children: children
      });
    }

    return sendError(res, 'Vai trò không hợp lệ', 403);
  } catch (error) {
    return sendError(res, error.message);
  }
};

exports.getStudentGrowth = async (req, res) => {
  try {
    // Count students by month for the last 6 months
    const [data] = await db.execute(`
      SELECT
        DATE_FORMAT(created_at, '%Y-%m') as month_key,
        CONCAT('Tháng ', MONTH(created_at)) as name,
        COUNT(*) as count
      FROM students
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(created_at, '%Y-%m')
      ORDER BY month_key ASC
    `);

    const countsByMonth = new Map(data.map((item) => [item.month_key, Number(item.count)]));
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months.push({ name: `Tháng ${date.getMonth() + 1}`, count: countsByMonth.get(key) || 0 });
    }
    return sendSuccess(res, 'Growth data fetched', months);
  } catch (error) {
    return sendError(res, error.message);
  }
};

exports.getGradeDistribution = async (req, res) => {
  try {
    const [distribution] = await db.execute(`
      SELECT grade_letter as name, COUNT(*) as value 
      FROM grades 
      WHERE grade_letter IS NOT NULL 
      GROUP BY grade_letter
    `);
    return sendSuccess(res, 'Grade distribution fetched', distribution);
  } catch (error) {
    return sendError(res, error.message);
  }
};

exports.globalSearch = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return sendSuccess(res, 'Query too short', []);

    const searchTerm = `%${q}%`;

    const teacherId = req.user.role === 'teacher' ? req.user.specificId : null;
    const teacherStudentScope = teacherId ? `AND EXISTS (
      SELECT 1 FROM classes c LEFT JOIN class_subjects cs ON cs.class_id = c.id
      WHERE c.id = students.class_id AND (c.homeroom_teacher_id = ? OR cs.teacher_id = ?)
    )` : '';
    const studentParams = teacherId
      ? [searchTerm, searchTerm, teacherId, teacherId]
      : [searchTerm, searchTerm];
    const [students] = await db.execute(`
      SELECT id, full_name as title, student_code as subtitle, 'student' as type 
      FROM students 
      WHERE (full_name LIKE ? OR student_code LIKE ?)
      ${teacherStudentScope}
      LIMIT 5
    `, studentParams);

    const [teachers] = req.user.role === 'admin' ? await db.execute(`
      SELECT id, full_name as title, email as subtitle, 'teacher' as type 
      FROM teachers 
      WHERE full_name LIKE ? OR email LIKE ?
      LIMIT 5
    `, [searchTerm, searchTerm]) : [[]];

    const classScope = teacherId ? `AND (
      homeroom_teacher_id = ? OR EXISTS (SELECT 1 FROM class_subjects cs WHERE cs.class_id = classes.id AND cs.teacher_id = ?)
    )` : '';
    const classParams = teacherId ? [searchTerm, teacherId, teacherId] : [searchTerm];
    const [classes] = await db.execute(`
      SELECT id, class_name as title, '' as subtitle, 'class' as type 
      FROM classes 
      WHERE class_name LIKE ? ${classScope}
      LIMIT 5
    `, classParams);

    return sendSuccess(res, 'Search results fetched', [...students, ...teachers, ...classes]);
  } catch (error) {
    return sendError(res, error.message);
  }
};

exports.aiAdvisorChat = async (req, res) => {
  try {
    const { message } = req.body;
    const { role, id: userId } = req.user;

    if (!message || message.trim() === '') {
      return sendError(res, 'Tin nhắn không được để trống', 400);
    }

    const cleanMsg = message.toLowerCase().trim();

    // 1. Fetch user specific data
    let studentId = null;
    let studentName = '';
    let parentName = '';
    let selectedStudent = null;
    let studentsToAnalyze = [];

    if (role === 'student') {
      const [[stu]] = await db.execute('SELECT s.*, c.class_name FROM students s LEFT JOIN classes c ON s.class_id = c.id WHERE s.user_id = ?', [userId]);
      if (!stu) return sendError(res, 'Hồ sơ học sinh không tồn tại', 404);
      selectedStudent = stu;
      studentId = stu.id;
      studentName = stu.full_name;
      studentsToAnalyze.push(stu);
    } else if (role === 'parent') {
      const [[par]] = await db.execute('SELECT * FROM parents WHERE user_id = ?', [userId]);
      if (!par) return sendError(res, 'Hồ sơ phụ huynh không tồn tại', 404);
      parentName = par.full_name;

      const [children] = await db.execute(`
        SELECT s.*, c.class_name 
        FROM students s 
        JOIN student_parents sp ON s.id = sp.student_id 
        LEFT JOIN classes c ON s.class_id = c.id
        WHERE sp.parent_id = ?
      `, [par.id]);

      if (children.length === 0) {
        return sendSuccess(res, 'AI Advisor Response', {
          reply: `Xin chào phụ huynh **${parentName}**. Hệ thống nhận thấy tài khoản của anh/chị hiện chưa được liên kết với hồ sơ học sinh nào. Vui lòng liên hệ với nhà trường để liên kết tài khoản trước khi sử dụng trợ lý AI.`,
          analyzedStudent: null
        });
      }

      studentsToAnalyze = children;

      // Detect if parent mentions a specific child's name
      let foundChild = children[0];
      for (const child of children) {
        if (cleanMsg.includes(child.full_name.toLowerCase()) || cleanMsg.includes(child.student_code.toLowerCase())) {
          foundChild = child;
          break;
        }
      }
      selectedStudent = foundChild;
      studentId = foundChild.id;
      studentName = foundChild.full_name;
    } else {
      // Admin/Teacher general assistant response
      return sendSuccess(res, 'AI Advisor Response', {
        reply: `Xin chào **${req.user.full_name}** (Vai trò: ${role === 'admin' ? 'Quản trị viên' : 'Giáo viên'}).\n\nTôi là **AI Advisor** hỗ trợ nghiệp vụ trường học. Tôi có thể hỗ trợ anh/chị:\n\n1. **Phân tích kết quả học thuật**: Xem chi tiết dự báo học lực từng học sinh tại trang "Hồ sơ chi tiết học sinh" -> chọn tab "AI Phân tích học tập".\n2. **Gợi ý giảng dạy**: Nhận phân tích phổ điểm và phương pháp giảng dạy tại mục "Điểm số" -> Chọn lớp & môn học.\n3. **Thống kê báo cáo**: Xem biểu đồ tăng trưởng và cơ cấu xếp loại học sinh tại trang "Báo cáo & Thống kê".\n\nAnh/chị muốn tôi hỗ trợ thông tin nào?`,
        analyzedStudent: null
      });
    }

    // 2. Fetch student metrics for analysis
    // Grades
    const [grades] = await db.execute(`
      SELECT g.*, sub.subject_name 
      FROM grades g 
      JOIN subjects sub ON g.subject_id = sub.id 
      WHERE g.student_id = ?
    `, [studentId]);

    // Attendance
    const [attendance] = await db.execute('SELECT * FROM attendance WHERE student_id = ?', [studentId]);

    // Payments
    const [payments] = await db.execute("SELECT * FROM payments WHERE student_id = ? AND status = 'unpaid'", [studentId]);

    // Schedule Today
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = days[new Date().getDay()];
    const [schedules] = await db.execute(`
      SELECT s.*, sub.subject_name, t.full_name as teacher_name 
      FROM schedules s 
      JOIN subjects sub ON s.subject_id = sub.id 
      JOIN teachers t ON s.teacher_id = t.id 
      WHERE s.class_id = ? AND s.day_of_week = ?
    `, [selectedStudent.class_id, today]);

    // Behavior
    const [behaviors] = await db.execute('SELECT * FROM student_behavior WHERE student_id = ?', [studentId]);

    // Compute metrics
    let totalScore = 0;
    let validGradesCount = 0;
    let weakestSubject = null;
    let strongestSubject = null;
    let gradesList = [];

    grades.forEach(g => {
      if (g.average_score !== null) {
        const score = parseFloat(g.average_score);
        totalScore += score;
        validGradesCount++;
        gradesList.push({ name: g.subject_name, score });

        if (!weakestSubject || score < weakestSubject.score) {
          weakestSubject = { name: g.subject_name, score };
        }
        if (!strongestSubject || score > strongestSubject.score) {
          strongestSubject = { name: g.subject_name, score };
        }
      }
    });

    const gpa = validGradesCount > 0 ? (totalScore / validGradesCount) : null;

    let totalAttendance = attendance.length;
    let presentCount = attendance.filter(a => a.status === 'present' || a.status === 'excused').length;
    let absentCount = attendance.filter(a => a.status === 'absent').length;
    let lateCount = attendance.filter(a => a.status === 'late').length;
    const attendancePct = totalAttendance > 0 ? ((presentCount / totalAttendance) * 100).toFixed(1) : '100';

    let totalUnpaidAmount = 0;
    payments.forEach(p => {
      totalUnpaidAmount += parseFloat(p.amount);
    });

    // 3. Conversational Matching Logic
    let reply = '';
    const formattedUnpaid = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalUnpaidAmount);

    // Contextual greeting
    const welcomeText = role === 'parent' 
      ? `Chào anh/chị phụ huynh của cháu **${studentName}** (Lớp ${selectedStudent.class_name}). `
      : `Chào bạn **${studentName}** (Lớp ${selectedStudent.class_name}). `;

    // Matching query
    if (cleanMsg.includes('điểm') || cleanMsg.includes('học lực') || cleanMsg.includes('gpa') || cleanMsg.includes('kết quả') || cleanMsg.includes('xếp loại')) {
      if (gpa === null) {
        reply = welcomeText + `Hiện tại hệ thống chưa ghi nhận điểm số chính thức nào cho học kỳ này. Bạn vui lòng đề nghị giáo viên bộ môn hoàn tất nhập điểm số để tôi phân tích nhé.`;
      } else {
        let academicStatus = 'Khá/Tốt';
        let feedback = 'Cháu có học lực rất tốt và ý thức tự giác cao.';
        if (gpa < 5.0) {
          academicStatus = 'Cần cải thiện (Yếu)';
          feedback = 'Kết quả học tập đang ở mức báo động đỏ, cần kèm cặp phụ đạo ngay.';
        } else if (gpa < 6.5) {
          academicStatus = 'Trung bình';
          feedback = 'Học lực trung bình khá, một số mảng kiến thức nền tảng chưa vững.';
        }

        reply = welcomeText + `Dưới đây là phân tích kết quả học thuật học kỳ hiện tại:\n\n` +
          `• **Điểm trung bình (GPA)**: \`${gpa.toFixed(2)} / 10\`\n` +
          `• **Xếp loại đánh giá**: \`${academicStatus}\`\n` +
          `• **Môn học tốt nhất**: \`${strongestSubject?.name || 'N/A'}\` (${strongestSubject?.score}đ)\n` +
          `• **Môn học cần cố gắng**: \`${weakestSubject?.name || 'N/A'}\` (${weakestSubject?.score}đ)\n\n` +
          `*Nhận định AI*: ${feedback}\n\n` +
          `**Chi tiết điểm số bộ môn**:\n` +
          gradesList.map(g => ` - Môn ${g.name}: ${g.score}đ`).join('\n') + `\n\n` +
          `*Lời khuyên*: ${gpa < 6.5 ? `Nên ưu tiên củng cố bài tập môn **${weakestSubject?.name}**. Dành ít nhất 30 phút mỗi tối để ôn lại lý thuyết.` : `Tiếp tục duy trì phong độ xuất sắc hiện tại. Có thể bồi dưỡng nâng cao thêm môn thế mạnh là **${strongestSubject?.name}**.`}`;
      }
    } 
    else if (cleanMsg.includes('chuyên cần') || cleanMsg.includes('đi học') || cleanMsg.includes('vắng') || cleanMsg.includes('nghỉ') || cleanMsg.includes('muộn')) {
      let advice = 'Chuyên cần rất tốt, duy trì tinh thần đi học đầy đủ!';
      if (absentCount > 2 || parseFloat(attendancePct) < 90) {
        advice = 'Tỉ lệ vắng học đang hơi cao. Phụ huynh nên đôn đốc và theo dõi sát sao giờ giấc của cháu để tránh mất kiến thức cơ bản.';
      }

      reply = welcomeText + `Báo cáo chuyên cần và đi học:\n\n` +
        `• **Tỷ lệ chuyên cần**: \`${attendancePct}%\`\n` +
        `• **Số ngày đi học/có phép**: \`${presentCount} ngày\`\n` +
        `• **Số ngày vắng mặt không phép**: \`${absentCount} ngày\`\n` +
        `• **Số lần đi muộn**: \`${lateCount} lần\`\n\n` +
        `*Lời khuyên từ AI Advisor*: ${advice}`;
    } 
    else if (cleanMsg.includes('học phí') || cleanMsg.includes('tiền') || cleanMsg.includes('đóng học') || cleanMsg.includes('hóa đơn') || cleanMsg.includes('nợ')) {
      if (totalUnpaidAmount === 0) {
        reply = welcomeText + `Tuyệt vời! Cháu đã hoàn thành **100% học phí** và các khoản phí dịch vụ (bảo hiểm, bữa ăn bán trú, sách vở...) cho học kỳ này. Cảm ơn sự đồng hành của anh/chị.`;
      } else {
        reply = welcomeText + `Thông báo công nợ và học phí chưa đóng:\n\n` +
          `• **Tổng số tiền chưa thanh toán**: \`${formattedUnpaid}\`\n` +
          `• **Số hóa đơn cần thanh toán**: \`${payments.length} khoản\`\n\n` +
          `**Chi tiết các khoản thu**:\n` +
          payments.map((p, i) => ` ${i+1}. [${p.payment_type.toUpperCase()}] Số tiền: ${new Intl.NumberFormat('vi-VN').format(p.amount)}đ (Hạn đóng: ${new Date(p.due_date).toLocaleDateString('vi-VN')})`).join('\n') + `\n\n` +
          `*Hướng dẫn*: Anh/chị có thể thanh toán trực tiếp qua App hoặc chuyển khoản ngân hàng theo đúng cú pháp mã hóa đơn. Xin cảm ơn.`;
      }
    } 
    else if (cleanMsg.includes('lịch học') || cleanMsg.includes('thời khóa biểu') || cleanMsg.includes('hôm nay') || cleanMsg.includes('môn học')) {
      if (schedules.length === 0) {
        reply = welcomeText + `Hôm nay (hoặc ngày hiện tại) cháu không có lịch học theo thời khóa biểu trên hệ thống. Xin chúc một ngày nghỉ ngơi vui vẻ!`;
      } else {
        reply = welcomeText + `Thời khóa biểu hôm nay (${new Date().toLocaleDateString('vi-VN')}):\n\n` +
          schedules.map((s, i) => `• **Tiết ${i+1}**: môn \`${s.subject_name}\` (${s.start_time.substring(0,5)} - ${s.end_time.substring(0,5)}) tại phòng **${s.room || 'N/A'}** (GV: ${s.teacher_name})`).join('\n') + `\n\n` +
          `Hãy nhớ chuẩn bị đầy đủ sách vở và hoàn thành bài tập về nhà của các môn này nhé!`;
      }
    }
    else if (cleanMsg.includes('khen thưởng') || cleanMsg.includes('kỷ luật') || cleanMsg.includes('thành tích') || cleanMsg.includes('vi phạm') || cleanMsg.includes('nhận xét')) {
      if (behaviors.length === 0) {
        reply = welcomeText + `Hệ thống chưa ghi nhận bất kỳ quyết định khen thưởng hoặc kỷ luật chính thức nào. Cháu đang duy trì nề nếp bình thường ở trường học.`;
      } else {
        const rewards = behaviors.filter(b => b.type === 'reward');
        const disciplines = behaviors.filter(b => b.type === 'discipline');

        reply = welcomeText + `Nhật ký khen thưởng & kỷ luật nề nếp:\n\n` +
          (rewards.length > 0 ? `🏆 **Khen thưởng & Thành tích** (${rewards.length} lần):\n` + 
            rewards.map(r => ` - [${new Date(r.date).toLocaleDateString('vi-VN')}] **${r.title}**: ${r.description} (QĐ: ${r.decision_number || 'N/A'})`).join('\n') + `\n\n` : '') +
          (disciplines.length > 0 ? `⚠️ **Kỷ luật & Vi phạm** (${disciplines.length} lần):\n` + 
            disciplines.map(d => ` - [${new Date(d.date).toLocaleDateString('vi-VN')}] **${d.title}**: ${d.description}`).join('\n') : `\n🎉 Không có vi phạm kỷ luật nào! Cháu có ý thức tuân thủ nội quy học đường tuyệt vời.`);
      }
    }
    else if (cleanMsg.includes('cải thiện') || cleanMsg.includes('khuyên') || cleanMsg.includes('giúp') || cleanMsg.includes('làm sao')) {
      if (gpa === null) {
        reply = welcomeText + `Tôi cần có điểm số hiện tại để đưa ra lộ trình cải thiện chính xác. Hãy quay lại sau khi đã có điểm nhé!`;
      } else {
        reply = welcomeText + `Dưới đây là **Lộ trình Cải thiện Học tập Cá nhân hóa bằng AI**:\n\n` +
          `1. **Tập trung khắc phục điểm yếu**: Điểm số môn **${weakestSubject?.name}** đang thấp nhất (${weakestSubject?.score}đ). Đề xuất dành 45 phút mỗi tối làm bài tập cơ bản môn này.\n` +
          `2. **Phương pháp học tập**: Áp dụng kỹ thuật Pomodoro (học 25 phút, nghỉ 5 phút) để tăng tập trung. Tuyệt đối không vừa học vừa bấm điện thoại.\n` +
          `3. **Tương tác tích cực**: Đề nghị cháu chủ động hỏi bài thầy cô, bạn bè ở cuối giờ học nếu chưa hiểu bài trên lớp.\n` +
          `4. **Duy trì sức khỏe**: Tránh thức khuya sau 11h đêm. Ngủ đủ giấc giúp trí nhớ lưu giữ tốt hơn.\n\n` +
          `AI tin rằng nếu áp dụng đều đặn, điểm số môn **${weakestSubject?.name}** sẽ cải thiện ít nhất 1.5 điểm trong kỳ kiểm tra tới!`;
      }
    }
    else {
      // General Greeting / Helper Response
      reply = welcomeText + `Tôi là **Trợ lý Học đường AI Advisor** chuyên sâu của bạn.\n\n` +
        `Tôi có quyền truy cập trực tiếp vào cơ sở dữ liệu học tập cá nhân và có thể giải đáp chính xác các thắc mắc của bạn:\n\n` +
        `• Gõ \`học lực\` hoặc \`điểm số\` để xem phân tích GPA và điểm các môn.\n` +
        `• Gõ \`chuyên cần\` hoặc \`nghỉ học\` để kiểm tra tỷ lệ đi học vắng/muộn.\n` +
        `• Gõ \`học phí\` hoặc \`nợ học phí\` để xem công nợ tài chính.\n` +
        `• Gõ \`lịch học\` để xem thời khóa biểu các môn học hôm nay.\n` +
        `• Gõ \`thành tích\` hoặc \`khen thưởng\` để xem lịch sử nề nếp khen thưởng kỷ luật.\n` +
        `• Gõ \`cải thiện điểm số\` để nhận phương pháp sư phạm hỗ trợ cá nhân.\n\n` +
        `Hôm nay bạn cần tôi hỗ trợ phân tích thông tin gì?`;
    }

    return sendSuccess(res, 'AI Advisor Response generated', {
      reply,
      analyzedStudent: {
        id: studentId,
        full_name: studentName,
        gpa: gpa !== null ? parseFloat(gpa.toFixed(2)) : null,
        attendance_rate: parseFloat(attendancePct),
        unpaid_amount: totalUnpaidAmount
      }
    });

  } catch (error) {
    return sendError(res, error.message);
  }
};
