package com.app.quanlyhocsinh.core.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.unit.dp

object AppSpacing {
    val xxs = 4.dp
    val xs = 8.dp
    val sm = 12.dp
    val md = 16.dp
    val lg = 20.dp
    val xl = 28.dp
    val xxl = 36.dp
    val hero = 44.dp
}

object AppRadius {
    val micro = 16.dp
    val small = 22.dp
    val medium = 28.dp
    val large = 34.dp
    val capsule = 999.dp

    val microShape = RoundedCornerShape(micro)
    val smallShape = RoundedCornerShape(small)
    val mediumShape = RoundedCornerShape(medium)
    val largeShape = RoundedCornerShape(large)
    val capsuleShape = RoundedCornerShape(capsule)
}

object AppDurations {
    const val instant = 120
    const val quick = 180
    const val medium = 280
    const val slow = 380
    const val modal = 420
}

object AppInsets {
    val pagePaddingHorizontal = 8.dp
    val pagePaddingVertical = 16.dp
    val cardPadding = 18.dp
    val denseCardPadding = 14.dp
    val pillPaddingHorizontal = 14.dp
    val pillPaddingVertical = 9.dp
    val sectionPaddingLeftRight = 4.dp
    val sectionPaddingTop = 2.dp
    val sectionPaddingBottom = 12.dp
}
