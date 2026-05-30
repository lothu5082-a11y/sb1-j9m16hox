package com.vexsora.receivers

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.vexsora.services.WakeWordService

/**
 * Receives BOOT_COMPLETED and starts [WakeWordService] so Vexsora begins
 * listening for the wake word immediately after the device boots.
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        val action = intent?.action ?: return
        if (
            action == Intent.ACTION_BOOT_COMPLETED ||
            action == "android.intent.action.QUICKBOOT_POWERON"
        ) {
            WakeWordService.start(context)
        }
    }
}
