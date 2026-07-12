import React, { createContext, useContext, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { setAssessoriaCliente } from '../services/api';

export interface ClienteViewAs {
  clienteId: string;
  nome: string;
}

interface AssessoriaContextValue {
  /** Cliente sendo visualizado (null = modo normal) */
  viewAs: ClienteViewAs | null;
  entrar: (cliente: ClienteViewAs) => void;
  sair: () => void;
}

const AssessoriaContext = createContext<AssessoriaContextValue>({
  viewAs: null,
  entrar: () => {},
  sair: () => {},
});

export function AssessoriaProvider({ children }: { children: React.ReactNode }) {
  const [viewAs, setViewAs] = useState<ClienteViewAs | null>(null);
  const queryClient = useQueryClient();

  const entrar = useCallback((cliente: ClienteViewAs) => {
    setAssessoriaCliente(cliente.clienteId);
    setViewAs(cliente);
    // Todo o cache é do assessor — limpa para recarregar como o cliente
    queryClient.clear();
  }, [queryClient]);

  const sair = useCallback(() => {
    setAssessoriaCliente(null);
    setViewAs(null);
    queryClient.clear();
  }, [queryClient]);

  return (
    <AssessoriaContext.Provider value={{ viewAs, entrar, sair }}>
      {children}
    </AssessoriaContext.Provider>
  );
}

export const useAssessoria = () => useContext(AssessoriaContext);
