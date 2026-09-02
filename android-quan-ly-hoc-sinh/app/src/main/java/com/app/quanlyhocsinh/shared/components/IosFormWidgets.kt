package com.app.quanlyhocsinh.shared.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.lerp
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.app.quanlyhocsinh.core.theme.AppRadius
import com.app.quanlyhocsinh.core.theme.AppSpacing
import com.app.quanlyhocsinh.core.theme.LocalGlassColors

enum class GlassButtonVariant {
    PRIMARY,
    SECONDARY,
    GHOST
}

@Composable
fun GlassButton(
    label: String,
    onPressed: () -> Unit,
    modifier: Modifier = Modifier,
    isLoading: Boolean = false,
    icon: ImageVector? = null,
    variant: GlassButtonVariant = GlassButtonVariant.PRIMARY,
    expand: Boolean = true
) {
    val glassColors = LocalGlassColors.current
    val context = LocalContext.current
    val contentColor = when (variant) {
        GlassButtonVariant.PRIMARY -> glassColors.accent
        GlassButtonVariant.SECONDARY -> glassColors.textPrimary
        GlassButtonVariant.GHOST -> glassColors.textPrimary
    }

    val cardTone = when (variant) {
        GlassButtonVariant.PRIMARY -> GlassCardTone.ACCENT
        GlassButtonVariant.SECONDARY -> GlassCardTone.ELEVATED
        GlassButtonVariant.GHOST -> GlassCardTone.MUTED
    }

    val buttonContent = @Composable {
        Row(
            modifier = Modifier.padding(vertical = 4.dp),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically
        ) {
            if (isLoading) {
                CircularProgressIndicator(
                    modifier = Modifier.size(18.dp),
                    color = contentColor,
                    strokeWidth = 2.dp
                )
            } else {
                if (icon != null) {
                    Icon(
                        imageVector = icon,
                        contentDescription = null,
                        tint = contentColor,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                }
                Text(
                    text = label,
                    color = contentColor,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = (-0.15).sp,
                    maxLines = 1
                )
            }
        }
    }

    val widthModifier = if (expand) Modifier.fillMaxWidth() else Modifier

    AppGlassCard(
        modifier = modifier.then(widthModifier),
        padding = EdgeInsets(horizontal = 18.dp, vertical = 16.dp),
        borderRadius = RoundedCornerShape(24.dp),
        borderRadiusVal = 24.dp,
        tone = cardTone,
        onTap = {
            if (!isLoading) {
                triggerHaptic(context)
                onPressed()
            }
        }
    ) {
        buttonContent()
    }
}

// Padding helper
private fun EdgeInsets(horizontal: Dp, vertical: Dp): Dp = 0.dp // Not used, directly pass Dp padding below

@Composable
fun SoftPrimaryButton(
    label: String,
    onPressed: () -> Unit,
    modifier: Modifier = Modifier,
    isLoading: Boolean = false,
    icon: ImageVector? = null,
    expand: Boolean = true
) {
    GlassButton(
        label = label,
        onPressed = onPressed,
        modifier = modifier,
        isLoading = isLoading,
        icon = icon,
        variant = GlassButtonVariant.PRIMARY,
        expand = expand
    )
}

@Composable
fun SoftSecondaryButton(
    label: String,
    onPressed: () -> Unit,
    modifier: Modifier = Modifier,
    icon: ImageVector? = null,
    expand: Boolean = true
) {
    GlassButton(
        label = label,
        onPressed = onPressed,
        modifier = modifier,
        icon = icon,
        variant = GlassButtonVariant.SECONDARY,
        expand = expand
    )
}

@Composable
fun GlassTextField(
    value: String,
    onValueChange: (String) -> Unit,
    placeholder: String,
    modifier: Modifier = Modifier,
    label: String? = null,
    keyboardType: KeyboardType = KeyboardType.Text,
    maxLines: Int = 1,
    readOnly: Boolean = false,
    onTap: (() -> Unit)? = null,
    prefix: @Composable (() -> Unit)? = null,
    suffix: @Composable (() -> Unit)? = null
) {
    val glassColors = LocalGlassColors.current
    var isFocused by remember { mutableStateOf(false) }

    Column(modifier = modifier.fillMaxWidth()) {
        if (label != null) {
            Text(
                text = label,
                color = glassColors.textSecondary,
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold,
                letterSpacing = 0.1.sp,
                modifier = Modifier.padding(start = 6.dp, bottom = 8.dp)
            )
        }
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .graphicsLayer {
                    // Slight visual elevation border if focused
                }
        ) {
            val cardTone = if (isFocused) GlassCardTone.ELEVATED else GlassCardTone.MUTED
            val borderModifier = if (isFocused) {
                Modifier.border(1.dp, glassColors.accent, RoundedCornerShape(24.dp))
            } else {
                Modifier
            }

            AppGlassCard(
                modifier = Modifier
                    .fillMaxWidth()
                    .then(borderModifier),
                padding = 0.dp,
                borderRadius = RoundedCornerShape(24.dp),
                borderRadiusVal = 24.dp,
                tone = cardTone
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = if (maxLines > 1) 12.dp else 4.dp)
                        .clickable(enabled = onTap != null) { onTap?.invoke() },
                    verticalAlignment = if (maxLines > 1) Alignment.Top else Alignment.CenterVertically
                ) {
                    if (prefix != null) {
                        prefix()
                        Spacer(modifier = Modifier.width(10.dp))
                    }
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .padding(vertical = 12.dp)
                    ) {
                        if (value.isEmpty()) {
                            Text(
                                text = placeholder,
                                color = glassColors.textMuted,
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Medium
                            )
                        }
                        BasicTextField(
                            value = value,
                            onValueChange = onValueChange,
                            modifier = Modifier
                                .fillMaxWidth()
                                .onFocusChanged { isFocused = it.isFocused },
                            textStyle = TextStyle(
                                color = glassColors.textPrimary,
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Medium
                            ),
                            keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
                            maxLines = maxLines,
                            minLines = if (maxLines > 1) maxLines else 1,
                            readOnly = readOnly,
                            cursorBrush = SolidColor(glassColors.accent)
                        )
                    }
                    if (suffix != null) {
                        Spacer(modifier = Modifier.width(10.dp))
                        suffix()
                    }
                }
            }
        }
    }
}

@Composable
fun RoundedInputField(
    value: String,
    onValueChange: (String) -> Unit,
    placeholder: String,
    modifier: Modifier = Modifier,
    label: String? = null,
    keyboardType: KeyboardType = KeyboardType.Text,
    maxLines: Int = 1,
    readOnly: Boolean = false,
    onTap: (() -> Unit)? = null,
    prefix: @Composable (() -> Unit)? = null,
    suffix: @Composable (() -> Unit)? = null
) {
    GlassTextField(
        value = value,
        onValueChange = onValueChange,
        placeholder = placeholder,
        modifier = modifier,
        label = label,
        keyboardType = keyboardType,
        maxLines = maxLines,
        readOnly = readOnly,
        onTap = onTap,
        prefix = prefix,
        suffix = suffix
    )
}

@Composable
fun SearchInput(
    value: String,
    onValueChange: (String) -> Unit,
    placeholder: String,
    modifier: Modifier = Modifier
) {
    val glassColors = LocalGlassColors.current
    GlassTextField(
        value = value,
        onValueChange = onValueChange,
        placeholder = placeholder,
        modifier = modifier,
        prefix = {
            Icon(
                imageVector = Icons.Default.ArrowBack, // Standard back icon but can use custom search icon
                contentDescription = null,
                tint = glassColors.textSecondary,
                modifier = Modifier.size(18.dp)
            )
        }
    )
}

@Composable
fun GlassChip(
    label: String,
    selected: Boolean,
    onTap: () -> Unit,
    modifier: Modifier = Modifier,
    color: Color? = null,
    icon: ImageVector? = null
) {
    val glassColors = LocalGlassColors.current
    val resolvedColor = color ?: if (selected) glassColors.accent else glassColors.textSecondary
    val tone = if (selected) GlassCardTone.ACCENT else GlassCardTone.MUTED

    AppGlassCard(
        modifier = modifier,
        padding = 0.dp,
        borderRadius = AppRadius.capsuleShape,
        borderRadiusVal = AppRadius.capsule,
        tone = tone,
        onTap = onTap
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically
        ) {
            if (icon != null) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = resolvedColor,
                    modifier = Modifier.size(13.dp)
                )
                Spacer(modifier = Modifier.width(6.dp))
            }
            Text(
                text = label,
                color = resolvedColor,
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = (-0.05).sp
            )
        }
    }
}

@Composable
fun StatusPill(
    label: String,
    color: Color,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .clip(AppRadius.capsuleShape)
            .background(color.copy(alpha = 0.12f))
            .border(BorderStroke(1.dp, color.copy(alpha = 0.24f)), AppRadius.capsuleShape)
            .padding(horizontal = 10.dp, vertical = 5.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = label,
            color = color,
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = (-0.05).sp
        )
    }
}

@Composable
fun GlassListTile(
    icon: ImageVector,
    title: String,
    modifier: Modifier = Modifier,
    subtitle: String? = null,
    trailing: @Composable (() -> Unit)? = null,
    pill: @Composable (() -> Unit)? = null,
    onTap: (() -> Unit)? = null
) {
    val glassColors = LocalGlassColors.current

    AppGlassCard(
        modifier = modifier.fillMaxWidth(),
        padding = 14.dp,
        borderRadius = RoundedCornerShape(28.dp),
        borderRadiusVal = 28.dp,
        tone = GlassCardTone.REGULAR,
        onTap = onTap
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Icon box
            Box(
                modifier = Modifier
                    .size(42.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .background(glassColors.accentSoft),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = glassColors.accent,
                    modifier = Modifier.size(20.dp)
                )
            }
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = title,
                        color = glassColors.textPrimary,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = (-0.2).sp,
                        modifier = Modifier.weight(1f)
                    )
                    if (pill != null) {
                        Spacer(modifier = Modifier.width(8.dp))
                        pill()
                    }
                }
                if (subtitle != null) {
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = subtitle,
                        color = glassColors.textSecondary,
                        fontSize = 13.sp,
                        lineHeight = 18.sp
                    )
                }
            }
            Spacer(modifier = Modifier.width(10.dp))
            if (trailing != null) {
                trailing()
            } else {
                Icon(
                    imageVector = Icons.Default.ChevronRight,
                    contentDescription = null,
                    tint = glassColors.textSecondary,
                    modifier = Modifier.size(18.dp)
                )
            }
        }
    }
}

@Composable
fun AppListTile(
    icon: ImageVector,
    title: String,
    modifier: Modifier = Modifier,
    subtitle: String? = null,
    trailing: @Composable (() -> Unit)? = null,
    pill: @Composable (() -> Unit)? = null,
    onTap: (() -> Unit)? = null
) {
    GlassListTile(
        icon = icon,
        title = title,
        modifier = modifier,
        subtitle = subtitle,
        trailing = trailing,
        pill = pill,
        onTap = onTap
    )
}

@Composable
fun GroupedSectionCard(
    modifier: Modifier = Modifier,
    children: List<@Composable () -> Unit>
) {
    val glassColors = LocalGlassColors.current

    AppGlassCard(
        modifier = modifier.fillMaxWidth(),
        padding = 0.dp,
        borderRadius = RoundedCornerShape(30.dp),
        borderRadiusVal = 30.dp,
        tone = GlassCardTone.ELEVATED
    ) {
        Column(modifier = Modifier.fillMaxWidth()) {
            children.forEachIndexed { index, child ->
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 15.dp)
                ) {
                    child()
                }
                if (index != children.size - 1) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 18.dp)
                            .height(1.dp)
                            .background(glassColors.stroke.copy(alpha = 0.92f))
                    )
                }
            }
        }
    }
}

data class GlassTabItemData<T>(
    val value: T,
    val label: String,
    val icon: ImageVector? = null
)

@Composable
fun <T> GlassTabBar(
    items: List<GlassTabItemData<T>>,
    groupValue: T,
    onChanged: (T) -> Unit,
    modifier: Modifier = Modifier
) {
    val glassColors = LocalGlassColors.current
    val context = LocalContext.current
    val selectedIndex = items.indexOfFirst { it.value == groupValue }.coerceIn(0, items.size - 1)

    Surface(
        modifier = modifier
            .fillMaxWidth()
            .height(54.dp),
        shape = RoundedCornerShape(27.dp),
        color = Color(0xFFF0F4FA)
    ) {
        BoxWithConstraints(
            modifier = Modifier
                .fillMaxSize()
                .padding(4.dp)
        ) {
            val slotWidth = maxWidth / items.size
            val pillWidth = slotWidth
            val pillLeft = (selectedIndex * slotWidth.value).dp

            val animatedLeft by animateDpAsState(
                targetValue = pillLeft,
                animationSpec = spring(
                    dampingRatio = 0.85f,
                    stiffness = Spring.StiffnessMediumLow
                ),
                label = "pillLeft"
            )

            // Slider pill background - pure white solid card
            Box(
                modifier = Modifier
                    .offset(x = animatedLeft, y = 0.dp)
                    .width(pillWidth)
                    .fillMaxHeight()
                    .clip(RoundedCornerShape(23.dp))
                    .background(Color.White)
            )

            Row(modifier = Modifier.fillMaxSize()) {
                items.forEach { item ->
                    val selected = item.value == groupValue
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxHeight()
                            .clickable(
                                interactionSource = remember { MutableInteractionSource() },
                                indication = null
                            ) {
                                triggerHaptic(context)
                                onChanged(item.value)
                            },
                        contentAlignment = Alignment.Center
                    ) {
                        Row(
                            horizontalArrangement = Arrangement.Center,
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 4.dp)
                        ) {
                            if (item.icon != null) {
                                Icon(
                                    imageVector = item.icon,
                                    contentDescription = null,
                                    tint = if (selected) glassColors.textPrimary else glassColors.textSecondary,
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                            }
                            Text(
                                text = item.label,
                                color = if (selected) glassColors.textPrimary else glassColors.textSecondary,
                                fontSize = 13.sp,
                                fontWeight = if (selected) FontWeight.Bold else FontWeight.SemiBold,
                                letterSpacing = (-0.1).sp,
                                maxLines = 1
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun GlassToggle(
    value: Boolean,
    onChanged: (Boolean) -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true
) {
    val glassColors = LocalGlassColors.current
    val context = LocalContext.current

    val tState = animateFloatAsState(
        targetValue = if (value) 1.0f else 0.0f,
        animationSpec = spring(
            dampingRatio = 0.8f,
            stiffness = 300f
        ),
        label = "t"
    )
    val t = tState.value

    val bgColor = lerp(glassColors.surfaceMuted, glassColors.accent, t)
    val borderColor = lerp(glassColors.strokeStrong, glassColors.accent, t)

    Box(
        modifier = modifier
            .width(56.dp)
            .height(34.dp)
            .clip(CircleShape)
            .background(bgColor)
            .clickable(enabled = enabled) {
                triggerHaptic(context)
                onChanged(!value)
            }
            .padding(3.dp),
        contentAlignment = Alignment.CenterStart
    ) {
        val alignmentOffset = (t * 22.dp.value).dp // 56 - 6 (padding) - 28 (circle size) = 22
        Box(
            modifier = Modifier
                .offset(x = alignmentOffset)
                .size(28.dp)
                .clip(CircleShape)
                .background(Color.White)
        )
    }
}

@Composable
fun GlassSlider(
    value: Float,
    onChanged: (Float) -> Unit,
    modifier: Modifier = Modifier,
    valueRange: ClosedFloatingPointRange<Float> = 0f..1f
) {
    val glassColors = LocalGlassColors.current
    Slider(
        value = value,
        onValueChange = onChanged,
        valueRange = valueRange,
        colors = SliderDefaults.colors(
            activeTrackColor = glassColors.accent,
            inactiveTrackColor = glassColors.surfaceMuted,
            thumbColor = Color.White
        ),
        modifier = modifier
    )
}

@Composable
fun AppSectionTitle(
    title: String,
    modifier: Modifier = Modifier,
    subtitle: String? = null,
    trailing: @Composable (() -> Unit)? = null
) {
    val glassColors = LocalGlassColors.current

    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(start = 4.dp, end = 4.dp, top = 2.dp, bottom = 12.dp),
        verticalAlignment = Alignment.Bottom
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                color = glassColors.textPrimary,
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = (-0.35).sp
            )
            if (subtitle != null) {
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = subtitle,
                    color = glassColors.textSecondary,
                    fontSize = 14.sp,
                    lineHeight = 20.sp
                )
            }
        }
        if (trailing != null) {
            trailing()
        }
    }
}
