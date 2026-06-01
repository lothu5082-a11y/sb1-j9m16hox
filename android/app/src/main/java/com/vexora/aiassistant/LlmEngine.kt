package com.vexora.aiassistant

import android.content.Context
import com.google.mediapipe.tasks.genai.llminference.LlmInference
import java.io.File

object LlmEngine {

    const val MODEL_FILENAME = "gemma-2b-it-gpu-int4.bin"

    private var llm: LlmInference? = null
    var isReady = false
        private set

    fun findModel(context: Context): File? = listOf(
        File(context.filesDir, MODEL_FILENAME),
        File(context.getExternalFilesDir(null), MODEL_FILENAME)
    ).firstOrNull { it.exists() && it.length() > 100_000L }

    fun tryInit(context: Context, onReady: () -> Unit, onFail: (String) -> Unit) {
        val provider = ModelSettings.getProvider(context)
        if (provider != ModelSettings.Provider.LOCAL_GEMMA) {
            onFail("")
            return
        }

        val model = findModel(context)
        if (model == null) {
            onFail(
                "📥 **Gemma 2B not downloaded yet.**\n\n" +
                "Go to **Settings → AI Model** and tap **Download Model** to get it, " +
                "or switch to Gemini/OpenAI/Claude if you have an API key."
            )
            return
        }
        Thread {
            try {
                val opts = LlmInference.LlmInferenceOptions.builder()
                    .setModelPath(model.absolutePath)
                    .setMaxTokens(512)
                    .setTopK(40)
                    .setTemperature(0.8f)
                    .setRandomSeed(42)
                    .build()
                llm = LlmInference.createFromOptions(context.applicationContext, opts)
                isReady = true
                onReady()
            } catch (e: Exception) {
                onFail("Model load failed: ${e.message}\n\nFalling back to built-in AI.")
            }
        }.start()
    }

    fun respond(context: Context, userInput: String, history: List<Pair<String, String>>): String {
        val provider = ModelSettings.getProvider(context)

        return when (provider) {
            ModelSettings.Provider.BUILTIN -> {
                // When online, try fetching real data from the web first
                if (WebSearchEngine.isOnline(context) && WebSearchEngine.shouldSearch(userInput)) {
                    val webResult = WebSearchEngine.search(userInput)
                    if (webResult != null) return webResult
                }
                VexoraEngine.respond(userInput)
            }

            ModelSettings.Provider.LOCAL_GEMMA -> {
                val lm = llm ?: return VexoraEngine.respond(userInput)
                try {
                    val sysCtx = SystemContext.buildPrefix(context)
                    val histStr = history.takeLast(5).joinToString("\n") { (u, a) ->
                        "<start_of_turn>user\n$u<end_of_turn>\n<start_of_turn>model\n$a<end_of_turn>"
                    }
                    val prompt = "$sysCtx$histStr\n<start_of_turn>user\n$userInput<end_of_turn>\n<start_of_turn>model\n"
                    lm.generateResponse(prompt).trim()
                        .removePrefix("<start_of_turn>model").trim()
                        .substringBefore("<end_of_turn>").trim()
                        .ifBlank { VexoraEngine.respond(userInput) }
                } catch (e: Exception) {
                    VexoraEngine.respond(userInput)
                }
            }

            else -> ApiEngine.respond(context, provider, userInput, history)
        }
    }

    fun shutdown() {
        try { llm?.close() } catch (_: Exception) {}
        llm = null
        isReady = false
    }
}
