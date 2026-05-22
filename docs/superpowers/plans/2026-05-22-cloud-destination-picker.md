# Cloud Destination Picker — BatchSubmitModal — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar selecção de destino cloud ao `BatchSubmitModal` — picker global + override por ficheiro (linha expande inline) + CTA quando sem perfis.

**Architecture:** Toda a lógica é frontend-only. `BatchSubmitModal` lê `cloudProfiles` do Zustand store, mantém estado local `globalCloudIds` / `perFileOverrides` / `expandedRow`, e passa `cloudProfileIds` ao invoke `submit_job` já existente. `App.tsx` recebe prop `onOpenCloudSettings` para navegar para Definições quando o utilizador clica na CTA.

**Tech Stack:** React 19 · TypeScript strict · Tailwind CSS · Zustand (`useCloudStore`) · Tauri 2 `invoke` · Vitest + @testing-library/react

---

## Ficheiros

| Ficheiro                                     | Acção                                                                         |
| -------------------------------------------- | ----------------------------------------------------------------------------- |
| `src/components/BatchSubmitModal.tsx`        | Modificar — adiciona cloud state, secção global, coluna Destino, expanded row |
| `src/App.tsx`                                | Modificar — passa `onOpenCloudSettings` prop ao `BatchSubmitModal`            |
| `tests/components/BatchSubmitModal.test.tsx` | Criar — testes da feature cloud                                               |

Não tocamos em: `CloudDestinationPicker.tsx`, `cloud.ts`, `jobs.rs`, `IngestProfileModal.tsx`.

---

## Contexto crítico antes de implementar

- **`BatchSubmitModal.tsx`** — actualmente chama `invoke('submit_job', { assetId, profile, priority: 0 })` sem `cloudProfileIds`. O backend já suporta o campo (ver `src-tauri/src/commands/jobs.rs`).
- **`useCloudStore`** — em `src/store/cloud.ts`. `profiles` é array Zustand síncrono (sem loading state).
- **Tauri 2 IPC** — usar sempre camelCase no `invoke()`. `cloudProfileIds` (não `cloud_profile_ids`).
- **Convenção de cores** — a app usa CSS vars: `text-text-muted`, `bg-bg-primary`, `border-border`, `text-brand`, `bg-brand`. Não usar cores hardcoded (`gray-800`, `blue-600`).
- **`React.Fragment` com `key`** — a tabela precisa de passar de `<tr key={row.path}>` para `<React.Fragment key={row.path}>` + dois `<tr>` por linha.
- **colSpan da expanded row** — quando há `cloudProfiles`, a tabela tem 5 colunas (Ficheiro, Perfil, Estimativa, Destino, Status). `colSpan={5}`.

---

### Task 1: Criar ficheiro de testes

**Files:**

- Create: `tests/components/BatchSubmitModal.test.tsx`

- [ ] **Criar o ficheiro de testes completo:**

```tsx
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { BatchSubmitModal } from '@/components/BatchSubmitModal';
import { useCloudStore } from '@/store/cloud';
import { invoke } from '@tauri-apps/api/core';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockCloudProfiles = [
  { id: 's3-prod', name: 'S3-prod', provider: 's3' as const, config: {}, createdAt: '2024-01-01' },
  {
    id: 'gd-work',
    name: 'GDrive-work',
    provider: 'gdrive' as const,
    config: {},
    createdAt: '2024-01-01',
  },
];

const mockTranscodeProfile = {
  id: 'web-hd',
  name: 'web-hd',
  description: '',
  is_system: true,
  container: 'mp4',
  video_codec: 'h264',
  resolution: '1920x1080',
  fps: 30,
  bitrate_kbps: null,
  vmaf_threshold: 93,
};

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn() }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/store/cloud', () => ({
  useCloudStore: vi.fn((selector: (s: { profiles: typeof mockCloudProfiles }) => unknown) =>
    selector({ profiles: [] }),
  ),
  PROVIDER_LABELS: {
    ftp: 'FTP',
    sftp: 'SFTP',
    smb: 'SMB',
    s3: 'S3',
    gdrive: 'GDrive',
    icloud: 'iCloud',
  },
}));
vi.mock('@/lib/estimate', () => ({ estimateProcessingTime: () => '~1 min' }));

// ── Helpers ────────────────────────────────────────────────────────────────────

const defaultProps = {
  open: true,
  paths: ['/videos/clip.mp4'],
  onClose: vi.fn(),
  onComplete: vi.fn(),
};

function withProfiles() {
  vi.mocked(useCloudStore).mockImplementation((selector) =>
    selector({ profiles: mockCloudProfiles }),
  );
}

function withoutProfiles() {
  vi.mocked(useCloudStore).mockImplementation((selector) => selector({ profiles: [] }));
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('BatchSubmitModal — cloud destinations', () => {
  beforeEach(() => {
    vi.mocked(invoke).mockImplementation(async (cmd) => {
      if (cmd === 'get_settings') return { output_dir: '/output' };
      if (cmd === 'list_profiles') return [mockTranscodeProfile];
      if (cmd === 'ingest_asset') return { id: 'asset-1' };
      if (cmd === 'submit_job') return {};
      return {};
    });
    withoutProfiles();
    vi.clearAllMocks();
    // re-aplicar mock do invoke após clearAllMocks
    vi.mocked(invoke).mockImplementation(async (cmd) => {
      if (cmd === 'get_settings') return { output_dir: '/output' };
      if (cmd === 'list_profiles') return [mockTranscodeProfile];
      if (cmd === 'ingest_asset') return { id: 'asset-1' };
      if (cmd === 'submit_job') return {};
      return {};
    });
  });

  it('mostra CTA quando não há perfis cloud', () => {
    withoutProfiles();
    render(<BatchSubmitModal {...defaultProps} />);
    expect(screen.getByText(/Sem perfis cloud configurados/i)).toBeInTheDocument();
  });

  it('não mostra CTA quando há perfis cloud', () => {
    withProfiles();
    render(<BatchSubmitModal {...defaultProps} />);
    expect(screen.queryByText(/Sem perfis cloud configurados/i)).not.toBeInTheDocument();
  });

  it('mostra picker global com perfis quando há cloud configurada', () => {
    withProfiles();
    render(<BatchSubmitModal {...defaultProps} />);
    expect(screen.getByText('S3-prod')).toBeInTheDocument();
    expect(screen.getByText('GDrive-work')).toBeInTheDocument();
  });

  it('chama onOpenCloudSettings e onClose ao clicar na CTA', () => {
    withoutProfiles();
    const onOpenCloudSettings = vi.fn();
    const onClose = vi.fn();
    render(
      <BatchSubmitModal
        {...defaultProps}
        onClose={onClose}
        onOpenCloudSettings={onOpenCloudSettings}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Adicionar perfil cloud/i }));
    expect(onOpenCloudSettings).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('clicar no botão de destino de uma linha expande a secção de override', () => {
    withProfiles();
    render(<BatchSubmitModal {...defaultProps} />);
    const destBtn = screen.getByTestId('dest-btn-/videos/clip.mp4');
    fireEvent.click(destBtn);
    expect(screen.getByTestId('override-section-/videos/clip.mp4')).toBeInTheDocument();
    expect(screen.getByText(/Override para este ficheiro/i)).toBeInTheDocument();
  });

  it('clicar duas vezes no botão de destino fecha o override', () => {
    withProfiles();
    render(<BatchSubmitModal {...defaultProps} />);
    const destBtn = screen.getByTestId('dest-btn-/videos/clip.mp4');
    fireEvent.click(destBtn);
    expect(screen.getByTestId('override-section-/videos/clip.mp4')).toBeInTheDocument();
    fireEvent.click(destBtn);
    expect(screen.queryByTestId('override-section-/videos/clip.mp4')).not.toBeInTheDocument();
  });

  it('submit_job recebe cloudProfileIds do picker global', async () => {
    withProfiles();
    render(<BatchSubmitModal {...defaultProps} />);
    // seleccionar S3-prod no picker global
    fireEvent.click(screen.getByTestId('global-cloud-s3-prod'));
    // processar
    fireEvent.click(screen.getByRole('button', { name: /batch.processAll/i }));
    await waitFor(() => {
      expect(vi.mocked(invoke)).toHaveBeenCalledWith(
        'submit_job',
        expect.objectContaining({ cloudProfileIds: ['s3-prod'] }),
      );
    });
  });

  it('submit_job recebe cloudProfileIds do override por ficheiro', async () => {
    withProfiles();
    render(<BatchSubmitModal {...defaultProps} />);
    // abrir override
    fireEvent.click(screen.getByTestId('dest-btn-/videos/clip.mp4'));
    // seleccionar GDrive no override
    const overrideSection = screen.getByTestId('override-section-/videos/clip.mp4');
    fireEvent.click(within(overrideSection).getByTestId('override-cloud-gd-work'));
    // processar
    fireEvent.click(screen.getByRole('button', { name: /batch.processAll/i }));
    await waitFor(() => {
      expect(vi.mocked(invoke)).toHaveBeenCalledWith(
        'submit_job',
        expect.objectContaining({ cloudProfileIds: ['gd-work'] }),
      );
    });
  });

  it('override por ficheiro tem precedência sobre o picker global', async () => {
    withProfiles();
    render(<BatchSubmitModal {...defaultProps} />);
    // seleccionar S3-prod globalmente
    fireEvent.click(screen.getByTestId('global-cloud-s3-prod'));
    // abrir override e seleccionar GDrive
    fireEvent.click(screen.getByTestId('dest-btn-/videos/clip.mp4'));
    const overrideSection = screen.getByTestId('override-section-/videos/clip.mp4');
    fireEvent.click(within(overrideSection).getByTestId('override-cloud-gd-work'));
    // processar
    fireEvent.click(screen.getByRole('button', { name: /batch.processAll/i }));
    await waitFor(() => {
      expect(vi.mocked(invoke)).toHaveBeenCalledWith(
        'submit_job',
        expect.objectContaining({ cloudProfileIds: ['gd-work'] }), // override ganha
      );
    });
  });

  it('submit_job recebe cloudProfileIds vazio quando sem selecção', async () => {
    withProfiles();
    render(<BatchSubmitModal {...defaultProps} />);
    // não seleccionar nada — deve ir para local
    fireEvent.click(screen.getByRole('button', { name: /batch.processAll/i }));
    await waitFor(() => {
      expect(vi.mocked(invoke)).toHaveBeenCalledWith(
        'submit_job',
        expect.objectContaining({ cloudProfileIds: [] }),
      );
    });
  });
});
```

- [ ] **Correr os testes para confirmar que falham:**

```
npm test -- BatchSubmitModal
```

Expected: FAIL — `data-testid` não existem, `onOpenCloudSettings` não é prop conhecida, `cloudProfileIds` não é passado ao invoke.

---

### Task 2: Adicionar imports, props e estado ao `BatchSubmitModal`

**Files:**

- Modify: `src/components/BatchSubmitModal.tsx`

- [ ] **Adicionar `Cloud` aos imports de lucide-react (linha ~8-17):**

```tsx
import {
  X,
  Film,
  ChevronDown,
  CheckCircle2,
  XCircle,
  Loader2,
  Play,
  AlertTriangle,
  FolderOpen,
  Cloud, // ← ADD
} from 'lucide-react';
```

- [ ] **Adicionar import do store cloud (após os imports existentes, linha ~21):**

```tsx
import { useCloudStore } from '@/store/cloud';
```

- [ ] **Adicionar prop `onOpenCloudSettings` à interface `BatchSubmitModalProps` (linha ~47-53):**

```tsx
export interface BatchSubmitModalProps {
  open: boolean;
  paths: string[];
  defaultProfileId?: string;
  onClose: () => void;
  onComplete: (count: number) => void;
  onOpenCloudSettings?: () => void; // ← ADD
}
```

- [ ] **Adicionar `onOpenCloudSettings` ao destructuring do componente (linha ~162-167):**

```tsx
export function BatchSubmitModal({
  open,
  paths,
  defaultProfileId = 'web-hd',
  onClose,
  onComplete,
  onOpenCloudSettings,   // ← ADD
}: BatchSubmitModalProps) {
```

- [ ] **Adicionar leitura do store e estado cloud (após linha ~173, junto aos useState existentes):**

```tsx
const cloudProfiles = useCloudStore((s) => s.profiles);
const [globalCloudIds, setGlobalCloudIds] = useState<string[]>([]);
const [perFileOverrides, setPerFileOverrides] = useState<Record<string, string[]>>({});
const [expandedRow, setExpandedRow] = useState<string | null>(null);
```

- [ ] **Resetar estado cloud quando o modal abre (no bloco `if (open)` existente, linha ~180-190):**

Localizar este bloco:

```tsx
if (open) {
  setRows(
    paths.map((path) => ({
      path,
      filename: path.split(/[/\\]/).pop() ?? path,
      profileId: globalProfileId,
      status: 'idle',
    })),
  );
}
```

Substituir por:

```tsx
if (open) {
  setRows(
    paths.map((path) => ({
      path,
      filename: path.split(/[/\\]/).pop() ?? path,
      profileId: globalProfileId,
      status: 'idle',
    })),
  );
  setGlobalCloudIds([]);
  setPerFileOverrides({});
  setExpandedRow(null);
}
```

- [ ] **Actualizar `handleSubmitAll` para incluir `cloudProfileIds` e adicionar deps:**

Localizar:

```tsx
const asset = await invoke<{ id: string }>('ingest_asset', { path: row.path });
await invoke('submit_job', { assetId: asset.id, profile: row.profileId, priority: 0 });
```

Substituir por:

```tsx
const cloudIds = perFileOverrides[row.path] ?? globalCloudIds;
const asset = await invoke<{ id: string }>('ingest_asset', { path: row.path });
await invoke('submit_job', {
  assetId: asset.id,
  profile: row.profileId,
  priority: 0,
  cloudProfileIds: cloudIds,
});
```

Localizar o fecho do `useCallback`:

```tsx
  }, [rows, submitting, t, onComplete]);
```

Substituir por:

```tsx
  }, [rows, submitting, t, onComplete, globalCloudIds, perFileOverrides]);
```

- [ ] **Correr typecheck para confirmar sem erros:**

```
npm run typecheck
```

Expected: sem erros TypeScript (os novos campos ainda não são usados no JSX).

---

### Task 3: Adicionar secção cloud global ao JSX

**Files:**

- Modify: `src/components/BatchSubmitModal.tsx`

- [ ] **Adicionar secção cloud após o bloco "Global profile selector + Output dir" (após linha ~339, antes do `paths.length === 0` check):**

Localizar o final da div da barra global:

```tsx
          </div>
          {/* termina a barra de global profile + output dir */}

          {paths.length === 0 ? (
```

Inserir entre os dois, a nova secção cloud:

```tsx
{
  /* Cloud destination section */
}
{
  cloudProfiles.length > 0 ? (
    <div className="px-6 py-3 border-b border-border bg-bg-primary/30 shrink-0">
      <div className="flex items-center gap-2 mb-2">
        <Cloud size={13} className="text-brand shrink-0" />
        <span className="text-xs font-bold text-text-muted uppercase tracking-widest">
          Destino cloud
        </span>
        <span className="text-xs text-text-muted">— padrão para todos os ficheiros</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {cloudProfiles.map((p) => {
          const selected = globalCloudIds.includes(p.id);
          return (
            <button
              key={p.id}
              data-testid={`global-cloud-${p.id}`}
              onClick={() =>
                setGlobalCloudIds(
                  selected ? globalCloudIds.filter((x) => x !== p.id) : [...globalCloudIds, p.id],
                )
              }
              className={cn(
                'flex items-center gap-1.5 text-xs rounded-lg px-2.5 py-1.5 border transition-colors',
                selected
                  ? 'bg-brand/20 border-brand text-brand'
                  : 'bg-bg-primary border-border text-text-muted hover:bg-bg-hover',
              )}
            >
              <Cloud size={10} />
              {p.name}
            </button>
          );
        })}
      </div>
    </div>
  ) : (
    <div className="px-6 py-2.5 border-b border-border bg-bg-primary/30 shrink-0 flex items-center gap-2">
      <Cloud size={13} className="text-text-muted shrink-0" />
      <span className="text-xs text-text-muted">Sem perfis cloud configurados.</span>
      {onOpenCloudSettings && (
        <button
          onClick={() => {
            onClose();
            onOpenCloudSettings();
          }}
          className="text-xs text-brand hover:underline"
        >
          + Adicionar perfil cloud →
        </button>
      )}
    </div>
  );
}
```

- [ ] **Correr typecheck:**

```
npm run typecheck
```

Expected: sem erros.

---

### Task 4: Adicionar coluna Destino e expanded row à tabela

**Files:**

- Modify: `src/components/BatchSubmitModal.tsx`

- [ ] **Adicionar cabeçalho da coluna Destino no `<thead>` (após o `th` de "batch.estimate", linha ~358-363):**

Localizar:

```tsx
                    <th className="text-right px-4 py-2 text-[10px] font-black uppercase tracking-widest text-text-muted w-24">
                      {t('batch.estimate')}
                    </th>
                    <th className="text-center px-4 py-2 text-[10px] font-black uppercase tracking-widest text-text-muted w-16">
                      {t('batch.status')}
                    </th>
```

Substituir por:

```tsx
<th className="text-right px-4 py-2 text-[10px] font-black uppercase tracking-widest text-text-muted w-24">
  {t('batch.estimate')}
</th>;
{
  cloudProfiles.length > 0 && (
    <th className="text-left px-4 py-2 text-[10px] font-black uppercase tracking-widest text-text-muted w-28">
      Destino
    </th>
  );
}
<th className="text-center px-4 py-2 text-[10px] font-black uppercase tracking-widest text-text-muted w-16">
  {t('batch.status')}
</th>;
```

- [ ] **Alterar o `rows.map` no `<tbody>` para `React.Fragment` com expanded row:**

Localizar o mapa actual (linha ~367):

```tsx
                  {rows.map((row, i) => (
                    <tr
                      key={row.path}
                      className={cn(
                        'transition-colors',
                        row.status === 'done' && 'opacity-60',
                        row.status === 'error' && 'bg-red-500/5',
                      )}
                    >
```

Substituir TODO o bloco `rows.map(...)` (até ao fecho do `</tbody>`) por:

```tsx
{
  rows.map((row, i) => {
    const isExpanded = expandedRow === row.path;
    const overrideIds = perFileOverrides[row.path];
    const effectiveCloudIds = overrideIds ?? globalCloudIds;
    const hasOverride = overrideIds !== undefined;

    const destLabel =
      effectiveCloudIds.length === 0
        ? '💾 Local'
        : effectiveCloudIds.length === 1
          ? `☁️ ${cloudProfiles.find((p) => p.id === effectiveCloudIds[0])?.name ?? '…'}`
          : `☁️ ${effectiveCloudIds.length} destinos`;

    return (
      <React.Fragment key={row.path}>
        <tr
          className={cn(
            'transition-colors',
            row.status === 'done' && 'opacity-60',
            row.status === 'error' && 'bg-red-500/5',
            isExpanded && 'bg-bg-hover',
          )}
        >
          <td className="px-4 py-3">
            <div className="flex items-center gap-2 min-w-0">
              <Film size={13} className="text-text-muted shrink-0" />
              <span className="font-medium text-text-primary truncate" title={row.path}>
                {row.filename}
              </span>
            </div>
            {row.error && <p className="text-[10px] text-red-400 mt-0.5 truncate">{row.error}</p>}
          </td>
          <td className="px-4 py-3">
            {row.status === 'idle' && profiles.length > 0 ? (
              <ProfileDropdown
                profiles={profiles}
                value={row.profileId}
                onChange={(id) => handleRowProfileChange(i, id)}
                compact
              />
            ) : (
              <span className="text-text-muted text-xs">
                {profiles.find((p) => p.id === row.profileId)?.name ?? row.profileId}
              </span>
            )}
          </td>
          <td className="px-4 py-3 text-right text-xs text-text-muted tabular-nums">
            {estimateProcessingTime(row.profileId, null, null)}
          </td>
          {cloudProfiles.length > 0 && (
            <td className="px-4 py-3">
              {row.status === 'idle' ? (
                <button
                  data-testid={`dest-btn-${row.path}`}
                  onClick={() => setExpandedRow(isExpanded ? null : row.path)}
                  className={cn(
                    'text-xs px-2 py-1 rounded-lg border transition-colors whitespace-nowrap',
                    isExpanded && 'ring-1 ring-brand ring-offset-1',
                    hasOverride && effectiveCloudIds.length > 0
                      ? 'bg-amber-500/10 border-amber-500/50 text-amber-400'
                      : !hasOverride && effectiveCloudIds.length > 0
                        ? 'bg-brand/10 border-brand/50 text-brand'
                        : 'bg-bg-primary border-border text-text-muted hover:bg-bg-hover',
                  )}
                >
                  {destLabel}
                </button>
              ) : (
                <span className="text-xs text-text-muted">{destLabel}</span>
              )}
            </td>
          )}
          <td className="px-4 py-3 text-center">
            {row.status === 'idle' && (
              <span className="w-4 h-4 block mx-auto rounded-full bg-border" />
            )}
            {row.status === 'processing' && (
              <Loader2 size={16} className="animate-spin text-brand mx-auto" />
            )}
            {row.status === 'done' && <CheckCircle2 size={16} className="text-green-500 mx-auto" />}
            {row.status === 'error' && <XCircle size={16} className="text-red-500 mx-auto" />}
          </td>
        </tr>

        {/* Expanded override section */}
        {isExpanded && cloudProfiles.length > 0 && (
          <tr>
            <td colSpan={5} className="px-4 pb-3 pt-0 bg-bg-primary/30">
              <div
                data-testid={`override-section-${row.path}`}
                className="border-t border-border/50 pt-2"
              >
                <p className="text-[10px] text-text-muted uppercase tracking-widest mb-2">
                  Override para este ficheiro
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    data-testid={`override-local-${row.path}`}
                    onClick={() =>
                      setPerFileOverrides((prev) => ({
                        ...prev,
                        [row.path]: [],
                      }))
                    }
                    className={cn(
                      'text-xs px-2.5 py-1 rounded-lg border transition-colors',
                      hasOverride && effectiveCloudIds.length === 0
                        ? 'bg-amber-500/10 border-amber-500/50 text-amber-400'
                        : 'bg-bg-primary border-border text-text-muted hover:bg-bg-hover',
                    )}
                  >
                    💾 Local
                  </button>
                  {cloudProfiles.map((p) => {
                    const sel = effectiveCloudIds.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        data-testid={`override-cloud-${p.id}`}
                        onClick={() => {
                          const current = perFileOverrides[row.path] ?? [];
                          const next = sel ? current.filter((x) => x !== p.id) : [...current, p.id];
                          setPerFileOverrides((prev) => ({
                            ...prev,
                            [row.path]: next,
                          }));
                        }}
                        className={cn(
                          'text-xs px-2.5 py-1 rounded-lg border transition-colors',
                          sel && hasOverride
                            ? 'bg-amber-500/10 border-amber-500/50 text-amber-400'
                            : sel
                              ? 'bg-brand/10 border-brand/50 text-brand'
                              : 'bg-bg-primary border-border text-text-muted hover:bg-bg-hover',
                        )}
                      >
                        ☁️ {p.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </td>
          </tr>
        )}
      </React.Fragment>
    );
  });
}
```

- [ ] **Correr typecheck:**

```
npm run typecheck
```

Expected: sem erros.

---

### Task 5: Passar `onOpenCloudSettings` em `App.tsx`

**Files:**

- Modify: `src/App.tsx`

- [ ] **Localizar o uso de `BatchSubmitModal` em `App.tsx` (linha ~248-254) e adicionar o prop:**

Localizar:

```tsx
<BatchSubmitModal
  open={batchOpen}
  paths={batchPaths}
  onClose={() => setBatchOpen(false)}
  onComplete={(count) => {
    setBatchOpen(false);
    setActiveTab('library');
    toast.success(t('library.filesAdded', { count }));
  }}
/>
```

Substituir por:

```tsx
<BatchSubmitModal
  open={batchOpen}
  paths={batchPaths}
  onClose={() => setBatchOpen(false)}
  onOpenCloudSettings={() => {
    setBatchOpen(false);
    setActiveTab('settings');
  }}
  onComplete={(count) => {
    setBatchOpen(false);
    setActiveTab('library');
    toast.success(t('library.filesAdded', { count }));
  }}
/>
```

- [ ] **Correr typecheck final:**

```
npm run typecheck
```

Expected: PASS sem erros.

---

### Task 6: Correr testes

**Files:** nenhum

- [ ] **Correr os testes:**

```
npm test -- BatchSubmitModal
```

Expected: todos os testes PASS. Se algum falhar, verificar:

- `data-testid` correcto no componente
- `cloudProfileIds` passado ao invoke
- Mock do `useCloudStore` a funcionar (selector chamado correctamente)

- [ ] **Correr todos os testes para garantir regressões:**

```
npm test
```

Expected: PASS (sem regressões nos testes existentes de `DropZone`, `queue`, `orchestrator`, `workers`).

---

### Task 7: Commit

- [ ] **Fazer commit com todos os ficheiros alterados:**

```bash
git add src/components/BatchSubmitModal.tsx src/App.tsx tests/components/BatchSubmitModal.test.tsx
git commit -m "feat(ui): cloud destination picker no BatchSubmitModal

- picker global com toggle por perfil cloud
- override por ficheiro via linha expandida inline
- CTA 'Adicionar perfil cloud' quando sem perfis
- cloudProfileIds passado ao submit_job por ficheiro"
```

Expected: commit criado sem erros de hook (lint + prettier passam).

---

## Notas de implementação

- **Não usar `CloudDestinationPicker`** no modal — renderizar inline com classes do design system da app (`bg-bg-primary`, `text-text-muted`, `border-border`, etc.) para consistência visual.
- **`React.Fragment` com `key`** — obrigatório para o expanded row funcionar sem warnings do React.
- **`cloudProfileIds: []`** é enviado ao backend mesmo quando não há cloud seleccionada — o backend já lida com array vazio (sem `job_cloud_destinations` criados).
- **Camelcase no invoke** — `cloudProfileIds` (não `cloud_profile_ids`). Tauri 2 converte automaticamente para snake_case no Rust.
