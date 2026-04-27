import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { lancamentosService } from '../services/api';
import { Lancamento, SituacaoLancamento, TipoLancamento } from '../types';
import { fmtBRL } from '../utils/currency';
import { useTheme } from '../theme/ThemeContext';
import type { ColorScheme } from '../theme/colors';

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const DIAS  = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

const SITUACAO_LABEL: Record<number, string> = {
  [SituacaoLancamento.Recebido]: 'Recebido',
  [SituacaoLancamento.Pago]:     'Pago',
  [SituacaoLancamento.AReceber]: 'A Receber',
  [SituacaoLancamento.AVencer]:  'A Vencer',
  [SituacaoLancamento.Vencido]:  'Vencido',
};

type ListItem =
  | { kind: 'header'; dateKey: string; label: string; entradas: number; saidas: number }
  | { kind: 'tx'; data: Lancamento };

function buildList(items: Lancamento[]): ListItem[] {
  const sorted = [...items].sort(
    (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()
  );
  const result: ListItem[] = [];
  let lastKey = '';

  for (const l of sorted) {
    const key = l.data.slice(0, 10);
    if (key !== lastKey) {
      const group = sorted.filter(x => x.data.slice(0, 10) === key);
      const entradas = group.filter(x => x.tipo === TipoLancamento.Credito).reduce((s, x) => s + x.valor, 0);
      const saidas   = group.filter(x => x.tipo !== TipoLancamento.Credito).reduce((s, x) => s + x.valor, 0);
      const d = new Date(key + 'T12:00:00');
      const label = `${String(d.getDate()).padStart(2,'0')} ${MESES[d.getMonth()]} · ${DIAS[d.getDay()]}`;
      result.push({ kind: 'header', dateKey: key, label, entradas, saidas });
      lastKey = key;
    }
    result.push({ kind: 'tx', data: l });
  }
  return result;
}

export default function ExtratoContaScreen({ route }: any) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { contaBancariaId, banco, emoji, saldo } = route.params;

  const now = new Date();
  const [mes,        setMes]        = useState(now.getMonth() + 1);
  const [ano,        setAno]        = useState(now.getFullYear());
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const all: Lancamento[] = await lancamentosService.getByMes(mes, ano);
      setLancamentos(all.filter(l => l.contaBancariaId === contaBancariaId));
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, [mes, ano, contaBancariaId]);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  function navMes(dir: 1 | -1) {
    let m = mes + dir, a = ano;
    if (m > 12) { m = 1;  a++; }
    if (m < 1)  { m = 12; a--; }
    setMes(m); setAno(a);
  }

  const totalEntradas  = lancamentos.filter(l => l.tipo === TipoLancamento.Credito).reduce((s, l) => s + l.valor, 0);
  const totalSaidas    = lancamentos.filter(l => l.tipo !== TipoLancamento.Credito).reduce((s, l) => s + l.valor, 0);
  const saldoPeriodo   = totalEntradas - totalSaidas;
  const listData       = useMemo(() => buildList(lancamentos), [lancamentos]);

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color={colors.green} />
    </View>
  );

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.background }}
      data={listData}
      keyExtractor={(item, i) =>
        item.kind === 'tx' ? item.data.id : `h-${item.dateKey}`
      }
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />
      }
      ListHeaderComponent={(
        <>
          {/* Card da conta */}
          <View style={styles.contaCard}>
            <Text style={styles.contaEmoji}>{emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.contaNome}>{banco}</Text>
              <Text style={styles.contaSaldoLabel}>Saldo atual</Text>
            </View>
            <Text style={[styles.contaSaldo, { color: saldo >= 0 ? colors.green : colors.red }]}>
              {fmtBRL(saldo)}
            </Text>
          </View>

          {/* Navegação de mês */}
          <View style={styles.monthNav}>
            <TouchableOpacity onPress={() => navMes(-1)} style={styles.navBtn}>
              <Text style={styles.navArrow}>◀</Text>
            </TouchableOpacity>
            <Text style={styles.monthLabel}>{MESES[mes - 1]}/{ano}</Text>
            <TouchableOpacity onPress={() => navMes(1)} style={styles.navBtn}>
              <Text style={styles.navArrow}>▶</Text>
            </TouchableOpacity>
          </View>

          {/* Resumo do período */}
          <View style={styles.summaryRow}>
            <View style={[styles.summaryCard, { borderLeftColor: colors.green }]}>
              <Text style={styles.summaryLabel}>Entradas</Text>
              <Text style={[styles.summaryValue, { color: colors.green }]}>{fmtBRL(totalEntradas)}</Text>
            </View>
            <View style={[styles.summaryCard, { borderLeftColor: colors.red }]}>
              <Text style={styles.summaryLabel}>Saídas</Text>
              <Text style={[styles.summaryValue, { color: colors.red }]}>{fmtBRL(totalSaidas)}</Text>
            </View>
            <View style={[styles.summaryCard, { borderLeftColor: saldoPeriodo >= 0 ? colors.green : colors.red }]}>
              <Text style={styles.summaryLabel}>Período</Text>
              <Text style={[styles.summaryValue, { color: saldoPeriodo >= 0 ? colors.green : colors.red }]}>
                {fmtBRL(saldoPeriodo)}
              </Text>
            </View>
          </View>
        </>
      )}
      ListEmptyComponent={(
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyText}>Nenhum lançamento neste mês</Text>
          <Text style={styles.emptyHint}>vinculado a esta conta.</Text>
        </View>
      )}
      renderItem={({ item }) => {
        if (item.kind === 'header') {
          return (
            <View style={styles.dateHeader}>
              <Text style={styles.dateLabel}>{item.label}</Text>
              <View style={styles.dateSummary}>
                {item.entradas > 0 && (
                  <Text style={styles.dateEntrada}>+{fmtBRL(item.entradas)}</Text>
                )}
                {item.saidas > 0 && (
                  <Text style={styles.dateSaida}>-{fmtBRL(item.saidas)}</Text>
                )}
              </View>
            </View>
          );
        }

        const l = item.data;
        const isCredito     = l.tipo === TipoLancamento.Credito;
        const isConfirmado  = l.situacao === SituacaoLancamento.Recebido || l.situacao === SituacaoLancamento.Pago;
        const valorColor    = isCredito ? colors.green : colors.red;

        return (
          <View style={styles.txRow}>
            <View style={[styles.txBar, { backgroundColor: valorColor }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.txDescricao} numberOfLines={1}>{l.descricao}</Text>
              {l.categoriaNome ? (
                <Text style={styles.txCategoria}>{l.categoriaNome}</Text>
              ) : null}
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.txValor, { color: valorColor }]}>
                {isCredito ? '+' : '-'}{fmtBRL(l.valor)}
              </Text>
              <View style={[
                styles.txBadge,
                { backgroundColor: isConfirmado ? colors.greenDim : colors.surfaceSubtle },
              ]}>
                <Text style={[
                  styles.txBadgeText,
                  { color: isConfirmado ? colors.green : colors.textTertiary },
                ]}>
                  {isConfirmado ? '✓ ' : ''}{SITUACAO_LABEL[l.situacao]}
                </Text>
              </View>
            </View>
          </View>
        );
      }}
      contentContainerStyle={styles.list}
    />
  );
}

function makeStyles(c: ColorScheme) {
  return StyleSheet.create({
    list: { padding: 16, paddingBottom: 40 },

    contaCard: {
      backgroundColor: c.surface, borderRadius: 14, padding: 20,
      flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16,
    },
    contaEmoji:      { fontSize: 32 },
    contaNome:       { fontSize: 17, fontWeight: '700', color: c.text },
    contaSaldoLabel: { fontSize: 12, color: c.textSecondary, marginTop: 2 },
    contaSaldo:      { fontSize: 20, fontWeight: 'bold' },

    monthNav: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 20, marginBottom: 16,
    },
    navBtn:     { padding: 8 },
    navArrow:   { color: c.textSecondary, fontSize: 16 },
    monthLabel: { fontSize: 18, fontWeight: '700', color: c.text, minWidth: 100, textAlign: 'center' },

    summaryRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
    summaryCard: {
      flex: 1, backgroundColor: c.surface, borderRadius: 10, padding: 12,
      borderLeftWidth: 3,
    },
    summaryLabel: { fontSize: 11, color: c.textSecondary, marginBottom: 4 },
    summaryValue: { fontSize: 13, fontWeight: '700' },

    dateHeader: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingVertical: 8, paddingHorizontal: 2, marginTop: 8,
      borderBottomWidth: 1, borderBottomColor: c.border,
      marginBottom: 4,
    },
    dateLabel:   { fontSize: 13, fontWeight: '600', color: c.textSecondary },
    dateSummary: { flexDirection: 'row', gap: 8 },
    dateEntrada: { fontSize: 12, color: c.green, fontWeight: '600' },
    dateSaida:   { fontSize: 12, color: c.red,   fontWeight: '600' },

    txRow: {
      backgroundColor: c.surfaceElevated, borderRadius: 10, padding: 14,
      flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6,
    },
    txBar:       { width: 3, height: 42, borderRadius: 2 },
    txDescricao: { fontSize: 14, fontWeight: '600', color: c.text },
    txCategoria: { fontSize: 12, color: c.textSecondary, marginTop: 2 },
    txValor:     { fontSize: 15, fontWeight: '700', marginBottom: 4 },
    txBadge:     { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
    txBadgeText: { fontSize: 11, fontWeight: '600' },

    empty:     { alignItems: 'center', marginTop: 60 },
    emptyIcon: { fontSize: 40, marginBottom: 12 },
    emptyText: { fontSize: 15, color: c.textSecondary },
    emptyHint: { fontSize: 13, color: c.textTertiary, marginTop: 4 },
  });
}
