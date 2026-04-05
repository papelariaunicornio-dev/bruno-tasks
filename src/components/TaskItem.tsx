import { useState, useRef, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useUpdateTask, useDeleteTask, useCreateTask } from '../hooks/useTasks';
import { useTaskTags, useRemoveTaskTag } from '../hooks/useTags';
import { useTags } from '../hooks/useTags';
import { useAppState } from '../store/appState';
import { TagBadge } from './TagBadge';
import { TagSelector } from './TagSelector';
import type { Task } from '../types';

interface TaskItemProps {
  task: Task;
  depth?: number;
  subtasks: Task[];
}

export function TaskItem({ task, depth = 0, subtasks }: TaskItemProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(task.title);
  const [showTagSelector, setShowTagSelector] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const createTask = useCreateTask();
  const { data: allTags = [] } = useTags();
  const { data: taskTags = [] } = useTaskTags();
  const removeTaskTag = useRemoveTaskTag();
  const setView = useAppState((s) => s.setView);
  const editingTaskId = useAppState((s) => s.editingTaskId);
  const setEditingTaskId = useAppState((s) => s.setEditingTaskId);

  const myTagIds = taskTags.filter((tt) => tt.task_id === task.Id).map((tt) => tt.tag_id);
  const myTags = allTags.filter((t) => myTagIds.includes(t.Id));

  const isCompleted = !!task.completed;
  const isPriority = !!task.priority;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.Id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    marginLeft: `${depth * 24}px`,
  };

  useEffect(() => {
    if (editingTaskId === task.Id) {
      setEditing(true);
      setEditValue(task.title);
      setEditingTaskId(null);
    }
  }, [editingTaskId, task.Id, task.title, setEditingTaskId]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function handleSave(deleteIfEmpty = false) {
    if (!editValue.trim() && deleteIfEmpty) {
      deleteTask.mutate(task.Id);
    } else if (editValue !== task.title) {
      updateTask.mutate({ id: task.Id, title: editValue.trim() || task.title });
    }
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
      createTask.mutate({ title: '', list_id: task.list_id, parent_id: task.parent_id || undefined, _autoFocus: true });
    }
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      handleSave();
      createTask.mutate({ title: '', list_id: task.list_id, parent_id: task.Id, _autoFocus: true });
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      handleSave();
      setShowTagSelector(true);
    }
    if (e.key === 'Escape') {
      setEditValue(task.title);
      setEditing(false);
    }
    if ((e.key === 'Delete' || e.key === 'Backspace') && !editValue) {
      e.preventDefault();
      deleteTask.mutate(task.Id);
    }
  }

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('task-id', String(task.Id));
          e.dataTransfer.effectAllowed = 'move';
        }}
        className={`group flex items-center gap-3 px-4 py-4 bg-white rounded-md mb-[2px] shadow-[0_1px_2px_rgba(0,0,0,0.06)] hover:shadow-[0_2px_4px_rgba(0,0,0,0.1)] transition-shadow ${
          isCompleted ? 'opacity-70' : ''
        }`}
      >
        {/* Drag handle (for dnd-kit reorder) */}
        <button
          {...attributes}
          {...listeners}
          className="opacity-0 group-hover:opacity-30 cursor-grab active:cursor-grabbing text-gray-400 -ml-2"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="9" cy="6" r="1.5" /><circle cx="15" cy="6" r="1.5" />
            <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
            <circle cx="9" cy="18" r="1.5" /><circle cx="15" cy="18" r="1.5" />
          </svg>
        </button>

        {/* Circular checkbox */}
        <button
          className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
            isCompleted
              ? 'bg-[#15BFAE] border-[#15BFAE] text-white'
              : 'border-gray-300 hover:border-[#15BFAE]'
          }`}
          onClick={() => updateTask.mutate({ id: task.Id, completed: !isCompleted, completed_at: !isCompleted ? new Date().toISOString() : null })}
        >
          {isCompleted && (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>

        {/* Title */}
        <div className="flex-1 min-w-0 relative">
          {editing ? (
            <input
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={() => handleSave()}
              onKeyDown={handleKeyDown}
              className="w-full bg-transparent text-base outline-none py-0.5"
            />
          ) : (
            <span
              className={`text-base cursor-text block truncate ${isCompleted ? 'line-through text-gray-400' : 'text-gray-800'}`}
              onClick={() => {
                setEditing(true);
                setEditValue(task.title);
              }}
            >
              {task.title || <span className="text-gray-300 italic">Tarefa sem titulo</span>}
            </span>
          )}
          {showTagSelector && (
            <TagSelector taskId={task.Id} onClose={() => setShowTagSelector(false)} />
          )}
        </div>

        {/* Tags */}
        <div className="flex gap-1 flex-shrink-0">
          {myTags.map((tag) => (
            <TagBadge
              key={tag.Id}
              tag={tag}
              onClick={() => setView({ type: 'tag', tagId: tag.Id })}
            />
          ))}
        </div>

        {/* Tag button */}
        <button
          className="opacity-0 group-hover:opacity-30 hover:!opacity-100 text-gray-400 text-xs"
          onClick={() => setShowTagSelector(!showTagSelector)}
          title="Tags (Tab)"
        >
          #
        </button>

        {/* Star (priority) */}
        <button
          className={`flex-shrink-0 transition-colors ${
            isPriority ? 'text-[#F2A30F]' : 'text-gray-200 hover:text-gray-400'
          }`}
          onClick={() => updateTask.mutate({ id: task.Id, priority: !isPriority })}
          title="Importante"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill={isPriority ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </button>

        {/* Delete */}
        <button
          className="opacity-0 group-hover:opacity-30 hover:!opacity-100 text-gray-400 hover:text-red-400"
          onClick={() => {
            if (!task.title || confirm('Excluir esta tarefa?')) {
              taskTags.filter((tt) => tt.task_id === task.Id).forEach((tt) => removeTaskTag.mutate(tt.Id));
              deleteTask.mutate(task.Id);
            }
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Subtasks */}
      {subtasks.map((sub) => (
        <TaskItem key={sub.Id} task={sub} depth={depth + 1} subtasks={[]} />
      ))}
    </>
  );
}
