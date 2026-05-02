import React, { useMemo, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Modal, TextInput, ActivityIndicator, Alert, RefreshControl,
  Platform,
} from 'react-native';
import DatePickerField from '../components/DatePickerField';
import { useTheme } from '../theme/ThemeContext';
import EmptyState from '../components/EmptyState';
import type { ColorScheme } from '../theme/colors';
import { fmtBRL } from '../utils/currency';
import { api } from '../services/api';
import { useMetas, useCreateMeta, useDeleteMeta } from '../hooks/useMetas';
import { SkeletonList } from '../components/SkeletonLoader';

// ─── Tipos ───────────────────────────────────────────────────────────────────
interface Meta {
  id: string;
  titulo: string;
  descricao?: string;
  valorMeta: number;
  valorAtual: number;
  dataMeta?: string;
  status: 1 | 2 | 3; // Ativa | Concluida | Pausada
  capa?: string;
  corFundo?: string;
  criadoEm: string;
}

const STATUS_LABEL: Record<number, string> = { 1: 'Ativa', 2: 'Concluída', 3: 'Pausada' };
const STATUS_COR:   Record<number, string> = { 1: '#3fb950', 2: '#58a6ff', 3: '#d29922' };

const CAPAS = ['🏠','🏍️','✈️','💰','📱','🎓','💪','🚗','🌴','💍','🏖️','📚'];
const CORES = [
  '#0d2137','#1a3a2a','#2d1b3d','#3a1a1a',
  '#1a2a3a','#2a2a1a','#1a1a2a','#2a1a2a',
];

const metasService = {
  getAll: (): Promise<Meta[]> => api.get('/metas').then(r => r.data),
  create: (data: object) => api.post('/metas', data).then(r => r.data),
  update: (id: string, data: object) => api.put(`/metas/${id}`, data),
  atualizarValor: (id: string, novoValor: number) =>
    api.patch(`/metas/${id}/valor`, { novoValor }),
  delete: (id: string) => api.delete(`/metas/${id}`),
};

// ─── Máscara de valor ────────────────────────────────────────────────────────
function applyValorMask(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  const num = parseInt(digits, 10);
  const reais = Math.floor(num / 100);
  const cents = num % 100;
  const reaisStr = reais === 0 ? '0' : reais.toLocaleString('pt-BR');
  return `${reaisStr},${String(cents).padStart(2, '0')}`;
}
function maskToNumber(masked: string): number {
  if (!masked.trim()) return 0;
  const val = parseFloat(masked.replace(/\./g, '').replace(',', '.'));
  return isNaN(val) ? 0 : val;
}

// ─── Card de meta ─────────────────────────────────────────────────────────────
function MetaCard({
  meta, onAtualizarValor, onEditar, onDeletar, colors,
}: {
  meta: Meta;
  onAtualizarValor: (m: Meta) => void;
  onEditar: (m: Meta) => void;
  onDeletar: (m: Meta) => void;
  colors: ColorScheme;
}) {
  const pct     = meta.valorMeta > 0 ? Math.min(meta.valorAtual / meta.valorMeta, 1) : 0;
  const concluida = meta.status === 2;
  const fundo   = meta.corFundo ?? '#1a2a3a';
  const corStatus = STATUS_COR[meta.status];

  const diasRestantes = meta.dataMeta
    ? Math.ceil((new Date(meta.dataMeta).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <TouchableOpacity
      style={[styles(colors).card, { backgroundColor: fundo }]}
      onPress={() => onEditar(meta)}
      activeOpacity={0.88}
    >
      {/* Linha topo: status + botões */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={[styles(colors).statusBadge, { backgroundColor: corStatus + '33', borderColor: corStatus + '66' }]}>
          <Text style={[styles(colors).statusText, { color: corStatus }]}>{STATUS_LABEL[meta.status]}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            onPress={() => onEditar(meta)}
            style={styles(colors).iconBtn}
          >
            <Text style={{ fontSize: 15 }}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onDeletar(meta)}
            style={styles(colors).iconBtn}
          >
            <Text style={{ fontSize: 15 }}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Capa + Título */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 }}>
        {meta.capa ? (
          <Text style={{ fontSize: 36 }}>{meta.capa}</Text>
        ) : null}
        <View style={{ flex: 1 }}>
          <Text style={styles(colors).cardTitulo} numberOfLines={2}>{meta.titulo}</Text>
          {meta.descricao ? (
            <Text style={styles(colors).cardDesc} numberOfLines={2}>{meta.descricao}</Text>
          ) : null}
        </View>
      </View>

      {/* Progresso */}
      <View style={{ marginTop: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
          <Text style={styles(colors).cardLabel}>Progresso</Text>
          <Text style={[styles(colors).cardPct, { color: concluida ? '#58a6ff' : pct >= 1 ? '#3fb950' : '#fff' }]}>
            {(pct * 100).toFixed(1)}%
          </Text>
        </View>
        <View style={styles(colors).progressBg}>
          <View style={[
            styles(colors).progressFill,
            {
              width: `${pct * 100}%` as any,
              backgroundColor: concluida ? '#58a6ff' : pct >= 0.8 ? '#3fb950' : '#d29922',
            }
          ]} />
        </View>
      </View>

      {/* Valores */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
        <View>
          <Text style={styles(colors).cardValorLabel}>Guardado</Text>
          <Text style={styles(colors).cardValor}>{fmtBRL(meta.valorAtual)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles(colors).cardValorLabel}>Meta</Text>
          <Text style={styles(colors).cardValorMeta}>{fmtBRL(meta.valorMeta)}</Text>
        </View>
      </View>

      {/* Falta + Data */}
      {!concluida && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
          <Text style={styles(colors).cardFalta}>
            Faltam {fmtBRL(Math.max(0, meta.valorMeta - meta.valorAtual))}
          </Text>
          {diasRestantes !== null && (
            <Text style={[styles(colors).cardFalta, diasRestantes < 0 && { color: '#f85149' }]}>
              {diasRestantes < 0
                ? `Venceu há ${Math.abs(diasRestantes)}d`
                : diasRestantes === 0
                  ? 'Vence hoje!'
                  : `${diasRestantes}d restantes`}
            </Text>
          )}
        </View>
      )}

      {meta.dataMeta && (
        <Text style={styles(colors).cardData}>
          📅 Meta: {new Date(meta.dataMeta).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
        </Text>
      )}

      {/* Botão atualizar */}
      {!concluida && (
        <TouchableOpacity
          style={styles(colors).atualizarBtn}
          onPress={() => onAtualizarValor(meta)}
        >
          <Text style={styles(colors).atualizarText}>⬆ Atualizar valor</Text>
        </TouchableOpacity>
      )}

      {concluida && (
        <View style={styles(colors).concluidaBanner}>
          <Text style={{ color: '#58a6ff', fontWeight: '700', fontSize: 13 }}>🎉 Meta atingida!</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Tela principal ───────────────────────────────────────────────────────────
export default function MetasScreen() {
  const { colors } = useTheme();
  const s = useMemo(() => styles(colors), [colors]);

  const { data: metasRaw, isLoading, refetch } = useMetas();
  const metas: Meta[] = (metasRaw as Meta[] | undefined) ?? [];
  const createMeta = useCreateMeta();
  const deleteMeta = useDeleteMeta();
  const [busca, setBusca]       = useState('');

  // Modal nova/editar meta
  const [modalMeta, setModalMeta]   = useState(false);
  const [editMeta, setEditMeta]     = useState<Meta | null>(null);
  const [titulo, setTitulo]         = useState('');
  const [descricao, setDescricao]   = useState('');
  const [valorMetaInput, setValorMetaInput] = useState('');
  const [dataMetaDate, setDataMetaDate]     = useState<Date | null>(null);
  const [hasDataMeta, setHasDataMeta]       = useState(false); // true = campo de data visível
  const [capaSelected, setCapaSelected]     = useState('');
  const [corSelected, setCorSelected]       = useState(CORES[0]);
  const [saving, setSaving]         = useState(false);

  // Modal atualizar valor
  const [modalValor, setModalValor]   = useState<Meta | null>(null);
  const [novoValorInput, setNovoValorInput] = useState('');
  const [savingValor, setSavingValor] = useState(false);

  // Confirmação customizada (web)
  const [confirmModal, setConfirmModal] = useState<{
    title: string; message: string; onConfirm: () => void;
  } | null>(null);

  function abrirNova() {
    setEditMeta(null);
    setTitulo(''); setDescricao(''); setValorMetaInput('');
    setDataMetaDate(null); setHasDataMeta(false); setCapaSelected(''); setCorSelected(CORES[0]);
    setModalMeta(true);
  }

  function abrirEditar(meta: Meta) {
    setEditMeta(meta);
    setTitulo(meta.titulo);
    setDescricao(meta.descricao ?? '');
    setValorMetaInput(applyValorMask(String(Math.round(meta.valorMeta * 100))));
    const existingDate = meta.dataMeta ? new Date(meta.dataMeta) : null;
    setDataMetaDate(existingDate);
    setHasDataMeta(!!existingDate);
    setCapaSelected(meta.capa ?? '');
    setCorSelected(meta.corFundo ?? CORES[0]);
    setModalMeta(true);
  }

  async function salvar() {
    if (!titulo.trim() || !valorMetaInput) return;
    const valorMeta = maskToNumber(valorMetaInput);
    const dataMeta  = dataMetaDate ? dataMetaDate.toISOString() : null;
    setSaving(true);
    try {
      const body = {
        titulo: titulo.trim(),
        descricao: descricao.trim() || null,
        valorMeta,
        dataMeta,
        capa: capaSelected || null,
        corFundo: corSelected,
      };
      if (editMeta) {
        await metasService.update(editMeta.id, body);
        await refetch();
      } else {
        await createMeta.mutateAsync(body);
      }
      setModalMeta(false);
    } finally {
      setSaving(false);
    }
  }

  async function atualizarValor() {
    if (!modalValor) return;
    const novo = maskToNumber(novoValorInput);
    setSavingValor(true);
    try {
      await metasService.atualizarValor(modalValor.id, novo);
      setModalValor(null);
      await refetch();
    } finally {
      setSavingValor(false);
    }
  }

  function deletar(meta: Meta) {
    const doDelete = async () => {
      try {
        await deleteMeta.mutateAsync(meta.id);
      } catch {
        Alert.alert('Erro', 'Não foi possível excluir a meta. Tente novamente.');
      }
    };

    if (Platform.OS === 'web') {
      setConfirmModal({
        title: 'Excluir meta',
        message: `Tem certeza que deseja excluir "${meta.titulo}"? Esta ação não pode ser desfeita.`,
        onConfirm: doDelete,
      });
    } else {
      Alert.alert(
        'Excluir meta',
        `Tem certeza que deseja excluir "${meta.titulo}"? Esta ação não pode ser desfeita.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Excluir', style: 'destructive', onPress: doDelete },
        ],
        { cancelable: true }
      );
    }
  }

  const metasFiltradas = useMemo(() => {
    if (!busca.trim()) return metas;
    const q = busca.toLowerCase();
    return metas.filter(m =>
      m.titulo.toLowerCase().includes(q) || m.descricao?.toLowerCase().includes(q)
    );
  }, [metas, busca]);

  // Estatísticas
  const ativas     = metas.filter(m => m.status === 1);
  const concluidas = metas.filter(m => m.status === 2);
  const totalMeta  = ativas.reduce((s, m) => s + m.valorMeta, 0);
  const totalAtual = ativas.reduce((s, m) => s + m.valorAtual, 0);

  if (isLoading) return <SkeletonList count={5} />;

  return (
    <View style={s.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => refetch()} />}
        contentContainerStyle={s.scroll}
      >
        {/* Resumo topo */}
        {metas.length > 0 && (
          <View style={s.resumoCard}>
            <View style={s.resumoItem}>
              <Text style={s.resumoLabel}>Em progresso</Text>
              <Text style={s.resumoValor}>{ativas.length}</Text>
            </View>
            <View style={s.resumoSep} />
            <View style={s.resumoItem}>
              <Text style={s.resumoLabel}>Concluídas</Text>
              <Text style={[s.resumoValor, { color: '#58a6ff' }]}>{concluidas.length}</Text>
            </View>
            <View style={s.resumoSep} />
            <View style={s.resumoItem}>
              <Text style={s.resumoLabel}>Guardado</Text>
              <Text style={[s.resumoValor, { color: colors.green, fontSize: 13 }]}>{fmtBRL(totalAtual)}</Text>
            </View>
            <View style={s.resumoSep} />
            <View style={s.resumoItem}>
              <Text style={s.resumoLabel}>Total metas</Text>
              <Text style={[s.resumoValor, { fontSize: 13 }]}>{fmtBRL(totalMeta)}</Text>
            </View>
          </View>
        )}

        {/* Busca */}
        {metas.length > 3 && (
          <View style={s.searchWrap}>
            <TextInput
              style={s.searchInput}
              placeholder="Buscar metas..."
              placeholderTextColor={colors.inputPlaceholder}
              value={busca}
              onChangeText={setBusca}
            />
          </View>
        )}

        {/* Cards */}
        {metasFiltradas.length === 0 ? (
          <EmptyState
            title="Nenhuma meta ainda! 🎯"
            subtitle={"Defina seus objetivos financeiros\ne acompanhe o progresso até realizá-los."}
            action={{ label: '+ Criar meta', onPress: () => setModalMeta(true) }}
          />
        ) : (
          metasFiltradas.map(meta => (
            <MetaCard
              key={meta.id}
              meta={meta}
              colors={colors}
              onAtualizarValor={m => {
                setModalValor(m);
                setNovoValorInput(applyValorMask(String(Math.round(m.valorAtual * 100))));
              }}
              onEditar={abrirEditar}
              onDeletar={deletar}
            />
          ))
        )}
      </ScrollView>

      {/* FAB nova meta */}
      <TouchableOpacity style={s.fab} onPress={abrirNova}>
        <Text style={s.fabText}>+</Text>
      </TouchableOpacity>

      {/* ── Modal nova/editar meta ────────────────────────────────────── */}
      <Modal visible={modalMeta} transparent animationType="slide" onRequestClose={() => setModalMeta(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <Text style={s.modalTitle}>{editMeta ? 'Editar meta' : 'Nova meta'}</Text>

            <Text style={s.fieldLabel}>Título *</Text>
            <TextInput
              style={s.input}
              placeholder="Ex: Casa Própria"
              placeholderTextColor={colors.inputPlaceholder}
              value={titulo}
              onChangeText={setTitulo}
            />

            <Text style={s.fieldLabel}>Descrição</Text>
            <TextInput
              style={[s.input, { height: 72, textAlignVertical: 'top' }]}
              placeholder="Descreva sua meta..."
              placeholderTextColor={colors.inputPlaceholder}
              value={descricao}
              onChangeText={setDescricao}
              multiline
            />

            <Text style={s.fieldLabel}>Valor da meta (R$) *</Text>
            <TextInput
              style={s.input}
              keyboardType="number-pad"
              placeholder="0,00"
              placeholderTextColor={colors.inputPlaceholder}
              value={valorMetaInput}
              onChangeText={v => setValorMetaInput(applyValorMask(v))}
            />

            <Text style={s.fieldLabel}>Data limite</Text>
            {hasDataMeta ? (
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <DatePickerField
                    value={dataMetaDate ?? new Date()}
                    onChange={setDataMetaDate}
                    dark
                    insideModal
                  />
                </View>
                <TouchableOpacity
                  onPress={() => { setHasDataMeta(false); setDataMetaDate(null); }}
                  style={{ padding: 13, backgroundColor: colors.surface, borderRadius: 8, borderWidth: 1, borderColor: colors.border, marginBottom: 0 }}
                >
                  <Text style={{ color: colors.textSecondary, fontSize: 13 }}>✕</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[s.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
                onPress={() => { setDataMetaDate(new Date()); setHasDataMeta(true); }}
              >
                <Text style={{ color: colors.inputPlaceholder, fontSize: 15 }}>Sem data limite</Text>
                <Text style={{ fontSize: 16 }}>📅</Text>
              </TouchableOpacity>
            )}


            {/* Escolha de emoji */}
            <Text style={s.fieldLabel}>Ícone</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {['', ...CAPAS].map(c => (
                  <TouchableOpacity
                    key={c || 'none'}
                    onPress={() => setCapaSelected(c)}
                    style={[s.capaBtn, capaSelected === c && s.capaBtnSelected]}
                  >
                    <Text style={{ fontSize: 24 }}>{c || '✕'}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Escolha de cor */}
            <Text style={s.fieldLabel}>Cor do card</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
              {CORES.map(c => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setCorSelected(c)}
                  style={[s.corBtn, { backgroundColor: c }, corSelected === c && s.corBtnSelected]}
                />
              ))}
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity style={s.btnCancel} onPress={() => setModalMeta(false)}>
                <Text style={s.btnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.btnSave, (!titulo.trim() || !valorMetaInput) && { opacity: 0.4 }]}
                onPress={salvar}
                disabled={saving || !titulo.trim() || !valorMetaInput}
              >
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.btnSaveText}>Salvar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Modal atualizar valor ─────────────────────────────────────── */}
      <Modal visible={!!modalValor} transparent animationType="fade" onRequestClose={() => setModalValor(null)}>
        <View style={s.overlayCenter}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>{modalValor?.titulo}</Text>
            <Text style={s.modalSub}>
              Atual: {fmtBRL(modalValor?.valorAtual ?? 0)} · Meta: {fmtBRL(modalValor?.valorMeta ?? 0)}
            </Text>
            <Text style={s.fieldLabel}>Novo valor total guardado (R$)</Text>
            <TextInput
              style={s.input}
              keyboardType="number-pad"
              placeholder="0,00"
              placeholderTextColor={colors.inputPlaceholder}
              value={novoValorInput}
              onChangeText={v => setNovoValorInput(applyValorMask(v))}
              autoFocus
            />
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
              <TouchableOpacity style={s.btnCancel} onPress={() => setModalValor(null)}>
                <Text style={s.btnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.btnSave} onPress={atualizarValor} disabled={savingValor}>
                {savingValor ? <ActivityIndicator color="#fff" /> : <Text style={s.btnSaveText}>Salvar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Modal confirmação exclusão (web) ─────────────────────────── */}
      {confirmModal && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setConfirmModal(null)}>
          <View style={s.overlayCenter}>
            <View style={s.modalCard}>
              <Text style={s.modalTitle}>{confirmModal.title}</Text>
              <Text style={[s.modalSub, { marginBottom: 20 }]}>{confirmModal.message}</Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity style={s.btnCancel} onPress={() => setConfirmModal(null)}>
                  <Text style={s.btnCancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.btnSave, { backgroundColor: '#f85149' }]}
                  onPress={() => { setConfirmModal(null); confirmModal.onConfirm(); }}
                >
                  <Text style={s.btnSaveText}>Excluir</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

// CARD_W removido — usar width: '100%' para funcionar corretamente no desktop com sidebar

function styles(c: ColorScheme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    scroll:    { padding: 16, paddingBottom: 100 },

    resumoCard: {
      flexDirection: 'row', backgroundColor: c.surface,
      borderRadius: 12, padding: 14, marginBottom: 16,
      borderWidth: 1, borderColor: c.border,
    },
    resumoItem:  { flex: 1, alignItems: 'center' },
    resumoSep:   { width: 1, backgroundColor: c.border, marginVertical: 4 },
    resumoLabel: { fontSize: 10, color: c.textSecondary, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 4 },
    resumoValor: { fontSize: 15, fontWeight: '700', color: c.text },

    searchWrap:  { marginBottom: 16 },
    searchInput: {
      backgroundColor: c.inputBg, borderRadius: 10, padding: 12,
      fontSize: 14, borderWidth: 1, borderColor: c.inputBorder, color: c.text,
    },

    // Card
    card: {
      width: '100%', borderRadius: 16, padding: 18,
      marginBottom: 16, overflow: 'hidden',
    },
    iconBtn: {
      backgroundColor: 'rgba(255,255,255,0.12)',
      borderRadius: 8, padding: 6,
    },
    statusBadge: {
      alignSelf: 'flex-start', borderRadius: 8, borderWidth: 1,
      paddingHorizontal: 8, paddingVertical: 3,
    },
    statusText:  { fontSize: 11, fontWeight: '700' },
    cardTitulo:  { fontSize: 20, fontWeight: '800', color: '#fff', lineHeight: 26 },
    cardDesc:    { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 3, lineHeight: 17 },
    cardLabel:   { fontSize: 11, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 0.4 },
    cardPct:     { fontSize: 13, fontWeight: '700' },
    progressBg:  { height: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 3 },
    progressFill:{ height: 6, borderRadius: 3 },
    cardValorLabel:{ fontSize: 10, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 2 },
    cardValor:   { fontSize: 18, fontWeight: '700', color: '#fff' },
    cardValorMeta:{ fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
    cardFalta:   { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
    cardData:    { fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 8 },
    atualizarBtn:{
      marginTop: 14, backgroundColor: 'rgba(255,255,255,0.12)',
      borderRadius: 10, padding: 11, alignItems: 'center',
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    },
    atualizarText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    concluidaBanner: {
      marginTop: 14, backgroundColor: '#58a6ff22', borderRadius: 10,
      padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#58a6ff44',
    },

    // Empty
    empty:      { alignItems: 'center', paddingVertical: 48, gap: 10 },
    emptyTitle: { fontSize: 18, fontWeight: 'bold', color: c.text },
    emptySub:   { fontSize: 13, color: c.textSecondary, textAlign: 'center', lineHeight: 20 },

    // FAB
    fab: {
      position: 'absolute', bottom: 24, right: 24,
      width: 56, height: 56, borderRadius: 28,
      backgroundColor: c.green, justifyContent: 'center', alignItems: 'center',
      shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
    },
    fabText: { color: '#fff', fontSize: 28, lineHeight: 32 },

    // Modais
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalSheet: {
      backgroundColor: c.surfaceElevated, borderTopLeftRadius: 20, borderTopRightRadius: 20,
      padding: 24, paddingBottom: 40, maxHeight: '92%',
    },
    overlayCenter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    modalCard: {
      backgroundColor: c.surfaceElevated, borderRadius: 16, padding: 24,
      width: '100%', maxWidth: 420, borderWidth: 1, borderColor: c.border,
    },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: c.text, marginBottom: 4 },
    modalSub:   { fontSize: 13, color: c.textSecondary, marginBottom: 16 },
    fieldLabel: { fontSize: 11, fontWeight: '700', color: c.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6, marginTop: 12 },
    input: {
      backgroundColor: c.inputBg, borderRadius: 8, padding: 13,
      fontSize: 15, borderWidth: 1, borderColor: c.inputBorder, color: c.text,
    },
    capaBtn:         { width: 48, height: 48, borderRadius: 12, backgroundColor: c.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
    capaBtnSelected: { borderColor: c.green },
    corBtn:          { width: 36, height: 36, borderRadius: 8, borderWidth: 2, borderColor: 'transparent' },
    corBtnSelected:  { borderColor: '#fff', transform: [{ scale: 1.15 }] },
    btnCancel: { flex: 1, borderRadius: 8, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: c.border },
    btnCancelText: { color: c.textSecondary, fontSize: 15 },
    btnSave:    { flex: 1, backgroundColor: c.green, borderRadius: 8, padding: 14, alignItems: 'center' },
    btnSaveText:{ color: '#fff', fontSize: 15, fontWeight: '700' },
  });
}
