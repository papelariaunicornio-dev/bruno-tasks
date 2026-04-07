import { create } from 'zustand';
import type { SortCriteria, ViewMode } from '../types';

interface ToastState {
  message: string;
  onUndo?: () => void;
}

interface AppState {
  view: ViewMode;
  sortBy: SortCriteria;
  kanbanMode: boolean;
  collapsedGroups: Set<string>;
  editingTaskId: number | null;
  sidebarOpen: boolean;
  toast: ToastState | null;
  setView: (view: ViewMode) => void;
  setSortBy: (sort: SortCriteria) => void;
  toggleKanban: () => void;
  toggleGroup: (group: string) => void;
  setEditingTaskId: (id: number | null) => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  showToast: (message: string, onUndo?: () => void) => void;
  hideToast: () => void;
}

export const useAppState = create<AppState>((set) => ({
  view: { type: 'home' },
  sortBy: 'manual',
  kanbanMode: false,
  collapsedGroups: new Set<string>(),
  editingTaskId: null,
  sidebarOpen: false,
  toast: null,
  setView: (view) => set({ view, sidebarOpen: false }), // Close sidebar on mobile when selecting
  setSortBy: (sortBy) => set({ sortBy }),
  toggleKanban: () => set((s) => ({ kanbanMode: !s.kanbanMode })),
  toggleGroup: (group) =>
    set((state) => {
      const next = new Set(state.collapsedGroups);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return { collapsedGroups: next };
    }),
  setEditingTaskId: (editingTaskId) => set({ editingTaskId }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  showToast: (message, onUndo) => set({ toast: { message, onUndo } }),
  hideToast: () => set({ toast: null }),
}));
