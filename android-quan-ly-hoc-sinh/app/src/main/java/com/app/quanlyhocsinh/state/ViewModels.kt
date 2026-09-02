package com.app.quanlyhocsinh.state

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.app.quanlyhocsinh.data.models.*
import com.app.quanlyhocsinh.data.repository.SchoolRepository
import com.app.quanlyhocsinh.data.mock.MockDatabase
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.util.Calendar
import java.util.Date

open class LoadableViewModel : ViewModel() {
    var isLoading by mutableStateOf(false)
        protected set
    var isInitialized by mutableStateOf(false)
        protected set
    var errorMessage by mutableStateOf<String?>(null)
        protected set

    val hasError: Boolean get() = errorMessage != null

    // Scroll state cache for Compose lists
    var scrollItemIndex by mutableStateOf(0)
    var scrollItemOffset by mutableStateOf(0)

    protected fun setLoadingState(value: Boolean) {
        isLoading = value
    }

    protected fun setErrorState(value: String?) {
        errorMessage = value
    }
}

class GradesViewModel(private val repository: SchoolRepository) : LoadableViewModel() {
    val academicYears = repository.academicYears
    val semesters = repository.semesters

    var selectedAcademicYear by mutableStateOf(academicYears.first())
        private set
    var selectedSemester by mutableStateOf(semesters.first())
        private set
    var selectedSubjectId by mutableStateOf<String?>(null)
        private set
    var searchQuery by mutableStateOf("")
        private set

    private val _subjects = MutableStateFlow<List<SubjectGrade>>(emptyList())
    val subjects: StateFlow<List<SubjectGrade>> = _subjects.asStateFlow()

    val availableSubjects: List<String>
        get() = _subjects.value.map { it.name }

    val filteredSubjects: List<SubjectGrade>
        get() {
            return _subjects.value.filter { subject ->
                val matchSearch = searchQuery.trim().isEmpty() ||
                        subject.name.contains(searchQuery, ignoreCase = true) ||
                        subject.teacher.contains(searchQuery, ignoreCase = true)
                val matchSubject = selectedSubjectId == null || subject.id == selectedSubjectId
                matchSearch && matchSubject
            }
        }

    val overview: GradeOverview
        get() {
            val source = filteredSubjects
            if (source.isEmpty()) {
                return GradeOverview(
                    overallAverage = 0.0,
                    semesterAverage = 0.0,
                    yearAverage = 0.0,
                    topSubject = "Chưa có",
                    focusSubject = "Chưa có",
                    subjectCount = 0,
                    classification = "Chưa có dữ liệu"
                )
            }
            val highest = source.maxByOrNull { it.average }!!
            val lowest = source.minByOrNull { it.average }!!
            val average = source.map { it.average }.average()
            return GradeOverview(
                overallAverage = average,
                semesterAverage = average,
                yearAverage = maxOf(average - 0.15, 0.0),
                topSubject = highest.name,
                focusSubject = lowest.name,
                subjectCount = source.size,
                classification = getClassification(average)
            )
        }

    fun load() {
        viewModelScope.launch {
            setLoadingState(true)
            try {
                _subjects.value = repository.fetchSubjectGrades(selectedAcademicYear, selectedSemester)
                isInitialized = true
                setErrorState(null)
            } catch (e: Exception) {
                setErrorState("Không thể tải dữ liệu điểm lúc này.")
            } finally {
                setLoadingState(false)
            }
        }
    }

    fun refresh() {
        load()
    }

    fun applyFilters(academicYear: String, semester: String, subjectId: String?) {
        selectedAcademicYear = academicYear
        selectedSemester = semester
        selectedSubjectId = subjectId
        load()
    }

    fun updateSearch(value: String) {
        searchQuery = value
    }

    fun updateSubjectFilter(value: String?) {
        selectedSubjectId = value
    }

    private fun getClassification(average: Double): String {
        return when {
            average >= 8.5 -> "Giỏi"
            average >= 7.0 -> "Khá"
            average >= 5.0 -> "Trung bình"
            else -> "Cần hỗ trợ thêm"
        }
    }
}

class AttendanceViewModel(private val repository: SchoolRepository) : LoadableViewModel() {
    var range by mutableStateOf(AttendanceRange.MONTH)
        private set

    private val _records = MutableStateFlow<List<AttendanceRecord>>(emptyList())
    val records: StateFlow<List<AttendanceRecord>> = _records.asStateFlow()

    val filteredRecords: List<AttendanceRecord>
        get() {
            // Simulated current time in Flutter: 2026-03-27 23:59
            val nowCal = Calendar.getInstance().apply {
                set(2026, Calendar.MARCH, 27, 23, 59, 0)
            }
            val lowerBound = when (range) {
                AttendanceRange.WEEK -> {
                    nowCal.add(Calendar.DAY_OF_YEAR, -7)
                    nowCal.time
                }
                AttendanceRange.MONTH -> {
                    nowCal.add(Calendar.DAY_OF_YEAR, -30)
                    nowCal.time
                }
                AttendanceRange.TERM -> {
                    Calendar.getInstance().apply {
                        set(2026, Calendar.JANUARY, 1, 0, 0, 0)
                    }.time
                }
            }
            return _records.value.filter { !it.date.before(lowerBound) }
        }

    val summary: AttendanceSummary
        get() {
            val source = filteredRecords
            val present = source.count { it.status == AttendanceStatus.PRESENT }
            val late = source.count { it.status == AttendanceStatus.LATE }
            val absent = source.count {
                it.status == AttendanceStatus.EXCUSED || it.status == AttendanceStatus.UNEXCUSED
            }
            val rate = if (source.isEmpty()) 0.0 else ((present + late * 0.5) / source.size) * 100
            return AttendanceSummary(
                presentCount = present,
                lateCount = late,
                absentCount = absent,
                attendanceRate = rate
            )
        }

    fun load() {
        viewModelScope.launch {
            setLoadingState(true)
            try {
                _records.value = repository.fetchAttendance()
                isInitialized = true
                setErrorState(null)
            } catch (e: Exception) {
                setErrorState("Không thể tải lịch sử điểm danh.")
            } finally {
                setLoadingState(false)
            }
        }
    }

    fun refresh() {
        load()
    }

    fun updateRange(value: AttendanceRange) {
        range = value
    }
}

class AwardsViewModel(private val repository: SchoolRepository) : LoadableViewModel() {
    var selectedCategory by mutableStateOf<AwardCategory?>(null)
        private set

    private val _awards = MutableStateFlow<List<AwardRecord>>(emptyList())
    val awardsList: StateFlow<List<AwardRecord>> = _awards.asStateFlow()

    val awards: List<AwardRecord>
        get() {
            val cat = selectedCategory
            return if (cat == null) {
                _awards.value
            } else {
                _awards.value.filter { it.category == cat }
            }
        }

    fun load() {
        viewModelScope.launch {
            setLoadingState(true)
            try {
                _awards.value = repository.fetchAwards()
                isInitialized = true
                setErrorState(null)
            } catch (e: Exception) {
                setErrorState("Không thể tải danh sách khen thưởng.")
            } finally {
                setLoadingState(false)
            }
        }
    }

    fun refresh() {
        load()
    }

    fun updateCategory(category: AwardCategory?) {
        selectedCategory = category
    }
}

class ProfileViewModel(private val repository: SchoolRepository) : LoadableViewModel() {
    var bundle by mutableStateOf<StudentBundle?>(null)
        private set
    var isSaving by mutableStateOf(false)
        private set

    fun load() {
        viewModelScope.launch {
            setLoadingState(true)
            try {
                bundle = repository.fetchStudentBundle()
                isInitialized = true
                setErrorState(null)
            } catch (e: Exception) {
                setErrorState("Không thể tải hồ sơ học sinh.")
            } finally {
                setLoadingState(false)
            }
        }
    }

    suspend fun save(updatedBundle: StudentBundle): Boolean {
        isSaving = true
        return try {
            val saved = repository.saveProfile(
                updatedBundle.copy(profileStatus = ProfileStatus.PENDING_REVIEW)
            )
            bundle = saved
            setErrorState(null)
            isSaving = false
            true
        } catch (e: Exception) {
            setErrorState("Lưu hồ sơ chưa thành công. Vui lòng thử lại.")
            isSaving = false
            false
        }
    }
}

class ServicesViewModel(private val repository: SchoolRepository) : LoadableViewModel() {
    var showRegisteredOnly by mutableStateOf(false)
        private set
    var searchQuery by mutableStateOf("")
        private set
    var isSubmitting by mutableStateOf(false)
        private set

    private val _services = MutableStateFlow<List<SchoolService>>(emptyList())
    val servicesList: StateFlow<List<SchoolService>> = _services.asStateFlow()

    private val _registrations = MutableStateFlow<List<ServiceRegistration>>(emptyList())
    val registrations: StateFlow<List<ServiceRegistration>> = _registrations.asStateFlow()

    val services: List<SchoolService>
        get() {
            val base = if (showRegisteredOnly) {
                _services.value.filter { it.status != ServiceRegistrationStatus.NOT_REGISTERED }
            } else {
                _services.value
            }
            return base.filter { service ->
                searchQuery.trim().isEmpty() ||
                        service.title.contains(searchQuery, ignoreCase = true) ||
                        service.description.contains(searchQuery, ignoreCase = true)
            }
        }

    fun load() {
        viewModelScope.launch {
            setLoadingState(true)
            try {
                _services.value = repository.fetchServices()
                _registrations.value = repository.fetchRegistrations()
                isInitialized = true
                setErrorState(null)
            } catch (e: Exception) {
                setErrorState("Không thể tải dịch vụ của nhà trường.")
            } finally {
                setLoadingState(false)
            }
        }
    }

    fun refresh() {
        load()
    }

    fun updateSearch(value: String) {
        searchQuery = value
    }

    fun updateMode(value: Boolean) {
        showRegisteredOnly = value
    }

    fun serviceById(id: String): SchoolService? {
        return _services.value.firstOrNull { it.id == id }
    }

    suspend fun register(
        service: SchoolService,
        selectedPackage: ServicePackage,
        period: String,
        note: String
    ): Boolean {
        isSubmitting = true
        return try {
            val regList = repository.registerService(service, selectedPackage, period, note)
            _registrations.value = regList
            val servList = repository.syncServicesFromRegistrations()
            _services.value = servList
            setErrorState(null)
            isSubmitting = false
            true
        } catch (e: Exception) {
            setErrorState("Đăng ký dịch vụ chưa thành công.")
            isSubmitting = false
            false
        }
    }

    suspend fun cancel(registration: ServiceRegistration): Boolean {
        isSubmitting = true
        return try {
            val regList = repository.cancelRegistration(registration)
            _registrations.value = regList
            val servList = repository.syncServicesFromRegistrations()
            _services.value = servList
            setErrorState(null)
            isSubmitting = false
            true
        } catch (e: Exception) {
            setErrorState("Không thể hủy đăng ký vào lúc này.")
            isSubmitting = false
            false
        }
    }
}

class MessagesViewModel(private val repository: SchoolRepository) : LoadableViewModel() {
    var selectedCategory by mutableStateOf<MessageCategory?>(null)
        private set
    var searchQuery by mutableStateOf("")
        private set
    var isSubmitting by mutableStateOf(false)
        private set

    private val _messages = MutableStateFlow<List<SchoolMessage>>(emptyList())
    val allMessages: StateFlow<List<SchoolMessage>> = _messages.asStateFlow()

    val filteredMessages: List<SchoolMessage>
        get() {
            return _messages.value.filter { item ->
                val categoryMatch = selectedCategory == null || item.category == selectedCategory
                val searchMatch = searchQuery.trim().isEmpty() ||
                        item.title.contains(searchQuery, ignoreCase = true) ||
                        item.preview.contains(searchQuery, ignoreCase = true) ||
                        item.content.contains(searchQuery, ignoreCase = true)
                categoryMatch && searchMatch
            }
        }

    val unreadCount: Int
        get() = _messages.value.count { !it.isRead }

    fun load() {
        viewModelScope.launch {
            setLoadingState(true)
            try {
                _messages.value = repository.fetchMessages()
                isInitialized = true
                setErrorState(null)
            } catch (e: Exception) {
                setErrorState("Không thể tải thông báo.")
            } finally {
                setLoadingState(false)
            }
        }
    }

    fun refresh() {
        load()
    }

    fun updateSearch(value: String) {
        searchQuery = value
    }

    fun updateCategory(value: MessageCategory?) {
        selectedCategory = value
    }

    fun markRead(id: String) {
        viewModelScope.launch {
            isSubmitting = true
            val list = repository.markMessageRead(id)
            _messages.value = list
            isSubmitting = false
        }
    }

    fun markAllRead() {
        viewModelScope.launch {
            isSubmitting = true
            val list = repository.markAllMessagesRead()
            _messages.value = list
            isSubmitting = false
        }
    }
}

class ReportsViewModel(private val repository: SchoolRepository) : LoadableViewModel() {
    var isSubmitting by mutableStateOf(false)
        private set

    private val _reports = MutableStateFlow<List<SchoolReport>>(emptyList())
    val reports: StateFlow<List<SchoolReport>> = _reports.asStateFlow()

    val openCount: Int
        get() = _reports.value.count { it.status != ReportStatus.CLOSED }

    fun load() {
        viewModelScope.launch {
            setLoadingState(true)
            try {
                _reports.value = repository.fetchReports()
                isInitialized = true
                setErrorState(null)
            } catch (e: Exception) {
                setErrorState("Không thể tải danh sách phản ánh.")
            } finally {
                setLoadingState(false)
            }
        }
    }

    fun refresh() {
        load()
    }

    suspend fun submit(
        title: String,
        type: ReportType,
        severity: ReportSeverity,
        occurredAt: Date,
        location: String,
        description: String,
        relatedPeople: String,
        anonymous: Boolean,
        attachments: List<String>
    ): Boolean {
        isSubmitting = true
        return try {
            val list = repository.submitReport(
                title = title,
                type = type,
                severity = severity,
                occurredAt = occurredAt,
                location = location,
                description = description,
                relatedPeople = relatedPeople,
                anonymous = anonymous,
                attachments = attachments
            )
            _reports.value = list
            setErrorState(null)
            isSubmitting = false
            true
        } catch (e: Exception) {
            setErrorState("Gửi phản ánh chưa thành công.")
            isSubmitting = false
            false
        }
    }
}

class ScheduleViewModel(private val repository: SchoolRepository) : LoadableViewModel() {
    var segment by mutableStateOf(ScheduleSegment.CLASSES)
        private set
    var selectedDate by mutableStateOf(MockDatabase.createDate(2026, 3, 30))
        private set

    private val _classes = MutableStateFlow<List<ClassScheduleItem>>(emptyList())
    val classItems: StateFlow<List<ClassScheduleItem>> = _classes.asStateFlow()

    private val _exams = MutableStateFlow<List<ExamScheduleItem>>(emptyList())
    val examItems: StateFlow<List<ExamScheduleItem>> = _exams.asStateFlow()

    val weekDates: List<Date>
        get() {
            val cal = Calendar.getInstance().apply { time = selectedDate }
            // In Java Calendar, Sunday is 1, Monday is 2, ..., Saturday is 7
            // We want to find Monday (index 2) of this week
            val dayOfWeek = cal.get(Calendar.DAY_OF_WEEK)
            val diffToMonday = when (dayOfWeek) {
                Calendar.SUNDAY -> -6
                else -> Calendar.MONDAY - dayOfWeek
            }
            cal.add(Calendar.DAY_OF_YEAR, diffToMonday)

            return List(7) {
                val d = cal.time
                cal.add(Calendar.DAY_OF_YEAR, 1)
                d
            }
        }

    val classesForSelectedDate: List<ClassScheduleItem>
        get() {
            val selCal = Calendar.getInstance().apply { time = selectedDate }
            return _classes.value.filter { item ->
                val itemCal = Calendar.getInstance().apply { time = item.date }
                itemCal.get(Calendar.YEAR) == selCal.get(Calendar.YEAR) &&
                        itemCal.get(Calendar.MONTH) == selCal.get(Calendar.MONTH) &&
                        itemCal.get(Calendar.DAY_OF_MONTH) == selCal.get(Calendar.DAY_OF_MONTH)
            }
        }

    val upcomingExams: List<ExamScheduleItem>
        get() {
            // Simulated current time: 2026-03-27
            val simulatedNow = Calendar.getInstance().apply {
                set(2026, Calendar.MARCH, 27, 0, 0, 0)
            }.time
            return _exams.value.filter { !it.date.before(simulatedNow) }
        }

    val nextExam: ExamScheduleItem?
        get() = upcomingExams.firstOrNull()

    fun load() {
        viewModelScope.launch {
            setLoadingState(true)
            try {
                _classes.value = repository.fetchClassSchedule()
                _exams.value = repository.fetchExamSchedule()
                isInitialized = true
                setErrorState(null)
            } catch (e: Exception) {
                setErrorState("Không thể tải lịch học và lịch thi.")
            } finally {
                setLoadingState(false)
            }
        }
    }

    fun refresh() {
        load()
    }

    fun updateSegment(value: ScheduleSegment) {
        segment = value
    }

    fun selectDate(date: Date) {
        selectedDate = date
    }
}

class AppControllers(val repository: SchoolRepository) {
    val grades = GradesViewModel(repository)
    val attendance = AttendanceViewModel(repository)
    val awards = AwardsViewModel(repository)
    val profile = ProfileViewModel(repository)
    val services = ServicesViewModel(repository)
    val messages = MessagesViewModel(repository)
    val reports = ReportsViewModel(repository)
    val schedule = ScheduleViewModel(repository)

    // Global scroll state cache
    private val scrollCache = mutableMapOf<String, Pair<Int, Int>>()

    fun getScrollState(key: String): Pair<Int, Int> {
        return scrollCache[key] ?: Pair(0, 0)
    }

    fun saveScrollState(key: String, index: Int, offset: Int) {
        scrollCache[key] = Pair(index, offset)
    }

    fun initialize() {
        grades.load()
        attendance.load()
        awards.load()
        profile.load()
        services.load()
        messages.load()
        reports.load()
        schedule.load()
    }
}
