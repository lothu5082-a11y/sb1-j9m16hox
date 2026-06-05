package com.nova.assistant.data.remote

import com.nova.assistant.data.preferences.SettingsPreferences
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException
import java.util.concurrent.TimeUnit

sealed class ApiResult {
    data class Success(val content: String) : ApiResult()
    data class Error(val message: String) : ApiResult()
}

class OpenRouterClient {

    private val json = Json { ignoreUnknownKeys = true }

    private val http = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .build()

    suspend fun chat(
        apiKey: String,
        model: String,
        messages: List<ApiMessage>,
        baseUrl: String = SettingsPreferences.DEFAULT_BASE_URL
    ): ApiResult = withContext(Dispatchers.IO) {
        if (apiKey.isBlank()) return@withContext ApiResult.Error(
            "API key is not set. Open Settings and enter your key."
        )

        val endpoint = baseUrl.trimEnd('/') + "/chat/completions"

        // Build request — send only non-null content (handles tool messages gracefully)
        val filteredMessages = messages.map { msg ->
            ApiMessage(role = msg.role, content = msg.content ?: "")
        }
        val body = ChatRequest(model = model, messages = filteredMessages)
        val requestBody = json.encodeToString(body)
            .toRequestBody("application/json".toMediaType())

        val request = Request.Builder()
            .url(endpoint)
            .addHeader("Authorization", "Bearer $apiKey")
            .addHeader("Content-Type", "application/json")
            .post(requestBody)
            .build()

        try {
            val response = http.newCall(request).execute()
            val responseBody = response.body?.string() ?: ""

            when {
                response.code == 401 -> ApiResult.Error(
                    "Invalid API key. Check your key in Settings."
                )
                response.code == 402 -> ApiResult.Error("Account out of credits.")
                response.code == 404 -> ApiResult.Error(
                    "Model \"$model\" not found. Check the model ID in Settings."
                )
                response.code == 429 -> ApiResult.Error("Rate limit reached. Please wait a moment.")
                !response.isSuccessful -> ApiResult.Error(
                    "Server error ${response.code}. Response: ${responseBody.take(200)}"
                )
                else -> {
                    val parsed = json.decodeFromString<ChatResponse>(responseBody)
                    val content = parsed.choices.firstOrNull()?.message?.content
                    if (!content.isNullOrBlank()) ApiResult.Success(content)
                    else ApiResult.Error(
                        "Empty response from model. Raw: ${responseBody.take(200)}"
                    )
                }
            }
        } catch (e: IOException) {
            ApiResult.Error("No internet connection. Check your network and try again.")
        } catch (e: Exception) {
            ApiResult.Error("Error (${e::class.simpleName}): ${e.message ?: "unknown"}")
        }
    }
}
