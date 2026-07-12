import React, { useCallback, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, RefreshControl, Modal, TextInput, Alert, Image,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { assessoriaService, ClienteAssessoriaDto, SaudeFinanceiraDto, RecomendacaoDto } from '../services/api';
import { useAssessoria } from '../contexts/AssessoriaContext';
import { useTheme } from '../theme/ThemeContext';
import type { ColorScheme } from '../theme/colors';
import { scoreColor as scoreColorFn, statusRecColors, iniciais } from '../utils/assessoriaUi';

type ScoreMap = Record<string, SaudeFinanceiraDto | 'loading' | 'error'>;
type RecCount = { total: number; pendentes: number };

const TIPO_LABEL: Record<number, string> = { 1: '📋 Ajuste', 2: '💡 Dica', 3: '🚨 Alerta' };

export default function AssessorClientesScreen() {
  const { colors, isDark } = useTheme();
  const s = makeStyles(colors, isDark);
  const navigation = useNavigation<any>();
  const { entrar } = useAssessoria();
  const scoreColor = (score: number) => scoreColorFn(score, isDark);
  const stColors = statusRecColors(isDark);

  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [clientes, setClientes]     = useState<ClienteAssessoriaDto[]>([]);
  const [scores, setScores]         = useState<ScoreMap>({});
  const [recCounts, setRecCounts]   = useState<Record<string, RecCount>>({});
  const [filtro, setFiltro] = useState<'todos' | 'atencao' | 'saudaveis'>('todos');
  const [busca, setBusca]   = useState('');

  // Modal de nova recomendação
  const [recCliente, setRecCliente]   = useState<ClienteAssessoriaDto | null>(null);
  const [recTipo, setRecTipo]         = useState(2); // 1=Ajuste, 2=Dica, 3=Alerta
  const [recTexto, setRecTexto]       = useState('');
  const [recEnviando, setRecEnviando] = useState(false);
  const [recGerandoIa, setRecGerandoIa] = useState(false);

  // Modal de histórico de recomendações
  const [histCliente, setHistCliente] = useState<ClienteAssessoriaDto | null>(null);
  const [histLista, setHistLista]     = useState<RecomendacaoDto[] | null>(null);
  const [histExpandidas, setHistExpandidas] = useState<Set<string>>(new Set());

  function toggleHistExpandida(id: string) {
    setHistExpandidas(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const load = useCallback(async () => {
    try {
      const lista = await assessoriaService.clientes();
      setClientes(lista);

      const hoje = new Date();
      const ativos = lista.filter(c => c.ativo);
      setScores(prev => {
        const next = { ...prev };
        ativos.forEach(c => { if (!next[c.clienteId]) next[c.clienteId] = 'loading'; });
        return next;
      });
      ativos.forEach(c => {
        assessoriaService.saudeCliente(c.clienteId, hoje.getMonth() + 1, hoje.getFullYear())
          .then(saude => setScores(prev => ({ ...prev, [c.clienteId]: saude })))
          .catch(() => setScores(prev => ({ ...prev, [c.clienteId]: 'error' })));
        assessoriaService.recomendacoesDoCliente(c.clienteId)
          .then(recs => setRecCounts(prev => ({
            ...prev,
            [c.clienteId]: { total: recs.length, pendentes: recs.filter(r => r.status === 1).length },
          })))
          .catch(() => {});
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function verPainel(cliente: ClienteAssessoriaDto) {
    entrar({ clienteId: cliente.clienteId, nome: cliente.nomeCliente ?? 'Cliente' });
    navigation.navigate('Main' as never, { screen: 'Dashboard' } as never);
  }

  function abrirRecomendacao(cliente: ClienteAssessoriaDto) {
    setRecCliente(cliente);
    setRecTipo(2);
    setRecTexto('');
  }

  async function abrirHistorico(cliente: ClienteAssessoriaDto) {
    setHistCliente(cliente);
    setHistLista(null);
    setHistLista(await assessoriaService.recomendacoesDoCliente(cliente.clienteId).catch(() => []));
  }

  async function gerarRascunhoIa() {
    if (!recCliente) return;
    setRecGerandoIa(true);
    try {
      const hoje = new Date();
      const { rascunho } = await assessoriaService.analiseIa(
        recCliente.clienteId, hoje.getMonth() + 1, hoje.getFullYear());
      setRecTexto(rascunho);
    } catch {
      Alert.alert('Erro', 'Não foi possível gerar o rascunho. Tente novamente.');
    } finally {
      setRecGerandoIa(false);
    }
  }

  async function enviarRecomendacao() {
    if (!recCliente || recTexto.trim().length === 0) return;
    setRecEnviando(true);
    try {
      await assessoriaService.criarRecomendacao(recCliente.clienteId, recTipo, recTexto.trim());
      setRecCliente(null);
      Alert.alert('✅ Enviada!', 'O cliente foi notificado por e-mail e verá a recomendação em "Meu Assessor".');
      await load();
    } catch (e: any) {
      Alert.alert('Erro', e?.response?.data?.message ?? 'Não foi possível enviar.');
    } finally {
      setRecEnviando(false);
    }
  }

  if (loading) {
    return <View style={s.center}><ActivityIndicator color={colors.green} /></View>;
  }

  const ativos    = clientes.filter(c => c.ativo);
  const pendentes = clientes.filter(c => !c.aceito);

  const scoresCarregados = ativos
    .map(c => scores[c.clienteId])
    .filter((x): x is SaudeFinanceiraDto => !!x && x !== 'loading' && x !== 'error');
  const scoreMedio = scoresCarregados.length > 0
    ? Math.round(scoresCarregados.reduce((sum, x) => sum + x.scoreGeral, 0) / scoresCarregados.length)
    : null;
  const emAtencao = scoresCarregados.filter(x => x.scoreGeral < 60).length;
  const recsPendentesTotal = Object.values(recCounts).reduce((sum, r) => sum + r.pendentes, 0);

  const scoreDe = (c: ClienteAssessoriaDto): number | null => {
    const x = scores[c.clienteId];
    return x && x !== 'loading' && x !== 'error' ? x.scoreGeral : null;
  };
  const clientesFiltrados = ativos
    .filter(c => {
      const sc = scoreDe(c);
      if (filtro === 'atencao')   return sc !== null && sc < 60;
      if (filtro === 'saudaveis') return sc !== null && sc >= 60;
      return true;
    })
    .filter(c => busca.trim().length === 0 ||
      (c.nomeCliente ?? '').toLowerCase().includes(busca.trim().toLowerCase()))
    .sort((a, b) => (scoreDe(a) ?? 101) - (scoreDe(b) ?? 101));

  return (
    <ScrollView
      style={s.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
    >
      {/* ── Dashboard da carteira ── */}
      <View style={s.headerRow}>
        <Text style={s.headerTitle}>📊 Visão da carteira</Text>
        <TouchableOpacity
          style={s.convidarBtn}
          onPress={() => navigation.navigate('Main' as never, { screen: 'AssessorConvite' } as never)}
        >
          <Text style={s.convidarText}>➕ Convidar{pendentes.length > 0 ? ` (${pendentes.length})` : ''}</Text>
        </TouchableOpacity>
      </View>
      <View style={s.metricsRow}>
        <View style={s.metricCard}>
          <Text style={s.metricValue}>{ativos.length}</Text>
          <Text style={s.metricLabel}>Clientes</Text>
        </View>
        <View style={s.metricCard}>
          <Text style={[s.metricValue, scoreMedio !== null && { color: scoreColor(scoreMedio) }]}>
            {scoreMedio ?? '—'}
          </Text>
          <Text style={s.metricLabel}>Score médio</Text>
        </View>
        <View style={s.metricCard}>
          <Text style={[s.metricValue, emAtencao > 0 && { color: isDark ? '#fbbf24' : '#b45309' }]}>{emAtencao}</Text>
          <Text style={s.metricLabel}>Em atenção</Text>
        </View>
        <View style={s.metricCard}>
          <Text style={[s.metricValue, recsPendentesTotal > 0 && { color: stColors.pendente }]}>{recsPendentesTotal}</Text>
          <Text style={s.metricLabel}>Recs. pendentes</Text>
        </View>
      </View>

      {/* ── Busca por nome ── */}
      <TextInput
        style={s.buscaInput}
        value={busca}
        onChangeText={setBusca}
        placeholder="🔍 Buscar cliente por nome..."
        placeholderTextColor={colors.inputPlaceholder}
      />

      {/* ── Filtros ── */}
      <View style={s.filtrosRow}>
        {([
          { v: 'todos',     l: `Todos (${ativos.length})` },
          { v: 'atencao',   l: `⚠️ Em atenção (${emAtencao})` },
          { v: 'saudaveis', l: `✅ Saudáveis (${scoresCarregados.filter(x => x.scoreGeral >= 60).length})` },
        ] as const).map(f => (
          <TouchableOpacity
            key={f.v}
            style={[s.filtroChip, filtro === f.v && s.filtroChipActive]}
            onPress={() => setFiltro(f.v)}
          >
            <Text style={[s.filtroChipText, filtro === f.v && s.filtroChipTextActive]}>{f.l}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Clientes ── */}
      {clientesFiltrados.length === 0 && (
        <Text style={s.empty}>
          {ativos.length === 0
            ? 'Nenhum cliente vinculado ainda. Toque em "➕ Convidar" para começar.'
            : 'Nenhum cliente neste filtro.'}
        </Text>
      )}
      {clientesFiltrados.map(c => {
        const saude = scores[c.clienteId];
        const recs = recCounts[c.clienteId];
        return (
          <View key={c.vinculoId} style={s.clienteCard}>
            <View style={s.clienteRow}>
              {c.avatarUrl
                ? <Image source={{ uri: c.avatarUrl }} style={s.avatar} />
                : (
                  <View style={s.avatarFallback}>
                    <Text style={s.avatarIniciais}>{iniciais(c.nomeCliente)}</Text>
                  </View>
                )}
              <View style={{ flex: 1 }}>
                <Text style={s.clienteNome}>{c.nomeCliente ?? 'Cliente'}</Text>
                <Text style={s.clienteDesde}>
                  Desde {new Date(c.aceitoEm!).toLocaleDateString('pt-BR')}
                  {recs && recs.total > 0 &&
                    `  ·  📋 ${recs.total} rec.${recs.pendentes > 0 ? ` (${recs.pendentes} pendente${recs.pendentes > 1 ? 's' : ''})` : ''}`}
                </Text>
              </View>
              {saude === 'loading' && <ActivityIndicator size="small" color={colors.textSecondary} />}
              {saude === 'error' && <Text style={s.scoreErro}>—</Text>}
              {saude && saude !== 'loading' && saude !== 'error' && (
                <View style={[s.scoreBadge, { borderColor: scoreColor(saude.scoreGeral) }]}>
                  <Text style={[s.scoreNum, { color: scoreColor(saude.scoreGeral) }]}>{saude.scoreGeral}</Text>
                  <Text style={[s.scoreLabel, { color: scoreColor(saude.scoreGeral) }]}>{saude.classificacao}</Text>
                </View>
              )}
            </View>
            <View style={s.clienteActions}>
              <TouchableOpacity style={[s.btnPrimary, { flex: 1.1 }]} onPress={() => verPainel(c)}>
                <Text style={s.btnPrimaryText}>👁 Painel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.btnSecondary, { flex: 1.3 }]} onPress={() => abrirRecomendacao(c)}>
                <Text style={s.btnSecondaryText}>💬 Recomendar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.btnSecondary, { flex: 1 }]} onPress={() => abrirHistorico(c)}>
                <Text style={s.btnSecondaryText}>
                  📋 Histórico{recs?.pendentes ? ` (${recs.pendentes})` : ''}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}

      {/* ── Modal: nova recomendação ── */}
      <Modal visible={!!recCliente} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>💬 Recomendação para {recCliente?.nomeCliente ?? 'Cliente'}</Text>

            <View style={s.tipoChips}>
              {[{ v: 2, l: '💡 Dica' }, { v: 1, l: '📋 Ajuste' }, { v: 3, l: '🚨 Alerta' }].map(t => (
                <TouchableOpacity
                  key={t.v}
                  style={[s.tipoChip, recTipo === t.v && s.tipoChipActive]}
                  onPress={() => setRecTipo(t.v)}
                >
                  <Text style={[s.tipoChipText, recTipo === t.v && s.tipoChipTextActive]}>{t.l}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={s.recInput}
              value={recTexto}
              onChangeText={setRecTexto}
              placeholder="Escreva a recomendação ou gere um rascunho com IA..."
              placeholderTextColor={colors.inputPlaceholder}
              multiline
              numberOfLines={6}
              maxLength={2000}
            />

            <TouchableOpacity style={s.iaBtn} disabled={recGerandoIa} onPress={gerarRascunhoIa}>
              {recGerandoIa
                ? <ActivityIndicator size="small" color={colors.green} />
                : <Text style={s.iaBtnText}>✨ Gerar rascunho com IA</Text>}
            </TouchableOpacity>

            <View style={s.modalActions}>
              <TouchableOpacity style={s.modalCancel} onPress={() => setRecCliente(null)}>
                <Text style={s.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalEnviar, (recTexto.trim().length === 0 || recEnviando) && { opacity: 0.5 }]}
                disabled={recTexto.trim().length === 0 || recEnviando}
                onPress={enviarRecomendacao}
              >
                {recEnviando
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={s.modalEnviarText}>Enviar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Modal: histórico de recomendações ── */}
      <Modal visible={!!histCliente} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={[s.modalCard, { maxHeight: '80%' }]}>
            <Text style={s.modalTitle}>📋 Recomendações — {histCliente?.nomeCliente ?? 'Cliente'}</Text>

            {histLista === null && <ActivityIndicator color={colors.green} style={{ marginVertical: 24 }} />}
            {histLista !== null && histLista.length === 0 && (
              <Text style={s.empty}>Nenhuma recomendação enviada ainda.</Text>
            )}
            <ScrollView style={{ maxHeight: 420 }}>
              {histLista?.map(rec => (
                <View key={rec.id} style={s.histCard}>
                  <View style={s.histHeader}>
                    <Text style={s.histTipo}>{TIPO_LABEL[rec.tipo] ?? 'Recomendação'}</Text>
                    {rec.status === 1 && <Text style={s.histPendente}>⏳ Pendente</Text>}
                    {rec.status === 2 && <Text style={s.histAceita}>✓ Aceita</Text>}
                    {rec.status === 3 && <Text style={s.histRecusada}>✗ Recusada</Text>}
                  </View>
                  <Text style={s.histTexto} numberOfLines={histExpandidas.has(rec.id) ? undefined : 4}>
                    {rec.texto}
                  </Text>
                  {rec.texto.length > 200 && (
                    <TouchableOpacity onPress={() => toggleHistExpandida(rec.id)}>
                      <Text style={s.verMais}>
                        {histExpandidas.has(rec.id) ? '− ver menos' : '＋ ver recomendação inteira'}
                      </Text>
                    </TouchableOpacity>
                  )}
                  {rec.respostaCliente && (
                    <Text style={s.histResposta}>Resposta: {rec.respostaCliente}</Text>
                  )}
                  <View style={s.histFooter}>
                    <Text style={s.histData}>{new Date(rec.criadoEm).toLocaleDateString('pt-BR')}</Text>
                    {rec.status === 1 && (
                      <TouchableOpacity
                        onPress={async () => {
                          await assessoriaService.excluirRecomendacao(rec.id).catch(() => {});
                          setHistLista(prev => prev?.filter(r => r.id !== rec.id) ?? null);
                          load();
                        }}
                      >
                        <Text style={s.histExcluir}>Excluir</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
            </ScrollView>

            <View style={s.modalActions}>
              <TouchableOpacity style={s.modalCancel} onPress={() => setHistCliente(null)}>
                <Text style={s.modalCancelText}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const makeStyles = (colors: ColorScheme, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
  },
  headerTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  convidarBtn: {
    backgroundColor: colors.green, borderRadius: 10,
    paddingVertical: 8, paddingHorizontal: 16,
  },
  convidarText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  metricsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  metricCard: {
    flex: 1, backgroundColor: colors.surface, borderRadius: 12,
    paddingVertical: 12, alignItems: 'center',
  },
  metricValue: { color: colors.text, fontSize: 20, fontWeight: '800' },
  metricLabel: { color: colors.textSecondary, fontSize: 11, marginTop: 2 },
  filtrosRow: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  filtroChip: {
    borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 20,
    paddingVertical: 6, paddingHorizontal: 13, backgroundColor: colors.surface,
  },
  filtroChipActive: { borderColor: colors.green, backgroundColor: colors.green + '26' },
  filtroChipText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  filtroChipTextActive: { color: colors.green },
  empty: { color: colors.textTertiary, fontSize: 14, marginBottom: 14 },
  buscaInput: {
    backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.inputBorder,
    borderRadius: 10, paddingVertical: 9, paddingHorizontal: 14,
    color: colors.text, fontSize: 14, marginBottom: 12,
  },
  avatar: { width: 38, height: 38, borderRadius: 19, marginRight: 10 },
  avatarFallback: {
    width: 38, height: 38, borderRadius: 19, marginRight: 10,
    backgroundColor: colors.green + '33', justifyContent: 'center', alignItems: 'center',
  },
  avatarIniciais: { color: colors.green, fontWeight: '800', fontSize: 14 },

  // ── Card do cliente (compacto) ──
  clienteCard: { backgroundColor: colors.surface, borderRadius: 12, padding: 12, marginBottom: 8 },
  clienteRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  clienteNome: { color: colors.text, fontSize: 15, fontWeight: '700' },
  clienteDesde: { color: colors.textSecondary, fontSize: 11, marginTop: 2 },
  scoreBadge: {
    borderWidth: 2, borderRadius: 10, paddingVertical: 3, paddingHorizontal: 10,
    alignItems: 'center', minWidth: 58,
  },
  scoreNum: { fontSize: 16, fontWeight: '800' },
  scoreLabel: { fontSize: 9, fontWeight: '700' },
  scoreErro: { color: colors.textTertiary, fontSize: 16 },
  clienteActions: { flexDirection: 'row', gap: 8 },
  btnPrimary: {
    backgroundColor: colors.green, borderRadius: 8,
    paddingVertical: 9, alignItems: 'center',
  },
  btnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  btnSecondary: {
    backgroundColor: colors.green + '1A', borderWidth: 1, borderColor: colors.green,
    borderRadius: 8, paddingVertical: 9, alignItems: 'center',
  },
  btnSecondaryText: { color: colors.green, fontWeight: '700', fontSize: 13 },

  // ── Modais ──
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 20,
  },
  modalCard: { backgroundColor: colors.surface, borderRadius: 14, padding: 20, width: '100%', maxWidth: 460 },
  modalTitle: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 14 },
  tipoChips: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tipoChip: {
    borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 20,
    paddingVertical: 7, paddingHorizontal: 14,
  },
  tipoChipActive: { borderColor: colors.green, backgroundColor: colors.green + '22' },
  tipoChipText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  tipoChipTextActive: { color: colors.green },
  recInput: {
    backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.inputBorder,
    borderRadius: 10, padding: 12, color: colors.text, fontSize: 14,
    minHeight: 120, textAlignVertical: 'top', marginBottom: 10,
  },
  iaBtn: {
    borderWidth: 1, borderColor: colors.green, borderStyle: 'dashed', borderRadius: 10,
    padding: 10, alignItems: 'center', marginBottom: 10,
  },
  iaBtnText: { color: colors.green, fontWeight: '600', fontSize: 13 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 4 },
  modalCancel: { paddingVertical: 10, paddingHorizontal: 16 },
  modalCancelText: { color: colors.textSecondary, fontWeight: '600' },
  modalEnviar: {
    backgroundColor: colors.green, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 22,
  },
  modalEnviarText: { color: '#fff', fontWeight: '700' },

  // ── Histórico ──
  histCard: { backgroundColor: colors.background, borderRadius: 10, padding: 12, marginBottom: 8 },
  histHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  histTipo: { color: colors.textSecondary, fontSize: 12, fontWeight: '700' },
  histPendente: { color: isDark ? '#a78bfa' : '#6d28d9', fontSize: 12, fontWeight: '700' },
  histAceita: { color: isDark ? '#4ade80' : '#15803d', fontSize: 12, fontWeight: '700' },
  histRecusada: { color: isDark ? '#f87171' : '#b91c1c', fontSize: 12, fontWeight: '700' },
  histTexto: { color: colors.text, fontSize: 13, lineHeight: 18 },
  verMais: { color: colors.green, fontSize: 12, fontWeight: '700', marginTop: 6 },
  histResposta: { color: colors.textSecondary, fontSize: 12, fontStyle: 'italic', marginTop: 6 },
  histFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  histData: { color: colors.textTertiary, fontSize: 11 },
  histExcluir: { color: '#f87171', fontSize: 12, fontWeight: '600' },
});
