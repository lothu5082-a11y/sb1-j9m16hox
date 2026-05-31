package com.vexsora.ai
import expo.modules.splashscreen.SplashScreenManager

import android.app.ActivityManager
import android.app.AlertDialog
import android.app.ApplicationExitInfo
import android.content.Context
import android.os.Build
import android.os.Bundle

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

import expo.modules.ReactActivityDelegateWrapper

class MainActivity : ReactActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    SplashScreenManager.registerOnActivity(this)
    super.onCreate(null)
    // Show any crash info from the previous process so the user can report it.
    // This runs before React Native renders anything, so it displays even if
    // the app crashes again on this launch.
    showPreviousCrashIfAny()
  }

  private fun showPreviousCrashIfAny() {
    val prefs = getSharedPreferences("vexsora_diag", Context.MODE_PRIVATE)
    val javaCrash = prefs.getString("crash", null)
    prefs.edit().remove("crash").apply()

    val nativeCrash: String? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      try {
        val am = getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager
        val reasons = am?.getHistoricalProcessExitReasons(packageName, 0, 1)
        val last = reasons?.firstOrNull()
        if (last != null && (
              last.reason == ApplicationExitInfo.REASON_CRASH ||
              last.reason == ApplicationExitInfo.REASON_CRASH_NATIVE ||
              last.reason == ApplicationExitInfo.REASON_SIGNAL_CAUGHT
            )) {
          "Native exit: reason=${last.reason} status=${last.status} desc=${last.description}"
        } else null
      } catch (_: Exception) { null }
    } else null

    val info = listOfNotNull(javaCrash, nativeCrash).joinToString("\n\n---\n\n")
    if (info.isBlank()) return

    AlertDialog.Builder(this)
      .setTitle("Vexsora crash info (tap OK to dismiss)")
      .setMessage(info.take(1500))
      .setPositiveButton("OK") { d, _ -> d.dismiss() }
      .setCancelable(true)
      .show()
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "main"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate {
    return ReactActivityDelegateWrapper(
          this,
          BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
          object : DefaultReactActivityDelegate(
              this,
              mainComponentName,
              fabricEnabled
          ){})
  }

  /**
    * Align the back button behavior with Android S
    * where moving root activities to background instead of finishing activities.
    * @see <a href="https://developer.android.com/reference/android/app/Activity#onBackPressed()">onBackPressed</a>
    */
  override fun invokeDefaultOnBackPressed() {
      if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.R) {
          if (!moveTaskToBack(false)) {
              // For non-root activities, use the default implementation to finish them.
              super.invokeDefaultOnBackPressed()
          }
          return
      }

      // Use the default back button implementation on Android S
      // because it's doing more than [Activity.moveTaskToBack] in fact.
      super.invokeDefaultOnBackPressed()
  }
}
