package com.vexora.aiassistant

import android.Manifest
import android.content.*
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
import androidx.recyclerview.widget.LinearLayoutManager
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.MobileAds
import com.vexora.aiassistant.databinding.ActivityMainBinding
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.text.SimpleDateFormat
import java.util.*

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private lateinit var adapter: ChatAdapter
    private val messages = mutableListOf<ChatMessage>()
    private lateinit var voice: VoiceHelper
    private lateinit var overlay: OverlayManager
    private val recentHistory = mutableListOf<Pair<String, String>>()
    private val db by lazy { ChatDatabase.get(this) }

    // ── Permission launchers ──────────────────────────────────────────────────

    private val cameraPermLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { if (it) launchCamera() else toast("Camera permission denied.") }

    private val micPermLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { if (it) voice.startListening() else toast("Microphone permission needed for voice input.") }

    private val multiPermLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { perms ->
        if (perms[Manifest.permission.RECORD_AUDIO] == true) launchService()
    }

    // ── Wake word broadcast ───────────────────────────────────────────────────

    private val wakeWordReceiver = object : BroadcastReceiver() {
        override fun onReceive(ctx: Context?, intent: Intent?) {
            if (intent?.action == VexoraService.ACTION_WAKE_WORD) triggerVoice()
        }
    }

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        MobileAds.initialize(this)
        binding.adView.loadAd(AdRequest.Builder().build())

        setupChat()
        setupVoice()
        setupButtons()
        registerReceiver(wakeWordReceiver, IntentFilter(VexoraService.ACTION_WAKE_WORD))
        requestPermissionsAndStartService()

        updateModelStatusBar()

        LlmEngine.tryInit(this,
            onReady = {
                runOnUiThread {
                    addAiMessage("🧠 Gemma 2B AI loaded — real intelligence active!")
                    binding.tvModelStatus.text = "● Gemma 2B · Fully Offline"
                }
            },
            onFail = { msg -> runOnUiThread { if (msg.isNotBlank()) addAiMessage(msg) } }
        )
    }

    override fun onResume() {
        super.onResume()
        updateModelStatusBar()
    }

    override fun onDestroy() {
        super.onDestroy()
        voice.destroy()
        LlmEngine.shutdown()
        try { unregisterReceiver(wakeWordReceiver) } catch (_: Exception) {}
    }

    // ── Setup ─────────────────────────────────────────────────────────────────

    private fun setupChat() {
        adapter = ChatAdapter(messages)
        binding.recyclerView.layoutManager = LinearLayoutManager(this).apply { stackFromEnd = true }
        binding.recyclerView.adapter = adapter

        // Restore LLM context from DB (not shown in UI — just feeds memory)
        lifecycleScope.launch(Dispatchers.IO) {
            val recent = db.chatDao().getRecent(10).reversed()
            var lastUser = ""
            recent.forEach { msg ->
                if (msg.isUser) lastUser = msg.text
                else if (lastUser.isNotEmpty()) {
                    recentHistory.add(Pair(lastUser, msg.text)); lastUser = ""
                }
            }
        }

        addAiMessage(
            "Hey! I'm **Vexora** — your offline Mini Jarvis 🤖\n\n" +
            "Try these commands:\n" +
            "• *'Turn on flashlight'*\n" +
            "• *'Set volume to 60%'*\n" +
            "• *'Check battery'*\n" +
            "• *'Open WhatsApp'*\n" +
            "• *'Set brightness to 80%'*\n\n" +
            "Tap 🎤 or say **\"Vexora\"** to use voice! 😊"
        )
    }

    private fun setupVoice() {
        voice = VoiceHelper(
            context = this,
            onResult = { text -> processInput(text) },
            onListeningStart = {
                binding.waveView.visibility = View.VISIBLE
                binding.waveView.startPulsing()
                binding.inputRow.visibility = View.INVISIBLE
                binding.tvStatus.visibility = View.GONE
                binding.btnMic.setBackgroundResource(R.drawable.circle_mic_active)
            },
            onListeningEnd = {
                binding.waveView.stopPulsing()
                binding.waveView.visibility = View.GONE
                binding.inputRow.visibility = View.VISIBLE
                binding.btnMic.setBackgroundResource(R.drawable.circle_mic)
            },
            onError = { msg ->
                binding.waveView.stopPulsing()
                binding.waveView.visibility = View.GONE
                binding.inputRow.visibility = View.VISIBLE
                binding.btnMic.setBackgroundResource(R.drawable.circle_mic)
                binding.tvStatus.visibility = View.GONE
                toast(msg)
            }
        )
        overlay = OverlayManager(this)
    }

    private fun setupButtons() {
        binding.btnSend.setOnClickListener {
            val text = binding.etInput.text.toString().trim()
            if (text.isBlank()) return@setOnClickListener
            binding.etInput.setText("")
            processInput(text)
        }
        binding.btnMic.setOnClickListener { triggerVoice() }
        binding.btnSettings.setOnClickListener {
            startActivity(Intent(this, SettingsActivity::class.java))
        }
    }

    // ── Core input pipeline ───────────────────────────────────────────────────

    private fun processInput(userInput: String) {
        addUserMessage(userInput)

        // System commands execute immediately — no LLM needed
        val cmdResult = CommandInterceptor.handle(this, userInput)
        if (cmdResult != null) {
            addAiMessage(cmdResult)
            voice.speak(cmdResult)
            parseAndExecuteActions(cmdResult)
            persistToDb(userInput, cmdResult)
            return
        }

        setUiBusy(true)
        lifecycleScope.launch(Dispatchers.Default) {
            val reply = LlmEngine.respond(this@MainActivity, userInput, recentHistory.toList())
            persistToDb(userInput, reply)
            recentHistory.add(Pair(userInput, reply))
            if (recentHistory.size > 10) recentHistory.removeFirst()

            withContext(Dispatchers.Main) {
                setUiBusy(false)
                addAiMessage(reply)
                voice.speak(reply)
                parseAndExecuteActions(reply)
            }
        }
    }

    private fun persistToDb(user: String, ai: String) {
        lifecycleScope.launch(Dispatchers.IO) {
            db.chatDao().insert(ChatEntity(text = user, isUser = true))
            db.chatDao().insert(ChatEntity(text = ai, isUser = false))
        }
    }

    // ── Voice ─────────────────────────────────────────────────────────────────

    private fun triggerVoice() {
        if (voice.isListening) { voice.stopListening(); return }
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
            == PackageManager.PERMISSION_GRANTED) {
            voice.startListening()
        } else {
            micPermLauncher.launch(Manifest.permission.RECORD_AUDIO)
        }
    }

    // ── Service & permissions ─────────────────────────────────────────────────

    private fun requestPermissionsAndStartService() {
        val missing = mutableListOf<String>()
        if (!hasPerm(Manifest.permission.RECORD_AUDIO)) missing.add(Manifest.permission.RECORD_AUDIO)
        if (missing.isEmpty()) launchService() else multiPermLauncher.launch(missing.toTypedArray())
    }

    private fun launchService() {
        startForegroundService(Intent(this, VexoraService::class.java))
    }

    private fun hasPerm(p: String) =
        ContextCompat.checkSelfPermission(this, p) == PackageManager.PERMISSION_GRANTED

    // ── Action dispatch ───────────────────────────────────────────────────────

    private fun parseAndExecuteActions(response: String) {
        if (response.contains("[ACTION: CAMERA]"))   handleCameraAction()
        if (response.contains("[ACTION: SETTINGS]")) startActivity(Intent(Settings.ACTION_SETTINGS))
    }

    private fun handleCameraAction() {
        if (hasPerm(Manifest.permission.CAMERA)) launchCamera()
        else cameraPermLauncher.launch(Manifest.permission.CAMERA)
    }

    private fun launchCamera() {
        val i = Intent(MediaStore.ACTION_IMAGE_CAPTURE)
        if (i.resolveActivity(packageManager) != null) startActivity(i)
        else toast("No camera app found.")
    }

    // ── UI helpers ────────────────────────────────────────────────────────────

    private fun addAiMessage(text: String) {
        adapter.addMessage(ChatMessage(text, false, nowTime()))
        scrollBottom()
    }

    private fun addUserMessage(text: String) {
        adapter.addMessage(ChatMessage(text, true, nowTime()))
        scrollBottom()
    }

    private fun scrollBottom() = binding.recyclerView.post {
        binding.recyclerView.scrollToPosition(adapter.itemCount - 1)
    }

    private fun setUiBusy(busy: Boolean) {
        binding.btnSend.isEnabled = !busy
        binding.etInput.isEnabled = !busy
        binding.btnMic.isEnabled = !busy
        if (!voice.isListening) {
            binding.tvStatus.text = "Thinking…"
            binding.tvStatus.visibility = if (busy) View.VISIBLE else View.GONE
        }
    }

    private fun nowTime() = SimpleDateFormat("h:mm a", Locale.getDefault()).format(Date())

    private fun updateModelStatusBar() {
        val provider = ModelSettings.getProvider(this)
        val statusText = when (provider) {
            ModelSettings.Provider.BUILTIN     -> "● Built-in AI · Fully Offline"
            ModelSettings.Provider.LOCAL_GEMMA -> "● Gemma 2B · Fully Offline"
            ModelSettings.Provider.GEMINI      -> "● Google Gemini · Cloud"
            ModelSettings.Provider.OPENAI      -> "● OpenAI GPT · Cloud"
            ModelSettings.Provider.CLAUDE      -> "● Anthropic Claude · Cloud"
        }
        binding.tvModelStatus.text = statusText
    }

    private fun toast(msg: String) = Toast.makeText(this, msg, Toast.LENGTH_SHORT).show()
}
