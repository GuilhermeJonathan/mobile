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

const TAB_COUNT = 6;

type SpotType = 'none' | 'tab' | 'header';

interface Step {
  title: string;
  desc: string;
  icon: string;
  spotType: SpotType;
  tabIdx?: number;
}

const STEPS: Step[] = [
  {
    icon: '👋',
    title: 'Bem-vindo ao Meu Financeiro!',
    desc: 'Vamos fazer um tour rápido para você conhecer tudo que o app oferece.',
    spotType: 'none',
  },
  {
    icon: '📊',
    title: 'Dashboard',
    desc: 'Visão geral do mês: saldo, total de gastos, alertas de vencimento e resumo das suas metas.',
    spotType: 'tab', tabIdx: 0,
  },
  {
    icon: '💰',
    title: 'Lançamentos',
    desc: 'Registre receitas, despesas e Pix. Toque no botão ⊕ para adicionar. Filtre por mês e situação.',
    spotType: 'tab', tabIdx: 1,
  },
  {
    icon: '💳',
    title: 'Cartões de Crédito',
    desc: 'Acompanhe cada fatura separadamente. Importe PDF de fatura para lançar tudo de uma vez.',
    spotType: 'tab', tabIdx: 3,
  },
  {
    icon: '📋',
    title: 'Orçamento',
    desc: 'Defina limites de gasto por categoria. O app avisa quando você está chegando perto do limite.',
    spotType: 'tab', tabIdx: 5,
  },
  {
    icon: '🎯',
    title: 'Metas & Família',
    desc: 'Toque no ícone 👤 no canto superior direito para acessar Metas, Família, alertas e configurações.',
    spotType: 'header',
  },
];

interface Props { active: boolean; }

export default function OnboardingTour({ active }: Props) {
  const insets       = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [step, setStep]       = useState(0);
  const [userId, setUserId]   = useState<string | null>(null);
  // Dimensões podem mudar (resize web) → estado reativo
  const [dims, setDims] = useState(Dimensions.get('window'));

  const pulseAnim   = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const slideAnim   = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => setDims(window));
    return () => sub.remove();
  }, []);

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

  // Entrada do card
  useEffect(() => {
    if (!visible) return;
    opacityAnim.setValue(0);
    slideAnim.setValue(50);
    Animated.parallel([
      Animated.timing(opacityAnim, { toValue: 1, duration: 260, useNativeDriver: true }),
      Animated.spring(slideAnim,   { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }),
    ]).start();
  }, [visible, step]);

  // Pulso
  useEffect(() => {
    if (!visible || STEPS[step].spotType === 'none') return;
    pulseAnim.setValue(1);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.35, duration: 650, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 650, useNativeDriver: true }),
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
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else finish();
  }, [step, finish]);

  if (!visible) return null;

  const { width: SW, height: SH } = dims;
  const current   = STEPS[step];
  const isLast    = step === STEPS.length - 1;
  const tabBarH   = 60 + insets.bottom;
  const headerTop = insets.top + 8; // topo do header

  // ── Posições dos spotlights ──────────────────────────────────────────────
  const tabW  = SW / TAB_COUNT;
  const tabCX = current.spotType === 'tab' && current.tabIdx !== undefined
    ? current.tabIdx * tabW + tabW / 2
    : null;
  // Usa bottom para as abas — não depende de SH (confiável em web e mobile)
  const tabSpotBottom  = insets.bottom + 2;       // círculo alinhado à tab bar
  const tabArrowBottom = insets.bottom + 60 + 4;  // seta acima do círculo

  // Header: ícone 👤 fica nos últimos ~44px da direita, ~28px abaixo do topo
  const headerCX = SW - 44;
  const headerCY = headerTop + 28;

  // ── Card: centralizado horizontalmente, acima da tab bar ───────────────
  const cardMaxW  = Math.min(SW - 32, 520);
  const cardLeft  = (SW - cardMaxW) / 2;
  // Quando há spotlight de aba, sobe o card para não cobri-la
  const cardBottom = current.spotType === 'tab'
    ? tabBarH + 80
    : tabBarH + 16;

  return (
    <Modal visible transparent animationType="none" onRequestClose={finish}>
      <View style={StyleSheet.absoluteFillObject}>

        {/* Overlay escuro */}
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.72)' }]} />

        {/* ── Spotlight ABA — usa bottom para precisão independente de SH ── */}
        {tabCX !== null && (
          <>
            <Animated.View style={[s.spot, {
              left:   tabCX - 28,
              bottom: tabSpotBottom,
              transform: [{ scale: pulseAnim }],
            }]} />
            <View style={[s.arrowDown, {
              left:   tabCX - 9,
              bottom: tabArrowBottom,
            }]} />
          </>
        )}

        {/* ── Spotlight HEADER (👤) ── */}
        {current.spotType === 'header' && (
          <>
            <Animated.View style={[
              s.spot,
              {
                left:      headerCX - 28,
                top:       headerCY - 28,
                transform: [{ scale: pulseAnim }],
              },
            ]} />
            {/* Seta apontando para cima */}
            <View style={[s.arrowUp, { left: headerCX - 8, top: headerCY + 32 }]} />
          </>
        )}

        {/* ── Card ── */}
        <Animated.View style={[
          s.card,
          {
            position: 'absolute',
            left:   cardLeft,
            width:  cardMaxW,
            bottom: cardBottom,
            opacity: opacityAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}>
          <Text style={s.icon}>{current.icon}</Text>
          <Text style={s.title}>{current.title}</Text>
          <Text style={s.desc}>{current.desc}</Text>

          <View style={s.dots}>
            {STEPS.map((_, i) => (
              <View key={i} style={[s.dot, i === step && s.dotActive]} />
            ))}
          </View>

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
  spot: {
    position: 'absolute',
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(63,185,80,0.22)',
    borderWidth: 2.5, borderColor: '#3fb950',
  },
  arrowDown: {
    position: 'absolute',
    width: 0, height: 0,
    borderLeftWidth: 9, borderRightWidth: 9, borderTopWidth: 14,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderTopColor: '#3fb950',
  },
  arrowUp: {
    position: 'absolute',
    width: 0, height: 0,
    borderLeftWidth: 9, borderRightWidth: 9, borderBottomWidth: 14,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderBottomColor: '#3fb950',
  },
  card: {
    backgroundColor: '#1e1e2e',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1, borderColor: '#3fb95055',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45, shadowRadius: 20,
    elevation: 20,
  },
  icon:      { fontSize: 44, textAlign: 'center', marginBottom: 12 },
  title:     { fontSize: 20, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 8 },
  desc:      { fontSize: 14, color: 'rgba(255,255,255,0.72)', textAlign: 'center', lineHeight: 21 },
  dots:      { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 20, marginBottom: 20 },
  dot:       { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.22)' },
  dotActive: { width: 22, backgroundColor: '#3fb950' },
  actions:   { flexDirection: 'row', gap: 12 },
  skipBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', alignItems: 'center',
  },
  skipText: { color: 'rgba(255,255,255,0.5)', fontSize: 15 },
  nextBtn: {
    flex: 2, paddingVertical: 13, borderRadius: 10,
    backgroundColor: '#3fb950', alignItems: 'center',
  },
  nextText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
