import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  FlatList, StyleSheet, ActivityIndicator,
} from 'react-native';
import { lancamentosService, BuscaLancamentoItem } from '../services/api';
import { authService } from '../services/authService';
import { SituacaoLancamento, TipoLancamento } from '../types';
import { fmtBRL } from '../utils/currency';
import { useTheme } from '../theme/ThemeContext';
import type { ColorScheme } from '../theme/colors';
import DogMascot from '../components/DogMascot';
import { navStorePut } from '../utils/navStore';

const PAGE_SIZE = 20;

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

function tipoIcone(tipo: number): { seta: string; cor: string } {
  if (tipo === TipoLancamento.Credito) return { seta: '↑', cor: '#3fb950' };
  if (tipo === TipoLancamento.Pix)    return { seta: '↑', cor: '#58a6ff' };
  return { seta: '↓', cor: '#f85149' };
}

function situacaoLabel(s: number) {
  switch (s) {
    case SituacaoLancamento.Pago:      return { label: 'Pago',     color: '#3fb950' };
    case SituacaoLancamento.Recebido:  return { label: 'Recebido', color: '#3fb950' };
    case SituacaoLancamento.AVencer:   return { label: 'A Vencer', color: '#d29922' };
    case SituacaoLancamento.Vencido:   return { label: 'Vencido',  color: '#f85149' };
    case SituacaoLancamento.AReceber:  return { label: 'A Receber',color: '#58a6ff' };
    default:                           return { label: '—',        color: '#8b949e' };
  }
}

export default function BuscaLancamentosScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [q, setQ]                   = useState('');
  const [itens, setItens]           = useState<BuscaLancamentoItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage]             = useState(1);
  const [loading, setLoading]       = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [buscou, setBuscou]         = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    authService.getUserInfo().then(info => setCurrentUserId(info?.id ?? null));
  }, []);
  const debounceRef                 = useRef<ReturnType<typeof setTimeout> | null>(null);

  const buscar = useCallback(async (termo: string, pg: number, append = false) => {
    if (termo.trim().length < 2) {
      setItens([]);
      setTotalCount(0);
      setBuscou(false);
      return;
    }
    if (pg === 1) setLoading(true); else setLoadingMore(true);
    try {
      const res = await lancamentosService.busca(termo.trim(), pg, PAGE_SIZE);
      setTotalCount(res.totalCount);
      setItens(prev => append ? [...prev, ...res.itens] : res.itens);
      setBuscou(true);
    } catch {
      // silencia erro de rede
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      buscar(q, 1, false);
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [q]);

  function handleCarregarMais() {
    if (loadingMore || itens.length >= totalCount) return;
    const prox = page + 1;
    setPage(prox);
    buscar(q, prox, true);
  }

  function abrirEdicao(item: BuscaLancamentoItem) {
    navStorePut('editLancamento', item);
    navigation.navigate('EditLancamento', { lancamentoId: item.id });
  }

  function renderItem({ item }: { item: BuscaLancamentoItem }) {
    const sit = situacaoLabel(item.situacao);
    const isCredito = item.tipo === TipoLancamento.Credito;
    const parcelaInfo = item.isRecorrente
      ? '🔄 Recorrente'
      : item.parcelaAtual && item.totalParcelas
        ? `${item.parcelaAtual}/${item.totalParcelas}x`
        : null;

    return (
      <TouchableOpacity style={styles.item} onPress={() => abrirEdicao(item)} activeOpacity={0.75}>
        {(() => { const { seta, cor } = tipoIcone(item.tipo); return (
        <Text style={[styles.itemEmoji, { color: cor }]}>{seta}</Text>
      ); })()}
        <View style={styles.itemCenter}>
          <Text style={styles.itemDesc} numberOfLines={1}>{item.descricao}</Text>
          <View style={styles.itemMeta}>
            <Text style={styles.itemMetaText}>
              {MESES[item.mes - 1]}/{item.ano}
            </Text>
            {item.categoriaNome && (
              <Text style={styles.itemMetaText}>
                {' · '}{item.categoriaIcone ? `${item.categoriaIcone} ` : ''}{item.categoriaNome}
              </Text>
            )}
            {item.cartaoNome && (
              <Text style={styles.itemMetaText}> · 💳 {item.cartaoNome}</Text>
            )}
            {parcelaInfo && (
              <Text style={styles.itemMetaText}> · {parcelaInfo}</Text>
            )}
            {item.criadoPorId && item.criadoPorId !== currentUserId && item.criadoPorNome && (
              <Text style={[styles.itemMetaText, { color: '#58a6ff' }]}> · 👤 {item.criadoPorNome.split(' ')[0]}</Text>
            )}
          </View>
        </View>
        <View style={styles.itemRight}>
          <Text style={[styles.itemValor, { color: isCredito ? colors.green : colors.red }]}>
            {isCredito ? '+' : '-'}{fmtBRL(Math.abs(item.valor))}
          </Text>
          <Text style={[styles.itemSituacao, { color: sit.color }]}>{sit.label}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  const temMais = itens.length < totalCount;

  return (
    <View style={styles.container}>
      {/* Campo de busca */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por descrição..."
          placeholderTextColor={colors.inputPlaceholder}
          value={q}
          onChangeText={setQ}
          autoFocus
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {q.length > 0 && (
          <TouchableOpacity onPress={() => setQ('')} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Contador */}
      {buscou && !loading && (
        <Text style={styles.contador}>
          {totalCount === 0
            ? 'Nenhum resultado'
            : `${totalCount} resultado${totalCount !== 1 ? 's' : ''}`}
        </Text>
      )}

      {/* Loading inicial */}
      {loading && (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.green} size="large" />
        </View>
      )}

      {/* Estado vazio */}
      {!loading && !buscou && (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyTitle}>Busca global</Text>
          <Text style={styles.emptyText}>
            Pesquise lançamentos de qualquer mês pelo nome
          </Text>
        </View>
      )}

      {!loading && buscou && totalCount === 0 && (
        <View style={styles.centered}>
          <DogMascot size={90} mood="sad" />
          <Text style={styles.emptyTitle}>Nenhum resultado</Text>
          <Text style={styles.emptyText}>Tente outro termo de busca</Text>
        </View>
      )}

      {/* Lista */}
      {!loading && itens.length > 0 && (
        <FlatList
          data={itens}
          keyExtractor={i => i.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListFooterComponent={
            temMais ? (
              <TouchableOpacity style={styles.maisBtn} onPress={handleCarregarMais} disabled={loadingMore}>
                {loadingMore
                  ? <ActivityIndicator color={colors.green} />
                  : <Text style={styles.maisBtnText}>Carregar mais ({totalCount - itens.length} restantes)</Text>
                }
              </TouchableOpacity>
            ) : null
          }
        />
      )}
    </View>
  );
}

function makeStyles(c: ColorScheme) {
  return StyleSheet.create({
    container:   { flex: 1, backgroundColor: c.background },

    searchBar: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: c.surface,
      borderBottomWidth: 1, borderBottomColor: c.border,
      paddingHorizontal: 16, paddingVertical: 10, gap: 10,
    },
    searchIcon:  { fontSize: 16 },
    searchInput: { flex: 1, fontSize: 16, color: c.text, paddingVertical: 6 },
    clearBtn:    { padding: 4 },
    clearBtnText: { color: c.textSecondary, fontSize: 14 },

    contador: {
      fontSize: 12, color: c.textSecondary,
      paddingHorizontal: 16, paddingVertical: 8,
    },

    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8, paddingHorizontal: 32 },
    emptyTitle: { fontSize: 18, fontWeight: 'bold', color: c.text, marginTop: 8 },
    emptyText:  { fontSize: 14, color: c.textSecondary, textAlign: 'center', lineHeight: 20 },

    list: { paddingVertical: 8 },
    separator: { height: 1, backgroundColor: c.border, marginLeft: 60 },

    item: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 16, paddingVertical: 14, gap: 12,
    },
    itemEmoji:   { fontSize: 24, width: 28, textAlign: 'center', fontWeight: 'bold' },
    itemCenter:  { flex: 1, gap: 3 },
    itemDesc:    { fontSize: 15, fontWeight: '600', color: c.text },
    itemMeta:    { flexDirection: 'row', flexWrap: 'wrap' },
    itemMetaText: { fontSize: 12, color: c.textSecondary },
    itemRight:   { alignItems: 'flex-end', gap: 4 },
    itemValor:   { fontSize: 15, fontWeight: 'bold' },
    itemSituacao: { fontSize: 11, fontWeight: '600' },

    maisBtn: {
      margin: 16, padding: 14, borderRadius: 10,
      backgroundColor: c.surfaceElevated,
      borderWidth: 1, borderColor: c.border,
      alignItems: 'center',
    },
    maisBtnText: { color: c.green, fontWeight: '600', fontSize: 14 },
  });
}
