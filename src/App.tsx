import { useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { TaskList } from './components/TaskList';
import { StatsView } from './components/StatsView';
import { CommandPalette } from './components/CommandPalette';
import { useCreateTask } from './hooks/useTasks';
import { useLists } from './hooks/useLists';
import { useAppState } from './store/appState';
import { api } from './api/nocodb';
import type { List } from './types';

export default function App() {
  const createTask = useCreateTask();
  const { data: lists = [] } = useLists();
  const view = useAppState((s) => s.view);
  const inboxChecked = useRef(false);

  // Ensure Inbox list exists and handle URL task creation
  useEffect(() => {
    if (inboxChecked.current || lists.length === 0 && !inboxChecked.current) return;

    async function ensureInboxAndProcessUrl() {
      if (inboxChecked.current) return;
      inboxChecked.current = true;

      // Find or create Inbox
      let inbox = lists.find((l) => l.title === 'Inbox');
      if (!inbox) {
        inbox = await api.create<List>('lists', {
          title: 'Inbox',
          group_name: '',
          position: 0, // Always first
          created_at: new Date().toISOString(),
        });
      }

      // Check URL for task parameter
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
        // Clean URL without reload
        window.history.replaceState({}, '', window.location.pathname);
        // Show confirmation briefly
        document.title = `✓ "${taskTitle}" adicionada`;
        setTimeout(() => { document.title = 'Bruno Tasks'; }, 2000);
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
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      {view.type === 'stats' ? <StatsView /> : <TaskList />}
      <CommandPalette />
    </div>
  );
}
