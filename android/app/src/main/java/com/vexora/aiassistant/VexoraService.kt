package com.vexora.aiassistant

import android.app.*
import android.content.*
import android.os.*
import android.speech.*
import android.speech.tts.TextToSpeech
import androidx.core.app.NotificationCompat
import kotlinx.coroutines.*
import java.util.Locale

class VexoraService : Service() {

    companion object {
        const val CHANNEL_ID        = "vexora_bg"
        const val NOTIF_ID          = 9001
        const val ACTION_WAKE_WORD     = "com.vexora.WAKE_WORD"
        const val ACTION_START_WAKE    = "com.vexora.START_WAKE"
        const val ACTION_STOP_WAKE     = "com.vexora.STOP_WAKE"
        const val ACTION_ANNOUNCE_SMS  = "com.vexora.ANNOUNCE_SMS"
        const val ACTION_ANNOUNCE_CALL = "com.vexora.ANNOUNCE_CALL"

        @Volatile var isRunning       = false
        @Volatile var wakeWordEnabled = false
    }

    private var recognizer: SpeechRecognizer? = null
    private val handler  = Handler(Looper.getMainLooper())
    private val scope    = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var overlay: AssistantOverlay? = null
    private var tts: TextToSpeech? = null
    private var ttsReady = false

    // ── Receivers ──────────────────────────────────────────────────────────────

    private val controlReceiver = object : BroadcastReceiver() {
        override fun onReceive(ctx: Context?, intent: Intent?) {
            when (intent?.action) {
                ACTION_START_WAKE     -> { wakeWordEnabled = true; scheduleWakeWord(0) }
                ACTION_STOP_WAKE      -> stopWakeWord()
                ACTION_ANNOUNCE_SMS   -> announceSms(
                    intent.getStringExtra("sender") ?: "Someone",
                    intent.getStringExtra("body")   ?: ""
                )
                ACTION_ANNOUNCE_CALL  -> announceCall(
                    intent.getStringExtra("caller") ?: "Unknown",
                    intent.getStringExtra("number") ?: ""
                )
            }
        }
    }

    // ── Lifecycle ──────────────────────────────────────────────────────────────

    override fun onCreate() {
        super.onCreate()
        isRunning = true
        createChannel()
        startForeground(NOTIF_ID, buildNotif("Vexora — standing by"))

        val filter = IntentFilter().apply {
            addAction(ACTION_START_WAKE)
            addAction(ACTION_STOP_WAKE)
            addAction(ACTION_ANNOUNCE_SMS)
            addAction(ACTION_ANNOUNCE_CALL)
        }
        registerReceiver(controlReceiver, filter)

        tts = TextToSpeech(this) { status ->
            ttsReady = status == TextToSpeech.SUCCESS
            if (ttsReady) tts?.language = Locale.US
        }

        overlay = AssistantOverlay(this)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (!wakeWordEnabled) { wakeWordEnabled = true; scheduleWakeWord(500) }
        return START_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
        isRunning = false
        wakeWordEnabled = false
        handler.removeCallbacksAndMessages(null)
        recognizer?.destroy()
        scope.cancel()
        overlay?.dismiss()
        tts?.shutdown()
        try { unregisterReceiver(controlReceiver) } catch (_: Exception) {}
    }

    override fun onBind(intent: Intent?): IBinder? = null

    // ── Wake word loop ─────────────────────────────────────────────────────────

    private fun scheduleWakeWord(delayMs: Long) {
        handler.postDelayed({ if (wakeWordEnabled) listenForWakeWord() }, delayMs)
    }

    private fun listenForWakeWord() {
        if (!wakeWordEnabled || !SpeechRecognizer.isRecognitionAvailable(this)) return
        recognizer?.destroy()
        recognizer = SpeechRecognizer.createSpeechRecognizer(this)
        recognizer?.setRecognitionListener(object : SimpleRecognitionListener() {
            override fun onResults(results: Bundle?) {
                val text = results
                    ?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                    ?.joinToString(" ")?.lowercase() ?: ""
                if (text.containsAny("vexora", "hexora", "vex ora", "lex ora", "wexora")) {
                    updateNotif("🎤 Wake word heard!")
                    sendBroadcast(Intent(ACTION_WAKE_WORD))
                    triggerCommandMode()
                } else {
                    scheduleWakeWord(400)
                }
            }
            override fun onError(e: Int) { scheduleWakeWord(1500) }
        })
        startListening()
    }

    // ── Command mode (Siri pop-up) ─────────────────────────────────────────────

    private fun triggerCommandMode() {
        wakeWordEnabled = false       // pause wake word during command handling
        handler.removeCallbacksAndMessages(null)
        handler.post {
            overlay?.show("🎤 Listening…")
        }
        recognizer?.destroy()
        recognizer = SpeechRecognizer.createSpeechRecognizer(this)
        recognizer?.setRecognitionListener(object : SimpleRecognitionListener() {
            override fun onPartialResults(partial: Bundle?) {
                val text = partial?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                    ?.firstOrNull() ?: return
                handler.post { overlay?.updateStatus("🎤 \"$text\"") }
            }
            override fun onResults(results: Bundle?) {
                val text = results
                    ?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                    ?.firstOrNull()?.trim() ?: run { exitCommandMode(); return }
                if (text.isBlank()) { exitCommandMode(); return }

                handler.post { overlay?.updateStatus("⏳ \"$text\"…") }
                processCommand(text)
            }
            override fun onError(e: Int) { exitCommandMode() }
        })
        startListening(partialResults = true)
    }

    private fun processCommand(text: String) {
        scope.launch {
            // System commands first
            val cmdResult = CommandInterceptor.handle(this@VexoraService, text)
            val reply = if (cmdResult != null) {
                cmdResult.replace(Regex("\\[ACTION: [A-Z]+]"), "").trim()
            } else {
                LlmEngine.respond(this@VexoraService, text, emptyList())
            }

            withContext(Dispatchers.Main) {
                overlay?.showResponse(reply.take(200))
                speak(reply)
                updateNotif("Vexora — standing by")
                handler.postDelayed({ exitCommandMode() }, 4000)
            }
        }
    }

    private fun exitCommandMode() {
        overlay?.dismiss()
        wakeWordEnabled = true
        scheduleWakeWord(1000)
    }

    // ── SMS announcement ───────────────────────────────────────────────────────

    private fun announceSms(sender: String, body: String) {
        val short = if (body.length > 80) body.take(80) + "…" else body
        val msg = "New message from $sender: $short. Say reply to respond."
        updateNotif("📩 New message from $sender")
        speak(msg)
    }

    private fun announceCall(caller: String, number: String) {
        val msg = "Incoming call from $caller."
        updateNotif("📞 Calling: $caller")
        speak(msg)
    }

    // ── TTS helper ─────────────────────────────────────────────────────────────

    private fun speak(text: String) {
        if (!ttsReady) return
        val clean = text
            .replace(Regex("\\[ACTION:[^]]+]"), "")
            .replace(Regex("[*_`#]"), "")
            .replace(Regex("🌐|📩|📞|🔋|🔦|🔊|🔇|☀️|🚀|💬"), "")
            .trim()
        tts?.speak(clean, TextToSpeech.QUEUE_FLUSH, null, "vexora_${System.currentTimeMillis()}")
    }

    // ── Speech recognizer helpers ─────────────────────────────────────────────

    private fun startListening(partialResults: Boolean = false) {
        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.US.toString())
            putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3)
            putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, partialResults)
            putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS, 300L)
            putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS, 1000L)
        }
        try { recognizer?.startListening(intent) }
        catch (_: Exception) { if (wakeWordEnabled) scheduleWakeWord(2000) }
    }

    // ── Notifications ─────────────────────────────────────────────────────────

    private fun createChannel() {
        val ch = NotificationChannel(CHANNEL_ID, "Vexora AI", NotificationManager.IMPORTANCE_LOW)
            .apply { setSound(null, null) }
        (getSystemService(NOTIFICATION_SERVICE) as NotificationManager).createNotificationChannel(ch)
    }

    private fun buildNotif(text: String): Notification {
        val tap = PendingIntent.getActivity(
            this, 0, Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Vexora AI")
            .setContentText(text)
            .setSmallIcon(android.R.drawable.ic_btn_speak_now)
            .setContentIntent(tap)
            .setOngoing(true)
            .setSilent(true)
            .build()
    }

    private fun updateNotif(text: String) {
        (getSystemService(NOTIFICATION_SERVICE) as NotificationManager)
            .notify(NOTIF_ID, buildNotif(text))
    }

    private fun String.containsAny(vararg words: String) = words.any { this.contains(it) }

    // ── Base listener (avoids boilerplate) ────────────────────────────────────

    open inner class SimpleRecognitionListener : RecognitionListener {
        override fun onReadyForSpeech(p: Bundle?) {}
        override fun onBeginningOfSpeech() {}
        override fun onRmsChanged(r: Float) {}
        override fun onBufferReceived(b: ByteArray?) {}
        override fun onEndOfSpeech() {}
        override fun onPartialResults(p: Bundle?) {}
        override fun onEvent(t: Int, p: Bundle?) {}
        override fun onResults(r: Bundle?) {}
        override fun onError(e: Int) {}
    }
}
