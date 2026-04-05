import { create } from 'zustand';
import type { SortCriteria, ViewMode } from '../types';

interface AppState {
  view: ViewMode;
  sortBy: SortCriteria;
  collapsedGroups: Set<string>;
  editingTaskId: number | null;
  sidebarOpen: boolean;
  setView: (view: ViewMode) => void;
  setSortBy: (sort: SortCriteria) => void;
  toggleGroup: (group: string) => void;
  setEditingTaskId: (id: number | null) => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
}

export const useAppState = create<AppState>((set) => ({
  view: { type: 'all' },
  sortBy: 'manual',
  collapsedGroups: new Set<string>(),
  editingTaskId: null,
  sidebarOpen: false,
  setView: (view) => set({ view, sidebarOpen: false }), // Close sidebar on mobile when selecting
  setSortBy: (sortBy) => set({ sortBy }),
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
}));
