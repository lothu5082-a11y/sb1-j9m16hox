import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';
import {
  Bot, ChevronLeft, Plus, CheckCircle2, Circle, Clock, Zap,
  AlertCircle, ChevronRight, Trash2, Play, Pause,
} from 'lucide-react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../constants/theme';
import { useRouter } from 'expo-router';

type TaskStatus = 'pending' | 'running' | 'completed' | 'waiting_approval' | 'paused';

interface AgentStep {
  id: string;
  description: string;
  status: TaskStatus;
  requiresApproval?: boolean;
}

interface AgentTask {
  id: string;
  title: string;
  goal: string;
  status: TaskStatus;
  steps: AgentStep[];
  createdAt: string;
}

const sampleTasks: AgentTask[] = [
  {
    id: '1',
    title: 'Plan Weekend Trip',
    goal: 'Plan a 2-day trip to Dubai including hotels and activities',
    status: 'running',
    createdAt: '10:32 AM',
    steps: [
      { id: 's1', description: 'Research best hotels in Dubai', status: 'completed' },
      { id: 's2', description: 'Find top-rated activities and attractions', status: 'completed' },
      { id: 's3', description: 'Create day-by-day itinerary', status: 'running' },
      { id: 's4', description: 'Compile packing list', status: 'pending' },
      { id: 's5', description: 'Set travel reminders', status: 'pending', requiresApproval: true },
    ],
  },
  {
    id: '2',
    title: 'Study Plan — Calculus',
    goal: 'Create a 2-week study schedule for Calculus exam',
    status: 'completed',
    createdAt: 'Yesterday',
    steps: [
      { id: 's1', description: 'Identify weak topics', status: 'completed' },
      { id: 's2', description: 'Create flashcard deck', status: 'completed' },
      { id: 's3', description: 'Generate practice quizzes', status: 'completed' },
      { id: 's4', description: 'Schedule daily study reminders', status: 'completed' },
    ],
  },
];

const statusColors: Record<TaskStatus, string> = {
  pending: Colors.textTertiary,
  running: Colors.primary,
  completed: Colors.success,
  waiting_approval: Colors.warning,
  paused: Colors.textSecondary,
};

const statusLabels: Record<TaskStatus, string> = {
  pending: 'Pending',
  running: 'Running',
  completed: 'Done',
  waiting_approval: 'Needs Approval',
  paused: 'Paused',
};

function StepIcon({ status }: { status: TaskStatus }) {
  if (status === 'completed') return <CheckCircle2 color={Colors.success} size={18} />;
  if (status === 'running') return <Zap color={Colors.primary} size={18} />;
  if (status === 'waiting_approval') return <AlertCircle color={Colors.warning} size={18} />;
  return <Circle color={Colors.textTertiary} size={18} />;
}

export default function AgentScreen() {
  const router = useRouter();
  const [tasks, setTasks] = useState<AgentTask[]>(sampleTasks);
  const [newGoal, setNewGoal] = useState('');
  const [expandedTask, setExpandedTask] = useState<string | null>('1');

  const createTask = () => {
    if (!newGoal.trim()) return;
    const task: AgentTask = {
      id: Date.now().toString(),
      title: newGoal.trim().split(' ').slice(0, 4).join(' '),
      goal: newGoal.trim(),
      status: 'pending',
      createdAt: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
      steps: [
        { id: 's1', description: 'Analyzing your goal...', status: 'pending' },
        { id: 's2', description: 'Creating action plan...', status: 'pending' },
        { id: 's3', description: 'Executing steps...', status: 'pending' },
      ],
    };
    setTasks((prev) => [task, ...prev]);
    setNewGoal('');
    setExpandedTask(task.id);
  };

  const approveStep = (taskId: string, stepId: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              steps: t.steps.map((s) =>
                s.id === stepId ? { ...s, status: 'completed' } : s,
              ),
            }
          : t,
      ),
    );
  };

  const deleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    if (expandedTask === taskId) setExpandedTask(null);
  };

  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const activeCount = tasks.filter((t) => t.status === 'running').length;

  return (
    <View style={styles.container}>
      <LinearGradient colors={[Colors.background, Colors.backgroundSecondary]} style={styles.gradient}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <Animated.View entering={FadeInUp.duration(600)} style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ChevronLeft color={Colors.textSecondary} size={24} />
            </TouchableOpacity>
            <Bot color={Colors.primary} size={28} />
            <Text style={styles.headerTitle}>AI Agent</Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(600).delay(100)} style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{tasks.length}</Text>
              <Text style={styles.statLabel}>Total Tasks</Text>
            </View>
            <View style={[styles.statCard, { borderColor: Colors.primary + '50' }]}>
              <Text style={[styles.statValue, { color: Colors.primary }]}>{activeCount}</Text>
              <Text style={styles.statLabel}>Running</Text>
            </View>
            <View style={[styles.statCard, { borderColor: Colors.success + '50' }]}>
              <Text style={[styles.statValue, { color: Colors.success }]}>{completedCount}</Text>
              <Text style={styles.statLabel}>Done</Text>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(600).delay(200)} style={styles.section}>
            <Text style={styles.sectionTitle}>New Task</Text>
            <View style={styles.newTaskCard}>
              <TextInput
                style={styles.goalInput}
                placeholder="Describe a goal for Vexora Agent..."
                placeholderTextColor={Colors.textTertiary}
                value={newGoal}
                onChangeText={setNewGoal}
                multiline
                maxLength={300}
              />
              <TouchableOpacity
                onPress={createTask}
                style={[styles.createButton, !newGoal.trim() && styles.createButtonDisabled]}
                disabled={!newGoal.trim()}
              >
                <Plus color={newGoal.trim() ? Colors.background : Colors.textTertiary} size={20} />
                <Text style={[styles.createButtonText, !newGoal.trim() && styles.createButtonTextDisabled]}>
                  Create Agent Task
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.exampleRow}>
              {['Plan a trip', 'Build study plan', 'Research a topic'].map((ex) => (
                <TouchableOpacity key={ex} onPress={() => setNewGoal(ex)} style={styles.exampleChip}>
                  <Text style={styles.exampleChipText}>{ex}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(600).delay(300)} style={styles.section}>
            <Text style={styles.sectionTitle}>Tasks</Text>
            <View style={styles.taskList}>
              {tasks.map((task) => (
                <View key={task.id} style={styles.taskCard}>
                  <TouchableOpacity
                    onPress={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
                    style={styles.taskHeader}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.statusDot, { backgroundColor: statusColors[task.status] }]} />
                    <View style={styles.taskTitleWrap}>
                      <Text style={styles.taskTitle} numberOfLines={1}>{task.title}</Text>
                      <Text style={styles.taskTime}>{task.createdAt}</Text>
                    </View>
                    <View style={[styles.statusBadge, { borderColor: statusColors[task.status] + '60' }]}>
                      <Text style={[styles.statusBadgeText, { color: statusColors[task.status] }]}>
                        {statusLabels[task.status]}
                      </Text>
                    </View>
                    <ChevronRight
                      color={Colors.textTertiary}
                      size={16}
                      style={{ transform: [{ rotate: expandedTask === task.id ? '90deg' : '0deg' }] }}
                    />
                  </TouchableOpacity>

                  {expandedTask === task.id && (
                    <View style={styles.taskBody}>
                      <Text style={styles.taskGoal}>{task.goal}</Text>
                      <View style={styles.stepsList}>
                        {task.steps.map((step, i) => (
                          <View key={step.id} style={styles.stepRow}>
                            <View style={styles.stepLine}>
                              <StepIcon status={step.status} />
                              {i < task.steps.length - 1 && (
                                <View style={[styles.stepConnector, { backgroundColor: i < task.steps.findIndex((s) => s.status !== 'completed') ? Colors.success : Colors.border }]} />
                              )}
                            </View>
                            <View style={styles.stepContent}>
                              <Text style={[styles.stepDesc, step.status === 'completed' && styles.stepDescDone]}>
                                {step.description}
                              </Text>
                              {step.status === 'waiting_approval' && (
                                <TouchableOpacity
                                  onPress={() => approveStep(task.id, step.id)}
                                  style={styles.approveButton}
                                >
                                  <CheckCircle2 color={Colors.background} size={14} />
                                  <Text style={styles.approveButtonText}>Approve</Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          </View>
                        ))}
                      </View>
                      <View style={styles.taskActions}>
                        {task.status === 'running' && (
                          <TouchableOpacity style={styles.taskActionBtn}>
                            <Pause color={Colors.warning} size={16} />
                            <Text style={[styles.taskActionText, { color: Colors.warning }]}>Pause</Text>
                          </TouchableOpacity>
                        )}
                        {task.status === 'paused' && (
                          <TouchableOpacity style={styles.taskActionBtn}>
                            <Play color={Colors.primary} size={16} />
                            <Text style={[styles.taskActionText, { color: Colors.primary }]}>Resume</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity onPress={() => deleteTask(task.id)} style={styles.taskActionBtn}>
                          <Trash2 color={Colors.error} size={16} />
                          <Text style={[styles.taskActionText, { color: Colors.error }]}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              ))}
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
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxxl + Spacing.md,
    marginBottom: Spacing.xl, gap: Spacing.md,
  },
  backButton: { padding: Spacing.xs },
  headerTitle: { fontSize: FontSizes.xxl, fontWeight: '700', color: Colors.text },
  statsRow: { flexDirection: 'row', paddingHorizontal: Spacing.lg, gap: Spacing.md, marginBottom: Spacing.xl },
  statCard: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border, alignItems: 'center',
  },
  statValue: { fontSize: FontSizes.xxl, fontWeight: '700', color: Colors.text },
  statLabel: { fontSize: FontSizes.xs, color: Colors.textTertiary, marginTop: 2 },
  section: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.xl },
  sectionTitle: {
    fontSize: FontSizes.md, fontWeight: '700', color: Colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: Spacing.md,
  },
  newTaskCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  goalInput: {
    fontSize: FontSizes.md, color: Colors.text, minHeight: 72,
    lineHeight: 22, textAlignVertical: 'top', marginBottom: Spacing.md,
  },
  createButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary, borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md, gap: Spacing.sm,
  },
  createButtonDisabled: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  createButtonText: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.background },
  createButtonTextDisabled: { color: Colors.textTertiary },
  exampleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  exampleChip: {
    backgroundColor: Colors.backgroundTertiary, borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderWidth: 1, borderColor: Colors.border,
  },
  exampleChipText: { fontSize: FontSizes.xs, color: Colors.textSecondary, fontWeight: '500' },
  taskList: { gap: Spacing.md },
  taskCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
  },
  taskHeader: {
    flexDirection: 'row', alignItems: 'center',
    padding: Spacing.md, gap: Spacing.sm,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  taskTitleWrap: { flex: 1 },
  taskTitle: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.text },
  taskTime: { fontSize: FontSizes.xs, color: Colors.textTertiary },
  statusBadge: {
    paddingHorizontal: Spacing.sm, paddingVertical: 2,
    borderRadius: BorderRadius.sm, borderWidth: 1,
  },
  statusBadgeText: { fontSize: FontSizes.xs, fontWeight: '600' },
  taskBody: {
    borderTopWidth: 1, borderTopColor: Colors.border,
    padding: Spacing.md,
  },
  taskGoal: { fontSize: FontSizes.sm, color: Colors.textSecondary, marginBottom: Spacing.md, lineHeight: 18 },
  stepsList: { gap: 0 },
  stepRow: { flexDirection: 'row', gap: Spacing.md },
  stepLine: { alignItems: 'center', width: 20 },
  stepConnector: { width: 2, flex: 1, marginTop: 4, marginBottom: -4, minHeight: 16 },
  stepContent: { flex: 1, paddingBottom: Spacing.md },
  stepDesc: { fontSize: FontSizes.sm, color: Colors.text, lineHeight: 20 },
  stepDescDone: { color: Colors.textTertiary, textDecorationLine: 'line-through' },
  approveButton: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    backgroundColor: Colors.warning, borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm, paddingVertical: 4, marginTop: 4,
    alignSelf: 'flex-start',
  },
  approveButtonText: { fontSize: FontSizes.xs, fontWeight: '700', color: Colors.background },
  taskActions: {
    flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm,
    paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  taskActionBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, padding: Spacing.xs },
  taskActionText: { fontSize: FontSizes.sm, fontWeight: '600' },
});
