import React, { useCallback, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, RefreshControl, Platform, Share, TextInput, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { assessoriaService, ConviteHistoricoDto } from '../services/api';
import { useTheme } from '../theme/ThemeContext';
import type { ColorScheme } from '../theme/colors';

export default function AssessorConviteScreen() {
  const { colors, isDark } = useTheme();
  const s = makeStyles(colors, isDark);

  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [historico, setHistorico]   = useState<ConviteHistoricoDto[]>([]);
  const [gerando, setGerando]       = useState(false);
  const [codigoGerado, setCodigoGerado] = useState<string | null>(null);
  const [copiado, setCopiado]       = useState(false);

  // Envio por e-mail
  const [emailInput, setEmailInput]   = useState('');
  const [enviandoEmail, setEnviandoEmail] = useState(false);

  const load = useCallback(async () => {
    try {
      setHistorico(await assessoriaService.convitesHistorico());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function gerarConvite() {
    setGerando(true);
    setCopiado(false);
    try {
      const { codigo } = await assessoriaService.gerarConvite();
      setCodigoGerado(codigo);
      await load();
    } catch (e: any) {
      Alert.alert('Erro', e?.response?.data?.message ?? 'Não foi possível gerar o convite.');
    } finally {
      setGerando(false);
    }
  }

  async function enviarPorEmail() {
    const email = emailInput.trim();
    if (!email.includes('@')) return;
    setEnviandoEmail(true);
    try {
      const { codigo } = await assessoriaService.enviarConviteEmail(email);
      setEmailInput('');
      Alert.alert('📧 Convite enviado!', `O código ${codigo} foi enviado para ${email}.`);
      await load();
    } catch (e: any) {
      Alert.alert('Erro', e?.response?.data?.message ?? 'Não foi possível enviar o convite.');
    } finally {
      setEnviandoEmail(false);
    }
  }

  async function compartilhar() {
    if (!codigoGerado) return;
    const mensagem =
      `Olá! Sou seu assessor no Meu FinDog. Para me dar acesso de leitura às suas finanças, ` +
      `entre no app em "Meu Assessor" e informe o código: ${codigoGerado}`;
    if (Platform.OS === 'web') {
      await navigator.clipboard?.writeText(mensagem);
      setCopiado(true);
    } else {
      await Share.share({ message: mensagem });
    }
  }

  if (loading) {
    return <View style={s.center}><ActivityIndicator color={colors.green} /></View>;
  }

  const pendentes = historico.filter(c => c.status === 'Pendente');
  const encerrados = historico.filter(c => c.status !== 'Pendente');

  return (
    <ScrollView
      style={s.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
    >
      {/* ── Enviar por e-mail ── */}
      <View style={s.card}>
        <Text style={s.cardTitle}>📧 Convidar por e-mail</Text>
        <Text style={s.hint}>
          O cliente recebe um e-mail com o código e as instruções — sem copiar e colar.
        </Text>
        <View style={s.emailRow}>
          <TextInput
            style={s.emailInput}
            value={emailInput}
            onChangeText={setEmailInput}
            placeholder="email@docliente.com"
            placeholderTextColor={colors.inputPlaceholder}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={[s.emailBtn, (!emailInput.includes('@') || enviandoEmail) && { opacity: 0.5 }]}
            disabled={!emailInput.includes('@') || enviandoEmail}
            onPress={enviarPorEmail}
          >
            {enviandoEmail
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={s.emailBtnText}>Enviar</Text>}
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Gerar código manual ── */}
      <View style={s.card}>
        <Text style={s.cardTitle}>🎟️ Ou gere um código para compartilhar</Text>
        {codigoGerado && (
          <View style={s.codigoBox}>
            <Text style={s.codigoText}>{codigoGerado}</Text>
            <TouchableOpacity style={s.compartilharBtn} onPress={compartilhar}>
              <Text style={s.compartilharText}>
                {Platform.OS === 'web'
                  ? (copiado ? '✓ Mensagem copiada!' : '📋 Copiar mensagem de convite')
                  : '📤 Compartilhar convite'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
        <TouchableOpacity style={s.primaryBtn} disabled={gerando} onPress={gerarConvite}>
          {gerando
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.primaryBtnText}>{codigoGerado ? 'Gerar outro código' : 'Gerar código de convite'}</Text>}
        </TouchableOpacity>
      </View>

      {/* ── Aguardando aceite ── */}
      <Text style={s.sectionTitle}>Aguardando aceite ({pendentes.length})</Text>
      {pendentes.length === 0 && <Text style={s.empty}>Nenhum convite pendente.</Text>}
      {pendentes.map(c => (
        <View key={c.vinculoId} style={s.pendenteCard}>
          <View style={{ flex: 1 }}>
            <Text style={s.pendenteCodigo}>{c.codigoConvite}</Text>
            <Text style={s.pendenteData}>Gerado em {new Date(c.criadoEm).toLocaleDateString('pt-BR')}</Text>
          </View>
          <TouchableOpacity
            style={s.cancelarBtn}
            onPress={async () => { await assessoriaService.revogar(c.vinculoId); load(); }}
          >
            <Text style={s.cancelarText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      ))}

      {/* ── Histórico ── */}
      {encerrados.length > 0 && (
        <>
          <Text style={s.sectionTitle}>Histórico ({encerrados.length})</Text>
          {encerrados.map(c => (
            <View key={c.vinculoId} style={s.pendenteCard}>
              <View style={{ flex: 1 }}>
                <Text style={s.pendenteCodigo}>
                  {c.codigoConvite}
                  {c.nomeCliente ? `  ·  ${c.nomeCliente}` : ''}
                </Text>
                <Text style={s.pendenteData}>
                  {c.status === 'Aceito'
                    ? `Aceito em ${new Date(c.aceitoEm!).toLocaleDateString('pt-BR')}`
                    : `Revogado em ${new Date(c.revogadoEm!).toLocaleDateString('pt-BR')}`}
                </Text>
              </View>
              <Text style={c.status === 'Aceito' ? s.stAceito : s.stRevogado}>
                {c.status === 'Aceito' ? '✓ Aceito' : '✗ Revogado'}
              </Text>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const makeStyles = (colors: ColorScheme, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  card: { backgroundColor: colors.surface, borderRadius: 14, padding: 18, marginBottom: 14 },
  cardTitle: { color: colors.text, fontSize: 15, fontWeight: '700', marginBottom: 6 },
  hint: { color: colors.textSecondary, fontSize: 13, lineHeight: 19, marginBottom: 12 },
  emailRow: { flexDirection: 'row', gap: 8 },
  emailInput: {
    flex: 1, backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.inputBorder,
    borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, color: colors.text, fontSize: 14,
  },
  emailBtn: {
    backgroundColor: colors.green, borderRadius: 10,
    paddingHorizontal: 20, justifyContent: 'center',
  },
  emailBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  codigoBox: {
    backgroundColor: colors.background, borderRadius: 12, padding: 16,
    alignItems: 'center', marginBottom: 12,
  },
  codigoText: { color: colors.green, fontSize: 30, fontWeight: '800', letterSpacing: 7 },
  compartilharBtn: { marginTop: 10 },
  compartilharText: { color: colors.green, fontWeight: '600', fontSize: 13 },
  primaryBtn: { backgroundColor: colors.green, borderRadius: 10, padding: 13, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  sectionTitle: {
    color: colors.textSecondary, fontSize: 13, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginTop: 6,
  },
  empty: { color: colors.textTertiary, fontSize: 14, marginBottom: 12 },
  pendenteCard: {
    backgroundColor: colors.surface, borderRadius: 12, padding: 13, marginBottom: 8,
    flexDirection: 'row', alignItems: 'center',
  },
  pendenteCodigo: { color: colors.text, fontWeight: '700', fontSize: 14, letterSpacing: 2 },
  pendenteData: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  cancelarBtn: {
    borderWidth: 1, borderColor: '#dc2626', borderRadius: 8,
    paddingVertical: 7, paddingHorizontal: 14,
  },
  cancelarText: { color: isDark ? '#f87171' : '#b91c1c', fontWeight: '600', fontSize: 13 },
  stAceito: { color: isDark ? '#4ade80' : '#15803d', fontWeight: '700', fontSize: 12 },
  stRevogado: { color: isDark ? '#f87171' : '#b91c1c', fontWeight: '700', fontSize: 12 },
});
