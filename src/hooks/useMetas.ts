import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

export const METAS_KEY = ['metas'];

export function useMetas() {
  return useQuery({
    queryKey: METAS_KEY,
    queryFn: () => api.get('/metas').then(r => r.data),
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

export function useCreateMeta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: object) => api.post('/metas', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: METAS_KEY }),
  });
}

export function useDeleteMeta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/metas/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: METAS_KEY }),
  });
}
