import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, TextInput, Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { cartoesService } from '../services/api';
import { CartaoCredito, CartaoLancamento, SituacaoLancamento } from '../types';

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

export default function CartoesScreen() {
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

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#4CAF50" />;

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
                <Text style={styles.totalValor}>R$ {totalGeral.toFixed(2)}</Text>
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
                  ? <Text style={styles.cardTotal}>R$ {item.totalMes.toFixed(2)} este mês</Text>
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
                  <Text style={styles.lancamentoValor}>R$ {l.valor.toFixed(2)}</Text>
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
              value={novoNome}
              onChangeText={setNovoNome}
              autoFocus
            />
            <Text style={styles.label}>Dia de Vencimento (opcional, 1–28)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: 5"
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', elevation: 2, marginBottom: 8 },
  navBtn: { fontSize: 22, color: '#4CAF50', paddingHorizontal: 12 },
  mesTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a2e' },
  totalCard: { backgroundColor: '#1565C0', borderRadius: 12, padding: 16, marginBottom: 12, alignItems: 'center' },
  totalLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  totalValor: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginTop: 4 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  cardHeaderLeft: { flex: 1 },
  cardNome: { fontSize: 16, fontWeight: 'bold', color: '#1a1a2e' },
  cardVencimento: { fontSize: 12, color: '#1565C0', fontWeight: '600', marginTop: 2 },
  cardTotal: { fontSize: 14, color: '#e53935', fontWeight: '600', marginTop: 2 },
  cardVazio: { fontSize: 13, color: '#aaa', marginTop: 2 },
  cardActions: { flexDirection: 'row', gap: 4 },
  btnAct: { padding: 6 },
  btnActText: { fontSize: 18 },
  lancamento: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  lancamentoLeft: { flex: 1 },
  lancamentoDesc: { fontSize: 14, color: '#333' },
  lancamentoMeta: { fontSize: 12, color: '#999', marginTop: 2 },
  lancamentoRight: { alignItems: 'flex-end' },
  lancamentoValor: { fontSize: 14, color: '#e53935', fontWeight: '600' },
  lancamentoSituacao: { fontSize: 11, marginTop: 2 },
  empty: { textAlign: 'center', marginTop: 40, color: '#aaa', fontSize: 16, lineHeight: 24 },
  fab: { position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#1565C0', justifyContent: 'center', alignItems: 'center', elevation: 5 },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 32 },
  errorBox: { backgroundColor: '#ffebee', borderRadius: 8, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#ef9a9a' },
  errorText: { color: '#c62828', fontSize: 14, textAlign: 'center' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modal: { backgroundColor: '#fff', borderRadius: 12, padding: 24, width: '100%', maxWidth: 420 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 4 },
  label: { fontSize: 13, fontWeight: '600', color: '#444', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#f5f5f5', borderRadius: 8, padding: 12, fontSize: 16, borderWidth: 1, borderColor: '#ddd' },
  hint: { fontSize: 12, color: '#888', marginTop: 10, fontStyle: 'italic' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  btnCancel: { flex: 1, borderRadius: 8, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#ddd' },
  btnCancelText: { color: '#666', fontSize: 15 },
  btnSave: { flex: 1, backgroundColor: '#1565C0', borderRadius: 8, padding: 14, alignItems: 'center' },
  btnSaveText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
});
