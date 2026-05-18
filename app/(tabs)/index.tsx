import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { Mic, MessageSquare, Image, Gamepad2, Settings, Sparkles, Phone, Shield, ChevronRight } from 'lucide-react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../constants/theme';
import VoiceOrb from '../../components/VoiceOrb';
import FeatureCard from '../../components/FeatureCard';
import StatusBadge from '../../components/StatusBadge';

const { width } = Dimensions.get('window');

const quickActions = [
  { icon: <MessageSquare color={Colors.primary} size={22} />, title: 'Chat', description: 'Ask Nova anything', route: '/chat' },
  { icon: <Image color={Colors.secondary} size={22} />, title: 'Generate', description: 'Create AI images', route: '/generate' },
  { icon: <Gamepad2 color={Colors.accent} size={22} />, title: 'Game Mode', description: 'Optimize & play', route: '/gaming' },
  { icon: <Phone color={Colors.success} size={22} />, title: 'Call Assist', description: 'Smart call handling', route: '/settings' },
];

export default function HomeScreen() {
  const [isListening, setIsListening] = useState(false);

  const toggleListening = () => setIsListening(!isListening);

  return (
    <View style={styles.container}>
      <LinearGradient colors={[Colors.background, Colors.backgroundSecondary]} style={styles.gradient}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <Animated.View entering={FadeInUp.duration(600)} style={styles.header}>
            <View style={styles.headerTop}>
              <View>
                <Text style={styles.greeting}>Good Evening</Text>
                <Text style={styles.appName}>Nova</Text>
              </View>
              <View style={styles.headerBadges}>
                <StatusBadge label="Online" active />
                <StatusBadge label="Gemini" color={Colors.secondary} active />
              </View>
            </View>
            <Text style={styles.slogan}>Your Intelligent Future Assistant</Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(800).delay(200)} style={styles.orbSection}>
            <VoiceOrb isListening={isListening} size={160} />
            <TouchableOpacity onPress={toggleListening} activeOpacity={0.8} style={styles.micButton}>
              <LinearGradient
                colors={isListening ? [Colors.primary, Colors.primaryDark] : [Colors.surface, Colors.surfaceLight]}
                style={styles.micGradient}
              >
                <Mic color={isListening ? Colors.background : Colors.primary} size={28} />
              </LinearGradient>
            </TouchableOpacity>
            <Text style={styles.listeningText}>
              {isListening ? 'Listening...' : 'Tap to speak'}
            </Text>
            <Text style={styles.wakeWordText}>or say "Hey Nova"</Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(800).delay(400)} style={styles.quickActionsSection}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.quickActionsGrid}>
              {quickActions.map((action, index) => (
                <TouchableOpacity key={index} activeOpacity={0.7} style={styles.quickActionCard}>
                  <View style={styles.quickActionIcon}>{action.icon}</View>
                  <Text style={styles.quickActionTitle}>{action.title}</Text>
                  <Text style={styles.quickActionDesc}>{action.description}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(800).delay(600)} style={styles.featuresSection}>
            <Text style={styles.sectionTitle}>Capabilities</Text>
            <FeatureCard
              icon={<Sparkles color={Colors.primary} size={22} />}
              title="AI Assistant"
              description="Answer questions, write code, create content, and search the internet"
              active
            />
            <View style={styles.featureGap} />
            <FeatureCard
              icon={<Shield color={Colors.success} size={22} />}
              title="Privacy Mode"
              description="Voice recognition, fingerprint lock, and encrypted conversations"
            />
            <View style={styles.featureGap} />
            <FeatureCard
              icon={<Gamepad2 color={Colors.accent} size={22} />}
              title="Gaming Overlay"
              description="Performance boost, voice commands, and floating assistant while gaming"
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
  featuresSection: {
    paddingHorizontal: Spacing.lg,
  },
  featureGap: {
    height: Spacing.md,
  },
});
