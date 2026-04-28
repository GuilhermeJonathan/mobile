import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Modal, Platform,
} from 'react-native';
import { authService } from '../services/authService';
import { useTheme } from '../theme/ThemeContext';
import { ColorScheme } from '../theme/colors';

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
    // Accept either a full URL or just the token
    let token = raw;
    try {
      const url = new URL(raw);
      const param = url.searchParams.get('invite');
      if (param) token = param;
    } catch {
      // not a URL — use raw value as token
    }
    setInviteModalVisible(false);
    setInviteInput('');
    navigation.navigate('Register', { inviteToken: token });
  }

  async function handleLogin() {
    setError('');
    if (!email || !password) {
      setError('Preencha e-mail e senha.');
      return;
    }
    setLoading(true);
    try {
      await authService.login(email, password);
      navigation.replace('Main');
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 401 || status === 400) {
        setError('E-mail ou senha inválidos.');
      } else if (!e?.response) {
        setError('Não foi possível conectar ao servidor. Verifique se a API está rodando.');
      } else {
        setError(`Erro ao autenticar (${status}).`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Controle Financeiro</Text>

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

      {/* Invite token modal */}
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
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: c.background },
    card: {
      width: '100%', maxWidth: 400,
      backgroundColor: c.surface, borderRadius: 16, padding: 32,
      borderWidth: 1, borderColor: c.border,
    },
    title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 28, color: c.text },
    input: {
      backgroundColor: c.inputBg, borderRadius: 8, padding: 14,
      marginBottom: 14, fontSize: 15, borderWidth: 1, borderColor: c.inputBorder,
      color: c.text,
    },
    errorBox: {
      backgroundColor: c.redDim, borderRadius: 8, padding: 12,
      marginBottom: 14, borderWidth: 1, borderColor: c.redBorder,
    },
    errorText: { color: c.red, fontSize: 14, textAlign: 'center' },
    button: { backgroundColor: c.green, borderRadius: 8, padding: 15, alignItems: 'center', marginTop: 4 },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    inviteBtn: { marginTop: 16, alignItems: 'center', padding: 8 },
    inviteBtnText: { color: c.textSecondary, fontSize: 14 },
    // Invite modal
    modalOverlay: {
      flex: 1, backgroundColor: '#00000080',
      justifyContent: 'center', alignItems: 'center', padding: 24,
    },
    modalCard: {
      width: '100%', maxWidth: 400,
      backgroundColor: c.surface, borderRadius: 16, padding: 24,
      borderWidth: 1, borderColor: c.border,
    },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: c.text, marginBottom: 6, textAlign: 'center' },
    modalSub: { fontSize: 13, color: c.textSecondary, textAlign: 'center', marginBottom: 16 },
    modalActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
    modalCancelBtn: {
      flex: 1, paddingVertical: 13, borderRadius: 8, alignItems: 'center',
      borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceElevated,
    },
    modalCancelText: { color: c.text, fontSize: 15 },
    modalConfirmBtn: {
      flex: 1, paddingVertical: 13, borderRadius: 8, alignItems: 'center',
      backgroundColor: c.green,
    },
    modalConfirmText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  });
}
