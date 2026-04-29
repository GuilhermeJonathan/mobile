import React from 'react';
import {
  View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView, Linking,
} from 'react-native';
import { darkColors } from '../theme/colors';
import { authService } from '../services/authService';
import { navigationRef } from '../navigation/navigationRef';
import DogMascot from './DogMascot';

const C = darkColors;

interface Props {
  visible: boolean;
  trialDaysRemaining?: number | null; // null = expirado, >0 = ainda ativo (aviso)
  isExpired: boolean;
}

export default function TrialExpiredModal({ visible, trialDaysRemaining, isExpired }: Props) {
  async function handleLogout() {
    await authService.logout();
    navigationRef.current?.reset({ index: 0, routes: [{ name: 'Landing' as never }] });
  }

  const plans = [
    {
      label: 'Mensal',
      price: 'R$4,90',
      period: '/mês',
      desc: 'Cancele quando quiser',
      highlight: false,
    },
    {
      label: 'Anual',
      price: 'R$39,90',
      period: '/ano',
      desc: 'Equivale a R$3,32/mês  🔥',
      highlight: true,
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
          >
            {/* Mascote */}
            <View style={styles.mascot}>
              <DogMascot size={100} color={C.green} mood={isExpired ? 'sad' : 'neutral'} />
            </View>

            {isExpired ? (
              <>
                <Text style={styles.title}>Seu período gratuito encerrou 🐾</Text>
                <Text style={styles.sub}>
                  Seus dados estão salvos e seguros.{'\n'}
                  Escolha um plano para continuar usando o app.
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.title}>
                  {trialDaysRemaining === 1
                    ? 'Último dia do período gratuito!'
                    : `${trialDaysRemaining} dias restantes no trial`}
                </Text>
                <Text style={styles.sub}>
                  Aproveite para assinar antes de encerrar{'\n'}e não perder o acesso.
                </Text>
              </>
            )}

            {/* Cards de planos */}
            <View style={styles.plans}>
              {plans.map(p => (
                <TouchableOpacity
                  key={p.label}
                  style={[styles.planCard, p.highlight && styles.planCardHL]}
                  activeOpacity={0.85}
                  onPress={() => Linking.openURL('https://meufinanceiro.app/planos')}
                >
                  {p.highlight && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>Mais popular</Text>
                    </View>
                  )}
                  <Text style={[styles.planLabel, p.highlight && styles.planLabelHL]}>
                    {p.label}
                  </Text>
                  <View style={styles.priceRow}>
                    <Text style={[styles.price, p.highlight && styles.priceHL]}>{p.price}</Text>
                    <Text style={styles.period}>{p.period}</Text>
                  </View>
                  <Text style={styles.planDesc}>{p.desc}</Text>
                  <View style={[styles.selectBtn, p.highlight && styles.selectBtnHL]}>
                    <Text style={[styles.selectBtnText, p.highlight && styles.selectBtnTextHL]}>
                      Assinar {p.label}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.guarantee}>
              🔒 Pagamento seguro · Cancele a qualquer momento
            </Text>

            {/* Logout */}
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Text style={styles.logoutText}>Sair da conta</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}


const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    borderTopWidth: 1,
    borderColor: C.border,
  },
  scroll: {
    padding: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },
  mascot: {
    marginBottom: 16,
    marginTop: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: C.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  sub: {
    fontSize: 14,
    color: C.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  plans: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    maxWidth: 400,
    marginBottom: 16,
  },
  planCard: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
    gap: 6,
  },
  planCardHL: {
    borderColor: C.green,
    borderWidth: 2,
    backgroundColor: '#16a34a10',
  },
  badge: {
    backgroundColor: C.green,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  planLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: C.textSecondary,
  },
  planLabelHL: {
    color: C.green,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  price: {
    fontSize: 24,
    fontWeight: '800',
    color: C.text,
  },
  priceHL: {
    color: C.green,
  },
  period: {
    fontSize: 12,
    color: C.textSecondary,
  },
  planDesc: {
    fontSize: 11,
    color: C.textTertiary,
    textAlign: 'center',
  },
  selectBtn: {
    marginTop: 8,
    width: '100%',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
  },
  selectBtnHL: {
    backgroundColor: C.green,
    borderColor: C.green,
  },
  selectBtnText: {
    color: C.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  selectBtnTextHL: {
    color: '#fff',
  },
  guarantee: {
    fontSize: 12,
    color: C.textTertiary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 24,
  },
  logoutBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  logoutText: {
    color: C.textTertiary,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
