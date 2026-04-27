import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Dimensions,
} from 'react-native';
import Svg, { Rect, Line, Text as SvgText, G } from 'react-native-svg';
import { useFocusEffect } from '@react-navigation/native';
import { lancamentosService, ResumoAnual, ResumoMes } from '../services/api';
import { fmtBRL, fmtBRLCompact } from '../utils/currency';
import { useTheme } from '../theme/ThemeContext';
import type { ColorScheme } from '../theme/colors';

const MESES_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const MESES_FULL  = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                     'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

interface MesData {
  mes: number;
  receitas: number;
  despesas: number;
  saldo: number;
}

interface AnualData {
  totalCreditos: number;
  totalDebitos: number;
  saldo: number;
  meses: MesData[];
  topCategorias: { categoria: string; total: number }[];
}

// ── Gráfico de barras duplas (receitas × despesas) ────────────────────────────
function MonthlyBarsChart({ data, colors }: { data: MesData[]; colors: ColorScheme }) {
  const screenW   = Dimensions.get('window').width - 48;
  const chartH    = 160;
  const padB      = 24;
  const padT      = 10;
  const innerH    = chartH - padB - padT;
  const colW      = screenW / 12;
  const barW      = Math.floor(colW * 0.35);
  const gap       = 2;

  const maxVal = Math.max(...data.flatMap(d => [d.receitas, d.despesas]), 1);

  function barH(val: number) { return Math.max((val / maxVal) * innerH, val > 0 ? 2 : 0); }

  // linhas de grid
  const gridLines = [0.25, 0.5, 0.75, 1].map(f => ({
    y: padT + innerH * (1 - f),
    label: fmtBRLCompact(maxVal * f),
  }));

  return (
    <Svg width={screenW} height={chartH}>
      {/* Grid */}
      {gridLines.map((g, i) => (
        <G key={i}>
          <Line x1={0} y1={g.y} x2={screenW} y2={g.y}
            stroke={colors.gridLine} strokeWidth={0.5} strokeDasharray="3,3" />
          <SvgText x={screenW - 2} y={g.y - 2} fontSize={8} fill={colors.textTertiary} textAnchor="end">
            {g.label}
          </SvgText>
        </G>
      ))}

      {data.map((d, i) => {
        const cx     = i * colW + colW / 2;
        const recX   = cx - barW - gap / 2;
        const desX   = cx + gap / 2;
        const recH   = barH(d.receitas);
        const desH   = barH(d.despesas);
        const baseY  = padT + innerH;

        return (
          <G key={i}>
            {/* Barra receita (verde) */}
            <Rect x={recX} y={baseY - recH} width={barW} height={recH} rx={2} fill={colors.green} opacity={0.85} />
            {/* Barra despesa (vermelho) */}
            <Rect x={desX} y={baseY - desH} width={barW} height={desH} rx={2} fill={colors.red} opacity={0.85} />
            {/* Label mês */}
            <SvgText x={cx} y={chartH - 4} fontSize={9} fill={colors.textSecondary} textAnchor="middle">
              {MESES_SHORT[d.mes - 1]}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

// ── Tela principal ────────────────────────────────────────────────────────────
export default function AnualScreen() {
  const { colors } = useTheme();
  const s = styles(colors);

  const [ano, setAno]         = useState(new Date().getFullYear());
  const [dados, setDados]     = useState<AnualData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (a: number) => {
    setLoading(true);
    try {
      const res = await lancamentosService.getResumoAnual(a);
      setDados({
        totalCreditos:  res.totalCreditos,
        totalDebitos:   res.totalDebitos,
        saldo:          res.saldo,
        meses:          res.meses.map((m: ResumoMes) => ({
          mes:      m.mes,
          receitas: m.totalCreditos,
          despesas: m.totalDebitos,
          saldo:    m.saldo,
        })),
        topCategorias: res.topCategorias,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(ano); }, [ano, load]));

  function navAno(delta: number) { setAno(a => a + delta); }

  // ── Agregações ────────────────────────────────────────────────────────────
  const meses         = dados?.meses ?? [];
  const totalReceitas = dados?.totalCreditos ?? 0;
  const totalDespesas = dados?.totalDebitos  ?? 0;
  const saldoAnual    = dados?.saldo         ?? 0;
  const mediaDesp     = totalDespesas / 12;

  const mesesComDesp  = meses.filter(d => d.despesas > 0);
  const mesMaisCaro   = mesesComDesp.reduce<MesData | null>(
    (max, d) => !max || d.despesas > max.despesas ? d : max, null);
  const mesMaisBarato = mesesComDesp.reduce<MesData | null>(
    (min, d) => !min || d.despesas < min.despesas ? d : min, null);

  const topCats = (dados?.topCategorias ?? []).map(c => ({ cat: c.categoria, total: c.total }));
  const maxCat  = topCats[0]?.total ?? 1;

  const CAT_COLORS = [
    colors.blue, colors.green, colors.red, colors.orange, colors.purple,
    '#00BCD4', '#795548', '#E91E63',
  ];

  const saldoColor = saldoAnual >= 0 ? colors.green : colors.red;

  if (loading) return (
    <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator size="large" color={colors.green} />
    </View>
  );

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 40 }}>

      {/* ── Seletor de ano ── */}
      <View style={s.yearRow}>
        <TouchableOpacity onPress={() => navAno(-1)} style={s.navBtn}>
          <Text style={s.navBtnText}>◀</Text>
        </TouchableOpacity>
        <Text style={s.yearLabel}>{ano}</Text>
        <TouchableOpacity onPress={() => navAno(1)} style={s.navBtn}>
          <Text style={s.navBtnText}>▶</Text>
        </TouchableOpacity>
      </View>

      {/* ── Cards de totais ── */}
      <View style={s.summaryRow}>
        <View style={[s.summaryCard, { borderLeftColor: colors.green }]}>
          <Text style={s.summaryLabel}>Receitas</Text>
          <Text style={[s.summaryValue, { color: colors.green }]}>{fmtBRLCompact(totalReceitas)}</Text>
        </View>
        <View style={[s.summaryCard, { borderLeftColor: colors.red }]}>
          <Text style={s.summaryLabel}>Despesas</Text>
          <Text style={[s.summaryValue, { color: colors.red }]}>{fmtBRLCompact(totalDespesas)}</Text>
        </View>
        <View style={[s.summaryCard, { borderLeftColor: saldoColor }]}>
          <Text style={s.summaryLabel}>Saldo</Text>
          <Text style={[s.summaryValue, { color: saldoColor }]}>{fmtBRLCompact(saldoAnual)}</Text>
        </View>
      </View>

      {/* ── Gráfico mensal ── */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Receitas × Despesas por mês</Text>
        <View style={s.legend}>
          <View style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: colors.green }]} />
            <Text style={s.legendText}>Receitas</Text>
          </View>
          <View style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: colors.red }]} />
            <Text style={s.legendText}>Despesas</Text>
          </View>
        </View>
        <MonthlyBarsChart data={meses} colors={colors} />
      </View>

      {/* ── Stats ── */}
      <View style={s.statsRow}>
        <View style={s.statCard}>
          <Text style={s.statIcon}>🔥</Text>
          <Text style={s.statLabel}>Mês mais caro</Text>
          <Text style={s.statValue}>{mesMaisCaro ? MESES_SHORT[mesMaisCaro.mes - 1] : '—'}</Text>
          <Text style={s.statSub}>{mesMaisCaro ? fmtBRL(mesMaisCaro.despesas) : ''}</Text>
        </View>
        <View style={s.statCard}>
          <Text style={s.statIcon}>💚</Text>
          <Text style={s.statLabel}>Mês mais barato</Text>
          <Text style={s.statValue}>{mesMaisBarato ? MESES_SHORT[mesMaisBarato.mes - 1] : '—'}</Text>
          <Text style={s.statSub}>{mesMaisBarato ? fmtBRL(mesMaisBarato.despesas) : ''}</Text>
        </View>
        <View style={s.statCard}>
          <Text style={s.statIcon}>📊</Text>
          <Text style={s.statLabel}>Média mensal</Text>
          <Text style={s.statValue}>{fmtBRLCompact(mediaDesp)}</Text>
          <Text style={s.statSub}>em despesas</Text>
        </View>
      </View>

      {/* ── Top categorias ── */}
      {topCats.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Top categorias do ano</Text>
          <View style={{ gap: 10, marginTop: 8 }}>
            {topCats.map(({ cat, total }, i) => {
              const pct = (total / maxCat) * 100;
              const color = CAT_COLORS[i % CAT_COLORS.length];
              return (
                <View key={cat} style={s.catRow}>
                  <Text style={s.catNome} numberOfLines={1}>{cat}</Text>
                  <View style={s.catBarWrap}>
                    <View style={[s.catBar, { width: `${pct}%` as any, backgroundColor: color }]} />
                  </View>
                  <Text style={s.catValor}>{fmtBRLCompact(total)}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* ── Tabela mensal ── */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Detalhe por mês</Text>
        <View style={{ marginTop: 8 }}>
          {/* Cabeçalho */}
          <View style={s.tableHeader}>
            <Text style={[s.tableCell, s.tableCellMes]}>Mês</Text>
            <Text style={[s.tableCell, { color: colors.green }]}>Receitas</Text>
            <Text style={[s.tableCell, { color: colors.red }]}>Despesas</Text>
            <Text style={s.tableCell}>Saldo</Text>
          </View>
          {meses.map(d => {
            const sc = d.saldo >= 0 ? colors.green : colors.red;
            return (
              <View key={d.mes} style={s.tableRow}>
                <Text style={[s.tableCell, s.tableCellMes, { color: colors.text }]}>
                  {MESES_FULL[d.mes - 1]}
                </Text>
                <Text style={[s.tableCell, { color: colors.green }]}>
                  {d.receitas > 0 ? fmtBRLCompact(d.receitas) : '—'}
                </Text>
                <Text style={[s.tableCell, { color: colors.red }]}>
                  {d.despesas > 0 ? fmtBRLCompact(d.despesas) : '—'}
                </Text>
                <Text style={[s.tableCell, { color: sc, fontWeight: '700' }]}>
                  {d.receitas > 0 || d.despesas > 0 ? fmtBRLCompact(d.saldo) : '—'}
                </Text>
              </View>
            );
          })}
          {/* Totais */}
          <View style={[s.tableRow, s.tableTotal]}>
            <Text style={[s.tableCell, s.tableCellMes, { color: colors.text, fontWeight: '700' }]}>Total</Text>
            <Text style={[s.tableCell, { color: colors.green, fontWeight: '700' }]}>{fmtBRLCompact(totalReceitas)}</Text>
            <Text style={[s.tableCell, { color: colors.red, fontWeight: '700' }]}>{fmtBRLCompact(totalDespesas)}</Text>
            <Text style={[s.tableCell, { color: saldoColor, fontWeight: '700' }]}>{fmtBRLCompact(saldoAnual)}</Text>
          </View>
        </View>
      </View>

    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
function styles(c: ColorScheme) {
  return StyleSheet.create({
    container:    { flex: 1, backgroundColor: c.background },

    yearRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                    paddingVertical: 20, gap: 32 },
    navBtn:       { padding: 8 },
    navBtnText:   { fontSize: 22, color: c.green },
    yearLabel:    { fontSize: 28, fontWeight: 'bold', color: c.text, minWidth: 80, textAlign: 'center' },

    summaryRow:   { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 12 },
    summaryCard:  { flex: 1, backgroundColor: c.surface, borderRadius: 12, padding: 12,
                    borderLeftWidth: 3, borderWidth: 1, borderColor: c.border },
    summaryLabel: { fontSize: 11, color: c.textSecondary, textTransform: 'uppercase', letterSpacing: 0.3 },
    summaryValue: { fontSize: 16, fontWeight: 'bold', marginTop: 4 },

    section:      { backgroundColor: c.surface, borderRadius: 14, marginHorizontal: 16,
                    marginBottom: 12, padding: 16, borderWidth: 1, borderColor: c.border },
    sectionTitle: { fontSize: 14, fontWeight: '700', color: c.text, marginBottom: 4 },

    legend:       { flexDirection: 'row', gap: 16, marginBottom: 10 },
    legendItem:   { flexDirection: 'row', alignItems: 'center', gap: 5 },
    legendDot:    { width: 9, height: 9, borderRadius: 5 },
    legendText:   { fontSize: 11, color: c.textSecondary },

    statsRow:     { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 12 },
    statCard:     { flex: 1, backgroundColor: c.surface, borderRadius: 12, padding: 12, alignItems: 'center',
                    borderWidth: 1, borderColor: c.border, gap: 2 },
    statIcon:     { fontSize: 20 },
    statLabel:    { fontSize: 10, color: c.textSecondary, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.3 },
    statValue:    { fontSize: 14, fontWeight: 'bold', color: c.text },
    statSub:      { fontSize: 10, color: c.textTertiary },

    catRow:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
    catNome:      { fontSize: 12, color: c.textSecondary, width: 88 },
    catBarWrap:   { flex: 1, height: 10, backgroundColor: c.surfaceElevated, borderRadius: 5, overflow: 'hidden' },
    catBar:       { height: 10, borderRadius: 5 },
    catValor:     { fontSize: 12, color: c.text, fontWeight: '600', width: 64, textAlign: 'right' },

    tableHeader:  { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: c.border },
    tableRow:     { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.border },
    tableTotal:   { borderTopWidth: 2, borderTopColor: c.border, borderBottomWidth: 0, marginTop: 2 },
    tableCell:    { flex: 1, fontSize: 12, color: c.textSecondary, textAlign: 'right' },
    tableCellMes: { flex: 1.4, textAlign: 'left', fontWeight: '600' },
  });
}
