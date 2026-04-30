/**
 * Máscara de entrada para valor monetário (BRL).
 * Trata dígitos como centavos: "41500" → "415,00"
 * Permite apagar normalmente.
 */
export function maskBRL(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  const cents = parseInt(digits, 10);
  return (cents / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Converte uma string de valor monetário para number, assumindo pt-BR.
 * Regras:
 *   - Vírgula é SEMPRE separador decimal: "12,50" → 12.50, "1.250,00" → 1250
 *   - Ponto com 1–2 dígitos depois é separador decimal: "12.50" → 12.50
 *   - Ponto com 3 dígitos depois é separador de milhar: "1.250" → 1250
 */
export function parseBRL(value: string): number {
  const s = value.trim();
  if (!s) return 0;

  // Tem vírgula → pt-BR: remove pontos de milhar, troca vírgula por ponto
  if (s.includes(',')) {
    return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0;
  }

  // Sem vírgula, mas tem ponto
  if (s.includes('.')) {
    const parts = s.split('.');
    const lastPart = parts[parts.length - 1];
    // "12.50" → decimal (≤ 2 dígitos após o ponto)
    if (lastPart.length <= 2) return parseFloat(s) || 0;
    // "1.250" → milhar (3 dígitos após o ponto) → remove o ponto
    return parseFloat(s.replace(/\./g, '')) || 0;
  }

  return parseFloat(s) || 0;
}

/**
 * Formata um número como moeda brasileira.
 * Ex: 11736.38  → "R$ 11.736,38"
 *     -1500     → "R$ -1.500,00"
 */
export function fmtBRL(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Formato compacto para gráficos (sem casas decimais quando >= 1000).
 * Ex: 11736 → "R$ 11,7k"  |  800 → "R$ 800"
 */
export function fmtBRLCompact(value: number): string {
  if (value >= 1_000_000)
    return `R$ ${(value / 1_000_000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`;
  if (value >= 1_000)
    return `R$ ${(value / 1_000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}k`;
  return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}
