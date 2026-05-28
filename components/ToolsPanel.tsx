import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Modal, Pressable, Animated, Alert, Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  X, Plus, CheckCircle2, Circle, Trash2, Target, FileText, Lightbulb,
  Timer, Brain, BookOpen, ChevronDown, ChevronUp, Star, Zap,
  RefreshCw, Play, Pause, RotateCcw, BarChart2, Flame,
} from 'lucide-react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '../constants/theme';
import {
  getTasks, addTask, toggleTask, deleteTask, clearCompletedTasks, Task,
  getNotes, addNote, deleteNote, Note,
  getGoals, addGoal, updateGoalProgress, deleteGoal, Goal,
  getIdeas, addIdea, deleteIdea, Idea,
  getHabits, addHabit, toggleHabitToday, deleteHabit, HabitEntry,
} from '../lib/productivity';
import { sendToAI } from '../lib/ai';

type Tab = 'tasks' | 'notes' | 'goals' | 'ideas' | 'habits' | 'timer' | 'study';

interface ToolsPanelProps {
  visible: boolean;
  onClose: () => void;
  onSendToChat: (text: string) => void;
  selectedModel: string;
}

// ── Timer Tab ─────────────────────────────────────────────────────────────────

function TimerTab() {
  const [minutes, setMinutes] = useState('25');
  const [seconds, setSeconds] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const presets = [
    { label: '5 min', mins: 5 }, { label: '15 min', mins: 15 },
    { label: '25 min', mins: 25 }, { label: '45 min', mins: 45 },
  ];

  const setupTimer = (mins: number) => {
    setRunning(false);
    setDone(false);
    setMinutes(String(mins));
    setSeconds(0);
    setTotalSeconds(mins * 60);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setTotalSeconds(prev => {
          if (prev <= 1) {
            setRunning(false);
            setDone(true);
            if (intervalRef.current) clearInterval(intervalRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  const displayMins = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const displaySecs = (totalSeconds % 60).toString().padStart(2, '0');
  const startMins = parseInt(minutes) || 25;
  const progress = totalSeconds / (startMins * 60);

  return (
    <View style={ts.container}>
      <View style={ts.presets}>
        {presets.map(p => (
          <TouchableOpacity key={p.label} style={ts.preset} onPress={() => setupTimer(p.mins)}>
            <Text style={ts.presetText}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={ts.clockWrap}>
        <View style={ts.clockBg}>
          <LinearGradient
            colors={done ? [Colors.success, '#10B981'] : running ? [Colors.primary, Colors.purple] : ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.03)']}
            style={ts.clockGradient}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          >
            <Text style={ts.clockText}>{displayMins}:{displaySecs}</Text>
            <Text style={ts.clockLabel}>{done ? '✓ Done!' : running ? 'Focus' : 'Ready'}</Text>
          </LinearGradient>
        </View>
      </View>

      <View style={ts.controls}>
        <TouchableOpacity style={ts.ctrlBtn} onPress={() => setupTimer(parseInt(minutes) || 25)}>
          <RotateCcw color={Colors.textTertiary} size={20} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[ts.mainBtn, running && ts.mainBtnPause]}
          onPress={() => { if (totalSeconds > 0) setRunning(r => !r); }}
        >
          <LinearGradient
            colors={running ? [Colors.error, '#DC2626'] : [Colors.primary, Colors.purple]}
            style={ts.mainBtnGrad}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          >
            {running ? <Pause color="#fff" size={26} /> : <Play color="#fff" size={26} />}
          </LinearGradient>
        </TouchableOpacity>
        <View style={ts.ctrlBtn} />
      </View>

      <TextInput
        style={ts.customInput}
        value={minutes}
        onChangeText={v => { setMinutes(v); if (!running) { const m = parseInt(v) || 0; setTotalSeconds(m * 60); }}}
        placeholder="Custom minutes"
        placeholderTextColor={Colors.textTertiary}
        keyboardType="numeric"
        maxLength={3}
      />
    </View>
  );
}

const ts = StyleSheet.create({
  container: { padding: Spacing.md, alignItems: 'center', gap: Spacing.md },
  presets: { flexDirection: 'row', gap: Spacing.sm },
  preset: { paddingHorizontal: Spacing.md, paddingVertical: 7, borderRadius: BorderRadius.full, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: Colors.border },
  presetText: { fontSize: FontSizes.xs, color: Colors.textSecondary, fontWeight: '600' },
  clockWrap: { width: 180, height: 180, alignItems: 'center', justifyContent: 'center' },
  clockBg: { width: 160, height: 160, borderRadius: 80, overflow: 'hidden', borderWidth: 2, borderColor: Colors.border },
  clockGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  clockText: { fontSize: 36, fontWeight: '700', color: '#fff', fontFamily: 'Orbitron-Bold' },
  clockLabel: { fontSize: FontSizes.xs, color: 'rgba(255,255,255,0.7)', marginTop: 4, fontWeight: '600' },
  controls: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
  ctrlBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  mainBtn: { width: 64, height: 64, borderRadius: 32, overflow: 'hidden' },
  mainBtnPause: {},
  mainBtnGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  customInput: { width: '100%', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, color: Colors.text, textAlign: 'center', fontSize: FontSizes.sm },
});

// ── Study Tab (Flashcards) ────────────────────────────────────────────────────

function StudyTab({ onSendToChat, selectedModel }: { onSendToChat: (t: string) => void; selectedModel: string }) {
  const [topic, setTopic] = useState('');
  const [cards, setCards] = useState<{ q: string; a: string }[]>([]);
  const [current, setCurrent] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [generating, setGenerating] = useState(false);
  const flipAnim = useRef(new Animated.Value(0)).current;

  const generate = async () => {
    if (!topic.trim()) return;
    setGenerating(true);
    try {
      const { reply } = await sendToAI(selectedModel, [{
        role: 'user',
        content: `Create exactly 6 flashcard Q&A pairs about: "${topic}". Reply with ONLY a JSON array in this format, no other text: [{"q":"question?","a":"answer."}]`,
      }], 'study');
      const match = reply.match(/\[[\s\S]*\]/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        setCards(parsed);
        setCurrent(0);
        setFlipped(false);
      }
    } catch (e) {
      Alert.alert('Error', 'Could not generate flashcards. Try again.');
    } finally {
      setGenerating(false);
    }
  };

  const flip = () => {
    const toValue = flipped ? 0 : 1;
    Animated.spring(flipAnim, { toValue, useNativeDriver: true }).start();
    setFlipped(!flipped);
  };

  const next = () => {
    flipAnim.setValue(0);
    setFlipped(false);
    setCurrent(c => (c + 1) % cards.length);
  };
  const prev = () => {
    flipAnim.setValue(0);
    setFlipped(false);
    setCurrent(c => (c - 1 + cards.length) % cards.length);
  };

  const frontRotate = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const backRotate = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });

  return (
    <View style={st.container}>
      <View style={st.inputRow}>
        <TextInput
          style={[st.input, { flex: 1 }]}
          value={topic}
          onChangeText={setTopic}
          placeholder="Topic to study (e.g. Photosynthesis)"
          placeholderTextColor={Colors.textTertiary}
          returnKeyType="done"
          onSubmitEditing={generate}
        />
        <TouchableOpacity style={st.generateBtn} onPress={generate} disabled={generating}>
          <LinearGradient colors={[Colors.primary, Colors.purple]} style={st.generateGrad}>
            {generating
              ? <Brain color="#fff" size={16} />
              : <Text style={st.generateText}>Generate</Text>}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={() => onSendToChat(`Please help me study: ${topic}`)}>
        <Text style={st.chatLink}>Or ask Vexora to teach me about this →</Text>
      </TouchableOpacity>

      {cards.length > 0 && (
        <View style={st.cardArea}>
          <Text style={st.cardCounter}>{current + 1} / {cards.length}</Text>

          <TouchableOpacity style={st.cardWrap} onPress={flip} activeOpacity={0.95}>
            <Animated.View style={[st.card, st.cardFront, { transform: [{ rotateY: frontRotate }] }]}>
              <Text style={st.cardLabel}>QUESTION</Text>
              <Text style={st.cardText}>{cards[current]?.q}</Text>
              <Text style={st.cardHint}>Tap to reveal answer</Text>
            </Animated.View>
            <Animated.View style={[st.card, st.cardBack, { transform: [{ rotateY: backRotate }] }]}>
              <Text style={[st.cardLabel, { color: Colors.success }]}>ANSWER</Text>
              <Text style={st.cardText}>{cards[current]?.a}</Text>
            </Animated.View>
          </TouchableOpacity>

          <View style={st.navRow}>
            <TouchableOpacity style={st.navBtn} onPress={prev}>
              <Text style={st.navText}>← Prev</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[st.navBtn, { backgroundColor: 'rgba(0,212,255,0.1)' }]} onPress={generate}>
              <RefreshCw color={Colors.primary} size={14} />
            </TouchableOpacity>
            <TouchableOpacity style={st.navBtn} onPress={next}>
              <Text style={st.navText}>Next →</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  container: { padding: Spacing.md, gap: Spacing.md },
  inputRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  input: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2, color: Colors.text, fontSize: FontSizes.sm },
  generateBtn: { borderRadius: BorderRadius.md, overflow: 'hidden' },
  generateGrad: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 4, alignItems: 'center', justifyContent: 'center', minWidth: 80, minHeight: 40 },
  generateText: { color: '#fff', fontWeight: '700', fontSize: FontSizes.sm },
  chatLink: { fontSize: FontSizes.xs, color: Colors.primary, textDecorationLine: 'underline' },
  cardArea: { alignItems: 'center', gap: Spacing.md },
  cardCounter: { fontSize: FontSizes.xs, color: Colors.textTertiary, fontWeight: '600' },
  cardWrap: { width: '100%', height: 180 },
  card: {
    position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden',
    borderRadius: BorderRadius.lg, padding: Spacing.lg,
    alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    borderWidth: 1,
  },
  cardFront: { backgroundColor: 'rgba(0,212,255,0.08)', borderColor: 'rgba(0,212,255,0.2)' },
  cardBack: { backgroundColor: 'rgba(139,92,246,0.08)', borderColor: 'rgba(139,92,246,0.2)' },
  cardLabel: { fontSize: FontSizes.xs, fontWeight: '700', color: Colors.primary, letterSpacing: 1.5, textTransform: 'uppercase' },
  cardText: { fontSize: FontSizes.md, color: Colors.text, textAlign: 'center', lineHeight: 22 },
  cardHint: { fontSize: FontSizes.xs, color: Colors.textTertiary },
  navRow: { flexDirection: 'row', gap: Spacing.md, alignItems: 'center' },
  navBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: Colors.border },
  navText: { fontSize: FontSizes.sm, color: Colors.textSecondary, fontWeight: '600' },
});

// ── Main ToolsPanel ───────────────────────────────────────────────────────────

export default function ToolsPanel({ visible, onClose, onSendToChat, selectedModel }: ToolsPanelProps) {
  const [tab, setTab] = useState<Tab>('tasks');

  // Tasks
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState('');
  const [taskPriority, setTaskPriority] = useState<Task['priority']>('medium');

  // Notes
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [viewNote, setViewNote] = useState<Note | null>(null);

  // Goals
  const [goals, setGoals] = useState<Goal[]>([]);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [addingGoal, setAddingGoal] = useState(false);

  // Ideas
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [newIdea, setNewIdea] = useState('');

  // Habits
  const [habits, setHabits] = useState<HabitEntry[]>([]);
  const [newHabit, setNewHabit] = useState('');

  const load = useCallback(async () => {
    const [t, n, g, i, h] = await Promise.all([getTasks(), getNotes(), getGoals(), getIdeas(), getHabits()]);
    setTasks(t); setNotes(n); setGoals(g); setIdeas(i); setHabits(h);
  }, []);

  useEffect(() => { if (visible) load(); }, [visible, load]);

  const TABS: { id: Tab; icon: React.ReactNode; label: string }[] = [
    { id: 'tasks', icon: <CheckCircle2 size={16} color={tab === 'tasks' ? Colors.primary : Colors.textTertiary} />, label: 'Tasks' },
    { id: 'notes', icon: <FileText size={16} color={tab === 'notes' ? Colors.primary : Colors.textTertiary} />, label: 'Notes' },
    { id: 'goals', icon: <Target size={16} color={tab === 'goals' ? Colors.primary : Colors.textTertiary} />, label: 'Goals' },
    { id: 'ideas', icon: <Lightbulb size={16} color={tab === 'ideas' ? Colors.primary : Colors.textTertiary} />, label: 'Ideas' },
    { id: 'habits', icon: <Flame size={16} color={tab === 'habits' ? Colors.primary : Colors.textTertiary} />, label: 'Habits' },
    { id: 'timer', icon: <Timer size={16} color={tab === 'timer' ? Colors.primary : Colors.textTertiary} />, label: 'Timer' },
    { id: 'study', icon: <BookOpen size={16} color={tab === 'study' ? Colors.primary : Colors.textTertiary} />, label: 'Study' },
  ];

  const priorityColor: Record<Task['priority'], string> = { low: Colors.success, medium: Colors.warning, high: Colors.error };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={p.container}>
        {/* Header */}
        <View style={p.header}>
          <View>
            <Text style={p.title}>Tools</Text>
            <Text style={p.subtitle}>Productivity & Learning</Text>
          </View>
          <TouchableOpacity style={p.closeBtn} onPress={onClose}>
            <X color={Colors.textSecondary} size={20} />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={p.tabsScroll} contentContainerStyle={p.tabs}>
          {TABS.map(t => (
            <TouchableOpacity
              key={t.id}
              style={[p.tab, tab === t.id && p.tabActive]}
              onPress={() => setTab(t.id)}
            >
              {t.icon}
              <Text style={[p.tabText, tab === t.id && p.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView style={p.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* TASKS */}
          {tab === 'tasks' && (
            <View style={p.section}>
              <View style={p.addRow}>
                <TextInput
                  style={[p.input, { flex: 1 }]}
                  value={newTask}
                  onChangeText={setNewTask}
                  placeholder="Add a task..."
                  placeholderTextColor={Colors.textTertiary}
                  returnKeyType="done"
                  onSubmitEditing={async () => {
                    if (!newTask.trim()) return;
                    await addTask(newTask, taskPriority);
                    setNewTask('');
                    load();
                  }}
                />
                <View style={p.priorityRow}>
                  {(['low', 'medium', 'high'] as const).map(pr => (
                    <TouchableOpacity
                      key={pr}
                      style={[p.priorityDot, { backgroundColor: taskPriority === pr ? priorityColor[pr] : Colors.border }]}
                      onPress={() => setTaskPriority(pr)}
                    />
                  ))}
                </View>
                <TouchableOpacity style={p.addBtn} onPress={async () => { if (!newTask.trim()) return; await addTask(newTask, taskPriority); setNewTask(''); load(); }}>
                  <Plus color={Colors.primary} size={18} />
                </TouchableOpacity>
              </View>

              {tasks.length > 0 && (
                <TouchableOpacity style={p.clearRow} onPress={async () => { await clearCompletedTasks(); load(); }}>
                  <Text style={p.clearText}>Clear completed</Text>
                </TouchableOpacity>
              )}

              {tasks.map(task => (
                <View key={task.id} style={p.taskRow}>
                  <TouchableOpacity onPress={async () => { await toggleTask(task.id); load(); }}>
                    {task.done
                      ? <CheckCircle2 color={Colors.success} size={20} />
                      : <Circle color={priorityColor[task.priority]} size={20} />}
                  </TouchableOpacity>
                  <Text style={[p.taskText, task.done && p.taskDone]} numberOfLines={2}>{task.text}</Text>
                  <View style={[p.priorityBadge, { backgroundColor: `${priorityColor[task.priority]}18` }]}>
                    <Text style={[p.priorityText, { color: priorityColor[task.priority] }]}>{task.priority[0].toUpperCase()}</Text>
                  </View>
                  <TouchableOpacity onPress={async () => { await deleteTask(task.id); load(); }}>
                    <Trash2 color={Colors.textTertiary} size={15} />
                  </TouchableOpacity>
                </View>
              ))}

              {tasks.length === 0 && <Text style={p.empty}>No tasks yet. Add one above!</Text>}

              <TouchableOpacity style={p.aiBtn} onPress={() => { onSendToChat('Help me plan my tasks for today and suggest priorities.'); onClose(); }}>
                <Zap color={Colors.primary} size={14} />
                <Text style={p.aiBtnText}>Ask AI to help plan tasks</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* NOTES */}
          {tab === 'notes' && (
            <View style={p.section}>
              {viewNote ? (
                <View style={{ gap: Spacing.md }}>
                  <TouchableOpacity onPress={() => setViewNote(null)} style={p.backRow}>
                    <Text style={p.backText}>← Back to notes</Text>
                  </TouchableOpacity>
                  <Text style={p.noteViewTitle}>{viewNote.title}</Text>
                  <Text style={p.noteViewContent}>{viewNote.content}</Text>
                  <TouchableOpacity style={p.aiBtn} onPress={() => { onSendToChat(`Please help me expand this note:\n\n${viewNote.title}\n\n${viewNote.content}`); onClose(); }}>
                    <Zap color={Colors.primary} size={14} />
                    <Text style={p.aiBtnText}>Expand this note with AI</Text>
                  </TouchableOpacity>
                </View>
              ) : addingNote ? (
                <View style={{ gap: Spacing.sm }}>
                  <TextInput style={p.input} value={newNoteTitle} onChangeText={setNewNoteTitle} placeholder="Note title" placeholderTextColor={Colors.textTertiary} />
                  <TextInput style={[p.input, { minHeight: 100, textAlignVertical: 'top' }]} value={newNoteContent} onChangeText={setNewNoteContent} placeholder="Note content..." placeholderTextColor={Colors.textTertiary} multiline />
                  <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                    <TouchableOpacity style={[p.saveBtn, { flex: 1, backgroundColor: Colors.surface }]} onPress={() => setAddingNote(false)}>
                      <Text style={[p.saveBtnText, { color: Colors.textSecondary }]}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[p.saveBtn, { flex: 1 }]} onPress={async () => {
                      if (!newNoteTitle.trim()) return;
                      await addNote(newNoteTitle, newNoteContent);
                      setNewNoteTitle(''); setNewNoteContent('');
                      setAddingNote(false); load();
                    }}>
                      <Text style={p.saveBtnText}>Save Note</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <>
                  <TouchableOpacity style={p.addFullBtn} onPress={() => setAddingNote(true)}>
                    <Plus color={Colors.primary} size={16} />
                    <Text style={p.addFullText}>New Note</Text>
                  </TouchableOpacity>
                  {notes.map(n => (
                    <TouchableOpacity key={n.id} style={p.noteCard} onPress={() => setViewNote(n)}>
                      <View style={{ flex: 1 }}>
                        <Text style={p.noteTitle} numberOfLines={1}>{n.title}</Text>
                        <Text style={p.notePreview} numberOfLines={2}>{n.content}</Text>
                      </View>
                      <TouchableOpacity onPress={async () => { await deleteNote(n.id); load(); }}>
                        <Trash2 color={Colors.textTertiary} size={14} />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))}
                  {notes.length === 0 && <Text style={p.empty}>No notes yet. Tap + to add one.</Text>}
                </>
              )}
            </View>
          )}

          {/* GOALS */}
          {tab === 'goals' && (
            <View style={p.section}>
              {addingGoal ? (
                <View style={{ gap: Spacing.sm }}>
                  <TextInput style={p.input} value={newGoalTitle} onChangeText={setNewGoalTitle} placeholder="Goal title (e.g. Run 5K)" placeholderTextColor={Colors.textTertiary} />
                  <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                    <TouchableOpacity style={[p.saveBtn, { flex: 1, backgroundColor: Colors.surface }]} onPress={() => setAddingGoal(false)}>
                      <Text style={[p.saveBtnText, { color: Colors.textSecondary }]}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[p.saveBtn, { flex: 1 }]} onPress={async () => {
                      if (!newGoalTitle.trim()) return;
                      await addGoal(newGoalTitle);
                      setNewGoalTitle(''); setAddingGoal(false); load();
                    }}>
                      <Text style={p.saveBtnText}>Add Goal</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity style={p.addFullBtn} onPress={() => setAddingGoal(true)}>
                  <Plus color={Colors.primary} size={16} />
                  <Text style={p.addFullText}>New Goal</Text>
                </TouchableOpacity>
              )}

              {goals.map(g => (
                <View key={g.id} style={p.goalCard}>
                  <View style={p.goalHeader}>
                    <Text style={[p.goalTitle, g.completed && { color: Colors.success }]}>{g.title}</Text>
                    <TouchableOpacity onPress={async () => { await deleteGoal(g.id); load(); }}>
                      <Trash2 color={Colors.textTertiary} size={14} />
                    </TouchableOpacity>
                  </View>
                  <View style={p.progressBar}>
                    <View style={[p.progressFill, { width: `${(g.progress / g.target) * 100}%` }]} />
                  </View>
                  <View style={p.goalFooter}>
                    <Text style={p.goalPct}>{Math.round((g.progress / g.target) * 100)}%</Text>
                    <View style={p.progressBtns}>
                      {[10, 25, 50].map(inc => (
                        <TouchableOpacity key={inc} style={p.incBtn} onPress={async () => { await updateGoalProgress(g.id, Math.min(g.progress + inc, g.target)); load(); }}>
                          <Text style={p.incText}>+{inc}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  <TouchableOpacity style={p.aiBtn} onPress={() => { onSendToChat(`Help me create a plan to achieve this goal: "${g.title}"`); onClose(); }}>
                    <Zap color={Colors.primary} size={12} />
                    <Text style={p.aiBtnText}>Get AI plan</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {goals.length === 0 && <Text style={p.empty}>No goals yet. Set one to get started!</Text>}
            </View>
          )}

          {/* IDEAS */}
          {tab === 'ideas' && (
            <View style={p.section}>
              <View style={p.addRow}>
                <TextInput
                  style={[p.input, { flex: 1 }]}
                  value={newIdea}
                  onChangeText={setNewIdea}
                  placeholder="Capture an idea..."
                  placeholderTextColor={Colors.textTertiary}
                  multiline
                  returnKeyType="done"
                  onSubmitEditing={async () => { if (!newIdea.trim()) return; await addIdea(newIdea); setNewIdea(''); load(); }}
                />
                <TouchableOpacity style={p.addBtn} onPress={async () => { if (!newIdea.trim()) return; await addIdea(newIdea); setNewIdea(''); load(); }}>
                  <Plus color={Colors.primary} size={18} />
                </TouchableOpacity>
              </View>
              {ideas.map(idea => (
                <View key={idea.id} style={p.ideaCard}>
                  <Lightbulb color={Colors.warning} size={14} style={{ marginTop: 2 }} />
                  <Text style={p.ideaText} numberOfLines={3}>{idea.text}</Text>
                  <View style={{ flexDirection: 'column', gap: 4 }}>
                    <TouchableOpacity onPress={() => { onSendToChat(`Develop this idea further: "${idea.text}"`); onClose(); }}>
                      <Zap color={Colors.primary} size={14} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={async () => { await deleteIdea(idea.id); load(); }}>
                      <Trash2 color={Colors.textTertiary} size={14} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
              {ideas.length === 0 && <Text style={p.empty}>Your idea vault is empty. Capture your next great idea!</Text>}
            </View>
          )}

          {/* HABITS */}
          {tab === 'habits' && (
            <View style={p.section}>
              <View style={p.addRow}>
                <TextInput
                  style={[p.input, { flex: 1 }]}
                  value={newHabit}
                  onChangeText={setNewHabit}
                  placeholder="New habit (e.g. Exercise)"
                  placeholderTextColor={Colors.textTertiary}
                  returnKeyType="done"
                  onSubmitEditing={async () => { if (!newHabit.trim()) return; await addHabit(newHabit); setNewHabit(''); load(); }}
                />
                <TouchableOpacity style={p.addBtn} onPress={async () => { if (!newHabit.trim()) return; await addHabit(newHabit); setNewHabit(''); load(); }}>
                  <Plus color={Colors.primary} size={18} />
                </TouchableOpacity>
              </View>
              {habits.map(h => {
                const today = new Date().setHours(0, 0, 0, 0);
                const doneToday = h.completedDates.includes(today);
                const streak = (() => {
                  let s = 0;
                  const d = new Date(); d.setHours(0, 0, 0, 0);
                  while (h.completedDates.includes(d.getTime())) { s++; d.setDate(d.getDate() - 1); }
                  return s;
                })();
                return (
                  <View key={h.id} style={p.habitRow}>
                    <View style={[p.habitDot, { backgroundColor: h.color }]} />
                    <Text style={p.habitName}>{h.name}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Flame color={streak > 0 ? Colors.warning : Colors.textTertiary} size={12} />
                      <Text style={[p.streakText, streak > 0 && { color: Colors.warning }]}>{streak}</Text>
                    </View>
                    <TouchableOpacity style={[p.habitCheck, doneToday && p.habitCheckDone]} onPress={async () => { await toggleHabitToday(h.id); load(); }}>
                      {doneToday ? <CheckCircle2 color="#fff" size={16} /> : <Circle color={Colors.textTertiary} size={16} />}
                    </TouchableOpacity>
                    <TouchableOpacity onPress={async () => { await deleteHabit(h.id); load(); }}>
                      <Trash2 color={Colors.textTertiary} size={14} />
                    </TouchableOpacity>
                  </View>
                );
              })}
              {habits.length === 0 && <Text style={p.empty}>No habits yet. Build one habit at a time.</Text>}
            </View>
          )}

          {tab === 'timer' && <TimerTab />}
          {tab === 'study' && <StudyTab onSendToChat={t => { onSendToChat(t); onClose(); }} selectedModel={selectedModel} />}

        </ScrollView>
      </View>
    </Modal>
  );
}

const surface = 'rgba(255,255,255,0.05)' as const;

const p = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#08080F' },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg + 4, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.text },
  subtitle: { fontSize: FontSizes.xs, color: Colors.textTertiary, marginTop: 2 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: surface, alignItems: 'center', justifyContent: 'center' },
  tabsScroll: { flexGrow: 0, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tabs: { flexDirection: 'row', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.xs },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, backgroundColor: surface, borderWidth: 1, borderColor: Colors.border },
  tabActive: { borderColor: 'rgba(0,212,255,0.3)', backgroundColor: 'rgba(0,212,255,0.08)' },
  tabText: { fontSize: FontSizes.xs, fontWeight: '600', color: Colors.textTertiary },
  tabTextActive: { color: Colors.primary },
  scroll: { flex: 1 },
  section: { padding: Spacing.md, gap: Spacing.sm },

  // Input
  input: { backgroundColor: surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2, color: Colors.text, fontSize: FontSizes.sm },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,212,255,0.12)', borderWidth: 1, borderColor: 'rgba(0,212,255,0.3)', alignItems: 'center', justifyContent: 'center' },
  addFullBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: 'rgba(0,212,255,0.2)', borderStyle: 'dashed', justifyContent: 'center' },
  addFullText: { color: Colors.primary, fontWeight: '600', fontSize: FontSizes.sm },
  saveBtn: { padding: Spacing.md, borderRadius: BorderRadius.md, backgroundColor: Colors.primary, alignItems: 'center' },
  saveBtnText: { color: '#000', fontWeight: '700', fontSize: FontSizes.sm },
  priorityRow: { flexDirection: 'row', gap: 5 },
  priorityDot: { width: 12, height: 12, borderRadius: 6 },
  clearRow: { alignItems: 'flex-end' },
  clearText: { fontSize: FontSizes.xs, color: Colors.textTertiary, textDecorationLine: 'underline' },
  empty: { color: Colors.textTertiary, fontSize: FontSizes.sm, textAlign: 'center', paddingVertical: Spacing.xl },

  // Task
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.sm + 2, borderRadius: BorderRadius.md, backgroundColor: surface, borderWidth: 1, borderColor: Colors.border },
  taskText: { flex: 1, fontSize: FontSizes.sm, color: Colors.text },
  taskDone: { color: Colors.textTertiary, textDecorationLine: 'line-through' },
  priorityBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  priorityText: { fontSize: FontSizes.xs, fontWeight: '700' },

  // Note
  noteCard: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, padding: Spacing.md, borderRadius: BorderRadius.md, backgroundColor: surface, borderWidth: 1, borderColor: Colors.border },
  noteTitle: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.text },
  notePreview: { fontSize: FontSizes.xs, color: Colors.textTertiary, marginTop: 2, lineHeight: 16 },
  noteViewTitle: { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.text },
  noteViewContent: { fontSize: FontSizes.md, color: Colors.textSecondary, lineHeight: 22 },
  backRow: {},
  backText: { fontSize: FontSizes.sm, color: Colors.primary },

  // Goal
  goalCard: { padding: Spacing.md, borderRadius: BorderRadius.md, backgroundColor: surface, borderWidth: 1, borderColor: Colors.border, gap: Spacing.sm },
  goalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  goalTitle: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.text, flex: 1 },
  progressBar: { height: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 3 },
  goalFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  goalPct: { fontSize: FontSizes.sm, color: Colors.primary, fontWeight: '700' },
  progressBtns: { flexDirection: 'row', gap: 6 },
  incBtn: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.sm, backgroundColor: 'rgba(0,212,255,0.1)', borderWidth: 1, borderColor: 'rgba(0,212,255,0.2)' },
  incText: { fontSize: FontSizes.xs, color: Colors.primary, fontWeight: '700' },

  // Idea
  ideaCard: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, padding: Spacing.md, borderRadius: BorderRadius.md, backgroundColor: 'rgba(245,158,11,0.05)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.15)' },
  ideaText: { flex: 1, fontSize: FontSizes.sm, color: Colors.text, lineHeight: 20 },

  // Habit
  habitRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.sm + 2, borderRadius: BorderRadius.md, backgroundColor: surface, borderWidth: 1, borderColor: Colors.border },
  habitDot: { width: 10, height: 10, borderRadius: 5 },
  habitName: { flex: 1, fontSize: FontSizes.sm, color: Colors.text, fontWeight: '500' },
  streakText: { fontSize: FontSizes.xs, color: Colors.textTertiary, fontWeight: '700' },
  habitCheck: { width: 34, height: 34, borderRadius: 17, backgroundColor: surface, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  habitCheckDone: { backgroundColor: Colors.success, borderColor: Colors.success },

  // AI button
  aiBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Spacing.sm, paddingVertical: 6, borderRadius: BorderRadius.sm, backgroundColor: 'rgba(0,212,255,0.06)', borderWidth: 1, borderColor: 'rgba(0,212,255,0.15)', alignSelf: 'flex-start' },
  aiBtnText: { fontSize: FontSizes.xs, color: Colors.primary, fontWeight: '600' },
  surface: { backgroundColor: surface } as any,
});
