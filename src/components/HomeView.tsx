import { useState, useEffect } from 'react';
import { useAllTasks } from '../hooks/useTasks';
import { useHabits, useHabitLogs, toISO } from '../hooks/useHabits';
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
  const { data: habits = [] } = useHabits();
  const { data: habitLogs = [] } = useHabitLogs();
  const setView = useAppState((s) => s.setView);
  const [now, setNow] = useState(new Date());

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
  const today = toISO(new Date());
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
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">
              Habitos de hoje
            </h2>
            <button
              onClick={() => setView({ type: 'habits' })}
              className="w-full bg-white/10 hover:bg-white/15 rounded-xl p-5 text-left transition-colors border border-white/10 flex items-center justify-between"
            >
              <div>
                <div className="text-3xl font-bold text-white">
                  {habitsDoneToday}<span className="text-white/40 text-xl">/{activeHabits.length}</span>
                </div>
                <div className="text-xs text-white/60 mt-1">
                  {habitsDoneToday === activeHabits.length ? 'Todos concluidos hoje 🎉' : `${activeHabits.length - habitsDoneToday} restantes`}
                </div>
              </div>
              <div className="flex gap-1.5">
                {activeHabits.slice(0, 6).map((h) => {
                  const done = habitLogs.some((l) => l.habit_id === h.Id && l.date === today);
                  return (
                    <div
                      key={h.Id}
                      className="w-9 h-9 rounded-full flex items-center justify-center text-base transition-all"
                      style={{
                        backgroundColor: done ? h.color : h.color + '22',
                        opacity: done ? 1 : 0.5,
                      }}
                    >
                      {h.emoji || '⭐'}
                    </div>
                  );
                })}
              </div>
            </button>
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
