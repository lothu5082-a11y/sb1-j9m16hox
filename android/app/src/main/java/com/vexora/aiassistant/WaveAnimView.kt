package com.vexora.aiassistant

import android.animation.ValueAnimator
import android.content.Context
import android.graphics.Canvas
import android.graphics.Paint
import android.util.AttributeSet
import android.view.View
import android.view.animation.LinearInterpolator

class WaveAnimView @JvmOverloads constructor(
    context: Context, attrs: AttributeSet? = null, defStyle: Int = 0
) : View(context, attrs, defStyle) {

    private val centerPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = 0xFF7C7CFF.toInt()
        style = Paint.Style.FILL
    }
    private val ringPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = 3f
    }
    private val labelPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = 0xFF9090FF.toInt()
        textSize = 36f
        textAlign = Paint.Align.CENTER
    }

    private var animFraction = 0f
    private var animator: ValueAnimator? = null

    fun startPulsing() {
        animator?.cancel()
        animator = ValueAnimator.ofFloat(0f, 1f).apply {
            duration = 1400
            repeatCount = ValueAnimator.INFINITE
            repeatMode = ValueAnimator.RESTART
            interpolator = LinearInterpolator()
            addUpdateListener { animFraction = it.animatedValue as Float; invalidate() }
            start()
        }
    }

    fun stopPulsing() {
        animator?.cancel()
        animator = null
        animFraction = 0f
        invalidate()
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        if (animator == null) return
        val cx = width / 2f
        val cy = height / 2f
        val maxR = minOf(cx, cy) - 10f

        // Three expanding rings at different phases
        for (i in 0..2) {
            val phase = (animFraction + i / 3f) % 1f
            val radius = phase * maxR
            val alpha = ((1f - phase) * 160).toInt()
            ringPaint.alpha = alpha
            ringPaint.color = 0xFF7C7CFF.toInt()
            canvas.drawCircle(cx, cy, radius, ringPaint)
        }

        // Pulsing center dot
        val centerScale = 0.8f + 0.2f * animFraction
        canvas.drawCircle(cx, cy, 18f * centerScale, centerPaint)

        // Mic emoji label
        canvas.drawText("🎤", cx, cy + maxR * 0.6f + 20f, labelPaint)
    }
}
