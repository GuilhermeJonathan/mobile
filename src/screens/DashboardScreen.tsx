import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  RefreshControl, TouchableOpacity, ActivityIndicator, Dimensions,
} from 'react-native';
import Svg, { Rect, Text as SvgText, Line, Circle, Path, G } from 'react-native-svg';
import { lancamentosService } from '../services/api';
import { Dashboard } from '../types';
import { fmtBRL, fmtBRLCompact } from '../utils/currency';
import { useTheme } from '../theme/ThemeContext';
import type { ColorScheme } from '../theme/colors';

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

const CATEGORY_COLORS = [
  '#4CAF50','#2196F3','#FF9800','#9C27B0','#00BCD4',
  '#F44336','#795548','#607D8B','#E91E63','#CDDC39',
];

// ─── Gráfico de barras horizontal para categorias ────────────────────────────
function CategoryBarChart({ data, width }: { data: { categoria: string; total: number }[]; width: number }) {
  const { colors } = useTheme();
  const barH = 26;
  const gap = 8;
  const labelW = 90;
  const chartW = width - labelW - 56;
  const maxVal = Math.max(...data.map(d => d.total), 1);
  const totalHeight = data.length * (barH + gap) + 10;

  return (
    <Svg width={width} height={totalHeight}>
      {data.map((item, i) => {
        const barWidth = Math.max((item.total / maxVal) * chartW, 4);
        const y = i * (barH + gap);
        const color = CATEGORY_COLORS[i % CATEGORY_COLORS.length];
        return (
          <G key={item.categoria}>
            <SvgText x={0} y={y + barH / 2 + 5} fontSize={11} fill={colors.textSecondary}>
              {item.categoria.length > 11 ? item.categoria.slice(0, 10) + '…' : item.categoria}
            </SvgText>
            <Rect x={labelW} y={y + 2} width={chartW} height={barH - 4} rx={5} fill={colors.barBg} />
            <Rect x={labelW} y={y + 2} width={barWidth} height={barH - 4} rx={5} fill={color} />
            <SvgText x={labelW + barWidth + 5} y={y + barH / 2 + 5} fontSize={10} fill={colors.textTertiary} fontWeight="bold">
              {item.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </SvgText>
          </G>
        );
      })}
    </Svg>
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

  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [projection, setProjection] = useState<{ label: string; receitas: number; despesas: number; isFuture: boolean }[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await lancamentosService.getDashboard(mes, ano);
      setDashboard(data);

      // Busca 2 meses anteriores + atual + 9 meses futuros = 12 meses no total
      const months: { label: string; receitas: number; despesas: number; isFuture: boolean }[] = [];
      const nowDate = new Date();
      const currentMes = nowDate.getMonth() + 1;
      const currentAno = nowDate.getFullYear();

      for (let offset = -2; offset <= 9; offset++) {
        const d = new Date(ano, mes - 1 + offset, 1);
        const m = d.getMonth() + 1;
        const a = d.getFullYear();
        const isFuture = a > currentAno || (a === currentAno && m > currentMes);
        try {
          const dd: Dashboard = await lancamentosService.getDashboard(m, a);
          months.push({ label: MESES[m - 1], receitas: dd.totalCreditos, despesas: dd.totalDebitos, isFuture });
        } catch {
          months.push({ label: MESES[m - 1], receitas: 0, despesas: 0, isFuture });
        }
      }
      setProjection(months);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [mes, ano]);

  useEffect(() => { load(); }, [load]);

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
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
    >
      {/* Navegação de mês */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navMes(-1)}><Text style={styles.navBtn}>◀</Text></TouchableOpacity>
        <Text style={styles.mesTitle}>{MESES[mes - 1]}/{ano}</Text>
        <TouchableOpacity onPress={() => navMes(1)}><Text style={styles.navBtn}>▶</Text></TouchableOpacity>
      </View>

      {/* Cards de resumo */}
      <View style={styles.cards}>
        <View style={[styles.card, { borderLeftColor: '#4CAF50' }]}>
          <Text style={styles.cardLabel}>Receitas</Text>
          <Text style={[styles.cardValue, { color: '#4CAF50' }]}>{fmtBRL(dashboard?.totalCreditos ?? 0)}</Text>
        </View>
        <View style={[styles.card, { borderLeftColor: '#e53935' }]}>
          <Text style={styles.cardLabel}>Despesas</Text>
          <Text style={[styles.cardValue, { color: '#e53935' }]}>{fmtBRL(dashboard?.totalDebitos ?? 0)}</Text>
        </View>
        <View style={[styles.card, { borderLeftColor: saldoColor }]}>
          <Text style={styles.cardLabel}>Saldo</Text>
          <Text style={[styles.cardValue, { color: saldoColor }]}>{fmtBRL(dashboard?.saldo ?? 0)}</Text>
        </View>
      </View>

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
                    <CategoryBarChart data={resumo} width={barW} />
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
                  <CategoryBarChart data={resumo} width={barW} />
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

      {/* Gráfico de projeção */}
      {projection.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Projeção — 12 meses</Text>
          <Text style={styles.sectionSub}>Histórico + meses futuros com lançamentos já cadastrados</Text>
          <View style={styles.projectionWrap}>
            <ProjectionChart data={projection} />
          </View>
        </View>
      )}

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

function makeStyles(c: ColorScheme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
    navBtn: { fontSize: 22, color: c.green, paddingHorizontal: 12 },
    mesTitle: { fontSize: 20, fontWeight: 'bold', color: c.text },
    cards: { paddingHorizontal: 16, gap: 10, flexDirection: 'row' },
    card: { flex: 1, backgroundColor: c.surface, borderRadius: 10, padding: 10, borderLeftWidth: 4 },
    cardLabel: { fontSize: 11, color: c.textSecondary, marginBottom: 4 },
    cardValue: { fontSize: 15, fontWeight: 'bold' },
    section: { margin: 16, marginTop: 12, backgroundColor: c.surface, borderRadius: 12, padding: 18, overflow: 'hidden' },
    sectionTitle: { fontSize: 15, fontWeight: 'bold', marginBottom: 4, color: c.text },
    sectionSub: { fontSize: 11, color: c.textTertiary, marginBottom: 12 },
    chartsRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
    chartLeft: { flex: 1.6 },
    chartRight: { flex: 1, alignItems: 'center' },
    chartWrap: { alignItems: 'flex-start', marginTop: 8 },
    projectionWrap: { alignItems: 'flex-start', marginTop: 8, marginHorizontal: -18 },
    legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    legendDot: { width: 10, height: 10, borderRadius: 5 },
    legendText: { fontSize: 11, color: c.textSecondary },
  });
}
