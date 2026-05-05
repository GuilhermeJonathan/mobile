import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Platform,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { ColorScheme } from '../theme/colors';
import { saldosService, transferenciaService } from '../services/api';
import { SaldoConta } from '../types';
import { fmtBRL } from '../utils/currency';

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function todayDDMMYYYY(): string {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function parseDateInput(v: string): string | null {
  // Accepts dd/mm/aaaa or dd/mm/aa
  const match = v.match(/^(\d{2})\/(\d{2})\/(\d{2,4})$/);
  if (!match) return null;
  const [, dd, mm, yy] = match;
  const yyyy = yy.length === 2 ? `20${yy}` : yy;
  const iso = `${yyyy}-${mm}-${dd}`;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return iso;
}

function parseValorInput(v: string): number {
  // "1.500,00" → 1500.00 | "1500.00" → 1500
  const clean = v
    .replace(/R\$\s?/g, '')
    .trim()
    .replace(/\./g, '')   // remove thousand separators (BR style)
    .replace(',', '.');    // decimal comma → dot
  return parseFloat(clean);
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function TransferenciaScreen({ navigation }: any) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [contas, setContas] = useState<SaldoConta[]>([]);
  const [loadingContas, setLoadingContas] = useState(true);

  const [origemId, setOrigemId]   = useState<string | null>(null);
  const [destinoId, setDestinoId] = useState<string | null>(null);
  const [valorText, setValorText] = useState('');
  const [dataText, setDataText]   = useState(todayDDMMYYYY());
  const [descricao, setDescricao] = useState('');

  const [erro, setErro]       = useState('');
  const [loading, setLoading] = useState(false);
  const [fase, setFase]       = useState<'form' | 'done'>('form');
  const [resultIds, setResultIds] = useState<{ idDebito: string; idCredito: string } | null>(null);

  useEffect(() => {
    saldosService.getAll()
      .then(setContas)
      .catch(() => {})
      .finally(() => setLoadingContas(false));
  }, []);

  function resetForm() {
    setOrigemId(null);
    setDestinoId(null);
    setValorText('');
    setDataText(todayDDMMYYYY());
    setDescricao('');
    setErro('');
    setFase('form');
    setResultIds(null);
  }

  async function handleTransferir() {
    setErro('');

    if (!origemId) { setErro('Selecione a conta de origem.'); return; }
    if (!destinoId) { setErro('Selecione a conta de destino.'); return; }
    if (origemId === destinoId) { setErro('Origem e destino não podem ser a mesma conta.'); return; }

    const valor = parseValorInput(valorText);
    if (!valorText.trim() || isNaN(valor) || valor <= 0) {
      setErro('Informe um valor válido maior que zero.');
      return;
    }

    const dataISO = parseDateInput(dataText);
    if (!dataISO) { setErro('Data inválida. Use o formato dd/mm/aaaa.'); return; }

    setLoading(true);
    try {
      const res = await transferenciaService.criar({
        contaOrigemId: origemId,
        contaDestinoId: destinoId,
        valor,
        data: dataISO,
        descricao: descricao.trim() || 'Transferência entre contas',
      });
      setResultIds(res);
      setFase('done');
    } catch (err: any) {
      const msg = err?.response?.data ?? err?.message ?? 'Erro ao realizar transferência.';
      setErro(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  }

  // ── Loading contas ──────────────────────────────────────────────────────────
  if (loadingContas) return (
    <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator size="large" color={colors.green} />
    </View>
  );

  // ── Concluído ───────────────────────────────────────────────────────────────
  if (fase === 'done') return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Transferência</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 20 }}>
        <Text style={{ fontSize: 56 }}>✅</Text>
        <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text, textAlign: 'center' }}>
          Transferência realizada!
        </Text>
        <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
          Os lançamentos de débito e crédito foram criados com sucesso.
        </Text>

        <TouchableOpacity style={[s.btnPrimary, { width: '100%' }]} onPress={resetForm}>
          <Text style={s.btnPrimaryText}>Nova transferência</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.btnSecondary, { width: '100%' }]} onPress={() => navigation.goBack()}>
          <Text style={s.btnSecondaryText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ── Formulário ──────────────────────────────────────────────────────────────
  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Transferência</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">

        {/* Conta origem */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>De (conta origem)</Text>
          <ContaSelector
            contas={contas}
            selectedId={origemId}
            onSelect={setOrigemId}
            colors={colors}
            s={s}
          />
        </View>

        {/* Conta destino */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>Para (conta destino)</Text>
          <ContaSelector
            contas={contas}
            selectedId={destinoId}
            onSelect={setDestinoId}
            colors={colors}
            s={s}
          />
        </View>

        {/* Valor */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>Valor (R$)</Text>
          <TextInput
            style={s.input}
            value={valorText}
            onChangeText={setValorText}
            placeholder="Ex: 1.500,00"
            placeholderTextColor={colors.inputPlaceholder}
            keyboardType="decimal-pad"
            onBlur={() => {
              const num = parseValorInput(valorText);
              if (!isNaN(num) && num > 0) {
                setValorText(num.toFixed(2).replace('.', ','));
              }
            }}
          />
        </View>

        {/* Data */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>Data</Text>
          <TextInput
            style={s.input}
            value={dataText}
            onChangeText={setDataText}
            placeholder="dd/mm/aaaa"
            placeholderTextColor={colors.inputPlaceholder}
            keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
          />
        </View>

        {/* Descrição */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>Descrição</Text>
          <TextInput
            style={s.input}
            value={descricao}
            onChangeText={setDescricao}
            placeholder="Ex: reserva de emergência"
            placeholderTextColor={colors.inputPlaceholder}
          />
        </View>

        {/* Erro */}
        {erro ? (
          <View style={s.errorBox}>
            <Text style={s.errorText}>{erro}</Text>
          </View>
        ) : null}

        {/* Botão */}
        <TouchableOpacity
          style={[s.btnPrimary, loading && { opacity: 0.6 }]}
          onPress={handleTransferir}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.btnPrimaryText}>Transferir</Text>
          }
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

// ── ContaSelector ─────────────────────────────────────────────────────────────

function ContaSelector({
  contas, selectedId, onSelect, colors, s,
}: {
  contas: SaldoConta[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  colors: ColorScheme;
  s: ReturnType<typeof makeStyles>;
}) {
  if (contas.length === 0) {
    return <Text style={{ color: colors.textTertiary, fontSize: 13 }}>Nenhuma conta cadastrada.</Text>;
  }
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
      {contas.map(conta => {
        const ativo = selectedId === conta.id;
        return (
          <TouchableOpacity
            key={conta.id}
            style={[s.contaChip, ativo && s.contaChipActive]}
            onPress={() => onSelect(conta.id)}
            activeOpacity={0.75}
          >
            <Text style={[s.contaChipNome, ativo && s.contaChipNomeActive]}>
              {conta.banco}
            </Text>
            <Text style={[s.contaChipSaldo, ativo && { color: colors.green }]}>
              {fmtBRL(conta.saldo)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

function makeStyles(c: ColorScheme) {
  return StyleSheet.create({
    container:   { flex: 1, backgroundColor: c.background },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: c.surface, paddingHorizontal: 16, paddingVertical: 14,
      borderBottomWidth: 1, borderBottomColor: c.border,
    },
    backBtn:      { width: 40, justifyContent: 'center' },
    backBtnText:  { fontSize: 22, color: c.text },
    headerTitle:  { fontSize: 17, fontWeight: '700', color: c.text },

    scrollContent: { padding: 16, gap: 16, paddingBottom: 48 },

    section: {
      backgroundColor: c.surface, borderRadius: 12, padding: 16,
      gap: 10, borderWidth: 1, borderColor: c.border,
    },
    sectionLabel: {
      fontSize: 12, fontWeight: '700', color: c.textSecondary,
      textTransform: 'uppercase', letterSpacing: 0.5,
    },

    input: {
      backgroundColor: c.inputBg, borderRadius: 8, padding: 12,
      fontSize: 16, borderWidth: 1, borderColor: c.inputBorder,
      color: c.text,
    },

    contaChip: {
      borderWidth: 1.5, borderColor: c.border, borderRadius: 10,
      paddingHorizontal: 14, paddingVertical: 10, marginRight: 8,
      alignItems: 'center', backgroundColor: c.surfaceElevated, minWidth: 110,
    },
    contaChipActive: {
      borderColor: c.green, backgroundColor: c.greenDim,
    },
    contaChipNome: {
      fontSize: 13, fontWeight: '700', color: c.textSecondary,
    },
    contaChipNomeActive: { color: c.green },
    contaChipSaldo: {
      fontSize: 12, color: c.textTertiary, marginTop: 2,
    },

    errorBox: {
      backgroundColor: c.redDim, borderRadius: 8, padding: 12,
      borderWidth: 1, borderColor: c.redBorder,
    },
    errorText: { color: c.red, fontSize: 13, textAlign: 'center' },

    btnPrimary: {
      backgroundColor: c.green, borderRadius: 12, paddingVertical: 16,
      alignItems: 'center', marginTop: 4,
    },
    btnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 16 },

    btnSecondary: {
      borderRadius: 12, paddingVertical: 16, alignItems: 'center',
      borderWidth: 1, borderColor: c.border,
    },
    btnSecondaryText: { color: c.textSecondary, fontWeight: '600', fontSize: 15 },
  });
}
