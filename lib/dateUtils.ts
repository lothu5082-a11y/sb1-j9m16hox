export function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

export function formatRelativeDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff > 1 && diff <= 7) return `In ${diff} days`;
  if (diff < -1) return `${Math.abs(diff)} days ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatShortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function formatRelativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = Math.round((now - then) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 172800) return 'Yesterday';
  return formatShortDate(iso);
}

export function calculateStreak(history: string[]): number {
  if (history.length === 0) return 0;
  const sorted = [...history].sort().reverse();
  const today = todayISO();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayISO = yesterday.toISOString().split('T')[0];

  if (sorted[0] !== today && sorted[0] !== yesterdayISO) return 0;

  let streak = 0;
  const check = new Date(sorted[0]);
  for (const date of sorted) {
    const d = new Date(date);
    const expected = new Date(check);
    expected.setDate(check.getDate() - streak);
    if (d.toISOString().split('T')[0] === expected.toISOString().split('T')[0]) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export function getLast7Days(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
}
