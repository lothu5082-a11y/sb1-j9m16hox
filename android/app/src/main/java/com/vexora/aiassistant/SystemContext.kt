package com.vexora.aiassistant

import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.media.AudioManager
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.BatteryManager
import java.text.SimpleDateFormat
import java.util.*

object SystemContext {

    fun buildPrefix(context: Context): String {
        val time = SimpleDateFormat("h:mm a, EEEE", Locale.US).format(Date())
        val battery = getBattery(context)
        val vol = getVolumePercent(context)
        val wifi = getWifi(context)
        return "[System: Time=$time | Battery=$battery | Volume=$vol% | WiFi=$wifi]\n"
    }

    fun getBattery(context: Context): String {
        val i = context.registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
        val lvl = i?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: -1
        val scl = i?.getIntExtra(BatteryManager.EXTRA_SCALE, -1) ?: -1
        val plug = i?.getIntExtra(BatteryManager.EXTRA_PLUGGED, -1) ?: 0
        return if (lvl >= 0 && scl > 0) "${(lvl * 100f / scl).toInt()}%${if (plug != 0) "⚡" else ""}"
        else "unknown"
    }

    fun getVolumePercent(context: Context): Int {
        val am = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        val cur = am.getStreamVolume(AudioManager.STREAM_MUSIC)
        val max = am.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
        return if (max > 0) (cur * 100f / max).toInt() else 0
    }

    fun getWifi(context: Context): String {
        val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val net = cm.activeNetwork ?: return "Off"
        val caps = cm.getNetworkCapabilities(net) ?: return "Off"
        return if (caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)) "On" else "Off"
    }
}
