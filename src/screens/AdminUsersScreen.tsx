import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  ActivityIndicator, Modal, Platform, RefreshControl, Image, TextInput, ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { adminService, UserListItem, WhatsAppAdminVinculo } from '../services/api';
import { useTheme } from '../theme/ThemeContext';
import { ColorScheme } from '../theme/colors';
import WhatsAppIcon from '../components/WhatsAppIcon';
import { PAGE_SIZE } from '../utils/constants';

const USER_TYPE_LABEL: Record<number, string> = {
  1: 'Admin',
  2: 'Usuário',
  3: 'Freight Forwarder',
  4: 'Cargo Agent',
};

const PLAN_LABEL: Record<number, string> = {
  0: 'Sem plano',
  1: 'Trial',
  2: 'Mensal',
  3: 'Anual',
};

function PlanBadge({ item, colors }: { item: UserListItem; colors: any }) {
  if (item.planType === 2 || item.planType === 3) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
        <View style={{ backgroundColor: colors.greenDim, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 }}>
          <Text style={{ color: colors.green, fontSize: 10, fontWeight: '700' }}>
            💳 {PLAN_LABEL[item.planType]}
          </Text>
        </View>
      </View>
    );
  }
  if (item.planType === 1) {
    const expired = item.isTrialExpired;
    const days = item.trialDaysRemaining;
    const endsAt = item.trialEndsAt ? new Date(item.trialEndsAt).toLocaleDateString('pt-BR') : null;
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
        <View style={{
          backgroundColor: expired ? '#f8514918' : (days !== null && days <= 5 ? '#f59e0b18' : '#22c55e18'),
          borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1,
        }}>
          <Text style={{
            color: expired ? colors.red : (days !== null && days <= 5 ? '#f59e0b' : colors.green),
            fontSize: 10, fontWeight: '700',
          }}>
            {expired
              ? '⚠️ Trial expirado'
              : days !== null && days <= 5
                ? `⏳ Trial · ${days}d restantes`
                : `🎯 Trial · vence ${endsAt}`}
          </Text>
        </View>
      </View>
    );
  }
  return null;
}

export default function AdminUsersScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const [q, setQ]                       = useState('');
  const [planFilter, setPlanFilter]     = useState<number | null>(null);
  const [wppFilter, setWppFilter]       = useState<boolean | null>(null);

  // Toda vez que os filtros mudarem, volta ao início
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [q, planFilter, wppFilter]);

  const [selected,    setSelected]    = useState<UserListItem | null>(null);
  const [blocking,    setBlocking]    = useState(false);
  const [vinculos,    setVinculos]    = useState<WhatsAppAdminVinculo[]>([]);

  // — Setar plano —
  const [planEdit,    setPlanEdit]    = useState<number | null>(null);   // plano selecionado no editor
  const [trialDays,   setTrialDays]   = useState('30');
  const [savingPlan,  setSavingPlan]  = useState(false);
  const [planError,   setPlanError]   = useState<string | null>(null);
  const [planSuccess, setPlanSuccess] = useState(false);

  function openPlanEditor(item: UserListItem) {
    setPlanEdit(item.planType);
    setTrialDays('30');
    setPlanError(null);
    setPlanSuccess(false);
    setSelected(item);
  }

  async function handleSetPlan() {
    if (!selected || planEdit === null) return;
    setSavingPlan(true);
    setPlanError(null);
    setPlanSuccess(false);
    try {
      const days = planEdit === 1 ? Math.max(1, parseInt(trialDays) || 14) : undefined;
      await adminService.setPlan(selected.id, planEdit, days);
      // Atualiza localmente sem recarregar tudo
      const updated: Partial<UserListItem> = { planType: planEdit };
      if (planEdit === 1) {
        const endsAt = new Date();
        endsAt.setDate(endsAt.getDate() + (days ?? 14));
        updated.trialEndsAt = endsAt.toISOString();
        updated.trialDaysRemaining = days ?? 14;
        updated.isTrialExpired = false;
      } else {
        updated.trialEndsAt = null;
        updated.trialDaysRemaining = null;
        updated.isTrialExpired = false;
      }
      setUsers(prev => prev.map(u => u.id === selected.id ? { ...u, ...updated } : u));
      setSelected(prev => prev ? { ...prev, ...updated } as UserListItem : null);
      setPlanSuccess(true);
    } catch (e: any) {
      setPlanError(e?.response?.data?.message ?? e?.message ?? 'Erro ao atualizar plano.');
    } finally {
      setSavingPlan(false);
    }
  }

  const filtered = useMemo(() => {
    let list = users;
    if (planFilter !== null) list = list.filter(u => u.planType === planFilter);
    if (wppFilter !== null)  list = list.filter(u => vinculos.some(v => v.userId === u.id) === wppFilter);
    if (q.trim()) {
      const term = q.trim().toLowerCase();
      list = list.filter(u =>
        u.name?.toLowerCase().includes(term) ||
        u.email?.toLowerCase().includes(term)
      );
    }
    return list;
  }, [users, vinculos, q, planFilter, wppFilter]);

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError('');
    try {
      const [data, wppVinculos] = await Promise.all([
        adminService.listUsers(),
        adminService.listWhatsAppVinculos().catch(() => [] as WhatsAppAdminVinculo[]),
      ]);
      setUsers(data.items);
      setVinculos(wppVinculos);
    } catch {
      setError('Não foi possível carregar os usuários.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { load(); }, []));

  async function handleToggleBlock() {
    if (!selected) return;
    setBlocking(true);
    try {
      await adminService.setBlock(selected.id, !selected.isBlocked);
      setUsers(prev =>
        prev.map(u => u.id === selected.id ? { ...u, isBlocked: !u.isBlocked } : u)
      );
      setSelected(prev => prev ? { ...prev, isBlocked: !prev.isBlocked } : null);
    } catch {
      // silently fail — user will see state unchanged
    } finally {
      setBlocking(false);
    }
  }

  function formatDate(iso: string) {
    try {
      return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch { return iso; }
  }

  function formatDateTime(iso: string) {
    try {
      return new Date(iso).toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch { return iso; }
  }

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.green} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>
          Usuários ({filtered.length}{filtered.length !== users.length ? `/${users.length}` : ''})
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* ── Filtros ── */}
      <View style={styles.filterBar}>
        <View style={styles.searchRow}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nome ou e-mail..."
            placeholderTextColor={colors.inputPlaceholder}
            value={q}
            onChangeText={setQ}
            clearButtonMode="while-editing"
            autoCapitalize="none"
          />
          {q.length > 0 && (
            <TouchableOpacity onPress={() => setQ('')} style={styles.clearBtn}>
              <Text style={styles.clearBtnText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chipRow}>
          {/* Plano */}
          {([null, 0, 1, 2, 3] as (number | null)[]).map(p => {
            const label = p === null ? 'Todos' : PLAN_LABEL[p];
            const active = planFilter === p;
            return (
              <TouchableOpacity
                key={`plan-${p}`}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setPlanFilter(p)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {label}{p !== null && ` (${users.filter(u => u.planType === p).length})`}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* Divisor */}
          <View style={styles.chipDivider} />

          {/* WhatsApp */}
          {([
            { value: null,  label: '📱 Todos' },
            { value: true,  label: '✅ Vinculado' },
            { value: false, label: '— Não vinculado' },
          ] as { value: boolean | null; label: string }[]).map(opt => {
            const active = wppFilter === opt.value;
            return (
              <TouchableOpacity
                key={`wpp-${opt.value}`}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setWppFilter(opt.value)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {opt.label}{opt.value !== null && ` (${users.filter(u => vinculos.some(v => v.userId === u.id) === opt.value).length})`}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {error !== '' && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <FlatList
        data={filtered.slice(0, visibleCount)}
        keyExtractor={u => u.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.green} />}
        contentContainerStyle={styles.list}
        onEndReached={() => {
          if (visibleCount < filtered.length) {
            setVisibleCount(v => Math.min(v + PAGE_SIZE, filtered.length));
          }
        }}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          visibleCount < filtered.length ? (
            <ActivityIndicator size="small" color={colors.green} style={{ marginVertical: 16 }} />
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => openPlanEditor(item)} activeOpacity={0.75}>
            {/* Avatar */}
            {item.avatarUrl ? (
              <Image
                source={{ uri: item.avatarUrl }}
                style={[styles.avatar, item.isBlocked && styles.avatarBlocked]}
              />
            ) : (
              <View style={[styles.avatar, item.isBlocked && styles.avatarBlocked]}>
                <Text style={[styles.avatarText, item.isBlocked && { color: colors.red }]}>
                  {item.name?.[0]?.toUpperCase() ?? '?'}
                </Text>
              </View>
            )}

            {/* Info */}
            <View style={styles.info}>
              <View style={styles.nameRow}>
                <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                {item.isBlocked && (
                  <View style={styles.blockedBadge}>
                    <Text style={styles.blockedBadgeText}>Bloqueado</Text>
                  </View>
                )}
              </View>
              <Text style={styles.email} numberOfLines={1}>{item.email}</Text>
              <View style={styles.metaRow}>
                <Text style={styles.meta}>
                  {USER_TYPE_LABEL[item.userTypeId] ?? 'Desconhecido'} · Desde {formatDate(item.createdAt)}
                </Text>
                {vinculos.some(v => v.userId === item.id) && (
                  <WhatsAppIcon size={13} />
                )}
              </View>
              {item.ultimoLogin && (
                <Text style={styles.metaLogin}>
                  Último login: {formatDateTime(item.ultimoLogin)}
                </Text>
              )}
              <PlanBadge item={item} colors={colors} />
            </View>

            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>Nenhum usuário encontrado.</Text>
        }
      />

      {/* Detail Modal */}
      <Modal
        visible={!!selected}
        transparent
        animationType="slide"
        onRequestClose={() => setSelected(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center', paddingBottom: 8 }}>
            {selected && (
              <>
                {/* Avatar grande */}
                {selected.avatarUrl ? (
                  <Image
                    source={{ uri: selected.avatarUrl }}
                    style={[styles.modalAvatar, selected.isBlocked && styles.avatarBlocked]}
                  />
                ) : (
                  <View style={[styles.modalAvatar, selected.isBlocked && styles.avatarBlocked]}>
                    <Text style={styles.modalAvatarText}>
                      {selected.name?.[0]?.toUpperCase() ?? '?'}
                    </Text>
                  </View>
                )}

                <Text style={styles.modalName}>{selected.name}</Text>
                <Text style={styles.modalEmail}>{selected.email}</Text>

                {selected.document ? (
                  <Text style={styles.modalMeta}>CPF: {selected.document}</Text>
                ) : null}

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Tipo</Text>
                  <Text style={styles.detailValue}>{USER_TYPE_LABEL[selected.userTypeId] ?? '—'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <Text style={[styles.detailValue, selected.isBlocked ? styles.textRed : styles.textGreen]}>
                    {selected.isBlocked ? '🔒 Bloqueado' : '✅ Ativo'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Cadastro</Text>
                  <Text style={styles.detailValue}>{formatDate(selected.createdAt)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Último login</Text>
                  <Text style={styles.detailValue}>
                    {selected.ultimoLogin ? formatDateTime(selected.ultimoLogin) : '—'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Plano</Text>
                  <Text style={[styles.detailValue,
                    selected.planType >= 2 ? styles.textGreen :
                    selected.isTrialExpired ? styles.textRed : { color: colors.text }
                  ]}>
                    {PLAN_LABEL[selected.planType] ?? '—'}
                    {selected.planType === 1 && selected.isTrialExpired ? ' (expirado)' : ''}
                  </Text>
                </View>
                {selected.planType === 1 && selected.trialEndsAt && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>
                      {selected.isTrialExpired ? 'Trial expirou em' : 'Trial vence em'}
                    </Text>
                    <Text style={[styles.detailValue, selected.isTrialExpired ? styles.textRed : styles.textGreen]}>
                      {formatDate(selected.trialEndsAt)}
                      {!selected.isTrialExpired && selected.trialDaysRemaining !== null
                        ? ` · ${selected.trialDaysRemaining}d`
                        : ''}
                    </Text>
                  </View>
                )}

                {/* ── Editor de plano ── */}
                <View style={styles.planEditorBox}>
                  <Text style={styles.planEditorTitle}>Alterar plano</Text>
                  <View style={styles.planChipRow}>
                    {([0, 1, 2, 3] as number[]).map(p => {
                      const active = planEdit === p;
                      return (
                        <TouchableOpacity
                          key={p}
                          style={[styles.planChip, active && styles.planChipActive]}
                          onPress={() => { setPlanEdit(p); setPlanError(null); setPlanSuccess(false); }}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.planChipText, active && styles.planChipTextActive]}>
                            {PLAN_LABEL[p]}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {planEdit === 1 && (
                    <View style={styles.trialDaysRow}>
                      <Text style={styles.trialDaysLabel}>Dias de trial:</Text>
                      <TextInput
                        style={styles.trialDaysInput}
                        value={trialDays}
                        onChangeText={v => setTrialDays(v.replace(/[^0-9]/g, ''))}
                        keyboardType="number-pad"
                        maxLength={3}
                        selectTextOnFocus
                      />
                    </View>
                  )}

                  {planError   && <Text style={styles.planError}>{planError}</Text>}
                  {planSuccess && <Text style={styles.planSuccess}>✅ Plano atualizado!</Text>}

                  <TouchableOpacity
                    style={[styles.planSaveBtn, (savingPlan || planEdit === null) && { opacity: 0.6 }]}
                    onPress={handleSetPlan}
                    disabled={savingPlan || planEdit === null}
                  >
                    {savingPlan
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={styles.planSaveBtnText}>Aplicar plano</Text>
                    }
                  </TouchableOpacity>
                </View>

                {(() => {
                  const vinculo = vinculos.find(v => v.userId === selected.id);
                  return (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>WhatsApp</Text>
                      {vinculo ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <WhatsAppIcon size={15} />
                          <Text style={[styles.detailValue, styles.textGreen]}>{vinculo.phoneNumber}</Text>
                        </View>
                      ) : (
                        <Text style={[styles.detailValue, { color: colors.textTertiary }]}>— não vinculado</Text>
                      )}
                    </View>
                  );
                })()}

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.blockBtn, selected.isBlocked && styles.unblockBtn]}
                    onPress={handleToggleBlock}
                    disabled={blocking}
                  >
                    {blocking
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={styles.blockBtnText}>
                          {selected.isBlocked ? '🔓 Desbloquear' : '🔒 Bloquear'}
                        </Text>
                    }
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.closeBtn}
                    onPress={() => setSelected(null)}
                  >
                    <Text style={styles.closeBtnText}>Fechar</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
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
    filterBar: {
      backgroundColor: c.surface,
      borderBottomWidth: 1, borderBottomColor: c.border,
      paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 10,
    },
    searchRow: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: c.background,
      borderRadius: 10, borderWidth: 1, borderColor: c.inputBorder,
      paddingHorizontal: 12, gap: 8,
    },
    searchIcon: { fontSize: 14 },
    searchInput: { flex: 1, color: c.text, fontSize: 14, paddingVertical: 9 },
    clearBtn: { padding: 4 },
    clearBtnText: { color: c.textSecondary, fontSize: 13 },
    chipScroll: { flexGrow: 0 },
    chipRow: { flexDirection: 'row', gap: 6, paddingVertical: 2, alignItems: 'center' },
    chipDivider: { width: 1, height: 20, backgroundColor: c.border, marginHorizontal: 4 },
    chip: {
      paddingHorizontal: 12, paddingVertical: 6,
      borderRadius: 20, borderWidth: 1,
      borderColor: c.border, backgroundColor: c.background,
    },
    chipActive: {
      backgroundColor: c.green + '22',
      borderColor: c.green,
    },
    chipText: { color: c.textSecondary, fontSize: 12, fontWeight: '600' },
    chipTextActive: { color: c.green },
    errorBox: {
      margin: 16, padding: 12, borderRadius: 8,
      backgroundColor: c.redDim, borderWidth: 1, borderColor: c.redBorder,
    },
    errorText: { color: c.red, textAlign: 'center', fontSize: 14 },
    list: { padding: 16, gap: 10 },
    empty: { color: c.textSecondary, textAlign: 'center', marginTop: 40, fontSize: 15 },
    card: {
      backgroundColor: c.surface, borderRadius: 12, padding: 14,
      borderWidth: 1, borderColor: c.border,
      flexDirection: 'row', alignItems: 'center', gap: 12,
    },
    avatar: {
      width: 44, height: 44, borderRadius: 22,
      backgroundColor: c.surfaceElevated,
      borderWidth: 2, borderColor: c.green,
      justifyContent: 'center', alignItems: 'center',
    },
    avatarBlocked: { borderColor: c.red },
    avatarText: { color: c.green, fontSize: 18, fontWeight: 'bold' },
    info: { flex: 1 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
    name: { color: c.text, fontSize: 15, fontWeight: '600', flexShrink: 1 },
    blockedBadge: {
      backgroundColor: c.redDim, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2,
    },
    blockedBadgeText: { color: c.red, fontSize: 10, fontWeight: '700' },
    email: { color: c.textSecondary, fontSize: 13, marginBottom: 2 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    meta: { color: c.textTertiary, fontSize: 12 },
    metaLogin: { color: c.textTertiary, fontSize: 11, marginTop: 1, fontStyle: 'italic' },
    chevron: { color: c.textTertiary, fontSize: 20 },
    // Modal
    modalOverlay: {
      flex: 1, backgroundColor: '#00000088',
      justifyContent: 'flex-end', alignItems: 'center',
    },
    modalCard: {
      backgroundColor: c.surface,
      borderTopLeftRadius: 20, borderTopRightRadius: 20,
      padding: 24, paddingBottom: 16,
      borderWidth: 1, borderColor: c.border,
      maxHeight: '82%',
      width: '100%', maxWidth: 520,
    },
    modalAvatar: {
      width: 64, height: 64, borderRadius: 32,
      backgroundColor: c.surfaceElevated, borderWidth: 2, borderColor: c.green,
      justifyContent: 'center', alignItems: 'center', marginBottom: 10,
    },
    modalAvatarText: { color: c.green, fontSize: 26, fontWeight: 'bold' },
    modalName: { fontSize: 18, fontWeight: 'bold', color: c.text, marginBottom: 3 },
    modalEmail: { fontSize: 13, color: c.textSecondary, marginBottom: 3 },
    modalMeta: { fontSize: 12, color: c.textTertiary, marginBottom: 12 },
    detailRow: {
      flexDirection: 'row', justifyContent: 'space-between',
      width: '100%', paddingVertical: 9,
      borderBottomWidth: 1, borderBottomColor: c.border,
    },
    detailLabel: { color: c.textSecondary, fontSize: 14 },
    detailValue: { color: c.text, fontSize: 14, fontWeight: '500' },
    textRed: { color: c.red },
    textGreen: { color: c.green },
    planEditorBox: {
      width: '100%', marginTop: 16, marginBottom: 4,
      backgroundColor: c.background, borderRadius: 12,
      borderWidth: 1, borderColor: c.border, padding: 14, gap: 10,
    },
    planEditorTitle: { color: c.textSecondary, fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
    planChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    planChip: {
      paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
      borderWidth: 1, borderColor: c.border, backgroundColor: c.surface,
    },
    planChipActive:     { backgroundColor: c.green + '22', borderColor: c.green },
    planChipText:       { color: c.textSecondary, fontSize: 13, fontWeight: '600' },
    planChipTextActive: { color: c.green },
    trialDaysRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    trialDaysLabel: { color: c.textSecondary, fontSize: 13, flex: 1 },
    trialDaysInput: {
      backgroundColor: c.surface, borderRadius: 8,
      borderWidth: 1, borderColor: c.inputBorder,
      color: c.text, fontSize: 15, fontWeight: '700',
      paddingHorizontal: 12, paddingVertical: 6,
      width: 72, textAlign: 'center',
    },
    planError:   { color: c.red,   fontSize: 12, fontWeight: '500' },
    planSuccess: { color: c.green, fontSize: 12, fontWeight: '500' },
    planSaveBtn: {
      backgroundColor: c.green, borderRadius: 10,
      paddingVertical: 11, alignItems: 'center', marginTop: 2,
    },
    planSaveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
    modalActions: { width: '100%', gap: 10, marginTop: 20 },
    blockBtn: {
      backgroundColor: c.red, borderRadius: 10,
      paddingVertical: 14, alignItems: 'center',
    },
    unblockBtn: { backgroundColor: c.green },
    blockBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
    closeBtn: {
      backgroundColor: c.surfaceElevated, borderRadius: 10,
      paddingVertical: 14, alignItems: 'center',
      borderWidth: 1, borderColor: c.border,
    },
    closeBtnText: { color: c.text, fontSize: 15 },
  });
}
