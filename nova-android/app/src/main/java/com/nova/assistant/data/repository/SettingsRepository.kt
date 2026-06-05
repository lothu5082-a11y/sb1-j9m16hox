package com.nova.assistant.data.repository

import com.nova.assistant.data.preferences.SettingsPreferences
import kotlinx.coroutines.flow.Flow

class SettingsRepository(private val prefs: SettingsPreferences) {
    val apiKey: Flow<String> = prefs.apiKey
    val modelId: Flow<String> = prefs.modelId
    val baseUrl: Flow<String> = prefs.baseUrl
    val speakReplies: Flow<Boolean> = prefs.speakReplies

    suspend fun saveApiKey(key: String) = prefs.setApiKey(key)
    suspend fun saveModelId(model: String) = prefs.setModelId(model)
    suspend fun saveBaseUrl(url: String) = prefs.setBaseUrl(url)
    suspend fun saveSpeakReplies(enabled: Boolean) = prefs.setSpeakReplies(enabled)
}
