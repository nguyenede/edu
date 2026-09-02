package com.app.quanlyhocsinh.data.remote

import com.app.quanlyhocsinh.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

class ApiException(message: String, val statusCode: Int? = null) : Exception(message)

object AuthSession {
    var token: String? = null
        private set
    var user: JSONObject? = null
        private set

    fun save(token: String, user: JSONObject?) {
        this.token = token
        this.user = user
    }

    fun clear() {
        token = null
        user = null
    }
}

object ApiClient {
    private const val TIMEOUT_MS = 15000
    private val baseUrl = BuildConfig.STUDENT_MANAGEMENT_API_URL.trimEnd('/')

    suspend fun get(path: String): JSONObject = request("GET", path)

    suspend fun post(path: String, body: JSONObject): JSONObject = request("POST", path, body)

    private suspend fun request(method: String, path: String, body: JSONObject? = null): JSONObject =
        withContext(Dispatchers.IO) {
            val url = URL("$baseUrl/${path.trimStart('/')}")
            val connection = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = method
                connectTimeout = TIMEOUT_MS
                readTimeout = TIMEOUT_MS
                setRequestProperty("Accept", "application/json")
                setRequestProperty("Content-Type", "application/json")
                AuthSession.token?.let { setRequestProperty("Authorization", "Bearer $it") }
                doInput = true
            }

            if (body != null) {
                connection.doOutput = true
                OutputStreamWriter(connection.outputStream, Charsets.UTF_8).use { writer ->
                    writer.write(body.toString())
                }
            }

            val status = connection.responseCode
            val stream = if (status in 200..299) connection.inputStream else connection.errorStream
            val responseText = stream?.bufferedReader(Charsets.UTF_8)?.use { it.readText() }.orEmpty()
            connection.disconnect()

            val json = responseText.takeIf { it.isNotBlank() }?.let { JSONObject(it) } ?: JSONObject()
            if (status !in 200..299) {
                throw ApiException(json.optString("message", "Không thể kết nối máy chủ"), status)
            }
            if (json.has("success") && !json.optBoolean("success")) {
                throw ApiException(json.optString("message", "Yêu cầu không thành công"), status)
            }
            json
        }
}
