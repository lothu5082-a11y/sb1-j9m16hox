package com.nova.assistant

import android.app.Application
import com.nova.assistant.ai.OfflineChatEngine
import com.nova.assistant.data.local.ChatDatabase
import com.nova.assistant.data.preferences.SettingsPreferences
import com.nova.assistant.data.remote.OpenRouterClient
import com.nova.assistant.data.repository.ChatRepository
import com.nova.assistant.data.repository.SettingsRepository

class NovaApp : Application() {

    val database by lazy { ChatDatabase.create(this) }
    val settingsPreferences by lazy { SettingsPreferences(this) }
    val openRouterClient by lazy { OpenRouterClient() }
    val offlineChatEngine by lazy { OfflineChatEngine(this) }
    val settingsRepository by lazy { SettingsRepository(settingsPreferences) }
    val chatRepository by lazy {
        ChatRepository(
            dao = database.chatDao(),
            client = openRouterClient,
            settingsRepo = settingsRepository,
            offlineEngine = offlineChatEngine,
            context = this
        )
    }

    override fun onTerminate() {
        super.onTerminate()
        offlineChatEngine.close()
    }
}
