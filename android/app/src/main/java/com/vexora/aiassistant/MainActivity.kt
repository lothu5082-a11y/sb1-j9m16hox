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
import com.vexora.aiassistant.databinding.ActivityMainBinding
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding

    private val cameraPermissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            if (granted) launchCamera() else showToast("Camera permission denied.")
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        appendToChat("Vexora AI: Hey! I'm Vexora — your private offline AI assistant. I'm ready to chat, answer questions, do math, tell jokes, and more. How can I help you today?")

        binding.btnSend.setOnClickListener {
            val text = binding.etInput.text.toString().trim()
            if (text.isBlank()) return@setOnClickListener
            binding.etInput.setText("")
            handleInput(text)
        }
    }

    private fun handleInput(userInput: String) {
        appendToChat("You: $userInput")
        setUiBusy(true)

        lifecycleScope.launch(Dispatchers.Default) {
            val reply = VexoraEngine.respond(userInput)
            withContext(Dispatchers.Main) {
                setUiBusy(false)
                appendToChat("Vexora AI: $reply")
                parseAndExecuteActions(reply)
            }
        }
    }

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

    private fun appendToChat(text: String) {
        val cur = binding.tvResponse.text.toString()
        binding.tvResponse.text = if (cur.isBlank()) text else "$cur\n\n$text"
        binding.scrollView.post { binding.scrollView.fullScroll(View.FOCUS_DOWN) }
    }

    private fun setUiBusy(busy: Boolean) {
        binding.btnSend.isEnabled = !busy
        binding.etInput.isEnabled = !busy
        binding.tvStatus.visibility = if (busy) View.VISIBLE else View.GONE
    }

    private fun showToast(msg: String) = Toast.makeText(this, msg, Toast.LENGTH_SHORT).show()
}
