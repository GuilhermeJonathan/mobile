import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator, Modal,
} from 'react-native';
import { lancamentosService, categoriasService, cartoesService } from '../services/api';
import { Categoria, CartaoCredito, Lancamento, SituacaoLancamento, TipoLancamento, TipoReceita } from '../types';
import { fmtBRL, parseBRL } from '../utils/currency';
import { useTheme } from '../theme/ThemeContext';
import type { ColorScheme } from '../theme/colors';
import { navStoreGet } from '../utils/navStore';

const TIPO_CONFIG = {
  [TipoLancamento.Debito]:  { emoji: '💸', label: 'Despesa',  sub: 'Gasto, conta, pagamento', color: '#ef4444' },
  [TipoLancamento.Credito]: { emoji: '💰', label: 'Receita',  sub: 'Salário, renda, entrada',  color: '#3fb950' },
};

const SITUACOES: Record<TipoLancamento, { label: string; value: SituacaoLancamento }[]> = {
  [TipoLancamento.Credito]: [],
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

function toISODate(ddmmyyyy: string): string | null {
  const parts = ddmmyyyy.split('/');
  if (parts.length !== 3) return null;
  const [d, m, y] = parts;
  if (!d || !m || !y || y.length !== 4) return null;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  if (isNaN(date.getTime())) return null;
  return date.toISOString();
}

function formatDateInput(text: string): string {
  const digits = text.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function dateToBR(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, '0');
  const mon = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${mon}/${d.getFullYear()}`;
}

function isConfirmado(s: SituacaoLancamento) {
  return s === SituacaoLancamento.Pago || s === SituacaoLancamento.Recebido;
}

export default function EditLancamentoScreen({ route, navigation }: any) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  // navStore evita serialização como "[object Object]" na URL (web)
  const lancamento: Lancamento = navStoreGet<Lancamento>('editLancamento') ?? route.params.lancamento;

  const isHorista = lancamento.receitaRecorrenteId != null && lancamento.receitaTipo === TipoReceita.Horista;

  const [descricao, setDescricao] = useState(lancamento.descricao);
  const [valor, setValor] = useState(String(lancamento.valor).replace('.', ','));
  const [data, setData] = useState(dateToBR(lancamento.data));
  const [tipo, setTipo] = useState<TipoLancamento>(lancamento.tipo);
  const [situacao, setSituacao] = useState<SituacaoLancamento>(lancamento.situacao);
  const [categoriaId, setCategoriaId] = useState<string | undefined>(lancamento.categoriaId ?? undefined);
  const [cartaoId, setCartaoId] = useState<string | undefined>(lancamento.cartaoId ?? undefined);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [cartoes, setCartoes] = useState<CartaoCredito[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [saveRecorrenteModalVisible, setSaveRecorrenteModalVisible] = useState(false);
  const [pendingSavePayload, setPendingSavePayload] = useState<object | null>(null);
  const [novaCategoria, setNovaCategoria] = useState('');
  const [savingCategoria, setSavingCategoria] = useState(false);

  // Campos Horista
  const [valorHora, setValorHora] = useState(
    isHorista ? String(lancamento.receitaValorHora ?? '').replace('.', ',') : ''
  );
  const [quantidadeHoras, setQuantidadeHoras] = useState(
    isHorista ? String(lancamento.receitaQuantidadeHoras ?? '').replace('.', ',') : ''
  );

  // Recalcula o valor exibido quando os campos Horista mudam
  function handleValorHoraChange(v: string) {
    setValorHora(v);
    const vh = parseBRL(v);
    const qh = parseBRL(quantidadeHoras);
    if (!isNaN(vh) && !isNaN(qh) && qh > 0) {
      setValor((vh * qh).toFixed(2).replace('.', ','));
    }
  }
  function handleQuantidadeHorasChange(v: string) {
    setQuantidadeHoras(v);
    const vh = parseBRL(valorHora);
    const qh = parseBRL(v);
    if (!isNaN(vh) && !isNaN(qh) && qh > 0) {
      setValor((vh * qh).toFixed(2).replace('.', ','));
    }
  }

  useEffect(() => {
    loadCategorias();
    loadCartoes();
  }, []);

  async function loadCategorias() {
    try { setCategorias(await categoriasService.getAll()); } catch {}
  }

  async function loadCartoes() {
    try { setCartoes(await cartoesService.getAll(lancamento.mes, lancamento.ano)); } catch {}
  }

  async function handleSalvarCategoria() {
    if (!novaCategoria.trim()) return;
    setSavingCategoria(true);
    try {
      const result = await categoriasService.create({ nome: novaCategoria.trim(), tipo });
      await loadCategorias();
      setCategoriaId(result.id);
      setNovaCategoria('');
      setModalVisible(false);
    } catch {
      setError('Erro ao criar categoria.');
    } finally {
      setSavingCategoria(false);
    }
  }

  async function handleSalvar() {
    setError('');
    if (!descricao.trim()) { setError('Informe a descrição.'); return; }
    const valorNum = parseBRL(valor);
    if (isNaN(valorNum) || valorNum <= 0) { setError('Informe um valor válido.'); return; }
    const isoDate = toISODate(data);
    if (!isoDate) { setError('Data inválida. Use DD/MM/AAAA.'); return; }

    const payload = {
      descricao: descricao.trim(),
      data: isoDate,
      valor: valorNum,
      tipo,
      situacao,
      categoriaId: categoriaId ?? null,
      cartaoId: cartaoId ?? null,
    };

    // Recorrente com parcelas futuras → pergunta ao usuário
    if (lancamento.isRecorrente && lancamento.grupoParcelas) {
      setPendingSavePayload(payload);
      setSaveRecorrenteModalVisible(true);
      return;
    }

    await executarSave(payload, false);
  }

  async function executarSave(payload: object, futuras: boolean) {
    setLoading(true);
    try {
      if (futuras) {
        await lancamentosService.updateRecorrenteFuturas(lancamento.id, payload);
      } else {
        await lancamentosService.update(lancamento.id, payload);
      }
      navigation.goBack();
    } catch {
      setError('Erro ao salvar lançamento.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSalvarSoEste() {
    setSaveRecorrenteModalVisible(false);
    if (pendingSavePayload) await executarSave(pendingSavePayload, false);
  }

  async function handleSalvarEFuturas() {
    setSaveRecorrenteModalVisible(false);
    if (pendingSavePayload) await executarSave(pendingSavePayload, true);
  }

  const temParcelasFuturas =
    lancamento.grupoParcelas &&
    lancamento.totalParcelas &&
    lancamento.parcelaAtual &&
    (lancamento.isRecorrente || lancamento.parcelaAtual < lancamento.totalParcelas);

  function handleExcluirClick() {
    if (temParcelasFuturas) {
      setDeleteModalVisible(true);
    } else {
      handleExcluirSoEste();
    }
  }

  async function handleExcluirSoEste() {
    setDeleteModalVisible(false);
    setDeleting(true);
    try {
      await lancamentosService.delete(lancamento.id);
      navigation.goBack();
    } catch {
      setError('Erro ao excluir lançamento.');
      setDeleting(false);
    }
  }

  async function handleExcluirEFuturas() {
    setDeleteModalVisible(false);
    setDeleting(true);
    try {
      await lancamentosService.deleteParcelasFuturas(
        lancamento.grupoParcelas!,
        lancamento.parcelaAtual!
      );
      navigation.goBack();
    } catch {
      setError('Erro ao excluir parcelas.');
      setDeleting(false);
    }
  }

  async function handleExcluirGrupoCompleto() {
    setDeleteModalVisible(false);
    setDeleting(true);
    try {
      await lancamentosService.deleteGrupoParcelas(lancamento.grupoParcelas!);
      navigation.goBack();
    } catch {
      setError('Erro ao excluir grupo de parcelas.');
      setDeleting(false);
    }
  }

  const categoriasFiltradas = categorias.filter(c => c.tipo === tipo || c.tipo === TipoLancamento.Debito);

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Banner de pagamento confirmado */}
        {isConfirmado(lancamento.situacao) && (
          <View style={styles.pagamentoBanner}>
            <View style={styles.pagamentoBannerRow}>
              <Text style={styles.pagamentoBannerIcon}>
                {lancamento.situacao === SituacaoLancamento.Recebido ? '✅' : '✅'}
              </Text>
              <Text style={styles.pagamentoBannerTitulo}>
                {lancamento.situacao === SituacaoLancamento.Recebido ? 'Recebido' : 'Pago'}
                {' · '}{fmtBRL(lancamento.valor)}
              </Text>
            </View>
            {lancamento.dataPagamento && (
              <View style={styles.pagamentoBannerDetalhe}>
                <Text style={styles.pagamentoBannerLabel}>📅 Data da confirmação</Text>
                <Text style={styles.pagamentoBannerValor}>
                  {dateToBR(lancamento.dataPagamento)}
                </Text>
              </View>
            )}
            {lancamento.contaBancariaNome && (
              <View style={styles.pagamentoBannerDetalhe}>
                <Text style={styles.pagamentoBannerLabel}>🏦 Conta</Text>
                <Text style={styles.pagamentoBannerValor}>{lancamento.contaBancariaNome}</Text>
              </View>
            )}
            {!lancamento.contaBancariaNome && (
              <Text style={styles.pagamentoBannerSemConta}>Sem conta bancária vinculada</Text>
            )}
          </View>
        )}

        {/* Info de parcela */}
        {lancamento.totalParcelas && lancamento.totalParcelas > 1 && !lancamento.isRecorrente && (
          <View style={styles.parcelaInfo}>
            <Text style={styles.parcelaInfoText}>
              {lancamento.cartaoId ? '💳' : '📋'} Parcela {lancamento.parcelaAtual}/{lancamento.totalParcelas}
              {lancamento.cartaoNome ? ` · ${lancamento.cartaoNome}` : ''}
            </Text>
          </View>
        )}

        {/* Info de despesa recorrente */}
        {lancamento.isRecorrente && (
          <View style={styles.recorrenteInfo}>
            <Text style={styles.recorrenteInfoText}>🔄 Recorrente — ativo</Text>
          </View>
        )}

        {/* Banner Horista */}
        {isHorista && (
          <View style={styles.horistaBanner}>
            <Text style={styles.horistaBannerText}>⏱ Receita Horista — edite o valor/hora e as horas trabalhadas</Text>
          </View>
        )}

        {/* ── Seletor de tipo — Despesa / Receita ────────────────────────── */}
        <View style={styles.tipoRow}>
          {([TipoLancamento.Debito, TipoLancamento.Credito] as TipoLancamento[]).map(t => {
            const cfg = TIPO_CONFIG[t as keyof typeof TIPO_CONFIG];
            const active = tipo === t;
            return (
              <TouchableOpacity
                key={t}
                style={[styles.tipoCard, { borderColor: active ? cfg.color : colors.inputBorder }, active && { backgroundColor: cfg.color + '18' }]}
                onPress={() => {
                  setTipo(t);
                  setSituacao(t === TipoLancamento.Credito ? SituacaoLancamento.AReceber : SituacaoLancamento.AVencer);
                  setCategoriaId(undefined);
                  if (t !== TipoLancamento.Debito) setCartaoId(undefined);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.tipoEmoji}>{cfg.emoji}</Text>
                <View>
                  <Text style={[styles.tipoLabel, { color: active ? cfg.color : colors.textSecondary }]}>{cfg.label}</Text>
                  <Text style={styles.tipoSub}>{cfg.sub}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>Descrição</Text>
        <TextInput
          style={styles.input}
          value={descricao}
          onChangeText={setDescricao}
          placeholderTextColor={colors.inputPlaceholder}
        />

        {/* ── Campos Horista ── */}
        {isHorista ? (
          <>
            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.label}>Valor/Hora (R$)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="decimal-pad"
                  value={valorHora}
                  onChangeText={handleValorHoraChange}
                  placeholder="Ex: 150,00"
                  placeholderTextColor={colors.inputPlaceholder}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Qtd. Horas</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="decimal-pad"
                  value={quantidadeHoras}
                  onChangeText={handleQuantidadeHorasChange}
                  placeholder="Ex: 160"
                  placeholderTextColor={colors.inputPlaceholder}
                />
              </View>
            </View>
            {/* Preview do total calculado */}
            {valor !== '' && parseBRL(valor) > 0 && (
              <View style={styles.horaPreview}>
                <Text style={styles.horaPreviewLabel}>Total calculado</Text>
                <Text style={styles.horaPreviewValor}>
                  R$ {parseBRL(valor).toFixed(2)}
                </Text>
              </View>
            )}
            <View style={{ marginTop: 8 }}>
              <Text style={styles.label}>Data</Text>
              <TextInput
                style={styles.input}
                placeholder="DD/MM/AAAA"
                keyboardType="numeric"
                value={data}
                onChangeText={t => setData(formatDateInput(t))}
                maxLength={10}
                placeholderTextColor={colors.inputPlaceholder}
              />
            </View>
          </>
        ) : (
          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.label}>Valor (R$)</Text>
              <TextInput
                style={styles.input}
                keyboardType="decimal-pad"
                value={valor}
                onChangeText={setValor}
                placeholderTextColor={colors.inputPlaceholder}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Data</Text>
              <TextInput
                style={styles.input}
                placeholder="DD/MM/AAAA"
                keyboardType="numeric"
                value={data}
                onChangeText={t => setData(formatDateInput(t))}
                maxLength={10}
                placeholderTextColor={colors.inputPlaceholder}
              />
            </View>
          </View>
        )}

        {tipo !== TipoLancamento.Credito && (
          <>
            <Text style={styles.label}>Situação</Text>
            <View style={styles.chips}>
              {SITUACOES[tipo].map(s => (
                <TouchableOpacity
                  key={s.value}
                  style={[styles.chip, situacao === s.value && styles.chipActive]}
                  onPress={() => setSituacao(s.value)}
                >
                  <Text style={[styles.chipText, situacao === s.value && styles.chipTextActive]}>{s.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

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
                  <Text style={[styles.chipText, cartaoId === c.id && styles.chipTextActive]}>💳 {c.nome}</Text>
                </TouchableOpacity>
              ))}
              {cartoes.length === 0 && (
                <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>Nenhum cartão cadastrado</Text>
              )}
            </View>
          </>
        )}

        <Text style={styles.label}>Categoria (opcional)</Text>
        <View style={styles.chips}>
          {categoriasFiltradas.map(c => (
            <TouchableOpacity
              key={c.id}
              style={[styles.chip, categoriaId === c.id && styles.chipActive]}
              onPress={() => setCategoriaId(categoriaId === c.id ? undefined : c.id)}
            >
              <Text style={[styles.chipText, categoriaId === c.id && styles.chipTextActive]}>{c.nome}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.chipAdd} onPress={() => setModalVisible(true)}>
            <Text style={styles.chipAddText}>+ Nova</Text>
          </TouchableOpacity>
        </View>

        {error !== '' && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity style={styles.button} onPress={handleSalvar} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Salvar</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.buttonDelete} onPress={handleExcluirClick} disabled={deleting}>
          {deleting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Excluir Lançamento</Text>}
        </TouchableOpacity>
      </ScrollView>

      {/* Modal salvar recorrente — escolha de escopo */}
      <Modal visible={saveRecorrenteModalVisible} transparent animationType="fade" onRequestClose={() => setSaveRecorrenteModalVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Salvar Recorrente</Text>
            <Text style={styles.modalSub}>
              Este é um lançamento recorrente.{'\n'}
              Deseja aplicar as alterações apenas neste mês ou neste e em todos os meses seguintes?
            </Text>
            <TouchableOpacity style={[styles.btnSave, { marginBottom: 10 }]} onPress={handleSalvarSoEste}>
              <Text style={styles.buttonText}>Só este mês</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btnSave, { backgroundColor: '#1565C0', marginBottom: 10 }]} onPress={handleSalvarEFuturas}>
              <Text style={styles.buttonText}>Este e os próximos</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnCancel} onPress={() => setSaveRecorrenteModalVisible(false)}>
              <Text style={styles.btnCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal exclusão de parcelas / cancelamento de recorrente */}
      <Modal visible={deleteModalVisible} transparent animationType="fade" onRequestClose={() => setDeleteModalVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            {!lancamento.isRecorrente ? (
              <>
                <Text style={styles.modalTitle}>Excluir Parcela</Text>
                <Text style={styles.modalSub}>
                  Parcela {lancamento.parcelaAtual}/{lancamento.totalParcelas}.{'\n'}
                  Deseja excluir apenas esta parcela ou esta e todas as seguintes?
                </Text>
                <TouchableOpacity style={[styles.btnSave, { marginBottom: 10 }]} onPress={handleExcluirSoEste}>
                  <Text style={styles.buttonText}>Excluir só esta parcela</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btnSave, { backgroundColor: '#e53935', marginBottom: 10 }]} onPress={handleExcluirEFuturas}>
                  <Text style={styles.buttonText}>Excluir esta e as próximas</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btnSave, { backgroundColor: '#b71c1c', marginBottom: 10 }]} onPress={handleExcluirGrupoCompleto}>
                  <Text style={styles.buttonText}>Excluir grupo inteiro</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.modalTitle}>Lançamento Recorrente</Text>
                <Text style={styles.modalSub}>
                  O que deseja fazer com esta recorrência?
                </Text>
                <TouchableOpacity style={[styles.btnSave, { marginBottom: 10 }]} onPress={handleExcluirSoEste}>
                  <Text style={styles.buttonText}>Excluir só este mês</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btnSave, { backgroundColor: '#e53935', marginBottom: 10 }]} onPress={handleExcluirEFuturas}>
                  <Text style={styles.buttonText}>Cancelar recorrente (este mês em diante)</Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity style={styles.btnCancel} onPress={() => setDeleteModalVisible(false)}>
              <Text style={styles.btnCancelText}>Voltar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Nova Categoria</Text>
            <Text style={styles.modalSub}>Tipo: {tipo === TipoLancamento.Debito ? 'Débito' : 'Crédito'}</Text>
            <TextInput
              style={styles.input}
              placeholder="Nome da categoria"
              value={novaCategoria}
              onChangeText={setNovaCategoria}
              autoFocus
              placeholderTextColor={colors.inputPlaceholder}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => { setModalVisible(false); setNovaCategoria(''); }}>
                <Text style={styles.btnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnSave} onPress={handleSalvarCategoria} disabled={savingCategoria}>
                {savingCategoria ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Salvar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

function makeStyles(c: ColorScheme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.surface },
    content: { padding: 20, paddingBottom: 40 },

    pagamentoBanner: {
      backgroundColor: c.greenDim, borderRadius: 12, padding: 16,
      marginBottom: 8, borderWidth: 1, borderColor: c.greenBorder,
    },
    pagamentoBannerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
    pagamentoBannerIcon: { fontSize: 20 },
    pagamentoBannerTitulo: { fontSize: 16, fontWeight: 'bold', color: c.green },
    pagamentoBannerDetalhe: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingVertical: 6, borderTopWidth: 1, borderTopColor: c.greenBorder,
    },
    pagamentoBannerLabel: { fontSize: 13, color: c.green, opacity: 0.8 },
    pagamentoBannerValor: { fontSize: 13, fontWeight: '700', color: c.green },
    pagamentoBannerSemConta: {
      fontSize: 12, color: c.green, opacity: 0.6, marginTop: 4,
      borderTopWidth: 1, borderTopColor: c.greenBorder, paddingTop: 6,
    },

    parcelaInfo: { backgroundColor: c.blueDim, borderRadius: 8, padding: 10, marginBottom: 4, borderWidth: 1, borderColor: c.blueBorder },
    parcelaInfoText: { color: '#64B5F6', fontSize: 13, fontWeight: '600', textAlign: 'center' },
    recorrenteInfo: { backgroundColor: c.purpleDim, borderRadius: 8, padding: 10, marginBottom: 4, borderWidth: 1, borderColor: c.purpleBorder },
    recorrenteInfoText: { color: c.purpleLight, fontSize: 13, fontWeight: '600', textAlign: 'center' },
    horistaBanner: { backgroundColor: '#F57F1715', borderRadius: 8, padding: 10, marginBottom: 4, borderWidth: 1, borderColor: '#FFD54F40' },
    horistaBannerText: { color: '#FFD54F', fontSize: 13, fontWeight: '600', textAlign: 'center' },
    horaPreview: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      backgroundColor: c.greenDim, borderRadius: 8, padding: 12, marginTop: 8,
      borderWidth: 1, borderColor: c.greenBorder,
    },
    horaPreviewLabel: { fontSize: 13, color: c.green, fontWeight: '600' },
    horaPreviewValor: { fontSize: 18, color: c.green, fontWeight: 'bold' },
    // ── Seletor tipo inline
    tipoRow:   { flexDirection: 'row', gap: 10, marginTop: 8, marginBottom: 4 },
    tipoCard:  { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1.5, backgroundColor: c.inputBg, padding: 14 },
    tipoEmoji: { fontSize: 24 },
    tipoLabel: { fontSize: 15, fontWeight: '700' },
    tipoSub:   { fontSize: 11, color: c.textTertiary, marginTop: 1 },

    label: { fontSize: 13, fontWeight: '600', color: c.textSecondary, marginBottom: 6, marginTop: 16, textTransform: 'uppercase', letterSpacing: 0.4 },
    input: { backgroundColor: c.inputBg, borderRadius: 8, padding: 14, fontSize: 16, borderWidth: 1, borderColor: c.inputBorder, color: c.text },
    row: { flexDirection: 'row' },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: c.inputBorder, backgroundColor: c.inputBg },
    chipActive: { backgroundColor: c.green, borderColor: c.green },
    chipCartao: { backgroundColor: c.blue, borderColor: c.blue },
    chipText: { fontSize: 14, color: c.textSecondary },
    chipTextActive: { color: '#fff', fontWeight: '600' },
    chipAdd: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: c.greenBorder, backgroundColor: 'transparent' },
    chipAddText: { fontSize: 14, color: c.green, fontWeight: '600' },
    errorBox: { backgroundColor: c.redDim, borderRadius: 8, padding: 12, marginTop: 16, borderWidth: 1, borderColor: c.redBorder },
    errorText: { color: c.redBorder, fontSize: 14, textAlign: 'center' },
    button: { backgroundColor: c.green, borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 24 },
    buttonDelete: { backgroundColor: c.red, borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 12 },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    modal: { backgroundColor: c.surfaceElevated, borderRadius: 16, padding: 24, width: '100%', maxWidth: 420, borderWidth: 1, borderColor: c.border },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: c.text, marginBottom: 4 },
    modalSub: { fontSize: 13, color: c.textSecondary, marginBottom: 16, lineHeight: 18 },
    modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
    btnCancel: { flex: 1, borderRadius: 8, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: c.border },
    btnCancelText: { color: c.textSecondary, fontSize: 15 },
    btnSave: { flex: 1, backgroundColor: c.green, borderRadius: 8, padding: 14, alignItems: 'center' },
  });
}
