import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, FontSizes, BorderRadius } from '../constants/theme';

const QUICK_ACTIONS = [
  { emoji: '🧑‍💻', label: 'Code', prompt: 'Help me with coding — I need ' },
  { emoji: '📚', label: 'Study', prompt: 'Explain this concept to me: ' },
  { emoji: '✍️', label: 'Write', prompt: 'Help me write: ' },
  { emoji: '🌍', label: 'Translate', prompt: 'Translate this to English: ' },
  { emoji: '🎨', label: 'Create', prompt: 'Help me brainstorm ideas for ' },
  { emoji: '🧮', label: 'Math', prompt: 'Solve this math problem: ' },
  { emoji: '🔍', label: 'Research', prompt: 'Research and explain: ' },
  { emoji: '💼', label: 'Business', prompt: 'Give me business advice about ' },
];

function PulsingRing({ delay, size, color }: { delay: number; size: number; color: string }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: 2400, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.6] });
  const opacity = anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.7, 0.3, 0] });

  return (
    <Animated.View style={{
      position: 'absolute',
      width: size, height: size, borderRadius: size / 2,
      borderWidth: 1.5, borderColor: color,
      transform: [{ scale }], opacity,
    }} />
  );
}

function OrbRotation({ children }: { children: React.ReactNode }) {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(rotation, { toValue: 1, duration: 8000, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const rotate = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return <Animated.View style={{ transform: [{ rotate }] }}>{children}</Animated.View>;
}

interface WelcomeViewProps {
  onQuickAction: (prompt: string) => void;
  isOnline: boolean;
}

export default function WelcomeView({ onQuickAction, isOnline }: WelcomeViewProps) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <View style={styles.container}>
      {/* Orb */}
      <View style={styles.orbContainer}>
        <PulsingRing delay={0} size={160} color={Colors.primary} />
        <PulsingRing delay={800} size={160} color={Colors.purple} />
        <PulsingRing delay={1600} size={160} color={Colors.primary} />

        <OrbRotation>
          <View style={styles.orbRing} />
        </OrbRotation>

        <LinearGradient
          colors={[Colors.primary, Colors.purple]}
          style={styles.orb}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        >
          <Text style={styles.orbLetter}>V</Text>
        </LinearGradient>
      </View>

      {/* Text */}
      <View style={styles.textBlock}>
        <Text style={styles.greeting}>{greeting}</Text>
        <Text style={styles.headline}>How can I help you today?</Text>
        <View style={[styles.modeBadge, isOnline ? styles.badgeOnline : styles.badgeOffline]}>
          <View style={[styles.modeDot, { backgroundColor: isOnline ? Colors.success : Colors.warning }]} />
          <Text style={[styles.modeText, { color: isOnline ? Colors.success : Colors.warning }]}>
            {isOnline ? 'Online — Full AI Power' : 'Offline — Basic Mode'}
          </Text>
        </View>
      </View>

      {/* Quick actions */}
      <View style={styles.actionsGrid}>
        {QUICK_ACTIONS.map(action => (
          <TouchableOpacity
            key={action.label}
            style={styles.actionChip}
            onPress={() => onQuickAction(action.prompt)}
            activeOpacity={0.75}
          >
            <Text style={styles.actionEmoji}>{action.emoji}</Text>
            <Text style={styles.actionLabel}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.hint}>
        Tap a topic or type anything below
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  orbContainer: {
    width: 160, height: 160,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  orbRing: {
    width: 120, height: 120, borderRadius: 60,
    borderWidth: 1, borderColor: 'rgba(0,212,255,0.2)',
    borderTopColor: Colors.primary,
    borderRightColor: Colors.purple,
  },
  orb: {
    position: 'absolute',
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 12,
  },
  orbLetter: {
    fontSize: FontSizes.xxl + 4,
    fontWeight: '900',
    color: '#fff',
    fontFamily: 'Orbitron-Bold',
  },
  textBlock: { alignItems: 'center', marginBottom: Spacing.xl, gap: Spacing.sm },
  greeting: {
    fontSize: FontSizes.sm,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontWeight: '600',
  },
  headline: {
    fontSize: FontSizes.xxl,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 34,
  },
  modeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: BorderRadius.full, borderWidth: 1,
    marginTop: 4,
  },
  badgeOnline: {
    backgroundColor: 'rgba(16,185,129,0.08)',
    borderColor: 'rgba(16,185,129,0.25)',
  },
  badgeOffline: {
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderColor: 'rgba(245,158,11,0.25)',
  },
  modeDot: { width: 6, height: 6, borderRadius: 3 },
  modeText: { fontSize: FontSizes.xs, fontWeight: '600' },
  actionsGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    justifyContent: 'center', gap: Spacing.sm,
    marginBottom: Spacing.lg,
    maxWidth: 340,
  },
  actionChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  actionEmoji: { fontSize: 16 },
  actionLabel: { fontSize: FontSizes.sm, color: Colors.textSecondary, fontWeight: '600' },
  hint: { fontSize: FontSizes.xs, color: Colors.textTertiary, textAlign: 'center' },
});
