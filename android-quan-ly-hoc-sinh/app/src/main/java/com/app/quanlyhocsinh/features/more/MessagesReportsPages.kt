package com.app.quanlyhocsinh.features.more

import android.app.DatePickerDialog
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ChatBubble
import androidx.compose.material.icons.filled.ChatBubbleOutline
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material.icons.filled.AttachFile
import androidx.compose.material.icons.filled.Tag
import androidx.compose.material3.Divider
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
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
import androidx.navigation.NavController
import com.app.quanlyhocsinh.core.theme.LocalGlassColors
import com.app.quanlyhocsinh.core.utils.AppFormatters
import com.app.quanlyhocsinh.data.models.*
import com.app.quanlyhocsinh.state.LocalAppControllers
import com.app.quanlyhocsinh.shared.components.*
import kotlinx.coroutines.launch
import java.util.Calendar
import java.util.Date

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MessagesScreen(
    navController: NavController,
    modifier: Modifier = Modifier
) {
    val app = LocalAppControllers.current
    val glassColors = LocalGlassColors.current
    val controller = app.messages

    var searchQuery by remember { mutableStateOf(controller.searchQuery) }

    if (controller.isLoading && !controller.isInitialized) {
        LoadingView(label = "Đang tải thông báo")
        return
    }

    if (controller.hasError && !controller.isInitialized) {
        ErrorStateView(
            message = controller.errorMessage ?: "Có lỗi xảy ra",
            onRetry = { controller.load() }
        )
        return
    }

    val listState = rememberPersistedLazyListState("messages")

    IosPageScaffold(
        title = "SMS / Thông báo",
        showBack = true,
        onBackTap = { navController.popBackStack() },
        trailing = {
            GlassHeaderIconButton(
                icon = Icons.Default.CheckCircle,
                color = glassColors.accent,
                onTap = { controller.markAllRead() }
            )
        }
    ) {
        LazyColumn(
            state = listState,
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = 20.dp, end = 20.dp, top = 20.dp, bottom = 40.dp)
            ) {
                // Parents Inbox Card
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
                                tone = GlassCardTone.ACCENT,
                                modifier = Modifier.size(56.dp)
                            ) {
                                Box(
                                    modifier = Modifier.fillMaxSize(),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.ChatBubble,
                                        contentDescription = null,
                                        tint = glassColors.accent
                                    )
                                }
                            }
                            Spacer(modifier = Modifier.width(14.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = "Hộp thư phụ huynh",
                                    color = glassColors.textPrimary,
                                    fontSize = 20.sp,
                                    fontWeight = FontWeight.Bold
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = "${controller.unreadCount} tin chưa đọc",
                                    color = glassColors.textSecondary,
                                    fontSize = 13.sp
                                )
                            }
                        }
                    }
                }

                // Search field
                item {
                    Spacer(modifier = Modifier.height(18.dp))
                    RoundedInputField(
                        value = searchQuery,
                        onValueChange = {
                            searchQuery = it
                            controller.updateSearch(it)
                        },
                        placeholder = "Tìm theo tiêu đề hoặc nội dung"
                    )
                }

                // Category list filter
                item {
                    Spacer(modifier = Modifier.height(14.dp))
                    LazyRow(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        item {
                            GlassChip(
                                label = "Tất cả",
                                selected = controller.selectedCategory == null,
                                onTap = { controller.updateCategory(null) }
                            )
                        }
                        items(MessageCategory.entries, key = { it.name }) { category ->
                            GlassChip(
                                label = category.label,
                                selected = controller.selectedCategory == category,
                                onTap = { controller.updateCategory(category) }
                            )
                        }
                    }
                    Spacer(modifier = Modifier.height(18.dp))
                }

                val list = controller.filteredMessages
                if (list.isEmpty()) {
                    item {
                        AnimatedEmptyState(
                            title = "Chưa có thông báo phù hợp",
                            subtitle = "Hãy thử từ khóa khác hoặc thay đổi nhóm thông báo.",
                            iconBuilder = { c -> EmptyIllustrations.bell(color = c) }
                        )
                    }
                } else {
                    items(list, key = { it.id }) { item ->
                        val priorityColor = when (item.priority) {
                            MessagePriority.LOW -> Color(0xFF8090A9)
                            MessagePriority.NORMAL -> glassColors.accent
                            MessagePriority.HIGH -> glassColors.danger
                        }
                        Box(modifier = Modifier.padding(bottom = 12.dp)) {
                            AppGlassCard(
                                onTap = {
                                    if (!item.isRead) {
                                        controller.markRead(item.id)
                                    }
                                    navController.navigate("message_detail/${item.id}")
                                }
                            ) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    verticalAlignment = Alignment.Top
                                ) {
                                    AppGlassCard(
                                        padding = 0.dp,
                                        borderRadius = RoundedCornerShape(16.dp),
                                        borderRadiusVal = 16.dp,
                                        tone = GlassCardTone.MUTED,
                                        modifier = Modifier.size(42.dp)
                                    ) {
                                        Box(
                                            modifier = Modifier.fillMaxSize(),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Icon(
                                                imageVector = Icons.Default.ChatBubbleOutline,
                                                contentDescription = null,
                                                tint = priorityColor,
                                                modifier = Modifier.size(20.dp)
                                            )
                                        }
                                    }
                                    Spacer(modifier = Modifier.width(12.dp))
                                    Column(modifier = Modifier.weight(1f)) {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Text(
                                                text = item.title,
                                                color = glassColors.textPrimary,
                                                fontSize = 15.sp,
                                                fontWeight = if (item.isRead) FontWeight.SemiBold else FontWeight.Bold,
                                                modifier = Modifier.weight(1f),
                                                maxLines = 1,
                                                overflow = TextOverflow.Ellipsis
                                            )
                                            if (!item.isRead) {
                                                Spacer(modifier = Modifier.width(4.dp))
                                                Box(
                                                    modifier = Modifier
                                                        .size(8.dp)
                                                        .clip(CircleShape)
                                                        .background(glassColors.accent)
                                                )
                                            }
                                        }
                                        Spacer(modifier = Modifier.height(6.dp))
                                        Text(
                                            text = item.preview,
                                            color = glassColors.textSecondary,
                                            fontSize = 13.sp,
                                            lineHeight = 18.sp,
                                            maxLines = 2,
                                            overflow = TextOverflow.Ellipsis
                                        )
                                        Spacer(modifier = Modifier.height(8.dp))
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            StatusPill(label = item.category.label, color = glassColors.accent)
                                            Spacer(modifier = Modifier.width(8.dp))
                                            Text(
                                                text = AppFormatters.dayMonthYear(item.time),
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
    }
}

// -------------------------------------------------------------
// MESSAGE DETAIL SCREEN
// -------------------------------------------------------------
@Composable
fun MessageDetailScreen(
    messageId: String,
    navController: NavController,
    modifier: Modifier = Modifier
) {
    val app = LocalAppControllers.current
    val glassColors = LocalGlassColors.current

    val message = app.messages.allMessages.value.firstOrNull { it.id == messageId }

    if (message == null) {
        IosPageScaffold(
            title = "Chi tiết thông báo",
            showBack = true,
            onBackTap = { navController.popBackStack() }
        ) {
            AnimatedEmptyState(
                title = "Không tìm thấy thông báo",
                subtitle = "Thông báo có thể đã được cập nhật.",
                iconBuilder = { c -> EmptyIllustrations.magnifying(color = c) }
            )
        }
        return
    }

    val priorityColor = when (message.priority) {
        MessagePriority.LOW -> Color(0xFF8090A9)
        MessagePriority.NORMAL -> glassColors.accent
        MessagePriority.HIGH -> glassColors.danger
    }

    IosPageScaffold(
        title = "Chi tiết thông báo",
        showBack = true,
        onBackTap = { navController.popBackStack() }
    ) {
        LazyColumn(
            modifier = modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = 20.dp, end = 20.dp, top = 20.dp, bottom = 40.dp)
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
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = message.title,
                                color = glassColors.textPrimary,
                                fontSize = 20.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.weight(1f)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            StatusPill(label = message.priority.label, color = priorityColor)
                        }
                        Spacer(modifier = Modifier.height(10.dp))
                        Text(
                            text = "${message.category.label} • ${AppFormatters.dayMonthYear(message.time)} • ${AppFormatters.timeOfDay(message.time)}",
                            color = glassColors.textSecondary,
                            fontSize = 13.sp
                        )
                        Spacer(modifier = Modifier.height(18.dp))
                        Text(
                            text = message.content,
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

// -------------------------------------------------------------
// REPORTS SCREEN
// -------------------------------------------------------------
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReportsScreen(
    navController: NavController,
    modifier: Modifier = Modifier
) {
    val app = LocalAppControllers.current
    val glassColors = LocalGlassColors.current
    val controller = app.reports



    if (controller.isLoading && !controller.isInitialized) {
        LoadingView(label = "Đang tải phản ánh")
        return
    }

    if (controller.hasError && !controller.isInitialized) {
        ErrorStateView(
            message = controller.errorMessage ?: "Có lỗi xảy ra",
            onRetry = { controller.load() }
        )
        return
    }

    val reportStatusColor: (ReportStatus) -> Color = { status ->
        when (status) {
            ReportStatus.SUBMITTED -> glassColors.accent
            ReportStatus.RECEIVING -> glassColors.warning
            ReportStatus.VERIFYING -> glassColors.warning
            ReportStatus.RESOLVED -> glassColors.success
            ReportStatus.NEED_MORE_INFO -> glassColors.danger
            ReportStatus.CLOSED -> Color(0xFF7E8798)
        }
    }

    val listState = rememberPersistedLazyListState("reports")

    IosPageScaffold(
        title = "Tố cáo / Phản ánh",
        showBack = true,
        onBackTap = { navController.popBackStack() }
    ) {
        LazyColumn(
            state = listState,
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = 20.dp, end = 20.dp, top = 20.dp, bottom = 40.dp)
            ) {
                // Header overview report card
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
                                text = "Kênh phản ánh an toàn học đường",
                                color = glassColors.textPrimary,
                                fontSize = 20.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Spacer(modifier = Modifier.height(6.dp))
                            Text(
                                text = "Mỗi phản ánh được ghi nhận nghiêm túc, rõ ràng và theo dõi theo từng trạng thái xử lý.",
                                color = glassColors.textSecondary,
                                fontSize = 13.sp,
                                lineHeight = 18.sp
                            )
                            Spacer(modifier = Modifier.height(16.dp))
                            Row(modifier = Modifier.fillMaxWidth()) {
                                Box(modifier = Modifier.weight(1f)) {
                                    HubMetric(label = "Tổng phản ánh", value = controller.reports.value.size.toString())
                                }
                                Spacer(modifier = Modifier.width(10.dp))
                                Box(modifier = Modifier.weight(1f)) {
                                    HubMetric(label = "Đang mở", value = controller.openCount.toString())
                                }
                            }
                            Spacer(modifier = Modifier.height(16.dp))
                            SoftPrimaryButton(
                                label = "Tạo phản ánh mới",
                                icon = Icons.Default.Add,
                                onPressed = {
                                    navController.navigate("report_create")
                                }
                            )
                        }
                    }
                }

                item {
                    Spacer(modifier = Modifier.height(18.dp))
                    AppSectionTitle(title = "Danh sách đã gửi")
                }

                val list = controller.reports.value
                if (list.isEmpty()) {
                    item {
                        AnimatedEmptyState(
                            title = "Chưa có phản ánh nào",
                            subtitle = "Khi phụ huynh gửi phản ánh, danh sách sẽ xuất hiện tại đây.",
                            iconBuilder = { c -> EmptyIllustrations.clipboard(color = c) }
                        )
                    }
                } else {
                    items(list, key = { it.id }) { report ->
                        Box(modifier = Modifier.padding(bottom = 12.dp)) {
                            AppGlassCard(
                                onTap = {
                                    navController.navigate("report_detail/${report.id}")
                                }
                            ) {
                                Column(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalAlignment = Alignment.Start
                                ) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(
                                            text = report.title,
                                            color = glassColors.textPrimary,
                                            fontSize = 15.sp,
                                            fontWeight = FontWeight.Bold,
                                            modifier = Modifier.weight(1f),
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis
                                        )
                                        Spacer(modifier = Modifier.width(8.dp))
                                        StatusPill(label = report.status.label, color = reportStatusColor(report.status))
                                    }
                                    Spacer(modifier = Modifier.height(8.dp))
                                    Text(
                                        text = "${report.type.label} • ${report.location}",
                                        color = glassColors.textSecondary,
                                        fontSize = 13.sp
                                    )
                                    Spacer(modifier = Modifier.height(6.dp))
                                    Text(
                                        text = "Mã phản ánh: ${report.code}",
                                        color = glassColors.textSecondary,
                                        fontSize = 13.sp
                                    )
                                    Spacer(modifier = Modifier.height(8.dp))
                                    Text(
                                        text = report.description,
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

// -------------------------------------------------------------
// REPORT CREATE SCREEN
// -------------------------------------------------------------
@Composable
fun ReportCreateScreen(
    navController: NavController,
    modifier: Modifier = Modifier
) {
    val app = LocalAppControllers.current
    val glassColors = LocalGlassColors.current
    val controller = app.reports
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()

    var title by remember { mutableStateOf("") }
    var location by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var relatedPeople by remember { mutableStateOf("") }
    var dateVal by remember { mutableStateOf(Date()) }
    var dateText by remember { mutableStateOf(AppFormatters.dayMonthYear(dateVal)) }

    var type by remember { mutableStateOf(ReportType.BULLYING) }
    var severity by remember { mutableStateOf(ReportSeverity.MEDIUM) }
    var anonymous by remember { mutableStateOf(false) }
    var attachments by remember { mutableStateOf<List<String>>(emptyList()) }

    var showTypePicker by remember { mutableStateOf(false) }
    var showSeverityPicker by remember { mutableStateOf(false) }

    IosPageScaffold(
        title = "Tạo phản ánh mới",
        showBack = true,
        onBackTap = { navController.popBackStack() }
    ) {
        LazyColumn(
            modifier = modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = 20.dp, end = 20.dp, top = 20.dp, bottom = 40.dp)
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
                            text = "Thông tin sẽ được gửi đến bộ phận phụ trách của nhà trường.",
                            color = glassColors.textSecondary,
                            fontSize = 14.sp,
                            lineHeight = 20.sp
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        StatusPill(label = "Bảo mật và theo dõi trạng thái", color = glassColors.accent)
                    }
                }
            }

            item {
                Spacer(modifier = Modifier.height(18.dp))
                RoundedInputField(
                    value = title,
                    onValueChange = { title = it },
                    placeholder = "Tiêu đề sự việc",
                    label = "Tiêu đề"
                )
                Spacer(modifier = Modifier.height(12.dp))
                AppListTile(
                    icon = Icons.Default.Tag,
                    title = "Loại phản ánh",
                    subtitle = type.label,
                    onTap = { showTypePicker = true }
                )
                Spacer(modifier = Modifier.height(12.dp))
                AppListTile(
                    icon = Icons.Default.Warning,
                    title = "Mức độ nghiêm trọng",
                    subtitle = severity.label,
                    onTap = { showSeverityPicker = true }
                )
                Spacer(modifier = Modifier.height(12.dp))
                // Pick Date using native dialog
                RoundedInputField(
                    value = dateText,
                    onValueChange = {},
                    placeholder = "Ngày xảy ra",
                    label = "Ngày xảy ra",
                    readOnly = true,
                    onTap = {
                        val cal = Calendar.getInstance().apply { time = dateVal }
                        DatePickerDialog(
                            context,
                            { _, year, month, dayOfMonth ->
                                val selectedCal = Calendar.getInstance().apply {
                                    set(year, month, dayOfMonth)
                                }
                                dateVal = selectedCal.time
                                dateText = AppFormatters.dayMonthYear(selectedCal.time)
                            },
                            cal.get(Calendar.YEAR),
                            cal.get(Calendar.MONTH),
                            cal.get(Calendar.DAY_OF_MONTH)
                        ).show()
                    }
                )
                Spacer(modifier = Modifier.height(12.dp))
                RoundedInputField(
                    value = location,
                    onValueChange = { location = it },
                    placeholder = "Địa điểm xảy ra",
                    label = "Địa điểm"
                )
                Spacer(modifier = Modifier.height(12.dp))
                RoundedInputField(
                    value = description,
                    onValueChange = { description = it },
                    placeholder = "Mô tả chi tiết sự việc",
                    label = "Mô tả chi tiết (Tối thiểu 20 ký tự)",
                    maxLines = 5
                )
                Spacer(modifier = Modifier.height(12.dp))
                RoundedInputField(
                    value = relatedPeople,
                    onValueChange = { relatedPeople = it },
                    placeholder = "Người liên quan nếu có",
                    label = "Người liên quan",
                    maxLines = 2
                )
                Spacer(modifier = Modifier.height(12.dp))
                AppGlassCard {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalAlignment = Alignment.Start
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "Gửi ẩn danh",
                                color = glassColors.textPrimary,
                                fontSize = 15.sp,
                                fontWeight = FontWeight.SemiBold,
                                modifier = Modifier.weight(1f)
                            )
                            GlassToggle(
                                value = anonymous,
                                onChanged = { anonymous = it }
                            )
                        }
                        Spacer(modifier = Modifier.height(10.dp))
                        Text(
                            text = "Tệp minh chứng: ${if (attachments.isEmpty()) "Chưa có" else attachments.joinToString(", ")}",
                            color = glassColors.textSecondary,
                            fontSize = 13.sp,
                            lineHeight = 18.sp
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        SoftSecondaryButton(
                            label = "Tải minh chứng",
                            icon = Icons.Default.AttachFile,
                            onPressed = {
                                attachments = attachments + "minh_chung_${attachments.size + 1}.jpg"
                            }
                        )
                    }
                }
                Spacer(modifier = Modifier.height(24.dp))
                SoftPrimaryButton(
                    label = "Gửi phản ánh",
                    isLoading = controller.isSubmitting,
                    onPressed = {
                        if (title.trim().isEmpty() || location.trim().isEmpty() || description.trim().isEmpty()) {
                            Toast.makeText(context, "Vui lòng nhập đầy đủ các trường bắt buộc", Toast.LENGTH_SHORT).show()
                            return@SoftPrimaryButton
                        }
                        if (description.trim().length < 20) {
                            Toast.makeText(context, "Mô tả cần chi tiết hơn (tối thiểu 20 ký tự)", Toast.LENGTH_SHORT).show()
                            return@SoftPrimaryButton
                        }
                        coroutineScope.launch {
                            val ok = controller.submit(
                                title = title.trim(),
                                type = type,
                                severity = severity,
                                occurredAt = dateVal,
                                location = location.trim(),
                                description = description.trim(),
                                relatedPeople = relatedPeople.trim(),
                                anonymous = anonymous,
                                attachments = attachments
                            )
                            if (ok) {
                                Toast.makeText(context, "Đã gửi phản ánh thành công.", Toast.LENGTH_SHORT).show()
                                navController.popBackStack()
                            } else {
                                Toast.makeText(context, "Gửi phản ánh chưa thành công.", Toast.LENGTH_SHORT).show()
                            }
                        }
                    }
                )
            }
        }
    }

    // Picker dialogs
    if (showTypePicker) {
        AppBottomSheet(
            show = true,
            onDismissRequest = { showTypePicker = false }
        ) {
            Text(
                text = "Chọn loại phản ánh",
                color = glassColors.textPrimary,
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(16.dp))
            ReportType.entries.forEach { item ->
                Box(modifier = Modifier.padding(bottom = 10.dp)) {
                    AppListTile(
                        icon = if (item == type) Icons.Default.CheckCircle else Icons.Default.ChatBubbleOutline, // basic radio mimic
                        title = item.label,
                        onTap = {
                            type = item
                            showTypePicker = false
                        }
                    )
                }
            }
        }
    }

    if (showSeverityPicker) {
        AppBottomSheet(
            show = true,
            onDismissRequest = { showSeverityPicker = false }
        ) {
            Text(
                text = "Chọn mức độ nghiêm trọng",
                color = glassColors.textPrimary,
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(16.dp))
            ReportSeverity.entries.forEach { item ->
                Box(modifier = Modifier.padding(bottom = 10.dp)) {
                    AppListTile(
                        icon = if (item == severity) Icons.Default.CheckCircle else Icons.Default.ChatBubbleOutline,
                        title = item.label,
                        onTap = {
                            severity = item
                            showSeverityPicker = false
                        }
                    )
                }
            }
        }
    }
}

// -------------------------------------------------------------
// REPORT DETAIL SCREEN
// -------------------------------------------------------------
@Composable
fun ReportDetailScreen(
    reportId: String,
    navController: NavController,
    modifier: Modifier = Modifier
) {
    val app = LocalAppControllers.current
    val glassColors = LocalGlassColors.current

    val report = app.reports.reports.value.firstOrNull { it.id == reportId }

    if (report == null) {
        IosPageScaffold(
            title = "Chi tiết phản ánh",
            showBack = true,
            onBackTap = { navController.popBackStack() }
        ) {
            AnimatedEmptyState(
                title = "Không tìm thấy phản ánh",
                subtitle = "Phản ánh này hiện không khả dụng.",
                iconBuilder = { c -> EmptyIllustrations.magnifying(color = c) }
            )
        }
        return
    }

    val reportStatusColor: (ReportStatus) -> Color = { status ->
        when (status) {
            ReportStatus.SUBMITTED -> glassColors.accent
            ReportStatus.RECEIVING -> glassColors.warning
            ReportStatus.VERIFYING -> glassColors.warning
            ReportStatus.RESOLVED -> glassColors.success
            ReportStatus.NEED_MORE_INFO -> glassColors.danger
            ReportStatus.CLOSED -> Color(0xFF7E8798)
        }
    }

    IosPageScaffold(
        title = "Chi tiết phản ánh",
        showBack = true,
        onBackTap = { navController.popBackStack() }
    ) {
        LazyColumn(
            modifier = modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = 20.dp, end = 20.dp, top = 20.dp, bottom = 40.dp)
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
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = report.title,
                                color = glassColors.textPrimary,
                                fontSize = 20.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.weight(1f)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            StatusPill(label = report.status.label, color = reportStatusColor(report.status))
                        }
                        Spacer(modifier = Modifier.height(10.dp))
                        Text(
                            text = "Mã phản ánh: ${report.code}",
                            color = glassColors.textSecondary,
                            fontSize = 13.sp
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = "${report.type.label} • ${report.severity.label}",
                            color = glassColors.textSecondary,
                            fontSize = 13.sp
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = "Ngày xảy ra: ${AppFormatters.dayMonthYear(report.occurredAt)} • ${report.location}",
                            color = glassColors.textSecondary,
                            fontSize = 13.sp
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            text = report.description,
                            color = glassColors.textPrimary,
                            fontSize = 15.sp,
                            lineHeight = 22.sp
                        )
                    }
                }
            }

            item {
                Spacer(modifier = Modifier.height(18.dp))
                AppGlassCard {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalAlignment = Alignment.Start
                    ) {
                        Text(
                            text = "Phản hồi từ nhà trường",
                            color = glassColors.textPrimary,
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(modifier = Modifier.height(10.dp))
                        Text(
                            text = report.schoolResponse,
                            color = glassColors.textSecondary,
                            fontSize = 14.sp,
                            lineHeight = 20.sp
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            text = "Gửi lúc ${AppFormatters.dayMonthYear(report.submittedAt)} • ${AppFormatters.timeOfDay(report.submittedAt)}",
                            color = glassColors.textSecondary,
                            fontSize = 12.sp
                        )
                    }
                }
            }
        }
    }
}
