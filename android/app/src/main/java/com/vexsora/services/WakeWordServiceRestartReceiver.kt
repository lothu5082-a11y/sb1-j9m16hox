package com.vexsora.services

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * BroadcastReceiver that re-starts [WakeWordService] after the OS killed it.
 * Triggered by an AlarmManager alarm set in [WakeWordService.onDestroy].
 */
class WakeWordServiceRestartReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        WakeWordService.start(context)
    }
}
