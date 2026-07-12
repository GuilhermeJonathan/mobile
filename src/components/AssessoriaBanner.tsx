import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAssessoria } from '../contexts/AssessoriaContext';

/**
 * Banner fixo exibido enquanto o assessor está no modo "visualizar como".
 * A escrita é bloqueada pelo backend (middleware); o banner deixa o modo explícito
 * e oferece a saída.
 */
export default function AssessoriaBanner() {
  const { viewAs, sair } = useAssessoria();
  const navigation = useNavigation<any>();

  if (!viewAs) return null;

  function handleSair() {
    sair();
    navigation.navigate('Main' as never, { screen: 'AssessorClientes' } as never);
  }

  return (
    <View style={s.banner}>
      <Text style={s.text} numberOfLines={1}>
        👁 Visualizando como <Text style={s.nome}>{viewAs.nome}</Text> · somente leitura
      </Text>
      <TouchableOpacity style={s.sairBtn} onPress={handleSair}>
        <Text style={s.sairText}>Sair</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  banner: {
    backgroundColor: '#7c3aed',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 10,
  },
  text: { color: '#ede9fe', fontSize: 13, flex: 1 },
  nome: { fontWeight: '800', color: '#fff' },
  sairBtn: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 14,
  },
  sairText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
