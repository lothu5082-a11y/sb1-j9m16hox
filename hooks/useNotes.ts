import { useState, useEffect, useCallback } from 'react';
import { storage } from '../lib/storage';
import { Note } from '../types/data';

function makeId() {
  return `note_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export const NOTE_COLORS = ['#1E2740', '#0D2137', '#1A2010', '#2A1010', '#1A1025', '#201A00'];

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    storage.getJSON<Note[]>(storage.KEYS.NOTES, []).then((saved) => {
      setNotes(saved);
      setLoading(false);
    });
  }, []);

  const persist = useCallback((next: Note[]) => {
    setNotes(next);
    storage.setJSON(storage.KEYS.NOTES, next);
  }, []);

  const addNote = useCallback(
    (title: string, content = '', color = NOTE_COLORS[0], tags: string[] = []) => {
      const note: Note = {
        id: makeId(),
        title: title.trim() || 'Untitled',
        content,
        color,
        tags,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        pinned: false,
      };
      persist([note, ...notes]);
      return note;
    },
    [notes, persist],
  );

  const updateNote = useCallback(
    (id: string, changes: Partial<Omit<Note, 'id' | 'createdAt'>>) => {
      persist(
        notes.map((n) =>
          n.id === id ? { ...n, ...changes, updatedAt: new Date().toISOString() } : n,
        ),
      );
    },
    [notes, persist],
  );

  const deleteNote = useCallback(
    (id: string) => {
      persist(notes.filter((n) => n.id !== id));
    },
    [notes, persist],
  );

  const togglePin = useCallback(
    (id: string) => {
      persist(notes.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n)));
    },
    [notes, persist],
  );

  const sortedNotes = [...notes].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  return { notes: sortedNotes, rawNotes: notes, loading, addNote, updateNote, deleteNote, togglePin };
}
