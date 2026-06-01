package com.vexora.aiassistant

import android.content.Intent
import android.service.quicksettings.Tile
import android.service.quicksettings.TileService

class VexoraTile : TileService() {

    override fun onTileAdded() = refresh()
    override fun onStartListening() = refresh()

    override fun onClick() {
        if (!VexoraService.isRunning) {
            startForegroundService(Intent(this, VexoraService::class.java))
            VexoraService.wakeWordEnabled = true
        } else if (VexoraService.wakeWordEnabled) {
            sendBroadcast(Intent(VexoraService.ACTION_STOP_WAKE))
        } else {
            sendBroadcast(Intent(VexoraService.ACTION_START_WAKE))
        }
        refresh()
    }

    private fun refresh() {
        qsTile?.apply {
            state = when {
                VexoraService.isRunning && VexoraService.wakeWordEnabled -> Tile.STATE_ACTIVE
                VexoraService.isRunning -> Tile.STATE_INACTIVE
                else -> Tile.STATE_UNAVAILABLE
            }
            label = "Vexora AI"
            subtitle = when {
                VexoraService.wakeWordEnabled -> "Listening"
                VexoraService.isRunning -> "Standby"
                else -> "Off"
            }
            updateTile()
        }
    }
}
