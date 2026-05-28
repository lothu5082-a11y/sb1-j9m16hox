import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Colors, FontSizes, Spacing } from '../constants/theme';

type LogoSize = 'sm' | 'md' | 'lg';

interface RiukaLogoProps {
  size?: LogoSize;
  showTagline?: boolean;
}

const sizeConfig: Record<
  LogoSize,
  { riukaFontSize: number; aiFontSize: number; taglineFontSize: number; glowSize: number }
> = {
  sm: { riukaFontSize: 20, aiFontSize: 11, taglineFontSize: 9, glowSize: 60 },
  md: { riukaFontSize: 32, aiFontSize: 15, taglineFontSize: 11, glowSize: 100 },
  lg: { riukaFontSize: 48, aiFontSize: 22, taglineFontSize: 13, glowSize: 150 },
};

export default function RiukaLogo({ size = 'md', showTagline = false }: RiukaLogoProps) {
  const glowOpacity = useSharedValue(0.35);
  const cfg = sizeConfig[size];

  useEffect(() => {
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.75, { duration: 2000 }),
        withTiming(0.35, { duration: 2000 }),
      ),
      -1,
      false,
    );
  }, []);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <View style={styles.container}>
      {/* Glow halo behind text */}
      <Animated.View
        style={[
          styles.glowHalo,
          {
            width: cfg.glowSize,
            height: cfg.glowSize / 2,
            borderRadius: cfg.glowSize / 2,
          },
          glowStyle,
        ]}
      />

      {/* RIUKA */}
      <Text
        style={[
          styles.riukaText,
          {
            fontSize: cfg.riukaFontSize,
            textShadowRadius: cfg.glowSize * 0.2,
          },
        ]}
      >
        RIUKA
      </Text>

      {/* AI label row */}
      <View style={styles.aiRow}>
        <View style={styles.aiDivider} />
        <Text style={[styles.aiText, { fontSize: cfg.aiFontSize }]}>AI</Text>
        <View style={styles.aiDivider} />
      </View>

      {/* Optional tagline */}
      {showTagline && (
        <Text style={[styles.tagline, { fontSize: cfg.taglineFontSize }]}>
          On-Device · Zero Cloud · Absolute Privacy
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowHalo: {
    position: 'absolute',
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 30,
    elevation: 0,
    top: '10%',
  },
  riukaText: {
    fontFamily: 'Orbitron-Bold',
    color: Colors.primary,
    letterSpacing: 6,
    textShadowColor: Colors.primary,
    textShadowOffset: { width: 0, height: 0 },
    // textShadowRadius set inline from cfg
  },
  aiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: 2,
  },
  aiDivider: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.primaryDark,
    opacity: 0.5,
    maxWidth: 40,
  },
  aiText: {
    fontFamily: 'Orbitron-Bold',
    color: Colors.primaryDark,
    letterSpacing: 4,
    fontWeight: '700',
  },
  tagline: {
    color: Colors.textTertiary,
    letterSpacing: 1.5,
    marginTop: Spacing.sm,
    fontWeight: '300',
  },
});
