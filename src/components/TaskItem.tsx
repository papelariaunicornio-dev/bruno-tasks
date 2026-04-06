import { useState, useRef, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useUpdateTask, useDeleteTask, useCreateTask } from '../hooks/useTasks';
import { useTaskTags } from '../hooks/useTags';
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
  const [subtasksCollapsed, setSubtasksCollapsed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const createTask = useCreateTask();
  const { data: allTags = [] } = useTags();
  const { data: taskTags = [] } = useTaskTags();
  const setView = useAppState((s) => s.setView);
  const showToast = useAppState((s) => s.showToast);
  const editingTaskId = useAppState((s) => s.editingTaskId);
  const setEditingTaskId = useAppState((s) => s.setEditingTaskId);

  const myTagIds = taskTags.filter((tt) => tt.task_id === task.Id).map((tt) => tt.tag_id);
  const myTags = allTags.filter((t) => myTagIds.includes(t.Id));

  const isCompleted = !!task.completed;
  const isPriority = !!task.priority;
  const isInProgress = !!task.in_progress;
  const isDelegated = !!task.delegated;

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
        {...attributes}
        {...listeners}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('task-id', String(task.Id));
          e.dataTransfer.effectAllowed = 'move';
        }}
        className={`group relative flex items-start gap-2 pl-2 pr-3 py-3 bg-white rounded-md mb-[2px] shadow-[0_1px_2px_rgba(0,0,0,0.06)] hover:shadow-[0_2px_4px_rgba(0,0,0,0.1)] transition-shadow cursor-grab active:cursor-grabbing ${
          isCompleted ? 'opacity-70' : ''
        }`}
      >
        {/* Subtask collapse toggle (left side) */}
        {subtasks.length > 0 && (
          <button
            className="flex-shrink-0 text-gray-300 hover:text-gray-500 mt-1.5 w-4 flex items-center justify-center"
            onClick={(e) => { e.stopPropagation(); setSubtasksCollapsed(!subtasksCollapsed); }}
            title={subtasksCollapsed ? 'Expandir subtarefas' : 'Recolher subtarefas'}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className={`transition-transform ${subtasksCollapsed ? '' : 'rotate-90'}`}>
              <path d="M8 5l8 7-8 7z" />
            </svg>
          </button>
        )}

        {/* Circular checkbox */}
        <button
          className={`w-7 h-7 mt-1 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
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
        <div className="flex-1 min-w-0 relative mt-1">
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

        {/* Flags group: delegada, em andamento, prioridade */}
        <div className="flex gap-0.5 flex-shrink-0">

        {/* Delegated (bookmark with user icon) */}
        <button
          className="transition-opacity hover:opacity-80 -mt-1 -mb-1"
          onClick={() => updateTask.mutate({ id: task.Id, delegated: !isDelegated })}
          title="Delegada"
        >
          <svg width="24" height="36" viewBox="0 0 24 36">
            <path d="M2 0h20a2 2 0 012 2v30l-12-6L0 32V2a2 2 0 012-2z" fill={isDelegated ? '#22c55e' : 'none'} stroke={isDelegated ? '#22c55e' : '#d1d5db'} strokeWidth="1.5" />
            <circle cx="12" cy="11" r="3.5" fill={isDelegated ? 'white' : '#d1d5db'} stroke="none" />
            <path d="M6.5 21.5c0-3 2.5-5.5 5.5-5.5s5.5 2.5 5.5 5.5" fill={isDelegated ? 'white' : '#d1d5db'} stroke="none" />
          </svg>
        </button>

        {/* In Progress (bookmark with play) */}
        <button
          className="transition-opacity hover:opacity-80 -mt-1 -mb-1"
          onClick={() => updateTask.mutate({ id: task.Id, in_progress: !isInProgress })}
          title="Em andamento"
        >
          <svg width="24" height="36" viewBox="0 0 24 36">
            <path d="M2 0h20a2 2 0 012 2v30l-12-6L0 32V2a2 2 0 012-2z" fill={isInProgress ? '#3b82f6' : 'none'} stroke={isInProgress ? '#3b82f6' : '#d1d5db'} strokeWidth="1.5" />
            <polygon points="9,10 9,20 17,15" fill={isInProgress ? 'white' : '#d1d5db'} stroke="none" />
          </svg>
        </button>

        {/* Priority (bookmark with star) */}
        <button
          className="transition-opacity hover:opacity-80 -mt-1 -mb-1"
          onClick={() => updateTask.mutate({ id: task.Id, priority: !isPriority })}
          title="Importante"
        >
          <svg width="24" height="36" viewBox="0 0 24 36">
            <path d="M2 0h20a2 2 0 012 2v30l-12-6L0 32V2a2 2 0 012-2z" fill={isPriority ? '#ef4444' : 'none'} stroke={isPriority ? '#ef4444' : '#d1d5db'} strokeWidth="1.5" />
            <path d="M12 7l2 4 4.5.7-3.2 3.1.8 4.5L12 17l-4.1 2.3.8-4.5-3.2-3.1 4.5-.7z" fill={isPriority ? 'white' : '#d1d5db'} stroke="none" />
          </svg>
        </button>

        </div>{/* end flags group */}

        {/* Subtask count badge */}
        {subtasks.length > 0 && (
          <span className="flex-shrink-0 text-[10px] text-gray-400 bg-gray-100 rounded-full px-1.5 py-0.5 mt-1">
            {subtasks.length}
          </span>
        )}

        {/* Delete - circle in top right corner */}
        <button
          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-600"
          onClick={() => {
            if (!task.title?.trim()) {
              // Blank tasks: hard delete, no trash
              deleteTask.mutate(task.Id);
            } else {
              updateTask.mutate({ id: task.Id, deleted: true, deleted_at: new Date().toISOString() });
              showToast(`"${task.title}" excluida`, () => {
                updateTask.mutate({ id: task.Id, deleted: false, deleted_at: null });
              });
            }
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Subtasks */}
      {!subtasksCollapsed && subtasks.map((sub) => (
        <TaskItem key={sub.Id} task={sub} depth={depth + 1} subtasks={[]} />
      ))}
    </>
  );
}
