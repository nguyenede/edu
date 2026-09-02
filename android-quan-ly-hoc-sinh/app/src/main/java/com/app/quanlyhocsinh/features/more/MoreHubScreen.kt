package com.app.quanlyhocsinh.features.more

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Assignment
import androidx.compose.material.icons.filled.ChatBubbleOutline
import androidx.compose.material.icons.filled.CheckCircleOutline
import androidx.compose.material.icons.filled.DocumentScanner
import androidx.compose.material.icons.filled.GppMaybe
import androidx.compose.material.icons.filled.MilitaryTech
import androidx.compose.material.icons.filled.ReportProblem
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material3.Text
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import com.app.quanlyhocsinh.core.theme.LocalGlassColors
import com.app.quanlyhocsinh.state.LocalAppControllers
import com.app.quanlyhocsinh.shared.components.*

@Composable
fun MoreHubScreen(
    navController: NavController,
    modifier: Modifier = Modifier
) {
    val app = LocalAppControllers.current
    val glassColors = LocalGlassColors.current

    val attendance = app.attendance
    val messages = app.messages
    val services = app.services
    val reports = app.reports

    LazyColumn(
        modifier = modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = 8.dp, end = 8.dp, top = 20.dp, bottom = 90.dp)
    ) {
        // Feature Hub Card
        item {
            AppGlassCard(
                borderRadius = RoundedCornerShape(32.dp),
                borderRadiusVal = 32.dp
            ) {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalAlignment = Alignment.Start
                ) {
                    Text(
                        text = "Trung tâm tính năng mở rộng",
                        color = glassColors.textPrimary,
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = "Theo dõi chuyên cần, khen thưởng, hồ sơ, dịch vụ, thông báo và phản ánh chỉ trong một nơi.",
                        color = glassColors.textSecondary,
                        fontSize = 13.sp,
                        lineHeight = 18.sp
                    )
                    Spacer(modifier = Modifier.height(18.dp))
                    Row(modifier = Modifier.fillMaxWidth()) {
                        Box(modifier = Modifier.weight(1f)) {
                            HubMetric(label = "Tin chưa đọc", value = messages.unreadCount.toString())
                        }
                        Spacer(modifier = Modifier.width(10.dp))
                        Box(modifier = Modifier.weight(1f)) {
                            HubMetric(label = "Đăng ký mới", value = services.registrations.value.size.toString())
                        }
                        Spacer(modifier = Modifier.width(10.dp))
                        Box(modifier = Modifier.weight(1f)) {
                            HubMetric(label = "Phản ánh", value = reports.openCount.toString())
                        }
                    }
                }
            }
        }

        // Section: Theo dõi học đường
        item {
            Spacer(modifier = Modifier.height(18.dp))
            AppSectionTitle(title = "Theo dõi học đường")
            AppListTile(
                icon = Icons.Default.CheckCircleOutline,
                title = "Điểm danh",
                subtitle = "Theo dõi có mặt, đi muộn, nghỉ phép và tỷ lệ chuyên cần.",
                onTap = { navController.navigate("attendance") }
            )
            Spacer(modifier = Modifier.height(12.dp))
            AppListTile(
                icon = Icons.Default.MilitaryTech, // fallback award icon
                title = "Khen thưởng",
                subtitle = "Xem thành tích, giấy khen và các ghi nhận tích cực.",
                onTap = { navController.navigate("awards") }
            )
            Spacer(modifier = Modifier.height(12.dp))
            AppListTile(
                icon = Icons.Default.ChatBubbleOutline,
                title = "SMS / Thông báo",
                subtitle = "Hộp thư thông báo từ nhà trường và giáo viên.",
                onTap = { navController.navigate("messages") }
            )
        }

        // Section: Hồ sơ và dịch vụ
        item {
            Spacer(modifier = Modifier.height(18.dp))
            AppSectionTitle(title = "Hồ sơ và dịch vụ")
            AppListTile(
                icon = Icons.Default.DocumentScanner,
                title = "Bổ sung hồ sơ",
                subtitle = "Cập nhật hồ sơ học sinh, phụ huynh, liên hệ khẩn cấp và giấy tờ.",
                onTap = { navController.navigate("profile_form") }
            )
            Spacer(modifier = Modifier.height(12.dp))
            AppListTile(
                icon = Icons.Default.Assignment,
                title = "Dịch vụ",
                subtitle = "Đăng ký xe đưa đón, bán trú, ăn trưa, bảo hiểm và các dịch vụ khác.",
                onTap = { navController.navigate("services") }
            )
        }

        // Section: Kỷ luật và an toàn
        item {
            Spacer(modifier = Modifier.height(18.dp))
            AppSectionTitle(title = "Kỷ luật và an toàn")
            AppListTile(
                icon = Icons.Default.Shield,
                title = "Tố cáo / Phản ánh",
                subtitle = "Gửi phản ánh nghiêm túc liên quan đến an toàn học đường và kỷ luật.",
                onTap = { navController.navigate("reports") }
            )
        }
    }
}

@Composable
fun HubMetric(
    label: String,
    value: String,
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
                fontSize = 12.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = value,
                color = glassColors.textPrimary,
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold
            )
        }
    }
}
