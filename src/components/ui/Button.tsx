import React from 'react';
import { ActivityIndicator, Pressable, Text, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { text } from '../../theme/typography';
import { radius, spacing } from '../../theme/spacing';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  full?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Botão padrão do FinDog — 4 variantes, um só lugar pra ajustar. */
export default function Button({
  label, onPress, variant = 'primary', loading = false, disabled = false, full = false, style,
}: Props) {
  const { colors } = useTheme();
  const outline = variant === 'secondary' || variant === 'ghost';

  const bg =
    variant === 'primary' ? colors.green :
    variant === 'danger'  ? colors.red :
    variant === 'secondary' ? colors.greenDim :
    colors.surfaceElevated;

  const border =
    variant === 'secondary' ? colors.greenBorder :
    variant === 'ghost'     ? colors.border :
    bg;

  const fg =
    variant === 'primary' || variant === 'danger' ? '#fff' :
    variant === 'secondary' ? colors.green :
    colors.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      style={({ pressed }) => [
        {
          backgroundColor: bg,
          borderWidth: outline ? 1 : 0,
          borderColor: border,
          borderRadius: radius.md,
          paddingVertical: 13,
          paddingHorizontal: spacing.xxl,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.sm,
          width: full ? '100%' : undefined,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading
        ? <ActivityIndicator color={fg} />
        : <Text style={[text('body', 'bold'), { color: fg }]}>{label}</Text>}
    </Pressable>
  );
}
