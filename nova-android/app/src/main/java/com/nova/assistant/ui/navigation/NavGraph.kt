package com.nova.assistant.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.nova.assistant.NovaApp
import com.nova.assistant.ui.chat.ChatScreen
import com.nova.assistant.ui.chat.ChatViewModelFactory
import com.nova.assistant.ui.settings.SettingsScreen
import com.nova.assistant.ui.settings.SettingsViewModelFactory

object Routes {
    const val CHAT = "chat"
    const val SETTINGS = "settings"
}

@Composable
fun NavGraph() {
    val navController = rememberNavController()
    val app = LocalContext.current.applicationContext as NovaApp

    NavHost(navController = navController, startDestination = Routes.CHAT) {
        composable(Routes.CHAT) {
            val vm = viewModel(factory = ChatViewModelFactory(app.chatRepository, app.settingsRepository))
            ChatScreen(
                viewModel = vm,
                onOpenSettings = { navController.navigate(Routes.SETTINGS) }
            )
        }
        composable(Routes.SETTINGS) {
            val vm = viewModel(factory = SettingsViewModelFactory(app.settingsRepository))
            SettingsScreen(
                viewModel = vm,
                onBack = { navController.popBackStack() }
            )
        }
    }
}
