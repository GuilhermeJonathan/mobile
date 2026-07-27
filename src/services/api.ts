import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { resetToLogin } from '../navigation/navigationRef';
import { authService } from './authService';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://localhost:7066/api';
const LOGIN_API_URL = process.env.EXPO_PUBLIC_LOGIN_URL ?? 'https://localhost:7228';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// ── Modo view-as (assessoria) ─────────────────────────────────────────────
// Quando ativo, toda requisição leva o header X-Assessoria-Cliente e o backend
// troca o contexto para o cliente (somente leitura, garantido pelo middleware).
let assessoriaClienteId: string | null = null;
export function setAssessoriaCliente(clienteId: string | null) {
  assessoriaClienteId = clienteId;
}
export function getAssessoriaCliente(): string | null {
  return assessoriaClienteId;
}

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('@cf_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  // Não sobrescreve header explícito por requisição (ex: saudeCliente/analiseIa no painel)
  if (assessoriaClienteId && !config.headers['X-Assessoria-Cliente']) {
    config.headers['X-Assessoria-Cliente'] = assessoriaClienteId;
  }
  return config;
});

// Interceptor de resposta: tenta renovar o token via refresh antes de deslogar
let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    original._retry = true;

    if (isRefreshing) {
      // Enfileira a requisição até o refresh terminar
      return new Promise((resolve, reject) => {
        refreshQueue.push((token) => {
          if (token) {
            original.headers.Authorization = `Bearer ${token}`;
            resolve(api(original));
          } else {
            reject(error);
          }
        });
      });
    }

    isRefreshing = true;
    const newToken = await authService.refreshAccessToken();
    isRefreshing = false;

    if (newToken) {
      refreshQueue.forEach(cb => cb(newToken));
      refreshQueue = [];
      original.headers.Authorization = `Bearer ${newToken}`;
      return api(original);
    }

    // Refresh falhou — desloga
    refreshQueue.forEach(cb => cb(null));
    refreshQueue = [];
    await authService.logout();
    resetToLogin();
    return Promise.reject(error);
  }
);

export interface ParceladoVigenteItem {
  descricao: string;
  categoriaNome: string | null;
  cartaoNome: string | null;
  primeiraData: string;
  ultimaData: string;
  parcelaMin: number;
  totalParcelas: number;
  valorParcela: number;
  saldoRestante: number;
}

export interface ParceladosVigentesResult {
  totalDivida: number;
  itens: ParceladoVigenteItem[];
}

export interface DicaFinanceiraDto {
  tipo: 'critico' | 'atencao' | 'positivo';
  titulo: string;
  descricao: string;
  dicaEducativa: string | null;
  acaoLabel: string | null;
  acaoRota: string | null;
}

export interface ResumoMes {
  mes: number;
  totalCreditos: number;
  totalDebitos: number;
  saldo: number;
}

export interface ResumoCatAnual {
  categoria: string;
  total: number;
  icone?: string;
  cor?: string;
}

export interface ResumoAnual {
  ano: number;
  totalCreditos: number;
  totalDebitos: number;
  saldo: number;
  meses: ResumoMes[];
  topCategorias: ResumoCatAnual[];
}

export interface BuscaLancamentoItem {
  id: string;
  descricao: string;
  data: string;
  valor: number;
  tipo: number;
  situacao: number;
  mes: number;
  ano: number;
  categoriaId: string | null;
  categoriaNome: string | null;
  categoriaIcone: string | null;
  categoriaCor: string | null;
  cartaoId: string | null;
  cartaoNome: string | null;
  parcelaAtual: number | null;
  totalParcelas: number | null;
  isRecorrente: boolean;
  grupoParcelas: string | null;
  criadoPorId: string | null;
  criadoPorNome: string | null;
}

export interface BuscaResult {
  totalCount: number;
  itens: BuscaLancamentoItem[];
}

export interface ProjecaoMes {
  mes: number;
  ano: number;
  label: string;
  totalCreditos: number;
  totalDebitos: number;
}

export const lancamentosService = {
  getByMes: (mes: number, ano: number) =>
    api.get(`/lancamentos/${mes}/${ano}`).then(r => r.data?.items ?? r.data),
  getParceladosVigentes: (): Promise<ParceladosVigentesResult> =>
    api.get('/lancamentos/parcelados-vigentes').then(r => r.data),
  getResumoAnual: (ano: number): Promise<ResumoAnual> =>
    api.get(`/lancamentos/resumo-anual/${ano}`).then(r => r.data),
  getProjecao: (mes: number, ano: number): Promise<ProjecaoMes[]> =>
    api.get(`/lancamentos/projecao/${mes}/${ano}`).then(r => r.data),
  getDashboard: (mes: number, ano: number) =>
    api.get(`/lancamentos/dashboard/${mes}/${ano}`).then(r => r.data),
  getDicas: (mes: number, ano: number) =>
    api.get(`/lancamentos/dicas/${mes}/${ano}`).then(r => r.data),
  getAnaliseDividas: (): Promise<DicaFinanceiraDto[]> =>
    api.get('/lancamentos/parcelados-vigentes/analise').then(r => r.data),
  create: (data: object) => api.post('/lancamentos', data).then(r => r.data),
  update: (id: string, data: object) => api.put(`/lancamentos/${id}`, data),
  updateRecorrenteFuturas: (id: string, data: object) =>
    api.put(`/lancamentos/${id}/recorrente-futuras`, data),
  atualizarSituacao: (id: string, situacao: number) =>
    api.patch(`/lancamentos/${id}/situacao`, { situacao }),
  atualizarSituacaoComConta: (id: string, situacao: number, contaBancariaId: string | null) =>
    api.patch(`/lancamentos/${id}/situacao-com-conta`, { situacao, contaBancariaId }),
  delete: (id: string) => api.delete(`/lancamentos/${id}`),
  deleteParcelasFuturas: (grupoParcelas: string, parcelaAtualFrom: number) =>
    api.delete(`/lancamentos/parcelas-futuras/${grupoParcelas}/${parcelaAtualFrom}`),
  deleteGrupoParcelas: (grupoParcelas: string) =>
    api.delete(`/lancamentos/grupo/${grupoParcelas}`),
  busca: (q: string, page = 1, pageSize = 20): Promise<BuscaResult> =>
    api.get(`/lancamentos/busca?q=${encodeURIComponent(q)}&page=${page}&pageSize=${pageSize}`).then(r => r.data),
};

export interface OrcamentoItem {
  categoriaId: string;
  categoriaNome: string;
  limiteMensal: number | null;
  gastoAtual: number;
  categoriaIcone: string | null;
  categoriaCor: string | null;
}

export interface VinculoDto {
  id: string;
  nomeMembro: string;
  aceito: boolean;
  criadoEm: string;
}

export interface MeuVinculoDto {
  ehMembro: boolean;
  donoId: string | null;
  vinculoId: string | null;
}

export const vinculosService = {
  gerarConvite: (): Promise<{ codigo: string }> =>
    api.post('/vinculos/convite').then(r => r.data),
  aceitarConvite: (codigo: string, nomeMembro: string) =>
    api.post('/vinculos/aceitar', { codigo, nomeMembro }),
  listar: (): Promise<VinculoDto[]> =>
    api.get('/vinculos').then(r => r.data),
  meuVinculo: (): Promise<MeuVinculoDto> =>
    api.get('/vinculos/meu').then(r => r.data),
  remover: (id: string) =>
    api.delete(`/vinculos/${id}`),
};

export interface ClienteAssessoriaDto {
  vinculoId: string;
  clienteId: string;
  nomeCliente: string | null;
  codigoConvite: string;
  aceito: boolean;
  ativo: boolean;
  criadoEm: string;
  aceitoEm: string | null;
  avatarUrl: string | null;
}

export interface ConviteHistoricoDto {
  vinculoId: string;
  codigoConvite: string;
  status: 'Pendente' | 'Aceito' | 'Revogado';
  nomeCliente: string | null;
  criadoEm: string;
  aceitoEm: string | null;
  revogadoEm: string | null;
}

export interface MeuAssessorDto {
  temAssessor: boolean;
  vinculoId: string | null;
  nomeAssessor: string | null;
  aceitoEm: string | null;
}

export interface PilarSaudeDto {
  nome: string;
  pontos: number;
  maximo: number;
  detalhe: string;
}

export interface SaudeFinanceiraDto {
  scoreGeral: number;
  classificacao: string;
  pilares: PilarSaudeDto[];
}

export interface RecomendacaoDto {
  id: string;
  clienteId: string;
  tipo: number;          // 1=AjusteCategoria, 2=Dica, 3=Alerta
  categoriaId: string | null;
  texto: string;
  status: number;        // 1=Pendente, 2=Aceita, 3=Recusada
  respostaCliente: string | null;
  criadoEm: string;
  respondidoEm: string | null;
}

export const assessoriaService = {
  gerarConvite: (): Promise<{ codigo: string }> =>
    api.post('/assessoria/convite').then(r => r.data),
  enviarConviteEmail: (email: string): Promise<{ codigo: string }> =>
    api.post('/assessoria/convite/email', { email }).then(r => r.data),
  convitesHistorico: (): Promise<ConviteHistoricoDto[]> =>
    api.get('/assessoria/convites/historico').then(r => r.data),
  aceitarConvite: (codigo: string, nomeCliente: string) =>
    api.post('/assessoria/aceitar', { codigo, nomeCliente }),
  clientes: (): Promise<ClienteAssessoriaDto[]> =>
    api.get('/assessoria/clientes').then(r => r.data),
  meuAssessor: (): Promise<MeuAssessorDto> =>
    api.get('/assessoria/meu-assessor').then(r => r.data),
  revogar: (id: string) =>
    api.delete(`/assessoria/${id}`),
  // Saúde do usuário efetivo (o próprio, ou o cliente sob view-as)
  saude: (mes: number, ano: number): Promise<SaudeFinanceiraDto> =>
    api.get(`/assessoria/saude/${mes}/${ano}`).then(r => r.data),
  // Saúde de um cliente específico sem entrar no modo view-as (para o painel)
  saudeCliente: (clienteId: string, mes: number, ano: number): Promise<SaudeFinanceiraDto> =>
    api.get(`/assessoria/saude/${mes}/${ano}`, {
      headers: { 'X-Assessoria-Cliente': clienteId },
    }).then(r => r.data),

  // ── Recomendações (F3) ──
  criarRecomendacao: (clienteId: string, tipo: number, texto: string, categoriaId?: string) =>
    api.post('/assessoria/recomendacoes', { clienteId, tipo, texto, categoriaId: categoriaId ?? null }),
  responderRecomendacao: (id: string, aceitar: boolean, comentario?: string) =>
    api.patch(`/assessoria/recomendacoes/${id}/responder`, { aceitar, comentario: comentario ?? null }),
  excluirRecomendacao: (id: string) =>
    api.delete(`/assessoria/recomendacoes/${id}`),
  minhasRecomendacoes: (): Promise<RecomendacaoDto[]> =>
    api.get('/assessoria/recomendacoes').then(r => r.data),
  recomendacoesDoCliente: (clienteId: string): Promise<RecomendacaoDto[]> =>
    api.get(`/assessoria/recomendacoes/cliente/${clienteId}`).then(r => r.data),

  // ── Análise com IA (F4) — rascunho para o assessor editar ──
  analiseIa: (clienteId: string, mes: number, ano: number): Promise<{ rascunho: string }> =>
    api.get(`/assessoria/analise-ia/${mes}/${ano}`, {
      headers: { 'X-Assessoria-Cliente': clienteId },
    }).then(r => r.data),
};

export const categoriasService = {
  getAll: () => api.get('/categorias').then(r => r.data?.items ?? r.data),
  create: (data: object) => api.post('/categorias', data).then(r => r.data),
  update: (id: string, data: object) => api.put(`/categorias/${id}`, data),
  delete: (id: string) => api.delete(`/categorias/${id}`),
  atualizarLimite: (id: string, limiteMensal: number | null) =>
    api.patch(`/categorias/${id}/limite`, { limiteMensal }),
  getOrcamento: (mes: number, ano: number): Promise<OrcamentoItem[]> =>
    api.get(`/categorias/orcamento/${mes}/${ano}`).then(r => r.data),
};

export const cartoesService = {
  getAll: (mes: number, ano: number) => api.get(`/cartoes?mes=${mes}&ano=${ano}`).then(r => r.data?.items ?? r.data),
  createCartao: (data: object) => api.post('/cartoes', data).then(r => r.data),
  updateCartao: (id: string, data: object) => api.put(`/cartoes/${id}`, data),
  deleteCartao: (id: string) => api.delete(`/cartoes/${id}`),
  createParcela: (cartaoId: string, data: object) =>
    api.post(`/cartoes/${cartaoId}/parcelas`, data).then(r => r.data),
  updateParcela: (cartaoId: string, parcelaId: string, data: object) =>
    api.put(`/cartoes/${cartaoId}/parcelas/${parcelaId}`, data),
  deleteParcela: (cartaoId: string, parcelaId: string) =>
    api.delete(`/cartoes/${cartaoId}/parcelas/${parcelaId}`),
};

export const saldosService = {
  getAll: () => api.get('/saldos').then(r => r.data),
  create: (data: object) => api.post('/saldos', data).then(r => r.data),
  update: (id: string, data: object) => api.put(`/saldos/${id}`, data),
  delete: (id: string) => api.delete(`/saldos/${id}`),
  // legado
  upsert: (banco: string, saldo: number) =>
    api.put('/saldos/upsert', { banco, saldo }).then(r => r.data),
};

export const receitasRecorrentesService = {
  getAll: () => api.get('/receitasrecorrentes').then(r => r.data),
  create: (data: object) => api.post('/receitasrecorrentes', data).then(r => r.data),
  update: (id: string, data: object) => api.put(`/receitasrecorrentes/${id}`, data),
  delete: (id: string) => api.delete(`/receitasrecorrentes/${id}`),
};

export const horasService = {
  getByMes: (mes: number, ano: number) =>
    api.get(`/horas/${mes}/${ano}`).then(r => r.data),
  create: (data: object) => api.post('/horas', data).then(r => r.data),
  update: (id: string, data: object) => api.put(`/horas/${id}`, data),
  delete: (id: string) => api.delete(`/horas/${id}`),
};

export interface FaturaTransacao {
  descricao: string;
  data: string;
  valor: number;
  mes: number;
  ano: number;
  parcelaAtual: number | null;
  totalParcelas: number | null;
  secaoCartao: string;
  titularCartao: string;
  categoriaNome: string;  // do Excel col E, ou "Outros"
}

export interface ImportarFaturaItem {
  descricao: string;
  data: string;
  valor: number;
  mes: number;
  ano: number;
  cartaoId: string;
  categoriaNome: string;  // handler resolve/cria no backend
  parcelaAtual: number | null;
  totalParcelas: number | null;
}

export const faturasService = {
  preview: async (arquivo: File, mesFatura: number, anoFatura: number): Promise<FaturaTransacao[]> => {
    const formData = new FormData();
    formData.append('arquivo', arquivo);
    formData.append('mesFatura', String(mesFatura));
    formData.append('anoFatura', String(anoFatura));
    const response = await api.post('/faturas/preview', formData, {
      headers: { 'Content-Type': undefined },
    });
    return response.data;
  },

  importar: (items: ImportarFaturaItem[]): Promise<number> =>
    api.post('/faturas/importar', { items }).then(r => r.data),
};

// Invite service — uses the Login API directly with auth token
const loginApi = axios.create({
  baseURL: LOGIN_API_URL,
  headers: { 'Content-Type': 'application/json' },
});

loginApi.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('@cf_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export interface UserListItem {
  id: string;
  name: string;
  email: string;
  document: string;
  userTypeId: number;
  isActive: boolean;
  isBlocked: boolean;
  avatarUrl: string | null;
  createdAt: string;
  ultimoLogin: string | null;
  // plano
  planType: number;           // 0=None 1=Trial 2=Monthly 3=Annual
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  isTrialExpired: boolean;
  trialDaysRemaining: number | null;
}

export interface WhatsAppAdminVinculo {
  userId: string;
  phoneNumber: string;
  createdAt: string;
}

export const adminService = {
  listUsers: (page = 1, pageSize = 50) =>
    loginApi.get<{ items: UserListItem[]; totalCount: number }>(
      `/user?currentPage=${page}&pageSize=${pageSize}`
    ).then(r => r.data),

  setBlock: (id: string, block: boolean) =>
    loginApi.patch(`/user/${id}/block`, { block }),

  setPlan: (id: string, planType: number, trialDays?: number) =>
    loginApi.patch(`/user/${id}/plan`, { planType, trialDays: trialDays ?? null }),

  listWhatsAppVinculos: () =>
    api.get<WhatsAppAdminVinculo[]>('/whatsapp/vinculos/admin').then(r => r.data),
};

export interface WhatsAppVinculoDto {
  phoneNumber: string;
  createdAt: string;
}

export const whatsappService = {
  getVinculo: (): Promise<WhatsAppVinculoDto | null> =>
    api.get<WhatsAppVinculoDto>('/whatsapp/vinculo')
      .then(r => r.data)
      .catch(e => e?.response?.status === 404 ? null : Promise.reject(e)),

  vincular: (phoneNumber: string) =>
    api.post('/whatsapp/vincular', { phoneNumber }),

  desvincular: () =>
    api.delete('/whatsapp/vinculo'),
};

export interface InviteDto {
  token: string;
  email: string | null;
  expiresAt: string;
  isValid: boolean;
  usedAt: string | null;
}

export const inviteService = {
  validate: (token: string) =>
    loginApi.get<{ isValid: boolean; email: string | null; expiresAt: string | null }>(
      `/invite/${token}`
    ).then(r => r.data),

  create: (email?: string, expirationDays?: number) =>
    loginApi.post<{ token: string; expiresAt: string; link: string }>(
      '/invite',
      { email: email ?? null, expirationDays: expirationDays ?? 7 }
    ).then(r => r.data),

  list: () =>
    loginApi.get<InviteDto[]>('/invite').then(r => r.data),
};

export interface AssinaturaDto {
  grupoId: string;
  descricao: string;
  valorMensal: number;
  categoriaNome: string | null;
  categoriaIcone: string | null;
  categoriaCor: string | null;
  proximoVencimento: string | null;
  totalLancamentos: number;
  lancamentosPagos: number;
}

export const assinaturasService = {
  getAll: (): Promise<AssinaturaDto[]> => api.get('/lancamentos/assinaturas').then(r => r.data),
};

// ─── Metas ────────────────────────────────────────────────────────────────────

export interface MetaDto {
  id: string;
  titulo: string;
  descricao?: string;
  valorMeta: number;
  valorAtual: number;
  dataMeta?: string;
  status: 1 | 2 | 3; // 1=Ativa 2=Concluida 3=Pausada
  capa?: string;
  corFundo?: string;
  criadoEm: string;
  contribuicaoMensalValor?: number;
  contribuicaoDia?: number;
}

export interface CreateMetaBody {
  titulo: string;
  descricao?: string | null;
  valorMeta: number;
  dataMeta?: string | null;
  capa?: string | null;
  corFundo?: string;
  contribuicaoMensalValor?: number | null;
  contribuicaoDia?: number | null;
}

export const metasApiService = {
  getAll: (): Promise<MetaDto[]> => api.get('/metas').then(r => r.data),
  create: (data: CreateMetaBody) => api.post('/metas', data).then(r => r.data),
  update: (id: string, data: CreateMetaBody) => api.put(`/metas/${id}`, data),
  atualizarValor: (id: string, novoValor: number) =>
    api.patch(`/metas/${id}/valor`, { novoValor }),
  delete: (id: string) => api.delete(`/metas/${id}`),
};

export const transferenciaService = {
  criar: (body: {
    contaOrigemId: string;
    contaDestinoId: string;
    valor: number;
    data: string;
    descricao: string;
  }) => api.post('/lancamentos/transferencia', body).then(r => r.data as { idDebito: string; idCredito: string }),
};

export interface ExtratoTransacaoPreview {
  id: string;
  descricao: string;
  valor: number;
  data: string;
  mes: number;
  ano: number;
  tipo: 'Credito' | 'Debito';
  categoriaNome: string | null;
}

export const extratoService = {
  parse: (file: File): Promise<ExtratoTransacaoPreview[]> => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/extrato/parse', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },
  importar: (items: Array<{
    descricao: string; valor: number; data: string;
    mes: number; ano: number; categoriaNome: string | null;
    contaBancariaId: string | null;
  }>) => api.post('/extrato/importar', { items }).then(r => r.data as { importados: number }),
};

// ─── Payment transactions ─────────────────────────────────────────────────────

export interface PaymentTransactionDto {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  planType: string;        // "Monthly" | "Annual"
  amount: number;
  status: string;          // "authorized" | "cancelled"
  mpPaymentId: string | null;
  paidAt: string;          // ISO date
}

export interface PaymentTransactionsResult {
  items: PaymentTransactionDto[];
  total: number;
}

export const paymentService = {
  getTransactions: (page = 1, pageSize = 50): Promise<PaymentTransactionsResult> =>
    loginApi.get(`/payment/transactions?page=${page}&pageSize=${pageSize}`).then(r => r.data),
};

// ── Produtos ──────────────────────────────────────────────────────────────────

export interface ProdutoDto {
  id: string;
  nome: string;
  precoDefault: number | null;
  ativo: boolean;
  criadoEm: string;
}

export interface VendaDto {
  id: string;
  produtoId: string | null;
  produtoNome: string | null;
  descricao: string;
  valor: number;
  data: string;
  status: 0 | 1; // 0=Pendente, 1=Recebido
  origem: 0 | 1; // 0=Manual, 1=WhatsApp
  criadoEm: string;
  criadoPorNome: string;
}

export interface ResumoVendasDto {
  totalHoje: number;
  totalSemana: number;
  totalMes: number;
  qtdHoje: number;
  qtdSemana: number;
  qtdMes: number;
}

export const produtosService = {
  getAll: (): Promise<ProdutoDto[]> => api.get('/produtos').then(r => r.data),
  create: (data: { nome: string; precoDefault: number | null }) =>
    api.post('/produtos', data).then(r => r.data),
  update: (id: string, data: { nome: string; precoDefault: number | null }) =>
    api.put(`/produtos/${id}`, data),
  delete: (id: string) => api.delete(`/produtos/${id}`),
};

export const vendasService = {
  getAll: (params?: { de?: string; ate?: string; produtoId?: string; status?: number }): Promise<VendaDto[]> =>
    api.get('/vendas', { params }).then(r => r.data),
  getResumo: (): Promise<ResumoVendasDto> =>
    api.get('/vendas/resumo').then(r => r.data),
  create: (data: { produtoId?: string | null; descricao: string; valor: number; data: string; origem?: number }) =>
    api.post('/vendas', data).then(r => r.data),
  update: (id: string, data: { produtoId?: string | null; descricao: string; valor: number; data: string }) =>
    api.put(`/vendas/${id}`, data),
  atualizarStatus: (id: string, status: number) =>
    api.patch(`/vendas/${id}/status`, { status }),
  delete: (id: string) => api.delete(`/vendas/${id}`),
};
