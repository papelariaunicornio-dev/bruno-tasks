import { useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { TaskList } from './components/TaskList';
import { CommandPalette } from './components/CommandPalette';
import { useCreateTask } from './hooks/useTasks';
import { useLists } from './hooks/useLists';
import { useAppState } from './store/appState';

export default function App() {
  const createTask = useCreateTask();
  const { data: lists = [] } = useLists();
  const view = useAppState((s) => s.view);

  // Global keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      if (e.key === 'n' && !isInput) {
        e.preventDefault();
        const listId = view.type === 'list' ? view.listId : lists[0]?.Id;
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
      <TaskList />
      <CommandPalette />
    </div>
  );
}
