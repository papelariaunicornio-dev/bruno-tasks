import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/nocodb';
import type { Tag, TaskTag } from '../types';

export function useTags() {
  return useQuery({
    queryKey: ['tags'],
    queryFn: () => api.list<Tag>('tags', { sort: 'name' }),
  });
}

export function useTaskTags() {
  return useQuery({
    queryKey: ['task_tags'],
    queryFn: () => api.list<TaskTag>('task_tags', { limit: 10000 }),
  });
}

export function useCreateTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; color: string }) => api.create<Tag>('tags', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tags'] }),
  });
}

export function useDeleteTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.remove('tags', id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tags'] });
      qc.invalidateQueries({ queryKey: ['task_tags'] });
    },
  });
}

export function useAddTaskTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { task_id: number; tag_id: number }) =>
      api.create<TaskTag>('task_tags', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['task_tags'] }),
  });
}

export function useRemoveTaskTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.remove('task_tags', id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['task_tags'] }),
  });
}
