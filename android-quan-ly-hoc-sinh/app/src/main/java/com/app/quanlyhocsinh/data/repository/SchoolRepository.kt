package com.app.quanlyhocsinh.data.repository

import com.app.quanlyhocsinh.data.mock.MockDatabase
import com.app.quanlyhocsinh.data.models.*
import kotlinx.coroutines.delay
import java.util.Calendar
import java.util.Date

class SchoolRepository {
    private var _profile = MockDatabase.studentBundle()
    private val _gradeBook = MockDatabase.gradeBook().toMutableMap()
    private val _attendance = MockDatabase.attendance().toMutableList()
    private val _awards = MockDatabase.awards().toMutableList()
    private val _services = MockDatabase.services().toMutableList()
    private val _registrations = MockDatabase.registrations().toMutableList()
    private val _messages = MockDatabase.messages().toMutableList()
    private val _reports = MockDatabase.reports().toMutableList()
    private val _classSchedule = MockDatabase.classSchedule().toMutableList()
    private val _examSchedule = MockDatabase.examSchedule().toMutableList()

    val academicYears: List<String> get() = MockDatabase.academicYears
    val semesters: List<String> get() = MockDatabase.semesters

    private suspend fun <T> simulate(delayMs: Long = 120, block: () -> T): T {
        delay(delayMs)
        return block()
    }

    suspend fun fetchStudentBundle(): StudentBundle = simulate { _profile }

    suspend fun fetchSubjectGrades(academicYear: String, semester: String): List<SubjectGrade> = simulate {
        _gradeBook["$academicYear|$semester"] ?: emptyList()
    }

    suspend fun fetchAttendance(): List<AttendanceRecord> = simulate { _attendance.toList() }

    suspend fun fetchAwards(): List<AwardRecord> = simulate { _awards.toList() }

    suspend fun fetchServices(): List<SchoolService> = simulate { _services.toList() }

    suspend fun fetchRegistrations(): List<ServiceRegistration> = simulate { _registrations.toList() }

    suspend fun fetchMessages(): List<SchoolMessage> = simulate { _messages.toList() }

    suspend fun fetchReports(): List<SchoolReport> = simulate { _reports.toList() }

    suspend fun fetchClassSchedule(): List<ClassScheduleItem> = simulate { _classSchedule.toList() }

    suspend fun fetchExamSchedule(): List<ExamScheduleItem> = simulate { _examSchedule.toList() }

    suspend fun saveProfile(bundle: StudentBundle): StudentBundle = simulate(220) {
        _profile = bundle
        _profile
    }

    suspend fun markMessageRead(id: String): List<SchoolMessage> = simulate(120) {
        val index = _messages.indexOfFirst { it.id == id }
        if (index >= 0) {
            _messages[index] = _messages[index].copy(isRead = true)
        }
        _messages.toList()
    }

    suspend fun markAllMessagesRead(): List<SchoolMessage> = simulate(140) {
        for (i in _messages.indices) {
            _messages[i] = _messages[i].copy(isRead = true)
        }
        _messages.toList()
    }

    suspend fun registerService(
        service: SchoolService,
        selectedPackage: ServicePackage,
        period: String,
        note: String
    ): List<ServiceRegistration> = simulate(220) {
        val now = Date()
        val registration = ServiceRegistration(
            id = "reg-${_registrations.size + 11}",
            serviceId = service.id,
            serviceTitle = service.title,
            packageTitle = selectedPackage.title,
            period = period,
            note = note,
            submittedAt = now,
            status = ServiceRegistrationStatus.PENDING,
            canCancel = true
        )
        _registrations.add(0, registration)

        val index = _services.indexOfFirst { it.id == service.id }
        if (index >= 0) {
            _services[index] = _services[index].copy(status = ServiceRegistrationStatus.PENDING)
        }
        _registrations.toList()
    }

    suspend fun cancelRegistration(registration: ServiceRegistration): List<ServiceRegistration> = simulate(180) {
        _registrations.removeAll { it.id == registration.id }
        val index = _services.indexOfFirst { it.id == registration.serviceId }
        if (index >= 0) {
            _services[index] = _services[index].copy(status = ServiceRegistrationStatus.NOT_REGISTERED)
        }
        _registrations.toList()
    }

    suspend fun syncServicesFromRegistrations(): List<SchoolService> = simulate(90) {
        _services.toList()
    }

    suspend fun submitReport(
        title: String,
        type: ReportType,
        severity: ReportSeverity,
        occurredAt: Date,
        location: String,
        description: String,
        relatedPeople: String,
        anonymous: Boolean,
        attachments: List<String>
    ): List<SchoolReport> = simulate(260) {
        val now = Date()
        val cal = Calendar.getInstance().apply { time = now }
        val year2 = cal.get(Calendar.YEAR).toString().substring(2)
        val monthStr = (cal.get(Calendar.MONTH) + 1).toString().padStart(2, '0')
        val dayStr = cal.get(Calendar.DAY_OF_MONTH).toString().padStart(2, '0')
        val codeNum = (_reports.size + 23).toString().padStart(3, '0')
        val code = "PA-$year2$monthStr$dayStr-$codeNum"

        val report = SchoolReport(
            id = "rep-${_reports.size + 10}",
            code = code,
            title = title,
            type = type,
            severity = severity,
            occurredAt = occurredAt,
            location = location,
            description = description,
            relatedPeople = relatedPeople,
            anonymous = anonymous,
            attachments = attachments,
            submittedAt = now,
            status = ReportStatus.RECEIVING,
            schoolResponse = "Nhà trường đã ghi nhận thông tin và sẽ phản hồi sau khi hoàn tất bước tiếp nhận ban đầu."
        )
        _reports.add(0, report)
        _reports.toList()
    }
}
