import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated, Dimensions, Modal, Platform, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authService } from '../services/authService';
import WhatsAppIcon from './WhatsAppIcon';

const TOUR_VERSION = 'v4';
const tourKey = (userId: string) => `onboarding_tour_${TOUR_VERSION}_${userId}`;

type SpotType = 'none' | 'tab' | 'header' | 'sidebar' | 'sidebar-bottom';

interface Step {
  title: string;
  desc: string;
  icon: string;
  iconNode?: React.ReactNode;
  spotType: SpotType;
  tabIdx?: number;
  openDrawer?: boolean;
}

// ── Steps mobile ─────────────────────────────────────────────────────────────
function buildMobileSteps(isMobileWeb: boolean): Step[] {
  return [
    {
      icon: '👋',
      title: 'Bem-vindo ao Meu FinDog!',
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
    ...(isMobileWeb
      ? [{
          icon: '📋',
          title: 'Contas & Orçamento',
          desc: 'No celular, acesse Contas e Orçamento pelo ícone 👤 no canto superior direito.',
          spotType: 'header' as SpotType,
          openDrawer: true,
        }]
      : [{
          icon: '📋',
          title: 'Orçamento',
          desc: 'Defina limites de gasto por categoria. O app avisa quando você está chegando perto do limite.',
          spotType: 'tab' as SpotType,
          tabIdx: 5,
        }]
    ),
    {
      icon: '📲',
      iconNode: <WhatsAppIcon size={48} />,
      title: 'Registre pelo WhatsApp!',
      desc: 'Mande uma mensagem para o bot e o lançamento entra automático:\n\n"Gasolina 150 reais"\n"Recebi salário 5000"\n"Mercado ontem 230"\n\nConfigure pelo ícone do WhatsApp no menu.',
      spotType: 'none',
      openDrawer: true,
    },
    {
      icon: '🎯',
      title: 'Metas & Família',
      desc: 'Toque no ícone 👤 no canto superior direito para acessar Metas, Família, alertas e configurações.',
      spotType: 'header',
    },
  ];
}

// ── Steps desktop ─────────────────────────────────────────────────────────────
function buildDesktopSteps(): Step[] {
  return [
    {
      icon: '👋',
      title: 'Bem-vindo ao Meu FinDog!',
      desc: 'Vamos fazer um tour rápido para você conhecer tudo que o app tem a oferecer.',
      spotType: 'none',
    },
    {
      icon: '🗂️',
      title: 'Menu lateral',
      desc: 'Toda a navegação fica aqui na barra à esquerda. Clique em qualquer item para navegar. Você pode redimensionar ou recolher a barra arrastando a borda.',
      spotType: 'sidebar',
    },
    {
      icon: '💰',
      title: 'Lançamentos',
      desc: 'Registre despesas, receitas e Pix. Clique no botão ⊕ para adicionar. Filtre por mês, tipo e situação.',
      spotType: 'sidebar',
    },
    {
      icon: '📊',
      title: 'Dashboard & Cartões',
      desc: 'O Dashboard mostra o resumo do mês: saldo, gastos e metas. Em Cartões, acompanhe cada fatura e importe PDFs.',
      spotType: 'sidebar',
    },
    {
      icon: '📲',
      iconNode: <WhatsAppIcon size={48} />,
      title: 'Registre pelo WhatsApp!',
      desc: 'Mande uma mensagem para o bot e o lançamento entra automático:\n\n"Gasolina 150 reais"\n"Recebi salário 5000"\n\nConfigure em Menu → WhatsApp.',
      spotType: 'sidebar',
    },
    {
      icon: '👤',
      title: 'Minha Conta',
      desc: 'No rodapé da barra lateral acesse seu perfil, Metas, Família, alertas de vencimento e configurações.',
      spotType: 'sidebar-bottom',
    },
  ];
}

interface Props {
  active: boolean;
  onOpenDrawer?: () => void;
  onCloseDrawer?: () => void;
  sidebarWidth?: number;
}

export default function OnboardingTour({ active, onOpenDrawer, onCloseDrawer, sidebarWidth = 220 }: Props) {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [step, setStep]       = useState(0);
  const [userId, setUserId]   = useState<string | null>(null);
  const [dims, setDims]       = useState(Dimensions.get('window'));

  const isDesktop  = Platform.OS === 'web' && dims.width >= 1024;
  const isMobileWeb = Platform.OS === 'web' && dims.width < 768;
  const TAB_COUNT  = isMobileWeb ? 4 : 6;
  const STEPS      = isDesktop ? buildDesktopSteps() : buildMobileSteps(isMobileWeb);

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

  useEffect(() => {
    if (!visible) return;
    opacityAnim.setValue(0);
    slideAnim.setValue(30);
    Animated.parallel([
      Animated.timing(opacityAnim, { toValue: 1, duration: 260, useNativeDriver: true }),
      Animated.spring(slideAnim,   { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }),
    ]).start();
  }, [visible, step]);

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
    onCloseDrawer?.();
    if (userId) await AsyncStorage.setItem(tourKey(userId), '1');
    setVisible(false);
  }, [userId, onCloseDrawer]);

  const next = useCallback(() => {
    if (step < STEPS.length - 1) {
      const currentStep = STEPS[step];
      const nextStep    = STEPS[step + 1];
      if (currentStep.openDrawer && !nextStep.openDrawer) onCloseDrawer?.();
      if (nextStep.openDrawer) onOpenDrawer?.();
      setStep(s => s + 1);
    } else {
      onCloseDrawer?.();
      finish();
    }
  }, [step, finish, onOpenDrawer, onCloseDrawer, STEPS]);

  if (!visible) return null;

  const { width: SW, height: SH } = dims;
  const current = STEPS[step];
  const isLast  = step === STEPS.length - 1;

  // ── Desktop layout ────────────────────────────────────────────────────────
  if (isDesktop) {
    const contentW   = SW - sidebarWidth;
    const cardMaxW   = Math.min(contentW - 48, 520);
    const cardLeft   = sidebarWidth + (contentW - cardMaxW) / 2;
    const cardTop    = Math.max(60, (SH - 380) / 2);
    const isSidebar  = current.spotType === 'sidebar';
    const isSidebarB = current.spotType === 'sidebar-bottom';

    return (
      <Modal visible transparent animationType="none" onRequestClose={finish}>
        <View style={StyleSheet.absoluteFillObject}>

          {/* Overlay */}
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.68)' }]} />

          {/* Sidebar highlight */}
          {(isSidebar || isSidebarB) && (
            <Animated.View style={{
              position: 'absolute',
              left: 0, top: 0, bottom: 0,
              width: sidebarWidth,
              borderRightWidth: 2,
              borderRightColor: '#3fb950',
              backgroundColor: 'rgba(63,185,80,0.06)',
              opacity: pulseAnim.interpolate({
                inputRange: [1, 1.35], outputRange: [0.7, 1],
              }),
            }} />
          )}

          {/* Spotlight bottom user area */}
          {isSidebarB && (
            <>
              <Animated.View style={[s.spot, {
                left: sidebarWidth / 2 - 28,
                bottom: 12,
                transform: [{ scale: pulseAnim }],
              }]} />
              <View style={[s.arrowDown, {
                left: sidebarWidth / 2 - 9,
                bottom: 76,
              }]} />
            </>
          )}

          {/* Arrow pointing to sidebar from card */}
          {isSidebar && (
            <View style={[s.arrowLeft, {
              left: sidebarWidth + 4,
              top: cardTop + 80,
            }]} />
          )}

          {/* Card */}
          <Animated.View style={[s.card, {
            position: 'absolute',
            left: cardLeft,
            width: cardMaxW,
            top: cardTop,
            opacity: opacityAnim,
            transform: [{ translateY: slideAnim }],
          }]}>
            {current.iconNode
              ? <View style={s.iconNode}>{current.iconNode}</View>
              : <Text style={s.icon}>{current.icon}</Text>
            }
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

  // ── Mobile layout ─────────────────────────────────────────────────────────
  const tabBarH   = 60 + insets.bottom;
  const headerTop = insets.top + 8;

  const tabW  = SW / TAB_COUNT;
  const tabCX = current.spotType === 'tab' && current.tabIdx !== undefined
    ? current.tabIdx * tabW + tabW / 2
    : null;
  const tabSpotBottom  = insets.bottom + 2;
  const tabArrowBottom = insets.bottom + 60 + 4;

  const headerCX = SW - 44;
  const headerCY = headerTop + 28;

  const cardMaxW  = Math.min(SW - 32, 520);
  const cardLeft  = (SW - cardMaxW) / 2;
  const cardBottom = current.spotType === 'tab' ? tabBarH + 80 : tabBarH + 16;

  return (
    <Modal visible transparent animationType="none" onRequestClose={finish}>
      <View style={StyleSheet.absoluteFillObject}>

        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.72)' }]} />

        {tabCX !== null && (
          <>
            <Animated.View style={[s.spot, {
              left:   tabCX - 28,
              bottom: tabSpotBottom,
              transform: [{ scale: pulseAnim }],
            }]} />
            <View style={[s.arrowDown, { left: tabCX - 9, bottom: tabArrowBottom }]} />
          </>
        )}

        {current.spotType === 'header' && (
          <>
            <Animated.View style={[s.spot, {
              left:      headerCX - 28,
              top:       headerCY - 28,
              transform: [{ scale: pulseAnim }],
            }]} />
            <View style={[s.arrowUp, { left: headerCX - 8, top: headerCY + 32 }]} />
          </>
        )}

        <Animated.View style={[s.card, {
          position: 'absolute',
          left:   cardLeft,
          width:  cardMaxW,
          bottom: cardBottom,
          opacity: opacityAnim,
          transform: [{ translateY: slideAnim }],
        }]}>
          {current.iconNode
            ? <View style={s.iconNode}>{current.iconNode}</View>
            : <Text style={s.icon}>{current.icon}</Text>
          }
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
  arrowLeft: {
    position: 'absolute',
    width: 0, height: 0,
    borderTopWidth: 9, borderBottomWidth: 9, borderRightWidth: 14,
    borderTopColor: 'transparent', borderBottomColor: 'transparent',
    borderRightColor: '#3fb950',
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
  iconNode:  { alignItems: 'center', marginBottom: 12 },
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
