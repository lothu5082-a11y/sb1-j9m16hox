package com.vexsora.modules

import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.content.Context
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.modules.core.DeviceEventManagerModule

@ReactModule(name = SensorModule.NAME)
class SensorModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "VexsoraSensor"
        private const val EVENT_ACCELEROMETER = "VexsoraAccelerometer"
    }

    private var sensorManager: SensorManager? = null
    private var accelerometerSensor: Sensor? = null
    private var isListening = false

    // -------------------------------------------------------------------------
    // React Native lifecycle
    // -------------------------------------------------------------------------

    override fun getName(): String = NAME

    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        unregisterListener()
    }

    // -------------------------------------------------------------------------
    // Sensor listener
    // -------------------------------------------------------------------------

    private val sensorEventListener = object : SensorEventListener {
        override fun onSensorChanged(event: SensorEvent?) {
            event ?: return
            if (event.sensor.type != Sensor.TYPE_ACCELEROMETER) return

            val params = Arguments.createMap().apply {
                putDouble("x", event.values[0].toDouble())
                putDouble("y", event.values[1].toDouble())
                putDouble("z", event.values[2].toDouble())
                putDouble("timestamp", event.timestamp.toDouble())
            }

            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                ?.emit(EVENT_ACCELEROMETER, params)
        }

        override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {
            // No-op for accelerometer
        }
    }

    // -------------------------------------------------------------------------
    // React methods
    // -------------------------------------------------------------------------

    @ReactMethod
    fun startAccelerometer(promise: Promise) {
        try {
            if (isListening) {
                promise.resolve(true)
                return
            }

            val sm = reactContext.getSystemService(Context.SENSOR_SERVICE) as? SensorManager
                ?: run {
                    promise.reject("UNAVAILABLE", "SensorManager not available")
                    return
                }

            val sensor = sm.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
                ?: run {
                    promise.reject("NOT_SUPPORTED", "Accelerometer sensor not available on this device")
                    return
                }

            sensorManager = sm
            accelerometerSensor = sensor

            val registered = sm.registerListener(
                sensorEventListener,
                sensor,
                SensorManager.SENSOR_DELAY_GAME
            )

            if (!registered) {
                promise.reject("REGISTRATION_FAILED", "Failed to register accelerometer listener")
                return
            }

            isListening = true
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SENSOR_ERROR", e.message ?: "Unknown error starting accelerometer", e)
        }
    }

    @ReactMethod
    fun stopAccelerometer(promise: Promise) {
        try {
            unregisterListener()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SENSOR_ERROR", e.message ?: "Unknown error stopping accelerometer", e)
        }
    }

    @ReactMethod
    fun isAvailable(promise: Promise) {
        try {
            val sm = reactContext.getSystemService(Context.SENSOR_SERVICE) as? SensorManager
                ?: run {
                    promise.resolve(false)
                    return
                }
            val sensor = sm.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
            promise.resolve(sensor != null)
        } catch (e: Exception) {
            promise.reject("SENSOR_ERROR", e.message ?: "Unknown error checking sensor availability", e)
        }
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private fun unregisterListener() {
        if (isListening) {
            try {
                sensorManager?.unregisterListener(sensorEventListener)
            } catch (_: Exception) { /* ignore cleanup errors */ }
            isListening = false
        }
        sensorManager = null
        accelerometerSensor = null
    }
}
