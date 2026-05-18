import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Crown, Check, Sparkles, Zap, Shield, Brain, Image, Gamepad2, ChevronLeft } from 'lucide-react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../constants/theme';
import GlowButton from '../../components/GlowButton';

const { width } = Dimensions.get('window');

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: 'forever',
    color: Colors.textTertiary,
    features: [
      'Basic voice commands',
      '5 AI chats per day',
      'Gemini model only',
      'Standard response speed',
    ],
    limited: [
      'Image generation',
      'Gaming assistant',
      'Priority support',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$4.99',
    period: '/month',
    color: Colors.primary,
    popular: true,
    features: [
      'Unlimited voice commands',
      'Unlimited AI chats',
      'All AI models (Gemini, OpenAI, Groq)',
      'Fast response speed',
      'Image generation (50/day)',
      'Gaming assistant',
      'Floating assistant',
      'Priority support',
    ],
    limited: [],
  },
  {
    id: 'ultimate',
    name: 'Ultimate',
    price: '$9.99',
    period: '/month',
    color: Colors.accent,
    features: [
      'Everything in Pro',
      'Unlimited image generation',
      'Video generation',
      'Advanced gaming overlay',
      'Smart call assistant',
      'Smart glasses ready',
      'PC connection',
      'Smartwatch support',
      'Home assistant integration',
      'Early access features',
    ],
    limited: [],
  },
];

export default function PremiumScreen() {
  const [selectedPlan, setSelectedPlan] = useState('pro');

  return (
    <View style={styles.container}>
      <LinearGradient colors={[Colors.background, Colors.backgroundSecondary]} style={styles.gradient}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <Animated.View entering={FadeInUp.duration(600)} style={styles.header}>
            <Crown color={Colors.accent} size={32} />
            <Text style={styles.headerTitle}>Nova Premium</Text>
            <Text style={styles.headerSubtitle}>Unlock your full AI potential</Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(600).delay(100)} style={styles.comparisonSection}>
            <View style={styles.comparisonRow}>
              <View style={styles.comparisonIcon}>
                <Brain color={Colors.primary} size={20} />
              </View>
              <Text style={styles.comparisonText}>Access all AI models</Text>
              <Check color={Colors.success} size={18} />
            </View>
            <View style={styles.comparisonRow}>
              <View style={styles.comparisonIcon}>
                <Image color={Colors.secondary} size={20} />
              </View>
              <Text style={styles.comparisonText}>Unlimited image generation</Text>
              <Check color={Colors.success} size={18} />
            </View>
            <View style={styles.comparisonRow}>
              <View style={styles.comparisonIcon}>
                <Gamepad2 color={Colors.accent} size={20} />
              </View>
              <Text style={styles.comparisonText}>Advanced gaming tools</Text>
              <Check color={Colors.success} size={18} />
            </View>
            <View style={styles.comparisonRow}>
              <View style={styles.comparisonIcon}>
                <Zap color={Colors.warning} size={20} />
              </View>
              <Text style={styles.comparisonText}>Priority fast responses</Text>
              <Check color={Colors.success} size={18} />
            </View>
            <View style={styles.comparisonRow}>
              <View style={styles.comparisonIcon}>
                <Shield color={Colors.success} size={20} />
              </View>
              <Text style={styles.comparisonText}>Smart call assistant</Text>
              <Check color={Colors.success} size={18} />
            </View>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(600).delay(200)} style={styles.plansSection}>
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
                  <Text style={[styles.planName, { color: plan.color }]}>{plan.name}</Text>
                  <View style={styles.planPriceRow}>
                    <Text style={[styles.planPrice, { color: plan.color }]}>{plan.price}</Text>
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
                  <View style={[styles.selectedIndicator, { backgroundColor: plan.color }]} />
                )}
              </TouchableOpacity>
            ))}
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(600).delay(300)} style={styles.ctaSection}>
            <GlowButton
              title={`Subscribe to ${plans.find(p => p.id === selectedPlan)?.name}`}
              onPress={() => {}}
              variant="primary"
              size="lg"
              icon={<Sparkles color={Colors.background} size={18} />}
              style={styles.ctaButton}
            />
            <Text style={styles.ctaSubtext}>Cancel anytime. No commitments.</Text>
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
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxxl + Spacing.lg,
    marginBottom: Spacing.xl,
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
  comparisonSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
    gap: Spacing.md,
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
  },
  comparisonIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  comparisonText: {
    flex: 1,
    fontSize: FontSizes.md,
    color: Colors.text,
    fontWeight: '500',
  },
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
    color: Colors.background,
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
});
