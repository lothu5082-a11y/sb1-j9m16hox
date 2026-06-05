package com.nova.assistant.ai

import android.content.Context
import com.google.mediapipe.tasks.genai.llminference.LlmInference
import com.nova.assistant.data.model.ChatMessage
import com.nova.assistant.data.model.Role
import com.nova.assistant.data.remote.ApiResult
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File

class OfflineChatEngine(private val context: Context) {

    private var inference: LlmInference? = null
    private var loadedPath: String = ""

    fun isModelAvailable(modelPath: String): Boolean =
        modelPath.isNotBlank() && File(modelPath).exists()

    fun loadModel(modelPath: String) {
        if (loadedPath == modelPath && inference != null) return
        inference?.close()
        val options = LlmInference.LlmInferenceOptions.builder()
            .setModelPath(modelPath)
            .setMaxTokens(1024)
            .setTopK(40)
            .setTemperature(0.8f)
            .build()
        inference = LlmInference.createFromOptions(context, options)
        loadedPath = modelPath
    }

    suspend fun generate(messages: List<ChatMessage>): ApiResult =
        withContext(Dispatchers.Default) {
            val engine = inference
                ?: return@withContext ApiResult.Error("No model loaded. Go to Settings → Offline to set up a model.")
            try {
                val prompt = buildPrompt(messages)
                ApiResult.Success(engine.generateResponse(prompt))
            } catch (e: Exception) {
                ApiResult.Error("Offline inference error: ${e.message ?: e::class.simpleName}")
            }
        }

    private fun buildPrompt(messages: List<ChatMessage>): String = buildString {
        for (msg in messages) {
            when (msg.role) {
                Role.User -> append("<start_of_turn>user\n${msg.content}<end_of_turn>\n")
                Role.Assistant -> append("<start_of_turn>model\n${msg.content}<end_of_turn>\n")
            }
        }
        append("<start_of_turn>model\n")
    }

    fun close() {
        inference?.close()
        inference = null
        loadedPath = ""
    }
}
