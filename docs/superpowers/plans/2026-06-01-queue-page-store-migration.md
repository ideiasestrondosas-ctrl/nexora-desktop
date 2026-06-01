# QueuePage → useJobsStore + FFmpeg Dev Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer o QueuePage ler do `useJobsStore` partilhado (em vez de estado local isolado) para que jobs submetidos apareçam imediatamente na aba "Fila", e corrigir o download de FFmpeg em dev mode.

**Architecture:** O `useJobsStore` (Zustand) é a single source of truth para jobs — alimentado no boot pelo `useJobStatus` hook e actualizado em tempo real via `sidecar:event`. O QueuePage passa a ler directamente deste store, eliminando o estado local e os listeners duplicados. Stats e profiles ficam em estado local (precisam de round-trip ao backend por accuracy).

**Tech Stack:** React 19 + TypeScript strict + Zustand (`useJobsStore`) + Tauri 2 `invoke` + Node.js ESM (script de download)

---

## File Map

| Ficheiro                             | Mudança                                                                                |
| ------------------------------------ | -------------------------------------------------------------------------------------- |
| `src/store/jobs.ts`                  | Adicionar `filename?: string \| null` ao interface `Job`                               |
| `src/pages/QueuePage.tsx`            | Remover estado local de jobs; usar `useJobsStore`; refactor `fetchData` → `fetchStats` |
| `scripts/download-media-binaries.js` | Usar GitHub API para obter URL real do asset BtbN                                      |

---

## Task 1: Adicionar `filename` ao interface `Job` do store

**Files:**

- Modify: `src/store/jobs.ts`

- [ ] **Step 1: Editar o interface `Job`**

Em `src/store/jobs.ts`, adicionar o campo `filename` no final do interface, antes do fecho `}`:

```typescript
export interface Job {
  id: string;
  asset_id: string;
  profile: string;
  status:
    | 'queued'
    | 'processing'
    | 'done'
    | 'error'
    | 'cancelled'
    | 'qc_quarantined'
    | 'qc_rejected';
  priority: number;
  progress: number;
  step: string | null;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  finished_at: string | null;
  error: string | null;
  output_path: string | null;
  vmaf_score: number | null;
  lufs: number | null;
  filename?: string | null;
}
```

O backend Rust já retorna este campo via `a.filename` no `LEFT JOIN assets` em `list_jobs`. O `useJobStatus` hook chama `list_jobs` no mount, portanto o store fica populado com `filename` desde o início.

- [ ] **Step 2: Verificar TypeScript**

```powershell
npm run typecheck
```

Esperado: zero erros. Se houver erros de tipo noutros ficheiros que usam `Job`, eles continuarão a funcionar porque o campo é `optional` (`?`).

- [ ] **Step 3: Commit**

```powershell
git add src/store/jobs.ts
git commit -m "feat(store): add filename field to Job interface"
```

---

## Task 2: Migrar QueuePage para `useJobsStore`

**Files:**

- Modify: `src/pages/QueuePage.tsx:27-143`

Esta task tem várias sub-etapas. Fazer todas antes de commitar.

- [ ] **Step 1: Remover a interface local `Job` e adicionar o import do store**

No topo de `src/pages/QueuePage.tsx`, substituir o bloco `interface Job { ... }` (linhas 27–49) e adicionar o import:

```typescript
import { useJobsStore, type Job } from '@/store/jobs';
```

A interface local é idêntica à do store (mais `filename`). Usar o tipo do store elimina a duplicação.

- [ ] **Step 2: Substituir o estado local de jobs pelo store**

Dentro do componente `QueuePage` (após `const { t, i18n } = useTranslation();`), substituir linha 101:

```typescript
// REMOVER:
const [jobs, setJobs] = useState<Job[]>([]);

// ADICIONAR:
const allJobs = useJobsStore((s) => s.jobs);
```

- [ ] **Step 3: Refactor `fetchData` → `fetchStats`**

Substituir o `fetchData` completo (linhas 115–128) por `fetchStats` que busca apenas stats e profiles:

```typescript
const fetchStats = useCallback(async () => {
  try {
    const [statsData, profilesData] = await Promise.all([
      invoke<QueueStats>('get_queue_stats'),
      invoke<{ id: string; name: string; label_friendly: string | null }[]>('list_profiles'),
    ]);
    setStats(statsData);
    setAvailableProfiles(profilesData);
  } catch (error) {
    console.error('Failed to fetch queue stats:', error);
  }
}, []);
```

- [ ] **Step 4: Remover o listener `sidecar:event` e simplificar o useEffect de mount**

Substituir os dois `useEffect` de linha 130–143:

```typescript
// REMOVER os dois useEffect existentes:
// useEffect(() => { fetchData(); setInterval(fetchData, 30000); ... }, [fetchData]);
// useEffect(() => { listen('sidecar:event', () => fetchData()); ... }, [fetchData]);

// SUBSTITUIR por um único useEffect:
useEffect(() => {
  fetchStats();
}, [fetchStats]);
```

O `useJobStatus` em `App.tsx` já trata o `sidecar:event` e actualiza o store. O `useJobsStore` é reactivo — o componente re-renderiza automaticamente quando o store muda. Não é necessário polling nem listener duplicado.

Se o import de `listen` estava só a ser usado aqui, removê-lo dos imports do topo do ficheiro.

- [ ] **Step 5: Actualizar os handlers de mutação**

Em cada handler, substituir `fetchData()` pela sequência:

```typescript
// Padrão a aplicar em handleCancel, handleRetry, handleReprocessWithProfile,
// handleApprove e handleReject — substituir cada `fetchData()` por:
invoke<Job[]>('list_jobs').then(useJobsStore.getState().setJobs).catch(console.error);
fetchStats();
```

Exemplo completo para `handleCancel`:

```typescript
const handleCancel = async (jobId: string) => {
  try {
    const ok = await invoke<boolean>('cancel_job', { id: jobId });
    if (!ok) {
      toast.warning(t('queue.cannotCancelState'));
    }
    invoke<Job[]>('list_jobs').then(useJobsStore.getState().setJobs).catch(console.error);
    fetchStats();
  } catch (error) {
    console.error('Failed to cancel job:', error);
  }
};
```

Aplicar o mesmo padrão a:

- `handleRetry` (substituir `fetchData()` no final do try)
- `handleReprocessWithProfile` (substituir `fetchData()` antes do `setReprocessPopover(null)`)
- `handleApprove` (substituir `fetchData()`)
- `handleReject` (substituir `fetchData()`)

- [ ] **Step 6: Actualizar os filtros e o `PipelineSummary`**

Substituir as 4 linhas de filtros (linhas 218–223):

```typescript
const processingJobs = allJobs.filter((j) => j.status === 'processing');
const queuedJobs = allJobs.filter((j) => j.status === 'queued');
const quarantinedJobs = allJobs.filter((j) => j.status === 'qc_quarantined');
const finishedJobs = allJobs.filter((j) =>
  ['done', 'error', 'cancelled', 'qc_rejected'].includes(j.status),
);
```

Procurar no JSX a referência a `<PipelineSummary jobs={jobs}` e mudar para `<PipelineSummary jobs={allJobs}`.

Procurar qualquer outra referência a `jobs` (sem prefixo `all`) no JSX ou lógica e substituir por `allJobs`.

- [ ] **Step 7: Verificar TypeScript**

```powershell
npm run typecheck
```

Esperado: zero erros. Erros comuns a resolver:

- `listen` still imported but not used → remover do import
- `useState` only used for stats/profiles/popover → manter; apenas o `Job[]` state foi removido
- `setJobs` referenced somewhere → substituir por `useJobsStore.getState().setJobs`

- [ ] **Step 8: Commit**

```powershell
git add src/pages/QueuePage.tsx
git commit -m "fix(queue): migrate QueuePage to useJobsStore — jobs now visible immediately after submission"
```

---

## Task 3: Corrigir download FFmpeg em dev mode

**Files:**

- Modify: `scripts/download-media-binaries.js:45-53` e `scripts/download-media-binaries.js:297-317`

O problema: o URL `releases/latest/download/ffmpeg-master-latest-win64-gpl.zip` redireciona para uma release específica (`autobuild-2026-06-01-15-02`) onde o ficheiro com esse nome não existe → HTTP 404. O BtbN mudou a convenção de nomes.

A fix: Usar a API GitHub para obter o URL real do asset mais recente que corresponda ao pattern esperado, com fallback para o URL estático original.

- [ ] **Step 1: Adicionar função `getBtbNAssetUrl`**

Após a função `httpGet` (linha ~84), adicionar:

```javascript
async function fetchJson(url) {
  return new Promise((resolve, reject) => {
    get(
      url,
      { headers: { 'User-Agent': 'nexora-desktop-build', Accept: 'application/json' } },
      (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          fetchJson(res.headers.location).then(resolve).catch(reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} para ${url}`));
          return;
        }
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(e);
          }
        });
      },
    ).on('error', reject);
  });
}

async function getBtbNAssetUrl(filePattern) {
  try {
    const release = await fetchJson(
      'https://api.github.com/repos/BtbN/FFmpeg-Builds/releases/latest',
    );
    const asset = (release.assets ?? []).find((a) => filePattern.test(a.name));
    return asset?.browser_download_url ?? null;
  } catch (e) {
    console.warn(`  ⚠ API GitHub falhou (${e.message}), a usar URL estático`);
    return null;
  }
}
```

- [ ] **Step 2: Actualizar os patterns de ficheiro BtbN**

Substituir o objecto `BTBN_BUNDLES` (linhas 49–54) para incluir um `pattern` regex:

```javascript
const BTBN_BUNDLES = {
  'win32-x64': {
    file: 'ffmpeg-master-latest-win64-gpl.zip',
    pattern: /ffmpeg-master-latest-win64-gpl.*\.zip$/,
    type: 'zip',
  },
  'win32-arm64': {
    file: 'ffmpeg-master-latest-win32-gpl.zip',
    pattern: /ffmpeg-master-latest-win32-gpl.*\.zip$/,
    type: 'zip',
  },
  'linux-x64': {
    file: 'ffmpeg-master-latest-linux64-gpl.tar.xz',
    pattern: /ffmpeg-master-latest-linux64-gpl.*\.tar\.xz$/,
    type: 'tar',
  },
  'linux-arm64': {
    file: 'ffmpeg-master-latest-linuxarm64-gpl.tar.xz',
    pattern: /ffmpeg-master-latest-linuxarm64-gpl.*\.tar\.xz$/,
    type: 'tar',
  },
};
```

- [ ] **Step 3: Actualizar a secção de download Windows/Linux**

Substituir o bloco de construção de `urls` e o loop de tentativas (linhas 297–317):

```javascript
// Tentar API GitHub primeiro para obter URL real do asset
const apiUrl = await getBtbNAssetUrl(bundle.pattern);
const urls = [apiUrl, `${BTBN}/${bundle.file}`].filter(Boolean);

let lastError;
let success = false;
for (const url of urls) {
  try {
    await downloadTo(url, archivePath);
    success = true;
    break;
  } catch (err) {
    lastError = err;
    console.warn(`  ⚠ Falha ao descarregar de ${url}: ${err.message}`);
  }
}

if (!success) {
  console.error(`\nErro fatal: ${lastError.message}`);
  process.exit(1);
}
```

Nota: a linha `throw lastError` original foi substituída por `console.error` + `process.exit(1)` para mensagem mais clara. O `if (!success) { throw lastError; }` na linha 315–317 original deve ser substituído.

- [ ] **Step 4: Testar o script**

```powershell
node scripts/download-media-binaries.js --platform win32 --arch x64
```

Esperado: descarrega e extrai FFmpeg/FFprobe para `src-tauri/binaries/`. Se os binários já existirem e estiverem válidos, o script do dev.ps1 não os re-descarrega (a verificação de "ausente ou corrompido" no dev.ps1 está antes deste script).

Se quiser forçar o re-download para testar, apagar temporariamente `src-tauri/binaries/ffmpeg-x86_64-pc-windows-msvc.exe` e re-correr.

- [ ] **Step 5: Commit**

```powershell
git add scripts/download-media-binaries.js
git commit -m "fix(scripts): use GitHub API to resolve BtbN FFmpeg asset URL"
```

---

## Verificação Final

- [ ] **Correr typecheck completo**

```powershell
npm run typecheck
```

Esperado: 0 erros.

- [ ] **Actualizar `.wip-session.md` e ficheiros de sessão**

Actualizar `SYNC-STATE.md`, `PROGRESS-DESKTOP.md` e `.wip-session.md` conforme as regras do CLAUDE.md.

- [ ] **Commit de sessão**

```powershell
git add SYNC-STATE.md PROGRESS-DESKTOP.md .wip-session.md
git commit -m "docs(session): actualizar SYNC-STATE sessao 52 — QueuePage store migration + FFmpeg fix"
```
