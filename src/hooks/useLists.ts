import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/nocodb';
import type { List } from '../types';

export function useLists() {
  return useQuery({
    queryKey: ['lists'],
    queryFn: () => api.list<List>('lists', { sort: 'position' }),
  });
}

export function useCreateList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; group_name: string }) =>
      api.create<List>('lists', {
        ...data,
        position: Date.now(),
        created_at: new Date().toISOString(),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lists'] }),
  });
}

export function useUpdateList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<List> & { id: number }) =>
      api.update<List>('lists', id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lists'] }),
  });
}

export function useDeleteList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.remove('lists', id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lists'] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
