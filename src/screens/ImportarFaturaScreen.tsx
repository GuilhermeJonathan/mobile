import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput, Platform,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { faturasService, FaturaTransacao, ImportarFaturaItem } from '../services/api';
import { cartoesService } from '../services/api';
import { fmtBRL } from '../utils/currency';
import { CartaoCredito } from '../types';

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

interface ItemPreview extends FaturaTransacao {
  key: string;
  selecionado: boolean;
  descricaoEdit: string;
  categoriaEdit: string;   // editável pelo usuário
}

function isParcelado(item: FaturaTransacao) {
  return item.parcelaAtual != null;
}

function agruparPorSecao(itens: ItemPreview[]) {
  const mapa = new Map<string, ItemPreview[]>();
  for (const item of itens) {
    const chave = `${item.secaoCartao}||${item.titularCartao}`;
    if (!mapa.has(chave)) mapa.set(chave, []);
    mapa.get(chave)!.push(item);
  }
  return Array.from(mapa.entries()).map(([chave, items]) => {
    const [secao, titular] = chave.split('||');
    return { secao, titular, items };
  });
}

export default function ImportarFaturaScreen({ navigation }: any) {
  const { colors } = useTheme();
  const s = styles(colors);
  const now = new Date();

  const [mesFatura, setMesFatura] = useState(now.getMonth() + 1);
  const [anoFatura, setAnoFatura] = useState(now.getFullYear());

  const [cartoes, setCartoes] = useState<CartaoCredito[]>([]);
  const [itens, setItens]     = useState<ItemPreview[]>([]);
  const [mapeamento, setMapeamento] = useState<Record<string, string>>({});

  // quais grupos parcelados/avista estão expandidos
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());

  const [fase, setFase]         = useState<'upload' | 'preview' | 'done'>('upload');
  const [loading, setLoading]   = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [erro, setErro]         = useState('');
  const fileRef = useRef<any>(null);

  React.useEffect(() => {
    cartoesService.getAll(mesFatura, anoFatura).then(setCartoes).catch(() => {});
  }, []);

  function navMes(delta: number) {
    const d = new Date(anoFatura, mesFatura - 1 + delta, 1);
    setMesFatura(d.getMonth() + 1);
    setAnoFatura(d.getFullYear());
  }

  async function handleFileChange(e: any) {
    const file: File = e.target.files?.[0];
    if (!file) return;
    setErro('');
    setLoading(true);
    setLoadingMsg('Lendo Excel…');
    try {
      const transacoes = await faturasService.preview(file, mesFatura, anoFatura);
      if (transacoes.length === 0) {
        setErro('Nenhuma transação encontrada. Verifique se o arquivo segue o formato esperado.');
        return;
      }
      const parsed: ItemPreview[] = transacoes.map((t, i) => ({
        ...t,
        key: String(i),
        selecionado: true,
        descricaoEdit: t.descricao,
        categoriaEdit: t.categoriaNome,
      }));
      setItens(parsed);
      // pré-expande todos os grupos
      const chaves = new Set<string>();
      parsed.forEach(p => {
        chaves.add(`${p.secaoCartao}|parc`);
        chaves.add(`${p.secaoCartao}|vista`);
      });
      setExpandidos(chaves);
      // auto-mapeia se só tem 1 cartão
      if (cartoes.length === 1) {
        const map: Record<string, string> = {};
        [...new Set(parsed.map(p => p.secaoCartao))].forEach(s => map[s] = cartoes[0].id);
        setMapeamento(map);
      }
      setFase('preview');
    } catch (err: any) {
      setErro(err?.response?.data ?? 'Erro ao processar arquivo.');
    } finally {
      setLoading(false);
      setLoadingMsg('');
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  function toggleItem(key: string) {
    setItens(prev => prev.map(i => i.key === key ? { ...i, selecionado: !i.selecionado } : i));
  }

  function toggleGrupo(chave: string, itensGrupo: ItemPreview[], ligar: boolean) {
    setItens(prev => {
      const keys = new Set(itensGrupo.map(i => i.key));
      return prev.map(i => keys.has(i.key) ? { ...i, selecionado: ligar } : i);
    });
  }

  function toggleExpandido(chave: string) {
    setExpandidos(prev => {
      const next = new Set(prev);
      next.has(chave) ? next.delete(chave) : next.add(chave);
      return next;
    });
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
    const semMap = selecionados.filter(i => !mapeamento[i.secaoCartao]);
    if (semMap.length > 0) {
      setErro(`Atribua um cartão para: ${[...new Set(semMap.map(i => `*.${i.secaoCartao}`))].join(', ')}`);
      return;
    }
    setLoading(true);
    setLoadingMsg(`Importando ${selecionados.length} lançamentos…`);
    setErro('');
    try {
      const payload: ImportarFaturaItem[] = selecionados.map(i => ({
        descricao:     i.descricaoEdit || i.descricao,
        data:          i.data,
        valor:         i.valor,
        mes:           i.mes,
        ano:           i.ano,
        cartaoId:      mapeamento[i.secaoCartao],
        categoriaNome: i.categoriaEdit || 'Outros',
        parcelaAtual:  i.parcelaAtual,
        totalParcelas: i.totalParcelas,
      }));
      await faturasService.importar(payload);
      setFase('done');
    } catch (err: any) {
      setErro(err?.response?.data ?? 'Erro ao importar.');
    } finally {
      setLoading(false);
      setLoadingMsg('');
    }
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <View style={[s.container, { justifyContent: 'center', alignItems: 'center', gap: 16 }]}>
      <ActivityIndicator size="large" color={colors.green} />
      <Text style={{ color: colors.textSecondary }}>{loadingMsg}</Text>
    </View>
  );

  // ── Concluído ─────────────────────────────────────────────────────────────
  if (fase === 'done') return (
    <View style={[s.container, { justifyContent: 'center', alignItems: 'center', gap: 20, padding: 32 }]}>
      <Text style={{ fontSize: 56 }}>✅</Text>
      <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text, textAlign: 'center' }}>
        Importação concluída!
      </Text>
      <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
        Lançamentos já aparecem em {MESES[mesFatura - 1]}/{anoFatura}.
      </Text>
      <TouchableOpacity style={s.btnPrimary} onPress={() => navigation.goBack()}>
        <Text style={s.btnPrimaryText}>Voltar</Text>
      </TouchableOpacity>
    </View>
  );

  // ── Preview ───────────────────────────────────────────────────────────────
  if (fase === 'preview') {
    const grupos        = agruparPorSecao(itens);
    const qtdSel        = itens.filter(i => i.selecionado).length;
    const totalSel      = itens.filter(i => i.selecionado).reduce((s, i) => s + i.valor, 0);

    return (
      <View style={s.container}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 130 }}>
          {grupos.map(grupo => {
            const parcelados = grupo.items.filter(isParcelado);
            const avista     = grupo.items.filter(i => !isParcelado(i));
            const cartaoMapeado = mapeamento[grupo.secao];

            return (
              <View key={grupo.secao} style={s.secaoBlock}>

                {/* Header do cartão */}
                <View style={s.secaoHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.secaoTitle}>💳 *.{grupo.secao}</Text>
                    <Text style={s.secaoTitular}>{grupo.titular}</Text>
                  </View>
                  <Text style={s.secaoQtd}>
                    {grupo.items.filter(i => i.selecionado).length}/{grupo.items.length} · {fmtBRL(grupo.items.filter(i => i.selecionado).reduce((s,i) => s+i.valor, 0))}
                  </Text>
                </View>

                {/* Selector de cartão do app */}
                <View style={s.cartaoMapRow}>
                  <Text style={s.cartaoMapLabel}>Importar para:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {cartoes.map(c => (
                      <TouchableOpacity
                        key={c.id}
                        style={[s.cartaoChip, cartaoMapeado === c.id && s.cartaoChipActive]}
                        onPress={() => setMapeamento(p => ({ ...p, [grupo.secao]: c.id }))}
                      >
                        <Text style={[s.cartaoChipText, cartaoMapeado === c.id && s.cartaoChipTextActive]}>
                          {c.nome}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* Sub-grupo: Parcelados */}
                {parcelados.length > 0 && (
                  <SubGrupo
                    titulo="📦 Parcelados"
                    chave={`${grupo.secao}|parc`}
                    itens={parcelados}
                    expandido={expandidos.has(`${grupo.secao}|parc`)}
                    onToggleExpand={() => toggleExpandido(`${grupo.secao}|parc`)}
                    onToggleGrupo={(ligar) => toggleGrupo(`${grupo.secao}|parc`, parcelados, ligar)}
                    onToggleItem={toggleItem}
                    onDescricao={updateDescricao}
                    onCategoria={updateCategoria}
                    colors={colors}
                    s={s}
                  />
                )}

                {/* Sub-grupo: À Vista */}
                {avista.length > 0 && (
                  <SubGrupo
                    titulo="⚡ À Vista"
                    chave={`${grupo.secao}|vista`}
                    itens={avista}
                    expandido={expandidos.has(`${grupo.secao}|vista`)}
                    onToggleExpand={() => toggleExpandido(`${grupo.secao}|vista`)}
                    onToggleGrupo={(ligar) => toggleGrupo(`${grupo.secao}|vista`, avista, ligar)}
                    onToggleItem={toggleItem}
                    onDescricao={updateDescricao}
                    onCategoria={updateCategoria}
                    colors={colors}
                    s={s}
                  />
                )}
              </View>
            );
          })}
        </ScrollView>

        {/* Rodapé */}
        <View style={s.footer}>
          {erro ? <Text style={s.erroText}>{erro}</Text> : null}
          <View style={s.footerRow}>
            <View>
              <Text style={s.footerCount}>{qtdSel} selecionados</Text>
              <Text style={s.footerTotal}>{fmtBRL(totalSel)}</Text>
            </View>
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

  // ── Upload ────────────────────────────────────────────────────────────────
  return (
    <ScrollView style={s.container} contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: 40 }}>
      <Text style={s.pageTitle}>📊 Importar Fatura</Text>
      <Text style={s.pageSub}>Importe lançamentos de cartão a partir de um arquivo Excel.</Text>

      <View style={s.section}>
        <Text style={s.sectionLabel}>Mês da fatura</Text>
        <View style={s.mesRow}>
          <TouchableOpacity onPress={() => navMes(-1)} style={s.mesBtn}>
            <Text style={s.mesBtnText}>◀</Text>
          </TouchableOpacity>
          <Text style={s.mesLabel}>{MESES[mesFatura - 1]}/{anoFatura}</Text>
          <TouchableOpacity onPress={() => navMes(1)} style={s.mesBtn}>
            <Text style={s.mesBtnText}>▶</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={s.section}>
        <Text style={s.sectionLabel}>Arquivo Excel (.xlsx)</Text>
        <TouchableOpacity style={s.uploadBox} onPress={() => fileRef.current?.click()} activeOpacity={0.7}>
          <Text style={{ fontSize: 40 }}>📂</Text>
          <Text style={s.uploadText}>Selecionar arquivo</Text>
          <Text style={s.uploadSub}>.xlsx exportado do seu banco</Text>
        </TouchableOpacity>
        {Platform.OS === 'web' && React.createElement('input', {
          ref: fileRef, type: 'file', accept: '.xlsx,.xls',
          onChange: handleFileChange, style: { display: 'none' },
        })}
      </View>

      {erro ? <Text style={s.erroText}>{erro}</Text> : null}

      <ExemploFormato colors={colors} s={s} />
    </ScrollView>
  );
}

// ── Componente Exemplo de Formato ────────────────────────────────────────────
const EXEMPLO_ROWS = [
  { data: '15/03', descricao: 'AMAZON COMPRAS',     tipo: 'Compra a Vista',                valor: 'R$ 89,90',   cat: 'Alimentação' },
  { data: '20/03', descricao: 'NETFLIX',             tipo: 'Compra a Vista',                valor: 'R$ 55,90',   cat: 'Assinatura'  },
  { data: '05/02', descricao: 'LOJA TENIS PARCELA',  tipo: 'Parcela Lojista Parc.2/6',      valor: 'R$ 124,50',  cat: 'Vestuário'   },
  { data: '10/01', descricao: 'AJUSTE CREDITO',      tipo: 'Ajuste a Credito',              valor: '- R$ 50,00', cat: ''            },
];

const COLS = ['DATA', 'DESCRIÇÃO', 'TIPO', 'VALOR R$', 'Categoria'];
const COL_WIDTHS = [52, 160, 200, 100, 100];

function ExemploFormato({ colors, s }: { colors: any; s: any }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionLabel}>Formato esperado do Excel</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View>
          {/* Cabeçalho */}
          <View style={s.tblRow}>
            {COLS.map((col, i) => (
              <View key={col} style={[s.tblCell, s.tblHeader, { width: COL_WIDTHS[i] }]}>
                <Text style={s.tblHeaderText}>{col}</Text>
              </View>
            ))}
          </View>
          {/* Linhas */}
          {EXEMPLO_ROWS.map((row, ri) => (
            <View key={ri} style={[s.tblRow, ri % 2 === 1 && s.tblRowAlt]}>
              <View style={[s.tblCell, { width: COL_WIDTHS[0] }]}><Text style={s.tblText}>{row.data}</Text></View>
              <View style={[s.tblCell, { width: COL_WIDTHS[1] }]}><Text style={s.tblText} numberOfLines={1}>{row.descricao}</Text></View>
              <View style={[s.tblCell, { width: COL_WIDTHS[2] }]}><Text style={s.tblText} numberOfLines={1}>{row.tipo}</Text></View>
              <View style={[s.tblCell, { width: COL_WIDTHS[3] }]}><Text style={[s.tblText, { textAlign: 'right' }]}>{row.valor}</Text></View>
              <View style={[s.tblCell, { width: COL_WIDTHS[4] }]}>
                <Text style={[s.tblText, !row.cat && { color: colors.textTertiary, fontStyle: 'italic' }]}>
                  {row.cat || '(vazio → Outros)'}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Legenda */}
      <View style={{ gap: 5, marginTop: 8 }}>
        {[
          '📌 Col A · DATA — formato DD/MM ou DD/MM/AAAA',
          '📌 Col B · DESCRIÇÃO — nome da transação',
          '📌 Col C · TIPO — texto livre; "Parc.X/Y" detecta parcelas',
          '📌 Col D · VALOR R$ — ex: R$ 89,90  ou  - R$ 50,00',
          '📌 Col E · Categoria — opcional; vazio = "Outros"',
          '🔄 Novas categorias são criadas automaticamente',
          '💳 Múltiplos cartões: separe por linha "Total: R$ …" na col D',
        ].map((txt, i) => (
          <Text key={i} style={s.legendaTxt}>{txt}</Text>
        ))}
      </View>
    </View>
  );
}

// ── Componente Sub-grupo (Parcelados / À Vista) ───────────────────────────────
function SubGrupo({ titulo, chave, itens, expandido, onToggleExpand, onToggleGrupo, onToggleItem, onDescricao, onCategoria, colors, s }: {
  titulo: string; chave: string; itens: ItemPreview[];
  expandido: boolean;
  onToggleExpand: () => void;
  onToggleGrupo: (ligar: boolean) => void;
  onToggleItem: (key: string) => void;
  onDescricao: (key: string, v: string) => void;
  onCategoria: (key: string, v: string) => void;
  colors: any; s: any;
}) {
  const todosSel = itens.every(i => i.selecionado);
  const total    = itens.filter(i => i.selecionado).reduce((s, i) => s + i.valor, 0);

  return (
    <View>
      {/* Header do sub-grupo */}
      <TouchableOpacity style={s.subGrupoHeader} onPress={onToggleExpand}>
        <Text style={s.subGrupoTitulo}>{titulo}</Text>
        <Text style={s.subGrupoMeta}>
          {itens.filter(i => i.selecionado).length}/{itens.length} · {fmtBRL(total)}
        </Text>
        <TouchableOpacity
          onPress={(e) => { e.stopPropagation?.(); onToggleGrupo(!todosSel); }}
          style={s.toggleSubBtn}
        >
          <Text style={s.toggleSubBtnText}>{todosSel ? '☑' : '☐'}</Text>
        </TouchableOpacity>
        <Text style={{ color: colors.textSecondary, fontSize: 14, marginLeft: 4 }}>
          {expandido ? '▲' : '▼'}
        </Text>
      </TouchableOpacity>

      {/* Itens */}
      {expandido && itens.map(item => (
        <View key={item.key} style={[s.itemCard, !item.selecionado && s.itemCardOff]}>
          <TouchableOpacity onPress={() => onToggleItem(item.key)}>
            <Text style={{ fontSize: 18 }}>{item.selecionado ? '✅' : '⬜'}</Text>
          </TouchableOpacity>

          <View style={{ flex: 1, gap: 3 }}>
            {/* Descrição editável */}
            <TextInput
              style={[s.itemDescInput, !item.selecionado && { color: colors.textTertiary }]}
              value={item.descricaoEdit}
              onChangeText={v => onDescricao(item.key, v)}
              editable={item.selecionado}
            />

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {/* Data */}
              <Text style={s.itemMeta}>
                {new Date(item.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </Text>
              {/* Badge parcela */}
              {item.parcelaAtual != null && (
                <View style={s.parcelBadge}>
                  <Text style={s.parcelBadgeText}>{item.parcelaAtual}/{item.totalParcelas}</Text>
                </View>
              )}
              {/* Categoria editável */}
              <View style={s.catInputWrap}>
                <Text style={s.catInputIcon}>🏷</Text>
                <TextInput
                  style={[s.catInput, !item.selecionado && { color: colors.textTertiary }]}
                  value={item.categoriaEdit}
                  onChangeText={v => onCategoria(item.key, v)}
                  editable={item.selecionado}
                  placeholder="Categoria"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>
            </View>
          </View>

          <Text style={[s.itemValor, !item.selecionado && { color: colors.textTertiary }]}>
            {fmtBRL(item.valor)}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
function styles(c: ReturnType<typeof import('../theme/ThemeContext').useTheme>['colors']) {
  return StyleSheet.create({
    container:    { flex: 1, backgroundColor: c.background },
    pageTitle:    { fontSize: 22, fontWeight: 'bold', color: c.text },
    pageSub:      { fontSize: 14, color: c.textSecondary, marginTop: -12 },
    section:      { backgroundColor: c.surface, borderRadius: 12, padding: 16, gap: 10 },
    sectionLabel: { fontSize: 13, fontWeight: '700', color: c.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4 },
    mesRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24 },
    mesBtn:       { padding: 8 },
    mesBtnText:   { fontSize: 20, color: c.green },
    mesLabel:     { fontSize: 18, fontWeight: 'bold', color: c.text, minWidth: 100, textAlign: 'center' },
    uploadBox:    { borderWidth: 2, borderColor: c.border, borderStyle: 'dashed', borderRadius: 12, padding: 32, alignItems: 'center', gap: 8 },
    uploadText:   { fontSize: 15, color: c.text, fontWeight: '600' },
    uploadSub:    { fontSize: 12, color: c.textTertiary, textAlign: 'center' },
    erroText:     { color: c.red, fontSize: 13, textAlign: 'center' },
    btnPrimary:   { backgroundColor: c.green, borderRadius: 10, paddingVertical: 14, paddingHorizontal: 20, alignItems: 'center' },
    btnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 15 },

    // Preview — seção cartão
    secaoBlock:   { marginBottom: 8 },
    secaoHeader:  { flexDirection: 'row', alignItems: 'center', backgroundColor: c.surfaceElevated, padding: 14, borderBottomWidth: 1, borderBottomColor: c.border },
    secaoTitle:   { fontSize: 15, fontWeight: 'bold', color: c.text },
    secaoTitular: { fontSize: 11, color: c.textSecondary },
    secaoQtd:     { fontSize: 12, color: c.textTertiary },
    cartaoMapRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, paddingHorizontal: 14, paddingVertical: 8, gap: 8, borderBottomWidth: 1, borderBottomColor: c.border },
    cartaoMapLabel: { fontSize: 12, color: c.textSecondary, fontWeight: '600' },
    cartaoChip:   { borderWidth: 1, borderColor: c.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, marginRight: 6 },
    cartaoChipActive: { borderColor: c.green, backgroundColor: c.surfaceElevated },
    cartaoChipText: { fontSize: 12, color: c.textSecondary },
    cartaoChipTextActive: { color: c.green, fontWeight: '700' },

    // Sub-grupo
    subGrupoHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.border, gap: 6 },
    subGrupoTitulo: { fontSize: 13, fontWeight: '700', color: c.text, flex: 1 },
    subGrupoMeta:   { fontSize: 12, color: c.textSecondary },
    toggleSubBtn:   { padding: 4 },
    toggleSubBtnText: { fontSize: 18, color: c.green },

    // Item
    itemCard:     { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: c.surface, padding: 12, borderBottomWidth: 1, borderBottomColor: c.border },
    itemCardOff:  { opacity: 0.4 },
    itemDescInput:{ fontSize: 13, fontWeight: '600', color: c.text, borderBottomWidth: 1, borderBottomColor: c.border, paddingVertical: 1 },
    itemMeta:     { fontSize: 11, color: c.textSecondary },
    itemValor:    { fontSize: 13, fontWeight: '700', color: c.text, minWidth: 76, textAlign: 'right' },
    parcelBadge:  { backgroundColor: c.surfaceElevated, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    parcelBadgeText: { fontSize: 11, color: c.textSecondary, fontWeight: '600' },

    catInputWrap: { flexDirection: 'row', alignItems: 'center', gap: 3, borderWidth: 1, borderColor: c.border, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
    catInputIcon: { fontSize: 11 },
    catInput:     { fontSize: 11, color: c.text, minWidth: 80, maxWidth: 140, paddingVertical: 0 },

    // Tabela exemplo
    tblRow:       { flexDirection: 'row' },
    tblRowAlt:    { backgroundColor: c.surfaceElevated },
    tblCell:      { paddingHorizontal: 8, paddingVertical: 6, borderWidth: 0.5, borderColor: c.border },
    tblHeader:    { backgroundColor: c.surfaceElevated },
    tblHeaderText:{ fontSize: 11, fontWeight: '700', color: c.text },
    tblText:      { fontSize: 11, color: c.textSecondary },
    legendaTxt:   { fontSize: 11, color: c.textSecondary, lineHeight: 17 },

    // Rodapé
    footer:       { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: c.surface, padding: 16, gap: 6, borderTopWidth: 1, borderTopColor: c.border },
    footerRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    footerCount:  { fontSize: 12, color: c.textSecondary },
    footerTotal:  { fontSize: 16, fontWeight: 'bold', color: c.text },
  });
}
