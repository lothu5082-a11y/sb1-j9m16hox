package com.vexora.aiassistant

import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.provider.Settings
import android.view.Gravity
import android.view.LayoutInflater
import android.view.MotionEvent
import android.view.WindowManager

class OverlayManager(private val context: Context) {

    private var overlayView: android.view.View? = null
    private val wm by lazy { context.getSystemService(Context.WINDOW_SERVICE) as WindowManager }

    fun canDraw() = Settings.canDrawOverlays(context)

    fun show(onMicClick: () -> Unit) {
        if (!canDraw() || overlayView != null) return

        val params = WindowManager.LayoutParams(
            148, 148,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT
        ).apply { gravity = Gravity.END or Gravity.CENTER_VERTICAL; x = 12; y = 0 }

        val view = LayoutInflater.from(context).inflate(R.layout.overlay_mic, null)
        val btn = view.findViewById<android.view.View>(R.id.overlayMicBtn)
        btn.setOnClickListener { onMicClick() }

        // Drag to reposition
        var iy = 0f; var ity = 0f
        view.setOnTouchListener { _, e ->
            when (e.action) {
                MotionEvent.ACTION_DOWN -> { iy = params.y.toFloat(); ity = e.rawY; false }
                MotionEvent.ACTION_MOVE -> {
                    params.y = (iy + e.rawY - ity).toInt()
                    try { wm.updateViewLayout(view, params) } catch (_: Exception) {}
                    true
                }
                else -> false
            }
        }

        wm.addView(view, params)
        overlayView = view
    }

    fun hide() {
        overlayView?.let { try { wm.removeView(it) } catch (_: Exception) {} }
        overlayView = null
    }

    fun isShowing() = overlayView != null

    fun requestPermission(activity: android.app.Activity) {
        activity.startActivity(Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION))
    }
}
