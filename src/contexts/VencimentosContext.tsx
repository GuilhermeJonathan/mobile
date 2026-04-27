import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { lancamentosService } from '../services/api';
import { Lancamento, SituacaoLancamento } from '../types';

export interface VencimentoAlerta {
  id: string;
  descricao: string;
  valor: number;
  data: string;
  tipo: 'vencido' | 'hoje' | 'breve';
}

interface VencimentosContextData {
  badge: number;
  alertas: VencimentoAlerta[];
  refresh: () => void;
  clear: () => void;
}

const VencimentosContext = createContext<VencimentosContextData>({
  badge: 0,
  alertas: [],
  refresh: () => {},
  clear: () => {},
});

export function VencimentosProvider({ children }: { children: React.ReactNode }) {
  const [badge, setBadge] = useState(0);
  const [alertas, setAlertas] = useState<VencimentoAlerta[]>([]);

  const refresh = useCallback(async () => {
    try {
      const now = new Date();
      const mes = now.getMonth() + 1;
      const ano = now.getFullYear();
      const data: Lancamento[] = await lancamentosService.getByMes(mes, ano);

      const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
      const em3dias = new Date(hoje); em3dias.setDate(em3dias.getDate() + 3);

      const lista: VencimentoAlerta[] = [];

      for (const l of data) {
        if (l.cartaoId) continue;

        if (l.situacao === SituacaoLancamento.Vencido) {
          lista.push({ id: l.id, descricao: l.descricao, valor: l.valor, data: l.data, tipo: 'vencido' });
          continue;
        }

        if (l.situacao === SituacaoLancamento.AVencer) {
          const d = new Date(l.data); d.setHours(0, 0, 0, 0);
          if (d >= hoje && d <= em3dias) {
            const tipo = d.getTime() === hoje.getTime() ? 'hoje' : 'breve';
            lista.push({ id: l.id, descricao: l.descricao, valor: l.valor, data: l.data, tipo });
          }
        }
      }

      // Ordena: vencidos primeiro, depois por data
      lista.sort((a, b) => {
        const order = { vencido: 0, hoje: 1, breve: 2 };
        if (order[a.tipo] !== order[b.tipo]) return order[a.tipo] - order[b.tipo];
        return new Date(a.data).getTime() - new Date(b.data).getTime();
      });

      setAlertas(lista);
      setBadge(lista.length);
    } catch {
      setAlertas([]);
      setBadge(0);
    }
  }, []);

  const clear = useCallback(() => {
    setAlertas([]);
    setBadge(0);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <VencimentosContext.Provider value={{ badge, alertas, refresh, clear }}>
      {children}
    </VencimentosContext.Provider>
  );
}

export function useVencimentos() {
  return useContext(VencimentosContext);
}
