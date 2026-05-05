import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Modal, TextInput,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { categoriasService } from '../services/api';
import { Categoria, TipoLancamento } from '../types';
import { useTheme } from '../theme/ThemeContext';
import EmptyState from '../components/EmptyState';
import type { ColorScheme } from '../theme/colors';

// ─── Constants ────────────────────────────────────────────────────────────────

const ICONES = [
  '🛒','🍔','🍕','☕','🍺','🎬','🎮','✈️','🏠','💡',
  '🚗','⛽','💊','🏥','🐾','👕','📱','🎓','💼','📚',
  '💰','📈','🎁','🔧','🏋️','🎵','🏖️','🌿','🍷','🧾',
];

const CORES = [
  '#e53935','#f4511e','#fb8c00','#f6bf26','#33b679',
  '#0b8043','#039be5','#3f51b5','#8e24aa','#795548',
  '#546e7a','#616161',
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function CategoriasScreen() {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');

  // ── Modal ──────────────────────────────────────────────────────────────────
  const [modalVisible, setModalVisible] = useState(false);
  const [editando, setEditando]         = useState<Categoria | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Categoria | null>(null);
  const [deleting, setDeleting]           = useState(false);
  const [nome, setNome]                 = useState('');
  const [tipo, setTipo]                 = useState<TipoLancamento>(TipoLancamento.Debito);
  const [icone, setIcone]               = useState('');
  const [cor, setCor]                   = useState(CORES[4]);
  const [saving, setSaving]             = useState(false);

  // ── Load ───────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    try {
      const data = await categoriasService.getAll();
      setCategorias(data);
    } catch {
      setError('Erro ao carregar categorias.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  // ── Abrir modal ────────────────────────────────────────────────────────────
  function abrirNova() {
    setEditando(null);
    setNome('');
    setTipo(TipoLancamento.Debito);
    setIcone(ICONES[0]);
    setCor(CORES[4]);
    setError('');
    setModalVisible(true);
  }

  function abrirEditar(cat: Categoria) {
    setEditando(cat);
    setNome(cat.nome);
    setTipo(cat.tipo);
    setIcone(cat.icone ?? ICONES[0]);
    setCor(cat.cor ?? CORES[4]);
    setError('');
    setModalVisible(true);
  }

  function fecharModal() {
    setModalVisible(false);
    setEditando(null);
    setError('');
  }

  // ── Salvar ─────────────────────────────────────────────────────────────────
  async function handleSalvar() {
    if (!nome.trim()) { setError('Informe o nome.'); return; }
    setSaving(true);
    setError('');
    try {
      const payload = { nome: nome.trim(), tipo, icone: icone || null, cor: cor || null };
      if (editando) {
        await categoriasService.update(editando.id, payload);
      } else {
        await categoriasService.create(payload);
      }
      fecharModal();
      await load();
    } catch {
      setError('Erro ao salvar categoria.');
    } finally {
      setSaving(false);
    }
  }

  // ── Excluir ────────────────────────────────────────────────────────────────
  function confirmarExcluir(cat: Categoria) {
    setConfirmDelete(cat);
  }

  async function handleExcluirConfirmado() {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await categoriasService.delete(confirmDelete.id);
      setConfirmDelete(null);
      await load();
    } catch {
      setError('Erro ao excluir categoria.');
      setConfirmDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  // ── Agrupamento ────────────────────────────────────────────────────────────
  const debitos  = useMemo(() => categorias.filter(c => c.tipo === TipoLancamento.Debito),  [categorias]);
  const creditos = useMemo(() => categorias.filter(c => c.tipo === TipoLancamento.Credito), [categorias]);

  // ─────────────────────────────────────────────────────────────────────────
  if (loading) return (
    <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color={colors.green} />
    </View>
  );

  const renderItem = (cat: Categoria) => (
    <View key={cat.id} style={s.item}>
      <View style={[s.iconBox, { backgroundColor: (cat.cor ?? CORES[4]) + '33' }]}>
        <Text style={s.iconText}>{cat.icone ?? '🏷️'}</Text>
      </View>
      <View style={[s.colorDot, { backgroundColor: cat.cor ?? CORES[4] }]} />
      <Text style={s.itemNome} numberOfLines={1}>{cat.nome}</Text>
      <TouchableOpacity style={s.btnAct} onPress={() => abrirEditar(cat)}>
        <Text style={s.btnActText}>✏️</Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.btnAct} onPress={() => confirmarExcluir(cat)}>
        <Text style={s.btnActText}>🗑</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <>
      <FlatList
        style={s.container}
        data={[]}
        renderItem={null}
        ListHeaderComponent={
          <View style={{ paddingBottom: 80 }}>
            {error !== '' && (
              <View style={s.errorBox}><Text style={s.errorText}>{error}</Text></View>
            )}

            {categorias.length === 0 ? (
              <EmptyState
                title="Nenhuma categoria ainda 🏷️"
                subtitle={"Crie categorias para organizar\nseus lançamentos."}
                action={{ label: '+ Adicionar categoria', onPress: abrirNova }}
              />
            ) : (
              <>
                {debitos.length > 0 && (
                  <View style={s.section}>
                    <View style={s.sectionHeader}>
                      <Text style={s.sectionTitle}>💸 Despesas</Text>
                      <Text style={s.sectionCount}>{debitos.length}</Text>
                    </View>
                    {debitos.map(renderItem)}
                  </View>
                )}

                {creditos.length > 0 && (
                  <View style={s.section}>
                    <View style={s.sectionHeader}>
                      <Text style={s.sectionTitle}>💰 Receitas</Text>
                      <Text style={s.sectionCount}>{creditos.length}</Text>
                    </View>
                    {creditos.map(renderItem)}
                  </View>
                )}
              </>
            )}
          </View>
        }
        contentContainerStyle={{ padding: 12 }}
      />

      {/* FAB */}
      {categorias.length > 0 && (
        <TouchableOpacity style={s.fab} onPress={abrirNova}>
          <Text style={s.fabText}>+</Text>
        </TouchableOpacity>
      )}

      {/* ── Modal confirmar exclusão ─────────────────────────────────────── */}
      <Modal visible={!!confirmDelete} transparent animationType="fade" onRequestClose={() => setConfirmDelete(null)}>
        <View style={s.overlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>Excluir categoria</Text>
            <Text style={{ fontSize: 14, color: s.btnCancelText.color, marginTop: 8, marginBottom: 20, lineHeight: 20 }}>
              Deseja excluir <Text style={{ fontWeight: 'bold', color: '#fff' }}>"{confirmDelete?.nome}"</Text>?{'\n'}
              Lançamentos vinculados perderão a categoria.
            </Text>
            <View style={s.modalActions}>
              <TouchableOpacity style={s.btnCancel} onPress={() => setConfirmDelete(null)} disabled={deleting}>
                <Text style={s.btnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.btnSave, { backgroundColor: '#e53935' }]}
                onPress={handleExcluirConfirmado}
                disabled={deleting}
              >
                {deleting
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={s.btnSaveText}>Excluir</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Modal criar / editar ────────────────────────────────────────────── */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={fecharModal}>
        <View style={s.overlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>{editando ? 'Editar Categoria' : 'Nova Categoria'}</Text>

            {/* Tipo */}
            <Text style={s.label}>Tipo</Text>
            <View style={s.chips}>
              {[
                { label: '💸 Despesa', value: TipoLancamento.Debito },
                { label: '💰 Receita', value: TipoLancamento.Credito },
              ].map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[s.chip, tipo === opt.value && s.chipActive]}
                  onPress={() => setTipo(opt.value)}
                >
                  <Text style={[s.chipText, tipo === opt.value && s.chipTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Nome */}
            <Text style={s.label}>Nome</Text>
            <TextInput
              style={s.input}
              placeholder="Ex: Alimentação, Transporte..."
              placeholderTextColor={colors.inputPlaceholder}
              value={nome}
              onChangeText={setNome}
              autoFocus
            />

            {/* Ícone */}
            <Text style={s.label}>Ícone</Text>
            <View style={s.iconeGrid}>
              {ICONES.map(ic => (
                <TouchableOpacity
                  key={ic}
                  style={[s.iconeBtn, icone === ic && { borderColor: cor, borderWidth: 2 }]}
                  onPress={() => setIcone(ic)}
                >
                  <Text style={s.iconeBtnText}>{ic}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Cor */}
            <Text style={s.label}>Cor</Text>
            <View style={s.coresRow}>
              {CORES.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[s.corBtn, { backgroundColor: c }, cor === c && s.corBtnActive]}
                  onPress={() => setCor(c)}
                />
              ))}
            </View>

            {/* Preview */}
            <View style={[s.preview, { backgroundColor: cor + '22', borderColor: cor + '55' }]}>
              <View style={[s.previewIconBox, { backgroundColor: cor + '33' }]}>
                <Text style={{ fontSize: 20 }}>{icone || '🏷️'}</Text>
              </View>
              <Text style={[s.previewNome, { color: cor }]}>{nome || 'Nome da categoria'}</Text>
            </View>

            {error !== '' && (
              <View style={s.errorBox}><Text style={s.errorText}>{error}</Text></View>
            )}

            <View style={s.modalActions}>
              <TouchableOpacity style={s.btnCancel} onPress={fecharModal}>
                <Text style={s.btnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.btnSave, { backgroundColor: cor }]} onPress={handleSalvar} disabled={saving}>
                {saving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={s.btnSaveText}>{editando ? 'Salvar' : 'Criar'}</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(c: ColorScheme) {
  return StyleSheet.create({
    container:    { flex: 1, backgroundColor: c.background },
    errorBox:     { backgroundColor: c.redDim, borderRadius: 8, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: c.redBorder },
    errorText:    { color: c.redBorder, fontSize: 13, textAlign: 'center' },

    section:      { marginBottom: 16 },
    sectionHeader:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, paddingHorizontal: 4 },
    sectionTitle: { fontSize: 14, fontWeight: '700', color: c.textSecondary, letterSpacing: 0.5 },
    sectionCount: { fontSize: 12, color: c.textTertiary, backgroundColor: c.surfaceElevated, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },

    item:         { flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderRadius: 10, padding: 12, marginBottom: 6, gap: 10 },
    iconBox:      { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    iconText:     { fontSize: 18 },
    colorDot:     { width: 8, height: 8, borderRadius: 4 },
    itemNome:     { flex: 1, fontSize: 15, fontWeight: '500', color: c.text },
    btnAct:       { padding: 4 },
    btnActText:   { fontSize: 16 },

    fab:          { position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: c.green, justifyContent: 'center', alignItems: 'center', elevation: 5 },
    fabText:      { color: '#fff', fontSize: 28, lineHeight: 32 },

    overlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modal:        { backgroundColor: c.surfaceElevated, borderRadius: 16, padding: 24, width: '100%', maxWidth: 480, borderWidth: 1, borderColor: c.border },
    modalTitle:   { fontSize: 18, fontWeight: 'bold', color: c.text, marginBottom: 4 },

    label:        { fontSize: 12, fontWeight: '700', color: c.textSecondary, marginTop: 14, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
    input:        { backgroundColor: c.inputBg, borderRadius: 8, padding: 12, fontSize: 16, borderWidth: 1, borderColor: c.inputBorder, color: c.text },

    chips:        { flexDirection: 'row', gap: 8 },
    chip:         { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, borderWidth: 1, borderColor: c.inputBorder, backgroundColor: c.inputBg },
    chipActive:   { backgroundColor: c.green, borderColor: c.green },
    chipText:     { fontSize: 14, color: c.textSecondary },
    chipTextActive:{ color: '#fff', fontWeight: '600' },

    iconeGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    iconeBtn:     { width: 42, height: 42, borderRadius: 10, backgroundColor: c.inputBg, borderWidth: 1, borderColor: c.inputBorder, alignItems: 'center', justifyContent: 'center' },
    iconeBtnText: { fontSize: 20 },

    coresRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    corBtn:       { width: 28, height: 28, borderRadius: 14 },
    corBtnActive: { borderWidth: 3, borderColor: '#fff', transform: [{ scale: 1.15 }] } as any,

    preview:      { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 10, padding: 12, marginTop: 14, borderWidth: 1 },
    previewIconBox:{ width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    previewNome:  { fontSize: 15, fontWeight: '700' },

    modalActions: { flexDirection: 'row', gap: 12, marginTop: 18 },
    btnCancel:    { flex: 1, borderRadius: 8, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: c.border },
    btnCancelText:{ color: c.textSecondary, fontSize: 15 },
    btnSave:      { flex: 1, borderRadius: 8, padding: 14, alignItems: 'center' },
    btnSaveText:  { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  });
}
