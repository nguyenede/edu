package com.app.quanlyhocsinh.shared.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Surface
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Paint
import androidx.compose.ui.graphics.drawscope.drawIntoCanvas
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.composed
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.app.quanlyhocsinh.core.theme.AppRadius
import com.app.quanlyhocsinh.core.theme.LocalGlassColors

enum class GlassCardTone {
    REGULAR,
    ELEVATED,
    ACCENT,
    MUTED
}

// AppGlassCard redesign to flat iOS solid card matching the Grades screen
@Composable
fun AppGlassCard(
    modifier: Modifier = Modifier,
    padding: Dp = 18.dp,
    borderRadius: RoundedCornerShape = AppRadius.mediumShape,
    borderRadiusVal: Dp = AppRadius.medium,
    onTap: (() -> Unit)? = null,
    tone: GlassCardTone = GlassCardTone.REGULAR,
    breathAnimation: State<Float>? = null,
    content: @Composable () -> Unit
) {
    val glassColors = LocalGlassColors.current
    val baseColor = when (tone) {
        GlassCardTone.REGULAR -> glassColors.surface
        GlassCardTone.ELEVATED -> glassColors.surfaceStrong
        GlassCardTone.ACCENT -> glassColors.accentSoft
        GlassCardTone.MUTED -> glassColors.surfaceMuted
    }

    val isElevated = tone == GlassCardTone.ELEVATED || tone == GlassCardTone.ACCENT

    // Haptic & Scale on press setup
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()

    val scale by animateFloatAsState(
        targetValue = if (isPressed && onTap != null) 0.96f else 1.0f,
        animationSpec = spring(
            dampingRatio = 0.7f,
            stiffness = 300f
        ),
        label = "scale"
    )

    Surface(
        modifier = modifier
            .graphicsLayer {
                scaleX = scale
                scaleY = scale
            }
            .clickable(
                enabled = onTap != null,
                interactionSource = interactionSource,
                indication = null
            ) {
                onTap?.invoke()
            },
        shape = borderRadius,
        color = baseColor,
        shadowElevation = 0.dp
    ) {
        Box(modifier = Modifier.padding(padding)) {
            content()
        }
    }
}
