# Estado de Sincronizacao - Nexora Desktop

> Handoff entre Claude Code e Google Antigravity.
> Actualizar no FIM de cada sessao. Lido no INICIO de cada sessao.

---

Actualizado: 2026-05-13 19:35
Agente: Claude Code (Kimi K2.6)

## O que foi feito

### Sessao Actual - Resolucao de Binarios + Correcoes de Consistencia - CONCLUIDO

**1. Resolucao de Binarios FFmpeg Bundled (CRITICO)**
- **sidecar/binaries.ts (NOVO)**: Helper central que resolve o path absoluto do FFmpeg/FFprobe:
  - Prioridade 1: `process.env['NEXORA_FFMPEG_PATH']` / `NEXORA_FFPROBE_PATH` (passado pelo Rust)
  - Prioridade 2: Ao lado do executavel em dev (`target/debug/ffmpeg.exe`)
  - Prioridade 3: Nome do comando no PATH (`ffmpeg` / `ffprobe`)
- **src-tauri/src/sidecar.rs**: Modificado para:
  - Nova funcao `resolve_media_binary_path()` que procura binarios em cascata
  - Passa `NEXORA_FFMPEG_PATH` e `NEXORA_FFPROBE_PATH` como variaveis de ambiente ao sidecar
  - Logging informativo quando binarios bundled sao encontrados (ou nao)
- **Workers actualizados**: Todos os 5 workers que usam FFmpeg/FFprobe agora importam de `../binaries`:
  - `transcode-worker.ts`, `audio-worker.ts`, `proxy-worker.ts`, `thumbnail-worker.ts` -> `getFfmpegPath()`
  - `ingest-worker.ts` -> `getFfprobePath()`

**2. Correcoes de Consistencia**
- **src-tauri/src/commands/system.rs**: `get_stats` usava `status IN ('queued', 'running')` -> corrigido para `'processing'` (nome correto no schema)
- **src/pages/SettingsPage.tsx**: Campo `nodejs_version` alinhado com `node_version` (camelCase do backend serde)
- **src/pages/LibraryPage.tsx**: `handleDrop` implementado via `getCurrentWebviewWindow().onDragDropEvent()` - ingest real de ficheiros arrastados para a Biblioteca
- **src/components/HelpModal.tsx**: Adicionado `'troubleshoot'` ao union type `TabId` (TypeScript strict)
- **src-tauri/Cargo.toml**: Campo `description` limpo de mojibake -> `"Nexora Media Processing - Desktop Native"`

**3. Validacao de Build**
- `cargo check`: OK (0.63s)
- `npm run sidecar:build`: OK (33kb bundle)
- `npx tsc --noEmit`: OK (0 erros)
- `npx vitest run`: 24/24 tests passaram
- `npm run tauri build`: OK (gerou .exe e .msi)

---

## Estado de compilacao

- `cargo check`: **OK**
- `npm run sidecar:build`: **OK** (33kb)
- `tsc --noEmit`: **OK** (0 erros)
- `vitest run`: **OK** (24/24)
- `tauri build`: **OK** (.exe + .msi gerados)

---

## Proximos passos

| Tarefa | Prioridade |
|---|---|
| Testar fluxo real completo: ingest -> job -> transcode -> done | Critica |
| Validar que FFmpeg bundled e usado (verificar logs do sidecar) | Critica |
| Adicionar bs1770gain ao download de binarios (ou tornar opcional) | Alta |
| Adicionar testes de integracao Tauri (e2e) | Media |
| VMAF real no QC-Post (requer libvmaf no FFmpeg bundled) | Baixa |
| Deep links nexora:// (ADR-D012) | Baixa |
| Merge dev -> main para release v0.13.0 | Alta (quando autorizado) |

---

## Ficheiros modificados (sessao actual)

```
sidecar/binaries.ts               (NOVO - helper resolucao FFmpeg/FFprobe)
sidecar/workers/transcode-worker.ts   (import getFfmpegPath)
sidecar/workers/audio-worker.ts       (import getFfmpegPath)
sidecar/workers/proxy-worker.ts       (import getFfmpegPath)
sidecar/workers/thumbnail-worker.ts   (import getFfmpegPath)
sidecar/workers/ingest-worker.ts      (import getFfprobePath)
src-tauri/src/sidecar.rs              (resolve_media_binary_path + env vars)
src-tauri/src/commands/system.rs      (get_stats: 'running' -> 'processing')
src-tauri/Cargo.toml                  (description limpa)
src/pages/LibraryPage.tsx             (onDragDropEvent + ingest)
src/pages/SettingsPage.tsx            (node_version tipagem)
src/components/HelpModal.tsx          (TabId + 'troubleshoot')
PROGRESS-DESKTOP.md                   (actualizado)
SYNC-STATE.md                         (actualizado)
```

---

## Notas tecnicas para o proximo agente

- **Binarios FFmpeg**: O Tauri 2 copia os `externalBin` para `target/debug/` (dev) e `resource_dir()` (producao). O `sidecar.rs` procura nestes locais e passa os paths absolutos ao sidecar via env vars. O `sidecar/binaries.ts` consome estas env vars. Se nao encontrar, faz fallback para `ffmpeg`/`ffprobe` no PATH.
- **Branch git**: Estamos em `dev`. `origin/main` existe mas esta atrasado (v0.3.1). Nao fazer merge para main sem autorizacao explicita do utilizador.
- **Tauri IPC**: Novos comandos `exit_app` e `factory_reset` foram adicionados pelo Antigravity. Verificar `src-tauri/src/lib.rs` se houver erros de invoke.
- **Logs**: O logger do Rust escreve na BD SQLite e emite eventos Tauri (`log-entry`). O sidecar emite eventos JSON no stdout que o Rust consome e re-emite como `sidecar:event`.
