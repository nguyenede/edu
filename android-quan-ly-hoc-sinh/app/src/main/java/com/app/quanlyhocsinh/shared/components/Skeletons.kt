package com.app.quanlyhocsinh.shared.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.app.quanlyhocsinh.core.theme.LocalGlassColors

@Composable
fun SkeletonWidget(
    height: Dp,
    borderRadius: Dp,
    modifier: Modifier = Modifier,
    width: Dp? = null
) {
    val glassColors = LocalGlassColors.current
    val infiniteTransition = rememberInfiniteTransition(label = "shimmer")
    val alpha by infiniteTransition.animateFloat(
        initialValue = 0.28f,
        targetValue = 0.68f,
        animationSpec = infiniteRepeatable(
            animation = tween(1000, easing = EaseInOutSine),
            repeatMode = RepeatMode.Reverse
        ),
        label = "alpha"
    )

    val sizeModifier = if (width != null) Modifier.width(width) else Modifier.fillMaxWidth()

    Box(
        modifier = modifier
            .then(sizeModifier)
            .height(height)
            .clip(RoundedCornerShape(borderRadius))
            .background(glassColors.strokeStrong.copy(alpha = alpha))
    )
}

@Composable
private fun SkeletonCard(
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit
) {
    val glassColors = LocalGlassColors.current
    Box(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(22.dp))
            .background(glassColors.surface.copy(alpha = 0.6f))
            .border(BorderStroke(1.dp, Color.Black.copy(alpha = 0.06f)), RoundedCornerShape(22.dp))
            .padding(16.dp)
    ) {
        content()
    }
}

@Composable
fun HomeSkeleton(
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .statusBarsPadding()
            .padding(horizontal = 20.dp, vertical = 16.dp),
        horizontalAlignment = Alignment.Start
    ) {
        Spacer(modifier = Modifier.height(44.dp))
        SkeletonWidget(width = 120.dp, height = 28.dp, borderRadius = 14.dp)
        Spacer(modifier = Modifier.height(24.dp))
        SkeletonCard {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                SkeletonWidget(width = 56.dp, height = 56.dp, borderRadius = 28.dp)
                Spacer(modifier = Modifier.width(14.dp))
                Column(modifier = Modifier.weight(1f)) {
                    SkeletonWidget(width = 160.dp, height = 18.dp, borderRadius = 9.dp)
                    Spacer(modifier = Modifier.height(8.dp))
                    SkeletonWidget(width = 120.dp, height = 14.dp, borderRadius = 7.dp)
                }
                Spacer(modifier = Modifier.width(14.dp))
                SkeletonWidget(width = 36.dp, height = 36.dp, borderRadius = 18.dp)
            }
        }
        Spacer(modifier = Modifier.height(20.dp))
        SkeletonWidget(width = 140.dp, height = 18.dp, borderRadius = 9.dp)
        Spacer(modifier = Modifier.height(14.dp))
        Row(modifier = Modifier.fillMaxWidth()) {
            Box(modifier = Modifier.weight(1f)) {
                SkeletonWidget(height = 72.dp, borderRadius = 22.dp)
            }
            Spacer(modifier = Modifier.width(12.dp))
            Box(modifier = Modifier.weight(1f)) {
                SkeletonWidget(height = 72.dp, borderRadius = 22.dp)
            }
        }
        Spacer(modifier = Modifier.height(20.dp))
        SkeletonWidget(width = 160.dp, height = 18.dp, borderRadius = 9.dp)
        Spacer(modifier = Modifier.height(14.dp))
        Row(modifier = Modifier.fillMaxWidth()) {
            Box(modifier = Modifier.weight(1f)) {
                SkeletonWidget(height = 100.dp, borderRadius = 22.dp)
            }
            Spacer(modifier = Modifier.width(12.dp))
            Box(modifier = Modifier.weight(1f)) {
                SkeletonWidget(height = 100.dp, borderRadius = 22.dp)
            }
        }
    }
}

@Composable
fun GradesSkeleton(
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .statusBarsPadding()
            .padding(horizontal = 20.dp, vertical = 16.dp),
        horizontalAlignment = Alignment.Start
    ) {
        Spacer(modifier = Modifier.height(44.dp))
        SkeletonWidget(width = 100.dp, height = 28.dp, borderRadius = 14.dp)
        Spacer(modifier = Modifier.height(24.dp))
        SkeletonCard {
            Column(modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    SkeletonWidget(width = 80.dp, height = 40.dp, borderRadius = 20.dp)
                    SkeletonWidget(width = 60.dp, height = 22.dp, borderRadius = 11.dp)
                }
                Spacer(modifier = Modifier.height(16.dp))
                SkeletonWidget(height = 8.dp, borderRadius = 4.dp)
                Spacer(modifier = Modifier.height(16.dp))
                Row(modifier = Modifier.fillMaxWidth()) {
                    Box(modifier = Modifier.weight(1f)) {
                        SkeletonWidget(height = 48.dp, borderRadius = 14.dp)
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    Box(modifier = Modifier.weight(1f)) {
                        SkeletonWidget(height = 48.dp, borderRadius = 14.dp)
                    }
                }
            }
        }
        Spacer(modifier = Modifier.height(20.dp))
        SkeletonWidget(width = 200.dp, height = 40.dp, borderRadius = 20.dp)
        Spacer(modifier = Modifier.height(14.dp))
        for (i in 0 until 4) {
            SkeletonCard(modifier = Modifier.padding(bottom = 10.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    SkeletonWidget(width = 44.dp, height = 44.dp, borderRadius = 22.dp)
                    Spacer(modifier = Modifier.width(14.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        SkeletonWidget(width = 120.dp, height = 16.dp, borderRadius = 8.dp)
                        Spacer(modifier = Modifier.height(6.dp))
                        SkeletonWidget(width = 80.dp, height = 12.dp, borderRadius = 6.dp)
                    }
                    Spacer(modifier = Modifier.width(14.dp))
                    SkeletonWidget(width = 48.dp, height = 28.dp, borderRadius = 14.dp)
                }
            }
        }
    }
}

@Composable
fun ScheduleSkeleton(
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .statusBarsPadding()
            .padding(horizontal = 20.dp, vertical = 16.dp),
        horizontalAlignment = Alignment.Start
    ) {
        Spacer(modifier = Modifier.height(44.dp))
        SkeletonWidget(width = 80.dp, height = 28.dp, borderRadius = 14.dp)
        Spacer(modifier = Modifier.height(24.dp))
        SkeletonWidget(height = 40.dp, borderRadius = 20.dp)
        Spacer(modifier = Modifier.height(20.dp))
        Row(modifier = Modifier.fillMaxWidth()) {
            for (i in 0 until 5) {
                Box(modifier = Modifier.weight(1f)) {
                    SkeletonWidget(height = 56.dp, borderRadius = 12.dp)
                }
                if (i != 4) {
                    Spacer(modifier = Modifier.width(8.dp))
                }
            }
        }
        Spacer(modifier = Modifier.height(24.dp))
        for (i in 0 until 4) {
            SkeletonCard(modifier = Modifier.padding(bottom = 10.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    SkeletonWidget(width = 4.dp, height = 48.dp, borderRadius = 2.dp)
                    Spacer(modifier = Modifier.width(14.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        SkeletonWidget(width = 140.dp, height = 16.dp, borderRadius = 8.dp)
                        Spacer(modifier = Modifier.height(6.dp))
                        SkeletonWidget(width = 100.dp, height = 12.dp, borderRadius = 6.dp)
                    }
                    Spacer(modifier = Modifier.width(14.dp))
                    SkeletonWidget(width = 48.dp, height = 20.dp, borderRadius = 10.dp)
                }
            }
        }
    }
}

@Composable
fun ProfileSkeleton(
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .statusBarsPadding()
            .padding(horizontal = 20.dp, vertical = 16.dp),
        horizontalAlignment = Alignment.Start
    ) {
        Spacer(modifier = Modifier.height(44.dp))
        SkeletonWidget(width = 140.dp, height = 28.dp, borderRadius = 14.dp)
        Spacer(modifier = Modifier.height(28.dp))
        Column(
            modifier = Modifier.fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            SkeletonWidget(width = 88.dp, height = 88.dp, borderRadius = 44.dp)
            Spacer(modifier = Modifier.height(16.dp))
            SkeletonWidget(width = 160.dp, height = 20.dp, borderRadius = 10.dp)
            Spacer(modifier = Modifier.height(8.dp))
            SkeletonWidget(width = 120.dp, height = 14.dp, borderRadius = 7.dp)
        }
        Spacer(modifier = Modifier.height(28.dp))
        SkeletonWidget(height = 48.dp, borderRadius = 22.dp)
        Spacer(modifier = Modifier.height(24.dp))
        for (i in 0 until 4) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 14.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    SkeletonWidget(width = 32.dp, height = 32.dp, borderRadius = 16.dp)
                    Spacer(modifier = Modifier.width(14.dp))
                    Box(modifier = Modifier.weight(1f)) {
                        SkeletonWidget(width = 160.dp, height = 16.dp, borderRadius = 8.dp)
                    }
                    Spacer(modifier = Modifier.width(14.dp))
                    SkeletonWidget(width = 20.dp, height = 20.dp, borderRadius = 10.dp)
                }
            }
        }
    }
}
