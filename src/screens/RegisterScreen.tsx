import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { authService } from '../services/authService';
import { inviteService } from '../services/api';
import { useTheme } from '../theme/ThemeContext';
import { ColorScheme } from '../theme/colors';

export default function RegisterScreen({ navigation, route }: any) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  // Aceita ?inviteToken= (mobile deep link) e ?invite= (link gerado pelo backend)
  const inviteToken: string = route?.params?.inviteToken ?? route?.params?.invite ?? '';

  const [validating, setValidating] = useState(true);
  const [inviteValid, setInviteValid] = useState(false);
  const [lockedEmail, setLockedEmail] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [document, setDocument] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!inviteToken) {
      setValidating(false);
      setInviteValid(false);
      return;
    }
    inviteService.validate(inviteToken)
      .then(result => {
        setInviteValid(result.isValid);
        if (result.email) {
          setLockedEmail(result.email);
          setEmail(result.email);
        }
      })
      .catch(() => setInviteValid(false))
      .finally(() => setValidating(false));
  }, [inviteToken]);

  async function handleRegister() {
    setError('');

    if (!name.trim()) { setError('Informe seu nome.'); return; }
    if (!email.trim()) { setError('Informe seu e-mail.'); return; }
    if (!password) { setError('Informe uma senha.'); return; }
    if (password !== confirmPassword) { setError('As senhas não coincidem.'); return; }
    if (password.length < 6) { setError('A senha deve ter ao menos 6 caracteres.'); return; }

    setLoading(true);
    try {
      await authService.register(
        inviteToken,
        name.trim(),
        email.trim(),
        password,
        document.trim() || undefined,
      );
      navigation.replace('Main');
    } catch (e: any) {
      const status = e?.response?.status;
      const msg = e?.response?.data?.message ?? e?.response?.data;
      if (typeof msg === 'string') {
        setError(msg);
      } else if (status === 400) {
        setError('Dados inválidos. Verifique os campos.');
      } else if (!e?.response) {
        setError('Não foi possível conectar ao servidor.');
      } else {
        setError(`Erro ao cadastrar (${status}).`);
      }
    } finally {
      setLoading(false);
    }
  }

  if (validating) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.green} />
        <Text style={styles.validatingText}>Validando convite…</Text>
      </View>
    );
  }

  if (!inviteToken || !inviteValid) {
    return (
      <View style={styles.centered}>
        {Platform.OS === 'web' && (
          <TouchableOpacity
            style={[styles.backBtn, { position: 'absolute' as any, top: 16, left: 16 }]}
            onPress={() => navigation.navigate('Landing')}
          >
            <Text style={styles.backBtnText}>← Voltar</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.invalidIcon}>🚫</Text>
        <Text style={styles.invalidTitle}>Convite inválido</Text>
        <Text style={styles.invalidSub}>
          {!inviteToken
            ? 'Nenhum token de convite fornecido.'
            : 'Este convite expirou ou já foi utilizado.'}
        </Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.replace('Login')}>
          <Text style={styles.backBtnText}>Voltar ao login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.title}>Criar conta</Text>
          <Text style={styles.subtitle}>Preencha seus dados para concluir o cadastro.</Text>

          <TextInput
            style={styles.input}
            placeholder="Nome completo"
            placeholderTextColor={colors.inputPlaceholder}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />

          <TextInput
            style={[styles.input, lockedEmail ? styles.inputReadonly : null]}
            placeholder="E-mail"
            placeholderTextColor={colors.inputPlaceholder}
            value={email}
            onChangeText={lockedEmail ? undefined : setEmail}
            editable={!lockedEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <TextInput
            style={styles.input}
            placeholder="Senha"
            placeholderTextColor={colors.inputPlaceholder}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TextInput
            style={styles.input}
            placeholder="Confirmar senha"
            placeholderTextColor={colors.inputPlaceholder}
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />

          <TextInput
            style={styles.input}
            placeholder="CPF (opcional)"
            placeholderTextColor={colors.inputPlaceholder}
            value={document}
            onChangeText={setDocument}
            keyboardType="numeric"
            maxLength={14}
          />

          {error !== '' && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>Cadastrar</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkBtn} onPress={() => navigation.replace('Login')}>
            <Text style={styles.linkText}>Já tenho conta — Entrar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(c: ColorScheme) {
  return StyleSheet.create({
    scroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: c.background },
    validatingText: { marginTop: 16, color: c.textSecondary, fontSize: 15 },
    invalidIcon: { fontSize: 48, marginBottom: 12 },
    invalidTitle: { fontSize: 22, fontWeight: 'bold', color: c.text, marginBottom: 8 },
    invalidSub: { fontSize: 14, color: c.textSecondary, textAlign: 'center', marginBottom: 24 },
    backBtn: { backgroundColor: c.surface, borderRadius: 8, paddingVertical: 12, paddingHorizontal: 24, borderWidth: 1, borderColor: c.border },
    backBtnText: { color: c.text, fontSize: 15 },
    card: {
      width: '100%', maxWidth: 400,
      backgroundColor: c.surface, borderRadius: 16, padding: 32,
      borderWidth: 1, borderColor: c.border,
    },
    title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 6, color: c.text },
    subtitle: { fontSize: 13, color: c.textSecondary, textAlign: 'center', marginBottom: 24 },
    input: {
      backgroundColor: c.inputBg, borderRadius: 8, padding: 14,
      marginBottom: 14, fontSize: 15, borderWidth: 1, borderColor: c.inputBorder,
      color: c.text,
    },
    inputReadonly: {
      opacity: 0.6,
    },
    errorBox: {
      backgroundColor: c.redDim, borderRadius: 8, padding: 12,
      marginBottom: 14, borderWidth: 1, borderColor: c.redBorder,
    },
    errorText: { color: c.red, fontSize: 14, textAlign: 'center' },
    button: { backgroundColor: c.green, borderRadius: 8, padding: 15, alignItems: 'center', marginTop: 4 },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    linkBtn: { marginTop: 16, alignItems: 'center' },
    linkText: { color: c.textSecondary, fontSize: 14 },
  });
}
