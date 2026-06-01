package com.vexora.aiassistant

import android.content.Context

object ModelSettings {

    private const val PREFS = "vexora_model_prefs"

    enum class Provider(val displayName: String) {
        BUILTIN("Built-in AI"),
        GEMINI("Google Gemini"),
        OPENAI("OpenAI GPT"),
        CLAUDE("Anthropic Claude"),
        LOCAL_GEMMA("Gemma 2B (Local)")
    }

    private fun prefs(ctx: Context) = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun getProvider(ctx: Context): Provider =
        runCatching {
            Provider.valueOf(prefs(ctx).getString("provider", Provider.BUILTIN.name)!!)
        }.getOrDefault(Provider.BUILTIN)

    fun setProvider(ctx: Context, p: Provider) =
        prefs(ctx).edit().putString("provider", p.name).apply()

    fun getKey(ctx: Context, p: Provider): String =
        prefs(ctx).getString("key_${p.name}", "") ?: ""

    fun setKey(ctx: Context, p: Provider, key: String) =
        prefs(ctx).edit().putString("key_${p.name}", key.trim()).apply()

    fun hasKey(ctx: Context, p: Provider) = getKey(ctx, p).isNotEmpty()

    fun getDownloadId(ctx: Context): Long =
        prefs(ctx).getLong("download_id", -1L)

    fun setDownloadId(ctx: Context, id: Long) =
        prefs(ctx).edit().putLong("download_id", id).apply()
}
