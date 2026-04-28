import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Modal, Platform, ScrollView,
} from 'react-native';
import { authService } from '../services/authService';
import { useTheme } from '../theme/ThemeContext';
import { ColorScheme } from '../theme/colors';

// ─── Mascote cachorro ─────────────────────────────────────────────────────────
function LoginMascot({ color }: { color: string }) {
  const head  = '#f5b84a';
  const ear   = '#c8762a';
  const snout = '#f8d898';
  const dark  = '#0d1117';
  const badge = '#e8a840';

  return (
    <View style={{ alignItems: 'center' }}>
      {/* Container 200 × 210 */}
      <View style={{ width: 200, height: 210 }}>

        {/* Orbit ring */}
        <View style={{
          position: 'absolute', width: 178, height: 178, borderRadius: 89,
          borderWidth: 1, borderColor: color + '35',
          left: 11, top: 6,
        }} />

        {/* Floating emojis */}
        <Text style={{ position: 'absolute', top: 4,  right: 10, fontSize: 20 }}>💰</Text>
        <Text style={{ position: 'absolute', top: 22, left: 8,  fontSize: 13, opacity: 0.7 }}>✨</Text>
        <Text style={{ position: 'absolute', bottom: 26, left: 10, fontSize: 17 }}>📈</Text>
        <Text style={{ position: 'absolute', bottom: 24, right: 10, fontSize: 12, opacity: 0.65 }}>✨</Text>

        {/* ── Orelha esquerda ─── */}
        <View style={{
          position: 'absolute',
          width: 30, height: 54, borderRadius: 15,
          backgroundColor: ear,
          left: 52, top: 34,
          transform: [{ rotate: '-18deg' }],
        }} />

        {/* ── Orelha direita ─── */}
        <View style={{
          position: 'absolute',
          width: 30, height: 54, borderRadius: 15,
          backgroundColor: ear,
          left: 118, top: 34,
          transform: [{ rotate: '18deg' }],
        }} />

        {/* ── Cabeça ─── */}
        <View style={{
          position: 'absolute',
          width: 106, height: 106, borderRadius: 53,
          backgroundColor: head,
          left: 47, top: 42,
          shadowColor: '#000', shadowOpacity: 0.32,
          shadowRadius: 14, shadowOffset: { width: 0, height: 5 },
          elevation: 10,
        }} />

        {/* ── Focinho ─── */}
        <View style={{
          position: 'absolute',
          width: 58, height: 44, borderRadius: 22,
          backgroundColor: snout,
          left: 71, top: 104,
        }} />

        {/* Olho esquerdo – branco */}
        <View style={{
          position: 'absolute', width: 24, height: 24, borderRadius: 12,
          backgroundColor: 'white', left: 67, top: 70,
        }} />
        {/* Olho esquerdo – íris */}
        <View style={{
          position: 'absolute', width: 15, height: 15, borderRadius: 8,
          backgroundColor: dark, left: 72, top: 76,
        }} />
        {/* Olho esquerdo – brilho */}
        <View style={{
          position: 'absolute', width: 5, height: 5, borderRadius: 3,
          backgroundColor: 'white', left: 80, top: 74,
        }} />

        {/* Olho direito – branco */}
        <View style={{
          position: 'absolute', width: 24, height: 24, borderRadius: 12,
          backgroundColor: 'white', left: 109, top: 70,
        }} />
        {/* Olho direito – íris */}
        <View style={{
          position: 'absolute', width: 15, height: 15, borderRadius: 8,
          backgroundColor: dark, left: 113, top: 76,
        }} />
        {/* Olho direito – brilho */}
        <View style={{
          position: 'absolute', width: 5, height: 5, borderRadius: 3,
          backgroundColor: 'white', left: 120, top: 74,
        }} />

        {/* Nariz */}
        <View style={{
          position: 'absolute', width: 20, height: 14, borderRadius: 8,
          backgroundColor: dark, left: 90, top: 106,
        }} />

        {/* Sorriso – clip do semicírculo inferior */}
        <View style={{
          position: 'absolute', left: 82, top: 120,
          width: 36, height: 15, overflow: 'hidden',
        }}>
          <View style={{
            width: 34, height: 34, borderRadius: 17,
            borderWidth: 3, borderColor: dark,
            marginTop: -19, alignSelf: 'center',
          }} />
        </View>

        {/* Blush esquerdo */}
        <View style={{
          position: 'absolute', width: 26, height: 15, borderRadius: 13,
          backgroundColor: 'rgba(255,110,80,0.22)', left: 55, top: 112,
        }} />
        {/* Blush direito */}
        <View style={{
          position: 'absolute', width: 26, height: 15, borderRadius: 13,
          backgroundColor: 'rgba(255,110,80,0.22)', left: 119, top: 112,
        }} />

        {/* Coleira */}
        <View style={{
          position: 'absolute', width: 92, height: 22, borderRadius: 11,
          backgroundColor: color,
          left: 54, top: 148,
          shadowColor: color, shadowOpacity: 0.55,
          shadowRadius: 10, shadowOffset: { width: 0, height: 0 },
          elevation: 8,
        }} />

        {/* Tag R$ */}
        <View style={{
          position: 'absolute', width: 30, height: 30, borderRadius: 15,
          backgroundColor: badge,
          borderWidth: 2.5, borderColor: color,
          left: 85, top: 158,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ color: dark, fontSize: 9, fontWeight: '900' }}>R$</Text>
        </View>

      </View>
    </View>
  );
}

// ─── Tela ─────────────────────────────────────────────────────────────────────
export default function LoginScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  // Fallback web: se a URL já contém ?invite= ou ?inviteToken=, vai direto para o cadastro
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    try {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('invite') ?? params.get('inviteToken');
      if (token) {
        navigation.replace('Register', { invite: token });
      }
    } catch {}
  }, []);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [inviteInput, setInviteInput] = useState('');

  function handleInviteSubmit() {
    const raw = inviteInput.trim();
    if (!raw) return;
    let token = raw;
    try {
      const url = new URL(raw);
      const param = url.searchParams.get('invite');
      if (param) token = param;
    } catch {}
    setInviteModalVisible(false);
    setInviteInput('');
    navigation.navigate('Register', { inviteToken: token });
  }

  async function handleLogin() {
    setError('');
    if (!email || !password) { setError('Preencha e-mail e senha.'); return; }
    setLoading(true);
    try {
      await authService.login(email, password);
      navigation.replace('Main');
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 401 || status === 400) {
        setError('E-mail ou senha inválidos.');
      } else if (!e?.response) {
        setError('Não foi possível conectar ao servidor.');
      } else {
        setError(`Erro ao autenticar (${status}).`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ─────────────────────────────────────────────────── */}
        <View style={styles.hero}>
          <LoginMascot color={colors.green} />
          <Text style={styles.heroTitle}>Meu Financeiro</Text>
          <Text style={styles.heroSub}>Seu controle financeiro pessoal</Text>
        </View>

        {/* ── Formulário ───────────────────────────────────────────── */}
        <View style={styles.formWrap}>
          <TextInput
            style={styles.input}
            placeholder="E-mail"
            placeholderTextColor={colors.inputPlaceholder}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Senha"
            placeholderTextColor={colors.inputPlaceholder}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            onSubmitEditing={handleLogin}
          />

          {error !== '' && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>Entrar</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.inviteBtn}
            onPress={() => { setInviteInput(''); setInviteModalVisible(true); }}
          >
            <Text style={styles.inviteBtnText}>Tenho um convite</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── Modal convite ────────────────────────────────────────────── */}
      <Modal
        visible={inviteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setInviteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Usar convite</Text>
            <Text style={styles.modalSub}>Cole o link ou o token do convite que você recebeu.</Text>
            <TextInput
              style={styles.input}
              placeholder="Link ou token do convite"
              placeholderTextColor={colors.inputPlaceholder}
              value={inviteInput}
              onChangeText={setInviteInput}
              autoCapitalize="none"
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setInviteModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleInviteSubmit}>
                <Text style={styles.modalConfirmText}>Continuar</Text>
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
    root:   { flex: 1, backgroundColor: c.background },
    scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 },

    // Hero
    hero: { alignItems: 'center', marginBottom: 36 },
    heroTitle: {
      marginTop: 18, fontSize: 28, fontWeight: '900',
      color: c.text, letterSpacing: 0.3,
    },
    heroSub: {
      marginTop: 6, fontSize: 14, color: c.textSecondary,
      textAlign: 'center', lineHeight: 20,
    },

    // Form
    formWrap: { width: '100%', maxWidth: 400, alignSelf: 'center' },
    input: {
      backgroundColor: c.inputBg, borderRadius: 10, padding: 15,
      marginBottom: 12, fontSize: 15, borderWidth: 1,
      borderColor: c.inputBorder, color: c.text,
    },
    errorBox: {
      backgroundColor: c.redDim, borderRadius: 8, padding: 12,
      marginBottom: 12, borderWidth: 1, borderColor: c.redBorder,
    },
    errorText: { color: c.red, fontSize: 14, textAlign: 'center' },
    button: {
      backgroundColor: c.green, borderRadius: 10, padding: 16,
      alignItems: 'center', marginTop: 4,
    },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
    inviteBtn:     { marginTop: 18, alignItems: 'center', padding: 8 },
    inviteBtnText: { color: c.textSecondary, fontSize: 14 },

    // Modal
    modalOverlay: {
      flex: 1, backgroundColor: '#00000080',
      justifyContent: 'center', alignItems: 'center', padding: 24,
    },
    modalCard: {
      width: '100%', maxWidth: 400,
      backgroundColor: c.surface, borderRadius: 16, padding: 24,
      borderWidth: 1, borderColor: c.border,
    },
    modalTitle:   { fontSize: 18, fontWeight: 'bold', color: c.text, marginBottom: 6, textAlign: 'center' },
    modalSub:     { fontSize: 13, color: c.textSecondary, textAlign: 'center', marginBottom: 16 },
    modalActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
    modalCancelBtn: {
      flex: 1, paddingVertical: 13, borderRadius: 8, alignItems: 'center',
      borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceElevated,
    },
    modalCancelText:  { color: c.text, fontSize: 15 },
    modalConfirmBtn:  { flex: 1, paddingVertical: 13, borderRadius: 8, alignItems: 'center', backgroundColor: c.green },
    modalConfirmText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  });
}
