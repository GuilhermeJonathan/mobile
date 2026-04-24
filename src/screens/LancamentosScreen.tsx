import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, Modal, ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { lancamentosService, saldosService } from '../services/api';
import { Lancamento, SaldoConta, SituacaoLancamento, TipoLancamento, TipoConta, TipoReceita } from '../types';
import { fmtBRL } from '../utils/currency';

const TIPO_CONTA_EMOJI: Record<number, string> = {
  [TipoConta.ContaCorrente]: '🏦',
  [TipoConta.ContaPoupanca]: '🐷',
  [TipoConta.Carteira]:      '👛',
  [TipoConta.Investimento]:  '📈',
};

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

const situacaoCor: Record<number, string> = {
  [SituacaoLancamento.Recebido]: '#4CAF50',
  [SituacaoLancamento.Pago]:     '#4CAF50',
  [SituacaoLancamento.AReceber]: '#2196F3',
  [SituacaoLancamento.AVencer]:  '#FF9800',
  [SituacaoLancamento.Vencido]:  '#e53935',
};

const situacaoLabel: Record<number, string> = {
  [SituacaoLancamento.Recebido]: 'Recebido',
  [SituacaoLancamento.Pago]:     'Pago',
  [SituacaoLancamento.AReceber]: 'A Receber',
  [SituacaoLancamento.AVencer]:  'A Vencer',
  [SituacaoLancamento.Vencido]:  'Vencido',
};

// Situação "confirmada" (check marcado)
function isConfirmado(s: SituacaoLancamento) {
  return s === SituacaoLancamento.Recebido || s === SituacaoLancamento.Pago;
}

// Próximo status ao clicar no check
function proximaSituacao(item: Lancamento): SituacaoLancamento {
  if (isConfirmado(item.situacao)) {
    // Desmarca → volta ao pendente
    return item.tipo === TipoLancamento.Credito
      ? SituacaoLancamento.AReceber
      : SituacaoLancamento.AVencer;
  }
  // Marca → confirma
  return item.tipo === TipoLancamento.Credito
    ? SituacaoLancamento.Recebido
    : SituacaoLancamento.Pago;
}

type ListItem =
  | { kind: 'lancamento'; data: Lancamento }
  | { kind: 'cartao-group'; cartaoId: string; cartaoNome: string; diaVencimento?: number; total: number; items: Lancamento[] }
  | { kind: 'date-header'; dateKey: string; label: string; totalCredito: number; totalDebito: number };

type Filtro = 'todos' | 'receitas' | 'despesas';

export default function LancamentosScreen({ navigation }: any) {
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedCartoes, setExpandedCartoes] = useState<Set<string>>(new Set());
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [toggling, setToggling] = useState<Set<string>>(new Set());

  // Modal de seleção de conta
  const [contas, setContas] = useState<SaldoConta[]>([]);
  const [contaModal, setContaModal] = useState<{ visible: boolean; item: Lancamento | null }>({ visible: false, item: null });

  const load = useCallback(async () => {
    try {
      const data = await lancamentosService.getByMes(mes, ano);
      setLancamentos(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [mes, ano]);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  function navMes(delta: number) {
    const d = new Date(ano, mes - 1 + delta, 1);
    setMes(d.getMonth() + 1);
    setAno(d.getFullYear());
    setLoading(true);
  }

  function toggleCartao(cartaoId: string) {
    setExpandedCartoes(prev => {
      const next = new Set(prev);
      next.has(cartaoId) ? next.delete(cartaoId) : next.add(cartaoId);
      return next;
    });
  }

  // Confirma situação com uma conta bancária selecionada
  async function confirmarComConta(item: Lancamento, contaId: string | null) {
    setContaModal({ visible: false, item: null });
    if (toggling.has(item.id)) return;

    const novaSituacao = proximaSituacao(item);
    setLancamentos(prev => prev.map(l => l.id === item.id ? { ...l, situacao: novaSituacao } : l));
    setToggling(prev => new Set(prev).add(item.id));
    try {
      await lancamentosService.atualizarSituacaoComConta(item.id, novaSituacao, contaId);
      // Recarrega para refletir saldo atualizado
      const data = await lancamentosService.getByMes(mes, ano);
      setLancamentos(data);
    } catch {
      setLancamentos(prev => prev.map(l => l.id === item.id ? { ...l, situacao: item.situacao } : l));
    } finally {
      setToggling(prev => { const next = new Set(prev); next.delete(item.id); return next; });
    }
  }

  // Toggle: se está confirmando abre modal de conta; se está desconfirmando faz direto
  async function handleToggleCheck(item: Lancamento) {
    if (toggling.has(item.id)) return;
    const confirmando = !isConfirmado(item.situacao);

    if (confirmando) {
      // Carrega contas e abre modal
      try {
        const lista = await saldosService.getAll();
        setContas(lista);
      } catch { setContas([]); }
      setContaModal({ visible: true, item });
      return;
    }

    // Desconfirmando: chama direto (rollback automático no backend)
    const novaSituacao = proximaSituacao(item);
    setLancamentos(prev => prev.map(l => l.id === item.id ? { ...l, situacao: novaSituacao } : l));
    setToggling(prev => new Set(prev).add(item.id));
    try {
      await lancamentosService.atualizarSituacaoComConta(item.id, novaSituacao, null);
      const data = await lancamentosService.getByMes(mes, ano);
      setLancamentos(data);
    } catch {
      setLancamentos(prev => prev.map(l => l.id === item.id ? { ...l, situacao: item.situacao } : l));
    } finally {
      setToggling(prev => { const next = new Set(prev); next.delete(item.id); return next; });
    }
  }

  type RawItem =
    | { kind: 'lancamento'; data: Lancamento; sortTs: number }
    | { kind: 'cartao-group'; cartaoId: string; cartaoNome: string; diaVencimento?: number; total: number; items: Lancamento[]; sortTs: number };

  function buildListItems(): ListItem[] {
    // ── Filtra ────────────────────────────────────────────────────────────────
    const sem_cartao = lancamentos.filter(l => {
      if (l.cartaoId) return false;
      if (filtro === 'receitas') return l.tipo === TipoLancamento.Credito;
      if (filtro === 'despesas') return l.tipo !== TipoLancamento.Credito;
      return true;
    });
    const com_cartao = filtro === 'receitas' ? [] : lancamentos.filter(l => !!l.cartaoId);

    // ── Agrupa cartões ────────────────────────────────────────────────────────
    const grupos = new Map<string, { nome: string; items: Lancamento[] }>();
    for (const l of com_cartao) {
      const id = l.cartaoId!;
      if (!grupos.has(id)) grupos.set(id, { nome: l.cartaoNome ?? 'Cartão', items: [] });
      grupos.get(id)!.items.push(l);
    }

    // ── Monta lista plana com timestamp para ordenar ──────────────────────────
    const raw: RawItem[] = sem_cartao.map(l => ({
      kind: 'lancamento', data: l,
      sortTs: new Date(l.data).getTime(),
    }));
    for (const [cartaoId, grupo] of grupos) {
      const total = grupo.items.reduce((s, l) => s + l.valor, 0);
      const diaVencimento = grupo.items[0]?.cartaoDiaVencimento;
      raw.push({
        kind: 'cartao-group', cartaoId, cartaoNome: grupo.nome,
        diaVencimento, total, items: grupo.items,
        sortTs: new Date(ano, mes - 1, diaVencimento ?? 31).getTime(),
      });
    }
    raw.sort((a, b) => a.sortTs - b.sortTs);

    // ── Agrupa por data e insere cabeçalhos ───────────────────────────────────
    type DateGroup = { label: string; items: RawItem[]; totalCredito: number; totalDebito: number };
    const byDate = new Map<string, DateGroup>();

    for (const item of raw) {
      let dateKey: string, label: string;
      if (item.kind === 'lancamento') {
        const d = new Date(item.data.data);
        dateKey = d.toISOString().slice(0, 10);
        label = `${String(d.getDate()).padStart(2, '0')} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
      } else {
        const dia = item.diaVencimento;
        if (dia) {
          dateKey = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
          label = `${String(dia).padStart(2, '0')} ${MESES[mes - 1]} ${ano}`;
        } else {
          dateKey = 'sem-data';
          label = 'Sem data definida';
        }
      }
      if (!byDate.has(dateKey)) byDate.set(dateKey, { label, items: [], totalCredito: 0, totalDebito: 0 });
      const g = byDate.get(dateKey)!;
      g.items.push(item);
      if (item.kind === 'lancamento') {
        if (item.data.tipo === TipoLancamento.Credito) g.totalCredito += item.data.valor;
        else g.totalDebito += item.data.valor;
      } else {
        g.totalDebito += item.total;
      }
    }

    // ── Converte para ListItem com headers ────────────────────────────────────
    const result: ListItem[] = [];
    for (const [dateKey, g] of byDate) {
      result.push({ kind: 'date-header', dateKey, label: g.label, totalCredito: g.totalCredito, totalDebito: g.totalDebito });
      for (const item of g.items) {
        const { sortTs, ...rest } = item;
        result.push(rest as ListItem);
      }
    }
    return result;
  }

  // Contadores para os chips de filtro
  const totalReceitas = lancamentos.filter(l => !l.cartaoId && l.tipo === TipoLancamento.Credito).length;
  const totalDespesas = lancamentos.filter(l => !l.cartaoId && l.tipo !== TipoLancamento.Credito).length;
  const totalCartoes  = new Set(lancamentos.filter(l => !!l.cartaoId).map(l => l.cartaoId)).size;

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#4CAF50" />;

  const listItems = buildListItems();

  // ── Checkbox ──────────────────────────────────────────────────────────────
  const renderCheck = (item: Lancamento) => {
    const confirmado = isConfirmado(item.situacao);
    const busy = toggling.has(item.id);
    const isCredito = item.tipo === TipoLancamento.Credito;
    const cor = confirmado ? '#4CAF50' : (isCredito ? '#2196F3' : '#FF9800');

    return (
      <TouchableOpacity
        onPress={() => handleToggleCheck(item)}
        style={[styles.checkBtn, { borderColor: cor, backgroundColor: confirmado ? cor : 'transparent' }]}
        disabled={busy}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        {busy
          ? <ActivityIndicator size="small" color={confirmado ? '#fff' : cor} style={{ transform: [{ scale: 0.6 }] }} />
          : confirmado
            ? <Text style={styles.checkMark}>✓</Text>
            : null
        }
      </TouchableOpacity>
    );
  };

  // ── Row de lançamento ─────────────────────────────────────────────────────
  const renderLancamento = (item: Lancamento, indented = false) => {
    const confirmado = isConfirmado(item.situacao);
    const corSituacao = situacaoCor[item.situacao];
    const corValor = item.tipo === TipoLancamento.Credito ? '#4CAF50' : '#e53935';

    return (
      <View key={item.id} style={[
        styles.item,
        indented && styles.itemIndented,
        confirmado && styles.itemConfirmado,
      ]}>
        {/* Checkbox à esquerda */}
        {renderCheck(item)}

        {/* Conteúdo clicável → editar */}
        <TouchableOpacity
          style={styles.itemBody}
          onPress={() => navigation.navigate('EditLancamento', { lancamento: item })}
          activeOpacity={0.7}
        >
          <View style={styles.itemLeft}>
            <Text style={styles.itemDesc}>{item.descricao}</Text>
            <View style={styles.itemMetaRow}>
              {!item.cartaoId && item.categoriaNome && (
                <View style={styles.catBadge}>
                  <Text style={styles.catBadgeText}>{item.categoriaNome}</Text>
                </View>
              )}
              {item.totalParcelas && item.totalParcelas > 1 && (
                item.isRecorrente ? (
                  <View style={styles.recorrenteBadge}>
                    <Text style={styles.recorrenteBadgeText}>🔄 Recorrente</Text>
                  </View>
                ) : (
                  <View style={styles.parcelaBadge}>
                    <Text style={styles.parcelaBadgeText}>{item.parcelaAtual}/{item.totalParcelas}x</Text>
                  </View>
                )
              )}
              {/* Badge de tipo de receita recorrente */}
              {item.receitaRecorrenteId && item.receitaTipo === TipoReceita.Horista && (
                <View style={styles.receitaBadgeHorista}>
                  <Text style={styles.receitaBadgeText}>⏱ Horista</Text>
                </View>
              )}
              {item.receitaRecorrenteId && item.receitaTipo === TipoReceita.Fixo && (
                <View style={styles.receitaBadgeFixo}>
                  <Text style={styles.receitaBadgeText}>📌 Fixo</Text>
                </View>
              )}
            </View>
          </View>

          {/* Direita: status badge + valor */}
          <View style={styles.itemRight}>
            <View style={[styles.situacaoBadge, { backgroundColor: corSituacao + '18', borderColor: corSituacao }]}>
              <Text style={[styles.situacaoBadgeText, { color: corSituacao }]}>
                {situacaoLabel[item.situacao]}
              </Text>
            </View>
            <Text style={[styles.itemValor, { color: corValor }]}>
              {item.tipo === TipoLancamento.Credito ? '+' : '-'} {fmtBRL(item.valor)}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  // ── Cabeçalho de agrupamento por data ────────────────────────────────────
  const renderDateHeader = (item: Extract<ListItem, { kind: 'date-header' }>) => (
    <View style={styles.dateHeader}>
      <Text style={styles.dateHeaderLabel}>{item.label}</Text>
    </View>
  );

  // ── Resumo mensal (topo da lista) ─────────────────────────────────────────
  const totalMesCredito = lancamentos.filter(l => !l.cartaoId && l.tipo === TipoLancamento.Credito).reduce((s, l) => s + l.valor, 0);
  const totalMesDebito  = lancamentos.filter(l => l.tipo !== TipoLancamento.Credito).reduce((s, l) => s + l.valor, 0);
  const saldoMes = totalMesCredito - totalMesDebito;
  const saldoCor = saldoMes >= 0 ? '#4CAF50' : '#e53935';

  const renderResumo = () => (
    <View style={styles.resumoCard}>
      <View style={styles.resumoItem}>
        <Text style={styles.resumoLabel}>Receitas</Text>
        <Text style={styles.resumoCredito}>+{fmtBRL(totalMesCredito)}</Text>
      </View>
      <View style={styles.resumoDivider} />
      <View style={styles.resumoItem}>
        <Text style={styles.resumoLabel}>Despesas</Text>
        <Text style={styles.resumoDebito}>-{fmtBRL(totalMesDebito)}</Text>
      </View>
      <View style={styles.resumoDivider} />
      <View style={styles.resumoItem}>
        <Text style={styles.resumoLabel}>Saldo</Text>
        <Text style={[styles.resumoSaldo, { color: saldoCor }]}>{fmtBRL(saldoMes)}</Text>
      </View>
    </View>
  );

  // ── Grupo do cartão ───────────────────────────────────────────────────────
  const renderItem = ({ item }: { item: ListItem }) => {
    if (item.kind === 'date-header') return renderDateHeader(item);
    if (item.kind === 'lancamento') return renderLancamento(item.data);

    const expanded = expandedCartoes.has(item.cartaoId);
    const todosConfirmados = item.items.every(l => isConfirmado(l.situacao));
    const algumConfirmado = item.items.some(l => isConfirmado(l.situacao));

    return (
      <View>
        <TouchableOpacity style={styles.cartaoRow} onPress={() => toggleCartao(item.cartaoId)}>
          {/* Indicador de progresso do cartão */}
          <View style={[
            styles.cartaoCheck,
            todosConfirmados && styles.cartaoCheckDone,
            !todosConfirmados && algumConfirmado && styles.cartaoCheckPartial,
          ]}>
            {todosConfirmados && <Text style={styles.checkMark}>✓</Text>}
            {!todosConfirmados && algumConfirmado && <Text style={styles.cartaoCheckPartialText}>~</Text>}
          </View>

          <View style={styles.itemLeft}>
            <Text style={styles.itemDesc}>💳 {item.cartaoNome}</Text>
            <View style={styles.itemMetaRow}>
              <View style={styles.catBadge}>
                <Text style={styles.catBadgeText}>
                  {item.items.length} lançamento{item.items.length !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.cartaoRight}>
            <Text style={[styles.itemValor, { color: '#e53935' }]}>
              -{fmtBRL(item.total)}
            </Text>
            <Text style={styles.expandHint}>{expanded ? '▲ recolher' : '▼ ver detalhes'}</Text>
          </View>
        </TouchableOpacity>

        {expanded && item.items.map(l => renderLancamento(l, true))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navMes(-1)}><Text style={styles.navBtn}>◀</Text></TouchableOpacity>
        <Text style={styles.mesTitle}>{MESES[mes - 1]}/{ano}</Text>
        <TouchableOpacity onPress={() => navMes(1)}><Text style={styles.navBtn}>▶</Text></TouchableOpacity>
      </View>

      {/* ── Barra de filtros ── */}
      <View style={styles.filterBar}>
        <TouchableOpacity
          style={[styles.filterChip, filtro === 'todos' && styles.filterChipAll]}
          onPress={() => setFiltro('todos')}
        >
          <Text style={[styles.filterChipText, filtro === 'todos' && styles.filterChipTextActive]}>
            Todos
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, filtro === 'receitas' && styles.filterChipReceitas]}
          onPress={() => setFiltro('receitas')}
        >
          <Text style={[styles.filterChipText, filtro === 'receitas' && styles.filterChipTextActive]}>
            ↑ Receitas{totalReceitas > 0 ? ` (${totalReceitas})` : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, filtro === 'despesas' && styles.filterChipDespesas]}
          onPress={() => setFiltro('despesas')}
        >
          <Text style={[styles.filterChipText, filtro === 'despesas' && styles.filterChipTextActive]}>
            ↓ Despesas{(totalDespesas + totalCartoes) > 0 ? ` (${totalDespesas + totalCartoes})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={listItems}
        keyExtractor={(item, i) =>
          item.kind === 'lancamento' ? item.data.id
          : item.kind === 'cartao-group' ? `cartao-${item.cartaoId}`
          : `header-${item.dateKey}`
        }
        renderItem={renderItem}
        ListHeaderComponent={renderResumo}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        ListEmptyComponent={<Text style={styles.empty}>Nenhum lançamento neste mês.</Text>}
        contentContainerStyle={{ paddingBottom: 80 }}
      />

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('AddLancamento', { mes, ano })}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* ── Modal de seleção de conta bancária ── */}
      <Modal
        visible={contaModal.visible}
        transparent
        animationType="slide"
        onRequestClose={() => setContaModal({ visible: false, item: null })}
      >
        <View style={styles.contaOverlay}>
          <View style={styles.contaSheet}>
            <Text style={styles.contaSheetTitle}>
              {contaModal.item?.tipo === TipoLancamento.Credito
                ? '💰 Em qual conta recebeu?'
                : '💸 De qual conta vai pagar?'}
            </Text>
            {contaModal.item && (
              <Text style={styles.contaSheetSub}>
                {contaModal.item.descricao} · {fmtBRL(contaModal.item.valor)}
              </Text>
            )}

            <ScrollView style={{ maxHeight: 320 }}>
              {contas.length === 0 && (
                <View style={styles.contaSemContas}>
                  <Text style={styles.contaSemContasText}>Nenhuma conta cadastrada.</Text>
                  <Text style={styles.contaSemContasHint}>Cadastre em Saldos → +</Text>
                </View>
              )}
              {contas.map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={styles.contaOption}
                  onPress={() => contaModal.item && confirmarComConta(contaModal.item, c.id)}
                >
                  <Text style={styles.contaOptionEmoji}>
                    {TIPO_CONTA_EMOJI[c.tipo] ?? '🏦'}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.contaOptionNome}>{c.banco}</Text>
                    <Text style={[styles.contaOptionSaldo, { color: c.saldo >= 0 ? '#2E7D32' : '#e53935' }]}>
                      {fmtBRL(c.saldo)}
                    </Text>
                  </View>
                  <Text style={styles.contaOptionArrow}>›</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.contaSemContaBtn}
              onPress={() => contaModal.item && confirmarComConta(contaModal.item, null)}
            >
              <Text style={styles.contaSemContaBtnText}>Confirmar sem vincular conta</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.contaCancelarBtn}
              onPress={() => setContaModal({ visible: false, item: null })}
            >
              <Text style={styles.contaCancelarBtnText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#1a1a2e', borderBottomWidth: 1, borderBottomColor: '#ffffff15' },
  navBtn: { fontSize: 22, color: '#4CAF50', paddingHorizontal: 12 },
  mesTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },

  item: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1a1a2e', paddingVertical: 10, paddingRight: 14, paddingLeft: 10,
    marginHorizontal: 12, marginTop: 8, borderRadius: 10,
  },
  itemIndented: {
    marginHorizontal: 20, marginTop: 2, borderRadius: 8,
    backgroundColor: '#16213e', borderLeftWidth: 3, borderLeftColor: '#1565C0',
  },
  itemBody: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  checkBtn: {
    width: 26, height: 26, borderRadius: 13, borderWidth: 2,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12, flexShrink: 0,
  },
  checkMark: { color: '#fff', fontSize: 14, fontWeight: 'bold', lineHeight: 16 },

  resumoCard: {
    flexDirection: 'row', backgroundColor: '#1a1a2e',
    marginHorizontal: 12, marginTop: 10, marginBottom: 4,
    borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#ffffff10',
  },
  resumoItem: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  resumoLabel: { fontSize: 11, color: '#9aa0b4', marginBottom: 4 },
  resumoCredito: { fontSize: 15, fontWeight: 'bold', color: '#4CAF50' },
  resumoDebito: { fontSize: 15, fontWeight: 'bold', color: '#ef5350' },
  resumoSaldo: { fontSize: 15, fontWeight: 'bold' },
  resumoDivider: { width: 1, backgroundColor: '#ffffff15', marginVertical: 10 },

  dateHeader: {
    marginHorizontal: 12, marginTop: 14, marginBottom: 2,
    paddingBottom: 5, borderBottomWidth: 1, borderBottomColor: '#ffffff15',
  },
  dateHeaderLabel: { fontSize: 12, fontWeight: '700', color: '#666677', textTransform: 'uppercase', letterSpacing: 0.5 },

  filterBar: {
    flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: '#1a1a2e', borderBottomWidth: 1, borderBottomColor: '#ffffff15',
  },
  filterChip: {
    flex: 1, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1, borderColor: '#ffffff20', backgroundColor: '#ffffff0d',
    alignItems: 'center',
  },
  filterChipAll: { backgroundColor: '#ffffff25', borderColor: '#ffffff40' },
  filterChipReceitas: { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
  filterChipDespesas: { backgroundColor: '#ef5350', borderColor: '#ef5350' },
  filterChipText: { fontSize: 13, fontWeight: '600', color: '#9aa0b4' },
  filterChipTextActive: { color: '#fff' },

  cartaoTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  vencBadge: {
    backgroundColor: '#1565C025', borderRadius: 10, borderWidth: 1, borderColor: '#1565C060',
    paddingHorizontal: 8, paddingVertical: 2,
  },
  vencBadgeText: { fontSize: 11, color: '#64B5F6', fontWeight: '600' },
  vencBadgeSem: {
    backgroundColor: '#FF980015', borderRadius: 10, borderWidth: 1, borderColor: '#FF980050',
    paddingHorizontal: 8, paddingVertical: 2,
  },
  vencBadgeSemText: { fontSize: 11, color: '#FF9800', fontWeight: '500' },

  receitaBadgeHorista: {
    backgroundColor: '#7B1FA220', borderRadius: 10, borderWidth: 1, borderColor: '#CE93D840',
    paddingHorizontal: 7, paddingVertical: 1,
  },
  receitaBadgeFixo: {
    backgroundColor: '#00695C20', borderRadius: 10, borderWidth: 1, borderColor: '#80CBC440',
    paddingHorizontal: 7, paddingVertical: 1,
  },
  receitaBadgeText: { fontSize: 11, color: '#ccc', fontWeight: '600' },

  cartaoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#1565C018', padding: 14,
    marginHorizontal: 12, marginTop: 8, borderRadius: 10,
    borderLeftWidth: 4, borderLeftColor: '#1565C0',
  },
  cartaoCheck: {
    width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: '#64B5F660',
    justifyContent: 'center', alignItems: 'center', marginRight: 12, flexShrink: 0,
  },
  cartaoCheckDone: { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
  cartaoCheckPartial: { backgroundColor: '#FF9800', borderColor: '#FF9800' },
  cartaoCheckPartialText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },

  itemConfirmado: { borderLeftWidth: 3, borderLeftColor: '#4CAF50' },

  itemLeft: { flex: 1 },
  itemDesc: { fontSize: 15, fontWeight: '600', color: '#fff' },
  itemMetaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginTop: 2 },
  itemMeta: { fontSize: 12, color: '#9aa0b4' },
  itemMetaVence: { fontSize: 12, color: '#64B5F6', fontWeight: '600' },

  dataBadge: {
    backgroundColor: '#ffffff10', borderRadius: 10, borderWidth: 1, borderColor: '#ffffff20',
    paddingHorizontal: 8, paddingVertical: 2,
  },
  dataBadgeVencido: { backgroundColor: '#ef535020', borderColor: '#ef535040' },
  dataBadgeText: { fontSize: 11, color: '#9aa0b4', fontWeight: '500' },
  dataBadgeTextVencido: { color: '#ef9a9a', fontWeight: '600' },

  catBadge: {
    backgroundColor: '#ffffff10', borderRadius: 10, borderWidth: 1, borderColor: '#ffffff20',
    paddingHorizontal: 8, paddingVertical: 2,
  },
  catBadgeText: { fontSize: 11, color: '#9aa0b4', fontWeight: '500' },

  parcelaBadge: { backgroundColor: '#FF980015', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1, borderWidth: 1, borderColor: '#FF980040' },
  parcelaBadgeText: { fontSize: 11, color: '#FF9800', fontWeight: '600' },
  recorrenteBadge: { backgroundColor: '#7B1FA215', borderRadius: 10, borderWidth: 1, borderColor: '#CE93D840', paddingHorizontal: 7, paddingVertical: 1 },
  recorrenteBadgeText: { fontSize: 11, color: '#CE93D8', fontWeight: '600' },

  itemRight: { flexDirection: 'row', alignItems: 'center', gap: 10, marginLeft: 8 },
  itemValor: { fontSize: 15, fontWeight: 'bold', textAlign: 'right' },

  situacaoBadge: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 9, paddingVertical: 3 },
  situacaoBadgeText: { fontSize: 12, fontWeight: '600' },

  cartaoRight: { alignItems: 'flex-end', marginLeft: 8 },
  expandHint: { fontSize: 11, color: '#64B5F6', marginTop: 2 },

  empty: { textAlign: 'center', marginTop: 40, color: '#9aa0b4', fontSize: 16 },
  fab: { position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#4CAF50', justifyContent: 'center', alignItems: 'center', elevation: 5 },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 32 },

  contaOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  contaSheet: {
    backgroundColor: '#1a1a2e', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, paddingBottom: 36, borderTopWidth: 1, borderTopColor: '#ffffff15',
  },
  contaSheetTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  contaSheetSub: { fontSize: 13, color: '#9aa0b4', marginBottom: 16 },

  contaOption: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#ffffff15',
  },
  contaOptionEmoji: { fontSize: 24 },
  contaOptionNome: { fontSize: 15, fontWeight: '600', color: '#fff' },
  contaOptionSaldo: { fontSize: 12, marginTop: 2 },
  contaOptionArrow: { fontSize: 22, color: '#ffffff30' },

  contaSemContas: { alignItems: 'center', paddingVertical: 20 },
  contaSemContasText: { fontSize: 14, color: '#9aa0b4' },
  contaSemContasHint: { fontSize: 12, color: '#666677', marginTop: 4 },

  contaSemContaBtn: {
    marginTop: 16, padding: 14, borderRadius: 8,
    borderWidth: 1, borderColor: '#ffffff25', alignItems: 'center',
  },
  contaSemContaBtnText: { fontSize: 14, color: '#9aa0b4' },

  contaCancelarBtn: {
    marginTop: 8, padding: 14, borderRadius: 8,
    backgroundColor: '#ef535015', alignItems: 'center',
  },
  contaCancelarBtnText: { fontSize: 14, color: '#ef5350', fontWeight: '600' },
});
