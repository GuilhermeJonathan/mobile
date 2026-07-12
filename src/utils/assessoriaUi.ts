// Cores da assessoria conscientes de tema — os tons neon (#4ade80 etc.)
// funcionam no fundo escuro mas somem no modo claro.

export function scoreColor(score: number, isDark: boolean): string {
  if (isDark) {
    if (score >= 80) return '#4ade80';
    if (score >= 60) return '#a3e635';
    if (score >= 40) return '#fbbf24';
    return '#f87171';
  }
  if (score >= 80) return '#15803d';
  if (score >= 60) return '#4d7c0f';
  if (score >= 40) return '#b45309';
  return '#b91c1c';
}

export function statusRecColors(isDark: boolean) {
  return {
    pendente: isDark ? '#a78bfa' : '#6d28d9',
    aceita:   isDark ? '#4ade80' : '#15803d',
    recusada: isDark ? '#f87171' : '#b91c1c',
  };
}

/** Iniciais para o avatar fallback (ex: "Guilherme Silva" -> "GS") */
export function iniciais(nome: string | null | undefined): string {
  if (!nome) return '?';
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? '';
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return (primeira + ultima).toUpperCase() || '?';
}
