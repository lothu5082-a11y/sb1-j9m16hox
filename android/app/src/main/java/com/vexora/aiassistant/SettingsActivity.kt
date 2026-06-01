package com.vexora.aiassistant

import android.app.AlertDialog
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.LayoutInflater
import android.view.View
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import com.vexora.aiassistant.databinding.ActivitySettingsBinding

class SettingsActivity : AppCompatActivity() {

    private lateinit var binding: ActivitySettingsBinding
    private val handler = Handler(Looper.getMainLooper())
    private var progressRunnable: Runnable? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivitySettingsBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.btnBack.setOnClickListener { finish() }

        renderCards()
    }

    override fun onDestroy() {
        super.onDestroy()
        progressRunnable?.let { handler.removeCallbacks(it) }
    }

    private fun renderCards() {
        val container = binding.cardContainer
        container.removeAllViews()

        // ── Built-in card ──────────────────────────────────────────────────────
        addSimpleCard(
            container,
            provider = ModelSettings.Provider.BUILTIN,
            description = "Offline rule-based engine. No internet or API key required.",
            hasKey = false
        )

        // ── Gemma 2B local card ────────────────────────────────────────────────
        addGemmaCard(container)

        // ── Cloud API cards ────────────────────────────────────────────────────
        addApiKeyCard(
            container,
            provider = ModelSettings.Provider.GEMINI,
            description = "Google Gemini 1.5 Flash · Free tier available",
            hint = "AIza…"
        )
        addApiKeyCard(
            container,
            provider = ModelSettings.Provider.OPENAI,
            description = "OpenAI GPT-3.5-turbo · Pay-per-use",
            hint = "sk-…"
        )
        addApiKeyCard(
            container,
            provider = ModelSettings.Provider.CLAUDE,
            description = "Anthropic Claude Haiku · Fast & affordable",
            hint = "sk-ant-…"
        )
    }

    private fun addSimpleCard(
        container: LinearLayout,
        provider: ModelSettings.Provider,
        description: String,
        hasKey: Boolean
    ) {
        val card = LayoutInflater.from(this).inflate(R.layout.item_model_card, container, false)
        card.findViewById<TextView>(R.id.tvProviderName).text = provider.displayName
        card.findViewById<TextView>(R.id.tvProviderDesc).text = description
        card.findViewById<View>(R.id.keySection).visibility = if (hasKey) View.VISIBLE else View.GONE

        val activeProvider = ModelSettings.getProvider(this)
        styleActive(card, activeProvider == provider)

        card.setOnClickListener {
            ModelSettings.setProvider(this, provider)
            renderCards()
            toast("Switched to ${provider.displayName}")
        }
        container.addView(card)
    }

    private fun addApiKeyCard(
        container: LinearLayout,
        provider: ModelSettings.Provider,
        description: String,
        hint: String
    ) {
        val card = LayoutInflater.from(this).inflate(R.layout.item_model_card, container, false)
        card.findViewById<TextView>(R.id.tvProviderName).text = provider.displayName
        card.findViewById<TextView>(R.id.tvProviderDesc).text = description

        val keySection = card.findViewById<View>(R.id.keySection)
        val etKey = card.findViewById<EditText>(R.id.etApiKey)
        val btnSave = card.findViewById<Button>(R.id.btnSaveKey)

        keySection.visibility = View.VISIBLE
        etKey.hint = hint
        val existing = ModelSettings.getKey(this, provider)
        if (existing.isNotEmpty()) {
            etKey.setText(existing.take(8) + "…")
        }

        val activeProvider = ModelSettings.getProvider(this)
        styleActive(card, activeProvider == provider)

        btnSave.setOnClickListener {
            val rawText = etKey.text.toString().trim()
            val key = if (rawText.endsWith("…")) existing else rawText
            if (key.isBlank()) { toast("Enter your API key first"); return@setOnClickListener }
            ModelSettings.setKey(this, provider, key)
            ModelSettings.setProvider(this, provider)
            renderCards()
            toast("${provider.displayName} activated!")
        }

        card.setOnClickListener {
            if (activeProvider != provider) {
                if (ModelSettings.hasKey(this, provider)) {
                    ModelSettings.setProvider(this, provider)
                    renderCards()
                    toast("Switched to ${provider.displayName}")
                } else {
                    etKey.requestFocus()
                    toast("Enter your API key first")
                }
            }
        }

        container.addView(card)
    }

    private fun addGemmaCard(container: LinearLayout) {
        val card = LayoutInflater.from(this).inflate(R.layout.item_model_card, container, false)
        val provider = ModelSettings.Provider.LOCAL_GEMMA
        card.findViewById<TextView>(R.id.tvProviderName).text = provider.displayName
        card.findViewById<TextView>(R.id.tvProviderDesc).text =
            "Runs fully offline on your device. ~1.5 GB download required."

        card.findViewById<View>(R.id.keySection).visibility = View.GONE

        val downloadSection = card.findViewById<View>(R.id.downloadSection)
        val btnDownload = card.findViewById<Button>(R.id.btnDownload)
        val progressBar = card.findViewById<ProgressBar>(R.id.downloadProgress)
        val tvProgress = card.findViewById<TextView>(R.id.tvDownloadProgress)
        downloadSection.visibility = View.VISIBLE

        val activeProvider = ModelSettings.getProvider(this)
        styleActive(card, activeProvider == provider)

        val modelExists = LlmEngine.findModel(this) != null

        fun refreshDownloadUi() {
            when {
                modelExists -> {
                    btnDownload.text = "✓ Model Ready"
                    btnDownload.isEnabled = false
                    progressBar.visibility = View.GONE
                    tvProgress.visibility = View.GONE
                }
                ModelDownloadManager.isDownloading(this) -> {
                    btnDownload.text = "Cancel"
                    progressBar.visibility = View.VISIBLE
                    tvProgress.visibility = View.VISIBLE
                    val pct = ModelDownloadManager.getProgress(this)
                    if (pct >= 0) {
                        progressBar.progress = pct
                        tvProgress.text = "$pct%"
                    }
                }
                else -> {
                    btnDownload.text = "Download Model (~1.5 GB)"
                    btnDownload.isEnabled = true
                    progressBar.visibility = View.GONE
                    tvProgress.visibility = View.GONE
                }
            }
        }
        refreshDownloadUi()

        btnDownload.setOnClickListener {
            if (ModelDownloadManager.isDownloading(this)) {
                AlertDialog.Builder(this)
                    .setTitle("Cancel Download?")
                    .setMessage("Cancel the Gemma model download?")
                    .setPositiveButton("Yes") { _, _ ->
                        ModelDownloadManager.cancelDownload(this)
                        refreshDownloadUi()
                    }
                    .setNegativeButton("No", null)
                    .show()
            } else {
                btnDownload.isEnabled = false
                btnDownload.text = "Starting…"
                progressBar.visibility = View.VISIBLE
                tvProgress.visibility = View.VISIBLE

                ModelDownloadManager.startDownload(this) { success ->
                    runOnUiThread {
                        if (success) {
                            progressRunnable?.let { handler.removeCallbacks(it) }
                            toast("✓ Model downloaded! Tap to activate.")
                            renderCards()
                        } else {
                            toast("Download failed. Check your internet connection.")
                            refreshDownloadUi()
                        }
                    }
                }

                progressRunnable = object : Runnable {
                    override fun run() {
                        val pct = ModelDownloadManager.getProgress(this@SettingsActivity)
                        if (pct >= 0) {
                            progressBar.progress = pct
                            tvProgress.text = "$pct%"
                        }
                        if (ModelDownloadManager.isDownloading(this@SettingsActivity)) {
                            handler.postDelayed(this, 1000)
                        }
                    }
                }
                handler.postDelayed(progressRunnable!!, 1000)
            }
        }

        card.setOnClickListener {
            if (modelExists && activeProvider != provider) {
                ModelSettings.setProvider(this, provider)
                renderCards()
                toast("Switched to ${provider.displayName}")
            }
        }

        container.addView(card)
    }

    private fun styleActive(card: View, active: Boolean) {
        card.alpha = if (active) 1f else 0.72f
        val badge = card.findViewById<TextView>(R.id.tvActiveBadge)
        badge.visibility = if (active) View.VISIBLE else View.GONE
    }

    private fun toast(msg: String) = Toast.makeText(this, msg, Toast.LENGTH_SHORT).show()
}
