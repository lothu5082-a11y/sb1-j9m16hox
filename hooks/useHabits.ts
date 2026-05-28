import { useState, useEffect, useCallback } from 'react';
import { storage } from '../lib/storage';
import { Habit } from '../types/data';
import { todayISO, calculateStreak, getLast7Days } from '../lib/dateUtils';

function makeId() {
  return `habit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export const HABIT_COLORS = [
  '#00E5FF', '#00BFA5', '#FF6D00', '#00E676', '#FF4081', '#7C4DFF', '#FFD600',
];

export function useHabits() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    storage.getJSON<Habit[]>(storage.KEYS.HABITS, []).then((saved) => {
      setHabits(saved);
      setLoading(false);
    });
  }, []);

  const persist = useCallback((next: Habit[]) => {
    setHabits(next);
    storage.setJSON(storage.KEYS.HABITS, next);
  }, []);

  const addHabit = useCallback(
    (name: string, color = HABIT_COLORS[0], icon = '⚡', targetDays = [0, 1, 2, 3, 4, 5, 6]) => {
      const habit: Habit = {
        id: makeId(),
        name: name.trim(),
        icon,
        color,
        targetDays,
        completionHistory: [],
        createdAt: new Date().toISOString(),
        archived: false,
      };
      persist([...habits, habit]);
      return habit;
    },
    [habits, persist],
  );

  const toggleToday = useCallback(
    (id: string) => {
      const today = todayISO();
      persist(
        habits.map((h) => {
          if (h.id !== id) return h;
          const already = h.completionHistory.includes(today);
          return {
            ...h,
            completionHistory: already
              ? h.completionHistory.filter((d) => d !== today)
              : [...h.completionHistory, today],
          };
        }),
      );
    },
    [habits, persist],
  );

  const deleteHabit = useCallback(
    (id: string) => {
      persist(habits.filter((h) => h.id !== id));
    },
    [habits, persist],
  );

  const updateHabit = useCallback(
    (id: string, changes: Partial<Omit<Habit, 'id' | 'createdAt' | 'completionHistory'>>) => {
      persist(habits.map((h) => (h.id === id ? { ...h, ...changes } : h)));
    },
    [habits, persist],
  );

  const getHabitStats = useCallback(
    (habit: Habit) => {
      const today = todayISO();
      const last7 = getLast7Days();
      return {
        completedToday: habit.completionHistory.includes(today),
        streak: calculateStreak(habit.completionHistory),
        last7Completions: last7.map((d) => habit.completionHistory.includes(d)),
      };
    },
    [],
  );

  const todayStats = {
    total: habits.filter((h) => !h.archived).length,
    completed: habits.filter((h) => !h.archived && h.completionHistory.includes(todayISO())).length,
  };

  return {
    habits: habits.filter((h) => !h.archived),
    allHabits: habits,
    loading,
    addHabit,
    toggleToday,
    deleteHabit,
    updateHabit,
    getHabitStats,
    todayStats,
  };
}
