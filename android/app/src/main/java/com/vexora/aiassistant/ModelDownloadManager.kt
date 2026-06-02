package com.vexora.aiassistant

import android.app.DownloadManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.Uri
import android.os.Build
import android.os.Environment

object ModelDownloadManager {

    private const val MODEL_URL =
        "https://huggingface.co/litert-community/Gemma2-2B-IT/resolve/main/gemma2-2b-it-cpu-int8.bin"

    fun startDownload(context: Context, onComplete: (success: Boolean) -> Unit): Long {
        val dm = context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager

        val destDir = context.getExternalFilesDir(null)
            ?: context.filesDir

        val request = DownloadManager.Request(Uri.parse(MODEL_URL)).apply {
            setTitle("Gemma 2B AI Model")
            setDescription("Downloading offline AI model…")
            setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
            setDestinationUri(Uri.fromFile(java.io.File(destDir, LlmEngine.MODEL_FILENAME)))
            setAllowedOverMetered(true)
            setAllowedOverRoaming(false)
        }

        val downloadId = dm.enqueue(request)
        ModelSettings.setDownloadId(context, downloadId)

        val receiver = object : BroadcastReceiver() {
            override fun onReceive(ctx: Context?, intent: Intent?) {
                val id = intent?.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1L)
                if (id == downloadId) {
                    try { ctx?.unregisterReceiver(this) } catch (_: Exception) {}
                    val query = DownloadManager.Query().setFilterById(downloadId)
                    val cursor = dm.query(query)
                    var success = false
                    if (cursor.moveToFirst()) {
                        val status = cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS))
                        success = status == DownloadManager.STATUS_SUCCESSFUL
                    }
                    cursor.close()
                    if (!success) ModelSettings.setDownloadId(ctx ?: context, -1L)
                    onComplete(success)
                }
            }
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            context.registerReceiver(
                receiver,
                IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE),
                Context.RECEIVER_NOT_EXPORTED
            )
        } else {
            @Suppress("UnspecifiedRegisterReceiverFlag")
            context.registerReceiver(receiver, IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE))
        }

        return downloadId
    }

    fun getProgress(context: Context): Int {
        val downloadId = ModelSettings.getDownloadId(context)
        if (downloadId == -1L) return -1
        val dm = context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
        val cursor = dm.query(DownloadManager.Query().setFilterById(downloadId))
        if (!cursor.moveToFirst()) { cursor.close(); return -1 }
        val status = cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS))
        if (status == DownloadManager.STATUS_FAILED) { cursor.close(); return -1 }
        val downloaded = cursor.getLong(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR))
        val total = cursor.getLong(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_TOTAL_SIZE_BYTES))
        cursor.close()
        return if (total > 0) ((downloaded * 100) / total).toInt() else 0
    }

    fun isDownloading(context: Context): Boolean {
        val downloadId = ModelSettings.getDownloadId(context)
        if (downloadId == -1L) return false
        val dm = context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
        val cursor = dm.query(DownloadManager.Query().setFilterById(downloadId))
        if (!cursor.moveToFirst()) { cursor.close(); return false }
        val status = cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS))
        cursor.close()
        return status == DownloadManager.STATUS_RUNNING || status == DownloadManager.STATUS_PENDING
    }

    fun cancelDownload(context: Context) {
        val downloadId = ModelSettings.getDownloadId(context)
        if (downloadId != -1L) {
            val dm = context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
            dm.remove(downloadId)
            ModelSettings.setDownloadId(context, -1L)
        }
    }
}
