import { useQuery } from '@tanstack/react-query';
import { lancamentosService } from '../services/api';

export function useDashboard(mes: number, ano: number) {
  return useQuery({
    queryKey: ['dashboard', mes, ano],
    queryFn: () => lancamentosService.getDashboard(mes, ano),
    staleTime: 0, // sempre fresco — dados financeiros críticos
    refetchOnWindowFocus: true,
  });
}

export function useLancamentos(mes: number, ano: number) {
  return useQuery({
    queryKey: ['lancamentos', mes, ano],
    queryFn: () => lancamentosService.getByMes(mes, ano),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
}
