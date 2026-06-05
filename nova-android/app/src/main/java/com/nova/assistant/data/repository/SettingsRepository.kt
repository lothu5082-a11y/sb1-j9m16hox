package com.nova.assistant.data.repository

import com.nova.assistant.data.preferences.SettingsPreferences
import com.nova.assistant.data.model.BrainMode
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

class SettingsRepository(private val prefs: SettingsPreferences) {
    val apiKey: Flow<String> = prefs.apiKey
    val modelId: Flow<String> = prefs.modelId
    val baseUrl: Flow<String> = prefs.baseUrl
    val brainMode: Flow<BrainMode> = prefs.brainMode.map { name ->
        BrainMode.entries.firstOrNull { it.name == name } ?: BrainMode.ONLINE
    }
    val modelPath: Flow<String> = prefs.modelPath
    val speakReplies: Flow<Boolean> = prefs.speakReplies

    suspend fun saveApiKey(key: String) = prefs.setApiKey(key)
    suspend fun saveModelId(model: String) = prefs.setModelId(model)
    suspend fun saveBaseUrl(url: String) = prefs.setBaseUrl(url)
    suspend fun saveBrainMode(mode: BrainMode) = prefs.setBrainMode(mode.name)
    suspend fun saveModelPath(path: String) = prefs.setModelPath(path)
    suspend fun saveSpeakReplies(enabled: Boolean) = prefs.setSpeakReplies(enabled)
}
