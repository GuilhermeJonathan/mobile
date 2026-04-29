import React, { useEffect, useRef, useState } from 'react';
import {
  Animated, Dimensions, Modal, StyleSheet, Switch, Image,
  Text, TouchableOpacity, TouchableWithoutFeedback, View,
  ActivityIndicator, ScrollView, Alert, Platform,
} from 'react-native';

const isMobileWeb = Platform.OS === 'web' && Dimensions.get('window').width < 768;
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { authService, UserInfo } from '../services/authService';
import { resetToLogin } from '../navigation/navigationRef';
import { useTheme } from '../theme/ThemeContext';
import { navigationRef } from '../navigation/navigationRef';
import { useVencimentos } from '../contexts/VencimentosContext';
import { fmtBRL } from '../utils/currency';
import WhatsAppIcon from './WhatsAppIcon';
import { vinculosService, MeuVinculoDto } from '../services/api';

const DRAWER_WIDTH = Math.min(Dimensions.get('window').width * 0.78, 320);

interface Props {
  visible: boolean;
  onClose: () => void;
}

const TIPO_CONFIG = {
  vencido: { cor: '#e53935', label: 'Vencido',        icon: '🔴' },
  hoje:    { cor: '#FF9800', label: 'Vence hoje',     icon: '⚠️' },
  breve:   { cor: '#FF9800', label: 'Vence em breve', icon: '🟠' },
};

function fmtData(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
}

/** Redimensiona uma imagem via canvas (web only). */
async function resizeOnWeb(uri: string, maxPx = 400): Promise<string> {
  return new Promise((resolve) => {
    const img = new (window as any).Image();
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.72));
    };
    img.onerror = () => resolve(uri);
    img.src = uri;
  });
}

export default function UserDrawer({ visible, onClose }: Props) {
  const { colors, isDark, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { badge, alertas, clear: clearAlertas } = useVencimentos();
  const slideAnim = useRef(new Animated.Value(DRAWER_WIDTH)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  const [user, setUser]           = useState<UserInfo | null>(null);
  const [isAdmin, setIsAdmin]     = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [meuVinculo, setMeuVinculo] = useState<MeuVinculoDto | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (visible) {
      authService.getUserInfo().then(setUser);
      authService.isAdmin().then(setIsAdmin).catch(() => setIsAdmin(false));
      vinculosService.meuVinculo().then(setMeuVinculo).catch(() => setMeuVinculo(null));
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0,           duration: 260, useNativeDriver: true }),
        Animated.timing(fadeAnim,  { toValue: 1,           duration: 260, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: DRAWER_WIDTH, duration: 220, useNativeDriver: true }),
        Animated.timing(fadeAnim,  { toValue: 0,            duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  async function handleLogout() {
    setLoggingOut(true);
    clearAlertas();
    await authService.logout();
    onClose();
    resetToLogin();
  }

  async function handlePickAvatar() {
    // Pede permissão (iOS/Android)
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão necessária', 'Permita o acesso à galeria para trocar a foto.');
        return;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.72,
      base64: Platform.OS !== 'web', // web já retorna data URI no asset.uri
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    let dataUrl: string;

    if (Platform.OS === 'web') {
      // No web, uri já é um data URL — redimensiona via canvas
      dataUrl = await resizeOnWeb(asset.uri, 400);
    } else {
      if (!asset.base64) return;
      const mime = asset.mimeType ?? 'image/jpeg';
      dataUrl = `data:${mime};base64,${asset.base64}`;
    }

    setUploadingAvatar(true);
    try {
      await authService.updateAvatar(dataUrl);
      setUser(prev => prev ? { ...prev, avatarUrl: dataUrl } : prev);
    } catch {
      Alert.alert('Erro', 'Não foi possível atualizar a foto de perfil.');
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleRemoveAvatar() {
    setUploadingAvatar(true);
    try {
      await authService.updateAvatar(null);
      setUser(prev => prev ? { ...prev, avatarUrl: null } : prev);
    } catch {
      Alert.alert('Erro', 'Não foi possível remover a foto.');
    } finally {
      setUploadingAvatar(false);
    }
  }

  function promptAvatarOptions() {
    if (Platform.OS === 'web') {
      // Web: vai direto para o picker
      handlePickAvatar();
      return;
    }
    const opts: any[] = [
      { text: user?.avatarUrl ? 'Alterar foto' : 'Escolher foto', onPress: handlePickAvatar },
    ];
    if (user?.avatarUrl) {
      opts.push({ text: 'Remover foto', style: 'destructive', onPress: handleRemoveAvatar });
    }
    opts.push({ text: 'Cancelar', style: 'cancel' });
    Alert.alert('Foto de perfil', undefined, opts);
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
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
        >

          {/* ── Header com avatar ──────────────────────────────────── */}
          <View style={s.header}>
            <TouchableOpacity onPress={promptAvatarOptions} disabled={uploadingAvatar} style={s.avatarWrap}>
              {uploadingAvatar ? (
                <View style={[s.avatar, s.avatarLoading]}>
                  <ActivityIndicator color={colors.green} />
                </View>
              ) : user?.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} style={s.avatarImage} />
              ) : (
                <View style={s.avatar}>
                  <Text style={s.avatarText}>
                    {user?.name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? '?'}
                  </Text>
                </View>
              )}
              {/* Ícone de câmera */}
              <View style={s.cameraIcon}>
                <Text style={{ fontSize: 11 }}>📷</Text>
              </View>
            </TouchableOpacity>

            {user?.name ? <Text style={s.name} numberOfLines={1}>{user.name}</Text> : null}
            <Text style={s.email} numberOfLines={1}>{user?.email ?? '—'}</Text>
            <Text style={s.expiry}>{formatExpiry(user?.expiresAt ?? null)}</Text>
          </View>

          {/* ── Central de alertas ─────────────────────────────────── */}
          {alertas.length > 0 && (
            <>
              <View style={s.divider} />
              <View style={s.alertHeader}>
                <Text style={s.alertTitle}>🔔 Alertas</Text>
                <View style={s.alertBadge}>
                  <Text style={s.alertBadgeText}>{badge}</Text>
                </View>
              </View>
              {alertas.map(a => {
                const cfg = TIPO_CONFIG[a.tipo];
                return (
                  <TouchableOpacity
                    key={a.id}
                    style={s.alertItem}
                    onPress={() => {
                      onClose();
                      const filtroSit = a.tipo === 'vencido' ? 'vencido' : 'pendente';
                      const now = new Date();
                      (navigationRef.current as any)?.navigate('Main', {
                        screen: 'Lançamentos',
                        params: { filtroSit, mes: now.getMonth() + 1, ano: now.getFullYear() },
                      });
                    }}
                  >
                    <Text style={s.alertItemIcon}>{cfg.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={s.alertItemDesc} numberOfLines={1}>{a.descricao}</Text>
                      <Text style={[s.alertItemLabel, { color: cfg.cor }]}>
                        {cfg.label} · {fmtData(a.data)}
                      </Text>
                    </View>
                    <Text style={[s.alertItemValor, { color: cfg.cor }]}>
                      {fmtBRL(a.valor)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </>
          )}

          <View style={s.divider} />

          {/* ── Tema ───────────────────────────────────────────────── */}
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
                onPress={() => { onClose(); navigationRef.current?.navigate('AdminUsers' as never); }}
              >
                <Text style={s.rowIcon}>👥</Text>
                <Text style={s.rowLabel}>Usuários</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.row}
                onPress={() => { onClose(); navigationRef.current?.navigate('Invites' as never); }}
              >
                <Text style={s.rowIcon}>🎟️</Text>
                <Text style={s.rowLabel}>Convites</Text>
              </TouchableOpacity>
            </>
          )}

          <View style={s.divider} />

          {/* ── Metas ──────────────────────────────────────────────── */}
          <TouchableOpacity
            style={s.row}
            onPress={() => { onClose(); navigationRef.current?.navigate('Metas' as never); }}
          >
            <Text style={s.rowIcon}>🎯</Text>
            <Text style={s.rowLabel}>Metas</Text>
          </TouchableOpacity>

          <View style={s.divider} />

          {/* ── Família ────────────────────────────────────────────── */}
          <TouchableOpacity
            style={s.row}
            onPress={() => { onClose(); navigationRef.current?.navigate('Familia' as never); }}
          >
            <Text style={s.rowIcon}>👨‍👩‍👧</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.rowLabel}>Família</Text>
              {meuVinculo?.ehMembro && (
                <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 1 }}>
                  Você está na família de outro usuário
                </Text>
              )}
            </View>
            {meuVinculo?.ehMembro && (
              <View style={{ backgroundColor: '#4CAF5033', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                <Text style={{ color: '#4CAF50', fontSize: 10, fontWeight: '700' }}>MEMBRO</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={s.divider} />

          {/* ── Contas e Orçamento (apenas mobile web) ───────────────────── */}
          {isMobileWeb && (
            <>
              <View style={s.divider} />
              <TouchableOpacity
                style={s.row}
                onPress={() => {
                  onClose();
                  (navigationRef.current as any)?.navigate('Main', { screen: 'Contas' });
                }}
              >
                <Text style={s.rowIcon}>🏦</Text>
                <Text style={s.rowLabel}>Contas</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.row}
                onPress={() => {
                  onClose();
                  (navigationRef.current as any)?.navigate('Main', { screen: 'Orçamento' });
                }}
              >
                <Text style={s.rowIcon}>📋</Text>
                <Text style={s.rowLabel}>Orçamento</Text>
              </TouchableOpacity>
            </>
          )}

          {/* ── WhatsApp ────────────────────────────────────────────── */}
          <TouchableOpacity
            style={s.row}
            onPress={() => { onClose(); navigationRef.current?.navigate('WhatsApp' as never); }}
          >
            <WhatsAppIcon size={22} />
            <Text style={s.rowLabel}>Vincular WhatsApp</Text>
          </TouchableOpacity>

          <View style={s.divider} />

          {/* ── Logout ─────────────────────────────────────────────── */}
          <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} disabled={loggingOut}>
            {loggingOut
              ? <ActivityIndicator color="#fff" size="small" />
              : <>
                  <Text style={s.logoutIcon}>🚪</Text>
                  <Text style={s.logoutText}>Sair da conta</Text>
                </>
            }
          </TouchableOpacity>

        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

function styles(
  c: ReturnType<typeof import('../theme/ThemeContext').useTheme>['colors'],
  insets: { top: number; bottom: number },
) {
  return StyleSheet.create({
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: '#00000088' },
    drawer: {
      position: 'absolute', top: 0, right: 0, bottom: 0,
      width: DRAWER_WIDTH, backgroundColor: c.surface,
      paddingTop: insets.top + 16,
      shadowColor: '#000', shadowOffset: { width: -4, height: 0 },
      shadowOpacity: 0.3, shadowRadius: 12, elevation: 16,
    },

    // Avatar
    header: { alignItems: 'center', paddingHorizontal: 24, paddingBottom: 24, gap: 8 },
    avatarWrap: { position: 'relative', marginBottom: 4 },
    avatar: {
      width: 80, height: 80, borderRadius: 40,
      backgroundColor: c.surfaceElevated,
      justifyContent: 'center', alignItems: 'center',
      borderWidth: 2.5, borderColor: c.green,
    },
    avatarLoading: { opacity: 0.6 },
    avatarImage: {
      width: 80, height: 80, borderRadius: 40,
      borderWidth: 2.5, borderColor: c.green,
    },
    avatarText: { color: c.green, fontSize: 30, fontWeight: 'bold' },
    cameraIcon: {
      position: 'absolute', bottom: 0, right: 0,
      width: 24, height: 24, borderRadius: 12,
      backgroundColor: c.surfaceElevated,
      borderWidth: 1.5, borderColor: c.border,
      justifyContent: 'center', alignItems: 'center',
    },

    name:   { color: c.text,          fontSize: 17, fontWeight: '700', textAlign: 'center' },
    email:  { color: c.textSecondary,  fontSize: 13, textAlign: 'center' },
    expiry: { color: c.textTertiary,   fontSize: 12 },

    divider: { height: 1, backgroundColor: c.border, marginHorizontal: 16, marginVertical: 8 },
    row: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 20, paddingVertical: 14, gap: 12,
    },
    rowIcon:  { fontSize: 18 },
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

    alertHeader: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      paddingHorizontal: 20, paddingTop: 12, paddingBottom: 6,
    },
    alertTitle: { fontSize: 14, fontWeight: '700', color: c.text, flex: 1 },
    alertBadge: {
      backgroundColor: '#e53935', borderRadius: 10,
      minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center',
      paddingHorizontal: 5,
    },
    alertBadgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
    alertItem: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 20, paddingVertical: 10, gap: 10,
      borderBottomWidth: 1, borderBottomColor: c.border,
    },
    alertItemIcon:  { fontSize: 16 },
    alertItemDesc:  { fontSize: 13, fontWeight: '600', color: c.text },
    alertItemLabel: { fontSize: 11, marginTop: 2 },
    alertItemValor: { fontSize: 13, fontWeight: '700' },
  });
}
