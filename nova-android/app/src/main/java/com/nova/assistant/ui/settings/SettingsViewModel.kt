package com.nova.assistant.ui.settings

import android.content.Context
import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.nova.assistant.ai.ModelDownloader
import com.nova.assistant.data.model.BrainMode
import com.nova.assistant.data.repository.SettingsRepository
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.io.File

data class DownloadState(
    val isDownloading: Boolean = false,
    val progress: Int = 0,
    val error: String? = null,
    val done: Boolean = false
)

class SettingsViewModel(private val repo: SettingsRepository) : ViewModel() {

    val apiKey = repo.apiKey.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), "")
    val modelId = repo.modelId.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), "")
    val baseUrl = repo.baseUrl.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), "")
    val brainMode: StateFlow<BrainMode> = repo.brainMode
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), BrainMode.ONLINE)
    val modelPath = repo.modelPath.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), "")
    val speakReplies = repo.speakReplies.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), false)

    private val _downloadState = MutableStateFlow(DownloadState())
    val downloadState: StateFlow<DownloadState> = _downloadState.asStateFlow()

    private var downloadJob: Job? = null
    private val downloader = ModelDownloader()

    fun saveApiKey(key: String) = viewModelScope.launch { repo.saveApiKey(key) }
    fun saveModelId(model: String) = viewModelScope.launch { repo.saveModelId(model) }
    fun saveBaseUrl(url: String) = viewModelScope.launch { repo.saveBaseUrl(url) }
    fun saveBrainMode(mode: BrainMode) = viewModelScope.launch { repo.saveBrainMode(mode) }
    fun saveModelPath(path: String) = viewModelScope.launch { repo.saveModelPath(path) }
    fun saveSpeakReplies(enabled: Boolean) = viewModelScope.launch { repo.saveSpeakReplies(enabled) }

    fun downloadModel(url: String, filesDir: File) {
        if (url.isBlank()) return
        val fileName = url.substringAfterLast('/').ifBlank { "model.bin" }
        val destFile = File(filesDir, "models/$fileName")

        downloadJob = viewModelScope.launch {
            _downloadState.value = DownloadState(isDownloading = true)
            try {
                downloader.download(url, destFile) { percent ->
                    _downloadState.value = DownloadState(isDownloading = true, progress = percent)
                }
                repo.saveModelPath(destFile.absolutePath)
                _downloadState.value = DownloadState(done = true, progress = 100)
            } catch (e: Exception) {
                destFile.delete()
                _downloadState.value = DownloadState(
                    error = e.message ?: "Download failed"
                )
            }
        }
    }

    fun cancelDownload() {
        downloadJob?.cancel()
        _downloadState.value = DownloadState()
    }

    fun dismissDownloadStatus() {
        _downloadState.value = DownloadState()
    }

    /** Copy a user-picked URI to internal storage so MediaPipe can load it by path. */
    fun importModelFromUri(context: Context, uri: Uri) {
        viewModelScope.launch {
            _downloadState.value = DownloadState(isDownloading = true)
            try {
                val dir = File(context.filesDir, "models").also { it.mkdirs() }
                val name = uri.lastPathSegment?.substringAfterLast('/') ?: "model.bin"
                val dest = File(dir, name)
                context.contentResolver.openInputStream(uri)?.use { src ->
                    dest.outputStream().use { dst -> src.copyTo(dst) }
                }
                repo.saveModelPath(dest.absolutePath)
                _downloadState.value = DownloadState(done = true, progress = 100)
            } catch (e: Exception) {
                _downloadState.value = DownloadState(error = "Import failed: ${e.message}")
            }
        }
    }
}

class SettingsViewModelFactory(private val repo: SettingsRepository) : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        @Suppress("UNCHECKED_CAST")
        return SettingsViewModel(repo) as T
    }
}
