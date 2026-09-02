package com.app.quanlyhocsinh.shared.components

import androidx.compose.animation.*
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.animateIntAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.app.quanlyhocsinh.core.theme.LocalGlassColors

@Composable
fun AnimatedBadge(
    count: Int,
    modifier: Modifier = Modifier,
    backgroundColor: Color = Color(0xFFE47C75),
    textColor: Color = Color.White
) {
    AnimatedVisibility(
        visible = count > 0,
        enter = scaleIn() + fadeIn(),
        exit = scaleOut() + fadeOut(),
        modifier = modifier
    ) {
        Box(
            modifier = Modifier
                .defaultMinSize(minWidth = 18.dp, minHeight = 18.dp)
                .clip(CircleShape)
                .background(backgroundColor)
                .padding(horizontal = 4.dp, vertical = 2.dp),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = if (count > 99) "99+" else count.toString(),
                color = textColor,
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold
            )
        }
    }
}

@Composable
fun AnimatedCount(
    target: Int,
    modifier: Modifier = Modifier,
    style: androidx.compose.ui.text.TextStyle
) {
    val count by animateIntAsState(
        targetValue = target,
        animationSpec = tween(durationMillis = 300),
        label = "count"
    )
    Text(
        text = count.toString(),
        modifier = modifier,
        style = style
    )
}

@Composable
fun AnimatedDecimal(
    target: Double,
    modifier: Modifier = Modifier,
    decimals: Int = 1,
    style: androidx.compose.ui.text.TextStyle
) {
    val floatTarget = target.toFloat()
    val value by animateFloatAsState(
        targetValue = floatTarget,
        animationSpec = tween(durationMillis = 300),
        label = "decimal"
    )
    val formatted = String.format("%.${decimals}f", value).replace(',', '.')
    Text(
        text = formatted,
        modifier = modifier,
        style = style
    )
}

@Composable
fun AnimatedEmptyState(
    title: String,
    subtitle: String,
    modifier: Modifier = Modifier,
    iconBuilder: @Composable (Color) -> Unit
) {
    val glassColors = LocalGlassColors.current

    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(vertical = 32.dp, horizontal = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Box(modifier = Modifier.size(100.dp)) {
            iconBuilder(glassColors.textMuted.copy(alpha = 0.35f))
        }
        Spacer(modifier = Modifier.height(18.dp))
        Text(
            text = title,
            color = glassColors.textPrimary,
            fontSize = 17.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = (-0.2).sp
        )
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            text = subtitle,
            color = glassColors.textSecondary,
            fontSize = 13.sp,
            lineHeight = 18.sp,
            fontWeight = FontWeight.Normal,
            modifier = Modifier.padding(horizontal = 16.dp),
            textAlign = androidx.compose.ui.text.style.TextAlign.Center
        )
    }
}

// Vector/Canvas drawings mimicking Flutter's hand-drawn EmptyState illustrations
object EmptyIllustrations {
    @Composable
    fun bell(color: Color) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            val w = size.width
            val h = size.height
            // Draw bell outline mút nét mỏng
            drawArc(
                color = color,
                startAngle = 180f,
                sweepAngle = 180f,
                useCenter = false,
                topLeft = Offset(w * 0.25f, h * 0.25f),
                size = Size(w * 0.5f, h * 0.5f),
                style = Stroke(width = 3.dp.toPx(), cap = StrokeCap.Round)
            )
            drawLine(
                color = color,
                start = Offset(w * 0.25f, h * 0.5f),
                end = Offset(w * 0.25f, h * 0.7f),
                strokeWidth = 3.dp.toPx(),
                cap = StrokeCap.Round
            )
            drawLine(
                color = color,
                start = Offset(w * 0.75f, h * 0.5f),
                end = Offset(w * 0.75f, h * 0.7f),
                strokeWidth = 3.dp.toPx(),
                cap = StrokeCap.Round
            )
            drawLine(
                color = color,
                start = Offset(w * 0.15f, h * 0.7f),
                end = Offset(w * 0.85f, h * 0.7f),
                strokeWidth = 3.dp.toPx(),
                cap = StrokeCap.Round
            )
            drawCircle(
                color = color,
                radius = w * 0.08f,
                center = Offset(w * 0.5f, h * 0.78f),
                style = Stroke(width = 3.dp.toPx())
            )
        }
    }

    @Composable
    fun calendar(color: Color) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            val w = size.width
            val h = size.height
            drawRoundRect(
                color = color,
                topLeft = Offset(w * 0.2f, h * 0.25f),
                size = Size(w * 0.6f, h * 0.55f),
                cornerRadius = androidx.compose.ui.geometry.CornerRadius(10.dp.toPx()),
                style = Stroke(width = 3.dp.toPx())
            )
            // Top binder line
            drawLine(
                color = color,
                start = Offset(w * 0.2f, h * 0.42f),
                end = Offset(w * 0.8f, h * 0.42f),
                strokeWidth = 2.dp.toPx()
            )
            // Rings
            drawLine(
                color = color,
                start = Offset(w * 0.35f, h * 0.18f),
                end = Offset(w * 0.35f, h * 0.28f),
                strokeWidth = 3.dp.toPx(),
                cap = StrokeCap.Round
            )
            drawLine(
                color = color,
                start = Offset(w * 0.65f, h * 0.18f),
                end = Offset(w * 0.65f, h * 0.28f),
                strokeWidth = 3.dp.toPx(),
                cap = StrokeCap.Round
            )
            // Tiny event marker
            drawCircle(
                color = color,
                radius = w * 0.05f,
                center = Offset(w * 0.5f, h * 0.6f),
                style = Stroke(width = 2.dp.toPx())
            )
        }
    }

    @Composable
    fun clipboard(color: Color) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            val w = size.width
            val h = size.height
            drawRoundRect(
                color = color,
                topLeft = Offset(w * 0.25f, h * 0.25f),
                size = Size(w * 0.5f, h * 0.6f),
                cornerRadius = androidx.compose.ui.geometry.CornerRadius(8.dp.toPx()),
                style = Stroke(width = 3.dp.toPx())
            )
            // Clip board top notch
            drawRoundRect(
                color = color,
                topLeft = Offset(w * 0.4f, h * 0.18f),
                size = Size(w * 0.2f, h * 0.12f),
                cornerRadius = androidx.compose.ui.geometry.CornerRadius(4.dp.toPx()),
                style = Stroke(width = 2.dp.toPx())
            )
            // Inner lines
            drawLine(color = color, start = Offset(w * 0.35f, h * 0.45f), end = Offset(w * 0.65f, h * 0.45f), strokeWidth = 2.dp.toPx(), cap = StrokeCap.Round)
            drawLine(color = color, start = Offset(w * 0.35f, h * 0.58f), end = Offset(w * 0.65f, h * 0.58f), strokeWidth = 2.dp.toPx(), cap = StrokeCap.Round)
            drawLine(color = color, start = Offset(w * 0.35f, h * 0.71f), end = Offset(w * 0.55f, h * 0.71f), strokeWidth = 2.dp.toPx(), cap = StrokeCap.Round)
        }
    }

    @Composable
    fun magnifying(color: Color) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            val w = size.width
            val h = size.height
            drawCircle(
                color = color,
                radius = w * 0.22f,
                center = Offset(w * 0.45f, h * 0.45f),
                style = Stroke(width = 3.dp.toPx())
            )
            drawLine(
                color = color,
                start = Offset(w * 0.6f, h * 0.6f),
                end = Offset(w * 0.82f, h * 0.82f),
                strokeWidth = 4.dp.toPx(),
                cap = StrokeCap.Round
            )
        }
    }

    @Composable
    fun emptyBox(color: Color) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            val w = size.width
            val h = size.height
            drawRoundRect(
                color = color,
                topLeft = Offset(w * 0.2f, h * 0.32f),
                size = Size(w * 0.6f, h * 0.45f),
                cornerRadius = androidx.compose.ui.geometry.CornerRadius(6.dp.toPx()),
                style = Stroke(width = 3.dp.toPx())
            )
            // Box open lid lines
            drawLine(color = color, start = Offset(w * 0.2f, h * 0.32f), end = Offset(w * 0.12f, h * 0.18f), strokeWidth = 2.5f.dp.toPx(), cap = StrokeCap.Round)
            drawLine(color = color, start = Offset(w * 0.8f, h * 0.32f), end = Offset(w * 0.88f, h * 0.18f), strokeWidth = 2.5f.dp.toPx(), cap = StrokeCap.Round)
            // Box front slit
            drawLine(color = color, start = Offset(w * 0.35f, h * 0.45f), end = Offset(w * 0.65f, h * 0.45f), strokeWidth = 2.dp.toPx(), cap = StrokeCap.Round)
        }
    }
}
