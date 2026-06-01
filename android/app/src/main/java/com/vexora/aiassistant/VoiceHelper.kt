package com.vexora.aiassistant

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.speech.tts.TextToSpeech
import java.util.Locale

class VoiceHelper(
    private val context: Context,
    private val onResult: (String) -> Unit,
    private val onListeningStart: () -> Unit = {},
    private val onListeningEnd: () -> Unit = {},
    private val onError: (String) -> Unit = {}
) {
    private var recognizer: SpeechRecognizer? = null
    private var tts: TextToSpeech? = null
    private var ttsReady = false
    var isListening = false
        private set

    init {
        tts = TextToSpeech(context) { status ->
            ttsReady = status == TextToSpeech.SUCCESS
            if (ttsReady) {
                tts?.language = Locale.US
                tts?.setSpeechRate(1.0f)
                tts?.setPitch(1.05f)
            }
        }
    }

    fun isAvailable() = SpeechRecognizer.isRecognitionAvailable(context)

    fun startListening() {
        if (!isAvailable()) { onError("Speech recognition not available on this device"); return }
        stopListening()
        recognizer = SpeechRecognizer.createSpeechRecognizer(context)
        recognizer?.setRecognitionListener(object : RecognitionListener {
            override fun onReadyForSpeech(p: Bundle?) { isListening = true; onListeningStart() }
            override fun onResults(r: Bundle?) {
                isListening = false
                onListeningEnd()
                val text = r?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull()
                if (text != null) onResult(text) else onError("Couldn't hear that clearly")
            }
            override fun onError(e: Int) { isListening = false; onListeningEnd(); onError("Voice error (code $e)") }
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
            putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
        }
        recognizer?.startListening(intent)
    }

    fun stopListening() {
        recognizer?.destroy()
        recognizer = null
        isListening = false
    }

    fun speak(text: String) {
        if (!ttsReady) return
        tts?.stop()
        val clean = text
            .replace(Regex("\\[ACTION:[^]]+]"), "")
            .replace(Regex("[*_#`•]"), "")
            .replace("**", "")
            .take(600)
        tts?.speak(clean, TextToSpeech.QUEUE_FLUSH, null, "vex_${System.currentTimeMillis()}")
    }

    fun stopSpeaking() = tts?.stop()

    fun destroy() {
        stopListening()
        tts?.shutdown()
        tts = null
    }
}
