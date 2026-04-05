import { useMemo } from 'react';
import { useAllTasks } from '../hooks/useTasks';
import { useLists } from '../hooks/useLists';

function getDaysRange(days: number): string[] {
  const result: string[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    result.push(d.toISOString().slice(0, 10));
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

export function StatsView() {
  const { data: tasks = [] } = useAllTasks();
  const { data: lists = [] } = useLists();

  const days = getDaysRange(14); // Last 14 days

  const stats = useMemo(() => {
    // Daily created/completed counts
    const dailyCreated: Record<string, number> = {};
    const dailyCompleted: Record<string, number> = {};
    const byListCreated: Record<number, Record<string, number>> = {};
    const byListCompleted: Record<number, Record<string, number>> = {};

    for (const day of days) {
      dailyCreated[day] = 0;
      dailyCompleted[day] = 0;
    }

    for (const task of tasks) {
      const createdDay = parseDate(task.created_at);
      const completedDay = parseDate(task.completed_at);

      if (createdDay && dailyCreated[createdDay] !== undefined) {
        dailyCreated[createdDay]++;
        if (!byListCreated[task.list_id]) byListCreated[task.list_id] = {};
        byListCreated[task.list_id][createdDay] = (byListCreated[task.list_id][createdDay] || 0) + 1;
      }

      if (completedDay && dailyCompleted[completedDay] !== undefined) {
        dailyCompleted[completedDay]++;
        if (!byListCompleted[task.list_id]) byListCompleted[task.list_id] = {};
        byListCompleted[task.list_id][completedDay] = (byListCompleted[task.list_id][completedDay] || 0) + 1;
      }
    }

    // Totals
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => !!t.completed).length;
    const pendingTasks = totalTasks - completedTasks;
    const todayStr = days[days.length - 1];
    const createdToday = dailyCreated[todayStr] || 0;
    const completedToday = dailyCompleted[todayStr] || 0;

    // Max for chart scaling
    const maxDaily = Math.max(
      ...Object.values(dailyCreated),
      ...Object.values(dailyCompleted),
      1
    );

    return {
      dailyCreated, dailyCompleted, byListCreated, byListCompleted,
      totalTasks, completedTasks, pendingTasks, createdToday, completedToday, maxDaily,
    };
  }, [tasks, days]);

  // Group lists by group_name for segmented view
  const groups = useMemo(() => {
    const g: Record<string, typeof lists> = {};
    for (const list of lists) {
      const group = list.group_name || 'Sem grupo';
      if (!g[group]) g[group] = [];
      g[group].push(list);
    }
    return g;
  }, [lists]);

  return (
    <div className="flex-1 overflow-y-auto" style={{ backgroundColor: '#15BFAE' }}>
      <div className="max-w-4xl mx-auto px-6 py-8 min-h-full">
        <h1 className="text-2xl font-bold text-white mb-6">Dashboard</h1>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total de tarefas', value: stats.totalTasks, color: '#3b82f6' },
            { label: 'Pendentes', value: stats.pendingTasks, color: '#f59e0b' },
            { label: 'Concluidas', value: stats.completedTasks, color: '#22c55e' },
            { label: 'Concluidas hoje', value: stats.completedToday, color: '#15BFAE' },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-2xl font-bold" style={{ color: kpi.color }}>{kpi.value}</div>
              <div className="text-xs text-gray-500 mt-1">{kpi.label}</div>
            </div>
          ))}
        </div>

        {/* Daily Chart - Created vs Completed */}
        <div className="bg-white rounded-lg p-5 shadow-sm mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Tarefas criadas vs concluidas (14 dias)</h2>
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
                      title={`Criadas: ${created}`}
                    />
                    <div
                      className="w-1/2 rounded-t transition-all"
                      style={{ height: `${Math.max(completedH, 2)}%`, backgroundColor: '#22c55e' }}
                      title={`Concluidas: ${completed}`}
                    />
                  </div>
                  <span className="text-[9px] text-gray-400">{formatDate(day)}</span>
                  {/* Tooltip */}
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

        {/* Per List / Group breakdown */}
        <div className="bg-white rounded-lg p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Por lista (ultimos 7 dias)</h2>
          {Object.entries(groups).map(([groupName, groupLists]) => (
            <div key={groupName} className="mb-4">
              {Object.keys(groups).length > 1 && (
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{groupName}</h3>
              )}
              <div className="space-y-2">
                {groupLists.map((list) => {
                  const last7 = days.slice(-7);
                  const created7 = last7.reduce((sum, d) => sum + (stats.byListCreated[list.Id]?.[d] || 0), 0);
                  const completed7 = last7.reduce((sum, d) => sum + (stats.byListCompleted[list.Id]?.[d] || 0), 0);
                  const totalPending = tasks.filter((t) => t.list_id === list.Id && !t.completed).length;

                  return (
                    <div key={list.Id} className="flex items-center gap-3 py-2 px-3 rounded-md hover:bg-gray-50">
                      <span className="w-2 h-2 rounded-full bg-[#15BFAE] flex-shrink-0" />
                      <span className="text-sm text-gray-700 flex-1">{list.title}</span>
                      <div className="flex gap-4 text-xs">
                        <span className="text-gray-400">{totalPending} pendentes</span>
                        <span className="text-blue-500">+{created7} criadas</span>
                        <span className="text-green-500">{completed7} concluidas</span>
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
