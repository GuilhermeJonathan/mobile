import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import DogMascot from '../components/DogMascot';
import { authService } from '../services/authService';

export default function PagamentoSucessoScreen({ navigation }: { navigation: any }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [refreshing, setRefreshing] = useState(true);

  useEffect(() => {
    authService.refreshAccessToken()
      .finally(() => setRefreshing(false));
  }, []);

  function handleComecar() {
    navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
  }

  return (
    <View style={styles.container}>
      <DogMascot mood="happy" size={96} color={colors.green} />

      <Text style={styles.title}>Pagamento confirmado! 🎉</Text>

      <Text style={styles.subtitle}>
        {'Obrigado por assinar o Meu FinDog.\nSua conta já está com o plano ativo.'}
      </Text>

      {refreshing ? (
        <ActivityIndicator size="large" color={colors.green} style={styles.loader} />
      ) : (
        <TouchableOpacity style={styles.button} onPress={handleComecar} activeOpacity={0.8}>
          <Text style={styles.buttonText}>Começar a usar →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const makeStyles = (c: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: c.text,
    marginTop: 24,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: c.textSecondary,
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 22,
  },
  loader: {
    marginTop: 36,
  },
  button: {
    marginTop: 36,
    backgroundColor: c.green,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 40,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
