import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { assinaturasService, AssinaturaDto } from '../services/api';
import { fmtBRL } from '../utils/currency';
import { useTheme } from '../theme/ThemeContext';
import type { ColorScheme } from '../theme/colors';

// ── Helpers ───────────────────────────────────────────────────────────────────

function diasParaVencimento(iso: string | null): number | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function fmtProximoVencimento(iso: string | null): { label: string; vencida: boolean } {
  if (!iso) return { label: 'Sem vencimento futuro', vencida: false };
  const dias = diasParaVencimento(iso)!;
  if (dias < 0)  return { label: 'Vencida',         vencida: true };
  if (dias === 0) return { label: 'Vence hoje',      vencida: false };
  if (dias === 1) return { label: 'Vence amanhã',    vencida: false };
  return { label: `Vence em ${dias} dias`,           vencida: false };
}

// ── Tela ──────────────────────────────────────────────────────────────────────

export default function AssinaturasScreen() {
  const { colors } = useTheme();
  const s = styles(colors);

  const [loading, setLoading]         = useState(true);
  const [assinaturas, setAssinaturas] = useState<AssinaturaDto[]>([]);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    assinaturasService.getAll()
      .then(setAssinaturas)
      .catch(() => setAssinaturas([]))
      .finally(() => setLoading(false));
  }, []));

  const totalMensal = useMemo(
    () => assinaturas.reduce((s, a) => s + a.valorMensal, 0),
    [assinaturas],
  );

  if (loading) return (
    <View style={s.container}>
      <View style={s.center}>
        <ActivityIndicator size="large" color={colors.blue} />
      </View>
    </View>
  );

  if (assinaturas.length === 0) return (
    <View style={s.container}>
      <View style={s.center}>
        <Text style={{ fontSize: 40 }}>📦</Text>
        <Text style={s.emptyTitle}>Nenhuma assinatura recorrente encontrada</Text>
        <Text style={s.emptySub}>Lançamentos recorrentes de despesa aparecerão aqui.</Text>
      </View>
    </View>
  );

  return (
    <View style={s.container}>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>

        {/* ── Resumo total ─────────────────────────────────────────────── */}
        <View style={s.summaryCard}>
          <Text style={s.summaryLabel}>Total mensal em assinaturas</Text>
          <Text style={s.summaryTotal}>{fmtBRL(totalMensal)}</Text>
          <Text style={s.summarySub}>{assinaturas.length} assinatura{assinaturas.length !== 1 ? 's' : ''} ativa{assinaturas.length !== 1 ? 's' : ''}</Text>
        </View>

        {/* ── Lista de assinaturas ─────────────────────────────────────── */}
        <View style={s.listCard}>
          {assinaturas.map((a, i) => {
            const pct         = a.totalLancamentos > 0 ? (a.lancamentosPagos / a.totalLancamentos) * 100 : 0;
            const vencimento  = fmtProximoVencimento(a.proximoVencimento);
            const diasRestam  = diasParaVencimento(a.proximoVencimento);
            const urgente     = diasRestam !== null && diasRestam <= 3;
            const vencColor   = vencimento.vencida
              ? colors.red
              : urgente
                ? colors.orange
                : colors.textSecondary;

            return (
              <View
                key={a.grupoId}
                style={[s.item, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}
              >
                {/* ── Linha superior ── */}
                <View style={s.itemTop}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={s.itemDesc} numberOfLines={1}>{a.descricao}</Text>
                    {a.categoriaNome && (
                      <View style={[
                        s.chipCategoria,
                        a.categoriaCor && { backgroundColor: a.categoriaCor + '22', borderColor: a.categoriaCor + '66' },
                      ]}>
                        {a.categoriaIcone ? <Text style={{ fontSize: 10, marginRight: 3 }}>{a.categoriaIcone}</Text> : null}
                        <Text style={[s.chipText, a.categoriaCor && { color: a.categoriaCor }]}>{a.categoriaNome}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={s.itemValor}>{fmtBRL(a.valorMensal)}<Text style={s.itemValorSub}>/mês</Text></Text>
                </View>

                {/* ── Próximo vencimento ── */}
                <Text style={[s.itemVencimento, { color: vencColor }]}>
                  {vencimento.vencida ? '⚠️ ' : '📅 '}{vencimento.label}
                </Text>

                {/* ── Barra de progresso ── */}
                <View style={s.progressRow}>
                  <View style={s.progressTrack}>
                    <View style={[s.progressFill, {
                      width: `${pct}%` as any,
                      backgroundColor: pct >= 75 ? colors.green : pct >= 40 ? colors.orange : colors.blue,
                    }]} />
                  </View>
                  <Text style={s.progressLabel}>
                    {a.lancamentosPagos}/{a.totalLancamentos}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

function styles(c: ColorScheme) {
  return StyleSheet.create({
    container:  { flex: 1, backgroundColor: c.background },
    center:     { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 24 },

    // ── Empty state ──
    emptyTitle: { fontSize: 17, fontWeight: '700', color: c.text, textAlign: 'center', marginTop: 8 },
    emptySub:   { fontSize: 13, color: c.textSecondary, textAlign: 'center', lineHeight: 18, marginTop: 4 },

    // ── Summary card ──
    summaryCard:  {
      backgroundColor: c.surface, borderRadius: 14, padding: 20,
      alignItems: 'center', gap: 4,
      borderWidth: 1, borderColor: c.border,
    },
    summaryLabel: { fontSize: 12, color: c.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
    summaryTotal: { fontSize: 32, fontWeight: 'bold', color: c.blue },
    summarySub:   { fontSize: 13, color: c.textTertiary },

    // ── List card ──
    listCard: {
      backgroundColor: c.surface, borderRadius: 14,
      borderWidth: 1, borderColor: c.border, overflow: 'hidden',
    },

    // ── Item ──
    item:         { padding: 16, gap: 8 },
    itemTop:      { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    itemDesc:     { fontSize: 14, fontWeight: '600', color: c.text },
    itemValor:    { fontSize: 16, fontWeight: 'bold', color: c.red },
    itemValorSub: { fontSize: 11, color: c.textSecondary, fontWeight: '400' },
    itemVencimento: { fontSize: 12 },

    chipCategoria: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: c.surfaceElevated, borderRadius: 6,
      paddingHorizontal: 7, paddingVertical: 2,
      alignSelf: 'flex-start', borderWidth: 1, borderColor: c.border,
    },
    chipText: { fontSize: 11, color: c.textSecondary, fontWeight: '600' },

    // ── Progress ──
    progressRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
    progressTrack: { flex: 1, height: 6, backgroundColor: c.surfaceElevated, borderRadius: 3, overflow: 'hidden' },
    progressFill:  { height: 6, borderRadius: 3 },
    progressLabel: { fontSize: 11, color: c.textTertiary, minWidth: 30, textAlign: 'right' },
  });
}
