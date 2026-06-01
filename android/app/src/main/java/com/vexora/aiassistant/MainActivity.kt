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
import java.net.HttpURLConnection
import java.net.URL

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private var llmInference: LlmInference? = null

    private val MODEL_FILENAME = "model.bin"

    // ── Model download URL ───────────────────────────────────────────────────
    // Gemma 3 1B IT INT4 — LiteRT/MediaPipe format, hosted publicly on HuggingFace.
    // Smaller than Gemma 2B (~1 GB) and loads faster on phones.
    private val MODEL_URL =
        "https://huggingface.co/litert-community/Gemma3-1B-IT-int4/resolve/main/" +
        "gemma3-1b-it-int4.bin"

    // Backup URL tried automatically if the first one fails
    private val MODEL_URL_FALLBACK =
        "https://huggingface.co/litert-community/Gemma2-2b-it-CPU-INT8/resolve/main/" +
        "gemma2-2b-it-cpu-int8.bin"

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

    // ── File picker (fallback if auto-download fails) ────────────────────────
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
        if (modelFile.exists() && modelFile.length() > 1_000_000L) {
            // Model already downloaded from a previous launch — load it directly
            loadModel(modelFile)
        } else {
            // First launch: download automatically
            downloadModel(modelFile)
        }
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
            val text = binding.etInput.text.toString().trim()
            if (text.isBlank()) return@setOnClickListener
            if (llmInference == null) { showToast("Model not ready yet."); return@setOnClickListener }
            binding.etInput.setText("")
            sendMessage(text)
        }

        // Fallback: let user pick their own model file if download fails
        binding.btnPickModel.setOnClickListener {
            modelPickerLauncher.launch(arrayOf("*/*"))
        }
    }

    // ────────────────────────────────────────────────────────────────────────
    // Auto-download model
    // ────────────────────────────────────────────────────────────────────────

    private fun downloadModel(dest: File) {
        showScreen(Screen.DOWNLOAD)
        setDownloadStatus("Connecting…", -1, "")
        lifecycleScope.launch(Dispatchers.IO) {
            // Try primary URL, then backup URL automatically
            val tried = mutableListOf<String>()
            for (url in listOf(MODEL_URL, MODEL_URL_FALLBACK)) {
                tried += url
                val ok = tryDownload(url, dest)
                if (ok) { withContext(Dispatchers.Main) { loadModel(dest) }; return@launch }
                dest.delete()
            }
            withContext(Dispatchers.Main) {
                showScreen(Screen.FALLBACK)
                binding.tvFallbackMessage.text =
                    "Auto-download failed from both servers.\n\n" +
                    "Please download a MediaPipe .bin model file\n" +
                    "to your phone's Downloads folder, then tap\n" +
                    "the button below to select it."
            }
        }
    }

    /** Returns true if download succeeded, false on any error. */
    private suspend fun tryDownload(url: String, dest: File): Boolean {
        return try {
            withContext(Dispatchers.Main) { setDownloadStatus("Connecting to server…", -1, "") }
            val connection = (URL(url).openConnection() as HttpURLConnection).apply {
                connectTimeout = 20_000
                readTimeout    = 60_000
                instanceFollowRedirects = true   // follow HuggingFace redirects
                setRequestProperty("User-Agent", "VexoraAI/1.0")
                connect()
            }
            if (connection.responseCode != HttpURLConnection.HTTP_OK) return false

            val totalBytes = connection.contentLengthLong
            var downloaded = 0L
            val buffer = ByteArray(16_384)

            connection.inputStream.use { input ->
                dest.outputStream().use { output ->
                    var n: Int
                    while (input.read(buffer).also { n = it } != -1) {
                        output.write(buffer, 0, n)
                        downloaded += n
                        val pct      = if (totalBytes > 0) (downloaded * 100 / totalBytes).toInt() else -1
                        val dlMb     = downloaded / (1024 * 1024)
                        val totMb    = if (totalBytes > 0) "${totalBytes / (1024 * 1024)} MB" else "?"
                        val sizeText = "${dlMb} MB / $totMb"
                        withContext(Dispatchers.Main) {
                            setDownloadStatus("Downloading AI model…", pct, sizeText)
                        }
                    }
                }
            }
            true
        } catch (e: Exception) { false }
    }

    private fun setDownloadStatus(label: String, pct: Int, size: String) {
        binding.tvDownloadLabel.text = label
        binding.tvDownloadSize.text  = size
        if (pct in 0..100) {
            binding.downloadProgress.isIndeterminate = false
            binding.downloadProgress.progress = pct
        } else {
            binding.downloadProgress.isIndeterminate = true
        }
    }

    // ────────────────────────────────────────────────────────────────────────
    // Manual fallback: copy from URI
    // ────────────────────────────────────────────────────────────────────────

    private fun copyModelFromUri(uri: Uri) {
        showScreen(Screen.DOWNLOAD)
        setDownloadStatus("Copying model file…", -1, "")

        lifecycleScope.launch(Dispatchers.IO) {
            try {
                val dest = File(filesDir, MODEL_FILENAME)
                contentResolver.openInputStream(uri)?.use { input ->
                    dest.outputStream().use { output -> input.copyTo(output) }
                }
                withContext(Dispatchers.Main) { loadModel(dest) }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    showScreen(Screen.FALLBACK)
                    binding.tvFallbackMessage.text = "Copy failed: ${e.localizedMessage}"
                }
            }
        }
    }

    // ────────────────────────────────────────────────────────────────────────
    // Load model into MediaPipe
    // ────────────────────────────────────────────────────────────────────────

    private fun loadModel(modelFile: File) {
        showScreen(Screen.DOWNLOAD)
        setDownloadStatus("Loading AI into memory… (first time takes ~30s)", -1, "")

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
                    showScreen(Screen.CHAT)
                    appendToChat("AI is ready! How can I help you?")
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    showScreen(Screen.FALLBACK)
                    binding.tvFallbackMessage.text =
                        "Failed to load model: ${e.localizedMessage}\n\n" +
                        "The downloaded file may be corrupted. Try again."
                    File(filesDir, MODEL_FILENAME).delete()
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
                val response = llmInference!!.generateResponse(buildPrompt(userInput))
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
            == PackageManager.PERMISSION_GRANTED) launchCamera()
        else cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
    }

    private fun launchCamera() {
        val i = Intent(MediaStore.ACTION_IMAGE_CAPTURE)
        if (i.resolveActivity(packageManager) != null) startActivity(i)
        else showToast("No camera app found.")
    }

    private fun handleSettingsAction() = startActivity(Intent(Settings.ACTION_SETTINGS))

    // ────────────────────────────────────────────────────────────────────────
    // Screen switcher
    // ────────────────────────────────────────────────────────────────────────

    private enum class Screen { DOWNLOAD, FALLBACK, CHAT }

    private fun showScreen(s: Screen) {
        binding.layoutDownload.visibility = if (s == Screen.DOWNLOAD) View.VISIBLE else View.GONE
        binding.layoutFallback.visibility = if (s == Screen.FALLBACK) View.VISIBLE else View.GONE
        binding.layoutChat.visibility     = if (s == Screen.CHAT)     View.VISIBLE else View.GONE
    }

    // ────────────────────────────────────────────────────────────────────────
    // Chat UI helpers
    // ────────────────────────────────────────────────────────────────────────

    private fun appendToChat(text: String) {
        val cur = binding.tvResponse.text.toString()
        binding.tvResponse.text = if (cur.isBlank()) text else "$cur\n\n$text"
        binding.scrollView.post { binding.scrollView.fullScroll(View.FOCUS_DOWN) }
    }

    private fun setUiBusy(busy: Boolean, hint: String = "") {
        binding.btnSend.isEnabled  = !busy
        binding.etInput.isEnabled  = !busy
        binding.tvStatus.visibility = if (busy) View.VISIBLE else View.GONE
        binding.tvStatus.text = hint
    }

    private fun showToast(msg: String) =
        Toast.makeText(this, msg, Toast.LENGTH_SHORT).show()
}
