import React, { useEffect, useRef, useState } from 'react';
import {
  Animated, Dimensions, Modal, StyleSheet, Switch, Image,
  Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View,
  ActivityIndicator, ScrollView, Alert, Platform, KeyboardAvoidingView,
} from 'react-native';

const isMobileWeb = Platform.OS === 'web' && Dimensions.get('window').width < 768;
const isDesktop   = Platform.OS === 'web' && Dimensions.get('window').width >= 1024;
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { authService, UserInfo, PlanInfo } from '../services/authService';
import { resetToLogin } from '../navigation/navigationRef';
import { useTheme } from '../theme/ThemeContext';
import { navigationRef } from '../navigation/navigationRef';
import { useVencimentos } from '../contexts/VencimentosContext';
import { fmtBRL } from '../utils/currency';
import WhatsAppIcon from './WhatsAppIcon';
import { vinculosService, MeuVinculoDto, whatsappService } from '../services/api';

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

function maskDocument(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 11) {
    // CPF: 000.000.000-00
    return digits
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2');
  }
  // CNPJ: 00.000.000/0000-00
  return digits.slice(0, 14)
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2)  return digits.replace(/^(\d{0,2})/, '($1');
  if (digits.length <= 6)  return digits.replace(/^(\d{2})(\d{0,4})/, '($1) $2');
  if (digits.length <= 10) return digits.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
  return digits.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
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
  const [planInfo, setPlanInfo] = useState<PlanInfo | null>(null);

  // — Alterar senha —
  const [pwdModal, setPwdModal]     = useState(false);
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd]         = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [savingPwd, setSavingPwd]   = useState(false);
  const [pwdError, setPwdError]     = useState<string | null>(null);

  // — Meus Dados —
  const [dadosModal, setDadosModal]         = useState(false);
  const [editName, setEditName]             = useState('');
  const [editPhone, setEditPhone]           = useState('');
  const [editDocument, setEditDocument]     = useState('');
  const [savingProfile, setSavingProfile]   = useState(false);
  const [profileError, setProfileError]     = useState('');
  const [profileSuccess, setProfileSuccess] = useState(false);
  // — Excluir conta —
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleting, setDeleting]       = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    if (visible) {
      authService.fetchMe().then(() => authService.getUserInfo().then(setUser));
      authService.isAdmin().then(setIsAdmin).catch(() => setIsAdmin(false));
      vinculosService.meuVinculo().then(setMeuVinculo).catch(() => setMeuVinculo(null));
      authService.getPlanInfo().then(setPlanInfo).catch(() => setPlanInfo(null));
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

  function openDadosModal() {
    setEditName(user?.name ?? '');
    setEditPhone(maskPhone(user?.cellphone ?? ''));
    setEditDocument(maskDocument(user?.document ?? ''));
    setProfileError('');
    setProfileSuccess(false);
    setDeleteModal(false);
    setDadosModal(true);
  }

  async function handleSaveProfile() {
    if (!editName.trim()) { setProfileError('O nome não pode estar vazio.'); return; }
    setSavingProfile(true);
    setProfileError('');
    setProfileSuccess(false);
    try {
      const cellphone = editPhone.replace(/\D/g, '') || null;
      const document  = editDocument.replace(/\D/g, '') || null;
      await authService.updateProfile(editName.trim(), cellphone, document);
      // Renova o token para refletir o novo nome no JWT
      await authService.refreshAccessToken().catch(() => {});
      // Relê os dados já com o token novo
      const updated = await authService.getUserInfo();
      if (updated) setUser(updated);
      if (cellphone) {
        const withCountry = cellphone.startsWith('55') ? cellphone : `55${cellphone}`;
        await whatsappService.vincular(withCountry).catch(() => {});
      }
      setProfileSuccess(true);
    } catch {
      setProfileError('Não foi possível salvar. Tente novamente.');
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    setDeleteError('');
    try {
      await authService.deleteAccount();
      setDeleteModal(false);
      onClose();
      resetToLogin();
    } catch {
      setDeleteError('Não foi possível excluir a conta. Tente novamente.');
    } finally {
      setDeleting(false);
    }
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

  function openPwdModal() {
    setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
    setPwdError(null); setShowCurrent(false); setShowNew(false); setShowConfirm(false);
    setPwdModal(true);
  }

  async function handleChangePassword() {
    if (!currentPwd) { setPwdError('Informe a senha atual.'); return; }
    if (newPwd.length < 6) { setPwdError('A nova senha deve ter pelo menos 6 caracteres.'); return; }
    if (newPwd !== confirmPwd) { setPwdError('As senhas não coincidem.'); return; }

    setSavingPwd(true);
    setPwdError(null);
    try {
      await authService.changePassword(currentPwd, newPwd);
      setPwdModal(false);
      Alert.alert('Sucesso', 'Senha alterada com sucesso!');
    } catch (err: any) {
      const msg: string = err?.response?.data?.message
        ?? err?.response?.data
        ?? err?.message
        ?? 'Erro ao alterar senha.';
      setPwdError(
        msg.toLowerCase().includes('incorreta') || msg.toLowerCase().includes('incorrect')
          ? 'Senha atual incorreta.'
          : msg,
      );
    } finally {
      setSavingPwd(false);
    }
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

            {planInfo?.isTrialActive && planInfo.trialDaysRemaining !== null && (
              <View style={[s.planBadge, s.planBadgeTrial]}>
                <Text style={s.planBadgeText}>🎯 Trial · {planInfo.trialDaysRemaining}d restantes</Text>
              </View>
            )}
            {planInfo?.isTrialExpired && (
              <View style={[s.planBadge, s.planBadgeExpired]}>
                <Text style={s.planBadgeText}>⚠️ Trial expirado</Text>
              </View>
            )}
            {planInfo?.hasPaidPlan && (
              <View style={[s.planBadge, s.planBadgePaid]}>
                <Text style={s.planBadgeText}>💳 Plano ativo</Text>
              </View>
            )}

            <View style={s.expiryRow}>
              <Text style={s.expiry}>{formatExpiry(user?.expiresAt ?? null)}</Text>
              <TouchableOpacity onPress={openPwdModal} style={s.pwdIconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={s.pwdIconText}>🔑</Text>
                <Text style={s.pwdIconLabel}>Alterar senha</Text>
              </TouchableOpacity>
            </View>
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

          {isAdmin && !isDesktop && (
            <>
              <View style={s.divider} />
              <Text style={s.sectionLabel}>ADMIN</Text>
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

          {/* ── Relatórios — ocultos no desktop (disponíveis no menu lateral) ── */}
          {!isDesktop && (
            <>
              <TouchableOpacity
                style={s.row}
                onPress={() => { onClose(); navigationRef.current?.navigate('Anual' as never); }}
              >
                <Text style={s.rowIcon}>📅</Text>
                <Text style={s.rowLabel}>Visão Anual</Text>
              </TouchableOpacity>

              <View style={s.divider} />

              <TouchableOpacity
                style={s.row}
                onPress={() => { onClose(); navigationRef.current?.navigate('Dividas' as never); }}
              >
                <Text style={s.rowIcon}>💳</Text>
                <Text style={s.rowLabel}>Dívidas Parceladas</Text>
              </TouchableOpacity>

              <View style={s.divider} />
            </>
          )}

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

          {/* ── Meus Dados ─────────────────────────────────────────── */}
          <TouchableOpacity style={s.row} onPress={openDadosModal}>
            <Text style={s.rowIcon}>👤</Text>
            <Text style={s.rowLabel}>Meus Dados</Text>
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

      {/* ── Modal Meus Dados ───────────────────────────────────────── */}
      <Modal visible={dadosModal} transparent animationType="fade" onRequestClose={() => setDadosModal(false)}>
        <TouchableWithoutFeedback onPress={() => setDadosModal(false)}>
          <View style={s.dadosOverlay}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%', maxWidth: 420 }}>
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <TouchableWithoutFeedback>
                  <View style={s.dadosCard}>

                    {/* Cabeçalho */}
                    <View style={s.dadosHeader}>
                      <Text style={s.dadosTitle}>Meus Dados</Text>
                      <TouchableOpacity onPress={() => setDadosModal(false)} style={s.dadosCloseBtn}>
                        <Text style={s.dadosCloseIcon}>✕</Text>
                      </TouchableOpacity>
                    </View>

                    {/* ── Foto ─────────────────────────────────────────── */}
                    <View style={{ alignItems: 'center', marginBottom: 20 }}>
                      <TouchableOpacity onPress={promptAvatarOptions} activeOpacity={0.8}>
                        {uploadingAvatar ? (
                          <View style={[s.dadosAvatar, s.dadosAvatarPlaceholder]}>
                            <ActivityIndicator color={colors.green} />
                          </View>
                        ) : user?.avatarUrl ? (
                          <View>
                            <Image source={{ uri: user.avatarUrl }} style={s.dadosAvatar} />
                            <View style={s.dadosAvatarBadge}><Text style={{ fontSize: 13 }}>📷</Text></View>
                          </View>
                        ) : (
                          <View style={[s.dadosAvatar, s.dadosAvatarPlaceholder]}>
                            <Text style={{ fontSize: 28 }}>👤</Text>
                            <View style={s.dadosAvatarBadge}><Text style={{ fontSize: 13 }}>📷</Text></View>
                          </View>
                        )}
                      </TouchableOpacity>
                      <Text style={s.dadosAvatarHint}>Toque para alterar a foto</Text>
                    </View>

                    {/* ── Nome ─────────────────────────────────────────── */}
                    <Text style={s.dadosLabel}>Nome</Text>
                    <TextInput
                      style={s.dadosInput}
                      value={editName}
                      onChangeText={t => { setEditName(t); setProfileError(''); setProfileSuccess(false); }}
                      placeholder="Seu nome"
                      placeholderTextColor={colors.inputPlaceholder}
                      autoCapitalize="words"
                    />

                    {/* ── E-mail (somente leitura) ──────────────────────── */}
                    <Text style={s.dadosLabel}>E-mail</Text>
                    <View style={s.dadosInputReadonly}>
                      <Text style={s.dadosInputReadonlyText}>{user?.email || '—'}</Text>
                      <Text style={{ fontSize: 11, color: colors.textTertiary }}>🔒</Text>
                    </View>

                    {/* ── Telefone ─────────────────────────────────────── */}
                    <Text style={s.dadosLabel}>Telefone / WhatsApp</Text>
                    <TextInput
                      style={s.dadosInput}
                      value={editPhone}
                      onChangeText={t => { setEditPhone(maskPhone(t)); setProfileError(''); setProfileSuccess(false); }}
                      placeholder="(11) 99999-0000"
                      placeholderTextColor={colors.inputPlaceholder}
                      keyboardType="phone-pad"
                    />

                    {/* ── Documento ────────────────────────────────────── */}
                    <Text style={s.dadosLabel}>Documento (CPF/CNPJ)</Text>
                    <TextInput
                      style={s.dadosInput}
                      value={editDocument}
                      onChangeText={t => { setEditDocument(maskDocument(t)); setProfileError(''); setProfileSuccess(false); }}
                      placeholder="000.000.000-00"
                      placeholderTextColor={colors.inputPlaceholder}
                      keyboardType="numeric"
                    />

                    {/* Feedback */}
                    {profileError !== '' && (
                      <Text style={{ color: '#e53935', fontSize: 13, marginTop: 4 }}>{profileError}</Text>
                    )}
                    {profileSuccess && (
                      <Text style={{ color: colors.green, fontSize: 13, marginTop: 4 }}>✅ Dados salvos com sucesso!</Text>
                    )}

                    {/* Botão salvar */}
                    <TouchableOpacity style={s.dadosSaveBtn} onPress={handleSaveProfile} disabled={savingProfile}>
                      {savingProfile
                        ? <ActivityIndicator color="#fff" size="small" />
                        : <Text style={s.dadosSaveBtnText}>Salvar alterações</Text>
                      }
                    </TouchableOpacity>

                    {/* ── Plano ─────────────────────────────────────────── */}
                    {planInfo && (
                      <>
                        <Text style={[s.dadosLabel, { marginTop: 20 }]}>Plano</Text>
                        <Text style={s.dadosValue}>
                          {planInfo.hasPaidPlan
                            ? `Pago${planInfo.planExpiresAt ? ` · expira ${new Date(planInfo.planExpiresAt).toLocaleDateString('pt-BR')}` : ''}`
                            : planInfo.isTrialActive
                              ? `Trial · ${planInfo.trialDaysRemaining}d restantes`
                              : 'Trial expirado'}
                        </Text>
                        {!planInfo.hasPaidPlan && (
                          <TouchableOpacity
                            onPress={() => {
                              onClose();
                              navigationRef.current?.navigate('Planos' as never);
                            }}
                            style={s.verPlanosBtn}
                          >
                            <Text style={s.verPlanosBtnText}>Ver planos →</Text>
                          </TouchableOpacity>
                        )}
                      </>
                    )}

                    {/* Separador zona de perigo */}
                    <View style={s.dadosDangerDivider}>
                      <View style={s.dadosDangerLine} />
                      <Text style={s.dadosDangerLabel}>ZONA DE PERIGO</Text>
                      <View style={s.dadosDangerLine} />
                    </View>

                    {/* Excluir conta */}
                    {!deleteModal ? (
                      <TouchableOpacity style={s.dadosDeleteBtn} onPress={() => setDeleteModal(true)}>
                        <Text style={s.dadosDeleteText}>🗑 Excluir minha conta</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={s.dadosDeleteConfirm}>
                        <Text style={s.dadosDeleteWarning}>
                          Esta ação é irreversível. Todos os seus dados serão excluídos permanentemente.
                        </Text>
                        {deleteError !== '' && (
                          <Text style={{ color: '#e53935', fontSize: 13, textAlign: 'center' }}>{deleteError}</Text>
                        )}
                        <TouchableOpacity style={s.deleteModalConfirmBtn} onPress={handleDeleteAccount} disabled={deleting}>
                          {deleting
                            ? <ActivityIndicator color="#fff" size="small" />
                            : <Text style={s.deleteModalConfirmText}>Sim, excluir tudo</Text>
                          }
                        </TouchableOpacity>
                        <TouchableOpacity style={s.deleteModalCancelBtn} onPress={() => { setDeleteModal(false); setDeleteError(''); }}>
                          <Text style={s.deleteModalCancelText}>Cancelar</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                  </View>
                </TouchableWithoutFeedback>
              </ScrollView>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ── Modal alterar senha ─────────────────────────────────────── */}
      <Modal visible={pwdModal} transparent animationType="fade" onRequestClose={() => setPwdModal(false)}>
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: '#00000088', justifyContent: 'center', alignItems: 'center', padding: 24 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={s.pwdBox}>
            <Text style={s.pwdTitle}>Alterar senha</Text>

            <Text style={s.pwdLabel}>Senha atual</Text>
            <View style={s.pwdInputRow}>
              <TextInput style={s.pwdInput} placeholder="••••••••" placeholderTextColor={s.pwdPlaceholder.color}
                secureTextEntry={!showCurrent} value={currentPwd}
                onChangeText={t => { setCurrentPwd(t); setPwdError(null); }} autoCapitalize="none" />
              <TouchableOpacity onPress={() => setShowCurrent(v => !v)} style={s.eyeBtn}>
                <Text style={s.eyeIcon}>{showCurrent ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>

            <Text style={s.pwdLabel}>Nova senha</Text>
            <View style={s.pwdInputRow}>
              <TextInput style={s.pwdInput} placeholder="mínimo 6 caracteres" placeholderTextColor={s.pwdPlaceholder.color}
                secureTextEntry={!showNew} value={newPwd}
                onChangeText={t => { setNewPwd(t); setPwdError(null); }} autoCapitalize="none" />
              <TouchableOpacity onPress={() => setShowNew(v => !v)} style={s.eyeBtn}>
                <Text style={s.eyeIcon}>{showNew ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>

            <Text style={s.pwdLabel}>Confirmar nova senha</Text>
            <View style={s.pwdInputRow}>
              <TextInput style={s.pwdInput} placeholder="repita a nova senha" placeholderTextColor={s.pwdPlaceholder.color}
                secureTextEntry={!showConfirm} value={confirmPwd}
                onChangeText={t => { setConfirmPwd(t); setPwdError(null); }} autoCapitalize="none" />
              <TouchableOpacity onPress={() => setShowConfirm(v => !v)} style={s.eyeBtn}>
                <Text style={s.eyeIcon}>{showConfirm ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>

            {pwdError && <Text style={s.pwdError}>{pwdError}</Text>}

            <View style={s.pwdActions}>
              <TouchableOpacity style={[s.pwdBtn, s.pwdBtnCancel]} onPress={() => setPwdModal(false)} disabled={savingPwd}>
                <Text style={s.pwdBtnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.pwdBtn, s.pwdBtnSave]} onPress={handleChangePassword} disabled={savingPwd}>
                {savingPwd
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={s.pwdBtnSaveText}>Salvar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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

    planBadge: {
      borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
      borderWidth: 1, marginTop: 6,
    },
    planBadgeTrial:   { backgroundColor: '#FF980022', borderColor: '#FF9800' },
    planBadgeExpired: { backgroundColor: '#e5393522', borderColor: '#e53935' },
    planBadgePaid:    { backgroundColor: '#4caf5022', borderColor: '#4caf50' },
    planBadgeText:    { fontSize: 12, fontWeight: '600', color: c.text },

    expiryRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 },
    expiry: { color: c.textTertiary,   fontSize: 12 },
    pwdIconBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, opacity: 0.55 },
    pwdIconText:  { fontSize: 11 },
    pwdIconLabel: { fontSize: 11, color: c.textTertiary },

    divider: { height: 1, backgroundColor: c.border, marginHorizontal: 16, marginVertical: 8 },
    sectionLabel: {
      color: c.textTertiary, fontSize: 10, fontWeight: '700',
      letterSpacing: 1, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 2,
    },
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

    // Modal Meus Dados
    dadosOverlay: {
      flex: 1, backgroundColor: '#00000088',
      justifyContent: 'center', alignItems: 'center', padding: 24,
    },
    dadosCard: {
      backgroundColor: c.surface, borderRadius: 16, padding: 24,
      width: '100%', borderWidth: 1, borderColor: c.border,
    },
    dadosHeader:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
    dadosTitle:    { fontSize: 18, fontWeight: 'bold', color: c.text },
    dadosCloseBtn: { padding: 4 },
    dadosCloseIcon:{ fontSize: 16, color: c.textTertiary },
    dadosAvatar:   { width: 72, height: 72, borderRadius: 36 },
    dadosAvatarPlaceholder: {
      backgroundColor: c.surfaceElevated, borderWidth: 2, borderColor: c.border,
      justifyContent: 'center', alignItems: 'center',
    },
    dadosAvatarBadge: {
      position: 'absolute', bottom: 0, right: 0,
      width: 22, height: 22, borderRadius: 11,
      backgroundColor: c.surfaceElevated, borderWidth: 1.5, borderColor: c.border,
      justifyContent: 'center', alignItems: 'center',
    },
    dadosAvatarHint: { fontSize: 11, color: c.textTertiary, marginTop: 6 },
    dadosLabel: { fontSize: 11, color: c.textTertiary, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 14, marginBottom: 4 },
    dadosValue: { fontSize: 15, color: c.text },
    dadosInput: {
      backgroundColor: c.inputBg, borderRadius: 10, padding: 12,
      fontSize: 15, borderWidth: 1, borderColor: c.inputBorder, color: c.text,
    },
    dadosInputReadonly: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: c.surfaceElevated, borderRadius: 10, padding: 12,
      borderWidth: 1, borderColor: c.border,
    },
    dadosInputReadonlyText: { fontSize: 15, color: c.textSecondary },
    dadosSaveBtn:     { backgroundColor: c.green, borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginTop: 16 },
    dadosSaveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

    verPlanosBtn:     { marginTop: 8, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: c.green, alignSelf: 'flex-start' },
    verPlanosBtnText: { color: c.green, fontSize: 13, fontWeight: '600' },

    dadosDangerDivider: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 24, marginBottom: 12 },
    dadosDangerLine:    { flex: 1, height: 1, backgroundColor: '#e5393550' },
    dadosDangerLabel:   { fontSize: 10, fontWeight: '700', color: '#e53935', letterSpacing: 1 },

    dadosDeleteBtn:     { paddingVertical: 10, alignItems: 'center', borderRadius: 10, borderWidth: 1, borderColor: '#e5393540' },
    dadosDeleteText:    { color: '#e53935', fontSize: 14 },
    dadosDeleteConfirm: { gap: 10 },
    dadosDeleteWarning: { fontSize: 13, color: c.textSecondary, textAlign: 'center', lineHeight: 18 },

    deleteModalConfirmBtn:  { backgroundColor: c.red, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
    deleteModalConfirmText: { color: '#fff', fontSize: 15, fontWeight: '600' },
    deleteModalCancelBtn:   { backgroundColor: c.surfaceElevated, borderRadius: 10, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: c.border },
    deleteModalCancelText:  { color: c.text, fontSize: 15 },

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

    // Modal — alterar senha
    pwdBox: {
      backgroundColor: c.surface, borderRadius: 16, padding: 24,
      width: '100%', maxWidth: 380, borderWidth: 1, borderColor: c.border,
    },
    pwdTitle:   { fontSize: 17, fontWeight: 'bold', color: c.text, marginBottom: 16 },
    pwdLabel:   { fontSize: 12, color: c.textSecondary, marginTop: 14, marginBottom: 6 },
    pwdPlaceholder: { color: c.textTertiary },
    pwdInputRow: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: c.background, borderRadius: 10,
      borderWidth: 1, borderColor: c.inputBorder, paddingHorizontal: 12,
    },
    pwdInput:  { flex: 1, color: c.text, fontSize: 15, paddingVertical: 11 },
    eyeBtn:    { padding: 6 },
    eyeIcon:   { fontSize: 17 },
    pwdError:  { color: c.red, fontSize: 12, marginTop: 10 },
    pwdActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
    pwdBtn:    { flex: 1, borderRadius: 10, padding: 13, alignItems: 'center' },
    pwdBtnCancel:     { backgroundColor: c.background, borderWidth: 1, borderColor: c.border },
    pwdBtnCancelText: { color: c.textSecondary, fontWeight: '600' },
    pwdBtnSave:       { backgroundColor: c.green },
    pwdBtnSaveText:   { color: '#fff', fontWeight: 'bold' },
  });
}
