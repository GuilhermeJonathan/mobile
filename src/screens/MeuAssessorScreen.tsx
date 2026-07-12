import React, { useCallback, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, TextInput, Alert, RefreshControl, Platform, Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { assessoriaService, MeuAssessorDto, RecomendacaoDto } from '../services/api';
import { authService } from '../services/authService';
import { useTheme } from '../theme/ThemeContext';
import type { ColorScheme } from '../theme/colors';

export default function MeuAssessorScreen() {
  const { colors, isDark } = useTheme();
  const s = makeStyles(colors, isDark);

  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [assessor, setAssessor]     = useState<MeuAssessorDto | null>(null);
  const [recomendacoes, setRecomendacoes] = useState<RecomendacaoDto[]>([]);
  const [respondendo, setRespondendo] = useState<string | null>(null);
  const [codigoInput, setCodigoInput] = useState('');
  const [aceitando, setAceitando]   = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    title: string; message: string; onConfirm: () => void;
  } | null>(null);

  const load = useCallback(async () => {
    try {
      const [meuAssessor, recs] = await Promise.all([
        assessoriaService.meuAssessor(),
        assessoriaService.minhasRecomendacoes().catch(() => [] as RecomendacaoDto[]),
      ]);
      setAssessor(meuAssessor);
      setRecomendacoes(recs);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  async function responder(rec: RecomendacaoDto, aceitar: boolean) {
    setRespondendo(rec.id);
    try {
      await assessoriaService.responderRecomendacao(rec.id, aceitar);
      await load();
    } catch (e: any) {
      Alert.alert('Erro', e?.response?.data?.message ?? 'Não foi possível responder.');
    } finally {
      setRespondendo(null);
    }
  }

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function aceitarConvite() {
    const codigo = codigoInput.trim().toUpperCase();
    if (codigo.length < 6) return;
    const userInfo = await authService.getUserInfo();
    const nome = userInfo?.name ?? userInfo?.email ?? 'Cliente';
    setAceitando(true);
    try {
      await assessoriaService.aceitarConvite(codigo, nome);
      setCodigoInput('');
      Alert.alert('✅ Vinculado!', 'Seu assessor agora pode visualizar suas finanças (somente leitura).');
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
        { text: 'Revogar', style: 'destructive', onPress: onConfirm },
      ]);
    }
  }

  async function revogar() {
    if (!assessor?.vinculoId) return;
    confirmar(
      'Revogar acesso',
      'Seu assessor perderá imediatamente o acesso aos seus dados. Continuar?',
      async () => {
        await assessoriaService.revogar(assessor.vinculoId!);
        setConfirmModal(null);
        await load();
      });
  }

  if (loading) {
    return <View style={s.center}><ActivityIndicator color={colors.green} /></View>;
  }

  return (
    <ScrollView
      style={s.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
    >
      {assessor?.temAssessor ? (
        <View style={s.card}>
          <Text style={s.cardTitle}>👔 Seu assessor</Text>
          <Text style={s.assessorNome}>{assessor.nomeAssessor ?? 'Assessor'}</Text>
          <Text style={s.hint}>
            Ele pode visualizar suas finanças (somente leitura) e enviar recomendações.
            Você pode revogar o acesso a qualquer momento.
          </Text>
          <TouchableOpacity style={s.dangerBtn} onPress={revogar}>
            <Text style={s.dangerBtnText}>Revogar acesso</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={s.card}>
          <Text style={s.cardTitle}>👔 Vincular assessor</Text>
          <Text style={s.hint}>
            Recebeu um código de convite do seu assessor financeiro? Informe abaixo.
            Ele terá acesso de leitura às suas finanças — nunca poderá alterar nada.
          </Text>
          <TextInput
            style={s.input}
            value={codigoInput}
            onChangeText={setCodigoInput}
            placeholder="CÓDIGO (6 caracteres)"
            placeholderTextColor={colors.inputPlaceholder}
            autoCapitalize="characters"
            maxLength={6}
          />
          <TouchableOpacity
            style={[s.primaryBtn, (codigoInput.trim().length < 6 || aceitando) && s.btnDisabled]}
            disabled={codigoInput.trim().length < 6 || aceitando}
            onPress={aceitarConvite}
          >
            {aceitando
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.primaryBtnText}>Aceitar convite</Text>}
          </TouchableOpacity>
        </View>
      )}

      {assessor?.temAssessor && recomendacoes.length > 0 && (
        <>
          <Text style={s.sectionTitle}>
            Recomendações do assessor
            {recomendacoes.some(r => r.status === 1) &&
              ` (${recomendacoes.filter(r => r.status === 1).length} pendente${recomendacoes.filter(r => r.status === 1).length > 1 ? 's' : ''})`}
          </Text>
          {recomendacoes.map(rec => (
            <View key={rec.id} style={s.recCard}>
              <View style={s.recHeader}>
                <Text style={s.recTipo}>
                  {rec.tipo === 1 ? '📋 Ajuste de orçamento' : rec.tipo === 3 ? '🚨 Alerta' : '💡 Dica'}
                </Text>
                {rec.status === 2 && <Text style={s.recAceita}>✓ Aceita</Text>}
                {rec.status === 3 && <Text style={s.recRecusada}>✗ Recusada</Text>}
              </View>
              <Text style={s.recTexto}>{rec.texto}</Text>
              <Text style={s.recData}>{new Date(rec.criadoEm).toLocaleDateString('pt-BR')}</Text>
              {rec.status === 1 && (
                <View style={s.recActions}>
                  <TouchableOpacity
                    style={s.recAceitarBtn}
                    disabled={respondendo === rec.id}
                    onPress={() => responder(rec, true)}
                  >
                    {respondendo === rec.id
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={s.recAceitarText}>Aceitar</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.recRecusarBtn}
                    disabled={respondendo === rec.id}
                    onPress={() => responder(rec, false)}
                  >
                    <Text style={s.recRecusarText}>Recusar</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}
        </>
      )}

      <Modal visible={!!confirmModal} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>{confirmModal?.title}</Text>
            <Text style={s.modalMessage}>{confirmModal?.message}</Text>
            <View style={s.modalActions}>
              <TouchableOpacity style={s.modalCancel} onPress={() => setConfirmModal(null)}>
                <Text style={s.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.modalConfirm} onPress={() => confirmModal?.onConfirm()}>
                <Text style={s.modalConfirmText}>Revogar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const makeStyles = (colors: ColorScheme, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  card: {
    backgroundColor: colors.surface, borderRadius: 14, padding: 18, marginBottom: 14,
  },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 8 },
  assessorNome: { color: colors.green, fontSize: 20, fontWeight: '700', marginBottom: 8 },
  hint: { color: colors.textSecondary, fontSize: 13, lineHeight: 19, marginBottom: 14 },
  input: {
    backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.inputBorder,
    borderRadius: 10, padding: 12, color: colors.text, fontSize: 16,
    letterSpacing: 4, textAlign: 'center', marginBottom: 12,
  },
  primaryBtn: {
    backgroundColor: colors.green, borderRadius: 10, padding: 14, alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  btnDisabled: { opacity: 0.5 },
  dangerBtn: {
    borderWidth: 1, borderColor: '#dc2626', borderRadius: 10, padding: 12, alignItems: 'center',
  },
  dangerBtnText: { color: '#dc2626', fontWeight: '700' },
  sectionTitle: {
    color: colors.textSecondary, fontSize: 13, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginTop: 4,
  },
  recCard: { backgroundColor: colors.surface, borderRadius: 12, padding: 14, marginBottom: 10 },
  recHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  recTipo: { color: colors.textSecondary, fontSize: 12, fontWeight: '700' },
  recAceita: { color: isDark ? '#4ade80' : '#15803d', fontSize: 12, fontWeight: '700' },
  recRecusada: { color: isDark ? '#f87171' : '#b91c1c', fontSize: 12, fontWeight: '700' },
  recTexto: { color: colors.text, fontSize: 14, lineHeight: 20, marginBottom: 8 },
  recData: { color: colors.textTertiary, fontSize: 11, marginBottom: 4 },
  recActions: { flexDirection: 'row', gap: 10, marginTop: 6 },
  recAceitarBtn: {
    flex: 1, backgroundColor: colors.green, borderRadius: 8, padding: 10, alignItems: 'center',
  },
  recAceitarText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  recRecusarBtn: {
    flex: 1, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 8, padding: 10, alignItems: 'center',
  },
  recRecusarText: { color: colors.textSecondary, fontWeight: '700', fontSize: 13 },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modalCard: { backgroundColor: colors.surface, borderRadius: 14, padding: 20, width: '100%', maxWidth: 380 },
  modalTitle: { color: colors.text, fontSize: 17, fontWeight: '700', marginBottom: 8 },
  modalMessage: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 18 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  modalCancel: { paddingVertical: 10, paddingHorizontal: 16 },
  modalCancelText: { color: colors.textSecondary, fontWeight: '600' },
  modalConfirm: { backgroundColor: '#dc2626', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 16 },
  modalConfirmText: { color: '#fff', fontWeight: '700' },
});
