import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, TextInput, Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { cartoesService } from '../services/api';
import { CartaoCredito, CartaoLancamento, SituacaoLancamento } from '../types';
import { fmtBRL } from '../utils/currency';
import { useTheme } from '../theme/ThemeContext';
import type { ColorScheme } from '../theme/colors';

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const situacaoLabel: Record<number, string> = {
  [SituacaoLancamento.Recebido]: 'Recebido',
  [SituacaoLancamento.Pago]: 'Pago',
  [SituacaoLancamento.AReceber]: 'A Receber',
  [SituacaoLancamento.AVencer]: 'A Vencer',
  [SituacaoLancamento.Vencido]: 'Vencido',
};

const situacaoCor: Record<number, string> = {
  [SituacaoLancamento.Recebido]: '#4CAF50',
  [SituacaoLancamento.Pago]: '#4CAF50',
  [SituacaoLancamento.AReceber]: '#2196F3',
  [SituacaoLancamento.AVencer]: '#FF9800',
  [SituacaoLancamento.Vencido]: '#e53935',
};

export default function CartoesScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());
  const [cartoes, setCartoes] = useState<CartaoCredito[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Modal criar
  const [criarVisible, setCriarVisible] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [novoDia, setNovoDia] = useState('');
  const [saving, setSaving] = useState(false);

  // Modal editar
  const [editando, setEditando] = useState<CartaoCredito | null>(null);
  const [eNome, setENome] = useState('');
  const [eDia, setEDia] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await cartoesService.getAll(mes, ano);
      setCartoes(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [mes, ano]);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  function navMes(delta: number) {
    const d = new Date(ano, mes - 1 + delta, 1);
    setMes(d.getMonth() + 1);
    setAno(d.getFullYear());
    setLoading(true);
  }

  async function handleCriarCartao() {
    if (!novoNome.trim()) return;
    setSaving(true);
    try {
      const diaNum = novoDia ? Math.min(28, Math.max(1, parseInt(novoDia) || 1)) : undefined;
      await cartoesService.createCartao({ nome: novoNome.trim(), diaVencimento: diaNum ?? null });
      setNovoNome('');
      setNovoDia('');
      setCriarVisible(false);
      await load();
    } catch {
      setError('Erro ao criar cartão.');
    } finally {
      setSaving(false);
    }
  }

  function abrirEdicao(c: CartaoCredito) {
    setEditando(c);
    setENome(c.nome);
    setEDia(c.diaVencimento ? String(c.diaVencimento) : '');
    setError('');
  }

  async function handleEditarCartao() {
    if (!editando || !eNome.trim()) return;
    setEditSaving(true);
    try {
      const diaNum = eDia ? Math.min(28, Math.max(1, parseInt(eDia) || 1)) : undefined;
      await cartoesService.updateCartao(editando.id, { nome: eNome.trim(), diaVencimento: diaNum ?? null });
      setEditando(null);
      await load();
    } catch {
      setError('Erro ao editar cartão.');
    } finally {
      setEditSaving(false);
    }
  }

  async function handleExcluirCartao(id: string) {
    try {
      await cartoesService.deleteCartao(id);
      await load();
    } catch {
      setError('Erro ao excluir cartão.');
    }
  }

  const totalGeral = cartoes.reduce((s, c) => s + c.totalMes, 0);

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color={colors.green} />
    </View>
  );

  return (
    <>
      <FlatList
        style={styles.container}
        data={cartoes}
        keyExtractor={c => c.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => navMes(-1)}><Text style={styles.navBtn}>◀</Text></TouchableOpacity>
              <Text style={styles.mesTitle}>{MESES[mes - 1]}/{ano}</Text>
              <TouchableOpacity onPress={() => navMes(1)}><Text style={styles.navBtn}>▶</Text></TouchableOpacity>
            </View>

            {cartoes.length > 0 && (
              <View style={styles.totalCard}>
                <Text style={styles.totalLabel}>Total Cartões no Mês</Text>
                <Text style={styles.totalValor}>{fmtBRL(totalGeral)}</Text>
              </View>
            )}

            {error !== '' && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.empty}>Nenhum cartão cadastrado.{'\n'}Toque em + para adicionar.</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <Text style={styles.cardNome}>💳 {item.nome}</Text>
                {item.diaVencimento ? (
                  <Text style={styles.cardVencimento}>📅 Vence dia {item.diaVencimento}</Text>
                ) : null}
                {item.totalMes > 0
                  ? <Text style={styles.cardTotal}>{fmtBRL(item.totalMes)} este mês</Text>
                  : <Text style={styles.cardVazio}>Sem lançamentos este mês</Text>
                }
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity onPress={() => abrirEdicao(item)} style={styles.btnAct}>
                  <Text style={styles.btnActText}>✏️</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleExcluirCartao(item.id)} style={styles.btnAct}>
                  <Text style={styles.btnActText}>🗑</Text>
                </TouchableOpacity>
              </View>
            </View>

            {item.lancamentos.map((l: CartaoLancamento) => (
              <View key={l.id} style={styles.lancamento}>
                <View style={styles.lancamentoLeft}>
                  <Text style={styles.lancamentoDesc}>{l.descricao}</Text>
                  <Text style={styles.lancamentoMeta}>
                    {new Date(l.data).toLocaleDateString('pt-BR')}
                    {l.totalParcelas && l.totalParcelas > 1
                      ? ` · ${l.parcelaAtual}/${l.totalParcelas}x`
                      : ''}
                  </Text>
                </View>
                <View style={styles.lancamentoRight}>
                  <Text style={styles.lancamentoValor}>{fmtBRL(l.valor)}</Text>
                  <Text style={[styles.lancamentoSituacao, { color: situacaoCor[l.situacao] }]}>
                    {situacaoLabel[l.situacao]}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
        contentContainerStyle={{ padding: 12, paddingBottom: 80 }}
      />

      {/* FAB importar fatura */}
      <TouchableOpacity
        style={[styles.fab, { bottom: 88, backgroundColor: '#1565C0' }]}
        onPress={() => navigation.navigate('ImportarFatura', {
          cartaoId: cartoes[0]?.id ?? '',
          cartaoNome: cartoes[0]?.nome ?? '',
        })}
      >
        <Text style={{ fontSize: 20 }}>📄</Text>
      </TouchableOpacity>

      {/* FAB adicionar cartão */}
      <TouchableOpacity style={styles.fab} onPress={() => { setError(''); setCriarVisible(true); }}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Modal criar */}
      <Modal visible={criarVisible} transparent animationType="fade" onRequestClose={() => setCriarVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Novo Cartão</Text>
            <Text style={styles.label}>Nome</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Nubank, Inter, Bradesco..."
              placeholderTextColor={colors.inputPlaceholder}
              value={novoNome}
              onChangeText={setNovoNome}
              autoFocus
            />
            <Text style={styles.label}>Dia de Vencimento (opcional, 1–28)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: 5"
              placeholderTextColor={colors.inputPlaceholder}
              keyboardType="number-pad"
              value={novoDia}
              onChangeText={t => setNovoDia(t.replace(/\D/g, ''))}
              maxLength={2}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => { setCriarVisible(false); setNovoNome(''); setNovoDia(''); }}>
                <Text style={styles.btnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnSave} onPress={handleCriarCartao} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnSaveText}>Salvar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal editar */}
      <Modal visible={!!editando} transparent animationType="fade" onRequestClose={() => setEditando(null)}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Editar Cartão</Text>
            <Text style={styles.label}>Nome</Text>
            <TextInput
              style={styles.input}
              value={eNome}
              onChangeText={setENome}
              autoFocus
            />
            <Text style={styles.label}>Dia de Vencimento (opcional, 1–28)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: 5"
              placeholderTextColor={colors.inputPlaceholder}
              keyboardType="number-pad"
              value={eDia}
              onChangeText={t => setEDia(t.replace(/\D/g, ''))}
              maxLength={2}
            />
            <Text style={styles.hint}>
              💡 O vencimento aparece como referência de data na fatura mensal.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => setEditando(null)}>
                <Text style={styles.btnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnSave} onPress={handleEditarCartao} disabled={editSaving}>
                {editSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnSaveText}>Salvar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

function makeStyles(c: ColorScheme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.border, marginBottom: 8 },
    navBtn: { fontSize: 22, color: c.green, paddingHorizontal: 12 },
    mesTitle: { fontSize: 18, fontWeight: 'bold', color: c.text },
    totalCard: { backgroundColor: c.blue, borderRadius: 12, padding: 16, marginBottom: 12, alignItems: 'center' },
    totalLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
    totalValor: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginTop: 4 },
    card: { backgroundColor: c.surface, borderRadius: 12, padding: 16, marginBottom: 12 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
    cardHeaderLeft: { flex: 1 },
    cardNome: { fontSize: 16, fontWeight: 'bold', color: c.text },
    cardVencimento: { fontSize: 12, color: '#64B5F6', fontWeight: '600', marginTop: 2 },
    cardTotal: { fontSize: 14, color: c.red, fontWeight: '600', marginTop: 2 },
    cardVazio: { fontSize: 13, color: c.textTertiary, marginTop: 2 },
    cardActions: { flexDirection: 'row', gap: 4 },
    btnAct: { padding: 6 },
    btnActText: { fontSize: 18 },
    lancamento: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: c.border },
    lancamentoLeft: { flex: 1 },
    lancamentoDesc: { fontSize: 14, color: c.text },
    lancamentoMeta: { fontSize: 12, color: c.textSecondary, marginTop: 2 },
    lancamentoRight: { alignItems: 'flex-end' },
    lancamentoValor: { fontSize: 14, color: c.red, fontWeight: '600' },
    lancamentoSituacao: { fontSize: 11, marginTop: 2 },
    empty: { textAlign: 'center', marginTop: 40, color: c.textSecondary, fontSize: 16, lineHeight: 24 },
    fab: { position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: c.blue, justifyContent: 'center', alignItems: 'center', elevation: 5 },
    fabText: { color: '#fff', fontSize: 28, lineHeight: 32 },
    errorBox: { backgroundColor: c.redDim, borderRadius: 8, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: c.redBorder },
    errorText: { color: c.redBorder, fontSize: 14, textAlign: 'center' },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    modal: { backgroundColor: c.surfaceElevated, borderRadius: 16, padding: 24, width: '100%', maxWidth: 420, borderWidth: 1, borderColor: c.border },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: c.text, marginBottom: 4 },
    label: { fontSize: 13, fontWeight: '600', color: c.textSecondary, marginBottom: 6, marginTop: 12, textTransform: 'uppercase', letterSpacing: 0.4 },
    input: { backgroundColor: c.inputBg, borderRadius: 8, padding: 12, fontSize: 16, borderWidth: 1, borderColor: c.inputBorder, color: c.text },
    hint: { fontSize: 12, color: c.textSecondary, marginTop: 10, fontStyle: 'italic' },
    modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
    btnCancel: { flex: 1, borderRadius: 8, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: c.border },
    btnCancelText: { color: c.textSecondary, fontSize: 15 },
    btnSave: { flex: 1, backgroundColor: c.blue, borderRadius: 8, padding: 14, alignItems: 'center' },
    btnSaveText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  });
}
