import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Modal, Pressable, Alert, ActivityIndicator, FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeIn, SlideInUp } from 'react-native-reanimated';
import {
  ChevronLeft, CheckSquare, StickyNote, TrendingUp, Target,
  Plus, Check, Trash2, ChevronRight, Pin, Flag, Calendar,
  MoreHorizontal, Circle, CheckCircle2, Filter, Search,
} from 'lucide-react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../constants/theme';
import { useRouter } from 'expo-router';
import { useTasks } from '../../hooks/useTasks';
import { useNotes } from '../../hooks/useNotes';
import { useHabits, HABIT_COLORS } from '../../hooks/useHabits';
import { Priority, Task, Note, Habit } from '../../types/data';
import { formatRelativeDate, formatRelativeTime, getLast7Days } from '../../lib/dateUtils';

type Tab = 'tasks' | 'notes' | 'habits' | 'goals';
type TaskFilter = 'all' | 'active' | 'done' | 'today';

const PRIORITY_COLORS: Record<Priority, string> = {
  low: Colors.success,
  medium: Colors.warning,
  high: Colors.error,
};

const PRIORITY_LABELS: Record<Priority, string> = { low: 'Low', medium: 'Medium', high: 'High' };

const HABIT_ICONS = ['⚡', '💧', '🏃', '📚', '🧘', '🎯', '💪', '🌱', '🍎', '😴'];

export default function ProductivityScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('tasks');

  const { tasks, loading: tLoading, addTask, toggleTask, deleteTask, clearCompleted, stats: taskStats } = useTasks();
  const { notes, loading: nLoading, addNote, deleteNote, togglePin } = useNotes();
  const { habits, loading: hLoading, addHabit, toggleToday, deleteHabit, getHabitStats, todayStats } = useHabits();

  const [taskFilter, setTaskFilter] = useState<TaskFilter>('all');
  const [taskSearch, setTaskSearch] = useState('');
  const [showAddTask, setShowAddTask] = useState(false);
  const [showAddHabit, setShowAddHabit] = useState(false);

  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>('medium');
  const [newTaskDue, setNewTaskDue] = useState<string | null>(null);

  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitColor, setNewHabitColor] = useState(HABIT_COLORS[0]);
  const [newHabitIcon, setNewHabitIcon] = useState('⚡');

  const today = new Date().toISOString().split('T')[0];
  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'tasks', label: 'Tasks', count: taskStats.total - taskStats.done },
    { id: 'notes', label: 'Notes', count: notes.length },
    { id: 'habits', label: 'Habits', count: todayStats.completed },
    { id: 'goals', label: 'Goals' },
  ];

  const filteredTasks = tasks.filter((t) => {
    const matchSearch = !taskSearch || t.text.toLowerCase().includes(taskSearch.toLowerCase());
    const matchFilter =
      taskFilter === 'all' ? true :
      taskFilter === 'active' ? !t.done :
      taskFilter === 'done' ? t.done :
      taskFilter === 'today' ? t.dueDate === today && !t.done : true;
    return matchSearch && matchFilter;
  });

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    const pOrder: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
    return pOrder[a.priority] - pOrder[b.priority];
  });

  const handleAddTask = () => {
    if (!newTaskText.trim()) return;
    addTask(newTaskText, newTaskPriority, newTaskDue);
    setNewTaskText('');
    setNewTaskPriority('medium');
    setNewTaskDue(null);
    setShowAddTask(false);
  };

  const handleAddHabit = () => {
    if (!newHabitName.trim()) return;
    addHabit(newHabitName, newHabitColor, newHabitIcon);
    setNewHabitName('');
    setNewHabitColor(HABIT_COLORS[0]);
    setNewHabitIcon('⚡');
    setShowAddHabit(false);
  };

  const confirmDeleteTask = (task: Task) => {
    Alert.alert('Delete Task', `Delete "${task.text}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteTask(task.id) },
    ]);
  };

  const confirmDeleteHabit = (habit: Habit) => {
    Alert.alert('Delete Habit', `Delete "${habit.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteHabit(habit.id) },
    ]);
  };

  const last7Days = getLast7Days();
  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const loading = tLoading || nLoading || hLoading;

  return (
    <View style={styles.container}>
      <LinearGradient colors={[Colors.background, Colors.backgroundSecondary]} style={styles.gradient}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft color={Colors.textSecondary} size={24} />
          </TouchableOpacity>
          <CheckSquare color={Colors.secondary} size={26} />
          <Text style={styles.headerTitle}>Productivity</Text>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{taskStats.done}/{taskStats.total}</Text>
            <Text style={styles.statLabel}>Tasks Done</Text>
          </View>
          <View style={[styles.statCard, { borderColor: Colors.success + '50' }]}>
            <Text style={[styles.statValue, { color: Colors.success }]}>
              {todayStats.completed}/{todayStats.total}
            </Text>
            <Text style={styles.statLabel}>Habits Today</Text>
          </View>
          <View style={[styles.statCard, { borderColor: Colors.secondary + '50' }]}>
            <Text style={[styles.statValue, { color: Colors.secondary }]}>{notes.length}</Text>
            <Text style={styles.statLabel}>Notes</Text>
          </View>
        </View>

        {/* Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabScrollView}
          contentContainerStyle={styles.tabRow}
        >
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            >
              <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
                {tab.label}
              </Text>
              {tab.count !== undefined && tab.count > 0 && (
                <View style={[styles.tabBadge, activeTab === tab.id && styles.tabBadgeActive]}>
                  <Text style={[styles.tabBadgeText, activeTab === tab.id && styles.tabBadgeTextActive]}>
                    {tab.count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={Colors.primary} />
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* ── TASKS ── */}
            {activeTab === 'tasks' && (
              <Animated.View entering={FadeIn.duration(300)}>
                <View style={styles.section}>
                  {/* Search & filter */}
                  <View style={styles.searchRow}>
                    <View style={styles.searchWrap}>
                      <Search color={Colors.textTertiary} size={16} />
                      <TextInput
                        style={styles.searchInput}
                        placeholder="Search tasks..."
                        placeholderTextColor={Colors.textTertiary}
                        value={taskSearch}
                        onChangeText={setTaskSearch}
                      />
                    </View>
                  </View>

                  <ScrollView horizontal showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterRow}>
                    {(['all', 'active', 'today', 'done'] as TaskFilter[]).map((f) => (
                      <TouchableOpacity
                        key={f}
                        onPress={() => setTaskFilter(f)}
                        style={[styles.filterChip, taskFilter === f && styles.filterChipActive]}
                      >
                        <Text style={[styles.filterChipText, taskFilter === f && styles.filterChipTextActive]}>
                          {f === 'all' ? 'All' : f === 'active' ? 'Active' : f === 'today' ? 'Due Today' : 'Completed'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  {/* Add task button */}
                  <TouchableOpacity
                    style={styles.addTaskInline}
                    onPress={() => setShowAddTask(true)}
                    activeOpacity={0.7}
                  >
                    <Plus color={Colors.secondary} size={18} />
                    <Text style={styles.addTaskInlineText}>Add new task</Text>
                  </TouchableOpacity>

                  {/* Task list */}
                  {sortedTasks.length === 0 ? (
                    <View style={styles.emptyState}>
                      <CheckCircle2 color={Colors.textTertiary} size={40} />
                      <Text style={styles.emptyTitle}>
                        {taskFilter === 'done' ? 'No completed tasks' :
                         taskFilter === 'today' ? 'Nothing due today' : 'No tasks yet'}
                      </Text>
                      <Text style={styles.emptyDesc}>
                        {taskFilter === 'all' ? 'Tap "+ Add new task" to get started' : 'Change filter to see more'}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.taskList}>
                      {sortedTasks.map((task) => (
                        <TaskRow
                          key={task.id}
                          task={task}
                          onToggle={() => toggleTask(task.id)}
                          onDelete={() => confirmDeleteTask(task)}
                        />
                      ))}
                    </View>
                  )}

                  {taskStats.done > 0 && (
                    <TouchableOpacity onPress={clearCompleted} style={styles.clearCompleted}>
                      <Text style={styles.clearCompletedText}>Clear {taskStats.done} completed</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </Animated.View>
            )}

            {/* ── NOTES ── */}
            {activeTab === 'notes' && (
              <Animated.View entering={FadeIn.duration(300)}>
                <View style={styles.section}>
                  <TouchableOpacity
                    style={styles.addTaskInline}
                    onPress={() => router.push('/productivity/note' as any)}
                    activeOpacity={0.7}
                  >
                    <Plus color={Colors.secondary} size={18} />
                    <Text style={styles.addTaskInlineText}>New note</Text>
                  </TouchableOpacity>

                  {notes.length === 0 ? (
                    <View style={styles.emptyState}>
                      <StickyNote color={Colors.textTertiary} size={40} />
                      <Text style={styles.emptyTitle}>No notes yet</Text>
                      <Text style={styles.emptyDesc}>Tap "New note" to capture your thoughts</Text>
                    </View>
                  ) : (
                    <View style={styles.notesGrid}>
                      {notes.map((note) => (
                        <NoteCard
                          key={note.id}
                          note={note}
                          onPress={() => router.push({ pathname: '/productivity/note', params: { id: note.id } } as any)}
                          onPin={() => togglePin(note.id)}
                          onDelete={() => deleteNote(note.id)}
                        />
                      ))}
                    </View>
                  )}
                </View>
              </Animated.View>
            )}

            {/* ── HABITS ── */}
            {activeTab === 'habits' && (
              <Animated.View entering={FadeIn.duration(300)}>
                <View style={styles.section}>
                  <TouchableOpacity
                    style={styles.addTaskInline}
                    onPress={() => setShowAddHabit(true)}
                    activeOpacity={0.7}
                  >
                    <Plus color={Colors.secondary} size={18} />
                    <Text style={styles.addTaskInlineText}>Add habit</Text>
                  </TouchableOpacity>

                  {/* Day header */}
                  {habits.length > 0 && (
                    <View style={styles.dayHeader}>
                      <Text style={styles.dayHeaderLabel}>Last 7 days</Text>
                      <View style={styles.dayLabels}>
                        {last7Days.map((d, i) => {
                          const dayOfWeek = new Date(d).getDay();
                          return (
                            <View key={d} style={styles.dayLabelCol}>
                              <Text style={[styles.dayLabelText, d === today && styles.dayLabelToday]}>
                                {dayLabels[dayOfWeek]}
                              </Text>
                              {d === today && <View style={styles.dayLabelDot} />}
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  )}

                  {habits.length === 0 ? (
                    <View style={styles.emptyState}>
                      <TrendingUp color={Colors.textTertiary} size={40} />
                      <Text style={styles.emptyTitle}>No habits yet</Text>
                      <Text style={styles.emptyDesc}>Build consistent routines with Vexora</Text>
                    </View>
                  ) : (
                    <View style={styles.habitList}>
                      {habits.map((habit) => {
                        const { completedToday, streak, last7Completions } = getHabitStats(habit);
                        return (
                          <HabitRow
                            key={habit.id}
                            habit={habit}
                            completedToday={completedToday}
                            streak={streak}
                            last7={last7Completions}
                            onToggle={() => toggleToday(habit.id)}
                            onDelete={() => confirmDeleteHabit(habit)}
                          />
                        );
                      })}
                    </View>
                  )}
                </View>
              </Animated.View>
            )}

            {/* ── GOALS ── */}
            {activeTab === 'goals' && (
              <Animated.View entering={FadeIn.duration(300)}>
                <View style={[styles.section, styles.goalsEmpty]}>
                  <Target color={Colors.textTertiary} size={48} />
                  <Text style={styles.emptyTitle}>Goals coming soon</Text>
                  <Text style={styles.emptyDesc}>
                    Ask Vexora Agent to help you create and track your goals with milestones.
                  </Text>
                  <TouchableOpacity
                    style={styles.goalsButton}
                    onPress={() => router.push('/agent' as any)}
                  >
                    <Text style={styles.goalsButtonText}>Open AI Agent</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            )}
          </ScrollView>
        )}

        {/* Add Task Modal */}
        <Modal visible={showAddTask} transparent animationType="slide">
          <Pressable style={styles.modalOverlay} onPress={() => setShowAddTask(false)}>
            <Pressable style={styles.modalSheet} onPress={() => {}}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>New Task</Text>

              <TextInput
                style={styles.modalInput}
                placeholder="What needs to be done?"
                placeholderTextColor={Colors.textTertiary}
                value={newTaskText}
                onChangeText={setNewTaskText}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleAddTask}
              />

              <Text style={styles.modalLabel}>Priority</Text>
              <View style={styles.priorityRow}>
                {(['low', 'medium', 'high'] as Priority[]).map((p) => (
                  <TouchableOpacity
                    key={p}
                    onPress={() => setNewTaskPriority(p)}
                    style={[
                      styles.priorityChip,
                      { borderColor: PRIORITY_COLORS[p] + '60' },
                      newTaskPriority === p && { backgroundColor: PRIORITY_COLORS[p] + '20', borderColor: PRIORITY_COLORS[p] },
                    ]}
                  >
                    <Flag color={PRIORITY_COLORS[p]} size={14} />
                    <Text style={[styles.priorityChipText, { color: newTaskPriority === p ? PRIORITY_COLORS[p] : Colors.textTertiary }]}>
                      {PRIORITY_LABELS[p]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalLabel}>Due Date</Text>
              <View style={styles.dueDateRow}>
                {[
                  { label: 'Today', val: new Date().toISOString().split('T')[0] },
                  { label: 'Tomorrow', val: (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; })() },
                  { label: 'Next week', val: (() => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().split('T')[0]; })() },
                  { label: 'No date', val: null },
                ].map(({ label, val }) => (
                  <TouchableOpacity
                    key={label}
                    onPress={() => setNewTaskDue(val)}
                    style={[styles.dueDateChip, newTaskDue === val && styles.dueDateChipActive]}
                  >
                    <Text style={[styles.dueDateChipText, newTaskDue === val && styles.dueDateChipTextActive]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                onPress={handleAddTask}
                style={[styles.modalAddBtn, !newTaskText.trim() && styles.modalAddBtnDisabled]}
                disabled={!newTaskText.trim()}
              >
                <Check color={newTaskText.trim() ? Colors.background : Colors.textTertiary} size={20} />
                <Text style={[styles.modalAddBtnText, !newTaskText.trim() && { color: Colors.textTertiary }]}>
                  Add Task
                </Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Add Habit Modal */}
        <Modal visible={showAddHabit} transparent animationType="slide">
          <Pressable style={styles.modalOverlay} onPress={() => setShowAddHabit(false)}>
            <Pressable style={styles.modalSheet} onPress={() => {}}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>New Habit</Text>

              <TextInput
                style={styles.modalInput}
                placeholder="Habit name (e.g. Drink water)"
                placeholderTextColor={Colors.textTertiary}
                value={newHabitName}
                onChangeText={setNewHabitName}
                autoFocus
              />

              <Text style={styles.modalLabel}>Icon</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.iconRow}>
                {HABIT_ICONS.map((icon) => (
                  <TouchableOpacity
                    key={icon}
                    onPress={() => setNewHabitIcon(icon)}
                    style={[styles.iconOption, newHabitIcon === icon && { borderColor: newHabitColor }]}
                  >
                    <Text style={styles.iconText}>{icon}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.modalLabel}>Color</Text>
              <View style={styles.colorRow}>
                {HABIT_COLORS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setNewHabitColor(c)}
                    style={[styles.colorDot, { backgroundColor: c }, newHabitColor === c && styles.colorDotSelected]}
                  />
                ))}
              </View>

              <TouchableOpacity
                onPress={handleAddHabit}
                style={[styles.modalAddBtn, { backgroundColor: newHabitColor }, !newHabitName.trim() && styles.modalAddBtnDisabled]}
                disabled={!newHabitName.trim()}
              >
                <Check color={Colors.background} size={20} />
                <Text style={[styles.modalAddBtnText, { color: Colors.background }]}>Add Habit</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>
      </LinearGradient>
    </View>
  );
}

function TaskRow({
  task, onToggle, onDelete,
}: { task: Task; onToggle: () => void; onDelete: () => void }) {
  return (
    <View style={[taskStyles.row, task.done && taskStyles.rowDone]}>
      <TouchableOpacity onPress={onToggle} style={taskStyles.check} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        {task.done
          ? <CheckCircle2 color={Colors.success} size={22} />
          : <Circle color={PRIORITY_COLORS[task.priority]} size={22} />}
      </TouchableOpacity>
      <View style={taskStyles.content}>
        <Text style={[taskStyles.text, task.done && taskStyles.textDone]} numberOfLines={2}>
          {task.text}
        </Text>
        <View style={taskStyles.meta}>
          <View style={[taskStyles.priorityDot, { backgroundColor: PRIORITY_COLORS[task.priority] }]} />
          <Text style={taskStyles.priorityLabel}>{PRIORITY_LABELS[task.priority]}</Text>
          {task.dueDate && (
            <Text style={[taskStyles.dueDate, task.dueDate < new Date().toISOString().split('T')[0] && !task.done && taskStyles.overdue]}>
              · {formatRelativeDate(task.dueDate)}
            </Text>
          )}
        </View>
      </View>
      <TouchableOpacity onPress={onDelete} style={taskStyles.deleteBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Trash2 color={Colors.textTertiary} size={16} />
      </TouchableOpacity>
    </View>
  );
}

const taskStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, gap: Spacing.md,
  },
  rowDone: { opacity: 0.55 },
  check: { paddingTop: 1 },
  content: { flex: 1 },
  text: { fontSize: FontSizes.md, color: Colors.text, lineHeight: 20 },
  textDone: { textDecorationLine: 'line-through', color: Colors.textTertiary },
  meta: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 },
  priorityDot: { width: 6, height: 6, borderRadius: 3 },
  priorityLabel: { fontSize: FontSizes.xs, color: Colors.textTertiary },
  dueDate: { fontSize: FontSizes.xs, color: Colors.textTertiary },
  overdue: { color: Colors.error },
  deleteBtn: { padding: 4 },
});

function NoteCard({
  note, onPress, onPin, onDelete,
}: { note: Note; onPress: () => void; onPin: () => void; onDelete: () => void }) {
  return (
    <TouchableOpacity
      style={[noteStyles.card, { backgroundColor: note.color }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={noteStyles.cardHeader}>
        {note.pinned && <Pin color={Colors.primary} size={12} />}
        <TouchableOpacity onPress={onDelete} style={noteStyles.deleteBtn}>
          <Trash2 color={Colors.textTertiary} size={14} />
        </TouchableOpacity>
      </View>
      {note.title !== 'Untitled' && (
        <Text style={noteStyles.title} numberOfLines={1}>{note.title}</Text>
      )}
      {note.content !== '' && (
        <Text style={noteStyles.preview} numberOfLines={4}>{note.content}</Text>
      )}
      {note.tags.length > 0 && (
        <View style={noteStyles.tags}>
          {note.tags.slice(0, 3).map((tag) => (
            <Text key={tag} style={noteStyles.tag}>#{tag}</Text>
          ))}
        </View>
      )}
      <Text style={noteStyles.time}>{formatRelativeTime(note.updatedAt)}</Text>
    </TouchableOpacity>
  );
}

const noteStyles = StyleSheet.create({
  card: {
    width: '47%', borderRadius: BorderRadius.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.border,
    minHeight: 120,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 4, gap: Spacing.sm },
  deleteBtn: {},
  title: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  preview: { fontSize: FontSizes.sm, color: Colors.textSecondary, lineHeight: 18, flex: 1 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: Spacing.sm },
  tag: { fontSize: FontSizes.xs, color: Colors.primary },
  time: { fontSize: FontSizes.xs, color: Colors.textTertiary, marginTop: Spacing.sm },
});

function HabitRow({
  habit, completedToday, streak, last7, onToggle, onDelete,
}: {
  habit: Habit;
  completedToday: boolean;
  streak: number;
  last7: boolean[];
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={habitStyles.row}>
      <Text style={habitStyles.icon}>{habit.icon}</Text>
      <View style={habitStyles.content}>
        <View style={habitStyles.header}>
          <Text style={habitStyles.name}>{habit.name}</Text>
          {streak > 0 && (
            <View style={[habitStyles.streak, { borderColor: habit.color + '60' }]}>
              <TrendingUp color={habit.color} size={10} />
              <Text style={[habitStyles.streakText, { color: habit.color }]}>{streak}</Text>
            </View>
          )}
        </View>
        <View style={habitStyles.dots}>
          {last7.map((done, i) => (
            <View
              key={i}
              style={[
                habitStyles.dot,
                { backgroundColor: done ? habit.color : Colors.backgroundTertiary },
              ]}
            />
          ))}
        </View>
      </View>
      <TouchableOpacity
        onPress={onToggle}
        style={[habitStyles.checkBtn, completedToday && { backgroundColor: habit.color, borderColor: habit.color }]}
      >
        {completedToday
          ? <Check color={Colors.background} size={16} />
          : <Plus color={habit.color} size={16} />}
      </TouchableOpacity>
      <TouchableOpacity onPress={onDelete} style={habitStyles.deleteBtn}>
        <Trash2 color={Colors.textTertiary} size={14} />
      </TouchableOpacity>
    </View>
  );
}

const habitStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, gap: Spacing.md,
  },
  icon: { fontSize: 24 },
  content: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 6 },
  name: { flex: 1, fontSize: FontSizes.md, fontWeight: '600', color: Colors.text },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 2, borderWidth: 1, borderRadius: BorderRadius.sm, paddingHorizontal: 5, paddingVertical: 2 },
  streakText: { fontSize: FontSizes.xs, fontWeight: '700' },
  dots: { flexDirection: 'row', gap: 5 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  checkBtn: {
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 2, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  deleteBtn: { padding: 4 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  gradient: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxxl + Spacing.md,
    paddingBottom: Spacing.md, gap: Spacing.md,
  },
  backButton: { padding: Spacing.xs },
  headerTitle: { fontSize: FontSizes.xxl, fontWeight: '700', color: Colors.text },
  statsRow: { flexDirection: 'row', paddingHorizontal: Spacing.lg, gap: Spacing.sm, marginBottom: Spacing.lg },
  statCard: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, alignItems: 'center',
  },
  statValue: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.text },
  statLabel: { fontSize: FontSizes.xs, color: Colors.textTertiary, marginTop: 2, textAlign: 'center' },
  tabScrollView: { maxHeight: 44 },
  tabRow: { paddingHorizontal: Spacing.lg, gap: Spacing.sm, alignItems: 'center' },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full, backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
  },
  tabActive: { borderColor: Colors.secondary, backgroundColor: Colors.secondary + '15' },
  tabText: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.textTertiary },
  tabTextActive: { color: Colors.secondary },
  tabBadge: {
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: Colors.border, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeActive: { backgroundColor: Colors.secondary },
  tabBadgeText: { fontSize: 10, fontWeight: '700', color: Colors.textTertiary },
  tabBadgeTextActive: { color: Colors.background },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  scrollContent: { paddingBottom: Spacing.xxxl },
  section: { padding: Spacing.lg },
  searchRow: { marginBottom: Spacing.md },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  searchInput: { flex: 1, fontSize: FontSizes.md, color: Colors.text },
  filterRow: { gap: Spacing.sm, marginBottom: Spacing.md },
  filterChip: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm - 2,
    borderRadius: BorderRadius.full, backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
  },
  filterChipActive: { borderColor: Colors.secondary, backgroundColor: Colors.secondary + '15' },
  filterChipText: { fontSize: FontSizes.xs, fontWeight: '600', color: Colors.textTertiary },
  filterChipTextActive: { color: Colors.secondary },
  addTaskInline: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.secondary + '10', borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.secondary + '40',
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  addTaskInlineText: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.secondary },
  emptyState: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.md },
  emptyTitle: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.text },
  emptyDesc: { fontSize: FontSizes.sm, color: Colors.textTertiary, textAlign: 'center' },
  taskList: { gap: Spacing.sm },
  clearCompleted: { marginTop: Spacing.lg, alignItems: 'center' },
  clearCompletedText: { fontSize: FontSizes.sm, color: Colors.error, fontWeight: '500' },
  notesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  habitList: { gap: Spacing.md },
  dayHeader: { marginBottom: Spacing.md },
  dayHeaderLabel: { fontSize: FontSizes.xs, color: Colors.textTertiary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 },
  dayLabels: { flexDirection: 'row', justifyContent: 'flex-end', gap: 5 },
  dayLabelCol: { width: 8, alignItems: 'center', gap: 3 },
  dayLabelText: { fontSize: 9, color: Colors.textTertiary, fontWeight: '600' },
  dayLabelToday: { color: Colors.primary },
  dayLabelDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: Colors.primary },
  goalsEmpty: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.lg },
  goalsButton: {
    backgroundColor: Colors.secondary, paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md, borderRadius: BorderRadius.md,
  },
  goalsButtonText: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.background },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.backgroundSecondary, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: Spacing.xl, paddingBottom: Spacing.xxxl, gap: Spacing.md,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border,
    alignSelf: 'center', marginBottom: Spacing.sm,
  },
  modalTitle: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.text, marginBottom: Spacing.sm },
  modalInput: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md, fontSize: FontSizes.md, color: Colors.text,
  },
  modalLabel: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.textSecondary },
  priorityRow: { flexDirection: 'row', gap: Spacing.md },
  priorityChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: Spacing.md, borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface, borderWidth: 1, gap: Spacing.xs,
  },
  priorityChipText: { fontSize: FontSizes.sm, fontWeight: '600' },
  dueDateRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  dueDateChip: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full, backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
  },
  dueDateChipActive: { borderColor: Colors.primary, backgroundColor: 'rgba(0,229,255,0.1)' },
  dueDateChipText: { fontSize: FontSizes.sm, color: Colors.textTertiary, fontWeight: '500' },
  dueDateChipTextActive: { color: Colors.primary },
  modalAddBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.secondary, borderRadius: BorderRadius.md,
    paddingVertical: Spacing.lg, gap: Spacing.sm, marginTop: Spacing.sm,
  },
  modalAddBtnDisabled: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  modalAddBtnText: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.background },
  iconRow: { gap: Spacing.sm, paddingVertical: Spacing.xs },
  iconOption: {
    width: 44, height: 44, borderRadius: BorderRadius.md, borderWidth: 2,
    borderColor: Colors.border, backgroundColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  iconText: { fontSize: 22 },
  colorRow: { flexDirection: 'row', gap: Spacing.md, flexWrap: 'wrap' },
  colorDot: { width: 32, height: 32, borderRadius: 16, borderWidth: 3, borderColor: 'transparent' },
  colorDotSelected: { borderColor: Colors.text },
});
