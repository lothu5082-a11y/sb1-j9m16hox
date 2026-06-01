package com.vexora.aiassistant

data class ChatMessage(
    val text: String,
    val isUser: Boolean,
    val time: String
)
