package com.vexora.aiassistant

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class SmsReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != "android.provider.Telephony.SMS_RECEIVED") return
        @Suppress("UNCHECKED_CAST", "DEPRECATION")
        val pdus = intent.extras?.get("pdus") as? Array<Any> ?: return
        val format = intent.extras?.getString("format") ?: "3gpp"

        val smsMessages = pdus.mapNotNull {
            @Suppress("DEPRECATION")
            android.telephony.SmsMessage.createFromPdu(it as ByteArray, format)
        }
        if (smsMessages.isEmpty()) return

        val number = smsMessages.first().originatingAddress ?: return
        val body = smsMessages.joinToString("") { it.messageBody ?: "" }
        val name = SmsHelper.numberToName(context, number)

        // Save for "reply" command
        SmsHelper.lastSenderNumber = number
        SmsHelper.lastSenderName = name

        // Tell VexoraService to announce it
        context.sendBroadcast(Intent(VexoraService.ACTION_ANNOUNCE_SMS).apply {
            putExtra("sender", name)
            putExtra("body", body)
            setPackage(context.packageName)
        })
    }
}
