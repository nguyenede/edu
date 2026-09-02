package com.app.quanlyhocsinh.features.home

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.center
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import com.app.quanlyhocsinh.R
import com.app.quanlyhocsinh.core.theme.AppRadius
import com.app.quanlyhocsinh.core.theme.LocalGlassColors
import com.app.quanlyhocsinh.shared.components.*
import com.app.quanlyhocsinh.state.LocalAppControllers
import com.app.quanlyhocsinh.state.LocalBreathAnimation
import kotlinx.coroutines.launch

// Custom modifier to draw Dong Son drum pattern watermark in the background
fun Modifier.dongSonWatermark(color: Color) = this.drawBehind {
    val center = this.size.center
    val radiusMax = size.minDimension / 1.4f
    
    // Draw concentric circles
    drawCircle(color, radius = radiusMax * 0.95f, style = Stroke(width = 1.dp.toPx()))
    drawCircle(color, radius = radiusMax * 0.85f, style = Stroke(width = 1.dp.toPx()))
    drawCircle(color, radius = radiusMax * 0.70f, style = Stroke(width = 1.dp.toPx()))
    drawCircle(color, radius = radiusMax * 0.55f, style = Stroke(width = 1.5f.dp.toPx()))
    drawCircle(color, radius = radiusMax * 0.40f, style = Stroke(width = 1.dp.toPx()))
    drawCircle(color, radius = radiusMax * 0.25f, style = Stroke(width = 2.dp.toPx()))

    // Draw central star with 12 points
    val path = Path()
    val pointsCount = 24
    for (i in 0 until pointsCount) {
        val angle = (i * (360f / pointsCount)) * (Math.PI / 180).toFloat()
        val r = if (i % 2 == 0) radiusMax * 0.22f else radiusMax * 0.08f
        val x = center.x + r * kotlin.math.cos(angle)
        val y = center.y + r * kotlin.math.sin(angle)
        if (i == 0) path.moveTo(x, y) else path.lineTo(x, y)
    }
    path.close()
    drawPath(path, color = color)
}

// Draw a stylized lotus watermark inside cards
fun DrawScope.drawLotusWatermark(color: Color) {
    val w = size.width
    val h = size.height
    
    // Draw lotus petals at the bottom-right corner of the card
    val path = Path().apply {
        // Middle petal
        moveTo(w - 24.dp.toPx(), h - 6.dp.toPx())
        cubicTo(w - 30.dp.toPx(), h - 22.dp.toPx(), w - 24.dp.toPx(), h - 38.dp.toPx(), w - 24.dp.toPx(), h - 50.dp.toPx())
        cubicTo(w - 24.dp.toPx(), h - 38.dp.toPx(), w - 18.dp.toPx(), h - 22.dp.toPx(), w - 24.dp.toPx(), h - 6.dp.toPx())
        
        // Left petal
        moveTo(w - 24.dp.toPx(), h - 6.dp.toPx())
        cubicTo(w - 40.dp.toPx(), h - 14.dp.toPx(), w - 46.dp.toPx(), h - 28.dp.toPx(), w - 42.dp.toPx(), h - 42.dp.toPx())
        cubicTo(w - 34.dp.toPx(), h - 32.dp.toPx(), w - 28.dp.toPx(), h - 20.dp.toPx(), w - 24.dp.toPx(), h - 6.dp.toPx())
        
        // Right petal
        moveTo(w - 24.dp.toPx(), h - 6.dp.toPx())
        cubicTo(w - 8.dp.toPx(), h - 14.dp.toPx(), w - 2.dp.toPx(), h - 28.dp.toPx(), w - 6.dp.toPx(), h - 42.dp.toPx())
        cubicTo(w - 14.dp.toPx(), h - 32.dp.toPx(), w - 20.dp.toPx(), h - 20.dp.toPx(), w - 24.dp.toPx(), h - 6.dp.toPx())
        
        // Outer left petal
        moveTo(w - 24.dp.toPx(), h - 6.dp.toPx())
        cubicTo(w - 46.dp.toPx(), h - 8.dp.toPx(), w - 52.dp.toPx(), h - 18.dp.toPx(), w - 48.dp.toPx(), h - 28.dp.toPx())
        cubicTo(w - 38.dp.toPx(), h - 22.dp.toPx(), w - 32.dp.toPx(), h - 14.dp.toPx(), w - 24.dp.toPx(), h - 6.dp.toPx())

        // Outer right petal
        moveTo(w - 24.dp.toPx(), h - 6.dp.toPx())
        cubicTo(w - 2.dp.toPx(), h - 8.dp.toPx(), w - 4.dp.toPx(), h - 18.dp.toPx(), w - 0.dp.toPx(), h - 28.dp.toPx())
        cubicTo(w - 10.dp.toPx(), h - 22.dp.toPx(), w - 16.dp.toPx(), h - 14.dp.toPx(), w - 24.dp.toPx(), h - 6.dp.toPx())
    }
    drawPath(path, color = color)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    navController: NavController,
    onNavigateToTab: (Int) -> Unit,
    modifier: Modifier = Modifier
) {
    val app = LocalAppControllers.current
    val glassColors = LocalGlassColors.current
    val breathAnim = LocalBreathAnimation.current

    val profile = app.profile.bundle
    val grades = app.grades
    val messages = app.messages

    if (profile == null) {
        HomeSkeleton()
        return
    }

    val listState = rememberPersistedLazyListState("home")

    IosPageScaffold(
        title = "Trang Chủ",
        backgroundColor = Color.White,
        modifier = modifier
    ) {
        LazyColumn(
                state = listState,
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 16.dp, bottom = 90.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // 1. Student Header Card with viet_nam.png background
                item {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(115.dp)
                            .clip(RoundedCornerShape(20.dp))
                    ) {
                        Image(
                            painter = painterResource(id = R.drawable.viet_nam),
                            contentDescription = null,
                            contentScale = ContentScale.Crop,
                            modifier = Modifier.fillMaxSize()
                        )
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .background(
                                    Brush.verticalGradient(
                                        colors = listOf(Color(0x22000000), Color(0x66000000))
                                    )
                                )
                        )
                        Row(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(56.dp)
                                    .background(Color(0x33FFFFFF), CircleShape)
                                    .border(1.dp, Color(0x66FFFFFF), CircleShape),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = profile.student.name.firstOrNull()?.toString() ?: "K",
                                    color = Color.White,
                                    fontSize = 22.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                            Spacer(modifier = Modifier.width(14.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = "Học sinh lớp ${profile.student.className} (2025 - 2026)",
                                    color = Color(0xE6FFFFFF),
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Medium
                                )
                                Spacer(modifier = Modifier.height(2.dp))
                                Text(
                                    text = profile.student.name,
                                    color = Color.White,
                                    fontSize = 20.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }
                }

                // 2. Greeting Yellow Card
                item {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(84.dp)
                            .background(Color(0xFFFCD34D), RoundedCornerShape(20.dp))
                            .clip(RoundedCornerShape(20.dp))
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(horizontal = 20.dp),
                            verticalArrangement = Arrangement.Center,
                            horizontalAlignment = Alignment.Start
                        ) {
                            Text(
                                text = "Chào mừng, Minh Khôi!",
                                color = Color(0xFF1E293B),
                                fontSize = 17.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Spacer(modifier = Modifier.height(3.dp))
                            Text(
                                text = "Bắt đầu ngày học tập nào.",
                                color = Color(0xFF475569),
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }
                }

                // 3. Tóm tắt Hôm nay
                item {
                    Column(modifier = Modifier.fillMaxWidth()) {
                        Text(
                            text = "Tóm tắt Hôm nay",
                            color = Color(0xFF0F172A),
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            // Chuyên cần Card
                            Box(
                                modifier = Modifier
                                    .weight(1f)
                                    .height(76.dp)
                                    .background(Color.White, RoundedCornerShape(16.dp))
                                    .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(16.dp))
                                    .drawBehind { drawLotusWatermark(Color(0x05D97706)) }
                                    .padding(12.dp)
                            ) {
                                Column(modifier = Modifier.fillMaxSize(), verticalArrangement = Arrangement.Center) {
                                    Text(
                                        text = "Chuyên cần",
                                        color = Color(0xFF64748B),
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.Medium
                                    )
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Text(
                                            text = "Vắng: 1 buổi",
                                            color = Color(0xFF1E293B),
                                            fontSize = 15.sp,
                                            fontWeight = FontWeight.Bold
                                        )
                                        Text(
                                            text = " (có phép)",
                                            color = Color(0xFF64748B),
                                            fontSize = 12.sp
                                        )
                                    }
                                }
                            }

                            // Điểm số mới nhất Card
                            Box(
                                modifier = Modifier
                                    .weight(1f)
                                    .height(76.dp)
                                    .background(Color.White, RoundedCornerShape(16.dp))
                                    .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(16.dp))
                                    .drawBehind { drawLotusWatermark(Color(0x05D97706)) }
                                    .padding(12.dp)
                            ) {
                                Column(modifier = Modifier.fillMaxSize(), verticalArrangement = Arrangement.Center) {
                                    Text(
                                        text = "Điểm số mới nhất",
                                        color = Color(0xFF64748B),
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.Medium
                                    )
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text(
                                        text = "Toán HK2: 8.5",
                                        color = Color(0xFF1E293B),
                                        fontSize = 15.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            }
                        }
                    }
                }

                // 4. Grid of 11 functional icons
                item {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        val row1 = listOf(
                            GridItemData("Điểm số", Icons.Default.ShowChart, Color(0xFFEFF6FF), Color(0xFF2563EB), "grades_push"),
                            GridItemData("Điểm danh", Icons.Default.CalendarToday, Color(0xFFFEF2F2), Color(0xFFDC2626), "attendance"),
                            GridItemData("Lịch học", Icons.Default.Schedule, Color(0xFFECFDF5), Color(0xFF059669), "schedule_push"),
                            GridItemData("Bài tập", Icons.Default.Assignment, Color(0xFFFFF7ED), Color(0xFFEA580C), "services")
                        )
                        val row2 = listOf(
                            GridItemData("Khen thưởng", Icons.Default.Star, Color(0xFFFEF3C7), Color(0xFFD97706), "awards"),
                            GridItemData("Hồ sơ", Icons.Default.ContactPage, Color(0xFFFFF1F2), Color(0xFFE11D48), "profile_overview"),
                            GridItemData("Thông báo", Icons.Default.Notifications, Color(0xFFF5F3FF), Color(0xFF7C3AED), "messages"),
                            GridItemData("Thư viện", Icons.Default.MenuBook, Color(0xFFF0FDF4), Color(0xFF16A34A), "about_app")
                        )
                        val row3 = listOf(
                            GridItemData("Liên hệ GV", Icons.Default.Forum, Color(0xFFECFEFF), Color(0xFF0891B2), "messages"),
                            GridItemData("Khảo sát", Icons.Default.FactCheck, Color(0xFFFAF5FF), Color(0xFF9333EA), "reports"),
                            GridItemData("Học phí", Icons.Default.Payments, Color(0xFFF0FDF4), Color(0xFF16A34A), "services")
                        )

                        GridRowLayout(items = row1, navController = navController)
                        GridRowLayout(items = row2, navController = navController)
                        GridRowLayout(items = row3, navController = navController, fillWithEmpty = true)
                    }
                }

                // 5. School News & Favorite utilities
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        // School News (55% width)
                        Column(modifier = Modifier.weight(0.55f)) {
                            Text(
                                text = "Bảng tin trường",
                                color = Color(0xFF0F172A),
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(130.dp)
                                    .background(Color.White, RoundedCornerShape(16.dp))
                                    .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(16.dp))
                                    .clip(RoundedCornerShape(16.dp))
                            ) {
                                Column(modifier = Modifier.fillMaxSize()) {
                                    Image(
                                        painter = painterResource(id = R.drawable.img_school_news),
                                        contentDescription = null,
                                        contentScale = ContentScale.Crop,
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .height(90.dp)
                                    )
                                    Box(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .weight(1f)
                                            .padding(horizontal = 10.dp),
                                        contentAlignment = Alignment.CenterStart
                                    ) {
                                        Text(
                                            text = "Lịch thi học kỳ 2",
                                            color = Color(0xFF1E293B),
                                            fontSize = 13.sp,
                                            fontWeight = FontWeight.Bold,
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis
                                        )
                                    }
                                }
                            }
                        }

                        // Favorite utilities (45% width)
                        Column(modifier = Modifier.weight(0.45f)) {
                            Text(
                                text = "Favorite utilities",
                                color = Color(0xFF0F172A),
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                // Sách điện tử
                                Box(
                                    modifier = Modifier
                                        .weight(1f)
                                        .height(130.dp)
                                        .background(Color.White, RoundedCornerShape(16.dp))
                                        .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(16.dp))
                                        .clip(RoundedCornerShape(16.dp))
                                        .clickable { navController.navigate("about_app") }
                                        .padding(10.dp),
                                    contentAlignment = Alignment.TopStart
                                ) {
                                    Column(
                                        modifier = Modifier.fillMaxSize(),
                                        verticalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Box(
                                            modifier = Modifier
                                                .size(36.dp)
                                                .background(Color(0xFFFEF3C7), CircleShape),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Icon(
                                                imageVector = Icons.Default.ImportContacts,
                                                contentDescription = null,
                                                tint = Color(0xFFD97706),
                                                modifier = Modifier.size(18.dp)
                                            )
                                        }
                                        Text(
                                            text = "Sách điện tử",
                                            color = Color(0xFF1E293B),
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.Bold
                                        )
                                    }
                                }

                                // Liên hệ GV
                                Box(
                                    modifier = Modifier
                                        .weight(1f)
                                        .height(130.dp)
                                        .background(Color.White, RoundedCornerShape(16.dp))
                                        .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(16.dp))
                                        .clip(RoundedCornerShape(16.dp))
                                        .clickable { navController.navigate("messages") }
                                        .padding(10.dp),
                                    contentAlignment = Alignment.TopStart
                                ) {
                                    Column(
                                        modifier = Modifier.fillMaxSize(),
                                        verticalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Box(
                                            modifier = Modifier
                                                .size(36.dp)
                                                .background(Color(0xFFE0F7FA), CircleShape),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Icon(
                                                imageVector = Icons.Default.Forum,
                                                contentDescription = null,
                                                tint = Color(0xFF00ACC1),
                                                modifier = Modifier.size(18.dp)
                                            )
                                        }
                                        Text(
                                            text = "Liên hệ GV",
                                            color = Color(0xFF1E293B),
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.Bold
                                        )
                                    }
                                }
                            }
                        }
                    }
                }

                // 6. Hỗ trợ học tập
                item {
                    Column(modifier = Modifier.fillMaxWidth()) {
                        Text(
                            text = "Hỗ trợ học tập",
                            color = Color(0xFF0F172A),
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            // Nhịp học tập card (takes more space)
                            Box(
                                modifier = Modifier
                                    .weight(1.8f)
                                    .height(96.dp)
                                    .background(Color.White, RoundedCornerShape(16.dp))
                                    .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(16.dp))
                                    .padding(12.dp)
                            ) {
                                Column(
                                    modifier = Modifier.fillMaxSize(),
                                    verticalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text(
                                        text = "Nhịp học tập",
                                        color = Color(0xFF0F172A),
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                        Text(
                                            text = "🇬🇧 Môn nổi bật: Ngoại ngữ",
                                            color = Color(0xFF475569),
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.Medium
                                        )
                                        Text(
                                            text = "🧪 Môn cần chú ý: KHTN",
                                            color = Color(0xFF475569),
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.Medium
                                        )
                                    }
                                    // Custom segmented/gradient progress bar
                                    Canvas(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .height(6.dp)
                                    ) {
                                        drawRoundRect(
                                            color = Color(0xFFE2E8F0),
                                            size = this.size,
                                            cornerRadius = CornerRadius(3.dp.toPx(), 3.dp.toPx())
                                        )
                                        // Blue segment
                                        drawRoundRect(
                                            brush = Brush.horizontalGradient(listOf(Color(0xFF3B82F6), Color(0xFF60A5FA))),
                                            size = this.size.copy(width = this.size.width * 0.45f),
                                            cornerRadius = CornerRadius(3.dp.toPx(), 3.dp.toPx())
                                        )
                                        // Green segment
                                        drawRoundRect(
                                            brush = Brush.horizontalGradient(listOf(Color(0xFF10B981), Color(0xFF34D399))),
                                            topLeft = Offset(this.size.width * 0.45f, 0f),
                                            size = this.size.copy(width = this.size.width * 0.35f),
                                            cornerRadius = CornerRadius(3.dp.toPx(), 3.dp.toPx())
                                        )
                                    }
                                }
                            }

                            // Khảo sát card
                            Box(
                                modifier = Modifier
                                    .weight(1f)
                                    .height(96.dp)
                                    .background(Color(0xFFEFF6FF), RoundedCornerShape(16.dp))
                                    .border(1.dp, Color(0xFFDBEAFE), RoundedCornerShape(16.dp))
                                    .clip(RoundedCornerShape(16.dp))
                                    .clickable { navController.navigate("reports") }
                                    .padding(10.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Column(
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                    verticalArrangement = Arrangement.Center
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.FactCheck,
                                        contentDescription = null,
                                        tint = Color(0xFF2563EB),
                                        modifier = Modifier.size(24.dp)
                                    )
                                    Spacer(modifier = Modifier.height(6.dp))
                                    Text(
                                        text = "Khảo sát",
                                        color = Color(0xFF1E293B),
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            }

                            // Học phí card
                            Box(
                                modifier = Modifier
                                    .weight(1f)
                                    .height(96.dp)
                                    .background(Color(0xFFFEF3C7), RoundedCornerShape(16.dp))
                                    .border(1.dp, Color(0xFFFEEB97), RoundedCornerShape(16.dp))
                                    .clip(RoundedCornerShape(16.dp))
                                    .clickable { navController.navigate("services") }
                                    .padding(10.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Column(
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                    verticalArrangement = Arrangement.Center
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Payments,
                                        contentDescription = null,
                                        tint = Color(0xFFD97706),
                                        modifier = Modifier.size(24.dp)
                                    )
                                    Spacer(modifier = Modifier.height(6.dp))
                                    Text(
                                        text = "Học phí",
                                        color = Color(0xFF1E293B),
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            }
                        }
                    }
                }
            }
    }
}

// Data class for functional grid items
data class GridItemData(
    val label: String,
    val icon: ImageVector,
    val bgColor: Color,
    val tintColor: Color,
    val route: String
)

// Composable for a row in the functional grid
@Composable
fun GridRowLayout(
    items: List<GridItemData>,
    navController: NavController,
    fillWithEmpty: Boolean = false
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        items.forEach { item ->
            Column(
                modifier = Modifier
                    .width(76.dp)
                    .clickable { navController.navigate(item.route) },
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Box(
                    modifier = Modifier
                        .size(52.dp)
                        .background(item.bgColor, RoundedCornerShape(14.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = item.icon,
                        contentDescription = null,
                        tint = item.tintColor,
                        modifier = Modifier.size(24.dp)
                    )
                }
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = item.label,
                    color = Color(0xFF1E293B),
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium,
                    textAlign = TextAlign.Center,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
        
        // If row 3 has only 3 items, fill up the remaining space to align columns nicely
        if (fillWithEmpty && items.size < 4) {
            repeat(4 - items.size) {
                Spacer(modifier = Modifier.width(76.dp))
            }
        }
    }
}
