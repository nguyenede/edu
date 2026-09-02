package com.app.quanlyhocsinh.shared.components

import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import kotlin.math.roundToInt
import kotlinx.coroutines.launch
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.EaseOutQuart
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.snap
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.ui.input.pointer.PointerEventPass
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.draw.shadow
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.foundation.lazy.LazyListState
import androidx.compose.foundation.lazy.rememberLazyListState
import com.app.quanlyhocsinh.state.LoadableViewModel
import com.app.quanlyhocsinh.state.LocalAppControllers
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalConfiguration
import android.content.res.Configuration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.app.quanlyhocsinh.core.theme.AppRadius
import com.app.quanlyhocsinh.core.theme.LocalGlassColors

data class AppTabItem(
    val icon: ImageVector,
    val activeIcon: ImageVector = icon,
    val label: String,
    val badgeCount: Int = 0
)

@Suppress("DEPRECATION")
@Composable
fun HapticFeedback() {
    val context = LocalContext.current
    val vibrator = remember {
        context.getSystemService(android.content.Context.VIBRATOR_SERVICE) as? Vibrator
    }
    LaunchedEffect(Unit) {
        try {
            if (vibrator != null && vibrator.hasVibrator()) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(VibrationEffect.createOneShot(15, VibrationEffect.DEFAULT_AMPLITUDE))
                } else {
                    vibrator.vibrate(15)
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}

@Suppress("DEPRECATION")
fun triggerHaptic(context: android.content.Context) {
    try {
        val vibrator = context.getSystemService(android.content.Context.VIBRATOR_SERVICE) as? Vibrator
        if (vibrator != null && vibrator.hasVibrator()) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(VibrationEffect.createOneShot(12, VibrationEffect.DEFAULT_AMPLITUDE))
            } else {
                vibrator.vibrate(12)
            }
        }
    } catch (e: Exception) {
        e.printStackTrace()
    }
}

@Composable
fun IosPageScaffold(
    title: String,
    modifier: Modifier = Modifier,
    backgroundColor: Color = LocalGlassColors.current.canvasMiddle,
    trailing: @Composable (() -> Unit)? = null,
    showBack: Boolean = false,
    onBackTap: (() -> Unit)? = null,
    body: @Composable () -> Unit
) {
    val glassColors = LocalGlassColors.current

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(backgroundColor)
    ) {
        TopHeaderBar(
            title = title,
            trailing = trailing,
            showBack = showBack,
            onBackTap = onBackTap
        )
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
        ) {
            body()
        }
    }
}

@Composable
fun TopHeaderBar(
    title: String,
    trailing: @Composable (() -> Unit)? = null,
    showBack: Boolean = false,
    onBackTap: (() -> Unit)? = null
) {
    val glassColors = LocalGlassColors.current
    val context = LocalContext.current

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .background(glassColors.surfaceStrong)
            .statusBarsPadding()
            .padding(start = 16.dp, end = 16.dp, top = 10.dp, bottom = 10.dp),
        contentAlignment = Alignment.CenterStart
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            if (showBack) {
                GlassHeaderIconButton(
                    icon = Icons.AutoMirrored.Filled.ArrowBack,
                    onTap = {
                        triggerHaptic(context)
                        onBackTap?.invoke()
                    },
                    iconSize = 19.dp
                )
                Spacer(modifier = Modifier.width(8.dp))
            }
            Text(
                text = title,
                modifier = Modifier.weight(1f),
                color = glassColors.textPrimary,
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = (-0.35).sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            if (trailing != null) {
                Spacer(modifier = Modifier.width(8.dp))
                trailing()
            }
        }
    }
}

@Composable
fun AppBottomTabBar(
    selectedTab: Int,
    items: List<AppTabItem>,
    onTap: (Int) -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val configuration = LocalConfiguration.current
    val isLandscape = configuration.orientation == Configuration.ORIENTATION_LANDSCAPE
    val glassColors = com.app.quanlyhocsinh.core.theme.LocalGlassColors.current
    val isDark = glassColors.canvasMiddle.luminance() < 0.5f
    val coroutineScope = rememberCoroutineScope()

    var isDragging by remember { mutableStateOf(false) }
    val animatable = remember { androidx.compose.animation.core.Animatable(selectedTab.toFloat()) }

    // React to programmatic tab changes (when not dragging)
    LaunchedEffect(selectedTab) {
        if (!isDragging) {
            animatable.animateTo(
                targetValue = selectedTab.toFloat(),
                animationSpec = androidx.compose.animation.core.tween(350, easing = androidx.compose.animation.core.FastOutSlowInEasing)
            )
        }
    }

    val displaySelectedIdx by remember {
        derivedStateOf {
            animatable.value.roundToInt().coerceIn(0, items.size - 1)
        }
    }

    Box(
        modifier = modifier
            .fillMaxWidth()
            .background(Color.Transparent),
        contentAlignment = Alignment.Center
    ) {
        Box(
            modifier = Modifier
                .widthIn(max = if (isLandscape) 520.dp else 460.dp)
                .fillMaxWidth()
                .padding(horizontal = 16.dp)
                .shadow(
                    elevation = 12.dp,
                    shape = RoundedCornerShape(28.dp),
                    ambientColor = Color.Black.copy(alpha = 0.1f),
                    spotColor = Color.Black.copy(alpha = 0.1f)
                )
                .background(
                    color = if (isDark) Color(0xCC1E293B) else Color(0xE6FFFFFF), // E6 = 90% opacity white, CC = 80% opacity dark
                    shape = RoundedCornerShape(28.dp)
                )
                .clip(RoundedCornerShape(28.dp)),
            contentAlignment = Alignment.Center
        ) {
            BoxWithConstraints(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(if (isLandscape) 50.dp else 60.dp)
                    .padding(horizontal = 4.dp)
                    .pointerInput(items, selectedTab) {
                        awaitPointerEventScope {
                            while (true) {
                                val down = awaitFirstDown(pass = PointerEventPass.Initial)
                                val barWidth = size.width.toFloat()
                                val slotWidth = barWidth / items.size

                                if (slotWidth > 0) {
                                    val startX = down.position.x
                                    val startSlot = (startX / slotWidth).toInt().coerceIn(0, items.size - 1)
                                    val startAnimValue = startSlot.toFloat()
                                    var hasDragged = false
                                    var lastHapticSlot = startAnimValue.roundToInt().coerceIn(0, items.size - 1)

                                    while (true) {
                                        val event = awaitPointerEvent(PointerEventPass.Initial)
                                        val pointer = event.changes.firstOrNull { it.id == down.id }
                                        if (pointer == null || !pointer.pressed) {
                                            break
                                        }
                                        
                                        val newX = pointer.position.x
                                        
                                        // Require 35px of movement before it's considered a drag to prevent sloppy taps
                                        if (!hasDragged && Math.abs(newX - startX) > 35f) {
                                            hasDragged = true
                                            isDragging = true
                                            triggerHaptic(context)
                                        }

                                        if (hasDragged) {
                                            pointer.consume() // Consume only if dragging
                                            val deltaX = newX - startX
                                            val deltaValue = deltaX / slotWidth
                                            val currentPos = (startAnimValue + deltaValue).coerceIn(0f, (items.size - 1).toFloat())
                                            coroutineScope.launch { animatable.snapTo(currentPos) }
                                            
                                            val currentSlot = currentPos.roundToInt().coerceIn(0, items.size - 1)
                                            if (currentSlot != lastHapticSlot) {
                                                lastHapticSlot = currentSlot
                                                triggerHaptic(context)
                                            }
                                        }
                                    }

                                    if (hasDragged) {
                                        isDragging = false
                                        val finalTarget = lastHapticSlot.coerceIn(0, items.size - 1)
                                        onTap(finalTarget)
                                        
                                        // Animate to target from the release point
                                        coroutineScope.launch {
                                            animatable.animateTo(
                                                targetValue = finalTarget.toFloat(),
                                                animationSpec = androidx.compose.animation.core.tween(350, easing = androidx.compose.animation.core.FastOutSlowInEasing)
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    },
                contentAlignment = Alignment.CenterStart
            ) {
                val tabCount = items.size
                if (tabCount > 0 && maxWidth > 10.dp) {
                    val slotWidth = maxWidth / tabCount
                    val pillWidth = slotWidth
                    val pillHeight = if (isLandscape) 42.dp else 52.dp

                    // Single sliding capsule backdrop linked directly to animated value
                    Box(
                        modifier = Modifier
                            .align(Alignment.CenterStart)
                            .offset {
                                val slotWidthPx = slotWidth.toPx()
                                IntOffset(x = (animatable.value * slotWidthPx).roundToInt(), y = 0)
                            }
                            .width(pillWidth)
                            .height(pillHeight)
                            .background(
                                color = if (isDark) Color(0x403B82F6) else Color(0x242563EB),
                                shape = RoundedCornerShape(26.dp)
                            )
                    )
                }

                Row(
                    modifier = Modifier.fillMaxSize(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    items.forEachIndexed { index, item ->
                        val interactionSource = remember { androidx.compose.foundation.interaction.MutableInteractionSource() }
                        val isPressed by interactionSource.collectIsPressedAsState()

                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .fillMaxHeight()
                                .clickable(
                                    interactionSource = interactionSource,
                                    indication = null
                                ) {
                                    triggerHaptic(context)
                                    onTap(index)
                                }
                        ) {
                            BottomTabItemWidget(
                                item = item,
                                selected = index == displaySelectedIdx,
                                isItemPressed = isPressed
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun BottomTabItemWidget(
    item: AppTabItem,
    selected: Boolean,
    isItemPressed: Boolean = false
) {
    val glassColors = LocalGlassColors.current

    val animatedColor by animateColorAsState(
        targetValue = if (selected) glassColors.accent else glassColors.textSecondary,
        animationSpec = tween(durationMillis = 150),
        label = "tabItemColor"
    )

    val contentScale by animateFloatAsState(
        targetValue = if (isItemPressed) 0.93f else 1.0f,
        animationSpec = tween(durationMillis = 100),
        label = "contentScale"
    )

    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        val contentModifier = Modifier.graphicsLayer {
            scaleX = contentScale
            scaleY = contentScale
        }

        Column(
            modifier = contentModifier.fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Box(
                modifier = Modifier
                    .size(24.dp)
                    .offset(y = 2.dp),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = if (selected) item.activeIcon else item.icon,
                    contentDescription = item.label,
                    tint = animatedColor,
                    modifier = Modifier.size(22.dp)
                )
                if (item.badgeCount > 0) {
                    Box(
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .offset(x = 4.dp, y = (-2).dp)
                    ) {
                        AnimatedBadge(count = item.badgeCount)
                    }
                }
            }
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = item.label,
                color = animatedColor,
                fontSize = 11.sp,
                fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
                textAlign = TextAlign.Center,
                maxLines = 1
            )
        }
    }
}



@Composable
fun GlassHeaderIconButton(
    icon: ImageVector,
    onTap: (() -> Unit)?,
    color: Color? = null,
    iconSize: Dp = 22.dp
) {
    val glassColors = LocalGlassColors.current
    val context = LocalContext.current

    val iconColor = color ?: glassColors.textPrimary
    val interactionSource = remember { MutableInteractionSource() }

    val modifier = if (onTap != null) {
        Modifier.clickable(
            interactionSource = interactionSource,
            indication = null
        ) {
            triggerHaptic(context)
            onTap()
        }
    } else {
        Modifier
    }

    Box(
        modifier = modifier.padding(4.dp),
        contentAlignment = Alignment.Center
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = iconColor,
            modifier = Modifier.size(iconSize)
        )
    }
}

@Composable
fun GlassIconButton(
    icon: ImageVector,
    onTap: (() -> Unit)?,
    size: Dp = 40.dp,
    iconSize: Dp = 20.dp,
    color: Color? = null
) {
    val glassColors = LocalGlassColors.current
    val context = LocalContext.current

    val iconColor = color ?: glassColors.textPrimary
    val interactionSource = remember { MutableInteractionSource() }

    val modifier = if (onTap != null) {
        Modifier.clickable(
            interactionSource = interactionSource,
            indication = null
        ) {
            triggerHaptic(context)
            onTap()
        }
    } else {
        Modifier
    }

    Box(
        modifier = modifier.size(size),
        contentAlignment = Alignment.Center
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = iconColor,
            modifier = Modifier.size(iconSize)
        )
    }
}

@Composable
fun AppMonogramAvatar(
    label: String,
    size: Dp = 72.dp
) {
    val glassColors = LocalGlassColors.current

    Box(
        modifier = Modifier
            .size(size)
            .clip(CircleShape)
            .background(glassColors.accent),
        contentAlignment = Alignment.Center
    ) {
        val density = LocalDensity.current
        val fontSizeSp = with(density) { (size.toPx() * 0.32f).toSp() }
        Text(
            text = label,
            color = Color.White,
            fontSize = fontSizeSp,
            fontWeight = FontWeight.Bold
        )
    }
}

@Composable
fun rememberPersistedLazyListState(
    key: String
): LazyListState {
    val app = LocalAppControllers.current
    val (savedIndex, savedOffset) = app.getScrollState(key)
    val listState = rememberLazyListState(
        initialFirstVisibleItemIndex = savedIndex,
        initialFirstVisibleItemScrollOffset = savedOffset
    )
    LaunchedEffect(listState) {
        snapshotFlow { listState.firstVisibleItemIndex to listState.firstVisibleItemScrollOffset }
            .collect { (index, offset) ->
                app.saveScrollState(key, index, offset)
            }
    }
    return listState
}
