# Real-Time UI — Queue Pill, Dynamic AssetDetail, Modal Backgrounds — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar indicador de fila em tempo real no TopBar, tornar o AssetDetailPage reactivo a eventos de jobs, e corrigir background dos modais IngestProfileModal e BatchSubmitModal.

**Architecture:** O `useJobsStore` (Zustand) já é populado globalmente pelo `useJobStatus` hook montado em App.tsx que escuta eventos Tauri do sidecar. Os novos componentes apenas lêem este store — zero IPC extra, zero polling. O AssetDetailPage substitui estado local por subscrição reactiva ao store.

**Tech Stack:** React 19, TypeScript, Zustand (`useJobsStore` em `src/store/jobs.ts`), Tailwind CSS, Tauri 2 IPC (`invoke`)

---

## File Map

| Ficheiro                                | O quê                                                                            |
| --------------------------------------- | -------------------------------------------------------------------------------- |
| `src/components/TopBar.tsx`             | Adicionar `QueuePill` inline (novo sub-componente) + import `useJobsStore`       |
| `src/pages/AssetDetailPage.tsx`         | Substituir `[jobs, setJobs]` state por store subscription + `useEffect` metadata |
| `src/components/IngestProfileModal.tsx` | Linha 211: `glass-surface` → `bg-bg-primary`                                     |
| `src/components/BatchSubmitModal.tsx`   | Linha 297: `glass-surface` → `bg-bg-primary`                                     |

---

## Task 1: TopBar — QueuePill

**Files:**

- Modify: `src/components/TopBar.tsx`

### Contexto

O TopBar actual tem esta estrutura:

```tsx
<div data-topbar className="h-16 bg-bg-primary border-b border-border flex items-center justify-between px-6 shrink-0 z-40">
  {/* Título */}
  <div data-tauri-drag-region className="flex-1 ...">...</div>

  {/* Métricas circulares */}
  <div className="hidden md:flex items-center gap-6 mr-5">
    <CircularGauge ... /> {/* CPU, RAM, GPU, Disk */}
  </div>

  {/* Botão Bug */}
  {onBugReport && <button onClick={onBugReport}>...</button>}

  {/* Botão Help */}
  {onHelpOpen && <button onClick={onHelpOpen}>...</button>}

  {/* Botão Sair */}
  <button onClick={() => invoke('exit_app')}>...</button>
</div>
```

O `QueuePill` vai entre o bloco de métricas e o botão BugReport.

- [ ] **Step 1: Adicionar import do useJobsStore no TopBar**

Em `src/components/TopBar.tsx`, localizar os imports existentes (área que inclui imports de stores/hooks) e adicionar:

```ts
import { useJobsStore } from '@/store/jobs';
```

- [ ] **Step 2: Criar sub-componente QueuePill dentro do TopBar.tsx**

Antes da função `TopBar` (ou logo após os imports), adicionar:

```tsx
function QueuePill() {
  const jobs = useJobsStore((s) => s.jobs);
  const active = jobs.filter((j) => j.status === 'processing' || j.status === 'queued').length;
  const done = jobs.filter((j) => j.status === 'done').length;
  const isActive = active > 0;

  return (
    <div className="hidden md:flex items-center gap-1.5 bg-bg-secondary border border-border rounded-full px-3 py-1 text-xs select-none mr-3">
      {/* Dot: azul pulsante quando activo, cinzento quando inactivo */}
      <span
        className={
          isActive
            ? 'inline-block w-2 h-2 rounded-full bg-blue-500 animate-pulse'
            : 'inline-block w-2 h-2 rounded-full bg-text-muted/40'
        }
      />
      {isActive ? (
        <span className="text-blue-400 font-semibold">{active} em curso</span>
      ) : (
        <span className="text-text-muted font-medium">Pronto</span>
      )}
      {done > 0 && (
        <>
          <span className="text-text-muted/40">·</span>
          <span className="text-green-500 font-semibold">{done} ✓</span>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Inserir `<QueuePill />` no JSX do TopBar**

Localizar o bloco das métricas circulares e o botão BugReport. Inserir `<QueuePill />` entre eles:

```tsx
      {/* Métricas circulares */}
      <div className="hidden md:flex items-center gap-6 mr-5">
        <CircularGauge value={cpuPercent} label={t('topbar.cpu')} icon={Cpu} colorClass="text-brand" />
        <CircularGauge value={memPercent} label={t('topbar.ram')} icon={MemoryStick} colorClass="text-green-500" />
        <CircularGauge value={gpuPercent} label={t('topbar.gpu')} icon={Monitor} colorClass="text-purple-500" />
        <CircularGauge value={diskPercent} label={t('topbar.disk')} icon={HardDrive} colorClass="text-yellow-500" />
      </div>

      {/* Queue Pill — NOVO */}
      <QueuePill />

      {/* Botão Report Bug */}
      {onBugReport && (
```

- [ ] **Step 4: Verificar TypeScript**

```bash
npm run typecheck
```

Esperado: sem erros.

- [ ] **Step 5: Commit**

```bash
git add src/components/TopBar.tsx
git commit -m "feat(topbar): QueuePill -- indicador de fila em tempo real (dot azul pulsante + contagem)"
```

---

## Task 2: AssetDetailPage — Jobs Reactivos

**Files:**

- Modify: `src/pages/AssetDetailPage.tsx`

### Contexto

Actualmente (linha 99):

```ts
const [jobs, setJobs] = useState<Job[]>([]);
```

Em `fetchData()` (linha ~127):

```ts
const [assetData, jobsData] = await Promise.all([
  invoke<Asset | null>('get_asset', { id: assetId }),
  invoke<Job[]>('list_jobs', { assetId }), // ← remover
]);
// ...
setJobs(jobsData); // ← remover
```

O `useJobsStore` já está importado (linha 35) e usado para `removeJobsByAsset`.

- [ ] **Step 1: Substituir estado local por subscrição ao store**

Localizar linha 99 com `const [jobs, setJobs] = useState<Job[]>([]);` e substituir por:

```ts
// Substituição: jobs derivados do store global (reactivo a eventos sidecar)
const jobs = useJobsStore((s) => s.jobs.filter((j) => j.asset_id === assetId));
```

- [ ] **Step 2: Remover list_jobs do fetchData**

Localizar o `Promise.all` dentro de `fetchData` (linha ~130). Remover a linha `invoke<Job[]>('list_jobs', { assetId })` e ajustar a desestruturação. Ficará apenas:

```ts
const fetchData = useCallback(async () => {
  try {
    const assetData = await invoke<Asset | null>('get_asset', { id: assetId });
    // ... (tudo o resto que estava no Promise.all exceto list_jobs)
    setAsset(assetData);
    // setJobs(jobsData)  ← linha a remover completamente
  } catch (e) {
    console.error('fetchData failed', e);
  }
}, [assetId]);
```

> **Nota:** O `Promise.all` original tinha `[assetData, jobsData]`. Após remover `list_jobs`, simplificar para `await invoke(...)` directo se só restar um item, ou manter `Promise.all` se houver mais invocações.

- [ ] **Step 3: Remover useState de jobs do array de dependências**

Procurar qualquer referência a `setJobs` que tenha ficado no código e remover. Verificar também se `jobs` aparece no array `deps` de algum `useCallback`/`useEffect` — não é necessário porque agora `jobs` vem do store (Zustand é reactivo por natureza).

- [ ] **Step 4: Adicionar useEffect para re-fetch de metadata quando jobs mudam**

Após o `useEffect` que chama `fetchData()` (linha ~145), adicionar:

```ts
// Re-fetch asset metadata quando o estado dos jobs deste asset muda
// (actualiza VMAF, output_path, codec info sem sair da página)
useEffect(() => {
  if (jobs.length === 0) return;
  invoke<Asset | null>('get_asset', { id: assetId })
    .then((a) => {
      if (a) setAsset(a);
    })
    .catch(() => {});
}, [jobs, assetId]);
```

- [ ] **Step 5: Verificar TypeScript**

```bash
npm run typecheck
```

Esperado: sem erros. Se TypeScript reclamar que `setJobs` não existe, confirmar que foi removido completamente.

- [ ] **Step 6: Commit**

```bash
git add src/pages/AssetDetailPage.tsx
git commit -m "feat(asset-detail): jobs e metadata reactivos via useJobsStore -- actualiza em tempo real"
```

---

## Task 3: Fix Background dos Modais (IngestProfileModal + BatchSubmitModal)

**Files:**

- Modify: `src/components/IngestProfileModal.tsx`
- Modify: `src/components/BatchSubmitModal.tsx`

### Contexto

Ambos os modais usam `glass-surface` no container raiz, que fica transparente sem Mica activo (dev mode, Windows 10, Linux). O padrão correcto é `bg-bg-primary` como no BugReportModal e HelpModal.

- [ ] **Step 1: Corrigir IngestProfileModal**

Em `src/components/IngestProfileModal.tsx`, localizar o container principal do modal (linha ~209-212). A classe actual é:

```tsx
className={cn(
  'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50',
  'w-full max-w-lg glass-surface border border-border rounded-2xl shadow-2xl',
  ...
)}
```

Substituir `glass-surface` por `bg-bg-primary`:

```tsx
className={cn(
  'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50',
  'w-full max-w-lg bg-bg-primary border border-border rounded-2xl shadow-2xl',
  ...
)}
```

- [ ] **Step 2: Corrigir BatchSubmitModal**

Em `src/components/BatchSubmitModal.tsx`, localizar o container principal (linha ~295-298). A classe actual é:

```tsx
className={cn(
  'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50',
  'w-full max-w-2xl glass-surface border border-border rounded-2xl shadow-2xl',
  ...
)}
```

Substituir `glass-surface` por `bg-bg-primary`:

```tsx
className={cn(
  'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50',
  'w-full max-w-2xl bg-bg-primary border border-border rounded-2xl shadow-2xl',
  ...
)}
```

> **Nota:** Os `glass-surface` nos dropdowns internos (ProfileDropdown portal, linha ~134 e ~346) ficam como estão — são overlays flutuantes pequenos onde o efeito glass é adequado e correcto.

- [ ] **Step 3: Verificar TypeScript**

```bash
npm run typecheck
```

Esperado: sem erros (são mudanças de string CSS, sem impacto em tipos).

- [ ] **Step 4: Commit**

```bash
git add src/components/IngestProfileModal.tsx src/components/BatchSubmitModal.tsx
git commit -m "fix(modals): glass-surface -> bg-bg-primary em IngestProfileModal e BatchSubmitModal"
```

---

## Self-Review

**Spec coverage:**

- [x] TopBar pill activo (dot azul, "X em curso", "Y ✓") → Task 1 Step 2
- [x] TopBar pill inactivo ("Pronto", cinzento, persiste ✓) → Task 1 Step 2
- [x] Pill sem IPC extra (lê store existente) → Task 1 (sem invoke)
- [x] AssetDetailPage jobs reactivos → Task 2 Steps 1-3
- [x] Metadata re-fetch quando job muda → Task 2 Step 4
- [x] IngestProfileModal glass-surface fix → Task 3 Step 1
- [x] BatchSubmitModal glass-surface fix → Task 3 Step 2
- [x] Dropdowns internos não alterados → Task 3 nota

**Placeholders:** nenhum.

**Consistência de tipos:** `useJobsStore(s => s.jobs.filter(...))` retorna `Job[]` — mesmo tipo que o `useState<Job[]>` anterior. Compatível com todo o código que consome `jobs`.
