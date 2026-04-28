import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { resetToLogin } from '../navigation/navigationRef';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://localhost:7066/api';
const LOGIN_API_URL = process.env.EXPO_PUBLIC_LOGIN_URL ?? 'https://localhost:7228';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('@cf_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('@cf_token');
      resetToLogin();
    }
    return Promise.reject(error);
  }
);

export interface ParceladoVigenteItem {
  descricao: string;
  categoriaNome: string | null;
  cartaoNome: string | null;
  primeiraData: string;
  parcelaMin: number;
  totalParcelas: number;
  valorParcela: number;
  saldoRestante: number;
}

export interface ParceladosVigentesResult {
  totalDivida: number;
  itens: ParceladoVigenteItem[];
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
    api.get(`/lancamentos/${mes}/${ano}`).then(r => r.data),
  getParceladosVigentes: (): Promise<ParceladosVigentesResult> =>
    api.get('/lancamentos/parcelados-vigentes').then(r => r.data),
  getResumoAnual: (ano: number): Promise<ResumoAnual> =>
    api.get(`/lancamentos/resumo-anual/${ano}`).then(r => r.data),
  getProjecao: (mes: number, ano: number): Promise<ProjecaoMes[]> =>
    api.get(`/lancamentos/projecao/${mes}/${ano}`).then(r => r.data),
  getDashboard: (mes: number, ano: number) =>
    api.get(`/lancamentos/dashboard/${mes}/${ano}`).then(r => r.data),
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

export const categoriasService = {
  getAll: () => api.get('/categorias').then(r => r.data),
  create: (data: object) => api.post('/categorias', data).then(r => r.data),
  delete: (id: string) => api.delete(`/categorias/${id}`),
  atualizarLimite: (id: string, limiteMensal: number | null) =>
    api.patch(`/categorias/${id}/limite`, { limiteMensal }),
  getOrcamento: (mes: number, ano: number): Promise<OrcamentoItem[]> =>
    api.get(`/categorias/orcamento/${mes}/${ano}`).then(r => r.data),
};

export const cartoesService = {
  getAll: (mes: number, ano: number) => api.get(`/cartoes?mes=${mes}&ano=${ano}`).then(r => r.data),
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
}

export const adminService = {
  listUsers: (page = 1, pageSize = 50) =>
    loginApi.get<{ items: UserListItem[]; totalCount: number }>(
      `/user?currentPage=${page}&pageSize=${pageSize}`
    ).then(r => r.data),

  setBlock: (id: string, block: boolean) =>
    loginApi.patch(`/user/${id}/block`, { block }),
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
};
