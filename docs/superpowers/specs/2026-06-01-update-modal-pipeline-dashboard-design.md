# Design: Update Modal UI + Pipeline Notes + Dashboard Jobs

**Data:** 2026-06-01  
**Estado:** Aprovado  
**Âmbito:** 3 bugfixes independentes em `src/`, `scripts/`, `src-tauri/`

---

## Contexto

Três problemas reportados após release v0.31.2-beta.1:

1. O popup de actualização mostra `"Ver CHANGELOG.md para detalhes das alterações."` em vez das notas reais, e a área de notas é demasiado pequena.
2. O sync.ps1 opção 6 completa o pipeline mas o `latest.json` fica com texto de fallback.
3. Após arrastar um vídeo e submeter, o job não aparece no dashboard (só na biblioteca).

---

## Fix 1 — Update Modal UI

### Problema

`src/components/UpdateModal.tsx` linha 118:

```tsx
<div className="... max-h-40 overflow-y-auto whitespace-pre-wrap ...">{update.body}</div>
```

- `max-h-40` (160px) limita a visibilidade para ~4 linhas.
- `whitespace-pre-wrap` mostra `### Header` e `- item` como texto bruto.
- `w-[480px]` é estreito para notas com tabelas.

### Solução

- Dialog: `w-[480px]` → `w-[560px]`
- Área de notas: `max-h-40` → `max-h-64` (256px, ~8-10 linhas)
- Substituir `whitespace-pre-wrap` por renderização de markdown inline (sem dependências novas):
  - `## Header` e `### Header` → `<p className="font-bold text-text-primary mt-2">`
  - `- item` → `<li className="ml-3 list-disc">`
  - linhas normais → `<p>`

O parser cobre os 3 padrões que o sync.ps1 gera. Texto que não casa com nenhum padrão é renderizado como parágrafo.

### Ficheiro alterado

- `src/components/UpdateModal.tsx`

---

## Fix 2 — Pipeline: notas corretas no `latest.json`

### Problema

`scripts/ci-generate-updater-json.mjs` lê o CHANGELOG.md para extrair notas:

```js
let notes = 'Ver CHANGELOG.md para detalhes das alterações.';
const extracted = extractChangelogSection(changelog, version);
if (extracted) {
  notes = extracted;
}
```

O CHANGELOG.md para `[0.31.2-beta.1]` tem entrada vazia (só cabeçalho, sem conteúdo). `extracted` é null → fallback activado.

O ficheiro `release-notes-v0.31.2-beta.1.md` existe no repo com 5 alterações correctas, mas o script não o consulta.

**Timeline do problema:**

1. sync.ps1 opção 6 cria tag + push → CI inicia
2. CI executa `generate-updater-json` → CHANGELOG vazio → `latest.json` com fallback
3. CI carrega `latest.json` errado para a release
4. sync.ps1 opção 4 actualiza o corpo da GitHub Release — mas o `latest.json` já foi carregado

### Solução

**Parte A — `ci-generate-updater-json.mjs`:** Adicionar fallback que lê `release-notes-v{tag}.md` se o CHANGELOG não tiver conteúdo.

```js
// Prioridade 1: CHANGELOG.md
let notes = 'Ver CHANGELOG.md para detalhes das alterações.';
const extracted = extractChangelogSection(changelog, version);
if (extracted) {
  notes = extracted.length > 500 ? extracted.substring(0, 497) + '...' : extracted;
} else {
  // Prioridade 2: release-notes-v{tag}.md gerado pelo sync.ps1
  try {
    const releaseNotesPath = `release-notes-v${tag}.md`;
    if (existsSync(releaseNotesPath)) {
      const releaseNotes = readFileSync(releaseNotesPath, 'utf8');
      // Remover secção de instaladores (começa em "---")
      const mainContent = releaseNotes.split('\n---\n')[0].trim();
      if (mainContent) {
        notes = mainContent.length > 500 ? mainContent.substring(0, 497) + '...' : mainContent;
      }
    }
  } catch {
    /* silencioso */
  }
}
```

**Parte B — CHANGELOG.md:** Adicionar o conteúdo correcto à entrada `[0.31.2-beta.1]` (copiar do `release-notes-v0.31.2-beta.1.md`).

```markdown
## [0.31.2-beta.1] - 2026-06-01

### Added

- opcao 6 pipeline completo automatico + aviso actions deprecadas (v1.3.0)

### Fixed

- windows-latest -> windows-2025 (redireccao forcada 15 Jun 2026)
- actualizar GitHub Actions v4->v5 (Node.js 24, deadline 16 Jun 2026)

### Infrastructure

- 2: Corrigir falhas de CI (clippy + Actions deprecadas + runner obsoleto)
- chore(release): v0.31.2-beta.1
```

### Ficheiros alterados

- `scripts/ci-generate-updater-json.mjs`
- `CHANGELOG.md`

---

## Fix 3 — Dashboard: jobs aparecem após drag-drop

### Problema

`src/pages/DashboardPage.tsx` mantém o seu próprio estado de jobs com `invoke('list_jobs')` em `fetchData()`. Se este invoke falhar (por ex. contenção na DB durante processamento), o erro é silenciado e `setAllJobs` nunca é chamado — dashboard fica sem jobs.

Adicionalmente, quando o utilizador submete via BatchSubmitModal e o `onComplete` navega para a biblioteca, o DashboardPage desmonta. O `sidecar:event` listener do dashboard deixa de escutar. Quando o utilizador volta ao dashboard, monta e faz fetch — mas o job novo **nunca foi adicionado ao `useJobsStore`**, por isso mesmo que o fetch falhe não há fallback.

### Solução

**Parte A — DashboardPage lê de `useJobsStore`:**

O `useJobStatus()` em `App.tsx` já mantém `useJobsStore` sincronizado globalmente (inicial + eventos sidecar + polling 30s). O dashboard deve ler daí em vez de duplicar o invoke.

Substituir em `DashboardPage`:

```ts
const [allJobs, setAllJobs] = useState<Job[]>([]);
// e invoke<Job[]>('list_jobs') dentro de fetchData
```

Por:

```ts
const allJobs = useJobsStore((s) => s.jobs);
```

`fetchData` mantém apenas `invoke('get_stats')` e `invoke('list_assets_slim')` (que não têm equivalente no store).

Remover o `useEffect` com `listen('sidecar:event', () => fetchData())` do DashboardPage — é duplicado do listener em `useJobStatus` (App.tsx). O dashboard já recebe as actualizações via store.

**Parte B — BatchSubmitModal adiciona job ao store:**

Em `src/components/BatchSubmitModal.tsx`, `handleSubmitAll`, após `submit_job` ter sucesso:

```ts
const job = await invoke<Job>('submit_job', { ... });
useJobsStore.getState().addJob(job);
```

O `Job` type de `BatchSubmitModal` precisa de importar ou redefinir o tipo compatible com `useJobsStore`.

**Parte C — Tipo `Job` em `useJobsStore`:**

Adicionar `qc_quarantined` e `qc_rejected` ao union type (estão no backend mas não no store):

```ts
status: 'queued' | 'processing' | 'done' | 'error' | 'cancelled' | 'qc_quarantined' | 'qc_rejected';
```

### Ficheiros alterados

- `src/pages/DashboardPage.tsx`
- `src/components/BatchSubmitModal.tsx`
- `src/store/jobs.ts`

---

## Resumo de Ficheiros

| Ficheiro                               | Fix                                |
| -------------------------------------- | ---------------------------------- |
| `src/components/UpdateModal.tsx`       | Fix 1: tamanho + markdown          |
| `scripts/ci-generate-updater-json.mjs` | Fix 2: fallback release-notes file |
| `CHANGELOG.md`                         | Fix 2: preencher entrada v0.31.2   |
| `src/pages/DashboardPage.tsx`          | Fix 3: usar useJobsStore           |
| `src/components/BatchSubmitModal.tsx`  | Fix 3: addJob após submit          |
| `src/store/jobs.ts`                    | Fix 3: tipos de status completos   |

---

## Critérios de Verificação

- **Fix 1**: Popup mostra headers em bold, itens como bullets, sem truncagem para notas de 5-10 itens
- **Fix 2**: Após próxima release com sync.ps1 opção 3/6, o popup de actualização mostra as notas reais (não o texto de fallback)
- **Fix 3**: Após arrastar vídeo + submeter, navegar para dashboard mostra o job como `queued`/`processing` imediatamente

---

## Fora de Âmbito

- Não alterar a lógica de transcodificação
- Não mudar o fluxo de navegação após submit (continua a ir para biblioteca)
- Não adicionar `react-markdown` como dependência
