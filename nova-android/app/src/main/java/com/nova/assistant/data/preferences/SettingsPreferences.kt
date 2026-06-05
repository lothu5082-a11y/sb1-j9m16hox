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
        private val KEY_SPEAK_REPLIES = booleanPreferencesKey("speak_replies")
        const val DEFAULT_MODEL = "meta-llama/llama-3.1-8b-instruct:free"
    }

    val apiKey: Flow<String> = context.dataStore.data.map { it[KEY_API_KEY] ?: "" }
    val modelId: Flow<String> = context.dataStore.data.map { it[KEY_MODEL] ?: DEFAULT_MODEL }
    val speakReplies: Flow<Boolean> = context.dataStore.data.map { it[KEY_SPEAK_REPLIES] ?: false }

    suspend fun setApiKey(key: String) = context.dataStore.edit { it[KEY_API_KEY] = key }
    suspend fun setModelId(model: String) = context.dataStore.edit { it[KEY_MODEL] = model }
    suspend fun setSpeakReplies(enabled: Boolean) = context.dataStore.edit { it[KEY_SPEAK_REPLIES] = enabled }
}
