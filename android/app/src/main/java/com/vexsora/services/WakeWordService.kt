package com.vexsora.services

import android.app.ActivityManager
import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.IBinder
import android.os.PowerManager
import android.os.SystemClock
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import androidx.localbroadcastmanager.content.LocalBroadcastManager
import java.util.Locale

class WakeWordService : Service() {

    companion object {
        const val ACTION_WAKE_WORD_DETECTED = "com.vexsora.WAKE_WORD_DETECTED"
        private const val NOTIFICATION_ID = 7001
        private const val CHANNEL_ID = "vexsora_wake"
        private const val CHANNEL_NAME = "Vexsora Wake Word"
        private const val WAKE_LOCK_TAG = "Vexsora::WakeWordWakeLock"
        private const val RESTART_ALARM_REQUEST_CODE = 9001

        fun start(context: Context) {
            val intent = Intent(context, WakeWordService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stop(context: Context) {
            val intent = Intent(context, WakeWordService::class.java)
            context.stopService(intent)
        }
    }

    private var speechRecognizer: SpeechRecognizer? = null
    private var wakeLock: PowerManager.WakeLock? = null
    private var isListening = false
    private var isDestroyed = false

    // -------------------------------------------------------------------------
    // Service lifecycle
    // -------------------------------------------------------------------------

    override fun onCreate() {
        super.onCreate()
        acquireWakeLock()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        createNotificationChannel()
        val notification = buildNotification()
        startForeground(NOTIFICATION_ID, notification)

        if (hasRecordAudioPermission()) {
            startListening()
        }
        // If killed by the OS, restart
        return START_STICKY
    }

    override fun onDestroy() {
        isDestroyed = true
        stopListening()
        releaseWakeLock()
        scheduleRestart()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    // -------------------------------------------------------------------------
    // Notification
    // -------------------------------------------------------------------------

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Vexsora background wake-word detection"
                setShowBadge(false)
                setSound(null, null)
                enableVibration(false)
            }
            val nm = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
            nm.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Vexsora")
            .setContentText("Vexsora is listening...")
            .setSmallIcon(android.R.drawable.ic_btn_speak_now)
            .setOngoing(true)
            .setSilent(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .build()
    }

    // -------------------------------------------------------------------------
    // Speech recognition
    // -------------------------------------------------------------------------

    private fun startListening() {
        if (isListening || isDestroyed) return
        if (!SpeechRecognizer.isRecognitionAvailable(this)) return

        speechRecognizer?.destroy()
        speechRecognizer = SpeechRecognizer.createSpeechRecognizer(this)
        speechRecognizer?.setRecognitionListener(wakeWordListener)

        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(
                RecognizerIntent.EXTRA_LANGUAGE_MODEL,
                RecognizerIntent.LANGUAGE_MODEL_FREE_FORM
            )
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.getDefault())
            putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 5)
            // Keep recognizing continuously — no partial or stability results needed
            putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS, 1500L)
            putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS, 1000L)
            putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS, 500L)
        }

        speechRecognizer?.startListening(intent)
        isListening = true
    }

    private fun stopListening() {
        isListening = false
        try {
            speechRecognizer?.stopListening()
            speechRecognizer?.destroy()
        } catch (_: Exception) { /* ignore cleanup errors */ }
        speechRecognizer = null
    }

    private fun restartListening() {
        if (isDestroyed) return
        isListening = false
        speechRecognizer?.destroy()
        speechRecognizer = null
        startListening()
    }

    private val wakeWordListener = object : RecognitionListener {
        override fun onReadyForSpeech(params: Bundle?) {
            isListening = true
        }

        override fun onBeginningOfSpeech() {}

        override fun onRmsChanged(rmsdB: Float) {}

        override fun onBufferReceived(buffer: ByteArray?) {}

        override fun onEndOfSpeech() {}

        override fun onError(error: Int) {
            isListening = false
            if (!isDestroyed) {
                // Back off slightly then restart so we don't spin-loop on hard errors
                val handler = android.os.Handler(mainLooper)
                val delay = when (error) {
                    SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> 2000L
                    SpeechRecognizer.ERROR_NO_MATCH,
                    SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> 500L
                    else -> 1000L
                }
                handler.postDelayed({ restartListening() }, delay)
            }
        }

        override fun onResults(results: Bundle?) {
            val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
            val detected = matches?.any { it.contains("vexsora", ignoreCase = true) } == true

            if (detected) {
                handleWakeWordDetected()
            }

            // Restart to continue listening
            if (!isDestroyed) {
                val handler = android.os.Handler(mainLooper)
                handler.post { restartListening() }
            }
        }

        override fun onPartialResults(partialResults: Bundle?) {
            val partial =
                partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
            if (partial?.any { it.contains("vexsora", ignoreCase = true) } == true) {
                handleWakeWordDetected()
            }
        }

        override fun onEvent(eventType: Int, params: Bundle?) {}
    }

    // -------------------------------------------------------------------------
    // Wake-word detected: determine mode and broadcast
    // -------------------------------------------------------------------------

    private fun handleWakeWordDetected() {
        val foregroundPackage = getForegroundAppPackage()
        val mode = if (isLauncherOrHome(foregroundPackage)) "overlay" else "stealth"

        val broadcastIntent = Intent(ACTION_WAKE_WORD_DETECTED).apply {
            putExtra("foreground_app", foregroundPackage)
            putExtra("mode", mode)
        }
        LocalBroadcastManager.getInstance(this).sendBroadcast(broadcastIntent)
    }

    @Suppress("DEPRECATION")
    private fun getForegroundAppPackage(): String {
        return try {
            val am = getSystemService(ACTIVITY_SERVICE) as ActivityManager
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                am.runningAppProcesses
                    ?.firstOrNull { it.importance == ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND }
                    ?.processName ?: ""
            } else {
                am.getRunningTasks(1)
                    ?.firstOrNull()
                    ?.topActivity
                    ?.packageName ?: ""
            }
        } catch (_: Exception) {
            ""
        }
    }

    private fun isLauncherOrHome(packageName: String): Boolean {
        if (packageName.isEmpty()) return true
        val lower = packageName.lowercase(Locale.ROOT)
        return lower.contains("launcher") || lower.contains("home")
    }

    // -------------------------------------------------------------------------
    // Wake lock
    // -------------------------------------------------------------------------

    private fun acquireWakeLock() {
        val pm = getSystemService(POWER_SERVICE) as PowerManager
        wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, WAKE_LOCK_TAG)
        wakeLock?.acquire(10 * 60 * 1000L /* 10 minutes rolling */)
    }

    private fun releaseWakeLock() {
        try {
            if (wakeLock?.isHeld == true) {
                wakeLock?.release()
            }
        } catch (_: Exception) { /* ignore */ }
        wakeLock = null
    }

    // -------------------------------------------------------------------------
    // Self-restart via AlarmManager when killed by OS
    // -------------------------------------------------------------------------

    private fun scheduleRestart() {
        try {
            val alarmManager = getSystemService(ALARM_SERVICE) as AlarmManager
            val restartIntent = Intent(this, WakeWordServiceRestartReceiver::class.java)
            val pendingIntent = PendingIntent.getBroadcast(
                this,
                RESTART_ALARM_REQUEST_CODE,
                restartIntent,
                PendingIntent.FLAG_ONE_SHOT or PendingIntent.FLAG_IMMUTABLE
            )
            alarmManager.set(
                AlarmManager.ELAPSED_REALTIME_WAKEUP,
                SystemClock.elapsedRealtime() + 3000L, // restart after 3 seconds
                pendingIntent
            )
        } catch (_: Exception) { /* alarm scheduling can fail in some scenarios */ }
    }

    // -------------------------------------------------------------------------
    // Permission helpers
    // -------------------------------------------------------------------------

    private fun hasRecordAudioPermission(): Boolean =
        ContextCompat.checkSelfPermission(
            this,
            android.Manifest.permission.RECORD_AUDIO
        ) == PackageManager.PERMISSION_GRANTED
}
