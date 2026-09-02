package com.app.quanlyhocsinh.data.models

import java.util.Date

enum class Gender(val label: String) {
    MALE("Nam"),
    FEMALE("Nữ"),
    OTHER("Khác");

    companion object {
        fun fromLabel(label: String): Gender = entries.firstOrNull { it.label == label } ?: MALE
    }
}

enum class ProfileStatus(val label: String) {
    COMPLETE("Đã đầy đủ"),
    MISSING("Chưa nhập"),
    NEEDS_SUPPLEMENT("Cần bổ sung"),
    PENDING_REVIEW("Chờ xác nhận")
}

enum class GradeEntryType(val label: String) {
    ORAL("Điểm miệng"),
    QUIZ15("15 phút"),
    TEST1("1 tiết"),
    MIDTERM("Giữa kỳ"),
    FINAL_EXAM("Cuối kỳ"),
    PRACTICE("Thực hành"),
    ATTENDANCE("Chuyên cần")
}

enum class SubjectPerformance(val label: String) {
    STRONG("Tốt"),
    STABLE("Ổn định"),
    IMPROVING("Cần cải thiện")
}

enum class AttendanceStatus(val label: String) {
    PRESENT("Có mặt"),
    LATE("Đi muộn"),
    EXCUSED("Nghỉ có phép"),
    UNEXCUSED("Nghỉ không phép")
}

enum class AttendanceRange(val label: String) {
    WEEK("7 ngày"),
    MONTH("30 ngày"),
    TERM("Học kỳ")
}

enum class AwardCategory(val label: String) {
    ACADEMIC("Học tập"),
    CONDUCT("Hạnh kiểm"),
    ARTS("Văn nghệ"),
    SPORTS("Thể thao"),
    ACTIVITIES("Phong trào"),
    OTHER("Khác")
}

enum class ServiceRegistrationStatus(val label: String) {
    NOT_REGISTERED("Chưa đăng ký"),
    REGISTERED("Đã đăng ký"),
    PENDING("Chờ duyệt"),
    APPROVED("Đã duyệt"),
    REJECTED("Từ chối"),
    EXPIRED("Hết hạn đăng ký")
}

enum class MessageCategory(val label: String) {
    STUDY("Thông báo học tập"),
    GRADES("Điểm số"),
    DISCIPLINE("Kỷ luật"),
    SCHEDULE("Nhắc lịch học/lịch thi"),
    ATTENDANCE("Điểm danh"),
    SERVICES("Dịch vụ"),
    EMERGENCY("Khẩn cấp")
}

enum class MessagePriority(val label: String) {
    LOW("Thường"),
    NORMAL("Quan trọng"),
    HIGH("Ưu tiên cao")
}

enum class ReportType(val label: String) {
    BULLYING("Bắt nạt"),
    PROPERTY_DAMAGE("Phá hoại tài sản"),
    MISCONDUCT("Hành vi không đúng nội quy"),
    CONFLICT("Xô xát"),
    HARASSMENT("Quấy rối"),
    DISCIPLINE("Vi phạm kỷ luật"),
    SAFETY("An toàn học đường"),
    OTHER("Khác")
}

enum class ReportSeverity(val label: String) {
    LOW("Nhẹ"),
    MEDIUM("Trung bình"),
    HIGH("Nghiêm trọng"),
    URGENT("Khẩn cấp")
}

enum class ReportStatus(val label: String) {
    SUBMITTED("Đã gửi"),
    RECEIVING("Đang tiếp nhận"),
    VERIFYING("Đang xác minh"),
    RESOLVED("Đã xử lý"),
    NEED_MORE_INFO("Cần bổ sung thông tin"),
    CLOSED("Đã đóng")
}

enum class ScheduleSegment(val label: String) {
    CLASSES("Lịch học"),
    EXAMS("Lịch thi")
}

data class StudentProfile(
    val name: String,
    val studentId: String,
    val className: String,
    val gradeLevel: String,
    val academicYear: String,
    val birthDate: Date,
    val gender: Gender,
    val schoolName: String,
    val avatarLabel: String
)

data class ParentProfile(
    val name: String,
    val relationship: String,
    val phone: String,
    val email: String,
    val address: String
)

data class HealthInfo(
    val summary: String,
    val allergyNote: String
)

data class EmergencyContact(
    val name: String,
    val phone: String,
    val relationship: String
)

data class StudentBundle(
    val student: StudentProfile,
    val parent: ParentProfile,
    val healthInfo: HealthInfo,
    val emergencyContact: EmergencyContact,
    val profileStatus: ProfileStatus,
    val profilePhotoName: String,
    val documents: List<String>
)

data class GradeEntry(
    val id: String,
    val type: GradeEntryType,
    val title: String,
    val score: Double,
    val weight: Double,
    val date: Date
)

data class GradeUpdate(
    val time: Date,
    val description: String
)

data class SubjectGrade(
    val id: String,
    val name: String,
    val teacher: String,
    val entries: List<GradeEntry>,
    val average: Double,
    val comment: String,
    val performance: SubjectPerformance,
    val lastUpdated: Date,
    val updates: List<GradeUpdate>
)

data class GradeOverview(
    val overallAverage: Double,
    val semesterAverage: Double,
    val yearAverage: Double,
    val topSubject: String,
    val focusSubject: String,
    val subjectCount: Int,
    val classification: String
)

data class AttendanceRecord(
    val id: String,
    val date: Date,
    val session: String,
    val status: AttendanceStatus,
    val note: String
)

data class AttendanceSummary(
    val presentCount: Int,
    val lateCount: Int,
    val absentCount: Int,
    val attendanceRate: Double
)

data class AwardRecord(
    val id: String,
    val title: String,
    val date: Date,
    val category: AwardCategory,
    val description: String,
    val issuer: String
)

data class ServicePackage(
    val id: String,
    val title: String,
    val description: String,
    val fee: Double
)

data class SchoolService(
    val id: String,
    val title: String,
    val description: String,
    val fee: Double,
    val deadline: Date,
    val activePeriod: String,
    val isOpen: Boolean,
    val status: ServiceRegistrationStatus,
    val packages: List<ServicePackage>,
    val highlight: String
)

data class ServiceRegistration(
    val id: String,
    val serviceId: String,
    val serviceTitle: String,
    val packageTitle: String,
    val period: String,
    val note: String,
    val submittedAt: Date,
    val status: ServiceRegistrationStatus,
    val canCancel: Boolean
)

data class SchoolMessage(
    val id: String,
    val title: String,
    val preview: String,
    val content: String,
    val time: Date,
    val category: MessageCategory,
    val isRead: Boolean,
    val priority: MessagePriority
)

data class SchoolReport(
    val id: String,
    val code: String,
    val title: String,
    val type: ReportType,
    val severity: ReportSeverity,
    val occurredAt: Date,
    val location: String,
    val description: String,
    val relatedPeople: String,
    val anonymous: Boolean,
    val attachments: List<String>,
    val submittedAt: Date,
    val status: ReportStatus,
    val schoolResponse: String
)

data class ClassScheduleItem(
    val id: String,
    val date: Date,
    val periodLabel: String,
    val start: Date,
    val end: Date,
    val subject: String,
    val room: String,
    val teacher: String,
    val note: String
)

data class ExamScheduleItem(
    val id: String,
    val date: Date,
    val start: Date,
    val subject: String,
    val room: String,
    val method: String,
    val note: String
)
