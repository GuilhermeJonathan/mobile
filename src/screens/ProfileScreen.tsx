import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  Switch, Modal, TextInput, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { authService, UserInfo } from '../services/authService';
import { resetToLogin } from '../navigation/navigationRef';
import { useTheme } from '../theme/ThemeContext';
import { ColorScheme } from '../theme/colors';

export default function ProfileScreen({ navigation }: any) {
  const { colors, isDark, toggleTheme } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // — Excluir conta —
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // — Alterar senha —
  const [pwdModal, setPwdModal] = useState(false);
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);
  const [pwdError, setPwdError] = useState<string | null>(null);

  useEffect(() => {
    authService.getUserInfo().then(info => {
      setUser(info);
      setLoading(false);
    });
    authService.isAdmin().then(setIsAdmin).catch(() => setIsAdmin(false));
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    await authService.logout();
    resetToLogin();
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    setDeleteError(null);
    try {
      await authService.deleteAccount();
      setDeleteModal(false);
      resetToLogin();
    } catch {
      setDeleteError('Não foi possível excluir a conta. Tente novamente.');
    } finally {
      setDeleting(false);
    }
  }

  function openPwdModal() {
    setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
    setPwdError(null);
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

      {/* Alterar senha */}
      <TouchableOpacity style={styles.card} onPress={openPwdModal} activeOpacity={0.7}>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>🔑 Alterar senha</Text>
          <Text style={[styles.rowValue, { color: colors.green, flex: 0 }]}>›</Text>
        </View>
      </TouchableOpacity>

      {/* Ferramentas */}
      <Text style={styles.sectionLabel}>FERRAMENTAS</Text>
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('ImportarExtrato')}
        activeOpacity={0.7}
      >
        <View style={styles.row}>
          <Text style={styles.rowLabel}>📥 Importar extrato bancário (OFX)</Text>
          <Text style={[styles.rowValue, { color: colors.green, flex: 0 }]}>›</Text>
        </View>
      </TouchableOpacity>

      {/* Admin section */}
      {isAdmin && (
        <>
          <Text style={styles.sectionLabel}>ADMIN</Text>
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('PaymentTransactions')}
            activeOpacity={0.7}
          >
            <View style={styles.row}>
              <Text style={styles.rowLabel}>💳 Relatório de transações</Text>
              <Text style={[styles.rowValue, { color: colors.green, flex: 0 }]}>›</Text>
            </View>
          </TouchableOpacity>
        </>
      )}

      {/* Logout */}
      <TouchableOpacity style={styles.btnLogout} onPress={handleLogout} disabled={loggingOut}>
        {loggingOut
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.btnLogoutText}>Sair da conta</Text>
        }
      </TouchableOpacity>

      {/* Excluir conta */}
      <TouchableOpacity
        style={styles.btnDeleteAccount}
        onPress={() => { setDeleteError(null); setDeleteModal(true); }}
        disabled={deleting}
      >
        <Text style={styles.btnDeleteAccountText}>Excluir minha conta</Text>
      </TouchableOpacity>

      {/* Modal — Confirmar exclusão de conta */}
      <Modal visible={deleteModal} transparent animationType="fade" onRequestClose={() => setDeleteModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Excluir conta</Text>
            <Text style={styles.deleteWarningText}>
              Esta ação é irreversível. Todos os seus dados serão excluídos permanentemente.
            </Text>

            {deleteError && <Text style={styles.errorText}>{deleteError}</Text>}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setDeleteModal(false)}
                disabled={deleting}
              >
                <Text style={styles.modalBtnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnDelete]}
                onPress={handleDeleteAccount}
                disabled={deleting}
              >
                {deleting
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.modalBtnDeleteText}>Sim, excluir tudo</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal — Alterar senha */}
      <Modal visible={pwdModal} transparent animationType="fade" onRequestClose={() => setPwdModal(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Alterar senha</Text>

            {/* Senha atual */}
            <Text style={styles.fieldLabel}>Senha atual</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={colors.textTertiary}
                secureTextEntry={!showCurrent}
                value={currentPwd}
                onChangeText={t => { setCurrentPwd(t); setPwdError(null); }}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowCurrent(v => !v)} style={styles.eyeBtn}>
                <Text style={styles.eyeIcon}>{showCurrent ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>

            {/* Nova senha */}
            <Text style={styles.fieldLabel}>Nova senha</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="mínimo 6 caracteres"
                placeholderTextColor={colors.textTertiary}
                secureTextEntry={!showNew}
                value={newPwd}
                onChangeText={t => { setNewPwd(t); setPwdError(null); }}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowNew(v => !v)} style={styles.eyeBtn}>
                <Text style={styles.eyeIcon}>{showNew ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>

            {/* Confirmar nova senha */}
            <Text style={styles.fieldLabel}>Confirmar nova senha</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="repita a nova senha"
                placeholderTextColor={colors.textTertiary}
                secureTextEntry={!showConfirm}
                value={confirmPwd}
                onChangeText={t => { setConfirmPwd(t); setPwdError(null); }}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowConfirm(v => !v)} style={styles.eyeBtn}>
                <Text style={styles.eyeIcon}>{showConfirm ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>

            {/* Erro */}
            {pwdError && <Text style={styles.errorText}>{pwdError}</Text>}

            {/* Botões */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setPwdModal(false)}
                disabled={savingPwd}
              >
                <Text style={styles.modalBtnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSave]}
                onPress={handleChangePassword}
                disabled={savingPwd}
              >
                {savingPwd
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.modalBtnSaveText}>Salvar</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    sectionLabel: {
      color: c.textTertiary, fontSize: 10, fontWeight: '700',
      letterSpacing: 1, marginBottom: 8, marginTop: 4,
      textTransform: 'uppercase',
    },
    btnLogout: {
      backgroundColor: c.red, borderRadius: 12, padding: 16,
      alignItems: 'center', marginTop: 8,
    },
    btnLogoutText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    btnDeleteAccount: {
      borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16,
      alignItems: 'center', marginTop: 8,
      borderWidth: 1, borderColor: c.red,
    },
    btnDeleteAccountText: { color: c.red, fontSize: 14, fontWeight: '600' },
    deleteWarningText: {
      fontSize: 14, color: c.textSecondary, lineHeight: 20, marginBottom: 8,
    },
    modalBtnDelete: { backgroundColor: c.red },
    modalBtnDeleteText: { color: '#fff', fontWeight: 'bold' },

    // Modal — alterar senha
    modalOverlay: {
      flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center', alignItems: 'center', padding: 24,
    },
    modalBox: {
      backgroundColor: c.surface, borderRadius: 16, padding: 24,
      width: '100%', maxWidth: 400,
      borderWidth: 1, borderColor: c.border,
    },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: c.text, marginBottom: 20 },
    fieldLabel: { fontSize: 13, color: c.textSecondary, marginBottom: 6, marginTop: 12 },
    inputRow: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: c.background, borderRadius: 10,
      borderWidth: 1, borderColor: c.inputBorder,
      paddingHorizontal: 12,
    },
    input: { flex: 1, color: c.text, fontSize: 15, paddingVertical: 12 },
    eyeBtn: { padding: 6 },
    eyeIcon: { fontSize: 18 },
    errorText: { color: c.red, fontSize: 13, marginTop: 12 },
    modalActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
    modalBtn: { flex: 1, borderRadius: 10, padding: 14, alignItems: 'center' },
    modalBtnCancel: { backgroundColor: c.background, borderWidth: 1, borderColor: c.border },
    modalBtnCancelText: { color: c.textSecondary, fontWeight: '600' },
    modalBtnSave: { backgroundColor: c.green },
    modalBtnSaveText: { color: '#fff', fontWeight: 'bold' },
  });
}
