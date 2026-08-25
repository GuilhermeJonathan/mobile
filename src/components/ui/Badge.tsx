import React from 'react';
import { Text, View, StyleProp, ViewStyle } from 'react-native';
import { text } from '../../theme/typography';
import { radius } from '../../theme/spacing';

interface Props {
  label: string;
  /** Cor base (o fundo/borda derivam dela com transparência). */
  color: string;
  style?: StyleProp<ViewStyle>;
}

/** Selo/etiqueta — cor semântica com fundo e borda derivados. */
export default function Badge({ label, color, style }: Props) {
  return (
    <View
      style={[
        {
          backgroundColor: color + '22',
          borderColor: color + '55',
          borderWidth: 1,
          borderRadius: radius.sm,
          paddingHorizontal: 8,
          paddingVertical: 2,
          alignSelf: 'flex-start',
        },
        style,
      ]}
    >
      <Text style={[text('caption', 'bold'), { color }]}>{label}</Text>
    </View>
  );
}
