export enum TipoLancamento {
  Credito = 1,
  Debito = 2,
  Pix = 3,
}

export enum SituacaoLancamento {
  Recebido = 1,
  Pago = 2,
  AReceber = 3,
  AVencer = 4,
  Vencido = 5,
}

export interface Lancamento {
  id: string;
  descricao: string;
  data: string;
  valor: number;
  tipo: TipoLancamento;
  situacao: SituacaoLancamento;
  mes: number;
  ano: number;
  categoriaId?: string;
  categoriaNome?: string;
  cartaoId?: string;
  cartaoNome?: string;
  cartaoDiaVencimento?: number;
  parcelaAtual?: number;
  totalParcelas?: number;
  grupoParcelas?: string;
  // Receita recorrente
  receitaRecorrenteId?: string;
  receitaTipo?: TipoReceita;
  receitaValorHora?: number;
  receitaQuantidadeHoras?: number;
  // Recorrente
  isRecorrente?: boolean;
  // Conta bancária
  contaBancariaId?: string;
  contaBancariaNome?: string;
  // Pagamento
  dataPagamento?: string;
  // Autoria
  criadoPorId?: string;
  criadoPorNome?: string;
}

export enum TipoConta {
  ContaCorrente = 1,
  ContaPoupanca = 2,
  Carteira      = 3,
  Investimento  = 4,
}

export interface SaldoConta {
  id: string;
  banco: string;
  saldo: number;
  tipo: TipoConta;
  dataAtualizacao: string;
}

export interface Dashboard {
  mes: number;
  ano: number;
  totalCreditos: number;
  totalDebitos: number;
  saldo: number;
  resumoDebitos: { categoria: string; total: number }[];
  variacaoCreditos: number | null;
  variacaoDebitos: number | null;
  variacaoSaldo: number | null;
  diasReserva: number | null;
  comprometimentoRenda: number | null;
}

export interface Categoria {
  id: string;
  nome: string;
  tipo: TipoLancamento;
}

export interface CartaoCredito {
  id: string;
  nome: string;
  diaVencimento?: number;
  totalMes: number;
  lancamentos: CartaoLancamento[];
}

export interface CartaoLancamento {
  id: string;
  descricao: string;
  valor: number;
  data: string;
  situacao: SituacaoLancamento;
  parcelaAtual?: number;
  totalParcelas?: number;
  categoriaNome?: string;
}

export interface HorasTrabalhadas {
  id: string;
  descricao: string;
  valorHora: number;
  quantidade: number;
  valorTotal: number;
  mes: number;
  ano: number;
}

export enum TipoReceita {
  Fixo = 1,
  Horista = 2,
}

export interface ReceitaRecorrente {
  id: string;
  nome: string;
  tipo: TipoReceita;
  valor: number;
  valorHora?: number;
  quantidadeHoras?: number;
  dia: number;
  dataInicio: string;
}
