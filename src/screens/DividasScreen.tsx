import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Modal, FlatList,
} from 'react-native';
import Svg, { Path, G, Circle } from 'react-native-svg';
import { useFocusEffect } from '@react-navigation/native';
import { lancamentosService, ParceladoVigenteItem } from '../services/api';
import { fmtBRL } from '../utils/currency';
import { useTheme } from '../theme/ThemeContext';
import type { ColorScheme } from '../theme/colors';

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

  const [loading, setLoading]     = useState(true);
  const [groups, setGroups]       = useState<CatGroup[]>([]);
  const [totalDivida, setTotal]   = useState(0);
  const [selected, setSelected]   = useState<CatGroup | null>(null);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    lancamentosService.getParceladosVigentes()
      .then(res => {
        setTotal(res.totalDivida);
        setGroups(buildGroups(res.itens));
      })
      .finally(() => setLoading(false));
  }, []));

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

      </ScrollView>

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
                      <View style={{ flex: 1, gap: 3 }}>
                        <Text style={s.detalheDesc}>{item.descricao}</Text>
                        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                          {item.cartaoNome && (
                            <View style={s.chipCartao}>
                              <Text style={s.chipText}>💳 {item.cartaoNome}</Text>
                            </View>
                          )}
                          <View style={s.chipParcela}>
                            <Text style={s.chipText}>
                              {item.parcelaMin}/{item.totalParcelas}x
                            </Text>
                          </View>
                          <Text style={s.detalheData}>
                            📅 {new Date(item.primeiraData).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </Text>
                        </View>
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
  });
}
