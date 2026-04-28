import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, StyleSheet, ScrollView, Modal, FlatList,
  RefreshControl, TouchableOpacity, ActivityIndicator, Dimensions,
} from 'react-native';
import Svg, { Rect, Text as SvgText, Line, Circle, Path, G } from 'react-native-svg';
import { lancamentosService, categoriasService, OrcamentoItem, api } from '../services/api';
import { Dashboard } from '../types';
import { fmtBRL, fmtBRLCompact } from '../utils/currency';
import { useTheme } from '../theme/ThemeContext';
import type { ColorScheme } from '../theme/colors';
import { useVencimentos } from '../contexts/VencimentosContext';
import { useNavigation } from '@react-navigation/native';

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

const CATEGORY_COLORS = [
  '#4CAF50','#2196F3','#FF9800','#9C27B0','#00BCD4',
  '#F44336','#795548','#607D8B','#E91E63','#CDDC39',
];

// ─── Badge de variação vs mês anterior ───────────────────────────────────────
function VariacaoBadge({ valor, positiveIsGood }: { valor: number | null; positiveIsGood: boolean }) {
  if (valor === null) return null;
  const isPositive = valor > 0;
  const isGood = positiveIsGood ? isPositive : !isPositive;
  const cor = isGood ? '#3fb950' : '#f85149';
  const seta = isPositive ? '▲' : '▼';
  return (
    <View style={{ backgroundColor: cor + '22', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginRight: 8 }}>
      <Text style={{ color: cor, fontSize: 11, fontWeight: '700' }}>
        {seta} {Math.abs(valor).toFixed(1)}%
      </Text>
    </View>
  );
}

// ─── Gráfico de barras horizontal para categorias ────────────────────────────
function CategoryBarChart({ data, width, onPress }: {
  data: { categoria: string; total: number }[];
  width: number;
  onPress: (categoria: string, color: string) => void;
}) {
  const { colors } = useTheme();
  const labelW = 90;
  const valueW = 72;
  const chartW = width - labelW - valueW;
  const maxVal = Math.max(...data.map(d => d.total), 1);

  return (
    <View style={{ width, gap: 6 }}>
      {data.map((item, i) => {
        const pct = Math.max((item.total / maxVal) * 100, 1);
        const color = CATEGORY_COLORS[i % CATEGORY_COLORS.length];
        return (
          <TouchableOpacity
            key={item.categoria}
            onPress={() => onPress(item.categoria, color)}
            activeOpacity={0.65}
            style={{ flexDirection: 'row', alignItems: 'center', height: 26 }}
          >
            {/* Label */}
            <Text style={{ width: labelW, fontSize: 11, color: colors.textSecondary }} numberOfLines={1}>
              {item.categoria.length > 11 ? item.categoria.slice(0, 10) + '…' : item.categoria}
            </Text>
            {/* Barra */}
            <View style={{ width: chartW, height: 18, backgroundColor: colors.barBg, borderRadius: 5, overflow: 'hidden' }}>
              <View style={{ width: `${pct}%`, height: 18, backgroundColor: color, borderRadius: 5 }} />
            </View>
            {/* Valor */}
            <Text style={{ width: valueW, fontSize: 10, color: colors.textTertiary, fontWeight: 'bold', textAlign: 'right' }}>
              {item.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Donut Receitas vs Despesas ───────────────────────────────────────────────
function ReceitaDespesaDonut({ receitas, despesas }: { receitas: number; despesas: number }) {
  const { colors } = useTheme();
  const size = 180;
  const cx = size / 2;
  const cy = size / 2;
  const R = 72;
  const r = 46;
  const total = receitas + despesas;

  function polarXY(angleDeg: number, radius: number) {
    const rad = (angleDeg - 90) * (Math.PI / 180);
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  }

  function arcPath(startDeg: number, endDeg: number, color: string) {
    if (endDeg - startDeg >= 360) endDeg = 359.99;
    const p1 = polarXY(startDeg, R);
    const p2 = polarXY(endDeg, R);
    const p3 = polarXY(endDeg, r);
    const p4 = polarXY(startDeg, r);
    const large = endDeg - startDeg > 180 ? 1 : 0;
    return (
      `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} ` +
      `A ${R} ${R} 0 ${large} 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)} ` +
      `L ${p3.x.toFixed(2)} ${p3.y.toFixed(2)} ` +
      `A ${r} ${r} 0 ${large} 0 ${p4.x.toFixed(2)} ${p4.y.toFixed(2)} Z`
    );
  }

  const receitasDeg = total > 0 ? (receitas / total) * 360 : 180;
  const despesasDeg = 360 - receitasDeg;
  const saldo = receitas - despesas;
  const saldoColor = saldo >= 0 ? '#4CAF50' : '#e53935';

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size}>
        {/* Fundo */}
        <Path d={arcPath(0, 359.99, colors.border)} fill={colors.border} />
        {/* Receitas */}
        <Path d={arcPath(0, receitasDeg)} fill="#4CAF50" />
        {/* Despesas */}
        {despesasDeg > 0 && <Path d={arcPath(receitasDeg, 360)} fill="#e53935" />}
        {/* Centro */}
        <Circle cx={cx} cy={cy} r={r - 4} fill={colors.chartCenter} />
        <SvgText x={cx} y={cy - 8} textAnchor="middle" fontSize={10} fill={colors.textSecondary}>Saldo</SvgText>
        <SvgText x={cx} y={cy + 8} textAnchor="middle" fontSize={13} fontWeight="bold" fill={saldoColor}>
          {fmtBRLCompact(Math.abs(saldo))}
        </SvgText>
        {saldo < 0 && (
          <SvgText x={cx} y={cy + 22} textAnchor="middle" fontSize={9} fill="#e53935">negativo</SvgText>
        )}
      </Svg>

      {/* Legenda */}
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
        <View style={{ alignItems: 'center' }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#4CAF50', marginBottom: 2 }} />
          <Text style={{ fontSize: 10, color: colors.textSecondary }}>Receitas</Text>
          <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#4CAF50' }}>
            {total > 0 ? ((receitas / total) * 100).toFixed(0) : 0}%
          </Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#e53935', marginBottom: 2 }} />
          <Text style={{ fontSize: 10, color: colors.textSecondary }}>Despesas</Text>
          <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#e53935' }}>
            {total > 0 ? ((despesas / total) * 100).toFixed(0) : 0}%
          </Text>
        </View>
      </View>
    </View>
  );
}

// ─── Gráfico de pizza — despesas por categoria ───────────────────────────────
function CategoryPieChart({ data, totalDespesas }: {
  data: { categoria: string; total: number }[];
  totalDespesas: number;
}) {
  const { colors } = useTheme();
  const size = 180;
  const cx = size / 2;
  const cy = size / 2;
  const R = 72;
  const r = 28; // buraco menor = mais "pizza" do que donut

  function polarXY(angleDeg: number, radius: number) {
    const rad = (angleDeg - 90) * (Math.PI / 180);
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  }

  function slicePath(startDeg: number, endDeg: number) {
    if (endDeg - startDeg >= 360) endDeg = 359.99;
    const p1 = polarXY(startDeg, R);
    const p2 = polarXY(endDeg, R);
    const p3 = polarXY(endDeg, r);
    const p4 = polarXY(startDeg, r);
    const large = endDeg - startDeg > 180 ? 1 : 0;
    return (
      `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} ` +
      `A ${R} ${R} 0 ${large} 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)} ` +
      `L ${p3.x.toFixed(2)} ${p3.y.toFixed(2)} ` +
      `A ${r} ${r} 0 ${large} 0 ${p4.x.toFixed(2)} ${p4.y.toFixed(2)} Z`
    );
  }

  // Acumula ângulos
  let cursor = 0;
  const slices = data.map((item, i) => {
    const deg = totalDespesas > 0 ? (item.total / totalDespesas) * 360 : 360 / data.length;
    const start = cursor;
    cursor += deg;
    return { ...item, start, end: cursor, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] };
  });

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size}>
        {slices.map(s => (
          <Path key={s.categoria} d={slicePath(s.start, s.end)} fill={s.color} stroke={colors.chartCenter} strokeWidth={1.5} />
        ))}
        {/* Centro */}
        <Circle cx={cx} cy={cy} r={r - 2} fill={colors.chartCenter} />
        <SvgText x={cx} y={cy + 5} textAnchor="middle" fontSize={10} fill={colors.textSecondary} fontWeight="600">
          {data.length} cat.
        </SvgText>
      </Svg>

      {/* Legenda */}
      <View style={{ gap: 3, marginTop: 4, alignSelf: 'flex-start' }}>
        {slices.map(s => (
          <View key={s.categoria} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: s.color }} />
            <Text style={{ fontSize: 10, color: colors.textSecondary, flex: 1 }} numberOfLines={1}>
              {s.categoria.length > 12 ? s.categoria.slice(0, 11) + '…' : s.categoria}
            </Text>
            <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textTertiary, marginLeft: 2 }}>
              {totalDespesas > 0 ? ((s.total / totalDespesas) * 100).toFixed(0) : 0}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Gráfico de linhas para projeção ─────────────────────────────────────────
function ProjectionChart({ data }: { data: { label: string; receitas: number; despesas: number; isFuture: boolean }[] }) {
  const { colors } = useTheme();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Ocupa toda a largura: window - margens da section (16*2); o padding é cancelado pelo marginHorizontal: -18 do wrapper
  const screenW = Dimensions.get('window').width - 32;
  const chartH = 200;
  const padL = 56;
  const padR = 24;
  const padT = 20;
  const padB = 32;
  const plotW = screenW - padL - padR;
  const plotH = chartH - padT - padB;

  const allValues = data.flatMap(d => [d.receitas, d.despesas]);
  const maxVal = Math.max(...allValues, 1);
  const n = data.length;
  const stepX = plotW / (n - 1 || 1);

  const TIP_W = 136;
  const TIP_H = 72;

  function xOf(i: number) { return padL + i * stepX; }
  function yOf(v: number) { return padT + plotH - (v / maxVal) * plotH; }
  function fmt(v: number) { return fmtBRLCompact(v); }

  function linePath(key: 'receitas' | 'despesas') {
    return data.map((d, i) => `${i === 0 ? 'M' : 'L'}${xOf(i).toFixed(1)},${yOf(d[key]).toFixed(1)}`).join(' ');
  }

  const ticks = [0, 0.25, 0.5, 0.75, 1].map(t => ({ v: maxVal * t, y: yOf(maxVal * t) }));

  // Posição do tooltip: à direita do cursor, mas que não saia do SVG
  function tipX(i: number) {
    const cx = xOf(i);
    return cx + TIP_W + 8 > screenW - padR ? cx - TIP_W - 8 : cx + 8;
  }
  function tipY() { return padT + 4; }

  return (
    <Svg width={screenW} height={chartH}>
      {/* Grid lines */}
      {ticks.map((t, i) => (
        <G key={i}>
          <Line x1={padL} y1={t.y} x2={screenW - padR} y2={t.y} stroke={colors.gridLine} strokeWidth={1} />
          <SvgText x={padL - 4} y={t.y + 4} fontSize={9} fill={colors.textTertiary} textAnchor="end">
            {t.v >= 1000 ? `${(t.v / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 })}k` : t.v.toFixed(0)}
          </SvgText>
        </G>
      ))}

      {/* Linhas */}
      <Path d={linePath('receitas')} stroke="#4CAF50" strokeWidth={2.5} fill="none" />
      <Path d={linePath('despesas')} stroke="#e53935" strokeWidth={2.5} fill="none" />

      {/* Linha vertical de hover */}
      {hoveredIdx !== null && (
        <Line
          x1={xOf(hoveredIdx)} y1={padT}
          x2={xOf(hoveredIdx)} y2={padT + plotH}
          stroke={colors.textTertiary} strokeWidth={1} strokeDasharray="4,3"
        />
      )}

      {/* Pontos */}
      {data.map((d, i) => {
        const hovered = hoveredIdx === i;
        const r = hovered ? 6 : (data.length > 8 ? 3 : 4);
        const showLabel = data.length <= 6 || i % 2 === 0;
        return (
          <G key={i}>
            <Circle cx={xOf(i)} cy={yOf(d.receitas)} r={r} fill={d.isFuture ? 'none' : '#4CAF50'} stroke="#4CAF50" strokeWidth={hovered ? 2.5 : 2} />
            <Circle cx={xOf(i)} cy={yOf(d.despesas)} r={r} fill={d.isFuture ? 'none' : '#e53935'} stroke="#e53935" strokeWidth={hovered ? 2.5 : 2} strokeDasharray={d.isFuture ? '3,2' : undefined} />
            {showLabel && (
              <SvgText x={xOf(i)} y={chartH - 4} fontSize={9} fill={hovered ? colors.text : (d.isFuture ? colors.textTertiary : colors.textSecondary)} fontWeight={hovered ? 'bold' : 'normal'} textAnchor="middle">
                {d.label}{d.isFuture ? '*' : ''}
              </SvgText>
            )}
          </G>
        );
      })}

      {/* Áreas de hover — faixas verticais invisíveis sobre cada ponto */}
      {data.map((d, i) => {
        const halfStep = stepX / 2;
        const rx = xOf(i) - halfStep;
        return (
          <Rect
            key={`hit-${i}`}
            x={Math.max(padL, rx)} y={padT}
            width={Math.min(stepX, screenW - padR - Math.max(padL, rx))}
            height={plotH}
            fill="transparent"
            // @ts-ignore — eventos web
            onMouseEnter={() => setHoveredIdx(i)}
            // @ts-ignore
            onMouseLeave={() => setHoveredIdx(null)}
            onPressIn={() => setHoveredIdx(i)}
            onPressOut={() => setHoveredIdx(null)}
          />
        );
      })}

      {/* Tooltip */}
      {hoveredIdx !== null && (() => {
        const d = data[hoveredIdx];
        const tx = tipX(hoveredIdx);
        const ty = tipY();
        return (
          <G>
            {/* Sombra */}
            <Rect x={tx + 2} y={ty + 2} width={TIP_W} height={TIP_H} rx={8} fill="rgba(0,0,0,0.07)" />
            {/* Fundo */}
            <Rect x={tx} y={ty} width={TIP_W} height={TIP_H} rx={8} fill={colors.tooltipBg} stroke={colors.tooltipBorder} strokeWidth={1} />
            {/* Título (mês) */}
            <SvgText x={tx + 12} y={ty + 20} fontSize={12} fill={colors.text} fontWeight="bold">
              {d.label}{d.isFuture ? ' (projetado)' : ''}
            </SvgText>
            {/* Receitas */}
            <Rect x={tx + 12} y={ty + 30} width={8} height={8} rx={2} fill="#4CAF50" />
            <SvgText x={tx + 24} y={ty + 38} fontSize={11} fill="#4CAF50" fontWeight="600">
              {fmt(d.receitas)}
            </SvgText>
            {/* Despesas */}
            <Rect x={tx + 12} y={ty + 48} width={8} height={8} rx={2} fill="#e53935" />
            <SvgText x={tx + 24} y={ty + 56} fontSize={11} fill="#e53935" fontWeight="600">
              {fmt(d.despesas)}
            </SvgText>
          </G>
        );
      })()}

      {/* Legenda */}
      <Rect x={padL} y={8} width={10} height={4} rx={2} fill="#4CAF50" />
      <SvgText x={padL + 13} y={12} fontSize={10} fill="#4CAF50">Receitas</SvgText>
      <Rect x={padL + 70} y={8} width={10} height={4} rx={2} fill="#e53935" />
      <SvgText x={padL + 83} y={12} fontSize={10} fill="#e53935">Despesas</SvgText>
      <SvgText x={screenW - padR} y={chartH - 4} fontSize={9} fill={colors.textTertiary} textAnchor="end">* projetado</SvgText>
    </Svg>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function DashboardScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { alertas } = useVencimentos();
  const navigation = useNavigation();

  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hideValues, setHideValues] = useState(false);

  // Projeção — carrega só quando o usuário expandir
  const [projection, setProjection] = useState<{ label: string; receitas: number; despesas: number; isFuture: boolean }[]>([]);
  const [projectionVisible, setProjectionVisible] = useState(false);
  const [projectionLoading, setProjectionLoading] = useState(false);

  // Dívidas — carrega só quando o usuário expandir
  const [totalDividas, setTotalDividas] = useState<number | null>(null);
  const [dividasLoading, setDividasLoading] = useState(false);

  // Orçamento — carrega lazy junto com dívidas
  const [orcamento, setOrcamento] = useState<OrcamentoItem[]>([]);
  const [orcamentoLoading, setOrcamentoLoading] = useState(false);

  // Metas — carrega lazy
  const [metas, setMetas] = useState<{ valorMeta: number; valorAtual: number; status: number }[]>([]);
  const [metasLoading, setMetasLoading] = useState(false);

  // Modal de categoria
  const [catModal, setCatModal] = useState<{ nome: string; color: string; total: number } | null>(null);
  const [catLancs, setCatLancs] = useState<any[]>([]);
  const [catLoading, setCatLoading] = useState(false);

  // Carga inicial: apenas o dashboard do mês (1 chamada)
  const load = useCallback(async () => {
    try {
      const data = await lancamentosService.getDashboard(mes, ano);
      setDashboard(data);
      // Reseta lazy data ao trocar de mês
      setProjection([]);
      setProjectionVisible(false);
      setTotalDividas(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [mes, ano]);

  useEffect(() => { load(); }, [load]);

  // Reseta dados lazy ao focar a tela (cobre troca de usuário sem mudança de mês)
  useFocusEffect(useCallback(() => {
    setProjection([]);
    setProjectionVisible(false);
    setTotalDividas(null);
    setOrcamento([]);

    setDividasLoading(true);
    lancamentosService.getParceladosVigentes()
      .then(r => setTotalDividas(r.totalDivida))
      .catch(() => setTotalDividas(null))
      .finally(() => setDividasLoading(false));

    setOrcamentoLoading(true);
    categoriasService.getOrcamento(mes, ano)
      .then(setOrcamento)
      .catch(() => setOrcamento([]))
      .finally(() => setOrcamentoLoading(false));

    setMetas([]);
    setMetasLoading(true);
    api.get('/metas').then(r => setMetas(r.data))
      .catch(() => setMetas([]))
      .finally(() => setMetasLoading(false));
  }, [mes, ano]));

  // Carrega projeção sob demanda — 1 chamada ao backend
  async function carregarProjecao() {
    if (projectionLoading) return;
    setProjectionLoading(true);
    try {
      const nowDate = new Date();
      const currentMes = nowDate.getMonth() + 1;
      const currentAno = nowDate.getFullYear();
      const data = await lancamentosService.getProjecao(mes, ano);
      const months = data.map(d => ({
        label: d.label,
        receitas: d.totalCreditos,
        despesas: d.totalDebitos,
        isFuture: d.ano > currentAno || (d.ano === currentAno && d.mes > currentMes),
      }));
      setProjection(months);
      setProjectionVisible(true);
    } finally {
      setProjectionLoading(false);
    }
  }

  // Carrega total de dívidas sob demanda
  async function carregarDividas() {
    if (dividasLoading || totalDividas !== null) return;
    setDividasLoading(true);
    try {
      const result = await lancamentosService.getParceladosVigentes();
      setTotalDividas(result.totalDivida);
    } finally {
      setDividasLoading(false);
    }
  }

  async function abrirCategoria(categoria: string, color: string) {
    const total = resumo.find(r => r.categoria === categoria)?.total ?? 0;
    setCatModal({ nome: categoria, color, total });
    setCatLancs([]);
    setCatLoading(true);
    try {
      const todos = await lancamentosService.getByMes(mes, ano);
      const filtrados = todos.filter((l: any) => l.categoriaNome === categoria &&
        (l.tipo === 2 || l.tipo === 3)); // Debito | Pix
      setCatLancs(filtrados);
    } finally {
      setCatLoading(false);
    }
  }

  function navMes(delta: number) {
    const d = new Date(ano, mes - 1 + delta, 1);
    setMes(d.getMonth() + 1);
    setAno(d.getFullYear());
    setLoading(true);
  }

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color={colors.green} />
    </View>
  );

  const saldoColor = (dashboard?.saldo ?? 0) >= 0 ? '#4CAF50' : '#e53935';
  const totalDespesas = dashboard?.totalDebitos ?? 0;
  const resumo = dashboard?.resumoDebitos ?? [];

  return (
    <View style={styles.container}>
    <ScrollView
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
    >
      {/* Navegação de mês */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navMes(-1)}><Text style={styles.navBtn}>◀</Text></TouchableOpacity>
        <Text style={styles.mesTitle}>{MESES[mes - 1]}/{ano}</Text>
        <TouchableOpacity onPress={() => navMes(1)}><Text style={styles.navBtn}>▶</Text></TouchableOpacity>
      </View>

      {/* Cards de resumo */}
      <View style={styles.summaryHeader}>
        <Text style={styles.summaryTitle}>Resumo do mês</Text>
        <TouchableOpacity onPress={() => setHideValues(v => !v)} style={styles.eyeBtn}>
          <Text style={styles.eyeIcon}>{hideValues ? '🙈' : '👁️'}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.cards}>
        <View style={[styles.card, { borderLeftColor: '#4CAF50' }]}>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>↑ Receitas</Text>
            <View style={styles.cardValueRow}>
              {!hideValues && <VariacaoBadge valor={dashboard?.variacaoCreditos ?? null} positiveIsGood />}
              <Text style={[styles.cardValue, { color: '#4CAF50' }]}>
                {hideValues ? '• • • • • •' : fmtBRL(dashboard?.totalCreditos ?? 0)}
              </Text>
            </View>
          </View>
        </View>
        <View style={[styles.card, { borderLeftColor: '#e53935' }]}>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>↓ Despesas</Text>
            <View style={styles.cardValueRow}>
              {!hideValues && <VariacaoBadge valor={dashboard?.variacaoDebitos ?? null} positiveIsGood={false} />}
              <Text style={[styles.cardValue, { color: '#e53935' }]}>
                {hideValues ? '• • • • • •' : fmtBRL(dashboard?.totalDebitos ?? 0)}
              </Text>
            </View>
          </View>
        </View>
        <View style={[styles.card, { borderLeftColor: saldoColor, borderBottomWidth: 0 }]}>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>= Saldo</Text>
            <View style={styles.cardValueRow}>
              {!hideValues && <VariacaoBadge valor={dashboard?.variacaoSaldo ?? null} positiveIsGood />}
              <Text style={[styles.cardValue, { color: saldoColor, fontSize: 26 }]}>
                {hideValues ? '• • • • • •' : fmtBRL(dashboard?.saldo ?? 0)}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Card de Pendências */}
      {alertas.length > 0 && (() => {
        const now2 = new Date();
        const mesAtual = now2.getMonth() + 1;
        const anoAtual = now2.getFullYear();

        const vencidos  = alertas.filter(a => a.tipo === 'vencido');
        const aVencer   = alertas.filter(a => a.tipo === 'hoje' || a.tipo === 'breve');
        const totalVenc = vencidos.reduce((s, a) => s + a.valor, 0);
        const totalAV   = aVencer.reduce((s, a) => s + a.valor, 0);

        function navLanc(filtroSit: string) {
          (navigation as any).navigate('Lançamentos', {
            filtroSit,
            mes: mesAtual,
            ano: anoAtual,
          });
        }

        return (
          <View style={styles.pendenciasCard}>
            <Text style={styles.pendenciasTitle}>⚠️ Pendências</Text>

            {vencidos.length > 0 && (
              <TouchableOpacity style={styles.pendenciaRow} onPress={() => navLanc('vencido')}>
                <View style={styles.pendenciaLeft}>
                  <Text style={styles.pendenciaIcon}>🔴</Text>
                  <Text style={styles.pendenciaLabel}>
                    {vencidos.length} {vencidos.length === 1 ? 'vencido' : 'vencidos'}
                  </Text>
                </View>
                <Text style={[styles.pendenciaValor, { color: '#e53935' }]}>{fmtBRL(totalVenc)}</Text>
              </TouchableOpacity>
            )}

            {aVencer.length > 0 && (
              <TouchableOpacity style={[styles.pendenciaRow, { borderBottomWidth: 0 }]} onPress={() => navLanc('pendente')}>
                <View style={styles.pendenciaLeft}>
                  <Text style={styles.pendenciaIcon}>🟠</Text>
                  <Text style={styles.pendenciaLabel}>
                    {aVencer.length} {aVencer.length === 1 ? 'vence em breve' : 'vencem em breve'}
                  </Text>
                </View>
                <Text style={[styles.pendenciaValor, { color: '#FF9800' }]}>{fmtBRL(totalAV)}</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })()}

      {/* Gráfico de categorias + donut + pizza */}
      {resumo.length > 0 && (() => {
        const screenW = Dimensions.get('window').width;
        const isWide = screenW >= 700;
        const barW = isWide
          ? Math.floor(screenW / 2) - 72   // metade da tela menos padding
          : screenW - 68;

        return (
          <View style={styles.section}>
            {isWide ? (
              /* ── Desktop/tablet: 50% barras | 50% (donut + pizza) ── */
              <View style={styles.chartsRow}>
                {/* Col esquerda — barras */}
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>Despesas por Categoria</Text>
                  <View style={styles.chartWrap}>
                    <CategoryBarChart data={resumo} width={barW} onPress={abrirCategoria} />
                  </View>
                  <View style={styles.legendRow}>
                    {resumo.map((r, i) => (
                      <View key={r.categoria} style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }]} />
                        <Text style={styles.legendText}>
                          {r.categoria.length > 10 ? r.categoria.slice(0, 9) + '…' : r.categoria}
                          {' '}({totalDespesas > 0 ? ((r.total / totalDespesas) * 100).toFixed(0) : 0}%)
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Col direita — donut + pizza lado a lado */}
                <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'flex-start' }}>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={styles.sectionTitle}>Receitas vs Despesas</Text>
                    <ReceitaDespesaDonut receitas={dashboard?.totalCreditos ?? 0} despesas={dashboard?.totalDebitos ?? 0} />
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={styles.sectionTitle}>Categorias</Text>
                    <CategoryPieChart data={resumo} totalDespesas={totalDespesas} />
                  </View>
                </View>
              </View>
            ) : (
              /* ── Mobile: empilhado ── */
              <View>
                {/* Barras — largura total */}
                <Text style={styles.sectionTitle}>Despesas por Categoria</Text>
                <View style={styles.chartWrap}>
                  <CategoryBarChart data={resumo} width={barW} onPress={abrirCategoria} />
                </View>
                <View style={styles.legendRow}>
                  {resumo.map((r, i) => (
                    <View key={r.categoria} style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }]} />
                      <Text style={styles.legendText}>
                        {r.categoria.length > 10 ? r.categoria.slice(0, 9) + '…' : r.categoria}
                        {' '}({totalDespesas > 0 ? ((r.total / totalDespesas) * 100).toFixed(0) : 0}%)
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Donut + Pizza lado a lado */}
                <View style={[styles.chartsRow, { marginTop: 20, justifyContent: 'space-around' }]}>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={styles.sectionTitle}>Receitas vs Despesas</Text>
                    <ReceitaDespesaDonut receitas={dashboard?.totalCreditos ?? 0} despesas={dashboard?.totalDebitos ?? 0} />
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={styles.sectionTitle}>Categorias</Text>
                    <CategoryPieChart data={resumo} totalDespesas={totalDespesas} />
                  </View>
                </View>
              </View>
            )}
          </View>
        );
      })()}

      {/* Gráfico de projeção — lazy */}
      <TouchableOpacity
        style={styles.projecaoCard}
        onPress={() => { if (!projectionVisible) carregarProjecao(); else setProjectionVisible(false); }}
        activeOpacity={0.75}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.anualCardTitle}>📈 Projeção — 12 meses</Text>
          <Text style={styles.anualCardSub}>Histórico + meses futuros cadastrados</Text>
        </View>
        {projectionLoading
          ? <ActivityIndicator size="small" color={colors.blue} />
          : <Text style={{ color: colors.textSecondary, fontSize: 20 }}>{projectionVisible ? '▲' : '▼'}</Text>
        }
      </TouchableOpacity>

      {projectionVisible && projection.length > 0 && (
        <View style={[styles.section, { marginTop: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0 }]}>
          <View style={styles.projectionWrap}>
            <ProjectionChart data={projection} />
          </View>
        </View>
      )}

      {/* Card de Visão Anual */}
      <TouchableOpacity
        style={styles.anualCard}
        onPress={() => (navigation as any).navigate('Anual')}
        activeOpacity={0.75}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.anualCardTitle}>📅 Visão Anual</Text>
          <Text style={styles.anualCardSub}>Resumo completo de {ano}</Text>
        </View>
        <Text style={{ color: colors.textSecondary, fontSize: 20 }}>›</Text>
      </TouchableOpacity>

      {/* Card de Dívidas Parceladas — lazy */}
      <TouchableOpacity
        style={styles.dividasCard}
        onPress={() => (navigation as any).navigate('Dividas')}
        activeOpacity={0.75}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.dividasTitle}>💳 Dívidas Parceladas</Text>
          <Text style={styles.dividasSub}>
            {dividasLoading
              ? 'Calculando...'
              : totalDividas !== null
                ? hideValues ? '• • • • • •' : fmtBRL(totalDividas)
                : 'Ver todas as compras em aberto'}
          </Text>
        </View>
        <Text style={{ color: colors.textSecondary, fontSize: 20 }}>›</Text>
      </TouchableOpacity>

      {/* Card de Orçamento — lazy */}
      {(() => {
        const comLimite = orcamento.filter(i => i.limiteMensal != null);
        if (!orcamentoLoading && comLimite.length === 0) return null;

        const estouradas = comLimite.filter(i => i.gastoAtual > (i.limiteMensal ?? 0));
        const alertas80  = comLimite.filter(i => !estouradas.includes(i) && i.gastoAtual / (i.limiteMensal ?? 1) >= 0.8);
        const totalGasto = comLimite.reduce((s, i) => s + i.gastoAtual, 0);
        const totalLimite = comLimite.reduce((s, i) => s + (i.limiteMensal ?? 0), 0);
        const pctGeral = totalLimite > 0 ? totalGasto / totalLimite : 0;
        const corGeral = estouradas.length > 0 ? colors.red : pctGeral >= 0.8 ? colors.orange : colors.green;

        return (
          <TouchableOpacity
            style={styles.orcamentoCard}
            onPress={() => (navigation as any).navigate('Orcamento')}
            activeOpacity={0.75}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.orcamentoTitle}>🎯 Orçamento</Text>
              {orcamentoLoading ? (
                <Text style={styles.orcamentoSub}>Calculando...</Text>
              ) : (
                <>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <Text style={[styles.orcamentoValor, { color: corGeral }]}>
                      {hideValues ? '• • •' : fmtBRL(totalGasto)}
                    </Text>
                    <Text style={styles.orcamentoSub}>
                      de {hideValues ? '• • •' : fmtBRL(totalLimite)}
                    </Text>
                  </View>
                  {/* Barra de progresso geral */}
                  <View style={{ height: 4, backgroundColor: colors.border, borderRadius: 2, marginTop: 6 }}>
                    <View style={{ height: 4, borderRadius: 2, backgroundColor: corGeral, width: `${Math.min(pctGeral * 100, 100)}%` as any }} />
                  </View>
                  {(estouradas.length > 0 || alertas80.length > 0) && (
                    <Text style={[styles.orcamentoAlerta, { color: estouradas.length > 0 ? colors.red : colors.orange }]}>
                      {estouradas.length > 0
                        ? `🔴 ${estouradas.length} categoria${estouradas.length > 1 ? 's' : ''} acima do limite`
                        : `🟠 ${alertas80.length} categoria${alertas80.length > 1 ? 's' : ''} acima de 80%`}
                    </Text>
                  )}
                </>
              )}
            </View>
            <Text style={{ color: colors.textSecondary, fontSize: 20 }}>›</Text>
          </TouchableOpacity>
        );
      })()}

      {/* Card de Metas — lazy */}
      {(() => {
        const ativas     = metas.filter(m => m.status === 1);
        const concluidas = metas.filter(m => m.status === 2);
        if (!metasLoading && metas.length === 0) return null;

        const totalMeta  = ativas.reduce((s, m) => s + m.valorMeta, 0);
        const totalAtual = ativas.reduce((s, m) => s + m.valorAtual, 0);
        const pct        = totalMeta > 0 ? totalAtual / totalMeta : 0;

        return (
          <TouchableOpacity
            style={styles.metasCard}
            onPress={() => (navigation as any).navigate('Metas')}
            activeOpacity={0.75}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.metasTitle}>🎯 Metas</Text>
              {metasLoading ? (
                <Text style={styles.metasSub}>Carregando...</Text>
              ) : (
                <>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <Text style={[styles.metasValor, { color: colors.green }]}>
                      {hideValues ? '• • •' : fmtBRL(totalAtual)}
                    </Text>
                    <Text style={styles.metasSub}>
                      de {hideValues ? '• • •' : fmtBRL(totalMeta)}
                    </Text>
                  </View>
                  <View style={{ height: 4, backgroundColor: colors.border, borderRadius: 2, marginTop: 6 }}>
                    <View style={{ height: 4, borderRadius: 2, backgroundColor: colors.green, width: `${Math.min(pct * 100, 100)}%` as any }} />
                  </View>
                  <Text style={styles.metasSub}>
                    {ativas.length} ativa{ativas.length !== 1 ? 's' : ''}
                    {concluidas.length > 0 ? `  ·  🎉 ${concluidas.length} concluída${concluidas.length !== 1 ? 's' : ''}` : ''}
                  </Text>
                </>
              )}
            </View>
            <Text style={{ color: colors.textSecondary, fontSize: 20 }}>›</Text>
          </TouchableOpacity>
        );
      })()}

      <View style={{ height: 24 }} />
    </ScrollView>

    {/* ── Modal detalhes da categoria ── */}
    <Modal
      visible={!!catModal}
      transparent
      animationType="slide"
      onRequestClose={() => setCatModal(null)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          {catModal && (
            <>
              <View style={styles.modalHeader}>
                <View style={[styles.modalDot, { backgroundColor: catModal.color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>{catModal.nome}</Text>
                  <Text style={styles.modalSub}>
                    {catLancs.length} lançamento{catLancs.length !== 1 ? 's' : ''} · {fmtBRL(catModal.total)}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setCatModal(null)} style={{ padding: 4 }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 20 }}>✕</Text>
                </TouchableOpacity>
              </View>

              {catLoading ? (
                <View style={{ padding: 32, alignItems: 'center' }}>
                  <ActivityIndicator color={colors.green} />
                </View>
              ) : (
                <FlatList
                  data={catLancs}
                  keyExtractor={item => item.id}
                  style={{ maxHeight: 440 }}
                  ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.border }} />}
                  renderItem={({ item }) => (
                    <View style={styles.catItemRow}>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={styles.catItemDesc}>{item.descricao}</Text>
                        <Text style={styles.catItemMeta}>
                          {new Date(item.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                          {item.cartaoNome ? `  ·  💳 ${item.cartaoNome}` : ''}
                          {item.isRecorrente
                            ? '  ·  🔄 Recorrente'
                            : item.parcelaAtual
                              ? `  ·  ${item.parcelaAtual}/${item.totalParcelas}x`
                              : ''}
                        </Text>
                      </View>
                      <Text style={styles.catItemValor}>{fmtBRL(item.valor)}</Text>
                    </View>
                  )}
                />
              )}
            </>
          )}
        </View>
      </View>
    </Modal>
    </View>
  );
}

function makeStyles(c: ColorScheme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
    navBtn: { fontSize: 22, color: c.green, paddingHorizontal: 12 },
    mesTitle: { fontSize: 20, fontWeight: 'bold', color: c.text },
    summaryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 },
    summaryTitle: { fontSize: 13, color: c.textSecondary, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
    eyeBtn: { padding: 6 },
    eyeIcon: { fontSize: 20 },
    cards: { paddingHorizontal: 16, gap: 0, backgroundColor: c.surface, borderRadius: 14, marginHorizontal: 16, overflow: 'hidden' },
    card: { backgroundColor: c.surface, padding: 16, borderLeftWidth: 4, borderBottomWidth: 1, borderBottomColor: c.border },
    cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cardLabel: { fontSize: 14, color: c.textSecondary, fontWeight: '500' },
    cardValueRow: { flexDirection: 'row', alignItems: 'center' },
    cardValue: { fontSize: 22, fontWeight: 'bold' },
    section: { margin: 16, marginTop: 12, backgroundColor: c.surface, borderRadius: 12, padding: 18, overflow: 'hidden' },
    sectionTitle: { fontSize: 15, fontWeight: 'bold', marginBottom: 4, color: c.text },
    sectionSub: { fontSize: 11, color: c.textTertiary, marginBottom: 12 },
    chartsRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
    chartLeft: { flex: 1.6 },
    chartRight: { flex: 1, alignItems: 'center' },
    chartWrap: { alignItems: 'flex-start', marginTop: 8 },
    projectionWrap: { alignItems: 'flex-start', marginTop: 8, marginHorizontal: -18 },

    // Modal categoria
    modalOverlay:  { flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-end' },
    modalSheet:    { backgroundColor: c.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
                     paddingBottom: 32, maxHeight: '80%' },
    modalHeader:   { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16,
                     borderBottomWidth: 1, borderBottomColor: c.border },
    modalDot:      { width: 14, height: 14, borderRadius: 7 },
    modalTitle:    { fontSize: 16, fontWeight: 'bold', color: c.text },
    modalSub:      { fontSize: 12, color: c.textSecondary, marginTop: 2 },
    catItemRow:    { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
    catItemDesc:   { fontSize: 14, fontWeight: '600', color: c.text },
    catItemMeta:   { fontSize: 12, color: c.textSecondary },
    catItemValor:  { fontSize: 14, fontWeight: '700', color: c.red },
    legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    legendDot: { width: 10, height: 10, borderRadius: 5 },
    legendText: { fontSize: 11, color: c.textSecondary },

    projecaoCard: {
      flexDirection: 'row', alignItems: 'center',
      marginHorizontal: 16, marginTop: 12,
      backgroundColor: c.surface, borderRadius: 14,
      padding: 16, borderWidth: 1, borderColor: c.border,
      borderLeftWidth: 4, borderLeftColor: c.blue,
    },
    anualCard: {
      flexDirection: 'row', alignItems: 'center',
      marginHorizontal: 16, marginTop: 12,
      backgroundColor: c.surface, borderRadius: 14,
      padding: 16, borderWidth: 1, borderColor: c.border,
      borderLeftWidth: 4, borderLeftColor: c.green,
    },
    anualCardTitle: { fontSize: 14, fontWeight: '700', color: c.text },
    anualCardSub:   { fontSize: 12, color: c.textSecondary, marginTop: 2 },

    dividasCard: {
      flexDirection: 'row', alignItems: 'center',
      marginHorizontal: 16, marginTop: 12,
      backgroundColor: c.surface, borderRadius: 14,
      padding: 16, borderWidth: 1, borderColor: c.border,
      borderLeftWidth: 4, borderLeftColor: c.blue,
    },
    dividasTitle: { fontSize: 14, fontWeight: '700', color: c.text },
    dividasSub:   { fontSize: 15, fontWeight: '600', color: c.red, marginTop: 3 },

    metasCard: {
      flexDirection: 'row', alignItems: 'center',
      marginHorizontal: 16, marginTop: 12,
      backgroundColor: c.surface, borderRadius: 14,
      padding: 16, borderWidth: 1, borderColor: c.border,
      borderLeftWidth: 4, borderLeftColor: '#d29922',
    },
    metasTitle:  { fontSize: 14, fontWeight: '700', color: c.text },
    metasValor:  { fontSize: 15, fontWeight: '700' },
    metasSub:    { fontSize: 12, color: c.textSecondary, marginTop: 3 },

    orcamentoCard: {
      flexDirection: 'row', alignItems: 'center',
      marginHorizontal: 16, marginTop: 12,
      backgroundColor: c.surface, borderRadius: 14,
      padding: 16, borderWidth: 1, borderColor: c.border,
      borderLeftWidth: 4, borderLeftColor: c.green,
    },
    orcamentoTitle:  { fontSize: 14, fontWeight: '700', color: c.text },
    orcamentoValor:  { fontSize: 15, fontWeight: '700' },
    orcamentoSub:    { fontSize: 12, color: c.textSecondary },
    orcamentoAlerta: { fontSize: 12, fontWeight: '600', marginTop: 5 },

    pendenciasCard: {
      marginHorizontal: 16, marginTop: 12,
      backgroundColor: c.surface, borderRadius: 14,
      overflow: 'hidden',
      borderLeftWidth: 4, borderLeftColor: '#FF9800',
    },
    pendenciasTitle: {
      fontSize: 13, fontWeight: '700', color: c.textSecondary,
      letterSpacing: 0.4, textTransform: 'uppercase',
      paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6,
    },
    pendenciaRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 16, paddingVertical: 12,
      borderBottomWidth: 1, borderBottomColor: c.border,
    },
    pendenciaLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    pendenciaIcon: { fontSize: 16 },
    pendenciaLabel: { fontSize: 14, color: c.text, fontWeight: '500' },
    pendenciaValor: { fontSize: 15, fontWeight: '700' },
  });
}
