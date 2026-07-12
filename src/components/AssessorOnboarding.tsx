import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../services/authService';
import { navigationRef } from '../navigation/navigationRef';
import DogMascot from './DogMascot';

const KEY_PREFIX = 'onboarding_assessor_v1_';

/**
 * Onboarding exclusivo do perfil Assessor — substitui o tour de finanças pessoais.
 * Mostra uma única vez por usuário, apresentando o fluxo da carteira.
 */
export default function AssessorOnboarding() {
  const [visible, setVisible] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const info = await authService.getUserInfo().catch(() => null);
      const id = info?.email ?? 'anon';
      setUserId(id);
      const seen = await AsyncStorage.getItem(KEY_PREFIX + id);
      if (!seen) setVisible(true);
    })();
  }, []);

  async function dismiss(navigateToConvite: boolean) {
    if (userId) await AsyncStorage.setItem(KEY_PREFIX + userId, 'done');
    setVisible(false);
    if (navigateToConvite) {
      navigationRef.current?.navigate('Main' as never, { screen: 'AssessorConvite' } as never);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => dismiss(false)}>
      <View style={s.overlay}>
        <View style={s.card}>
          <DogMascot size={100} mood="happy" wag />
          <Text style={s.title}>Bem-vindo, assessor! 👔</Text>
          <Text style={s.sub}>
            Aqui você gerencia sua carteira de clientes:{'\n'}acompanha o score de saúde de cada um,{'\n'}
            navega as finanças deles (somente leitura){'\n'}e envia recomendações personalizadas.
          </Text>

          <View style={s.steps}>
            <View style={s.step}>
              <Text style={s.stepIcon}>1️⃣</Text>
              <Text style={s.stepText}><Text style={s.stepBold}>Convide</Text> um cliente com um código de 6 dígitos</Text>
            </View>
            <View style={s.step}>
              <Text style={s.stepIcon}>2️⃣</Text>
              <Text style={s.stepText}><Text style={s.stepBold}>Acompanhe</Text> o score e priorize quem está em atenção</Text>
            </View>
            <View style={s.step}>
              <Text style={s.stepIcon}>3️⃣</Text>
              <Text style={s.stepText}><Text style={s.stepBold}>Recomende</Text> ajustes — o cliente aceita ou recusa</Text>
            </View>
          </View>

          <TouchableOpacity style={s.primaryBtn} onPress={() => dismiss(true)}>
            <Text style={s.primaryBtnText}>➕ Convidar meu primeiro cliente</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => dismiss(false)}>
            <Text style={s.laterText}>Explorar depois</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  card: {
    backgroundColor: '#161b27', borderRadius: 18, padding: 28,
    width: '100%', maxWidth: 420, alignItems: 'center',
  },
  title: { color: '#f1f5f9', fontSize: 21, fontWeight: '800', marginTop: 14, marginBottom: 8 },
  sub: { color: '#94a3b8', fontSize: 14, lineHeight: 21, textAlign: 'center', marginBottom: 18 },
  steps: { alignSelf: 'stretch', gap: 10, marginBottom: 22 },
  step: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#0d1117', borderRadius: 10, padding: 12,
  },
  stepIcon: { fontSize: 18 },
  stepText: { color: '#cbd5e1', fontSize: 13, flex: 1, lineHeight: 18 },
  stepBold: { fontWeight: '700', color: '#f1f5f9' },
  primaryBtn: {
    backgroundColor: '#16a34a', borderRadius: 10, padding: 14,
    alignItems: 'center', alignSelf: 'stretch',
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  laterText: { color: '#64748b', fontSize: 13, marginTop: 14, fontWeight: '600' },
});
