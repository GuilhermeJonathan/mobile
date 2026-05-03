import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { darkColors } from '../theme/colors';

const C = darkColors;

interface Props {
  daysRemaining: number | null;
  onPress?: () => void;
}

export default function TrialBanner({ daysRemaining, onPress }: Props) {
  if (daysRemaining === null) return null;

  // Urgência: <= 3 dias = laranja/vermelho, resto = sutil
  const isUrgent = daysRemaining <= 3;

  function handlePress() {
    onPress?.();
  }

  return (
    <TouchableOpacity
      style={[styles.banner, isUrgent && styles.bannerUrgent]}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <Text style={[styles.text, isUrgent && styles.textUrgent]}>
        {isUrgent
          ? daysRemaining === 1
            ? '⚠️ Último dia de trial — assine agora para não perder o acesso'
            : `⚠️ ${daysRemaining} dias restantes no trial — assine e continue`
          : `🎯 Trial gratuito · ${daysRemaining} dias restantes — Assinar`}
      </Text>
      <Text style={[styles.arrow, isUrgent && styles.textUrgent]}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16a34a18',
    borderBottomWidth: 1,
    borderBottomColor: '#16a34a40',
    paddingVertical: 7,
    paddingHorizontal: 16,
    gap: 4,
  },
  bannerUrgent: {
    backgroundColor: '#92400e18',
    borderBottomColor: '#f59e0b50',
  },
  text: {
    fontSize: 12,
    color: C.green,
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
  },
  textUrgent: {
    color: '#f59e0b',
  },
  arrow: {
    fontSize: 16,
    color: C.green,
    fontWeight: '700',
  },
});
