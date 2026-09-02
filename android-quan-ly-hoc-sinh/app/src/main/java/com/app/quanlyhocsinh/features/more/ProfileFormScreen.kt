package com.app.quanlyhocsinh.features.more

import android.app.DatePickerDialog
import android.widget.Toast
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Circle
import androidx.compose.material.icons.filled.InsertDriveFile
import androidx.compose.material.icons.filled.AttachFile
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.RadioButtonChecked
import androidx.compose.material.icons.filled.RadioButtonUnchecked
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import com.app.quanlyhocsinh.core.theme.LocalGlassColors
import com.app.quanlyhocsinh.core.utils.AppFormatters
import com.app.quanlyhocsinh.data.models.Gender
import com.app.quanlyhocsinh.data.models.ParentProfile
import com.app.quanlyhocsinh.data.models.StudentProfile
import com.app.quanlyhocsinh.data.models.HealthInfo
import com.app.quanlyhocsinh.data.models.EmergencyContact
import com.app.quanlyhocsinh.data.models.StudentBundle
import com.app.quanlyhocsinh.state.LocalAppControllers
import com.app.quanlyhocsinh.shared.components.*
import kotlinx.coroutines.launch
import java.util.Calendar
import java.util.Date

@Composable
fun ProfileFormScreen(
    navController: NavController,
    modifier: Modifier = Modifier
) {
    val app = LocalAppControllers.current
    val glassColors = LocalGlassColors.current
    val controller = app.profile
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    val bundle = controller.bundle ?: return

    var isDirty by remember { mutableStateOf(false) }
    var showConfirmLeaveDialog by remember { mutableStateOf(false) }

    // State fields
    var studentName by remember { mutableStateOf(bundle.student.name) }
    var studentId by remember { mutableStateOf(bundle.student.studentId) }
    var className by remember { mutableStateOf(bundle.student.className) }
    var academicYear by remember { mutableStateOf(bundle.student.academicYear) }
    var schoolName by remember { mutableStateOf(bundle.student.schoolName) }
    var birthDateVal by remember { mutableStateOf(bundle.student.birthDate) }
    var birthDateText by remember { mutableStateOf(AppFormatters.dayMonthYear(birthDateVal)) }
    var genderVal by remember { mutableStateOf(bundle.student.gender) }

    var parentName by remember { mutableStateOf(bundle.parent.name) }
    var relationship by remember { mutableStateOf(bundle.parent.relationship) }
    var phone by remember { mutableStateOf(bundle.parent.phone) }
    var email by remember { mutableStateOf(bundle.parent.email) }
    var address by remember { mutableStateOf(bundle.parent.address) }

    var healthSummary by remember { mutableStateOf(bundle.healthInfo.summary) }
    var allergyNote by remember { mutableStateOf(bundle.healthInfo.allergyNote) }
    var emergencyName by remember { mutableStateOf(bundle.emergencyContact.name) }
    var emergencyPhone by remember { mutableStateOf(bundle.emergencyContact.phone) }
    var emergencyRelationship by remember { mutableStateOf(bundle.emergencyContact.relationship) }

    var photoName by remember { mutableStateOf(bundle.profilePhotoName) }
    var documents by remember { mutableStateOf(bundle.documents) }

    // Picker triggers
    var showClassPicker by remember { mutableStateOf(false) }
    var showYearPicker by remember { mutableStateOf(false) }
    var showGenderPicker by remember { mutableStateOf(false) }
    var showRelationshipPicker by remember { mutableStateOf(false) }

    fun handleBack() {
        if (isDirty) {
            showConfirmLeaveDialog = true
        } else {
            navController.popBackStack()
        }
    }

    // Intercept hardware back button
    BackHandler {
        handleBack()
    }

    IosPageScaffold(
        title = "Bổ sung hồ sơ",
        showBack = true,
        onBackTap = { handleBack() }
    ) {
        LazyColumn(
            modifier = modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = 20.dp, end = 20.dp, top = 20.dp, bottom = 40.dp)
        ) {
            // Status and photo card
            item {
                AppGlassCard(
                    borderRadius = RoundedCornerShape(30.dp),
                    borderRadiusVal = 30.dp
                ) {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalAlignment = Alignment.Start
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.Default.InsertDriveFile,
                                contentDescription = null,
                                tint = glassColors.textPrimary,
                                modifier = Modifier.size(22.dp)
                            )
                            Spacer(modifier = Modifier.width(10.dp))
                            Text(
                                text = "Trạng thái hồ sơ",
                                color = glassColors.textPrimary,
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Spacer(modifier = Modifier.weight(1f))
                            StatusPill(label = bundle.profileStatus.label, color = glassColors.accent)
                        }
                        Spacer(modifier = Modifier.height(16.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            AppMonogramAvatar(label = bundle.student.avatarLabel, size = 62.dp)
                            Spacer(modifier = Modifier.width(14.dp))
                            Text(
                                text = photoName,
                                color = glassColors.textPrimary,
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.weight(1f)
                            )
                            Text(
                                text = "Đổi ảnh",
                                color = glassColors.accent,
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.clickable {
                                    photoName = "anh_ho_so_cap_nhat.jpg"
                                    isDirty = true
                                }
                            )
                        }
                    }
                }
            }

            // Section: Thông tin học sinh
            item {
                Spacer(modifier = Modifier.height(18.dp))
                AppSectionTitle(title = "Thông tin học sinh")
                RoundedInputField(
                    value = studentName,
                    onValueChange = {
                        studentName = it
                        isDirty = true
                    },
                    placeholder = "Họ và tên học sinh",
                    label = "Họ và tên"
                )
                Spacer(modifier = Modifier.height(12.dp))
                RoundedInputField(
                    value = studentId,
                    onValueChange = {
                        studentId = it
                        isDirty = true
                    },
                    placeholder = "Mã học sinh",
                    label = "Mã học sinh"
                )
                Spacer(modifier = Modifier.height(12.dp))
                RoundedInputField(
                    value = className,
                    onValueChange = {},
                    placeholder = "Lớp",
                    label = "Lớp",
                    readOnly = true,
                    onTap = { showClassPicker = true }
                )
                Spacer(modifier = Modifier.height(12.dp))
                RoundedInputField(
                    value = academicYear,
                    onValueChange = {},
                    placeholder = "Năm học",
                    label = "Năm học",
                    readOnly = true,
                    onTap = { showYearPicker = true }
                )
                Spacer(modifier = Modifier.height(12.dp))
                // BirthDate field
                RoundedInputField(
                    value = birthDateText,
                    onValueChange = {},
                    placeholder = "Ngày sinh",
                    label = "Ngày sinh",
                    readOnly = true,
                    onTap = {
                        val cal = Calendar.getInstance().apply { time = birthDateVal }
                        DatePickerDialog(
                            context,
                            { _, year, month, dayOfMonth ->
                                val selectedCal = Calendar.getInstance().apply {
                                    set(year, month, dayOfMonth)
                                }
                                birthDateVal = selectedCal.time
                                birthDateText = AppFormatters.dayMonthYear(selectedCal.time)
                                isDirty = true
                            },
                            cal.get(Calendar.YEAR),
                            cal.get(Calendar.MONTH),
                            cal.get(Calendar.DAY_OF_MONTH)
                        ).show()
                    }
                )
                Spacer(modifier = Modifier.height(12.dp))
                AppListTile(
                    icon = Icons.Default.Person,
                    title = "Giới tính",
                    subtitle = genderVal.label,
                    onTap = { showGenderPicker = true }
                )
                Spacer(modifier = Modifier.height(12.dp))
                RoundedInputField(
                    value = schoolName,
                    onValueChange = {
                        schoolName = it
                        isDirty = true
                    },
                    placeholder = "Trường học",
                    label = "Trường"
                )
            }

            // Section: Thông tin phụ huynh
            item {
                Spacer(modifier = Modifier.height(18.dp))
                AppSectionTitle(title = "Thông tin phụ huynh")
                RoundedInputField(
                    value = parentName,
                    onValueChange = {
                        parentName = it
                        isDirty = true
                    },
                    placeholder = "Họ và tên phụ huynh",
                    label = "Họ và tên"
                )
                Spacer(modifier = Modifier.height(12.dp))
                RoundedInputField(
                    value = relationship,
                    onValueChange = {},
                    placeholder = "Quan hệ",
                    label = "Quan hệ",
                    readOnly = true,
                    onTap = { showRelationshipPicker = true }
                )
                Spacer(modifier = Modifier.height(12.dp))
                RoundedInputField(
                    value = phone,
                    onValueChange = {
                        phone = it
                        isDirty = true
                    },
                    placeholder = "Số điện thoại",
                    label = "Số điện thoại",
                    keyboardType = KeyboardType.Phone
                )
                Spacer(modifier = Modifier.height(12.dp))
                RoundedInputField(
                    value = email,
                    onValueChange = {
                        email = it
                        isDirty = true
                    },
                    placeholder = "Email",
                    label = "Email",
                    keyboardType = KeyboardType.Email
                )
                Spacer(modifier = Modifier.height(12.dp))
                RoundedInputField(
                    value = address,
                    onValueChange = {
                        address = it
                        isDirty = true
                    },
                    placeholder = "Địa chỉ liên hệ",
                    label = "Địa chỉ",
                    maxLines = 2
                )
            }

            // Section: Sức khỏe và liên hệ khẩn cấp
            item {
                Spacer(modifier = Modifier.height(18.dp))
                AppSectionTitle(title = "Sức khỏe và liên hệ khẩn cấp")
                RoundedInputField(
                    value = healthSummary,
                    onValueChange = {
                        healthSummary = it
                        isDirty = true
                    },
                    placeholder = "Tình trạng sức khỏe cơ bản",
                    label = "Sức khỏe",
                    maxLines = 2
                )
                Spacer(modifier = Modifier.height(12.dp))
                RoundedInputField(
                    value = allergyNote,
                    onValueChange = {
                        allergyNote = it
                        isDirty = true
                    },
                    placeholder = "Ghi chú dị ứng hoặc lưu ý y tế",
                    label = "Lưu ý y tế",
                    maxLines = 2
                )
                Spacer(modifier = Modifier.height(12.dp))
                RoundedInputField(
                    value = emergencyName,
                    onValueChange = {
                        emergencyName = it
                        isDirty = true
                    },
                    placeholder = "Người liên hệ khẩn cấp",
                    label = "Người liên hệ"
                )
                Spacer(modifier = Modifier.height(12.dp))
                RoundedInputField(
                    value = emergencyPhone,
                    onValueChange = {
                        emergencyPhone = it
                        isDirty = true
                    },
                    placeholder = "Số điện thoại khẩn cấp",
                    label = "Số điện thoại",
                    keyboardType = KeyboardType.Phone
                )
                Spacer(modifier = Modifier.height(12.dp))
                RoundedInputField(
                    value = emergencyRelationship,
                    onValueChange = {
                        emergencyRelationship = it
                        isDirty = true
                    },
                    placeholder = "Mối quan hệ",
                    label = "Quan hệ"
                )
            }

            // Section: Tệp đính kèm
            item {
                Spacer(modifier = Modifier.height(18.dp))
                AppSectionTitle(title = "Tệp đính kèm")
                AppGlassCard {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalAlignment = Alignment.Start
                    ) {
                        Text(
                            text = "Giấy tờ hiện có",
                            color = glassColors.textPrimary,
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(modifier = Modifier.height(10.dp))
                        documents.forEach { doc ->
                            Text(
                                text = "• $doc",
                                color = glassColors.textSecondary,
                                fontSize = 13.sp,
                                modifier = Modifier.padding(bottom = 8.dp)
                            )
                        }
                        Spacer(modifier = Modifier.height(10.dp))
                        SoftSecondaryButton(
                            label = "Tải thêm giấy tờ",
                            icon = Icons.Default.AttachFile,
                            onPressed = {
                                documents = documents + "giay_to_bo_sung_${documents.size + 1}.pdf"
                                isDirty = true
                            }
                        )
                    }
                }
            }

            // Save Button
            item {
                Spacer(modifier = Modifier.height(24.dp))
                SoftPrimaryButton(
                    label = "Lưu hồ sơ",
                    isLoading = controller.isSaving,
                    onPressed = {
                        if (studentName.trim().isEmpty() || studentId.trim().isEmpty() ||
                            schoolName.trim().isEmpty() || parentName.trim().isEmpty() ||
                            phone.trim().isEmpty() || email.trim().isEmpty() ||
                            address.trim().isEmpty() || healthSummary.trim().isEmpty() ||
                            emergencyName.trim().isEmpty() || emergencyPhone.trim().isEmpty() ||
                            emergencyRelationship.trim().isEmpty()
                        ) {
                            Toast.makeText(context, "Vui lòng nhập đầy đủ thông tin bắt buộc", Toast.LENGTH_SHORT).show()
                            return@SoftPrimaryButton
                        }
                        scope.launch {
                            val ok = controller.save(
                                StudentBundle(
                                    student = StudentProfile(
                                        name = studentName.trim(),
                                        studentId = studentId.trim(),
                                        className = className.trim(),
                                        gradeLevel = bundle.student.gradeLevel,
                                        academicYear = academicYear.trim(),
                                        birthDate = birthDateVal,
                                        gender = genderVal,
                                        schoolName = schoolName.trim(),
                                        avatarLabel = bundle.student.avatarLabel
                                    ),
                                    parent = ParentProfile(
                                        name = parentName.trim(),
                                        relationship = relationship.trim(),
                                        phone = phone.trim(),
                                        email = email.trim(),
                                        address = address.trim()
                                    ),
                                    healthInfo = HealthInfo(
                                        summary = healthSummary.trim(),
                                        allergyNote = allergyNote.trim()
                                    ),
                                    emergencyContact = EmergencyContact(
                                        name = emergencyName.trim(),
                                        phone = emergencyPhone.trim(),
                                        relationship = emergencyRelationship.trim()
                                    ),
                                    profileStatus = bundle.profileStatus,
                                    profilePhotoName = photoName,
                                    documents = documents
                                )
                            )
                            if (ok) {
                                isDirty = false
                                Toast.makeText(context, "Đã lưu hồ sơ và chuyển sang trạng thái chờ xác nhận.", Toast.LENGTH_LONG).show()
                                navController.popBackStack()
                            } else {
                                Toast.makeText(context, "Lưu hồ sơ chưa thành công.", Toast.LENGTH_SHORT).show()
                            }
                        }
                    }
                )
                Spacer(modifier = Modifier.height(20.dp))
            }
        }
    }

    // Confirmation Leave Dialog
    ConfirmationDialog(
        show = showConfirmLeaveDialog,
        title = "Rời khỏi trang?",
        content = "Những thay đổi chưa lưu sẽ bị mất.",
        confirmLabel = "Rời trang",
        onConfirm = {
            showConfirmLeaveDialog = false
            navController.popBackStack()
        },
        onDismiss = {
            showConfirmLeaveDialog = false
        }
    )

    // Bottom sheets selectors
    if (showClassPicker) {
        AppBottomSheet(
            show = true,
            onDismissRequest = { showClassPicker = false }
        ) {
            Text(
                text = "Chọn lớp",
                color = glassColors.textPrimary,
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(16.dp))
            listOf("8A1", "8A2", "8A3", "8A4").forEach { item ->
                Box(modifier = Modifier.padding(bottom = 10.dp)) {
                    AppListTile(
                        icon = if (item == className) Icons.Default.RadioButtonChecked else Icons.Default.RadioButtonUnchecked,
                        title = item,
                        onTap = {
                            className = item
                            isDirty = true
                            showClassPicker = false
                        }
                    )
                }
            }
        }
    }

    if (showYearPicker) {
        AppBottomSheet(
            show = true,
            onDismissRequest = { showYearPicker = false }
        ) {
            Text(
                text = "Chọn năm học",
                color = glassColors.textPrimary,
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(16.dp))
            listOf("2025 - 2026", "2024 - 2025").forEach { item ->
                Box(modifier = Modifier.padding(bottom = 10.dp)) {
                    AppListTile(
                        icon = if (item == academicYear) Icons.Default.RadioButtonChecked else Icons.Default.RadioButtonUnchecked,
                        title = item,
                        onTap = {
                            academicYear = item
                            isDirty = true
                            showYearPicker = false
                        }
                    )
                }
            }
        }
    }

    if (showGenderPicker) {
        AppBottomSheet(
            show = true,
            onDismissRequest = { showGenderPicker = false }
        ) {
            Text(
                text = "Chọn giới tính",
                color = glassColors.textPrimary,
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(16.dp))
            Gender.entries.forEach { item ->
                Box(modifier = Modifier.padding(bottom = 10.dp)) {
                    AppListTile(
                        icon = if (item == genderVal) Icons.Default.RadioButtonChecked else Icons.Default.RadioButtonUnchecked,
                        title = item.label,
                        onTap = {
                            genderVal = item
                            isDirty = true
                            showGenderPicker = false
                        }
                    )
                }
            }
        }
    }

    if (showRelationshipPicker) {
        AppBottomSheet(
            show = true,
            onDismissRequest = { showRelationshipPicker = false }
        ) {
            Text(
                text = "Chọn mối quan hệ",
                color = glassColors.textPrimary,
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(16.dp))
            listOf("Mẹ", "Bố", "Người giám hộ").forEach { item ->
                Box(modifier = Modifier.padding(bottom = 10.dp)) {
                    AppListTile(
                        icon = if (item == relationship) Icons.Default.RadioButtonChecked else Icons.Default.RadioButtonUnchecked,
                        title = item,
                        onTap = {
                            relationship = item
                            isDirty = true
                            showRelationshipPicker = false
                        }
                    )
                }
            }
        }
    }
}
