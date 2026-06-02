package com.vexora.aiassistant

import android.content.Context
import android.net.Uri
import android.provider.ContactsContract
import android.telephony.SmsManager

object SmsHelper {

    var lastSenderNumber = ""
    var lastSenderName = ""

    data class Sms(val sender: String, val number: String, val body: String)

    // ── Contact lookup ─────────────────────────────────────────────────────────

    fun numberToName(context: Context, number: String): String {
        if (number.isBlank()) return number
        return try {
            val uri = Uri.withAppendedPath(
                ContactsContract.PhoneLookup.CONTENT_FILTER_URI, Uri.encode(number))
            context.contentResolver.query(
                uri, arrayOf(ContactsContract.PhoneLookup.DISPLAY_NAME), null, null, null
            )?.use { c -> if (c.moveToFirst()) c.getString(0) else number } ?: number
        } catch (_: Exception) { number }
    }

    fun nameToNumber(context: Context, name: String): String? {
        if (name.isBlank()) return null
        return try {
            context.contentResolver.query(
                ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
                arrayOf(
                    ContactsContract.CommonDataKinds.Phone.NUMBER,
                    ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME
                ),
                "${ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME} LIKE ?",
                arrayOf("%${name.trim()}%"),
                null
            )?.use { c -> if (c.moveToFirst()) c.getString(0) else null }
        } catch (_: Exception) { null }
    }

    // ── Read inbox ─────────────────────────────────────────────────────────────

    fun readInbox(context: Context, count: Int = 5): List<Sms> {
        val list = mutableListOf<Sms>()
        return try {
            context.contentResolver.query(
                Uri.parse("content://sms/inbox"),
                arrayOf("address", "body", "date"),
                null, null, "date DESC"
            )?.use { c ->
                val addrCol = c.getColumnIndexOrThrow("address")
                val bodyCol = c.getColumnIndexOrThrow("body")
                var n = 0
                while (c.moveToNext() && n < count) {
                    val num = c.getString(addrCol) ?: continue
                    val body = c.getString(bodyCol) ?: continue
                    list.add(Sms(numberToName(context, num), num, body))
                    n++
                }
            }
            list
        } catch (_: Exception) { list }
    }

    // ── Send SMS ───────────────────────────────────────────────────────────────

    fun send(number: String, message: String): Boolean {
        if (number.isBlank() || message.isBlank()) return false
        return try {
            @Suppress("DEPRECATION")
            val sm = SmsManager.getDefault()
            val parts = sm.divideMessage(message)
            sm.sendMultipartTextMessage(number, null, parts, null, null)
            true
        } catch (_: Exception) { false }
    }
}
