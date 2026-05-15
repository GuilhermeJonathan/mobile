import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Modal, TextInput, Alert, Platform,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import EmptyState from '../components/EmptyState';
import type { ColorScheme } from '../theme/colors';
import { fmtBRL } from '../utils/currency';
import {
  vendasService, produtosService,
  VendaDto, ProdutoDto, ResumoVendasDto,
} from '../services/api';

// ── Helpers ───────────────────────────────────────────────────────────────────

function applyValorMask(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  const num = parseInt(digits, 10);
  const reais = Math.floor(num / 100);
  const cents = num % 100;
  const reaisStr = reais === 0 ? '0' : reais.toLocaleString('pt-BR');
  return `${reaisStr},${String(cents).padStart(2, '0')}`;
}

function maskToNumber(masked: string): number {
  if (!masked.trim()) return 0;
  const val = parseFloat(masked.replace(/\./g, '').replace(',', '.'));
  return isNaN(val) ? 0 : val;
}

function applyDateMask(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function dateMaskToISO(masked: string, hora = '12:00'): string | null {
  const parts = masked.split('/');
  if (parts.length !== 3 || parts[2].length !== 4) return null;
  const [d, m, y] = parts;
  const time = /^\d{2}:\d{2}$/.test(hora) ? hora : '12:00';
  const date = new Date(`${y}-${m}-${d}T${time}:00`);
  if (isNaN(date.getTime())) return null;
  return `${y}-${m}-${d}T${time}:00`;
}

function isoToTimeMask(iso: string): string {
  // Extrai HH:MM de uma string ISO (ex: "2026-05-15T14:30:00")
  const match = iso.match(/T(\d{2}):(\d{2})/);
  if (!match) return nowTimeMask();
  return `${match[1]}:${match[2]}`;
}

function nowTimeMask(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function applyTimeMask(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

function isoToDateMask(iso: string): string {
  const d = new Date(iso.substring(0, 10) + 'T12:00:00');
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function todayISO(): string {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${yyyy}-${mm}-${dd}`;
}

function periodoRange(periodo: 'hoje' | '7d' | '30d' | 'todos'): { de?: string; ate?: string } {
  const today = todayISO();
  // ate = fim do dia (T23:59:59) para incluir vendas salvas com T12:00:00 no mesmo dia
  const ateHoje = `${today}T23:59:59`;
  if (periodo === 'hoje') return { de: `${today}T00:00:00`, ate: ateHoje };
  if (periodo === '7d') {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    const de = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T00:00:00`;
    return { de, ate: ateHoje };
  }
  if (periodo === '30d') {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    const de = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T00:00:00`;
    return { de, ate: ateHoje };
  }
  return {};
}

// ── Tipos internos ────────────────────────────────────────────────────────────

type FiltroPeriodo = 'hoje' | '7d' | '30d' | 'todos';

// ── Sub-componentes ───────────────────────────────────────────────────────────

function ResumoCard({
  label, total, qtd, colors,
}: {
  label: string;
  total: number;
  qtd: number;
  colors: ColorScheme;
}) {
  const s = resumoCardStyles(colors);
  return (
    <View style={s.card}>
      <Text style={s.label}>{label}</Text>
      <Text style={s.total}>{fmtBRL(total)}</Text>
      <Text style={s.sub}>{qtd} venda{qtd !== 1 ? 's' : ''}</Text>
    </View>
  );
}

function resumoCardStyles(c: ColorScheme) {
  return StyleSheet.create({
    card: {
      flex: 1, backgroundColor: c.surface, borderRadius: 12,
      padding: 12, borderWidth: 1, borderColor: c.border, alignItems: 'center',
    },
    label: { fontSize: 10, color: c.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 },
    total: { fontSize: 15, fontWeight: '700', color: c.green },
    sub:   { fontSize: 11, color: c.textSecondary, marginTop: 2 },
  });
}

function ChipFilter({
  label, active, onPress, colors,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  colors: ColorScheme;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
        borderWidth: 1,
        backgroundColor: active ? colors.green : colors.surface,
        borderColor: active ? colors.green : colors.border,
        marginRight: 8,
      }}
    >
      <Text style={{ fontSize: 13, fontWeight: active ? '700' : '400', color: active ? '#fff' : colors.textSecondary }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ── Tela principal ────────────────────────────────────────────────────────────

export default function VendasScreen() {
  const { colors } = useTheme();
  const s = useMemo(() => styles(colors), [colors]);

  // ── Estado principal ──────────────────────────────────────────────────────
  const [vendas, setVendas]     = useState<VendaDto[]>([]);
  const [produtos, setProdutos] = useState<ProdutoDto[]>([]);
  const [resumo, setResumo]     = useState<ResumoVendasDto | null>(null);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [filtroStatus, setFiltroStatus]     = useState<number | undefined>(undefined);
  const [filtroPeriodo, setFiltroPeriodo]   = useState<FiltroPeriodo>('30d');
  const [filtroProdutoId, setFiltroProdutoId] = useState<string | undefined>(undefined);

  // ── Modal nova/editar venda ───────────────────────────────────────────────
  const [modalVenda, setModalVenda]   = useState(false);
  const [editVenda, setEditVenda]     = useState<VendaDto | null>(null);
  const [vProdutoId, setVProdutoId]   = useState<string | null>(null);
  const [vDescricao, setVDescricao]   = useState('');
  const [vValor, setVValor]           = useState('');
  const [vData, setVData]             = useState('');
  const [vHora, setVHora]             = useState('');
  const [vStatus, setVStatus]         = useState<0 | 1>(0);
  const [saving, setSaving]           = useState(false);

  // ── Modal produtos ────────────────────────────────────────────────────────
  const [modalProdutos, setModalProdutos]     = useState(false);
  const [pNome, setPNome]                     = useState('');
  const [pPreco, setPPreco]                   = useState('');
  const [editProduto, setEditProduto]         = useState<ProdutoDto | null>(null);
  const [savingProduto, setSavingProduto]     = useState(false);
  const [showFormProduto, setShowFormProduto] = useState(false);

  // ── Modal confirmação (web) ───────────────────────────────────────────────
  const [confirmModal, setConfirmModal] = useState<{
    title: string; message: string; onConfirm: () => void;
  } | null>(null);

  // ── Carregamento ──────────────────────────────────────────────────────────
  const carregar = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const range = periodoRange(filtroPeriodo);
      const params: Record<string, any> = { ...range };
      if (filtroStatus !== undefined) params.status = filtroStatus;
      if (filtroProdutoId !== undefined) params.produtoId = filtroProdutoId;
      const [v, r, p] = await Promise.all([
        vendasService.getAll(params),
        vendasService.getResumo(),
        produtosService.getAll(),
      ]);
      setVendas(v);
      setResumo(r);
      setProdutos(p);
    } catch {
      setVendas([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filtroPeriodo, filtroStatus, filtroProdutoId]);

  useFocusEffect(useCallback(() => {
    carregar();
  }, [carregar]));

  // ── Ações de venda ────────────────────────────────────────────────────────
  function abrirNovaVenda() {
    setEditVenda(null);
    setVProdutoId(null);
    setVDescricao('');
    setVValor('');
    setVData(isoToDateMask(todayISO()));
    setVHora(nowTimeMask());
    setVStatus(0);
    setModalVenda(true);
  }

  function abrirEditarVenda(v: VendaDto) {
    setEditVenda(v);
    setVProdutoId(v.produtoId);
    setVDescricao(v.descricao);
    setVValor(applyValorMask(String(Math.round(v.valor * 100))));
    setVData(isoToDateMask(v.data));
    setVHora(isoToTimeMask(v.data));
    setVStatus(v.status);
    setModalVenda(true);
  }

  async function salvarVenda() {
    const isoData = dateMaskToISO(vData, vHora);
    if (!vDescricao.trim() || !vValor || !isoData) return;
    const valor = maskToNumber(vValor);
    setSaving(true);
    try {
      if (editVenda) {
        await vendasService.update(editVenda.id, {
          produtoId: vProdutoId ?? null,
          descricao: vDescricao.trim(),
          valor,
          data: isoData,
        });
        // Update status separately if it changed
        if (vStatus !== editVenda.status) {
          await vendasService.atualizarStatus(editVenda.id, vStatus);
        }
      } else {
        await vendasService.create({
          produtoId: vProdutoId ?? null,
          descricao: vDescricao.trim(),
          valor,
          data: isoData,
          origem: 0,
        });
      }
      setModalVenda(false);
      await carregar();
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(venda: VendaDto) {
    const novoStatus = venda.status === 0 ? 1 : 0;
    try {
      await vendasService.atualizarStatus(venda.id, novoStatus);
      await carregar();
    } catch {
      Alert.alert('Erro', 'Não foi possível atualizar o status.');
    }
  }

  function confirmarExcluirVenda(venda: VendaDto) {
    const doDelete = async () => {
      try {
        await vendasService.delete(venda.id);
        await carregar();
      } catch {
        Alert.alert('Erro', 'Não foi possível excluir a venda.');
      }
    };

    if (Platform.OS === 'web') {
      setConfirmModal({
        title: 'Excluir venda',
        message: `Excluir "${venda.descricao}"? Esta ação não pode ser desfeita.`,
        onConfirm: doDelete,
      });
    } else {
      Alert.alert(
        'Excluir venda',
        `Excluir "${venda.descricao}"? Esta ação não pode ser desfeita.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Excluir', style: 'destructive', onPress: doDelete },
        ],
      );
    }
  }

  // ── Quando seleciona produto no modal ─────────────────────────────────────
  function selecionarProduto(id: string | null) {
    setVProdutoId(id);
    if (id) {
      const p = produtos.find(x => x.id === id);
      if (p) {
        // Sempre preenche — inclusive ao editar uma venda existente
        setVDescricao(p.nome);
        if (p.precoDefault != null) {
          setVValor(applyValorMask(String(Math.round(p.precoDefault * 100))));
        }
      }
    }
  }

  // ── Ações de produto ──────────────────────────────────────────────────────
  function abrirNovoProduto() {
    setEditProduto(null);
    setPNome('');
    setPPreco('');
    setShowFormProduto(true);
  }

  function abrirEditarProduto(p: ProdutoDto) {
    setEditProduto(p);
    setPNome(p.nome);
    setPPreco(p.precoDefault != null ? applyValorMask(String(Math.round(p.precoDefault * 100))) : '');
    setShowFormProduto(true);
  }

  async function salvarProduto() {
    if (!pNome.trim()) return;
    const precoDefault = pPreco.trim() ? maskToNumber(pPreco) : null;
    setSavingProduto(true);
    try {
      if (editProduto) {
        await produtosService.update(editProduto.id, { nome: pNome.trim(), precoDefault });
      } else {
        await produtosService.create({ nome: pNome.trim(), precoDefault });
      }
      const updated = await produtosService.getAll();
      setProdutos(updated);
      setShowFormProduto(false);
      setEditProduto(null);
      setPNome('');
      setPPreco('');
    } finally {
      setSavingProduto(false);
    }
  }

  function confirmarExcluirProduto(p: ProdutoDto) {
    const doDelete = async () => {
      try {
        await produtosService.delete(p.id);
        const updated = await produtosService.getAll();
        setProdutos(updated);
      } catch {
        Alert.alert('Erro', 'Não foi possível excluir o produto.');
      }
    };

    if (Platform.OS === 'web') {
      setConfirmModal({
        title: 'Excluir produto',
        message: `Excluir "${p.nome}"? Esta ação não pode ser desfeita.`,
        onConfirm: doDelete,
      });
    } else {
      Alert.alert(
        'Excluir produto',
        `Excluir "${p.nome}"?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Excluir', style: 'destructive', onPress: doDelete },
        ],
      );
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.green} />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => carregar(true)} />}
      >
        {/* ── Cards de resumo ──────────────────────────────────────────── */}
        <View style={s.resumoRow}>
          <ResumoCard label="Hoje"   total={resumo?.totalHoje   ?? 0} qtd={resumo?.qtdHoje   ?? 0} colors={colors} />
          <View style={{ width: 8 }} />
          <ResumoCard label="Semana" total={resumo?.totalSemana ?? 0} qtd={resumo?.qtdSemana ?? 0} colors={colors} />
          <View style={{ width: 8 }} />
          <ResumoCard label="Mês"    total={resumo?.totalMes    ?? 0} qtd={resumo?.qtdMes    ?? 0} colors={colors} />
        </View>

        {/* ── Filtros (período + status) ────────────────────────────────── */}
        <View style={s.filtersRow}>
          {/* Período */}
          <View style={s.filterBar}>
            {([
              { key: 'hoje',  label: 'Hoje' },
              { key: '7d',    label: '7 dias' },
              { key: '30d',   label: '30 dias' },
              { key: 'todos', label: 'Todos' },
            ] as { key: FiltroPeriodo; label: string }[]).map(opt => (
              <TouchableOpacity
                key={opt.key}
                style={[s.filterChip, filtroPeriodo === opt.key && s.filterChipActive]}
                onPress={() => setFiltroPeriodo(opt.key)}
              >
                <Text style={[s.filterChipText, filtroPeriodo === opt.key && s.filterChipTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Status */}
          <View style={s.sitBar}>
            {([
              { key: undefined, label: 'Todos' },
              { key: 0,         label: 'Pendente' },
              { key: 1,         label: 'Recebido' },
            ] as { key: number | undefined; label: string }[]).map(opt => (
              <TouchableOpacity
                key={String(opt.key)}
                style={[s.sitChip, filtroStatus === opt.key && s.sitChipActive]}
                onPress={() => setFiltroStatus(opt.key)}
              >
                <Text style={[s.sitChipText, filtroStatus === opt.key && s.sitChipTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Filtro por produto ───────────────────────────────────────── */}
        {produtos.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 12 }}
            contentContainerStyle={{ alignItems: 'center', paddingRight: 8 }}
          >
            <TouchableOpacity
              style={[s.sitChip, filtroProdutoId === undefined && s.sitChipActive, { marginRight: 6 }]}
              onPress={() => setFiltroProdutoId(undefined)}
            >
              <Text style={[s.sitChipText, filtroProdutoId === undefined && s.sitChipTextActive]}>
                Todos
              </Text>
            </TouchableOpacity>
            {produtos.map(p => (
              <TouchableOpacity
                key={p.id}
                style={[s.sitChip, filtroProdutoId === p.id && s.sitChipActive, { marginRight: 6 }]}
                onPress={() => setFiltroProdutoId(p.id)}
              >
                <Text style={[s.sitChipText, filtroProdutoId === p.id && s.sitChipTextActive]}>
                  {p.nome}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* ── Botões de ação ───────────────────────────────────────────── */}
        <View style={s.actionRow}>
          <TouchableOpacity style={s.btnNova} onPress={abrirNovaVenda}>
            <Text style={s.btnNovaText}>＋ Nova Venda</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.btnProdutos} onPress={() => setModalProdutos(true)}>
            <Text style={s.btnProdutosText}>📦 Produtos</Text>
          </TouchableOpacity>
        </View>

        {/* ── Lista de vendas ──────────────────────────────────────────── */}
        {vendas.length === 0 ? (
          <EmptyState
            title="Nenhuma venda registrada"
            subtitle="Adicione uma venda ou envie via WhatsApp"
            dogSize={120}
          />
        ) : (
          vendas.map(venda => (
            <VendaCard
              key={venda.id}
              venda={venda}
              colors={colors}
              onEditar={() => abrirEditarVenda(venda)}
              onExcluir={() => confirmarExcluirVenda(venda)}
              onToggleStatus={() => toggleStatus(venda)}
            />
          ))
        )}
      </ScrollView>

      {/* ── Modal nova/editar venda ──────────────────────────────────── */}
      <Modal visible={modalVenda} transparent animationType="slide" onRequestClose={() => setModalVenda(false)}>
        <View style={s.modalOverlay}>
          <ScrollView
            style={s.modalSheet}
            contentContainerStyle={{ paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={s.modalTitle}>{editVenda ? 'Editar Venda' : 'Nova Venda'}</Text>

            {/* Produto */}
            <Text style={s.fieldLabel}>Produto (opcional)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              <TouchableOpacity
                style={[s.prodChip, vProdutoId === null && s.prodChipActive]}
                onPress={() => selecionarProduto(null)}
              >
                <Text style={[s.prodChipText, vProdutoId === null && s.prodChipTextActive]}>Nenhum</Text>
              </TouchableOpacity>
              {produtos.filter(p => p.ativo).map(p => (
                <TouchableOpacity
                  key={p.id}
                  style={[s.prodChip, vProdutoId === p.id && s.prodChipActive]}
                  onPress={() => selecionarProduto(p.id)}
                >
                  <Text style={[s.prodChipText, vProdutoId === p.id && s.prodChipTextActive]}>{p.nome}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Descrição */}
            <Text style={s.fieldLabel}>Descrição *</Text>
            <TextInput
              style={s.input}
              value={vDescricao}
              onChangeText={setVDescricao}
              placeholder="Ex: Consultoria, Serviço..."
              placeholderTextColor={colors.inputPlaceholder}
            />

            {/* Valor */}
            <Text style={s.fieldLabel}>Valor (R$) *</Text>
            <TextInput
              style={s.input}
              value={vValor}
              onChangeText={v => setVValor(applyValorMask(v))}
              placeholder="0,00"
              placeholderTextColor={colors.inputPlaceholder}
              keyboardType="number-pad"
            />

            {/* Data + Hora */}
            <Text style={s.fieldLabel}>Data e Hora *</Text>
            <View style={s.dateTimeRow}>
              <TextInput
                style={[s.input, { flex: 2, marginBottom: 0, marginRight: 8 }]}
                value={vData}
                onChangeText={v => {
                  if (Platform.OS !== 'web') setVData(applyDateMask(v));
                  else setVData(v);
                }}
                onBlur={() => {
                  if (Platform.OS === 'web') setVData(applyDateMask(vData));
                }}
                placeholder="dd/mm/aaaa"
                placeholderTextColor={colors.inputPlaceholder}
                keyboardType={Platform.OS !== 'web' ? 'number-pad' : 'default'}
                maxLength={Platform.OS !== 'web' ? 10 : undefined}
              />
              <TextInput
                style={[s.input, { flex: 1, marginBottom: 0 }]}
                value={vHora}
                onChangeText={v => setVHora(applyTimeMask(v))}
                placeholder="HH:MM"
                placeholderTextColor={colors.inputPlaceholder}
                keyboardType="number-pad"
                maxLength={5}
              />
            </View>

            {/* Status */}
            <Text style={s.fieldLabel}>Status</Text>
            <View style={s.toggleRow}>
              <TouchableOpacity
                style={[s.toggleBtn, vStatus === 0 && s.toggleBtnActive]}
                onPress={() => setVStatus(0)}
              >
                <Text style={[s.toggleBtnText, vStatus === 0 && s.toggleBtnTextActive]}>🟡 Pendente</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.toggleBtn, vStatus === 1 && { ...s.toggleBtnActive, backgroundColor: colors.green + '22', borderColor: colors.green }]}
                onPress={() => setVStatus(1)}
              >
                <Text style={[s.toggleBtnText, vStatus === 1 && { color: colors.green, fontWeight: '700' }]}>✅ Recebido</Text>
              </TouchableOpacity>
            </View>

            {/* Ações */}
            <View style={s.modalActions}>
              <TouchableOpacity style={s.btnCancel} onPress={() => setModalVenda(false)}>
                <Text style={s.btnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.btnSave, (!vDescricao.trim() || !vValor || !vData) && { opacity: 0.4 }]}
                onPress={salvarVenda}
                disabled={saving || !vDescricao.trim() || !vValor || !vData}
              >
                {saving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={s.btnSaveText}>Salvar</Text>
                }
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* ── Modal gestão de produtos ──────────────────────────────────── */}
      <Modal visible={modalProdutos} transparent animationType="slide" onRequestClose={() => setModalProdutos(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <Text style={s.modalTitle}>Produtos</Text>
              <TouchableOpacity onPress={() => setModalProdutos(false)} style={{ padding: 4 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 18 }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
              {produtos.length === 0 && !showFormProduto && (
                <Text style={{ color: colors.textSecondary, textAlign: 'center', marginVertical: 20, fontSize: 14 }}>
                  Nenhum produto cadastrado.
                </Text>
              )}
              {produtos.map((p, i) => (
                <View
                  key={p.id}
                  style={[
                    s.produtoItem,
                    i > 0 && { borderTopWidth: 1, borderTopColor: colors.border },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={s.produtoNome}>{p.nome}</Text>
                    {p.precoDefault != null && (
                      <Text style={s.produtoPreco}>{fmtBRL(p.precoDefault)}</Text>
                    )}
                  </View>
                  <TouchableOpacity onPress={() => abrirEditarProduto(p)} style={s.iconBtn}>
                    <Text style={{ fontSize: 15 }}>✏️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => confirmarExcluirProduto(p)} style={s.iconBtn}>
                    <Text style={{ fontSize: 15 }}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>

            {/* Formulário inline de produto */}
            {showFormProduto ? (
              <View style={s.produtoForm}>
                <Text style={s.fieldLabel}>{editProduto ? 'Editar produto' : 'Novo produto'}</Text>
                <TextInput
                  style={[s.input, { marginBottom: 10 }]}
                  value={pNome}
                  onChangeText={setPNome}
                  placeholder="Nome do produto"
                  placeholderTextColor={colors.inputPlaceholder}
                />
                <TextInput
                  style={[s.input, { marginBottom: 12 }]}
                  value={pPreco}
                  onChangeText={v => setPPreco(applyValorMask(v))}
                  placeholder="Preço padrão (opcional)"
                  placeholderTextColor={colors.inputPlaceholder}
                  keyboardType="number-pad"
                />
                <View style={s.modalActions}>
                  <TouchableOpacity
                    style={s.btnCancel}
                    onPress={() => { setShowFormProduto(false); setEditProduto(null); }}
                  >
                    <Text style={s.btnCancelText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.btnSave, !pNome.trim() && { opacity: 0.4 }]}
                    onPress={salvarProduto}
                    disabled={savingProduto || !pNome.trim()}
                  >
                    {savingProduto
                      ? <ActivityIndicator color="#fff" />
                      : <Text style={s.btnSaveText}>Salvar</Text>
                    }
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity style={[s.btnSave, { marginTop: 12 }]} onPress={abrirNovoProduto}>
                <Text style={s.btnSaveText}>＋ Novo Produto</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Modal confirmação exclusão (web) ──────────────────────────── */}
      {confirmModal && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setConfirmModal(null)}>
          <View style={s.overlayCenter}>
            <View style={s.modalCard}>
              <Text style={s.modalTitle}>{confirmModal.title}</Text>
              <Text style={[s.modalSub, { marginBottom: 20 }]}>{confirmModal.message}</Text>
              <View style={s.modalActions}>
                <TouchableOpacity style={s.btnCancel} onPress={() => setConfirmModal(null)}>
                  <Text style={s.btnCancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.btnSave, { backgroundColor: colors.red }]}
                  onPress={() => { setConfirmModal(null); confirmModal.onConfirm(); }}
                >
                  <Text style={s.btnSaveText}>Excluir</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

// ── Card de venda ─────────────────────────────────────────────────────────────

function VendaCard({
  venda, colors, onEditar, onExcluir, onToggleStatus,
}: {
  venda: VendaDto;
  colors: ColorScheme;
  onEditar: () => void;
  onExcluir: () => void;
  onToggleStatus: () => void;
}) {
  const s = useMemo(() => vendaCardStyles(colors), [colors]);
  const dataFmt = (() => {
    const iso = venda.data;
    const date = new Date(iso.substring(0, 10) + 'T12:00:00').toLocaleDateString('pt-BR');
    const timeMatch = iso.match(/T(\d{2}):(\d{2})/);
    const time = timeMatch ? ` ${timeMatch[1]}:${timeMatch[2]}` : '';
    return date + time;
  })();

  return (
    <View style={s.card}>
      <View style={s.row}>
        <Text style={s.descricao} numberOfLines={1}>{venda.descricao}</Text>
        <Text style={s.valor}>{fmtBRL(venda.valor)}</Text>
      </View>
      <View style={[s.row, { marginTop: 6 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={s.data}>📅 {dataFmt}</Text>
          <Text style={s.criador}>👤 {venda.criadoPorNome}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {venda.origem === 1 && (
            <View style={s.origemBadge}>
              <Text style={s.origemText}>📱 WhatsApp</Text>
            </View>
          )}
          <TouchableOpacity onPress={onToggleStatus} style={[
            s.statusBadge,
            venda.status === 1
              ? { backgroundColor: colors.green + '22', borderColor: colors.green + '66' }
              : { backgroundColor: '#d2992222', borderColor: '#d2992266' },
          ]}>
            <Text style={[s.statusText, { color: venda.status === 1 ? colors.green : '#d29922' }]}>
              {venda.status === 1 ? '✅ Recebido' : '🟡 Pendente'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={s.actions}>
        <TouchableOpacity onPress={onEditar} style={s.actionBtn}>
          <Text style={{ fontSize: 14 }}>✏️</Text>
          <Text style={s.actionText}>Editar</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onExcluir} style={s.actionBtn}>
          <Text style={{ fontSize: 14 }}>🗑️</Text>
          <Text style={[s.actionText, { color: colors.red }]}>Excluir</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function vendaCardStyles(c: ColorScheme) {
  return StyleSheet.create({
    card: {
      backgroundColor: c.surface, borderRadius: 14,
      padding: 14, marginBottom: 10,
      borderWidth: 1, borderColor: c.border,
    },
    row:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 },
    descricao: { fontSize: 14, fontWeight: '700', color: c.text, flex: 1, marginRight: 8 },
    valor:     { fontSize: 15, fontWeight: '700', color: c.green },
    data:    { fontSize: 12, color: c.textSecondary },
    criador: { fontSize: 12, color: c.textTertiary },
    statusBadge: {
      borderRadius: 8, borderWidth: 1,
      paddingHorizontal: 8, paddingVertical: 3,
    },
    statusText: { fontSize: 11, fontWeight: '700' },
    origemBadge: {
      backgroundColor: '#25d36622', borderRadius: 8, borderWidth: 1,
      borderColor: '#25d36644', paddingHorizontal: 7, paddingVertical: 3,
    },
    origemText: { fontSize: 11, color: '#25d366', fontWeight: '600' },
    actions:   { flexDirection: 'row', marginTop: 10, gap: 8, borderTopWidth: 1, borderTopColor: c.border, paddingTop: 8 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4 },
    actionText:{ fontSize: 12, color: c.textSecondary },
  });
}

// ── Styles ────────────────────────────────────────────────────────────────────

function styles(c: ColorScheme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    scroll:    { padding: 16, paddingBottom: 60 },

    resumoRow: { flexDirection: 'row', marginBottom: 20 },

    // Wrapper dos dois filtros — lado a lado no web, empilhado no mobile
    filtersRow: {
      flexDirection: Platform.OS === 'web' ? 'row' : 'column',
      alignItems:   Platform.OS === 'web' ? 'center' : 'stretch',
      gap: Platform.OS === 'web' ? 20 : 0,
      marginBottom: 8,
    },

    // Filtro de período
    filterBar: {
      flexDirection: 'row', gap: 8,
      marginBottom: Platform.OS === 'web' ? 0 : 8,
    },
    filterChip: {
      // mobile: flex 1 para preencher igualmente; web: compacto pelo conteúdo
      ...(Platform.OS !== 'web' ? { flex: 1 } : {}),
      paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20,
      borderWidth: 1, borderColor: c.inputBorder, backgroundColor: c.inputBg,
      alignItems: 'center',
    },
    filterChipActive:     { backgroundColor: c.green, borderColor: c.green },
    filterChipText:       { fontSize: 13, fontWeight: '600', color: c.textSecondary },
    filterChipTextActive: { color: '#fff' },

    // Filtro de status
    sitBar: {
      flexDirection: 'row', gap: 6,
      alignItems: 'center',
      marginBottom: Platform.OS === 'web' ? 0 : 8,
    },
    sitChip: {
      paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16,
      borderWidth: 1, borderColor: c.inputBorder, backgroundColor: c.inputBg,
    },
    sitChipActive:     { backgroundColor: c.surfaceElevated, borderColor: c.green },
    sitChipText:       { fontSize: 12, fontWeight: '600', color: c.textSecondary },
    sitChipTextActive: { color: c.green },

    actionRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },

    btnNova: {
      flex: 1, backgroundColor: c.green, borderRadius: 10,
      paddingVertical: 12, alignItems: 'center',
    },
    btnNovaText: { color: '#fff', fontWeight: '700', fontSize: 14 },

    btnProdutos: {
      flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center',
      borderWidth: 1.5, borderColor: c.border, backgroundColor: c.surface,
    },
    btnProdutosText: { color: c.text, fontWeight: '600', fontSize: 14 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalSheet: {
      backgroundColor: c.surfaceElevated, borderTopLeftRadius: 20, borderTopRightRadius: 20,
      padding: 24, maxHeight: '92%',
    },
    overlayCenter: {
      flex: 1, backgroundColor: 'rgba(0,0,0,0.65)',
      justifyContent: 'center', alignItems: 'center', padding: 24,
    },
    modalCard: {
      backgroundColor: c.surfaceElevated, borderRadius: 16, padding: 24,
      width: '100%', maxWidth: 420, borderWidth: 1, borderColor: c.border,
    },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: c.text, marginBottom: 4 },
    modalSub:   { fontSize: 13, color: c.textSecondary },
    modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },

    fieldLabel: {
      fontSize: 11, fontWeight: '700', color: c.textSecondary,
      textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6, marginTop: 12,
    },
    input: {
      backgroundColor: c.inputBg, borderRadius: 8, padding: 13,
      fontSize: 15, borderWidth: 1, borderColor: c.inputBorder, color: c.text,
    },

    dateTimeRow: { flexDirection: 'row', marginBottom: 12 },
    toggleRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
    toggleBtn: {
      flex: 1, borderRadius: 8, padding: 12, alignItems: 'center',
      borderWidth: 1, borderColor: c.border, backgroundColor: c.surface,
    },
    toggleBtnActive: {
      backgroundColor: '#d2992222', borderColor: '#d2992266',
    },
    toggleBtnText:      { fontSize: 14, color: c.textSecondary },
    toggleBtnTextActive:{ color: '#d29922', fontWeight: '700' },

    btnCancel: {
      flex: 1, borderRadius: 8, padding: 14, alignItems: 'center',
      borderWidth: 1, borderColor: c.border,
    },
    btnCancelText: { color: c.textSecondary, fontSize: 15 },
    btnSave:       { flex: 1, backgroundColor: c.green, borderRadius: 8, padding: 14, alignItems: 'center' },
    btnSaveText:   { color: '#fff', fontSize: 15, fontWeight: '700' },

    // Produto chips no modal de venda
    prodChip: {
      paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
      borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, marginRight: 8,
    },
    prodChipActive:    { backgroundColor: c.green, borderColor: c.green },
    prodChipText:      { fontSize: 13, color: c.textSecondary },
    prodChipTextActive:{ color: '#fff', fontWeight: '700' },

    // Modal produtos
    produtoItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 8 },
    produtoNome: { fontSize: 14, fontWeight: '600', color: c.text },
    produtoPreco:{ fontSize: 12, color: c.textSecondary, marginTop: 2 },
    iconBtn:     { padding: 6 },
    produtoForm: { marginTop: 12, borderTopWidth: 1, borderTopColor: c.border, paddingTop: 12 },
  });
}
