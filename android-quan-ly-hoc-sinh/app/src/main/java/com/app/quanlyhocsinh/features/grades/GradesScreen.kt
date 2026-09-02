package com.app.quanlyhocsinh.features.grades

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material.icons.filled.InsertDriveFile
import androidx.compose.material.icons.filled.MilitaryTech
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.Divider
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.blur
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import com.app.quanlyhocsinh.R
import com.app.quanlyhocsinh.core.theme.AppRadius
import com.app.quanlyhocsinh.core.theme.LocalGlassColors
import com.app.quanlyhocsinh.core.utils.AppFormatters
import com.app.quanlyhocsinh.data.models.GradeEntry
import com.app.quanlyhocsinh.data.models.GradeUpdate
import com.app.quanlyhocsinh.data.models.SubjectGrade
import com.app.quanlyhocsinh.data.models.SubjectPerformance
import com.app.quanlyhocsinh.state.LocalAppControllers
import com.app.quanlyhocsinh.shared.components.*
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GradesScreen(
    navController: NavController,
    modifier: Modifier = Modifier,
    showBack: Boolean = false,
    onBackTap: () -> Unit = {}
) {
    val app = LocalAppControllers.current
    val glassColors = LocalGlassColors.current

    val controller = app.grades
    val studentBundle = app.profile.bundle
    val attendanceSummary = app.attendance.summary


    var classDropdownExpanded by remember { mutableStateOf(false) }
    var termDropdownExpanded by remember { mutableStateOf(false) }

    if (controller.isLoading && !controller.isInitialized) {
        GradesSkeleton()
        return
    }

    if (controller.hasError && !controller.isInitialized) {
        ErrorStateView(
            message = controller.errorMessage ?: "Có lỗi xảy ra",
            onRetry = { controller.load() }
        )
        return
    }

    val student = studentBundle?.student
    val studentName = student?.name ?: "Nguyễn Minh Khôi"
    val studentClass = student?.className ?: "8A2"
    val academicYear = student?.academicYear ?: "2025 - 2026"

    val listState = rememberPersistedLazyListState("grades")

    IosPageScaffold(
        title = "Điểm",
        showBack = showBack,
        onBackTap = onBackTap
    ) {
        LazyColumn(
                state = listState,
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(start = 8.dp, end = 8.dp, top = 20.dp, bottom = 90.dp)
            ) {
            // 1. Blurred Image Student Banner
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(72.dp)
                        .clip(RoundedCornerShape(12.dp))
                ) {
                    Image(
                        painter = painterResource(id = R.drawable.viet_nam),
                        contentDescription = null,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier
                            .fillMaxSize()
                            .graphicsLayer {
                                scaleX = 1.3f
                                scaleY = 1.3f
                            }
                    )
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(Color.Black.copy(alpha = 0.35f))
                    )
                    Row(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(horizontal = 14.dp, vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(44.dp)
                                .clip(CircleShape)
                                .background(Color.White.copy(alpha = 0.24f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = if (studentName.isNotEmpty()) studentName.split(" ").last()[0].toString() else "K",
                                color = Color.White,
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                        Spacer(modifier = Modifier.width(12.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "Học sinh lớp $studentClass ($academicYear)",
                                color = Color.White.copy(alpha = 0.7f),
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Medium
                            )
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(
                                text = studentName,
                                color = Color.White,
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }

            // 2. Term Dropdowns
            item {
                Spacer(modifier = Modifier.height(10.dp))
                Row(modifier = Modifier.fillMaxWidth()) {
                    // Class dropdown
                    Box(modifier = Modifier.weight(1f)) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(Color.White, RoundedCornerShape(8.dp))
                                .clickable { classDropdownExpanded = true }
                                .padding(horizontal = 10.dp, vertical = 6.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "$studentClass ($academicYear)",
                                color = Color.Black.copy(alpha = 0.87f),
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Medium,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                                modifier = Modifier.weight(1f)
                            )
                            Icon(
                                imageVector = Icons.Default.ArrowDropDown,
                                contentDescription = null,
                                tint = Color.Black.copy(alpha = 0.54f)
                            )
                        }
                        DropdownMenu(
                            expanded = classDropdownExpanded,
                            onDismissRequest = { classDropdownExpanded = false }
                        ) {
                            DropdownMenuItem(
                                text = {
                                    Text(
                                        text = "$studentClass ($academicYear)",
                                        fontSize = 12.5.sp,
                                        fontWeight = FontWeight.Medium
                                    )
                                },
                                onClick = { classDropdownExpanded = false }
                            )
                        }
                    }

                    Spacer(modifier = Modifier.width(8.dp))

                    // Term dropdown
                    Box(modifier = Modifier.weight(1f)) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(Color.White, RoundedCornerShape(8.dp))
                                .clickable { termDropdownExpanded = true }
                                .padding(horizontal = 10.dp, vertical = 6.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "Cuối kỳ 2",
                                color = Color.Black.copy(alpha = 0.87f),
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Medium,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                                modifier = Modifier.weight(1f)
                            )
                            Icon(
                                imageVector = Icons.Default.ArrowDropDown,
                                contentDescription = null,
                                tint = Color.Gray,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                        DropdownMenu(
                            expanded = termDropdownExpanded,
                            onDismissRequest = { termDropdownExpanded = false }
                        ) {
                            listOf("Cuối kỳ 2", "Giữa kỳ 2", "Cuối kỳ 1", "Giữa kỳ 1").forEach { term ->
                                DropdownMenuItem(
                                    text = {
                                        Text(
                                            text = term,
                                            fontSize = 12.5.sp,
                                            fontWeight = FontWeight.Medium
                                        )
                                    },
                                    onClick = { termDropdownExpanded = false }
                                )
                            }
                        }
                    }
                }
            }

            // 4. CHUYÊN CẦN Section
            item {
                Spacer(modifier = Modifier.height(14.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.CalendarMonth,
                        contentDescription = null,
                        tint = Color(0xFF37474F),
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "CHUYÊN CẦN",
                        color = Color(0xFF37474F),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.ExtraBold,
                        letterSpacing = 0.5.sp
                    )
                }
                Spacer(modifier = Modifier.height(10.dp))
                Row(modifier = Modifier.fillMaxWidth()) {
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(12.dp))
                            .background(Color(0xFFE8F5E9))
                            .padding(12.dp)
                    ) {
                        Column {
                            Text(
                                text = "Nghỉ có phép",
                                color = Color(0xFF2E7D32),
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Medium
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = "${attendanceSummary.lateCount} buổi",
                                color = Color(0xFF2E7D32),
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                    Spacer(modifier = Modifier.width(10.dp))
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(12.dp))
                            .background(Color(0xFFF3E5F5))
                            .padding(12.dp)
                    ) {
                        Column {
                            Text(
                                text = "Nghỉ không phép",
                                color = Color(0xFF6A1B9A),
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Medium
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = "${attendanceSummary.absentCount} buổi",
                                color = Color(0xFF6A1B9A),
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }

            // 5. KHEN THƯỞNG VÀ DANH HIỆU Section
            item {
                Spacer(modifier = Modifier.height(20.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.Star,
                        contentDescription = null,
                        tint = Color(0xFF37474F),
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "KHEN THƯỞNG VÀ DANH HIỆU",
                        color = Color(0xFF37474F),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.ExtraBold,
                        letterSpacing = 0.5.sp
                    )
                }
                Spacer(modifier = Modifier.height(10.dp))
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color(0xFFF7F2EA), RoundedCornerShape(12.dp))
                        .padding(16.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.Top
                    ) {
                        Icon(
                            imageVector = Icons.Default.EmojiEvents,
                            contentDescription = null,
                            tint = Color(0xFFD4AF37),
                            modifier = Modifier.size(28.dp)
                        )
                        Spacer(modifier = Modifier.width(14.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "Danh hiệu:",
                                color = Color(0xFF795548),
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(
                                text = if (app.awards.awardsList.value.isNotEmpty())
                                    app.awards.awardsList.value.first().title
                                else
                                    "Đạt danh hiệu Học sinh Tiêu biểu hoàn thành tốt trong học tập và rèn luyện",
                                color = Color.Black.copy(alpha = 0.87f),
                                fontSize = 13.5.sp,
                                lineHeight = 18.sp
                            )
                        }
                    }
                    Spacer(modifier = Modifier.height(20.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.Top
                    ) {
                        Icon(
                            imageVector = Icons.Default.MilitaryTech,
                            contentDescription = null,
                            tint = Color(0xFFD4AF37),
                            modifier = Modifier.size(28.dp)
                        )
                        Spacer(modifier = Modifier.width(14.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "Khen thưởng khác:",
                                color = Color(0xFF795548),
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(
                                text = if (app.awards.awardsList.value.size > 1)
                                    app.awards.awardsList.value[1].title
                                else
                                    "Không có",
                                color = Color.Black.copy(alpha = 0.87f),
                                fontSize = 13.5.sp
                            )
                        }
                    }
                }
            }

            // 6. BẢNG ĐIỂM Table Section
            // 6. BẢNG ĐIỂM Table Section - Header
            item {
                Spacer(modifier = Modifier.height(22.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.InsertDriveFile,
                        contentDescription = null,
                        tint = Color(0xFF37474F),
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "BẢNG ĐIỂM",
                        color = Color(0xFF37474F),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.ExtraBold,
                        letterSpacing = 0.5.sp
                    )
                }
                Spacer(modifier = Modifier.height(10.dp))
                Text(
                    text = "ĐÁNH GIÁ BẰNG NHẬN XÉT KẾT HỢP ĐIỂM SỐ",
                    color = Color(0xFF263238),
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(10.dp))

                // Table Header Row
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(topStart = 4.dp, topEnd = 4.dp))
                        .background(Color(0xFFF7ECE1))
                ) {
                    TableCell("Môn học", weight = 1.2f, isHeader = true)
                    TableCell("ĐGTX", weight = 1.2f, isHeader = true)
                    TableCell("GK", weight = 0.6f, isHeader = true)
                    TableCell("CK", weight = 0.6f, isHeader = true)
                    TableCell("TBM", weight = 0.6f, isHeader = true)
                    TableCell("Nhận xét", weight = 1.8f, isHeader = true)
                }
            }

            items(controller.filteredSubjects, key = { it.id }) { subject ->
                val dgtxScores = when (subject.id) {
                    "math" -> "7  5  7  7"
                    "literature" -> "6  5  6  6"
                    "english" -> "7  6  7.9  6"
                    "physics" -> "7  7  6  9"
                    "informatics" -> "5  5"
                    "biology" -> "8  7"
                    else -> "9  8  9"
                }
                val gkVal = when (subject.id) {
                    "math" -> 5.3
                    "literature" -> 5.0
                    "english" -> 6.5
                    "physics" -> 2.0 // red
                    "informatics" -> 5.5
                    "biology" -> 6.0
                    else -> 8.5
                }
                val ckVal = when (subject.id) {
                    "math" -> 5.0
                    "literature" -> 5.5
                    "english" -> 6.6
                    "physics" -> 6.8
                    "informatics" -> 7.0
                    "biology" -> 7.0
                    else -> 8.0
                }
                val tbmVal = when (subject.id) {
                    "math" -> 5.7
                    "literature" -> 5.6
                    "english" -> 6.6
                    "physics" -> 5.9
                    "informatics" -> 6.0
                    "biology" -> 6.9
                    else -> subject.average
                }

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color.White)
                        .clickable {
                            navController.navigate("subject_detail/${subject.id}")
                        }
                ) {
                    TableCell(subject.name, weight = 1.2f, alignLeft = true)
                    TableCell(dgtxScores, weight = 1.2f)
                    TableCell(
                        text = String.format(java.util.Locale.US, if (gkVal == gkVal.toInt().toDouble()) "%.0f" else "%.1f", gkVal),
                        weight = 0.6f,
                        textColor = if (gkVal < 5.0) Color.Red else Color(0xFF1E88E5),
                        isBold = true
                    )
                    TableCell(
                        text = String.format(java.util.Locale.US, if (ckVal == ckVal.toInt().toDouble()) "%.0f" else "%.1f", ckVal),
                        weight = 0.6f,
                        textColor = if (ckVal < 5.0) Color.Red else Color(0xFF1E88E5),
                        isBold = true
                    )
                    TableCell(
                        text = String.format(java.util.Locale.US, if (tbmVal == tbmVal.toInt().toDouble()) "%.0f" else "%.1f", tbmVal),
                        weight = 0.6f,
                        textColor = if (tbmVal < 5.0) Color.Red else Color(0xFF1E88E5),
                        isBold = true
                    )
                    TableCell(subject.comment, weight = 1.8f, alignLeft = true, smallFont = true)
                }
            }

            item {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "Lưu ý: Điểm MT hoặc ĐMT là viết tắt của Điểm mục tiêu",
                    color = Color.Red,
                    fontSize = 12.sp,
                    fontStyle = FontStyle.Italic
                )
            }

            // 7. ĐÁNH GIÁ NĂNG LỰC - PHẨM CHẤT Section
            item {
                Spacer(modifier = Modifier.height(22.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.Star, // fallback icon
                        contentDescription = null,
                        tint = Color(0xFF37474F),
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "ĐÁNH GIÁ NĂNG LỰC - PHẨM CHẤT",
                        color = Color(0xFF37474F),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.ExtraBold,
                        letterSpacing = 0.5.sp
                    )
                }
                Spacer(modifier = Modifier.height(10.dp))
                Text(
                    text = "NĂNG LỰC",
                    color = Color(0xFF37474F),
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(6.dp))

                // Table Năng lực chung Header
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color(0xFFF7ECE1))
                ) {
                    TableCell("Năng lực chung", weight = 2.0f, isHeader = true)
                    TableCell("Nhận xét", weight = 2.5f, isHeader = true)
                    TableCell("Mức đạt", weight = 1.0f, isHeader = true)
                }
            }

            // Năng lực chung Rows
            item {
                Row(modifier = Modifier.fillMaxWidth().background(Color.White)) {
                    TableCell("Tự chủ và tự học", weight = 2.0f, alignLeft = true)
                    TableCell("", weight = 2.5f)
                    TableCell("T", weight = 1.0f)
                }
            }
            item {
                Row(modifier = Modifier.fillMaxWidth().background(Color.White)) {
                    TableCell("Giao tiếp và hợp tác", weight = 2.0f, alignLeft = true)
                    TableCell("", weight = 2.5f)
                    TableCell("T", weight = 1.0f)
                }
            }
            item {
                Row(modifier = Modifier.fillMaxWidth().background(Color.White)) {
                    TableCell("GQVD và sáng tạo", weight = 2.0f, alignLeft = true)
                    TableCell("", weight = 2.5f)
                    TableCell("T", weight = 1.0f)
                }
            }

            // Table Năng lực đặc thù Header
            item {
                Spacer(modifier = Modifier.height(12.dp))
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color(0xFFF7ECE1))
                ) {
                    TableCell("Năng lực đặc thù", weight = 2.0f, isHeader = true)
                    TableCell("Nhận xét", weight = 2.5f, isHeader = true)
                    TableCell("Mức đạt", weight = 1.0f, isHeader = true)
                }
            }

            // Năng lực đặc thù Rows
            items(listOf("Ngôn ngữ", "Tính toán", "Khoa học", "Công nghệ", "Tin học", "Thẩm mĩ", "Thể chất")) { special ->
                Row(modifier = Modifier.fillMaxWidth().background(Color.White)) {
                    TableCell(special, weight = 2.0f, alignLeft = true)
                    TableCell("", weight = 2.5f)
                    TableCell("T", weight = 1.0f)
                }
            }

            // Table Phẩm chất Header
            item {
                Spacer(modifier = Modifier.height(20.dp))
                Text(
                    text = "PHẨM CHẤT",
                    color = Color(0xFF37474F),
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(6.dp))
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color(0xFFF7ECE1))
                ) {
                    TableCell("Phẩm chất", weight = 2.0f, isHeader = true)
                    TableCell("Nhận xét", weight = 2.5f, isHeader = true)
                    TableCell("Mức đạt", weight = 1.0f, isHeader = true)
                }
            }

            // Phẩm chất Rows
            items(listOf("Yêu nước", "Nhân ái", "Chăm chỉ", "Trung thực", "Trách nhiệm")) { quality ->
                Row(modifier = Modifier.fillMaxWidth().background(Color.White)) {
                    TableCell(quality, weight = 2.0f, alignLeft = true)
                    TableCell("", weight = 2.5f)
                    TableCell("T", weight = 1.0f)
                }
            }

            // 8. XÉT HOÀN THÀNH CHƯƠNG TRÌNH LỚP HỌC Section
            item {
                Spacer(modifier = Modifier.height(22.dp))
                Row(
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(30.dp)
                            .clip(CircleShape)
                            .background(Color(0xFF1976D2)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Star,
                            contentDescription = null,
                            tint = Color.White,
                            modifier = Modifier.size(16.dp)
                        )
                    }
                    Spacer(modifier = Modifier.width(10.dp))
                    Text(
                        text = "XÉT HOÀN THÀNH CHƯƠNG TRÌNH LỚP HỌC",
                        color = Color(0xFF1976D2),
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
                Spacer(modifier = Modifier.height(14.dp))
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color(0xFFF5F5F5), RoundedCornerShape(8.dp))
                        .padding(16.dp)
                ) {
                    Text(
                        text = "Hoàn thành chương trình tiểu học.",
                        color = Color.Black.copy(alpha = 0.87f),
                        fontSize = 13.5.sp,
                        fontWeight = FontWeight.Medium
                    )
                }
            }
        }
    }
}

@Composable
fun RowScope.TableCell(
    text: String,
    weight: Float,
    isHeader: Boolean = false,
    alignLeft: Boolean = false,
    smallFont: Boolean = false,
    textColor: Color? = null,
    isBold: Boolean = false
) {
    val glassColors = LocalGlassColors.current

    Box(
        modifier = Modifier
            .weight(weight)
            .padding(horizontal = 4.dp, vertical = 8.dp),
        contentAlignment = if (alignLeft) Alignment.CenterStart else Alignment.Center
    ) {
        Text(
            text = text,
            textAlign = if (alignLeft) TextAlign.Left else TextAlign.Center,
            color = textColor ?: if (isHeader) Color(0xFF5D4037) else Color.Black.copy(alpha = 0.87f),
            fontSize = if (isHeader) 12.5.sp else (if (smallFont) 11.5.sp else 13.sp),
            fontWeight = if (isHeader || isBold) FontWeight.Bold else FontWeight.Normal
        )
    }
}

// -------------------------------------------------------------
// SUBJECT DETAIL PAGE
// -------------------------------------------------------------
@Composable
fun SubjectDetailScreen(
    subjectId: String,
    navController: NavController,
    modifier: Modifier = Modifier
) {
    val app = LocalAppControllers.current
    val glassColors = LocalGlassColors.current

    val gradesController = app.grades
    val subject = gradesController.subjects.value.firstOrNull { it.id == subjectId }

    if (subject == null) {
        IosPageScaffold(
            title = "Chi tiết môn học",
            showBack = true,
            onBackTap = { navController.popBackStack() }
        ) {
            AnimatedEmptyState(
                title = "Không tìm thấy môn học",
                subtitle = "Môn học có thể đã được cập nhật.",
                iconBuilder = { c -> EmptyIllustrations.magnifying(color = c) }
            )
        }
        return
    }

    val statusColor = when (subject.performance) {
        SubjectPerformance.STRONG -> glassColors.success
        SubjectPerformance.STABLE -> glassColors.warning
        SubjectPerformance.IMPROVING -> glassColors.danger
    }

    IosPageScaffold(
        title = subject.name,
        showBack = true,
        onBackTap = { navController.popBackStack() }
    ) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = 8.dp, end = 8.dp, top = 20.dp, bottom = 40.dp)
        ) {
            item {
                AppGlassCard(
                    borderRadius = RoundedCornerShape(30.dp),
                    borderRadiusVal = 30.dp
                ) {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalAlignment = Alignment.Start
                    ) {
                        Text(
                            text = subject.teacher,
                            color = glassColors.textSecondary,
                            fontSize = 14.sp
                        )
                        Spacer(modifier = Modifier.height(10.dp))
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = String.format("%.1f", subject.average).replace(',', '.'),
                                color = glassColors.textPrimary,
                                fontSize = 28.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Spacer(modifier = Modifier.width(10.dp))
                            StatusPill(label = subject.performance.label, color = statusColor)
                        }
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            text = subject.comment,
                            color = glassColors.textSecondary,
                            fontSize = 14.sp,
                            lineHeight = 20.sp
                        )
                    }
                }
            }

            item {
                Spacer(modifier = Modifier.height(18.dp))
                AppSectionTitle(title = "Toàn bộ đầu điểm")
            }

            items(subject.entries, key = { it.id }) { entry ->
                Box(modifier = Modifier.padding(bottom = 12.dp)) {
                    AppGlassCard {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            AppGlassCard(
                                padding = 0.dp,
                                borderRadius = RoundedCornerShape(16.dp),
                                borderRadiusVal = 16.dp,
                                tone = GlassCardTone.MUTED,
                                modifier = Modifier.size(48.dp)
                            ) {
                                Box(
                                    modifier = Modifier.fillMaxSize(),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(
                                        text = String.format("%.1f", entry.score).replace(',', '.'),
                                        color = statusColor,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            }
                            Spacer(modifier = Modifier.width(12.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = entry.title,
                                    color = glassColors.textPrimary,
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.SemiBold
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = "${entry.type.label} • Trọng số ${String.format("%.0f", entry.weight)}",
                                    color = glassColors.textSecondary,
                                    fontSize = 13.sp
                                )
                            }
                            Spacer(modifier = Modifier.width(12.dp))
                            Text(
                                text = AppFormatters.dayMonthYear(entry.date),
                                color = glassColors.textSecondary,
                                fontSize = 12.sp
                            )
                        }
                    }
                }
            }

            item {
                Spacer(modifier = Modifier.height(8.dp))
                AppSectionTitle(
                    title = "Lịch sử cập nhật",
                    subtitle = "Theo dõi các lần thay đổi điểm gần đây"
                )
            }

            items(subject.updates, key = { "${it.time.time}_${it.description}" }) { update ->
                Box(modifier = Modifier.padding(bottom = 12.dp)) {
                    AppGlassCard {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.Top
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(10.dp)
                                    .padding(top = 6.dp)
                                    .clip(CircleShape)
                                    .background(statusColor)
                            )
                            Spacer(modifier = Modifier.width(12.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = update.description,
                                    color = glassColors.textPrimary,
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.SemiBold
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = "${AppFormatters.dayMonthYear(update.time)} • ${AppFormatters.timeOfDay(update.time)}",
                                    color = glassColors.textSecondary,
                                    fontSize = 12.sp
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
