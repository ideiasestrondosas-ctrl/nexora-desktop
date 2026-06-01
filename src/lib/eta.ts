/**
 * Formata milissegundos em string legível: "6min 20s", "45s", "< 1s"
 */
export function formatEtaMs(ms: number): string {
  if (ms < 1000) return '< 1s';
  const totalSecs = Math.round(ms / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  if (mins === 0) return `${secs}s`;
  if (secs === 0) return `${mins}min`;
  return `${mins}min ${secs}s`;
}
