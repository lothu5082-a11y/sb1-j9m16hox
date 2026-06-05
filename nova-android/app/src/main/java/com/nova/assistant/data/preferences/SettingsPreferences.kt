package com.nova.assistant.data.preferences

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "nova_settings")

class SettingsPreferences(private val context: Context) {

    companion object {
        private val KEY_API_KEY = stringPreferencesKey("openrouter_api_key")
        private val KEY_MODEL = stringPreferencesKey("model_id")
        private val KEY_BASE_URL = stringPreferencesKey("base_url")
        private val KEY_BRAIN_MODE = stringPreferencesKey("brain_mode")
        private val KEY_MODEL_PATH = stringPreferencesKey("offline_model_path")
        private val KEY_SPEAK_REPLIES = booleanPreferencesKey("speak_replies")

        const val DEFAULT_MODEL = "meta-llama/llama-3.1-8b-instruct:free"
        const val DEFAULT_BASE_URL = "https://openrouter.ai/api/v1"

        val PRESETS = listOf(
            "OpenRouter" to "https://openrouter.ai/api/v1",
            "Gemini" to "https://generativelanguage.googleapis.com/v1beta/openai"
        )
    }

    val apiKey: Flow<String> = context.dataStore.data.map { it[KEY_API_KEY] ?: "" }
    val modelId: Flow<String> = context.dataStore.data.map { it[KEY_MODEL] ?: DEFAULT_MODEL }
    val baseUrl: Flow<String> = context.dataStore.data.map { it[KEY_BASE_URL] ?: DEFAULT_BASE_URL }
    val brainMode: Flow<String> = context.dataStore.data.map { it[KEY_BRAIN_MODE] ?: "ONLINE" }
    val modelPath: Flow<String> = context.dataStore.data.map { it[KEY_MODEL_PATH] ?: "" }
    val speakReplies: Flow<Boolean> = context.dataStore.data.map { it[KEY_SPEAK_REPLIES] ?: false }

    suspend fun setApiKey(key: String) = context.dataStore.edit { it[KEY_API_KEY] = key }
    suspend fun setModelId(model: String) = context.dataStore.edit { it[KEY_MODEL] = model }
    suspend fun setBaseUrl(url: String) = context.dataStore.edit { it[KEY_BASE_URL] = url }
    suspend fun setBrainMode(mode: String) = context.dataStore.edit { it[KEY_BRAIN_MODE] = mode }
    suspend fun setModelPath(path: String) = context.dataStore.edit { it[KEY_MODEL_PATH] = path }
    suspend fun setSpeakReplies(enabled: Boolean) = context.dataStore.edit { it[KEY_SPEAK_REPLIES] = enabled }
}
