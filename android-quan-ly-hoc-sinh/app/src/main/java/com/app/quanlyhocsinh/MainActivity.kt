package com.app.quanlyhocsinh

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.SystemBarStyle
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.core.view.WindowCompat
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.compose.animation.core.tween
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.EnterTransition
import androidx.compose.animation.ExitTransition
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.ui.Alignment
import androidx.compose.ui.graphics.Color
import com.app.quanlyhocsinh.core.theme.QuanLyHocSinhTheme
import com.app.quanlyhocsinh.core.theme.LocalGlassColors
import com.app.quanlyhocsinh.data.repository.SchoolRepository
import com.app.quanlyhocsinh.features.splash.SplashPage
import com.app.quanlyhocsinh.features.root.AppShell
import com.app.quanlyhocsinh.features.grades.GradesScreen
import com.app.quanlyhocsinh.features.grades.SubjectDetailScreen
import com.app.quanlyhocsinh.features.schedule.ScheduleScreen
import com.app.quanlyhocsinh.features.more.*
import com.app.quanlyhocsinh.features.profile.*
import com.app.quanlyhocsinh.state.AppControllers
import com.app.quanlyhocsinh.state.AppThemeMode
import com.app.quanlyhocsinh.state.LocalAppControllers
import com.app.quanlyhocsinh.state.LocalThemeMode
import com.app.quanlyhocsinh.state.LocalBreathAnimation
import com.app.quanlyhocsinh.state.LocalHapticEnabled

import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.tween
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.FastOutSlowInEasing

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        WindowCompat.setDecorFitsSystemWindows(window, false)
        if (android.os.Build.VERSION.SDK_INT >= 29) {
            window.isNavigationBarContrastEnforced = false
        }
        window.navigationBarColor = android.graphics.Color.TRANSPARENT
        window.statusBarColor = android.graphics.Color.TRANSPARENT
        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.dark(android.graphics.Color.TRANSPARENT),
            navigationBarStyle = SystemBarStyle.dark(android.graphics.Color.TRANSPARENT)
        )
        super.onCreate(savedInstanceState)
        setContent {
            // Theme Mode state
            val themeModeState = remember { mutableStateOf(AppThemeMode.LIGHT) }
            val themeMode = themeModeState.value
            val context = LocalContext.current
            LaunchedEffect(themeMode) {
                val activity = context as? ComponentActivity ?: return@LaunchedEffect
                val isDark = themeMode == AppThemeMode.DARK
                if (android.os.Build.VERSION.SDK_INT >= 29) {
                    activity.window.isNavigationBarContrastEnforced = false
                }
                activity.window.navigationBarColor = android.graphics.Color.TRANSPARENT
                activity.window.statusBarColor = android.graphics.Color.TRANSPARENT
                activity.enableEdgeToEdge(
                    statusBarStyle = SystemBarStyle.dark(android.graphics.Color.TRANSPARENT),
                    navigationBarStyle = SystemBarStyle.dark(android.graphics.Color.TRANSPARENT)
                )
            }
            
            val repository = remember { SchoolRepository() }
            val controllers = remember { AppControllers(repository) }

            // Bootstrap status states
            val isReady = remember { mutableStateOf(false) }

            // Initialize app controllers with simulated delay
            LaunchedEffect(Unit) {
                try {
                    controllers.initialize()
                    kotlinx.coroutines.delay(1400) // matches splash animation duration
                    isReady.value = true
                } catch (e: Exception) {
                    // Ignore for now
                }
            }

            // Infinite breath/pulse animation
            val infiniteTransition = rememberInfiniteTransition(label = "breathTransition")
            val breathAnim = infiniteTransition.animateFloat(
                initialValue = 0f,
                targetValue = 1f,
                animationSpec = infiniteRepeatable(
                    animation = tween(durationMillis = 3000, easing = FastOutSlowInEasing),
                    repeatMode = RepeatMode.Reverse
                ),
                label = "breathFloat"
            )

            val hapticEnabled = remember { mutableStateOf(true) }

            CompositionLocalProvider(
                LocalAppControllers provides controllers,
                LocalThemeMode provides themeModeState,
                LocalBreathAnimation provides breathAnim,
                LocalHapticEnabled provides hapticEnabled
            ) {
                QuanLyHocSinhTheme(darkTheme = themeMode == AppThemeMode.DARK) {
                    val glassColors = LocalGlassColors.current
                    Surface(
                        modifier = Modifier.fillMaxSize(),
                        color = glassColors.canvasMiddle
                    ) {
                        if (!isReady.value) {
                            SplashPage()
                        } else {
                            val navController = rememberNavController()
                            Box(modifier = Modifier.fillMaxSize()) {
                                NavHost(
                                    navController = navController,
                                    startDestination = "auth",
                                enterTransition = {
                                    slideInHorizontally(
                                        initialOffsetX = { it },
                                        animationSpec = tween(350, easing = FastOutSlowInEasing)
                                    )
                                },
                                exitTransition = {
                                    slideOutHorizontally(
                                        targetOffsetX = { -it / 3 },
                                        animationSpec = tween(350, easing = FastOutSlowInEasing)
                                    ) + fadeOut(animationSpec = tween(350))
                                },
                                popEnterTransition = {
                                    slideInHorizontally(
                                        initialOffsetX = { -it / 3 },
                                        animationSpec = tween(350, easing = FastOutSlowInEasing)
                                    ) + fadeIn(animationSpec = tween(350))
                                },
                                popExitTransition = {
                                    slideOutHorizontally(
                                        targetOffsetX = { it },
                                        animationSpec = tween(350, easing = FastOutSlowInEasing)
                                    )
                                }
                            ) {
                                composable(
                                    route = "auth",
                                    enterTransition = { EnterTransition.None },
                                    exitTransition = { ExitTransition.None },
                                    popEnterTransition = { EnterTransition.None },
                                    popExitTransition = { ExitTransition.None }
                                ) {
                                    com.app.quanlyhocsinh.features.auth.AuthScreen(navController = navController)
                                }
                                composable(
                                    route = "root",
                                    enterTransition = { EnterTransition.None },
                                    exitTransition = { ExitTransition.None },
                                    popEnterTransition = { EnterTransition.None },
                                    popExitTransition = { ExitTransition.None }
                                ) {
                                    AppShell(navController = navController)
                                }
                                composable("grades") {
                                    GradesScreen(navController = navController)
                                }
                                composable("subject_detail/{subjectId}") { backStackEntry ->
                                    val subjectId = backStackEntry.arguments?.getString("subjectId") ?: ""
                                    SubjectDetailScreen(
                                        navController = navController,
                                        subjectId = subjectId
                                    )
                                }
                                composable("schedule") {
                                    ScheduleScreen()
                                }

                                // More Hub & Sub-pages
                                composable("more_hub") {
                                    MoreHubScreen(navController = navController)
                                }
                                composable("profile_form") {
                                    ProfileFormScreen(navController = navController)
                                }
                                composable("attendance") {
                                    AttendanceScreen(navController = navController)
                                }
                                composable("awards") {
                                    AwardsScreen(navController = navController)
                                }
                                composable("messages") {
                                    MessagesScreen(navController = navController)
                                }
                                composable("services") {
                                    ServicesScreen(navController = navController)
                                }
                                composable("reports") {
                                    ReportsScreen(navController = navController)
                                }
                                
                                // Profile Sub-pages
                                composable("settings") {
                                    SettingsScreen(navController = navController)
                                }
                                composable("profile_overview") {
                                    ProfileOverviewScreen(navController = navController)
                                }
                                composable("privacy") {
                                    DocsScreen(
                                        navController = navController,
                                        title = "Quyền riêng tư",
                                        subtitle = "Thông tin minh bạch về dữ liệu học sinh và phụ huynh.",
                                        sections = listOf(
                                            "Dữ liệu được lưu" to "Ứng dụng lưu hồ sơ, điểm số, chuyên cần, thông báo và lịch học để phụ huynh theo dõi học sinh thuận tiện hơn.",
                                            "Cam kết bảo mật" to "Toàn bộ dữ liệu được mã hóa và không chia sẻ cho bên thứ 3 nào khác ngoài hệ thống nhà trường."
                                        )
                                    )
                                }
                                composable("terms") {
                                    DocsScreen(
                                        navController = navController,
                                        title = "Điều khoản sử dụng",
                                        subtitle = "Quy định sử dụng ứng dụng dành cho phụ huynh.",
                                        sections = listOf(
                                            "Trách nhiệm người dùng" to "Phụ huynh cần bảo mật tài khoản cá nhân và theo dõi sát thông báo từ nhà trường.",
                                            "Vi phạm và Xử lý" to "Hành vi sử dụng ứng dụng sai mục đích sẽ bị khóa tài khoản."
                                        )
                                    )
                                }
                                composable("help") {
                                    DocsScreen(
                                        navController = navController,
                                        title = "Trợ giúp",
                                        subtitle = "Hướng dẫn nhanh cho các thao tác thường dùng.",
                                        sections = listOf(
                                            "Xem điểm số" to "Nhấn vào tab 'Điểm' ở thanh menu dưới cùng. Chọn từng môn để xem điểm chi tiết.",
                                            "Xin phép nghỉ học" to "Vào tab 'Khác' -> 'Chuyên cần & Khen thưởng' để gửi đơn xin phép."
                                        )
                                    )
                                }
                                composable("school_contact") {
                                    SchoolContactScreen(navController = navController)
                                }
                                composable("about_app") {
                                    AboutAppScreen(navController = navController)
                                }
                                composable("device_management") {
                                    DeviceManagementScreen(navController = navController)
                                }
                            }

                            // Global translucent white gesture bar overlay
                            Box(
                                modifier = Modifier
                                    .align(Alignment.BottomCenter)
                                    .fillMaxWidth()
                                    .windowInsetsPadding(WindowInsets.navigationBars)
                                    .background(Color(0xCCFFFFFF)) // 80% opaque white
                            )
                        }
                        }
                    }
                }
            }
        }
    }
}
