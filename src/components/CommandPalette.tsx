import { useState, useRef, useEffect, useMemo } from 'react';
import { useAllTasks } from '../hooks/useTasks';
import { useLists } from '../hooks/useLists';
import { useTags } from '../hooks/useTags';
import { useAppState } from '../store/appState';

interface CommandItem {
  type: 'task' | 'list' | 'tag';
  id: number;
  title: string;
  subtitle?: string;
  color?: string;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const { data: tasks = [] } = useAllTasks();
  const { data: lists = [] } = useLists();
  const { data: tags = [] } = useTags();
  const { setView, setEditingTaskId } = useAppState();

  // Global Ctrl+K listener
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
        setQuery('');
        setSelectedIndex(0);
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Build search results
  const results = useMemo(() => {
    if (!query.trim()) {
      // Show recent/all lists and tags when empty
      const items: CommandItem[] = [
        ...lists.map((l) => ({
          type: 'list' as const,
          id: l.Id,
          title: l.title,
          subtitle: l.group_name ? `Grupo: ${l.group_name}` : 'Lista',
        })),
        ...tags.map((t) => ({
          type: 'tag' as const,
          id: t.Id,
          title: t.name,
          subtitle: 'Tag',
          color: t.color,
        })),
      ];
      return items.slice(0, 10);
    }

    const q = query.toLowerCase();
    const items: CommandItem[] = [];

    // Search tasks
    tasks
      .filter((t) => t.title?.toLowerCase().includes(q))
      .slice(0, 8)
      .forEach((t) => {
        const list = lists.find((l) => l.Id === t.list_id);
        items.push({
          type: 'task',
          id: t.Id,
          title: t.title,
          subtitle: list?.title ?? '',
        });
      });

    // Search lists
    lists
      .filter((l) => l.title.toLowerCase().includes(q))
      .slice(0, 4)
      .forEach((l) => {
        items.push({
          type: 'list',
          id: l.Id,
          title: l.title,
          subtitle: l.group_name ? `Grupo: ${l.group_name}` : 'Lista',
        });
      });

    // Search tags
    tags
      .filter((t) => t.name.toLowerCase().includes(q))
      .slice(0, 4)
      .forEach((t) => {
        items.push({
          type: 'tag',
          id: t.Id,
          title: t.name,
          subtitle: 'Tag',
          color: t.color,
        });
      });

    return items;
  }, [query, tasks, lists, tags]);

  // Keep selectedIndex in bounds
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.children[selectedIndex] as HTMLElement;
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  function handleSelect(item: CommandItem) {
    if (item.type === 'list') {
      setView({ type: 'list', listId: item.id });
    } else if (item.type === 'tag') {
      setView({ type: 'tag', tagId: item.id });
    } else if (item.type === 'task') {
      // Navigate to the task's list and focus it
      const task = tasks.find((t) => t.Id === item.id);
      if (task) {
        setView({ type: 'list', listId: task.list_id });
        setEditingTaskId(task.Id);
      }
    }
    setOpen(false);
    setQuery('');
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />

      {/* Dialog */}
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar tarefas, listas, tags..."
            className="flex-1 text-sm outline-none placeholder-gray-400"
          />
          <kbd className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">ESC</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-72 overflow-y-auto py-1">
          {results.length === 0 && query && (
            <p className="px-4 py-8 text-sm text-gray-400 text-center">Nenhum resultado para "{query}"</p>
          )}
          {results.map((item, i) => (
            <button
              key={`${item.type}-${item.id}`}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                i === selectedIndex ? 'bg-gray-50' : 'hover:bg-gray-50'
              }`}
              onClick={() => handleSelect(item)}
              onMouseEnter={() => setSelectedIndex(i)}
            >
              {/* Icon */}
              {item.type === 'task' && (
                <span className="w-4 h-4 rounded border-2 border-gray-300 flex-shrink-0" />
              )}
              {item.type === 'list' && (
                <span className="w-3 h-3 rounded-full bg-[#15BFAE] flex-shrink-0" />
              )}
              {item.type === 'tag' && (
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
              )}

              <div className="flex-1 min-w-0">
                <span className="block truncate text-gray-800">{item.title}</span>
                {item.subtitle && (
                  <span className="block text-xs text-gray-400 truncate">{item.subtitle}</span>
                )}
              </div>

              <span className="text-[10px] text-gray-300 uppercase flex-shrink-0">
                {item.type === 'task' ? 'Tarefa' : item.type === 'list' ? 'Lista' : 'Tag'}
              </span>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-4 py-2 flex gap-4 text-[10px] text-gray-400">
          <span><kbd className="bg-gray-100 px-1 rounded">↑↓</kbd> navegar</span>
          <span><kbd className="bg-gray-100 px-1 rounded">Enter</kbd> selecionar</span>
          <span><kbd className="bg-gray-100 px-1 rounded">Esc</kbd> fechar</span>
        </div>
      </div>
    </div>
  );
}
