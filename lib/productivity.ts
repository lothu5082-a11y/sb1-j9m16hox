import { storage } from './storage';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Task {
  id: string;
  text: string;
  done: boolean;
  priority: 'low' | 'medium' | 'high';
  category: string;
  createdAt: number;
  doneAt?: number;
  dueDate?: number;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  pinned: boolean;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  unit: string;
  completed: boolean;
  createdAt: number;
  dueDate?: number;
  milestones: string[];
}

export interface Idea {
  id: string;
  text: string;
  category: string;
  developed: boolean;
  createdAt: number;
}

export interface HabitEntry {
  id: string;
  name: string;
  frequency: 'daily' | 'weekly';
  completedDates: number[];
  createdAt: number;
  color: string;
}

export interface CustomCommand {
  id: string;
  trigger: string;
  prompt: string;
  description: string;
  createdAt: number;
}

// ── Tasks ─────────────────────────────────────────────────────────────────────

export const getTasks = (): Promise<Task[]> =>
  storage.getJSON<Task[]>('vexora:tasks', []);

export const saveTasks = (t: Task[]): Promise<void> =>
  storage.setJSON('vexora:tasks', t);

export const addTask = async (text: string, priority: Task['priority'] = 'medium', category = 'General'): Promise<Task> => {
  const tasks = await getTasks();
  const task: Task = { id: Date.now().toString(), text, done: false, priority, category, createdAt: Date.now() };
  await saveTasks([task, ...tasks]);
  return task;
};

export const toggleTask = async (id: string): Promise<void> => {
  const tasks = await getTasks();
  await saveTasks(tasks.map(t =>
    t.id === id ? { ...t, done: !t.done, doneAt: !t.done ? Date.now() : undefined } : t
  ));
};

export const deleteTask = async (id: string): Promise<void> => {
  const tasks = await getTasks();
  await saveTasks(tasks.filter(t => t.id !== id));
};

export const clearCompletedTasks = async (): Promise<void> => {
  const tasks = await getTasks();
  await saveTasks(tasks.filter(t => !t.done));
};

// ── Notes ─────────────────────────────────────────────────────────────────────

export const getNotes = (): Promise<Note[]> =>
  storage.getJSON<Note[]>('vexora:notes', []);

export const addNote = async (title: string, content: string, tags: string[] = []): Promise<Note> => {
  const notes = await getNotes();
  const note: Note = {
    id: Date.now().toString(), title, content, pinned: false, tags,
    createdAt: Date.now(), updatedAt: Date.now(),
  };
  await storage.setJSON('vexora:notes', [note, ...notes]);
  return note;
};

export const updateNote = async (id: string, updates: Partial<Note>): Promise<void> => {
  const notes = await getNotes();
  await storage.setJSON('vexora:notes', notes.map(n =>
    n.id === id ? { ...n, ...updates, updatedAt: Date.now() } : n
  ));
};

export const deleteNote = async (id: string): Promise<void> => {
  const notes = await getNotes();
  await storage.setJSON('vexora:notes', notes.filter(n => n.id !== id));
};

// ── Goals ─────────────────────────────────────────────────────────────────────

export const getGoals = (): Promise<Goal[]> =>
  storage.getJSON<Goal[]>('vexora:goals', []);

export const addGoal = async (title: string, description = '', target = 100, unit = '%'): Promise<Goal> => {
  const goals = await getGoals();
  const goal: Goal = {
    id: Date.now().toString(), title, description, progress: 0, target, unit,
    completed: false, createdAt: Date.now(), milestones: [],
  };
  await storage.setJSON('vexora:goals', [goal, ...goals]);
  return goal;
};

export const updateGoalProgress = async (id: string, progress: number): Promise<void> => {
  const goals = await getGoals();
  await storage.setJSON('vexora:goals', goals.map(g =>
    g.id === id ? { ...g, progress: Math.min(progress, g.target), completed: progress >= g.target } : g
  ));
};

export const deleteGoal = async (id: string): Promise<void> => {
  const goals = await getGoals();
  await storage.setJSON('vexora:goals', goals.filter(g => g.id !== id));
};

// ── Ideas ─────────────────────────────────────────────────────────────────────

export const getIdeas = (): Promise<Idea[]> =>
  storage.getJSON<Idea[]>('vexora:ideas', []);

export const addIdea = async (text: string, category = 'General'): Promise<Idea> => {
  const ideas = await getIdeas();
  const idea: Idea = { id: Date.now().toString(), text, category, developed: false, createdAt: Date.now() };
  await storage.setJSON('vexora:ideas', [idea, ...ideas]);
  return idea;
};

export const deleteIdea = async (id: string): Promise<void> => {
  const ideas = await getIdeas();
  await storage.setJSON('vexora:ideas', ideas.filter(i => i.id !== id));
};

// ── Habits ────────────────────────────────────────────────────────────────────

export const getHabits = (): Promise<HabitEntry[]> =>
  storage.getJSON<HabitEntry[]>('vexora:habits', []);

export const addHabit = async (name: string, frequency: HabitEntry['frequency'] = 'daily', color = '#00D4FF'): Promise<HabitEntry> => {
  const habits = await getHabits();
  const habit: HabitEntry = { id: Date.now().toString(), name, frequency, completedDates: [], createdAt: Date.now(), color };
  await storage.setJSON('vexora:habits', [habit, ...habits]);
  return habit;
};

export const toggleHabitToday = async (id: string): Promise<void> => {
  const habits = await getHabits();
  const today = new Date().setHours(0, 0, 0, 0);
  await storage.setJSON('vexora:habits', habits.map(h => {
    if (h.id !== id) return h;
    const has = h.completedDates.includes(today);
    return { ...h, completedDates: has ? h.completedDates.filter(d => d !== today) : [...h.completedDates, today] };
  }));
};

export const deleteHabit = async (id: string): Promise<void> => {
  const habits = await getHabits();
  await storage.setJSON('vexora:habits', habits.filter(h => h.id !== id));
};

// ── Custom commands ───────────────────────────────────────────────────────────

export const getCommands = (): Promise<CustomCommand[]> =>
  storage.getJSON<CustomCommand[]>('vexora:commands', []);

export const addCommand = async (trigger: string, prompt: string, description: string): Promise<CustomCommand> => {
  const cmds = await getCommands();
  const cmd: CustomCommand = { id: Date.now().toString(), trigger: trigger.toLowerCase().trim(), prompt, description, createdAt: Date.now() };
  await storage.setJSON('vexora:commands', [cmd, ...cmds]);
  return cmd;
};

export const deleteCommand = async (id: string): Promise<void> => {
  const cmds = await getCommands();
  await storage.setJSON('vexora:commands', cmds.filter(c => c.id !== id));
};

// ── Universal search ──────────────────────────────────────────────────────────

export interface SearchResult {
  type: 'task' | 'note' | 'goal' | 'idea' | 'conversation';
  id: string;
  title: string;
  preview: string;
  relevance: number;
}

function score(text: string, query: string): number {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  if (t.includes(q)) return t.startsWith(q) ? 2 : 1;
  const words = q.split(/\s+/);
  const matches = words.filter(w => t.includes(w)).length;
  return matches / words.length;
}

export async function universalSearch(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return [];
  const results: SearchResult[] = [];

  const [tasks, notes, goals, ideas] = await Promise.all([getTasks(), getNotes(), getGoals(), getIdeas()]);

  tasks.forEach(t => {
    const s = score(t.text, query);
    if (s > 0) results.push({ type: 'task', id: t.id, title: t.text, preview: `${t.priority} priority · ${t.done ? 'Done' : 'Pending'}`, relevance: s });
  });
  notes.forEach(n => {
    const s = Math.max(score(n.title, query), score(n.content, query) * 0.8);
    if (s > 0) results.push({ type: 'note', id: n.id, title: n.title, preview: n.content.slice(0, 80), relevance: s });
  });
  goals.forEach(g => {
    const s = score(g.title, query);
    if (s > 0) results.push({ type: 'goal', id: g.id, title: g.title, preview: `${g.progress}/${g.target} ${g.unit}`, relevance: s });
  });
  ideas.forEach(i => {
    const s = score(i.text, query);
    if (s > 0) results.push({ type: 'idea', id: i.id, title: i.text.slice(0, 60), preview: i.category, relevance: s });
  });

  // Also search stored conversations
  const convs = await storage.getJSON<Array<{ id: string; title: string; preview: string }>>('vexora:conversations', []);
  convs.forEach(c => {
    const s = Math.max(score(c.title, query), score(c.preview, query) * 0.7);
    if (s > 0) results.push({ type: 'conversation', id: c.id, title: c.title, preview: c.preview, relevance: s });
  });

  return results.sort((a, b) => b.relevance - a.relevance).slice(0, 30);
}
