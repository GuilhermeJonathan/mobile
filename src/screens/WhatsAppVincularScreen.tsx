import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Platform, ScrollView, Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { whatsappService, WhatsAppVinculoDto } from '../services/api';
import { useTheme } from '../theme/ThemeContext';
import { ColorScheme } from '../theme/colors';
import WhatsAppIcon from '../components/WhatsAppIcon';

export default function WhatsAppVincularScreen({ navigation }: any) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [vinculo, setVinculo]     = useState<WhatsAppVinculoDto | null>(null);
  const [loading, setLoading]     = useState(true);
  const [phone, setPhone]         = useState('');
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');
  const [confirmModal, setConfirm] = useState(false);

  useFocusEffect(useCallback(() => {
    load();
  }, []));

  async function load() {
    setLoading(true);
    try {
      const data = await whatsappService.getVinculo();
      setVinculo(data);
    } finally {
      setLoading(false);
    }
  }

  function normalizePhone(raw: string): string {
    return raw.replace(/\D/g, '');
  }

  function formatDisplay(num: string): string {
    // 5511999990000 → +55 (11) 99999-0000
    if (num.length === 13) {
      return `+${num.slice(0, 2)} (${num.slice(2, 4)}) ${num.slice(4, 9)}-${num.slice(9)}`;
    }
    if (num.length === 12) {
      return `+${num.slice(0, 2)} (${num.slice(2, 4)}) ${num.slice(4, 8)}-${num.slice(8)}`;
    }
    return num;
  }

  async function handleVincular() {
    setError('');
    setSuccess('');
    const normalized = normalizePhone(phone);
    if (normalized.length < 10) {
      setError('Informe um número válido com DDD, ex: 11 99999-0000');
      return;
    }
    // Adiciona 55 se não tiver código do país
    const withCountry = normalized.startsWith('55') ? normalized : `55${normalized}`;

    setSaving(true);
    try {
      await whatsappService.vincular(withCountry);
      setSuccess('✅ Número vinculado com sucesso!');
      setPhone('');
      await load();
    } catch (e: any) {
      if (e?.response?.status === 409) {
        setError('Este número já está vinculado a outra conta.');
      } else {
        setError('Não foi possível vincular. Tente novamente.');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDesvincular() {
    setConfirm(false);
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await whatsappService.desvincular();
      setVinculo(null);
      setSuccess('Número desvinculado.');
    } catch {
      setError('Não foi possível desvincular. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.green} />
      </View>
    );
  }

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={s.title}>WhatsApp</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Ícone + descrição ─────────────────────────────────────────── */}
        <View style={s.hero}>
          <View style={s.heroIcon}>
            <WhatsAppIcon size={56} />
          </View>
          <Text style={s.heroTitle}>Registre pelo WhatsApp</Text>
          <Text style={s.heroSub}>
            Envie uma mensagem para o número abaixo e registre lançamentos
            sem abrir o app.
          </Text>
        </View>

        {/* ── Número do bot ─────────────────────────────────────────────── */}
        <View style={s.botCard}>
          <Text style={s.botLabel}>Número do Meu FinDog</Text>
          <Text style={s.botNumber}>+1 (555) 643-6585</Text>
          <Text style={s.botHint}>Salve este número e mande uma mensagem para começar</Text>
        </View>

        {/* ── Como usar ─────────────────────────────────────────────────── */}
        <View style={s.howCard}>
          <Text style={s.howTitle}>Como usar</Text>
          {[
            { ex: 'Gasolina hoje 300 reais',    desc: 'Registra débito de R$ 300' },
            { ex: 'Almoço 45,50',               desc: 'Débito com data de hoje' },
            { ex: 'Recebi salário 5000',         desc: 'Registra crédito de R$ 5.000' },
            { ex: 'Mercado ontem 230',           desc: 'Débito registrado ontem' },
          ].map(({ ex, desc }) => (
            <View key={ex} style={s.exRow}>
              <View style={s.exBubble}>
                <Text style={s.exText}>{ex}</Text>
              </View>
              <Text style={s.exDesc}>{desc}</Text>
            </View>
          ))}
          <View style={s.tipRow}>
            <Text style={s.tipIcon}>💡</Text>
            <Text style={s.tipText}>
              Envie <Text style={s.bold}>ajuda</Text> para ver todos os exemplos.
            </Text>
          </View>
        </View>

        {/* ── Status do vínculo ──────────────────────────────────────────── */}
        {vinculo ? (
          <View style={s.linkedCard}>
            <View style={s.linkedRow}>
              <View style={s.linkedDot} />
              <Text style={s.linkedLabel}>Número vinculado</Text>
            </View>
            <Text style={s.linkedPhone}>{formatDisplay(vinculo.phoneNumber)}</Text>
            <Text style={s.linkedSince}>
              Desde {new Date(vinculo.createdAt).toLocaleDateString('pt-BR')}
            </Text>

            <TouchableOpacity
              style={s.unlinkBtn}
              onPress={() => setConfirm(true)}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator color={colors.red} size="small" />
                : <Text style={s.unlinkText}>Desvincular número</Text>
              }
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.formCard}>
            <Text style={s.formTitle}>Vincular meu número</Text>
            <Text style={s.formSub}>
              Informe o número do WhatsApp que você vai usar para enviar mensagens.
            </Text>

            <TextInput
              style={s.input}
              placeholder="(11) 99999-0000"
              placeholderTextColor={colors.inputPlaceholder}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />

            {error !== '' && (
              <View style={s.errorBox}>
                <Text style={s.errorText}>{error}</Text>
              </View>
            )}
            {success !== '' && (
              <View style={s.successBox}>
                <Text style={s.successText}>{success}</Text>
              </View>
            )}

            <TouchableOpacity style={s.saveBtn} onPress={handleVincular} disabled={saving}>
              {saving
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={s.saveBtnText}>Vincular número</Text>
              }
            </TouchableOpacity>
          </View>
        )}

        {success !== '' && vinculo && (
          <View style={s.successBox}>
            <Text style={s.successText}>{success}</Text>
          </View>
        )}
      </ScrollView>

      {/* Modal confirmação desvincular */}
      <Modal visible={confirmModal} transparent animationType="fade" onRequestClose={() => setConfirm(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Desvincular número?</Text>
            <Text style={s.modalSub}>
              Você não poderá mais registrar lançamentos pelo WhatsApp até vincular novamente.
            </Text>
            <TouchableOpacity style={s.modalDestroyBtn} onPress={handleDesvincular}>
              <Text style={s.modalDestroyText}>Sim, desvincular</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.modalCancelBtn} onPress={() => setConfirm(false)}>
              <Text style={s.modalCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function makeStyles(c: ColorScheme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },

    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 56 : 24, paddingBottom: 16,
      backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.border,
    },
    backBtn:  { padding: 8 },
    backIcon: { fontSize: 22, color: c.text },
    title:    { fontSize: 20, fontWeight: 'bold', color: c.text },

    scroll: { padding: 16, gap: 14 },

    // Hero
    hero: { alignItems: 'center', paddingVertical: 8, gap: 8 },
    heroIcon: {
      width: 80, height: 80, borderRadius: 40,
      backgroundColor: '#25D36620',
      justifyContent: 'center', alignItems: 'center',
      borderWidth: 2, borderColor: '#25D36640',
    },
    heroTitle: { fontSize: 20, fontWeight: '800', color: c.text, textAlign: 'center' },
    heroSub:   { fontSize: 14, color: c.textSecondary, textAlign: 'center', lineHeight: 20, paddingHorizontal: 8 },

    // Bot card
    botCard: {
      backgroundColor: '#25D36610',
      borderRadius: 14, padding: 18,
      borderWidth: 1.5, borderColor: '#25D36630',
      alignItems: 'center', gap: 4,
    },
    botLabel:  { fontSize: 12, color: c.textSecondary, textTransform: 'uppercase', letterSpacing: 1 },
    botNumber: { fontSize: 22, fontWeight: '800', color: '#25D366', letterSpacing: 0.5 },
    botHint:   { fontSize: 12, color: c.textTertiary, textAlign: 'center' },

    // Como usar
    howCard: {
      backgroundColor: c.surface, borderRadius: 14, padding: 16,
      borderWidth: 1, borderColor: c.border, gap: 10,
    },
    howTitle: { fontSize: 15, fontWeight: '700', color: c.text, marginBottom: 2 },
    exRow:    { gap: 4 },
    exBubble: {
      alignSelf: 'flex-start',
      backgroundColor: '#25D36618', borderRadius: 12, borderTopLeftRadius: 2,
      paddingHorizontal: 12, paddingVertical: 7,
    },
    exText:  { color: '#25D366', fontSize: 14, fontWeight: '600' },
    exDesc:  { fontSize: 12, color: c.textSecondary, marginLeft: 4 },
    tipRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
    tipIcon: { fontSize: 14 },
    tipText: { fontSize: 13, color: c.textSecondary, flex: 1 },
    bold:    { fontWeight: '700', color: c.text },

    // Vinculado
    linkedCard: {
      backgroundColor: c.surface, borderRadius: 14, padding: 20,
      borderWidth: 1.5, borderColor: c.green + '50', gap: 6,
    },
    linkedRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
    linkedDot:  { width: 8, height: 8, borderRadius: 4, backgroundColor: c.green },
    linkedLabel:{ fontSize: 12, color: c.green, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    linkedPhone:{ fontSize: 22, fontWeight: '800', color: c.text },
    linkedSince:{ fontSize: 12, color: c.textTertiary },
    unlinkBtn: {
      marginTop: 8, paddingVertical: 11, borderRadius: 10,
      borderWidth: 1.5, borderColor: c.red + '60',
      alignItems: 'center',
    },
    unlinkText: { color: c.red, fontSize: 14, fontWeight: '600' },

    // Form
    formCard: {
      backgroundColor: c.surface, borderRadius: 14, padding: 20,
      borderWidth: 1, borderColor: c.border, gap: 12,
    },
    formTitle: { fontSize: 16, fontWeight: '700', color: c.text },
    formSub:   { fontSize: 13, color: c.textSecondary, lineHeight: 18 },
    input: {
      backgroundColor: c.inputBg, borderRadius: 10, padding: 14,
      fontSize: 17, borderWidth: 1, borderColor: c.inputBorder, color: c.text,
      letterSpacing: 1,
    },
    saveBtn:     { backgroundColor: c.green, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
    saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

    errorBox:    { backgroundColor: c.redDim, borderRadius: 8, padding: 10, borderWidth: 1, borderColor: c.redBorder },
    errorText:   { color: c.red, fontSize: 13 },
    successBox:  { backgroundColor: c.green + '18', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: c.green + '40' },
    successText: { color: c.green, fontSize: 13 },

    // Modal
    modalOverlay:    { flex: 1, backgroundColor: '#00000088', justifyContent: 'center', alignItems: 'center', padding: 24 },
    modalCard:       { width: '100%', maxWidth: 360, backgroundColor: c.surface, borderRadius: 16, padding: 24, gap: 12, borderWidth: 1, borderColor: c.border },
    modalTitle:      { fontSize: 18, fontWeight: 'bold', color: c.text, textAlign: 'center' },
    modalSub:        { fontSize: 14, color: c.textSecondary, textAlign: 'center', lineHeight: 20 },
    modalDestroyBtn: { backgroundColor: c.red, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
    modalDestroyText:{ color: '#fff', fontSize: 15, fontWeight: '600' },
    modalCancelBtn:  { backgroundColor: c.surfaceElevated, borderRadius: 10, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: c.border },
    modalCancelText: { color: c.text, fontSize: 15 },
  });
}
