package com.nova.assistant.data.model

enum class Role { User, Assistant }

data class ChatMessage(
    val id: Long = 0,
    val role: Role,
    val content: String,
    val timestamp: Long = System.currentTimeMillis()
)
