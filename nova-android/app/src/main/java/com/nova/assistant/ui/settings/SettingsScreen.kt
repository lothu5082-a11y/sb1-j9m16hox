package com.nova.assistant.ui.settings

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.nova.assistant.data.model.BrainMode
import com.nova.assistant.data.preferences.SettingsPreferences
import java.io.File

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun SettingsScreen(viewModel: SettingsViewModel, onBack: () -> Unit) {
    val context = LocalContext.current

    val savedApiKey by viewModel.apiKey.collectAsStateWithLifecycle()
    val savedModel by viewModel.modelId.collectAsStateWithLifecycle()
    val savedBaseUrl by viewModel.baseUrl.collectAsStateWithLifecycle()
    val brainMode by viewModel.brainMode.collectAsStateWithLifecycle()
    val modelPath by viewModel.modelPath.collectAsStateWithLifecycle()
    val speakReplies by viewModel.speakReplies.collectAsStateWithLifecycle()
    val dlState by viewModel.downloadState.collectAsStateWithLifecycle()

    var apiKeyDraft by remember(savedApiKey) { mutableStateOf(savedApiKey) }
    var modelDraft by remember(savedModel) { mutableStateOf(savedModel) }
    var baseUrlDraft by remember(savedBaseUrl) { mutableStateOf(savedBaseUrl) }
    var apiKeyVisible by remember { mutableStateOf(false) }
    var downloadUrl by remember { mutableStateOf("") }

    val filePicker = rememberLauncherForActivityResult(
        ActivityResultContracts.OpenDocument()
    ) { uri -> uri?.let { viewModel.importModelFromUri(context, it) } }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Settings") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        },
        containerColor = MaterialTheme.colorScheme.background
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp)
        ) {

            // ── Brain mode ─────────────────────────────────────────────────────
            SectionLabel("Brain")
            Text(
                "Choose which AI engine Nova uses to reply.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                BrainMode.entries.forEach { mode ->
                    FilterChip(
                        selected = brainMode == mode,
                        onClick = { viewModel.saveBrainMode(mode) },
                        label = { Text(mode.label) }
                    )
                }
            }

            // ── Offline model (shown when Offline or Auto is active) ───────────
            if (brainMode != BrainMode.ONLINE) {
                HorizontalDivider()
                SectionLabel("Offline Model")

                // Current model
                val modelFile = if (modelPath.isNotBlank()) File(modelPath) else null
                if (modelFile != null && modelFile.exists()) {
                    Surface(
                        color = MaterialTheme.colorScheme.secondaryContainer,
                        shape = MaterialTheme.shapes.small
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    modelFile.name,
                                    style = MaterialTheme.typography.bodyMedium
                                )
                                Text(
                                    "%.1f GB".format(modelFile.length() / 1_073_741_824.0),
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                            TextButton(onClick = { viewModel.saveModelPath("") }) {
                                Text("Remove")
                            }
                        }
                    }
                } else {
                    Text(
                        "No model loaded. Download below or pick a .bin / .gguf file from your device.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                // Pick from device
                OutlinedButton(
                    onClick = { filePicker.launch(arrayOf("*/*")) },
                    modifier = Modifier.fillMaxWidth()
                ) { Text("Pick model file from device") }

                // Download from URL
                OutlinedTextField(
                    value = downloadUrl,
                    onValueChange = { downloadUrl = it },
                    label = { Text("Model download URL") },
                    placeholder = { Text("https://…/gemma-2b-it-cpu-int4.bin") },
                    supportingText = {
                        Text(
                            "Gemma 2B IT from Kaggle (requires login) · any direct .bin/.gguf link",
                            style = MaterialTheme.typography.labelSmall
                        )
                    },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

                // Download progress / button
                if (dlState.isDownloading) {
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        LinearProgressIndicator(
                            progress = { dlState.progress / 100f },
                            modifier = Modifier.fillMaxWidth()
                        )
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("${dlState.progress}%", style = MaterialTheme.typography.labelSmall)
                            TextButton(onClick = { viewModel.cancelDownload() }) { Text("Cancel") }
                        }
                    }
                } else {
                    if (dlState.done) {
                        Text(
                            "Model downloaded successfully.",
                            color = MaterialTheme.colorScheme.primary,
                            style = MaterialTheme.typography.bodySmall
                        )
                    }
                    dlState.error?.let { err ->
                        Text(err, color = MaterialTheme.colorScheme.error,
                            style = MaterialTheme.typography.bodySmall)
                    }
                    Button(
                        onClick = {
                            viewModel.downloadModel(downloadUrl, context.filesDir)
                        },
                        enabled = downloadUrl.isNotBlank(),
                        modifier = Modifier.align(Alignment.End)
                    ) { Text("Download") }
                }
            }

            HorizontalDivider()

            // ── Provider / online settings ─────────────────────────────────────
            SectionLabel("Provider")
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                SettingsPreferences.PRESETS.forEach { (label, url) ->
                    FilterChip(
                        selected = baseUrlDraft == url,
                        onClick = {
                            baseUrlDraft = url
                            viewModel.saveBaseUrl(url)
                            if (url.contains("generativelanguage") &&
                                modelDraft == SettingsPreferences.DEFAULT_MODEL) {
                                modelDraft = "gemini-2.0-flash"
                                viewModel.saveModelId("gemini-2.0-flash")
                            } else if (!url.contains("generativelanguage") &&
                                modelDraft == "gemini-2.0-flash") {
                                modelDraft = SettingsPreferences.DEFAULT_MODEL
                                viewModel.saveModelId(SettingsPreferences.DEFAULT_MODEL)
                            }
                        },
                        label = { Text(label) }
                    )
                }
            }
            OutlinedTextField(
                value = baseUrlDraft,
                onValueChange = { baseUrlDraft = it },
                label = { Text("Base URL") },
                supportingText = { Text("URL up to (not including) /chat/completions") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )
            Button(
                onClick = { viewModel.saveBaseUrl(baseUrlDraft) },
                modifier = Modifier.align(Alignment.End)
            ) { Text("Save URL") }

            HorizontalDivider()

            // ── API Key ───────────────────────────────────────────────────────
            SectionLabel("API Key")
            OutlinedTextField(
                value = apiKeyDraft,
                onValueChange = { apiKeyDraft = it },
                label = { Text("API Key") },
                placeholder = { Text("sk-or-…  or  AIza…") },
                visualTransformation = if (apiKeyVisible) VisualTransformation.None
                else PasswordVisualTransformation(),
                trailingIcon = {
                    IconButton(onClick = { apiKeyVisible = !apiKeyVisible }) {
                        Icon(
                            if (apiKeyVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                            contentDescription = null
                        )
                    }
                },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )
            Button(
                onClick = { viewModel.saveApiKey(apiKeyDraft) },
                modifier = Modifier.align(Alignment.End)
            ) { Text("Save Key") }

            HorizontalDivider()

            // ── Model ─────────────────────────────────────────────────────────
            SectionLabel("Online Model")
            OutlinedTextField(
                value = modelDraft,
                onValueChange = { modelDraft = it },
                label = { Text("Model ID") },
                supportingText = {
                    val hint = if (baseUrlDraft.contains("generativelanguage"))
                        "e.g. gemini-2.0-flash  •  gemini-1.5-pro"
                    else
                        "Browse free models at openrouter.ai/models?q=free"
                    Text(hint, style = MaterialTheme.typography.labelSmall)
                },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )
            Button(
                onClick = { viewModel.saveModelId(modelDraft) },
                modifier = Modifier.align(Alignment.End)
            ) { Text("Save Model") }

            HorizontalDivider()

            // ── Voice ─────────────────────────────────────────────────────────
            SectionLabel("Voice")
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text("Speak replies", style = MaterialTheme.typography.bodyLarge)
                    Text(
                        "Nova reads assistant responses aloud",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                Switch(checked = speakReplies, onCheckedChange = { viewModel.saveSpeakReplies(it) })
            }
        }
    }
}

@Composable
private fun SectionLabel(text: String) {
    Text(
        text = text,
        style = MaterialTheme.typography.titleSmall,
        color = MaterialTheme.colorScheme.primary
    )
}
