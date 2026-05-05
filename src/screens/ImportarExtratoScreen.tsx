import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Platform,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { ColorScheme } from '../theme/colors';
import { extratoService, ExtratoTransacaoPreview, saldosService } from '../services/api';
import { SaldoConta } from '../types';
import { fmtBRL } from '../utils/currency';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ItemPreview extends ExtratoTransacaoPreview {
  key: string;
  selecionado: boolean;
  descricaoEdit: string;
  categoriaEdit: string;
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function ImportarExtratoScreen({ navigation }: any) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [fase, setFase]       = useState<'upload' | 'preview' | 'done'>('upload');
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [erro, setErro]       = useState('');

  const [contas, setContas]     = useState<SaldoConta[]>([]);
  const [contaId, setContaId]   = useState<string | null>(null);

  const [itens, setItens]         = useState<ItemPreview[]>([]);
  const [importados, setImportados] = useState(0);

  const fileRef = useRef<any>(null);

  useEffect(() => {
    saldosService.getAll().then(setContas).catch(() => {});
  }, []);

  // ── Upload ──────────────────────────────────────────────────────────────────

  async function handleFileChange(e: any) {
    const file: File = e.target.files?.[0];
    if (!file) return;
    setErro('');
    setLoading(true);
    setLoadingMsg('Processando arquivo OFX…');
    try {
      const transacoes = await extratoService.parse(file);
      if (transacoes.length === 0) {
        setErro('Nenhuma transação encontrada no arquivo.');
        return;
      }
      const parsed: ItemPreview[] = transacoes.map((t, i) => ({
        ...t,
        key: String(i),
        selecionado: true,
        descricaoEdit: t.descricao,
        categoriaEdit: t.categoriaNome ?? '',
      }));
      setItens(parsed);
      setFase('preview');
    } catch (err: any) {
      const msg = err?.response?.data ?? err?.message ?? 'Erro ao processar arquivo.';
      setErro(typeof msg === 'string' ? msg : 'Erro ao processar arquivo.');
    } finally {
      setLoading(false);
      setLoadingMsg('');
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  // ── Preview ─────────────────────────────────────────────────────────────────

  function toggleItem(key: string) {
    setItens(prev => prev.map(i => i.key === key ? { ...i, selecionado: !i.selecionado } : i));
  }

  function toggleAll(ligar: boolean) {
    setItens(prev => prev.map(i => ({ ...i, selecionado: ligar })));
  }

  function updateDescricao(key: string, v: string) {
    setItens(prev => prev.map(i => i.key === key ? { ...i, descricaoEdit: v } : i));
  }

  function updateCategoria(key: string, v: string) {
    setItens(prev => prev.map(i => i.key === key ? { ...i, categoriaEdit: v } : i));
  }

  async function handleImportar() {
    const selecionados = itens.filter(i => i.selecionado);
    if (selecionados.length === 0) { setErro('Selecione ao menos um item.'); return; }

    setLoading(true);
    setLoadingMsg(`Importando ${selecionados.length} lançamentos…`);
    setErro('');
    try {
      const payload = selecionados.map(i => ({
        descricao:       i.descricaoEdit || i.descricao,
        valor:           i.valor,
        data:            i.data,
        mes:             i.mes,
        ano:             i.ano,
        categoriaNome:   i.categoriaEdit || null,
        contaBancariaId: contaId,
      }));
      const res = await extratoService.importar(payload);
      setImportados(res.importados);
      setFase('done');
    } catch (err: any) {
      const msg = err?.response?.data ?? err?.message ?? 'Erro ao importar.';
      setErro(typeof msg === 'string' ? msg : 'Erro ao importar.');
    } finally {
      setLoading(false);
      setLoadingMsg('');
    }
  }

  // ── Loading ─────────────────────────────────────────────────────────────────

  if (loading) return (
    <View style={[s.container, { justifyContent: 'center', alignItems: 'center', gap: 16 }]}>
      <ActivityIndicator size="large" color={colors.green} />
      <Text style={{ color: colors.textSecondary }}>{loadingMsg}</Text>
    </View>
  );

  // ── Concluído ───────────────────────────────────────────────────────────────

  if (fase === 'done') return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Importar Extrato</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 20 }}>
        <Text style={{ fontSize: 56 }}>✅</Text>
        <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text, textAlign: 'center' }}>
          {importados} lançamento{importados !== 1 ? 's' : ''} importado{importados !== 1 ? 's' : ''} com sucesso!
        </Text>
        <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
          Os lançamentos já estão disponíveis na tela de Lançamentos.
        </Text>

        <TouchableOpacity
          style={[s.btnPrimary, { width: '100%' }]}
          onPress={() => {
            setFase('upload');
            setItens([]);
            setErro('');
            setImportados(0);
          }}
        >
          <Text style={s.btnPrimaryText}>Importar outro arquivo</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.btnSecondary, { width: '100%' }]}
          onPress={() => navigation.navigate('Lançamentos')}
        >
          <Text style={s.btnSecondaryText}>Ver lançamentos</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ── Preview ─────────────────────────────────────────────────────────────────

  if (fase === 'preview') {
    const qtdSel   = itens.filter(i => i.selecionado).length;
    const todosSel = qtdSel === itens.length;

    return (
      <View style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => setFase('upload')} style={s.backBtn}>
            <Text style={s.backBtnText}>←</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>Revisar lançamentos</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 130 }}>
          {/* Seleção em massa */}
          <View style={s.previewTopBar}>
            <Text style={s.previewCount}>
              {qtdSel} de {itens.length} selecionados
            </Text>
            <TouchableOpacity onPress={() => toggleAll(!todosSel)} style={s.toggleAllBtn}>
              <Text style={s.toggleAllText}>{todosSel ? '☑ Desmarcar todos' : '☐ Selecionar todos'}</Text>
            </TouchableOpacity>
          </View>

          {itens.map(item => (
            <View key={item.key} style={[s.itemCard, !item.selecionado && s.itemCardOff]}>
              {/* Checkbox */}
              <TouchableOpacity onPress={() => toggleItem(item.key)} style={{ paddingTop: 2 }}>
                <Text style={{ fontSize: 18 }}>{item.selecionado ? '✅' : '⬜'}</Text>
              </TouchableOpacity>

              <View style={{ flex: 1, gap: 4 }}>
                {/* Tipo badge + valor */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={[
                    s.tipoBadge,
                    item.tipo === 'Credito' ? s.tipoBadgeCredito : s.tipoBadgeDebito,
                  ]}>
                    <Text style={[
                      s.tipoBadgeText,
                      item.tipo === 'Credito' ? s.tipoBadgeCreditoText : s.tipoBadgeDebitoText,
                    ]}>
                      {item.tipo === 'Credito' ? '🟢 Crédito' : '🔴 Débito'}
                    </Text>
                  </View>
                  <Text style={[
                    s.itemValor,
                    { color: item.tipo === 'Credito' ? colors.green : colors.red },
                  ]}>
                    {fmtBRL(item.valor)}
                  </Text>
                </View>

                {/* Descrição editável */}
                <TextInput
                  style={[s.itemDescInput, !item.selecionado && { color: colors.textTertiary }]}
                  value={item.descricaoEdit}
                  onChangeText={v => updateDescricao(item.key, v)}
                  editable={item.selecionado}
                  placeholderTextColor={colors.textTertiary}
                />

                {/* Data + Categoria */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <Text style={s.itemMeta}>
                    {new Date(item.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </Text>
                  <View style={s.catInputWrap}>
                    <Text style={s.catInputIcon}>🏷</Text>
                    <TextInput
                      style={[s.catInput, !item.selecionado && { color: colors.textTertiary }]}
                      value={item.categoriaEdit}
                      onChangeText={v => updateCategoria(item.key, v)}
                      editable={item.selecionado}
                      placeholder="Categoria"
                      placeholderTextColor={colors.textTertiary}
                    />
                  </View>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Rodapé */}
        <View style={s.footer}>
          {erro ? <Text style={s.erroText}>{erro}</Text> : null}
          <View style={s.footerRow}>
            <Text style={s.footerCount}>{qtdSel} selecionados</Text>
            <TouchableOpacity
              style={[s.btnPrimary, qtdSel === 0 && { opacity: 0.5 }]}
              onPress={handleImportar}
              disabled={qtdSel === 0}
            >
              <Text style={s.btnPrimaryText}>Importar {qtdSel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // ── Upload ──────────────────────────────────────────────────────────────────

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Importar Extrato</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.scrollContent}>
        <Text style={s.pageTitle}>📥 Importar Extrato Bancário</Text>
        <Text style={s.pageSub}>
          Exporte o extrato do seu banco no formato OFX e importe aqui.
          Compatível com Bradesco, Itaú, Santander, Banco do Brasil e outros.
        </Text>

        {/* Conta bancária (opcional) */}
        {contas.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>Conta bancária (opcional)</Text>
            <Text style={{ color: colors.textTertiary, fontSize: 12, marginBottom: 4 }}>
              Associa os lançamentos a uma conta específica.
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <TouchableOpacity
                style={[s.contaChip, contaId === null && s.contaChipActive]}
                onPress={() => setContaId(null)}
              >
                <Text style={[s.contaChipNome, contaId === null && s.contaChipNomeActive]}>
                  Sem conta
                </Text>
              </TouchableOpacity>
              {contas.map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={[s.contaChip, contaId === c.id && s.contaChipActive]}
                  onPress={() => setContaId(c.id)}
                >
                  <Text style={[s.contaChipNome, contaId === c.id && s.contaChipNomeActive]}>
                    {c.banco}
                  </Text>
                  <Text style={[s.contaChipSaldo, contaId === c.id && { color: colors.green }]}>
                    {fmtBRL(c.saldo)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Upload */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>Arquivo OFX</Text>
          <TouchableOpacity
            style={s.uploadBox}
            onPress={() => fileRef.current?.click()}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 40 }}>📂</Text>
            <Text style={s.uploadText}>Selecionar arquivo</Text>
            <Text style={s.uploadSub}>.ofx exportado do seu banco</Text>
          </TouchableOpacity>
          {Platform.OS === 'web' && React.createElement('input', {
            ref: fileRef, type: 'file', accept: '.ofx,.OFX',
            onChange: handleFileChange, style: { display: 'none' },
          })}
        </View>

        {erro ? <Text style={s.erroText}>{erro}</Text> : null}
      </ScrollView>
    </View>
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
    backBtn:     { width: 40, justifyContent: 'center' },
    backBtnText: { fontSize: 22, color: c.text },
    headerTitle: { fontSize: 17, fontWeight: '700', color: c.text },

    scrollContent: { padding: 16, gap: 16, paddingBottom: 40 },
    pageTitle:   { fontSize: 22, fontWeight: 'bold', color: c.text },
    pageSub:     { fontSize: 14, color: c.textSecondary, lineHeight: 20 },

    section: {
      backgroundColor: c.surface, borderRadius: 12, padding: 16,
      gap: 8, borderWidth: 1, borderColor: c.border,
    },
    sectionLabel: {
      fontSize: 12, fontWeight: '700', color: c.textSecondary,
      textTransform: 'uppercase', letterSpacing: 0.5,
    },

    uploadBox: {
      borderWidth: 2, borderColor: c.border, borderStyle: 'dashed',
      borderRadius: 12, padding: 32, alignItems: 'center', gap: 8,
    },
    uploadText: { fontSize: 15, color: c.text, fontWeight: '600' },
    uploadSub:  { fontSize: 12, color: c.textTertiary, textAlign: 'center' },

    contaChip: {
      borderWidth: 1.5, borderColor: c.border, borderRadius: 10,
      paddingHorizontal: 14, paddingVertical: 10, marginRight: 8,
      alignItems: 'center', backgroundColor: c.surfaceElevated, minWidth: 90,
    },
    contaChipActive:     { borderColor: c.green, backgroundColor: c.greenDim },
    contaChipNome:       { fontSize: 13, fontWeight: '700', color: c.textSecondary },
    contaChipNomeActive: { color: c.green },
    contaChipSaldo:      { fontSize: 11, color: c.textTertiary, marginTop: 2 },

    erroText: { color: c.red, fontSize: 13, textAlign: 'center' },

    btnPrimary: {
      backgroundColor: c.green, borderRadius: 10, paddingVertical: 14,
      paddingHorizontal: 20, alignItems: 'center',
    },
    btnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 15 },

    btnSecondary: {
      borderRadius: 10, paddingVertical: 14, paddingHorizontal: 20,
      alignItems: 'center', borderWidth: 1, borderColor: c.border,
    },
    btnSecondaryText: { color: c.textSecondary, fontWeight: '600', fontSize: 15 },

    // Preview
    previewTopBar: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 14, paddingVertical: 10,
      backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.border,
    },
    previewCount:  { fontSize: 13, color: c.textSecondary, fontWeight: '600' },
    toggleAllBtn:  { padding: 4 },
    toggleAllText: { fontSize: 13, color: c.green, fontWeight: '600' },

    itemCard: {
      flexDirection: 'row', alignItems: 'flex-start', gap: 10,
      backgroundColor: c.surface, padding: 12,
      borderBottomWidth: 1, borderBottomColor: c.border,
    },
    itemCardOff:   { opacity: 0.4 },
    itemValor:     { fontSize: 13, fontWeight: '700', marginLeft: 'auto' as any },

    tipoBadge: {
      borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2,
    },
    tipoBadgeCredito:     { backgroundColor: c.greenDim },
    tipoBadgeDebito:      { backgroundColor: c.redDim },
    tipoBadgeText:        { fontSize: 11, fontWeight: '600' },
    tipoBadgeCreditoText: { color: c.green },
    tipoBadgeDebitoText:  { color: c.red },

    itemDescInput: {
      fontSize: 13, fontWeight: '600', color: c.text,
      borderBottomWidth: 1, borderBottomColor: c.border, paddingVertical: 1,
    },
    itemMeta: { fontSize: 11, color: c.textSecondary },

    catInputWrap: {
      flexDirection: 'row', alignItems: 'center', gap: 3,
      borderWidth: 1, borderColor: c.border, borderRadius: 8,
      paddingHorizontal: 6, paddingVertical: 2,
    },
    catInputIcon: { fontSize: 11 },
    catInput: {
      fontSize: 11, color: c.text, minWidth: 80, maxWidth: 140, paddingVertical: 0,
    },

    footer: {
      position: 'absolute', bottom: 0, left: 0, right: 0,
      backgroundColor: c.surface, padding: 16, gap: 6,
      borderTopWidth: 1, borderTopColor: c.border,
    },
    footerRow: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    },
    footerCount: { fontSize: 13, color: c.textSecondary, fontWeight: '600' },
  });
}
