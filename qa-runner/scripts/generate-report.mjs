import fs from 'node:fs';
import path from 'node:path';
import { summarizeDurations } from './collect-metrics.mjs';

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function statusClass(status) {
  if (status === 'pass') return 'pass';
  if (status === 'fail') return 'fail';
  if (status === 'warning') return 'warning';
  return 'skip';
}

export function buildStats(run) {
  const counts = { pass: 0, fail: 0, warning: 0, skip: 0 };
  for (const test of run.tests) counts[test.status] = (counts[test.status] || 0) + 1;
  const durationStats = summarizeDurations(run.tests);
  return {
    runId: run.runId,
    suite: run.suite,
    status: counts.fail > 0 ? 'fail' : counts.warning > 0 ? 'warning' : 'pass',
    counts,
    durationStats,
    videos: run.videos,
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
    totalDurationMs: run.totalDurationMs,
  };
}

export function writeReports(runDir, run) {
  const stats = buildStats(run);
  const reportJson = { ...run, stats };
  fs.writeFileSync(path.join(runDir, 'report.json'), JSON.stringify(reportJson, null, 2), 'utf8');
  fs.writeFileSync(path.join(runDir, 'stats.json'), JSON.stringify(stats, null, 2), 'utf8');

  const md = [
    `# Nexora QA Runner — ${run.suiteLabel}`,
    '',
    `- Run ID: ${run.runId}`,
    `- Estado: ${stats.status.toUpperCase()}`,
    `- Inicio: ${run.startedAt}`,
    `- Fim: ${run.finishedAt}`,
    `- Duracao: ${run.totalDurationMs}ms`,
    `- Videos encontrados: ${run.videos.found}`,
    `- Copias QA criadas: ${run.videos.copied}`,
    '',
    '## Resultados',
    '',
    '| Teste | Estado | Duracao | Esperado | Obtido | Evidencia |',
    '| --- | --- | ---: | --- | --- | --- |',
    ...run.tests.map(
      (t) =>
        `| ${t.name} | ${t.status} | ${t.durationMs}ms | ${t.expected} | ${t.actual} | ${t.evidence || '-'} |`,
    ),
    '',
    '## Estatisticas',
    '',
    `- Pass: ${stats.counts.pass}`,
    `- Warning: ${stats.counts.warning}`,
    `- Fail: ${stats.counts.fail}`,
    `- Skip: ${stats.counts.skip}`,
    `- Media: ${stats.durationStats.avgMs}ms`,
    `- p90: ${stats.durationStats.p90Ms}ms`,
    `- p95: ${stats.durationStats.p95Ms}ms`,
    '',
    '## Proximo Passo',
    '',
    stats.status === 'pass'
      ? 'O runner concluiu sem falhas. Use este relatorio como evidencia da execucao.'
      : 'Abra `ai-handoff.md` e entregue a uma IA/programador com `report.json` e `logs/test-run.log`.',
    '',
  ].join('\n');
  fs.writeFileSync(path.join(runDir, 'report.md'), md, 'utf8');

  const failing = run.tests.filter((t) => t.status === 'fail' || t.status === 'warning');
  const handoff = [
    '# Handoff para IA — Nexora QA Runner',
    '',
    `Suite: ${run.suiteLabel}`,
    `Estado geral: ${stats.status.toUpperCase()}`,
    `Run: ${run.runId}`,
    '',
    '## Problemas e avisos',
    '',
    failing.length === 0
      ? '- Nenhum problema automatico encontrado nesta execucao.'
      : failing
          .map(
            (t) =>
              `- ${t.status.toUpperCase()}: ${t.name}\n  Esperado: ${t.expected}\n  Obtido: ${t.actual}\n  Area provavel: ${t.area || 'qa-runner'}\n  Evidencia: ${t.evidence || 'logs/test-run.log'}`,
          )
          .join('\n'),
    '',
    '## Artefactos',
    '',
    '- `report.json` para dados estruturados.',
    '- `report.md` para leitura humana.',
    '- `metrics.csv` para dados temporais.',
    '- `logs/test-run.log` para passos executados.',
    '',
  ].join('\n');
  fs.writeFileSync(path.join(runDir, 'ai-handoff.md'), handoff, 'utf8');

  const rows = run.tests
    .map(
      (t) => `<tr class="${statusClass(t.status)}"><td>${escapeHtml(t.name)}</td><td>${escapeHtml(
        t.status,
      )}</td><td>${t.durationMs}ms</td><td>${escapeHtml(t.expected)}</td><td>${escapeHtml(
        t.actual,
      )}</td><td>${escapeHtml(t.evidence || '-')}</td></tr>`,
    )
    .join('\n');
  const html = `<!doctype html>
<html lang="pt">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Nexora QA Runner — ${escapeHtml(run.suiteLabel)}</title>
  <style>
    body { font-family: Segoe UI, Arial, sans-serif; margin: 0; background: #111827; color: #e5e7eb; }
    header { padding: 28px 36px; background: #0f172a; border-bottom: 1px solid #334155; }
    main { padding: 28px 36px; }
    .badge { display: inline-block; padding: 6px 12px; border-radius: 999px; font-weight: 700; text-transform: uppercase; }
    .pass .badge, .badge.pass { background: #14532d; color: #bbf7d0; }
    .warning .badge, .badge.warning { background: #713f12; color: #fde68a; }
    .fail .badge, .badge.fail { background: #7f1d1d; color: #fecaca; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin: 22px 0; }
    .card { background: #1f2937; border: 1px solid #374151; border-radius: 8px; padding: 16px; }
    table { width: 100%; border-collapse: collapse; background: #1f2937; border-radius: 8px; overflow: hidden; }
    th, td { padding: 12px; border-bottom: 1px solid #374151; text-align: left; vertical-align: top; }
    th { background: #111827; color: #93c5fd; }
    tr.pass td:first-child { border-left: 4px solid #22c55e; }
    tr.warning td:first-child { border-left: 4px solid #f59e0b; }
    tr.fail td:first-child { border-left: 4px solid #ef4444; }
    code { color: #bfdbfe; }
  </style>
</head>
<body>
  <header>
    <h1>Nexora QA Runner</h1>
    <p>${escapeHtml(run.suiteLabel)} — <span class="badge ${stats.status}">${escapeHtml(stats.status)}</span></p>
  </header>
  <main>
    <section class="grid">
      <div class="card"><strong>Run ID</strong><br>${escapeHtml(run.runId)}</div>
      <div class="card"><strong>Duracao</strong><br>${run.totalDurationMs}ms</div>
      <div class="card"><strong>Pass</strong><br>${stats.counts.pass}</div>
      <div class="card"><strong>Avisos</strong><br>${stats.counts.warning}</div>
      <div class="card"><strong>Falhas</strong><br>${stats.counts.fail}</div>
      <div class="card"><strong>Videos QA</strong><br>${run.videos.copied}</div>
    </section>
    <h2>Resultados</h2>
    <table>
      <thead><tr><th>Teste</th><th>Estado</th><th>Duracao</th><th>Esperado</th><th>Obtido</th><th>Evidencia</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <h2>O que fazer agora</h2>
    <p>Para correcao assistida por IA, envie <code>ai-handoff.md</code>, <code>report.json</code> e <code>logs/test-run.log</code>.</p>
  </main>
</body>
</html>`;
  fs.writeFileSync(path.join(runDir, 'index.html'), html, 'utf8');
  return {
    html: path.join(runDir, 'index.html'),
    markdown: path.join(runDir, 'report.md'),
    json: path.join(runDir, 'report.json'),
    stats: path.join(runDir, 'stats.json'),
    handoff: path.join(runDir, 'ai-handoff.md'),
  };
}
