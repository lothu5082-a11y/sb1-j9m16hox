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
import com.google.ai.client.generativeai.GenerativeModel
import com.google.ai.client.generativeai.type.content
import com.vexora.aiassistant.databinding.ActivityMainBinding
import kotlinx.coroutines.launch

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private var generativeModel: GenerativeModel? = null

    private val PREFS_NAME   = "vexora_prefs"
    private val KEY_API_KEY  = "gemini_api_key"

    private val SYSTEM_PROMPT = """
        You are Vexora, a helpful AI assistant running on this Android device.
        You can control the device. Use these action tokens ONLY when the user explicitly asks:

          [ACTION: CAMERA]   → open the device camera
          [ACTION: SETTINGS] → open device settings

        Rules:
        - Put the action token on its own line at the END of your reply.
        - Never use action tokens unless clearly asked.
        - Keep responses short and friendly.
    """.trimIndent()

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

        val savedKey = getPrefs().getString(KEY_API_KEY, "")
        if (savedKey.isNullOrBlank()) {
            showScreen(Screen.SETUP)
        } else {
            initModel(savedKey)
        }
    }

    // ────────────────────────────────────────────────────────────────────────
    // UI
    // ────────────────────────────────────────────────────────────────────────

    private fun setupUi() {
        // Save API key and start
        binding.btnSaveKey.setOnClickListener {
            val key = binding.etApiKey.text.toString().trim()
            if (key.isBlank()) {
                showToast("Please paste your API key first.")
                return@setOnClickListener
            }
            getPrefs().edit().putString(KEY_API_KEY, key).apply()
            initModel(key)
        }

        // Send message
        binding.btnSend.setOnClickListener {
            val text = binding.etInput.text.toString().trim()
            if (text.isBlank()) return@setOnClickListener
            if (generativeModel == null) { showToast("AI not ready yet."); return@setOnClickListener }
            binding.etInput.setText("")
            sendMessage(text)
        }

        // Change API key
        binding.btnChangeKey.setOnClickListener {
            getPrefs().edit().remove(KEY_API_KEY).apply()
            generativeModel = null
            showScreen(Screen.SETUP)
        }
    }

    // ────────────────────────────────────────────────────────────────────────
    // Model init
    // ────────────────────────────────────────────────────────────────────────

    private fun initModel(apiKey: String) {
        try {
            generativeModel = GenerativeModel(
                modelName = "gemini-1.5-flash",
                apiKey    = apiKey,
                systemInstruction = content { text(SYSTEM_PROMPT) }
            )
            showScreen(Screen.CHAT)
            appendToChat("Vexora AI is ready! How can I help you?")
        } catch (e: Exception) {
            showToast("Failed to init AI: ${e.localizedMessage}")
            showScreen(Screen.SETUP)
        }
    }

    // ────────────────────────────────────────────────────────────────────────
    // Send / Receive
    // ────────────────────────────────────────────────────────────────────────

    private fun sendMessage(userInput: String) {
        appendToChat("You: $userInput")
        setUiBusy(true)

        lifecycleScope.launch {
            try {
                val response = generativeModel!!.generateContent(userInput)
                val reply    = response.text ?: "(no response)"
                setUiBusy(false)
                appendToChat("AI: $reply")
                parseAndExecuteActions(reply)
            } catch (e: Exception) {
                setUiBusy(false)
                if (e.message?.contains("API_KEY_INVALID") == true ||
                    e.message?.contains("403") == true) {
                    appendToChat("❌ Invalid API key. Tap 'Change Key' below to fix it.")
                } else {
                    appendToChat("Error: ${e.localizedMessage}")
                }
            }
        }
    }

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

    private enum class Screen { SETUP, CHAT }

    private fun showScreen(s: Screen) {
        binding.layoutSetup.visibility = if (s == Screen.SETUP) View.VISIBLE else View.GONE
        binding.layoutChat.visibility  = if (s == Screen.CHAT)  View.VISIBLE else View.GONE
    }

    // ────────────────────────────────────────────────────────────────────────
    // Helpers
    // ────────────────────────────────────────────────────────────────────────

    private fun appendToChat(text: String) {
        val cur = binding.tvResponse.text.toString()
        binding.tvResponse.text = if (cur.isBlank()) text else "$cur\n\n$text"
        binding.scrollView.post { binding.scrollView.fullScroll(View.FOCUS_DOWN) }
    }

    private fun setUiBusy(busy: Boolean) {
        binding.btnSend.isEnabled  = !busy
        binding.etInput.isEnabled  = !busy
        binding.tvStatus.visibility = if (busy) View.VISIBLE else View.GONE
    }

    private fun getPrefs() = getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
    private fun showToast(msg: String) = Toast.makeText(this, msg, Toast.LENGTH_SHORT).show()
}
