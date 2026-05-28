import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';
import {
  Zap,
  Play,
  Clock,
  Shield,
  Bell,
  ChevronRight,
  Layers,
} from 'lucide-react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../constants/theme';

interface Workflow {
  id: string;
  name: string;
  trigger: string;
  steps: string[];
  enabled: boolean;
  lastRun: string;
  status: 'idle' | 'running' | 'done' | 'error';
  color: string;
}

const PRESET_WORKFLOWS: Workflow[] = [
  {
    id: '1',
    name: 'Business Reply Pipeline',
    trigger: 'Incoming WhatsApp message',
    steps: ['Parse message intent', 'Check calendar availability', 'Locate relevant files', 'Draft response', 'Confirm & send'],
    enabled: true,
    lastRun: '2 min ago',
    status: 'done',
    color: Colors.secondary,
  },
  {
    id: '2',
    name: 'Clipboard Analyzer',
    trigger: 'Any clipboard copy event',
    steps: ['Capture clipboard buffer', 'Classify content type', 'Analyze / summarize', 'Surface action panel'],
    enabled: true,
    lastRun: '14 min ago',
    status: 'done',
    color: Colors.primary,
  },
  {
    id: '3',
    name: 'Meeting Auto-Brief',
    trigger: 'Calendar event in 30 min',
    steps: ['Scan calendar event details', 'Pull related messages', 'Generate meeting brief', 'Push notification summary'],
    enabled: false,
    lastRun: 'Never',
    status: 'idle',
    color: Colors.accent,
  },
  {
    id: '4',
    name: 'Delivery Tracker',
    trigger: 'SMS with tracking number',
    steps: ['Extract tracking code', 'Query carrier endpoint', 'Format status update', 'Reply with ETA'],
    enabled: false,
    lastRun: 'Never',
    status: 'idle',
    color: '#F59E0B',
  },
];

const statusColor = (s: Workflow['status']) => {
  switch (s) {
    case 'running': return Colors.primary;
    case 'done': return Colors.secondary;
    case 'error': return Colors.error;
    default: return Colors.textTertiary;
  }
};

const statusLabel = (s: Workflow['status']) => {
  switch (s) {
    case 'running': return 'RUNNING';
    case 'done': return 'COMPLETE';
    case 'error': return 'ERROR';
    default: return 'IDLE';
  }
};

export default function AutomationScreen() {
  const [workflows, setWorkflows] = useState<Workflow[]>(PRESET_WORKFLOWS);
  const [runningId, setRunningId] = useState<string | null>(null);

  const toggleWorkflow = (id: string) => {
    setWorkflows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, enabled: !w.enabled } : w))
    );
  };

  const runWorkflow = (id: string) => {
    Alert.alert(
      'Confirm Execution',
      'Riuka will execute this automation pipeline. Proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Execute',
          onPress: () => {
            setRunningId(id);
            setWorkflows((prev) =>
              prev.map((w) => (w.id === id ? { ...w, status: 'running' } : w))
            );
            setTimeout(() => {
              setWorkflows((prev) =>
                prev.map((w) =>
                  w.id === id ? { ...w, status: 'done', lastRun: 'Just now' } : w
                )
              );
              setRunningId(null);
            }, 2500);
          },
        },
      ]
    );
  };

  const enabledCount = workflows.filter((w) => w.enabled).length;

  return (
    <View style={styles.container}>
      <LinearGradient colors={[Colors.background, Colors.backgroundSecondary]} style={styles.gradient}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          {/* Header */}
          <Animated.View entering={FadeInUp.duration(600)} style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIcon}>
                <Zap color={Colors.accent} size={22} />
              </View>
              <View>
                <Text style={styles.headerTitle}>Automation</Text>
                <Text style={styles.headerSub}>Cross-App Workflow Engine</Text>
              </View>
            </View>
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{enabledCount} ACTIVE</Text>
            </View>
          </Animated.View>

          {/* Stats Row */}
          <Animated.View entering={FadeInUp.duration(600).delay(80)} style={styles.statsRow}>
            {[
              { label: 'Workflows', value: workflows.length.toString(), color: Colors.primary },
              { label: 'Active', value: enabledCount.toString(), color: Colors.secondary },
              { label: 'Runs Today', value: '7', color: Colors.accent },
            ].map((s, i) => (
              <View key={i} style={styles.statCard}>
                <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </Animated.View>

          {/* Workflows */}
          <Animated.View entering={FadeInUp.duration(600).delay(160)} style={styles.section}>
            <Text style={styles.sectionTitle}>Automation Pipelines</Text>
            <View style={styles.workflowList}>
              {workflows.map((wf, i) => (
                <Animated.View
                  key={wf.id}
                  entering={FadeInUp.duration(500).delay(i * 80)}
                  style={[
                    styles.workflowCard,
                    { borderColor: wf.enabled ? wf.color + '30' : Colors.border },
                    runningId === wf.id && {
                      shadowColor: Colors.primary,
                      shadowOpacity: 0.4,
                      shadowRadius: 14,
                      elevation: 8,
                    },
                  ]}
                >
                  {/* Card Header */}
                  <View style={styles.workflowCardHeader}>
                    <View style={[styles.workflowIcon, { backgroundColor: wf.color + '18' }]}>
                      <Layers color={wf.color} size={18} />
                    </View>
                    <View style={styles.workflowMeta}>
                      <Text style={[styles.workflowName, { color: wf.enabled ? Colors.text : Colors.textTertiary }]}>
                        {wf.name}
                      </Text>
                      <View style={styles.workflowTriggerRow}>
                        <Bell color={Colors.textTertiary} size={10} />
                        <Text style={styles.workflowTrigger}>{wf.trigger}</Text>
                      </View>
                    </View>
                    <Switch
                      value={wf.enabled}
                      onValueChange={() => toggleWorkflow(wf.id)}
                      trackColor={{ false: Colors.surface, true: wf.color + '50' }}
                      thumbColor={wf.enabled ? wf.color : Colors.textTertiary}
                    />
                  </View>

                  {/* Steps */}
                  {wf.enabled && (
                    <View style={styles.stepsContainer}>
                      {wf.steps.map((step, si) => (
                        <View key={si} style={styles.stepRow}>
                          <View style={[styles.stepDot, { backgroundColor: wf.color + '60' }]} />
                          {si < wf.steps.length - 1 && (
                            <View style={[styles.stepLine, { backgroundColor: wf.color + '20' }]} />
                          )}
                          <Text style={styles.stepText}>{step}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Card Footer */}
                  <View style={styles.workflowCardFooter}>
                    <View style={styles.statusRow}>
                      <View style={[styles.statusDot, { backgroundColor: statusColor(wf.status) }]} />
                      <Text style={[styles.statusText, { color: statusColor(wf.status) }]}>
                        {statusLabel(wf.status)}
                      </Text>
                      <Clock color={Colors.textTertiary} size={10} />
                      <Text style={styles.lastRunText}>{wf.lastRun}</Text>
                    </View>
                    {wf.enabled && (
                      <TouchableOpacity
                        style={[styles.runButton, { borderColor: wf.color + '50', backgroundColor: wf.color + '12' }]}
                        onPress={() => runWorkflow(wf.id)}
                        disabled={runningId === wf.id}
                      >
                        <Play color={wf.color} size={12} />
                        <Text style={[styles.runButtonText, { color: wf.color }]}>
                          {runningId === wf.id ? 'Running...' : 'Run Now'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </Animated.View>
              ))}
            </View>
          </Animated.View>

          {/* Add New Workflow */}
          <Animated.View entering={FadeInUp.duration(600).delay(400)} style={styles.section}>
            <TouchableOpacity
              style={styles.addWorkflowButton}
              onPress={() => Alert.alert('Workflow Builder', 'Custom workflow builder coming in the next release.')}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['rgba(168,85,247,0.15)', 'rgba(168,85,247,0.05)']}
                style={styles.addWorkflowGradient}
              >
                <Zap color={Colors.primary} size={20} />
                <Text style={styles.addWorkflowText}>Build Custom Automation</Text>
                <ChevronRight color={Colors.primary} size={16} />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          {/* Accessibility notice */}
          <Animated.View entering={FadeInUp.duration(600).delay(480)} style={styles.section}>
            <View style={styles.noticeCard}>
              <Shield color={Colors.secondary} size={16} />
              <Text style={styles.noticeText}>
                Automation pipelines use the Android Accessibility Service to pilot the interface. No data is transmitted externally.
              </Text>
            </View>
          </Animated.View>

        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  gradient: { flex: 1 },
  scrollContent: { paddingBottom: Spacing.xxxl },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxxl + Spacing.md,
    marginBottom: Spacing.xl,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.accent + '18',
    borderWidth: 1,
    borderColor: Colors.accent + '40',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: FontSizes.xxl, fontWeight: '700', color: Colors.text },
  headerSub: { fontSize: FontSizes.xs, color: Colors.textTertiary, marginTop: 1 },
  headerBadge: {
    backgroundColor: Colors.secondary + '20',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: Colors.secondary + '40',
  },
  headerBadgeText: { fontSize: FontSizes.xs, fontWeight: '800', color: Colors.secondary, letterSpacing: 0.5 },

  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statValue: { fontSize: FontSizes.xxl, fontWeight: '800' },
  statLabel: { fontSize: FontSizes.xs, color: Colors.textTertiary, marginTop: 2 },

  section: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.xl },
  sectionTitle: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  workflowList: { gap: Spacing.md },
  workflowCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  workflowCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  workflowIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workflowMeta: { flex: 1 },
  workflowName: { fontSize: FontSizes.md, fontWeight: '600', marginBottom: 3 },
  workflowTriggerRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  workflowTrigger: { fontSize: FontSizes.xs, color: Colors.textTertiary },

  stepsContainer: {
    marginVertical: Spacing.sm,
    marginLeft: Spacing.sm,
    paddingLeft: Spacing.md,
    borderLeftWidth: 1,
    borderLeftColor: Colors.border,
    gap: Spacing.xs,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    position: 'relative',
  },
  stepDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    position: 'absolute',
    left: -Spacing.md - 2,
  },
  stepLine: {
    position: 'absolute',
    left: -Spacing.md + 1,
    top: 8,
    width: 2,
    height: 16,
  },
  stepText: { fontSize: FontSizes.xs, color: Colors.textSecondary, lineHeight: 18 },

  workflowCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: FontSizes.xs, fontWeight: '700', letterSpacing: 0.3 },
  lastRunText: { fontSize: FontSizes.xs, color: Colors.textTertiary },
  runButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  runButtonText: { fontSize: FontSizes.xs, fontWeight: '700' },

  addWorkflowButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  addWorkflowGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  addWorkflowText: { flex: 1, fontSize: FontSizes.md, fontWeight: '600', color: Colors.primary },

  noticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.backgroundTertiary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.secondary + '30',
    gap: Spacing.sm,
  },
  noticeText: { flex: 1, fontSize: FontSizes.xs, color: Colors.textTertiary, lineHeight: 18 },
});
