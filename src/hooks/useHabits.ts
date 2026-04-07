import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/nocodb';
import type { Habit, HabitLog } from '../types';

let tempIdCounter = -1000;

export function useHabits() {
  return useQuery({
    queryKey: ['habits'],
    queryFn: () => api.list<Habit>('habits', { sort: 'position', limit: 500 }),
  });
}

export function useHabitLogs() {
  return useQuery({
    queryKey: ['habit_logs'],
    queryFn: () => api.list<HabitLog>('habit_logs', { limit: 5000 }),
  });
}

export function useCreateHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Habit>) =>
      api.create<Habit>('habits', {
        title: data.title ?? '',
        emoji: data.emoji ?? '',
        color: data.color ?? '#14b8a6',
        frequency: data.frequency ?? 'daily',
        target_per_week: data.target_per_week ?? 7,
        position: Date.now(),
        archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['habits'] }),
  });
}

export function useUpdateHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Habit> & { id: number }) =>
      api.update<Habit>('habits', id, { ...data, updated_at: new Date().toISOString() }),
    onMutate: async ({ id, ...data }) => {
      await qc.cancelQueries({ queryKey: ['habits'] });
      const previous = qc.getQueryData<Habit[]>(['habits']);
      qc.setQueryData<Habit[]>(['habits'], (old = []) =>
        old.map((h) => (h.Id === id ? { ...h, ...data } : h))
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueryData(['habits'], context.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['habits'] }),
  });
}

export function useDeleteHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.remove('habits', id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['habits'] });
      const previous = qc.getQueryData<Habit[]>(['habits']);
      qc.setQueryData<Habit[]>(['habits'], (old = []) => old.filter((h) => h.Id !== id));
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueryData(['habits'], context.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['habits'] }),
  });
}

export function useToggleHabitLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ habitId, date, existingLogId }: { habitId: number; date: string; existingLogId?: number }) => {
      if (existingLogId) {
        await api.remove('habit_logs', existingLogId);
        return { removed: true, habitId, date };
      } else {
        const created = await api.create<HabitLog>('habit_logs', {
          habit_id: habitId,
          date,
          created_at: new Date().toISOString(),
        });
        return { removed: false, log: created };
      }
    },
    onMutate: async ({ habitId, date, existingLogId }) => {
      await qc.cancelQueries({ queryKey: ['habit_logs'] });
      const previous = qc.getQueryData<HabitLog[]>(['habit_logs']);
      if (existingLogId) {
        qc.setQueryData<HabitLog[]>(['habit_logs'], (old = []) =>
          old.filter((l) => l.Id !== existingLogId)
        );
      } else {
        const tempId = tempIdCounter--;
        const optimistic: HabitLog = {
          Id: tempId,
          habit_id: habitId,
          date,
          created_at: new Date().toISOString(),
        };
        qc.setQueryData<HabitLog[]>(['habit_logs'], (old = []) => [...old, optimistic]);
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueryData(['habit_logs'], context.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['habit_logs'] }),
  });
}

// --- Utility functions ---

export function calculateStreak(logs: HabitLog[], habitId: number): { current: number; best: number; totalDays: number } {
  const dates = new Set(
    logs.filter((l) => l.habit_id === habitId).map((l) => l.date)
  );

  const totalDays = dates.size;

  // Current streak: count backwards from today (or yesterday if not done today)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let current = 0;
  let cursor = new Date(today);
  // If today is not done, check if yesterday is done — streak still counts from yesterday
  if (!dates.has(toISO(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (dates.has(toISO(cursor))) {
    current++;
    cursor.setDate(cursor.getDate() - 1);
  }

  // Best streak: iterate all sorted dates
  const sortedDates = [...dates].sort();
  let best = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const d of sortedDates) {
    const cur = new Date(d + 'T00:00:00');
    if (prev) {
      const diff = Math.round((cur.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
      if (diff === 1) {
        run++;
      } else {
        run = 1;
      }
    } else {
      run = 1;
    }
    if (run > best) best = run;
    prev = cur;
  }

  return { current, best, totalDays };
}

export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getLastNDays(n: number): string[] {
  const result: string[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    result.push(toISO(d));
  }
  return result;
}
