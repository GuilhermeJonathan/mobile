import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { authService, UserInfo } from '../services/authService';
import { resetToLogin } from '../navigation/navigationRef';

export default function ProfileScreen() {
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
        <ActivityIndicator size="large" color="#4CAF50" />
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 24 },
  avatarWrap: { alignItems: 'center', marginTop: 24, marginBottom: 32 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#1a1a2e', justifyContent: 'center', alignItems: 'center',
    elevation: 4,
  },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, elevation: 2, marginBottom: 32 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 12 },
  rowLabel: { fontSize: 14, color: '#888', flex: 1 },
  rowRight: { flex: 2, alignItems: 'flex-end' },
  rowValue: { fontSize: 15, color: '#1a1a2e', fontWeight: '500', textAlign: 'right', flex: 2 },
  expiryHint: { fontSize: 12, color: '#FF9800', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#f0f0f0' },
  btnLogout: {
    backgroundColor: '#e53935', borderRadius: 12, padding: 16,
    alignItems: 'center', elevation: 2,
  },
  btnLogoutText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
