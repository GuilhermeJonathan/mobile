import React, { useCallback, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, RefreshControl, TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { assessoriaService, ClienteAssessoriaDto, RecomendacaoDto } from '../services/api';
import { useTheme } from '../theme/ThemeContext';
import type { ColorScheme } from '../theme/colors';
import { statusRecColors } from '../utils/assessoriaUi';

interface RecComCliente extends RecomendacaoDto {
  nomeCliente: string;
}

const TIPO_LABEL: Record<number, string> = { 1: '📋 Ajuste', 2: '💡 Dica', 3: '🚨 Alerta' };

export default function AssessorRecomendacoesScreen() {
  const { colors, isDark } = useTheme();
  const s = makeStyles(colors, isDark);
  const stColors = statusRecColors(isDark);

  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [clientes, setClientes]     = useState<ClienteAssessoriaDto[]>([]);
  const [recs, setRecs]             = useState<RecComCliente[]>([]);
  const [buscaCliente, setBuscaCliente]   = useState('');                    // filtro por nome
  const [filtroStatus, setFiltroStatus]   = useState<number | null>(null);   // 1/2/3
  const [expandidas, setExpandidas]       = useState<Set<string>>(new Set());

  function toggleExpandida(id: string) {
    setExpandidas(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const load = useCallback(async () => {
    try {
      const lista = (await assessoriaService.clientes()).filter(c => c.ativo);
      setClientes(lista);

      const porCliente = await Promise.all(
        lista.map(c =>
          assessoriaService.recomendacoesDoCliente(c.clienteId)
            .then(rs => rs.map(r => ({ ...r, nomeCliente: c.nomeCliente ?? 'Cliente' })))
            .catch(() => [] as RecComCliente[])
        )
      );
      setRecs(porCliente.flat().sort((a, b) => b.criadoEm.localeCompare(a.criadoEm)));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) {
    return <View style={s.center}><ActivityIndicator color={colors.green} /></View>;
  }

  const filtradas = recs
    .filter(r => buscaCliente.trim().length === 0 ||
      r.nomeCliente.toLowerCase().includes(buscaCliente.trim().toLowerCase()))
    .filter(r => filtroStatus === null || r.status === filtroStatus);

  const pendentesCount = recs.filter(r => r.status === 1).length;
  const aceitasCount   = recs.filter(r => r.status === 2).length;
  const recusadasCount = recs.filter(r => r.status === 3).length;

  return (
    <ScrollView
      style={s.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
    >
      <Text style={s.headerTitle}>💬 Recomendações da carteira</Text>

      {/* Métricas */}
      <View style={s.metricsRow}>
        <View style={s.metricCard}>
          <Text style={s.metricValue}>{recs.length}</Text>
          <Text style={s.metricLabel}>Enviadas</Text>
        </View>
        <View style={s.metricCard}>
          <Text style={[s.metricValue, pendentesCount > 0 && { color: stColors.pendente }]}>{pendentesCount}</Text>
          <Text style={s.metricLabel}>Pendentes</Text>
        </View>
        <View style={s.metricCard}>
          <Text style={[s.metricValue, { color: stColors.aceita }]}>{aceitasCount}</Text>
          <Text style={s.metricLabel}>Aceitas</Text>
        </View>
        <View style={s.metricCard}>
          <Text style={[s.metricValue, recusadasCount > 0 && { color: stColors.recusada }]}>{recusadasCount}</Text>
          <Text style={s.metricLabel}>Recusadas</Text>
        </View>
      </View>

      {/* Filtro por cliente (busca) */}
      <TextInput
        style={s.buscaInput}
        value={buscaCliente}
        onChangeText={setBuscaCliente}
        placeholder="🔍 Filtrar por nome do cliente..."
        placeholderTextColor={colors.inputPlaceholder}
      />

      {/* Filtro por status */}
      <Text style={s.filtroLabel}>Status</Text>
      <View style={s.filtrosRow}>
        {([
          { v: null, l: 'Todos' },
          { v: 1, l: '⏳ Pendentes' },
          { v: 2, l: '✓ Aceitas' },
          { v: 3, l: '✗ Recusadas' },
        ] as const).map(f => (
          <TouchableOpacity
            key={String(f.v)}
            style={[s.filtroChip, filtroStatus === f.v && s.filtroChipActive]}
            onPress={() => setFiltroStatus(f.v)}
          >
            <Text style={[s.filtroChipText, filtroStatus === f.v && s.filtroChipTextActive]}>{f.l}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Lista */}
      {filtradas.length === 0 && (
        <Text style={s.empty}>Nenhuma recomendação neste filtro.</Text>
      )}
      {filtradas.map(rec => (
        <View key={rec.id} style={s.recCard}>
          <View style={s.recHeader}>
            <Text style={s.recCliente}>{rec.nomeCliente}</Text>
            <Text style={s.recTipo}>{TIPO_LABEL[rec.tipo] ?? ''}</Text>
            {rec.status === 1 && <Text style={s.stPendente}>⏳ Pendente</Text>}
            {rec.status === 2 && <Text style={s.stAceita}>✓ Aceita</Text>}
            {rec.status === 3 && <Text style={s.stRecusada}>✗ Recusada</Text>}
          </View>
          <Text style={s.recTexto} numberOfLines={expandidas.has(rec.id) ? undefined : 3}>
            {rec.texto}
          </Text>
          {rec.texto.length > 160 && (
            <TouchableOpacity onPress={() => toggleExpandida(rec.id)}>
              <Text style={s.verMais}>
                {expandidas.has(rec.id) ? '− ver menos' : '＋ ver recomendação inteira'}
              </Text>
            </TouchableOpacity>
          )}
          {rec.respostaCliente && (
            <Text style={s.recResposta}>Resposta do cliente: {rec.respostaCliente}</Text>
          )}
          <View style={s.recFooter}>
            <Text style={s.recData}>
              {new Date(rec.criadoEm).toLocaleDateString('pt-BR')}
              {rec.respondidoEm && ` · respondida em ${new Date(rec.respondidoEm).toLocaleDateString('pt-BR')}`}
            </Text>
            {rec.status === 1 && (
              <TouchableOpacity
                onPress={async () => {
                  await assessoriaService.excluirRecomendacao(rec.id).catch(() => {});
                  load();
                }}
              >
                <Text style={s.recExcluir}>Excluir</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const makeStyles = (colors: ColorScheme, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  headerTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 12 },
  metricsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  metricCard: {
    flex: 1, backgroundColor: colors.surface, borderRadius: 12,
    paddingVertical: 12, alignItems: 'center',
  },
  metricValue: { color: colors.text, fontSize: 20, fontWeight: '800' },
  metricLabel: { color: colors.textSecondary, fontSize: 11, marginTop: 2 },
  filtroLabel: {
    color: colors.textTertiary, fontSize: 11, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6,
  },
  filtrosScroll: { marginBottom: 12, flexGrow: 0 },
  buscaInput: {
    backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.inputBorder,
    borderRadius: 10, paddingVertical: 9, paddingHorizontal: 14,
    color: colors.text, fontSize: 14, marginBottom: 14,
  },
  filtrosRow: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  filtroChip: {
    borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 20,
    paddingVertical: 6, paddingHorizontal: 13, backgroundColor: colors.surface, marginRight: 8,
  },
  filtroChipActive: { borderColor: colors.green, backgroundColor: colors.green + '26' },
  filtroChipText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  filtroChipTextActive: { color: colors.green },
  empty: { color: colors.textTertiary, fontSize: 14 },
  recCard: { backgroundColor: colors.surface, borderRadius: 12, padding: 12, marginBottom: 8 },
  recHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' },
  recCliente: { color: colors.text, fontSize: 13, fontWeight: '700', flex: 1 },
  recTipo: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
  stPendente: { color: isDark ? '#a78bfa' : '#6d28d9', fontSize: 12, fontWeight: '700' },
  stAceita: { color: isDark ? '#4ade80' : '#15803d', fontSize: 12, fontWeight: '700' },
  stRecusada: { color: isDark ? '#f87171' : '#b91c1c', fontSize: 12, fontWeight: '700' },
  recTexto: { color: colors.text, fontSize: 13, lineHeight: 18 },
  verMais: { color: colors.green, fontSize: 12, fontWeight: '700', marginTop: 6 },
  recResposta: { color: colors.textSecondary, fontSize: 12, fontStyle: 'italic', marginTop: 6 },
  recFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  recData: { color: colors.textTertiary, fontSize: 11 },
  recExcluir: { color: '#f87171', fontSize: 12, fontWeight: '600' },
});
