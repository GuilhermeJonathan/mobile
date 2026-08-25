import React from 'react';
import { Pressable } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import Icon, { IconName } from '../Icon';

interface Props {
  onPress: () => void;
  icon?: IconName;
  color?: string;
  bottom?: number;
  right?: number;
  accessibilityLabel?: string;
}

/** Botão flutuante padrão (antes copiado em 6 telas). */
export default function FAB({
  onPress, icon = 'plus', color, bottom = 20, right = 20, accessibilityLabel,
}: Props) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => ({
        position: 'absolute',
        bottom,
        right,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: color ?? colors.green,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 6,
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        opacity: pressed ? 0.9 : 1,
      })}
    >
      <Icon name={icon} size={26} color="#fff" strokeWidth={2.5} />
    </Pressable>
  );
}
