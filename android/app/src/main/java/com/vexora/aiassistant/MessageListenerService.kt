package com.vexora.aiassistant

import android.app.Notification
import android.content.Intent
import android.os.Bundle
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification

class MessageListenerService : NotificationListenerService() {

    companion object {
        var instance: MessageListenerService? = null
        var lastReplyAction: Notification.Action? = null
        var lastSenderApp = ""
        var lastSenderName = ""

        val MESSAGING_APPS = setOf(
            "com.whatsapp",
            "com.whatsapp.w4b",       // WhatsApp Business
            "org.telegram.messenger",
            "org.telegram.plus",
            "com.facebook.orca",      // Messenger
            "com.instagram.android",  // Instagram DMs
            "com.discord",
            "com.snapchat.android",
            "com.viber.voip",
            "com.skype.raider"
        )
    }

    override fun onListenerConnected() { super.onListenerConnected(); instance = this }
    override fun onListenerDisconnected() { super.onListenerDisconnected(); instance = null }

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        if (sbn.packageName !in MESSAGING_APPS) return

        val extras = sbn.notification.extras
        val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString() ?: return
        val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString() ?: return

        // Skip group summary / blank notifications
        if (text.isBlank() || title.isBlank()) return
        if (sbn.notification.flags and Notification.FLAG_GROUP_SUMMARY != 0) return

        // Find a replyable action (direct reply without opening the app)
        val replyAction = sbn.notification.actions?.firstOrNull { action ->
            action.remoteInputs?.isNotEmpty() == true
        }

        lastReplyAction = replyAction
        lastSenderApp = sbn.packageName
        lastSenderName = title

        // Also save as SMS fallback sender name (in case there's a phone number)
        SmsHelper.lastSenderName = title

        // Announce via VexoraService TTS
        sendBroadcast(Intent(VexoraService.ACTION_ANNOUNCE_SMS).apply {
            putExtra("sender", title)
            putExtra("body", text)
            setPackage(packageName)
        })
    }

    // ── Direct notification reply (works for WhatsApp, Telegram etc.) ─────────

    fun replyViaNotification(message: String): Boolean {
        val action = lastReplyAction ?: return false
        val remoteInput = action.remoteInputs?.firstOrNull() ?: return false
        return try {
            val intent = Intent()
            val bundle = Bundle()
            bundle.putCharSequence(remoteInput.resultKey, message)
            android.app.RemoteInput.addResultsToIntent(action.remoteInputs, intent, bundle)
            action.actionIntent.send(this, 0, intent)
            true
        } catch (_: Exception) { false }
    }
}
