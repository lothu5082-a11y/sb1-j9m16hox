package com.vexora.aiassistant

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
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

    private lateinit var binding: ActivityMainBinding
    private var llmInference: LlmInference? = null

    private val MODEL_FILENAME = "model.bin"

    private val SYSTEM_PROMPT = """
        You are a helpful, concise AI assistant running fully offline on this device.
        You can control the device. Use these action tokens ONLY when the user explicitly asks:

          [ACTION: CAMERA]   → open the device camera
          [ACTION: SETTINGS] → open device settings

        Rules:
        - Put the action token on its own line at the END of your reply.
        - Never use action tokens unless clearly asked.
        - Keep responses short and friendly.
    """.trimIndent()

    // ── File picker: lets the user choose the .bin model from Downloads ──────
    private val modelPickerLauncher =
        registerForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
            if (uri != null) copyModelFromUri(uri)
        }

    // ── Camera permission ────────────────────────────────────────────────────
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

        val modelFile = File(filesDir, MODEL_FILENAME)
        if (modelFile.exists()) {
            loadModel(modelFile)
        } else {
            showModelSetupScreen()
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        llmInference?.close()
    }

    // ────────────────────────────────────────────────────────────────────────
    // UI
    // ────────────────────────────────────────────────────────────────────────

    private fun setupUi() {
        binding.btnSend.setOnClickListener {
            val text = binding.etInput.text.toString().trim()
            if (text.isBlank()) return@setOnClickListener
            if (llmInference == null) { showToast("Model not loaded yet."); return@setOnClickListener }
            binding.etInput.setText("")
            sendMessage(text)
        }

        // "Choose Model File" button — opens the phone's file picker
        binding.btnPickModel.setOnClickListener {
            // "*/*" shows all files; the user should navigate to Downloads and pick the .bin file
            modelPickerLauncher.launch(arrayOf("*/*"))
        }
    }

    private fun showModelSetupScreen() {
        binding.layoutSetup.visibility = View.VISIBLE
        binding.layoutChat.visibility = View.GONE
        binding.tvSetupInstructions.text =
            "No AI model found.\n\n" +
            "1.  Download a MediaPipe .bin model file to your phone's Downloads folder using your browser.\n\n" +
            "2.  Tap the button below and navigate to your Downloads folder.\n\n" +
            "3.  Select the .bin file — the app will copy it and start automatically."
    }

    private fun showChatScreen() {
        binding.layoutSetup.visibility = View.GONE
        binding.layoutChat.visibility = View.VISIBLE
    }

    // ────────────────────────────────────────────────────────────────────────
    // Model: copy from URI then load
    // ────────────────────────────────────────────────────────────────────────

    private fun copyModelFromUri(uri: Uri) {
        binding.tvSetupInstructions.text = "Copying model file… this may take a few minutes."
        binding.btnPickModel.isEnabled = false

        lifecycleScope.launch(Dispatchers.IO) {
            try {
                val dest = File(filesDir, MODEL_FILENAME)
                contentResolver.openInputStream(uri)?.use { input ->
                    dest.outputStream().use { output -> input.copyTo(output) }
                }
                withContext(Dispatchers.Main) {
                    loadModel(dest)
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    binding.btnPickModel.isEnabled = true
                    binding.tvSetupInstructions.text =
                        "Copy failed: ${e.localizedMessage}\n\nPlease try again."
                }
            }
        }
    }

    private fun loadModel(modelFile: File) {
        showChatScreen()
        setUiBusy(true, "Loading AI model… please wait")

        lifecycleScope.launch(Dispatchers.IO) {
            try {
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
                    appendToChat("AI is ready! How can I help you?")
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

        lifecycleScope.launch(Dispatchers.IO) {
            try {
                val prompt = buildPrompt(userInput)
                val response = llmInference!!.generateResponse(prompt)

                withContext(Dispatchers.Main) {
                    setUiBusy(false)
                    appendToChat("AI: $response")
                    parseAndExecuteActions(response)
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    setUiBusy(false)
                    appendToChat("Error: ${e.localizedMessage}")
                }
            }
        }
    }

    private fun buildPrompt(userInput: String): String =
        "<start_of_turn>system\n$SYSTEM_PROMPT<end_of_turn>\n" +
        "<start_of_turn>user\n$userInput<end_of_turn>\n" +
        "<start_of_turn>model\n"

    // ────────────────────────────────────────────────────────────────────────
    // Action parser
    // ────────────────────────────────────────────────────────────────────────

    private fun parseAndExecuteActions(response: String) {
        if (response.contains("[ACTION: CAMERA]"))   handleCameraAction()
        if (response.contains("[ACTION: SETTINGS]")) handleSettingsAction()
    }

    private fun handleCameraAction() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
            == PackageManager.PERMISSION_GRANTED) {
            launchCamera()
        } else {
            cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
        }
    }

    private fun launchCamera() {
        val intent = Intent(MediaStore.ACTION_IMAGE_CAPTURE)
        if (intent.resolveActivity(packageManager) != null) startActivity(intent)
        else showToast("No camera app found.")
    }

    private fun handleSettingsAction() = startActivity(Intent(Settings.ACTION_SETTINGS))

    // ────────────────────────────────────────────────────────────────────────
    // UI helpers
    // ────────────────────────────────────────────────────────────────────────

    private fun appendToChat(text: String) {
        val current = binding.tvResponse.text.toString()
        binding.tvResponse.text = if (current.isBlank()) text else "$current\n\n$text"
        binding.scrollView.post { binding.scrollView.fullScroll(View.FOCUS_DOWN) }
    }

    private fun setUiBusy(busy: Boolean, hint: String = "") {
        binding.btnSend.isEnabled = !busy
        binding.etInput.isEnabled = !busy
        binding.tvStatus.visibility = if (busy) View.VISIBLE else View.GONE
        binding.tvStatus.text = hint
    }

    private fun showToast(msg: String) = Toast.makeText(this, msg, Toast.LENGTH_SHORT).show()
}
