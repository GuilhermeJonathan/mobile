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
