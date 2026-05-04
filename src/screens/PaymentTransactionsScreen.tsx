import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  ActivityIndicator, Platform, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { paymentService, PaymentTransactionDto } from '../services/api';
import { useTheme } from '../theme/ThemeContext';
import { ColorScheme } from '../theme/colors';
import { fmtBRL } from '../utils/currency';
import { PAGE_SIZE } from '../utils/constants';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

function planLabel(planType: string): string {
  return planType === 'Annual' ? 'Anual' : 'Mensal';
}

// ─── Summary card ─────────────────────────────────────────────────────────────

interface SummaryCardProps {
  label: string;
  value: string;
  accent?: string;
  colors: ColorScheme;
}

function SummaryCard({ label, value, accent, colors }: SummaryCardProps) {
  const s = useMemo(() => summaryStyles(colors), [colors]);
  return (
    <View style={[s.card, accent ? { borderColor: accent + '50' } : undefined]}>
      <Text style={s.label}>{label}</Text>
      <Text style={[s.value, accent ? { color: accent } : undefined]}>{value}</Text>
    </View>
  );
}

function summaryStyles(c: ColorScheme) {
  return StyleSheet.create({
    card: {
      flex: 1, backgroundColor: c.surface, borderRadius: 12,
      padding: 14, borderWidth: 1, borderColor: c.border,
      alignItems: 'center', gap: 4,
    },
    label: { fontSize: 11, color: c.textSecondary, fontWeight: '600', textAlign: 'center' },
    value: { fontSize: 16, color: c.text, fontWeight: '700', textAlign: 'center' },
  });
}

// ─── Transaction row ──────────────────────────────────────────────────────────

interface RowProps {
  item: PaymentTransactionDto;
  colors: ColorScheme;
}

function TransactionRow({ item, colors }: RowProps) {
  const isAnnual = item.planType === 'Annual';
  const isAuthorized = item.status === 'authorized';

  return (
    <View style={[rowStyles(colors).card]}>
      {/* Top line: name + status dot */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View
          style={{
            width: 8, height: 8, borderRadius: 4,
            backgroundColor: isAuthorized ? colors.green : colors.red,
            flexShrink: 0,
          }}
        />
        <Text style={{ flex: 1, color: colors.text, fontSize: 14, fontWeight: '600' }} numberOfLines={1}>
          {item.userName}
        </Text>
        <Text style={{ color: colors.green, fontSize: 14, fontWeight: '700' }}>
          {fmtBRL(item.amount)}
        </Text>
      </View>

      {/* Second line: email */}
      <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 3, marginLeft: 16 }} numberOfLines={1}>
        {item.userEmail}
      </Text>

      {/* Third line: plan badge + date */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, marginLeft: 16 }}>
        <View style={{
          backgroundColor: isAnnual ? colors.greenDim : colors.blueDim,
          borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2,
          borderWidth: 1, borderColor: isAnnual ? colors.greenBorder : colors.blueBorder,
        }}>
          <Text style={{
            color: isAnnual ? colors.green : colors.blue,
            fontSize: 11, fontWeight: '700',
          }}>
            {planLabel(item.planType)}
          </Text>
        </View>
        <Text style={{ color: colors.textTertiary, fontSize: 12, flex: 1 }}>
          {formatDateTime(item.paidAt)}
        </Text>
        {!isAuthorized && (
          <View style={{
            backgroundColor: colors.redDim, borderRadius: 6,
            paddingHorizontal: 7, paddingVertical: 2,
            borderWidth: 1, borderColor: colors.redBorder,
          }}>
            <Text style={{ color: colors.red, fontSize: 11, fontWeight: '700' }}>
              Cancelado
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

// Separate function so it's outside the component render path
function rowStyles(c: ColorScheme) {
  return StyleSheet.create({
    card: {
      backgroundColor: c.surface, borderRadius: 12, padding: 14,
      borderWidth: 1, borderColor: c.border, marginBottom: 10,
    },
  });
}

// ─── Main screen ──────────────────────────────────────────────────────────────


export default function PaymentTransactionsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [items, setItems]           = useState<PaymentTransactionDto[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState('');
  const [page, setPage]             = useState(1);
  const [hasMore, setHasMore]       = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [total, setTotal]           = useState(0);

  async function load(isRefresh = false) {
    if (isRefresh) {
      setRefreshing(true);
      setPage(1);
      setHasMore(true);
    } else {
      setLoading(true);
    }
    setError('');
    try {
      const result = await paymentService.getTransactions(1, PAGE_SIZE);
      setItems(result.items ?? []);
      setTotal(result.total);
      setHasMore((result.items?.length ?? 0) < result.total);
      setPage(2);
    } catch {
      setError('Não foi possível carregar as transações.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function loadMore() {
    if (!hasMore || loadingMore || refreshing) return;
    setLoadingMore(true);
    try {
      const result = await paymentService.getTransactions(page, PAGE_SIZE);
      const newItems = result.items ?? [];
      setItems(prev => {
        const combined = [...prev, ...newItems];
        setHasMore(combined.length < result.total);
        return combined;
      });
      setPage(p => p + 1);
      setTotal(result.total);
    } catch {
      // silently ignore — user can scroll again
    } finally {
      setLoadingMore(false);
    }
  }

  useFocusEffect(useCallback(() => { load(); }, []));

  // ── Derived stats ──────────────────────────────────────────────────────────
  const authorized = items.filter(i => i.status === 'authorized');
  const totalRevenue = authorized.reduce((sum, i) => sum + i.amount, 0);
  const monthlyCount = authorized.filter(i => i.planType === 'Monthly').length;
  const annualCount  = authorized.filter(i => i.planType === 'Annual').length;

  // ── Loading state (only while list is empty) ───────────────────────────────
  if (loading && items.length === 0) {
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
        <Text style={styles.title}>💳 Transações</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Error */}
      {error !== '' && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <FlatList
        data={items}
        keyExtractor={i => i.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.green} />
        }
        contentContainerStyle={styles.list}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator size="small" color={colors.green} style={{ marginVertical: 16 }} />
          ) : null
        }
        ListHeaderComponent={
          <>
            {/* Summary cards */}
            <View style={styles.summaryRow}>
              <SummaryCard
                label="Total de transações"
                value={String(total)}
                colors={colors}
              />
              <SummaryCard
                label="Receita confirmada"
                value={fmtBRL(totalRevenue)}
                accent={colors.green}
                colors={colors}
              />
            </View>
            <View style={[styles.summaryRow, { marginTop: 10 }]}>
              <SummaryCard
                label="Mensal"
                value={String(monthlyCount)}
                accent={colors.blue}
                colors={colors}
              />
              <SummaryCard
                label="Anual"
                value={String(annualCount)}
                accent={colors.green}
                colors={colors}
              />
            </View>

            <Text style={styles.listHeader}>
              Histórico ({total})
            </Text>
          </>
        }
        renderItem={({ item }) => (
          <TransactionRow item={item} colors={colors} />
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>Nenhuma transação encontrada.</Text>
        }
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(c: ColorScheme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: Platform.OS === 'ios' ? 56 : 24,
      paddingBottom: 16,
      backgroundColor: c.surface,
      borderBottomWidth: 1, borderBottomColor: c.border,
    },
    backBtn:  { padding: 8 },
    backIcon: { fontSize: 22, color: c.text },
    title:    { fontSize: 20, fontWeight: 'bold', color: c.text },
    errorBox: {
      margin: 16, padding: 12, borderRadius: 8,
      backgroundColor: c.redDim, borderWidth: 1, borderColor: c.redBorder,
    },
    errorText: { color: c.red, textAlign: 'center', fontSize: 14 },
    list:      { padding: 16, paddingTop: 16 },
    summaryRow: { flexDirection: 'row', gap: 10 },
    listHeader: {
      color: c.textSecondary, fontSize: 12, fontWeight: '700',
      letterSpacing: 0.5, marginTop: 24, marginBottom: 12,
      textTransform: 'uppercase',
    },
    empty: { color: c.textSecondary, textAlign: 'center', marginTop: 40, fontSize: 15 },
  });
}
