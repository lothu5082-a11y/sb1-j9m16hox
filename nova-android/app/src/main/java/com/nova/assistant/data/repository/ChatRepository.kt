package com.nova.assistant.data.repository

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import com.nova.assistant.ai.OfflineChatEngine
import com.nova.assistant.data.local.ChatDao
import com.nova.assistant.data.local.MessageEntity
import com.nova.assistant.data.model.BrainMode
import com.nova.assistant.data.model.ChatMessage
import com.nova.assistant.data.model.Role
import com.nova.assistant.data.remote.ApiMessage
import com.nova.assistant.data.remote.ApiResult
import com.nova.assistant.data.remote.OpenRouterClient
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

class ChatRepository(
    private val dao: ChatDao,
    private val client: OpenRouterClient,
    private val settingsRepo: SettingsRepository,
    private val offlineEngine: OfflineChatEngine,
    private val context: Context
) {
    val messages: Flow<List<ChatMessage>> = dao.observeAll().map { entities ->
        entities.map { it.toChatMessage() }
    }

    suspend fun sendMessage(userText: String): ApiResult {
        dao.insert(MessageEntity(role = "user", content = userText))

        val brainMode = settingsRepo.brainMode.first()
        val modelPath = settingsRepo.modelPath.first()
        val chatHistory = dao.getAll().map { it.toChatMessage() }

        val result = when (brainMode) {
            BrainMode.OFFLINE -> runOffline(modelPath, chatHistory)

            BrainMode.AUTO -> {
                if (isOnline() && settingsRepo.apiKey.first().isNotBlank()) {
                    runOnline()
                } else if (offlineEngine.isModelAvailable(modelPath)) {
                    runOffline(modelPath, chatHistory)
                } else {
                    ApiResult.Error("No internet and no offline model available. Check Settings.")
                }
            }

            BrainMode.ONLINE -> runOnline()
        }

        if (result is ApiResult.Success) {
            dao.insert(MessageEntity(role = "assistant", content = result.content))
        }
        return result
    }

    private suspend fun runOnline(): ApiResult {
        val apiMessages = dao.getAll().map { ApiMessage(role = it.role, content = it.content) }
        val apiKey = settingsRepo.apiKey.first()
        val model = settingsRepo.modelId.first()
        val baseUrl = settingsRepo.baseUrl.first()
        return client.chat(apiKey, model, apiMessages, baseUrl)
    }

    private suspend fun runOffline(modelPath: String, history: List<ChatMessage>): ApiResult {
        if (!offlineEngine.isModelAvailable(modelPath)) {
            return ApiResult.Error(
                "No offline model found. Go to Settings → Offline to download one."
            )
        }
        return try {
            offlineEngine.loadModel(modelPath)
            offlineEngine.generate(history)
        } catch (e: Exception) {
            ApiResult.Error("Failed to load model: ${e.message ?: e::class.simpleName}")
        }
    }

    private fun isOnline(): Boolean {
        val cm = context.getSystemService(ConnectivityManager::class.java)
        val net = cm.activeNetwork ?: return false
        val caps = cm.getNetworkCapabilities(net) ?: return false
        return caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
    }

    suspend fun clearHistory() = dao.clearAll()

    private fun MessageEntity.toChatMessage() = ChatMessage(
        id = id,
        role = if (role == "user") Role.User else Role.Assistant,
        content = content,
        timestamp = timestamp
    )
}
