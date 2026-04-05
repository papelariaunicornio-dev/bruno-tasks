import { useState, useRef, useEffect } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useAllTasks, useCreateTask, useBulkUpdatePositions } from '../hooks/useTasks';
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
  const bulkUpdate = useBulkUpdatePositions();
  const { view, sortBy } = useAppState();
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [showCompleted, setShowCompleted] = useState(true);
  const newTaskInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input on load and view change
  useEffect(() => {
    setTimeout(() => newTaskInputRef.current?.focus(), 100);
  }, [view]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

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
  } else if (view.type === 'in_progress') {
    filteredTasks = visibleTasks.filter((t) => !!t.in_progress);
    viewTitle = 'Em andamento';
  } else if (view.type === 'priority') {
    filteredTasks = visibleTasks.filter((t) => !!t.priority);
    viewTitle = 'Prioridade';
  } else if (view.type === 'delegated') {
    filteredTasks = visibleTasks.filter((t) => !!t.delegated);
    viewTitle = 'Delegadas';
  } else if (view.type === 'trash') {
    filteredTasks = visibleTasks;
    viewTitle = 'Lixeira';
  } else {
    filteredTasks = visibleTasks;
    viewTitle = 'Todas as tarefas';
  }

  const rootTasks = filteredTasks.filter((t) => !t.parent_id);
  const pendingTasks = rootTasks.filter((t) => !t.completed);
  const completedTasks = rootTasks.filter((t) => !!t.completed);
  const getSubtasks = (parentId: number) =>
    sortTasks(filteredTasks.filter((t) => t.parent_id === parentId), sortBy);
  const sortedActiveTasks = sortTasks(pendingTasks, sortBy);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sortedActiveTasks.findIndex((t) => t.Id === active.id);
    const newIndex = sortedActiveTasks.findIndex((t) => t.Id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = [...sortedActiveTasks];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);
    const updates = reordered.map((t, i) => ({ Id: t.Id, position: i }));
    bulkUpdate.mutate(updates);
  }

  function handleNewTask(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && newTaskTitle.trim()) {
      const inbox = lists.find((l) => l.title === 'Inbox');
      const listId = view.type === 'list' ? view.listId : inbox?.Id || lists[0]?.Id;
      if (!listId) return;
      createTask.mutate({ title: newTaskTitle.trim(), list_id: listId });
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

  function renderTaskGroup(tasks: Task[], completedList: Task[]) {
    return (
      <>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={tasks.map((t) => t.Id)} strategy={verticalListSortingStrategy}>
            {tasks.map((task) => (
              <TaskItem key={task.Id} task={task} subtasks={getSubtasks(task.Id)} />
            ))}
          </SortableContext>
        </DndContext>

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
          <h1 className="text-2xl font-bold text-white">{viewTitle}</h1>
          <SortMenu />
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
        {groupByList ? (
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
