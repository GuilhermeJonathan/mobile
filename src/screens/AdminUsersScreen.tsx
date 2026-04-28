import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  ActivityIndicator, Modal, Platform, RefreshControl, Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { adminService, UserListItem } from '../services/api';
import { useTheme } from '../theme/ThemeContext';
import { ColorScheme } from '../theme/colors';

const USER_TYPE_LABEL: Record<number, string> = {
  1: 'Admin',
  2: 'Usuário',
  3: 'Freight Forwarder',
  4: 'Cargo Agent',
};

export default function AdminUsersScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [selected, setSelected] = useState<UserListItem | null>(null);
  const [blocking, setBlocking] = useState(false);

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError('');
    try {
      const data = await adminService.listUsers();
      setUsers(data.items);
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
        <Text style={styles.title}>Usuários ({users.length})</Text>
        <View style={{ width: 40 }} />
      </View>

      {error !== '' && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <FlatList
        data={users}
        keyExtractor={u => u.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.green} />}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => setSelected(item)} activeOpacity={0.75}>
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
              <Text style={styles.meta}>
                {USER_TYPE_LABEL[item.userTypeId] ?? 'Desconhecido'} · Desde {formatDate(item.createdAt)}
              </Text>
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
    meta: { color: c.textTertiary, fontSize: 12 },
    chevron: { color: c.textTertiary, fontSize: 20 },
    // Modal
    modalOverlay: {
      flex: 1, backgroundColor: '#00000088',
      justifyContent: 'flex-end',
    },
    modalCard: {
      backgroundColor: c.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
      padding: 28, borderWidth: 1, borderColor: c.border,
      alignItems: 'center',
    },
    modalAvatar: {
      width: 72, height: 72, borderRadius: 36,
      backgroundColor: c.surfaceElevated, borderWidth: 2, borderColor: c.green,
      justifyContent: 'center', alignItems: 'center', marginBottom: 12,
    },
    modalAvatarText: { color: c.green, fontSize: 28, fontWeight: 'bold' },
    modalName: { fontSize: 20, fontWeight: 'bold', color: c.text, marginBottom: 4 },
    modalEmail: { fontSize: 14, color: c.textSecondary, marginBottom: 4 },
    modalMeta: { fontSize: 13, color: c.textTertiary, marginBottom: 16 },
    detailRow: {
      flexDirection: 'row', justifyContent: 'space-between',
      width: '100%', paddingVertical: 10,
      borderBottomWidth: 1, borderBottomColor: c.border,
    },
    detailLabel: { color: c.textSecondary, fontSize: 14 },
    detailValue: { color: c.text, fontSize: 14, fontWeight: '500' },
    textRed: { color: c.red },
    textGreen: { color: c.green },
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
