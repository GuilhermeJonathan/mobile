import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, ScrollView, Platform,
} from 'react-native';
import { authService } from '../services/authService';
import { useTheme } from '../theme/ThemeContext';
import { ColorScheme } from '../theme/colors';
import DogMascot from '../components/DogMascot';

export default function ResetPasswordScreen({ navigation, route }: any) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  // Parâmetros chegam pela URL: /reset-password?token=...&email=...
  const [token, setToken]   = useState<string>(route?.params?.token ?? '');
  const [email, setEmail]   = useState<string>(route?.params?.email ?? '');

  // Fallback web: ler query string diretamente
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    try {
      const params = new URLSearchParams(window.location.search);
      if (!token) setToken(params.get('token') ?? '');
      if (!email) setEmail(decodeURIComponent(params.get('email') ?? ''));
    } catch {}
  }, []);

  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [showPwd, setShowPwd]     = useState(false);
  const [showCfm, setShowCfm]     = useState(false);
  const [loading, setLoading]     = useState(false);
  const [done, setDone]           = useState(false);
  const [error, setError]         = useState('');

  const isInvalidLink = !token || !email;

  async function handleSubmit() {
    setError('');
    if (password.length < 6) { setError('A senha deve ter pelo menos 6 caracteres.'); return; }
    if (password !== confirm) { setError('As senhas não coincidem.'); return; }
    setLoading(true);
    try {
      await authService.resetPassword(email, token, password);
      setDone(true);
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 401) {
        setError('Link inválido ou expirado. Solicite um novo link de redefinição.');
      } else if (status === 404) {
        setError('E-mail não encontrado.');
      } else {
        setError('Não foi possível redefinir a senha. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  }

  if (isInvalidLink) {
    return (
      <View style={styles.root}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.hero}>
            <DogMascot size={160} color={colors.red} showFloating mood="sad" />
            <Text style={styles.heroTitle}>Link inválido</Text>
            <Text style={styles.heroSub}>
              Este link de redefinição é inválido ou já expirou.
              Solicite um novo link abaixo.
            </Text>
          </View>
          <View style={styles.formWrap}>
            <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('ForgotPassword')}>
              <Text style={styles.buttonText}>Solicitar novo link</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.navigate('Login')}>
              <Text style={styles.secondaryBtnText}>Ir para o login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  if (done) {
    return (
      <View style={styles.root}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.hero}>
            <DogMascot size={160} color={colors.green} showFloating mood="happy" />
            <Text style={styles.heroTitle}>Senha redefinida! 🎉</Text>
            <Text style={styles.heroSub}>
              Sua senha foi alterada com sucesso.{'\n'}Agora você pode fazer login normalmente.
            </Text>
          </View>
          <View style={styles.formWrap}>
            <TouchableOpacity style={styles.button} onPress={() => navigation.replace('Login')}>
              <Text style={styles.buttonText}>Fazer login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('Login')}>
        <Text style={styles.backBtnText}>← Login</Text>
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <DogMascot size={160} color={colors.green} showFloating mood="thinking" />
          <Text style={styles.heroTitle}>Nova senha</Text>
          <Text style={styles.heroSub}>
            Escolha uma senha segura para{'\n'}
            <Text style={{ color: colors.green }}>{email}</Text>
          </Text>
        </View>

        <View style={styles.formWrap}>
          {/* Nova senha */}
          <Text style={styles.label}>Nova senha</Text>
          <View style={styles.pwdRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              placeholder="Mínimo 6 caracteres"
              placeholderTextColor={colors.inputPlaceholder}
              secureTextEntry={!showPwd}
              value={password}
              onChangeText={t => { setPassword(t); setError(''); }}
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPwd(v => !v)}>
              <Text style={styles.eyeIcon}>{showPwd ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>

          {/* Confirmar senha */}
          <Text style={[styles.label, { marginTop: 14 }]}>Confirmar senha</Text>
          <View style={styles.pwdRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              placeholder="Repita a senha"
              placeholderTextColor={colors.inputPlaceholder}
              secureTextEntry={!showCfm}
              value={confirm}
              onChangeText={t => { setConfirm(t); setError(''); }}
              autoCapitalize="none"
              onSubmitEditing={handleSubmit}
              returnKeyType="done"
            />
            <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowCfm(v => !v)}>
              <Text style={styles.eyeIcon}>{showCfm ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>

          {/* Força da senha */}
          {password.length > 0 && (
            <View style={styles.strengthRow}>
              {[1, 2, 3, 4].map(level => {
                const strength =
                  password.length >= 12 && /[A-Z]/.test(password) && /[0-9]/.test(password) && /[^a-zA-Z0-9]/.test(password) ? 4
                  : password.length >= 10 && /[A-Z]/.test(password) && /[0-9]/.test(password) ? 3
                  : password.length >= 8 ? 2
                  : 1;
                const active = level <= strength;
                const color = strength >= 3 ? colors.green : strength === 2 ? colors.orange : colors.red;
                return (
                  <View key={level} style={[styles.strengthBar, { backgroundColor: active ? color : colors.border }]} />
                );
              })}
              <Text style={[styles.strengthLabel, {
                color: password.length >= 10 ? colors.green : password.length >= 8 ? colors.orange : colors.red
              }]}>
                {password.length >= 10 ? 'Forte' : password.length >= 8 ? 'Média' : 'Fraca'}
              </Text>
            </View>
          )}

          {error !== '' && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, { marginTop: 20 }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>Salvar nova senha</Text>
            }
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

function makeStyles(c: ColorScheme) {
  return StyleSheet.create({
    root:   { flex: 1, backgroundColor: c.background },
    scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 },

    backBtn: {
      position: 'absolute' as any, top: 16, left: 16, zIndex: 10,
      paddingVertical: 8, paddingHorizontal: 12,
      backgroundColor: c.surface, borderRadius: 8,
      borderWidth: 1, borderColor: c.border,
    },
    backBtnText: { color: c.textSecondary, fontSize: 14 },

    hero: { alignItems: 'center', marginBottom: 32 },
    heroTitle: { marginTop: 16, fontSize: 24, fontWeight: '800', color: c.text, textAlign: 'center' },
    heroSub: { marginTop: 8, fontSize: 14, color: c.textSecondary, textAlign: 'center', lineHeight: 20, maxWidth: 320 },

    formWrap: { width: '100%', maxWidth: 400, alignSelf: 'center' },
    label: { fontSize: 13, fontWeight: '600', color: c.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },

    input: {
      backgroundColor: c.inputBg, borderRadius: 10, padding: 15,
      marginBottom: 12, fontSize: 15, borderWidth: 1,
      borderColor: c.inputBorder, color: c.text,
    },
    pwdRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 0 },
    eyeBtn: { padding: 10 },
    eyeIcon: { fontSize: 18 },

    strengthRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
    strengthBar:  { flex: 1, height: 4, borderRadius: 2 },
    strengthLabel: { fontSize: 11, fontWeight: '600', marginLeft: 4, minWidth: 36 },

    errorBox: {
      backgroundColor: c.redDim, borderRadius: 8, padding: 12,
      marginTop: 12, borderWidth: 1, borderColor: c.redBorder,
    },
    errorText: { color: c.red, fontSize: 14, textAlign: 'center' },

    button: {
      backgroundColor: c.green, borderRadius: 10, padding: 16,
      alignItems: 'center',
    },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: '800' },

    secondaryBtn: { marginTop: 16, alignItems: 'center', padding: 8 },
    secondaryBtnText: { color: c.textSecondary, fontSize: 14 },
  });
}
