package com.app.quanlyhocsinh.data.mock

import com.app.quanlyhocsinh.data.models.*
import java.util.Calendar
import java.util.Date

object MockDatabase {
    val academicYears = listOf("2025 - 2026", "2024 - 2025")
    val semesters = listOf("Học kỳ II", "Học kỳ I")

    fun createDate(year: Int, month: Int, day: Int, hour: Int = 0, minute: Int = 0): Date {
        val cal = Calendar.getInstance()
        cal.set(Calendar.YEAR, year)
        cal.set(Calendar.MONTH, month - 1)
        cal.set(Calendar.DAY_OF_MONTH, day)
        cal.set(Calendar.HOUR_OF_DAY, hour)
        cal.set(Calendar.MINUTE, minute)
        cal.set(Calendar.SECOND, 0)
        cal.set(Calendar.MILLISECOND, 0)
        return cal.time
    }

    fun studentBundle(): StudentBundle {
        return StudentBundle(
            student = StudentProfile(
                name = "Nguyễn Minh Khôi",
                studentId = "HS-240318",
                className = "8A2",
                gradeLevel = "Khối 8",
                academicYear = "2025 - 2026",
                birthDate = createDate(2012, 9, 14),
                gender = Gender.MALE,
                schoolName = "Trường THCS Nguyễn Du",
                avatarLabel = "MK"
            ),
            parent = ParentProfile(
                name = "Nguyễn Thị Lan",
                relationship = "Mẹ",
                phone = "0903 245 678",
                email = "lan.nguyen.phu.huynh@gmail.com",
                address = "12 Nguyễn Bỉnh Khiêm, P. Đa Kao, Q.1, TP. Hồ Chí Minh"
            ),
            healthInfo = HealthInfo(
                summary = "Thể trạng ổn định, không có bệnh nền đặc biệt.",
                allergyNote = "Dị ứng nhẹ với hải sản."
            ),
            emergencyContact = EmergencyContact(
                name = "Nguyễn Văn Hùng",
                phone = "0911 665 329",
                relationship = "Bố"
            ),
            profileStatus = ProfileStatus.NEEDS_SUPPLEMENT,
            profilePhotoName = "ho_so_minh_khoi.jpg",
            documents = listOf("giay_khai_sinh_scan.pdf", "the_bhyt_scan.pdf")
        )
    }

    fun gradeBook(): Map<String, List<SubjectGrade>> {
        return mapOf(
            "2025 - 2026|Học kỳ II" to currentSemesterGrades(),
            "2025 - 2026|Học kỳ I" to firstSemesterGrades(),
            "2024 - 2025|Học kỳ II" to previousYearGrades(),
            "2024 - 2025|Học kỳ I" to previousYearGrades()
        )
    }

    fun attendance(): List<AttendanceRecord> {
        return listOf(
            AttendanceRecord("att-01", createDate(2026, 3, 27), "Sáng", AttendanceStatus.PRESENT, "Vào lớp đúng giờ."),
            AttendanceRecord("att-02", createDate(2026, 3, 26), "Sáng", AttendanceStatus.LATE, "Đi muộn 8 phút do kẹt xe."),
            AttendanceRecord("att-03", createDate(2026, 3, 25), "Chiều", AttendanceStatus.PRESENT, "Có mặt đầy đủ."),
            AttendanceRecord("att-04", createDate(2026, 3, 24), "Sáng", AttendanceStatus.EXCUSED, "Nghỉ có phép do khám sức khỏe định kỳ."),
            AttendanceRecord("att-05", createDate(2026, 3, 23), "Sáng", AttendanceStatus.PRESENT, "Có mặt đầy đủ."),
            AttendanceRecord("att-06", createDate(2026, 3, 20), "Chiều", AttendanceStatus.UNEXCUSED, "Chưa có xác nhận nghỉ từ phụ huynh."),
            AttendanceRecord("att-07", createDate(2026, 3, 19), "Sáng", AttendanceStatus.PRESENT, "Có mặt."),
            AttendanceRecord("att-08", createDate(2026, 3, 18), "Sáng", AttendanceStatus.PRESENT, "Có mặt."),
            AttendanceRecord("att-09", createDate(2026, 3, 17), "Chiều", AttendanceStatus.PRESENT, "Có mặt."),
            AttendanceRecord("att-10", createDate(2026, 3, 16), "Sáng", AttendanceStatus.PRESENT, "Có mặt.")
        )
    }

    fun awards(): List<AwardRecord> {
        return listOf(
            AwardRecord(
                id = "award-01",
                title = "Giấy khen học sinh tiêu biểu tháng 3",
                date = createDate(2026, 3, 18),
                category = AwardCategory.ACADEMIC,
                description = "Được tuyên dương vì duy trì điểm trung bình cao và tinh thần học tập ổn định.",
                issuer = "Ban giám hiệu Trường THCS Nguyễn Du"
            ),
            AwardRecord(
                id = "award-02",
                title = "Ghi nhận hỗ trợ bạn trong giờ sinh hoạt",
                date = createDate(2026, 2, 28),
                category = AwardCategory.CONDUCT,
                description = "Có tinh thần hợp tác tốt, chủ động hỗ trợ bạn cùng lớp trong hoạt động nhóm.",
                issuer = "Cô Trần Ngọc Hạnh"
            ),
            AwardRecord(
                id = "award-03",
                title = "Huy chương bạc chạy tiếp sức",
                date = createDate(2026, 1, 12),
                category = AwardCategory.SPORTS,
                description = "Đạt thành tích huy chương bạc ở Hội khỏe Phù Đổng cấp trường.",
                issuer = "Tổ Thể chất"
            ),
            AwardRecord(
                id = "award-04",
                title = "Thành viên tích cực CLB Âm nhạc",
                date = createDate(2025, 12, 21),
                category = AwardCategory.ARTS,
                description = "Tham gia đầy đủ và biểu diễn tốt tại chương trình văn nghệ cuối học kỳ.",
                issuer = "Câu lạc bộ Âm nhạc"
            )
        )
    }

    fun services(): List<SchoolService> {
        return listOf(
            SchoolService(
                id = "service-01",
                title = "Xe đưa đón",
                description = "Dịch vụ đưa đón tận điểm hẹn cố định theo tuyến gần nhà học sinh.",
                fee = 1450000.0,
                deadline = createDate(2026, 4, 5),
                activePeriod = "Từ 04/2026 đến 05/2026",
                isOpen = true,
                status = ServiceRegistrationStatus.PENDING,
                highlight = "Ưu tiên phụ huynh đăng ký trước ngày 05/04.",
                packages = listOf(
                    ServicePackage("bus-morning", "Một chiều sáng", "Đưa học sinh đến trường buổi sáng.", 820000.0),
                    ServicePackage("bus-full", "Hai chiều", "Đưa đón cả sáng và chiều.", 1450000.0)
                )
            ),
            SchoolService(
                id = "service-02",
                title = "Bán trú",
                description = "Hỗ trợ chỗ nghỉ trưa, quản sinh và giám sát giữa buổi.",
                fee = 980000.0,
                deadline = createDate(2026, 4, 8),
                activePeriod = "Theo tháng",
                isOpen = true,
                status = ServiceRegistrationStatus.APPROVED,
                highlight = "Bao gồm quản sinh và không gian nghỉ trưa riêng.",
                packages = listOf(
                    ServicePackage("boarding-monthly", "Gói tháng", "Áp dụng trọn tháng học.", 980000.0)
                )
            ),
            SchoolService(
                id = "service-03",
                title = "Ăn trưa",
                description = "Thực đơn cân bằng dinh dưỡng, cập nhật theo tuần.",
                fee = 1250000.0,
                deadline = createDate(2026, 4, 10),
                activePeriod = "Tháng 4/2026",
                isOpen = true,
                status = ServiceRegistrationStatus.NOT_REGISTERED,
                highlight = "Có lựa chọn suất ăn ít dầu và bổ sung rau xanh.",
                packages = listOf(
                    ServicePackage("lunch-standard", "Suất tiêu chuẩn", "Bữa trưa và trái cây tráng miệng.", 1250000.0),
                    ServicePackage("lunch-premium", "Suất tăng cường", "Bổ sung sữa chua và món phụ theo tuần.", 1480000.0)
                )
            ),
            SchoolService(
                id = "service-04",
                title = "CLB ngoại khóa",
                description = "Các câu lạc bộ robotics, mỹ thuật, tiếng Anh giao tiếp sau giờ học.",
                fee = 690000.0,
                deadline = createDate(2026, 4, 15),
                activePeriod = "Học kỳ II",
                isOpen = true,
                status = ServiceRegistrationStatus.NOT_REGISTERED,
                highlight = "Lịch học chiều thứ Tư và thứ Sáu.",
                packages = listOf(
                    ServicePackage("club-robotics", "Robotics", "Thiết kế mô hình và lập trình cơ bản.", 690000.0),
                    ServicePackage("club-english", "Tiếng Anh giao tiếp", "Tăng phản xạ nghe nói theo chủ đề.", 620000.0)
                )
            ),
            SchoolService(
                id = "service-05",
                title = "Đồng phục",
                description = "Đăng ký mua bổ sung đồng phục thể dục và lễ phục.",
                fee = 420000.0,
                deadline = createDate(2026, 3, 20),
                activePeriod = "Đợt bổ sung giữa năm",
                isOpen = false,
                status = ServiceRegistrationStatus.EXPIRED,
                highlight = "Đợt đăng ký đã kết thúc.",
                packages = listOf(
                    ServicePackage("uniform-set", "Bộ cơ bản", "1 áo sơ mi, 1 quần/váy, 1 áo thể dục.", 420000.0)
                )
            ),
            SchoolService(
                id = "service-06",
                title = "Bảo hiểm học sinh",
                description = "Gói bảo hiểm tai nạn và chăm sóc y tế cơ bản.",
                fee = 350000.0,
                deadline = createDate(2026, 4, 30),
                activePeriod = "Năm học 2025 - 2026",
                isOpen = true,
                status = ServiceRegistrationStatus.REGISTERED,
                highlight = "Áp dụng toàn bộ năm học.",
                packages = listOf(
                    ServicePackage("insurance-year", "Gói cả năm", "Hiệu lực đến hết năm học.", 350000.0)
                )
            )
        )
    }

    fun registrations(): List<ServiceRegistration> {
        return mutableListOf(
            ServiceRegistration(
                id = "reg-01",
                serviceId = "service-02",
                serviceTitle = "Bán trú",
                packageTitle = "Gói tháng",
                period = "Tháng 4/2026",
                note = "Giữ chỗ nghỉ khu yên tĩnh nếu còn suất.",
                submittedAt = createDate(2026, 3, 25, 9, 10),
                status = ServiceRegistrationStatus.APPROVED,
                canCancel = false
            ),
            ServiceRegistration(
                id = "reg-02",
                serviceId = "service-01",
                serviceTitle = "Xe đưa đón",
                packageTitle = "Hai chiều",
                period = "Tháng 4/2026",
                note = "Điểm đón tại công viên Lê Văn Tám.",
                submittedAt = createDate(2026, 3, 26, 14, 20),
                status = ServiceRegistrationStatus.PENDING,
                canCancel = true
            ),
            ServiceRegistration(
                id = "reg-03",
                serviceId = "service-06",
                serviceTitle = "Bảo hiểm học sinh",
                packageTitle = "Gói cả năm",
                period = "Năm học 2025 - 2026",
                note = "Đã hoàn tất thanh toán tại văn phòng.",
                submittedAt = createDate(2025, 9, 6, 8, 30),
                status = ServiceRegistrationStatus.REGISTERED,
                canCancel = false
            )
        )
    }

    fun messages(): List<SchoolMessage> {
        return listOf(
            SchoolMessage(
                id = "msg-01",
                title = "Nhắc họp phụ huynh cuối tháng",
                preview = "Nhà trường kính mời phụ huynh tham dự buổi họp lớp vào chiều thứ Bảy tuần này.",
                content = "Nhà trường kính mời phụ huynh lớp 8A2 tham dự buổi họp phụ huynh vào lúc 15:00, thứ Bảy ngày 29/03/2026 tại phòng 8A2. Nội dung gồm cập nhật kết quả học tập, tình hình nề nếp và kế hoạch ôn tập giữa kỳ.",
                time = createDate(2026, 3, 27, 8, 20),
                category = MessageCategory.STUDY,
                isRead = false,
                priority = MessagePriority.HIGH
            ),
            SchoolMessage(
                id = "msg-02",
                title = "Điểm kiểm tra Toán đã được cập nhật",
                preview = "Minh Khôi vừa có thêm đầu điểm 1 tiết môn Toán.",
                content = "Giáo viên bộ môn Toán đã cập nhật điểm kiểm tra 1 tiết ngày 25/03/2026. Phụ huynh vui lòng mở mục Điểm để xem chi tiết từng đầu điểm và nhận xét của giáo viên.",
                time = createDate(2026, 3, 26, 19, 40),
                category = MessageCategory.GRADES,
                isRead = false,
                priority = MessagePriority.NORMAL
            ),
            SchoolMessage(
                id = "msg-03",
                title = "Thông báo đi muộn",
                preview = "Học sinh đến lớp muộn trong buổi sáng ngày 26/03.",
                content = "Hệ thống ghi nhận học sinh Nguyễn Minh Khôi vào lớp lúc 07:13 sáng ngày 26/03/2026, trễ 8 phút so với giờ quy định. Nhà trường gửi thông tin để phụ huynh phối hợp nhắc nhở.",
                time = createDate(2026, 3, 26, 7, 25),
                category = MessageCategory.ATTENDANCE,
                isRead = true,
                priority = MessagePriority.NORMAL
            ),
            SchoolMessage(
                id = "msg-04",
                title = "Điều chỉnh lịch thi giữa kỳ",
                preview = "Môn Ngữ văn được đổi sang sáng thứ Năm tuần tới.",
                content = "Nhà trường thông báo lịch thi giữa kỳ môn Ngữ văn lớp 8A2 được điều chỉnh sang 08:00 ngày 02/04/2026 tại phòng 204 nhằm phù hợp kế hoạch sinh hoạt chuyên môn.",
                time = createDate(2026, 3, 25, 16, 45),
                category = MessageCategory.SCHEDULE,
                isRead = true,
                priority = MessagePriority.HIGH
            ),
            SchoolMessage(
                id = "msg-05",
                title = "Mở đăng ký suất ăn tháng 4",
                preview = "Hệ thống đã mở cổng đăng ký dịch vụ ăn trưa tháng 4.",
                content = "Phụ huynh có thể đăng ký dịch vụ ăn trưa tháng 4/2026 trực tiếp trong ứng dụng, hạn cuối đến hết ngày 10/04/2026. Thực đơn sẽ được gửi trước theo tuần.",
                time = createDate(2026, 3, 24, 9, 15),
                category = MessageCategory.SERVICES,
                isRead = false,
                priority = MessagePriority.NORMAL
            ),
            SchoolMessage(
                id = "msg-06",
                title = "Nhắc đóng phí bán trú",
                preview = "Khoản phí bán trú tháng 4 cần hoàn tất trước ngày 02/04.",
                content = "Nhà trường kính nhắc phụ huynh hoàn tất phí bán trú tháng 4/2026 trước ngày 02/04/2026 để đảm bảo suất phục vụ ổn định cho học sinh.",
                time = createDate(2026, 3, 23, 11, 10),
                category = MessageCategory.SERVICES,
                isRead = true,
                priority = MessagePriority.NORMAL
            ),
            SchoolMessage(
                id = "msg-07",
                title = "Lưu ý an toàn trong giờ ra chơi",
                preview = "Nhà trường tăng cường nhắc nhở về an toàn cầu thang khu B.",
                content = "Nhà trường đề nghị phụ huynh phối hợp nhắc học sinh di chuyển trật tự tại khu vực cầu thang khu B trong giờ ra chơi, không chen lấn và không chạy nhảy quá nhanh để đảm bảo an toàn.",
                time = createDate(2026, 3, 21, 10, 5),
                category = MessageCategory.EMERGENCY,
                isRead = true,
                priority = MessagePriority.HIGH
            )
        )
    }

    fun reports(): List<SchoolReport> {
        return listOf(
            SchoolReport(
                id = "rep-01",
                code = "PA-260327-018",
                title = "Phản ánh xô đẩy tại hành lang tầng 2",
                type = ReportType.SAFETY,
                severity = ReportSeverity.MEDIUM,
                occurredAt = createDate(2026, 3, 26, 9, 30),
                location = "Hành lang tầng 2 khu B",
                description = "Phụ huynh ghi nhận học sinh phản ánh việc chen lấn khi chuyển tiết tại hành lang, có nguy cơ mất an toàn cho các em ở lớp 8A2.",
                relatedPeople = "Một nhóm học sinh nam lớp 8A và 8B",
                anonymous = false,
                attachments = listOf("ghi_chu_su_viec.pdf"),
                submittedAt = createDate(2026, 3, 26, 20, 12),
                status = ReportStatus.VERIFYING,
                schoolResponse = "Nhà trường đã tiếp nhận, đang trích xuất camera khu vực và làm việc với giáo viên chủ nhiệm."
            ),
            SchoolReport(
                id = "rep-02",
                code = "PA-260315-011",
                title = "Báo cáo nghi vấn bắt nạt bằng lời nói",
                type = ReportType.BULLYING,
                severity = ReportSeverity.HIGH,
                occurredAt = createDate(2026, 3, 14, 15, 10),
                location = "Sân sau khu nhà thể chất",
                description = "Học sinh cho biết đã bị trêu chọc lặp lại nhiều lần trong giờ ra chơi và cảm thấy áp lực tâm lý.",
                relatedPeople = "Chưa xác định đầy đủ",
                anonymous = true,
                attachments = listOf("ban_tuong_trinh.docx"),
                submittedAt = createDate(2026, 3, 15, 7, 45),
                status = ReportStatus.RESOLVED,
                schoolResponse = "Giáo viên chủ nhiệm và phòng tư vấn học đường đã làm việc với các bên liên quan, đồng thời theo dõi thêm trong 2 tuần tiếp theo."
            ),
            SchoolReport(
                id = "rep-03",
                code = "PA-260301-004",
                title = "Phản ánh bàn học bị vẽ bậy",
                type = ReportType.PROPERTY_DAMAGE,
                severity = ReportSeverity.LOW,
                occurredAt = createDate(2026, 2, 28, 13, 25),
                location = "Phòng 8A2",
                description = "Bàn học của học sinh bị vẽ bậy bằng bút lông sau giờ ra về.",
                relatedPeople = "Không rõ",
                anonymous = false,
                attachments = listOf("anh_ban_hoc_1.jpg"),
                submittedAt = createDate(2026, 3, 1, 8, 5),
                status = ReportStatus.CLOSED,
                schoolResponse = "Đã vệ sinh bàn học và nhắc nhở toàn lớp về việc giữ gìn cơ sở vật chất."
            )
        )
    }

    fun classSchedule(): List<ClassScheduleItem> {
        return listOf(
            classItem("class-01", 2026, 3, 30, "Tiết 1", 7, 0, 7, 45, "Toán", "P.203", "Thầy Lê Quốc Bảo", "Ôn tập hàm số bậc nhất."),
            classItem("class-02", 2026, 3, 30, "Tiết 2", 7, 55, 8, 40, "Ngữ văn", "P.203", "Cô Đỗ Khánh Linh", "Luyện viết đoạn văn nghị luận."),
            classItem("class-03", 2026, 3, 30, "Tiết 4", 9, 35, 10, 20, "Tiếng Anh", "P.203", "Cô Nguyễn Hạ Vy", "Unit 10 speaking practice."),
            classItem("class-04", 2026, 3, 31, "Tiết 1", 7, 0, 7, 45, "Lịch sử", "P.204", "Thầy Phạm Minh Đức", "Chuyên đề lịch sử cận đại Việt Nam."),
            classItem("class-05", 2026, 3, 31, "Tiết 2", 7, 55, 8, 40, "Vật lý", "P.301", "Cô Trần Mỹ Duyên", "Thực hành đo cường độ dòng điện."),
            classItem("class-06", 2026, 3, 31, "Tiết 5", 10, 30, 11, 15, "Tin học", "Phòng máy 2", "Thầy Nguyễn Thành Nam", "Ôn tập bảng tính và biểu đồ."),
            classItem("class-07", 2026, 4, 1, "Tiết 1", 7, 0, 7, 45, "Sinh học", "P.205", "Cô Phạm Quỳnh Như", "Hệ cơ quan vận động."),
            classItem("class-08", 2026, 4, 1, "Tiết 3", 8, 50, 9, 35, "Toán", "P.203", "Thầy Lê Quốc Bảo", "Luyện đề giữa kỳ."),
            classItem("class-09", 2026, 4, 1, "Tiết 4", 9, 35, 10, 20, "Giáo dục công dân", "P.203", "Cô Bùi Thu Trang", "Trách nhiệm với cộng đồng."),
            classItem("class-10", 2026, 4, 2, "Tiết 2", 7, 55, 8, 40, "Ngữ văn", "P.203", "Cô Đỗ Khánh Linh", "Thi thử đọc hiểu ngắn."),
            classItem("class-11", 2026, 4, 2, "Tiết 4", 9, 35, 10, 20, "Thể dục", "Sân trường", "Thầy Võ Minh Triết", "Bài tập sức bền và phối hợp nhóm."),
            classItem("class-12", 2026, 4, 3, "Tiết 1", 7, 0, 7, 45, "Hóa học", "P.302", "Cô Trịnh Mai Anh", "Ôn tập phản ứng hóa học cơ bản."),
            classItem("class-13", 2026, 4, 3, "Tiết 3", 8, 50, 9, 35, "Tiếng Anh", "P.203", "Cô Nguyễn Hạ Vy", "Kiểm tra nói theo cặp."),
            classItem("class-14", 2026, 4, 3, "Tiết 5", 10, 30, 11, 15, "Âm nhạc", "Phòng nhạc", "Cô Hoàng Diệu My", "Tập hợp xướng cho lễ tổng kết.")
        )
    }

    fun examSchedule(): List<ExamScheduleItem> {
        return listOf(
            ExamScheduleItem("exam-01", createDate(2026, 4, 1), createDate(2026, 4, 1, 7, 30), "Toán", "P.204", "Tự luận 60 phút", "Mang theo thước và máy tính cầm tay."),
            ExamScheduleItem("exam-02", createDate(2026, 4, 2), createDate(2026, 4, 2, 8, 0), "Ngữ văn", "P.204", "Tự luận 90 phút", "Không sử dụng tài liệu."),
            ExamScheduleItem("exam-03", createDate(2026, 4, 4), createDate(2026, 4, 4, 13, 30), "Tiếng Anh", "Phòng lab 1", "Kết hợp trắc nghiệm và nghe", "Có phần nghe, đến trước 10 phút."),
            ExamScheduleItem("exam-04", createDate(2026, 4, 7), createDate(2026, 4, 7, 9, 0), "Vật lý", "P.302", "Trắc nghiệm 45 phút", "Ôn lại phần điện học.")
        )
    }

    private fun classItem(
        id: String,
        year: Int,
        month: Int,
        day: Int,
        period: String,
        startHour: Int,
        startMinute: Int,
        endHour: Int,
        endMinute: Int,
        subject: String,
        room: String,
        teacher: String,
        note: String
    ): ClassScheduleItem {
        return ClassScheduleItem(
            id = id,
            date = createDate(year, month, day),
            periodLabel = period,
            start = createDate(year, month, day, startHour, startMinute),
            end = createDate(year, month, day, endHour, endMinute),
            subject = subject,
            room = room,
            teacher = teacher,
            note = note
        )
    }

    private fun currentSemesterGrades(): List<SubjectGrade> {
        return listOf(
            SubjectGrade(
                id = "math",
                name = "Toán học",
                teacher = "Thầy Lê Quốc Bảo",
                average = 8.9,
                comment = "Nắm chắc kiến thức đại số, cần giữ sự cẩn thận ở phần hình học.",
                performance = SubjectPerformance.STRONG,
                lastUpdated = createDate(2026, 3, 26, 19, 12),
                entries = listOf(
                    GradeEntry("math-oral-1", GradeEntryType.ORAL, "Miệng 1", 9.0, 1.0, createDate(2026, 2, 10)),
                    GradeEntry("math-15p-1", GradeEntryType.QUIZ15, "15 phút 1", 8.5, 1.0, createDate(2026, 2, 18)),
                    GradeEntry("math-test-1", GradeEntryType.TEST1, "1 tiết chương 3", 9.2, 2.0, createDate(2026, 3, 25)),
                    GradeEntry("math-mid", GradeEntryType.MIDTERM, "Giữa kỳ", 8.8, 3.0, createDate(2026, 3, 12))
                ),
                updates = listOf(
                    GradeUpdate(createDate(2026, 3, 26, 19, 12), "Bổ sung điểm 1 tiết chương 3."),
                    GradeUpdate(createDate(2026, 3, 12, 17, 30), "Đã khóa điểm giữa kỳ.")
                )
            ),
            SubjectGrade(
                id = "literature",
                name = "Ngữ văn",
                teacher = "Cô Đỗ Khánh Linh",
                average = 8.2,
                comment = "Diễn đạt tốt, cần tăng thêm chiều sâu khi phân tích tác phẩm.",
                performance = SubjectPerformance.STABLE,
                lastUpdated = createDate(2026, 3, 22, 9, 30),
                entries = listOf(
                    GradeEntry("lit-oral-1", GradeEntryType.ORAL, "Miệng 1", 8.5, 1.0, createDate(2026, 2, 8)),
                    GradeEntry("lit-15p-1", GradeEntryType.QUIZ15, "15 phút 1", 8.0, 1.0, createDate(2026, 2, 21)),
                    GradeEntry("lit-test-1", GradeEntryType.TEST1, "Bài viết số 5", 8.3, 2.0, createDate(2026, 3, 15)),
                    GradeEntry("lit-mid", GradeEntryType.MIDTERM, "Giữa kỳ", 8.1, 3.0, createDate(2026, 3, 11))
                ),
                updates = listOf(
                    GradeUpdate(createDate(2026, 3, 22, 9, 30), "Giáo viên cập nhật bài viết số 5.")
                )
            ),
            SubjectGrade(
                id = "english",
                name = "Ngoại ngữ",
                teacher = "Cô Nguyễn Hạ Vy",
                average = 9.1,
                comment = "Phản xạ tốt, phát âm tiến bộ rõ rệt.",
                performance = SubjectPerformance.STRONG,
                lastUpdated = createDate(2026, 3, 20, 11, 20),
                entries = listOf(
                    GradeEntry("en-oral-1", GradeEntryType.ORAL, "Speaking 1", 9.4, 1.0, createDate(2026, 2, 12)),
                    GradeEntry("en-15p-1", GradeEntryType.QUIZ15, "Quiz unit 9", 8.8, 1.0, createDate(2026, 2, 26)),
                    GradeEntry("en-test-1", GradeEntryType.TEST1, "1 tiết nghe - đọc", 9.0, 2.0, createDate(2026, 3, 10)),
                    GradeEntry("en-mid", GradeEntryType.MIDTERM, "Giữa kỳ", 9.3, 3.0, createDate(2026, 3, 17))
                ),
                updates = listOf(
                    GradeUpdate(createDate(2026, 3, 20, 11, 20), "Hoàn tất chấm phần nghe giữa kỳ.")
                )
            ),
            SubjectGrade(
                id = "physics",
                name = "Khoa học tự nhiên",
                teacher = "Cô Trần Mỹ Duyên",
                average = 7.4,
                comment = "Hiểu lý thuyết cơ bản, cần rèn kỹ năng trình bày bài tập định lượng.",
                performance = SubjectPerformance.IMPROVING,
                lastUpdated = createDate(2026, 3, 24, 15, 15),
                entries = listOf(
                    GradeEntry("phy-oral-1", GradeEntryType.ORAL, "Miệng 1", 7.5, 1.0, createDate(2026, 2, 14)),
                    GradeEntry("phy-15p-1", GradeEntryType.QUIZ15, "15 phút 1", 7.0, 1.0, createDate(2026, 2, 28)),
                    GradeEntry("phy-test-1", GradeEntryType.TEST1, "1 tiết điện học", 7.3, 2.0, createDate(2026, 3, 18)),
                    GradeEntry("phy-mid", GradeEntryType.MIDTERM, "Giữa kỳ", 7.6, 3.0, createDate(2026, 3, 8))
                ),
                updates = listOf(
                    GradeUpdate(createDate(2026, 3, 24, 15, 15), "Bổ sung nhận xét sau bài kiểm tra 1 tiết.")
                )
            ),
            SubjectGrade(
                id = "informatics",
                name = "Tin học",
                teacher = "Thầy Nguyễn Thành Nam",
                average = 8.6,
                comment = "Thực hành tốt, trình bày file gọn gàng và đúng yêu cầu.",
                performance = SubjectPerformance.STRONG,
                lastUpdated = createDate(2026, 3, 19, 14, 18),
                entries = listOf(
                    GradeEntry("it-practice-1", GradeEntryType.PRACTICE, "Thực hành bảng tính", 8.8, 2.0, createDate(2026, 2, 17)),
                    GradeEntry("it-15p-1", GradeEntryType.QUIZ15, "15 phút 1", 8.2, 1.0, createDate(2026, 2, 24)),
                    GradeEntry("it-test-1", GradeEntryType.TEST1, "1 tiết dự án nhóm", 8.7, 2.0, createDate(2026, 3, 19)),
                    GradeEntry("it-mid", GradeEntryType.MIDTERM, "Giữa kỳ", 8.5, 3.0, createDate(2026, 3, 9))
                ),
                updates = listOf(
                    GradeUpdate(createDate(2026, 3, 19, 14, 18), "Cập nhật điểm dự án nhóm.")
                )
            ),
            SubjectGrade(
                id = "biology",
                name = "GDCD",
                teacher = "Cô Phạm Quỳnh Như",
                average = 7.9,
                comment = "Chăm chỉ ghi chép, cần ôn lại sơ đồ hệ cơ quan để làm bài tốt hơn.",
                performance = SubjectPerformance.STABLE,
                lastUpdated = createDate(2026, 3, 18, 10, 50),
                entries = listOf(
                    GradeEntry("bio-oral-1", GradeEntryType.ORAL, "Miệng 1", 8.0, 1.0, createDate(2026, 2, 16)),
                    GradeEntry("bio-15p-1", GradeEntryType.QUIZ15, "15 phút 1", 7.6, 1.0, createDate(2026, 3, 2)),
                    GradeEntry("bio-test-1", GradeEntryType.TEST1, "1 tiết hệ vận động", 8.0, 2.0, createDate(2026, 3, 16)),
                    GradeEntry("bio-mid", GradeEntryType.MIDTERM, "Giữa kỳ", 7.8, 3.0, createDate(2026, 3, 7))
                ),
                updates = listOf(
                    GradeUpdate(createDate(2026, 3, 18, 10, 50), "Bổ sung điểm 1 tiết chương hệ vận động.")
                )
            )
        )
    }

    private fun firstSemesterGrades(): List<SubjectGrade> {
        return listOf(
            SubjectGrade(
                id = "math",
                name = "Toán học",
                teacher = "Thầy Lê Quốc Bảo",
                average = 8.6,
                comment = "Ổn định, cần mạnh dạn hơn ở phần chứng minh hình học.",
                performance = SubjectPerformance.STRONG,
                lastUpdated = createDate(2025, 12, 20),
                entries = listOf(
                    GradeEntry("m1", GradeEntryType.ORAL, "Miệng 1", 8.5, 1.0, createDate(2025, 10, 1)),
                    GradeEntry("m2", GradeEntryType.TEST1, "1 tiết", 8.7, 2.0, createDate(2025, 11, 18)),
                    GradeEntry("m3", GradeEntryType.FINAL_EXAM, "Cuối kỳ", 8.6, 3.0, createDate(2025, 12, 17))
                ),
                updates = listOf(GradeUpdate(createDate(2025, 12, 20), "Đã khóa điểm học kỳ I."))
            ),
            SubjectGrade(
                id = "literature",
                name = "Ngữ văn",
                teacher = "Cô Đỗ Khánh Linh",
                average = 7.9,
                comment = "Có tiến bộ về diễn đạt, cần luyện thêm phần mở bài.",
                performance = SubjectPerformance.STABLE,
                lastUpdated = createDate(2025, 12, 20),
                entries = listOf(
                    GradeEntry("l1", GradeEntryType.ORAL, "Miệng 1", 8.0, 1.0, createDate(2025, 10, 5)),
                    GradeEntry("l2", GradeEntryType.TEST1, "Bài viết số 3", 7.8, 2.0, createDate(2025, 11, 14)),
                    GradeEntry("l3", GradeEntryType.FINAL_EXAM, "Cuối kỳ", 7.9, 3.0, createDate(2025, 12, 18))
                ),
                updates = listOf(GradeUpdate(createDate(2025, 12, 20), "Đã khóa điểm học kỳ I."))
            ),
            SubjectGrade(
                id = "english",
                name = "Ngoại ngữ",
                teacher = "Cô Nguyễn Hạ Vy",
                average = 8.8,
                comment = "Giao tiếp tự tin, từ vựng phong phú hơn đầu năm.",
                performance = SubjectPerformance.STRONG,
                lastUpdated = createDate(2025, 12, 20),
                entries = listOf(
                    GradeEntry("e1", GradeEntryType.ORAL, "Speaking 1", 8.9, 1.0, createDate(2025, 10, 9)),
                    GradeEntry("e2", GradeEntryType.TEST1, "1 tiết", 8.7, 2.0, createDate(2025, 11, 10)),
                    GradeEntry("e3", GradeEntryType.FINAL_EXAM, "Cuối kỳ", 8.8, 3.0, createDate(2025, 12, 16))
                ),
                updates = listOf(GradeUpdate(createDate(2025, 12, 20), "Đã khóa điểm học kỳ I."))
            )
        )
    }

    private fun previousYearGrades(): List<SubjectGrade> {
        return listOf(
            SubjectGrade(
                id = "math",
                name = "Toán học",
                teacher = "Thầy Lê Quốc Bảo",
                average = 8.1,
                comment = "Kết quả khá, duy trì được nền tảng tốt.",
                performance = SubjectPerformance.STABLE,
                lastUpdated = createDate(2025, 5, 20),
                entries = listOf(
                    GradeEntry("pm1", GradeEntryType.TEST1, "1 tiết", 8.0, 2.0, createDate(2025, 3, 10)),
                    GradeEntry("pm2", GradeEntryType.FINAL_EXAM, "Cuối kỳ", 8.2, 3.0, createDate(2025, 5, 8))
                ),
                updates = listOf(GradeUpdate(createDate(2025, 5, 20), "Lưu kết quả năm học trước."))
            ),
            SubjectGrade(
                id = "english",
                name = "Ngoại ngữ",
                teacher = "Cô Nguyễn Hạ Vy",
                average = 8.4,
                comment = "Tự tin, đều các kỹ năng.",
                performance = SubjectPerformance.STRONG,
                lastUpdated = createDate(2025, 5, 20),
                entries = listOf(
                    GradeEntry("pe1", GradeEntryType.TEST1, "1 tiết", 8.2, 2.0, createDate(2025, 3, 22)),
                    GradeEntry("pe2", GradeEntryType.FINAL_EXAM, "Cuối kỳ", 8.5, 3.0, createDate(2025, 5, 10))
                ),
                updates = listOf(GradeUpdate(createDate(2025, 5, 20), "Lưu kết quả năm học trước."))
            )
        )
    }
}
