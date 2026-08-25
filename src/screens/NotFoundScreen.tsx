import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import DogMascot from '../components/DogMascot';
import { navigationRef } from '../navigation/navigationRef';

export default function NotFoundScreen() {
  const { colors } = useTheme();
  const s = makeStyles(colors);
  function goHome() {
    navigationRef.current?.reset({
      index: 0,
      routes: [{ name: 'Main' as never }],
    });
  }

  return (
    <View style={s.container}>
      <DogMascot size={120} mood="sad" color={colors.green} />

      <Text style={s.code}>404</Text>
      <Text style={s.title}>Página não encontrada</Text>
      <Text style={s.sub}>
        O endereço que você tentou acessar não existe ou foi movido.
      </Text>

      <TouchableOpacity style={s.btn} onPress={goHome} activeOpacity={0.8}>
        <Text style={s.btnText}>Voltar para o início</Text>
      </TouchableOpacity>
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
    gap: 12,
  },
  code: {
    fontSize: 72,
    fontWeight: '900',
    color: c.textTertiary,
    lineHeight: 80,
    marginTop: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: c.text,
    textAlign: 'center',
  },
  sub: {
    fontSize: 14,
    color: c.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
  },
  btn: {
    marginTop: 16,
    backgroundColor: c.green,
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 10,
  },
  btnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
