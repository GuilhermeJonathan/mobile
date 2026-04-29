import React, { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';

/**
 * Cachorro mascote — blob dog redondo estilo cartoon.
 * Canvas base: 240 × 220 (mais largo para o rabo não colidir com o corpo).
 * Passe `size` para escalar (referência = size 200).
 */
export default function DogMascot({
  size = 100,
  color = '#3fb950',
  mood = 'happy',
  wag = false,
  showFloating = false,
}: {
  size?: number;
  color?: string;
  mood?: 'happy' | 'sad' | 'neutral';
  wag?: boolean;
  showFloating?: boolean;
}) {
  const S = size / 200;
  const W = 240 * S;
  const H = 220 * S;

  // ── Animação do rabo ──────────────────────────────────────────────────────
  const wagAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!wag) { wagAnim.setValue(0); return; }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(wagAnim, { toValue:  1, duration: 130, useNativeDriver: true }),
        Animated.timing(wagAnim, { toValue: -1, duration: 130, useNativeDriver: true }),
        Animated.timing(wagAnim, { toValue:  1, duration: 130, useNativeDriver: true }),
        Animated.timing(wagAnim, { toValue: -1, duration: 130, useNativeDriver: true }),
        Animated.timing(wagAnim, { toValue:  0, duration: 110, useNativeDriver: true }),
        Animated.delay(400),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [wag]);

  // Balança ±25° em volta da posição natural
  const tailRotate = wagAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-25deg', '0deg', '25deg'],
  });

  // ── Paleta ────────────────────────────────────────────────────────────────
  const body     = '#e8972a';   // âmbar-laranja
  const earOut   = '#c07820';   // âmbar-marrom (orelha externa, próximo do corpo)
  const earIn    = '#8c4406';   // marrom escuro (interior da orelha)
  const tailCol  = '#9a4606';   // marrom rabo
  const snout    = '#f5b84a';   // focinho mais claro
  const dark     = '#1a0800';
  const tongue   = '#e03535';
  const tagCol   = '#f0c030';

  const full = size >= 48;

  // ── Canvas: corpo centrado em x=120 ──────────────────────────────────────
  // Body: left=34, width=172 → center=120
  // Collar: left=56, width=128 → center=120
  // Snout: left=80, width=80 → center=120
  // Nose: left=106, width=28 → center=120
  // Smile: left=105, width=30 → center=120
  // Tongue: left=109, width=22 → center=120
  // Tag: left=111, width=18 → center=120

  return (
    <View style={{ width: W, height: H }}>

      {/* ── RABO ─────────────────────────────────────────────────────────────
          Arco "(" no lado esquerdo do corpo. Renderizado antes do corpo →
          fica atrás. Pivot em x=34 (borda esquerda do corpo) y=112.
          Um spacer invisível à direita faz o centro do Animated.View
          coincidir com o pivot, para a rotação parecer natural.            */}
      {full && (
        <View style={{ position: 'absolute', left: 8 * S, top: 90 * S }}>
          <Animated.View
            style={{ flexDirection: 'row', transform: [{ rotate: tailRotate }] }}
          >
            {/* Arco visível: metade esquerda de círculo = shape "(" */}
            <View style={{ width: 26 * S, height: 44 * S, overflow: 'hidden' }}>
              <View style={{
                position: 'absolute',
                width:        52 * S,
                height:       52 * S,
                borderRadius: 26 * S,
                borderWidth:  10 * S,
                borderColor:  tailCol,
                backgroundColor: 'transparent',
                left: 0,
                top: (44 - 52) / 2 * S,
              }} />
            </View>
            {/* Spacer invisível — pivot fica na junção dos dois blocos */}
            <View style={{ width: 26 * S, height: 44 * S }} />
          </Animated.View>
        </View>
      )}

      {/* ── ORELHAS — oval alongado uniforme, rotacionado ────────────────────
          A "ponta" vem do formato tall+narrow rotacionado, não de cantos
          cortados. borderRadius uniforme = visual orgânico como na referência */}
      {/* Esquerda externa */}
      <View style={{
        position: 'absolute',
        width: 50*S, height: 78*S, borderRadius: 22*S,
        backgroundColor: earOut,
        left: 44*S, top: 6*S,
        transform: [{ rotate: '-16deg' }],
      }} />
      {/* Esquerda interna */}
      <View style={{
        position: 'absolute',
        width: 28*S, height: 46*S, borderRadius: 12*S,
        backgroundColor: earIn,
        left: 55*S, top: 22*S,
        transform: [{ rotate: '-16deg' }],
      }} />
      {/* Direita externa */}
      <View style={{
        position: 'absolute',
        width: 50*S, height: 78*S, borderRadius: 22*S,
        backgroundColor: earOut,
        left: 146*S, top: 6*S,
        transform: [{ rotate: '16deg' }],
      }} />
      {/* Direita interna */}
      <View style={{
        position: 'absolute',
        width: 28*S, height: 46*S, borderRadius: 12*S,
        backgroundColor: earIn,
        left: 157*S, top: 22*S,
        transform: [{ rotate: '16deg' }],
      }} />

      {/* ── CORPO / cabeça — um pouco menor, levemente oval ─────────────────
          168×154, center x = 37+84 = 121 ≈ 120                             */}
      <View style={{
        position: 'absolute',
        width: 168*S, height: 154*S, borderRadius: 68*S,
        backgroundColor: body,
        left: 36*S, top: 28*S,
      }} />

      {/* ── FOCINHO ───────────────────────────────────────────────────────── */}
      {/* Focinho menor: 68×46, center x=120 → left=86 */}
      {full && (
        <View style={{
          position: 'absolute',
          width: 68*S, height: 46*S, borderRadius: 22*S,
          backgroundColor: snout,
          left: 86*S, top: 124*S,
        }} />
      )}

      {/* ── ROSTO (size ≥ 48) ─────────────────────────────────────────────── */}
      {full ? (
        <>
          {/* Olho esquerdo — brilho no topo da pupila (luz vindo de cima) */}
          <View style={{ position: 'absolute', width: 40*S, height: 40*S, borderRadius: 20*S, backgroundColor: '#fff', left: 74*S, top: 82*S }} />
          <View style={{ position: 'absolute', width: 22*S, height: 22*S, borderRadius: 11*S, backgroundColor: dark,  left: 88*S, top: 91*S }} />
          <View style={{ position: 'absolute', width:  8*S, height:  8*S, borderRadius:  4*S, backgroundColor: '#fff', left: 95*S, top: 91*S }} />

          {/* Olho direito — brilho no topo da pupila */}
          <View style={{ position: 'absolute', width: 40*S, height: 40*S, borderRadius: 20*S, backgroundColor: '#fff', left: 126*S, top: 82*S }} />
          <View style={{ position: 'absolute', width: 22*S, height: 22*S, borderRadius: 11*S, backgroundColor: dark,  left: 140*S, top: 91*S }} />
          <View style={{ position: 'absolute', width:  8*S, height:  8*S, borderRadius:  4*S, backgroundColor: '#fff', left: 147*S, top: 91*S }} />

          {/* Nariz — center x=120 → left=107 */}
          <View style={{
            position: 'absolute',
            width: 26*S, height: 14*S, borderRadius: 9*S,
            backgroundColor: dark,
            left: 107*S, top: 130*S,
          }} />

          {/* Sorriso */}
          {mood !== 'sad' && (
            <View style={{
              position: 'absolute',
              width: 24*S, height: 10*S,
              overflow: 'hidden',
              left: 108*S, top: 145*S,
            }}>
              <View style={{
                position: 'absolute',
                width: 24*S, height: 24*S,
                borderRadius: 12*S,
                borderWidth: Math.max(2, 3 * S),
                borderColor: dark + 'bb',
                backgroundColor: 'transparent',
                bottom: 0,
              }} />
            </View>
          )}

          {/* Língua — pequena, abaixo do sorriso */}
          {mood !== 'sad' && (
            <View style={{
              position: 'absolute',
              width:  20 * S,
              height: 16 * S,
              borderTopLeftRadius:     3 * S,
              borderTopRightRadius:    3 * S,
              borderBottomLeftRadius:  10 * S,
              borderBottomRightRadius: 10 * S,
              backgroundColor: tongue,
              left: 110 * S,
              top:  152 * S,
            }} />
          )}

          {/* Sobrancelhas tristes — alinhadas com os novos olhos (top=82) */}
          {mood === 'sad' && (
            <>
              <View style={{
                position: 'absolute', width: 24*S, height: Math.max(2, 3*S), borderRadius: 2*S,
                backgroundColor: dark + 'cc', left: 72*S, top: 78*S,
                transform: [{ rotate: '-12deg' }],
              }} />
              <View style={{
                position: 'absolute', width: 24*S, height: Math.max(2, 3*S), borderRadius: 2*S,
                backgroundColor: dark + 'cc', left: 144*S, top: 78*S,
                transform: [{ rotate: '12deg' }],
              }} />
              {/* Boca triste — arco SUPERIOR do círculo (top:0) = frowninha */}
              <View style={{
                position: 'absolute',
                width: 24*S, height: 10*S,
                overflow: 'hidden',
                left: 108*S, top: 148*S,
              }}>
                <View style={{
                  position: 'absolute',
                  width: 24*S, height: 24*S,
                  borderRadius: 12*S,
                  borderWidth: Math.max(2, 3 * S),
                  borderColor: dark + 'bb',
                  backgroundColor: 'transparent',
                  top: 0,
                }} />
              </View>
              {/* Lágrima */}
              <View style={{
                position: 'absolute', width: 9*S, height: 18*S, borderRadius: 5*S,
                backgroundColor: '#93c5fd88', left: 68*S, top: 120*S,
              }} />
            </>
          )}
        </>
      ) : (
        /* Olhos simples para tamanhos menores que 48 */
        <>
          <View style={{ position: 'absolute', width: 10*S, height: 10*S, borderRadius: 5*S, backgroundColor: dark,  left: 82*S, top: 94*S }} />
          <View style={{ position: 'absolute', width:  3*S, height:  3*S, borderRadius: 2*S, backgroundColor: '#fff', left: 87*S, top: 93*S }} />
          <View style={{ position: 'absolute', width: 10*S, height: 10*S, borderRadius: 5*S, backgroundColor: dark,  left: 150*S, top: 94*S }} />
          <View style={{ position: 'absolute', width:  3*S, height:  3*S, borderRadius: 2*S, backgroundColor: '#fff', left: 155*S, top: 93*S }} />
        </>
      )}

      {/* ── COLEIRA — colada à base do corpo (body bottom = 28+154 = 182) ────
          top=176 → sobrepõe levemente o corpo; center x=120: left=78 ✓     */}
      <View style={{
        position: 'absolute',
        width: 84*S, height: 9*S, borderRadius: 5*S,
        backgroundColor: color,
        left: 78*S, top: 176*S,
        shadowColor: color, shadowOpacity: 0.4,
        shadowRadius: 4*S, shadowOffset: { width: 0, height: 2*S },
        elevation: 4,
      }} />

      {/* ── TAG — center x=120, centro sobre a coleira ──────────────────────
          top=174 → center y=181 = coleira center y (176+4.5) ✓             */}
      {size >= 48 && (
        <View style={{
          position: 'absolute',
          width: 14*S, height: 14*S, borderRadius: 7*S,
          backgroundColor: tagCol,
          borderWidth: 2*S, borderColor: color,
          left: 113*S,
          top:  173*S,
        }} />
      )}

    </View>
  );
}
