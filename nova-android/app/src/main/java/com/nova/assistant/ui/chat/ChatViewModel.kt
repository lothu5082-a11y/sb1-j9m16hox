package com.nova.assistant.ui.chat

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.nova.assistant.data.model.BrainMode
import com.nova.assistant.data.model.ChatMessage
import com.nova.assistant.data.model.Role
import com.nova.assistant.data.remote.ApiResult
import com.nova.assistant.data.repository.ChatRepository
import com.nova.assistant.data.repository.SettingsRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

// Re-export for the UI layer
typealias UiMessage = ChatMessage

data class ChatUiState(
    val isLoading: Boolean = false,
    val errorMessage: String? = null,
    val speakText: String? = null
)

class ChatViewModel(
    private val repo: ChatRepository,
    private val settingsRepo: SettingsRepository
) : ViewModel() {

    val messages: StateFlow<List<UiMessage>> = repo.messages
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    val brainMode: StateFlow<BrainMode> = settingsRepo.brainMode
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), BrainMode.ONLINE)

    private val _uiState = MutableStateFlow(ChatUiState())
    val uiState: StateFlow<ChatUiState> = _uiState.asStateFlow()

    fun send(text: String) {
        if (text.isBlank() || _uiState.value.isLoading) return
        viewModelScope.launch {
            _uiState.value = ChatUiState(isLoading = true, errorMessage = null)
            when (val result = repo.sendMessage(text.trim())) {
                is ApiResult.Success -> {
                    val shouldSpeak = settingsRepo.speakReplies.first()
                    _uiState.value = ChatUiState(
                        speakText = if (shouldSpeak) result.content else null
                    )
                }
                is ApiResult.Error -> _uiState.value = ChatUiState(errorMessage = result.message)
            }
        }
    }

    fun clearError() {
        _uiState.value = _uiState.value.copy(errorMessage = null)
    }

    fun clearSpeakText() {
        _uiState.value = _uiState.value.copy(speakText = null)
    }

    fun clearHistory() {
        viewModelScope.launch { repo.clearHistory() }
    }
}

class ChatViewModelFactory(
    private val repo: ChatRepository,
    private val settingsRepo: SettingsRepository
) : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        @Suppress("UNCHECKED_CAST")
        return ChatViewModel(repo, settingsRepo) as T
    }
}
