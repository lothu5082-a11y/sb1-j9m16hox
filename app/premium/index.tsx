import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';
import {
  Crown,
  Check,
  Sparkles,
  Zap,
  Shield,
  Brain,
  ImagePlus,
  Gamepad2,
  ChevronLeft,
  Mic,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../constants/theme';
import GlowButton from '../../components/GlowButton';

const plans = [
  {
    id: 'starter',
    name: 'Starter',
    price: '$0',
    period: 'forever',
    color: Colors.textTertiary,
    features: [
      'Local AI only',
      '10 cloud messages/day',
      'Basic voice commands',
      '1 device',
    ],
    limited: [
      'All AI providers',
      'Gaming mode',
      'Image generation',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$7.99',
    period: '/month',
    color: Colors.primary,
    popular: true,
    features: [
      'All AI providers (OpenAI, Gemini, Claude, Groq)',
      'Unlimited messages',
      'Voice AI',
      'Gaming mode',
      '5 devices',
    ],
    limited: [],
  },
  {
    id: 'elite',
    name: 'Elite',
    price: '$14.99',
    period: '/month',
    color: Colors.accent,
    features: [
      'Everything in Pro',
      'Priority API access',
      'Image generation',
      'Advanced gaming overlay',
      'Smart home integration',
      'Early access features',
      'Dedicated support',
    ],
    limited: [],
  },
];

const highlights = [
  { Icon: Brain, color: Colors.primary, label: 'Access all AI providers' },
  { Icon: ImagePlus, color: Colors.secondary, label: 'Image generation' },
  { Icon: Gamepad2, color: Colors.accent, label: 'Advanced gaming tools' },
  { Icon: Zap, color: Colors.warning, label: 'Priority fast responses' },
  { Icon: Mic, color: '#A855F7', label: 'Voice AI hands-free' },
  { Icon: Shield, color: Colors.success, label: 'Smart home integration' },
];

export default function PremiumScreen() {
  const [selectedPlan, setSelectedPlan] = useState('pro');

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.background, Colors.backgroundSecondary]}
        style={styles.gradient}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <Animated.View entering={FadeInUp.duration(600)} style={styles.header}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <ChevronLeft color={Colors.textSecondary} size={24} />
            </TouchableOpacity>
            <Crown color={Colors.accent} size={36} />
            <Text style={styles.headerTitle}>Riuka Pro</Text>
            <Text style={styles.headerSubtitle}>Unlock your AI potential</Text>
          </Animated.View>

          {/* Highlights */}
          <Animated.View
            entering={FadeInUp.duration(600).delay(100)}
            style={styles.highlightsSection}
          >
            {highlights.map((item, index) => {
              const IconComp = item.Icon;
              return (
                <View key={index} style={styles.highlightRow}>
                  <View style={styles.highlightIcon}>
                    <IconComp color={item.color} size={20} />
                  </View>
                  <Text style={styles.highlightText}>{item.label}</Text>
                  <Check color={Colors.success} size={18} />
                </View>
              );
            })}
          </Animated.View>

          {/* Plans */}
          <Animated.View
            entering={FadeInUp.duration(600).delay(200)}
            style={styles.plansSection}
          >
            {plans.map((plan) => (
              <TouchableOpacity
                key={plan.id}
                onPress={() => setSelectedPlan(plan.id)}
                activeOpacity={0.8}
                style={[
                  styles.planCard,
                  selectedPlan === plan.id && { borderColor: plan.color },
                  plan.popular && styles.popularCard,
                ]}
              >
                {plan.popular && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularText}>MOST POPULAR</Text>
                  </View>
                )}
                <View style={styles.planHeader}>
                  <Text style={[styles.planName, { color: plan.color }]}>
                    {plan.name}
                  </Text>
                  <View style={styles.planPriceRow}>
                    <Text style={[styles.planPrice, { color: plan.color }]}>
                      {plan.price}
                    </Text>
                    <Text style={styles.planPeriod}>{plan.period}</Text>
                  </View>
                </View>
                <View style={styles.planFeatures}>
                  {plan.features.map((feature, i) => (
                    <View key={i} style={styles.featureRow}>
                      <Check color={plan.color} size={14} />
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                  {plan.limited.map((item, i) => (
                    <View key={i} style={styles.featureRow}>
                      <View style={styles.limitedDot} />
                      <Text style={styles.limitedText}>{item}</Text>
                    </View>
                  ))}
                </View>
                {selectedPlan === plan.id && (
                  <View
                    style={[
                      styles.selectedIndicator,
                      { backgroundColor: plan.color },
                    ]}
                  />
                )}
              </TouchableOpacity>
            ))}
          </Animated.View>

          {/* CTA */}
          <Animated.View
            entering={FadeInUp.duration(600).delay(300)}
            style={styles.ctaSection}
          >
            <GlowButton
              title={`Subscribe to ${plans.find((p) => p.id === selectedPlan)?.name}`}
              onPress={() => {}}
              variant="primary"
              size="lg"
              icon={<Sparkles color="#ffffff" size={18} />}
              style={styles.ctaButton}
            />
            <Text style={styles.ctaSubtext}>Cancel anytime. No commitments.</Text>
            <Text style={styles.footerBrand}>Riuka AI v1.0.0</Text>
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
  /* Header */
  header: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxxl + Spacing.lg,
    marginBottom: Spacing.xl,
    position: 'relative',
  },
  backBtn: {
    position: 'absolute',
    left: Spacing.lg,
    top: Spacing.xxxl + Spacing.lg,
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: FontSizes.huge,
    fontWeight: '700',
    color: Colors.text,
    marginTop: Spacing.md,
  },
  headerSubtitle: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  /* Highlights */
  highlightsSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
    gap: Spacing.md,
  },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
  },
  highlightIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlightText: {
    flex: 1,
    fontSize: FontSizes.md,
    color: Colors.text,
    fontWeight: '500',
  },
  /* Plans */
  plansSection: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  planCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    position: 'relative',
    overflow: 'hidden',
  },
  popularCard: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  popularBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderBottomLeftRadius: BorderRadius.md,
  },
  popularText: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 1,
  },
  planHeader: {
    marginBottom: Spacing.lg,
  },
  planName: {
    fontSize: FontSizes.xxl,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  planPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  planPrice: {
    fontSize: FontSizes.xxxl,
    fontWeight: '700',
  },
  planPeriod: {
    fontSize: FontSizes.md,
    color: Colors.textTertiary,
    marginLeft: Spacing.xs,
  },
  planFeatures: {
    gap: Spacing.sm,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  featureText: {
    fontSize: FontSizes.sm,
    color: Colors.text,
    flex: 1,
  },
  limitedDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: Colors.textTertiary,
    opacity: 0.5,
  },
  limitedText: {
    fontSize: FontSizes.sm,
    color: Colors.textTertiary,
    flex: 1,
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
  selectedIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  /* CTA */
  ctaSection: {
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
  },
  ctaButton: {
    width: '100%',
  },
  ctaSubtext: {
    fontSize: FontSizes.xs,
    color: Colors.textTertiary,
    marginTop: Spacing.md,
  },
  footerBrand: {
    fontSize: FontSizes.xs,
    color: Colors.textTertiary,
    marginTop: Spacing.xl,
    opacity: 0.5,
  },
});
