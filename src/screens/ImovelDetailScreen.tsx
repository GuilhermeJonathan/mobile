import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Image, ActivityIndicator, Platform, useWindowDimensions,
  Modal, TextInput, KeyboardAvoidingView, PanResponder,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../services/api';
import { fmtBRL } from '../utils/currency';
import { useTheme } from '../theme/ThemeContext';
import type { ColorScheme } from '../theme/colors';

const MAX_FOTOS = 10;

interface ImovelFoto { id: string; dados: string; ordem: number; }
interface ImovelComentario { id: string; texto: string; criadoEm: string; }
interface Imovel {
  id: string; descricao: string; valor: number;
  pros: string[]; contras: string[]; nota: number;
  dataVisita: string; nomeCorretor: string | null;
  telefoneCorretor: string | null; imobiliaria: string | null;
  tipo: string | null;
  fotos: ImovelFoto[];
  comentarios: ImovelComentario[];
}

function notaColor(n: number) {
  return n >= 8 ? '#3fb950' : n >= 6 ? '#d29922' : '#f85149';
}

async function resizeOnWeb(uri: string, maxPx = 1200): Promise<string> {
  return new Promise((resolve) => {
    const img = new (window as any).Image();
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.78));
    };
    img.onerror = () => resolve(uri);
    img.src = uri;
  });
}

function fmtData(iso: string): string {
  // iso pode vir como "2025-05-01T00:00:00Z" ou "2025-05-01"
  const parts = iso.slice(0, 10).split('-');
  if (parts.length !== 3) return iso;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

// ─── Lightbox modal ───────────────────────────────────────────────────────────

function Lightbox({
  fotos, index, onChangeIndex, onClose, colors,
}: {
  fotos: ImovelFoto[];
  index: number;
  onChangeIndex: (i: number) => void;
  onClose: () => void;
  colors: ColorScheme;
}) {
  const { width, height } = useWindowDimensions();
  const sorted = [...fotos].sort((a, b) => a.ordem - b.ordem);
  const current = sorted[index] ?? sorted[0];

  // Refs para evitar closure stale dentro do PanResponder
  const indexRef = useRef(index);
  const totalRef = useRef(sorted.length);
  indexRef.current = index;
  totalRef.current = sorted.length;

  const swipe = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8,
      onPanResponderRelease: (_, g) => {
        if (g.dx < -50 && indexRef.current < totalRef.current - 1)
          onChangeIndex(indexRef.current + 1);
        else if (g.dx > 50 && indexRef.current > 0)
          onChangeIndex(indexRef.current - 1);
      },
    }),
  ).current;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      {/* Dark backdrop */}
      <View
        style={{
          flex: 1, backgroundColor: 'rgba(0,0,0,0.95)',
          justifyContent: 'center', alignItems: 'center',
        }}
        {...swipe.panHandlers}
      >
        {/* Close */}
        <TouchableOpacity
          onPress={onClose}
          style={{
            position: 'absolute', top: 16, right: 16, zIndex: 10,
            backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20,
            width: 40, height: 40, alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#fff', fontSize: 20, lineHeight: 24 }}>✕</Text>
        </TouchableOpacity>

        {/* Counter */}
        <View style={{
          position: 'absolute', top: 20, left: 0, right: 0,
          alignItems: 'center', zIndex: 5,
        }}>
          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>
            {index + 1} / {sorted.length}
          </Text>
        </View>

        {/* Image — natural size, contain */}
        <Image
          source={{ uri: current.dados }}
          style={{ width, height: height * 0.8 }}
          resizeMode="contain"
        />

        {/* Prev arrow */}
        {index > 0 && (
          <TouchableOpacity
            onPress={() => onChangeIndex(index - 1)}
            style={{
              position: 'absolute', left: 8, top: '50%' as any,
              backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 24,
              width: 44, height: 44, alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontSize: 22 }}>‹</Text>
          </TouchableOpacity>
        )}

        {/* Next arrow */}
        {index < sorted.length - 1 && (
          <TouchableOpacity
            onPress={() => onChangeIndex(index + 1)}
            style={{
              position: 'absolute', right: 8, top: '50%' as any,
              backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 24,
              width: 44, height: 44, alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontSize: 22 }}>›</Text>
          </TouchableOpacity>
        )}

        {/* Dot strip */}
        {sorted.length > 1 && (
          <View style={{
            position: 'absolute', bottom: 24,
            flexDirection: 'row', gap: 6, justifyContent: 'center',
          }}>
            {sorted.map((_, i) => (
              <TouchableOpacity key={i} onPress={() => onChangeIndex(i)}>
                <View style={{
                  width: i === index ? 20 : 7, height: 7, borderRadius: 4,
                  backgroundColor: i === index ? '#fff' : 'rgba(255,255,255,0.35)',
                }} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </Modal>
  );
}

// ─── Photo carousel (strip + thumbnails + controls) ──────────────────────────

function Carousel({
  fotos,
  index,
  onChangeIndex,
  onAdd,
  onRemove,
  adding,
  removing,
  canAdd,
  colors,
}: {
  fotos: ImovelFoto[];
  index: number;
  onChangeIndex: (i: number) => void;
  onAdd: () => void;
  onRemove: () => void;
  adding: boolean;
  removing: boolean;
  canAdd: boolean;
  colors: ColorScheme;
}) {
  const [lightbox, setLightbox] = useState(false);
  const sorted = [...fotos].sort((a, b) => a.ordem - b.ordem);

  if (fotos.length === 0) {
    return (
      <View style={{
        backgroundColor: colors.surfaceElevated,
        alignItems: 'center', justifyContent: 'center',
        paddingVertical: 40,
      }}>
        <Text style={{ fontSize: 52 }}>🏠</Text>
        <Text style={{ color: colors.textTertiary, marginTop: 8, fontSize: 13 }}>Sem fotos</Text>
        {canAdd && (
          <TouchableOpacity
            style={{
              marginTop: 16, paddingHorizontal: 20, paddingVertical: 10,
              borderRadius: 10, borderWidth: 1, borderColor: colors.green,
            }}
            onPress={onAdd}
            disabled={adding}
          >
            {adding
              ? <ActivityIndicator size="small" color={colors.green} />
              : <Text style={{ color: colors.green, fontWeight: '600' }}>📷 Adicionar foto</Text>
            }
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={{ backgroundColor: colors.surface }}>
      {/* Lightbox — abre ao clicar em qualquer miniatura */}
      {lightbox && (
        <Lightbox
          fotos={fotos}
          index={index}
          onChangeIndex={onChangeIndex}
          onClose={() => setLightbox(false)}
          colors={colors}
        />
      )}

      {/* Thumbnail strip — clique abre lightbox */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 12, paddingVertical: 10, gap: 6, flexDirection: 'row',
        }}
      >
        {sorted.map((f, i) => (
          <TouchableOpacity
            key={f.id}
            onPress={() => { onChangeIndex(i); setLightbox(true); }}
            activeOpacity={0.8}
          >
            <Image
              source={{ uri: f.dados }}
              style={{
                width: 72, height: 72, borderRadius: 10,
                borderWidth: 2,
                borderColor: colors.border,
              }}
              resizeMode="cover"
            />
          </TouchableOpacity>
        ))}

        {/* + Add chip */}
        {canAdd && (
          <TouchableOpacity
            onPress={onAdd}
            disabled={adding}
            style={{
              width: 72, height: 72, borderRadius: 10,
              borderWidth: 1.5, borderStyle: 'dashed',
              borderColor: colors.green, backgroundColor: colors.green + '11',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            {adding
              ? <ActivityIndicator size="small" color={colors.green} />
              : <Text style={{ fontSize: 28, color: colors.green }}>+</Text>
            }
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Remove — mostra foto atual e botão remover */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 14, paddingBottom: 8,
      }}>
        <Text style={{ fontSize: 12, color: colors.textTertiary }}>
          {sorted.length} foto{sorted.length !== 1 ? 's' : ''} · toque para ampliar
        </Text>
        <TouchableOpacity
          onPress={onRemove}
          disabled={removing}
        >
          {removing
            ? <ActivityIndicator size="small" color={colors.red} />
            : <Text style={{ color: colors.red, fontSize: 12, fontWeight: '600' }}>🗑 Remover</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function ImovelDetailScreen({ route, navigation }: any) {
  const { imovelId } = route.params as { imovelId: string };
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [imovel,    setImovel]    = useState<Imovel | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [fotoIndex, setFotoIndex] = useState(0);
  const [addingFoto,   setAddingFoto]   = useState(false);
  const [removingFoto, setRemovingFoto] = useState(false);

  // Comentários
  const [novoComentario,   setNovoComentario]   = useState('');
  const [sendingComentario, setSendingComentario] = useState(false);
  const [removingComentId, setRemovingComentId]  = useState<string | null>(null);
  const comentInputRef = useRef<TextInput>(null);

  // Delete confirm
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting,      setDeleting]      = useState(false);

  const load = useCallback(async () => {
    try {
      const data: Imovel = await api.get(`/imoveis/${imovelId}`).then(r => r.data);
      setImovel(data);
    } catch {}
    finally { setLoading(false); }
  }, [imovelId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function handleAddFoto() {
    if (!imovel) return;
    if (imovel.fotos.length >= MAX_FOTOS) return;

    let uri: string | null = null;
    if (Platform.OS === 'web') {
      uri = await new Promise<string | null>((resolve) => {
        const input = document.createElement('input');
        input.type = 'file'; input.accept = 'image/*';
        input.onchange = async (e: any) => {
          const file = e.target.files?.[0];
          if (!file) { resolve(null); return; }
          const reader = new FileReader();
          reader.onload = async (ev) => {
            const raw = ev.target?.result as string;
            resolve(raw ? await resizeOnWeb(raw) : null);
          };
          reader.readAsDataURL(file);
        };
        input.click();
      });
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.75, base64: true,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        uri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
      }
    }

    if (!uri) return;
    setAddingFoto(true);
    try {
      const nextOrdem = imovel.fotos.length > 0
        ? Math.max(...imovel.fotos.map(f => f.ordem)) + 1 : 0;
      await api.post(`/imoveis/${imovel.id}/fotos`, { dados: uri, ordem: nextOrdem });
      const updated: Imovel = await api.get(`/imoveis/${imovel.id}`).then(r => r.data);
      setImovel(updated);
      setFotoIndex(updated.fotos.length - 1);
    } catch {}
    finally { setAddingFoto(false); }
  }

  async function handleRemoveFoto() {
    if (!imovel) return;
    const sorted = [...imovel.fotos].sort((a, b) => a.ordem - b.ordem);
    const fotoId = sorted[fotoIndex]?.id;
    if (!fotoId) return;
    setRemovingFoto(true);
    try {
      await api.delete(`/imoveis/fotos/${fotoId}`);
      const updated: Imovel = await api.get(`/imoveis/${imovel.id}`).then(r => r.data);
      setImovel(updated);
      setFotoIndex(Math.max(0, fotoIndex - 1));
    } catch {}
    finally { setRemovingFoto(false); }
  }

  async function handleAddComentario() {
    if (!imovel || !novoComentario.trim()) return;
    setSendingComentario(true);
    try {
      await api.post(`/imoveis/${imovel.id}/comentarios`, { texto: novoComentario.trim() });
      setNovoComentario('');
      const updated: Imovel = await api.get(`/imoveis/${imovel.id}`).then(r => r.data);
      setImovel(updated);
    } catch {}
    finally { setSendingComentario(false); }
  }

  async function handleRemoveComentario(comentarioId: string) {
    if (!imovel) return;
    setRemovingComentId(comentarioId);
    try {
      await api.delete(`/imoveis/comentarios/${comentarioId}`);
      const updated: Imovel = await api.get(`/imoveis/${imovel.id}`).then(r => r.data);
      setImovel(updated);
    } catch {}
    finally { setRemovingComentId(null); }
  }

  async function handleDelete() {
    if (!imovel) return;
    setDeleting(true);
    try {
      await api.delete(`/imoveis/${imovel.id}`);
      setConfirmDelete(false);
      navigation.goBack();
    } catch {}
    finally { setDeleting(false); }
  }

  if (loading || !imovel) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.green} />
      </View>
    );
  }

  const canAdd = imovel.fotos.length < MAX_FOTOS;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* ── Carousel ── */}
        <Carousel
          fotos={imovel.fotos}
          index={fotoIndex}
          onChangeIndex={setFotoIndex}
          onAdd={handleAddFoto}
          onRemove={handleRemoveFoto}
          adding={addingFoto}
          removing={removingFoto}
          canAdd={canAdd}
          colors={colors}
        />

        {/* ── Info ── */}
        <View style={styles.body}>
          {/* Title + nota */}
          <View style={styles.titleRow}>
            <Text style={styles.title}>{imovel.descricao}</Text>
            <View style={[styles.notaBadge, {
              backgroundColor: notaColor(imovel.nota) + '22',
              borderColor: notaColor(imovel.nota),
            }]}>
              <Text style={[styles.notaVal, { color: notaColor(imovel.nota) }]}>
                {imovel.nota}/10
              </Text>
            </View>
          </View>

          {imovel.valor > 0 && (
            <Text style={styles.valor}>{fmtBRL(imovel.valor)}</Text>
          )}

          <Text style={styles.dataVisita}>
            📅 Visita: {fmtData(imovel.dataVisita)}
          </Text>

          {imovel.tipo && (
            <View style={{
              alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center',
              backgroundColor: colors.surfaceElevated, borderRadius: 10,
              paddingHorizontal: 10, paddingVertical: 4,
              borderWidth: 1, borderColor: colors.border, marginBottom: 8,
            }}>
              <Text style={{ fontSize: 13, color: colors.text, fontWeight: '600' }}>
                {imovel.tipo === 'Condominio' ? '🏘 Condomínio' : '🏠 Rua pública'}
              </Text>
            </View>
          )}

          {/* Fotos count */}
          <Text style={styles.fotoCount}>
            📷 {imovel.fotos.length}/{MAX_FOTOS} fotos
            {!canAdd && <Text style={{ color: colors.textTertiary }}> · limite atingido</Text>}
          </Text>

          {/* Contato */}
          {(imovel.imobiliaria || imovel.nomeCorretor || imovel.telefoneCorretor) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Contato</Text>
              {imovel.imobiliaria && (
                <Text style={styles.infoLine}>🏢  {imovel.imobiliaria}</Text>
              )}
              {imovel.nomeCorretor && (
                <Text style={styles.infoLine}>👤  {imovel.nomeCorretor}</Text>
              )}
              {imovel.telefoneCorretor && (
                <Text style={styles.infoLine}>📞  {imovel.telefoneCorretor}</Text>
              )}
            </View>
          )}

          {/* Pros */}
          {imovel.pros.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Pontos positivos</Text>
              <View style={styles.tagRow}>
                {imovel.pros.map(p => (
                  <View key={p} style={styles.tagPro}>
                    <Text style={styles.tagProText}>✓ {p}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Contras */}
          {imovel.contras.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Pontos negativos</Text>
              <View style={styles.tagRow}>
                {imovel.contras.map(c => (
                  <View key={c} style={styles.tagContra}>
                    <Text style={styles.tagContraText}>✗ {c}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ── Comentários ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              💬 Comentários{imovel.comentarios.length > 0 ? ` (${imovel.comentarios.length})` : ''}
            </Text>

            {/* Lista */}
            {imovel.comentarios.length === 0 && (
              <Text style={{ fontSize: 13, color: colors.textTertiary, marginBottom: 12 }}>
                Nenhum comentário ainda.
              </Text>
            )}
            {imovel.comentarios.map(c => (
              <View key={c.id} style={styles.comentarioCard}>
                <Text style={styles.comentarioTexto}>{c.texto}</Text>
                <View style={styles.comentarioFooter}>
                  <Text style={styles.comentarioData}>{fmtData(c.criadoEm)}</Text>
                  <TouchableOpacity
                    onPress={() => handleRemoveComentario(c.id)}
                    disabled={removingComentId === c.id}
                  >
                    {removingComentId === c.id
                      ? <ActivityIndicator size="small" color={colors.red} />
                      : <Text style={{ fontSize: 12, color: colors.red }}>🗑</Text>
                    }
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {/* Input novo comentário */}
            <View style={styles.comentarioInput}>
              <TextInput
                ref={comentInputRef}
                style={styles.comentarioTextInput}
                placeholder="Adicionar comentário…"
                placeholderTextColor={colors.inputPlaceholder}
                value={novoComentario}
                onChangeText={setNovoComentario}
                multiline
                maxLength={2000}
                returnKeyType="send"
                onSubmitEditing={handleAddComentario}
              />
              <TouchableOpacity
                style={[
                  styles.comentarioEnviarBtn,
                  { opacity: novoComentario.trim() ? 1 : 0.4 },
                ]}
                onPress={handleAddComentario}
                disabled={sendingComentario || !novoComentario.trim()}
              >
                {sendingComentario
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Enviar</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* ── Bottom bar ── */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.btnEdit}
          onPress={() => {
            navigation.navigate('Main', {
              screen: 'Imoveis',
              params: { editId: imovel.id },
            });
          }}
        >
          <Text style={styles.btnEditText}>✏️  Editar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.btnDelete}
          onPress={() => setConfirmDelete(true)}
        >
          <Text style={styles.btnDeleteText}>🗑  Excluir</Text>
        </TouchableOpacity>
      </View>

      {/* ── Delete confirm ── */}
      <Modal visible={confirmDelete} transparent animationType="fade" onRequestClose={() => setConfirmDelete(false)}>
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmModal}>
            <Text style={styles.confirmTitle}>Excluir imóvel?</Text>
            <Text style={styles.confirmText}>
              "{imovel.descricao}" será removido permanentemente junto com todas as fotos.
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity style={styles.btnCancelModal} onPress={() => setConfirmDelete(false)}>
                <Text style={styles.btnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnDeleteConfirm} onPress={handleDelete} disabled={deleting}>
                {deleting
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Excluir</Text>
                }
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
    body: { padding: 18, paddingTop: 14 },

    titleRow: {
      flexDirection: 'row', justifyContent: 'space-between',
      alignItems: 'flex-start', marginBottom: 6,
    },
    title:    { flex: 1, fontSize: 20, fontWeight: '800', color: c.text, marginRight: 10 },
    valor:    { fontSize: 18, fontWeight: '700', color: c.green, marginBottom: 6 },
    dataVisita: { fontSize: 13, color: c.textSecondary, marginBottom: 4 },
    fotoCount:  { fontSize: 12, color: c.textTertiary, marginBottom: 16 },

    notaBadge: {
      borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4,
      borderWidth: 1, alignSelf: 'flex-start',
    },
    notaVal: { fontSize: 15, fontWeight: '800' },

    section:      { marginTop: 16 },
    sectionTitle: {
      fontSize: 11, fontWeight: '700', color: c.textTertiary,
      textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10,
    },
    infoLine: { fontSize: 14, color: c.text, marginBottom: 5 },

    tagRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    tagPro:      {
      backgroundColor: '#3fb95022', borderRadius: 16,
      paddingHorizontal: 12, paddingVertical: 5,
      borderWidth: 1, borderColor: '#3fb95055',
    },
    tagProText:  { fontSize: 13, color: '#3fb950', fontWeight: '600' },
    tagContra:   {
      backgroundColor: '#f8514922', borderRadius: 16,
      paddingHorizontal: 12, paddingVertical: 5,
      borderWidth: 1, borderColor: '#f8514955',
    },
    tagContraText: { fontSize: 13, color: '#f85149', fontWeight: '600' },

    // ── Comentários ──
    comentarioCard: {
      backgroundColor: c.surfaceElevated,
      borderRadius: 10, padding: 12,
      marginBottom: 8,
      borderWidth: 1, borderColor: c.border,
    },
    comentarioTexto: { fontSize: 14, color: c.text, lineHeight: 20 },
    comentarioFooter: {
      flexDirection: 'row', justifyContent: 'space-between',
      alignItems: 'center', marginTop: 6,
    },
    comentarioData: { fontSize: 11, color: c.textTertiary },
    comentarioInput: {
      flexDirection: 'row', gap: 8,
      marginTop: 10, alignItems: 'flex-end',
    },
    comentarioTextInput: {
      flex: 1, backgroundColor: c.inputBg,
      borderRadius: 10, padding: 10,
      fontSize: 14, color: c.text,
      borderWidth: 1, borderColor: c.inputBorder,
      maxHeight: 100,
    },
    comentarioEnviarBtn: {
      backgroundColor: c.green, borderRadius: 10,
      paddingHorizontal: 16, paddingVertical: 10,
      alignSelf: 'flex-end',
    },

    // ── Bottom bar ──
    bottomBar: {
      flexDirection: 'row', gap: 12, padding: 14,
      borderTopWidth: 1, borderTopColor: c.border,
      backgroundColor: c.surface,
    },
    btnEdit: {
      flex: 1, backgroundColor: c.green, borderRadius: 12,
      paddingVertical: 14, alignItems: 'center',
    },
    btnEditText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    btnDelete: {
      flex: 1, backgroundColor: c.redDim, borderRadius: 12,
      paddingVertical: 14, alignItems: 'center',
      borderWidth: 1, borderColor: c.red,
    },
    btnDeleteText: { color: c.red, fontWeight: '700', fontSize: 15 },

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
    btnCancelModal: {
      flex: 1, borderRadius: 10, padding: 14,
      alignItems: 'center', borderWidth: 1, borderColor: c.border,
    },
    btnCancelText: { color: c.textSecondary, fontSize: 15 },
    btnDeleteConfirm: {
      flex: 1, backgroundColor: '#f85149', borderRadius: 10,
      padding: 14, alignItems: 'center',
    },
  });
}
