import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';
import {
  ChevronLeft, CheckSquare, StickyNote, Target, Calendar,
  Plus, Check, Trash2, Bell, TrendingUp, ChevronRight,
} from 'lucide-react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../constants/theme';
import { useRouter } from 'expo-router';

type ProductivityTab = 'tasks' | 'notes' | 'habits' | 'goals';

interface Task {
  id: string;
  text: string;
  done: boolean;
  priority: 'low' | 'medium' | 'high';
}

interface Note {
  id: string;
  title: string;
  preview: string;
  time: string;
}

interface Habit {
  id: string;
  name: string;
  streak: number;
  target: number;
  completedToday: boolean;
  color: string;
}

const sampleTasks: Task[] = [
  { id: '1', text: 'Review project proposal', done: false, priority: 'high' },
  { id: '2', text: 'Reply to emails', done: true, priority: 'medium' },
  { id: '3', text: 'Prepare presentation slides', done: false, priority: 'high' },
  { id: '4', text: 'Schedule team meeting', done: false, priority: 'low' },
];

const sampleNotes: Note[] = [
  { id: '1', title: 'Meeting Notes', preview: 'Discussed Q3 goals and roadmap...', time: '2 hours ago' },
  { id: '2', title: 'Ideas for App', preview: 'Feature ideas: dark mode, export...', time: 'Yesterday' },
  { id: '3', title: 'Study Summary', preview: 'Calculus chapter 5 key points...', time: '3 days ago' },
];

const sampleHabits: Habit[] = [
  { id: '1', name: 'Drink Water (8 glasses)', streak: 5, target: 8, completedToday: true, color: Colors.primary },
  { id: '2', name: 'Morning Workout', streak: 12, target: 30, completedToday: false, color: Colors.success },
  { id: '3', name: 'Read for 20 minutes', streak: 3, target: 20, completedToday: true, color: Colors.accent },
  { id: '4', name: 'Meditate', streak: 0, target: 10, completedToday: false, color: Colors.secondary },
];

const priorityColors = { low: Colors.success, medium: Colors.warning, high: Colors.error };

export default function ProductivityScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ProductivityTab>('tasks');
  const [tasks, setTasks] = useState<Task[]>(sampleTasks);
  const [habits, setHabits] = useState<Habit[]>(sampleHabits);
  const [newTask, setNewTask] = useState('');

  const tabs: { id: ProductivityTab; label: string; icon: typeof CheckSquare }[] = [
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'notes', label: 'Notes', icon: StickyNote },
    { id: 'habits', label: 'Habits', icon: TrendingUp },
    { id: 'goals', label: 'Goals', icon: Target },
  ];

  const toggleTask = (id: string) =>
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));

  const deleteTask = (id: string) => setTasks((prev) => prev.filter((t) => t.id !== id));

  const addTask = () => {
    if (!newTask.trim()) return;
    setTasks((prev) => [
      { id: Date.now().toString(), text: newTask.trim(), done: false, priority: 'medium' },
      ...prev,
    ]);
    setNewTask('');
  };

  const toggleHabit = (id: string) =>
    setHabits((prev) => prev.map((h) => (h.id === id ? { ...h, completedToday: !h.completedToday } : h)));

  const completedTasks = tasks.filter((t) => t.done).length;
  const totalTasks = tasks.length;
  const habitsCompleted = habits.filter((h) => h.completedToday).length;

  return (
    <View style={styles.container}>
      <LinearGradient colors={[Colors.background, Colors.backgroundSecondary]} style={styles.gradient}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <Animated.View entering={FadeInUp.duration(600)} style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ChevronLeft color={Colors.textSecondary} size={24} />
            </TouchableOpacity>
            <CheckSquare color={Colors.secondary} size={28} />
            <Text style={styles.headerTitle}>Productivity</Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(600).delay(100)} style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{completedTasks}/{totalTasks}</Text>
              <Text style={styles.summaryLabel}>Tasks Done</Text>
            </View>
            <View style={[styles.summaryCard, { borderColor: Colors.success + '50' }]}>
              <Text style={[styles.summaryValue, { color: Colors.success }]}>{habitsCompleted}/{habits.length}</Text>
              <Text style={styles.summaryLabel}>Habits Today</Text>
            </View>
            <View style={[styles.summaryCard, { borderColor: Colors.accent + '50' }]}>
              <Text style={[styles.summaryValue, { color: Colors.accent }]}>3</Text>
              <Text style={styles.summaryLabel}>Upcoming</Text>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(600).delay(150)} style={styles.tabSection}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
              {tabs.map((tab) => {
                const TabIcon = tab.icon;
                return (
                  <TouchableOpacity
                    key={tab.id}
                    onPress={() => setActiveTab(tab.id)}
                    style={[styles.tab, activeTab === tab.id && styles.tabActive]}
                  >
                    <TabIcon color={activeTab === tab.id ? Colors.secondary : Colors.textTertiary} size={16} />
                    <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Animated.View>

          {activeTab === 'tasks' && (
            <Animated.View entering={FadeInUp.duration(500)} style={styles.section}>
              <View style={styles.addRow}>
                <TextInput
                  style={styles.addInput}
                  placeholder="Add a new task..."
                  placeholderTextColor={Colors.textTertiary}
                  value={newTask}
                  onChangeText={setNewTask}
                  onSubmitEditing={addTask}
                />
                <TouchableOpacity onPress={addTask} style={styles.addBtn} disabled={!newTask.trim()}>
                  <Plus color={newTask.trim() ? Colors.background : Colors.textTertiary} size={20} />
                </TouchableOpacity>
              </View>
              <View style={styles.taskList}>
                {tasks.map((task) => (
                  <View key={task.id} style={[styles.taskItem, task.done && styles.taskItemDone]}>
                    <TouchableOpacity onPress={() => toggleTask(task.id)} style={styles.taskCheck}>
                      {task.done ? (
                        <View style={styles.checkFilled}>
                          <Check color={Colors.background} size={14} />
                        </View>
                      ) : (
                        <View style={[styles.checkEmpty, { borderColor: priorityColors[task.priority] }]} />
                      )}
                    </TouchableOpacity>
                    <Text style={[styles.taskText, task.done && styles.taskTextDone]}>
                      {task.text}
                    </Text>
                    <View style={[styles.priorityDot, { backgroundColor: priorityColors[task.priority] }]} />
                    <TouchableOpacity onPress={() => deleteTask(task.id)} style={styles.deleteBtn}>
                      <Trash2 color={Colors.textTertiary} size={14} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </Animated.View>
          )}

          {activeTab === 'notes' && (
            <Animated.View entering={FadeInUp.duration(500)} style={styles.section}>
              <TouchableOpacity style={styles.newNoteButton}>
                <Plus color={Colors.secondary} size={18} />
                <Text style={styles.newNoteText}>New Note</Text>
              </TouchableOpacity>
              <View style={styles.notesList}>
                {sampleNotes.map((note) => (
                  <TouchableOpacity key={note.id} style={styles.noteCard} activeOpacity={0.7}>
                    <StickyNote color={Colors.secondary} size={16} />
                    <View style={styles.noteContent}>
                      <Text style={styles.noteTitle}>{note.title}</Text>
                      <Text style={styles.notePreview} numberOfLines={1}>{note.preview}</Text>
                      <Text style={styles.noteTime}>{note.time}</Text>
                    </View>
                    <ChevronRight color={Colors.textTertiary} size={16} />
                  </TouchableOpacity>
                ))}
              </View>
            </Animated.View>
          )}

          {activeTab === 'habits' && (
            <Animated.View entering={FadeInUp.duration(500)} style={styles.section}>
              <View style={styles.habitList}>
                {habits.map((habit) => (
                  <View key={habit.id} style={styles.habitCard}>
                    <View style={styles.habitHeader}>
                      <Text style={styles.habitName}>{habit.name}</Text>
                      <View style={styles.streakBadge}>
                        <TrendingUp color={habit.color} size={12} />
                        <Text style={[styles.streakText, { color: habit.color }]}>{habit.streak} streak</Text>
                      </View>
                    </View>
                    <View style={styles.habitTrack}>
                      <View style={styles.habitBar}>
                        <View style={[styles.habitFill, { width: habit.completedToday ? '100%' : '0%', backgroundColor: habit.color }]} />
                      </View>
                      <TouchableOpacity
                        onPress={() => toggleHabit(habit.id)}
                        style={[styles.habitCheck, habit.completedToday && { backgroundColor: habit.color }]}
                      >
                        {habit.completedToday ? (
                          <Check color={Colors.background} size={16} />
                        ) : (
                          <Plus color={habit.color} size={16} />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            </Animated.View>
          )}

          {activeTab === 'goals' && (
            <Animated.View entering={FadeInUp.duration(500)} style={styles.section}>
              <View style={styles.emptyGoals}>
                <Target color={Colors.textTertiary} size={48} />
                <Text style={styles.emptyTitle}>Set Your Goals</Text>
                <Text style={styles.emptyDesc}>
                  Ask Vexora to help you create and track your personal and professional goals.
                </Text>
                <TouchableOpacity style={styles.emptyButton}>
                  <Sparkles color={Colors.background} size={18} />
                  <Text style={styles.emptyButtonText}>Create Goal with AI</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

function Sparkles({ color, size }: { color: string; size: number }) {
  return <Target color={color} size={size} />;
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
  summaryRow: { flexDirection: 'row', paddingHorizontal: Spacing.lg, gap: Spacing.md, marginBottom: Spacing.xl },
  summaryCard: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border, alignItems: 'center',
  },
  summaryValue: { fontSize: FontSizes.xxl, fontWeight: '700', color: Colors.text },
  summaryLabel: { fontSize: FontSizes.xs, color: Colors.textTertiary, marginTop: 2 },
  tabSection: { marginBottom: Spacing.xl },
  tabRow: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.full, backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
  },
  tabActive: { borderColor: Colors.secondary, backgroundColor: Colors.secondary + '15' },
  tabText: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.textTertiary },
  tabTextActive: { color: Colors.secondary },
  section: { paddingHorizontal: Spacing.lg },
  addRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  addInput: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2, fontSize: FontSizes.md, color: Colors.text,
  },
  addBtn: {
    width: 44, height: 44, borderRadius: BorderRadius.md,
    backgroundColor: Colors.secondary, alignItems: 'center', justifyContent: 'center',
  },
  taskList: { gap: Spacing.sm },
  taskItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.border, gap: Spacing.sm,
  },
  taskItemDone: { opacity: 0.6 },
  taskCheck: { padding: 2 },
  checkFilled: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.success,
    alignItems: 'center', justifyContent: 'center',
  },
  checkEmpty: { width: 22, height: 22, borderRadius: 11, borderWidth: 2 },
  taskText: { flex: 1, fontSize: FontSizes.md, color: Colors.text },
  taskTextDone: { textDecorationLine: 'line-through', color: Colors.textTertiary },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },
  deleteBtn: { padding: Spacing.xs },
  newNoteButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.secondary + '15', borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.secondary + '40',
    paddingVertical: Spacing.md, gap: Spacing.sm, marginBottom: Spacing.lg,
  },
  newNoteText: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.secondary },
  notesList: { gap: Spacing.md },
  noteCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.border, gap: Spacing.md,
  },
  noteContent: { flex: 1 },
  noteTitle: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.text, marginBottom: 2 },
  notePreview: { fontSize: FontSizes.xs, color: Colors.textTertiary, marginBottom: 2 },
  noteTime: { fontSize: FontSizes.xs, color: Colors.textTertiary },
  habitList: { gap: Spacing.md },
  habitCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.border,
  },
  habitHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  habitName: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.text, flex: 1 },
  streakBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  streakText: { fontSize: FontSizes.xs, fontWeight: '700' },
  habitTrack: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  habitBar: { flex: 1, height: 6, borderRadius: 3, backgroundColor: Colors.backgroundTertiary, overflow: 'hidden' },
  habitFill: { height: '100%', borderRadius: 3 },
  habitCheck: {
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 2, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyGoals: { alignItems: 'center', paddingVertical: Spacing.xxxl, gap: Spacing.lg },
  emptyTitle: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.text },
  emptyDesc: { fontSize: FontSizes.sm, color: Colors.textTertiary, textAlign: 'center', lineHeight: 20, maxWidth: 280 },
  emptyButton: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.secondary, paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md, borderRadius: BorderRadius.md,
  },
  emptyButtonText: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.background },
});
