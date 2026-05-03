import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Platform,
} from 'react-native';
import { darkColors } from '../theme/colors';
import DogMascot from '../components/DogMascot';
import { authService, PlanInfo } from '../services/authService';

const C = darkColors;

const PLANS = [
  {
    id: 'mensal',
    label: 'Mensal',
    price: 'R$ 4,90',
    period: '/mês',
    priceNote: 'Cobrado mensalmente',
    highlight: false,
    features: [
      'Lançamentos ilimitados',
      'Categorias personalizadas',
      'Integração com WhatsApp',
      'Relatórios e gráficos',
      'Suporte por e-mail',
    ],
  },
  {
    id: 'anual',
    label: 'Anual',
    price: 'R$ 39,90',
    period: '/ano',
    priceNote: 'Equivale a R$ 3,32/mês  🔥',
    highlight: true,
    badge: 'Mais popular',
    features: [
      'Tudo do plano Mensal',
      '2 meses grátis',
      'Prioridade no suporte',
      'Acesso a novas features primeiro',
      'Histórico ilimitado',
    ],
  },
];

export default function PlanosScreen() {
  const [planInfo, setPlanInfo] = useState<PlanInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authService.getPlanInfo().then(p => {
      setPlanInfo(p);
      setLoading(false);
    });
  }, []);

  function handleSelectPlan(planId: string) {
    // TODO: integrar com Mercado Pago
    // Por enquanto placeholder
    alert(`Em breve! Plano ${planId === 'mensal' ? 'Mensal' : 'Anual'} selecionado.`);
  }

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={C.green} />
      </View>
    );
  }

  const isActive = planInfo?.hasPaidPlan;
  const isTrialActive = planInfo?.isTrialActive && !planInfo.isTrialExpired;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <DogMascot size={72} color={C.green} mood="happy" />
        <Text style={styles.title}>Escolha seu plano</Text>
        <Text style={styles.sub}>
          {isActive
            ? '✅ Você já tem um plano ativo'
            : isTrialActive
              ? `🎯 Trial ativo · ${planInfo?.trialDaysRemaining ?? 0} dias restantes`
              : '⚠️ Seu trial encerrou — escolha um plano para continuar'}
        </Text>
      </View>

      {/* Plano atual ativo */}
      {isActive && (
        <View style={styles.activeBanner}>
          <Text style={styles.activeBannerText}>
            🎉 Plano ativo
            {planInfo?.planExpiresAt
              ? ` · renova em ${new Date(planInfo.planExpiresAt).toLocaleDateString('pt-BR')}`
              : ''}
          </Text>
        </View>
      )}

      {/* Cards de plano */}
      <View style={styles.plansRow}>
        {PLANS.map(plan => (
          <View
            key={plan.id}
            style={[styles.card, plan.highlight && styles.cardHighlight]}
          >
            {plan.badge && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{plan.badge}</Text>
              </View>
            )}

            <Text style={[styles.planLabel, plan.highlight && styles.planLabelHL]}>
              {plan.label}
            </Text>

            <View style={styles.priceRow}>
              <Text style={[styles.price, plan.highlight && styles.priceHL]}>
                {plan.price}
              </Text>
              <Text style={styles.period}>{plan.period}</Text>
            </View>

            <Text style={styles.priceNote}>{plan.priceNote}</Text>

            <View style={styles.divider} />

            <View style={styles.features}>
              {plan.features.map((f, i) => (
                <View key={i} style={styles.featureRow}>
                  <Text style={[styles.featureCheck, plan.highlight && styles.featureCheckHL]}>✓</Text>
                  <Text style={styles.featureText}>{f}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.selectBtn, plan.highlight && styles.selectBtnHL]}
              onPress={() => handleSelectPlan(plan.id)}
              activeOpacity={0.85}
            >
              <Text style={[styles.selectBtnText, plan.highlight && styles.selectBtnTextHL]}>
                {isActive ? 'Mudar para ' + plan.label : 'Assinar ' + plan.label}
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* Garantias */}
      <View style={styles.guarantees}>
        <Text style={styles.guaranteeItem}>🔒 Pagamento seguro</Text>
        <Text style={styles.guaranteeItem}>↩️ Cancele quando quiser</Text>
        <Text style={styles.guaranteeItem}>💾 Dados sempre salvos</Text>
      </View>

      {/* FAQ */}
      <View style={styles.faq}>
        <Text style={styles.faqTitle}>Dúvidas frequentes</Text>

        <View style={styles.faqItem}>
          <Text style={styles.faqQ}>O que acontece com meus dados se eu cancelar?</Text>
          <Text style={styles.faqA}>Seus dados ficam salvos por 30 dias. Você pode reativar o plano a qualquer momento.</Text>
        </View>

        <View style={styles.faqItem}>
          <Text style={styles.faqQ}>Posso trocar de plano depois?</Text>
          <Text style={styles.faqA}>Sim, você pode fazer upgrade ou downgrade quando quiser.</Text>
        </View>

        <View style={styles.faqItem}>
          <Text style={styles.faqQ}>Como funciona o trial gratuito?</Text>
          <Text style={styles.faqA}>14 dias grátis com acesso completo. Não é necessário cartão para começar.</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const isWeb = Platform.OS === 'web';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.background,
  },
  content: {
    padding: 20,
    paddingBottom: 48,
    alignItems: 'center',
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  loading: {
    flex: 1,
    backgroundColor: C.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    gap: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: C.text,
    textAlign: 'center',
  },
  sub: {
    fontSize: 14,
    color: C.textSecondary,
    textAlign: 'center',
  },
  activeBanner: {
    width: '100%',
    backgroundColor: '#16a34a18',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#16a34a40',
    padding: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  activeBannerText: {
    color: C.green,
    fontWeight: '600',
    fontSize: 14,
  },
  plansRow: {
    flexDirection: isWeb ? 'row' : 'column',
    gap: 16,
    width: '100%',
    marginBottom: 24,
  },
  card: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: C.border,
    gap: 6,
  },
  cardHighlight: {
    borderColor: C.green,
    borderWidth: 2,
    backgroundColor: '#16a34a08',
  },
  badge: {
    backgroundColor: C.green,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  planLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: C.textSecondary,
  },
  planLabelHL: {
    color: C.green,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
    marginTop: 4,
  },
  price: {
    fontSize: 28,
    fontWeight: '800',
    color: C.text,
  },
  priceHL: {
    color: C.green,
  },
  period: {
    fontSize: 13,
    color: C.textSecondary,
  },
  priceNote: {
    fontSize: 11,
    color: C.textTertiary,
    marginBottom: 4,
  },
  divider: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: 12,
  },
  features: {
    gap: 8,
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  featureCheck: {
    color: C.textSecondary,
    fontWeight: '700',
    fontSize: 13,
  },
  featureCheckHL: {
    color: C.green,
  },
  featureText: {
    fontSize: 13,
    color: C.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  selectBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    marginTop: 4,
  },
  selectBtnHL: {
    backgroundColor: C.green,
    borderColor: C.green,
  },
  selectBtnText: {
    color: C.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  selectBtnTextHL: {
    color: '#fff',
  },
  guarantees: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 32,
  },
  guaranteeItem: {
    fontSize: 12,
    color: C.textTertiary,
  },
  faq: {
    width: '100%',
    gap: 16,
  },
  faqTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.text,
    marginBottom: 4,
  },
  faqItem: {
    backgroundColor: C.card,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    gap: 6,
  },
  faqQ: {
    fontSize: 13,
    fontWeight: '600',
    color: C.text,
  },
  faqA: {
    fontSize: 13,
    color: C.textSecondary,
    lineHeight: 18,
  },
});
