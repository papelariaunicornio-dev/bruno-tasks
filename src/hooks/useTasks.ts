import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/nocodb';
import { useAppState } from '../store/appState';
import type { Task } from '../types';

let tempIdCounter = -1;

export function useTasks(listId?: number) {
  return useQuery({
    queryKey: ['tasks', listId],
    queryFn: () =>
      api.list<Task>('tasks', {
        where: listId ? `(list_id,eq,${listId})` : undefined,
        sort: 'position',
        limit: 5000,
      }),
  });
}

export function useAllTasks() {
  return useQuery({
    queryKey: ['tasks', 'all'],
    queryFn: () => api.list<Task>('tasks', { sort: 'position', limit: 5000 }),
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Task> & { _autoFocus?: boolean }) =>
      api.create<Task>('tasks', {
        title: data.title,
        list_id: data.list_id,
        parent_id: data.parent_id,
        completed: false,
        priority: false,
        position: Date.now(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    onMutate: async (data) => {
      await qc.cancelQueries({ queryKey: ['tasks', 'all'] });
      const previous = qc.getQueryData<Task[]>(['tasks', 'all']);
      const tempId = tempIdCounter--;
      const optimisticTask: Task = {
        Id: tempId,
        title: data.title ?? '',
        description: '',
        completed: false,
        priority: false,
        in_progress: false,
        delegated: false,
        position: Date.now(),
        list_id: data.list_id ?? 0,
        parent_id: data.parent_id ?? null,
        completed_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      qc.setQueryData<Task[]>(['tasks', 'all'], (old = []) => [...old, optimisticTask]);
      // Auto-focus the new task immediately
      if (data._autoFocus) {
        useAppState.getState().setEditingTaskId(tempId);
      }
      return { previous, tempId };
    },
    onSuccess: (newTask, _vars, context) => {
      // Replace temp with real, and update editingTaskId if it was pointing to temp
      const currentEditing = useAppState.getState().editingTaskId;
      qc.setQueryData<Task[]>(['tasks', 'all'], (old = []) =>
        old.map((t) => (t.Id === context?.tempId ? newTask : t))
      );
      if (currentEditing === context?.tempId) {
        useAppState.getState().setEditingTaskId(newTask.Id);
      }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(['tasks', 'all'], context.previous);
      }
    },
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Task> & { id: number }) =>
      api.update<Task>('tasks', id, { ...data, updated_at: new Date().toISOString() }),
    onMutate: async ({ id, ...data }) => {
      await qc.cancelQueries({ queryKey: ['tasks', 'all'] });
      const previous = qc.getQueryData<Task[]>(['tasks', 'all']);
      qc.setQueryData<Task[]>(['tasks', 'all'], (old = []) =>
        old.map((t) => (t.Id === id ? { ...t, ...data } : t))
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueryData(['tasks', 'all'], context.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.remove('tasks', id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['tasks', 'all'] });
      const previous = qc.getQueryData<Task[]>(['tasks', 'all']);
      qc.setQueryData<Task[]>(['tasks', 'all'], (old = []) => old.filter((t) => t.Id !== id));
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueryData(['tasks', 'all'], context.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

export function useBulkUpdatePositions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (updates: { Id: number; position: number }[]) =>
      Promise.all(updates.map((u) => api.update<Task>('tasks', u.Id, { position: u.position }))),
    onMutate: async (updates) => {
      await qc.cancelQueries({ queryKey: ['tasks', 'all'] });
      const previous = qc.getQueryData<Task[]>(['tasks', 'all']);
      qc.setQueryData<Task[]>(['tasks', 'all'], (old = []) =>
        old.map((t) => {
          const update = updates.find((u) => u.Id === t.Id);
          return update ? { ...t, position: update.position } : t;
        })
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueryData(['tasks', 'all'], context.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}
