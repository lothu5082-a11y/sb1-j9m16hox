import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, withRepeat, withTiming, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { Gamepad2, Zap, Volume2, BellOff, Crosshair, Mic, Smartphone, Activity, Cpu, HardDrive, Wifi, ChevronRight } from 'lucide-react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../constants/theme';
import GlowButton from '../../components/GlowButton';
import StatusBadge from '../../components/StatusBadge';

interface ToggleSettingProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  value: boolean;
  onValueChange: (val: boolean) => void;
  color?: string;
}

function ToggleSetting({ icon, title, description, value, onValueChange, color = Colors.primary }: ToggleSettingProps) {
  return (
    <View style={toggleStyles.container}>
      <View style={[toggleStyles.iconWrap, { borderColor: value ? color : Colors.border }]}>
        {icon}
      </View>
      <View style={toggleStyles.textWrap}>
        <Text style={[toggleStyles.title, { color: value ? color : Colors.text }]}>{title}</Text>
        <Text style={toggleStyles.desc}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: Colors.surface, true: color + '40' }}
        thumbColor={value ? color : Colors.textTertiary}
      />
    </View>
  );
}

const toggleStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.backgroundTertiary,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    marginBottom: 2,
  },
  desc: {
    fontSize: FontSizes.xs,
    color: Colors.textTertiary,
  },
});

function AnimatedGauge({ value, max, label, color }: { value: number; max: number; label: string; color: string }) {
  const animatedValue = useSharedValue(0);

  useEffect(() => {
    animatedValue.value = withRepeat(withTiming(value / max, { duration: 2000 }), 1, false);
  }, [value]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${animatedValue.value * 100}%`,
  }));

  return (
    <View style={gaugeStyles.container}>
      <View style={gaugeStyles.header}>
        <Text style={gaugeStyles.label}>{label}</Text>
        <Text style={[gaugeStyles.value, { color }]}>{value}%</Text>
      </View>
      <View style={gaugeStyles.track}>
        <Animated.View style={[gaugeStyles.fill, { backgroundColor: color }, animatedStyle]} />
      </View>
    </View>
  );
}

const gaugeStyles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs + 2,
  },
  label: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  value: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.backgroundTertiary,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
});

export default function GamingScreen() {
  const [gamingMode, setGamingMode] = useState(false);
  const [autoTap, setAutoTap] = useState(false);
  const [voiceCommands, setVoiceCommands] = useState(true);
  const [doNotDisturb, setDoNotDisturb] = useState(true);
  const [floatingAssistant, setFloatingAssistant] = useState(true);
  const [smartAim, setSmartAim] = useState(false);

  const performanceMode = 'balanced';

  return (
    <View style={styles.container}>
      <LinearGradient colors={[Colors.background, Colors.backgroundSecondary]} style={styles.gradient}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <Animated.View entering={FadeInUp.duration(600)} style={styles.header}>
            <Gamepad2 color={Colors.accent} size={28} />
            <Text style={styles.headerTitle}>Gaming Mode</Text>
            <StatusBadge label={gamingMode ? 'Active' : 'Inactive'} color={gamingMode ? Colors.accent : Colors.textTertiary} active={gamingMode} />
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(600).delay(100)} style={styles.mainToggle}>
            <TouchableOpacity onPress={() => setGamingMode(!gamingMode)} activeOpacity={0.8}>
              <LinearGradient
                colors={gamingMode ? [Colors.accent, '#FF8F00'] : [Colors.surface, Colors.surfaceLight]}
                style={styles.mainToggleGradient}
              >
                <Zap color={gamingMode ? Colors.background : Colors.accent} size={32} />
                <Text style={[styles.mainToggleText, { color: gamingMode ? Colors.background : Colors.accent }]}>
                  {gamingMode ? 'GAMING MODE ON' : 'ACTIVATE GAMING MODE'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(600).delay(200)} style={styles.section}>
            <Text style={styles.sectionTitle}>Performance Monitor</Text>
            <View style={styles.monitorCard}>
              <View style={styles.monitorGrid}>
                <View style={styles.monitorItem}>
                  <Activity color={Colors.primary} size={20} />
                  <Text style={styles.monitorValue}>60</Text>
                  <Text style={styles.monitorLabel}>FPS</Text>
                </View>
                <View style={styles.monitorItem}>
                  <Cpu color={Colors.secondary} size={20} />
                  <Text style={styles.monitorValue}>34%</Text>
                  <Text style={styles.monitorLabel}>CPU</Text>
                </View>
                <View style={styles.monitorItem}>
                  <HardDrive color={Colors.accent} size={20} />
                  <Text style={styles.monitorValue}>2.1G</Text>
                  <Text style={styles.monitorLabel}>RAM</Text>
                </View>
                <View style={styles.monitorItem}>
                  <Wifi color={Colors.success} size={20} />
                  <Text style={styles.monitorValue}>24ms</Text>
                  <Text style={styles.monitorLabel}>Ping</Text>
                </View>
              </View>
              <View style={styles.gaugesContainer}>
                <AnimatedGauge value={72} max={100} label="CPU Usage" color={Colors.primary} />
                <AnimatedGauge value={58} max={100} label="RAM Usage" color={Colors.secondary} />
                <AnimatedGauge value={85} max={100} label="GPU Usage" color={Colors.accent} />
              </View>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(600).delay(300)} style={styles.section}>
            <Text style={styles.sectionTitle}>Performance Mode</Text>
            <View style={styles.modeRow}>
              {['performance', 'balanced', 'battery'].map((mode) => (
                <TouchableOpacity
                  key={mode}
                  onPress={() => {}}
                  style={[styles.modeCard, performanceMode === mode && styles.modeCardActive]}
                >
                  <Text style={[styles.modeText, performanceMode === mode && styles.modeTextActive]}>
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(600).delay(400)} style={styles.section}>
            <Text style={styles.sectionTitle}>Gaming Tools</Text>
            <View style={styles.settingsGap}>
              <ToggleSetting
                icon={<Crosshair color={smartAim ? Colors.accent : Colors.textTertiary} size={20} />}
                title="Smart Aim Assist"
                description="Overlay aim assistance"
                value={smartAim}
                onValueChange={setSmartAim}
                color={Colors.accent}
              />
            </View>
            <View style={styles.settingsGap}>
              <ToggleSetting
                icon={<Mic color={voiceCommands ? Colors.primary : Colors.textTertiary} size={20} />}
                title="Voice Commands"
                description="Control game with voice"
                value={voiceCommands}
                onValueChange={setVoiceCommands}
                color={Colors.primary}
              />
            </View>
            <View style={styles.settingsGap}>
              <ToggleSetting
                icon={<BellOff color={doNotDisturb ? Colors.warning : Colors.textTertiary} size={20} />}
                title="Do Not Disturb"
                description="Block notifications in-game"
                value={doNotDisturb}
                onValueChange={setDoNotDisturb}
                color={Colors.warning}
              />
            </View>
            <View style={styles.settingsGap}>
              <ToggleSetting
                icon={<Smartphone color={floatingAssistant ? Colors.success : Colors.textTertiary} size={20} />}
                title="Floating Assistant"
                description="Overlay bubble while gaming"
                value={floatingAssistant}
                onValueChange={setFloatingAssistant}
                color={Colors.success}
              />
            </View>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(600).delay(500)} style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Launch</Text>
            <View style={styles.gameList}>
              {['Mobile Legends', 'PUBG Mobile', 'Free Fire', 'Call of Duty'].map((game, i) => (
                <TouchableOpacity key={game} style={styles.gameItem}>
                  <View style={[styles.gameIcon, { backgroundColor: i === 0 ? 'rgba(255, 109, 0, 0.15)' : Colors.backgroundTertiary }]}>
                    <Gamepad2 color={i === 0 ? Colors.accent : Colors.textTertiary} size={20} />
                  </View>
                  <Text style={styles.gameName}>{game}</Text>
                  <ChevronRight color={Colors.textTertiary} size={16} />
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xxxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxxl + Spacing.md,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  headerTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
  },
  mainToggle: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  mainToggleGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
    borderRadius: BorderRadius.xl,
    gap: Spacing.md,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  mainToggleText: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  monitorCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  monitorGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  monitorItem: {
    alignItems: 'center',
    gap: 2,
  },
  monitorValue: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  monitorLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textTertiary,
    fontWeight: '500',
  },
  gaugesContainer: {
    marginTop: Spacing.sm,
  },
  modeRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  modeCard: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  modeCardActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  modeText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.textTertiary,
  },
  modeTextActive: {
    color: Colors.primary,
  },
  settingsGap: {
    marginBottom: Spacing.md,
  },
  gameList: {
    gap: Spacing.md,
  },
  gameItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
  },
  gameIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameName: {
    flex: 1,
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
});
