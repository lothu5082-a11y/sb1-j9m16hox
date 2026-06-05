package com.nova.assistant.ui.settings

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
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.nova.assistant.data.preferences.SettingsPreferences

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun SettingsScreen(
    viewModel: SettingsViewModel,
    onBack: () -> Unit
) {
    val savedApiKey by viewModel.apiKey.collectAsStateWithLifecycle()
    val savedModel by viewModel.modelId.collectAsStateWithLifecycle()
    val savedBaseUrl by viewModel.baseUrl.collectAsStateWithLifecycle()
    val speakReplies by viewModel.speakReplies.collectAsStateWithLifecycle()

    var apiKeyDraft by remember(savedApiKey) { mutableStateOf(savedApiKey) }
    var modelDraft by remember(savedModel) { mutableStateOf(savedModel) }
    var baseUrlDraft by remember(savedBaseUrl) { mutableStateOf(savedBaseUrl) }
    var apiKeyVisible by remember { mutableStateOf(false) }

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

            // ── Provider ──────────────────────────────────────────────────────
            SectionLabel("Provider")
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                SettingsPreferences.PRESETS.forEach { (label, url) ->
                    val selected = baseUrlDraft == url
                    FilterChip(
                        selected = selected,
                        onClick = {
                            baseUrlDraft = url
                            viewModel.saveBaseUrl(url)
                            // Auto-switch default model hint when changing provider
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
                            contentDescription = if (apiKeyVisible) "Hide key" else "Show key"
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
            SectionLabel("Model")
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
                Switch(
                    checked = speakReplies,
                    onCheckedChange = { viewModel.saveSpeakReplies(it) }
                )
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
