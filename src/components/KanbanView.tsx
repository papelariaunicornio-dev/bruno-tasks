import { useState } from 'react';
import { useAllTasks, useUpdateTask, useCreateTask } from '../hooks/useTasks';
import { useLists } from '../hooks/useLists';
import { useTaskTags, useTags } from '../hooks/useTags';
import { useAppState } from '../store/appState';
import { TagBadge } from './TagBadge';
import type { Task } from '../types';

export function KanbanView() {
  const { data: allTasks = [] } = useAllTasks();
  const { data: lists = [] } = useLists();
  const { data: taskTags = [] } = useTaskTags();
  const { data: allTagsList = [] } = useTags();
  const updateTask = useUpdateTask();
  const createTask = useCreateTask();
  const setView = useAppState((s) => s.setView);
  const showToast = useAppState((s) => s.showToast);

  const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);
  const [dropTargetListId, setDropTargetListId] = useState<number | null>(null);
  const [newTaskListId, setNewTaskListId] = useState<number | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const visibleTasks = allTasks.filter((t) => !t.deleted && !t.parent_id);

  function getListTasks(listId: number) {
    const pending = visibleTasks.filter((t) => t.list_id === listId && !t.completed);
    const completed = visibleTasks.filter((t) => t.list_id === listId && !!t.completed);
    // In progress first, then priority, then rest
    const inProgress = pending.filter((t) => !!t.in_progress);
    const priority = pending.filter((t) => !!t.priority && !t.in_progress);
    const rest = pending.filter((t) => !t.priority && !t.in_progress);
    return { active: [...inProgress, ...priority, ...rest], completed };
  }

  function getTaskTags(taskId: number) {
    const tagIds = taskTags.filter((tt) => tt.task_id === taskId).map((tt) => tt.tag_id);
    return allTagsList.filter((t) => tagIds.includes(t.Id));
  }

  function getSubtaskCount(taskId: number) {
    return allTasks.filter((t) => t.parent_id === taskId && !t.deleted).length;
  }

  function handleDragStart(e: React.DragEvent, taskId: number) {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(taskId));
  }

  function handleDrop(e: React.DragEvent, listId: number) {
    e.preventDefault();
    if (draggedTaskId) {
      updateTask.mutate({ id: draggedTaskId, list_id: listId });
      setDraggedTaskId(null);
    }
    setDropTargetListId(null);
  }

  function handleNewTask(listId: number) {
    if (!newTaskTitle.trim()) { setNewTaskListId(null); return; }
    createTask.mutate({ title: newTaskTitle.trim(), list_id: listId });
    setNewTaskTitle('');
    setNewTaskListId(null);
  }

  function renderCard(task: Task) {
    const tags = getTaskTags(task.Id);
    const subtaskCount = getSubtaskCount(task.Id);
    const isCompleted = !!task.completed;

    return (
      <div
        key={task.Id}
        draggable
        onDragStart={(e) => handleDragStart(e, task.Id)}
        className={`group bg-white rounded-lg p-3 mb-2 shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing border border-gray-100 ${
          isCompleted ? 'opacity-60' : ''
        }`}
      >
        <div className="flex items-start gap-2">
          {/* Checkbox */}
          <button
            className={`w-5 h-5 mt-0.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
              isCompleted
                ? 'bg-[#15BFAE] border-[#15BFAE] text-white'
                : 'border-gray-300 hover:border-[#15BFAE]'
            }`}
            onClick={() => updateTask.mutate({
              id: task.Id,
              completed: !isCompleted,
              completed_at: !isCompleted ? new Date().toISOString() : null,
            })}
          >
            {isCompleted && (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>

          <div className="flex-1 min-w-0">
            <p className={`text-sm leading-snug ${isCompleted ? 'line-through text-gray-400' : 'text-gray-800'}`}>
              {task.title || <span className="text-gray-300 italic">Sem titulo</span>}
            </p>

            {/* Flags */}
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {!!task.in_progress && (
                <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full font-medium">Em andamento</span>
              )}
              {!!task.priority && (
                <span className="text-[10px] bg-red-100 text-red-500 px-1.5 py-0.5 rounded-full font-medium">Prioridade</span>
              )}
              {!!task.delegated && (
                <span className="text-[10px] bg-green-100 text-green-600 px-1.5 py-0.5 rounded-full font-medium">Delegada</span>
              )}
              {subtaskCount > 0 && (
                <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                  {subtaskCount} sub
                </span>
              )}
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <div className="flex gap-1 mt-1.5 flex-wrap">
                {tags.map((tag) => (
                  <TagBadge key={tag.Id} tag={tag} onClick={() => setView({ type: 'tag', tagId: tag.Id })} />
                ))}
              </div>
            )}
          </div>

          {/* Delete */}
          <button
            className="opacity-0 group-hover:opacity-60 hover:!opacity-100 text-gray-400 hover:text-red-500 transition-opacity"
            onClick={() => {
              updateTask.mutate({ id: task.Id, deleted: true, deleted_at: new Date().toISOString() });
              showToast(`"${task.title}" excluida`, () => {
                updateTask.mutate({ id: task.Id, deleted: false, deleted_at: null });
              });
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-x-auto overflow-y-hidden" style={{ backgroundColor: '#025960' }}>
      <div className="px-6 py-8 min-h-full">
        <h1 className="text-2xl font-bold text-white mb-6">Kanban</h1>

        <div className="flex gap-4 pb-4" style={{ minWidth: 'max-content' }}>
          {lists.map((list) => {
            const { active, completed } = getListTasks(list.Id);
            const isDropTarget = dropTargetListId === list.Id;

            return (
              <div
                key={list.Id}
                className={`w-72 flex-shrink-0 rounded-xl flex flex-col max-h-[calc(100vh-12rem)] transition-colors ${
                  isDropTarget ? 'bg-white/25 ring-2 ring-white/40' : 'bg-white/10'
                }`}
                onDragOver={(e) => { e.preventDefault(); setDropTargetListId(list.Id); }}
                onDragLeave={() => setDropTargetListId(null)}
                onDrop={(e) => handleDrop(e, list.Id)}
              >
                {/* Column header */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
                  {list.emoji && <span className="text-lg">{list.emoji}</span>}
                  <h3 className="text-sm font-semibold text-white/90 flex-1 truncate">{list.title}</h3>
                  <span className="text-xs text-white/50 bg-white/10 rounded-full px-2 py-0.5">
                    {active.length}
                  </span>
                  <button
                    className="text-white/40 hover:text-white/80 transition-colors"
                    onClick={() => { setNewTaskListId(list.Id); setNewTaskTitle(''); }}
                    title="Adicionar tarefa"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </button>
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto p-3 space-y-0">
                  {/* New task input */}
                  {newTaskListId === list.Id && (
                    <div className="bg-white rounded-lg p-3 mb-2 shadow-sm border border-[#15BFAE]">
                      <input
                        type="text"
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleNewTask(list.Id);
                          if (e.key === 'Escape') { setNewTaskListId(null); setNewTaskTitle(''); }
                        }}
                        onBlur={() => handleNewTask(list.Id)}
                        placeholder="Nova tarefa..."
                        className="w-full text-sm outline-none"
                        autoFocus
                      />
                    </div>
                  )}

                  {active.map(renderCard)}

                  {/* Completed section */}
                  {completed.length > 0 && (
                    <details className="mt-2">
                      <summary className="text-xs text-white/40 cursor-pointer hover:text-white/60 py-1">
                        Concluidas ({completed.length})
                      </summary>
                      <div className="mt-1">
                        {completed.map(renderCard)}
                      </div>
                    </details>
                  )}

                  {active.length === 0 && completed.length === 0 && (
                    <p className="text-center text-white/30 text-sm py-6">Nenhuma tarefa</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
