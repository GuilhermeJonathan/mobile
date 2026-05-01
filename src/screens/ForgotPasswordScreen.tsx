import React, { useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, ScrollView,
} from 'react-native';
import { authService } from '../services/authService';
import { useTheme } from '../theme/ThemeContext';
import { ColorScheme } from '../theme/colors';
import DogMascot from '../components/DogMascot';

export default function ForgotPasswordScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [email, setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]     = useState(false);
  const [error, setError]   = useState('');

  async function handleSubmit() {
    setError('');
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      setError('Informe um e-mail válido.');
      return;
    }
    setLoading(true);
    try {
      await authService.forgotPassword(trimmed);
      setSent(true);
    } catch {
      // Mostramos sucesso mesmo em caso de erro para evitar enumeração de e-mails
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <View style={styles.root}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>← Voltar</Text>
        </TouchableOpacity>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <DogMascot size={160} color={colors.green} showFloating mood="happy" />
          </View>
          <View style={styles.successCard}>
            <Text style={styles.successTitle}>E-mail enviado! 📬</Text>
            <Text style={styles.successBody}>
              Se este e-mail estiver cadastrado, você receberá um link para redefinir sua senha em breve.
            </Text>
            <Text style={styles.successHint}>
              Não esqueça de verificar a caixa de spam.
            </Text>
            <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Login')}>
              <Text style={styles.buttonText}>Ir para o login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backBtnText}>← Voltar</Text>
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <DogMascot size={160} color={colors.green} showFloating mood="thinking" />
          <Text style={styles.heroTitle}>Esqueceu a senha?</Text>
          <Text style={styles.heroSub}>
            Digite seu e-mail e enviaremos um link para criar uma nova senha.
          </Text>
        </View>

        <View style={styles.formWrap}>
          <Text style={styles.label}>E-mail</Text>
          <TextInput
            style={styles.input}
            placeholder="seu@email.com"
            placeholderTextColor={colors.inputPlaceholder}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            value={email}
            onChangeText={t => { setEmail(t); setError(''); }}
            onSubmitEditing={handleSubmit}
            returnKeyType="send"
          />

          {error !== '' && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>Enviar link de redefinição</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.secondaryBtnText}>Lembrei a senha — fazer login</Text>
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
    heroSub: { marginTop: 8, fontSize: 14, color: c.textSecondary, textAlign: 'center', lineHeight: 20, maxWidth: 300 },

    formWrap: { width: '100%', maxWidth: 400, alignSelf: 'center' },
    label: { fontSize: 13, fontWeight: '600', color: c.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
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

    secondaryBtn: { marginTop: 20, alignItems: 'center', padding: 8 },
    secondaryBtnText: { color: c.textSecondary, fontSize: 14 },

    // Tela de sucesso
    successCard: {
      width: '100%', maxWidth: 400, alignSelf: 'center',
      backgroundColor: c.surface, borderRadius: 16, padding: 28,
      borderWidth: 1, borderColor: c.border, alignItems: 'center', gap: 12,
    },
    successTitle: { fontSize: 22, fontWeight: '800', color: c.text, textAlign: 'center' },
    successBody:  { fontSize: 14, color: c.textSecondary, textAlign: 'center', lineHeight: 20 },
    successHint:  { fontSize: 12, color: c.textTertiary, textAlign: 'center' },
  });
}
