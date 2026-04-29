import React, { useEffect, useRef } from 'react';
import { Animated, Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import DogMascot from './DogMascot';
import { useTheme } from '../theme/ThemeContext';

interface Props {
  title: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void };
  /** Tamanho do cachorro — padrão 110 */
  dogSize?: number;
}

// Latidos que alternam
const BARKS = ['Au au! 🐾', 'Au! 🐾', 'Au au au! 🐾'];
let barkIdx = 0;

export default function EmptyState({ title, subtitle, action, dogSize = 110 }: Props) {
  const { colors } = useTheme();

  const floatAnim  = useRef(new Animated.Value(0)).current;
  const fadeAnim   = useRef(new Animated.Value(0)).current;
  const barkOpacity = useRef(new Animated.Value(0)).current;
  const barkScale   = useRef(new Animated.Value(0.6)).current;
  const barkText    = useRef(BARKS[0]);

  useEffect(() => {
    // Fade-in inicial
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();

    // Flutuação suave contínua
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -10, duration: 1300, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue:   0, duration: 1300, useNativeDriver: true }),
      ])
    );
    floatLoop.start();

    // Bolha de latido: aparece, fica, some — ciclo ~3s
    const barkLoop = Animated.loop(
      Animated.sequence([
        Animated.delay(600),
        // Aparece
        Animated.parallel([
          Animated.spring(barkScale,   { toValue: 1,   tension: 90, friction: 6, useNativeDriver: true }),
          Animated.timing(barkOpacity, { toValue: 1,   duration: 160, useNativeDriver: true }),
        ]),
        Animated.delay(900),
        // Some
        Animated.parallel([
          Animated.timing(barkScale,   { toValue: 0.6, duration: 200, useNativeDriver: true }),
          Animated.timing(barkOpacity, { toValue: 0,   duration: 180, useNativeDriver: true }),
        ]),
        Animated.delay(1400),
      ])
    );

    // Alterna o texto do latido a cada ciclo (~3s)
    const textInterval = setInterval(() => {
      barkIdx = (barkIdx + 1) % BARKS.length;
      barkText.current = BARKS[barkIdx];
    }, 3000);

    barkLoop.start();

    return () => {
      floatLoop.stop();
      barkLoop.stop();
      clearInterval(textInterval);
    };
  }, []);

  return (
    <Animated.View style={[s.wrap, { opacity: fadeAnim }]}>

      {/* Cachorro com rabo balançando + flutuação */}
      <View style={s.dogWrap}>
        <Animated.View style={{ transform: [{ translateY: floatAnim }] }}>
          <DogMascot size={dogSize} color={colors.green} mood="happy" wag />
        </Animated.View>

        {/* Bolha de latido */}
        <Animated.View style={[
          s.bubble,
          { borderColor: colors.green + '55', backgroundColor: colors.surface },
          { opacity: barkOpacity, transform: [{ scale: barkScale }] },
        ]}>
          <Text style={[s.bubbleText, { color: colors.text }]}>{barkText.current}</Text>
          {/* Pontinho da bolha */}
          <View style={[s.bubbleTail, { borderTopColor: colors.surface }]} />
          <View style={[s.bubbleTailBorder, { borderTopColor: colors.green + '55' }]} />
        </Animated.View>
      </View>

      {/* Texto */}
      <Text style={[s.title, { color: colors.text }]}>{title}</Text>
      {subtitle && (
        <Text style={[s.sub, { color: colors.textSecondary }]}>{subtitle}</Text>
      )}

      {/* Botão de ação */}
      {action && (
        <TouchableOpacity
          style={[s.btn, { backgroundColor: colors.green }]}
          onPress={action.onPress}
          activeOpacity={0.82}
        >
          <Text style={s.btnText}>{action.label}</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 24,
  },
  dogWrap: {
    alignItems: 'center',
    // espaço para a bolha não cortar
    marginTop: 48,
  },
  // ── Bolha de latido ──────────────────────────────────────────
  bubble: {
    position: 'absolute',
    top: -44,
    right: -16,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    minWidth: 90,
    alignItems: 'center',
  },
  bubbleText: {
    fontSize: 13,
    fontWeight: '700',
  },
  // Cauda da bolha (triângulo apontando para baixo-esquerda)
  bubbleTail: {
    position: 'absolute',
    bottom: -9,
    left: 16,
    width: 0, height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 9,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  bubbleTailBorder: {
    position: 'absolute',
    bottom: -11,
    left: 15,
    width: 0, height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  // ─────────────────────────────────────────────────────────────
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 8,
  },
  sub: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
  },
  btn: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 28,
    marginTop: 4,
  },
  btnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
