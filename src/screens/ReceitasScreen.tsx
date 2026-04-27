import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, TextInput, Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { receitasRecorrentesService } from '../services/api';
import { ReceitaRecorrente, TipoReceita } from '../types';
import { fmtBRL } from '../utils/currency';
import { useTheme } from '../theme/ThemeContext';
import type { ColorScheme } from '../theme/colors';

// ─── helpers ──────────────────────────────────────────────────────────────────
function calcValor(tipo: TipoReceita, valor: string, vh: string, qh: string): number {
  if (tipo === TipoReceita.Horista) {
    const v = parseFloat(vh.replace(',', '.'));
    const q = parseFloat(qh.replace(',', '.'));
    return isNaN(v) || isNaN(q) ? 0 : v * q;
  }
  return parseFloat(valor.replace(',', '.')) || 0;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ReceitasScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [receitas, setReceitas] = useState<ReceitaRecorrente[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // ── Modal criar ─────────────────────────────────────────────────────────────
  const [criarVisible, setCriarVisible] = useState(false);
  const [cNome, setCNome] = useState('');
  const [cTipo, setCTipo] = useState<TipoReceita>(TipoReceita.Fixo);
  const [cValor, setCValor] = useState('');
  const [cValorHora, setCValorHora] = useState('');
  const [cQtdHoras, setCQtdHoras] = useState('');
  const [cDia, setCDia] = useState('1');
  const [cMeses, setCMeses] = useState('12');
  const [saving, setSaving] = useState(false);

  // ── Modal editar ─────────────────────────────────────────────────────────────
  const [editando, setEditando] = useState<ReceitaRecorrente | null>(null);
  const [eNome, setENome] = useState('');
  const [eTipo, setETipo] = useState<TipoReceita>(TipoReceita.Fixo);
  const [eValor, setEValor] = useState('');
  const [eValorHora, setEValorHora] = useState('');
  const [eQtdHoras, setEQtdHoras] = useState('');
  const [eDia, setEDia] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [confirmarFuturos, setConfirmarFuturos] = useState(false);

  // ── Modal excluir ────────────────────────────────────────────────────────────
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);

  // ── Load ─────────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    try {
      const data = await receitasRecorrentesService.getAll();
      setReceitas(data);
    } catch {
      setError('Erro ao carregar receitas.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  // ── Criar ────────────────────────────────────────────────────────────────────
  async function handleCriar() {
    if (!cNome.trim()) { setError('Informe o nome.'); return; }
    const valorCalculado = calcValor(cTipo, cValor, cValorHora, cQtdHoras);
    if (valorCalculado <= 0) {
      setError(cTipo === TipoReceita.Horista
        ? 'Informe valor/hora e quantidade válidos.'
        : 'Informe um valor válido.');
      return;
    }
    const diaNum = Math.min(28, Math.max(1, parseInt(cDia) || 1));
    const mesesNum = Math.max(1, parseInt(cMeses) || 12);

    setSaving(true);
    setError('');
    try {
      await receitasRecorrentesService.create({
        nome: cNome.trim(),
        tipo: cTipo,
        dia: diaNum,
        meses: mesesNum,
        valor: cTipo === TipoReceita.Fixo ? valorCalculado : undefined,
        valorHora: cTipo === TipoReceita.Horista ? parseFloat(cValorHora.replace(',', '.')) : undefined,
        quantidadeHoras: cTipo === TipoReceita.Horista ? parseFloat(cQtdHoras.replace(',', '.')) : undefined,
      });
      resetCriar();
      setCriarVisible(false);
      await load();
    } catch {
      setError('Erro ao criar receita.');
    } finally {
      setSaving(false);
    }
  }

  function resetCriar() {
    setCNome(''); setCTipo(TipoReceita.Fixo); setCValor('');
    setCValorHora(''); setCQtdHoras(''); setCDia('1'); setCMeses('12');
  }

  // ── Editar ───────────────────────────────────────────────────────────────────
  function abrirEdicao(r: ReceitaRecorrente) {
    setEditando(r);
    setENome(r.nome);
    setETipo(r.tipo);
    setEValor(r.tipo === TipoReceita.Fixo ? String(r.valor).replace('.', ',') : '');
    setEValorHora(r.valorHora ? String(r.valorHora).replace('.', ',') : '');
    setEQtdHoras(r.quantidadeHoras ? String(r.quantidadeHoras).replace('.', ',') : '');
    setEDia(String(r.dia));
    setError('');
    setConfirmarFuturos(false);
  }

  function fecharEdicao() {
    setEditando(null);
    setConfirmarFuturos(false);
    setError('');
  }

  function handleEditarAvancar() {
    if (!eNome.trim()) { setError('Informe o nome.'); return; }
    const v = calcValor(eTipo, eValor, eValorHora, eQtdHoras);
    if (v <= 0) {
      setError(eTipo === TipoReceita.Horista
        ? 'Informe valor/hora e quantidade válidos.'
        : 'Informe um valor válido.');
      return;
    }
    setError('');
    setConfirmarFuturos(true);
  }

  async function handleEditarSalvar(aplicarFuturos: boolean) {
    if (!editando) return;
    const diaNum = Math.min(28, Math.max(1, parseInt(eDia) || 1));
    setEditSaving(true);
    try {
      await receitasRecorrentesService.update(editando.id, {
        nome: eNome.trim(),
        tipo: eTipo,
        dia: diaNum,
        aplicarFuturos,
        valor: eTipo === TipoReceita.Fixo ? parseFloat(eValor.replace(',', '.')) : undefined,
        valorHora: eTipo === TipoReceita.Horista ? parseFloat(eValorHora.replace(',', '.')) : undefined,
        quantidadeHoras: eTipo === TipoReceita.Horista ? parseFloat(eQtdHoras.replace(',', '.')) : undefined,
      });
      fecharEdicao();
      await load();
    } catch {
      setError('Erro ao salvar alterações.');
    } finally {
      setEditSaving(false);
    }
  }

  // ── Excluir ──────────────────────────────────────────────────────────────────
  async function handleExcluir() {
    if (!deletingId) return;
    try {
      await receitasRecorrentesService.delete(deletingId);
      setConfirmDeleteVisible(false);
      setDeletingId(null);
      await load();
    } catch {
      setError('Erro ao excluir receita.');
      setConfirmDeleteVisible(false);
    }
  }

  // ── Preview do valor calculado ───────────────────────────────────────────────
  const previewCriar = cTipo === TipoReceita.Horista
    ? calcValor(TipoReceita.Horista, '', cValorHora, cQtdHoras)
    : 0;

  const previewEditar = eTipo === TipoReceita.Horista
    ? calcValor(TipoReceita.Horista, '', eValorHora, eQtdHoras)
    : 0;

  const totalMensal = receitas.reduce((s, r) => s + r.valor, 0);

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color={colors.green} />
    </View>
  );

  return (
    <>
      <FlatList
        style={styles.container}
        data={receitas}
        keyExtractor={r => r.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        ListHeaderComponent={
          <View>
            {receitas.length > 0 && (
              <View style={styles.totalCard}>
                <Text style={styles.totalLabel}>Receita Recorrente Mensal</Text>
                <Text style={styles.totalValor}>{fmtBRL(totalMensal)}</Text>
                <Text style={styles.totalSub}>{receitas.length} receita{receitas.length > 1 ? 's' : ''} ativa{receitas.length > 1 ? 's' : ''}</Text>
              </View>
            )}
            {error !== '' && !criarVisible && !editando && (
              <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>
            )}
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.empty}>Nenhuma receita recorrente.{'\n'}Toque em + para adicionar.</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardLeft}>
                <Text style={styles.cardNome}>💰 {item.nome}</Text>
                <Text style={styles.cardDia}>Todo dia {item.dia} · {item.tipo === TipoReceita.Horista ? 'Horista' : 'Fixo'}</Text>
                {item.tipo === TipoReceita.Horista && item.valorHora != null && (
                  <Text style={styles.cardHorista}>
                    {fmtBRL(item.valorHora)}/h × {item.quantidadeHoras}h
                  </Text>
                )}
              </View>
              <View style={styles.cardRight}>
                <Text style={styles.cardValor}>{fmtBRL(item.valor)}</Text>
                <View style={styles.cardActions}>
                  <TouchableOpacity onPress={() => abrirEdicao(item)} style={styles.btnAction}>
                    <Text style={styles.btnActionText}>✏️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => { setDeletingId(item.id); setConfirmDeleteVisible(true); }} style={styles.btnAction}>
                    <Text style={styles.btnActionText}>🗑</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        )}
        contentContainerStyle={{ padding: 12, paddingBottom: 80 }}
      />

      <TouchableOpacity style={styles.fab} onPress={() => { setError(''); setCriarVisible(true); }}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* ── Modal Criar ─────────────────────────────────────────────────────── */}
      <Modal visible={criarVisible} transparent animationType="fade" onRequestClose={() => setCriarVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Nova Receita Recorrente</Text>

            <Text style={styles.label}>Tipo</Text>
            <View style={styles.chips}>
              {([TipoReceita.Fixo, TipoReceita.Horista] as TipoReceita[]).map(t => (
                <TouchableOpacity key={t} style={[styles.chip, cTipo === t && styles.chipActive]} onPress={() => setCTipo(t)}>
                  <Text style={[styles.chipText, cTipo === t && styles.chipTextActive]}>
                    {t === TipoReceita.Fixo ? '💵 Fixo' : '⏱ Horista'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Nome</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Salário, Freelance..."
              placeholderTextColor={colors.inputPlaceholder}
              value={cNome}
              onChangeText={setCNome}
            />

            {cTipo === TipoReceita.Fixo ? (
              <>
                <Text style={styles.label}>Valor (R$)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0,00"
                  placeholderTextColor={colors.inputPlaceholder}
                  keyboardType="decimal-pad"
                  value={cValor}
                  onChangeText={setCValor}
                />
              </>
            ) : (
              <>
                <View style={styles.row}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.label}>Valor por hora (R$)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="0,00"
                      placeholderTextColor={colors.inputPlaceholder}
                      keyboardType="decimal-pad"
                      value={cValorHora}
                      onChangeText={setCValorHora}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Qtd. de horas</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="0"
                      placeholderTextColor={colors.inputPlaceholder}
                      keyboardType="decimal-pad"
                      value={cQtdHoras}
                      onChangeText={setCQtdHoras}
                    />
                  </View>
                </View>
                {previewCriar > 0 && (
                  <View style={styles.previewBox}>
                    <Text style={styles.previewText}>Total mensal: {fmtBRL(previewCriar)}</Text>
                  </View>
                )}
              </>
            )}

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.label}>Dia do mês (1–28)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="1"
                  placeholderTextColor={colors.inputPlaceholder}
                  keyboardType="number-pad"
                  value={cDia}
                  onChangeText={t => setCDia(t.replace(/\D/g, '') || '1')}
                  maxLength={2}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Repetir (meses)</Text>
                <View style={styles.stepperRow}>
                  <TouchableOpacity style={styles.stepBtn} onPress={() => setCMeses(String(Math.max(1, (parseInt(cMeses) || 12) - 1)))}>
                    <Text style={styles.stepBtnText}>−</Text>
                  </TouchableOpacity>
                  <TextInput
                    style={styles.stepInput}
                    keyboardType="number-pad"
                    value={cMeses}
                    onChangeText={t => setCMeses(t.replace(/\D/g, '') || '1')}
                  />
                  <TouchableOpacity style={styles.stepBtn} onPress={() => setCMeses(String((parseInt(cMeses) || 12) + 1))}>
                    <Text style={styles.stepBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {error !== '' && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => { setCriarVisible(false); resetCriar(); setError(''); }}>
                <Text style={styles.btnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnSave} onPress={handleCriar} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnSaveText}>Salvar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Modal Editar ─────────────────────────────────────────────────────── */}
      <Modal visible={!!editando} transparent animationType="fade" onRequestClose={fecharEdicao}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            {!confirmarFuturos ? (
              <>
                <Text style={styles.modalTitle}>Editar Receita</Text>

                <Text style={styles.label}>Tipo</Text>
                <View style={styles.chips}>
                  {([TipoReceita.Fixo, TipoReceita.Horista] as TipoReceita[]).map(t => (
                    <TouchableOpacity key={t} style={[styles.chip, eTipo === t && styles.chipActive]} onPress={() => setETipo(t)}>
                      <Text style={[styles.chipText, eTipo === t && styles.chipTextActive]}>
                        {t === TipoReceita.Fixo ? '💵 Fixo' : '⏱ Horista'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.label}>Nome</Text>
                <TextInput style={styles.input} value={eNome} onChangeText={setENome} autoFocus />

                {eTipo === TipoReceita.Fixo ? (
                  <>
                    <Text style={styles.label}>Valor (R$)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="0,00"
                      placeholderTextColor={colors.inputPlaceholder}
                      keyboardType="decimal-pad"
                      value={eValor}
                      onChangeText={setEValor}
                    />
                  </>
                ) : (
                  <>
                    <View style={styles.row}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={styles.label}>Valor por hora (R$)</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="0,00"
                          placeholderTextColor={colors.inputPlaceholder}
                          keyboardType="decimal-pad"
                          value={eValorHora}
                          onChangeText={setEValorHora}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.label}>Qtd. de horas</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="0"
                          placeholderTextColor={colors.inputPlaceholder}
                          keyboardType="decimal-pad"
                          value={eQtdHoras}
                          onChangeText={setEQtdHoras}
                        />
                      </View>
                    </View>
                    {previewEditar > 0 && (
                      <View style={styles.previewBox}>
                        <Text style={styles.previewText}>Total mensal: {fmtBRL(previewEditar)}</Text>
                      </View>
                    )}
                  </>
                )}

                <Text style={styles.label}>Dia do mês (1–28)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="number-pad"
                  value={eDia}
                  onChangeText={t => setEDia(t.replace(/\D/g, '') || '1')}
                  maxLength={2}
                />

                {error !== '' && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.btnCancel} onPress={fecharEdicao}>
                    <Text style={styles.btnCancelText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.btnSave} onPress={handleEditarAvancar}>
                    <Text style={styles.btnSaveText}>Avançar →</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.modalTitle}>Aplicar nos futuros?</Text>
                <Text style={styles.modalSub}>
                  Deseja atualizar também os lançamentos de Crédito já gerados para os próximos meses?
                </Text>
                <TouchableOpacity style={[styles.btnSave, { marginBottom: 10 }]} onPress={() => handleEditarSalvar(true)} disabled={editSaving}>
                  {editSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnSaveText}>Sim, atualizar os futuros</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btnSave, { backgroundColor: '#607D8B', marginBottom: 10 }]} onPress={() => handleEditarSalvar(false)} disabled={editSaving}>
                  {editSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnSaveText}>Não, só salvar a receita</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnCancel} onPress={() => setConfirmarFuturos(false)}>
                  <Text style={styles.btnCancelText}>← Voltar</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Modal Excluir ────────────────────────────────────────────────────── */}
      <Modal visible={confirmDeleteVisible} transparent animationType="fade" onRequestClose={() => setConfirmDeleteVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Excluir Receita</Text>
            <Text style={styles.modalSub}>
              Remove esta receita e todos os lançamentos futuros vinculados.{'\n'}
              Lançamentos passados são mantidos.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => { setConfirmDeleteVisible(false); setDeletingId(null); }}>
                <Text style={styles.btnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btnSave, { backgroundColor: '#e53935' }]} onPress={handleExcluir}>
                <Text style={styles.btnSaveText}>Excluir</Text>
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
    totalCard: { backgroundColor: c.green, borderRadius: 12, padding: 20, marginBottom: 12, alignItems: 'center' },
    totalLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 13 },
    totalValor: { color: '#fff', fontSize: 28, fontWeight: 'bold', marginTop: 4 },
    totalSub: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 4 },
    card: { backgroundColor: c.surface, borderRadius: 12, padding: 16, marginBottom: 10 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cardLeft: { flex: 1 },
    cardNome: { fontSize: 16, fontWeight: 'bold', color: c.text },
    cardDia: { fontSize: 13, color: c.textSecondary, marginTop: 2 },
    cardHorista: { fontSize: 12, color: c.green, marginTop: 2 },
    cardRight: { alignItems: 'flex-end', gap: 6 },
    cardValor: { fontSize: 16, fontWeight: 'bold', color: c.green },
    cardActions: { flexDirection: 'row', gap: 8 },
    btnAction: { padding: 4 },
    btnActionText: { fontSize: 18 },
    empty: { textAlign: 'center', marginTop: 60, color: c.textSecondary, fontSize: 16, lineHeight: 26 },
    fab: { position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: c.green, justifyContent: 'center', alignItems: 'center', elevation: 5 },
    fabText: { color: '#fff', fontSize: 28, lineHeight: 32 },
    errorBox: { backgroundColor: c.redDim, borderRadius: 8, padding: 12, marginTop: 8, borderWidth: 1, borderColor: c.redBorder },
    errorText: { color: c.redBorder, fontSize: 14, textAlign: 'center' },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    modal: { backgroundColor: c.surfaceElevated, borderRadius: 16, padding: 24, width: '100%', maxWidth: 420, borderWidth: 1, borderColor: c.border },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: c.text, marginBottom: 6 },
    modalSub: { fontSize: 13, color: c.textSecondary, marginBottom: 4, lineHeight: 18 },
    label: { fontSize: 13, fontWeight: '600', color: c.textSecondary, marginBottom: 6, marginTop: 12, textTransform: 'uppercase', letterSpacing: 0.4 },
    input: { backgroundColor: c.inputBg, borderRadius: 8, padding: 12, fontSize: 16, borderWidth: 1, borderColor: c.inputBorder, color: c.text },
    row: { flexDirection: 'row' },
    chips: { flexDirection: 'row', gap: 8, marginTop: 4 },
    chip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, borderWidth: 1, borderColor: c.inputBorder, backgroundColor: c.inputBg },
    chipActive: { backgroundColor: c.green, borderColor: c.green },
    chipText: { fontSize: 14, color: c.textSecondary },
    chipTextActive: { color: '#fff', fontWeight: '600' },
    previewBox: { backgroundColor: c.greenDim, borderRadius: 8, padding: 10, marginTop: 8, alignItems: 'center', borderWidth: 1, borderColor: c.greenBorder },
    previewText: { color: c.green, fontSize: 15, fontWeight: 'bold' },
    stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
    stepBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: c.green, justifyContent: 'center', alignItems: 'center' },
    stepBtnText: { color: '#fff', fontSize: 20, lineHeight: 24 },
    stepInput: { width: 50, textAlign: 'center', backgroundColor: c.inputBg, borderRadius: 8, padding: 6, fontSize: 16, fontWeight: 'bold', borderWidth: 1, borderColor: c.inputBorder, color: c.text },
    modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
    btnCancel: { flex: 1, borderRadius: 8, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: c.border },
    btnCancelText: { color: c.textSecondary, fontSize: 15 },
    btnSave: { flex: 1, backgroundColor: c.green, borderRadius: 8, padding: 14, alignItems: 'center' },
    btnSaveText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  });
}
