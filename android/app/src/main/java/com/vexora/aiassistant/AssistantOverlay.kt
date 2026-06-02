package com.vexora.aiassistant

import android.content.Context
import android.graphics.PixelFormat
import android.view.Gravity
import android.view.LayoutInflater
import android.view.View
import android.view.WindowManager
import android.widget.TextView

class AssistantOverlay(private val context: Context) {

    private val wm = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager
    private var root: View? = null

    private val params = WindowManager.LayoutParams(
        WindowManager.LayoutParams.MATCH_PARENT,
        WindowManager.LayoutParams.WRAP_CONTENT,
        WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
        WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
        PixelFormat.TRANSLUCENT
    ).apply {
        gravity = Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL
    }

    fun show(status: String = "🎤 Listening…") {
        dismiss()
        val v = LayoutInflater.from(context).inflate(R.layout.overlay_assistant, null)
        v.findViewById<TextView>(R.id.tvOverlayStatus).text = status
        val wave = v.findViewById<WaveAnimView>(R.id.overlayWave)
        wave.startPulsing()
        root = v
        try { wm.addView(v, params) } catch (_: Exception) {}
    }

    fun updateStatus(text: String) {
        root?.post {
            root?.findViewById<TextView>(R.id.tvOverlayStatus)?.text = text
        }
    }

    fun showResponse(text: String) {
        root?.post {
            root?.findViewById<TextView>(R.id.tvOverlayStatus)?.text = "💬 $text"
            root?.findViewById<WaveAnimView>(R.id.overlayWave)?.stopPulsing()
        }
    }

    fun dismiss() {
        root?.let {
            try {
                it.findViewById<WaveAnimView>(R.id.overlayWave)?.stopPulsing()
                wm.removeView(it)
            } catch (_: Exception) {}
            root = null
        }
    }

    val isShowing get() = root != null
}
