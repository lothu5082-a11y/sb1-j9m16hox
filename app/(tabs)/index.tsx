import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import {
  Mic, MessageSquare, Sparkles, Phone, Shield, ChevronRight, Brain, Search,
  Bot, Eye, CheckSquare, Radio, TrendingUp,
} from 'lucide-react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../constants/theme';
import VoiceOrb from '../../components/VoiceOrb';
import FeatureCard from '../../components/FeatureCard';
import StatusBadge from '../../components/StatusBadge';
import { useRouter } from 'expo-router';
import { useTasks } from '../../hooks/useTasks';
import { useHabits } from '../../hooks/useHabits';
import { useNotes } from '../../hooks/useNotes';
import AnimatedButton from '../../components/AnimatedButton';

const { width } = Dimensions.get('window');

const quickActions = [
  { icon: <MessageSquare color={Colors.primary} size={22} />, title: 'Chat', description: 'Ask Vexora anything', route: '/(tabs)/chat' },
  { icon: <Radio color={Colors.secondary} size={22} />, title: 'Voice', description: 'Wake word & training', route: '/voice' },
  { icon: <Bot color={Colors.accent} size={22} />, title: 'AI Agent', description: 'Automate tasks', route: '/agent' },
  { icon: <CheckSquare color={Colors.success} size={22} />, title: 'Productivity', description: 'Tasks & notes', route: '/productivity' },
];

const featureHub = [
  { icon: Eye, label: 'Media Analysis', desc: 'Image, video & screen AI', route: '/media', color: Colors.secondary },
  { icon: MessageSquare, label: 'Messaging AI', desc: 'Draft, translate & reply', route: '/messaging', color: Colors.primary },
  { icon: Phone, label: 'Call Assistant', desc: 'Voice call control', route: '/calling', color: Colors.success },
  { icon: Search, label: 'Research', desc: 'Web & fact search', route: '/(tabs)/chat', color: Colors.accent },
];

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export default function HomeScreen() {
  const [isListening, setIsListening] = useState(false);
  const router = useRouter();
  const { stats: taskStats } = useTasks();
  const { todayStats: habitStats } = useHabits();
  const { notes } = useNotes();

  const toggleListening = () => setIsListening(!isListening);

  return (
    <View style={styles.container}>
      <LinearGradient colors={[Colors.background, Colors.backgroundSecondary]} style={styles.gradient}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <Animated.View entering={FadeInUp.duration(600)} style={styles.header}>
            <View style={styles.headerTop}>
              <View>
                <Text style={styles.greeting}>{getGreeting()}</Text>
                <Text style={styles.appName}>Vexora</Text>
              </View>
              <View style={styles.headerBadges}>
                <StatusBadge label="Online" active />
                <StatusBadge label="AI Ready" color={Colors.secondary} active />
              </View>
            </View>
            <Text style={styles.slogan}>Your AI-Powered Life Assistant</Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(800).delay(200)} style={styles.orbSection}>
            <VoiceOrb isListening={isListening} size={160} />
            <AnimatedButton onPress={toggleListening} style={styles.micButton} scaleDown={0.90}>
              <LinearGradient
                colors={isListening ? [Colors.primary, Colors.primaryDark] : [Colors.surface, Colors.surfaceLight]}
                style={styles.micGradient}
              >
                <Mic color={isListening ? Colors.background : Colors.primary} size={28} />
              </LinearGradient>
            </AnimatedButton>
            <Text style={styles.listeningText}>
              {isListening ? 'Listening...' : 'Tap to speak'}
            </Text>
            <Text style={styles.wakeWordText}>or say "Hey Vexora"</Text>
          </Animated.View>

          {(taskStats.total > 0 || habitStats.total > 0) && (
            <Animated.View entering={FadeInUp.duration(800).delay(350)} style={styles.dashboardSection}>
              <Text style={styles.sectionTitle}>Today's Progress</Text>
              <View style={styles.dashboardRow}>
                <TouchableOpacity
                  style={styles.dashboardCard}
                  onPress={() => router.push('/productivity' as any)}
                  activeOpacity={0.8}
                >
                  <CheckSquare color={Colors.secondary} size={18} />
                  <Text style={styles.dashboardValue}>{taskStats.done}/{taskStats.total}</Text>
                  <Text style={styles.dashboardLabel}>Tasks Done</Text>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, {
                      width: taskStats.total > 0 ? `${(taskStats.done / taskStats.total) * 100}%` : '0%',
                      backgroundColor: Colors.secondary,
                    }]} />
                  </View>
                </TouchableOpacity>
                {habitStats.total > 0 && (
                  <TouchableOpacity
                    style={styles.dashboardCard}
                    onPress={() => router.push('/productivity' as any)}
                    activeOpacity={0.8}
                  >
                    <TrendingUp color={Colors.success} size={18} />
                    <Text style={[styles.dashboardValue, { color: Colors.success }]}>
                      {habitStats.completed}/{habitStats.total}
                    </Text>
                    <Text style={styles.dashboardLabel}>Habits Today</Text>
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, {
                        width: habitStats.total > 0 ? `${(habitStats.completed / habitStats.total) * 100}%` : '0%',
                        backgroundColor: Colors.success,
                      }]} />
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            </Animated.View>
          )}

          <Animated.View entering={FadeInUp.duration(800).delay(400)} style={styles.quickActionsSection}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.quickActionsGrid}>
              {quickActions.map((action, index) => (
                <AnimatedButton
                  key={index}
                  style={styles.quickActionCard}
                  onPress={() => router.push(action.route as any)}
                >
                  <View style={styles.quickActionIcon}>{action.icon}</View>
                  <Text style={styles.quickActionTitle}>{action.title}</Text>
                  <Text style={styles.quickActionDesc}>{action.description}</Text>
                </AnimatedButton>
              ))}
            </View>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(800).delay(550)} style={styles.featureHubSection}>
            <Text style={styles.sectionTitle}>Feature Hub</Text>
            <View style={styles.featureHubGrid}>
              {featureHub.map((item, i) => {
                const ItemIcon = item.icon;
                return (
                  <AnimatedButton
                    key={i}
                    style={styles.featureHubCard}
                    onPress={() => router.push(item.route as any)}
                  >
                    <View style={[styles.featureHubIcon, { backgroundColor: item.color + '15' }]}>
                      <ItemIcon color={item.color} size={20} />
                    </View>
                    <Text style={styles.featureHubLabel}>{item.label}</Text>
                    <Text style={styles.featureHubDesc}>{item.desc}</Text>
                    <ChevronRight color={Colors.textTertiary} size={14} style={styles.featureHubArrow} />
                  </AnimatedButton>
                );
              })}
            </View>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(800).delay(700)} style={styles.featuresSection}>
            <Text style={styles.sectionTitle}>AI Capabilities</Text>
            <FeatureCard
              icon={<Sparkles color={Colors.primary} size={22} />}
              title="AI Assistant"
              description="Natural conversations, voice commands, and smart task planning"
              active
            />
            <View style={styles.featureGap} />
            <FeatureCard
              icon={<Brain color={Colors.secondary} size={22} />}
              title="Agent Mode"
              description="Break complex tasks into steps and execute them automatically"
              onPress={() => router.push('/agent' as any)}
            />
            <View style={styles.featureGap} />
            <FeatureCard
              icon={<Shield color={Colors.success} size={22} />}
              title="Privacy Shield"
              description="Biometric lock, encrypted storage, and user-controlled memory"
            />
            <View style={styles.featureGap} />
            <FeatureCard
              icon={<Search color={Colors.accent} size={22} />}
              title="Research Engine"
              description="Real-time web search, fact-finding, and multi-source summaries"
            />
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
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxxl + Spacing.lg,
    marginBottom: Spacing.lg,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  appName: {
    fontSize: FontSizes.massive,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -1,
  },
  headerBadges: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  slogan: {
    fontSize: FontSizes.md,
    color: Colors.primary,
    fontWeight: '500',
    marginTop: Spacing.xs,
  },
  orbSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  micButton: {
    marginTop: Spacing.lg,
  },
  micGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  listeningText: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
    marginTop: Spacing.lg,
  },
  wakeWordText: {
    fontSize: FontSizes.sm,
    color: Colors.textTertiary,
    marginTop: Spacing.xs,
  },
  quickActionsSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.lg,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  quickActionCard: {
    width: (width - Spacing.lg * 2 - Spacing.md) / 2,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  quickActionTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  quickActionDesc: {
    fontSize: FontSizes.xs,
    color: Colors.textTertiary,
    textAlign: 'center',
  },
  dashboardSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  dashboardRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  dashboardCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 4,
  },
  dashboardValue: {
    fontSize: FontSizes.xxl,
    fontWeight: '700',
    color: Colors.secondary,
    marginTop: 4,
  },
  dashboardLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textTertiary,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.backgroundTertiary,
    marginTop: Spacing.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  featureHubSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  featureHubGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  featureHubCard: {
    width: (width - Spacing.lg * 2 - Spacing.md) / 2,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  featureHubIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  featureHubLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 2,
  },
  featureHubDesc: {
    fontSize: FontSizes.xs,
    color: Colors.textTertiary,
    lineHeight: 16,
  },
  featureHubArrow: {
    marginTop: Spacing.xs,
  },
  featuresSection: {
    paddingHorizontal: Spacing.lg,
  },
  featureGap: {
    height: Spacing.md,
  },
});
