import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator, Modal,
  SafeAreaView, Platform,
} from 'react-native';
import { lancamentosService, categoriasService, cartoesService } from '../services/api';
import { Categoria, CartaoCredito, SituacaoLancamento, TipoLancamento } from '../types';
import DatePickerField from '../components/DatePickerField';
import { useTheme } from '../theme/ThemeContext';
import { ColorScheme } from '../theme/colors';

type Modo = 'avista' | 'parcelado' | 'recorrente';

const TIPOS = [
  { label: 'Crédito',  value: TipoLancamento.Credito },
  { label: 'Débito',   value: TipoLancamento.Debito  },
  { label: 'Pix',      value: TipoLancamento.Pix     },
];

const MODOS: { label: string; sub: string; value: Modo }[] = [
  { value: 'avista',     label: '💵 À vista',    sub: 'Pagamento único'            },
  { value: 'parcelado',  label: '💳 Parcelado',  sub: 'Divide o total em N meses' },
  { value: 'recorrente', label: '🔄 Recorrente', sub: 'Mesmo valor todo mês'       },
];

const SITUACOES: Record<TipoLancamento, { label: string; value: SituacaoLancamento }[]> = {
  [TipoLancamento.Credito]: [
    { label: 'Recebido',  value: SituacaoLancamento.Recebido  },
    { label: 'A Receber', value: SituacaoLancamento.AReceber  },
  ],
  [TipoLancamento.Debito]: [
    { label: 'Pago',     value: SituacaoLancamento.Pago    },
    { label: 'A Vencer', value: SituacaoLancamento.AVencer },
    { label: 'Vencido',  value: SituacaoLancamento.Vencido },
  ],
  [TipoLancamento.Pix]: [
    { label: 'Pago',     value: SituacaoLancamento.Pago    },
    { label: 'A Vencer', value: SituacaoLancamento.AVencer },
  ],
};

const SITUACAO_PADRAO: Record<TipoLancamento, SituacaoLancamento> = {
  [TipoLancamento.Credito]: SituacaoLancamento.AReceber,
  [TipoLancamento.Debito]:  SituacaoLancamento.AVencer,
  [TipoLancamento.Pix]:     SituacaoLancamento.Pago,
};

function applyValorMask(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  const num = parseInt(digits, 10);
  const reais = Math.floor(num / 100);
  const cents = num % 100;
  const reaisStr = reais === 0 ? '0' : reais.toLocaleString('pt-BR');
  return `${reaisStr},${String(cents).padStart(2, '0')}`;
}

export default function AddLancamentoScreen({ route, navigation }: any) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { mes, ano } = route.params;

  const [descricao,   setDescricao]   = useState('');
  const [valor,       setValor]       = useState('');
  const [data,        setData]        = useState(new Date());
  const [tipo,        setTipo]        = useState<TipoLancamento>(TipoLancamento.Debito);
  const [situacao,    setSituacao]    = useState<SituacaoLancamento>(SituacaoLancamento.AVencer);
  const [categoriaId, setCategoriaId] = useState<string | undefined>();
  const [cartaoId,    setCartaoId]    = useState<string | undefined>();
  const [categorias,  setCategorias]  = useState<Categoria[]>([]);
  const [cartoes,     setCartoes]     = useState<CartaoCredito[]>([]);
  const [modo,        setModo]        = useState<Modo>('avista');
  const [parcelas,    setParcelas]    = useState('2');
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');

  const [modalCatVisible,    setModalCatVisible]    = useState(false);
  const [novaCategoria,      setNovaCategoria]      = useState('');
  const [savingCat,          setSavingCat]          = useState(false);
  const [modalCartaoVisible, setModalCartaoVisible] = useState(false);
  const [novoCartao,         setNovoCartao]         = useState('');
  const [savingCartao,       setSavingCartao]       = useState(false);

  useEffect(() => { loadCategorias(); loadCartoes(); }, []);

  async function loadCategorias() {
    try { setCategorias(await categoriasService.getAll()); } catch {}
  }
  async function loadCartoes() {
    try { setCartoes(await cartoesService.getAll(mes, ano)); } catch {}
  }

  function changeTipo(t: TipoLancamento) {
    setTipo(t);
    setSituacao(SITUACAO_PADRAO[t]);
    setCategoriaId(undefined);
    if (t !== TipoLancamento.Debito) setCartaoId(undefined);
  }

  async function handleSalvarCategoria() {
    if (!novaCategoria.trim()) return;
    setSavingCat(true);
    try {
      const result = await categoriasService.create({ nome: novaCategoria.trim(), tipo });
      await loadCategorias();
      setCategoriaId(result.id);
      setNovaCategoria('');
      setModalCatVisible(false);
    } catch { setError('Erro ao criar categoria.'); }
    finally { setSavingCat(false); }
  }

  async function handleSalvarCartao() {
    if (!novoCartao.trim()) return;
    setSavingCartao(true);
    try {
      const result = await cartoesService.createCartao({ nome: novoCartao.trim() });
      await loadCartoes();
      setCartaoId(result.id);
      setNovoCartao('');
      setModalCartaoVisible(false);
    } catch { setError('Erro ao criar cartão.'); }
    finally { setSavingCartao(false); }
  }

  const parcelasNum = Math.max(1, parseInt(parcelas) || 1);
  const valorNum    = parseFloat(valor.replace(/\./g, '').replace(',', '.')) || 0;
  const categoriasFiltradas = categorias.filter(
    c => c.tipo === tipo || c.tipo === TipoLancamento.Debito
  );
  const previewParcelado = modo === 'parcelado' && parcelasNum > 1 && valorNum > 0;

  async function handleSalvar() {
    setError('');
    if (!descricao.trim()) { setError('Informe a descrição.'); return; }
    if (isNaN(valorNum) || valorNum <= 0) { setError('Informe um valor válido.'); return; }

    setLoading(true);
    try {
      await lancamentosService.create({
        descricao: descricao.trim(),
        data: data.toISOString(),
        valor: valorNum,
        tipo,
        situacao,
        mes: data.getMonth() + 1,
        ano: data.getFullYear(),
        categoriaId: categoriaId ?? null,
        cartaoId: cartaoId ?? null,
        totalParcelas: modo === 'avista' ? 1 : modo === 'recorrente' ? 120 : parcelasNum,
        isRecorrente: modo === 'recorrente',
      });
      navigation.goBack();
    } catch { setError('Erro ao salvar lançamento.'); }
    finally { setLoading(false); }
  }

  return (
    <View style={styles.backdrop}>
      {/* Área acima do sheet — tap fecha */}
      <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => navigation.goBack()} />

      <SafeAreaView style={styles.sheet}>
        {/* Handle + cabeçalho */}
        <View style={styles.handle} />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Novo Lançamento</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Descrição + Valor + Data */}
          <Text style={styles.label}>Descrição</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Netflix, Aluguel, Salário..."
            placeholderTextColor={colors.inputPlaceholder}
            value={descricao} onChangeText={setDescricao}
          />
          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.label}>Valor (R$)</Text>
              <TextInput
                style={styles.input} placeholder="0,00" placeholderTextColor={colors.inputPlaceholder}
                keyboardType="decimal-pad" value={valor}
                onChangeText={(raw) => setValor(applyValorMask(raw))}
              />
            </View>
            <View style={{ flex: 1 }}>
              <DatePickerField label="Data" value={data} onChange={setData} dark />
            </View>
          </View>

          {/* Tipo */}
          <Text style={styles.label}>Tipo</Text>
          <View style={styles.chips}>
            {TIPOS.map(t => (
              <TouchableOpacity
                key={t.value}
                style={[styles.chip, tipo === t.value && styles.chipActive]}
                onPress={() => changeTipo(t.value)}
              >
                <Text style={[styles.chipText, tipo === t.value && styles.chipTextActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Situação */}
          <Text style={styles.label}>Situação</Text>
          <View style={styles.chips}>
            {SITUACOES[tipo].map(s => (
              <TouchableOpacity
                key={s.value}
                style={[styles.chip, situacao === s.value && styles.chipActive]}
                onPress={() => setSituacao(s.value)}
              >
                <Text style={[styles.chipText, situacao === s.value && styles.chipTextActive]}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Cartão — somente para Débito */}
          {tipo === TipoLancamento.Debito && (
            <>
              <Text style={styles.label}>Cartão de Crédito (opcional)</Text>
              <View style={styles.chips}>
                {cartoes.map(c => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.chip, cartaoId === c.id && styles.chipCartao]}
                    onPress={() => setCartaoId(cartaoId === c.id ? undefined : c.id)}
                  >
                    <Text style={[styles.chipText, cartaoId === c.id && styles.chipTextActive]}>
                      💳 {c.nome}
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity style={styles.chipAdd} onPress={() => setModalCartaoVisible(true)}>
                  <Text style={styles.chipAddText}>+ Novo</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Modo */}
          <Text style={styles.label}>Modo</Text>
          <View style={styles.modoGrid}>
            {MODOS.map(m => (
              <TouchableOpacity
                key={m.value}
                style={[styles.modoCard, modo === m.value && styles.modoCardActive]}
                onPress={() => { setModo(m.value); if (m.value === 'avista') setParcelas('2'); }}
                activeOpacity={0.75}
              >
                <Text style={[styles.modoLabel, modo === m.value && styles.modoLabelActive]}>
                  {m.label}
                </Text>
                <Text style={[styles.modoSub, modo === m.value && styles.modoSubActive]}>
                  {m.sub}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Stepper — somente para parcelado */}
          {modo === 'parcelado' && (
            <View style={styles.stepperSection}>
              <Text style={styles.stepperLabel}>Número de parcelas</Text>
              <View style={styles.stepperRow}>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => setParcelas(String(Math.max(2, parcelasNum - 1)))}
                >
                  <Text style={styles.stepperBtnText}>−</Text>
                </TouchableOpacity>
                <TextInput
                  style={styles.stepperInput}
                  keyboardType="number-pad"
                  value={parcelas}
                  onChangeText={t => setParcelas(t.replace(/\D/g, '') || '2')}
                  placeholderTextColor={colors.inputPlaceholder}
                />
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => setParcelas(String(parcelasNum + 1))}
                >
                  <Text style={styles.stepperBtnText}>+</Text>
                </TouchableOpacity>
              </View>

              {previewParcelado && (
                <View style={styles.previewBox}>
                  <Text style={styles.previewTitle}>Parcelamento</Text>
                  <Text style={styles.previewLine}>
                    {parcelasNum}x de{' '}
                    <Text style={styles.previewValor}>
                      R$ {(valorNum / parcelasNum).toFixed(2)}
                    </Text>
                  </Text>
                  <Text style={styles.previewHint}>Total: R$ {valorNum.toFixed(2)}</Text>
                </View>
              )}
            </View>
          )}

          {/* Info recorrente */}
          {modo === 'recorrente' && (
            <View style={styles.recorrenteInfo}>
              <Text style={styles.recorrenteInfoTitle}>🔄 Lançamento recorrente</Text>
              <Text style={styles.recorrenteInfoText}>
                Gerado todo mês automaticamente. Cancele quando quiser ao editar qualquer mês futuro.
              </Text>
            </View>
          )}

          {/* Categoria */}
          <Text style={styles.label}>Categoria (opcional)</Text>
          <View style={styles.chips}>
            {categoriasFiltradas.map(c => (
              <TouchableOpacity
                key={c.id}
                style={[styles.chip, categoriaId === c.id && styles.chipActive]}
                onPress={() => setCategoriaId(categoriaId === c.id ? undefined : c.id)}
              >
                <Text style={[styles.chipText, categoriaId === c.id && styles.chipTextActive]}>
                  {c.nome}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.chipAdd} onPress={() => setModalCatVisible(true)}>
              <Text style={styles.chipAddText}>+ Nova</Text>
            </TouchableOpacity>
          </View>

          {error !== '' && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity style={styles.button} onPress={handleSalvar} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>Salvar Lançamento</Text>
            }
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>

      {/* Modal — Nova Categoria */}
      <Modal visible={modalCatVisible} transparent animationType="fade" onRequestClose={() => setModalCatVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Nova Categoria</Text>
            <TextInput style={styles.modalInput} placeholder="Nome da categoria" placeholderTextColor={colors.inputPlaceholder} value={novaCategoria} onChangeText={setNovaCategoria} autoFocus />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => { setModalCatVisible(false); setNovaCategoria(''); }}>
                <Text style={styles.btnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnSave} onPress={handleSalvarCategoria} disabled={savingCat}>
                {savingCat ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Salvar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal — Novo Cartão */}
      <Modal visible={modalCartaoVisible} transparent animationType="fade" onRequestClose={() => setModalCartaoVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Novo Cartão</Text>
            <TextInput style={styles.modalInput} placeholder="Nome do cartão" placeholderTextColor={colors.inputPlaceholder} value={novoCartao} onChangeText={setNovoCartao} autoFocus />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => { setModalCartaoVisible(false); setNovoCartao(''); }}>
                <Text style={styles.btnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnSave} onPress={handleSalvarCartao} disabled={savingCartao}>
                {savingCartao ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Salvar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function makeStyles(c: ColorScheme) {
  return StyleSheet.create({
    // ── Bottom sheet backdrop + sheet
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: c.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '92%',
      paddingBottom: Platform.OS === 'ios' ? 0 : 12,
    },
    handle: {
      width: 40, height: 4,
      backgroundColor: c.border,
      borderRadius: 2,
      alignSelf: 'center',
      marginTop: 12,
      marginBottom: 4,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    headerTitle: {
      flex: 1,
      fontSize: 18,
      fontWeight: 'bold',
      color: c.text,
    },
    closeBtn: {
      width: 32, height: 32,
      borderRadius: 16,
      backgroundColor: c.inputBorder,
      justifyContent: 'center',
      alignItems: 'center',
    },
    closeBtnText: { color: c.text, fontSize: 14, fontWeight: 'bold' },

    scroll: { flex: 1 },
    content: { padding: 20, paddingBottom: 40 },

    // ── Form elements
    label: { fontSize: 13, fontWeight: '600', color: c.textSecondary, marginBottom: 6, marginTop: 16, textTransform: 'uppercase', letterSpacing: 0.5 },
    input: {
      backgroundColor: c.inputBg,
      borderRadius: 8, padding: 14, fontSize: 16,
      borderWidth: 1, borderColor: c.inputBorder,
      color: c.text,
    },
    row: { flexDirection: 'row' },

    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      paddingHorizontal: 14, paddingVertical: 8,
      borderRadius: 20, borderWidth: 1, borderColor: c.border,
      backgroundColor: c.inputBg,
    },
    chipActive: { backgroundColor: c.green, borderColor: c.green },
    chipCartao: { backgroundColor: c.blue, borderColor: c.blue },
    chipText: { fontSize: 14, color: c.textSecondary },
    chipTextActive: { color: c.text, fontWeight: '600' },
    chipAdd: {
      paddingHorizontal: 14, paddingVertical: 8,
      borderRadius: 20, borderWidth: 1, borderColor: c.greenBorder,
      backgroundColor: 'transparent',
    },
    chipAddText: { fontSize: 14, color: c.green, fontWeight: '600' },

    // ── Modo grid
    modoGrid: { flexDirection: 'row', gap: 8 },
    modoCard: {
      flex: 1, borderRadius: 10, borderWidth: 1.5, borderColor: c.inputBorder,
      backgroundColor: c.inputBg, padding: 12, alignItems: 'center',
    },
    modoCardActive: { borderColor: c.green, backgroundColor: c.greenDim },
    modoLabel: { fontSize: 13, fontWeight: '700', color: c.textSecondary, textAlign: 'center' },
    modoLabelActive: { color: c.green },
    modoSub: { fontSize: 10, color: c.textTertiary, marginTop: 3, textAlign: 'center' },
    modoSubActive: { color: c.green },

    // ── Stepper
    stepperSection: { marginTop: 12 },
    stepperLabel: { fontSize: 13, fontWeight: '600', color: c.textSecondary, marginBottom: 8 },
    stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    stepperBtn: {
      width: 42, height: 42, borderRadius: 21,
      backgroundColor: c.inputBorder, justifyContent: 'center', alignItems: 'center',
    },
    stepperBtnText: { color: c.text, fontSize: 22, lineHeight: 26 },
    stepperInput: {
      width: 64, textAlign: 'center', backgroundColor: c.border,
      borderRadius: 8, padding: 10, fontSize: 20, fontWeight: 'bold',
      borderWidth: 1, borderColor: c.inputBorder, color: c.text,
    },

    // ── Info recorrente
    recorrenteInfo: {
      marginTop: 12, backgroundColor: c.purpleDim, borderRadius: 10,
      padding: 14, borderWidth: 1, borderColor: c.purpleBorder,
    },
    recorrenteInfoTitle: { fontSize: 13, fontWeight: '700', color: c.purpleLight, marginBottom: 4 },
    recorrenteInfoText: { fontSize: 12, color: c.purpleLight, lineHeight: 18 },

    // ── Preview parcelado
    previewBox: {
      marginTop: 12, backgroundColor: c.greenDim, borderRadius: 10,
      padding: 14, borderWidth: 1, borderColor: c.greenBorder,
    },
    previewTitle: { fontSize: 11, fontWeight: '700', color: c.green, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
    previewLine: { fontSize: 15, color: c.textSecondary },
    previewValor: { fontWeight: 'bold', color: c.green },
    previewHint: { fontSize: 12, color: c.textSecondary, marginTop: 4 },

    errorBox: { backgroundColor: c.redDim, borderRadius: 8, padding: 12, marginTop: 16, borderWidth: 1, borderColor: c.redBorder },
    errorText: { color: c.red, fontSize: 14, textAlign: 'center' },

    button: { backgroundColor: c.green, borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 24 },
    buttonText: { color: c.text, fontSize: 16, fontWeight: 'bold' },

    // ── Sub-modals (categoria / cartão)
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    modal: { backgroundColor: c.surfaceElevated, borderRadius: 16, padding: 24, width: '100%', maxWidth: 420, borderWidth: 1, borderColor: c.border },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: c.text, marginBottom: 16 },
    modalInput: {
      backgroundColor: c.inputBg, borderRadius: 8, padding: 14, fontSize: 16,
      borderWidth: 1, borderColor: c.inputBorder, color: c.text,
    },
    modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
    btnCancel: { flex: 1, borderRadius: 8, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: c.border },
    btnCancelText: { color: c.textSecondary, fontSize: 15 },
    btnSave: { flex: 1, backgroundColor: c.green, borderRadius: 8, padding: 14, alignItems: 'center' },
  });
}
