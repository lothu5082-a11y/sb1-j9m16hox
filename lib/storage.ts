import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  TASKS: 'vexora:tasks',
  NOTES: 'vexora:notes',
  HABITS: 'vexora:habits',
  GOALS: 'vexora:goals',
  SETTINGS: 'vexora:settings',
} as const;

export { KEYS };

async function getJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function setJSON<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

async function removeKey(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}

export const storage = { getJSON, setJSON, removeKey, KEYS };
