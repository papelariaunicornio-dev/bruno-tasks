import { useState, useEffect, useRef } from 'react';
import { useAllTasks, useCreateTask } from '../hooks/useTasks';
import { useLists } from '../hooks/useLists';
import { useHabits, useHabitLogs, useToggleHabitLog, toISO } from '../hooks/useHabits';
import { useAppState } from '../store/appState';
import { Pomodoro } from './Pomodoro';

function formatTime(d: Date): string {
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function HomeView() {
  const { data: allTasks = [] } = useAllTasks();
  const { data: lists = [] } = useLists();
  const createTask = useCreateTask();
  const { data: habits = [] } = useHabits();
  const { data: habitLogs = [] } = useHabitLogs();
  const toggleHabitLog = useToggleHabitLog();
  const setView = useAppState((s) => s.setView);
  const showToast = useAppState((s) => s.showToast);
  const [now, setNow] = useState(new Date());
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const newTaskInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const visible = allTasks.filter((t) => !t.deleted && !t.completed);
  const total = visible.length;
  const inProgress = visible.filter((t) => !!t.in_progress).length;
  const priority = visible.filter((t) => !!t.priority).length;
  const delegated = visible.filter((t) => !!t.delegated).length;

  const activeHabits = habits.filter((h) => !h.archived);
  const todayDate = new Date();
  const yesterdayDate = new Date(todayDate); yesterdayDate.setDate(todayDate.getDate() - 1);
  const dayBeforeDate = new Date(todayDate); dayBeforeDate.setDate(todayDate.getDate() - 2);
  const today = toISO(todayDate);
  const yesterday = toISO(yesterdayDate);
  const dayBefore = toISO(dayBeforeDate);
  const habitsDoneToday = activeHabits.filter((h) =>
    habitLogs.some((l) => l.habit_id === h.Id && l.date === today)
  ).length;

  const hour = now.getHours();
  const greeting =
    hour < 5 ? 'Boa madrugada' :
    hour < 12 ? 'Bom dia' :
    hour < 18 ? 'Boa tarde' :
    'Boa noite';

  return (
    <div className="flex-1 overflow-y-auto" style={{ backgroundColor: '#025960' }}>
      <div className="max-w-4xl mx-auto px-6 py-10 min-h-full">
        {/* Greeting + Clock */}
        <div className="mb-10">
          <p className="text-white/60 text-sm mb-2">{greeting}, Bruno</p>
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-2 tracking-tight tabular-nums">
            {formatTime(now)}
          </h1>
          <p className="text-white/70 text-base">
            {capitalize(formatDate(now))}
          </p>
        </div>

        {/* Quick add */}
        <div className="mb-8">
          <div className="flex items-center gap-3 px-4 py-4 bg-white/20 backdrop-blur-sm rounded-xl border border-white/20">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="opacity-60 flex-shrink-0">
              <path d="M12 5v14M5 12h14" />
            </svg>
            <input
              ref={newTaskInputRef}
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newTaskTitle.trim()) {
                  const inbox = lists.find((l) => l.title === 'Inbox');
                  const listId = inbox?.Id || lists[0]?.Id;
                  if (!listId) return;
                  createTask.mutate({ title: newTaskTitle.trim(), list_id: listId });
                  showToast(`"${newTaskTitle.trim()}" adicionada na Inbox`);
                  setNewTaskTitle('');
                  newTaskInputRef.current?.focus();
                }
                if (e.key === 'Escape') {
                  setNewTaskTitle('');
                  newTaskInputRef.current?.blur();
                }
              }}
              placeholder="Adicionar tarefa na Inbox..."
              className="flex-1 bg-transparent text-base outline-none text-white placeholder-white/60"
            />
          </div>
        </div>

        {/* Task summary */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">
            Tarefas pendentes
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button
              onClick={() => setView({ type: 'all' })}
              className="bg-white/10 hover:bg-white/15 rounded-xl p-5 text-left transition-colors border border-white/10"
            >
              <div className="text-3xl font-bold text-white">{total}</div>
              <div className="text-xs text-white/60 mt-1">Total</div>
            </button>
            <button
              onClick={() => setView({ type: 'in_progress' })}
              className="bg-white/10 hover:bg-white/15 rounded-xl p-5 text-left transition-colors border border-white/10"
            >
              <div className="text-3xl font-bold text-blue-300">{inProgress}</div>
              <div className="text-xs text-white/60 mt-1">Em andamento</div>
            </button>
            <button
              onClick={() => setView({ type: 'priority' })}
              className="bg-white/10 hover:bg-white/15 rounded-xl p-5 text-left transition-colors border border-white/10"
            >
              <div className="text-3xl font-bold text-red-300">{priority}</div>
              <div className="text-xs text-white/60 mt-1">Prioridade</div>
            </button>
            <button
              onClick={() => setView({ type: 'delegated' })}
              className="bg-white/10 hover:bg-white/15 rounded-xl p-5 text-left transition-colors border border-white/10"
            >
              <div className="text-3xl font-bold text-green-300">{delegated}</div>
              <div className="text-xs text-white/60 mt-1">Delegadas</div>
            </button>
          </div>
        </div>

        {/* Habits summary */}
        {activeHabits.length > 0 && (
          <div className="mb-8">
            <button
              onClick={() => setView({ type: 'habits' })}
              className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3 hover:text-white transition-colors cursor-pointer block"
            >
              Habitos de hoje
            </button>
            <div className="w-full bg-white/10 rounded-xl p-5 border border-white/10 flex items-center justify-between gap-4">
              <button
                onClick={() => setView({ type: 'habits' })}
                className="flex-shrink-0 text-left hover:opacity-80 transition-opacity"
              >
                <div className="text-3xl font-bold text-white">
                  {habitsDoneToday}<span className="text-white/40 text-xl">/{activeHabits.length}</span>
                </div>
                <div className="text-xs text-white/60 mt-1">
                  {habitsDoneToday === activeHabits.length ? 'Todos concluidos hoje 🎉' : `${activeHabits.length - habitsDoneToday} restantes`}
                </div>
              </button>
              <div className="flex gap-3 flex-wrap justify-end">
                {activeHabits.map((h) => {
                  const days: { date: string; label: string }[] = [
                    { date: dayBefore, label: 'A' },
                    { date: yesterday, label: 'O' },
                    { date: today, label: 'H' },
                  ];
                  const todayLog = habitLogs.find((l) => l.habit_id === h.Id && l.date === today);
                  const todayDone = !!todayLog;
                  return (
                    <div key={h.Id} className="flex flex-col items-center gap-1.5">
                      <button
                        onClick={() => toggleHabitLog.mutate({ habitId: h.Id, date: today, existingLogId: todayLog?.Id })}
                        className="w-11 h-11 rounded-full flex items-center justify-center text-lg transition-all hover:scale-110 active:scale-95"
                        style={{
                          backgroundColor: todayDone ? h.color : h.color + '22',
                          opacity: todayDone ? 1 : 0.6,
                          boxShadow: todayDone ? `0 0 0 2px ${h.color}` : 'none',
                        }}
                        title={`${h.title} (hoje)${todayDone ? ' ✓' : ''}`}
                      >
                        {h.emoji || '⭐'}
                      </button>
                      <div className="flex gap-1">
                        {days.map(({ date, label }) => {
                          const log = habitLogs.find((l) => l.habit_id === h.Id && l.date === date);
                          const done = !!log;
                          const isToday = date === today;
                          return (
                            <button
                              key={date}
                              onClick={() => toggleHabitLog.mutate({ habitId: h.Id, date, existingLogId: log?.Id })}
                              className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold transition-all hover:scale-125"
                              style={{
                                backgroundColor: done ? h.color : 'transparent',
                                border: `1.5px solid ${done ? h.color : 'rgba(255,255,255,0.3)'}`,
                                color: done ? '#fff' : 'rgba(255,255,255,0.5)',
                              }}
                              title={
                                date === today ? `Hoje${done ? ' ✓' : ''}` :
                                date === yesterday ? `Ontem${done ? ' ✓' : ''}` :
                                `Anteontem${done ? ' ✓' : ''}`
                              }
                            >
                              {!done && (isToday ? label : '')}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Pomodoro */}
        <div className="bg-white rounded-xl p-5 shadow-sm max-w-sm">
          <Pomodoro />
        </div>
      </div>
    </div>
  );
}
