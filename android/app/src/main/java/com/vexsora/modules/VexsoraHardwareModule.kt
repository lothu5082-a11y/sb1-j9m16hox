package com.vexsora.modules

import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraManager
import android.media.AudioManager
import android.os.BatteryManager
import android.os.Build
import android.telecom.TelecomManager
import android.telephony.TelephonyManager
import androidx.annotation.RequiresApi
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.module.annotations.ReactModule

@ReactModule(name = VexsoraHardwareModule.NAME)
class VexsoraHardwareModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "VexsoraHardware"
    }

    override fun getName(): String = NAME

    // -------------------------------------------------------------------------
    // Flashlight
    // -------------------------------------------------------------------------

    @ReactMethod
    fun toggleFlashlight(on: Boolean, promise: Promise) {
        try {
            val cameraManager =
                reactContext.getSystemService(Context.CAMERA_SERVICE) as? CameraManager
                    ?: run {
                        promise.reject("UNAVAILABLE", "CameraManager not available")
                        return
                    }

            // Find the first back-facing camera that has a flash unit
            val cameraId = cameraManager.cameraIdList.firstOrNull { id ->
                val characteristics = cameraManager.getCameraCharacteristics(id)
                val hasFlash =
                    characteristics.get(CameraCharacteristics.FLASH_INFO_AVAILABLE) == true
                val facing =
                    characteristics.get(CameraCharacteristics.LENS_FACING)
                hasFlash && facing == CameraCharacteristics.LENS_FACING_BACK
            } ?: run {
                promise.reject("NOT_SUPPORTED", "No camera with flash unit found")
                return
            }

            cameraManager.setTorchMode(cameraId, on)
            promise.resolve(on)
        } catch (e: Exception) {
            promise.reject("FLASHLIGHT_ERROR", e.message ?: "Unknown error toggling flashlight", e)
        }
    }

    // -------------------------------------------------------------------------
    // Volume
    // -------------------------------------------------------------------------

    @ReactMethod
    fun setVolume(stream: Int, level: Int, promise: Promise) {
        try {
            val audioManager =
                reactContext.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
                    ?: run {
                        promise.reject("UNAVAILABLE", "AudioManager not available")
                        return
                    }

            // Map stream constants: 0=VOICE_CALL, 3=RING, 5=MUSIC, 6=ALARM
            val androidStream = when (stream) {
                0 -> AudioManager.STREAM_VOICE_CALL
                3 -> AudioManager.STREAM_RING
                5 -> AudioManager.STREAM_MUSIC
                6 -> AudioManager.STREAM_ALARM
                else -> {
                    promise.reject("INVALID_STREAM", "Unknown stream type: $stream")
                    return
                }
            }

            val clampedLevel = level.coerceIn(0, 100)
            val maxVolume = audioManager.getStreamMaxVolume(androidStream)
            // Map 0-100 percentage to 0-maxVolume
            val targetVolume = (clampedLevel * maxVolume / 100.0).toInt()

            audioManager.setStreamVolume(androidStream, targetVolume, 0)
            promise.resolve(targetVolume)
        } catch (e: SecurityException) {
            promise.reject("PERMISSION_DENIED", "Permission denied setting volume: ${e.message}", e)
        } catch (e: Exception) {
            promise.reject("VOLUME_ERROR", e.message ?: "Unknown error setting volume", e)
        }
    }

    @ReactMethod
    fun adjustVolume(direction: Int, promise: Promise) {
        try {
            val audioManager =
                reactContext.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
                    ?: run {
                        promise.reject("UNAVAILABLE", "AudioManager not available")
                        return
                    }

            val adjustDirection = when {
                direction > 0 -> AudioManager.ADJUST_RAISE
                direction < 0 -> AudioManager.ADJUST_LOWER
                else -> AudioManager.ADJUST_SAME
            }

            audioManager.adjustVolume(adjustDirection, AudioManager.FLAG_SHOW_UI)
            val currentVolume =
                audioManager.getStreamVolume(AudioManager.STREAM_MUSIC)
            promise.resolve(currentVolume)
        } catch (e: SecurityException) {
            promise.reject(
                "PERMISSION_DENIED",
                "Permission denied adjusting volume: ${e.message}",
                e
            )
        } catch (e: Exception) {
            promise.reject("VOLUME_ERROR", e.message ?: "Unknown error adjusting volume", e)
        }
    }

    // -------------------------------------------------------------------------
    // Call management
    // -------------------------------------------------------------------------

    @ReactMethod
    fun answerCall(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                answerCallModern(promise)
            } else {
                answerCallLegacy(promise)
            }
        } catch (e: SecurityException) {
            promise.reject("PERMISSION_DENIED", "Permission denied answering call: ${e.message}", e)
        } catch (e: Exception) {
            promise.reject("CALL_ERROR", e.message ?: "Unknown error answering call", e)
        }
    }

    @RequiresApi(Build.VERSION_CODES.O)
    private fun answerCallModern(promise: Promise) {
        val telecomManager =
            reactContext.getSystemService(Context.TELECOM_SERVICE) as? TelecomManager
                ?: run {
                    promise.reject("UNAVAILABLE", "TelecomManager not available")
                    return
                }
        telecomManager.acceptRingingCall()
        promise.resolve(true)
    }

    @Suppress("DEPRECATION")
    private fun answerCallLegacy(promise: Promise) {
        val intent = Intent(Intent.ACTION_ANSWER)
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
        reactContext.startActivity(intent)
        promise.resolve(true)
    }

    @ReactMethod
    fun hangupCall(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                hangupCallModern(promise)
            } else {
                hangupCallLegacy(promise)
            }
        } catch (e: SecurityException) {
            promise.reject("PERMISSION_DENIED", "Permission denied ending call: ${e.message}", e)
        } catch (e: Exception) {
            promise.reject("CALL_ERROR", e.message ?: "Unknown error ending call", e)
        }
    }

    @RequiresApi(Build.VERSION_CODES.P)
    private fun hangupCallModern(promise: Promise) {
        val telecomManager =
            reactContext.getSystemService(Context.TELECOM_SERVICE) as? TelecomManager
                ?: run {
                    promise.reject("UNAVAILABLE", "TelecomManager not available")
                    return
                }
        telecomManager.endCall()
        promise.resolve(true)
    }

    @Suppress("DEPRECATION")
    private fun hangupCallLegacy(promise: Promise) {
        val telephonyManager =
            reactContext.getSystemService(Context.TELEPHONY_SERVICE) as? TelephonyManager
                ?: run {
                    promise.reject("UNAVAILABLE", "TelephonyManager not available")
                    return
                }
        // Use hidden API via reflection for older Android versions
        try {
            val telephonyClass = Class.forName(telephonyManager.javaClass.name)
            val method = telephonyClass.getDeclaredMethod("endCall")
            method.isAccessible = true
            method.invoke(telephonyManager)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject(
                "CALL_ERROR",
                "Failed to end call on this API level: ${e.message}",
                e
            )
        }
    }

    // -------------------------------------------------------------------------
    // Battery
    // -------------------------------------------------------------------------

    @ReactMethod
    fun getBatteryLevel(promise: Promise) {
        try {
            val batteryMap = Arguments.createMap()

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                val batteryManager =
                    reactContext.getSystemService(Context.BATTERY_SERVICE) as? BatteryManager
                        ?: run {
                            promise.reject("UNAVAILABLE", "BatteryManager not available")
                            return
                        }

                val level = batteryManager.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
                val status =
                    batteryManager.getIntProperty(BatteryManager.BATTERY_PROPERTY_STATUS)
                val isCharging =
                    status == BatteryManager.BATTERY_STATUS_CHARGING ||
                            status == BatteryManager.BATTERY_STATUS_FULL

                // Temperature requires a broadcast intent sticky value
                val intentFilter = IntentFilter(Intent.ACTION_BATTERY_CHANGED)
                val batteryIntent =
                    reactContext.registerReceiver(null, intentFilter)
                val temperatureRaw =
                    batteryIntent?.getIntExtra(BatteryManager.EXTRA_TEMPERATURE, 0) ?: 0
                // Temperature is in tenths of a degree Celsius
                val temperature = temperatureRaw / 10.0f

                batteryMap.putDouble("level", level.toDouble())
                batteryMap.putBoolean("isCharging", isCharging)
                batteryMap.putDouble("temperature", temperature.toDouble())
            } else {
                // Fallback for very old API levels
                val intentFilter = IntentFilter(Intent.ACTION_BATTERY_CHANGED)
                val batteryIntent =
                    reactContext.registerReceiver(null, intentFilter)
                        ?: run {
                            promise.reject("UNAVAILABLE", "Battery intent not available")
                            return
                        }

                val rawLevel = batteryIntent.getIntExtra(BatteryManager.EXTRA_LEVEL, -1)
                val scale = batteryIntent.getIntExtra(BatteryManager.EXTRA_SCALE, -1)
                val levelPct =
                    if (rawLevel >= 0 && scale > 0) (rawLevel * 100f / scale).toInt() else -1

                val status = batteryIntent.getIntExtra(BatteryManager.EXTRA_STATUS, -1)
                val isCharging =
                    status == BatteryManager.BATTERY_STATUS_CHARGING ||
                            status == BatteryManager.BATTERY_STATUS_FULL

                val temperatureRaw =
                    batteryIntent.getIntExtra(BatteryManager.EXTRA_TEMPERATURE, 0)
                val temperature = temperatureRaw / 10.0f

                batteryMap.putDouble("level", levelPct.toDouble())
                batteryMap.putBoolean("isCharging", isCharging)
                batteryMap.putDouble("temperature", temperature.toDouble())
            }

            promise.resolve(batteryMap)
        } catch (e: Exception) {
            promise.reject("BATTERY_ERROR", e.message ?: "Unknown error getting battery level", e)
        }
    }
}
