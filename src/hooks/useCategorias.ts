import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoriasService } from '../services/api';

export const CATEGORIAS_KEY = ['categorias'];

export function useCategorias() {
  return useQuery({
    queryKey: CATEGORIAS_KEY,
    queryFn: () => categoriasService.getAll(),
    staleTime: 10 * 60 * 1000, // 10 minutos — categorias mudam pouco
  });
}

export function useCreateCategoria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: object) => categoriasService.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: CATEGORIAS_KEY }),
  });
}

export function useDeleteCategoria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => categoriasService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: CATEGORIAS_KEY }),
  });
}
