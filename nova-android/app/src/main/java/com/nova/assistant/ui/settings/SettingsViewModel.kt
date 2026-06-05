package com.nova.assistant.ui.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.nova.assistant.data.repository.SettingsRepository
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class SettingsViewModel(private val repo: SettingsRepository) : ViewModel() {

    val apiKey = repo.apiKey.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), "")
    val modelId = repo.modelId.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), "")
    val speakReplies = repo.speakReplies.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), false)

    fun saveApiKey(key: String) = viewModelScope.launch { repo.saveApiKey(key) }
    fun saveModelId(model: String) = viewModelScope.launch { repo.saveModelId(model) }
    fun saveSpeakReplies(enabled: Boolean) = viewModelScope.launch { repo.saveSpeakReplies(enabled) }
}

class SettingsViewModelFactory(private val repo: SettingsRepository) : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        @Suppress("UNCHECKED_CAST")
        return SettingsViewModel(repo) as T
    }
}
