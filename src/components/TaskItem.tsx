import { useState, useRef, useEffect } from 'react';
import { marked } from 'marked';
import { useUpdateTask, useDeleteTask, useCreateTask } from '../hooks/useTasks';
import { useTaskTags } from '../hooks/useTags';
import { useTags } from '../hooks/useTags';
import { useAppState } from '../store/appState';
import { TagBadge } from './TagBadge';
import { TagSelector } from './TagSelector';
import type { Task } from '../types';

const renderer = new marked.Renderer();
renderer.link = ({ href, text }) =>
  `<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`;
marked.setOptions({ breaks: true, gfm: true, renderer });

interface TaskItemProps {
  task: Task;
  depth?: number;
  subtasks: Task[];
  onReorder?: (taskId: number, targetId: number) => void;
}

export function TaskItem({ task, depth = 0, subtasks, onReorder }: TaskItemProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(task.title);
  const [showTagSelector, setShowTagSelector] = useState(false);
  const [subtasksCollapsed, setSubtasksCollapsed] = useState(false);
  const [dropIndicator, setDropIndicator] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteEditing, setNoteEditing] = useState(false);
  const [noteValue, setNoteValue] = useState(task.description ?? '');
  const inputRef = useRef<HTMLInputElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  const hasNote = !!(task.description && task.description.trim());

  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const createTask = useCreateTask();
  const { data: allTags = [] } = useTags();
  const { data: taskTags = [] } = useTaskTags();
  const setView = useAppState((s) => s.setView);
  const showToast = useAppState((s) => s.showToast);
  const editingTaskId = useAppState((s) => s.editingTaskId);
  const setEditingTaskId = useAppState((s) => s.setEditingTaskId);
  const tagSelectorTaskId = useAppState((s) => s.tagSelectorTaskId);
  const setTagSelectorTaskId = useAppState((s) => s.setTagSelectorTaskId);

  const myTagIds = taskTags.filter((tt) => tt.task_id === task.Id).map((tt) => tt.tag_id);
  const myTags = allTags.filter((t) => myTagIds.includes(t.Id));

  const isCompleted = !!task.completed;
  const isPriority = !!task.priority;
  const isInProgress = !!task.in_progress;
  const isDelegated = !!task.delegated;

  useEffect(() => {
    if (editingTaskId === task.Id) {
      setEditing(true);
      setEditValue(task.title);
      setEditingTaskId(null);
    }
  }, [editingTaskId, task.Id, task.title, setEditingTaskId]);

  useEffect(() => {
    if (tagSelectorTaskId === task.Id) {
      setShowTagSelector(true);
      setTagSelectorTaskId(null);
    }
  }, [tagSelectorTaskId, task.Id, setTagSelectorTaskId]);

  useEffect(() => {
    setNoteValue(task.description ?? '');
  }, [task.description]);

  useEffect(() => {
    if (noteEditing && noteRef.current) {
      noteRef.current.focus();
      // Auto-grow
      noteRef.current.style.height = 'auto';
      noteRef.current.style.height = noteRef.current.scrollHeight + 'px';
    }
  }, [noteEditing]);

  function handleSaveNote() {
    const trimmed = noteValue.trim();
    if (trimmed !== (task.description ?? '').trim()) {
      updateTask.mutate({ id: task.Id, description: trimmed });
    }
    setNoteEditing(false);
  }

  useEffect(() => {
    if (!editing) return;
    // Try focus immediately, then via rAF, then via timeout — ensures focus
    // lands on the input even when this row was just mounted (e.g. after
    // creating a new sibling/subtask via Enter or Shift+Enter).
    inputRef.current?.focus();
    inputRef.current?.select();
    const raf = requestAnimationFrame(() => {
      if (document.activeElement !== inputRef.current) {
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    });
    const t = setTimeout(() => {
      if (document.activeElement !== inputRef.current) {
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }, 60);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
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
        style={{ marginLeft: `${depth * 24}px` }}
        className="flex items-start mb-[2px]"
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes('task-id')) {
            e.preventDefault();
            e.stopPropagation();
            setDropIndicator(true);
          }
        }}
        onDragLeave={() => setDropIndicator(false)}
        onDrop={(e) => {
          const draggedId = e.dataTransfer.getData('task-id');
          if (draggedId && onReorder) {
            e.preventDefault();
            e.stopPropagation();
            onReorder(Number(draggedId), task.Id);
          }
          setDropIndicator(false);
        }}
      >
        {/* Subtask collapse toggle (outside the card) */}
        {subtasks.length > 0 ? (
          <button
            className="flex-shrink-0 text-gray-400 hover:text-white w-5 self-center flex items-center justify-center"
            onClick={() => setSubtasksCollapsed(!subtasksCollapsed)}
            title={subtasksCollapsed ? 'Expandir subtarefas' : 'Recolher subtarefas'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${subtasksCollapsed ? '' : 'rotate-90'}`}>
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
        ) : (
          <span className="w-5 flex-shrink-0" />
        )}

      <div
        className={`group relative flex-1 flex items-start gap-2 pr-3 py-3 bg-white rounded-md shadow-[0_1px_2px_rgba(0,0,0,0.06)] hover:shadow-[0_2px_4px_rgba(0,0,0,0.1)] transition-shadow ${
          isCompleted ? 'opacity-70' : ''
        } ${dropIndicator ? 'ring-2 ring-[#15BFAE] ring-offset-1' : ''}`}
      >
        {/* Drag handle */}
        <div
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData('task-id', String(task.Id));
            e.dataTransfer.effectAllowed = 'move';
          }}
          className="flex-shrink-0 self-stretch flex items-center px-1 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-30 hover:!opacity-60 text-gray-400"
          title="Arrastar para reordenar"
        >
          <svg width="12" height="16" viewBox="0 0 12 20" fill="currentColor">
            <circle cx="4" cy="4" r="1.5"/><circle cx="8" cy="4" r="1.5"/>
            <circle cx="4" cy="10" r="1.5"/><circle cx="8" cy="10" r="1.5"/>
            <circle cx="4" cy="16" r="1.5"/><circle cx="8" cy="16" r="1.5"/>
          </svg>
        </div>
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
              autoFocus
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

        {/* Tag + Note + Subtask buttons (vertical stack) */}
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          <button
            className="opacity-0 group-hover:opacity-30 hover:!opacity-100 text-gray-400 text-xs leading-none"
            onClick={() => setShowTagSelector(!showTagSelector)}
            title="Tags (Tab)"
          >
            #
          </button>
          <button
            className="opacity-30 md:opacity-0 group-hover:opacity-30 hover:!opacity-100 text-gray-400 leading-none"
            onClick={() => createTask.mutate({ title: '', list_id: task.list_id, parent_id: task.Id, _autoFocus: true })}
            title="Adicionar subtarefa"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
          <button
            className="opacity-0 group-hover:opacity-30 hover:!opacity-100 text-gray-400 leading-none"
            onClick={async (e) => {
              e.stopPropagation();
              const lines: string[] = [];
              lines.push(`- ${task.title || ''}`);
              for (const sub of subtasks) {
                lines.push(`  - ${sub.title || ''}`);
              }
              const text = lines.join('\n');
              try {
                await navigator.clipboard.writeText(text);
                showToast('Tarefa copiada');
              } catch {
                showToast('Erro ao copiar');
              }
            }}
            title="Copiar tarefa"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
          </button>
          <button
            className={`leading-none transition-opacity ${
              hasNote
                ? 'opacity-70 hover:opacity-100 text-[#15BFAE]'
                : 'opacity-0 group-hover:opacity-30 hover:!opacity-100 text-gray-400'
            }`}
            onClick={() => { setNoteOpen(!noteOpen); if (!noteOpen && !hasNote) setNoteEditing(true); }}
            title={hasNote ? 'Ver nota' : 'Adicionar nota'}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <path d="M14 2v6h6" />
              <path d="M8 13h8M8 17h6" />
            </svg>
          </button>
        </div>

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
      </div>{/* end outer flex */}

      {/* Note panel */}
      {noteOpen && (
        <div
          style={{ marginLeft: `${depth * 24 + 20}px` }}
          className="bg-white rounded-md mb-[2px] p-3 shadow-[0_1px_2px_rgba(0,0,0,0.06)] border-l-4 border-[#15BFAE]"
        >
          {noteEditing ? (
            <div>
              <textarea
                ref={noteRef}
                value={noteValue}
                onChange={(e) => {
                  setNoteValue(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = e.target.scrollHeight + 'px';
                }}
                onBlur={handleSaveNote}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setNoteValue(task.description ?? '');
                    setNoteEditing(false);
                  }
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    handleSaveNote();
                  }
                }}
                placeholder="Escreva sua nota em markdown... (Ctrl+Enter para salvar, Esc para cancelar)"
                className="w-full bg-transparent text-sm outline-none resize-none text-gray-800 font-mono leading-relaxed min-h-[60px]"
              />
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                <span className="text-[10px] text-gray-400">Markdown suportado</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setNoteValue(task.description ?? ''); setNoteEditing(false); }}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveNote}
                    className="text-xs bg-[#15BFAE] text-white px-3 py-1 rounded hover:bg-[#12a89a]"
                  >
                    Salvar
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div onClick={() => setNoteEditing(true)} className="cursor-text">
              {hasNote ? (
                <div
                  className="prose prose-sm max-w-none text-gray-700 markdown-note"
                  dangerouslySetInnerHTML={{ __html: marked.parse(task.description) as string }}
                />
              ) : (
                <p className="text-sm text-gray-300 italic">Clique para adicionar uma nota...</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Subtasks */}
      {!subtasksCollapsed && subtasks.map((sub) => (
        <TaskItem key={sub.Id} task={sub} depth={depth + 1} subtasks={[]} onReorder={onReorder} />
      ))}
    </>
  );
}
