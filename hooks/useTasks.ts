import { useState, useEffect, useCallback } from 'react';
import { storage } from '../lib/storage';
import { Task, Priority } from '../types/data';
import { todayISO } from '../lib/dateUtils';

function makeId() {
  return `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    storage.getJSON<Task[]>(storage.KEYS.TASKS, []).then((saved) => {
      setTasks(saved);
      setLoading(false);
    });
  }, []);

  const persist = useCallback((next: Task[]) => {
    setTasks(next);
    storage.setJSON(storage.KEYS.TASKS, next);
  }, []);

  const addTask = useCallback(
    (text: string, priority: Priority = 'medium', dueDate: string | null = null, category = 'General') => {
      const task: Task = {
        id: makeId(),
        text: text.trim(),
        done: false,
        priority,
        dueDate,
        createdAt: new Date().toISOString(),
        completedAt: null,
        category,
      };
      persist([task, ...tasks]);
      return task;
    },
    [tasks, persist],
  );

  const updateTask = useCallback(
    (id: string, changes: Partial<Omit<Task, 'id' | 'createdAt'>>) => {
      persist(tasks.map((t) => (t.id === id ? { ...t, ...changes } : t)));
    },
    [tasks, persist],
  );

  const toggleTask = useCallback(
    (id: string) => {
      persist(
        tasks.map((t) =>
          t.id === id
            ? { ...t, done: !t.done, completedAt: !t.done ? new Date().toISOString() : null }
            : t,
        ),
      );
    },
    [tasks, persist],
  );

  const deleteTask = useCallback(
    (id: string) => {
      persist(tasks.filter((t) => t.id !== id));
    },
    [tasks, persist],
  );

  const clearCompleted = useCallback(() => {
    persist(tasks.filter((t) => !t.done));
  }, [tasks, persist]);

  const stats = {
    total: tasks.length,
    done: tasks.filter((t) => t.done).length,
    today: tasks.filter(
      (t) => !t.done && t.dueDate === todayISO(),
    ).length,
    overdue: tasks.filter(
      (t) => !t.done && t.dueDate !== null && t.dueDate < todayISO(),
    ).length,
  };

  return { tasks, loading, addTask, updateTask, toggleTask, deleteTask, clearCompleted, stats };
}
