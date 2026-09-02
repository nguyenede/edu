package com.app.quanlyhocsinh.features.splash

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.app.quanlyhocsinh.core.theme.LocalGlassColors
import com.app.quanlyhocsinh.shared.components.AppGlassCard
import com.app.quanlyhocsinh.shared.components.AppMonogramAvatar
import kotlinx.coroutines.delay

@Composable
fun SplashPage(
    modifier: Modifier = Modifier
) {
    val glassColors = LocalGlassColors.current

    // Animation progress
    val animationProgress = remember { Animatable(0f) }

    LaunchedEffect(Unit) {
        animationProgress.animateTo(
            targetValue = 1f,
            animationSpec = tween(durationMillis = 1400, easing = LinearEasing)
        )
    }

    val progress = animationProgress.value

    val easeOutCubic: (Float) -> Float = { x ->
        1f - Math.pow((1f - x).toDouble(), 3.0).toFloat()
    }

    fun getIntervalProgress(start: Float, end: Float): Float {
        if (progress < start) return 0f
        if (progress > end) return 1f
        return easeOutCubic((progress - start) / (end - start))
    }

    val avatarProgress = getIntervalProgress(0.0f, 0.286f)
    val titleProgress = getIntervalProgress(0.286f, 0.571f)
    val subtitleProgress = getIntervalProgress(0.5f, 0.786f)
    val indicatorProgress = getIntervalProgress(0.714f, 1.0f)

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(glassColors.canvasMiddle),
        contentAlignment = Alignment.Center
    ) {
        AppGlassCard(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp),
            borderRadius = androidx.compose.foundation.shape.RoundedCornerShape(28.dp),
            borderRadiusVal = 28.dp,
            tone = com.app.quanlyhocsinh.shared.components.GlassCardTone.REGULAR
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 12.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                // Avatar Anim
                Box(
                    modifier = Modifier.graphicsLayer {
                        alpha = avatarProgress
                        scaleX = 0.5f + 0.5f * avatarProgress
                        scaleY = 0.5f + 0.5f * avatarProgress
                    }
                ) {
                    AppMonogramAvatar(label = "MK", size = 78.dp)
                }

                // Title Anim
                Column(
                    modifier = Modifier
                        .padding(top = 20.dp)
                        .graphicsLayer {
                            alpha = titleProgress
                            translationY = 15f * (1f - titleProgress)
                        },
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = "Phụ huynh học sinh",
                        color = glassColors.textPrimary,
                        fontSize = 28.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = (-0.5).sp
                    )
                }

                // Subtitle Anim
                Column(
                    modifier = Modifier
                        .padding(top = 8.dp)
                        .graphicsLayer {
                            alpha = subtitleProgress
                            translationY = 15f * (1f - subtitleProgress)
                        },
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = "Theo dõi học tập, lịch học và kết nối cùng nhà trường theo cách gọn gàng, hiện đại.",
                        textAlign = TextAlign.Center,
                        color = glassColors.textSecondary,
                        fontSize = 14.sp,
                        lineHeight = 20.sp
                    )
                }

                // Indicator Anim
                Box(
                    modifier = Modifier
                        .padding(top = 18.dp)
                        .graphicsLayer {
                            alpha = indicatorProgress
                        }
                ) {
                    CircularProgressIndicator(
                        color = glassColors.accent,
                        strokeWidth = 2.dp,
                        modifier = Modifier.size(24.dp)
                    )
                }
            }
        }
    }
}
