import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Modal, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { saldosService } from '../services/api';
import { SaldoConta, TipoConta } from '../types';
import { fmtBRL } from '../utils/currency';

const TIPOS: { label: string; emoji: string; value: TipoConta }[] = [
  { value: TipoConta.ContaCorrente, label: 'Conta Corrente', emoji: '🏦' },
  { value: TipoConta.ContaPoupanca, label: 'Poupança',       emoji: '🐷' },
  { value: TipoConta.Carteira,      label: 'Carteira',       emoji: '👛' },
  { value: TipoConta.Investimento,  label: 'Investimento',   emoji: '📈' },
];

function tipoInfo(t: TipoConta) {
  return TIPOS.find(x => x.value === t) ?? TIPOS[0];
}

type ModalState =
  | { mode: 'hidden' }
  | { mode: 'create' }
  | { mode: 'edit'; conta: SaldoConta };

export default function SaldosScreen() {
  const [contas,     setContas]     = useState<SaldoConta[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modal,      setModal]      = useState<ModalState>({ mode: 'hidden' });
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState('');

  const [nome,  setNome]  = useState('');
  const [saldo, setSaldo] = useState('');
  const [tipo,  setTipo]  = useState<TipoConta>(TipoConta.ContaCorrente);

  const load = useCallback(async () => {
    try { setContas(await saldosService.getAll()); }
    catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function openCreate() {
    setNome(''); setSaldo(''); setTipo(TipoConta.ContaCorrente); setError('');
    setModal({ mode: 'create' });
  }

  function openEdit(conta: SaldoConta) {
    setNome(conta.banco);
    setSaldo(conta.saldo.toFixed(2).replace('.', ','));
    setTipo(conta.tipo);
    setError('');
    setModal({ mode: 'edit', conta });
  }

  async function handleSalvar() {
    if (!nome.trim()) { setError('Informe o nome da conta.'); return; }
    const saldoNum = parseFloat(saldo.replace(',', '.'));
    if (isNaN(saldoNum)) { setError('Informe um saldo válido.'); return; }

    setSaving(true); setError('');
    try {
      if (modal.mode === 'create') {
        await saldosService.create({ banco: nome.trim(), saldoInicial: saldoNum, tipo });
      } else if (modal.mode === 'edit') {
        await saldosService.update(modal.conta.id, { banco: nome.trim(), saldo: saldoNum, tipo });
      }
      setModal({ mode: 'hidden' });
      await load();
    } catch { setError('Erro ao salvar conta.'); }
    finally { setSaving(false); }
  }

  async function handleExcluir(conta: SaldoConta) {
    Alert.alert(
      'Excluir Conta',
      `Deseja excluir "${conta.banco}"?\nOs lançamentos vinculados não serão excluídos.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir', style: 'destructive',
          onPress: async () => {
            try { await saldosService.delete(conta.id); await load(); }
            catch { Alert.alert('Erro', 'Não foi possível excluir.'); }
          },
        },
      ]
    );
  }

  const totalGeral = contas.reduce((s, c) => s + c.saldo, 0);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#4CAF50" />;

  return (
    <>
      <FlatList
        data={contas}
        keyExtractor={c => c.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        ListHeaderComponent={(
          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>Patrimônio Total</Text>
            <Text style={[styles.totalValue, { color: totalGeral >= 0 ? '#4CAF50' : '#e53935' }]}>
              {fmtBRL(totalGeral)}
            </Text>
          </View>
        )}
        ListEmptyComponent={(
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Nenhuma conta cadastrada.</Text>
            <Text style={styles.emptyHint}>Toque em + para adicionar.</Text>
          </View>
        )}
        renderItem={({ item }) => {
          const t = tipoInfo(item.tipo);
          return (
            <TouchableOpacity style={styles.card} onPress={() => openEdit(item)} activeOpacity={0.8}>
              <View style={styles.cardLeft}>
                <Text style={styles.cardEmoji}>{t.emoji}</Text>
                <View>
                  <Text style={styles.cardNome}>{item.banco}</Text>
                  <Text style={styles.cardTipo}>{t.label}</Text>
                </View>
              </View>
              <View style={styles.cardRight}>
                <Text style={[styles.cardSaldo, { color: item.saldo >= 0 ? '#2E7D32' : '#e53935' }]}>
                  {fmtBRL(item.saldo)}
                </Text>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleExcluir(item)}>
                  <Text style={styles.deleteBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={styles.list}
      />

      <TouchableOpacity style={styles.fab} onPress={openCreate}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <Modal
        visible={modal.mode !== 'hidden'}
        transparent
        animationType="slide"
        onRequestClose={() => setModal({ mode: 'hidden' })}
      >
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>
              {modal.mode === 'create' ? '🏦 Nova Conta' : '✏️ Editar Conta'}
            </Text>

            <Text style={styles.label}>Nome da conta</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Nubank, Itaú, Carteira..."
              value={nome}
              onChangeText={setNome}
              autoFocus
            />

            <Text style={styles.label}>
              {modal.mode === 'create' ? 'Saldo inicial (R$)' : 'Saldo atual (R$)'}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="0,00"
              keyboardType="decimal-pad"
              value={saldo}
              onChangeText={setSaldo}
            />

            <Text style={styles.label}>Tipo</Text>
            <View style={styles.tiposGrid}>
              {TIPOS.map(t => (
                <TouchableOpacity
                  key={t.value}
                  style={[styles.tipoCard, tipo === t.value && styles.tipoCardActive]}
                  onPress={() => setTipo(t.value)}
                >
                  <Text style={styles.tipoEmoji}>{t.emoji}</Text>
                  <Text style={[styles.tipoLabel, tipo === t.value && styles.tipoLabelActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {error !== '' && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => setModal({ mode: 'hidden' })}>
                <Text style={styles.btnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnSave} onPress={handleSalvar} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnSaveText}>Salvar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, paddingBottom: 88 },

  totalCard: {
    backgroundColor: '#1a1a2e', borderRadius: 14, padding: 20,
    alignItems: 'center', marginBottom: 16,
  },
  totalLabel: { fontSize: 13, color: '#aaa', marginBottom: 4 },
  totalValue: { fontSize: 26, fontWeight: 'bold' },

  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 10, elevation: 2,
  },
  cardLeft:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardEmoji: { fontSize: 28 },
  cardNome:  { fontSize: 15, fontWeight: '700', color: '#1a1a2e' },
  cardTipo:  { fontSize: 12, color: '#888', marginTop: 2 },
  cardRight: { alignItems: 'flex-end', gap: 6 },
  cardSaldo: { fontSize: 16, fontWeight: 'bold' },
  deleteBtn: { backgroundColor: '#ffebee', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  deleteBtnText: { color: '#e53935', fontSize: 12, fontWeight: '700' },

  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 16, color: '#888', marginBottom: 6 },
  emptyHint: { fontSize: 13, color: '#aaa' },

  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#4CAF50', justifyContent: 'center', alignItems: 'center',
    elevation: 6,
  },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 32 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, paddingBottom: 40,
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 16 },

  label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6, marginTop: 14 },
  input: {
    backgroundColor: '#f5f5f5', borderRadius: 8, padding: 14,
    fontSize: 16, borderWidth: 1, borderColor: '#e0e0e0',
  },

  tiposGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  tipoCard: {
    flex: 1, minWidth: '45%', borderRadius: 10, borderWidth: 1.5, borderColor: '#e0e0e0',
    backgroundColor: '#fafafa', padding: 12, alignItems: 'center', gap: 4,
  },
  tipoCardActive: { borderColor: '#1a1a2e', backgroundColor: '#1a1a2e' },
  tipoEmoji: { fontSize: 22 },
  tipoLabel: { fontSize: 11, color: '#555', fontWeight: '600', textAlign: 'center' },
  tipoLabelActive: { color: '#fff' },

  errorBox: {
    backgroundColor: '#ffebee', borderRadius: 8, padding: 10,
    marginTop: 12, borderWidth: 1, borderColor: '#ef9a9a',
  },
  errorText: { color: '#c62828', fontSize: 13, textAlign: 'center' },

  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  btnCancel: { flex: 1, borderRadius: 8, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#ddd' },
  btnCancelText: { color: '#666', fontSize: 15 },
  btnSave: { flex: 1, backgroundColor: '#4CAF50', borderRadius: 8, padding: 14, alignItems: 'center' },
  btnSaveText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
});
