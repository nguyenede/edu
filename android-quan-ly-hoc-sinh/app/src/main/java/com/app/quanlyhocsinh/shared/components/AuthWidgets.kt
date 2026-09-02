package com.app.quanlyhocsinh.shared.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.graphics.luminance
import com.app.quanlyhocsinh.R
import com.app.quanlyhocsinh.core.theme.LocalGlassColors

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AuthTextField(
    value: String,
    onValueChange: (String) -> Unit,
    placeholder: String,
    icon: ImageVector,
    keyboardOptions: KeyboardOptions = KeyboardOptions.Default,
    visualTransformation: VisualTransformation = VisualTransformation.None
) {
    val glassColors = LocalGlassColors.current

    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        placeholder = { Text(placeholder, color = glassColors.textSecondary) },
        leadingIcon = {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = glassColors.textSecondary,
                modifier = Modifier.size(20.dp)
            )
        },
        modifier = Modifier
            .fillMaxWidth()
            .height(56.dp)
            .background(glassColors.surfaceStrong, RoundedCornerShape(16.dp)),
        shape = RoundedCornerShape(16.dp),
        colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = glassColors.accent,
            unfocusedBorderColor = Color.Transparent,
            cursorColor = glassColors.accent,
            focusedTextColor = glassColors.textPrimary,
            unfocusedTextColor = glassColors.textPrimary
        ),
        keyboardOptions = keyboardOptions,
        visualTransformation = visualTransformation,
        singleLine = true
    )
}

@Composable
fun GoogleLoginButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val glassColors = LocalGlassColors.current
    val isDark = glassColors.canvasMiddle.luminance() < 0.5f

    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(56.dp)
            .clip(RoundedCornerShape(16.dp))
            .background(glassColors.surfaceStrong)
            .border(
                width = 1.dp,
                color = if (isDark) Color(0x33FFFFFF) else Color(0x33000000),
                shape = RoundedCornerShape(16.dp)
            )
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center
        ) {
            // Mocking Google icon since we don't have the drawable yet.
            // Using a simple colored text or a basic icon for now.
            Text(
                text = "G",
                color = Color(0xFFEA4335),
                fontWeight = FontWeight.Bold,
                fontSize = 24.sp
            )
            Spacer(modifier = Modifier.width(12.dp))
            Text(
                text = "Tiếp tục với Google",
                color = glassColors.textPrimary,
                fontSize = 16.sp,
                fontWeight = FontWeight.SemiBold
            )
        }
    }
}
