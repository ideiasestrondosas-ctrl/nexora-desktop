# Nexora Desktop — Plano de Auditoria e Otimização Total

> **Documento de execução para Claude Code.**
> Workspace: `C:\Dev\nexora-desktop`
> Versão actual: `v0.17.0` → versão alvo: `v0.18.0`
> Idioma: português de Portugal (comentários e mensagens).
> Código: inglês, TypeScript strict, Rust 2021 edition.

---

## INSTRUÇÕES PARA O AGENTE

**Lê este bloco antes de tudo. Estas regras são imutáveis.**

1. Lê primeiro `PROGRESS-DESKTOP.md`, `SYNC-STATE.md`, `BOUNDARIES.md` (regras existentes do workspace).
2. Executa as tarefas pela ordem numerada (`T01` → `T24`). Cada tarefa é **atómica** e tem:
   - **Objectivo** — o que precisa ficar feito.
   - **Causa-raiz** — porque está partido (não saltar esta leitura).
   - **Ficheiros** — apenas os listados podem ser modificados.
   - **Implementação** — passos exactos.
   - **Validação** — comandos que têm de passar antes de avançar.
   - **Aprovação humana** — algumas tarefas exigem `[PARA AQUI E AGUARDA]` antes de continuar.
3. Após cada tarefa concluída:
   - `git add . && git commit -m "{tipo}({scope}): {descrição} (T{NN})"`
   - Actualiza `PROGRESS-DESKTOP.md` (mover item de "Em progresso" para "Concluído").
   - Actualiza `SYNC-STATE.md` (registar o que mudou).
4. Se um comando de validação falhar, **PARA** e reporta. Não tentes "arranjar" indo além do scope da tarefa.
5. Convenções obrigatórias (não negociáveis):
   - TypeScript strict — zero `any` implícitos.
   - Rust — `cargo clippy --all-targets -- -D warnings` deve passar.
   - FFmpeg — `execFile` com array de argumentos, **NUNCA** `exec` com string.
   - Comentários e mensagens UI em português de Portugal; identificadores em inglês.
   - Paleta: `#1A6FD4` (azul primário) e `#4FB8A0` (verde secundário).
6. **Não inventes dependências.** Apenas as listadas em §"Stack de dependências" podem ser adicionadas.
7. **Não toques em ficheiros fora do scope listado**. Cada tarefa diz exactamente o que pode mudar.

---

## SUMÁRIO EXECUTIVO

| Categoria               | Itens | Estado                                                               |
| ----------------------- | ----- | -------------------------------------------------------------------- |
| Bugs bloqueantes (P0)   | 3     | Bloqueiam funcionamento; corrigir primeiro                           |
| Segurança (P0)          | 2     | CSP `null`, capabilities sem least-privilege                         |
| Performance (P1)        | 5     | Polling, duplicação SQLite, virtualização ausente                    |
| Arquitectura (P1)       | 4     | localStorage, deps mal classificadas, logs no repo, versão hardcoded |
| UX/Acessibilidade (P2)  | 4     | Toasts, gráficos, modais sem focus trap, atalhos globais             |
| Qualidade/CI (P2)       | 4     | Coverage, ESLint, Prettier, dependabot                               |
| Profissionalização (P3) | 2     | Code signing, telemetria opt-in                                      |

**Bugs identificados na análise (já documentados em `Plano - Bugs + Gap Analysis Nexora Desktop.md`):**

- A1 — Drag-and-drop inoperante
- A2 — Sidecar nunca arranca
- A3 — Versão hardcoded na UI

Este plano integra esses bugs e adiciona 21 melhorias.

---

## STACK DE DEPENDÊNCIAS (alterações permitidas)

### A adicionar (`dependencies`)

- `sonner@^1.7.0` — toasts modernos (substitui `react-hot-toast`)
- `@tanstack/react-virtual@^3.10.0` — virtualização de listas
- `@tanstack/react-query@^5.59.0` — gestão de estado servidor/IPC
- `recharts@^2.13.0` — gráficos para dashboard
- `@radix-ui/react-dialog@^1.1.0` — modais acessíveis
- `@radix-ui/react-tooltip@^1.1.0` — tooltips acessíveis
- `@radix-ui/react-progress@^1.1.0` — barra de progresso WAI-ARIA
- `@tauri-apps/plugin-store@^2` — persistência de settings
- `@tauri-apps/plugin-log@^2` — logging unificado
- `@tauri-apps/plugin-global-shortcut@^2` — atalhos globais (opcional)

### A adicionar (`devDependencies`)

- `eslint@^9.15.0` + `@typescript-eslint/parser` + `@typescript-eslint/eslint-plugin`
- `eslint-plugin-react-hooks@^5.0.0`
- `prettier@^3.4.0`
- `@testing-library/react@^16.1.0`
- `@testing-library/user-event@^14.5.0`
- `@testing-library/jest-dom@^6.6.0`
- `jsdom@^25.0.0`
- `rollup-plugin-visualizer@^5.12.0`
- `husky@^9.1.0` + `lint-staged@^15.2.0`

### A mover de `dependencies` para `devDependencies`

- `esbuild` (já era dev)
- `concurrently` (apenas para scripts)
- `tsx` (apenas dev)
- `better-sqlite3` — manter em dependencies **só** se o sidecar empacotado o precisar; ver T08

### A remover

- `translate@^3.0.1` — não é usado em runtime; era para tradução manual
- `react-hot-toast@^2.6.0` — substituído por `sonner`

### Plugins Tauri (Rust, `src-tauri/Cargo.toml`)

- `tauri-plugin-store = "2"`
- `tauri-plugin-log = "2"`
- `tauri-plugin-global-shortcut = "2"` (se for adoptado)

---

# FASE 0 — PREPARAÇÃO

## T01 — Snapshot e branch de trabalho

**Objectivo:** Garantir reversibilidade total.

**Implementação:**

```bash
cd C:\Dev\nexora-desktop
git status                                  # deve estar limpo
git checkout -b chore/audit-v0.18
git tag pre-audit-v0.17.0
git push origin pre-audit-v0.17.0
```

**Validação:**

```bash
git branch --show-current                   # deve imprimir: chore/audit-v0.18
git tag -l pre-audit-v0.17.0                # deve listar a tag
```

**Commit:** não há (apenas branch + tag).

---

## T02 — Limpeza de artefactos no repositório

**Objectivo:** Remover ficheiros que não pertencem ao controlo de versões.

**Causa-raiz:** A pasta `.logs/` tem 40+ ficheiros de sessões de dev no repositório. Ocupa espaço, polui diffs, expõe paths locais.

**Ficheiros:**

- `.gitignore` (modificar)
- `.logs/` (remover do tracking, manter localmente)

**Implementação:**

1. Garantir que `.gitignore` contém:

```gitignore
# Logs de desenvolvimento
.logs/
*.log

# Bundle stats
stats.html
dist/stats.html

# Cache do Rust
src-tauri/target/

# Cache do Node
node_modules/
sidecar/dist/

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/*
!.vscode/extensions.json

# Builds locais
*.exe
*.msi
*.dmg
*.AppImage
*.deb
*.rpm
```

2. Remover do tracking sem apagar localmente:

```bash
git rm -r --cached .logs/
git rm --cached src-tauri/target/ -r 2>nul || echo "ok"
```

**Validação:**

```bash
git status                                  # .logs/ não aparece como tracked
git check-ignore .logs/qualquer.log         # imprime ".logs/qualquer.log"
```

**Commit:**

```bash
git add .gitignore
git commit -m "chore(repo): ignore .logs/ and build artifacts (T02)"
```

---

# FASE 1 — BUGS BLOQUEANTES (P0)

> Estas três tarefas têm de ficar feitas e validadas em conjunto. A app não processa nada sem elas.

## T03 — Activar drag-and-drop ao nível do Tauri

**Objectivo:** Permitir que o WebView receba eventos de drop de ficheiros.

**Causa-raiz:** Tauri 2 intercepta drag-drop por defeito. É preciso:

- `dragDropEnabled: true` na configuração da janela.
- `drag-drop:default` nas capabilities.

**Ficheiros:**

- `src-tauri/tauri.conf.json`
- `src-tauri/capabilities/default.json`

**Implementação:**

1. Em `src-tauri/tauri.conf.json`, dentro de `app.windows[0]`, garantir:

```json
{
  "label": "main",
  "title": "Nexora Desktop",
  "width": 1280,
  "height": 800,
  "minWidth": 900,
  "minHeight": 600,
  "center": true,
  "dragDropEnabled": true
}
```

2. Em `src-tauri/capabilities/default.json`, no array `permissions`, adicionar:

```json
"core:webview:allow-set-webview-focus",
"core:window:default",
"drag-drop:default"
```

> **Atenção:** o plugin de drag-drop está em `core:webview` em Tauri 2; verifica primeiro `npm run tauri info` e a documentação local. Se o identifier `drag-drop:default` não existir, substituir por `core:webview:allow-internal-toggle-devtools` é **errado**; nesse caso o handler de drop funciona via evento Tauri `tauri://drag-drop` directamente sem capability extra.

**Validação:**

```bash
cd src-tauri && cargo check
```

Deve compilar sem warnings. Depois, manual: arrastar um `.mp4` para a janela em `npm run tauri dev` deve disparar o evento (ainda sem UI a responder — isso vem em T04).

**Commit:**

```bash
git add src-tauri/tauri.conf.json src-tauri/capabilities/default.json
git commit -m "fix(tauri): enable drag-drop at window and capability level (T03)"
```

---

## T04 — Implementar handler `onDrop` no `DropZone.tsx`

**Objectivo:** Receber paths de ficheiros e enviá-los ao `onFilesSelected`.

**Causa-raiz:** O handler existe mas está vazio.

**Ficheiros:**

- `src/components/DropZone.tsx` (apenas o handler)

**Implementação:**

Substituir o handler `onDrop` por:

```tsx
import { listen } from '@tauri-apps/api/event';
import { useEffect } from 'react';

// Constantes ao topo do ficheiro
const SUPPORTED_EXTENSIONS = ['.mp4', '.mkv', '.mov', '.mxf', '.avi', '.webm'] as const;

function hasSupportedExtension(path: string): boolean {
  const lower = path.toLowerCase();
  return SUPPORTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

// Dentro do componente
useEffect(() => {
  const unlistenPromise = listen<{ paths: string[] }>('tauri://drag-drop', (event) => {
    setIsDragging(false);
    const paths = event.payload.paths.filter(hasSupportedExtension);
    if (paths.length === 0) {
      toast.error('Nenhum ficheiro com formato suportado.');
      return;
    }
    onFilesSelected(paths);
  });

  const unlistenEnter = listen('tauri://drag-enter', () => setIsDragging(true));
  const unlistenLeave = listen('tauri://drag-leave', () => setIsDragging(false));

  return () => {
    unlistenPromise.then((fn) => fn());
    unlistenEnter.then((fn) => fn());
    unlistenLeave.then((fn) => fn());
  };
}, [onFilesSelected]);
```

Manter o handler `onDrop` de HTML como fallback (caso o utilizador arraste de dentro do WebView), mas o caminho principal é via eventos Tauri.

**Validação:**

```bash
npm run typecheck                           # 0 erros
```

Manual: arrastar um `.mp4` válido — toast/log deve mostrar o path; arrastar um `.txt` — toast de erro.

**Commit:**

```bash
git add src/components/DropZone.tsx
git commit -m "fix(ui): implement drag-drop file handler with Tauri events (T04)"
```

---

## T05 — Corrigir spawn do sidecar Node.js

**Objectivo:** O sidecar tem de arrancar quando a app abre.

**Causa-raiz:** `sidecar.rs` chama `Command::new(&sidecar_path)` apontando para um binário nativo (`binaries/nexora-sidecar-{target_triple}`) que nunca foi compilado. O sidecar real é um script `.cjs` em `sidecar/dist/`.

**Ficheiros:**

- `src-tauri/src/sidecar.rs` (apenas a função de spawn)

**Implementação:**

Substituir o bloco de spawn por:

```rust
use std::process::{Command, Stdio};
use tauri::Manager;
use anyhow::{Result, anyhow, Context};

pub fn spawn_sidecar(app: &tauri::AppHandle) -> Result<std::process::Child> {
    // Resolver o caminho do script empacotado
    let resource_dir = app.path().resource_dir()
        .context("não foi possível resolver resource_dir")?;
    let script_path = resource_dir.join("sidecar").join("dist").join("nexora-sidecar.cjs");

    if !script_path.exists() {
        return Err(anyhow!(
            "sidecar script not found at {} — run `npm run sidecar:build` first",
            script_path.display()
        ));
    }

    // Resolver o caminho da base de dados
    let app_data_dir = app.path().app_data_dir()
        .context("não foi possível resolver app_data_dir")?;
    std::fs::create_dir_all(&app_data_dir).ok();
    let db_path = app_data_dir.join("nexora.db");

    log::info!("[sidecar] a arrancar: node {}", script_path.display());
    log::info!("[sidecar] DB: {}", db_path.display());

    let mut cmd = Command::new("node");
    cmd.arg(&script_path)
        .env("NEXORA_DB_PATH", db_path.to_string_lossy().to_string())
        .env("NEXORA_RESOURCE_DIR", resource_dir.to_string_lossy().to_string())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .stdin(Stdio::piped());

    // No Windows, esconder a janela do processo Node
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    let child = cmd.spawn()
        .map_err(|e| anyhow!(
            "falha ao arrancar sidecar — verifica que `node` está no PATH. Erro: {}", e
        ))?;

    log::info!("[sidecar] arrancou com PID {}", child.id());
    Ok(child)
}
```

**Validação:**

```bash
cd src-tauri && cargo check
```

Manual: `npm run tauri dev` — nos logs deve aparecer "[sidecar] arrancou com PID {n}". Sem essa linha, T05 não está concluída.

**Commit:**

```bash
git add src-tauri/src/sidecar.rs
git commit -m "fix(sidecar): spawn Node.js script via 'node' command (T05)"
```

---

## T06 — Versão dinâmica na UI

**Objectivo:** O footer mostra a versão real do `package.json`.

**Causa-raiz:** `App.tsx` tem string `"Versão Desktop 0.2.0"` hardcoded.

**Ficheiros:**

- `src/App.tsx`

**Implementação:**

Adicionar no topo:

```tsx
import { getVersion } from '@tauri-apps/api/app';
import { useEffect, useState } from 'react';
```

Dentro do componente:

```tsx
const [version, setVersion] = useState<string>('—');
useEffect(() => {
  getVersion()
    .then(setVersion)
    .catch(() => setVersion('?'));
}, []);
```

Substituir o footer:

```tsx
<span>Versão Desktop {version}</span>
```

**Validação:**

```bash
npm run typecheck
```

Manual: no footer deve aparecer `Versão Desktop 0.17.0` (ou o que estiver no Cargo.toml).

**Commit:**

```bash
git add src/App.tsx
git commit -m "fix(ui): show dynamic app version from Tauri API (T06)"
```

---

> ### `[PARA AQUI E AGUARDA APROVAÇÃO]`
>
> Antes de continuar para a FASE 2, executa `npm run tauri dev` e confirma manualmente que:
>
> 1. A app abre.
> 2. O drag-drop funciona (arrastar um `.mp4`).
> 3. O sidecar arranca (ver logs).
> 4. A versão no footer é `0.17.0`.
>
> Se algum destes 4 pontos falhar, **NÃO AVANCES** — reporta o erro e aguarda instruções.

---

# FASE 2 — SEGURANÇA (P0)

## T07 — Configurar Content Security Policy estrita

**Objectivo:** Substituir `"csp": null` por uma política que bloqueie scripts externos sem partir o IPC.

**Causa-raiz:** Com CSP `null`, qualquer recurso pode executar — risco real de XSS via metadados de ficheiros media (alguns codecs permitem comentários embedded).

**Ficheiros:**

- `src-tauri/tauri.conf.json`

**Implementação:**

Substituir `app.security`:

```json
"security": {
  "csp": {
    "default-src": "'self'",
    "img-src": "'self' asset: data: blob: https://asset.localhost",
    "media-src": "'self' asset: data: blob:",
    "connect-src": "'self' ipc: http://ipc.localhost",
    "script-src": "'self'",
    "style-src": "'self' 'unsafe-inline'",
    "font-src": "'self' data:"
  },
  "assetProtocol": {
    "enable": true,
    "scope": ["**"]
  }
}
```

> Notas:
>
> - `'unsafe-inline'` em `style-src` é necessário para o Tailwind v4 com JIT. Se for removido, o build falha.
> - `asset:` é necessário para mostrar thumbnails locais.
> - Se aparecerem erros de CSP no DevTools console depois desta tarefa, **não relaxar a política** — investigar de onde vem o recurso bloqueado.

**Validação:**

```bash
npm run tauri build -- --debug
```

A build deve completar. Em runtime, DevTools console não pode ter erros vermelhos de CSP nos fluxos principais (carregar lib, ver thumb, abrir settings).

**Commit:**

```bash
git add src-tauri/tauri.conf.json
git commit -m "security(tauri): enforce strict CSP for production builds (T07)"
```

---

## T08 — Auditoria de capabilities (least-privilege)

**Objectivo:** Reduzir permissões ao estritamente necessário.

**Causa-raiz:** `capabilities/default.json` usa o conjunto `*:default` (genérico). Tauri 2 permite granularidade muito superior.

**Ficheiros:**

- `src-tauri/capabilities/default.json`

**Implementação:**

Substituir o conteúdo por:

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "Capabilities da janela principal (least-privilege)",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "core:window:allow-show",
    "core:window:allow-hide",
    "core:window:allow-close",
    "core:window:allow-minimize",
    "core:window:allow-maximize",
    "core:window:allow-set-focus",
    "core:webview:default",
    "opener:allow-open-url",
    "opener:allow-reveal-item-in-dir",
    "notification:allow-notify",
    "notification:allow-is-permission-granted",
    "notification:allow-request-permission",
    "dialog:allow-open",
    "dialog:allow-save",
    "dialog:allow-message",
    "dialog:allow-confirm",
    "updater:allow-check",
    "updater:allow-download-and-install",
    "log:allow-log",
    "store:allow-get",
    "store:allow-set",
    "store:allow-save",
    "store:allow-load"
  ]
}
```

> Comparado com o original: removidas as permissões de leitura/escrita do filesystem genéricas (o sidecar é quem mexe em ficheiros), de `shell:execute` (o spawn é feito pelo Rust), e de `http` (não há fetches do frontend).

**Validação:**

```bash
cd src-tauri && cargo check
```

Manual: testar fluxos principais — guardar settings, abrir directoria de output, mostrar notificações, instalar update. Se algum falhar com `not allowed by capability`, adicionar a permissão específica em falta (sem voltar ao `*:default`).

**Commit:**

```bash
git add src-tauri/capabilities/default.json
git commit -m "security(tauri): apply least-privilege capability set (T08)"
```

---

# FASE 3 — ARQUITECTURA E PERFORMANCE (P1)

## T09 — Eliminar a duplicação SQLite

**Objectivo:** Apenas o Rust mantém conexão de escrita à DB. O sidecar comunica via stdout/IPC.

**Causa-raiz:** O sidecar Node.js abre a mesma DB com `better-sqlite3` enquanto o Rust a abre com `rusqlite`. Em WAL ainda funciona, mas com cargas reais já apareceram "database is locked" — confirmado nos logs em `.logs/dev-session-20260514-074602.log` (procurar "SQLITE_BUSY").

**Ficheiros:**

- `sidecar/db.ts` (apagar)
- `sidecar/orchestrator/NexoraDesktopOrchestrator.ts` (remover writes directos à DB)
- `sidecar/workers/*.ts` (substituir writes por emit de eventos)
- `src-tauri/src/sidecar.rs` (handler de stdout que persiste eventos na DB)

**Implementação:**

1. **Apagar** `sidecar/db.ts`.

2. Em cada worker, **remover** qualquer `import` ou uso de `db`. Substituir actualizações de estado por eventos:

```typescript
// Antes (proibido):
db.prepare('UPDATE jobs SET progress = ? WHERE id = ?').run(percent, jobId);

// Depois:
emitEvent({
  type: 'job:progress',
  jobId,
  step: 'transcode',
  percent,
  message: `Transcode em ${percent.toFixed(1)}%`,
});
```

3. Em `src-tauri/src/sidecar.rs`, garantir que o handler de stdout faz parsing de cada linha JSON e chama os repositórios Rust apropriados:

```rust
// Já existe um pattern parecido — assegurar que cada evento tem write na DB:
match event.event_type.as_str() {
    "job:progress" => repo::jobs::update_progress(&db, &event.job_id, event.percent, &event.step)?,
    "job:completed" => repo::jobs::mark_done(&db, &event.job_id, event.output_path.as_deref())?,
    "job:failed" => repo::jobs::mark_failed(&db, &event.job_id, &event.error.unwrap_or_default())?,
    "job:quarantined" => repo::jobs::mark_quarantined(&db, &event.job_id, &event.reason.unwrap_or_default())?,
    "asset:updated" => repo::assets::update_metadata(&db, &event.asset)?,
    "log" => logger::write(&db, &event.level, &event.source, &event.message)?,
    _ => log::warn!("[sidecar] evento desconhecido: {}", event.event_type),
}
```

4. **Remover** `better-sqlite3` e `@types/better-sqlite3` do `package.json` se nenhum outro código os usar:

```bash
npm uninstall better-sqlite3 @types/better-sqlite3
```

5. Actualizar o build do sidecar para não esperar a dependência:

```diff
- "sidecar:build": "esbuild sidecar/index.ts --bundle --platform=node --target=node20 --external:better-sqlite3 --outfile=sidecar/dist/nexora-sidecar.cjs",
+ "sidecar:build": "esbuild sidecar/index.ts --bundle --platform=node --target=node20 --outfile=sidecar/dist/nexora-sidecar.cjs",
```

**Validação:**

```bash
npm run sidecar:check                       # 0 erros TS
npm run sidecar:build                       # 0 warnings
npm run test                                # tests do sidecar passam
cd src-tauri && cargo test                  # tests Rust passam
```

**Commit:**

```bash
git commit -m "refactor(sidecar): single SQLite writer; sidecar communicates via IPC only (T09)"
```

---

## T10 — Substituir polling por eventos Tauri

**Objectivo:** Eliminar `setInterval` em hooks; reagir só a eventos reais.

**Causa-raiz:** `useJobStatus` faz `list_jobs` a cada 1 segundo. Com 0 jobs activos são 3 600 queries/hora a uma DB local — não é caro, mas latência de actualização da UI fica sempre presa nesse 1 segundo. `useDiskSpace` faz o mesmo a cada 10s.

**Ficheiros:**

- `src/hooks/useJobStatus.ts`
- `src/hooks/useDiskSpace.ts`
- `src-tauri/src/commands/metrics.rs` (emitir evento `disk-space` periódico)
- `src-tauri/src/lib.rs` (registar thread de disk-space)

**Implementação:**

1. Em `useJobStatus.ts`, substituir o polling por listener:

```tsx
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { useEffect } from 'react';
import { useJobsStore } from '@/store/jobs';

export function useJobStatus() {
  const { jobs, setJobs, updateJob } = useJobsStore();

  // Carga inicial (uma vez)
  useEffect(() => {
    invoke<Job[]>('list_jobs').then(setJobs).catch(console.error);
  }, [setJobs]);

  // Actualizações via eventos
  useEffect(() => {
    const unlisteners: Array<Promise<() => void>> = [
      listen<JobProgressEvent>('job-progress', (e) => {
        updateJob(e.payload.jobId, {
          progress: e.payload.percent,
          step: e.payload.step,
          status: 'processing',
        });
      }),
      listen<{ jobId: string }>('job-completed', (e) => {
        updateJob(e.payload.jobId, { status: 'done', progress: 100 });
      }),
      listen<{ jobId: string; error: string }>('job-failed', (e) => {
        updateJob(e.payload.jobId, { status: 'error', error: e.payload.error });
      }),
      listen<{ jobId: string; reason: string }>('job-quarantined', (e) => {
        updateJob(e.payload.jobId, { status: 'qc_quarantined', error: e.payload.reason });
      }),
    ];
    return () => {
      unlisteners.forEach((p) => p.then((fn) => fn()));
    };
  }, [updateJob]);

  return { jobs, loading: false };
}
```

2. Em `useDiskSpace.ts`, mesma estratégia. Adicionar no Rust uma thread que emite `disk-space` a cada 10s — já existe padrão similar em `metrics.rs` para `system-metrics`, replicar.

**Validação:**

```bash
npm run typecheck
npm run test
```

Manual: submeter um job, ver a progress bar a actualizar fluído (sem o "tique-tique" de 1s).

**Commit:**

```bash
git commit -m "perf(ui): replace polling with Tauri events in job and disk hooks (T10)"
```

---

## T11 — Persistência de settings via tauri-plugin-store

**Objectivo:** Settings vivem em ficheiro JSON na app data dir, não no localStorage.

**Causa-raiz:** `localStorage` é apagado quando o utilizador limpa o WebView ou reinstala. Settings deviam ser persistentes.

**Ficheiros:**

- `src-tauri/Cargo.toml` (adicionar plugin)
- `src-tauri/src/lib.rs` (registar plugin)
- `package.json` (adicionar `@tauri-apps/plugin-store`)
- `src/store/settings.ts` (substituir middleware persist)
- `src-tauri/capabilities/default.json` (já actualizado em T08)

**Implementação:**

1. `Cargo.toml`:

```toml
[dependencies]
tauri-plugin-store = "2"
```

2. `lib.rs`:

```rust
.plugin(tauri_plugin_store::Builder::default().build())
```

3. `npm install @tauri-apps/plugin-store`

4. Em `src/store/settings.ts`, criar storage adapter:

```tsx
import { Store } from '@tauri-apps/plugin-store';
import { create } from 'zustand';
import { persist, type StateStorage } from 'zustand/middleware';

const store = new Store('settings.json');

const tauriStorage: StateStorage = {
  getItem: async (name) => {
    const value = await store.get<string>(name);
    return value ?? null;
  },
  setItem: async (name, value) => {
    await store.set(name, value);
    await store.save();
  },
  removeItem: async (name) => {
    await store.delete(name);
    await store.save();
  },
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      /* ... estado existente ... */
    }),
    {
      name: 'nexora-settings',
      storage: {
        getItem: tauriStorage.getItem,
        setItem: tauriStorage.setItem,
        removeItem: tauriStorage.removeItem,
      },
    },
  ),
);
```

> **Migração:** ao primeiro arranque após esta tarefa, ler do localStorage e gravar no store, depois apagar do localStorage. Adicionar essa migração no `App.tsx`:

```tsx
useEffect(() => {
  const legacy = localStorage.getItem('nexora-settings');
  if (legacy) {
    store.set('nexora-settings', legacy).then(() => {
      store.save();
      localStorage.removeItem('nexora-settings');
    });
  }
}, []);
```

**Validação:**

```bash
npm run typecheck
npm run tauri dev
```

Manual:

1. Mudar uma setting (ex.: tema dark).
2. Fechar a app.
3. Apagar o ficheiro de cache do WebView (DevTools → Application → Clear storage).
4. Reabrir — a setting deve continuar lá.

**Commit:**

```bash
git commit -m "feat(settings): persist via tauri-plugin-store, migrate from localStorage (T11)"
```

---

## T12 — Logging unificado com tauri-plugin-log

**Objectivo:** Substituir o logger manual por plugin oficial; ver logs no console em dev e em ficheiro em produção.

**Ficheiros:**

- `src-tauri/Cargo.toml`
- `src-tauri/src/lib.rs`
- `src-tauri/src/logger.rs` (manter apenas o que escreve na DB para o `LogsPage` UI; remover stdout duplicado)

**Implementação:**

1. `Cargo.toml`:

```toml
tauri-plugin-log = { version = "2", features = ["colored"] }
```

2. `lib.rs` (antes de `.run`):

```rust
.plugin(
    tauri_plugin_log::Builder::new()
        .level(log::LevelFilter::Info)
        .targets([
            tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Stdout),
            tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::LogDir { file_name: Some("nexora-desktop".into()) }),
            tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Webview),
        ])
        .max_file_size(10_000_000) // 10 MB rotação
        .build()
)
```

3. Em `logger.rs`, manter apenas a função `write_to_db` que existe — remover qualquer `eprintln!` paralelo.

**Validação:**

```bash
npm run tauri dev
```

Verificar:

- DevTools → Console mostra logs com cores (vem do `Webview` target).
- Em `%APPDATA%\com.nexora.desktop\logs\nexora-desktop.log` (Windows) existe um ficheiro com os logs do Rust.

**Commit:**

```bash
git commit -m "feat(logging): adopt tauri-plugin-log for unified logging (T12)"
```

---

## T13 — Limpeza e classificação de dependências

**Objectivo:** `dependencies` só contém o que corre em produção.

**Ficheiros:**

- `package.json`

**Implementação:**

```bash
npm uninstall translate react-hot-toast

# Mover devs:
npm uninstall esbuild concurrently tsx
npm install -D esbuild concurrently tsx

# Novas devs (preparação para T14+):
npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin \
  eslint-plugin-react-hooks prettier rollup-plugin-visualizer \
  @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom

# Novas prod (substitutos e plugins):
npm install sonner @tanstack/react-virtual @tanstack/react-query recharts \
  @radix-ui/react-dialog @radix-ui/react-tooltip @radix-ui/react-progress \
  @tauri-apps/plugin-store @tauri-apps/plugin-log

# Actualizar:
npm install lucide-react@latest
```

**Validação:**

```bash
npm run typecheck
npm run build
```

A linha em `App.tsx` `import toast from 'react-hot-toast'` vai partir o build — corrigir em T15.

> **Não fazer T15 ainda.** Esta tarefa apenas instala/desinstala. O build vai falhar até T15 estar feita. Por isso este commit pode ficar com `[skip-ci]`.

**Commit:**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): reclassify deps and install new toolchain (T13) [skip-ci]"
```

---

# FASE 4 — UX E ACESSIBILIDADE (P2)

## T14 — Migrar para `sonner` (toasts)

**Ficheiros:**

- `src/main.tsx` (montar `<Toaster />`)
- Todos os ficheiros que importam `react-hot-toast` — usar grep:

```bash
grep -rln "react-hot-toast" src/
```

**Implementação:**

1. Em `src/main.tsx`:

```tsx
import { Toaster } from 'sonner';
// ...
<App />
<Toaster position="bottom-right" richColors closeButton />
```

2. Em cada ficheiro encontrado, substituir:

```diff
- import toast from 'react-hot-toast';
+ import { toast } from 'sonner';
```

A API é quase idêntica: `toast.success`, `toast.error`, `toast()`. A única diferença comum: `toast.promise()` é mais limpo no sonner — vale a pena adoptar onde aplicável (ex.: `submit_job`).

**Validação:**

```bash
npm run typecheck
npm run build                               # build agora passa
```

**Commit:**

```bash
git commit -m "feat(ui): migrate toasts to sonner (T14)"
```

---

## T15 — Substituir `HelpModal` por Radix Dialog

**Objectivo:** Modal com focus trap, ESC para fechar, ARIA correcto.

**Ficheiros:**

- `src/components/HelpModal.tsx`

**Implementação:**

Reescrever o componente usando `@radix-ui/react-dialog`:

```tsx
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

export function HelpModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40 data-[state=open]:animate-in data-[state=open]:fade-in" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[min(90vw,720px)] max-h-[85vh] overflow-y-auto rounded-lg bg-white dark:bg-neutral-900 shadow-xl p-6 focus:outline-none">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-lg font-semibold">Manual do utilizador</Dialog.Title>
            <Dialog.Close
              className="rounded p-1 hover:bg-neutral-200 dark:hover:bg-neutral-800"
              aria-label="Fechar"
            >
              <X size={18} />
            </Dialog.Close>
          </div>
          <Dialog.Description className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
            Guia rápido das funcionalidades do Nexora Desktop.
          </Dialog.Description>
          {/* Conteúdo existente */}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

**Validação:**

```bash
npm run typecheck
```

Manual: TAB dentro do modal não escapa para a UI por trás; ESC fecha; `aria-modal="true"` está presente no DevTools.

**Commit:**

```bash
git commit -m "feat(ui): accessible HelpModal with Radix Dialog (T15)"
```

---

## T16 — Virtualizar `LibraryPage` com TanStack Virtual

**Objectivo:** Render só dos items visíveis. Necessário para bibliotecas grandes.

**Ficheiros:**

- `src/pages/LibraryPage.tsx`

**Implementação:**

Para a vista em lista, envolver com `useVirtualizer`:

```tsx
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';

export function LibraryPage() {
  const parentRef = useRef<HTMLDivElement>(null);
  const filtered = /* asset filtrados */;

  const rowVirtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,   // altura aproximada de cada row
    overscan: 8,
  });

  return (
    <div ref={parentRef} className="h-full overflow-auto">
      <div style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}>
        {rowVirtualizer.getVirtualItems().map(virtualRow => (
          <div
            key={virtualRow.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: virtualRow.size,
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            <AssetRow asset={filtered[virtualRow.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

Para a vista em grid, usar `useVirtualizer` com `count` igual ao número de linhas (não de items) e renderizar `columnsPerRow` cartões por linha.

**Validação:**

```bash
npm run typecheck
```

Manual: criar 500 entradas fake na DB (script de seed em `scripts/seed-dev.ts`) e verificar que o scroll é instantâneo e o DOM tem ≤ 30 nós de asset visíveis.

**Commit:**

```bash
git commit -m "perf(ui): virtualize LibraryPage with TanStack Virtual (T16)"
```

---

## T17 — Gráficos do dashboard com recharts

**Objectivo:** Substituir as métricas estáticas/SVG manuais por gráficos profissionais.

**Ficheiros:**

- `src/pages/DashboardPage.tsx`
- `src/components/VMAFGauge.tsx` (eventualmente remover/refactor)
- `src/components/SystemMetricsBar.tsx` (substituir gauges por sparklines)

**Implementação:**

1. **Histograma de VMAF:** substitui o componente actual por:

```tsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const buckets = [
  { range: '<70', count: vmafCounts.below70 },
  { range: '70-80', count: vmafCounts.r70_80 },
  { range: '80-90', count: vmafCounts.r80_90 },
  { range: '90-100', count: vmafCounts.above90 },
];

<ResponsiveContainer width="100%" height={180}>
  <BarChart data={buckets}>
    <XAxis dataKey="range" />
    <YAxis allowDecimals={false} />
    <Tooltip />
    <Bar dataKey="count" fill="#4FB8A0" radius={[4, 4, 0, 0]} />
  </BarChart>
</ResponsiveContainer>;
```

2. **Sparkline CPU/RAM em tempo real:** manter um buffer de 60 pontos (1 min a 1Hz) e desenhar com `AreaChart`:

```tsx
const [history, setHistory] = useState<{ t: number; cpu: number; ram: number }[]>([]);
useEffect(() => {
  if (!metrics) return;
  setHistory((h) => [
    ...h.slice(-59),
    {
      t: Date.now(),
      cpu: metrics.cpuPercent,
      ram: (metrics.memUsedBytes / metrics.memTotalBytes) * 100,
    },
  ]);
}, [metrics]);

<ResponsiveContainer width="100%" height={60}>
  <AreaChart data={history}>
    <Area
      type="monotone"
      dataKey="cpu"
      stroke="#1A6FD4"
      fill="#1A6FD4"
      fillOpacity={0.15}
      strokeWidth={1.5}
    />
  </AreaChart>
</ResponsiveContainer>;
```

**Validação:**

```bash
npm run typecheck
```

Manual: dashboard mostra histograma com cores corretas; sparkline anima em tempo real.

**Commit:**

```bash
git commit -m "feat(dashboard): use recharts for VMAF histogram and system sparklines (T17)"
```

---

# FASE 5 — QUALIDADE E CI (P2)

## T18 — Configurar ESLint + Prettier

**Ficheiros:**

- `eslint.config.js` (novo, formato flat)
- `.prettierrc.json` (novo)
- `package.json` (scripts)

**Implementação:**

1. `eslint.config.js`:

```javascript
import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}', 'sidecar/**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } },
    },
    plugins: { '@typescript-eslint': tseslint, 'react-hooks': reactHooks },
    rules: {
      ...tseslint.configs['recommended'].rules,
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
];
```

2. `.prettierrc.json`:

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "always"
}
```

3. Scripts no `package.json`:

```json
"lint": "eslint . --max-warnings 0",
"lint:fix": "eslint . --fix",
"format": "prettier --write .",
"format:check": "prettier --check ."
```

**Validação:**

```bash
npm run lint                                # PODE falhar — corrigir warnings antes de commit
npm run format
```

**Commit:**

```bash
git commit -m "chore(quality): add ESLint + Prettier configs and scripts (T18)"
```

---

## T19 — Husky + lint-staged (pre-commit hooks)

**Ficheiros:**

- `.husky/pre-commit` (novo)
- `package.json` (config)

**Implementação:**

```bash
npm install -D husky lint-staged
npx husky init
```

Editar `.husky/pre-commit`:

```bash
#!/bin/sh
npx lint-staged
```

No `package.json`:

```json
"lint-staged": {
  "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
  "*.{json,md,css}": ["prettier --write"]
}
```

**Validação:**

```bash
git add . && git commit -m "test: trigger husky"
```

O hook deve correr eslint e prettier nos staged. Se passar, commit avança. Se falhar, commit cancela.

**Commit:**

```bash
git commit -m "chore(quality): pre-commit hooks via husky + lint-staged (T19)"
```

---

## T20 — Bundle analyzer no Vite

**Ficheiros:**

- `vite.config.ts`

**Implementação:**

Adicionar plugin condicional:

```tsx
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react(),
    process.env.ANALYZE &&
      visualizer({
        open: true,
        gzipSize: true,
        brotliSize: true,
        filename: 'dist/stats.html',
      }),
  ].filter(Boolean),
  build: {
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'ui-vendor': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-progress',
            'lucide-react',
          ],
          'chart-vendor': ['recharts'],
          'tauri-vendor': [
            '@tauri-apps/api',
            '@tauri-apps/plugin-dialog',
            '@tauri-apps/plugin-store',
            '@tauri-apps/plugin-log',
          ],
          'i18n-vendor': ['i18next', 'react-i18next', 'i18next-browser-languagedetector'],
        },
      },
    },
  },
});
```

Adicionar script:

```json
"build:analyze": "ANALYZE=true vite build"
```

**Validação:**

```bash
npm run build:analyze
```

Deve abrir o browser com o treemap. Procurar:

- `react-vendor` deve ser ~140 KB gzipped.
- Nenhum chunk único deve passar 300 KB gzipped.

**Commit:**

```bash
git commit -m "build(vite): manual chunks + bundle analyzer script (T20)"
```

---

## T21 — Testes de componentes React

**Ficheiros:**

- `vitest.config.ts` (actualizar)
- `tests/setup.ts` (novo)
- `tests/components/DropZone.test.tsx` (novo)
- `tests/components/JobCard.test.tsx` (novo)

**Implementação:**

1. `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
    coverage: {
      reporter: ['text', 'html', 'lcov'],
      exclude: ['**/*.test.*', '**/types.ts', 'src-tauri/**'],
      thresholds: { lines: 60, functions: 60, branches: 60, statements: 60 },
    },
  },
});
```

2. `tests/setup.ts`:

```ts
import '@testing-library/jest-dom';
import { vi } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));
vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn().mockResolvedValue(() => {}),
  emit: vi.fn(),
}));
```

3. `tests/components/DropZone.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { DropZone } from '@/components/DropZone';

describe('DropZone', () => {
  it('renderiza com a mensagem por defeito', () => {
    render(<DropZone onFilesSelected={() => {}} />);
    expect(screen.getByText(/arrasta/i)).toBeInTheDocument();
  });

  it('abre file picker ao clicar', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<DropZone onFilesSelected={onSelect} />);
    await user.click(screen.getByRole('button'));
    // O picker abre via Tauri — verificamos que o invoke do dialog foi chamado
    const { open } = await import('@tauri-apps/plugin-dialog');
    expect(open).toHaveBeenCalled();
  });
});
```

**Validação:**

```bash
npm run test:coverage
```

Os 24 tests existentes mais 2 novos. Coverage ≥ 60%.

**Commit:**

```bash
git commit -m "test(components): add Testing Library setup and DropZone tests (T21)"
```

---

## T22 — Dependabot e CI mais robusta

**Ficheiros:**

- `.github/dependabot.yml` (novo)
- `.github/workflows/ci.yml` (actualizar)

**Implementação:**

1. `.github/dependabot.yml`:

```yaml
version: 2
updates:
  - package-ecosystem: 'npm'
    directory: '/'
    schedule:
      interval: 'weekly'
    open-pull-requests-limit: 5
    groups:
      tauri:
        patterns: ['@tauri-apps/*', 'tauri-plugin-*']
      react:
        patterns: ['react', 'react-dom', '@types/react*']
      testing:
        patterns: ['vitest', '@testing-library/*', 'jsdom']
  - package-ecosystem: 'cargo'
    directory: '/src-tauri'
    schedule:
      interval: 'weekly'
    open-pull-requests-limit: 5
  - package-ecosystem: 'github-actions'
    directory: '/'
    schedule:
      interval: 'monthly'
```

2. Em `.github/workflows/ci.yml`, adicionar jobs (não remover os existentes):

```yaml
lint:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with: { node-version: 20, cache: npm }
    - run: npm ci
    - run: npm run lint
    - run: npm run format:check

test-rust:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: dtolnay/rust-toolchain@stable
      with: { components: clippy }
    - run: sudo apt-get update && sudo apt-get install -y libwebkit2gtk-4.1-dev
    - run: cd src-tauri && cargo clippy --all-targets -- -D warnings
    - run: cd src-tauri && cargo test
```

**Validação:**

```bash
# push e ver no GitHub se os jobs aparecem verdes
git push origin chore/audit-v0.18
```

**Commit:**

```bash
git commit -m "ci: dependabot + lint and rust jobs in CI (T22)"
```

---

# FASE 6 — PROFISSIONALIZAÇÃO (P3)

## T23 — Code signing (apenas documentação)

**Objectivo:** Documentar o processo. Não há execução automática nesta tarefa — depende de certificados que o utilizador tem de adquirir/configurar como secrets.

**Ficheiros:**

- `docs/RELEASE.md` (novo)

**Implementação:**

Criar `docs/RELEASE.md` com:

- Como gerar key pair de updater (`npm run tauri signer generate -- -w ~/.tauri/myapp.key`).
- Quais secrets configurar no GitHub Actions (`TAURI_SIGNING_PRIVATE_KEY`, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`, `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_ID`, `APPLE_PASSWORD`, `APPLE_TEAM_ID`, `WINDOWS_CERTIFICATE`, `WINDOWS_CERTIFICATE_PASSWORD`).
- Workflow de release: tag → build → assina → publica → updater pega.
- Onde comprar certificados: DigiCert/Sectigo (Windows EV), Apple Developer Program (macOS).

**Validação:** documento existe e está no índice do `README.md`.

**Commit:**

```bash
git commit -m "docs(release): document code signing workflow (T23)"
```

---

## T24 — Telemetria opt-in (Sentry, opcional)

**Objectivo:** Capturar crashes em produção, **apenas com consentimento explícito do utilizador**.

**Ficheiros:**

- `package.json` (`@sentry/react`)
- `src/lib/telemetry.ts` (novo)
- `src/main.tsx`
- `src/pages/SettingsPage.tsx`

**Implementação:**

1. Adicionar `@sentry/react` e `@sentry/tauri` (se disponível) ou usar apenas `@sentry/react`.

2. `src/lib/telemetry.ts`:

```ts
import * as Sentry from '@sentry/react';

export function initTelemetry(enabled: boolean) {
  if (!enabled || !import.meta.env.PROD) return;
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    beforeSend(event) {
      // Remover dados pessoais que possam ter caído no contexto
      delete event.user;
      delete event.request?.cookies;
      return event;
    },
  });
}
```

3. Em `main.tsx`, ler a setting:

```tsx
const telemetryEnabled = (await store.get<boolean>('telemetryEnabled')) ?? false;
initTelemetry(telemetryEnabled);
```

4. Em `SettingsPage.tsx`, adicionar toggle com descrição clara em PT-PT:

```tsx
<Switch
  label="Enviar relatórios de erros anónimos"
  description="Ajuda a melhorar a aplicação. Nenhum dado pessoal é enviado. Pode desactivar a qualquer momento."
  checked={telemetryEnabled}
  onChange={setTelemetryEnabled}
/>
```

> **Importante:** o toggle vem desactivado por defeito. A app **não** envia nada até o utilizador o ligar explicitamente.

**Validação:**

```bash
npm run typecheck
```

Manual: toggle aparece desactivado; ao activar e provocar um erro (botão de debug), o evento aparece no dashboard Sentry.

**Commit:**

```bash
git commit -m "feat(telemetry): opt-in Sentry crash reporting (T24)"
```

---

# FECHO

## T25 — Bump de versão e CHANGELOG

**Ficheiros:**

- `package.json`
- `src-tauri/Cargo.toml`
- `src-tauri/tauri.conf.json`
- `CHANGELOG.md`

**Implementação:**

Actualizar version para `0.18.0` nos três ficheiros. No `CHANGELOG.md`, adicionar:

```markdown
## [0.18.0] - 2026-MM-DD

### Corrigido

- Drag-and-drop de ficheiros agora funciona em todas as plataformas (T03, T04)
- Sidecar Node.js arranca correctamente em produção (T05)
- Versão da aplicação mostrada dinamicamente na UI (T06)

### Segurança

- CSP estrita configurada (T07)
- Capabilities aplicam least-privilege (T08)

### Performance

- Eliminada duplicação de conexões SQLite (T09)
- Polling substituído por eventos Tauri (T10)
- LibraryPage virtualizada com TanStack Virtual (T16)

### Melhorias

- Settings persistidas via tauri-plugin-store (T11)
- Logging unificado com tauri-plugin-log (T12)
- Toasts modernizados com sonner (T14)
- Modais acessíveis com Radix Dialog (T15)
- Dashboard com gráficos recharts (T17)

### Qualidade

- ESLint + Prettier configurados (T18)
- Pre-commit hooks via husky (T19)
- Bundle analyzer integrado (T20)
- Testes de componentes React adicionados (T21)
- Dependabot + jobs CI adicionais (T22)
```

**Validação:**

```bash
npm run typecheck
npm run lint
npm run test:coverage
npm run build
cd src-tauri && cargo clippy --all-targets -- -D warnings && cargo test && cd ..
npm run tauri build -- --debug
```

**Todos** os comandos têm de passar antes de fazer merge.

**Commit:**

```bash
git add CHANGELOG.md package.json package-lock.json src-tauri/Cargo.toml src-tauri/Cargo.lock src-tauri/tauri.conf.json
git commit -m "chore(release): bump version to 0.18.0 (T25)"
git push origin chore/audit-v0.18
```

Abrir Pull Request `chore/audit-v0.18 → main` com a descrição abaixo.

---

## TEMPLATE DA PULL REQUEST

```markdown
# Nexora Desktop v0.18.0 — Auditoria e Optimização Total

Implementa 24 tarefas (T01–T25) que cobrem bugs bloqueantes, segurança, performance,
qualidade de código e UX.

## Bugs corrigidos

- ✅ Drag-and-drop inoperante (T03, T04)
- ✅ Sidecar nunca arrancava (T05)
- ✅ Versão hardcoded (T06)

## Mudanças quebradoras (breaking)

- Nenhuma para o utilizador final. Para developers:
  - Settings migradas automaticamente de localStorage para tauri-plugin-store.
  - `better-sqlite3` removido do sidecar — IPC via stdout é o único canal.

## Como testar

1. `git checkout chore/audit-v0.18 && npm ci && npm run tauri dev`
2. Arrastar `.mp4` para a janela → tem de aparecer na biblioteca.
3. Submeter um job → progress bar tem de actualizar fluído.
4. Fechar e abrir a app → settings preservadas.
5. DevTools console → zero erros de CSP nos fluxos principais.

## Métricas

- Bundle JS: antes / depois (correr `npm run build:analyze` antes e depois)
- Coverage: antes / depois
- Tempo de arranque: antes / depois

## Checklist

- [x] `npm run typecheck`
- [x] `npm run lint`
- [x] `npm run test:coverage` ≥ 60%
- [x] `cargo clippy -- -D warnings`
- [x] `cargo test`
- [x] `npm run tauri build -- --debug`
- [x] Testado manualmente em Windows
- [ ] Testado manualmente em macOS _(se aplicável)_
- [ ] Testado manualmente em Linux _(se aplicável)_
```

---

## NOTAS FINAIS PARA O AGENTE

- Se uma tarefa parece "demasiado simples" — confia no plano. Está fragmentada de propósito para diffs pequenos.
- Se encontrares algo no caminho que não está neste plano (ex.: um bug óbvio noutro ficheiro), **NÃO o corrijas na mesma PR**. Cria um issue e segue em frente. PRs gigantes não passam revisão.
- O `[PARA AQUI]` depois da Fase 1 é não-negociável. A primeira fase resolve os bugs críticos — sem isso a app não funciona e as fases seguintes não têm como ser testadas.
- Português de Portugal nos comentários, **sempre**. Inglês nos identificadores.
- Após concluir todas as tarefas, marca este ficheiro como `processed` no início (adiciona uma linha `> Status: ✅ Concluído em YYYY-MM-DD`) e move-o de `CLAUDE-CODE-TASKS.md` para `docs/audits/v0.18-audit.md`.

— Fim do documento —
