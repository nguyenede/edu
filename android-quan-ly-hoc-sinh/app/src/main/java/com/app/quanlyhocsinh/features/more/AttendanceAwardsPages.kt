package com.app.quanlyhocsinh.features.more

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import com.app.quanlyhocsinh.core.theme.LocalGlassColors
import com.app.quanlyhocsinh.core.utils.AppFormatters
import com.app.quanlyhocsinh.data.models.*
import com.app.quanlyhocsinh.state.LocalAppControllers
import com.app.quanlyhocsinh.shared.components.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AttendanceScreen(
    navController: NavController,
    modifier: Modifier = Modifier
) {
    val app = LocalAppControllers.current
    val glassColors = LocalGlassColors.current
    val controller = app.attendance

    if (controller.isLoading && !controller.isInitialized) {
        LoadingView(label = "Đang tải điểm danh")
        return
    }

    if (controller.hasError && !controller.isInitialized) {
        ErrorStateView(
            message = controller.errorMessage ?: "Có lỗi khi tải dữ liệu",
            onRetry = { controller.load() }
        )
        return
    }

    val summary = controller.summary
    val records = controller.filteredRecords
    val grouped = records.groupBy { AppFormatters.dayMonthYear(it.date) }

    val listState = rememberPersistedLazyListState("attendance")

    IosPageScaffold(
        title = "Điểm danh",
        showBack = true,
        onBackTap = { navController.popBackStack() }
    ) {
        LazyColumn(
            state = listState,
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = 20.dp, end = 20.dp, top = 20.dp, bottom = 40.dp)
        ) {
            // Overview Card
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
                            text = "Tổng quan chuyên cần",
                            color = glassColors.textPrimary,
                            fontSize = 20.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(modifier = Modifier.height(14.dp))
                        // Range Switch
                        GlassTabBar(
                            items = AttendanceRange.entries.map {
                                GlassTabItemData(it, it.label)
                            },
                            groupValue = controller.range,
                            onChanged = { controller.updateRange(it) }
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        // Grid Metrics
                        Row(modifier = Modifier.fillMaxWidth()) {
                            Box(modifier = Modifier.weight(1f)) {
                                AttendanceMetric(
                                    label = "Có mặt",
                                    value = summary.presentCount.toString(),
                                    color = glassColors.success
                                )
                            }
                            Spacer(modifier = Modifier.width(10.dp))
                            Box(modifier = Modifier.weight(1f)) {
                                AttendanceMetric(
                                    label = "Đi muộn",
                                    value = summary.lateCount.toString(),
                                    color = glassColors.warning
                                )
                            }
                        }
                        Spacer(modifier = Modifier.height(10.dp))
                        Row(modifier = Modifier.fillMaxWidth()) {
                            Box(modifier = Modifier.weight(1f)) {
                                AttendanceMetric(
                                    label = "Nghỉ",
                                    value = summary.absentCount.toString(),
                                    color = glassColors.danger
                                )
                            }
                            Spacer(modifier = Modifier.width(10.dp))
                            Box(modifier = Modifier.weight(1f)) {
                                AttendanceMetric(
                                    label = "Tỷ lệ chuyên cần",
                                    value = String.format("%.0f%%", summary.attendanceRate),
                                    color = glassColors.accent
                                )
                            }
                        }
                    }
                }
            }

            item {
                Spacer(modifier = Modifier.height(18.dp))
                AppSectionTitle(
                    title = "Lịch sử điểm danh",
                    subtitle = "Theo nhóm ngày gần nhất"
                )
            }

            if (grouped.isEmpty()) {
                item {
                    AnimatedEmptyState(
                        title = "Chưa có dữ liệu điểm danh",
                        subtitle = "Lịch sử điểm danh sẽ xuất hiện tại đây khi nhà trường cập nhật.",
                        iconBuilder = { c -> EmptyIllustrations.calendar(color = c) }
                    )
                }
            } else {
                grouped.forEach { (dateStr, dateRecords) ->
                    item {
                        Box(modifier = Modifier.padding(bottom = 14.dp)) {
                            AppGlassCard {
                                Column(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalAlignment = Alignment.Start
                                ) {
                                    Text(
                                        text = dateStr,
                                        color = glassColors.textPrimary,
                                        fontSize = 15.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                    Spacer(modifier = Modifier.height(12.dp))
                                    dateRecords.forEach { record ->
                                        val statusColor = when (record.status) {
                                            AttendanceStatus.PRESENT -> glassColors.success
                                            AttendanceStatus.LATE -> glassColors.warning
                                            AttendanceStatus.EXCUSED -> glassColors.accent
                                            AttendanceStatus.UNEXCUSED -> glassColors.danger
                                        }
                                        Row(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .padding(bottom = 10.dp),
                                            verticalAlignment = Alignment.Top
                                        ) {
                                            StatusPill(label = record.status.label, color = statusColor)
                                            Spacer(modifier = Modifier.width(12.dp))
                                            Column(modifier = Modifier.weight(1f)) {
                                                Text(
                                                    text = record.session,
                                                    color = glassColors.textPrimary,
                                                    fontSize = 14.sp,
                                                    fontWeight = FontWeight.SemiBold
                                                )
                                                Spacer(modifier = Modifier.height(4.dp))
                                                Text(
                                                    text = record.note,
                                                    color = glassColors.textSecondary,
                                                    fontSize = 13.sp,
                                                    lineHeight = 18.sp
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
        }
    }
}

@Composable
fun AttendanceMetric(
    label: String,
    value: String,
    color: Color,
    modifier: Modifier = Modifier
) {
    val glassColors = LocalGlassColors.current

    AppGlassCard(
        modifier = modifier.fillMaxWidth(),
        padding = 14.dp,
        borderRadius = RoundedCornerShape(24.dp),
        borderRadiusVal = 24.dp,
        tone = GlassCardTone.ELEVATED
    ) {
        Column(
            modifier = Modifier.fillMaxWidth(),
            horizontalAlignment = Alignment.Start
        ) {
            Text(
                text = label,
                color = glassColors.textSecondary,
                fontSize = 12.sp
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = value,
                color = color,
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold
            )
        }
    }
}

// -------------------------------------------------------------
// AWARDS SCREEN
// -------------------------------------------------------------
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AwardsScreen(
    navController: NavController,
    modifier: Modifier = Modifier
) {
    val app = LocalAppControllers.current
    val glassColors = LocalGlassColors.current
    val controller = app.awards

    if (controller.isLoading && !controller.isInitialized) {
        LoadingView(label = "Đang tải khen thưởng")
        return
    }

    if (controller.hasError && !controller.isInitialized) {
        ErrorStateView(
            message = controller.errorMessage ?: "Có lỗi xảy ra",
            onRetry = { controller.load() }
        )
        return
    }

    val listState = rememberPersistedLazyListState("awards")

    IosPageScaffold(
        title = "Khen thưởng",
        showBack = true,
        onBackTap = { navController.popBackStack() }
    ) {
        LazyColumn(
            state = listState,
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = 20.dp, end = 20.dp, top = 20.dp, bottom = 40.dp)
        ) {
            // Highlights summary card
            item {
                AppGlassCard(
                    borderRadius = RoundedCornerShape(30.dp),
                    borderRadiusVal = 30.dp
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        AppGlassCard(
                            padding = 0.dp,
                            borderRadius = RoundedCornerShape(22.dp),
                            borderRadiusVal = 22.dp,
                            tone = GlassCardTone.ELEVATED,
                            modifier = Modifier.size(54.dp)
                        ) {
                            Box(
                                modifier = Modifier.fillMaxSize(),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = Icons.Default.EmojiEvents,
                                    contentDescription = null,
                                    tint = Color(0xFFD4AF37),
                                    modifier = Modifier.size(28.dp)
                                )
                            }
                        }
                        Spacer(modifier = Modifier.width(16.dp))
                        Column {
                            Text(
                                text = "${controller.awardsList.value.size} Khen thưởng",
                                color = glassColors.textPrimary,
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(
                                text = "Năm học 2025 - 2026",
                                color = glassColors.textSecondary,
                                fontSize = 13.sp
                            )
                        }
                    }
                }
            }

            item {
                Spacer(modifier = Modifier.height(20.dp))
                // Filters Row
                LazyRow(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(AwardCategory.entries, key = { it.name }) { category ->
                        GlassChip(
                            label = category.label,
                            selected = controller.selectedCategory == category,
                            onTap = { controller.updateCategory(category) }
                        )
                    }
                }
                Spacer(modifier = Modifier.height(18.dp))
            }

            val list = controller.awards
            if (list.isEmpty()) {
                item {
                    AnimatedEmptyState(
                        title = "Chưa có mục khen thưởng phù hợp",
                        subtitle = "Hãy chuyển bộ lọc để xem các thành tích ở nhóm khác.",
                        iconBuilder = { c -> EmptyIllustrations.emptyBox(color = c) }
                    )
                }
            } else {
                items(list, key = { it.id }) { item ->
                    Box(modifier = Modifier.padding(bottom = 14.dp)) {
                        AppListTile(
                            icon = Icons.Default.EmojiEvents,
                            title = item.title,
                            subtitle = "${item.category.label} • ${AppFormatters.dayMonthYear(item.date)}",
                            pill = {
                                StatusPill(
                                    label = item.category.label,
                                    color = glassColors.accent
                                )
                            },
                            onTap = {
                                navController.navigate("award_detail/${item.id}")
                            }
                        )
                    }
                }
            }
        }
    }
}

// -------------------------------------------------------------
// AWARD DETAIL SCREEN
// -------------------------------------------------------------
@Composable
fun AwardDetailScreen(
    awardId: String,
    navController: NavController,
    modifier: Modifier = Modifier
) {
    val app = LocalAppControllers.current
    val glassColors = LocalGlassColors.current

    val award = app.awards.awardsList.value.firstOrNull { it.id == awardId }

    if (award == null) {
        IosPageScaffold(
            title = "Chi tiết khen thưởng",
            showBack = true,
            onBackTap = { navController.popBackStack() }
        ) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                Text(text = "Không tìm thấy khen thưởng")
            }
        }
        return
    }

    IosPageScaffold(
        title = "Chi tiết khen thưởng",
        showBack = true,
        onBackTap = { navController.popBackStack() }
    ) {
        LazyColumn(
            modifier = modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = 20.dp, end = 20.dp, top = 20.dp, bottom = 40.dp)
        ) {
            item {
                AppGlassCard(
                    modifier = Modifier.fillMaxWidth(),
                    padding = 16.dp,
                    borderRadius = RoundedCornerShape(24.dp),
                    borderRadiusVal = 24.dp,
                    tone = GlassCardTone.ELEVATED
                ) {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalAlignment = Alignment.Start
                    ) {
                        StatusPill(label = award.category.label, color = glassColors.accent)
                        Spacer(modifier = Modifier.height(14.dp))
                        Text(
                            text = award.title,
                            color = glassColors.textPrimary,
                            fontSize = 20.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(modifier = Modifier.height(10.dp))
                        Text(
                            text = "Ngày ghi nhận: ${AppFormatters.dayMonthYear(award.date)}",
                            color = glassColors.textSecondary,
                            fontSize = 13.sp
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = "Đơn vị ghi nhận: ${award.issuer}",
                            color = glassColors.textSecondary,
                            fontSize = 13.sp
                        )
                        Spacer(modifier = Modifier.height(18.dp))
                        Text(
                            text = award.description,
                            color = glassColors.textPrimary,
                            fontSize = 15.sp,
                            lineHeight = 22.sp
                        )
                    }
                }
            }
        }
    }
}
