import { useState } from 'react';
import { useHabits, useHabitLogs, useToggleHabitLog, calculateStreak, toISO, getLastNDays } from '../hooks/useHabits';
import { HabitForm } from './HabitForm';
import type { Habit, HabitLog } from '../types';

const DAY_LABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

function getDayLabel(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return DAY_LABELS[d.getDay()];
}

function getDayNumber(iso: string): string {
  return iso.slice(8, 10);
}

function isToday(iso: string): boolean {
  return iso === toISO(new Date());
}

// Monthly calendar helpers
function getMonthDays(year: number, month: number): string[] {
  const days: string[] = [];
  const last = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= last; d++) {
    days.push(toISO(new Date(year, month, d)));
  }
  return days;
}

export function HabitTrackerView() {
  const { data: habits = [] } = useHabits();
  const { data: logs = [] } = useHabitLogs();
  const toggleLog = useToggleHabitLog();

  const [showForm, setShowForm] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [selectedHabitId, setSelectedHabitId] = useState<number | null>(null);

  const visibleHabits = habits.filter((h) => !h.archived).sort((a, b) => a.position - b.position);
  const last7Days = getLastNDays(7);

  function findLog(habitId: number, date: string): HabitLog | undefined {
    return logs.find((l) => l.habit_id === habitId && l.date === date);
  }

  function handleToggle(habitId: number, date: string) {
    const existing = findLog(habitId, date);
    toggleLog.mutate({ habitId, date, existingLogId: existing?.Id });
  }

  return (
    <div className="flex-1 overflow-y-auto" style={{ backgroundColor: '#025960' }}>
      <div className="max-w-4xl mx-auto px-6 py-8 min-h-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Habitos</h1>
          <button
            onClick={() => { setEditingHabit(null); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-white/15 hover:bg-white/25 text-white rounded-md text-sm font-medium transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Novo habito
          </button>
        </div>

        {/* Empty state */}
        {visibleHabits.length === 0 && (
          <div className="bg-white/10 rounded-xl p-12 text-center border border-white/10">
            <p className="text-white/80 text-lg mb-2">Nenhum habito ainda</p>
            <p className="text-white/50 text-sm mb-4">Crie seu primeiro habito para comecar a rastrear</p>
            <button
              onClick={() => { setEditingHabit(null); setShowForm(true); }}
              className="px-4 py-2 bg-[#15BFAE] text-white rounded-md text-sm font-medium hover:bg-[#12a89a]"
            >
              Criar habito
            </button>
          </div>
        )}

        {/* Habit list */}
        <div className="space-y-3">
          {visibleHabits.map((habit) => {
            const stats = calculateStreak(logs, habit.Id);
            const isSelected = selectedHabitId === habit.Id;
            return (
              <div
                key={habit.Id}
                className={`bg-white rounded-xl shadow-sm transition-all ${isSelected ? 'ring-2 ring-[#15BFAE]' : 'hover:shadow-md'}`}
              >
                {/* Main row */}
                <div className="flex items-center gap-4 p-4">
                  {/* Emoji + name */}
                  <button
                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
                    onClick={() => setSelectedHabitId(isSelected ? null : habit.Id)}
                  >
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center text-xl flex-shrink-0"
                      style={{ backgroundColor: habit.color + '22' }}
                    >
                      {habit.emoji || '⭐'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-gray-800 truncate">{habit.title}</div>
                      <div className="text-xs text-gray-500">
                        {stats.current > 0 && <span className="mr-2">🔥 {stats.current} {stats.current === 1 ? 'dia' : 'dias'}</span>}
                        <span>{stats.totalDays} total</span>
                      </div>
                    </div>
                  </button>

                  {/* 7-day grid */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {last7Days.map((date) => {
                      const done = !!findLog(habit.Id, date);
                      const today = isToday(date);
                      return (
                        <button
                          key={date}
                          onClick={() => handleToggle(habit.Id, date)}
                          className={`flex flex-col items-center gap-0.5 transition-transform hover:scale-110`}
                          title={date}
                        >
                          <span className={`text-[9px] ${today ? 'text-gray-700 font-bold' : 'text-gray-400'}`}>
                            {getDayLabel(date)}
                          </span>
                          <div
                            className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all`}
                            style={{
                              backgroundColor: done ? habit.color : 'transparent',
                              borderColor: done ? habit.color : today ? '#9ca3af' : '#e5e7eb',
                            }}
                          >
                            {done && (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                                <path d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <span className={`text-[9px] ${today ? 'text-gray-700 font-bold' : 'text-gray-400'}`}>
                            {getDayNumber(date)}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Edit button */}
                  <button
                    onClick={() => { setEditingHabit(habit); setShowForm(true); }}
                    className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                    title="Editar"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 3a2.85 2.85 0 114 4L7.5 20.5 2 22l1.5-5.5z" />
                    </svg>
                  </button>
                </div>

                {/* Expanded detail: monthly calendar */}
                {isSelected && <HabitMonthCalendar habit={habit} logs={logs} onToggle={handleToggle} />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Form modal */}
      {showForm && (
        <HabitForm
          habit={editingHabit}
          onClose={() => { setShowForm(false); setEditingHabit(null); }}
        />
      )}
    </div>
  );
}

// --- Monthly calendar subcomponent ---

interface HabitMonthCalendarProps {
  habit: Habit;
  logs: HabitLog[];
  onToggle: (habitId: number, date: string) => void;
}

function HabitMonthCalendar({ habit, logs, onToggle }: HabitMonthCalendarProps) {
  const [monthOffset, setMonthOffset] = useState(0);

  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const year = target.getFullYear();
  const month = target.getMonth();
  const monthDays = getMonthDays(year, month);
  const monthName = target.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const stats = calculateStreak(logs, habit.Id);
  const habitLogsThisMonth = logs.filter(
    (l) => l.habit_id === habit.Id && l.date.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)
  );

  return (
    <div className="border-t border-gray-100 px-4 py-4">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setMonthOffset((o) => o - 1)}
          className="text-gray-400 hover:text-gray-700 w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <span className="text-sm font-semibold text-gray-700 capitalize">{monthName}</span>
        <button
          onClick={() => setMonthOffset((o) => o + 1)}
          disabled={monthOffset >= 0}
          className="text-gray-400 hover:text-gray-700 w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAY_LABELS.map((d, i) => (
          <div key={i} className="text-[10px] text-gray-400 text-center font-medium">{d}</div>
        ))}
      </div>

      {/* Month grid */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`blank-${i}`} />
        ))}
        {monthDays.map((date) => {
          const done = logs.some((l) => l.habit_id === habit.Id && l.date === date);
          const today = isToday(date);
          return (
            <button
              key={date}
              onClick={() => onToggle(habit.Id, date)}
              className="aspect-square flex items-center justify-center rounded-md text-xs transition-all hover:scale-105"
              style={{
                backgroundColor: done ? habit.color : today ? '#f3f4f6' : 'transparent',
                color: done ? 'white' : today ? '#1f2937' : '#9ca3af',
                fontWeight: today ? 700 : 400,
              }}
            >
              {Number(getDayNumber(date))}
            </button>
          );
        })}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mt-4">
        <div className="bg-gray-50 rounded-lg p-2 text-center">
          <div className="text-lg font-bold" style={{ color: habit.color }}>{habitLogsThisMonth.length}</div>
          <div className="text-[10px] text-gray-500">Neste mes</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-2 text-center">
          <div className="text-lg font-bold" style={{ color: habit.color }}>{stats.current}</div>
          <div className="text-[10px] text-gray-500">Streak atual</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-2 text-center">
          <div className="text-lg font-bold" style={{ color: habit.color }}>{stats.best}</div>
          <div className="text-[10px] text-gray-500">Melhor streak</div>
        </div>
      </div>
    </div>
  );
}
