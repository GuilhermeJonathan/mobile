import React, { useCallback, useMemo, useState } from 'react';

function applyValorMask(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  const num = parseInt(digits, 10);
  const reais = Math.floor(num / 100);
  const cents = num % 100;
  const reaisStr = reais === 0 ? '0' : reais.toLocaleString('pt-BR');
  return `${reaisStr},${String(cents).padStart(2, '0')}`;
}

function maskToNumber(masked: string): number | null {
  if (!masked.trim()) return null;
  const val = parseFloat(masked.replace(/\./g, '').replace(',', '.'));
  return isNaN(val) ? null : val;
}
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Modal, TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { categoriasService, OrcamentoItem } from '../services/api';
import { fmtBRL } from '../utils/currency';
import { useTheme } from '../theme/ThemeContext';
import EmptyState from '../components/EmptyState';
import type { ColorScheme } from '../theme/colors';

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

function BarraProgresso({ gasto, limite, colors }: { gasto: number; limite: number; colors: ColorScheme }) {
  const pct    = Math.min(gasto / limite, 1);
  const over   = gasto > limite;
  const cor    = over ? colors.red : pct >= 0.8 ? colors.orange : colors.green;
  return (
    <View style={{ height: 6, backgroundColor: colors.border, borderRadius: 3, marginTop: 8 }}>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: cor, width: `${pct * 100}%` as any }} />
    </View>
  );
}

export default function OrcamentoScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());
  const [itens, setItens]   = useState<OrcamentoItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal de edição de limite
  const [modalItem, setModalItem]   = useState<OrcamentoItem | null>(null);
  const [limiteInput, setLimiteInput] = useState('');
  const [saving, setSaving]         = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItens(await categoriasService.getOrcamento(mes, ano));
    } finally {
      setLoading(false);
    }
  }, [mes, ano]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function navMes(delta: number) {
    const d = new Date(ano, mes - 1 + delta, 1);
    setMes(d.getMonth() + 1);
    setAno(d.getFullYear());
  }

  function abrirModal(item: OrcamentoItem) {
    setModalItem(item);
    setLimiteInput(item.limiteMensal != null ? applyValorMask(String(Math.round(item.limiteMensal * 100))) : '');
  }

  async function salvarLimite() {
    if (!modalItem) return;
    const limite = maskToNumber(limiteInput);
    setSaving(true);
    try {
      await categoriasService.atualizarLimite(modalItem.categoriaId, limite);
      setModalItem(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  const totalGasto  = itens.reduce((s, i) => s + i.gastoAtual, 0);
  const totalLimite = itens.filter(i => i.limiteMensal).reduce((s, i) => s + (i.limiteMensal ?? 0), 0);
  const comLimite   = itens.filter(i => i.limiteMensal != null);
  const semLimite   = itens.filter(i => i.limiteMensal == null);
  const estouradas  = comLimite.filter(i => i.gastoAtual > (i.limiteMensal ?? 0)).length;

  return (
    <View style={styles.container}>
      {/* Nav mês */}
      <View style={styles.navMes}>
        <TouchableOpacity onPress={() => navMes(-1)} style={styles.navBtn}>
          <Text style={styles.navArrow}>◀</Text>
        </TouchableOpacity>
        <Text style={styles.navLabel}>{MESES[mes - 1]}/{ano}</Text>
        <TouchableOpacity onPress={() => navMes(1)} style={styles.navBtn}>
          <Text style={styles.navArrow}>▶</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.green} size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>

          {/* Resumo geral */}
          {comLimite.length > 0 && (
            <View style={styles.resumoCard}>
              <View style={styles.resumoRow}>
                <Text style={styles.resumoLabel}>Total gasto</Text>
                <Text style={[styles.resumoValor, { color: colors.red }]}>{fmtBRL(totalGasto)}</Text>
              </View>
              <View style={styles.resumoRow}>
                <Text style={styles.resumoLabel}>Total orçado</Text>
                <Text style={[styles.resumoValor, { color: colors.green }]}>{fmtBRL(totalLimite)}</Text>
              </View>
              {estouradas > 0 && (
                <View style={styles.alertaRow}>
                  <Text style={styles.alertaText}>
                    🔴 {estouradas} categoria{estouradas > 1 ? 's' : ''} acima do limite
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Categorias com limite */}
          {comLimite.length > 0 && (
            <>
              <Text style={styles.secTitle}>Com limite definido</Text>
              {comLimite.map(item => {
                const pct    = item.limiteMensal ? item.gastoAtual / item.limiteMensal : 0;
                const over   = item.gastoAtual > (item.limiteMensal ?? 0);
                const cor    = over ? colors.red : pct >= 0.8 ? colors.orange : colors.green;
                return (
                  <TouchableOpacity key={item.categoriaId} style={styles.card} onPress={() => abrirModal(item)}>
                    <View style={styles.cardHeader}>
                      <Text style={styles.cardNome}>{item.categoriaNome}</Text>
                      <Text style={[styles.cardPct, { color: cor }]}>
                        {(pct * 100).toFixed(0)}%
                      </Text>
                    </View>
                    <BarraProgresso gasto={item.gastoAtual} limite={item.limiteMensal!} colors={colors} />
                    <View style={styles.cardFooter}>
                      <Text style={styles.cardGasto}>{fmtBRL(item.gastoAtual)} gastos</Text>
                      <Text style={styles.cardLimite}>de {fmtBRL(item.limiteMensal!)} · {over ? <Text style={{ color: colors.red }}>Excedido</Text> : `${fmtBRL(item.limiteMensal! - item.gastoAtual)} restam`}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </>
          )}

          {/* Categorias sem limite */}
          {semLimite.length > 0 && (
            <>
              <Text style={styles.secTitle}>Sem limite — toque para definir</Text>
              {semLimite.map(item => (
                <TouchableOpacity key={item.categoriaId} style={[styles.card, styles.cardSemLimite]} onPress={() => abrirModal(item)}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardNome}>{item.categoriaNome}</Text>
                    <Text style={styles.cardDefinir}>+ Definir</Text>
                  </View>
                  <Text style={styles.cardGasto}>{fmtBRL(item.gastoAtual)} gastos este mês</Text>
                </TouchableOpacity>
              ))}
            </>
          )}

          {itens.length === 0 && (
            <EmptyState
              title="Nenhum gasto este mês! 📋"
              subtitle={"Quando você registrar lançamentos,\nas categorias com orçamento aparecem aqui."}
            />
          )}
        </ScrollView>
      )}

      {/* Modal editar limite */}
      <Modal visible={!!modalItem} transparent animationType="fade" onRequestClose={() => setModalItem(null)}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{modalItem?.categoriaNome}</Text>
            <Text style={styles.modalSub}>
              Gasto atual: {fmtBRL(modalItem?.gastoAtual ?? 0)}
            </Text>
            <Text style={styles.modalLabel}>Limite mensal (R$)</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="number-pad"
              placeholder="0,00  (vazio = sem limite)"
              placeholderTextColor={colors.inputPlaceholder}
              value={limiteInput}
              onChangeText={v => setLimiteInput(applyValorMask(v))}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => setModalItem(null)}>
                <Text style={styles.btnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnSave} onPress={salvarLimite} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnSaveText}>Salvar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function makeStyles(c: ColorScheme) {
  return StyleSheet.create({
    container:   { flex: 1, backgroundColor: c.background },
    centered:    { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 8 },
    scroll:      { padding: 16, paddingBottom: 40 },

    navMes: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 20, paddingVertical: 14,
      backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.border,
    },
    navBtn:   { padding: 8 },
    navArrow: { color: c.green, fontSize: 16 },
    navLabel: { fontSize: 18, fontWeight: 'bold', color: c.text },

    resumoCard: {
      backgroundColor: c.surfaceElevated, borderRadius: 12, padding: 16,
      marginBottom: 20, borderWidth: 1, borderColor: c.border, gap: 8,
    },
    resumoRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    resumoLabel: { fontSize: 14, color: c.textSecondary },
    resumoValor: { fontSize: 16, fontWeight: '700' },
    alertaRow:   { backgroundColor: c.redDim, borderRadius: 8, padding: 10, marginTop: 4 },
    alertaText:  { color: c.red, fontSize: 13, fontWeight: '600' },

    secTitle: { fontSize: 12, fontWeight: '700', color: c.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 4 },

    card: {
      backgroundColor: c.surface, borderRadius: 12, padding: 16,
      marginBottom: 10, borderWidth: 1, borderColor: c.border,
    },
    cardSemLimite: { borderStyle: 'dashed', opacity: 0.8 },
    cardHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cardNome:     { fontSize: 15, fontWeight: '600', color: c.text },
    cardPct:      { fontSize: 15, fontWeight: '700' },
    cardDefinir:  { fontSize: 13, color: c.green, fontWeight: '600' },
    cardFooter:   { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
    cardGasto:    { fontSize: 12, color: c.textSecondary },
    cardLimite:   { fontSize: 12, color: c.textSecondary },

    emptyIcon:  { fontSize: 48, marginBottom: 8 },
    emptyTitle: { fontSize: 18, fontWeight: 'bold', color: c.text },
    emptyText:  { fontSize: 14, color: c.textSecondary, textAlign: 'center', lineHeight: 20 },

    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    modal:   { backgroundColor: c.surfaceElevated, borderRadius: 16, padding: 24, width: '100%', maxWidth: 420, borderWidth: 1, borderColor: c.border },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: c.text, marginBottom: 4 },
    modalSub:   { fontSize: 13, color: c.textSecondary, marginBottom: 16 },
    modalLabel: { fontSize: 12, fontWeight: '600', color: c.textSecondary, textTransform: 'uppercase', marginBottom: 6 },
    modalInput: {
      backgroundColor: c.inputBg, borderRadius: 8, padding: 14,
      fontSize: 16, borderWidth: 1, borderColor: c.inputBorder, color: c.text,
    },
    modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
    btnCancel:    { flex: 1, borderRadius: 8, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: c.border },
    btnCancelText: { color: c.textSecondary, fontSize: 15 },
    btnSave:      { flex: 1, backgroundColor: c.green, borderRadius: 8, padding: 14, alignItems: 'center' },
    btnSaveText:  { color: '#fff', fontSize: 15, fontWeight: '600' },
  });
}
