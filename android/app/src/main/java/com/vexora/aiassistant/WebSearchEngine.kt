package com.vexora.aiassistant

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.net.URLEncoder
import java.util.concurrent.TimeUnit

object WebSearchEngine {

    private val client = OkHttpClient.Builder()
        .connectTimeout(8, TimeUnit.SECONDS)
        .readTimeout(10, TimeUnit.SECONDS)
        .build()

    // ── Connectivity ──────────────────────────────────────────────────────────

    fun isOnline(context: Context): Boolean {
        val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val caps = cm.getNetworkCapabilities(cm.activeNetwork ?: return false) ?: return false
        return caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
               caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
    }

    // ── Decide whether this query is worth searching the web ──────────────────

    fun shouldSearch(input: String): Boolean {
        val lo = input.lowercase().trim()

        // Device commands — handled locally, no search needed
        val local = listOf("flashlight", "torch", "volume", "brightness", "battery",
            "camera", "open ", "launch ", "start app", "turn on", "turn off",
            "play music", "mute", "unmute", "wifi", "bluetooth")
        if (local.any { lo.contains(it) }) return false

        // Casual/emotional chat — VexoraEngine handles these well already
        val casual = listOf("joke", "riddle", "motivate", "feeling sad", "i am sad",
            "i'm sad", "i am happy", "i'm happy", "bored", "poem", "rap ", "story",
            "tell me a story", "how are you", "who are you", "what can you do",
            "thank", "sorry", "love you", "shut up", "good morning", "good night")
        if (casual.any { lo.contains(it) }) return false

        // Trigger on factual / informational query patterns
        val factual = listOf("what is", "what are", "what was", "what were", "who is",
            "who was", "who are", "where is", "where was", "when did", "when was",
            "how does", "how do", "how did", "how many", "how much", "why is",
            "why did", "explain ", "tell me about", "describe ", "define ",
            "news ", "latest ", "current ", "today's", "price of", "cost of",
            "weather in", "temperature in", "population of", "capital of",
            "president of", "pm of", "ceo of", "founded", "invented")
        if (factual.any { lo.contains(it) }) return true

        // Short question ending with "?"
        if (lo.trimEnd().endsWith("?") && lo.split(" ").size in 2..15) return true

        // Longer statements that read like information requests (5+ words, not casual)
        return lo.split(" ").size >= 6
    }

    // ── Main entry point ──────────────────────────────────────────────────────

    fun search(query: String): String? =
        tryDuckDuckGo(query) ?: tryWikipedia(cleanForWiki(query))

    // ── DuckDuckGo Instant Answer API (free, no key) ─────────────────────────

    private fun tryDuckDuckGo(query: String): String? {
        return try {
            val encoded = URLEncoder.encode(query.trim(), "UTF-8")
            val req = Request.Builder()
                .url("https://api.duckduckgo.com/?q=$encoded&format=json&no_html=1&skip_disambig=1&t=vexoraai")
                .header("User-Agent", "VexoraAI/6.0 Android")
                .get()
                .build()
            val body = client.newCall(req).execute().use { resp ->
                if (!resp.isSuccessful) return null
                resp.body?.string() ?: return null
            }
            val json = JSONObject(body)

            // 1. Direct answer (unit conversions, calculations, simple facts)
            val answer = json.optString("Answer", "").trim()
            if (answer.length > 5) return "🌐 $answer"

            // 2. Wikipedia abstract (best for people, places, concepts)
            val abstract = json.optString("AbstractText", "").trim()
            if (abstract.length > 40) {
                val source = json.optString("AbstractSource", "").trim()
                val text = if (abstract.length > 700) abstract.take(700).trimEnd(',', ' ') + "…" else abstract
                return if (source.isNotEmpty()) "🌐 $text\n\n*(via $source)*" else "🌐 $text"
            }

            // 3. Dictionary definition
            val def = json.optString("Definition", "").trim()
            if (def.length > 15) return "🌐 $def"

            null
        } catch (_: Exception) { null }
    }

    // ── Wikipedia Summary API (free, no key) ─────────────────────────────────

    private fun tryWikipedia(title: String): String? {
        if (title.isBlank()) return null
        return try {
            val encoded = URLEncoder.encode(title, "UTF-8")
            val req = Request.Builder()
                .url("https://en.wikipedia.org/api/rest_v1/page/summary/$encoded")
                .header("User-Agent", "VexoraAI/6.0 (android; contact: support@vexora.app)")
                .get()
                .build()
            val body = client.newCall(req).execute().use { resp ->
                if (!resp.isSuccessful) return null
                resp.body?.string() ?: return null
            }
            val json = JSONObject(body)
            if (json.optString("type") == "disambiguation") return null
            val extract = json.optString("extract", "").trim()
            if (extract.length < 50) return null
            val pageTitle = json.optString("title", title)
            val text = if (extract.length > 700) extract.take(700).trimEnd('.', ' ') + "…" else extract
            "🌐 **$pageTitle**: $text\n\n*(Wikipedia)*"
        } catch (_: Exception) { null }
    }

    // ── Strip question words so Wikipedia finds the right article ─────────────

    private fun cleanForWiki(query: String): String =
        query.trim()
            .replace(Regex(
                """^(what is |what are |who is |who was |who are |explain |tell me about |define |describe |how does |how do )""",
                RegexOption.IGNORE_CASE), "")
            .trim()
            .trimEnd('?', '!')
}
