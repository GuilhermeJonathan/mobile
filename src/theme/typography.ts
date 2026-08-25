import { Platform, TextStyle } from 'react-native';

/**
 * Sistema tipográfico do FinDog.
 *
 * A fonte **Nunito** é carregada no web via <link> em `web/index.html`, e a
 * regra `font-family` na raiz faz todo `<Text>` sem família própria herdá-la.
 * No native o app ainda usa a fonte do sistema — para paridade, adicionar
 * `expo-font` + `@expo-google-fonts/nunito` e carregar os pesos aqui.
 *
 * Uso: em vez de espalhar `fontSize`/`fontWeight` soltos por tela, componha a
 * partir de `text(role, weight)` e use `money` para valores.
 */

/** Família aplicada explicitamente (redundante no web, onde já é herdada). */
export const fontFamily = Platform.OS === 'web' ? 'Nunito' : undefined;

/** Pesos nomeados — evita o zoo de '700' vs 'bold' vs '800'. */
export const weight = {
  regular:   '400',
  medium:    '500',
  semibold:  '600',
  bold:      '700',
  extrabold: '800',
  black:     '900',
} as const satisfies Record<string, TextStyle['fontWeight']>;

/** Escala de tamanhos — um número por papel, não valores ad-hoc. */
export const size = {
  caption:    12,
  label:      13,
  body:       15,
  subheading: 17,
  heading:    20,
  title:      24,
  display:    32,
} as const;

const lineHeight = {
  caption:    16,
  label:      18,
  body:       22,
  subheading: 24,
  heading:    28,
  title:      32,
  display:    40,
} as const;

type Role = keyof typeof size;
type Weight = keyof typeof weight;

/** Estilo de texto por papel semântico (tamanho + entrelinha + peso). */
export function text(role: Role, w: Weight = 'regular'): TextStyle {
  return {
    fontFamily,
    fontSize: size[role],
    lineHeight: lineHeight[role],
    fontWeight: weight[w],
  };
}

/** Só os dígitos tabulares — para aplicar (spread) em estilos de valor existentes. */
export const tabular: TextStyle = {
  fontVariant: ['tabular-nums'],
};

/** Valores monetários — dígitos de largura fixa para alinhar em colunas. */
export const money: TextStyle = {
  fontFamily,
  fontVariant: ['tabular-nums'],
  fontWeight: weight.bold,
};
