package com.app.quanlyhocsinh.data.remote

import org.json.JSONObject

object StudentManagementApi {
    suspend fun login(email: String, password: String): JSONObject {
        val response = ApiClient.post(
            "/auth/login",
            JSONObject()
                .put("email", email)
                .put("password", password)
        )

        val data = response.optJSONObject("data") ?: response
        val token = data.optString("token", data.optString("accessToken"))
        if (token.isBlank()) {
            throw ApiException("Máy chủ không trả về token đăng nhập")
        }

        AuthSession.save(token, data.optJSONObject("user"))
        return data
    }

    suspend fun getCurrentUser(): JSONObject = ApiClient.get("/auth/me")

    suspend fun getStudent(studentId: String): JSONObject = ApiClient.get("/students/$studentId")

    suspend fun getStudentParents(studentId: String): JSONObject = ApiClient.get("/students/$studentId/parents")

    suspend fun getStudentHealth(studentId: String): JSONObject = ApiClient.get("/students/$studentId/health")

    suspend fun getStudentBehavior(studentId: String): JSONObject = ApiClient.get("/students/$studentId/behavior")

    suspend fun getNotifications(): JSONObject = ApiClient.get("/notifications")

    suspend fun getSchedules(): JSONObject = ApiClient.get("/schedules")

    suspend fun getAttendance(): JSONObject = ApiClient.get("/attendance")

    suspend fun getGrades(): JSONObject = ApiClient.get("/grades")
}
