import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Modal, FlatList,
} from 'react-native';
import Svg, { Path, G, Circle } from 'react-native-svg';
import { useFocusEffect } from '@react-navigation/native';
import { lancamentosService, ParceladoVigenteItem, DicaFinanceiraDto } from '../services/api';
import { fmtBRL } from '../utils/currency';
import { useTheme } from '../theme/ThemeContext';
import type { ColorScheme } from '../theme/colors';

// ── Helpers de prazo ──────────────────────────────────────────────────────────
function endDate(item: ParceladoVigenteItem): Date {
  const d = new Date(item.primeiraData);
  d.setMonth(d.getMonth() + item.totalParcelas - 1);
  return d;
}
function parcelasRestantes(item: ParceladoVigenteItem): number {
  return item.totalParcelas - item.parcelaMin + 1;
}
function progressoPct(item: ParceladoVigenteItem): number {
  return ((item.parcelaMin - 1) / item.totalParcelas) * 100;
}
function fmtMesAno(date: Date): string {
  return date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
}
function monthsDiff(date: Date): number {
  const now = new Date();
  return (date.getFullYear() - now.getFullYear()) * 12 + (date.getMonth() - now.getMonth());
}

const SLICE_COLORS = [
  '#58a6ff', '#3fb950', '#f85149', '#d29922', '#bc8cff',
  '#39d353', '#f78166', '#79c0ff', '#ffa657', '#db61a2',
];

interface CatGroup {
  nome: string;
  total: number;
  itens: ParceladoVigenteItem[];
  color: string;
}

function buildGroups(itens: ParceladoVigenteItem[]): CatGroup[] {
  const map = new Map<string, ParceladoVigenteItem[]>();
  for (const item of itens) {
    const key = item.categoriaNome ?? 'Outros';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return Array.from(map.entries())
    .map(([nome, its], i) => ({
      nome,
      total: its.reduce((s, x) => s + x.saldoRestante, 0),
      itens: its,
      color: SLICE_COLORS[i % SLICE_COLORS.length],
    }))
    .sort((a, b) => b.total - a.total);
}

// ── Donut chart ──────────────────────────────────────────────────────────────
function DonutChart({
  groups, total, size, onSlice,
}: {
  groups: CatGroup[]; total: number; size: number; onSlice: (g: CatGroup) => void;
}) {
  const { colors } = useTheme();
  const R = size / 2;
  const innerR = R * 0.58;
  const cx = R, cy = R;
  const gap = 0.012; // gap in radians between slices

  let angle = -Math.PI / 2;

  function slicePath(startA: number, endA: number) {
    const sa = startA + gap / 2;
    const ea = endA - gap / 2;
    const x1 = cx + R * Math.cos(sa);  const y1 = cy + R * Math.sin(sa);
    const x2 = cx + R * Math.cos(ea);  const y2 = cy + R * Math.sin(ea);
    const x3 = cx + innerR * Math.cos(ea); const y3 = cy + innerR * Math.sin(ea);
    const x4 = cx + innerR * Math.cos(sa); const y4 = cy + innerR * Math.sin(sa);
    const large = (ea - sa) > Math.PI ? 1 : 0;
    return `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 ${large} 0 ${x4} ${y4} Z`;
  }

  return (
    <Svg width={size} height={size}>
      {/* Fundo anel */}
      <Circle cx={cx} cy={cy} r={R - 1}  fill="none" stroke={colors.surfaceElevated} strokeWidth={R - innerR + 2} />
      {groups.map((g, i) => {
        const sweep = (g.total / total) * 2 * Math.PI;
        const start = angle;
        angle += sweep;
        return (
          <G key={i}>
            <Path
              d={slicePath(start, angle)}
              fill={g.color}
              onPress={() => onSlice(g)}
            />
          </G>
        );
      })}
    </Svg>
  );
}

// ── Tela principal ────────────────────────────────────────────────────────────
export default function DividasScreen() {
  const { colors } = useTheme();
  const s = styles(colors);

  const [loading, setLoading]       = useState(true);
  const [groups, setGroups]         = useState<CatGroup[]>([]);
  const [totalDivida, setTotal]     = useState(0);
  const [allItens, setAllItens]     = useState<ParceladoVigenteItem[]>([]);
  const [selected, setSelected]     = useState<CatGroup | null>(null);
  const [analise, setAnalise]       = useState<DicaFinanceiraDto[] | null>(null);
  const [loadingAnalise, setLoadingAnalise] = useState(false);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    lancamentosService.getParceladosVigentes()
      .then(res => {
        setTotal(res.totalDivida);
        setGroups(buildGroups(res.itens));
        setAllItens(res.itens);
      })
      .finally(() => setLoading(false));
  }, []));

  const mensalidadeTotal = useMemo(
    () => allItens.reduce((s, x) => s + x.valorParcela, 0),
    [allItens],
  );
  const quitacaoFinal = useMemo(() => {
    if (!allItens.length) return null;
    return allItens.reduce<Date>((max, x) => {
      const d = endDate(x);
      return d > max ? d : max;
    }, endDate(allItens[0]));
  }, [allItens]);

  // Percentual geral de quitação (parcelas pagas / total de parcelas, ponderado por valor)
  const pctQuitacao = useMemo(() => {
    const totalPago  = allItens.reduce((s, x) => s + (x.parcelaMin - 1) * x.valorParcela, 0);
    const totalGeral = allItens.reduce((s, x) => s + x.totalParcelas   * x.valorParcela, 0);
    return totalGeral > 0 ? (totalPago / totalGeral) * 100 : 0;
  }, [allItens]);

  async function handleAnalise() {
    setLoadingAnalise(true);
    try {
      const result = await lancamentosService.getAnaliseDividas();
      setAnalise(result);
    } catch {
      setAnalise(null);
    } finally {
      setLoadingAnalise(false);
    }
  }

  // Itens ordenados por data de quitação (mais próximo primeiro)
  const timeline = useMemo(
    () => [...allItens].sort((a, b) => endDate(a).getTime() - endDate(b).getTime()),
    [allItens],
  );

  if (loading) return (
    <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator size="large" color={colors.blue} />
    </View>
  );

  if (groups.length === 0) return (
    <View style={[s.container, { justifyContent: 'center', alignItems: 'center', gap: 12 }]}>
      <Text style={{ fontSize: 48 }}>🎉</Text>
      <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold' }}>Sem dívidas vigentes!</Text>
      <Text style={{ color: colors.textSecondary, fontSize: 14 }}>Nenhuma parcela em aberto.</Text>
    </View>
  );

  const chartSize = 240;

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>

        {/* ── Cabeçalho ── */}
        <View style={s.headerCard}>
          <Text style={s.headerLabel}>Total em dívidas parceladas</Text>
          <Text style={s.headerTotal}>{fmtBRL(totalDivida)}</Text>
          <Text style={s.headerSub}>{groups.reduce((n, g) => n + g.itens.length, 0)} compras em aberto</Text>

          <TouchableOpacity
            style={[s.analiseBtn, loadingAnalise && { opacity: 0.6 }, { marginTop: 12 }]}
            onPress={handleAnalise}
            disabled={loadingAnalise}
          >
            {loadingAnalise
              ? <><ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} /><Text style={s.analiseBtnText}>Analisando...</Text></>
              : <Text style={s.analiseBtnText}>{analise ? '↺ Reanalisar com IA' : '🤖 Analisar com IA'}</Text>
            }
          </TouchableOpacity>
          <View style={s.headerStats}>
            <View style={s.headerStatItem}>
              <Text style={s.headerStatLabel}>💸 Mensalidade</Text>
              <Text style={s.headerStatValue}>{fmtBRL(mensalidadeTotal)}</Text>
            </View>
            <View style={s.headerStatDivider} />
            <View style={s.headerStatItem}>
              <Text style={s.headerStatLabel}>🏁 Quitação final</Text>
              <Text style={s.headerStatValue}>
                {quitacaoFinal ? fmtMesAno(quitacaoFinal) : '—'}
              </Text>
              {quitacaoFinal && (
                <Text style={s.headerStatSub}>
                  em {monthsDiff(quitacaoFinal)} {monthsDiff(quitacaoFinal) !== 1 ? 'meses' : 'mês'}
                </Text>
              )}
            </View>
          </View>

          {/* Barra de progresso geral */}
          <View style={s.quitacaoWrap}>
            <View style={s.quitacaoLabelRow}>
              <Text style={s.quitacaoLabel}>Progresso geral de quitação</Text>
              <Text style={s.quitacaoPct}>{pctQuitacao.toFixed(1)}%</Text>
            </View>
            <View style={s.progressTrack}>
              <View style={[s.progressFill, {
                width: `${pctQuitacao}%` as any,
                backgroundColor: pctQuitacao >= 75 ? colors.green : pctQuitacao >= 40 ? colors.orange : colors.blue,
              }]} />
            </View>
            <Text style={s.quitacaoSub}>
              {(100 - pctQuitacao).toFixed(1)}% restante · {fmtBRL(totalDivida)} a quitar
            </Text>
          </View>
        </View>

        {/* ── Donut ── */}
        <View style={s.chartCard}>
          <Text style={s.sectionTitle}>Por categoria</Text>
          <Text style={s.sectionSub}>Toque em uma fatia para ver o detalhe</Text>

          <View style={{ alignItems: 'center', marginVertical: 8 }}>
            {/* Donut + total no centro */}
            <View style={{ width: chartSize, height: chartSize }}>
              <DonutChart
                groups={groups}
                total={totalDivida}
                size={chartSize}
                onSlice={setSelected}
              />
              {/* Label central */}
              <View style={[StyleSheet.absoluteFillObject, { justifyContent: 'center', alignItems: 'center' }]}
                    pointerEvents="none">
                <Text style={s.donutLabel}>{fmtBRL(totalDivida)}</Text>
                <Text style={s.donutSub}>total</Text>
              </View>
            </View>
          </View>

          {/* Legenda */}
          <View style={s.legendaWrap}>
            {groups.map((g, i) => (
              <TouchableOpacity key={i} style={s.legendaRow} onPress={() => setSelected(g)}>
                <View style={[s.legendaDot, { backgroundColor: g.color }]} />
                <Text style={s.legendaNome} numberOfLines={1}>{g.nome}</Text>
                <Text style={s.legendaValor}>{fmtBRL(g.total)}</Text>
                <Text style={s.legendaPct}>
                  {((g.total / totalDivida) * 100).toFixed(0)}%
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Linha do tempo ── */}
        <View style={s.chartCard}>
          <Text style={s.sectionTitle}>📅 Linha do tempo</Text>
          <Text style={s.sectionSub}>Ordenado por quitação mais próxima</Text>
          <View style={{ gap: 14, marginTop: 10 }}>
            {timeline.map((item, i) => {
              const end     = endDate(item);
              const restant = parcelasRestantes(item);
              const pct     = progressoPct(item);
              const meses   = monthsDiff(end);
              const urgente = meses <= 3;
              const barColor = urgente ? colors.green : meses <= 12 ? colors.orange : colors.blue;
              return (
                <View key={i} style={s.timelineItem}>
                  <View style={s.timelineTop}>
                    <Text style={s.timelineDesc} numberOfLines={1}>{item.descricao}</Text>
                    <Text style={[s.timelineEnd, { color: barColor }]}>{fmtMesAno(end)}</Text>
                  </View>
                  <View style={s.timelineMeta}>
                    <Text style={s.timelineMetaText}>
                      {item.parcelaMin}/{item.totalParcelas}x · {restant} restante{restant !== 1 ? 's' : ''} · {fmtBRL(item.valorParcela)}/mês
                    </Text>
                    <Text style={[s.timelineMetaText, { color: barColor }]}>
                      {meses <= 0 ? 'Último mês!' : `em ${meses} ${meses !== 1 ? 'meses' : 'mês'}`}
                    </Text>
                  </View>
                  {/* Barra de progresso */}
                  <View style={s.progressTrack}>
                    <View style={[s.progressFill, { width: `${pct}%` as any, backgroundColor: barColor }]} />
                  </View>
                  <View style={s.timelineSaldoRow}>
                    <Text style={s.timelineSaldoLabel}>Saldo restante</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={[s.timelineMetaText, { color: barColor, fontWeight: '700' }]}>
                        {pct.toFixed(0)}% quitado
                      </Text>
                      <Text style={s.timelineSaldo}>{fmtBRL(item.saldoRestante)}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>


      </ScrollView>

      {/* ── Modal Análise IA ── */}
      <Modal visible={!!analise} transparent animationType="slide" onRequestClose={() => setAnalise(null)}>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={s.modalTitle}>🤖 Análise do Analista</Text>
                <Text style={s.modalSubtitle}>Insights personalizados sobre suas dívidas</Text>
              </View>
              <TouchableOpacity onPress={() => setAnalise(null)} style={s.modalClose}>
                <Text style={{ color: colors.textSecondary, fontSize: 20 }}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 480 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}>
              {analise?.map((d, i) => {
                const cor   = d.tipo === 'critico' ? colors.red : d.tipo === 'atencao' ? colors.orange : colors.green;
                const emoji = d.tipo === 'critico' ? '🚨' : d.tipo === 'atencao' ? '⚠️' : '✅';
                return (
                  <View key={i} style={[s.dicaItem, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
                    <View style={s.dicaTopo}>
                      <Text style={s.dicaEmoji}>{emoji}</Text>
                      <Text style={[s.dicaTitulo, { color: cor }]}>{d.titulo}</Text>
                    </View>
                    <Text style={s.dicaDesc}>{d.descricao}</Text>
                    {d.dicaEducativa && (
                      <View style={s.dicaEduBox}>
                        <Text style={s.dicaEduText}>💡 {d.dicaEducativa}</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Modal detalhe ── */}
      <Modal
        visible={!!selected}
        transparent
        animationType="slide"
        onRequestClose={() => setSelected(null)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            {selected && (
              <>
                <View style={s.modalHeader}>
                  <View style={[s.modalDot, { backgroundColor: selected.color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.modalTitle}>{selected.nome}</Text>
                    <Text style={s.modalSubtitle}>
                      {selected.itens.length} compra{selected.itens.length !== 1 ? 's' : ''} · {fmtBRL(selected.total)}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelected(null)} style={s.modalClose}>
                    <Text style={{ color: colors.textSecondary, fontSize: 20 }}>✕</Text>
                  </TouchableOpacity>
                </View>

                <FlatList
                  data={selected.itens}
                  keyExtractor={(_, i) => String(i)}
                  style={{ maxHeight: 420 }}
                  ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.border }} />}
                  renderItem={({ item }) => (
                    <View style={s.detalheItem}>
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text style={s.detalheDesc}>{item.descricao}</Text>
                        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                          {item.cartaoNome && (
                            <View style={s.chipCartao}>
                              <Text style={s.chipText}>💳 {item.cartaoNome}</Text>
                            </View>
                          )}
                          <View style={s.chipParcela}>
                            <Text style={s.chipText}>{item.parcelaMin}/{item.totalParcelas}x</Text>
                          </View>
                          <Text style={s.detalheData}>
                            🏁 quita {fmtMesAno(endDate(item))}
                          </Text>
                        </View>
                        {/* Mini barra de progresso */}
                        <View style={[s.progressTrack, { marginTop: 2 }]}>
                          <View style={[s.progressFill, {
                            width: `${progressoPct(item)}%` as any,
                            backgroundColor: colors.blue,
                          }]} />
                        </View>
                        <Text style={{ fontSize: 10, color: colors.textTertiary }}>
                          {parcelasRestantes(item)} parcela{parcelasRestantes(item) !== 1 ? 's' : ''} restante{parcelasRestantes(item) !== 1 ? 's' : ''}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 2 }}>
                        <Text style={s.detalheSaldo}>{fmtBRL(item.saldoRestante)}</Text>
                        <Text style={s.detalheParcela}>{fmtBRL(item.valorParcela)}/mês</Text>
                      </View>
                    </View>
                  )}
                />
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
function styles(c: ColorScheme) {
  return StyleSheet.create({
    container:    { flex: 1, backgroundColor: c.background },

    headerCard:   { backgroundColor: c.surface, borderRadius: 14, padding: 20, alignItems: 'center', gap: 4,
                    borderWidth: 1, borderColor: c.border },
    headerLabel:  { fontSize: 12, color: c.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
    headerTotal:  { fontSize: 32, fontWeight: 'bold', color: c.red },
    headerSub:    { fontSize: 13, color: c.textTertiary },
    headerStats:  { flexDirection: 'row', marginTop: 16, width: '100%',
                    backgroundColor: c.surfaceElevated, borderRadius: 10, overflow: 'hidden' },
    headerStatItem:    { flex: 1, alignItems: 'center', paddingVertical: 12, gap: 2 },
    headerStatDivider: { width: 1, backgroundColor: c.border },
    headerStatLabel:   { fontSize: 11, color: c.textSecondary },
    headerStatValue:   { fontSize: 15, fontWeight: 'bold', color: c.text },
    headerStatSub:     { fontSize: 10, color: c.textTertiary },
    quitacaoWrap:      { width: '100%', marginTop: 14, gap: 6 },
    quitacaoLabelRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    quitacaoLabel:     { fontSize: 12, color: c.textSecondary },
    quitacaoPct:       { fontSize: 14, fontWeight: 'bold', color: c.text },
    quitacaoSub:       { fontSize: 11, color: c.textTertiary, textAlign: 'right' },

    chartCard:    { backgroundColor: c.surface, borderRadius: 14, padding: 16, gap: 8,
                    borderWidth: 1, borderColor: c.border },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: c.text },
    sectionSub:   { fontSize: 12, color: c.textTertiary },

    donutLabel:   { fontSize: 18, fontWeight: 'bold', color: c.text },
    donutSub:     { fontSize: 11, color: c.textSecondary },

    legendaWrap:  { gap: 6, marginTop: 4 },
    legendaRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
    legendaDot:   { width: 10, height: 10, borderRadius: 5 },
    legendaNome:  { flex: 1, fontSize: 13, color: c.text },
    legendaValor: { fontSize: 13, fontWeight: '700', color: c.text },
    legendaPct:   { fontSize: 12, color: c.textTertiary, width: 36, textAlign: 'right' },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-end' },
    modalSheet:   { backgroundColor: c.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
                    paddingBottom: 32, maxHeight: '80%' },
    modalHeader:  { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16,
                    borderBottomWidth: 1, borderBottomColor: c.border },
    modalDot:     { width: 14, height: 14, borderRadius: 7 },
    modalTitle:   { fontSize: 16, fontWeight: 'bold', color: c.text },
    modalSubtitle:{ fontSize: 12, color: c.textSecondary, marginTop: 2 },
    modalClose:   { padding: 4 },

    detalheItem:  { flexDirection: 'row', alignItems: 'flex-start', padding: 14, gap: 12 },
    detalheDesc:  { fontSize: 14, fontWeight: '600', color: c.text },
    detalheData:  { fontSize: 11, color: c.textSecondary },
    detalheSaldo: { fontSize: 15, fontWeight: 'bold', color: c.red },
    detalheParcela: { fontSize: 11, color: c.textSecondary },

    chipCartao:   { backgroundColor: c.blueDim, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderColor: c.blueBorder },
    chipParcela:  { backgroundColor: c.surfaceElevated, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
    chipText:     { fontSize: 11, color: c.textSecondary, fontWeight: '600' },

    // Análise IA
    analiseHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    analiseBtn:        { backgroundColor: c.blue, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10,
                         flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    analiseBtnText:    { color: '#fff', fontSize: 14, fontWeight: '700' },
    analiseHint:       { fontSize: 13, color: c.textTertiary, marginTop: 12, lineHeight: 20 },
    analiseLoading:    { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 },
    analiseLoadingText:{ fontSize: 13, color: c.textSecondary },
    dicaItem:          { paddingVertical: 14, gap: 6 },
    dicaTopo:          { flexDirection: 'row', alignItems: 'center', gap: 8 },
    dicaEmoji:         { fontSize: 16 },
    dicaTitulo:        { fontSize: 14, fontWeight: '700', flex: 1 },
    dicaDesc:          { fontSize: 13, color: c.text, lineHeight: 19 },
    dicaEduBox:        { backgroundColor: c.surfaceElevated, borderRadius: 8, padding: 10, marginTop: 4 },
    dicaEduText:       { fontSize: 12, color: c.textSecondary, lineHeight: 17 },

    // Linha do tempo
    timelineItem: { gap: 5, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: c.border },
    timelineTop:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    timelineDesc: { flex: 1, fontSize: 13, fontWeight: '600', color: c.text, marginRight: 8 },
    timelineEnd:  { fontSize: 13, fontWeight: '700' },
    timelineMeta: { flexDirection: 'row', justifyContent: 'space-between' },
    timelineMetaText: { fontSize: 11, color: c.textSecondary },
    progressTrack: { height: 6, backgroundColor: c.surfaceElevated, borderRadius: 3, overflow: 'hidden' },
    progressFill:  { height: 6, borderRadius: 3 },
    timelineSaldoRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
    timelineSaldoLabel: { fontSize: 11, color: c.textTertiary },
    timelineSaldo: { fontSize: 12, fontWeight: '700', color: c.red },
  });
}
