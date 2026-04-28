import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated, Dimensions, Modal, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authService } from '../services/authService';

const TOUR_VERSION = 'v2';
const tourKey = (userId: string) => `onboarding_tour_${TOUR_VERSION}_${userId}`;

const { width: SW } = Dimensions.get('window');
const TAB_COUNT = 6;

interface Step {
  title: string;
  desc: string;
  icon: string;
  tabIdx: number | null; // null = sem destaque de aba
}

const STEPS: Step[] = [
  {
    icon: '👋',
    title: 'Bem-vindo ao Meu Financeiro!',
    desc: 'Vamos fazer um tour rápido para você conhecer tudo que o app oferece.',
    tabIdx: null,
  },
  {
    icon: '📊',
    title: 'Dashboard',
    desc: 'Visão geral do mês: saldo, total de gastos, alertas de vencimento e resumo das suas metas.',
    tabIdx: 0,
  },
  {
    icon: '💰',
    title: 'Lançamentos',
    desc: 'Registre receitas, despesas e Pix. Toque no botão ⊕ para adicionar. Filtre por mês e situação.',
    tabIdx: 1,
  },
  {
    icon: '💳',
    title: 'Cartões de Crédito',
    desc: 'Acompanhe cada fatura separadamente. Importe PDF de fatura para lançar tudo de uma vez.',
    tabIdx: 3,
  },
  {
    icon: '📋',
    title: 'Orçamento',
    desc: 'Defina limites de gasto por categoria. O app avisa quando você está chegando perto do limite.',
    tabIdx: 5,
  },
  {
    icon: '🎯',
    title: 'Metas & Família',
    desc: 'Toque no ícone 👤 no canto superior direito para acessar Metas, Família, alertas e configurações.',
    tabIdx: null,
  },
];

interface Props {
  /** Passa true assim que o usuário estiver autenticado e na tela principal */
  active: boolean;
}

export default function OnboardingTour({ active }: Props) {
  const insets = useSafeAreaInsets();
  const [visible, setVisible]   = useState(false);
  const [step, setStep]         = useState(0);
  const [userId, setUserId]     = useState<string | null>(null);
  const pulseAnim  = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const slideAnim  = useRef(new Animated.Value(60)).current;

  // Busca o usuário atual e verifica se ele já viu o tour
  useEffect(() => {
    if (!active) return;
    authService.getUserInfo().then(user => {
      if (!user?.id) return;
      setUserId(user.id);
      AsyncStorage.getItem(tourKey(user.id)).then(val => {
        if (!val) setVisible(true);
      });
    }).catch(() => {});
  }, [active]);

  // Animação de entrada do card
  useEffect(() => {
    if (!visible) return;
    opacityAnim.setValue(0);
    slideAnim.setValue(60);
    Animated.parallel([
      Animated.timing(opacityAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.spring(slideAnim,   { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }),
    ]).start();
  }, [visible, step]);

  // Pulso na aba destacada
  useEffect(() => {
    if (!visible || STEPS[step].tabIdx === null) return;
    pulseAnim.setValue(1);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.35, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [visible, step]);

  const finish = useCallback(async () => {
    if (userId) await AsyncStorage.setItem(tourKey(userId), '1');
    setVisible(false);
  }, [userId]);

  const next = useCallback(() => {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      finish();
    }
  }, [step, finish]);

  if (!visible) return null;

  const current      = STEPS[step];
  const isLast       = step === STEPS.length - 1;
  const tabBarH      = 60 + insets.bottom;
  // Centro X de cada aba
  const tabCenterX   = (current.tabIdx !== null)
    ? (current.tabIdx + 0.5) * (SW / TAB_COUNT)
    : null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={finish}>
      {/* Overlay escuro */}
      <View style={s.overlay} pointerEvents="box-none">

        {/* Destaque pulsante sobre a aba */}
        {tabCenterX !== null && (
          <Animated.View
            style={[
              s.tabSpot,
              {
                left:   tabCenterX - 28,
                bottom: tabBarH - 4,
                transform: [{ scale: pulseAnim }],
              },
            ]}
          />
        )}

        {/* Seta apontando para a aba */}
        {tabCenterX !== null && (
          <View style={[s.arrow, { left: tabCenterX - 8, bottom: tabBarH + 50 }]} />
        )}

        {/* Card do passo */}
        <Animated.View
          style={[
            s.card,
            { opacity: opacityAnim, transform: [{ translateY: slideAnim }] },
            // Sobe o card quando há destaque de aba para não cobrir a aba
            tabCenterX !== null
              ? { bottom: tabBarH + 80 }
              : { bottom: tabBarH + 24 },
          ]}
        >
          {/* Ícone */}
          <Text style={s.icon}>{current.icon}</Text>

          {/* Título + desc */}
          <Text style={s.title}>{current.title}</Text>
          <Text style={s.desc}>{current.desc}</Text>

          {/* Dots */}
          <View style={s.dots}>
            {STEPS.map((_, i) => (
              <View
                key={i}
                style={[s.dot, i === step && s.dotActive]}
              />
            ))}
          </View>

          {/* Botões */}
          <View style={s.actions}>
            <TouchableOpacity style={s.skipBtn} onPress={finish}>
              <Text style={s.skipText}>Pular</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.nextBtn} onPress={next}>
              <Text style={s.nextText}>{isLast ? 'Começar! 🚀' : 'Próximo →'}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  tabSpot: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(63,185,80,0.25)',
    borderWidth: 2,
    borderColor: '#3fb950',
  },
  arrow: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 14,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#3fb950',
  },
  card: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: '#1e1e2e',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#3fb95066',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 20,
  },
  icon:  { fontSize: 44, textAlign: 'center', marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 8 },
  desc:  { fontSize: 14, color: 'rgba(255,255,255,0.72)', textAlign: 'center', lineHeight: 21 },
  dots:  { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 20, marginBottom: 20 },
  dot:       { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.25)' },
  dotActive: { width: 22, backgroundColor: '#3fb950' },
  actions: { flexDirection: 'row', gap: 12 },
  skipBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
  },
  skipText: { color: 'rgba(255,255,255,0.55)', fontSize: 15 },
  nextBtn: {
    flex: 2, paddingVertical: 13, borderRadius: 10,
    backgroundColor: '#3fb950', alignItems: 'center',
  },
  nextText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
