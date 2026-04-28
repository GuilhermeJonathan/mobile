import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Modal, Platform, ScrollView,
} from 'react-native';
import { authService } from '../services/authService';
import { useTheme } from '../theme/ThemeContext';
import { ColorScheme } from '../theme/colors';

// ─── Mascote ─────────────────────────────────────────────────────────────────
function LoginMascot({ color }: { color: string }) {
  const dark = '#0d1117';
  return (
    <View style={{ alignItems: 'center' }}>
      {/* Orbit ring + floating emojis */}
      <View style={{ width: 192, height: 192, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{
          position: 'absolute', width: 172, height: 172, borderRadius: 86,
          borderWidth: 1, borderColor: color + '30',
        }} />

        <Text style={{ position: 'absolute', top: 6,  right: 10, fontSize: 22 }}>💰</Text>
        <Text style={{ position: 'absolute', top: 22, left: 8,  fontSize: 14, opacity: 0.7 }}>✨</Text>
        <Text style={{ position: 'absolute', bottom: 10, left: 14, fontSize: 18 }}>📈</Text>
        <Text style={{ position: 'absolute', bottom: 8,  right: 12, fontSize: 13, opacity: 0.65 }}>✨</Text>

        {/* Glow */}
        <View style={{
          width: 124, height: 124, borderRadius: 62,
          backgroundColor: color + '18',
          alignItems: 'center', justifyContent: 'center',
        }}>
          {/* Face */}
          <View style={{
            width: 100, height: 100, borderRadius: 50,
            backgroundColor: color,
            alignItems: 'center', justifyContent: 'center',
            shadowColor: color, shadowOpacity: 0.55,
            shadowRadius: 22, shadowOffset: { width: 0, height: 4 },
            elevation: 16,
          }}>
            {/* Eyes */}
            <View style={{ flexDirection: 'row', gap: 22, marginBottom: 10, marginTop: -6 }}>
              <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: dark }} />
              <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: dark }} />
            </View>
            {/* Smile – clipping do semicírculo inferior */}
            <View style={{ height: 17, width: 36, overflow: 'hidden' }}>
              <View style={{
                height: 34, width: 34,
                borderRadius: 17,
                borderWidth: 3,
                borderColor: dark,
                marginTop: -17,
                alignSelf: 'center',
              }} />
            </View>
          </View>
        </View>
      </View>

      {/* Badge R$ */}
      <View style={{
        marginTop: -6,
        backgroundColor: color + '1a', borderRadius: 12,
        paddingVertical: 4, paddingHorizontal: 16,
        borderWidth: 1.5, borderColor: color + '45',
      }}>
        <Text style={{ color, fontWeight: '900', fontSize: 13, letterSpacing: 2 }}>R$</Text>
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
