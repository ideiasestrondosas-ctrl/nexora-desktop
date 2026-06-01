# Real-Time UI — Queue Pill, Dynamic AssetDetail, Modal Backgrounds

**Data:** 2026-05-31  
**Status:** Aprovado

---

## Requisitos

1. **TopBar Queue Pill** — indicador compacto de estado da fila, sempre visível, sem navegar para a Queue page
2. **AssetDetailPage reactivo** — job history e metadata do vídeo actualizam em tempo real quando um job está em curso
3. **Modal backgrounds** — IngestProfileModal e BatchSubmitModal com `bg-bg-primary` (mesmo padrão de BugReportModal/HelpModal)

---

## Design

### 1. TopBar Queue Pill

**Localização:** entre o bloco de métricas circulares e o botão BugReport (TopBar.tsx).

**Estado activo** (jobs com `status === 'processing' | 'queued'`):

```
● 1 em curso · 4 ✓
```

- Dot azul pulsante + "X em curso" (azul) + separador · + "Y ✓" (verde)
- Container: `bg-bg-secondary border border-border rounded-full px-3 py-1 flex items-center gap-2`

**Estado inactivo** (nenhum job activo):

```
● Pronto · 4 ✓
```

- Dot cinzento + "Pronto" (text-muted) + separador · + "Y ✓" (verde, persiste da sessão)
- Quando `done === 0`: mostra apenas `● Pronto` sem separador

**Data source:** `useJobsStore(s => s.jobs)` — já populado globalmente pelo `useJobStatus` em App.tsx. Sem IPC extra, sem polling.

**Cálculo:**

```ts
const active = jobs.filter((j) => j.status === 'processing' || j.status === 'queued').length;
const done = jobs.filter((j) => j.status === 'done').length;
```

Não é clicável — informativo apenas.

---

### 2. AssetDetailPage — Reactividade

**Problema:** `jobs` é estado local (`useState<Job[]>`) carregado uma vez em `fetchData()`. Não actualiza quando o store muda.

**Fix — Job list:**

- Remover `const [jobs, setJobs] = useState<Job[]>([])`
- Substituir por `const jobs = useJobsStore(s => s.jobs.filter(j => j.asset_id === assetId))`
- Remover `invoke<Job[]>('list_jobs', { assetId })` do `Promise.all` em `fetchData` (redundante — `useJobStatus` já carrega todos os jobs ao montar)
- Remover `setJobs(jobsData)` de `fetchData`

**Fix — Metadata reactiva:**

- Adicionar `useEffect` que re-invoca `get_asset` sempre que `jobs` muda (jobs para este asset só mudam quando o sidecar emite um evento)
- Actualiza `asset` (VMAF, output_path, codec info, etc.) sem necessidade de recarregar a página

**O que não muda:** renderização da tab Histórico, tab Análise, tab QC — apenas a fonte de dados passa a ser reactiva.

---

### 3. Modal Backgrounds

**IngestProfileModal.tsx** linha 211: `glass-surface` → `bg-bg-primary`  
**BatchSubmitModal.tsx** linha 297: `glass-surface` → `bg-bg-primary`

Dropdowns internos com `glass-surface` (overlays pequenos) ficam como estão.

---

## Ficheiros Alterados

| Ficheiro                                | Alteração                                                |
| --------------------------------------- | -------------------------------------------------------- |
| `src/components/TopBar.tsx`             | Adicionar `QueuePill` inline + import `useJobsStore`     |
| `src/pages/AssetDetailPage.tsx`         | `jobs` de store reactivo + `useEffect` metadata re-fetch |
| `src/components/IngestProfileModal.tsx` | container `glass-surface` → `bg-bg-primary`              |
| `src/components/BatchSubmitModal.tsx`   | container `glass-surface` → `bg-bg-primary`              |
