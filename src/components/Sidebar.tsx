import { useState, useRef, useEffect } from 'react';
import { useLists, useCreateList, useDeleteList, useUpdateList } from '../hooks/useLists';
import { useTags, useDeleteTag } from '../hooks/useTags';
import { useAllTasks, useUpdateTask } from '../hooks/useTasks';
import { useAppState } from '../store/appState';
import { Pomodoro } from './Pomodoro';

interface ContextMenu {
  x: number;
  y: number;
  type: 'list' | 'group';
  id?: number;
  groupName?: string;
}

export function Sidebar() {
  const { data: lists = [] } = useLists();
  const { data: tags = [] } = useTags();
  const { data: allTasks = [] } = useAllTasks();
  const createList = useCreateList();
  const updateList = useUpdateList();
  const updateTask = useUpdateTask();
  const deleteList = useDeleteList();
  const deleteTag = useDeleteTag();
  const { view, setView, collapsedGroups, toggleGroup } = useAppState();

  const [showAddMenu, setShowAddMenu] = useState(false);
  const [creatingType, setCreatingType] = useState<'list' | 'group' | null>(null);
  const [newName, setNewName] = useState('');
  const [draggedListId, setDraggedListId] = useState<number | null>(null);
  const [dropTargetGroup, setDropTargetGroup] = useState<string | null>(null);
  const [dropTargetListId, setDropTargetListId] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const [renamingListId, setRenamingListId] = useState<number | null>(null);
  const [renamingGroupName, setRenamingGroupName] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const addMenuRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) setShowAddMenu(false);
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) setContextMenu(null);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => { if (creatingType) inputRef.current?.focus(); }, [creatingType]);
  useEffect(() => { if (renamingListId || renamingGroupName) renameInputRef.current?.focus(); }, [renamingListId, renamingGroupName]);

  const ungroupedLists = lists.filter((l) => !l.group_name);
  const groupNames = [...new Set(lists.map((l) => l.group_name).filter(Boolean))];
  const groupedLists = (group: string) => lists.filter((l) => l.group_name === group);

  function handleCreate() {
    if (!newName.trim()) return;
    if (creatingType === 'list') {
      createList.mutate({ title: newName.trim(), group_name: '' });
    } else if (creatingType === 'group') {
      createList.mutate({ title: 'Nova lista', group_name: newName.trim() });
    }
    setNewName('');
    setCreatingType(null);
  }

  function getTaskCount(listId: number) {
    return allTasks.filter((t) => t.list_id === listId && !t.parent_id && !t.completed && !t.deleted).length;
  }

  function handleRenameList(id: number) {
    if (!renameValue.trim()) return;
    updateList.mutate({ id, title: renameValue.trim() });
    setRenamingListId(null);
    setRenameValue('');
  }

  function handleRenameGroup(oldName: string) {
    if (!renameValue.trim() || renameValue.trim() === oldName) {
      setRenamingGroupName(null);
      setRenameValue('');
      return;
    }
    lists.filter((l) => l.group_name === oldName).forEach((l) => updateList.mutate({ id: l.Id, group_name: renameValue.trim() }));
    setRenamingGroupName(null);
    setRenameValue('');
  }

  function handleDeleteGroup(groupName: string) {
    if (!confirm(`Excluir grupo "${groupName}" e todas as suas listas?`)) return;
    lists.filter((l) => l.group_name === groupName).forEach((l) => deleteList.mutate(l.Id));
  }

  function handleContextMenu(e: React.MouseEvent, type: 'list' | 'group', id?: number, groupName?: string) {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, type, id, groupName });
  }

  function handleDragStart(e: React.DragEvent, listId: number) {
    setDraggedListId(listId);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDropOnGroup(e: React.DragEvent, groupName: string) {
    e.preventDefault();
    e.stopPropagation();
    setDropTargetGroup(null);
    if (draggedListId) {
      updateList.mutate({ id: draggedListId, group_name: groupName });
      setDraggedListId(null);
    }
  }

  function handleDropOnUngrouped(e: React.DragEvent) {
    e.preventDefault();
    setDropTargetGroup(null);
    if (draggedListId) {
      updateList.mutate({ id: draggedListId, group_name: '' });
      setDraggedListId(null);
    }
  }

  function handleTaskDropOnList(e: React.DragEvent, listId: number) {
    const taskId = e.dataTransfer.getData('task-id');
    if (taskId) {
      e.preventDefault();
      e.stopPropagation();
      updateTask.mutate({ id: Number(taskId), list_id: listId });
      setDropTargetListId(null);
      return;
    }
    // If not a task drop, let list drag handle it
    handleDropOnUngrouped(e);
  }

  function renderListItem(list: typeof lists[0], indented = false) {
    const isRenaming = renamingListId === list.Id;
    const isActive = view.type === 'list' && view.listId === list.Id;
    const isTaskDropTarget = dropTargetListId === list.Id;
    const count = getTaskCount(list.Id);

    return (
      <div
        key={list.Id}
        className="group"
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes('task-id') || e.dataTransfer.types.includes('text/plain')) {
            e.preventDefault();
            e.stopPropagation();
            setDropTargetListId(list.Id);
          }
        }}
        onDragLeave={() => setDropTargetListId(null)}
        onDrop={(e) => handleTaskDropOnList(e, list.Id)}
      >
        {isRenaming ? (
          <input
            ref={renameInputRef}
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRenameList(list.Id);
              if (e.key === 'Escape') { setRenamingListId(null); setRenameValue(''); }
            }}
            onBlur={() => handleRenameList(list.Id)}
            className={`w-full text-base rounded px-3 py-2 ${indented ? 'ml-4' : ''} outline-none border border-[#15BFAE] bg-white`}
          />
        ) : (
          <button
            draggable
            onDragStart={(e) => handleDragStart(e, list.Id)}
            onContextMenu={(e) => handleContextMenu(e, 'list', list.Id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 ${indented ? 'pl-7' : ''} text-base transition-colors rounded-md cursor-grab active:cursor-grabbing ${
              isTaskDropTarget ? 'bg-[#15BFAE]/20 ring-1 ring-[#15BFAE]' :
              isActive ? 'bg-[#15BFAE]/10 text-[#15BFAE] font-medium' : 'text-gray-700 hover:bg-gray-100'
            }`}
            onClick={() => setView({ type: 'list', listId: list.Id })}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isActive ? '#15BFAE' : '#9ca3af'} strokeWidth="1.5">
              <path d="M3 7h18M3 12h18M3 17h18" />
            </svg>
            <span className="flex-1 text-left truncate">{list.title}</span>
            {count > 0 && <span className="text-xs text-gray-400">{count}</span>}
          </button>
        )}
      </div>
    );
  }

  return (
    <aside className="w-full bg-white border-r border-gray-200 flex flex-col h-full flex-shrink-0">
      {/* Header */}
      <div className="px-4 pt-5 pb-3 flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-800 tracking-tight">Bruno Tasks</h1>
        <div ref={addMenuRef} className="relative">
          <button
            className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            onClick={() => setShowAddMenu(!showAddMenu)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
          {showAddMenu && (
            <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
              <button
                className="w-full text-left px-3 py-2 text-base text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                onClick={() => { setCreatingType('list'); setShowAddMenu(false); }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#15BFAE" strokeWidth="2">
                  <path d="M3 7h18M3 12h18M3 17h18" />
                </svg>
                Nova lista
              </button>
              <button
                className="w-full text-left px-3 py-2 text-base text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                onClick={() => { setCreatingType('group'); setShowAddMenu(false); }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                  <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
                </svg>
                Novo grupo
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Search hint */}
      <div className="px-3 mb-2">
        <button
          onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }))}
          className="w-full flex items-center gap-2 px-3 py-2 text-base text-gray-400 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          Pesquisar
          <kbd className="ml-auto text-[10px] bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded">Ctrl+K</kbd>
        </button>
      </div>

      {/* Built-in views */}
      <div className="px-3 mb-1 space-y-0.5">
        <button
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-base transition-colors ${
            view.type === 'all' ? 'bg-[#15BFAE]/10 text-[#15BFAE] font-medium' : 'text-gray-700 hover:bg-gray-100'
          }`}
          onClick={() => setView({ type: 'all' })}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={view.type === 'all' ? '#15BFAE' : '#9ca3af'} strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
          </svg>
          Todas
          <span className="ml-auto text-xs text-gray-400">{allTasks.filter((t) => !t.parent_id && !t.completed).length}</span>
        </button>
        <button
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-base transition-colors ${
            view.type === 'in_progress' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700 hover:bg-gray-100'
          }`}
          onClick={() => setView({ type: 'in_progress' })}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path d="M6 2h12a1 1 0 011 1v18l-6.5-4L6 21V3a1 1 0 011-1z" fill={view.type === 'in_progress' ? '#3b82f6' : 'none'} stroke={view.type === 'in_progress' ? '#3b82f6' : '#9ca3af'} strokeWidth="1.5" />
            <polygon points="10.5,8 10.5,14 15,11" fill={view.type === 'in_progress' ? 'white' : '#9ca3af'} stroke="none" />
          </svg>
          Em andamento
          <span className="ml-auto text-xs text-gray-400">{allTasks.filter((t) => !!t.in_progress && !t.completed).length}</span>
        </button>
        <button
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-base transition-colors ${
            view.type === 'priority' ? 'bg-red-50 text-red-500 font-medium' : 'text-gray-700 hover:bg-gray-100'
          }`}
          onClick={() => setView({ type: 'priority' })}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path d="M6 2h12a1 1 0 011 1v18l-6.5-4L6 21V3a1 1 0 011-1z" fill={view.type === 'priority' ? '#ef4444' : 'none'} stroke={view.type === 'priority' ? '#ef4444' : '#9ca3af'} strokeWidth="1.5" />
            <path d="M12 6.5l1.2 2.4 2.6.4-1.9 1.8.4 2.6L12 12.5l-2.3 1.2.4-2.6-1.9-1.8 2.6-.4z" fill={view.type === 'priority' ? 'white' : '#9ca3af'} stroke="none" />
          </svg>
          Prioridade
          <span className="ml-auto text-xs text-gray-400">{allTasks.filter((t) => !!t.priority && !t.completed).length}</span>
        </button>
        <button
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-base transition-colors ${
            view.type === 'delegated' ? 'bg-green-50 text-green-600 font-medium' : 'text-gray-700 hover:bg-gray-100'
          }`}
          onClick={() => setView({ type: 'delegated' })}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path d="M6 2h12a1 1 0 011 1v18l-6.5-4L6 21V3a1 1 0 011-1z" fill={view.type === 'delegated' ? '#22c55e' : 'none'} stroke={view.type === 'delegated' ? '#22c55e' : '#9ca3af'} strokeWidth="1.5" />
            <circle cx="12" cy="8.5" r="2.5" fill={view.type === 'delegated' ? 'white' : '#9ca3af'} stroke="none" />
            <path d="M7.5 16c0-2.5 2-4.5 4.5-4.5s4.5 2 4.5 4.5" fill={view.type === 'delegated' ? 'white' : '#9ca3af'} stroke="none" />
          </svg>
          Delegadas
          <span className="ml-auto text-xs text-gray-400">{allTasks.filter((t) => !!t.delegated && !t.completed).length}</span>
        </button>
      </div>

      <div className="border-b border-gray-100 mx-3 my-1" />

      {/* Lists & Groups */}
      <div
        className="flex-1 overflow-y-auto px-3 pt-1"
        onDragOver={(e) => { e.preventDefault(); setDropTargetGroup('__ungrouped__'); }}
        onDrop={handleDropOnUngrouped}
      >
        {creatingType && (
          <div className="py-2">
            <input
              ref={inputRef}
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
                if (e.key === 'Escape') { setCreatingType(null); setNewName(''); }
              }}
              onBlur={() => { if (!newName.trim()) { setCreatingType(null); setNewName(''); } }}
              placeholder={creatingType === 'list' ? 'Nome da lista' : 'Nome do grupo'}
              className="w-full text-base rounded-md px-3 py-2 outline-none border border-[#15BFAE] bg-white"
              autoFocus
            />
          </div>
        )}

        {ungroupedLists.map((list) => renderListItem(list))}

        {groupNames.map((groupName) => {
          const isCollapsed = collapsedGroups.has(groupName);
          const isDropTarget = dropTargetGroup === groupName;
          const isRenamingGroup = renamingGroupName === groupName;

          return (
            <div
              key={groupName}
              className={`mb-1 rounded-md transition-colors ${isDropTarget ? 'bg-[#15BFAE]/5 ring-1 ring-[#15BFAE]/30' : ''}`}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDropTargetGroup(groupName); }}
              onDragLeave={() => setDropTargetGroup(null)}
              onDrop={(e) => handleDropOnGroup(e, groupName)}
            >
              {isRenamingGroup ? (
                <div className="py-1">
                  <input
                    ref={renameInputRef}
                    type="text"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRenameGroup(groupName);
                      if (e.key === 'Escape') { setRenamingGroupName(null); setRenameValue(''); }
                    }}
                    onBlur={() => handleRenameGroup(groupName)}
                    className="w-full text-xs font-semibold uppercase tracking-wider rounded px-3 py-1.5 outline-none border border-[#15BFAE]"
                  />
                </div>
              ) : (
                <button
                  className="w-full flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors"
                  onClick={() => toggleGroup(groupName)}
                  onContextMenu={(e) => handleContextMenu(e, 'group', undefined, groupName)}
                >
                  <svg
                    width="10" height="10" viewBox="0 0 24 24" fill="currentColor"
                    className={`transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
                  >
                    <path d="M8 5l8 7-8 7z" />
                  </svg>
                  {groupName}
                </button>
              )}
              {!isCollapsed && groupedLists(groupName).map((list) => renderListItem(list, true))}
            </div>
          );
        })}
      </div>

      {/* Tags section */}
      <div className="border-t border-gray-100 px-3 py-2">
        <p className="px-3 py-1 text-xs font-semibold text-gray-400 mb-1">Tags</p>
        <div className="max-h-32 overflow-y-auto">
          {tags.map((tag) => (
            <div key={tag.Id} className="group flex items-center">
              <button
                className={`flex-1 flex items-center gap-2 px-3 py-1.5 rounded-md text-base transition-colors ${
                  view.type === 'tag' && view.tagId === tag.Id ? 'bg-gray-100 font-medium' : 'hover:bg-gray-50'
                }`}
                onClick={() => setView({ type: 'tag', tagId: tag.Id })}
              >
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
                <span className="truncate text-gray-700">{tag.name}</span>
              </button>
              <button
                className="opacity-0 group-hover:opacity-50 hover:!opacity-100 px-1 text-gray-400 hover:text-red-400"
                onClick={() => { if (confirm(`Excluir tag "${tag.name}"?`)) deleteTag.mutate(tag.Id); }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
          {tags.length === 0 && <p className="px-3 text-xs text-gray-300 italic">Nenhuma tag</p>}
        </div>
      </div>

      {/* Dashboard & Trash */}
      <div className="border-t border-gray-100 px-3 py-2 space-y-0.5">
        <button
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-base transition-colors ${
            view.type === 'stats' ? 'bg-[#15BFAE]/10 text-[#15BFAE] font-medium' : 'text-gray-700 hover:bg-gray-100'
          }`}
          onClick={() => setView({ type: 'stats' })}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={view.type === 'stats' ? '#15BFAE' : '#9ca3af'} strokeWidth="1.5">
            <path d="M18 20V10M12 20V4M6 20v-6" />
          </svg>
          Dashboard
        </button>
        <button
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-base transition-colors ${
            view.type === 'trash' ? 'bg-gray-100 text-gray-700 font-medium' : 'text-gray-500 hover:bg-gray-100'
          }`}
          onClick={() => setView({ type: 'trash' })}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={view.type === 'trash' ? '#6b7280' : '#9ca3af'} strokeWidth="1.5">
            <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
          </svg>
          Lixeira
          <span className="ml-auto text-xs text-gray-400">{allTasks.filter((t) => !!t.deleted).length}</span>
        </button>
      </div>

      {/* Pomodoro */}
      <Pomodoro />

      {/* Context menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50 w-36"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            className="w-full text-left px-3 py-2 text-base text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            onClick={() => {
              if (contextMenu.type === 'list' && contextMenu.id) {
                const list = lists.find((l) => l.Id === contextMenu.id);
                setRenameValue(list?.title ?? '');
                setRenamingListId(contextMenu.id);
              } else if (contextMenu.type === 'group' && contextMenu.groupName) {
                setRenameValue(contextMenu.groupName);
                setRenamingGroupName(contextMenu.groupName);
              }
              setContextMenu(null);
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 3a2.85 2.85 0 114 4L7.5 20.5 2 22l1.5-5.5z" />
            </svg>
            Renomear
          </button>
          <button
            className="w-full text-left px-3 py-2 text-base hover:bg-gray-50 text-red-500 flex items-center gap-2"
            onClick={() => {
              if (contextMenu.type === 'list' && contextMenu.id) {
                const list = lists.find((l) => l.Id === contextMenu.id);
                if (confirm(`Excluir lista "${list?.title}"?`)) deleteList.mutate(contextMenu.id);
              } else if (contextMenu.type === 'group' && contextMenu.groupName) {
                handleDeleteGroup(contextMenu.groupName);
              }
              setContextMenu(null);
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
            </svg>
            Excluir
          </button>
        </div>
      )}
    </aside>
  );
}
