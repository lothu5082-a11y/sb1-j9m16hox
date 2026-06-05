package com.nova.assistant.data.repository

import com.nova.assistant.data.local.ChatDao
import com.nova.assistant.data.local.MessageEntity
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
    private val settingsRepo: SettingsRepository
) {
    val messages: Flow<List<ChatMessage>> = dao.observeAll().map { entities ->
        entities.map { it.toChatMessage() }
    }

    suspend fun sendMessage(userText: String): ApiResult {
        dao.insert(MessageEntity(role = "user", content = userText))

        val history = dao.getAll().map { ApiMessage(role = it.role, content = it.content) }
        val apiKey = settingsRepo.apiKey.first()
        val model = settingsRepo.modelId.first()
        val baseUrl = settingsRepo.baseUrl.first()

        val result = client.chat(apiKey, model, history, baseUrl)

        if (result is ApiResult.Success) {
            dao.insert(MessageEntity(role = "assistant", content = result.content))
        }
        return result
    }

    suspend fun clearHistory() = dao.clearAll()

    private fun MessageEntity.toChatMessage() = ChatMessage(
        id = id,
        role = if (role == "user") Role.User else Role.Assistant,
        content = content,
        timestamp = timestamp
    )
}
