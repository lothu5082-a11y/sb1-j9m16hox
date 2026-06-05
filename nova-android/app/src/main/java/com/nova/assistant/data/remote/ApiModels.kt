package com.nova.assistant.data.remote

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class ApiMessage(
    val role: String,
    val content: String
)

@Serializable
data class ChatRequest(
    val model: String,
    val messages: List<ApiMessage>
)

@Serializable
data class ChatResponse(
    val choices: List<Choice> = emptyList()
)

@Serializable
data class Choice(
    val message: ApiMessage,
    @SerialName("finish_reason") val finishReason: String? = null
)
