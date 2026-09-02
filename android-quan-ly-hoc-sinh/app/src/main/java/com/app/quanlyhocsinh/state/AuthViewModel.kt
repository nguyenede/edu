package com.app.quanlyhocsinh.state

import androidx.lifecycle.ViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.launch
import kotlinx.coroutines.delay

enum class AuthMode {
    LOGIN, REGISTER
}

enum class AuthInputMethod {
    EMAIL, PHONE
}

class AuthViewModel : ViewModel() {
    private val _authMode = MutableStateFlow(AuthMode.LOGIN)
    val authMode: StateFlow<AuthMode> = _authMode.asStateFlow()

    private val _inputMethod = MutableStateFlow(AuthInputMethod.EMAIL)
    val inputMethod: StateFlow<AuthInputMethod> = _inputMethod.asStateFlow()

    private val _emailOrPhone = MutableStateFlow("")
    val emailOrPhone: StateFlow<String> = _emailOrPhone.asStateFlow()

    private val _password = MutableStateFlow("")
    val password: StateFlow<String> = _password.asStateFlow()

    private val _confirmPassword = MutableStateFlow("")
    val confirmPassword: StateFlow<String> = _confirmPassword.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    fun switchAuthMode() {
        _authMode.value = if (_authMode.value == AuthMode.LOGIN) AuthMode.REGISTER else AuthMode.LOGIN
        _errorMessage.value = null
    }

    fun setInputMethod(method: AuthInputMethod) {
        _inputMethod.value = method
        _emailOrPhone.value = ""
        _errorMessage.value = null
    }

    fun updateEmailOrPhone(value: String) {
        _emailOrPhone.value = value
    }

    fun updatePassword(value: String) {
        _password.value = value
    }

    fun updateConfirmPassword(value: String) {
        _confirmPassword.value = value
    }

    fun clearError() {
        _errorMessage.value = null
    }

    fun submit(onSuccess: () -> Unit) {
        if (_emailOrPhone.value.isBlank()) {
            _errorMessage.value = "Vui lòng nhập ${if (_inputMethod.value == AuthInputMethod.EMAIL) "Email" else "Số điện thoại"}"
            return
        }
        if (_password.value.isBlank()) {
            _errorMessage.value = "Vui lòng nhập Mật khẩu"
            return
        }
        if (_authMode.value == AuthMode.REGISTER && _password.value != _confirmPassword.value) {
            _errorMessage.value = "Mật khẩu xác nhận không khớp"
            return
        }

        _isLoading.value = true
        
        // Mock API call
        viewModelScope.launch {
            delay(1500)
            _isLoading.value = false
            onSuccess()
        }
    }
}
