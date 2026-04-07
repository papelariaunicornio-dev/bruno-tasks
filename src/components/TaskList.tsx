import { useState, useRef, useEffect } from 'react';
import { useAllTasks, useCreateTask, useUpdateTask, useBulkUpdatePositions } from '../hooks/useTasks';
import { useTaskTags } from '../hooks/useTags';
import { useTags } from '../hooks/useTags';
import { useLists } from '../hooks/useLists';
import { useAppState } from '../store/appState';
import { TaskItem } from './TaskItem';
import { SortMenu } from './SortMenu';
import type { Task, SortCriteria } from '../types';

function sortTasks(tasks: Task[], sortBy: SortCriteria): Task[] {
  const sorted = [...tasks];
  switch (sortBy) {
    case 'alphabetical':
      sorted.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case 'created':
      sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      break;
    case 'priority':
      sorted.sort((a, b) => (!!b.priority ? 1 : 0) - (!!a.priority ? 1 : 0));
      break;
    case 'manual':
    default:
      sorted.sort((a, b) => a.position - b.position);
      break;
  }
  // In progress first, then priority, then rest, completed last
  const inProgress = sorted.filter((t) => !!t.in_progress && !t.completed);
  const priority = sorted.filter((t) => !!t.priority && !t.in_progress && !t.completed);
  const rest = sorted.filter((t) => !t.priority && !t.in_progress && !t.completed);
  const completed = sorted.filter((t) => !!t.completed);
  return [...inProgress, ...priority, ...rest, ...completed];
}

export function TaskList() {
  const { data: allTasks = [] } = useAllTasks();
  const { data: taskTags = [] } = useTaskTags();
  const { data: allTagsList = [] } = useTags();
  const { data: lists = [] } = useLists();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const bulkUpdate = useBulkUpdatePositions();
  const { view, sortBy, kanbanMode, toggleKanban } = useAppState();
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [showCompleted, setShowCompleted] = useState(true);
  const newTaskInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input on load and view change
  useEffect(() => {
    setTimeout(() => newTaskInputRef.current?.focus(), 100);
  }, [view]);


  let filteredTasks: Task[];
  let viewTitle: string;

  // Filter out deleted tasks (except in trash view)
  const visibleTasks = view.type === 'trash' ? allTasks.filter((t) => !!t.deleted) : allTasks.filter((t) => !t.deleted);

  if (view.type === 'list') {
    filteredTasks = visibleTasks.filter((t) => t.list_id === view.listId);
    const list = lists.find((l) => l.Id === view.listId);
    viewTitle = (list?.emoji ? list.emoji + ' ' : '') + (list?.title ?? 'Lista');
  } else if (view.type === 'tag') {
    const tagTaskIds = taskTags.filter((tt) => tt.tag_id === view.tagId).map((tt) => tt.task_id);
    filteredTasks = visibleTasks.filter((t) => tagTaskIds.includes(t.Id));
    const tag = allTagsList.find((t) => t.Id === view.tagId);
    viewTitle = tag?.name ?? '';
  } else if (view.type === 'in_progress' || view.type === 'priority' || view.type === 'delegated') {
    const flagField = view.type === 'in_progress' ? 'in_progress'
      : view.type === 'priority' ? 'priority' : 'delegated';
    const matched = visibleTasks.filter((t) => !!t[flagField]);
    const matchedIds = new Set(matched.map((t) => t.Id));
    // Include subtasks whose parent has the flag (even if subtask doesn't)
    const subtasksOfMatched = visibleTasks.filter(
      (t) => t.parent_id != null && matchedIds.has(t.parent_id) && !matchedIds.has(t.Id)
    );
    filteredTasks = [...matched, ...subtasksOfMatched];
    viewTitle = view.type === 'in_progress' ? 'Em andamento'
      : view.type === 'priority' ? 'Prioridade' : 'Delegadas';
  } else if (view.type === 'trash') {
    filteredTasks = visibleTasks;
    viewTitle = 'Lixeira';
  } else {
    filteredTasks = visibleTasks;
    viewTitle = 'Todas as tarefas';
  }

  const isFilterView = view.type === 'in_progress' || view.type === 'priority' || view.type === 'delegated';
  const filteredIds = new Set(filteredTasks.map((t) => t.Id));
  // In filter views, a task is "root" if it has no parent OR its parent is NOT in the filter set
  // (so subtasks render nested under their parent when the parent is also in the set)
  const rootTasks = isFilterView
    ? filteredTasks.filter((t) => !t.parent_id || !filteredIds.has(t.parent_id))
    : filteredTasks.filter((t) => !t.parent_id);
  const pendingTasks = rootTasks.filter((t) => !t.completed);
  const completedTasks = rootTasks.filter((t) => !!t.completed);
  const allVisible = allTasks.filter((t) => !t.deleted);
  const getSubtasks = (parentId: number) =>
    isFilterView
      ? sortTasks(filteredTasks.filter((t) => t.parent_id === parentId), sortBy)
      : sortTasks(allVisible.filter((t) => t.parent_id === parentId), sortBy);
  const sortedActiveTasks = sortTasks(pendingTasks, sortBy);

  function handleReorder(draggedId: number, targetId: number) {
    if (draggedId === targetId) return;
    const list = [...sortedActiveTasks];
    const oldIndex = list.findIndex((t) => t.Id === draggedId);
    const newIndex = list.findIndex((t) => t.Id === targetId);
    if (oldIndex === -1 || newIndex === -1) return;
    const [moved] = list.splice(oldIndex, 1);
    list.splice(newIndex, 0, moved);
    const updates = list.map((t, i) => ({ Id: t.Id, position: i }));
    bulkUpdate.mutate(updates);
  }

  function handleNewTask(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && newTaskTitle.trim()) {
      const inbox = lists.find((l) => l.title === 'Inbox');
      const listId = view.type === 'list' ? view.listId : inbox?.Id || lists[0]?.Id;
      if (!listId) return;
      const extra: Partial<Task> = {};
      if (view.type === 'in_progress') extra.in_progress = true;
      if (view.type === 'priority') extra.priority = true;
      if (view.type === 'delegated') extra.delegated = true;
      createTask.mutate({ title: newTaskTitle.trim(), list_id: listId, ...extra });
      setNewTaskTitle('');
      // Keep focus on the input for sequential task creation
      newTaskInputRef.current?.focus();
    }
    if (e.key === 'Escape') {
      setNewTaskTitle('');
      newTaskInputRef.current?.blur();
    }
  }

  const groupByList = view.type === 'tag' || view.type === 'all' || view.type === 'in_progress' || view.type === 'priority' || view.type === 'delegated';

  // Kanban columns for per-list view
  const [kanbanDropTarget, setKanbanDropTarget] = useState<string | null>(null);

  const kanbanTodo = rootTasks.filter((t) => !t.completed && !t.in_progress);
  const kanbanDoing = rootTasks.filter((t) => !t.completed && !!t.in_progress);
  const kanbanDone = rootTasks.filter((t) => !!t.completed);

  function handleKanbanDrop(e: React.DragEvent, column: 'todo' | 'doing' | 'done') {
    e.preventDefault();
    setKanbanDropTarget(null);
    const taskId = e.dataTransfer.getData('task-id');
    if (!taskId) return;
    const id = Number(taskId);
    if (column === 'todo') {
      updateTask.mutate({ id, in_progress: false, completed: false, completed_at: null });
    } else if (column === 'doing') {
      updateTask.mutate({ id, in_progress: true, completed: false, completed_at: null });
    } else if (column === 'done') {
      updateTask.mutate({ id, completed: true, in_progress: false, completed_at: new Date().toISOString() });
    }
  }

  function renderKanbanCard(task: Task) {
    const isCompleted = !!task.completed;
    return (
      <div
        key={task.Id}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('task-id', String(task.Id));
          e.dataTransfer.effectAllowed = 'move';
        }}
        className={`bg-white rounded-lg p-3 mb-2 shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing border border-gray-100 ${
          isCompleted ? 'opacity-60' : ''
        }`}
      >
        <div className="flex items-start gap-2">
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
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {!!task.priority && (
                <span className="text-[10px] bg-red-100 text-red-500 px-1.5 py-0.5 rounded-full font-medium">Prioridade</span>
              )}
              {!!task.delegated && (
                <span className="text-[10px] bg-green-100 text-green-600 px-1.5 py-0.5 rounded-full font-medium">Delegada</span>
              )}
              {getSubtasks(task.Id).length > 0 && (
                <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                  {getSubtasks(task.Id).length} sub
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderKanbanColumn(title: string, tasks: Task[], column: 'todo' | 'doing' | 'done', color: string) {
    const isDropTarget = kanbanDropTarget === column;
    return (
      <div
        className={`flex-1 min-w-0 rounded-xl flex flex-col max-h-[calc(100vh-16rem)] transition-colors ${
          isDropTarget ? 'bg-white/25 ring-2 ring-white/40' : 'bg-white/10'
        }`}
        onDragOver={(e) => { e.preventDefault(); setKanbanDropTarget(column); }}
        onDragLeave={() => setKanbanDropTarget(null)}
        onDrop={(e) => handleKanbanDrop(e, column)}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
          <span className={`w-2.5 h-2.5 rounded-full`} style={{ backgroundColor: color }} />
          <h3 className="text-sm font-semibold text-white/90 flex-1">{title}</h3>
          <span className="text-xs text-white/50 bg-white/10 rounded-full px-2 py-0.5">{tasks.length}</span>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {tasks.map(renderKanbanCard)}
          {tasks.length === 0 && (
            <p className="text-center text-white/30 text-xs py-6">Nenhuma tarefa</p>
          )}
        </div>
      </div>
    );
  }

  function renderKanbanColumns() {
    return (
      <div className="flex gap-3" style={{ minHeight: '300px' }}>
        {renderKanbanColumn('A fazer', kanbanTodo, 'todo', '#9ca3af')}
        {renderKanbanColumn('Fazendo', kanbanDoing, 'doing', '#3b82f6')}
        {renderKanbanColumn('Feito', kanbanDone, 'done', '#22c55e')}
      </div>
    );
  }

  function renderTaskGroup(tasks: Task[], completedList: Task[]) {
    return (
      <>
        {tasks.map((task) => (
          <TaskItem key={task.Id} task={task} subtasks={getSubtasks(task.Id)} onReorder={handleReorder} />
        ))}

        {/* Completed section */}
        {completedList.length > 0 && (
          <div className="mt-3">
            <button
              onClick={() => setShowCompleted(!showCompleted)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white/80 hover:text-white bg-white/10 rounded-md mb-1 transition-colors"
            >
              <svg
                width="12" height="12" viewBox="0 0 24 24" fill="currentColor"
                className={`transition-transform ${showCompleted ? 'rotate-90' : ''}`}
              >
                <path d="M8 5l8 7-8 7z" />
              </svg>
              Concluida
              <span className="text-xs text-white/50 ml-1">{completedList.length}</span>
            </button>
            {showCompleted && completedList.map((task) => (
              <TaskItem key={task.Id} task={task} subtasks={getSubtasks(task.Id)} />
            ))}
          </div>
        )}
      </>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto" style={{ backgroundColor: '#025960' }}>
      <div className="max-w-3xl mx-auto px-6 py-8 min-h-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{viewTitle}</h1>
            {view.type === 'list' && (
              <button
                onClick={toggleKanban}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  kanbanMode ? 'bg-white/25 text-white' : 'bg-white/10 text-white/60 hover:text-white hover:bg-white/15'
                }`}
                title={kanbanMode ? 'Visualizacao em lista' : 'Visualizacao Kanban'}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="2" y="3" width="6" height="18" rx="1" />
                  <rect x="9" y="3" width="6" height="12" rx="1" />
                  <rect x="16" y="3" width="6" height="15" rx="1" />
                </svg>
                Kanban
              </button>
            )}
          </div>
          {!kanbanMode && <SortMenu />}
        </div>

        {/* New task input */}
        {(view.type === 'list' || lists.length > 0) && (
          <div className="flex items-center gap-3 px-4 py-4 bg-white/20 backdrop-blur-sm rounded-md mb-4 border border-white/20">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="opacity-60">
              <path d="M12 5v14M5 12h14" />
            </svg>
            <input
              ref={newTaskInputRef}
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={handleNewTask}
              placeholder="Adicionar uma tarefa"
              className="flex-1 bg-transparent text-base outline-none text-white placeholder-white/60"
              autoFocus
            />
          </div>
        )}

        {/* Tasks */}
        {kanbanMode && view.type === 'list' ? (
          renderKanbanColumns()
        ) : groupByList ? (
          lists.map((list) => {
            const listActive = sortedActiveTasks.filter((t) => t.list_id === list.Id);
            const listCompleted = completedTasks.filter((t) => t.list_id === list.Id);
            if (listActive.length === 0 && listCompleted.length === 0) return null;
            return (
              <div key={list.Id} className="mb-6">
                <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-2 px-1">
                  {list.emoji && <span className="mr-1">{list.emoji}</span>}{list.title}
                </h2>
                {renderTaskGroup(listActive, listCompleted)}
              </div>
            );
          })
        ) : (
          renderTaskGroup(sortedActiveTasks, completedTasks)
        )}

        {allTasks.length === 0 && lists.length === 0 && (
          <div className="text-center text-white/60 mt-20">
            <p className="text-lg mb-2">Nenhuma tarefa ainda</p>
            <p className="text-sm">Crie uma lista no menu lateral para comecar</p>
          </div>
        )}
      </div>
    </div>
  );
}
