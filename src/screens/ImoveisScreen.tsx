import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Modal, TextInput, ActivityIndicator, RefreshControl,
  Image, Platform, KeyboardAvoidingView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../services/api';
import { fmtBRL } from '../utils/currency';
import { useTheme } from '../theme/ThemeContext';
import EmptyState from '../components/EmptyState';
import type { ColorScheme } from '../theme/colors';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ImovelFoto {
  id: string;
  dados: string; // base64 data URL
  ordem: number;
}

interface Imovel {
  id: string;
  descricao: string;
  valor: number;
  pros: string[];
  contras: string[];
  nota: number;
  dataVisita: string;
  nomeCorretor: string | null;
  telefoneCorretor: string | null;
  imobiliaria: string | null;
  tipo: string | null;
  fotos: ImovelFoto[];
}

const TIPOS = [
  { value: 'Condominio', label: '🏘 Condomínio' },
  { value: 'Rua',        label: '🏠 Rua pública' },
];

// ─── API service ──────────────────────────────────────────────────────────────

const imoveisService = {
  getAll: (): Promise<Imovel[]> => api.get('/imoveis').then(r => r.data),
  create: (data: object) => api.post('/imoveis', data).then(r => r.data),
  update: (id: string, data: object) => api.put(`/imoveis/${id}`, data),
  delete: (id: string) => api.delete(`/imoveis/${id}`),
  addFoto: (id: string, dados: string, ordem: number) =>
    api.post(`/imoveis/${id}/fotos`, { dados, ordem }).then(r => r.data),
  removeFoto: (fotoId: string) => api.delete(`/imoveis/fotos/${fotoId}`),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2)  return digits.replace(/^(\d{0,2})/, '($1');
  if (digits.length <= 6)  return digits.replace(/^(\d{2})(\d{0,4})/, '($1) $2');
  if (digits.length <= 10) return digits.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
  return digits.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
}

/** Resize image using canvas (web only) */
async function resizeOnWeb(uri: string, maxPx = 800): Promise<string> {
  return new Promise((resolve) => {
    const img = new (window as any).Image();
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.75));
    };
    img.onerror = () => resolve(uri);
    img.src = uri;
  });
}

function notaColor(nota: number): string {
  if (nota >= 8) return '#3fb950';
  if (nota >= 6) return '#d29922';
  return '#f85149';
}

// ─── Star rating ──────────────────────────────────────────────────────────────

function StarRating({ nota, onSelect, colors }: { nota: number; onSelect?: (n: number) => void; colors: ColorScheme }) {
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {[1,2,3,4,5,6,7,8,9,10].map(n => (
        <TouchableOpacity
          key={n}
          onPress={() => onSelect?.(n)}
          disabled={!onSelect}
          style={{
            width: 28, height: 28, borderRadius: 6,
            backgroundColor: n <= nota ? notaColor(nota) + '33' : colors.surfaceSubtle,
            borderWidth: 1, borderColor: n <= nota ? notaColor(nota) : colors.border,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: '700', color: n <= nota ? notaColor(nota) : colors.textTertiary }}>
            {n}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Tag input — chip style (igual categorias no AddLancamento) ───────────────

function TagInput({
  tags, onChangeTags, placeholder, tagColor, colors,
}: {
  tags: string[];
  onChangeTags: (t: string[]) => void;
  placeholder: string;
  tagColor: string;
  colors: ColorScheme;
}) {
  const [adding, setAdding] = useState(false);
  const [input, setInput]   = useState('');
  const inputRef = React.useRef<TextInput>(null);

  function confirmAdd() {
    const trimmed = input.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChangeTags([...tags, trimmed]);
    }
    setInput('');
    setAdding(false);
  }

  function openInput() {
    setAdding(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {/* Tags existentes */}
      {tags.map(tag => (
        <TouchableOpacity
          key={tag}
          onPress={() => onChangeTags(tags.filter(t => t !== tag))}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 5,
            paddingHorizontal: 12, paddingVertical: 7,
            borderRadius: 20, borderWidth: 1,
            backgroundColor: tagColor + '1A',
            borderColor: tagColor + '66',
          }}
        >
          <Text style={{ fontSize: 13, color: tagColor, fontWeight: '600' }}>{tag}</Text>
          <Text style={{ fontSize: 11, color: tagColor, opacity: 0.7 }}>✕</Text>
        </TouchableOpacity>
      ))}

      {/* Input inline ao adicionar */}
      {adding ? (
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 6,
          borderRadius: 20, borderWidth: 1,
          borderColor: tagColor,
          backgroundColor: tagColor + '1A',
          paddingHorizontal: 12, paddingVertical: 4,
          minWidth: 140,
        }}>
          <TextInput
            ref={inputRef}
            style={{ fontSize: 13, color: colors.text, flex: 1, padding: 0, minWidth: 80 }}
            placeholder={placeholder}
            placeholderTextColor={colors.inputPlaceholder}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={confirmAdd}
            onBlur={confirmAdd}
            returnKeyType="done"
            blurOnSubmit={false}
            autoFocus
          />
          <TouchableOpacity onPress={confirmAdd}>
            <Text style={{ fontSize: 13, color: tagColor, fontWeight: '700' }}>✓</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* Chip "+ Novo" */
        <TouchableOpacity
          onPress={openInput}
          style={{
            paddingHorizontal: 12, paddingVertical: 7,
            borderRadius: 20, borderWidth: 1,
            borderColor: tagColor + '66',
            backgroundColor: 'transparent',
          }}
        >
          <Text style={{ fontSize: 13, color: tagColor, fontWeight: '600' }}>+ Novo</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Empty form state ─────────────────────────────────────────────────────────

function fmtData(iso: string): string {
  const parts = iso.slice(0, 10).split('-');
  if (parts.length !== 3) return iso;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function emptyForm() {
  return {
    descricao: '',
    valorStr: '',
    pros: [] as string[],
    contras: [] as string[],
    nota: 5,
    dataVisita: new Date().toISOString().slice(0, 10),
    nomeCorretor: '',
    telefoneCorretor: '',
    imobiliaria: '',
    tipo: null as string | null,
  };
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ImoveisScreen({ navigation, route }: any) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [imoveis,    setImoveis]    = useState<Imovel[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Form modal
  const [modalOpen,   setModalOpen]   = useState(false);
  const [editTarget,  setEditTarget]  = useState<Imovel | null>(null);
  const [saving,      setSaving]      = useState(false);
  const [saveError,   setSaveError]   = useState<string | null>(null);
  const [form,        setForm]        = useState(emptyForm());

  // Delete confirm
  const [confirmDelete, setConfirmDelete] = useState<Imovel | null>(null);
  const [deleting,      setDeleting]      = useState(false);


  // ── Load ────────────────────────────────────────────────────────────────────
  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const data = await imoveisService.getAll();
      // Sort by nota desc
      setImoveis([...data].sort((a, b) => b.nota - a.nota));
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => {
    load().then(() => {
      const editId = route?.params?.editId;
      if (editId) {
        // Clear param then open edit for the returned item
        navigation.setParams({ editId: undefined });
        imoveisService.getAll().then(list => {
          const item = list.find((i: Imovel) => i.id === editId);
          if (item) openEdit(item);
        });
      }
    });
  }, [load, route?.params?.editId]));

  // ── Open form ───────────────────────────────────────────────────────────────
  function openCreate() {
    setEditTarget(null);
    setForm(emptyForm());
    setSaveError(null);
    setModalOpen(true);
  }

  function openEdit(item: Imovel) {
    setEditTarget(item);
    setForm({
      descricao:        item.descricao,
      valorStr:         applyValorMask(String(Math.round(item.valor * 100))),
      pros:             [...item.pros],
      contras:          [...item.contras],
      nota:             item.nota,
      dataVisita:       item.dataVisita.slice(0, 10),
      nomeCorretor:     item.nomeCorretor ?? '',
      telefoneCorretor: item.telefoneCorretor ? maskPhone(item.telefoneCorretor) : '',
      imobiliaria:      item.imobiliaria ?? '',
      tipo:             item.tipo ?? null,
    });
    setSaveError(null);
    setModalOpen(true);
  }

  // ── Save ────────────────────────────────────────────────────────────────────
  async function salvar() {
    if (!form.descricao.trim()) { setSaveError('Informe a descrição do imóvel.'); return; }
    if (!form.dataVisita) { setSaveError('Informe a data da visita.'); return; }

    const body = {
      descricao:        form.descricao.trim(),
      valor:            maskToNumber(form.valorStr),
      pros:             form.pros,
      contras:          form.contras,
      nota:             form.nota,
      dataVisita:       form.dataVisita,
      nomeCorretor:     form.nomeCorretor.trim() || null,
      telefoneCorretor: form.telefoneCorretor.replace(/\D/g, '') || null,
      imobiliaria:      form.imobiliaria.trim() || null,
      tipo:             form.tipo,
    };

    setSaving(true);
    setSaveError(null);
    try {
      if (editTarget) {
        await imoveisService.update(editTarget.id, body);
      } else {
        await imoveisService.create(body);
      }
      setModalOpen(false);
      await load();
    } catch {
      setSaveError('Não foi possível salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  // ── Delete ──────────────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await imoveisService.delete(confirmDelete.id);
      setConfirmDelete(null);
      await load();
    } catch {}
    finally { setDeleting(false); }
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.green} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(true); }}
          />
        }
      >
        {/* Header row */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>🏠 Imóveis Avaliados</Text>
            <Text style={styles.headerSub}>{imoveis.length} imóvel{imoveis.length !== 1 ? 'is' : ''} · ordenados por nota</Text>
          </View>
          <TouchableOpacity style={styles.btnAdd} onPress={openCreate}>
            <Text style={styles.btnAddText}>+ Adicionar</Text>
          </TouchableOpacity>
        </View>

        {/* Empty */}
        {imoveis.length === 0 && (
          <EmptyState
            title="Nenhum imóvel cadastrado"
            subtitle={"Adicione casas e apartamentos\nque você está avaliando."}
          />
        )}

        {/* Cards */}
        {imoveis.map(item => {
          const thumb = item.fotos.sort((a, b) => a.ordem - b.ordem)[0];
          return (
            <TouchableOpacity
              key={item.id}
              style={styles.card}
              onPress={() => navigation.navigate('ImovelDetail', { imovelId: item.id })}
              activeOpacity={0.85}
            >
              {/* Thumbnail */}
              {thumb ? (
                <Image
                  source={{ uri: thumb.dados }}
                  style={styles.cardThumb}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.cardThumb, styles.cardThumbEmpty]}>
                  <Text style={{ fontSize: 32 }}>🏠</Text>
                </View>
              )}

              <View style={{ flex: 1 }}>
                {/* Title + nota */}
                <View style={styles.cardHeader}>
                  <Text style={styles.cardDescricao} numberOfLines={2}>{item.descricao}</Text>
                  <View style={[styles.notaBadge, { backgroundColor: notaColor(item.nota) + '22', borderColor: notaColor(item.nota) }]}>
                    <Text style={[styles.notaText, { color: notaColor(item.nota) }]}>{item.nota}/10</Text>
                  </View>
                </View>

                {/* Valor */}
                {item.valor > 0 && (
                  <Text style={styles.cardValor}>{fmtBRL(item.valor)}</Text>
                )}

                {/* Tags */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                  {item.pros.slice(0, 3).map(p => (
                    <View key={p} style={styles.tagPro}>
                      <Text style={styles.tagProText}>✓ {p}</Text>
                    </View>
                  ))}
                  {item.contras.slice(0, 2).map(c => (
                    <View key={c} style={styles.tagContra}>
                      <Text style={styles.tagContraText}>✗ {c}</Text>
                    </View>
                  ))}
                  {(item.pros.length > 3 || item.contras.length > 2) && (
                    <Text style={{ fontSize: 11, color: colors.textTertiary, alignSelf: 'center' }}>
                      +{item.pros.length - 3 + item.contras.length - 2} mais
                    </Text>
                  )}
                </View>

                {/* Tipo + Imobiliária */}
                <Text style={styles.cardInfo} numberOfLines={1}>
                  {[
                    item.tipo === 'Condominio' ? '🏘 Condomínio' : item.tipo === 'Rua' ? '🏠 Rua pública' : null,
                    item.imobiliaria,
                    item.nomeCorretor,
                  ].filter(Boolean).join(' · ')}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Form modal ────────────────────────────────────────────────────── */}
      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.formOverlay}>
            <View style={styles.formModal}>
              <Text style={styles.formTitle}>
                {editTarget ? '✏️ Editar imóvel' : '🏠 Novo imóvel'}
              </Text>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Label colors={colors}>Descrição *</Label>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Casa 3 dorms no centro..."
                  placeholderTextColor={colors.inputPlaceholder}
                  value={form.descricao}
                  onChangeText={v => setForm(f => ({ ...f, descricao: v }))}
                />

                <Label colors={colors}>Valor pedido (R$)</Label>
                <TextInput
                  style={styles.input}
                  keyboardType="number-pad"
                  placeholder="0,00"
                  placeholderTextColor={colors.inputPlaceholder}
                  value={form.valorStr}
                  onChangeText={v => setForm(f => ({ ...f, valorStr: applyValorMask(v) }))}
                />

                <Label colors={colors}>Nota (1–10) *</Label>
                <StarRating
                  nota={form.nota}
                  onSelect={n => setForm(f => ({ ...f, nota: n }))}
                  colors={colors}
                />
                <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4, marginBottom: 12 }}>
                  Nota atual: <Text style={{ color: notaColor(form.nota), fontWeight: '700' }}>{form.nota}/10</Text>
                </Text>

                <Label colors={colors}>Data da visita *</Label>
                <TextInput
                  style={styles.input}
                  placeholder="AAAA-MM-DD"
                  placeholderTextColor={colors.inputPlaceholder}
                  value={form.dataVisita}
                  onChangeText={v => setForm(f => ({ ...f, dataVisita: v }))}
                />

                <Label colors={colors}>Tipo de imóvel</Label>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
                  {TIPOS.map(t => {
                    const ativo = form.tipo === t.value;
                    return (
                      <TouchableOpacity
                        key={t.value}
                        onPress={() => setForm(f => ({ ...f, tipo: ativo ? null : t.value }))}
                        style={{
                          paddingHorizontal: 14, paddingVertical: 9,
                          borderRadius: 20, borderWidth: 1,
                          backgroundColor: ativo ? colors.green : colors.inputBg,
                          borderColor: ativo ? colors.green : colors.border,
                        }}
                      >
                        <Text style={{ fontSize: 14, color: ativo ? '#fff' : colors.textSecondary, fontWeight: ativo ? '700' : '400' }}>
                          {t.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Label colors={colors}>Imobiliária</Label>
                <TextInput
                  style={styles.input}
                  placeholder="Nome da imobiliária"
                  placeholderTextColor={colors.inputPlaceholder}
                  value={form.imobiliaria}
                  onChangeText={v => setForm(f => ({ ...f, imobiliaria: v }))}
                />

                <Label colors={colors}>Nome do corretor</Label>
                <TextInput
                  style={styles.input}
                  placeholder="Nome do corretor"
                  placeholderTextColor={colors.inputPlaceholder}
                  value={form.nomeCorretor}
                  onChangeText={v => setForm(f => ({ ...f, nomeCorretor: v }))}
                />

                <Label colors={colors}>Telefone do corretor</Label>
                <TextInput
                  style={styles.input}
                  keyboardType="phone-pad"
                  placeholder="(00) 00000-0000"
                  placeholderTextColor={colors.inputPlaceholder}
                  value={form.telefoneCorretor}
                  onChangeText={v => setForm(f => ({ ...f, telefoneCorretor: maskPhone(v) }))}
                />

                <Label colors={colors}>Pontos positivos</Label>
                <TagInput
                  tags={form.pros}
                  onChangeTags={pros => setForm(f => ({ ...f, pros }))}
                  placeholder="Ex: Boa localização"
                  tagColor="#3fb950"
                  colors={colors}
                />

                <Label colors={colors}>Pontos negativos</Label>
                <TagInput
                  tags={form.contras}
                  onChangeTags={contras => setForm(f => ({ ...f, contras }))}
                  placeholder="Ex: Sem garagem"
                  tagColor="#f85149"
                  colors={colors}
                />

                <View style={{ height: 16 }} />

                {saveError && (
                  <Text style={{ color: '#f85149', fontSize: 13, textAlign: 'center', marginBottom: 8 }}>
                    {saveError}
                  </Text>
                )}
              </ScrollView>

              <View style={styles.formActions}>
                <TouchableOpacity
                  style={styles.btnCancel}
                  onPress={() => { setModalOpen(false); setSaveError(null); }}
                >
                  <Text style={styles.btnCancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnSave} onPress={salvar} disabled={saving}>
                  {saving
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.btnSaveText}>Salvar</Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Delete confirm modal ───────────────────────────────────────────── */}
      <Modal visible={!!confirmDelete} transparent animationType="fade" onRequestClose={() => setConfirmDelete(null)}>
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmModal}>
            <Text style={styles.confirmTitle}>Excluir imóvel?</Text>
            <Text style={styles.confirmText}>
              "{confirmDelete?.descricao}" será removido permanentemente junto com todas as fotos.
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => setConfirmDelete(null)}>
                <Text style={styles.btnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnDeleteConfirm} onPress={handleDelete} disabled={deleting}>
                {deleting
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.btnSaveText}>Excluir</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Small helper component ───────────────────────────────────────────────────

function Label({ children, colors }: { children: React.ReactNode; colors: ColorScheme }) {
  return (
    <Text style={{
      fontSize: 11, fontWeight: '700', color: colors.textSecondary,
      textTransform: 'uppercase', letterSpacing: 0.5,
      marginBottom: 6, marginTop: 12,
    }}>
      {children}
    </Text>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(c: ColorScheme) {
  return StyleSheet.create({
    scroll: { padding: 16, paddingBottom: 40 },

    headerRow: {
      flexDirection: 'row', justifyContent: 'space-between',
      alignItems: 'flex-start', marginBottom: 20,
    },
    headerTitle: { fontSize: 20, fontWeight: '800', color: c.text },
    headerSub:   { fontSize: 12, color: c.textSecondary, marginTop: 2 },

    btnAdd: {
      backgroundColor: c.green, borderRadius: 10,
      paddingHorizontal: 16, paddingVertical: 10,
    },
    btnAddText: { color: '#fff', fontWeight: '700', fontSize: 14 },

    // ── Card ──
    card: {
      backgroundColor: c.surface, borderRadius: 14, padding: 0,
      marginBottom: 12, borderWidth: 1, borderColor: c.border,
      flexDirection: 'row', overflow: 'hidden',
    },
    cardThumb: {
      width: 96,
      alignSelf: 'stretch',
    },
    cardThumbEmpty: {
      backgroundColor: c.surfaceElevated,
      alignItems: 'center', justifyContent: 'center',
    },
    cardHeader: {
      flexDirection: 'row', justifyContent: 'space-between',
      alignItems: 'flex-start', padding: 12, paddingBottom: 4,
    },
    cardDescricao: {
      flex: 1, fontSize: 14, fontWeight: '700', color: c.text,
      marginRight: 8,
    },
    cardValor: { fontSize: 13, fontWeight: '600', color: c.green, paddingHorizontal: 12 },
    cardInfo:  { fontSize: 11, color: c.textTertiary, paddingHorizontal: 12, paddingBottom: 8, marginTop: 4 },

    // ── Nota badge ──
    notaBadge: {
      borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
      borderWidth: 1, alignSelf: 'flex-start',
    },
    notaText: { fontSize: 13, fontWeight: '800' },

    // ── Tags ──
    tagPro: {
      backgroundColor: '#3fb95022', borderRadius: 10,
      paddingHorizontal: 8, paddingVertical: 3,
      borderWidth: 1, borderColor: '#3fb95055',
    },
    tagProText: { fontSize: 11, color: '#3fb950', fontWeight: '600' },
    tagContra: {
      backgroundColor: '#f8514922', borderRadius: 10,
      paddingHorizontal: 8, paddingVertical: 3,
      borderWidth: 1, borderColor: '#f8514955',
    },
    tagContraText: { fontSize: 11, color: '#f85149', fontWeight: '600' },

    // ── Detail modal ──
    detailOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
    detailModal: {
      backgroundColor: c.surfaceElevated,
      borderTopLeftRadius: 20, borderTopRightRadius: 20,
      maxHeight: '92%',
      borderWidth: 1, borderColor: c.border,
    },
    detailPhoto: { width: '100%', height: 240 },
    photoNav: {
      flexDirection: 'row', gap: 6, padding: 8,
      backgroundColor: c.surface,
    },
    photoThumb: {
      width: 52, height: 52, borderRadius: 6,
      borderWidth: 1, borderColor: c.border,
    },
    photoThumbActive: {
      borderWidth: 2, borderColor: c.green,
    },
    photoRemoveBtn: {
      alignSelf: 'flex-end', padding: 8, paddingRight: 12,
      backgroundColor: c.surface,
    },
    addFotoBtn: {
      alignSelf: 'flex-start', padding: 12,
      borderWidth: 1, borderColor: c.green,
      borderRadius: 8, margin: 12, marginTop: 8,
    },
    detailBody: { padding: 16, paddingTop: 0 },
    detailTitleRow: {
      flexDirection: 'row', justifyContent: 'space-between',
      alignItems: 'flex-start', marginBottom: 6,
    },
    detailTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: c.text, marginRight: 8 },
    detailValor: { fontSize: 16, fontWeight: '700', color: c.green, marginBottom: 4 },
    detailDate:  { fontSize: 12, color: c.textSecondary, marginBottom: 8 },
    detailSection: { marginTop: 12 },
    detailSectionTitle: {
      fontSize: 11, fontWeight: '700', color: c.textTertiary,
      textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
    },
    detailInfoText: { fontSize: 14, color: c.text, marginBottom: 4 },
    detailActions: {
      flexDirection: 'row', gap: 8, padding: 16,
      borderTopWidth: 1, borderTopColor: c.border,
    },

    // ── Form modal ──
    formOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
    formModal: {
      backgroundColor: c.surfaceElevated,
      borderTopLeftRadius: 20, borderTopRightRadius: 20,
      padding: 20, maxHeight: '90%',
      borderWidth: 1, borderColor: c.border,
    },
    formTitle: {
      fontSize: 18, fontWeight: '800', color: c.text,
      marginBottom: 8,
    },
    formActions: {
      flexDirection: 'row', gap: 12, marginTop: 12,
    },

    input: {
      backgroundColor: c.inputBg, borderRadius: 8, padding: 12,
      fontSize: 15, borderWidth: 1, borderColor: c.inputBorder, color: c.text,
    },

    // ── Confirm modal ──
    confirmOverlay: {
      flex: 1, backgroundColor: 'rgba(0,0,0,0.65)',
      justifyContent: 'center', alignItems: 'center', padding: 24,
    },
    confirmModal: {
      backgroundColor: c.surfaceElevated, borderRadius: 16, padding: 24,
      width: '100%', maxWidth: 400,
      borderWidth: 1, borderColor: c.border,
    },
    confirmTitle: { fontSize: 18, fontWeight: 'bold', color: c.text, marginBottom: 8 },
    confirmText:  { fontSize: 14, color: c.textSecondary, marginBottom: 20, lineHeight: 20 },
    confirmActions: { flexDirection: 'row', gap: 12 },

    // ── Buttons ──
    btnCancel: {
      flex: 1, borderRadius: 10, padding: 14,
      alignItems: 'center', borderWidth: 1, borderColor: c.border,
    },
    btnCancelText: { color: c.textSecondary, fontSize: 15 },
    btnSave: {
      flex: 1, backgroundColor: c.green, borderRadius: 10,
      padding: 14, alignItems: 'center',
    },
    btnSaveText: { color: '#fff', fontSize: 15, fontWeight: '700' },
    btnClose: {
      flex: 1, borderRadius: 10, padding: 12,
      alignItems: 'center', borderWidth: 1, borderColor: c.border,
    },
    btnCloseText: { color: c.textSecondary, fontSize: 14 },
    btnEdit: {
      flex: 2, backgroundColor: c.green + '22', borderRadius: 10,
      padding: 12, alignItems: 'center',
      borderWidth: 1, borderColor: c.green,
    },
    btnEditText: { color: c.green, fontSize: 14, fontWeight: '700' },
    btnDelete: {
      backgroundColor: c.redDim, borderRadius: 10,
      padding: 12, paddingHorizontal: 16, alignItems: 'center',
      borderWidth: 1, borderColor: c.red,
    },
    btnDeleteConfirm: {
      flex: 1, backgroundColor: '#f85149', borderRadius: 10,
      padding: 14, alignItems: 'center',
    },
  });
}
