package com.vexora.aiassistant

import android.app.*
import android.content.*
import android.os.*
import android.speech.*
import androidx.core.app.NotificationCompat
import java.util.Locale

class VexoraService : Service() {

    companion object {
        const val CHANNEL_ID = "vexora_bg"
        const val NOTIF_ID = 9001
        const val ACTION_WAKE_WORD  = "com.vexora.WAKE_WORD"
        const val ACTION_START_WAKE = "com.vexora.START_WAKE"
        const val ACTION_STOP_WAKE  = "com.vexora.STOP_WAKE"

        @Volatile var isRunning = false
        @Volatile var wakeWordEnabled = false
    }

    private var recognizer: SpeechRecognizer? = null
    private val handler = Handler(Looper.getMainLooper())

    private val controlReceiver = object : BroadcastReceiver() {
        override fun onReceive(ctx: Context?, intent: Intent?) {
            when (intent?.action) {
                ACTION_START_WAKE -> { wakeWordEnabled = true; scheduleWakeWord(0) }
                ACTION_STOP_WAKE  -> stopWakeWord()
            }
        }
    }

    override fun onCreate() {
        super.onCreate()
        isRunning = true
        createChannel()
        startForeground(NOTIF_ID, buildNotif("Vexora — standing by"))
        val f = IntentFilter().apply { addAction(ACTION_START_WAKE); addAction(ACTION_STOP_WAKE) }
        registerReceiver(controlReceiver, f)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (!wakeWordEnabled) {
            wakeWordEnabled = true
            scheduleWakeWord(500)
        }
        return START_STICKY
    }

    // ── Wake word loop ────────────────────────────────────────────────────────

    private fun scheduleWakeWord(delayMs: Long) {
        handler.postDelayed({ if (wakeWordEnabled) listenOnce() }, delayMs)
    }

    private fun listenOnce() {
        if (!wakeWordEnabled || !SpeechRecognizer.isRecognitionAvailable(this)) return
        recognizer?.destroy()
        recognizer = SpeechRecognizer.createSpeechRecognizer(this)
        recognizer?.setRecognitionListener(object : RecognitionListener {
            override fun onResults(results: Bundle?) {
                val text = results
                    ?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                    ?.joinToString(" ")?.lowercase() ?: ""
                if (text.containsAny("vexora", "hexora", "vex ora", "lex ora")) {
                    sendBroadcast(Intent(ACTION_WAKE_WORD))
                    updateNotif("Wake word detected!")
                    scheduleWakeWord(3000)
                } else {
                    scheduleWakeWord(400)
                }
            }
            override fun onError(e: Int) { scheduleWakeWord(1500) }
            override fun onReadyForSpeech(p: Bundle?) {}
            override fun onBeginningOfSpeech() {}
            override fun onBufferReceived(b: ByteArray?) {}
            override fun onEndOfSpeech() {}
            override fun onEvent(t: Int, p: Bundle?) {}
            override fun onPartialResults(p: Bundle?) {}
            override fun onRmsChanged(r: Float) {}
        })
        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.US.toString())
            putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3)
            putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS, 300L)
            putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS, 800L)
        }
        try { recognizer?.startListening(intent) }
        catch (e: Exception) { scheduleWakeWord(2000) }
    }

    private fun stopWakeWord() {
        wakeWordEnabled = false
        handler.removeCallbacksAndMessages(null)
        recognizer?.destroy(); recognizer = null
        updateNotif("Wake word — disabled")
    }

    // ── Notifications ─────────────────────────────────────────────────────────

    private fun createChannel() {
        val ch = NotificationChannel(CHANNEL_ID, "Vexora AI", NotificationManager.IMPORTANCE_LOW)
        ch.description = "Vexora background assistant"
        ch.setSound(null, null)
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

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        super.onDestroy()
        isRunning = false
        wakeWordEnabled = false
        handler.removeCallbacksAndMessages(null)
        recognizer?.destroy()
        try { unregisterReceiver(controlReceiver) } catch (_: Exception) {}
    }

    private fun String.containsAny(vararg words: String) = words.any { this.contains(it) }
}
