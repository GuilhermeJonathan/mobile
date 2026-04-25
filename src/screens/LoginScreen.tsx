import React, { useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { authService } from '../services/authService';
import { useTheme } from '../theme/ThemeContext';
import { ColorScheme } from '../theme/colors';

export default function LoginScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      </View>
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
  });
}
