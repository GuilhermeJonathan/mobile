import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Modal, TextInput, ActivityIndicator,
  ScrollView, Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { inviteService } from '../services/api';
import { useTheme } from '../theme/ThemeContext';
import { ColorScheme } from '../theme/colors';

const APP_URL = process.env.EXPO_PUBLIC_APP_URL ?? 'https://app.findog.com.br';

const EXPIRATION_OPTIONS = [7, 15, 30] as const;

interface GeneratedInvite {
  token: string;
  expiresAt: string;
  link: string;
  email?: string;
  usedAt?: string | null;
}

export default function InvitesScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [modalVisible, setModalVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [expirationDays, setExpirationDays] = useState<7 | 15 | 30>(7);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');

  const [invites, setInvites] = useState<GeneratedInvite[]>([]);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      async function fetchInvites() {
        setLoading(true);
        try {
          const remote = await inviteService.list();
          setInvites(prev => {
            const merged = [...prev];
            for (const dto of remote) {
              const link = `${APP_URL}/register?invite=${dto.token}`;
              if (!merged.find(i => i.token === dto.token)) {
                merged.push({
                  token: dto.token,
                  expiresAt: dto.expiresAt,
                  link,
                  email: dto.email ?? undefined,
                  usedAt: dto.usedAt,
                });
              }
            }
            return merged;
          });
        } catch {
          // silently ignore — show whatever is already in state
        } finally {
          setLoading(false);
        }
      }
      fetchInvites();
    }, [])
  );

  function openModal() {
    setEmail('');
    setExpirationDays(7);
    setGenError('');
    setModalVisible(true);
  }

  async function handleGenerate() {
    setGenError('');
    setGenerating(true);
    try {
      const result = await inviteService.create(email.trim() || undefined, expirationDays);
      const link = `${APP_URL}/register?invite=${result.token}`;
      setInvites(prev => [{ token: result.token, expiresAt: result.expiresAt, link, email: email.trim() || undefined }, ...prev]);
      setModalVisible(false);
    } catch (e: any) {
      setGenError('Erro ao gerar convite. Tente novamente.');
    } finally {
      setGenerating(false);
    }
  }

  async function copyLink(invite: GeneratedInvite) {
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(invite.link);
      }
    } catch {
      // silently ignore if clipboard API is unavailable
    }
    setCopiedToken(invite.token);
    setTimeout(() => setCopiedToken(null), 2000);
  }

  function getInviteStatus(invite: GeneratedInvite): { label: string; color: string } {
    if (invite.usedAt != null) return { label: 'Usado', color: '#e53935' };
    if (new Date(invite.expiresAt) < new Date()) return { label: 'Expirado', color: '#9e9e9e' };
    return { label: 'Ativo', color: '#4caf50' };
  }

  function formatExpiry(iso: string) {
    try {
      return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return iso;
    }
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Convites</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Generate button */}
      <View style={styles.generateRow}>
        <TouchableOpacity style={styles.generateBtn} onPress={openModal}>
          <Text style={styles.generateBtnText}>🎟️  Gerar convite</Text>
        </TouchableOpacity>
      </View>

      {/* List of invites */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={styles.generateBtn.backgroundColor} size="large" />
        </View>
      ) : (
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {invites.length === 0 && (
            <Text style={styles.empty}>Nenhum convite encontrado.</Text>
          )}
          {invites.map(invite => {
            const status = getInviteStatus(invite);
            return (
              <View key={invite.token} style={styles.inviteCard}>
                <View style={styles.inviteInfo}>
                  <View style={styles.inviteTopRow}>
                    {invite.email ? (
                      <Text style={styles.inviteEmail} numberOfLines={1}>{invite.email}</Text>
                    ) : (
                      <Text style={styles.inviteEmailAny}>Qualquer e-mail</Text>
                    )}
                    <View style={[styles.statusBadge, { backgroundColor: status.color + '22', borderColor: status.color }]}>
                      <Text style={[styles.statusBadgeText, { color: status.color }]}>{status.label}</Text>
                    </View>
                  </View>
                  <Text style={styles.inviteExpiry}>Expira em {formatExpiry(invite.expiresAt)}</Text>
                  <Text style={styles.inviteLink} numberOfLines={2}>{invite.link}</Text>
                </View>
                <TouchableOpacity style={styles.copyBtn} onPress={() => copyLink(invite)}>
                  <Text style={styles.copyBtnText}>
                    {copiedToken === invite.token ? '✅ Copiado' : '📋 Copiar'}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Generate Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Novo convite</Text>

            <Text style={styles.label}>E-mail (opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Restringir a um e-mail específico"
              placeholderTextColor={colors.inputPlaceholder}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Text style={styles.label}>Validade</Text>
            <View style={styles.expiryRow}>
              {EXPIRATION_OPTIONS.map(days => (
                <TouchableOpacity
                  key={days}
                  style={[styles.expiryOption, expirationDays === days && styles.expiryOptionActive]}
                  onPress={() => setExpirationDays(days)}
                >
                  <Text style={[styles.expiryOptionText, expirationDays === days && styles.expiryOptionTextActive]}>
                    {days} dias
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {genError !== '' && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{genError}</Text>
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
                disabled={generating}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={handleGenerate}
                disabled={generating}
              >
                {generating
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.confirmBtnText}>Gerar</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function makeStyles(c: ColorScheme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 56 : 24, paddingBottom: 16,
      backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.border,
    },
    backBtn: { padding: 8 },
    backIcon: { fontSize: 22, color: c.text },
    title: { fontSize: 20, fontWeight: 'bold', color: c.text },
    generateRow: { padding: 16 },
    generateBtn: {
      backgroundColor: c.green, borderRadius: 10,
      paddingVertical: 14, paddingHorizontal: 20, alignItems: 'center',
    },
    generateBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    list: { flex: 1 },
    listContent: { padding: 16, gap: 12 },
    empty: { color: c.textSecondary, textAlign: 'center', marginTop: 32, fontSize: 15 },
    inviteCard: {
      backgroundColor: c.surface, borderRadius: 12, padding: 16,
      borderWidth: 1, borderColor: c.border,
      flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    },
    inviteInfo: { flex: 1 },
    inviteTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
    inviteEmail: { color: c.text, fontSize: 14, fontWeight: '600', flexShrink: 1 },
    inviteEmailAny: { color: c.textSecondary, fontSize: 14, fontStyle: 'italic', flexShrink: 1 },
    statusBadge: {
      borderRadius: 6, borderWidth: 1,
      paddingHorizontal: 6, paddingVertical: 2, marginLeft: 8,
    },
    statusBadgeText: { fontSize: 11, fontWeight: '700' },
    inviteExpiry: { color: c.textTertiary, fontSize: 12, marginBottom: 6 },
    inviteLink: { color: c.textSecondary, fontSize: 11 },
    copyBtn: {
      backgroundColor: c.surfaceElevated, borderRadius: 8,
      paddingVertical: 8, paddingHorizontal: 12,
      borderWidth: 1, borderColor: c.border,
    },
    copyBtnText: { color: c.text, fontSize: 13, fontWeight: '500' },
    // Modal
    modalOverlay: {
      flex: 1, backgroundColor: '#00000080',
      justifyContent: 'center', alignItems: 'center', padding: 24,
    },
    modalCard: {
      width: '100%', maxWidth: 400,
      backgroundColor: c.surface, borderRadius: 16, padding: 24,
      borderWidth: 1, borderColor: c.border,
    },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: c.text, marginBottom: 20, textAlign: 'center' },
    label: { color: c.textSecondary, fontSize: 13, marginBottom: 6 },
    input: {
      backgroundColor: c.inputBg, borderRadius: 8, padding: 14,
      marginBottom: 16, fontSize: 15, borderWidth: 1, borderColor: c.inputBorder, color: c.text,
    },
    expiryRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    expiryOption: {
      flex: 1, paddingVertical: 10, borderRadius: 8,
      borderWidth: 1, borderColor: c.border, alignItems: 'center',
      backgroundColor: c.surfaceElevated,
    },
    expiryOptionActive: { borderColor: c.green, backgroundColor: c.greenDim },
    expiryOptionText: { color: c.textSecondary, fontSize: 14 },
    expiryOptionTextActive: { color: c.green, fontWeight: '600' },
    errorBox: {
      backgroundColor: c.redDim, borderRadius: 8, padding: 12,
      marginBottom: 16, borderWidth: 1, borderColor: c.redBorder,
    },
    errorText: { color: c.red, fontSize: 13, textAlign: 'center' },
    modalActions: { flexDirection: 'row', gap: 12 },
    cancelBtn: {
      flex: 1, paddingVertical: 13, borderRadius: 8, alignItems: 'center',
      borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceElevated,
    },
    cancelBtnText: { color: c.text, fontSize: 15 },
    confirmBtn: {
      flex: 1, paddingVertical: 13, borderRadius: 8, alignItems: 'center',
      backgroundColor: c.green,
    },
    confirmBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  });
}
