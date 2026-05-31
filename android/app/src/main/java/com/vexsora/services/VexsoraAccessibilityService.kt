package com.vexsora.services

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import java.util.concurrent.ConcurrentLinkedQueue

// ---------------------------------------------------------------------------
// Data model for queued actions
// ---------------------------------------------------------------------------

sealed class AccessibilityAction {
    data class TypeText(val text: String, val packageName: String) : AccessibilityAction()
    data class TapSend(val packageName: String) : AccessibilityAction()
    data class FindAndClick(val contentDescription: String) : AccessibilityAction()
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

class VexsoraAccessibilityService : AccessibilityService() {

    companion object {
        /** Queue of pending accessibility actions waiting to be executed. */
        val pendingActions: ConcurrentLinkedQueue<AccessibilityAction> = ConcurrentLinkedQueue()

        // Package names monitored by this service
        private val WHATSAPP_PKG = "com.whatsapp"
        private val TELEGRAM_PKG = "org.telegram.messenger"
        private val MESSAGES_PKG = "com.google.android.apps.messaging"
        private val DEFAULT_SMS_PKG = "com.android.mms"

        /**
         * Opens WhatsApp with a specific contact and queues a TypeText + TapSend action.
         * [targetName] is used as-is in a WhatsApp deep-link by phone number or contact name.
         * For simplicity we open WhatsApp's main activity and rely on the accessibility service
         * to type the message once the composer is focused.
         */
        fun sendWhatsAppMessage(targetName: String, message: String, context: Context) {
            // Queue the actions before launching so they are ready when events fire
            pendingActions.add(AccessibilityAction.TypeText(message, WHATSAPP_PKG))
            pendingActions.add(AccessibilityAction.TapSend(WHATSAPP_PKG))

            // Try the wa.me deep-link first; fall back to launcher intent
            val deepLink = Intent(Intent.ACTION_VIEW, Uri.parse("https://wa.me/?text=")).apply {
                setPackage(WHATSAPP_PKG)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            val launchIntent = context.packageManager.getLaunchIntentForPackage(WHATSAPP_PKG)?.apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            try {
                context.startActivity(deepLink)
            } catch (_: Exception) {
                launchIntent?.let { context.startActivity(it) }
            }
        }

        /**
         * Queues a TypeText action that targets whichever app is currently in the foreground.
         * The service will type into the first focused EditText it encounters.
         */
        fun typeInCurrentApp(text: String) {
            // Use an empty string as packageName to match any foreground package
            pendingActions.add(AccessibilityAction.TypeText(text, ""))
        }
    }

    // -------------------------------------------------------------------------
    // Service lifecycle
    // -------------------------------------------------------------------------

    override fun onServiceConnected() {
        super.onServiceConnected()
        serviceInfo = AccessibilityServiceInfo().apply {
            eventTypes = (
                AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED
                    or AccessibilityEvent.TYPE_VIEW_FOCUSED
                    or AccessibilityEvent.TYPE_VIEW_TEXT_CHANGED
            )
            feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
            flags = (
                AccessibilityServiceInfo.FLAG_REQUEST_ENHANCED_WEB_ACCESSIBILITY
                    or AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS
            )
            notificationTimeout = 100
            packageNames = arrayOf(
                WHATSAPP_PKG,
                TELEGRAM_PKG,
                MESSAGES_PKG,
                DEFAULT_SMS_PKG
            )
        }
    }

    override fun onInterrupt() {
        // Required override — nothing to clean up
    }

    // -------------------------------------------------------------------------
    // Event handling
    // -------------------------------------------------------------------------

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        event ?: return
        val eventPackage = event.packageName?.toString() ?: return
        if (pendingActions.isEmpty()) return

        val action = pendingActions.peek() ?: return

        // Only act if the event package matches (or the action targets any package)
        val targetPackage = when (action) {
            is AccessibilityAction.TypeText -> action.packageName
            is AccessibilityAction.TapSend -> action.packageName
            is AccessibilityAction.FindAndClick -> "" // match any package
        }

        if (targetPackage.isNotEmpty() && targetPackage != eventPackage) return

        when (action) {
            is AccessibilityAction.TypeText -> {
                if (executeTypeText(action.text)) {
                    pendingActions.poll()
                }
            }
            is AccessibilityAction.TapSend -> {
                if (executeTapSend()) {
                    pendingActions.poll()
                }
            }
            is AccessibilityAction.FindAndClick -> {
                if (executeFindAndClick(action.contentDescription)) {
                    pendingActions.poll()
                }
            }
        }
    }

    // -------------------------------------------------------------------------
    // Action executors
    // -------------------------------------------------------------------------

    /**
     * Finds the first EditText in the active window and sets its text using the
     * accessibility ACTION_SET_TEXT API (API 21+).
     */
    private fun executeTypeText(text: String): Boolean {
        val root = rootInActiveWindow ?: return false
        val editText = findFirstEditText(root) ?: return false

        return try {
            // First move accessibility focus to the node so the IME is aware of it
            editText.performAction(AccessibilityNodeInfo.ACTION_ACCESSIBILITY_FOCUS)

            val args = Bundle()
            args.putCharSequence(
                AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE,
                text
            )
            val result = editText.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, args)
            editText.recycle()
            result
        } catch (_: Exception) {
            try { editText.recycle() } catch (_: Exception) {}
            false
        }
    }

    /**
     * Finds a node with content description "Send" (case-insensitive) and clicks it.
     */
    private fun executeTapSend(): Boolean {
        val root = rootInActiveWindow ?: return false
        val sendNode = findNodeByDescription(root, "send") ?: return false

        return try {
            val result = sendNode.performAction(AccessibilityNodeInfo.ACTION_CLICK)
            sendNode.recycle()
            result
        } catch (_: Exception) {
            try { sendNode.recycle() } catch (_: Exception) {}
            false
        }
    }

    /**
     * Finds a node whose content description contains [description] (case-insensitive)
     * and clicks it.
     */
    private fun executeFindAndClick(description: String): Boolean {
        val root = rootInActiveWindow ?: return false
        val node = findNodeByDescription(root, description) ?: return false

        return try {
            val result = node.performAction(AccessibilityNodeInfo.ACTION_CLICK)
            node.recycle()
            result
        } catch (_: Exception) {
            try { node.recycle() } catch (_: Exception) {}
            false
        }
    }

    // -------------------------------------------------------------------------
    // Node traversal helpers
    // -------------------------------------------------------------------------

    private fun findFirstEditText(root: AccessibilityNodeInfo): AccessibilityNodeInfo? {
        if (root.className?.toString() == "android.widget.EditText") {
            return root
        }
        for (i in 0 until root.childCount) {
            val child = root.getChild(i) ?: continue
            val found = findFirstEditText(child)
            if (found != null) {
                if (found !== child) child.recycle()
                return found
            }
            child.recycle()
        }
        return null
    }

    private fun findNodeByDescription(
        root: AccessibilityNodeInfo,
        descriptionQuery: String
    ): AccessibilityNodeInfo? {
        val desc = root.contentDescription?.toString()?.lowercase()
        if (desc != null && desc.contains(descriptionQuery.lowercase())) {
            return root
        }
        for (i in 0 until root.childCount) {
            val child = root.getChild(i) ?: continue
            val found = findNodeByDescription(child, descriptionQuery)
            if (found != null) {
                if (found !== child) child.recycle()
                return found
            }
            child.recycle()
        }
        return null
    }
}
