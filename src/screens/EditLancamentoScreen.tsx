import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator, Modal,
} from 'react-native';
import { lancamentosService, categoriasService, cartoesService } from '../services/api';
import { Categoria, CartaoCredito, Lancamento, SituacaoLancamento, TipoLancamento, TipoReceita } from '../types';

const TIPOS = [
  { label: 'Crédito', value: TipoLancamento.Credito },
  { label: 'Débito', value: TipoLancamento.Debito },
  { label: 'Pix', value: TipoLancamento.Pix },
];

const SITUACOES: Record<TipoLancamento, { label: string; value: SituacaoLancamento }[]> = {
  [TipoLancamento.Credito]: [],   // não exibe seletor
  [TipoLancamento.Debito]: [
    { label: 'Pago', value: SituacaoLancamento.Pago },
    { label: 'A Vencer', value: SituacaoLancamento.AVencer },
    { label: 'Vencido', value: SituacaoLancamento.Vencido },
  ],
  [TipoLancamento.Pix]: [
    { label: 'Pago', value: SituacaoLancamento.Pago },
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

export default function EditLancamentoScreen({ route, navigation }: any) {
  const lancamento: Lancamento = route.params.lancamento;

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
    const vh = parseFloat(v.replace(',', '.'));
    const qh = parseFloat(quantidadeHoras.replace(',', '.'));
    if (!isNaN(vh) && !isNaN(qh) && qh > 0) {
      setValor((vh * qh).toFixed(2).replace('.', ','));
    }
  }
  function handleQuantidadeHorasChange(v: string) {
    setQuantidadeHoras(v);
    const vh = parseFloat(valorHora.replace(',', '.'));
    const qh = parseFloat(v.replace(',', '.'));
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
    const valorNum = parseFloat(valor.replace(',', '.'));
    if (isNaN(valorNum) || valorNum <= 0) { setError('Informe um valor válido.'); return; }
    const isoDate = toISODate(data);
    if (!isoDate) { setError('Data inválida. Use DD/MM/AAAA.'); return; }

    setLoading(true);
    try {
      await lancamentosService.update(lancamento.id, {
        descricao: descricao.trim(),
        data: isoDate,
        valor: valorNum,
        tipo,
        situacao,
        categoriaId: categoriaId ?? null,
        cartaoId: cartaoId ?? null,
      });
      navigation.goBack();
    } catch {
      setError('Erro ao salvar lançamento.');
    } finally {
      setLoading(false);
    }
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

  const categoriasFiltradas = categorias.filter(c => c.tipo === tipo || c.tipo === TipoLancamento.Debito);

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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

        <Text style={styles.label}>Descrição</Text>
        <TextInput style={styles.input} value={descricao} onChangeText={setDescricao} />

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
                />
              </View>
            </View>
            {/* Preview do total calculado */}
            {valor !== '' && !isNaN(parseFloat(valor.replace(',', '.'))) && (
              <View style={styles.horaPreview}>
                <Text style={styles.horaPreviewLabel}>Total calculado</Text>
                <Text style={styles.horaPreviewValor}>
                  R$ {parseFloat(valor.replace(',', '.')).toFixed(2)}
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
              />
            </View>
          </View>
        )}

        <Text style={styles.label}>Tipo</Text>
        <View style={styles.chips}>
          {TIPOS.map(t => (
            <TouchableOpacity
              key={t.value}
              style={[styles.chip, tipo === t.value && styles.chipActive]}
              onPress={() => {
                setTipo(t.value);
                setSituacao(t.value === TipoLancamento.Credito
                  ? SituacaoLancamento.AVencer
                  : t.value === TipoLancamento.Pix
                    ? SituacaoLancamento.Pago
                    : SituacaoLancamento.AVencer);
                setCategoriaId(undefined);
                if (t.value !== TipoLancamento.Debito) setCartaoId(undefined);
              }}
            >
              <Text style={[styles.chipText, tipo === t.value && styles.chipTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

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
                <Text style={{ fontSize: 13, color: '#aaa', marginTop: 4 }}>Nenhum cartão cadastrado</Text>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 20, paddingBottom: 40 },
  parcelaInfo: { backgroundColor: '#E3F2FD', borderRadius: 8, padding: 10, marginBottom: 4, borderWidth: 1, borderColor: '#90CAF9' },
  parcelaInfoText: { color: '#1565C0', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  recorrenteInfo: { backgroundColor: '#F3E5F5', borderRadius: 8, padding: 10, marginBottom: 4, borderWidth: 1, borderColor: '#CE93D8' },
  recorrenteInfoText: { color: '#7B1FA2', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  horistaBanner: { backgroundColor: '#FFF8E1', borderRadius: 8, padding: 10, marginBottom: 4, borderWidth: 1, borderColor: '#FFD54F' },
  horistaBannerText: { color: '#F57F17', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  horaPreview: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#E8F5E9', borderRadius: 8, padding: 12, marginTop: 8,
    borderWidth: 1, borderColor: '#A5D6A7',
  },
  horaPreviewLabel: { fontSize: 13, color: '#388E3C', fontWeight: '600' },
  horaPreviewValor: { fontSize: 18, color: '#2E7D32', fontWeight: 'bold' },
  label: { fontSize: 14, fontWeight: '600', color: '#444', marginBottom: 6, marginTop: 16 },
  input: { backgroundColor: '#fff', borderRadius: 8, padding: 14, fontSize: 16, borderWidth: 1, borderColor: '#ddd' },
  row: { flexDirection: 'row' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#ddd', backgroundColor: '#fff' },
  chipActive: { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
  chipCartao: { backgroundColor: '#1565C0', borderColor: '#1565C0' },
  chipText: { fontSize: 14, color: '#444' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  chipAdd: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#4CAF50', backgroundColor: '#fff' },
  chipAddText: { fontSize: 14, color: '#4CAF50', fontWeight: '600' },
  errorBox: { backgroundColor: '#ffebee', borderRadius: 8, padding: 12, marginTop: 16, borderWidth: 1, borderColor: '#ef9a9a' },
  errorText: { color: '#c62828', fontSize: 14, textAlign: 'center' },
  button: { backgroundColor: '#4CAF50', borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 24 },
  buttonDelete: { backgroundColor: '#e53935', borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 12 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modal: { backgroundColor: '#fff', borderRadius: 12, padding: 24, width: '100%', maxWidth: 420 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 4 },
  modalSub: { fontSize: 13, color: '#888', marginBottom: 16 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  btnCancel: { flex: 1, borderRadius: 8, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#ddd' },
  btnCancelText: { color: '#666', fontSize: 15 },
  btnSave: { flex: 1, backgroundColor: '#4CAF50', borderRadius: 8, padding: 14, alignItems: 'center' },
});
