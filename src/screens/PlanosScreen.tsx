import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Modal, TextInput,
  StyleSheet, ActivityIndicator, Platform, Linking, Alert,
  KeyboardAvoidingView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
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
  const [planInfo, setPlanInfo]               = useState<PlanInfo | null>(null);
  const [loading, setLoading]                 = useState(true);
  const [checkingOut, setCheckingOut]         = useState<string | null>(null);
  const [awaitingPayment, setAwaitingPayment] = useState(false);
  const [verifying, setVerifying]             = useState(false);
  const [mpEmailModal, setMpEmailModal]       = useState(false);
  const [mpEmail, setMpEmail]                 = useState('');
  const [pendingPlanId, setPendingPlanId]     = useState<string | null>(null);

  async function loadPlanInfo() {
    // Sempre busca da API para garantir dados atualizados após pagamento
    const p = await authService.fetchPlanInfo() ?? await authService.getPlanInfo();
    setPlanInfo(p);
    setLoading(false);
  }

  // Recarrega toda vez que a tela recebe foco (volta do browser após pagar)
  useFocusEffect(useCallback(() => {
    loadPlanInfo();
  }, []));

  function handleSelectPlan(planId: string) {
    if (checkingOut) return;
    setPendingPlanId(planId);
    setMpEmail('');
    setMpEmailModal(true);
  }

  async function confirmCheckout() {
    if (!pendingPlanId) return;
    const email = mpEmail.trim();
    if (!email || !email.includes('@')) {
      Alert.alert('E-mail inválido', 'Digite um e-mail válido da sua conta Mercado Pago.');
      return;
    }
    setMpEmailModal(false);
    setCheckingOut(pendingPlanId);
    try {
      const url = await authService.createCheckout(pendingPlanId as 'mensal' | 'anual', email);
      await Linking.openURL(url);
      setAwaitingPayment(true);
    } catch {
      Alert.alert('Erro ao abrir checkout', 'Não foi possível iniciar o pagamento. Tente novamente.');
    } finally {
      setCheckingOut(null);
      setPendingPlanId(null);
    }
  }

  async function handleVerifyPayment() {
    setVerifying(true);
    await loadPlanInfo();
    setVerifying(false);
    if (planInfo?.hasPaidPlan) {
      setAwaitingPayment(false);
    } else {
      Alert.alert(
        'Pagamento ainda não confirmado',
        'O Mercado Pago pode levar alguns instantes para confirmar. Tente novamente em alguns segundos.',
      );
    }
  }

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={C.green} />
      </View>
    );
  }

  const isActive     = planInfo?.hasPaidPlan ?? false;
  const isTrialActive = planInfo?.isTrialActive && !planInfo.isTrialExpired;
  const planLabel    = planInfo?.planExpiresAt
    ? (new Date(planInfo.planExpiresAt).getTime() - new Date().getTime() > 32 * 24 * 60 * 60 * 1000
        ? 'Anual' : 'Mensal')
    : '—';

  // ── Modal de e-mail MP ───────────────────────────────────────────────────
  const mpEmailModalEl = (
    <Modal visible={mpEmailModal} transparent animationType="fade" onRequestClose={() => setMpEmailModal(false)}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
        <View style={styles.modalBox}>
          <Text style={styles.modalTitle}>E-mail do Mercado Pago</Text>
          <Text style={styles.modalSub}>
            Digite o e-mail da sua conta no Mercado Pago para finalizar a assinatura.
          </Text>
          <TextInput
            style={styles.modalInput}
            placeholder="seu@email.com"
            placeholderTextColor={C.textTertiary}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={mpEmail}
            onChangeText={setMpEmail}
            onSubmitEditing={confirmCheckout}
          />
          <TouchableOpacity style={styles.modalBtn} onPress={confirmCheckout} activeOpacity={0.85}>
            <Text style={styles.modalBtnText}>Continuar para pagamento →</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMpEmailModal(false)} style={{ marginTop: 12, alignItems: 'center' }}>
            <Text style={{ color: C.textSecondary, fontSize: 13 }}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  // ── Tela de plano ativo ──────────────────────────────────────────────────
  if (isActive) {
    return (
      <>
      {mpEmailModalEl}
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <DogMascot size={72} color={C.green} mood="happy" />
          <Text style={styles.title}>Seu plano</Text>
          <Text style={styles.sub}>Obrigado por assinar o FinDog! 🎉</Text>
        </View>

        {/* Card do plano ativo */}
        <View style={styles.activePlanCard}>
          <View style={styles.activePlanBadge}>
            <Text style={styles.activePlanBadgeText}>✅ Ativo</Text>
          </View>
          <Text style={styles.activePlanLabel}>Plano {planLabel}</Text>
          {planInfo?.planExpiresAt && (
            <Text style={styles.activePlanExpiry}>
              Renova em {new Date(planInfo.planExpiresAt).toLocaleDateString('pt-BR')}
            </Text>
          )}

          <View style={styles.divider} />

          <View style={styles.features}>
            {(planLabel === 'Anual' ? PLANS[1] : PLANS[0]).features.map((f, i) => (
              <View key={i} style={styles.featureRow}>
                <Text style={[styles.featureCheck, styles.featureCheckHL]}>✓</Text>
                <Text style={styles.featureText}>{f}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Trocar de plano */}
        <Text style={styles.changePlanTitle}>Trocar de plano</Text>
        <View style={styles.plansRow}>
          {PLANS.map(plan => (
            <TouchableOpacity
              key={plan.id}
              style={[styles.changePlanCard, plan.highlight && styles.changePlanCardHL]}
              onPress={() => handleSelectPlan(plan.id)}
              disabled={!!checkingOut}
              activeOpacity={0.85}
            >
              <Text style={[styles.changePlanName, plan.highlight && styles.changePlanNameHL]}>
                {plan.label}
              </Text>
              <Text style={[styles.changePlanPrice, plan.highlight && styles.changePlanPriceHL]}>
                {plan.price}<Text style={styles.period}>{plan.period}</Text>
              </Text>
              {checkingOut === plan.id
                ? <ActivityIndicator size="small" color={plan.highlight ? C.green : C.textSecondary} style={{ marginTop: 6 }} />
                : null}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
      </>
    );
  }

  // ── Tela de seleção de plano (sem plano pago) ────────────────────────────
  return (
    <>
    {mpEmailModalEl}
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
          {isTrialActive
            ? `🎯 Trial ativo · ${planInfo?.trialDaysRemaining ?? 0} dias restantes`
            : '⚠️ Seu trial encerrou — escolha um plano para continuar'}
        </Text>
      </View>

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
              disabled={!!checkingOut}
            >
              {checkingOut === plan.id
                ? <ActivityIndicator size="small" color={plan.highlight ? '#fff' : C.green} />
                : <Text style={[styles.selectBtnText, plan.highlight && styles.selectBtnTextHL]}>
                    {'Assinar ' + plan.label}
                  </Text>
              }
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* Botão "Já paguei" */}
      {awaitingPayment && (
        <TouchableOpacity
          style={styles.verifyBtn}
          onPress={handleVerifyPayment}
          disabled={verifying}
          activeOpacity={0.85}
        >
          {verifying
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.verifyBtnText}>✅ Já paguei — verificar agora</Text>
          }
        </TouchableOpacity>
      )}

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
    </>
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
  verifyBtn: {
    width: '100%',
    backgroundColor: C.green,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  verifyBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  // Plano ativo
  activePlanCard: {
    width: '100%',
    backgroundColor: '#16a34a10',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: C.green,
    padding: 20,
    marginBottom: 28,
    gap: 6,
  },
  activePlanBadge: {
    backgroundColor: C.green,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  activePlanBadgeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  activePlanLabel: {
    fontSize: 22,
    fontWeight: '800',
    color: C.text,
  },
  activePlanExpiry: {
    fontSize: 13,
    color: C.textSecondary,
    marginBottom: 4,
  },
  changePlanTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: C.textSecondary,
    alignSelf: 'flex-start',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  changePlanCard: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    alignItems: 'center',
    gap: 4,
  },
  changePlanCardHL: {
    borderColor: C.green,
  },
  changePlanName: {
    fontSize: 13,
    fontWeight: '700',
    color: C.textSecondary,
  },
  changePlanNameHL: {
    color: C.green,
  },
  changePlanPrice: {
    fontSize: 18,
    fontWeight: '800',
    color: C.text,
  },
  changePlanPriceHL: {
    color: C.green,
  },
  // Modal e-mail MP
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBox: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: C.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.text,
    marginBottom: 8,
  },
  modalSub: {
    fontSize: 13,
    color: C.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: C.background,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: C.text,
    marginBottom: 14,
  },
  modalBtn: {
    backgroundColor: C.green,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
