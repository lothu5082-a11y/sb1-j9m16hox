package com.vexora.aiassistant

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.provider.MediaStore
import android.provider.Settings
import android.view.View
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.MobileAds
import com.vexora.aiassistant.databinding.ActivityMainBinding
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.text.SimpleDateFormat
import java.util.*

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private lateinit var adapter: ChatAdapter
    private val messages = mutableListOf<ChatMessage>()

    private val cameraPermissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            if (granted) launchCamera() else showToast("Camera permission denied.")
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        MobileAds.initialize(this)
        binding.adView.loadAd(AdRequest.Builder().build())

        setupChat()

        binding.btnSend.setOnClickListener {
            val text = binding.etInput.text.toString().trim()
            if (text.isBlank()) return@setOnClickListener
            binding.etInput.setText("")
            handleInput(text)
        }
    }

    private fun setupChat() {
        adapter = ChatAdapter(messages)
        binding.recyclerView.layoutManager = LinearLayoutManager(this).apply { stackFromEnd = true }
        binding.recyclerView.adapter = adapter
        addAiMessage("Hey! I'm Vexora — your private, fully offline AI assistant. Ask me anything: science, math, jokes, business tips, how to make money, life advice and more! 😊")
    }

    private fun handleInput(userInput: String) {
        addUserMessage(userInput)
        setUiBusy(true)

        lifecycleScope.launch(Dispatchers.Default) {
            val reply = VexoraEngine.respond(userInput)
            withContext(Dispatchers.Main) {
                setUiBusy(false)
                addAiMessage(reply)
                parseAndExecuteActions(reply)
            }
        }
    }

    private fun addAiMessage(text: String) {
        adapter.addMessage(ChatMessage(text, false, nowTime()))
        scrollBottom()
    }

    private fun addUserMessage(text: String) {
        adapter.addMessage(ChatMessage(text, true, nowTime()))
        scrollBottom()
    }

    private fun scrollBottom() = binding.recyclerView.post {
        binding.recyclerView.scrollToPosition(adapter.itemCount - 1)
    }

    private fun nowTime() = SimpleDateFormat("h:mm a", Locale.getDefault()).format(Date())

    // ── Action parser ────────────────────────────────────────────────────────

    private fun parseAndExecuteActions(response: String) {
        if (response.contains("[ACTION: CAMERA]"))   handleCameraAction()
        if (response.contains("[ACTION: SETTINGS]")) startActivity(Intent(Settings.ACTION_SETTINGS))
    }

    private fun handleCameraAction() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
            == PackageManager.PERMISSION_GRANTED) launchCamera()
        else cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
    }

    private fun launchCamera() {
        val i = Intent(MediaStore.ACTION_IMAGE_CAPTURE)
        if (i.resolveActivity(packageManager) != null) startActivity(i)
        else showToast("No camera app found.")
    }

    // ── UI helpers ───────────────────────────────────────────────────────────

    private fun setUiBusy(busy: Boolean) {
        binding.btnSend.isEnabled = !busy
        binding.etInput.isEnabled = !busy
        binding.tvStatus.visibility = if (busy) View.VISIBLE else View.GONE
    }

    private fun showToast(msg: String) = Toast.makeText(this, msg, Toast.LENGTH_SHORT).show()
}
