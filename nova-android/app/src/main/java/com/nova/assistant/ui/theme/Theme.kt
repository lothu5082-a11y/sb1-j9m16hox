package com.nova.assistant.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable

private val DarkColors = darkColorScheme(
    primary = Purple80,
    secondary = PurpleGrey80,
    tertiary = Teal80,
    background = BackgroundDark,
    surface = SurfaceDark,
    onPrimary = OnUserBubble,
    onBackground = OnAssistantBubble,
    onSurface = OnAssistantBubble
)

@Composable
fun NovaTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = DarkColors,
        typography = Typography,
        content = content
    )
}
