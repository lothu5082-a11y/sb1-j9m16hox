package com.vexora.aiassistant

import android.content.Context
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.TimeUnit

object ApiEngine {

    private val client = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .build()

    private val JSON = "application/json".toMediaType()

    fun respond(
        context: Context,
        provider: ModelSettings.Provider,
        userInput: String,
        history: List<Pair<String, String>>
    ): String {
        val key = ModelSettings.getKey(context, provider)
        if (key.isEmpty()) return "⚠️ No API key set for ${provider.displayName}. Go to Settings to add it."
        return when (provider) {
            ModelSettings.Provider.GEMINI -> callGemini(key, userInput, history)
            ModelSettings.Provider.OPENAI -> callOpenAI(key, userInput, history)
            ModelSettings.Provider.CLAUDE -> callClaude(key, userInput, history)
            else -> VexoraEngine.respond(userInput)
        }
    }

    private fun callGemini(key: String, userInput: String, history: List<Pair<String, String>>): String {
        val contents = JSONArray()
        history.takeLast(5).forEach { (u, a) ->
            contents.put(JSONObject().apply {
                put("role", "user")
                put("parts", JSONArray().put(JSONObject().put("text", u)))
            })
            contents.put(JSONObject().apply {
                put("role", "model")
                put("parts", JSONArray().put(JSONObject().put("text", a)))
            })
        }
        contents.put(JSONObject().apply {
            put("role", "user")
            put("parts", JSONArray().put(JSONObject().put("text", userInput)))
        })

        val body = JSONObject()
            .put("contents", contents)
            .toString()
            .toRequestBody(JSON)

        val req = Request.Builder()
            .url("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=$key")
            .post(body)
            .build()

        return try {
            val resp = client.newCall(req).execute()
            val json = JSONObject(resp.body?.string() ?: "{}")
            if (!resp.isSuccessful) {
                val err = json.optJSONObject("error")?.optString("message") ?: "Unknown error"
                "⚠️ Gemini error: $err"
            } else {
                json.getJSONArray("candidates")
                    .getJSONObject(0)
                    .getJSONObject("content")
                    .getJSONArray("parts")
                    .getJSONObject(0)
                    .getString("text")
                    .trim()
            }
        } catch (e: Exception) {
            "⚠️ Gemini request failed: ${e.message}"
        }
    }

    private fun callOpenAI(key: String, userInput: String, history: List<Pair<String, String>>): String {
        val messages = JSONArray()
        messages.put(JSONObject().put("role", "system").put("content",
            "You are Vexora, a helpful AI assistant on Android."))
        history.takeLast(5).forEach { (u, a) ->
            messages.put(JSONObject().put("role", "user").put("content", u))
            messages.put(JSONObject().put("role", "assistant").put("content", a))
        }
        messages.put(JSONObject().put("role", "user").put("content", userInput))

        val body = JSONObject()
            .put("model", "gpt-3.5-turbo")
            .put("messages", messages)
            .put("max_tokens", 512)
            .toString()
            .toRequestBody(JSON)

        val req = Request.Builder()
            .url("https://api.openai.com/v1/chat/completions")
            .addHeader("Authorization", "Bearer $key")
            .post(body)
            .build()

        return try {
            val resp = client.newCall(req).execute()
            val json = JSONObject(resp.body?.string() ?: "{}")
            if (!resp.isSuccessful) {
                val err = json.optJSONObject("error")?.optString("message") ?: "Unknown error"
                "⚠️ OpenAI error: $err"
            } else {
                json.getJSONArray("choices")
                    .getJSONObject(0)
                    .getJSONObject("message")
                    .getString("content")
                    .trim()
            }
        } catch (e: Exception) {
            "⚠️ OpenAI request failed: ${e.message}"
        }
    }

    private fun callClaude(key: String, userInput: String, history: List<Pair<String, String>>): String {
        val messages = JSONArray()
        history.takeLast(5).forEach { (u, a) ->
            messages.put(JSONObject().put("role", "user").put("content", u))
            messages.put(JSONObject().put("role", "assistant").put("content", a))
        }
        messages.put(JSONObject().put("role", "user").put("content", userInput))

        val body = JSONObject()
            .put("model", "claude-haiku-4-5-20251001")
            .put("max_tokens", 512)
            .put("system", "You are Vexora, a helpful AI assistant on Android.")
            .put("messages", messages)
            .toString()
            .toRequestBody(JSON)

        val req = Request.Builder()
            .url("https://api.anthropic.com/v1/messages")
            .addHeader("x-api-key", key)
            .addHeader("anthropic-version", "2023-06-01")
            .post(body)
            .build()

        return try {
            val resp = client.newCall(req).execute()
            val json = JSONObject(resp.body?.string() ?: "{}")
            if (!resp.isSuccessful) {
                val err = json.optJSONObject("error")?.optString("message") ?: "Unknown error"
                "⚠️ Claude error: $err"
            } else {
                json.getJSONArray("content")
                    .getJSONObject(0)
                    .getString("text")
                    .trim()
            }
        } catch (e: Exception) {
            "⚠️ Claude request failed: ${e.message}"
        }
    }
}
