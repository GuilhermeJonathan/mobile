import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Switch } from 'react-native';
import { authService, UserInfo } from '../services/authService';
import { resetToLogin } from '../navigation/navigationRef';
import { useTheme } from '../theme/ThemeContext';
import { ColorScheme } from '../theme/colors';

export default function ProfileScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    authService.getUserInfo().then(info => {
      setUser(info);
      setLoading(false);
    });
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    await authService.logout();
    resetToLogin();
  }

  function formatExpiry(date: Date | null): string {
    if (!date) return '—';
    return date.toLocaleString('pt-BR');
  }

  function timeUntilExpiry(date: Date | null): string {
    if (!date) return '';
    const diff = date.getTime() - Date.now();
    if (diff <= 0) return 'Expirado';
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `expira em ${mins} min`;
    const hrs = Math.floor(mins / 60);
    return `expira em ${hrs}h${mins % 60 > 0 ? ` ${mins % 60}min` : ''}`;
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.green} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Avatar */}
      <View style={styles.avatarWrap}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.email?.[0]?.toUpperCase() ?? '?'}
          </Text>
        </View>
      </View>

      {/* Dados */}
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>E-mail</Text>
          <Text style={styles.rowValue}>{user?.email ?? '—'}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Sessão válida até</Text>
          <View style={styles.rowRight}>
            <Text style={styles.rowValue}>{formatExpiry(user?.expiresAt ?? null)}</Text>
            {user?.expiresAt && (
              <Text style={styles.expiryHint}>{timeUntilExpiry(user.expiresAt)}</Text>
            )}
          </View>
        </View>
      </View>

      {/* Tema */}
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowLabel}>Tema</Text>
            <Text style={styles.themeHint}>{isDark ? '🌙 Escuro' : '☀️ Claro'}</Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: '#ddd', true: colors.green }}
            thumbColor="#fff"
          />
        </View>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.btnLogout} onPress={handleLogout} disabled={loggingOut}>
        {loggingOut
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.btnLogoutText}>Sair da conta</Text>
        }
      </TouchableOpacity>
    </View>
  );
}

function makeStyles(c: ColorScheme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background, padding: 24 },
    avatarWrap: { alignItems: 'center', marginTop: 24, marginBottom: 32 },
    avatar: {
      width: 80, height: 80, borderRadius: 40,
      backgroundColor: c.surface, justifyContent: 'center', alignItems: 'center',
      borderWidth: 2, borderColor: c.green,
    },
    avatarText: { color: c.green, fontSize: 32, fontWeight: 'bold' },
    card: {
      backgroundColor: c.surface, borderRadius: 12, padding: 16,
      marginBottom: 16, borderWidth: 1, borderColor: c.border,
    },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
    rowLabel: { fontSize: 14, color: c.textSecondary, flex: 1 },
    rowRight: { flex: 2, alignItems: 'flex-end' },
    rowValue: { fontSize: 15, color: c.text, fontWeight: '500', textAlign: 'right', flex: 2 },
    expiryHint: { fontSize: 12, color: c.orange, marginTop: 2 },
    themeHint: { fontSize: 13, color: c.textSecondary, marginTop: 2 },
    divider: { height: 1, backgroundColor: c.border },
    btnLogout: {
      backgroundColor: c.red, borderRadius: 12, padding: 16,
      alignItems: 'center', marginTop: 8,
    },
    btnLogoutText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  });
}
