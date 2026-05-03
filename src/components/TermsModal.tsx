import React, { useState } from 'react';
import {
  View, Text, Modal, TouchableOpacity, StyleSheet,
  ScrollView, Linking, ActivityIndicator,
} from 'react-native';
import { darkColors } from '../theme/colors';
import DogMascot from './DogMascot';

const C = darkColors;

interface Props {
  visible: boolean;
  onAccept: () => void;
}

export default function TermsModal({ visible, onAccept }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleAccept() {
    setLoading(true);
    onAccept();
  }

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
            <View style={styles.mascot}>
              <DogMascot size={80} color={C.green} mood="happy" />
            </View>

            <Text style={styles.title}>Bem-vindo ao Meu FinDog! 🐾</Text>
            <Text style={styles.sub}>
              Antes de começar, leia e aceite nossos{'\n'}
              Termos de Uso e Política de Privacidade.
            </Text>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>O que você precisa saber:</Text>
              <Text style={styles.item}>✅ Seus dados são armazenados com segurança</Text>
              <Text style={styles.item}>✅ Nunca vendemos seus dados a terceiros</Text>
              <Text style={styles.item}>✅ Você pode excluir sua conta a qualquer momento</Text>
              <Text style={styles.item}>✅ Dados financeiros são criptografados</Text>
            </View>

            <TouchableOpacity
              onPress={() => Linking.openURL('https://app.findog.com.br/privacidade')}
              style={styles.link}
            >
              <Text style={styles.linkText}>
                📄 Ler Política de Privacidade completa
              </Text>
            </TouchableOpacity>

            <Text style={styles.hint}>
              Ao continuar, você concorda com os nossos Termos de Uso
              e Política de Privacidade.
            </Text>

            <TouchableOpacity
              style={[styles.acceptBtn, loading && styles.acceptBtnDisabled]}
              onPress={handleAccept}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.acceptBtnText}>Aceitar e continuar</Text>
              }
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
    maxHeight: '90%',
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
    marginBottom: 20,
  },
  card: {
    width: '100%',
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 16,
    gap: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: C.text,
    marginBottom: 4,
  },
  item: {
    fontSize: 13,
    color: C.textSecondary,
    lineHeight: 20,
  },
  link: {
    marginBottom: 16,
  },
  linkText: {
    fontSize: 13,
    color: C.green,
    textDecorationLine: 'underline',
  },
  hint: {
    fontSize: 11,
    color: C.textTertiary,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  acceptBtn: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: C.green,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  acceptBtnDisabled: {
    opacity: 0.6,
  },
  acceptBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
