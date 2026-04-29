import React from 'react';
import { View, Text } from 'react-native';

/**
 * Cachorro mascote escalável.
 * Baseado no LoginMascot (200×210). Passe `size` para redimensionar.
 * Abaixo de 48px usa olhos simples; acima mostra rosto completo.
 */
export default function DogMascot({
  size = 100,
  color = '#22c55e',
  showFloating = false,
  mood = 'happy',
}: {
  size?: number;
  color?: string;
  /** Mostra emojis flutuantes (💰 ✨ 📈) — só para tamanhos grandes */
  showFloating?: boolean;
  /** 'happy' = sorriso normal | 'sad' = boca para baixo + olhos caídos */
  mood?: 'happy' | 'sad' | 'neutral';
}) {
  const S    = size / 200;
  const W    = 200 * S;
  const H    = 210 * S;

  const head  = '#f5b84a';
  const ear   = '#c8762a';
  const snout = '#f8d898';
  const dark  = '#0d1117';
  const badge = '#e8a840';

  const full = size >= 56;   // mostra focinho, nariz, sorriso, blush
  const tag  = size >= 110;  // mostra tag R$

  return (
    <View style={{ width: W, height: H }}>

      {/* Orbit ring */}
      {showFloating && (
        <View style={{
          position: 'absolute',
          width: 178*S, height: 178*S, borderRadius: 89*S,
          borderWidth: 1, borderColor: color + '35',
          left: 11*S, top: 6*S,
        }} />
      )}

      {/* Floating emojis */}
      {showFloating && (
        <>
          <Text style={{ position: 'absolute', top: 4*S,  right: 10*S, fontSize: 20*S }}>💰</Text>
          <Text style={{ position: 'absolute', top: 22*S, left: 8*S,   fontSize: 13*S, opacity: 0.7 }}>✨</Text>
          <Text style={{ position: 'absolute', bottom: 26*S, left: 10*S, fontSize: 17*S }}>📈</Text>
          <Text style={{ position: 'absolute', bottom: 24*S, right: 10*S, fontSize: 12*S, opacity: 0.65 }}>✨</Text>
        </>
      )}

      {/* Orelha esquerda */}
      <View style={{
        position: 'absolute',
        width: 30*S, height: 54*S, borderRadius: 15*S,
        backgroundColor: ear,
        left: 52*S, top: 34*S,
        transform: [{ rotate: '-15deg' }],
      }} />

      {/* Orelha direita */}
      <View style={{
        position: 'absolute',
        width: 30*S, height: 54*S, borderRadius: 15*S,
        backgroundColor: ear,
        left: 118*S, top: 34*S,
        transform: [{ rotate: '15deg' }],
      }} />

      {/* Cabeça */}
      <View style={{
        position: 'absolute',
        width: 106*S, height: 106*S, borderRadius: 53*S,
        backgroundColor: head,
        left: 47*S, top: 42*S,
      }} />

      {/* ── Rosto completo (≥ 56px) ───────────────────────────────────── */}
      {full ? (
        <>
          {/* Focinho */}
          <View style={{
            position: 'absolute',
            width: 58*S, height: 44*S, borderRadius: 22*S,
            backgroundColor: snout,
            left: 71*S, top: 104*S,
          }} />

          {/* Olho esquerdo */}
          <View style={{ position: 'absolute', width: 24*S, height: 24*S, borderRadius: 12*S, backgroundColor: 'white', left: 67*S, top: 70*S }} />
          <View style={{ position: 'absolute', width: 15*S, height: 15*S, borderRadius: 8*S,  backgroundColor: dark,  left: 72*S, top: 76*S }} />
          <View style={{ position: 'absolute', width: 5*S,  height: 5*S,  borderRadius: 3*S,  backgroundColor: 'white', left: 80*S, top: 74*S }} />

          {/* Olho direito */}
          <View style={{ position: 'absolute', width: 24*S, height: 24*S, borderRadius: 12*S, backgroundColor: 'white', left: 109*S, top: 70*S }} />
          <View style={{ position: 'absolute', width: 15*S, height: 15*S, borderRadius: 8*S,  backgroundColor: dark,  left: 113*S, top: 76*S }} />
          <View style={{ position: 'absolute', width: 5*S,  height: 5*S,  borderRadius: 3*S,  backgroundColor: 'white', left: 120*S, top: 74*S }} />

          {/* Nariz */}
          <View style={{
            position: 'absolute', width: 20*S, height: 14*S, borderRadius: 8*S,
            backgroundColor: dark, left: 90*S, top: 106*S,
          }} />

          {/* Boca — happy: sorriso ↑ | sad: boca para baixo ↓ | neutral: linha reta */}
          {mood === 'happy' && (
            <View style={{ position: 'absolute', left: 82*S, top: 120*S, width: 36*S, height: 15*S, overflow: 'hidden' }}>
              <View style={{
                width: 34*S, height: 34*S, borderRadius: 17*S,
                borderWidth: Math.max(2, 3*S), borderColor: dark,
                marginTop: -19*S, alignSelf: 'center',
              }} />
            </View>
          )}
          {mood === 'sad' && (
            /* Boca levemente virada — círculo maior = curva mais suave */
            <View style={{ position: 'absolute', left: 84*S, top: 126*S, width: 32*S, height: 10*S, overflow: 'hidden' }}>
              <View style={{
                width: 44*S, height: 44*S, borderRadius: 22*S,
                borderWidth: Math.max(2, 2.5*S), borderColor: dark,
                marginTop: 0, alignSelf: 'center',
              }} />
            </View>
          )}
          {mood === 'neutral' && (
            <View style={{
              position: 'absolute', width: 28*S, height: Math.max(2, 3*S), borderRadius: 2*S,
              backgroundColor: dark, left: 86*S, top: 128*S,
            }} />
          )}

          {/* Blush — só no happy */}
          {mood === 'happy' && <>
            <View style={{ position: 'absolute', width: 26*S, height: 15*S, borderRadius: 13*S, backgroundColor: 'rgba(255,110,80,0.22)', left: 55*S,  top: 112*S }} />
            <View style={{ position: 'absolute', width: 26*S, height: 15*S, borderRadius: 13*S, backgroundColor: 'rgba(255,110,80,0.22)', left: 119*S, top: 112*S }} />
          </>}

          {/* Sobrancelhas "puppy eyes" — cantinho interno para cima */}
          {mood === 'sad' && <>
            {/* esquerda: canto interno (direito) sobe → rotate negativo */}
            <View style={{
              position: 'absolute', width: 17*S, height: Math.max(1.5, 2.5*S), borderRadius: 2*S,
              backgroundColor: dark + 'aa', left: 65*S, top: 67*S,
              transform: [{ rotate: '-8deg' }],
            }} />
            {/* direita: canto interno (esquerdo) sobe → rotate positivo */}
            <View style={{
              position: 'absolute', width: 17*S, height: Math.max(1.5, 2.5*S), borderRadius: 2*S,
              backgroundColor: dark + 'aa', left: 113*S, top: 67*S,
              transform: [{ rotate: '8deg' }],
            }} />
            {/* Lágrima sob olho esquerdo */}
            <View style={{
              position: 'absolute',
              width: 7*S, height: 12*S,
              borderRadius: 4*S,
              backgroundColor: '#93c5fd99',
              left: 75*S, top: 91*S,
            }} />
          </>}
        </>
      ) : (
        /* ── Olhos simples (< 56px) ─────────────────────────────────── */
        <>
          <View style={{ position: 'absolute', width: 7*S, height: 7*S, borderRadius: 4*S, backgroundColor: dark,    left: 72*S,  top: 76*S }} />
          <View style={{ position: 'absolute', width: 2*S, height: 2*S, borderRadius: 1*S, backgroundColor: 'white', left: 76*S,  top: 75*S }} />
          <View style={{ position: 'absolute', width: 7*S, height: 7*S, borderRadius: 4*S, backgroundColor: dark,    left: 114*S, top: 76*S }} />
          <View style={{ position: 'absolute', width: 2*S, height: 2*S, borderRadius: 1*S, backgroundColor: 'white', left: 118*S, top: 75*S }} />
        </>
      )}

      {/* Coleira */}
      <View style={{
        position: 'absolute',
        width: 92*S, height: 22*S, borderRadius: 11*S,
        backgroundColor: color,
        left: 54*S, top: 148*S,
        shadowColor: color, shadowOpacity: 0.45,
        shadowRadius: 8*S, shadowOffset: { width: 0, height: 0 },
        elevation: 6,
      }} />

      {/* Tag R$ */}
      {tag && (
        <View style={{
          position: 'absolute',
          width: 30*S, height: 30*S, borderRadius: 15*S,
          backgroundColor: badge,
          borderWidth: 2.5*S, borderColor: color,
          left: 85*S, top: 158*S,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ color: dark, fontSize: Math.max(7, 9*S), fontWeight: '900' }}>R$</Text>
        </View>
      )}

    </View>
  );
}
