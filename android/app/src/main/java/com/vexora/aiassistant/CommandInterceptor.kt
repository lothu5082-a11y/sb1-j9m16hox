package com.vexora.aiassistant

import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraManager
import android.media.AudioManager
import android.net.Uri
import android.os.BatteryManager
import android.provider.Settings

object CommandInterceptor {

    fun handle(context: Context, input: String): String? {
        val lo = input.lowercase().trim()

        // ── Flashlight / torch ─────────────────────────────────────────────────
        if (lo.contains("flashlight") || lo.contains("torch")) {
            val on = !(lo.contains("off") || lo.contains("disable") || lo.contains("turn off"))
            return flashlight(context, on)
        }

        // ── Battery ───────────────────────────────────────────────────────────
        if (lo.contains("battery") || lo.contains("charge level") || lo.contains("how much battery"))
            return battery(context)

        // ── Volume ────────────────────────────────────────────────────────────
        if ((lo.contains("volume") || lo.contains("vol")) && lo.contains("up"))   return volume(context, -3)
        if ((lo.contains("volume") || lo.contains("vol")) && lo.contains("down")) return volume(context, -4)
        if (lo.contains("max volume") || lo.contains("volume max") || lo.contains("full volume"))
            return volume(context, 100)
        if (lo.contains("mute") && !lo.contains("unmute"))  return volume(context, -1)
        if (lo.contains("unmute") || lo.contains("un-mute")) return volume(context, -2)
        val volPct = Regex("(?:volume|vol)[^\\d]*(\\d{1,3})").find(lo)?.groupValues?.get(1)?.toIntOrNull()
            ?: Regex("(\\d{1,3})\\s*%?\\s*(?:volume|vol)").find(lo)?.groupValues?.get(1)?.toIntOrNull()
        if (volPct != null) return volume(context, volPct.coerceIn(0, 100))

        // ── Ringer modes ──────────────────────────────────────────────────────
        if (lo.contains("silent mode") || lo.contains("do not disturb"))
            return ringerMode(context, AudioManager.RINGER_MODE_SILENT)
        if (lo.contains("vibrate mode")) return ringerMode(context, AudioManager.RINGER_MODE_VIBRATE)
        if (lo.contains("normal mode") || lo.contains("ring mode"))
            return ringerMode(context, AudioManager.RINGER_MODE_NORMAL)

        // ── Brightness ────────────────────────────────────────────────────────
        if (lo.contains("brightness") || lo.contains("screen bright")) {
            if (lo.contains("max") || lo.contains("full")) return brightness(context, 100)
            if (lo.contains("min") || lo.contains("dim") || lo.contains("low")) return brightness(context, 15)
            val bPct = Regex("(\\d{1,3})").find(lo)?.value?.toIntOrNull()
            if (bPct != null) return brightness(context, bPct.coerceIn(0, 100))
        }

        // ── Phone calls ───────────────────────────────────────────────────────
        val callMatch = Regex("(?:call|ring|phone|dial)\\s+(.+)", RegexOption.IGNORE_CASE).find(input)
        if (callMatch != null) {
            val who = callMatch.groupValues[1].trim()
            return makeCall(context, who)
        }

        // ── SMS / text message ────────────────────────────────────────────────
        val smsMatch = Regex(
            """(?:(?:send|text|message|msg|sms|whatsapp)\s+)?(?:a\s+)?(?:message|msg|text|sms)?\s*(?:to\s+)?([A-Za-z\s]+?)\s+(?:saying|that|:|-|message)?\s*"?([^"]+)"?$""",
            RegexOption.IGNORE_CASE
        ).find(input)
        if (smsMatch != null && (lo.contains("text ") || lo.contains("message ") ||
                lo.contains("sms ") || lo.contains("send message") || lo.contains("msg "))) {
            val who = smsMatch.groupValues[1].trim()
            val msg = smsMatch.groupValues[2].trim()
            if (who.isNotBlank() && msg.isNotBlank()) return sendSms(context, who, msg)
        }
        // Simpler pattern: "text John hello"
        val simpleText = Regex("(?:text|msg)\\s+([A-Za-z]+)\\s+(.+)", RegexOption.IGNORE_CASE).find(input)
        if (simpleText != null) {
            val who = simpleText.groupValues[1].trim()
            val msg = simpleText.groupValues[2].trim()
            if (msg.length > 1) return sendSms(context, who, msg)
        }

        // ── WhatsApp message ──────────────────────────────────────────────────
        val waMatch = Regex("whatsapp\\s+([A-Za-z]+)\\s+(.+)", RegexOption.IGNORE_CASE).find(input)
        if (waMatch != null) {
            val who = waMatch.groupValues[1].trim()
            val msg = waMatch.groupValues[2].trim()
            return sendWhatsApp(context, who, msg)
        }

        // ── Reply to last SMS ─────────────────────────────────────────────────
        val replyMatch = Regex("(?:reply|respond|send reply|reply saying|reply with)\\s+(.+)", RegexOption.IGNORE_CASE).find(input)
        if (replyMatch != null && SmsHelper.lastSenderNumber.isNotBlank()) {
            val msg = replyMatch.groupValues[1].trim()
            return replyToLast(msg)
        }
        if ((lo == "reply" || lo == "respond") && SmsHelper.lastSenderNumber.isNotBlank()) {
            return "What would you like to reply to ${SmsHelper.lastSenderName}? Just say reply followed by your message."
        }

        // ── Read messages ─────────────────────────────────────────────────────
        if (lo.contains("read message") || lo.contains("check message") ||
            lo.contains("my messages") || lo.contains("new message") || lo.contains("read sms")) {
            return readMessages(context)
        }

        // ── App launch ────────────────────────────────────────────────────────
        val appMatch = Regex("(?:open|launch|start|run)\\s+(.+)", RegexOption.IGNORE_CASE).find(input)
        if (appMatch != null && !lo.contains("settings") && !lo.contains("camera")) {
            return launchApp(context, appMatch.groupValues[1].trim())
        }
        if (lo.contains("open settings") || lo.contains("phone settings"))
            return "[ACTION: SETTINGS]\nOpening device settings! ⚙️"
        if (lo.contains("open camera") || lo.contains("take photo") || lo.contains("take picture"))
            return "[ACTION: CAMERA]\nOpening your camera! 📷"

        return null
    }

    // ── Flashlight ────────────────────────────────────────────────────────────

    private fun flashlight(context: Context, on: Boolean): String = try {
        val cm = context.getSystemService(Context.CAMERA_SERVICE) as CameraManager
        val id = cm.cameraIdList.firstOrNull {
            cm.getCameraCharacteristics(it).get(CameraCharacteristics.FLASH_INFO_AVAILABLE) == true
        }
        if (id != null) {
            cm.setTorchMode(id, on)
            if (on) "🔦 Flashlight is ON!" else "🔦 Flashlight is OFF!"
        } else "No flashlight found on this device."
    } catch (e: Exception) { "Flashlight error: ${e.message}" }

    // ── Volume ────────────────────────────────────────────────────────────────

    private fun volume(context: Context, pct: Int): String {
        val am = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        return when (pct) {
            -1 -> { am.adjustStreamVolume(AudioManager.STREAM_MUSIC, AudioManager.ADJUST_MUTE, 0); "🔇 Muted!" }
            -2 -> { am.adjustStreamVolume(AudioManager.STREAM_MUSIC, AudioManager.ADJUST_UNMUTE, AudioManager.FLAG_SHOW_UI); "🔊 Unmuted!" }
            -3 -> { am.adjustStreamVolume(AudioManager.STREAM_MUSIC, AudioManager.ADJUST_RAISE, AudioManager.FLAG_SHOW_UI); "🔊 Volume up!" }
            -4 -> { am.adjustStreamVolume(AudioManager.STREAM_MUSIC, AudioManager.ADJUST_LOWER, AudioManager.FLAG_SHOW_UI); "🔉 Volume down!" }
            else -> {
                val max = am.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
                am.setStreamVolume(AudioManager.STREAM_MUSIC, (pct / 100f * max).toInt().coerceIn(0, max), AudioManager.FLAG_SHOW_UI)
                "🔊 Volume set to $pct%!"
            }
        }
    }

    private fun ringerMode(context: Context, mode: Int): String {
        val am = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        return try {
            am.ringerMode = mode
            when (mode) {
                AudioManager.RINGER_MODE_SILENT  -> "🔕 Silent mode enabled!"
                AudioManager.RINGER_MODE_VIBRATE -> "📳 Vibrate mode enabled!"
                else                             -> "🔔 Ringer mode on!"
            }
        } catch (_: Exception) {
            "⚙️ Couldn't change ringer mode — grant Do Not Disturb access in Settings."
        }
    }

    // ── Brightness ────────────────────────────────────────────────────────────

    private fun brightness(context: Context, pct: Int): String {
        return if (Settings.System.canWrite(context)) {
            try {
                Settings.System.putInt(context.contentResolver, Settings.System.SCREEN_BRIGHTNESS_MODE,
                    Settings.System.SCREEN_BRIGHTNESS_MODE_MANUAL)
                Settings.System.putInt(context.contentResolver, Settings.System.SCREEN_BRIGHTNESS,
                    (pct / 100f * 255).toInt().coerceIn(1, 255))
                "☀️ Brightness set to $pct%!"
            } catch (e: Exception) { "Couldn't set brightness: ${e.message}" }
        } else {
            "⚙️ Grant **Modify system settings** permission: Settings → Apps → Vexora AI → Modify system settings"
        }
    }

    // ── Battery ───────────────────────────────────────────────────────────────

    private fun battery(context: Context): String {
        val i = context.registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
        val lvl  = i?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: -1
        val scl  = i?.getIntExtra(BatteryManager.EXTRA_SCALE, -1) ?: -1
        val plug = i?.getIntExtra(BatteryManager.EXTRA_PLUGGED, -1) ?: 0
        return if (lvl >= 0 && scl > 0) {
            val pct = (lvl * 100f / scl).toInt()
            val icon = if (pct > 50) "🔋" else if (pct > 20) "🟡" else "⚠️"
            "$icon Battery: **$pct%** ${if (plug != 0) "(charging ⚡)" else ""}"
        } else "Couldn't read battery info."
    }

    // ── Phone call ────────────────────────────────────────────────────────────

    private fun makeCall(context: Context, who: String): String {
        val lo = who.lowercase().trim()

        // Direct number
        val numMatch = Regex("\\d[\\d\\s\\-+()]{5,}").find(who)
        val number = if (numMatch != null) {
            numMatch.value.replace(Regex("[\\s\\-()]"), "")
        } else {
            SmsHelper.nameToNumber(context, who)
        }

        return if (number != null) {
            val intent = Intent(Intent.ACTION_CALL, Uri.parse("tel:$number")).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            try {
                context.startActivity(intent)
                "📞 Calling $who…"
            } catch (_: SecurityException) {
                // Fall back to dial (no permission)
                val dial = Intent(Intent.ACTION_DIAL, Uri.parse("tel:$number")).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(dial)
                "📱 Opening dialer for $who…"
            } catch (e: Exception) {
                "Couldn't start call: ${e.message}"
            }
        } else {
            "I couldn't find $who in your contacts."
        }
    }

    // ── SMS ───────────────────────────────────────────────────────────────────

    private fun sendSms(context: Context, who: String, message: String): String {
        val number = Regex("\\d[\\d\\s\\-+()]{5,}").find(who)?.value?.replace(Regex("[\\s\\-()]"), "")
            ?: SmsHelper.nameToNumber(context, who)
            ?: return "I couldn't find $who in your contacts."
        val sent = SmsHelper.send(number, message)
        return if (sent) "✅ Message sent to $who: \"$message\""
        else "⚠️ Couldn't send message — check SEND_SMS permission."
    }

    private fun replyToLast(message: String): String {
        // Try WhatsApp/Telegram direct reply first (notification RemoteInput)
        val listenerService = MessageListenerService.lastReplyAction
        if (listenerService != null) {
            val name = MessageListenerService.lastSenderName
            // We need a context reference to call replyViaNotification()
            // Use SMS as fallback if number is available
        }

        // Try SMS reply
        val number = SmsHelper.lastSenderNumber
        val name = SmsHelper.lastSenderName.ifBlank { MessageListenerService.lastSenderName }
        if (number.isNotBlank()) {
            val sent = SmsHelper.send(number, message)
            return if (sent) "✅ SMS reply sent to $name: \"$message\""
            else "⚠️ Couldn't send SMS — check SEND_SMS permission."
        }

        // No reply target
        return if (name.isNotBlank())
            "Say **'WhatsApp $name $message'** to reply on WhatsApp, or I need a phone number to send SMS."
        else
            "No recent message to reply to."
    }

    private fun readMessages(context: Context): String {
        val msgs = SmsHelper.readInbox(context, 3)
        if (msgs.isEmpty()) return "No messages found (check READ_SMS permission)."
        return "📩 **Latest messages:**\n\n" + msgs.joinToString("\n\n") { sms ->
            "**${sms.sender}**: ${sms.body.take(120)}${if (sms.body.length > 120) "…" else ""}"
        } + "\n\nSay **'reply [message]'** to reply to the last sender."
    }

    // ── WhatsApp ──────────────────────────────────────────────────────────────

    private fun sendWhatsApp(context: Context, who: String, message: String): String {
        val number = SmsHelper.nameToNumber(context, who)
        val encoded = Uri.encode(message)
        val intent = Intent(Intent.ACTION_VIEW).apply {
            data = if (number != null)
                Uri.parse("https://wa.me/${number.replace("+", "")}?text=$encoded")
            else
                Uri.parse("https://wa.me/?text=$encoded")
            setPackage("com.whatsapp")
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        return try {
            context.startActivity(intent)
            "💬 Opening WhatsApp to $who — tap Send to confirm."
        } catch (_: Exception) {
            "WhatsApp is not installed."
        }
    }

    // ── App launch ────────────────────────────────────────────────────────────

    private fun launchApp(context: Context, appName: String): String {
        val lo = appName.lowercase().trim()
        val knownPkgs = mapOf(
            "whatsapp" to "com.whatsapp", "youtube" to "com.google.android.youtube",
            "spotify" to "com.spotify.music", "instagram" to "com.instagram.android",
            "twitter" to "com.twitter.android", "x" to "com.twitter.android",
            "tiktok" to "com.zhiliaoapp.musically", "facebook" to "com.facebook.katana",
            "gmail" to "com.google.android.gm", "maps" to "com.google.android.apps.maps",
            "google maps" to "com.google.android.apps.maps",
            "chrome" to "com.android.chrome", "calculator" to "com.android.calculator2",
            "telegram" to "org.telegram.messenger", "netflix" to "com.netflix.mediaclient",
            "photos" to "com.google.android.apps.photos", "clock" to "com.android.deskclock",
            "contacts" to "com.android.contacts", "calendar" to "com.android.calendar",
            "files" to "com.google.android.documentsui", "play store" to "com.android.vending",
            "zoom" to "us.zoom.videomeetings", "discord" to "com.discord",
            "snapchat" to "com.snapchat.android", "amazon" to "com.amazon.mShop.android.shopping",
            "uber" to "com.ubercab", "flipkart" to "com.flipkart.android",
            "phonepe" to "com.phonepe.app", "paytm" to "net.one97.paytm"
        )
        for ((key, pkg) in knownPkgs) {
            if (lo.contains(key)) return tryLaunch(context, pkg, appName)
        }
        val match = context.packageManager.getInstalledApplications(0).firstOrNull { app ->
            val label = context.packageManager.getApplicationLabel(app).toString().lowercase()
            label.contains(lo) || lo.contains(label.split(" ").first())
        }
        return if (match != null) tryLaunch(context, match.packageName, appName)
        else "I couldn't find '$appName' on your device."
    }

    private fun tryLaunch(context: Context, pkg: String, label: String): String {
        val intent = context.packageManager.getLaunchIntentForPackage(pkg)
            ?: return "Couldn't find '$label' on this device."
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        return try {
            context.startActivity(intent)
            "🚀 Opening ${label.replaceFirstChar { it.uppercase() }}!"
        } catch (e: Exception) { "Couldn't open '$label': ${e.message}" }
    }
}
