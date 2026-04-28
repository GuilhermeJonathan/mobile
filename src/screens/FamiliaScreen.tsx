import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, TextInput, Alert, RefreshControl, Platform, Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { vinculosService, VinculoDto, MeuVinculoDto } from '../services/api';
import { authService } from '../services/authService';
import { useTheme } from '../theme/ThemeContext';
import type { ColorScheme } from '../theme/colors';

export default function FamiliaScreen() {
  const { colors } = useTheme();
  const s = makeStyles(colors);

  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [meuVinculo, setMeuVinculo] = useState<MeuVinculoDto | null>(null);
  const [membros, setMembros]       = useState<VinculoDto[]>([]);

  // Gerar convite
  const [gerandoCodigo, setGerandoCodigo] = useState(false);
  const [codigoGerado, setCodigoGerado]   = useState<string | null>(null);

  // Aceitar convite
  const [codigoInput, setCodigoInput]   = useState('');
  const [aceitando, setAceitando]       = useState(false);

  // Confirmação customizada (web)
  const [confirmModal, setConfirmModal] = useState<{
    title: string; message: string; onConfirm: () => void;
  } | null>(null);

  const load = useCallback(async () => {
    try {
      const [vinculo, lista] = await Promise.all([
        vinculosService.meuVinculo(),
        vinculosService.listar(),
      ]);
      setMeuVinculo(vinculo);
      setMembros(lista);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function gerarConvite() {
    setGerandoCodigo(true);
    try {
      const { codigo } = await vinculosService.gerarConvite();
      setCodigoGerado(codigo);
      await load();
    } finally {
      setGerandoCodigo(false);
    }
  }

  async function aceitarConvite() {
    const codigo = codigoInput.trim().toUpperCase();
    if (codigo.length < 6) return;
    const userInfo = await authService.getUserInfo();
    const nome = userInfo?.name ?? userInfo?.email ?? 'Membro';
    setAceitando(true);
    try {
      await vinculosService.aceitarConvite(codigo, nome);
      setCodigoInput('');
      Alert.alert('✅ Vinculado!', 'Você agora enxerga os dados da família. Reinicie o app para ver as mudanças.');
      await load();
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? 'Código inválido ou já utilizado.';
      Alert.alert('Erro', msg);
    } finally {
      setAceitando(false);
    }
  }

  function confirmar(title: string, message: string, onConfirm: () => void) {
    if (Platform.OS === 'web') {
      setConfirmModal({ title, message, onConfirm });
    } else {
      Alert.alert(title, message, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Confirmar', style: 'destructive', onPress: onConfirm },
      ]);
    }
  }

  async function sairDaFamilia() {
    if (!meuVinculo?.vinculoId) return;
    confirmar(
      'Sair da família',
      'Você voltará a ver apenas seus próprios dados. Confirmar?',
      async () => {
        try {
          await vinculosService.remover(meuVinculo.vinculoId!);
          setMeuVinculo(null);
          await load();
        } catch (e: any) {
          const msg = e?.response?.data?.message ?? 'Erro ao sair da família.';
          Alert.alert('Erro', msg);
        }
      }
    );
  }

  async function removerMembro(id: string, nome: string) {
    confirmar(
      'Remover membro',
      `Remover "${nome}" da família?`,
      async () => {
        try {
          await vinculosService.remover(id);
          await load();
        } catch (e: any) {
          const msg = e?.response?.data?.message ?? 'Erro ao remover membro.';
          Alert.alert('Erro', msg);
        }
      }
    );
  }

  // ── Modal de confirmação (web) ────────────────────────────────────────────
  const ConfirmModal = confirmModal ? (
    <Modal visible transparent animationType="fade" onRequestClose={() => setConfirmModal(null)}>
      <View style={s.confirmOverlay}>
        <View style={s.confirmCard}>
          <Text style={s.confirmTitle}>{confirmModal.title}</Text>
          <Text style={s.confirmMsg}>{confirmModal.message}</Text>
          <View style={s.confirmActions}>
            <TouchableOpacity style={s.confirmCancelBtn} onPress={() => setConfirmModal(null)}>
              <Text style={s.confirmCancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.confirmDestroyBtn}
              onPress={() => { setConfirmModal(null); confirmModal.onConfirm(); }}
            >
              <Text style={s.confirmDestroyText}>Confirmar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  ) : null;

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator color={colors.green} size="large" />
      </View>
    );
  }

  // ── Usuário é membro de outra família ──────────────────────────────────────
  if (meuVinculo?.ehMembro) {
    return (
      <View style={{ flex: 1 }}>
        {ConfirmModal}
        <ScrollView
          style={{ flex: 1, backgroundColor: colors.background }}
          contentContainerStyle={s.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        >
          <View style={s.bannerCard}>
            <Text style={s.bannerIcon}>👨‍👩‍👧</Text>
            <Text style={s.bannerTitle}>Você está em uma família</Text>
            <Text style={s.bannerSub}>
              Você está vendo e operando os dados de outro usuário.{'\n'}
              Qualquer lançamento que você criar vai para a conta da família.
            </Text>
            <TouchableOpacity style={s.sairBtn} onPress={sairDaFamilia}>
              <Text style={s.sairText}>Sair da família</Text>
            </TouchableOpacity>
          </View>

          <Text style={s.secTitle}>Como funciona</Text>
          <View style={s.infoCard}>
            {[
              ['📊', 'Dashboard, lançamentos e saldos são do dono da família'],
              ['➕', 'Tudo que você adicionar é salvo na conta da família'],
              ['🔒', 'Seus próprios dados ficam preservados — basta sair para vê-los'],
            ].map(([icon, text]) => (
              <View key={text} style={s.infoRow}>
                <Text style={s.infoIcon}>{icon}</Text>
                <Text style={s.infoText}>{text}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── Usuário é dono / sem vínculo ───────────────────────────────────────────
  const membrosAceitos  = membros.filter(m => m.aceito);
  const membrosPendentes = membros.filter(m => !m.aceito);

  return (
    <View style={{ flex: 1 }}>
      {ConfirmModal}
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      >
      {/* ── Membros ativos ─────────────────────────────────────────────── */}
      {membrosAceitos.length > 0 && (
        <>
          <Text style={s.secTitle}>Membros da família</Text>
          <View style={s.listCard}>
            {membrosAceitos.map((m, i) => (
              <View
                key={m.id}
                style={[s.membroRow, i < membrosAceitos.length - 1 && s.membroRowBorder]}
              >
                <View style={s.membroAvatar}>
                  <Text style={s.membroAvatarText}>{m.nomeMembro[0]?.toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.membroNome}>{m.nomeMembro}</Text>
                  <Text style={s.membroSub}>
                    Desde {new Date(m.criadoEm).toLocaleDateString('pt-BR')}
                  </Text>
                </View>
                <TouchableOpacity
                  style={s.removerBtn}
                  onPress={() => removerMembro(m.id, m.nomeMembro)}
                >
                  <Text style={s.removerText}>Remover</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </>
      )}

      {/* ── Pendentes ──────────────────────────────────────────────────── */}
      {membrosPendentes.length > 0 && (
        <>
          <Text style={s.secTitle}>Convites pendentes</Text>
          <View style={s.listCard}>
            {membrosPendentes.map((m, i) => (
              <View
                key={m.id}
                style={[s.membroRow, i < membrosPendentes.length - 1 && s.membroRowBorder]}
              >
                <Text style={{ fontSize: 22 }}>⏳</Text>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={s.membroNome}>Aguardando aceite</Text>
                  <Text style={s.membroSub}>
                    Gerado em {new Date(m.criadoEm).toLocaleDateString('pt-BR')}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </>
      )}

      {/* ── Gerar convite ──────────────────────────────────────────────── */}
      <Text style={s.secTitle}>Convidar membro</Text>
      <View style={s.actionCard}>
        <Text style={s.actionDesc}>
          Gere um código e compartilhe com quem vai entrar na família.
          O membro vai ver e operar os mesmos dados que você.
        </Text>

        {codigoGerado ? (
          <View style={s.codigoBox}>
            <Text style={s.codigoLabel}>Código de convite</Text>
            <Text style={s.codigoCodigo}>{codigoGerado}</Text>
            <Text style={s.codigoHint}>Compartilhe este código. Válido para um uso.</Text>
            <TouchableOpacity style={s.novoCodigoBtn} onPress={() => setCodigoGerado(null)}>
              <Text style={s.novoCodigoText}>Gerar outro</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={s.gerarBtn} onPress={gerarConvite} disabled={gerandoCodigo}>
            {gerandoCodigo
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.gerarText}>🎟️  Gerar código de convite</Text>
            }
          </TouchableOpacity>
        )}
      </View>

      {/* ── Aceitar convite ────────────────────────────────────────────── */}
      <Text style={s.secTitle}>Entrar em uma família</Text>
      <View style={s.actionCard}>
        <Text style={s.actionDesc}>
          Tem um código? Insira abaixo para passar a ver os dados de outra pessoa.
        </Text>
        <TextInput
          style={s.input}
          placeholder="Ex: AB3K7Z"
          placeholderTextColor={colors.inputPlaceholder}
          value={codigoInput}
          onChangeText={v => setCodigoInput(v.toUpperCase())}
          autoCapitalize="characters"
          maxLength={6}
        />
        <TouchableOpacity
          style={[s.gerarBtn, codigoInput.length < 6 && s.btnDisabled]}
          onPress={aceitarConvite}
          disabled={aceitando || codigoInput.length < 6}
        >
          {aceitando
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.gerarText}>Entrar na família</Text>
          }
        </TouchableOpacity>
      </View>

      {membrosAceitos.length === 0 && membrosPendentes.length === 0 && (
        <View style={s.emptyBox}>
          <Text style={s.emptyIcon}>👨‍👩‍👧</Text>
          <Text style={s.emptyTitle}>Nenhum membro ainda</Text>
          <Text style={s.emptySub}>Convide alguém para compartilhar o controle financeiro</Text>
        </View>
      )}
      </ScrollView>
    </View>
  );
}

function makeStyles(c: ColorScheme) {
  return StyleSheet.create({
    scroll:   { padding: 16, paddingBottom: 40 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    secTitle: {
      fontSize: 11, fontWeight: '700', color: c.textSecondary,
      textTransform: 'uppercase', letterSpacing: 0.5,
      marginBottom: 8, marginTop: 16,
    },

    // Banner membro
    bannerCard: {
      backgroundColor: c.surface, borderRadius: 14, padding: 24,
      alignItems: 'center', gap: 10, borderWidth: 1, borderColor: c.border,
      borderLeftWidth: 4, borderLeftColor: c.green,
    },
    bannerIcon:  { fontSize: 40 },
    bannerTitle: { fontSize: 18, fontWeight: 'bold', color: c.text },
    bannerSub:   { fontSize: 14, color: c.textSecondary, textAlign: 'center', lineHeight: 20 },
    sairBtn:     { marginTop: 8, paddingVertical: 10, paddingHorizontal: 24, backgroundColor: c.red, borderRadius: 10 },
    sairText:    { color: '#fff', fontWeight: '700', fontSize: 14 },

    // Info card
    infoCard:  { backgroundColor: c.surface, borderRadius: 12, padding: 16, gap: 12, borderWidth: 1, borderColor: c.border },
    infoRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    infoIcon:  { fontSize: 18, marginTop: 1 },
    infoText:  { flex: 1, fontSize: 13, color: c.textSecondary, lineHeight: 18 },

    // Lista membros
    listCard:      { backgroundColor: c.surface, borderRadius: 12, borderWidth: 1, borderColor: c.border, overflow: 'hidden' },
    membroRow:     { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
    membroRowBorder: { borderBottomWidth: 1, borderBottomColor: c.border },
    membroAvatar:  { width: 40, height: 40, borderRadius: 20, backgroundColor: c.surfaceElevated, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: c.green },
    membroAvatarText: { color: c.green, fontSize: 16, fontWeight: 'bold' },
    membroNome:    { fontSize: 15, fontWeight: '600', color: c.text },
    membroSub:     { fontSize: 12, color: c.textSecondary, marginTop: 2 },
    removerBtn:    { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: c.red },
    removerText:   { color: c.red, fontSize: 12, fontWeight: '600' },

    // Action cards
    actionCard: {
      backgroundColor: c.surface, borderRadius: 12, padding: 16,
      gap: 12, borderWidth: 1, borderColor: c.border,
    },
    actionDesc:  { fontSize: 13, color: c.textSecondary, lineHeight: 18 },
    gerarBtn:    { backgroundColor: c.green, borderRadius: 10, padding: 14, alignItems: 'center' },
    gerarText:   { color: '#fff', fontWeight: '700', fontSize: 15 },
    btnDisabled: { opacity: 0.4 },

    codigoBox:    { alignItems: 'center', gap: 6, paddingVertical: 8 },
    codigoLabel:  { fontSize: 11, color: c.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
    codigoCodigo: { fontSize: 36, fontWeight: '900', letterSpacing: 8, color: c.green },
    codigoHint:   { fontSize: 12, color: c.textSecondary },
    novoCodigoBtn: { marginTop: 4, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: c.border },
    novoCodigoText: { fontSize: 13, color: c.textSecondary },

    input: {
      backgroundColor: c.inputBg, borderRadius: 8, padding: 14,
      fontSize: 18, fontWeight: '700', letterSpacing: 4,
      borderWidth: 1, borderColor: c.inputBorder, color: c.text,
      textAlign: 'center',
    },

    emptyBox:  { alignItems: 'center', paddingVertical: 32, gap: 8 },
    emptyIcon:  { fontSize: 48 },
    emptyTitle: { fontSize: 17, fontWeight: 'bold', color: c.text },
    emptySub:   { fontSize: 13, color: c.textSecondary, textAlign: 'center' },

    // Confirm modal (web-safe)
    confirmOverlay: {
      flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center', alignItems: 'center', padding: 24,
    },
    confirmCard: {
      width: '100%' as any, maxWidth: 360,
      backgroundColor: c.surface, borderRadius: 16, padding: 24,
      borderWidth: 1, borderColor: c.border,
    },
    confirmTitle:   { fontSize: 17, fontWeight: 'bold', color: c.text, marginBottom: 8 },
    confirmMsg:     { fontSize: 14, color: c.textSecondary, lineHeight: 20, marginBottom: 20 },
    confirmActions: { flexDirection: 'row', gap: 12 },
    confirmCancelBtn: {
      flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: 'center',
      borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceElevated,
    },
    confirmCancelText:  { color: c.text, fontSize: 15 },
    confirmDestroyBtn:  { flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: 'center', backgroundColor: c.red },
    confirmDestroyText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  });
}
