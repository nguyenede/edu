package com.app.quanlyhocsinh.features.root

import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ShowChart
import androidx.compose.material.icons.filled.CalendarToday
import androidx.compose.material.icons.filled.GridView
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Person
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.foundation.gestures.detectHorizontalDragGestures

import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import com.app.quanlyhocsinh.core.theme.LocalGlassColors
import com.app.quanlyhocsinh.features.home.HomeScreen
import com.app.quanlyhocsinh.features.grades.GradesScreen
import com.app.quanlyhocsinh.features.more.MoreHubScreen
import com.app.quanlyhocsinh.features.schedule.ScheduleScreen
import com.app.quanlyhocsinh.features.profile.ProfileScreen
import com.app.quanlyhocsinh.shared.components.AppBottomTabBar
import com.app.quanlyhocsinh.shared.components.AppTabItem
import kotlinx.coroutines.launch



@Composable
fun AppShell(
    navController: NavController,
    modifier: Modifier = Modifier
) {
    val glassColors = LocalGlassColors.current

    var currentTab by androidx.compose.runtime.saveable.rememberSaveable { mutableIntStateOf(0) }

    val tabItems = remember {
        listOf(
            AppTabItem(icon = Icons.Default.Home, label = "Trang chủ"),
            AppTabItem(icon = Icons.AutoMirrored.Filled.ShowChart, label = "Điểm"),
            AppTabItem(icon = Icons.Default.GridView, label = "Khác"),
            AppTabItem(icon = Icons.Default.CalendarToday, label = "Lịch"),
            AppTabItem(icon = Icons.Default.Person, label = "Thông tin")
        )
    }

    val coroutineScope = rememberCoroutineScope()
    val pageOffsets = remember { 
        List(5) { 
            androidx.compose.animation.core.Animatable(
                when {
                    it == currentTab -> 0f
                    it < currentTab -> -1f
                    else -> 1f
                }
            ) 
        } 
    }
    var dragFraction by remember { mutableFloatStateOf(0f) }
    var previousTab by androidx.compose.runtime.saveable.rememberSaveable { mutableIntStateOf(0) }
    var isDragging by remember { mutableStateOf(false) }

    val navigateToTab: (Int) -> Unit = { target ->
        if (currentTab != target) {
            if (isDragging) {
                val currentDragFrac = dragFraction
                val oldTab = currentTab
                coroutineScope.launch {
                    pageOffsets[oldTab].snapTo(currentDragFrac)
                    if (oldTab < 4) pageOffsets[oldTab + 1].snapTo(if (currentDragFrac < 0) 1f + currentDragFrac else 1f)
                    if (oldTab > 0) pageOffsets[oldTab - 1].snapTo(if (currentDragFrac > 0) -1f + currentDragFrac else -1f)
                    for (page in 0..4) {
                        if (page != oldTab && page != oldTab + 1 && page != oldTab - 1) {
                            pageOffsets[page].snapTo(if (page < oldTab) -1f else 1f)
                        }
                    }
                    isDragging = false
                    previousTab = oldTab
                    currentTab = target
                }
            } else {
                previousTab = currentTab
                currentTab = target
            }
        }
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(glassColors.canvasMiddle)
    ) {
        LaunchedEffect(currentTab) {
            if (!isDragging) {
                for (page in 0..4) {
                    val target = when {
                        page == currentTab -> 0f
                        page == previousTab -> if (currentTab > previousTab) -1f else 1f
                        else -> if (page < currentTab) -1f else 1f
                    }
                    
                    // Direct jump for non-involved pages (skips intermediate screens)
                    if (page != currentTab && page != previousTab) {
                        launch { pageOffsets[page].snapTo(target) }
                    } else {
                        launch { pageOffsets[page].animateTo(target, androidx.compose.animation.core.tween(350, easing = androidx.compose.animation.core.FastOutSlowInEasing)) }
                    }
                }
            }
        }

        BoxWithConstraints(modifier = Modifier.fillMaxSize()) {
            val screenWidth = constraints.maxWidth.toFloat()
            
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .pointerInput(currentTab) {
                        detectHorizontalDragGestures(
                            onDragStart = { _ -> 
                                isDragging = true
                                dragFraction = 0f 
                            },
                            onDragEnd = {
                                val threshold = 0.3f
                                val targetTab = when {
                                    dragFraction < -threshold && currentTab < 4 -> currentTab + 1
                                    dragFraction > threshold && currentTab > 0 -> currentTab - 1
                                    else -> currentTab
                                }
                                
                                val currentDragFrac = dragFraction
                                val oldTab = currentTab
                                
                                coroutineScope.launch {
                                    // 1. Sync animatables to current drag state seamlessly
                                    pageOffsets[oldTab].snapTo(currentDragFrac)
                                    if (oldTab < 4) pageOffsets[oldTab + 1].snapTo(if (currentDragFrac < 0) 1f + currentDragFrac else 1f)
                                    if (oldTab > 0) pageOffsets[oldTab - 1].snapTo(if (currentDragFrac > 0) -1f + currentDragFrac else -1f)
                                    for (page in 0..4) {
                                        if (page != oldTab && page != oldTab + 1 && page != oldTab - 1) {
                                            pageOffsets[page].snapTo(if (page < oldTab) -1f else 1f)
                                        }
                                    }
                                    
                                    // 2. Hand over control to Animatables
                                    isDragging = false
                                    
                                    // 3. Trigger animations or bounce back
                                    if (targetTab != oldTab) {
                                        previousTab = oldTab
                                        currentTab = targetTab
                                    } else {
                                        launch { pageOffsets[oldTab].animateTo(0f, androidx.compose.animation.core.tween(350, easing = androidx.compose.animation.core.FastOutSlowInEasing)) }
                                        if (oldTab < 4) launch { pageOffsets[oldTab + 1].animateTo(1f, androidx.compose.animation.core.tween(350, easing = androidx.compose.animation.core.FastOutSlowInEasing)) }
                                        if (oldTab > 0) launch { pageOffsets[oldTab - 1].animateTo(-1f, androidx.compose.animation.core.tween(350, easing = androidx.compose.animation.core.FastOutSlowInEasing)) }
                                    }
                                }
                            },
                            onDragCancel = {
                                val currentDragFrac = dragFraction
                                val oldTab = currentTab
                                coroutineScope.launch {
                                    pageOffsets[oldTab].snapTo(currentDragFrac)
                                    if (oldTab < 4) pageOffsets[oldTab + 1].snapTo(if (currentDragFrac < 0) 1f + currentDragFrac else 1f)
                                    if (oldTab > 0) pageOffsets[oldTab - 1].snapTo(if (currentDragFrac > 0) -1f + currentDragFrac else -1f)
                                    for (page in 0..4) {
                                        if (page != oldTab && page != oldTab + 1 && page != oldTab - 1) {
                                            pageOffsets[page].snapTo(if (page < oldTab) -1f else 1f)
                                        }
                                    }
                                    isDragging = false
                                    
                                    launch { pageOffsets[oldTab].animateTo(0f, androidx.compose.animation.core.tween(350, easing = androidx.compose.animation.core.FastOutSlowInEasing)) }
                                    if (oldTab < 4) launch { pageOffsets[oldTab + 1].animateTo(1f, androidx.compose.animation.core.tween(350, easing = androidx.compose.animation.core.FastOutSlowInEasing)) }
                                    if (oldTab > 0) launch { pageOffsets[oldTab - 1].animateTo(-1f, androidx.compose.animation.core.tween(350, easing = androidx.compose.animation.core.FastOutSlowInEasing)) }
                                }
                            }
                        ) { change: androidx.compose.ui.input.pointer.PointerInputChange, dragAmount: Float ->
                            change.consume()
                            var newFraction = dragFraction + (dragAmount / screenWidth)
                            
                            // Edge resistance
                            if ((currentTab == 0 && newFraction > 0f) || (currentTab == 4 && newFraction < 0f)) {
                                newFraction = dragFraction + ((dragAmount * 0.2f) / screenWidth)
                            }
                            dragFraction = newFraction
                        }
                    }
            ) {
                // Draw non-active pages first
                for (page in 0..4) {
                    if (page == currentTab) continue
                    
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .graphicsLayer {
                                val offset = if (isDragging) {
                                    when {
                                        page == currentTab + 1 && dragFraction < 0 -> 1f + dragFraction
                                        page == currentTab - 1 && dragFraction > 0 -> -1f + dragFraction
                                        else -> if (page < currentTab) -1f else 1f
                                    }
                                } else {
                                    pageOffsets[page].value
                                }

                                val isVisible = offset > -0.999f && offset < 0.999f
                                translationX = offset * size.width
                                this.alpha = if (isVisible) 1f else 0f
                            }
                    ) {
                        when (page) {
                            0 -> HomeScreen(navController = navController, onNavigateToTab = navigateToTab)
                            1 -> GradesScreen(navController = navController)
                            2 -> MoreHubScreen(navController = navController, modifier = Modifier.statusBarsPadding())
                            3 -> ScheduleScreen()
                            4 -> ProfileScreen(navController = navController)
                        }
                    }
                }
                
                // Draw active page last (on top)
                val activePage = currentTab

                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .graphicsLayer {
                            val offset = if (isDragging) dragFraction else pageOffsets[activePage].value
                            val isVisible = offset > -0.999f && offset < 0.999f
                            
                            translationX = offset * size.width
                            this.alpha = if (isVisible) 1f else 0f
                        }
                ) {
                    when (activePage) {
                        0 -> HomeScreen(navController = navController, onNavigateToTab = navigateToTab)
                        1 -> GradesScreen(navController = navController)
                        2 -> MoreHubScreen(navController = navController, modifier = Modifier.statusBarsPadding())
                        3 -> ScheduleScreen()
                        4 -> ProfileScreen(navController = navController)
                    }
                }
            }
        }



        // Clean Floating Bottom Tab Bar (Zero bottom scrim, zero black bar overlay)
        Box(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .windowInsetsPadding(WindowInsets.navigationBars)
                .padding(bottom = 7.dp)
        ) {
            AppBottomTabBar(
                selectedTab = currentTab,
                items = tabItems,
                onTap = navigateToTab
            )
        }
    }
}
