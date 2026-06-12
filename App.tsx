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

import React, { useState } from 'react';
import { View, ActivityIndicator, StyleSheet, TouchableOpacity, Text, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import { Inter_400Regular } from '@expo-google-fonts/inter';
import { Orbitron_700Bold } from '@expo-google-fonts/orbitron';
import { VexsoraColors } from './constants/vexsoraTheme';
import VexsoraTerminal from './components/VexsoraTerminal';
import NexusBreach from './components/NexusBreach';

type AppMode = 'terminal' | 'game';

const MONO: string =
  Platform.OS === 'ios' ? 'Menlo' :
  Platform.OS === 'android' ? 'monospace' : 'monospace';

export default function App() {
  const [mode, setMode] = useState<AppMode>('terminal');

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
          {mode === 'terminal' ? (
            <>
              <VexsoraTerminal />
              {/* Game launcher button */}
              <TouchableOpacity
                style={styles.gameBtn}
                onPress={() => setMode('game')}
                activeOpacity={0.8}
              >
                <Text style={styles.gameBtnText}>⚡ GAME</Text>
              </TouchableOpacity>
            </>
          ) : (
            <NexusBreach onExit={() => setMode('terminal')} />
          )}
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
  gameBtn: {
    position: 'absolute',
    bottom: 88,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: VexsoraColors.violet,
    borderRadius: 20,
    backgroundColor: '#1a0033',
  },
  gameBtnText: {
    fontFamily: MONO,
    fontSize: 11,
    color: VexsoraColors.violet,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
