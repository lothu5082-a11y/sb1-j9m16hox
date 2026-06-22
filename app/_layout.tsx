import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useFonts } from 'expo-font';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { Orbitron_400Regular, Orbitron_700Bold } from '@expo-google-fonts/orbitron';
import { View, Text, ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import { Colors } from '../constants/theme';

// expo-router renders this whenever a screen throws during render, instead of
// the app silently closing. It shows the real error so problems are visible.
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => Promise<void> }) {
  return (
    <View style={styles.errorContainer}>
      <ScrollView contentContainerStyle={styles.errorScroll}>
        <Text style={styles.errorTitle}>Vexsora hit an error</Text>
        <Text style={styles.errorMsg}>{error?.message ?? 'Unknown error'}</Text>
        {!!error?.stack && <Text style={styles.errorStack}>{error.stack}</Text>}
        <Text style={styles.errorHint} onPress={() => { retry().catch(() => {}); }}>
          Tap here to retry
        </Text>
      </ScrollView>
    </View>
  );
}

export default function RootLayout() {
  useFrameworkReady();

  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
    'Orbitron-Regular': Orbitron_400Regular,
    'Orbitron-Bold': Orbitron_700Bold,
  });

  if (!fontsLoaded && !fontError) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="premium" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="light" />
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: 60,
  },
  errorScroll: {
    padding: 24,
  },
  errorTitle: {
    color: '#EF4444',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
  },
  errorMsg: {
    color: '#FFFFFF',
    fontSize: 15,
    marginBottom: 16,
    lineHeight: 22,
  },
  errorStack: {
    color: '#94A3B8',
    fontSize: 11,
    fontFamily: 'monospace',
    marginBottom: 24,
  },
  errorHint: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});
