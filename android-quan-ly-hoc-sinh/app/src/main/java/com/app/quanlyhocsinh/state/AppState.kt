package com.app.quanlyhocsinh.state

import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.MutableState
import androidx.compose.runtime.State
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.staticCompositionLocalOf

enum class AppThemeMode {
    LIGHT,
    DARK,
    SYSTEM
}

val LocalAppControllers = staticCompositionLocalOf<AppControllers> {
    error("No AppControllers provided")
}

val LocalBreathAnimation = staticCompositionLocalOf<androidx.compose.runtime.State<Float>> {
    mutableStateOf(1.0f)
}

val LocalThemeMode = staticCompositionLocalOf<MutableState<AppThemeMode>> {
    error("No ThemeMode provided")
}

val LocalHapticEnabled = staticCompositionLocalOf<MutableState<Boolean>> {
    mutableStateOf(true)
}
