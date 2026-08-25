import React from 'react';
import { Text, StyleProp, TextStyle } from 'react-native';
import { money as moneyStyle } from '../../theme/typography';
import { fmtBRL } from '../../utils/currency';

interface Props {
  value: number;
  style?: StyleProp<TextStyle>;
}

/** Valor monetário formatado em BRL com dígitos tabulares (alinham em colunas). */
export default function Money({ value, style }: Props) {
  return <Text style={[moneyStyle, style]}>{fmtBRL(value)}</Text>;
}
