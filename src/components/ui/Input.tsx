import React from 'react';
import { Text, TextInput, TextInputProps, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { text } from '../../theme/typography';
import { radius, spacing } from '../../theme/spacing';

interface Props extends TextInputProps {
  label?: string;
}

/** Campo de texto padrão — com rótulo opcional e cores do tema. */
export default function Input({ label, style, ...rest }: Props) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: spacing.xs + 2 }}>
      {label ? (
        <Text style={[text('label', 'semibold'), { color: colors.textSecondary }]}>{label}</Text>
      ) : null}
      <TextInput
        placeholderTextColor={colors.inputPlaceholder}
        style={[
          {
            backgroundColor: colors.inputBg,
            borderWidth: 1,
            borderColor: colors.inputBorder,
            borderRadius: radius.md,
            paddingVertical: spacing.md,
            paddingHorizontal: 14,
            color: colors.text,
            fontSize: 15,
          },
          style,
        ]}
        {...rest}
      />
    </View>
  );
}
