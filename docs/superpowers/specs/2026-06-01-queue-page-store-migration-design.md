# Design: QueuePage → useJobsStore + FFmpeg Dev Fix

**Data:** 2026-06-01  
**Sessão:** 52  
**Estado:** Aprovado

---

## Problema

O `QueuePage` ("menu Fila") não mostra jobs submetidos via `BatchSubmitModal` de forma consistente durante o processamento.

**Causa-raiz:** `QueuePage` mantém estado local próprio (`useState<Job[]>`) e faz fetch independente via `invoke('list_jobs')`. O resto da app (`DashboardPage`, `AssetDetailPage`) usa o `useJobsStore` partilhado que é alimentado em tempo real. Esta divergência cria uma janela onde o job existe no store (visível no Dashboard e no Histórico do asset) mas não no estado local do `QueuePage`.

**Segundo bug (dev mode):** O script `download-media-binaries.js` usa um URL `latest/download/` do BtbN que redireciona para uma release com nome de ficheiro diferente do esperado → HTTP 404 → `spawn UNKNOWN` no sidecar (ffprobe não encontrado).

---

## Abordagem

Migrar `QueuePage` para ler do `useJobsStore` (single source of truth), eliminando o estado local de jobs e os listeners/intervals duplicados. Corrigir o script de download do FFmpeg.

---

## Alterações

### 1. `src/store/jobs.ts`

Adicionar `filename` ao interface `Job`:

```typescript
export interface Job {
  // ... campos existentes ...
  filename?: string | null; // retornado pelo backend via LEFT JOIN assets
}
```

O backend já retorna este campo em `list_jobs` (via `a.filename` em `COLS`). O `useJobStatus` já chama `list_jobs` no mount, por isso o store fica imediatamente populado com `filename`.

### 2. `src/pages/QueuePage.tsx`

**Remover:**

- `const [jobs, setJobs] = useState<Job[]>([])` — substituído pelo store
- Interface local `Job` (duplicada da do store)
- Toda a lógica da parte de jobs do `fetchData()` — `invoke('list_jobs')` e `setJobs`
- `listen('sidecar:event', () => fetchData())` — o `useJobStatus` em `App.tsx` já trata isto
- `setInterval(fetchData, 30000)` para jobs

**Adicionar:**

```typescript
import { useJobsStore, type Job } from '@/store/jobs';
// ...
const allJobs = useJobsStore((s) => s.jobs);
```

**Manter como estado local:**

- `QueueStats` — continua a ser buscado do backend (`get_queue_stats`) por accuracy em `doneToday`/`errorToday`
- `availableProfiles` — continua de `invoke('list_profiles')`

**Novo `fetchStats()`** (substituição parcial do `fetchData()`):

```typescript
const fetchStats = useCallback(async () => {
  const [statsData, profilesData] = await Promise.all([
    invoke<QueueStats>('get_queue_stats'),
    invoke<...>('list_profiles'),
  ]);
  setStats(statsData);
  setAvailableProfiles(profilesData);
}, []);
```

Chama `fetchStats()` no mount e após cada mutação.

**Após mutações (cancel, retry, approve, reject, reprocess):**

```typescript
// Refrescar store + stats
invoke<Job[]>('list_jobs').then(useJobsStore.getState().setJobs).catch(console.error);
fetchStats();
```

**Filtros (sem mudança):**

```typescript
const processingJobs = allJobs.filter((j) => j.status === 'processing');
const queuedJobs = allJobs.filter((j) => j.status === 'queued');
const quarantinedJobs = allJobs.filter((j) => j.status === 'qc_quarantined');
const finishedJobs = allJobs.filter((j) =>
  ['done', 'error', 'cancelled', 'qc_rejected'].includes(j.status),
);
```

### 3. `scripts/download-media-binaries.js`

**Problema:** `https://github.com/BtbN/FFmpeg-Builds/releases/latest/download/ffmpeg-master-latest-win64-gpl.zip` redireciona para uma release específica onde o ficheiro tem nome diferente → 404.

**Fix:** Usar a API GitHub Releases para obter o URL real do asset:

1. `GET https://api.github.com/repos/BtbN/FFmpeg-Builds/releases/latest`
2. Procurar em `assets[]` o que corresponde ao pattern `*-win64-gpl.zip` (ou equivalente para cada plataforma)
3. Usar `browser_download_url` desse asset
4. Fallback: se a API falhar (rate limit), tentar o URL estático original

---

## Fluxo após a fix

```
BatchSubmitModal.submit()
  → invoke('submit_job') → DB: status=queued
  → useJobsStore.addJob(job)          ← store actualizado imediatamente

  ↓ (2 segundos)

Rust queue worker
  → DB: status=processing
  → sidecar arranca
  → sidecar emite job:started
  → useJobStatus listener: updateJob(id, {status:'processing'})  ← store actualizado

Utilizador navega para "Fila"
  → QueuePage monta
  → lê useJobsStore.jobs              ← job já está lá (adicionado no addJob)
  → processingJobs tem o job          ← visível imediatamente ✓
  → fetchStats() → stats actualizados
```

---

## O que NÃO muda

- `useJobStatus.ts` — zero alterações
- Lógica de mutações (cancel, retry, approve, reject, reprocess) — mantém os invokes existentes
- Render do `QueuePage` — HTML/JSX inalterado
- `PipelineSummary` — recebe `allJobs` do store em vez do estado local
