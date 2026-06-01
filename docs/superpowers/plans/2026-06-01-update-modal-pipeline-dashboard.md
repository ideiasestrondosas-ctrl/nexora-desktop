# Update Modal + Pipeline Notes + Dashboard Jobs — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 3 independent bugs — update modal too small / raw text notes, `latest.json` using fallback instead of real release notes, and dashboard not showing submitted jobs.

**Architecture:** Fix 1 adds an inline markdown renderer to `UpdateModal`. Fix 2 adds a fallback in `ci-generate-updater-json.mjs` to read `release-notes-v{tag}.md` when CHANGELOG is empty. Fix 3 wires `DashboardPage` to `useJobsStore` (already maintained globally by `useJobStatus`) and adds `addJob` after submit in `BatchSubmitModal`.

**Tech Stack:** React 19 + TypeScript strict + Zustand + Tauri 2.x + Node.js ESM

---

## File Map

| File                                   | Change                                                                                                   |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `src/store/jobs.ts`                    | Add `qc_quarantined` and `qc_rejected` to Job.status union                                               |
| `src/components/UpdateModal.tsx`       | Widen dialog, increase notes height, inline markdown renderer                                            |
| `scripts/ci-generate-updater-json.mjs` | Fallback to `release-notes-v{tag}.md` when CHANGELOG empty                                               |
| `CHANGELOG.md`                         | Fill in empty `[0.31.2-beta.1]` section                                                                  |
| `src/components/BatchSubmitModal.tsx`  | Capture `submit_job` return + call `addJob` on store                                                     |
| `src/pages/DashboardPage.tsx`          | Replace local `invoke('list_jobs')` state with `useJobsStore`, remove duplicate `sidecar:event` listener |

---

### Task 1: Extend Job status type in store

**Files:**

- Modify: `src/store/jobs.ts`

Must be done first — Tasks 4 and 5 import `Job` from this file.

- [ ] **Step 1: Update `Job.status` union in `src/store/jobs.ts`**

Find line 7 (the `status:` line inside `interface Job`):

```ts
// Before
  status: 'queued' | 'processing' | 'done' | 'error' | 'cancelled';

// After
  status:
    | 'queued'
    | 'processing'
    | 'done'
    | 'error'
    | 'cancelled'
    | 'qc_quarantined'
    | 'qc_rejected';
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd C:\dev\nexora-desktop
npx tsc --noEmit
```

Expected: exits 0, no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/store/jobs.ts
git commit -m "fix(store): add qc_quarantined and qc_rejected to Job status union"
```

---

### Task 2: Fix UpdateModal — size and markdown rendering

**Files:**

- Modify: `src/components/UpdateModal.tsx`

- [ ] **Step 1: Add `renderNotes` helper above the component**

In `src/components/UpdateModal.tsx`, insert the following function after the import block and before `const RELEASES_URL`:

```tsx
function renderNotes(body: string): React.ReactNode {
  return body.split('\n').map((line, i) => {
    if (/^#{2,3}\s/.test(line)) {
      return (
        <p key={i} className="font-semibold text-text-primary mt-2 first:mt-0">
          {line.replace(/^#{2,3}\s+/, '')}
        </p>
      );
    }
    if (line.startsWith('- ')) {
      return (
        <li key={i} className="ml-4 list-disc text-text-secondary">
          {line.slice(2)}
        </li>
      );
    }
    if (line.trim() === '') return null;
    return (
      <p key={i} className="text-text-secondary">
        {line}
      </p>
    );
  });
}
```

- [ ] **Step 2: Widen the dialog**

Find (line ~73):

```tsx
className =
  'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-bg-primary border border-border rounded-xl shadow-2xl w-[480px] max-w-[90vw] p-6 focus:outline-none';
```

Change `w-[480px]` → `w-[560px]`.

- [ ] **Step 3: Replace the notes area**

Find this block (inside the `{update.body && (...)}` section):

```tsx
<div className="text-sm text-text-secondary bg-bg-secondary border border-border rounded-lg p-3 max-h-40 overflow-y-auto whitespace-pre-wrap leading-relaxed">
  {update.body}
</div>
```

Replace with:

```tsx
<div className="text-sm bg-bg-secondary border border-border rounded-lg p-3 max-h-64 overflow-y-auto leading-relaxed space-y-1">
  {renderNotes(update.body)}
</div>
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: exits 0.

- [ ] **Step 5: Commit**

```bash
git add src/components/UpdateModal.tsx
git commit -m "fix(ui): update modal wider + markdown rendering for release notes"
```

---

### Task 3: Fix CI pipeline — notes fallback + CHANGELOG entry

**Files:**

- Modify: `scripts/ci-generate-updater-json.mjs`
- Modify: `CHANGELOG.md`

**Part A — ci-generate-updater-json.mjs**

- [ ] **Step 1: Add `existsSync` to the `fs` import**

Line 1 of `scripts/ci-generate-updater-json.mjs`:

```js
// Before
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';

// After
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs';
```

- [ ] **Step 2: Replace the notes extraction block**

Find the block that starts with `// Extrair notas do CHANGELOG para esta versão` (lines ~64-77):

```js
// Extrair notas do CHANGELOG para esta versão
let notes = 'Ver CHANGELOG.md para detalhes das alterações.';
try {
  const changelog = readFileSync('CHANGELOG.md', 'utf8');
  const extracted = extractChangelogSection(changelog, version);
  if (extracted) {
    notes = extracted.length > 500 ? extracted.substring(0, 497) + '...' : extracted;
    console.log(`\nExtracted CHANGELOG section for v${version} (${notes.length} chars)`);
  } else {
    console.log(`\nNo CHANGELOG section found for v${version}, using default notes`);
  }
} catch (e) {
  console.log(`\nCould not read CHANGELOG.md: ${e.message}`);
}
```

Replace entirely with:

```js
// Extrair notas: prioridade 1 CHANGELOG, prioridade 2 release-notes-v{tag}.md
let notes = 'Ver CHANGELOG.md para detalhes das alterações.';
try {
  const changelog = readFileSync('CHANGELOG.md', 'utf8');
  const extracted = extractChangelogSection(changelog, version);
  if (extracted) {
    notes = extracted.length > 500 ? extracted.substring(0, 497) + '...' : extracted;
    console.log(`\nExtracted CHANGELOG section for v${version} (${notes.length} chars)`);
  } else {
    console.log(`\nNo CHANGELOG section found for v${version}, trying release-notes file...`);
    const releaseNotesPath = `release-notes-v${tag}.md`;
    if (existsSync(releaseNotesPath)) {
      const releaseNotes = readFileSync(releaseNotesPath, 'utf8');
      const mainContent = releaseNotes.split('\n---\n')[0].trim();
      if (mainContent) {
        notes = mainContent.length > 500 ? mainContent.substring(0, 497) + '...' : mainContent;
        console.log(`\nUsed release-notes-v${tag}.md (${notes.length} chars)`);
      }
    } else {
      console.log(`\nrelease-notes-v${tag}.md not found, using default notes`);
    }
  }
} catch (e) {
  console.log(`\nCould not read notes: ${e.message}`);
}
```

- [ ] **Step 3: Smoke-test the fallback path locally**

Run from the repo root (PowerShell):

```powershell
# Verificar que o ficheiro release-notes existe e tem conteúdo
$path = "release-notes-v0.31.2-beta.1.md"
if (Test-Path $path) {
    $content = Get-Content $path -Raw
    $main = $content.Split("`n---`n")[0].Trim()
    Write-Host "OK: ficheiro existe, $($main.Length) chars"
    Write-Host "Preview: $($main.Substring(0, [Math]::Min(80, $main.Length)))"
} else {
    Write-Host "FAIL: ficheiro nao encontrado"
}
```

Expected:

```
OK: ficheiro existe, [número > 50] chars
Preview: ## Resumo
Release v0.31.2-beta.1 — 5 alteracoes.
```

**Part B — CHANGELOG.md**

- [ ] **Step 4: Fill in the empty `[0.31.2-beta.1]` entry**

In `CHANGELOG.md`, find the empty section:

```markdown
## [0.31.2-beta.1] - 2026-06-01

## [0.31.1-beta.1] - 2026-06-01
```

Insert content so it becomes:

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

## [0.31.1-beta.1] - 2026-06-01
```

- [ ] **Step 5: Verify CHANGELOG extraction**

Run from repo root (PowerShell):

```powershell
$changelog = Get-Content "CHANGELOG.md" -Raw
# A secção [0.31.2-beta.1] deve ter conteúdo antes do próximo ##
$match = [regex]::Match($changelog, '(?s)## \[0\.31\.2-beta\.1\][^\n]*\n(.*?)(?=\n## \[)')
if ($match.Success -and $match.Groups[1].Value.Trim().Length -gt 0) {
    Write-Host "OK: secção tem $($match.Groups[1].Value.Trim().Length) chars"
} else {
    Write-Host "FAIL: secção vazia ou não encontrada"
}
```

Expected: `OK: secção tem [número > 0] chars`.

- [ ] **Step 6: Commit**

```bash
git add scripts/ci-generate-updater-json.mjs CHANGELOG.md
git commit -m "fix(ci): read release-notes file as fallback for latest.json notes + fill CHANGELOG v0.31.2"
```

---

### Task 4: BatchSubmitModal — add job to store after submit

**Files:**

- Modify: `src/components/BatchSubmitModal.tsx`

- [ ] **Step 1: Add store import to `src/components/BatchSubmitModal.tsx`**

In the imports section, add after the last existing import:

```tsx
import { useJobsStore, type Job as StoreJob } from '@/store/jobs';
```

- [ ] **Step 2: Capture job return and call `addJob`**

In `handleSubmitAll`, find the submit block (~lines 261-267):

```tsx
const asset = await invoke<{ id: string }>('ingest_asset', { path: row.path });
await invoke('submit_job', {
  assetId: asset.id,
  profile: row.profileId,
  priority: 0,
  cloudProfileIds: cloudIds,
});
```

Replace with:

```tsx
const asset = await invoke<{ id: string }>('ingest_asset', { path: row.path });
const job = await invoke<StoreJob>('submit_job', {
  assetId: asset.id,
  profile: row.profileId,
  priority: 0,
  cloudProfileIds: cloudIds,
});
useJobsStore.getState().addJob(job);
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add src/components/BatchSubmitModal.tsx
git commit -m "fix(batch): add submitted job to useJobsStore so dashboard updates immediately"
```

---

### Task 5: DashboardPage — read jobs from global store

**Files:**

- Modify: `src/pages/DashboardPage.tsx`

Three changes: (1) import `useJobsStore` + `Job` from the store and remove the local `interface Job`, (2) replace the `useState` + `invoke` pair for jobs with a store selector, (3) remove the redundant `sidecar:event` listener (already handled by `useJobStatus` in App.tsx). The 30-second polling `useEffect` is kept — it still refreshes stats and `assetMap`.

- [ ] **Step 1: Add store import and remove local `interface Job`**

In `src/pages/DashboardPage.tsx`, add to the imports block:

```tsx
import { useJobsStore, type Job } from '@/store/jobs';
```

Then delete the entire local `interface Job` block (it starts with `interface Job {` and ends with the closing `}` after `output_path: string | null;`). The store's `Job` type — after Task 1 — has identical fields and the full status union.

- [ ] **Step 2: Replace `allJobs` state with store selector**

Find:

```tsx
const [allJobs, setAllJobs] = useState<Job[]>([]);
```

Replace with:

```tsx
const allJobs = useJobsStore((s) => s.jobs);
```

- [ ] **Step 3: Remove `list_jobs` from `fetchData`**

Find the `Promise.all` inside `fetchData`:

```tsx
const [statsData, jobsData, assetsData] = await Promise.all([
  invoke<AppStats>('get_stats'),
  invoke<Job[]>('list_jobs'),
  invoke<{ id: string; filename: string; thumbnail_path: string | null }[]>('list_assets_slim'),
]);
setStats(statsData);
setAllJobs(jobsData);
```

Replace with:

```tsx
const [statsData, assetsData] = await Promise.all([
  invoke<AppStats>('get_stats'),
  invoke<{ id: string; filename: string; thumbnail_path: string | null }[]>('list_assets_slim'),
]);
setStats(statsData);
```

- [ ] **Step 4: Remove the duplicate `sidecar:event` listener**

Find and delete this entire `useEffect` block:

```tsx
// Actualizar em tempo real quando o sidecar emite eventos de job
useEffect(() => {
  const unlisten = listen('sidecar:event', () => {
    fetchData();
  });
  return () => {
    unlisten.then((fn) => fn());
  };
}, [fetchData]);
```

After deleting it, check whether `listen` is still used anywhere else in the file. If not, remove `listen` from its import line:

```tsx
// If listen is now unused, remove it:
import { listen } from '@tauri-apps/api/event'; // ← delete this line
```

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: exits 0. Common fix if you see an error: check that `setAllJobs` is fully removed (not referenced anywhere in the component).

- [ ] **Step 6: Commit**

```bash
git add src/pages/DashboardPage.tsx
git commit -m "fix(dashboard): read jobs from useJobsStore instead of duplicate invoke + remove redundant sidecar listener"
```

---

### Task 6: Build verification

- [ ] **Step 1: Full TypeScript + build check**

```bash
cd C:\dev\nexora-desktop
npm run build
```

Expected: completes without TypeScript errors or build failures.

- [ ] **Step 2: Manual test — drag-drop → dashboard**

```bash
npm run tauri dev
```

1. Drag a video file onto the app window → blue overlay appears → BatchSubmitModal opens
2. Select a profile → click Submit
3. App navigates to Library tab — the asset appears
4. Click Dashboard tab → the submitted job appears in "Recent Jobs" as `queued` or `processing` **immediately** (no wait required)
5. Leave the dashboard open — job status updates to `done` when processing finishes

- [ ] **Step 3: Manual test — update modal (dev mock)**

In `src/App.tsx`, temporarily add after the `pendingUpdate` state declaration:

```tsx
// TEMP: mock update for UI testing — remove after
useEffect(() => {
  const mockUpdate = {
    version: '9.9.9',
    currentVersion: '0.31.2',
    body: '### Added\n- opcao 6 pipeline completo\n\n### Fixed\n- windows-latest -> windows-2025\n- actualizar GitHub Actions v4->v5\n\n### Infrastructure\n- CI fixes',
    downloadAndInstall: async () => {},
  } as unknown as import('@tauri-apps/plugin-updater').Update;
  setPendingUpdate(mockUpdate);
  setUpdateOpen(true);
}, []);
```

Expected in the modal:

- "Added", "Fixed", "Infrastructure" appear as **bold** headers
- Each item renders as a **bullet point**
- No horizontal scroll needed, notes fit in the taller box

Remove the mock after testing.

- [ ] **Step 4: Verify pipeline fix (after next release)**

After the next sync.ps1 option 3/6 run:

- Check `latest.json` in the GitHub release assets
- The `notes` field should contain the real changelog content, not `"Ver CHANGELOG.md para detalhes das alterações."`
