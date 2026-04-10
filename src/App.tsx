import { useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { TaskList } from './components/TaskList';
import { StatsView } from './components/StatsView';
import { HomeView } from './components/HomeView';
import { HabitTrackerView } from './components/HabitTrackerView';
import { CommandPalette } from './components/CommandPalette';
import { QuickAdd } from './components/QuickAdd';
import { Toast } from './components/Toast';
import { useQueryClient } from '@tanstack/react-query';
import { useCreateTask } from './hooks/useTasks';
import { useLists } from './hooks/useLists';
import { useAppState } from './store/appState';
import { api } from './api/nocodb';
import type { List } from './types';

export default function App() {
  const queryClient = useQueryClient();
  const createTask = useCreateTask();
  const { data: lists = [] } = useLists();
  const view = useAppState((s) => s.view);
  const toast = useAppState((s) => s.toast);
  const hideToast = useAppState((s) => s.hideToast);
  const sidebarOpen = useAppState((s) => s.sidebarOpen);
  const toggleSidebar = useAppState((s) => s.toggleSidebar);
  const setSidebarOpen = useAppState((s) => s.setSidebarOpen);
  const inboxChecked = useRef(false);

  // Ensure Inbox list exists and handle URL task creation
  useEffect(() => {
    if (inboxChecked.current || lists.length === 0 && !inboxChecked.current) return;

    async function ensureInboxAndProcessUrl() {
      if (inboxChecked.current) return;
      inboxChecked.current = true;

      let inbox = lists.find((l) => l.title === 'Inbox');
      if (!inbox) {
        inbox = await api.create<List>('lists', {
          title: 'Inbox',
          group_name: '',
          position: 0,
          created_at: new Date().toISOString(),
        });
      }

      const params = new URLSearchParams(window.location.search);
      const taskTitle = params.get('task');
      if (taskTitle && inbox) {
        await api.create('tasks', {
          title: taskTitle,
          list_id: inbox.Id,
          completed: false,
          priority: false,
          position: Date.now(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        queryClient.invalidateQueries({ queryKey: ['lists'] });
        window.history.replaceState({}, '', window.location.pathname);
        document.title = `✓ "${taskTitle}" adicionada`;
        setTimeout(() => { document.title = 'Bruno Tasks'; }, 2000);
        useAppState.getState().showToast(`"${taskTitle}" adicionada na Inbox`);
        useAppState.getState().setView({ type: 'list', listId: inbox.Id });
      }
    }

    ensureInboxAndProcessUrl();
  }, [lists]);

  // Global keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      if (e.key === 'n' && !isInput) {
        e.preventDefault();
        const inbox = lists.find((l) => l.title === 'Inbox');
        const listId = view.type === 'list' ? view.listId : inbox?.Id || lists[0]?.Id;
        if (listId) {
          createTask.mutate({ title: '', list_id: listId });
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [view, lists, createTask]);

  return (
    <div className="flex h-screen bg-gray-50 relative overflow-hidden">
      {/* Mobile header bar */}
      <div className="fixed top-0 left-0 right-0 z-30 flex items-center gap-3 px-4 py-3 bg-[#15BFAE] md:hidden">
        <button onClick={toggleSidebar} className="text-white">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12h18M3 6h18M3 18h18" />
          </svg>
        </button>
        <button onClick={() => useAppState.getState().setView({ type: 'home' })} className="text-white font-semibold text-base">Bruno Tasks</button>
      </div>

      {/* Backdrop (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-200 ease-in-out
        md:relative md:translate-x-0 md:w-64 md:z-auto
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col pt-14 md:pt-0 overflow-hidden" style={{ backgroundColor: '#025960' }}>
        {view.type === 'home' ? <HomeView /> : view.type === 'stats' ? <StatsView /> : view.type === 'habits' ? <HabitTrackerView /> : <TaskList />}
      </div>

      <CommandPalette />
      <QuickAdd />
      {toast && (
        <Toast
          message={toast.message}
          onUndo={toast.onUndo}
          onClose={hideToast}
        />
      )}
    </div>
  );
}
