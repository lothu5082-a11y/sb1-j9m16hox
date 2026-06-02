/**
 * Vexsora — application entry point.
 * --------------------------------------------------------------------------
 * Composition root for the offline-first assistant. Responsibilities here are
 * intentionally thin: load fonts, install the gesture/safe-area providers,
 * paint the void-black status bar, and mount the terminal UI.
 *
 * Architecture (UI layer is fully decoupled from transport):
 *
 *     App.tsx ──▶ VexsoraTerminal (UI)
 *                      │
 *                      ▼
 *              lib/vexsoraClient  ──▶  http://127.0.0.1:8080/v1/chat/completions
 *
 * The UI never touches `fetch` or endpoint details — it speaks only to the
 * client, which owns all transport + error-boundary concerns.
 */

import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import { Inter_400Regular } from '@expo-google-fonts/inter';
import { Orbitron_700Bold } from '@expo-google-fonts/orbitron';
import { VexsoraColors } from './constants/vexsoraTheme';
import VexsoraTerminal from './components/VexsoraTerminal';

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Orbitron-Bold': Orbitron_700Bold,
  });

  if (!fontsLoaded && !fontError) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={VexsoraColors.violet} size="large" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <View style={styles.flex}>
          <VexsoraTerminal />
          <StatusBar style="light" backgroundColor={VexsoraColors.void} />
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: VexsoraColors.void },
  boot: {
    flex: 1,
    backgroundColor: VexsoraColors.void,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
