# Estado de Sincronização — Nexora Desktop

> Handoff entre Claude Code e Google Antigravity.
> Actualizar no FIM de cada sessão. Lido no INÍCIO de cada sessão.

---

Actualizado: 2026-05-10
Agente: Claude Sonnet 4.6

## O que foi feito

### Prompt Desktop 4 — Concluído

Build, testes e distribuição completos:

- **GitHub Actions** (`build.yml`): pipeline para Windows, macOS Universal, Linux; matrix com rust targets correctos; `fail-fast: false`; `permissions: contents: write` para criação de releases
- **Script de binários** (`scripts/download-media-binaries.js`): descarrega FFmpeg/FFprobe pré-compilados para as 3 plataformas; Windows/Linux via BtbN; macOS: arm64 nativo do sistema (Homebrew no runner GitHub arm64) + x86_64 do evermeet.cx + `lipo -create` para fat binary universal; fallback gracioso se lipo receber duas fatias x86_64
- **Testes unitários** (`vitest`): `tests/queue.test.ts`, `tests/orchestrator.test.ts`, `tests/workers.test.ts`; mock correcto de `sidecar/db` e `sidecar/events`; `vi.advanceTimersByTimeAsync` para timers recursivos
- **Auto-updater**: `tauri-plugin-updater` com `installMode: "passive"`; `updater:default` nas capabilities
- **Placeholders de binários** (`src-tauri/binaries/`): ficheiros vazios para `cargo check` passar sem binários reais; `.gitignore` actualizado com negações explícitas para preservar placeholders
- **Fix de BOM**: `tauri.conf.json` reescrito sem UTF-8 BOM (causava panic no parser Tauri)
- **Correcções TypeScript no código do Antigravity**: 11 erros de compilação corrigidos (imports não usados, `bool` → `boolean`)
- **GitHub Release v0.3.5**: build bem-sucedido nas 3 plataformas após 5 iterações de CI

### Build local concluído (Windows)

```
src-tauri\target\release\bundle\msi\Nexora Desktop_0.3.1_x64_en-US.msi
src-tauri\target\release\bundle\nsis\Nexora Desktop_0.3.1_x64-setup.exe
```

## Estado de compilação

- `cargo check`: OK
- `tsc --noEmit`: OK
- `npm test` (vitest): OK — 24 testes passam (queue: 6, orchestrator: 9, workers: 9)
- CI GitHub Actions v0.3.5: ✓ Windows · ✓ macOS Universal · ✓ Linux

## Próximos passos

Bugs críticos e gap analysis identificados em `Plano — Bugs + Gap Analysis Nexora Desktop.md`.

### Para Claude Code (por esta ordem):

1. **A2** — `sidecar.rs`: substituir tentativa de executável nativo por `node sidecar/dist/nexora-sidecar.js` via `resource_dir()`
2. **A1-A** — `tauri.conf.json` + `capabilities/default.json`: activar drag-drop (`dragDropEnabled: true`, permissão `drag-drop:default`)
3. **B1-A** — Command Rust `list_profiles` (lê `sidecar/profiles/*.json`)
4. **B3-A** — `npm install react-hot-toast`
5. **B5-A** — Command Rust `get_stats` (métricas: assets, jobs hoje, VMAF médio, disco)
6. **B7-A** — Command Rust `delete_asset` (soft delete + filtro em `list_assets`)
7. **B8** — `delivery-worker.ts`: suporte a `output_dir_{profile}` por perfil

### Para Google Antigravity (em paralelo ou após os Claude Code correspondentes):

- A1-B: `DropZone.tsx` — implementar `onDrop` handler (depende de A1-A)
- A3: `App.tsx` — versão dinâmica no footer via `invoke('get_app_version')`
- B1-B: dropdown de perfil no `ProcessPage.tsx` (depende de B1-A)
- B2: search + filtros + acções no `HistoryPage.tsx`
- B3-B: integrar toasts (depende de B3-A)
- B4: `AssetDetailModal.tsx`
- B5-B: `DashboardPage.tsx` (depende de B5-A)
- B6: GPU badge + disco no header/footer
- B7-B: botão remover no `HistoryPage.tsx` (depende de B7-A)
- B9: secção Changelog nas Settings

## Ficheiros criados/modificados nesta sessão

```
.github/workflows/build.yml
scripts/download-media-binaries.js
tests/queue.test.ts
tests/orchestrator.test.ts
tests/workers.test.ts
vitest.config.ts
src-tauri/tauri.conf.json          (BOM removido, updater, externalBin, resources)
src-tauri/Cargo.toml               (tauri-plugin-updater)
src-tauri/capabilities/default.json (updater:default)
src-tauri/src/lib.rs               (plugin updater, db_path para sidecar)
src-tauri/src/sidecar.rs           (NEXORA_DB_PATH env var)
src-tauri/binaries/                (10 placeholders — 5 ffmpeg + 5 ffprobe)
src/App.tsx                        (fix: import React removido)
src/hooks/useGPU.ts                (fix: bool → boolean)
src/components/DropZone.tsx        (fix: imports não usados)
src/components/JobCard.tsx         (fix: imports não usados)
src/hooks/useJobStatus.ts          (fix: destructure não usado)
src/pages/HistoryPage.tsx          (fix: imports não usados)
src/pages/ProcessPage.tsx          (fix: imports não usados)
src/pages/SettingsPage.tsx         (fix: imports não usados)
SYNC-STATE.md
```

## Notas técnicas para o próximo agente

- **Node.js no sidecar**: o sidecar é um script JS (`sidecar/dist/nexora-sidecar.js`), não um executável nativo. O `sidecar.rs` actual tenta um binário nativo que não existe — **este é o bug A2, o primeiro a corrigir**
- **drag-drop**: o Tauri 2 intercepta eventos de ficheiros por defeito. Sem `dragDropEnabled: true` no `tauri.conf.json`, os eventos nunca chegam ao React — **este é o bug A1**
- **Versão no tauri.conf.json**: está em `0.3.1` (valor no ficheiro); o `get_app_version` command lê este valor dinamicamente
- **Perfis de transcode**: `sidecar/profiles/*.json` — 6 ficheiros (broadcast-hd, broadcast-sd, proxy, social, web-4k, web-hd)
- **CI/CD**: a tag `v0.3.5` foi a primeira a compilar nas 3 plataformas sem erros
