import { useState, useRef, useEffect } from 'react';
import { useCreateTask } from '../hooks/useTasks';
import { useLists } from '../hooks/useLists';

export function QuickAdd() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [selectedListId, setSelectedListId] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const createTask = useCreateTask();
  const { data: lists = [] } = useLists();

  // Ctrl+Alt+Shift+A listener
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey && e.altKey && e.shiftKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        setOpen(true);
        setTitle('');
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      // Default to Inbox
      const inbox = lists.find((l) => l.title === 'Inbox');
      if (inbox && !selectedListId) setSelectedListId(inbox.Id);
    }
  }, [open, lists, selectedListId]);

  function handleSubmit() {
    if (!title.trim()) return;
    const listId = selectedListId || lists.find((l) => l.title === 'Inbox')?.Id || lists[0]?.Id;
    if (!listId) return;
    createTask.mutate({ title: title.trim(), list_id: listId });
    setTitle('');
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />

      {/* Dialog */}
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#15BFAE" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          <span className="text-base font-medium text-gray-700">Nova tarefa</span>
          <kbd className="ml-auto text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">ESC</kbd>
        </div>

        {/* Input */}
        <div className="px-4 py-4">
          <input
            ref={inputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="O que precisa fazer?"
            className="w-full text-lg outline-none placeholder-gray-300"
            autoFocus
          />
        </div>

        {/* List selector */}
        <div className="px-4 pb-4 flex items-center gap-2">
          <span className="text-sm text-gray-400">Lista:</span>
          <select
            value={selectedListId || ''}
            onChange={(e) => setSelectedListId(Number(e.target.value))}
            className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 outline-none focus:border-[#15BFAE]"
          >
            {lists.map((list) => (
              <option key={list.Id} value={list.Id}>{list.title}</option>
            ))}
          </select>
          <button
            onClick={handleSubmit}
            disabled={!title.trim()}
            className="ml-auto px-4 py-1.5 bg-[#15BFAE] text-white text-sm font-medium rounded-md hover:bg-[#14D9B5] disabled:opacity-40 transition-colors"
          >
            Criar
          </button>
        </div>
      </div>
    </div>
  );
}
