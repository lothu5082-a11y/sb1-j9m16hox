package com.nova.assistant.ai

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.File
import java.util.concurrent.TimeUnit

class ModelDownloader {

    private val http = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(0, TimeUnit.SECONDS) // no timeout for large downloads
        .build()

    suspend fun download(
        url: String,
        destFile: File,
        onProgress: (percent: Int) -> Unit
    ) = withContext(Dispatchers.IO) {
        val request = Request.Builder().url(url).build()
        val response = http.newCall(request).execute()
        if (!response.isSuccessful) {
            throw Exception("HTTP ${response.code}: ${response.message}")
        }
        val body = response.body ?: throw Exception("Empty response body")
        val total = body.contentLength()

        destFile.parentFile?.mkdirs()
        destFile.outputStream().use { out ->
            body.byteStream().use { src ->
                val buf = ByteArray(8 * 1024)
                var downloaded = 0L
                var read: Int
                while (src.read(buf).also { read = it } != -1) {
                    out.write(buf, 0, read)
                    downloaded += read
                    if (total > 0) {
                        onProgress(((downloaded * 100) / total).toInt())
                    }
                }
            }
        }
    }
}
