package com.app.quanlyhocsinh.core.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color

@Immutable
data class GlassColors(
    val canvasTop: Color,
    val canvasMiddle: Color,
    val canvasBottom: Color,
    val surface: Color,
    val surfaceStrong: Color,
    val surfaceMuted: Color,
    val stroke: Color,
    val strokeStrong: Color,
    val highlight: Color,
    val shadow: Color,
    val textPrimary: Color,
    val textSecondary: Color,
    val textMuted: Color,
    val accent: Color,
    val accentSoft: Color,
    val success: Color,
    val warning: Color,
    val danger: Color,
    val ambientBlue: Color,
    val ambientCyan: Color,
    val ambientLilac: Color
)

val LightGlassColors = GlassColors(
    canvasTop = LightCanvasTop,
    canvasMiddle = LightCanvasMiddle,
    canvasBottom = LightCanvasBottom,
    surface = LightSurface,
    surfaceStrong = LightSurfaceStrong,
    surfaceMuted = LightSurfaceMuted,
    stroke = LightStroke,
    strokeStrong = LightStrokeStrong,
    highlight = LightHighlight,
    shadow = LightShadow,
    textPrimary = LightTextPrimary,
    textSecondary = LightTextSecondary,
    textMuted = LightTextMuted,
    accent = AccentLight,
    accentSoft = AccentSoftLight,
    success = SuccessLight,
    warning = WarningLight,
    danger = DangerLight,
    ambientBlue = LightCanvasMiddle,
    ambientCyan = LightCanvasMiddle,
    ambientLilac = LightCanvasMiddle
)

val DarkGlassColors = GlassColors(
    canvasTop = DarkCanvasTop,
    canvasMiddle = DarkCanvasMiddle,
    canvasBottom = DarkCanvasBottom,
    surface = DarkSurface,
    surfaceStrong = DarkSurfaceStrong,
    surfaceMuted = DarkSurfaceMuted,
    stroke = DarkStroke,
    strokeStrong = DarkStrokeStrong,
    highlight = DarkHighlight,
    shadow = DarkShadow,
    textPrimary = DarkTextPrimary,
    textSecondary = DarkTextSecondary,
    textMuted = DarkTextMuted,
    accent = AccentDark,
    accentSoft = AccentSoftDark,
    success = SuccessDark,
    warning = WarningDark,
    danger = DangerDark,
    ambientBlue = Color(0xFF214A9F),
    ambientCyan = Color(0xFF0A667C),
    ambientLilac = Color(0xFF413B7A)
)

val LocalGlassColors = staticCompositionLocalOf { LightGlassColors }

@Composable
fun QuanLyHocSinhTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val glassColors = if (darkTheme) DarkGlassColors else LightGlassColors
    val colorScheme = if (darkTheme) {
        darkColorScheme(
            primary = glassColors.accent,
            onPrimary = Color.White,
            secondary = glassColors.accentSoft,
            error = glassColors.danger,
            surface = glassColors.surfaceStrong,
            onSurface = glassColors.textPrimary,
            background = glassColors.canvasMiddle,
            onBackground = glassColors.textPrimary
        )
    } else {
        lightColorScheme(
            primary = glassColors.accent,
            onPrimary = Color.White,
            secondary = glassColors.accentSoft,
            error = glassColors.danger,
            surface = glassColors.surfaceStrong,
            onSurface = glassColors.textPrimary,
            background = glassColors.canvasMiddle,
            onBackground = glassColors.textPrimary
        )
    }

    CompositionLocalProvider(LocalGlassColors provides glassColors) {
        MaterialTheme(
            colorScheme = colorScheme,
            typography = AppTypography,
            content = content
        )
    }
}
