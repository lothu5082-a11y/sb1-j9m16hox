package com.vexora.aiassistant

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.provider.MediaStore
import android.provider.Settings
import android.view.View
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import com.google.mediapipe.tasks.genai.llminference.LlmInference
import com.vexora.aiassistant.databinding.ActivityMainBinding
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File

class MainActivity : AppCompatActivity() {

    // ── View binding ────────────────────────────────────────────────────────
    private lateinit var binding: ActivityMainBinding

    // ── MediaPipe LLM engine (nullable until model is loaded) ───────────────
    private var llmInference: LlmInference? = null

    // ── Expected model filename inside internal storage ──────────────────────
    // Place your .bin model file at:  /data/data/<package>/files/model.bin
    // You can push it via adb:
    //   adb push gemma-2b-it-gpu-int4.bin /data/data/com.vexora.aiassistant/files/model.bin
    private val MODEL_FILENAME = "model.bin"

    // ── System prompt injected before every user turn ───────────────────────
    private val SYSTEM_PROMPT = """
        You are a helpful, concise AI assistant running fully offline on this device.
        You have the ability to control the device. Use the following action tokens
        ONLY when the user explicitly requests the matching action:

          [ACTION: CAMERA]   → open the device camera
          [ACTION: SETTINGS] → open device settings

        Rules:
        - Output an action token on its own line at the END of your reply.
        - Never fabricate action tokens; use them only when clearly asked.
        - Keep responses short and friendly.
    """.trimIndent()

    // ── Camera permission launcher ───────────────────────────────────────────
    private val cameraPermissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            if (granted) launchCamera() else showToast("Camera permission denied.")
        }

    // ────────────────────────────────────────────────────────────────────────
    // Lifecycle
    // ────────────────────────────────────────────────────────────────────────

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupUi()
        loadModel()
    }

    override fun onDestroy() {
        super.onDestroy()
        llmInference?.close()
    }

    // ────────────────────────────────────────────────────────────────────────
    // UI setup
    // ────────────────────────────────────────────────────────────────────────

    private fun setupUi() {
        binding.btnSend.setOnClickListener {
            val userText = binding.etInput.text.toString().trim()
            if (userText.isBlank()) return@setOnClickListener
            if (llmInference == null) {
                showToast("Model not loaded yet. Please wait…")
                return@setOnClickListener
            }
            binding.etInput.setText("")
            sendMessage(userText)
        }
    }

    // ────────────────────────────────────────────────────────────────────────
    // Model loading
    // ────────────────────────────────────────────────────────────────────────

    private fun loadModel() {
        setUiBusy(true, "Loading model…")

        lifecycleScope.launch(Dispatchers.IO) {
            try {
                val modelFile = File(filesDir, MODEL_FILENAME)

                if (!modelFile.exists()) {
                    withContext(Dispatchers.Main) {
                        setUiBusy(false)
                        appendToChat(
                            "ERROR: Model file not found at:\n${modelFile.absolutePath}\n\n" +
                            "Push your .bin model with:\n" +
                            "adb push <model>.bin ${modelFile.absolutePath}"
                        )
                    }
                    return@launch
                }

                val options = LlmInference.LlmInferenceOptions.builder()
                    .setModelPath(modelFile.absolutePath)
                    .setMaxTokens(1024)
                    .setTopK(40)
                    .setTemperature(0.8f)
                    .setRandomSeed(42)
                    .build()

                llmInference = LlmInference.createFromOptions(this@MainActivity, options)

                withContext(Dispatchers.Main) {
                    setUiBusy(false)
                    appendToChat("Model loaded. How can I help you?")
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    setUiBusy(false)
                    appendToChat("Failed to load model: ${e.localizedMessage}")
                }
            }
        }
    }

    // ────────────────────────────────────────────────────────────────────────
    // Inference
    // ────────────────────────────────────────────────────────────────────────

    private fun sendMessage(userInput: String) {
        appendToChat("You: $userInput")
        setUiBusy(true, "Thinking…")

        // Build a simple turn-based prompt understood by most instruction-tuned models.
        val prompt = buildPrompt(userInput)

        // Run inference on a background thread so the UI stays responsive.
        lifecycleScope.launch(Dispatchers.IO) {
            try {
                // generateResponse is synchronous; use generateResponseAsync for streaming.
                val rawResponse = llmInference!!.generateResponse(prompt)

                withContext(Dispatchers.Main) {
                    setUiBusy(false)
                    appendToChat("AI: $rawResponse")
                    parseAndExecuteActions(rawResponse)
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    setUiBusy(false)
                    appendToChat("Inference error: ${e.localizedMessage}")
                }
            }
        }
    }

    /**
     * Wraps the user message in a system + user/assistant template.
     * Gemma-style format; adjust brackets if you use a different model family.
     */
    private fun buildPrompt(userInput: String): String {
        return "<start_of_turn>system\n$SYSTEM_PROMPT<end_of_turn>\n" +
               "<start_of_turn>user\n$userInput<end_of_turn>\n" +
               "<start_of_turn>model\n"
    }

    // ────────────────────────────────────────────────────────────────────────
    // Action parser
    // ────────────────────────────────────────────────────────────────────────

    /**
     * Scans the AI response for embedded action tokens and fires the
     * corresponding Android intent.  Multiple actions in one response are
     * each executed in order.
     */
    private fun parseAndExecuteActions(response: String) {
        if (response.contains("[ACTION: CAMERA]")) {
            handleCameraAction()
        }
        if (response.contains("[ACTION: SETTINGS]")) {
            handleSettingsAction()
        }
    }

    // ── Camera ───────────────────────────────────────────────────────────────

    private fun handleCameraAction() {
        when {
            ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
                    == PackageManager.PERMISSION_GRANTED -> launchCamera()
            else -> cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
        }
    }

    private fun launchCamera() {
        val intent = Intent(MediaStore.ACTION_IMAGE_CAPTURE)
        if (intent.resolveActivity(packageManager) != null) {
            startActivity(intent)
        } else {
            showToast("No camera app found on this device.")
        }
    }

    // ── Settings ─────────────────────────────────────────────────────────────

    private fun handleSettingsAction() {
        val intent = Intent(Settings.ACTION_SETTINGS)
        startActivity(intent)
    }

    // ────────────────────────────────────────────────────────────────────────
    // UI helpers
    // ────────────────────────────────────────────────────────────────────────

    private fun appendToChat(text: String) {
        val current = binding.tvResponse.text.toString()
        val updated = if (current.isBlank()) text else "$current\n\n$text"
        binding.tvResponse.text = updated
        // Auto-scroll to bottom
        binding.scrollView.post { binding.scrollView.fullScroll(View.FOCUS_DOWN) }
    }

    private fun setUiBusy(busy: Boolean, hint: String = "") {
        binding.btnSend.isEnabled = !busy
        binding.etInput.isEnabled = !busy
        binding.tvStatus.visibility = if (busy) View.VISIBLE else View.GONE
        binding.tvStatus.text = hint
    }

    private fun showToast(message: String) {
        Toast.makeText(this, message, Toast.LENGTH_SHORT).show()
    }
}
