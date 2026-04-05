import { useState, useRef, useEffect } from 'react';
import { useTags, useCreateTag, useAddTaskTag, useRemoveTaskTag, useTaskTags } from '../hooks/useTags';
import { TAG_COLORS } from '../types';
import type { Tag } from '../types';
import { TagBadge } from './TagBadge';

interface TagSelectorProps {
  taskId: number;
  onClose: () => void;
}

export function TagSelector({ taskId, onClose }: TagSelectorProps) {
  const { data: allTags = [] } = useTags();
  const { data: taskTags = [] } = useTaskTags();
  const createTag = useCreateTag();
  const addTaskTag = useAddTaskTag();
  const removeTaskTag = useRemoveTaskTag();
  const [search, setSearch] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentTagIds = taskTags.filter((tt) => tt.task_id === taskId).map((tt) => tt.tag_id);
  const currentTags = allTags.filter((t) => currentTagIds.includes(t.Id));
  const availableTags = allTags.filter(
    (t) => !currentTagIds.includes(t.Id) && t.name.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    inputRef.current?.focus();
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  function handleToggleTag(tag: Tag) {
    if (currentTagIds.includes(tag.Id)) {
      const tt = taskTags.find((t) => t.task_id === taskId && t.tag_id === tag.Id);
      if (tt) removeTaskTag.mutate(tt.Id);
    } else {
      addTaskTag.mutate({ task_id: taskId, tag_id: tag.Id });
    }
  }

  function handleCreateTag(color: string) {
    if (!search.trim()) return;
    createTag.mutate(
      { name: search.trim(), color },
      {
        onSuccess: (newTag) => {
          addTaskTag.mutate({ task_id: taskId, tag_id: newTag.Id });
          setSearch('');
          setShowColorPicker(false);
        },
      }
    );
  }

  return (
    <div ref={containerRef} className="absolute z-50 top-full left-0 mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 p-2">
      <div className="flex flex-wrap gap-1 mb-2">
        {currentTags.map((tag) => (
          <TagBadge key={tag.Id} tag={tag} removable onRemove={() => handleToggleTag(tag)} />
        ))}
      </div>
      <input
        ref={inputRef}
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
          if (e.key === 'Enter' && search.trim()) {
            const existing = allTags.find((t) => t.name.toLowerCase() === search.toLowerCase());
            if (existing) handleToggleTag(existing);
            else setShowColorPicker(true);
          }
        }}
        placeholder="Buscar ou criar tag..."
        className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:border-[#15BFAE]"
      />
      {showColorPicker && (
        <div className="mt-2 p-2 border-t border-gray-100">
          <p className="text-xs text-gray-500 mb-1">Escolha uma cor para "{search}":</p>
          <div className="flex flex-wrap gap-1">
            {TAG_COLORS.map((c) => (
              <button
                key={c.value}
                className="w-6 h-6 rounded-full border-2 border-transparent hover:border-gray-400 transition-all"
                style={{ backgroundColor: c.value }}
                onClick={() => handleCreateTag(c.value)}
              />
            ))}
          </div>
        </div>
      )}
      {!showColorPicker && (
        <div className="mt-1 max-h-40 overflow-y-auto">
          {availableTags.map((tag) => (
            <button
              key={tag.Id}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-gray-50 rounded text-left"
              onClick={() => handleToggleTag(tag)}
            >
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color }} />
              {tag.name}
            </button>
          ))}
          {search.trim() && !allTags.find((t) => t.name.toLowerCase() === search.toLowerCase()) && (
            <button
              className="w-full flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-gray-50 rounded text-left text-[#15BFAE]"
              onClick={() => setShowColorPicker(true)}
            >
              + Criar tag "{search}"
            </button>
          )}
        </div>
      )}
    </div>
  );
}
