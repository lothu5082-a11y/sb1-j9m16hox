import { useEffect } from 'react';
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
import { View, ActivityIndicator, StyleSheet, Alert, NativeModules, Platform } from 'react-native';
import { Colors } from '../constants/theme';
import { memoryService } from '../lib/memoryService';
import { knowledgeBase } from '../lib/knowledgeBase';
import { batteryMonitor } from '../lib/batteryMonitor';

export default function RootLayout() {
  useFrameworkReady();

  // Catch any unhandled JS crash and show it on-screen so we can read the error
  useEffect(() => {
    const prev = ErrorUtils.getGlobalHandler();
    ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
      if (isFatal) {
        Alert.alert(
          'Crash — copy this',
          (error?.message ?? 'unknown') + '\n\n' + (error?.stack ?? '').slice(0, 600),
          [{ text: 'OK' }]
        );
      }
      prev?.(error, isFatal);
    });
  }, []);

  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
    'Orbitron-Regular': Orbitron_400Regular,
    'Orbitron-Bold': Orbitron_700Bold,
  });

  // Check if the previous app process left a Java crash report
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const HW = NativeModules.VexsoraHardware;
    if (!HW?.getDiagnosticInfo) return;
    HW.getDiagnosticInfo()
      .then((info: string | null) => {
        if (info) {
          Alert.alert(
            'Previous crash info',
            info,
            [{ text: 'OK' }]
          );
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    // Boot all persistent services
    const init = async () => {
      await memoryService.init();
      await knowledgeBase.load();
      batteryMonitor.start(() => {});
    };
    init();
    return () => { batteryMonitor.stop(); };
  }, []);

  if (!fontsLoaded && !fontError) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="light" backgroundColor={Colors.background} />
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
