import React, { useEffect, useRef, useState } from 'react';
import {
  Animated, Dimensions, Modal, StyleSheet, Switch,
  Text, TouchableOpacity, TouchableWithoutFeedback, View, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authService, UserInfo } from '../services/authService';
import { resetToLogin } from '../navigation/navigationRef';
import { useTheme } from '../theme/ThemeContext';
import { navigationRef } from '../navigation/navigationRef';

const DRAWER_WIDTH = Math.min(Dimensions.get('window').width * 0.78, 320);

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function UserDrawer({ visible, onClose }: Props) {
  const { colors, isDark, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(DRAWER_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [user, setUser] = useState<UserInfo | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (visible) {
      authService.getUserInfo().then(setUser);
      authService.isAdmin().then(setIsAdmin).catch(() => setIsAdmin(false));
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 260, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 260, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: DRAWER_WIDTH, duration: 220, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  async function handleLogout() {
    setLoggingOut(true);
    await authService.logout();
    onClose();
    resetToLogin();
  }

  function formatExpiry(date: Date | null): string {
    if (!date) return '—';
    const diff = date.getTime() - Date.now();
    if (diff <= 0) return 'Sessão expirada';
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `Expira em ${mins} min`;
    const hrs = Math.floor(mins / 60);
    return `Expira em ${hrs}h${mins % 60 > 0 ? ` ${mins % 60}min` : ''}`;
  }

  const s = styles(colors, insets);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[s.backdrop, { opacity: fadeAnim }]} />
      </TouchableWithoutFeedback>

      {/* Drawer */}
      <Animated.View style={[s.drawer, { transform: [{ translateX: slideAnim }] }]}>

        {/* Header com avatar */}
        <View style={s.header}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>
              {user?.name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? '?'}
            </Text>
          </View>
          {user?.name ? <Text style={s.name} numberOfLines={1}>{user.name}</Text> : null}
          <Text style={s.email} numberOfLines={1}>{user?.email ?? '—'}</Text>
          <Text style={s.expiry}>{formatExpiry(user?.expiresAt ?? null)}</Text>
        </View>

        <View style={s.divider} />

        {/* Tema */}
        <View style={s.row}>
          <Text style={s.rowIcon}>{isDark ? '🌙' : '☀️'}</Text>
          <Text style={s.rowLabel}>{isDark ? 'Tema escuro' : 'Tema claro'}</Text>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: '#ddd', true: colors.green }}
            thumbColor="#fff"
          />
        </View>

        {isAdmin && (
          <>
            <View style={s.divider} />
            <TouchableOpacity
              style={s.row}
              onPress={() => {
                onClose();
                navigationRef.current?.navigate('Invites' as never);
              }}
            >
              <Text style={s.rowIcon}>🎟️</Text>
              <Text style={s.rowLabel}>Convites</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={s.divider} />

        {/* Logout */}
        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} disabled={loggingOut}>
          {loggingOut
            ? <ActivityIndicator color="#fff" size="small" />
            : <>
                <Text style={s.logoutIcon}>🚪</Text>
                <Text style={s.logoutText}>Sair da conta</Text>
              </>
          }
        </TouchableOpacity>

      </Animated.View>
    </Modal>
  );
}

function styles(c: ReturnType<typeof import('../theme/ThemeContext').useTheme>['colors'], insets: { top: number; bottom: number }) {
  return StyleSheet.create({
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: '#00000088',
    },
    drawer: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      width: DRAWER_WIDTH,
      backgroundColor: c.surface,
      paddingTop: insets.top + 16,
      paddingBottom: insets.bottom + 16,
      shadowColor: '#000',
      shadowOffset: { width: -4, height: 0 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 16,
    },
    header: {
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingBottom: 24,
      gap: 8,
    },
    avatar: {
      width: 72, height: 72, borderRadius: 36,
      backgroundColor: c.surfaceElevated,
      justifyContent: 'center', alignItems: 'center',
      borderWidth: 2, borderColor: c.green,
      marginBottom: 4,
    },
    avatarText: { color: c.green, fontSize: 28, fontWeight: 'bold' },
    name: { color: c.text, fontSize: 17, fontWeight: '700', textAlign: 'center' },
    email: { color: c.textSecondary, fontSize: 13, textAlign: 'center' },
    expiry: { color: c.textTertiary, fontSize: 12 },
    divider: { height: 1, backgroundColor: c.border, marginHorizontal: 16, marginVertical: 8 },
    row: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 20, paddingVertical: 14, gap: 12,
    },
    rowIcon: { fontSize: 18 },
    rowLabel: { flex: 1, color: c.text, fontSize: 15 },
    logoutBtn: {
      flexDirection: 'row', alignItems: 'center',
      marginHorizontal: 16, marginTop: 8,
      backgroundColor: c.red, borderRadius: 12,
      paddingVertical: 14, paddingHorizontal: 20, gap: 10,
      justifyContent: 'center',
    },
    logoutIcon: { fontSize: 18 },
    logoutText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  });
}
