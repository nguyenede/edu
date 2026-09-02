package com.app.quanlyhocsinh.features.profile

import android.widget.Toast
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.HelpOutline
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.PrivacyTip
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Divider
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import com.app.quanlyhocsinh.core.theme.LocalGlassColors
import com.app.quanlyhocsinh.core.utils.AppFormatters
import com.app.quanlyhocsinh.data.models.StudentBundle
import com.app.quanlyhocsinh.state.AppThemeMode
import com.app.quanlyhocsinh.state.LocalAppControllers
import com.app.quanlyhocsinh.state.LocalThemeMode
import com.app.quanlyhocsinh.shared.components.*

@Composable
fun ProfileScreen(
    navController: NavController,
    modifier: Modifier = Modifier
) {
    val app = LocalAppControllers.current
    val glassColors = LocalGlassColors.current
    val controller = app.profile

    if (controller.isLoading && !controller.isInitialized) {
        ProfileSkeleton()
        return
    }

    val bundle = controller.bundle

    if (bundle == null) {
        ProfileSkeleton()
        return
    }

    val listState = rememberPersistedLazyListState("profile")

    IosPageScaffold(
        title = "Thông tin",
        showBack = false,
        trailing = {
            GlassHeaderIconButton(
                icon = Icons.Default.Settings,
                color = glassColors.accent,
                onTap = { navController.navigate("settings") }
            )
        }
    ) {
        LazyColumn(
            state = listState,
            modifier = modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = 8.dp, end = 8.dp, top = 20.dp, bottom = 90.dp)
        ) {
            // Monogram Profile overview card
            item {
                AppGlassCard(
                    borderRadius = RoundedCornerShape(28.dp),
                    borderRadiusVal = 28.dp,
                    onTap = {
                        navController.navigate("profile_overview")
                    }
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        AppMonogramAvatar(label = bundle.student.avatarLabel, size = 64.dp)
                        Spacer(modifier = Modifier.width(14.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = bundle.student.name,
                                color = glassColors.textPrimary,
                                fontSize = 20.sp,
                                fontWeight = FontWeight.Bold,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = "${bundle.student.className} • ${bundle.student.schoolName}",
                                color = glassColors.textSecondary,
                                fontSize = 13.sp,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis,
                                lineHeight = 18.sp
                            )
                            Spacer(modifier = Modifier.height(10.dp))
                            Text(
                                text = "Chạm để xem thông tin cơ bản, phụ huynh và liên hệ khẩn cấp.",
                                color = glassColors.textSecondary,
                                fontSize = 13.sp,
                                lineHeight = 18.sp
                            )
                        }
                        Spacer(modifier = Modifier.width(12.dp))
                        Icon(
                            imageVector = Icons.Default.ChevronRight,
                            contentDescription = null,
                            tint = glassColors.textSecondary,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }
            }

            item {
                Spacer(modifier = Modifier.height(14.dp))
                SoftSecondaryButton(
                    label = "Chỉnh sửa hồ sơ",
                    icon = Icons.Default.Edit,
                    onPressed = {
                        navController.navigate("profile_form")
                    }
                )
            }

            item {
                Spacer(modifier = Modifier.height(18.dp))
                AppSectionTitle(title = "Tiện ích tài khoản")
                AppListTile(
                    icon = Icons.Default.Lock,
                    title = "Quyền riêng tư",
                    subtitle = "Xem cách dữ liệu học sinh và phụ huynh được bảo vệ.",
                    onTap = { navController.navigate("privacy") }
                )
                Spacer(modifier = Modifier.height(12.dp))
                AppListTile(
                    icon = Icons.Default.PrivacyTip,
                    title = "Điều khoản sử dụng",
                    subtitle = "Quy định sử dụng ứng dụng dành cho phụ huynh.",
                    onTap = { navController.navigate("terms") }
                )
                Spacer(modifier = Modifier.height(12.dp))
                AppListTile(
                    icon = Icons.Default.HelpOutline,
                    title = "Trợ giúp",
                    subtitle = "Hướng dẫn nhanh cho các thao tác thường dùng.",
                    onTap = { navController.navigate("help") }
                )
                Spacer(modifier = Modifier.height(12.dp))
                AppListTile(
                    icon = Icons.Default.Phone,
                    title = "Liên hệ nhà trường",
                    subtitle = "Văn phòng học vụ • 028 3822 9988",
                    onTap = { navController.navigate("school_contact") }
                )
            }
        }
    }
}

// -------------------------------------------------------------
// PROFILE OVERVIEW SCREEN
// -------------------------------------------------------------
@Composable
fun ProfileOverviewScreen(
    navController: NavController,
    modifier: Modifier = Modifier
) {
    val app = LocalAppControllers.current
    val glassColors = LocalGlassColors.current

    val bundle = app.profile.bundle ?: return

    val listState = rememberPersistedLazyListState("profile_overview")

    IosPageScaffold(
        title = "Hồ sơ cá nhân",
        showBack = true,
        onBackTap = { navController.popBackStack() }
    ) {
        LazyColumn(
            state = listState,
            modifier = modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = 8.dp, end = 8.dp, top = 20.dp, bottom = 40.dp)
        ) {
            item {
                AppGlassCard(
                    borderRadius = RoundedCornerShape(28.dp),
                    borderRadiusVal = 28.dp
                ) {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        AppMonogramAvatar(label = bundle.student.avatarLabel, size = 82.dp)
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            text = bundle.student.name,
                            color = glassColors.textPrimary,
                            fontSize = 20.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = "${bundle.student.className} • ${bundle.student.studentId}",
                            color = glassColors.textSecondary,
                            fontSize = 14.sp
                        )
                        Spacer(modifier = Modifier.height(10.dp))
                        StatusPill(label = bundle.profileStatus.label, color = glassColors.accent)
                    }
                }
            }

            item {
                Spacer(modifier = Modifier.height(18.dp))
                AppSectionTitle(title = "Thông tin cơ bản")
                GroupedSectionCard(
                    children = listOf(
                        { InfoRow(title = "Trường", value = bundle.student.schoolName) },
                        { InfoRow(title = "Khối", value = bundle.student.gradeLevel) },
                        { InfoRow(title = "Năm học", value = bundle.student.academicYear) },
                        { InfoRow(title = "Ngày sinh", value = AppFormatters.dayMonthYear(bundle.student.birthDate)) },
                        { InfoRow(title = "Giới tính", value = bundle.student.gender.label) }
                    )
                )
            }

            item {
                Spacer(modifier = Modifier.height(18.dp))
                AppSectionTitle(title = "Thông tin phụ huynh")
                GroupedSectionCard(
                    children = listOf(
                        { InfoRow(title = "Họ tên", value = bundle.parent.name) },
                        { InfoRow(title = "Quan hệ", value = bundle.parent.relationship) },
                        { InfoRow(title = "Số điện thoại", value = bundle.parent.phone) },
                        { InfoRow(title = "Email", value = bundle.parent.email) },
                        { InfoRow(title = "Địa chỉ", value = bundle.parent.address) }
                    )
                )
            }

            item {
                Spacer(modifier = Modifier.height(18.dp))
                AppSectionTitle(title = "Liên hệ khẩn cấp")
                GroupedSectionCard(
                    children = listOf(
                        { InfoRow(title = "Người liên hệ", value = bundle.emergencyContact.name) },
                        { InfoRow(title = "Quan hệ", value = bundle.emergencyContact.relationship) },
                        { InfoRow(title = "Số điện thoại", value = bundle.emergencyContact.phone) },
                        { InfoRow(title = "Sức khỏe", value = bundle.healthInfo.summary) }
                    )
                )
            }
        }
    }
}

@Composable
fun InfoRow(
    title: String,
    value: String,
    modifier: Modifier = Modifier
) {
    val glassColors = LocalGlassColors.current
    Row(
        modifier = modifier.fillMaxWidth(),
        verticalAlignment = Alignment.Top
    ) {
        Text(
            text = title,
            color = glassColors.textSecondary,
            fontSize = 13.sp,
            modifier = Modifier.width(112.dp)
        )
        Text(
            text = value,
            color = glassColors.textPrimary,
            fontSize = 14.sp,
            fontWeight = FontWeight.Bold,
            lineHeight = 20.sp,
            modifier = Modifier.weight(1f)
        )
    }
}

// -------------------------------------------------------------
// SETTINGS SCREEN
// -------------------------------------------------------------
@Composable
fun SettingsScreen(
    navController: NavController,
    modifier: Modifier = Modifier
) {
    val glassColors = LocalGlassColors.current
    val context = LocalContext.current
    val themeModeState = LocalThemeMode.current

    var grades by remember { mutableStateOf(true) }
    var attendance by remember { mutableStateOf(true) }
    var services by remember { mutableStateOf(true) }
    var safety by remember { mutableStateOf(true) }
    var quietAfterHours by remember { mutableStateOf(false) }

    var hidePreview by remember { mutableStateOf(true) }
    var requireUnlock by remember { mutableStateOf(false) }
    var confirmSensitive by remember { mutableStateOf(true) }

    var autoSync by remember { mutableStateOf(true) }
    var mobileDataSync by remember { mutableStateOf(false) }
    var reduceMotion by remember { mutableStateOf(true) }
    var rememberFilters by remember { mutableStateOf(true) }
    var darkMode by remember { mutableStateOf(themeModeState.value == AppThemeMode.DARK) }

    val listState = rememberLazyListState()

    IosPageScaffold(
        title = "Cài đặt",
        showBack = true,
        onBackTap = { navController.popBackStack() }
    ) {
        LazyColumn(
            state = listState,
            modifier = modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 20.dp, bottom = 90.dp)
        ) {
            item {
                AppGlassCard(
                    borderRadius = RoundedCornerShape(28.dp),
                    borderRadiusVal = 28.dp
                ) {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalAlignment = Alignment.Start
                    ) {
                        Text(
                            text = "Quản lý thông báo, bảo mật và cách ứng dụng hoạt động trên thiết bị này.",
                            color = glassColors.textSecondary,
                            fontSize = 14.sp,
                            lineHeight = 20.sp
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        StatusPill(label = "Áp dụng cho thiết bị hiện tại", color = glassColors.accent)
                    }
                }
            }

            item {
                Spacer(modifier = Modifier.height(18.dp))
                AppSectionTitle(title = "Cài đặt thông báo")
                GroupedSectionCard(
                    children = listOf(
                        { SwitchRow(title = "Điểm số", subtitle = "Thông báo khi có cập nhật đầu điểm hoặc khóa điểm.", value = grades, onChanged = { grades = it }) },
                        { SwitchRow(title = "Điểm danh", subtitle = "Nhận tin khi đi muộn, nghỉ phép hoặc thay đổi chuyên cần.", value = attendance, onChanged = { attendance = it }) },
                        { SwitchRow(title = "Dịch vụ", subtitle = "Thông báo về đăng ký, duyệt và hủy dịch vụ.", value = services, onChanged = { services = it }) },
                        { SwitchRow(title = "An toàn học đường", subtitle = "Ưu tiên các cảnh báo, phản ánh và sự vụ quan trọng.", value = safety, onChanged = { safety = it }) },
                        { SwitchRow(title = "Giờ yên lặng ban đêm", subtitle = "Giảm bớt thông báo không khẩn cấp sau 21:30.", value = quietAfterHours, onChanged = { quietAfterHours = it }) }
                    )
                )
            }

            item {
                Spacer(modifier = Modifier.height(18.dp))
                AppSectionTitle(title = "Tài khoản và bảo mật")
                GroupedSectionCard(
                    children = listOf(
                        { SwitchRow(title = "Ẩn nội dung trên màn hình khóa", subtitle = "Chỉ hiện tiêu đề ngắn, không hiện chi tiết thông báo.", value = hidePreview, onChanged = { hidePreview = it }) },
                        { SwitchRow(title = "Yêu cầu xác nhận khi mở ứng dụng", subtitle = "Bảo vệ dữ liệu khi thiết bị dùng chung.", value = requireUnlock, onChanged = { requireUnlock = it }) },
                        { SwitchRow(title = "Xác nhận trước thao tác quan trọng", subtitle = "Nhắc lại trước khi gửi phản ánh hoặc hủy đăng ký dịch vụ.", value = confirmSensitive, onChanged = { confirmSensitive = it }) },
                        {
                            ActionRow(
                                title = "Thiết bị đã đăng nhập",
                                subtitle = "Quản lý các thiết bị đang sử dụng tài khoản này.",
                                onTap = { navController.navigate("device_management") }
                            )
                        }
                    )
                )
            }

            item {
                Spacer(modifier = Modifier.height(18.dp))
                AppSectionTitle(title = "Tùy chọn ứng dụng")
                GroupedSectionCard(
                    children = listOf(
                        {
                            SwitchRow(
                                title = "Giao diện tối",
                                subtitle = "Chuyển sang chế độ nền tối để giảm mỏi mắt vào buổi tối.",
                                value = darkMode,
                                onChanged = {
                                    darkMode = it
                                    themeModeState.value = if (it) AppThemeMode.DARK else AppThemeMode.LIGHT
                                }
                            )
                        },
                        { SwitchRow(title = "Tự động đồng bộ khi mở ứng dụng", subtitle = "Cập nhật dữ liệu mới nhất ngay khi mở app.", value = autoSync, onChanged = { autoSync = it }) },
                        { SwitchRow(title = "Cho phép dùng dữ liệu di động", subtitle = "Đồng bộ khi không có Wi‑Fi.", value = mobileDataSync, onChanged = { mobileDataSync = it }) },
                        { SwitchRow(title = "Giảm chuyển động", subtitle = "Giảm hiệu ứng để cảm giác thao tác ổn định hơn.", value = reduceMotion, onChanged = { reduceMotion = it }) },
                        { SwitchRow(title = "Ghi nhớ bộ lọc gần nhất", subtitle = "Giữ lại bộ lọc ở màn điểm, lịch và dịch vụ.", value = rememberFilters, onChanged = { rememberFilters = it }) },
                        {
                            ActionRow(
                                title = "Xóa bộ nhớ tạm",
                                subtitle = "Làm mới dữ liệu đã lưu cục bộ trên thiết bị này.",
                                onTap = {
                                    Toast.makeText(context, "Đã xóa bộ nhớ tạm trên thiết bị này.", Toast.LENGTH_SHORT).show()
                                }
                            )
                        }
                    )
                )
            }

            item {
                Spacer(modifier = Modifier.height(18.dp))
                AppSectionTitle(title = "Thông tin và hỗ trợ")
                AppListTile(icon = Icons.Default.Info, title = "Giới thiệu ứng dụng", subtitle = "Phiên bản, kênh hỗ trợ và thông tin vận hành.", onTap = { navController.navigate("about_app") })
                Spacer(modifier = Modifier.height(12.dp))
                AppListTile(icon = Icons.Default.Lock, title = "Quyền riêng tư", subtitle = "Xem chính sách bảo mật dữ liệu.", onTap = { navController.navigate("privacy") })
                Spacer(modifier = Modifier.height(12.dp))
                AppListTile(icon = Icons.Default.PrivacyTip, title = "Điều khoản sử dụng", subtitle = "Quy định sử dụng ứng dụng dành cho phụ huynh.", onTap = { navController.navigate("terms") })
                Spacer(modifier = Modifier.height(12.dp))
                AppListTile(icon = Icons.Default.HelpOutline, title = "Trợ giúp", subtitle = "Hướng dẫn nhanh cho các thao tác thường dùng.", onTap = { navController.navigate("help") })
                Spacer(modifier = Modifier.height(12.dp))
                AppListTile(icon = Icons.Default.Phone, title = "Liên hệ nhà trường", subtitle = "Văn phòng học vụ • 028 3822 9988", onTap = { navController.navigate("school_contact") })
            }

            item {
                Spacer(modifier = Modifier.height(24.dp))
                SoftPrimaryButton(
                    label = "Lưu thiết lập",
                    onPressed = {
                        Toast.makeText(context, "Đã lưu các cài đặt trên thiết bị này.", Toast.LENGTH_SHORT).show()
                    }
                )
            }
        }
    }
}

@Composable
fun SwitchRow(
    title: String,
    subtitle: String,
    value: Boolean,
    onChanged: (Boolean) -> Unit,
    modifier: Modifier = Modifier
) {
    val glassColors = LocalGlassColors.current
    Row(
        modifier = modifier.fillMaxWidth(),
        verticalAlignment = Alignment.Top
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                color = glassColors.textPrimary,
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = subtitle,
                color = glassColors.textSecondary,
                fontSize = 13.sp,
                lineHeight = 18.sp
            )
        }
        Spacer(modifier = Modifier.width(12.dp))
        GlassToggle(
            value = value,
            onChanged = onChanged
        )
    }
}

@Composable
fun ActionRow(
    title: String,
    subtitle: String,
    onTap: () -> Unit,
    modifier: Modifier = Modifier
) {
    val glassColors = LocalGlassColors.current
    Row(
        modifier = modifier
            .fillMaxWidth()
            .clickable { onTap() },
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                color = glassColors.textPrimary,
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = subtitle,
                color = glassColors.textSecondary,
                fontSize = 13.sp,
                lineHeight = 18.sp
            )
        }
        Spacer(modifier = Modifier.width(12.dp))
        Icon(
            imageVector = Icons.Default.ChevronRight,
            contentDescription = null,
            tint = glassColors.textSecondary,
            modifier = Modifier.size(18.dp)
        )
    }
}

// -------------------------------------------------------------
// DOCS PAGES (Privacy, Terms, Help)
// -------------------------------------------------------------
@Composable
fun DocsScreen(
    title: String,
    subtitle: String,
    sections: List<Pair<String, String>>,
    navController: NavController,
    modifier: Modifier = Modifier
) {
    val glassColors = LocalGlassColors.current

    val listState = rememberPersistedLazyListState("docs_" + title)

    IosPageScaffold(
        title = title,
        showBack = true,
        onBackTap = { navController.popBackStack() }
    ) {
        LazyColumn(
            state = listState,
            modifier = modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = 8.dp, end = 8.dp, top = 20.dp, bottom = 40.dp)
        ) {
            item {
                AppGlassCard(
                    borderRadius = RoundedCornerShape(28.dp),
                    borderRadiusVal = 28.dp
                ) {
                    Text(
                        text = subtitle,
                        color = glassColors.textSecondary,
                        fontSize = 14.sp,
                        lineHeight = 20.sp
                    )
                }
                Spacer(modifier = Modifier.height(18.dp))
            }
            items(sections, key = { it.first }) { section ->
                Box(modifier = Modifier.padding(bottom = 12.dp)) {
                    AppGlassCard {
                        Column(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalAlignment = Alignment.Start
                        ) {
                            Text(
                                text = section.first,
                                color = glassColors.textPrimary,
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = section.second,
                                color = glassColors.textSecondary,
                                fontSize = 14.sp,
                                lineHeight = 20.sp
                            )
                        }
                    }
                }
            }
        }
    }
}

// -------------------------------------------------------------
// SCHOOL CONTACT SCREEN
// -------------------------------------------------------------
@Composable
fun SchoolContactScreen(
    navController: NavController,
    modifier: Modifier = Modifier
) {
    val glassColors = LocalGlassColors.current
    val clipboardManager = LocalClipboardManager.current
    val context = LocalContext.current

    val copyAction: (String) -> Unit = { value ->
        clipboardManager.setText(AnnotatedString(value))
        Toast.makeText(context, "Đã sao chép: $value", Toast.LENGTH_SHORT).show()
    }

    val listState = rememberPersistedLazyListState("school_contact")

    IosPageScaffold(
        title = "Liên hệ nhà trường",
        showBack = true,
        onBackTap = { navController.popBackStack() }
    ) {
        LazyColumn(
            state = listState,
            modifier = modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = 8.dp, end = 8.dp, top = 20.dp, bottom = 40.dp)
        ) {
            item {
                AppGlassCard(
                    borderRadius = RoundedCornerShape(28.dp),
                    borderRadiusVal = 28.dp
                ) {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalAlignment = Alignment.Start
                    ) {
                        Text(
                            text = "Trường THCS Nguyễn Du",
                            color = glassColors.textPrimary,
                            fontSize = 20.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "Kênh liên hệ chính thức dành cho phụ huynh.",
                            color = glassColors.textSecondary,
                            fontSize = 14.sp,
                            lineHeight = 20.sp
                        )
                    }
                }
                Spacer(modifier = Modifier.height(18.dp))
            }

            item {
                GroupedSectionCard(
                    children = listOf(
                        { CopyRow(title = "Điện thoại", value = "028 3822 9988", onCopy = copyAction) },
                        { CopyRow(title = "Email", value = "hotro.nguyendu@school.vn", onCopy = copyAction) },
                        { CopyRow(title = "Địa chỉ", value = "12 Nguyễn Bỉnh Khiêm, P. Đa Kao, Q.1, TP. Hồ Chí Minh", onCopy = copyAction) },
                        { CopyRow(title = "Giờ làm việc", value = "07:00 - 17:00 từ thứ Hai đến thứ Sáu", onCopy = copyAction) }
                    )
                )
            }
        }
    }
}

@Composable
fun CopyRow(
    title: String,
    value: String,
    onCopy: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val glassColors = LocalGlassColors.current
    Row(
        modifier = modifier.fillMaxWidth(),
        verticalAlignment = Alignment.Top
    ) {
        Text(
            text = title,
            color = glassColors.textSecondary,
            fontSize = 13.sp,
            modifier = Modifier.width(88.dp)
        )
        Text(
            text = value,
            color = glassColors.textPrimary,
            fontSize = 14.sp,
            fontWeight = FontWeight.Bold,
            lineHeight = 20.sp,
            modifier = Modifier.weight(1f)
        )
        Spacer(modifier = Modifier.width(12.dp))
        Text(
            text = "Copy",
            color = glassColors.accent,
            fontSize = 14.sp,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.clickable { onCopy(value) }
        )
    }
}

// -------------------------------------------------------------
// DEVICE MANAGEMENT SCREEN
// -------------------------------------------------------------
@Composable
fun DeviceManagementScreen(
    navController: NavController,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current

    val listState = rememberPersistedLazyListState("device_management")

    IosPageScaffold(
        title = "Thiết bị đã đăng nhập",
        showBack = true,
        onBackTap = { navController.popBackStack() }
    ) {
        LazyColumn(
            state = listState,
            modifier = modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = 8.dp, end = 8.dp, top = 20.dp, bottom = 40.dp)
        ) {
            item {
                GroupedSectionCard(
                    children = listOf(
                        { InfoRow(title = "Thiết bị", value = "Android Phone") },
                        { InfoRow(title = "Trạng thái", value = "Đang hoạt động") },
                        { InfoRow(title = "Đồng bộ gần nhất", value = "Vừa xong") }
                    )
                )
                Spacer(modifier = Modifier.height(18.dp))
                SoftSecondaryButton(
                    label = "Đăng xuất thiết bị khác",
                    onPressed = {
                        Toast.makeText(context, "Đã gửi yêu cầu đăng xuất các thiết bị khác.", Toast.LENGTH_SHORT).show()
                    }
                )
            }
        }
    }
}

// -------------------------------------------------------------
// ABOUT APP SCREEN
// -------------------------------------------------------------
@Composable
fun AboutAppScreen(
    navController: NavController,
    modifier: Modifier = Modifier
) {
    val clipboardManager = LocalClipboardManager.current
    val context = LocalContext.current

    val listState = rememberPersistedLazyListState("about_app")

    IosPageScaffold(
        title = "Giới thiệu ứng dụng",
        showBack = true,
        onBackTap = { navController.popBackStack() }
    ) {
        LazyColumn(
            state = listState,
            modifier = modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = 8.dp, end = 8.dp, top = 20.dp, bottom = 40.dp)
        ) {
            item {
                GroupedSectionCard(
                    children = listOf(
                        { InfoRow(title = "Ứng dụng", value = "Quản lý học sinh") },
                        { InfoRow(title = "Phiên bản", value = "1.0.0") },
                        { InfoRow(title = "Kênh phát hành", value = "Nội bộ") },
                        { InfoRow(title = "Hỗ trợ", value = "hotro.nguyendu@school.vn") }
                    )
                )
                Spacer(modifier = Modifier.height(18.dp))
                SoftSecondaryButton(
                    label = "Sao chép mã hỗ trợ",
                    onPressed = {
                        clipboardManager.setText(AnnotatedString("QLHS-1.0.0-ANDROID"))
                        Toast.makeText(context, "Đã sao chép mã hỗ trợ.", Toast.LENGTH_SHORT).show()
                    }
                )
            }
        }
    }
}
