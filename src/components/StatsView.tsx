import { useState, useMemo } from 'react';
import { useAllTasks } from '../hooks/useTasks';
import { useLists } from '../hooks/useLists';

type DatePreset = 'today' | 'yesterday' | 'week' | 'month' | 'custom';

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getDaysInRange(start: string, end: string): string[] {
  const result: string[] = [];
  const d = new Date(start + 'T00:00:00');
  const endDate = new Date(end + 'T00:00:00');
  while (d <= endDate) {
    result.push(toISO(d));
    d.setDate(d.getDate() + 1);
  }
  return result;
}

function formatDate(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

function parseDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toISOString().slice(0, 10);
  } catch {
    return null;
  }
}

function getPresetDates(preset: DatePreset): { start: string; end: string } {
  const now = new Date();
  const today = toISO(now);
  switch (preset) {
    case 'today':
      return { start: today, end: today };
    case 'yesterday': {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return { start: toISO(y), end: toISO(y) };
    }
    case 'week': {
      const w = new Date(now);
      const day = w.getDay();
      w.setDate(w.getDate() - (day === 0 ? 6 : day - 1)); // Monday
      return { start: toISO(w), end: today };
    }
    case 'month': {
      const m = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: toISO(m), end: today };
    }
    default:
      return { start: today, end: today };
  }
}

export function StatsView() {
  const { data: tasks = [] } = useAllTasks();
  const { data: lists = [] } = useLists();

  const [preset, setPreset] = useState<DatePreset>('week');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const { start, end } = preset === 'custom' && customStart && customEnd
    ? { start: customStart, end: customEnd }
    : getPresetDates(preset);

  const days = getDaysInRange(start, end);

  const stats = useMemo(() => {
    const dailyCreated: Record<string, number> = {};
    const dailyCompleted: Record<string, number> = {};
    const byListCreated: Record<number, Record<string, number>> = {};
    const byListCompleted: Record<number, Record<string, number>> = {};

    for (const day of days) {
      dailyCreated[day] = 0;
      dailyCompleted[day] = 0;
    }

    let totalCreatedInRange = 0;
    let totalCompletedInRange = 0;

    for (const task of tasks) {
      if (task.deleted) continue;
      const createdDay = parseDate(task.created_at);
      const completedDay = parseDate(task.completed_at);

      if (createdDay && createdDay >= start && createdDay <= end) {
        totalCreatedInRange++;
        if (dailyCreated[createdDay] !== undefined) dailyCreated[createdDay]++;
        if (!byListCreated[task.list_id]) byListCreated[task.list_id] = {};
        byListCreated[task.list_id][createdDay] = (byListCreated[task.list_id][createdDay] || 0) + 1;
      }

      if (completedDay && completedDay >= start && completedDay <= end) {
        totalCompletedInRange++;
        if (dailyCompleted[completedDay] !== undefined) dailyCompleted[completedDay]++;
        if (!byListCompleted[task.list_id]) byListCompleted[task.list_id] = {};
        byListCompleted[task.list_id][completedDay] = (byListCompleted[task.list_id][completedDay] || 0) + 1;
      }
    }

    const totalTasks = tasks.filter((t) => !t.deleted).length;
    const completedTasks = tasks.filter((t) => !!t.completed && !t.deleted).length;
    const pendingTasks = totalTasks - completedTasks;

    const maxDaily = Math.max(
      ...Object.values(dailyCreated),
      ...Object.values(dailyCompleted),
      1
    );

    return {
      dailyCreated, dailyCompleted, byListCreated, byListCompleted,
      totalTasks, completedTasks, pendingTasks,
      totalCreatedInRange, totalCompletedInRange, maxDaily,
    };
  }, [tasks, days, start, end]);

  const groups = useMemo(() => {
    const g: Record<string, typeof lists> = {};
    for (const list of lists) {
      const group = list.group_name || 'Sem grupo';
      if (!g[group]) g[group] = [];
      g[group].push(list);
    }
    return g;
  }, [lists]);

  const presets: { key: DatePreset; label: string }[] = [
    { key: 'today', label: 'Hoje' },
    { key: 'yesterday', label: 'Ontem' },
    { key: 'week', label: 'Esta semana' },
    { key: 'month', label: 'Este mes' },
    { key: 'custom', label: 'Personalizado' },
  ];

  return (
    <div className="flex-1 overflow-y-auto" style={{ backgroundColor: '#025960' }}>
      <div className="max-w-4xl mx-auto px-6 py-8 min-h-full">
        <h1 className="text-2xl font-bold text-white mb-4">Dashboard</h1>

        {/* Date filter */}
        <div className="bg-white/10 rounded-lg p-3 mb-6 flex flex-wrap items-center gap-2">
          {presets.map((p) => (
            <button
              key={p.key}
              onClick={() => setPreset(p.key)}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                preset === p.key
                  ? 'bg-white text-gray-800 font-medium shadow-sm'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              {p.label}
            </button>
          ))}
          {preset === 'custom' && (
            <div className="flex items-center gap-2 ml-2">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="text-sm bg-white/20 text-white rounded px-2 py-1 outline-none"
              />
              <span className="text-white/50">a</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="text-sm bg-white/20 text-white rounded px-2 py-1 outline-none"
              />
            </div>
          )}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-2xl font-bold text-blue-500">{stats.totalCreatedInRange}</div>
            <div className="text-xs text-gray-500 mt-1">Criadas no periodo</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-2xl font-bold text-green-500">{stats.totalCompletedInRange}</div>
            <div className="text-xs text-gray-500 mt-1">Concluidas no periodo</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-2xl font-bold text-amber-500">{stats.pendingTasks}</div>
            <div className="text-xs text-gray-500 mt-1">Pendentes (total)</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-2xl font-bold text-gray-700">{stats.totalTasks}</div>
            <div className="text-xs text-gray-500 mt-1">Total de tarefas</div>
          </div>
        </div>

        {/* Daily Chart */}
        {days.length >= 1 && (
          <div className="bg-white rounded-lg p-5 shadow-sm mb-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">
              Criadas vs concluidas ({formatDate(start)} - {formatDate(end)})
            </h2>
            <div className="flex items-end gap-1 h-40">
              {days.map((day) => {
                const created = stats.dailyCreated[day] || 0;
                const completed = stats.dailyCompleted[day] || 0;
                const createdH = (created / stats.maxDaily) * 100;
                const completedH = (completed / stats.maxDaily) * 100;
                return (
                  <div key={day} className="flex-1 flex flex-col items-center gap-0.5 group relative">
                    <div className="w-full flex gap-px justify-center" style={{ height: '128px', alignItems: 'flex-end' }}>
                      <div
                        className="w-1/2 rounded-t transition-all"
                        style={{ height: `${Math.max(createdH, 2)}%`, backgroundColor: '#3b82f6' }}
                      />
                      <div
                        className="w-1/2 rounded-t transition-all"
                        style={{ height: `${Math.max(completedH, 2)}%`, backgroundColor: '#22c55e' }}
                      />
                    </div>
                    <span className="text-[9px] text-gray-400">{formatDate(day)}</span>
                    <div className="absolute bottom-full mb-1 bg-gray-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10">
                      {formatDate(day)}: {created} criadas, {completed} concluidas
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-4 mt-3 text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ backgroundColor: '#3b82f6' }} /> Criadas</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ backgroundColor: '#22c55e' }} /> Concluidas</span>
            </div>
          </div>
        )}

        {/* Per List breakdown */}
        <div className="bg-white rounded-lg p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Por lista ({formatDate(start)} - {formatDate(end)})</h2>
          {Object.entries(groups).map(([groupName, groupLists]) => (
            <div key={groupName} className="mb-4">
              {Object.keys(groups).length > 1 && (
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{groupName}</h3>
              )}
              <div className="space-y-2">
                {groupLists.map((list) => {
                  const createdInRange = days.reduce((sum, d) => sum + (stats.byListCreated[list.Id]?.[d] || 0), 0);
                  const completedInRange = days.reduce((sum, d) => sum + (stats.byListCompleted[list.Id]?.[d] || 0), 0);
                  const totalPending = tasks.filter((t) => t.list_id === list.Id && !t.completed && !t.deleted).length;

                  if (createdInRange === 0 && completedInRange === 0 && totalPending === 0) return null;

                  return (
                    <div key={list.Id} className="flex items-center gap-3 py-2 px-3 rounded-md hover:bg-gray-50">
                      <span className="w-2 h-2 rounded-full bg-[#15BFAE] flex-shrink-0" />
                      <span className="text-base text-gray-700 flex-1">{list.title}</span>
                      <div className="flex gap-4 text-sm">
                        <span className="text-gray-400">{totalPending} pendentes</span>
                        <span className="text-blue-500">+{createdInRange} criadas</span>
                        <span className="text-green-500">{completedInRange} concluidas</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
