export type Priority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  text: string;
  done: boolean;
  priority: Priority;
  dueDate: string | null;
  createdAt: string;
  completedAt: string | null;
  category: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  color: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  pinned: boolean;
}

export interface Habit {
  id: string;
  name: string;
  icon: string;
  color: string;
  targetDays: number[];
  completionHistory: string[];
  createdAt: string;
  archived: boolean;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  targetDate: string | null;
  milestones: { id: string; text: string; done: boolean }[];
  progress: number;
  color: string;
  createdAt: string;
}

export interface ProductivityStats {
  tasksCompleted: number;
  tasksTotal: number;
  habitsToday: number;
  habitsTotal: number;
  noteCount: number;
  currentStreak: number;
}
