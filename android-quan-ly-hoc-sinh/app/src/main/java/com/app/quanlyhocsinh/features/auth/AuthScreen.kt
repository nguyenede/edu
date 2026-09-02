package com.app.quanlyhocsinh.features.auth

import androidx.compose.animation.AnimatedContent
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import com.app.quanlyhocsinh.core.theme.LocalGlassColors
import com.app.quanlyhocsinh.shared.components.AuthTextField
import com.app.quanlyhocsinh.shared.components.GoogleLoginButton
import com.app.quanlyhocsinh.state.AuthInputMethod
import com.app.quanlyhocsinh.state.AuthMode
import com.app.quanlyhocsinh.state.AuthViewModel

@Composable
fun AuthScreen(
    navController: NavController,
    viewModel: AuthViewModel = androidx.lifecycle.viewmodel.compose.viewModel()
) {
    val glassColors = LocalGlassColors.current
    val authMode by viewModel.authMode.collectAsState()
    val inputMethod by viewModel.inputMethod.collectAsState()
    val emailOrPhone by viewModel.emailOrPhone.collectAsState()
    val password by viewModel.password.collectAsState()
    val confirmPassword by viewModel.confirmPassword.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val errorMessage by viewModel.errorMessage.collectAsState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(glassColors.canvasMiddle)
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 24.dp)
            .statusBarsPadding()
            .navigationBarsPadding(),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(modifier = Modifier.height(48.dp))

        // Logo & Welcome
        Box(
            modifier = Modifier
                .size(80.dp)
                .background(glassColors.accent.copy(alpha = 0.1f), RoundedCornerShape(24.dp)),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = Icons.Default.Email, // Placeholder for logo
                contentDescription = null,
                tint = glassColors.accent,
                modifier = Modifier.size(40.dp)
            )
        }
        
        Spacer(modifier = Modifier.height(24.dp))
        
        Text(
            text = if (authMode == AuthMode.LOGIN) "Chào mừng trở lại!" else "Tạo tài khoản mới",
            fontSize = 28.sp,
            fontWeight = FontWeight.Bold,
            color = glassColors.textPrimary
        )
        
        Spacer(modifier = Modifier.height(8.dp))
        
        Text(
            text = "Vui lòng đăng nhập để tiếp tục",
            fontSize = 15.sp,
            color = glassColors.textSecondary
        )

        Spacer(modifier = Modifier.height(32.dp))

        // TikTok-style Auth Method Header
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.Bottom,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            val isEmail = inputMethod == AuthInputMethod.EMAIL
            Text(
                text = if (isEmail) "Email" else "Điện thoại",
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
                color = glassColors.textPrimary
            )
            Text(
                text = if (isEmail) "Sử dụng điện thoại" else "Sử dụng email",
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
                color = glassColors.textSecondary,
                modifier = Modifier
                    .clickable { 
                        viewModel.setInputMethod(if (isEmail) AuthInputMethod.PHONE else AuthInputMethod.EMAIL) 
                    }
                    .padding(vertical = 4.dp)
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Inputs
        AuthTextField(
            value = emailOrPhone,
            onValueChange = viewModel::updateEmailOrPhone,
            placeholder = if (inputMethod == AuthInputMethod.EMAIL) "Nhập email của bạn" else "Nhập số điện thoại",
            icon = if (inputMethod == AuthInputMethod.EMAIL) Icons.Default.Email else Icons.Default.Phone,
            keyboardOptions = KeyboardOptions(
                keyboardType = if (inputMethod == AuthInputMethod.EMAIL) KeyboardType.Email else KeyboardType.Phone
            )
        )

        Spacer(modifier = Modifier.height(16.dp))

        AuthTextField(
            value = password,
            onValueChange = viewModel::updatePassword,
            placeholder = "Nhập mật khẩu",
            icon = Icons.Default.Lock,
            visualTransformation = PasswordVisualTransformation(),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password)
        )

        AnimatedContent(targetState = authMode == AuthMode.REGISTER) { isRegister ->
            if (isRegister) {
                Column {
                    Spacer(modifier = Modifier.height(16.dp))
                    AuthTextField(
                        value = confirmPassword,
                        onValueChange = viewModel::updateConfirmPassword,
                        placeholder = "Xác nhận mật khẩu",
                        icon = Icons.Default.Lock,
                        visualTransformation = PasswordVisualTransformation(),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password)
                    )
                }
            }
        }

        if (errorMessage != null) {
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = errorMessage!!,
                color = Color(0xFFDC2626), // Red
                fontSize = 14.sp
            )
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Main Submit Button
        Button(
            onClick = {
                viewModel.submit(onSuccess = {
                    navController.navigate("root") {
                        popUpTo(0) { inclusive = true }
                    }
                })
            },
            modifier = Modifier
                .fillMaxWidth()
                .height(56.dp),
            shape = RoundedCornerShape(16.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = glassColors.accent,
                contentColor = Color.White
            )
        ) {
            if (isLoading) {
                CircularProgressIndicator(color = Color.White, modifier = Modifier.size(24.dp))
            } else {
                Text(
                    text = if (authMode == AuthMode.LOGIN) "Đăng nhập" else "Đăng ký",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Divider(modifier = Modifier.weight(1f), color = glassColors.surfaceStrong)
            Text(
                text = "Hoặc",
                modifier = Modifier.padding(horizontal = 16.dp),
                color = glassColors.textSecondary,
                fontSize = 14.sp
            )
            Divider(modifier = Modifier.weight(1f), color = glassColors.surfaceStrong)
        }

        Spacer(modifier = Modifier.height(24.dp))

        GoogleLoginButton(
            onClick = {
                // Mock Google Login
                viewModel.submit(onSuccess = {
                    navController.navigate("root") {
                        popUpTo(0) { inclusive = true }
                    }
                })
            }
        )

        Spacer(modifier = Modifier.weight(1f))

        // Bottom Toggle
        Row(
            modifier = Modifier
                .padding(bottom = 24.dp)
                .clickable { viewModel.switchAuthMode() },
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center
        ) {
            Text(
                text = if (authMode == AuthMode.LOGIN) "Chưa có tài khoản? " else "Đã có tài khoản? ",
                color = glassColors.textSecondary,
                fontSize = 15.sp
            )
            Text(
                text = if (authMode == AuthMode.LOGIN) "Đăng ký ngay" else "Đăng nhập",
                color = glassColors.accent,
                fontWeight = FontWeight.Bold,
                fontSize = 15.sp
            )
        }
    }
}
