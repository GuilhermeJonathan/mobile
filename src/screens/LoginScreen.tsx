import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { authService } from '../services/authService';

export default function LoginScreen({ navigation }: any) {
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
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Senha"
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

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#f5f5f5' },
  card: {
    width: '100%', maxWidth: 400,
    backgroundColor: '#fff', borderRadius: 16, padding: 32,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 6,
  },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 28, color: '#1a1a2e' },
  input: {
    backgroundColor: '#f5f5f5', borderRadius: 8, padding: 14,
    marginBottom: 14, fontSize: 15, borderWidth: 1, borderColor: '#e0e0e0',
  },
  errorBox: {
    backgroundColor: '#ffebee', borderRadius: 8, padding: 12,
    marginBottom: 14, borderWidth: 1, borderColor: '#ef9a9a',
  },
  errorText: { color: '#c62828', fontSize: 14, textAlign: 'center' },
  button: { backgroundColor: '#4CAF50', borderRadius: 8, padding: 15, alignItems: 'center', marginTop: 4 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
