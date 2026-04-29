import React, { useEffect, useRef } from 'react';
import {
  Modal, View, Text, TouchableOpacity,
  StyleSheet, Animated, ScrollView,
} from 'react-native';
import DogMascot from './DogMascot';
import { darkColors as C } from '../theme/colors';

export type NextAction = 'explore' | 'lancamento' | 'whatsapp' | 'meta';

interface Props {
  visible: boolean;
  name: string;
  onAction: (action: NextAction) => void;
}

const ACTIONS: { id: NextAction; icon: string; title: string; sub: string }[] = [
  {
    id: 'lancamento',
    icon: '💰',
    title: 'Registrar meu primeiro gasto',
    sub: 'Adicione um lançamento agora',
  },
  {
    id: 'whatsapp',
    icon: '📲',
    title: 'Vincular meu WhatsApp',
    sub: 'Registre gastos por mensagem',
  },
  {
    id: 'meta',
    icon: '🎯',
    title: 'Criar uma meta',
    sub: 'Reserve para uma viagem ou objetivo',
  },
  {
    id: 'explore',
    icon: '📊',
    title: 'Explorar o app',
    sub: 'Ver o dashboard primeiro',
  },
];

export default function RegisterSuccessModal({ visible, name, onAction }: Props) {
  const scaleAnim   = useRef(new Animated.Value(0.7)).current;
  const fadeAnim    = useRef(new Animated.Value(0)).current;
  const bounceAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    scaleAnim.setValue(0.7);
    fadeAnim.setValue(0);
    bounceAnim.setValue(0);

    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, tension: 55, friction: 7, useNativeDriver: true }),
      Animated.timing(fadeAnim,  { toValue: 1, duration: 280, useNativeDriver: true }),
    ]).start(() => {
      // Leve bounce do cachorro após entrar
      Animated.sequence([
        Animated.timing(bounceAnim, { toValue: -12, duration: 180, useNativeDriver: true }),
        Animated.spring(bounceAnim, { toValue: 0, tension: 80, friction: 5, useNativeDriver: true }),
      ]).start();
    });
  }, [visible]);

  const firstName = name?.split(' ')[0] ?? '';

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[s.overlay, { opacity: fadeAnim }]}>
        <Animated.View style={[s.card, { transform: [{ scale: scaleAnim }] }]}>

          {/* Emojis decorativos flutuantes */}
          <Text style={s.deco1}>🎉</Text>
          <Text style={s.deco2}>✨</Text>
          <Text style={s.deco3}>🐾</Text>
          <Text style={s.deco4}>💰</Text>

          {/* Cachorro com rabo balançando */}
          <Animated.View style={{ transform: [{ translateY: bounceAnim }], alignItems: 'center' }}>
            <DogMascot size={140} color={C.green} mood="happy" showFloating wag />
          </Animated.View>

          <Text style={s.title}>Conta criada! 🎉</Text>
          <Text style={s.sub}>
            {firstName ? `Bem-vindo, ${firstName}! ` : 'Bem-vindo! '}
            Seu assistente financeiro está pronto. 🐾
          </Text>

          {/* Sugestões de próximo passo */}
          <Text style={s.askLabel}>O que você quer fazer primeiro?</Text>

          <ScrollView style={{ width: '100%' }} showsVerticalScrollIndicator={false}>
            {ACTIONS.map(a => (
              <TouchableOpacity
                key={a.id}
                style={s.actionRow}
                activeOpacity={0.75}
                onPress={() => onAction(a.id)}
              >
                <View style={s.actionIcon}>
                  <Text style={{ fontSize: 22 }}>{a.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.actionTitle}>{a.title}</Text>
                  <Text style={s.actionSub}>{a.sub}</Text>
                </View>
                <Text style={s.actionArrow}>→</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#1e1e2e',
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.green + '40',
    shadowColor: C.green,
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 20,
    overflow: 'hidden',
  },

  // Decorações
  deco1: { position: 'absolute', top: 16,  left: 20,  fontSize: 28, opacity: 0.8 },
  deco2: { position: 'absolute', top: 24,  right: 28, fontSize: 20, opacity: 0.65 },
  deco3: { position: 'absolute', top: 70,  left: 14,  fontSize: 18, opacity: 0.5 },
  deco4: { position: 'absolute', top: 60,  right: 14, fontSize: 16, opacity: 0.5 },

  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 6,
  },
  sub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 22,
  },
  askLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: C.green,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 12,
    alignSelf: 'flex-start',
  },

  // Opções
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ffffff0d',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ffffff15',
  },
  actionIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: C.green + '22',
    alignItems: 'center', justifyContent: 'center',
  },
  actionTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  actionSub: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
  },
  actionArrow: {
    color: C.green,
    fontSize: 18,
    fontWeight: '700',
  },
});
