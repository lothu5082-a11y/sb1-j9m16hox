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

        addAutoCard(container)
        addBuiltinCard(container)
        addGemmaCard(container)
        addApiKeyCard(container, ModelSettings.Provider.GEMINI,
            "Google Gemini 1.5 Flash · FREE tier — no cost to start",
            "AIza…")
        addApiKeyCard(container, ModelSettings.Provider.OPENAI,
            "OpenAI GPT-3.5-turbo · Pay-per-use (low cost)",
            "sk-…")
        addApiKeyCard(container, ModelSettings.Provider.CLAUDE,
            "Anthropic Claude Haiku · Fast & very affordable",
            "sk-ant-…")
    }

    // ── Smart Auto card ────────────────────────────────────────────────────────

    private fun addAutoCard(container: LinearLayout) {
        val card = inflate(container)
        val provider = ModelSettings.Provider.AUTO
        card.findViewById<TextView>(R.id.tvProviderName).text = provider.displayName
        card.findViewById<TextView>(R.id.tvProviderDesc).text =
            "Recommended — Uses Gemini (if you added a key) when online, " +
            "web search for facts, and built-in AI offline. Fully automatic."
        card.findViewById<View>(R.id.keySection).visibility = View.GONE
        card.findViewById<View>(R.id.downloadSection).visibility = View.GONE
        styleActive(card, ModelSettings.getProvider(this) == provider)
        card.setOnClickListener {
            ModelSettings.setProvider(this, provider)
            renderCards()
            toast("Smart Auto Mode activated! ✨")
        }
        container.addView(card)
    }

    // ── Built-in card ──────────────────────────────────────────────────────────

    private fun addBuiltinCard(container: LinearLayout) {
        val card = inflate(container)
        val provider = ModelSettings.Provider.BUILTIN
        card.findViewById<TextView>(R.id.tvProviderName).text = provider.displayName
        card.findViewById<TextView>(R.id.tvProviderDesc).text =
            "Works offline, no internet or key required. Covers science, math, jokes, advice & more."
        card.findViewById<View>(R.id.keySection).visibility = View.GONE
        card.findViewById<View>(R.id.downloadSection).visibility = View.GONE
        styleActive(card, ModelSettings.getProvider(this) == provider)
        card.setOnClickListener {
            ModelSettings.setProvider(this, provider)
            renderCards()
            toast("Switched to ${provider.displayName}")
        }
        container.addView(card)
    }

    // ── Gemma local card ───────────────────────────────────────────────────────

    private fun addGemmaCard(container: LinearLayout) {
        val card = inflate(container)
        val provider = ModelSettings.Provider.LOCAL_GEMMA
        card.findViewById<TextView>(R.id.tvProviderName).text = provider.displayName
        card.findViewById<View>(R.id.keySection).visibility = View.GONE
        val dlSection = card.findViewById<View>(R.id.downloadSection)
        val btnDownload = card.findViewById<Button>(R.id.btnDownload)
        val progressBar = card.findViewById<ProgressBar>(R.id.downloadProgress)
        val tvProgress = card.findViewById<TextView>(R.id.tvDownloadProgress)
        dlSection.visibility = View.VISIBLE

        val active = ModelSettings.getProvider(this) == provider
        styleActive(card, active)

        val modelExists = LlmEngine.findModel(this) != null

        if (modelExists) {
            card.findViewById<TextView>(R.id.tvProviderDesc).text =
                "✓ Model installed — runs 100% offline on your device."
            btnDownload.text = "✓ Model Ready"
            btnDownload.isEnabled = false
            progressBar.visibility = View.GONE
            tvProgress.visibility = View.GONE
            card.setOnClickListener {
                if (!active) { ModelSettings.setProvider(this, provider); renderCards() }
            }
        } else {
            card.findViewById<TextView>(R.id.tvProviderDesc).text =
                "Runs 100% offline. Requires a free ~1.5 GB model file from Kaggle."
            updateGemmaButton(btnDownload, progressBar, tvProgress)

            btnDownload.setOnClickListener {
                when (btnDownload.text) {
                    "Cancel" -> {
                        AlertDialog.Builder(this)
                            .setTitle("Cancel Download?")
                            .setMessage("Stop downloading the Gemma model?")
                            .setPositiveButton("Yes") { _, _ ->
                                progressRunnable?.let { handler.removeCallbacks(it) }
                                ModelDownloadManager.cancelDownload(this)
                                renderCards()
                            }
                            .setNegativeButton("No", null).show()
                    }
                    "📋 How to Install" -> showGemmaGuide()
                    else -> startGemmaDownload(btnDownload, progressBar, tvProgress)
                }
            }
        }
        container.addView(card)
    }

    private fun updateGemmaButton(btn: Button, pb: ProgressBar, tv: TextView) {
        when {
            ModelDownloadManager.isDownloading(this) -> {
                btn.text = "Cancel"
                pb.visibility = View.VISIBLE
                tv.visibility = View.VISIBLE
                val pct = ModelDownloadManager.getProgress(this)
                if (pct >= 0) { pb.progress = pct; tv.text = "$pct%" }
            }
            else -> {
                btn.text = "⬇️ Auto-Download (~1.5 GB)"
                btn.isEnabled = true
                pb.visibility = View.GONE
                tv.visibility = View.GONE
            }
        }
    }

    private fun startGemmaDownload(btn: Button, pb: ProgressBar, tv: TextView) {
        btn.isEnabled = false
        btn.text = "Starting…"
        pb.visibility = View.VISIBLE
        tv.visibility = View.VISIBLE
        tv.text = "0%"

        ModelDownloadManager.startDownload(this) { success ->
            runOnUiThread {
                progressRunnable?.let { handler.removeCallbacks(it) }
                if (success) {
                    toast("✓ Model downloaded! Tap the card to activate Gemma.")
                    renderCards()
                } else {
                    ModelSettings.setDownloadId(this, -1L)
                    toast("Download failed — try the manual install guide.")
                    btn.text = "📋 How to Install"
                    btn.isEnabled = true
                    pb.visibility = View.GONE
                    tv.visibility = View.GONE
                }
            }
        }

        progressRunnable = object : Runnable {
            override fun run() {
                val pct = ModelDownloadManager.getProgress(this@SettingsActivity)
                if (pct >= 0) { pb.progress = pct; tv.text = "$pct%" }
                if (ModelDownloadManager.isDownloading(this@SettingsActivity))
                    handler.postDelayed(this, 1000)
            }
        }
        handler.postDelayed(progressRunnable!!, 1500)
    }

    private fun showGemmaGuide() {
        AlertDialog.Builder(this)
            .setTitle("How to Install Gemma 2B")
            .setMessage(
                "1. Open kaggle.com on your phone (free account needed)\n\n" +
                "2. Search for:\n" +
                "   'google/gemma/tfLite/gemma-2b-it-gpu-int4'\n\n" +
                "3. Download the file:\n" +
                "   gemma-2b-it-gpu-int4.bin\n\n" +
                "4. Move that file to:\n" +
                "   Android/data/com.vexora.aiassistant/files/\n" +
                "   (use your Files app)\n\n" +
                "5. Come back here and tap the Gemma card to activate!\n\n" +
                "Tip: Do this over Wi-Fi — the file is ~1.5 GB."
            )
            .setPositiveButton("Got it!") { _, _ -> renderCards() }
            .setNeutralButton("Try Auto-Download") { _, _ ->
                renderCards()
            }
            .show()
    }

    // ── API key cards ──────────────────────────────────────────────────────────

    private fun addApiKeyCard(
        container: LinearLayout,
        provider: ModelSettings.Provider,
        description: String,
        hint: String
    ) {
        val card = inflate(container)
        card.findViewById<TextView>(R.id.tvProviderName).text = provider.displayName
        card.findViewById<TextView>(R.id.tvProviderDesc).text = description
        card.findViewById<View>(R.id.downloadSection).visibility = View.GONE

        val keySection = card.findViewById<View>(R.id.keySection)
        val etKey = card.findViewById<EditText>(R.id.etApiKey)
        val btnSave = card.findViewById<Button>(R.id.btnSaveKey)
        keySection.visibility = View.VISIBLE
        etKey.hint = hint

        val existing = ModelSettings.getKey(this, provider)
        if (existing.isNotEmpty()) etKey.setText(existing.take(8) + "…")

        val active = ModelSettings.getProvider(this) == provider
        styleActive(card, active)

        btnSave.setOnClickListener {
            val raw = etKey.text.toString().trim()
            val key = if (raw.endsWith("…")) existing else raw
            if (key.isBlank()) { toast("Paste your API key first"); return@setOnClickListener }
            ModelSettings.setKey(this, provider, key)
            ModelSettings.setProvider(this, provider)
            renderCards()
            toast("${provider.displayName} activated! ✓")
        }

        card.setOnClickListener {
            if (!active && ModelSettings.hasKey(this, provider)) {
                ModelSettings.setProvider(this, provider)
                renderCards()
                toast("Switched to ${provider.displayName}")
            }
        }
        container.addView(card)
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private fun inflate(parent: LinearLayout): View =
        LayoutInflater.from(this).inflate(R.layout.item_model_card, parent, false)

    private fun styleActive(card: View, active: Boolean) {
        card.alpha = if (active) 1f else 0.72f
        card.findViewById<TextView>(R.id.tvActiveBadge).visibility =
            if (active) View.VISIBLE else View.GONE
    }

    private fun toast(msg: String) = Toast.makeText(this, msg, Toast.LENGTH_SHORT).show()
}
