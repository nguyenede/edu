package com.app.quanlyhocsinh.shared.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.app.quanlyhocsinh.core.theme.LocalGlassColors

@Composable
fun ConfirmationDialog(
    show: Boolean,
    title: String,
    content: String,
    confirmLabel: String,
    onConfirm: () -> Unit,
    onDismiss: () -> Unit
) {
    if (show) {
        val glassColors = LocalGlassColors.current

        Dialog(
            onDismissRequest = onDismiss,
            properties = DialogProperties(usePlatformDefaultWidth = false)
        ) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black.copy(alpha = 0.4f))
                    .clickable(enabled = true, onClick = onDismiss),
                contentAlignment = Alignment.Center
            ) {
                AppGlassCard(
                    modifier = Modifier
                        .width(300.dp)
                        .clickable(enabled = false, onClick = {}),
                    padding = 20.dp,
                    borderRadius = RoundedCornerShape(28.dp),
                    borderRadiusVal = 28.dp,
                    tone = GlassCardTone.ELEVATED
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = title,
                            color = glassColors.textPrimary,
                            fontSize = 17.sp,
                            fontWeight = FontWeight.Bold,
                            textAlign = androidx.compose.ui.text.style.TextAlign.Center
                        )
                        Spacer(modifier = Modifier.height(10.dp))
                        Text(
                            text = content,
                            color = glassColors.textSecondary,
                            fontSize = 13.sp,
                            lineHeight = 18.sp,
                            textAlign = androidx.compose.ui.text.style.TextAlign.Center
                        )
                        Spacer(modifier = Modifier.height(20.dp))
                        Row(modifier = Modifier.fillMaxWidth()) {
                            Box(modifier = Modifier.weight(1f)) {
                                SoftSecondaryButton(
                                    label = "Hủy",
                                    onPressed = onDismiss,
                                    expand = true
                                )
                            }
                            Spacer(modifier = Modifier.width(12.dp))
                            Box(modifier = Modifier.weight(1f)) {
                                SoftPrimaryButton(
                                    label = confirmLabel,
                                    onPressed = onConfirm,
                                    expand = true
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppBottomSheet(
    show: Boolean,
    onDismissRequest: () -> Unit,
    content: @Composable ColumnScope.() -> Unit
) {
    if (show) {
        val glassColors = LocalGlassColors.current

        ModalBottomSheet(
            onDismissRequest = onDismissRequest,
            sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
            containerColor = glassColors.surfaceStrong,
            contentColor = glassColors.textPrimary,
            dragHandle = {
                BottomSheetDefaults.DragHandle(
                    color = glassColors.textMuted.copy(alpha = 0.4f)
                )
            },
            shape = RoundedCornerShape(topStart = 30.dp, topEnd = 30.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .navigationBarsPadding()
                    .padding(start = 20.dp, end = 20.dp, bottom = 30.dp, top = 10.dp)
            ) {
                content()
            }
        }
    }
}
