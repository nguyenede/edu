package com.app.quanlyhocsinh.features.schedule

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.app.quanlyhocsinh.core.theme.LocalGlassColors
import com.app.quanlyhocsinh.core.utils.AppFormatters
import com.app.quanlyhocsinh.data.models.ClassScheduleItem
import com.app.quanlyhocsinh.data.models.ExamScheduleItem
import com.app.quanlyhocsinh.data.models.ScheduleSegment
import com.app.quanlyhocsinh.state.LocalAppControllers
import com.app.quanlyhocsinh.shared.components.*
import kotlinx.coroutines.launch
import java.util.Calendar

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ScheduleScreen(
    modifier: Modifier = Modifier,
    showBack: Boolean = false,
    onBackTap: () -> Unit = {}
) {
    val app = LocalAppControllers.current
    val glassColors = LocalGlassColors.current
    val controller = app.schedule
    val context = LocalContext.current


    // Bottom sheet states
    var selectedClassItem by remember { mutableStateOf<ClassScheduleItem?>(null) }
    var selectedExamItem by remember { mutableStateOf<ExamScheduleItem?>(null) }

    if (controller.isLoading && !controller.isInitialized) {
        ScheduleSkeleton()
        return
    }

    if (controller.hasError && !controller.isInitialized) {
        ErrorStateView(
            message = controller.errorMessage ?: "Không thể tải lịch học.",
            onRetry = { controller.load() }
        )
        return
    }

    val listState = rememberPersistedLazyListState("schedule")

    IosPageScaffold(
        title = "Lịch học / Thi",
        showBack = showBack,
        onBackTap = onBackTap
    ) {
        LazyColumn(
                state = listState,
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(start = 8.dp, end = 8.dp, top = 20.dp, bottom = 90.dp)
            ) {
            // Segment Bar
            item {
                GlassTabBar(
                    items = listOf(
                        GlassTabItemData(ScheduleSegment.CLASSES, ScheduleSegment.CLASSES.label),
                        GlassTabItemData(ScheduleSegment.EXAMS, ScheduleSegment.EXAMS.label)
                    ),
                    groupValue = controller.segment,
                    onChanged = { controller.updateSegment(it) }
                )
                Spacer(modifier = Modifier.height(18.dp))
            }

            // 1. CLASSES SEGMENT
            if (controller.segment == ScheduleSegment.CLASSES) {
                item {
                    AppSectionTitle(
                        title = "Tuần học",
                        subtitle = "Chọn ngày để xem thời khóa biểu chi tiết"
                    )
                    // Horizontal dates scroll
                    LazyRow(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(92.dp),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        items(controller.weekDates, key = { it.time }) { date ->
                            val calSelected = Calendar.getInstance().apply { time = controller.selectedDate }
                            val calDate = Calendar.getInstance().apply { time = date }
                            val selected = calSelected.get(Calendar.DAY_OF_YEAR) == calDate.get(Calendar.DAY_OF_YEAR) &&
                                    calSelected.get(Calendar.YEAR) == calDate.get(Calendar.YEAR)
                            val isToday = calDate.get(Calendar.DAY_OF_MONTH) == 27 &&
                                    calDate.get(Calendar.MONTH) == Calendar.MARCH

                            val tone = if (selected) GlassCardTone.ACCENT else GlassCardTone.MUTED

                            Box(
                                modifier = Modifier
                                    .width(72.dp)
                                    .fillMaxHeight()
                            ) {
                                AppGlassCard(
                                    padding = 14.dp,
                                    borderRadius = RoundedCornerShape(24.dp),
                                    borderRadiusVal = 24.dp,
                                    tone = tone,
                                    onTap = {
                                        controller.selectDate(date)
                                    }
                                ) {
                                    Column(
                                        modifier = Modifier.fillMaxSize(),
                                        horizontalAlignment = Alignment.CenterHorizontally,
                                        verticalArrangement = Arrangement.Center
                                    ) {
                                        Text(
                                            text = AppFormatters.weekdayShort(date),
                                            color = if (selected) glassColors.accent else glassColors.textSecondary,
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.SemiBold
                                        )
                                        Spacer(modifier = Modifier.height(8.dp))
                                        Text(
                                            text = calDate.get(Calendar.DAY_OF_MONTH).toString(),
                                            color = glassColors.textPrimary,
                                            fontSize = 20.sp,
                                            fontWeight = FontWeight.Bold
                                        )
                                        if (isToday) {
                                            Spacer(modifier = Modifier.height(4.dp))
                                            Box(
                                                modifier = Modifier
                                                    .size(8.dp)
                                                    .clip(CircleShape)
                                                    .background(glassColors.accent)
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                    Spacer(modifier = Modifier.height(18.dp))
                    AppSectionTitle(title = "Lịch ngày ${AppFormatters.dayMonth(controller.selectedDate)}")
                }

                val classes = controller.classesForSelectedDate
                if (classes.isEmpty()) {
                    item {
                        AnimatedEmptyState(
                            title = "Không có lịch học",
                            subtitle = "Ngày này hiện chưa có tiết học nào được xếp trong hệ thống.",
                            iconBuilder = { c -> EmptyIllustrations.calendar(color = c) }
                        )
                    }
                } else {
                    items(classes, key = { it.id }) { item ->
                        Box(modifier = Modifier.padding(bottom = 12.dp)) {
                            AppGlassCard(
                                onTap = { selectedClassItem = item }
                            ) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    // Period label box
                                    Box(modifier = Modifier.width(70.dp)) {
                                        AppGlassCard(
                                            padding = 0.dp,
                                            borderRadius = RoundedCornerShape(20.dp),
                                            borderRadiusVal = 20.dp,
                                            tone = GlassCardTone.ACCENT,
                                            modifier = Modifier.fillMaxWidth()
                                        ) {
                                            Column(
                                                modifier = Modifier
                                                    .fillMaxWidth()
                                                    .padding(vertical = 10.dp, horizontal = 8.dp),
                                                horizontalAlignment = Alignment.CenterHorizontally
                                            ) {
                                                Text(
                                                    text = item.periodLabel,
                                                    color = glassColors.accent,
                                                    fontSize = 12.sp,
                                                    fontWeight = FontWeight.Bold
                                                )
                                                Spacer(modifier = Modifier.height(4.dp))
                                                Text(
                                                    text = AppFormatters.timeOfDay(item.start),
                                                    color = glassColors.textPrimary,
                                                    fontSize = 13.sp,
                                                    fontWeight = FontWeight.SemiBold
                                                )
                                            }
                                        }
                                    }
                                    Spacer(modifier = Modifier.width(12.dp))
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            text = item.subject,
                                            color = glassColors.textPrimary,
                                            fontSize = 15.sp,
                                            fontWeight = FontWeight.Bold
                                        )
                                        Spacer(modifier = Modifier.height(4.dp))
                                        Text(
                                            text = "${item.room} • ${item.teacher}",
                                            color = glassColors.textSecondary,
                                            fontSize = 13.sp
                                        )
                                        Spacer(modifier = Modifier.height(6.dp))
                                        Text(
                                            text = item.note,
                                            color = glassColors.textSecondary,
                                            fontSize = 13.sp,
                                            lineHeight = 18.sp,
                                            maxLines = 2,
                                            overflow = TextOverflow.Ellipsis
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // 2. EXAMS SEGMENT
            if (controller.segment == ScheduleSegment.EXAMS) {
                val nextExam = controller.nextExam
                if (nextExam != null) {
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
                                    text = "Kỳ thi gần nhất",
                                    color = glassColors.textSecondary,
                                    fontSize = 14.sp
                                )
                                Spacer(modifier = Modifier.height(10.dp))
                                Text(
                                    text = nextExam.subject,
                                    color = glassColors.textPrimary,
                                    fontSize = 24.sp,
                                    fontWeight = FontWeight.Bold
                                )
                                Spacer(modifier = Modifier.height(6.dp))
                                Text(
                                    text = "${AppFormatters.dayMonthYear(nextExam.date)} • ${AppFormatters.timeOfDay(nextExam.start)}",
                                    color = glassColors.textSecondary,
                                    fontSize = 13.sp
                                )
                                Spacer(modifier = Modifier.height(10.dp))
                                StatusPill(
                                    label = AppFormatters.countdownTo(nextExam.start),
                                    color = glassColors.accent
                                )
                            }
                        }
                        Spacer(modifier = Modifier.height(18.dp))
                    }
                }

                item {
                    AppSectionTitle(title = "Lịch thi sắp tới")
                }

                val exams = controller.upcomingExams
                if (exams.isEmpty()) {
                    item {
                        AnimatedEmptyState(
                            title = "Chưa có lịch thi",
                            subtitle = "Lịch thi sẽ xuất hiện tại đây khi nhà trường cập nhật.",
                            iconBuilder = { c -> EmptyIllustrations.calendar(color = c) }
                        )
                    }
                } else {
                    items(exams, key = { it.id }) { item ->
                        Box(modifier = Modifier.padding(bottom = 12.dp)) {
                            AppGlassCard(
                                onTap = { selectedExamItem = item }
                            ) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Box(modifier = Modifier.width(72.dp)) {
                                        AppGlassCard(
                                            padding = 0.dp,
                                            borderRadius = RoundedCornerShape(22.dp),
                                            borderRadiusVal = 22.dp,
                                            tone = GlassCardTone.MUTED,
                                            modifier = Modifier.fillMaxWidth()
                                        ) {
                                            Column(
                                                modifier = Modifier
                                                    .fillMaxWidth()
                                                    .padding(vertical = 12.dp, horizontal = 10.dp),
                                                horizontalAlignment = Alignment.CenterHorizontally
                                            ) {
                                                Text(
                                                    text = AppFormatters.dayMonth(item.date),
                                                    color = glassColors.warning,
                                                    fontSize = 12.sp,
                                                    fontWeight = FontWeight.Bold
                                                )
                                                Spacer(modifier = Modifier.height(4.dp))
                                                Text(
                                                    text = AppFormatters.timeOfDay(item.start),
                                                    color = glassColors.textPrimary,
                                                    fontSize = 13.sp,
                                                    fontWeight = FontWeight.SemiBold
                                                )
                                            }
                                        }
                                    }
                                    Spacer(modifier = Modifier.width(12.dp))
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            text = item.subject,
                                            color = glassColors.textPrimary,
                                            fontSize = 15.sp,
                                            fontWeight = FontWeight.Bold
                                        )
                                        Spacer(modifier = Modifier.height(4.dp))
                                        Text(
                                            text = "${item.room} • ${item.method}",
                                            color = glassColors.textSecondary,
                                            fontSize = 13.sp
                                        )
                                        Spacer(modifier = Modifier.height(6.dp))
                                        Text(
                                            text = item.note,
                                            color = glassColors.textSecondary,
                                            fontSize = 13.sp,
                                            lineHeight = 18.sp,
                                            maxLines = 2,
                                            overflow = TextOverflow.Ellipsis
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
    }
    }

    // -------------------------------------------------------------
    // BOTTOM SHEETS DETAIL
    // -------------------------------------------------------------
    selectedClassItem?.let { item ->
        AppBottomSheet(
            show = true,
            onDismissRequest = { selectedClassItem = null }
        ) {
            Text(
                text = item.subject,
                color = glassColors.textPrimary,
                fontSize = 22.sp,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(10.dp))
            Text(
                text = "${item.periodLabel} • ${AppFormatters.timeOfDay(item.start)} - ${AppFormatters.timeOfDay(item.end)}",
                color = glassColors.textSecondary,
                fontSize = 13.sp
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "Phòng: ${item.room}",
                color = glassColors.textPrimary,
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = "Giáo viên: ${item.teacher}",
                color = glassColors.textPrimary,
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold
            )
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = item.note,
                color = glassColors.textSecondary,
                fontSize = 14.sp,
                lineHeight = 20.sp
            )
        }
    }

    selectedExamItem?.let { item ->
        AppBottomSheet(
            show = true,
            onDismissRequest = { selectedExamItem = null }
        ) {
            Text(
                text = item.subject,
                color = glassColors.textPrimary,
                fontSize = 22.sp,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(10.dp))
            Text(
                text = "${AppFormatters.dayMonthYear(item.date)} • ${AppFormatters.timeOfDay(item.start)}",
                color = glassColors.textSecondary,
                fontSize = 13.sp
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "Phòng thi: ${item.room}",
                color = glassColors.textPrimary,
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = "Hình thức: ${item.method}",
                color = glassColors.textPrimary,
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold
            )
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = item.note,
                color = glassColors.textSecondary,
                fontSize = 14.sp,
                lineHeight = 20.sp
            )
        }
    }
}
