package com.app.quanlyhocsinh.features.more

import android.widget.Toast
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AssignmentTurnedIn
import androidx.compose.material.icons.filled.Circle
import androidx.compose.material.icons.filled.FolderZip
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.RadioButtonChecked
import androidx.compose.material.icons.filled.RadioButtonUnchecked
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import com.app.quanlyhocsinh.core.theme.LocalGlassColors
import com.app.quanlyhocsinh.core.utils.AppFormatters
import com.app.quanlyhocsinh.data.models.*
import com.app.quanlyhocsinh.state.LocalAppControllers
import com.app.quanlyhocsinh.shared.components.*
import kotlinx.coroutines.launch

fun serviceStatusColor(status: ServiceRegistrationStatus, glassColors: com.app.quanlyhocsinh.core.theme.GlassColors): Color {
    return when (status) {
        ServiceRegistrationStatus.NOT_REGISTERED -> Color(0xFF6D7B90)
        ServiceRegistrationStatus.REGISTERED -> glassColors.success
        ServiceRegistrationStatus.PENDING -> glassColors.warning
        ServiceRegistrationStatus.APPROVED -> glassColors.success
        ServiceRegistrationStatus.REJECTED -> glassColors.danger
        ServiceRegistrationStatus.EXPIRED -> Color(0xFF7F899A)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ServicesScreen(
    navController: NavController,
    modifier: Modifier = Modifier
) {
    val app = LocalAppControllers.current
    val glassColors = LocalGlassColors.current
    val controller = app.services
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var searchQuery by remember { mutableStateOf(controller.searchQuery) }

    // Dialog state
    var registrationToCancel by remember { mutableStateOf<ServiceRegistration?>(null) }

    if (controller.isLoading && !controller.isInitialized) {
        LoadingView(label = "Đang tải dịch vụ")
        return
    }

    if (controller.hasError && !controller.isInitialized) {
        ErrorStateView(
            message = controller.errorMessage ?: "Có lỗi xảy ra",
            onRetry = { controller.load() }
        )
        return
    }

    val listState = rememberPersistedLazyListState("services")

    IosPageScaffold(
        title = "Dịch vụ",
        showBack = true,
        onBackTap = { navController.popBackStack() }
    ) {
        LazyColumn(
                state = listState,
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(start = 20.dp, end = 20.dp, top = 20.dp, bottom = 40.dp)
            ) {
                // Header introduction card
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
                                text = "Trung tâm dịch vụ nhà trường",
                                color = glassColors.textPrimary,
                                fontSize = 20.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Spacer(modifier = Modifier.height(6.dp))
                            Text(
                                text = "Đăng ký, theo dõi trạng thái và xem lịch sử dịch vụ đã dùng.",
                                color = glassColors.textSecondary,
                                fontSize = 13.sp,
                                lineHeight = 18.sp
                            )
                            Spacer(modifier = Modifier.height(16.dp))
                            GlassTabBar(
                                items = listOf(
                                    GlassTabItemData(false, "Tất cả dịch vụ"),
                                    GlassTabItemData(true, "Đã đăng ký")
                                ),
                                groupValue = controller.showRegisteredOnly,
                                onChanged = { controller.updateMode(it) }
                            )
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
                        placeholder = "Tìm kiếm dịch vụ"
                    )
                }

                // Registered History Section (if showRegisteredOnly is true)
                if (controller.showRegisteredOnly) {
                    val regs = controller.registrations.value
                    if (regs.isNotEmpty()) {
                        item {
                            Spacer(modifier = Modifier.height(18.dp))
                            AppSectionTitle(title = "Lịch sử đăng ký")
                        }
                        items(regs, key = { it.id }) { reg ->
                            Box(modifier = Modifier.padding(bottom = 12.dp)) {
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
                                                text = reg.serviceTitle,
                                                color = glassColors.textPrimary,
                                                fontSize = 15.sp,
                                                fontWeight = FontWeight.Bold,
                                                modifier = Modifier.weight(1f)
                                            )
                                            StatusPill(
                                                label = reg.status.label,
                                                color = serviceStatusColor(reg.status, glassColors)
                                            )
                                        }
                                        Spacer(modifier = Modifier.height(8.dp))
                                        Text(
                                            text = "${reg.packageTitle} • ${reg.period}",
                                            color = glassColors.textSecondary,
                                            fontSize = 13.sp
                                        )
                                        Spacer(modifier = Modifier.height(4.dp))
                                        Text(
                                            text = "Gửi lúc ${AppFormatters.dayMonthYear(reg.submittedAt)}",
                                            color = glassColors.textSecondary,
                                            fontSize = 13.sp
                                        )
                                        if (reg.note.isNotEmpty()) {
                                            Spacer(modifier = Modifier.height(10.dp))
                                            Text(
                                                text = reg.note,
                                                color = glassColors.textSecondary,
                                                fontSize = 13.sp,
                                                lineHeight = 18.sp
                                            )
                                        }
                                        if (reg.canCancel) {
                                            Spacer(modifier = Modifier.height(14.dp))
                                            SoftSecondaryButton(
                                                label = "Hủy đăng ký",
                                                icon = Icons.Default.Close,
                                                onPressed = {
                                                    registrationToCancel = reg
                                                }
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // Main Service List
                item {
                    Spacer(modifier = Modifier.height(18.dp))
                    AppSectionTitle(title = "Danh sách dịch vụ")
                }

                val list = controller.services
                if (list.isEmpty()) {
                    item {
                        AnimatedEmptyState(
                            title = "Chưa có dịch vụ phù hợp",
                            subtitle = "Hãy thử từ khóa khác hoặc chuyển sang chế độ xem toàn bộ dịch vụ.",
                            iconBuilder = { c -> EmptyIllustrations.emptyBox(color = c) }
                        )
                    }
                } else {
                    items(list, key = { it.id }) { service ->
                        Box(modifier = Modifier.padding(bottom = 14.dp)) {
                            AppGlassCard(
                                onTap = {
                                    navController.navigate("service_detail/${service.id}")
                                },
                                borderRadius = RoundedCornerShape(28.dp),
                                borderRadiusVal = 28.dp
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
                                            text = service.title,
                                            color = glassColors.textPrimary,
                                            fontSize = 17.sp,
                                            fontWeight = FontWeight.Bold,
                                            modifier = Modifier.weight(1f)
                                        )
                                        StatusPill(
                                            label = service.status.label,
                                            color = serviceStatusColor(service.status, glassColors)
                                        )
                                    }
                                    Spacer(modifier = Modifier.height(8.dp))
                                    Text(
                                        text = service.description,
                                        color = glassColors.textSecondary,
                                        fontSize = 13.sp,
                                        lineHeight = 18.sp
                                    )
                                    Spacer(modifier = Modifier.height(14.dp))
                                    // Meta values wrap
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                                    ) {
                                        ServiceMetaView(label = "Phí tạm", value = AppFormatters.currency(service.fee))
                                        ServiceMetaView(label = "Hạn đăng ký", value = AppFormatters.dayMonthYear(service.deadline))
                                    }
                                }
                            }
                        }
                    }
                }
            }
    }

    // Cancel registration confirmation dialog
    registrationToCancel?.let { reg ->
        ConfirmationDialog(
            show = true,
            title = "Hủy đăng ký?",
            content = "Yêu cầu này sẽ được hủy nếu còn trong thời gian cho phép.",
            confirmLabel = "Hủy đăng ký",
            onConfirm = {
                scope.launch {
                    val ok = controller.cancel(reg)
                    Toast.makeText(
                        context,
                        if (ok) "Đã hủy đăng ký dịch vụ." else "Chưa thể hủy đăng ký.",
                        Toast.LENGTH_SHORT
                    ).show()
                }
                registrationToCancel = null
            },
            onDismiss = {
                registrationToCancel = null
            }
        )
    }
}

@Composable
fun ServiceMetaView(
    label: String,
    value: String,
    modifier: Modifier = Modifier
) {
    val glassColors = LocalGlassColors.current

    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.Start
    ) {
        Text(
            text = label,
            color = glassColors.textSecondary,
            fontSize = 12.sp
        )
        Spacer(modifier = Modifier.height(2.dp))
        Text(
            text = value,
            color = glassColors.textPrimary,
            fontSize = 13.sp,
            fontWeight = FontWeight.Bold
        )
    }
}

// -------------------------------------------------------------
// SERVICE DETAIL SCREEN
// -------------------------------------------------------------
@Composable
fun ServiceDetailScreen(
    serviceId: String,
    navController: NavController,
    modifier: Modifier = Modifier
) {
    val app = LocalAppControllers.current
    val glassColors = LocalGlassColors.current
    val controller = app.services

    val service = controller.serviceById(serviceId)

    if (service == null) {
        IosPageScaffold(
            title = "Chi tiết dịch vụ",
            showBack = true,
            onBackTap = { navController.popBackStack() }
        ) {
            AnimatedEmptyState(
                title = "Không tìm thấy dịch vụ",
                subtitle = "Dịch vụ có thể đã được cập nhật.",
                iconBuilder = { c -> EmptyIllustrations.magnifying(color = c) }
            )
        }
        return
    }

    IosPageScaffold(
        title = "Chi tiết dịch vụ",
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
                                text = service.title,
                                color = glassColors.textPrimary,
                                fontSize = 20.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.weight(1f)
                            )
                            StatusPill(
                                label = service.status.label,
                                color = serviceStatusColor(service.status, glassColors)
                            )
                        }
                        Spacer(modifier = Modifier.height(10.dp))
                        Text(
                            text = service.description,
                            color = glassColors.textSecondary,
                            fontSize = 14.sp,
                            lineHeight = 20.sp
                        )
                        Spacer(modifier = Modifier.height(14.dp))
                        ServiceDetailMetaRow(label = "Phí tham khảo", value = AppFormatters.currency(service.fee))
                        Spacer(modifier = Modifier.height(8.dp))
                        ServiceDetailMetaRow(label = "Thời hạn đăng ký", value = AppFormatters.dayMonthYear(service.deadline))
                        Spacer(modifier = Modifier.height(8.dp))
                        ServiceDetailMetaRow(label = "Thời gian áp dụng", value = service.activePeriod)
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            text = service.highlight,
                            color = glassColors.textPrimary,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }

            item {
                Spacer(modifier = Modifier.height(18.dp))
                AppSectionTitle(title = "Gói dịch vụ")
            }

            items(service.packages, key = { it.id }) { pack ->
                Box(modifier = Modifier.padding(bottom = 12.dp)) {
                    AppGlassCard {
                        Column(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalAlignment = Alignment.Start
                        ) {
                            Text(
                                text = pack.title,
                                color = glassColors.textPrimary,
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Spacer(modifier = Modifier.height(6.dp))
                            Text(
                                text = pack.description,
                                color = glassColors.textSecondary,
                                fontSize = 13.sp,
                                lineHeight = 18.sp
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = AppFormatters.currency(pack.fee),
                                color = glassColors.accent,
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }

            item {
                Spacer(modifier = Modifier.height(18.dp))
                if (service.isOpen && service.status == ServiceRegistrationStatus.NOT_REGISTERED) {
                    SoftPrimaryButton(
                        label = "Đăng ký dịch vụ",
                        icon = Icons.Default.AssignmentTurnedIn,
                        onPressed = {
                            navController.navigate("service_registration/${service.id}")
                        }
                    )
                } else {
                    SoftSecondaryButton(
                        label = "Trạng thái hiện tại: ${service.status.label}",
                        onPressed = {}
                    )
                }
            }
        }
    }
}

@Composable
fun ServiceDetailMetaRow(
    label: String,
    value: String,
    modifier: Modifier = Modifier
) {
    val glassColors = LocalGlassColors.current
    Row(
        modifier = modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = label,
            color = glassColors.textSecondary,
            fontSize = 13.sp,
            modifier = Modifier.width(120.dp)
        )
        Text(
            text = value,
            color = glassColors.textPrimary,
            fontSize = 14.sp,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.weight(1f)
        )
    }
}

// -------------------------------------------------------------
// SERVICE REGISTRATION SCREEN
// -------------------------------------------------------------
@Composable
fun ServiceRegistrationScreen(
    serviceId: String,
    navController: NavController,
    modifier: Modifier = Modifier
) {
    val app = LocalAppControllers.current
    val glassColors = LocalGlassColors.current
    val controller = app.services
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    val service = controller.serviceById(serviceId)

    if (service == null) {
        IosPageScaffold(
            title = "Đăng ký dịch vụ",
            showBack = true,
            onBackTap = { navController.popBackStack() }
        ) {
            AnimatedEmptyState(
                title = "Không tìm thấy dịch vụ",
                subtitle = "Dịch vụ này hiện không còn khả dụng.",
                iconBuilder = { c -> EmptyIllustrations.magnifying(color = c) }
            )
        }
        return
    }

    var selectedPackage by remember { mutableStateOf(service.packages.first()) }
    var period by remember { mutableStateOf("Tháng 4/2026") }
    var note by remember { mutableStateOf("") }
    var showPackagePicker by remember { mutableStateOf(false) }

    IosPageScaffold(
        title = "Đăng ký dịch vụ",
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
                            text = service.title,
                            color = glassColors.textPrimary,
                            fontSize = 20.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = service.description,
                            color = glassColors.textSecondary,
                            fontSize = 13.sp,
                            lineHeight = 18.sp
                        )
                    }
                }
            }

            item {
                Spacer(modifier = Modifier.height(18.dp))
                AppListTile(
                    icon = Icons.Default.FolderZip,
                    title = "Gói đăng ký",
                    subtitle = selectedPackage.title,
                    onTap = { showPackagePicker = true }
                )
                Spacer(modifier = Modifier.height(12.dp))
                RoundedInputField(
                    value = period,
                    onValueChange = { period = it },
                    placeholder = "Thời gian áp dụng",
                    label = "Thời gian"
                )
                Spacer(modifier = Modifier.height(12.dp))
                RoundedInputField(
                    value = note,
                    onValueChange = { note = it },
                    placeholder = "Ghi chú cho nhà trường",
                    label = "Ghi chú",
                    maxLines = 3
                )
                Spacer(modifier = Modifier.height(24.dp))
                SoftPrimaryButton(
                    label = "Gửi đăng ký",
                    isLoading = controller.isSubmitting,
                    onPressed = {
                        scope.launch {
                            val ok = controller.register(
                                service = service,
                                selectedPackage = selectedPackage,
                                period = period.trim(),
                                note = note.trim()
                            )
                            Toast.makeText(
                                context,
                                if (ok) "Đã gửi đăng ký dịch vụ." else "Đăng ký chưa thành công.",
                                Toast.LENGTH_SHORT
                            ).show()
                            if (ok) {
                                navController.popBackStack()
                            }
                        }
                    }
                )
            }
        }
    }

    // Package Picker sheet
    if (showPackagePicker) {
        AppBottomSheet(
            show = true,
            onDismissRequest = { showPackagePicker = false }
        ) {
            Text(
                text = "Chọn gói đăng ký",
                color = glassColors.textPrimary,
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(16.dp))
            service.packages.forEach { pack ->
                Box(modifier = Modifier.padding(bottom = 10.dp)) {
                    AppListTile(
                        icon = if (pack == selectedPackage) Icons.Default.RadioButtonChecked else Icons.Default.RadioButtonUnchecked,
                        title = pack.title,
                        subtitle = "${pack.description} • ${AppFormatters.currency(pack.fee)}",
                        onTap = {
                            selectedPackage = pack
                            showPackagePicker = false
                        }
                    )
                }
            }
        }
    }
}
