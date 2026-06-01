package com.vexora.aiassistant

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.telephony.TelephonyManager

class CallReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != TelephonyManager.ACTION_PHONE_STATE_CHANGED) return
        val state = intent.getStringExtra(TelephonyManager.EXTRA_STATE) ?: return
        if (state != TelephonyManager.EXTRA_STATE_RINGING) return

        val number = intent.getStringExtra(TelephonyManager.EXTRA_INCOMING_NUMBER) ?: ""
        val name = if (number.isNotBlank()) SmsHelper.numberToName(context, number) else "Unknown"

        // Save as last sender so user can "reply" with SMS if they miss the call
        if (number.isNotBlank()) {
            SmsHelper.lastSenderNumber = number
            SmsHelper.lastSenderName = name
        }

        context.sendBroadcast(Intent(VexoraService.ACTION_ANNOUNCE_CALL).apply {
            putExtra("caller", name)
            putExtra("number", number)
            setPackage(context.packageName)
        })
    }
}
