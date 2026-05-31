package com.vexsora.services

import android.content.Intent
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import androidx.core.app.NotificationManagerCompat
import androidx.localbroadcastmanager.content.LocalBroadcastManager
import java.util.Collections

// ---------------------------------------------------------------------------
// Data model
// ---------------------------------------------------------------------------

data class NotificationData(
    val sender: String,
    val message: String,
    val packageName: String,
    val timestamp: Long
)

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

class VexsoraNotificationListener : NotificationListenerService() {

    companion object {
        const val ACTION_NOTIFICATION_RECEIVED = "com.vexsora.NOTIFICATION_RECEIVED"
        const val ACTION_LISTENER_CONNECTED = "com.vexsora.LISTENER_CONNECTED"
        const val ACTION_LISTENER_DISCONNECTED = "com.vexsora.LISTENER_DISCONNECTED"

        private const val MAX_CACHED_NOTIFICATIONS = 10

        // Thread-safe list bounded to MAX_CACHED_NOTIFICATIONS entries
        private val recentNotifications: MutableList<NotificationData> =
            Collections.synchronizedList(mutableListOf())

        // Packages we care about
        private val WATCHED_PACKAGES = setOf(
            "com.whatsapp",
            "org.telegram.messenger",
            "com.google.android.apps.messaging",
            "com.android.mms"
        )

        /**
         * Returns whether the user has granted notification listener permission to this app.
         */
        fun isPermissionGranted(context: android.content.Context): Boolean {
            val enabledListeners = NotificationManagerCompat.getEnabledListenerPackages(context)
            return enabledListeners.contains(context.packageName)
        }

        /**
         * Returns a snapshot of the last [MAX_CACHED_NOTIFICATIONS] notifications received.
         */
        fun getRecentNotifications(): List<NotificationData> =
            synchronized(recentNotifications) { recentNotifications.toList() }
    }

    // -------------------------------------------------------------------------
    // Listener lifecycle
    // -------------------------------------------------------------------------

    override fun onListenerConnected() {
        super.onListenerConnected()
        LocalBroadcastManager.getInstance(this)
            .sendBroadcast(Intent(ACTION_LISTENER_CONNECTED))
    }

    override fun onListenerDisconnected() {
        super.onListenerDisconnected()
        LocalBroadcastManager.getInstance(this)
            .sendBroadcast(Intent(ACTION_LISTENER_DISCONNECTED))
    }

    // -------------------------------------------------------------------------
    // Notification events
    // -------------------------------------------------------------------------

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        sbn ?: return
        val pkg = sbn.packageName ?: return

        // Only process messages from watched packages
        if (pkg !in WATCHED_PACKAGES) return

        val extras = sbn.notification?.extras ?: return

        val sender = extras.getString("android.title") ?: ""
        val message = extras.getCharSequence("android.text")?.toString() ?: ""
        val timestamp = sbn.postTime

        // Cache in-memory
        val data = NotificationData(
            sender = sender,
            message = message,
            packageName = pkg,
            timestamp = timestamp
        )
        synchronized(recentNotifications) {
            recentNotifications.add(0, data)
            if (recentNotifications.size > MAX_CACHED_NOTIFICATIONS) {
                recentNotifications.removeAt(recentNotifications.lastIndex)
            }
        }

        // Broadcast to any registered listeners within the app process
        val broadcastIntent = Intent(ACTION_NOTIFICATION_RECEIVED).apply {
            putExtra("packageName", pkg)
            putExtra("sender", sender)
            putExtra("message", message)
            putExtra("timestamp", timestamp)
        }
        LocalBroadcastManager.getInstance(this).sendBroadcast(broadcastIntent)
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification?) {
        // Not needed for Vexsora's current feature set
    }
}
