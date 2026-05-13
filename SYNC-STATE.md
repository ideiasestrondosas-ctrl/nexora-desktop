# Estado de Sincronizacao - Nexora Desktop

> Handoff entre Claude Code e Google Antigravity.
> Actualizar no FIM de cada sessao. Lido no INICIO de cada sessao.

---

Actualizado: 2026-05-13 21:30
Agente: Claude Code (Kimi K2.6)

## O que foi feito

### Sessao Actual - Correcao do Script de Sync + Release v0.16.0 - CONCLUIDO

**1. Correcao do Script `scripts/sync.ps1` (CRITICO)**
- **Problema**: O script fazia `git merge dev --ff-only` e depois fallback para merge normal. Quando a `main` remota foi reescrita (cleanup de binarios), o merge criava history divergente e o push falhava com `non-fast-forward`.
- **Solucao**: Implementado squash merge para preservar o history limpo da `main`:
  1. `git fetch origin main` - sincroniza com a main remota
  2. `git reset --hard origin/main` - parte do estado limpo (descarta merges locais falhados)
  3. `git merge --squash dev` - aplica todas as mudancas da dev como patch unico
  4. `git commit -m "chore(release): v$newVersion"` - commit de release
  5. `git push origin main` - push (sempre fast-forward agora)
- **Resultado**: O script agora funciona correctamente mesmo quando a `main` tem history reescrito.

**2. Release v0.16.0 - Merge dev -> main**
- Commit na `dev`: `fix(sync): testar squash merge dev -> main`
- Squash merge para `main`: `chore(release): v0.16.0`
- **Conflitos resolvidos manualmente** durante o squash merge:
  - `.gitignore`, `package.json`, `package-lock.json` - versao da dev (mais recente)
  - `src-tauri/Cargo.lock`, `Cargo.toml`, `tauri.conf.json` - versao da dev
  - `src/App.tsx`, `src/components/DropZone.tsx`, `src/pages/SettingsPage.tsx` - versao da dev
  - `src/pages/HistoryPage.tsx`, `src/pages/ProcessPage.tsx` - removidos (renomeados na dev)
- Push para `origin/main`: **SUCESSO** (`6581dde..4a2aca4 main -> main`)
- Push para `origin/dev`: **SUCESSO** (`9e9a44e..360098c dev -> dev`)

**3. Estado Actual dos Branches**
| Branch | Commit | Descricao |
|---|---|---|
| `dev` | `360098c` | `fix(sync): testar squash merge dev -> main` |
| `main` | `4a2aca4` | `chore(release): v0.16.0` (squash merge da dev) |
| `origin/dev` | `360098c` | Sincronizado |
| `origin/main` | `4a2aca4` | Sincronizado |

**4. Pipeline Testado (sessao anterior)**
- Fluxo completo ingest -> transcode -> audio -> proxy -> thumbnail -> qc-post -> delivery funciona com FFmpeg bundled
- LUFS: -21.99 (proximo do target -23)
- Sem erros, todos os ficheiros gerados correctamente

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
| Testar script sync.ps1 numa nova sessao para confirmar robustez | Alta |
| Adicionar bs1770gain ao download de binarios (ou tornar opcional) | Alta |
| Adicionar testes de integracao Tauri (e2e) | Media |
| VMAF real no QC-Post (requer libvmaf no FFmpeg bundled) | Baixa |
| Deep links nexora:// (ADR-D012) | Baixa |

---

## Ficheiros modificados (sessao actual)

```
scripts/sync.ps1                        (CORRIGIDO - squash merge dev -> main)
SYNC-STATE.md                           (actualizado)
```

---

## Notas tecnicas para o proximo agente

- **Script de Sync**: O `scripts/sync.ps1` agora usa squash merge para `dev` -> `main`. Isto preserva o history limpo da `main` (sem binarios grandes) e evita conflitos quando a `main` tem history reescrito. O script funciona em 3 passos: fetch + reset --hard origin/main -> merge --squash dev -> commit -> push.
- **Binarios FFmpeg**: O Tauri 2 copia os `externalBin` para `target/debug/` (dev) e `resource_dir()` (producao). O `sidecar.rs` procura nestes locais e passa os paths absolutos ao sidecar via env vars. O `sidecar/binaries.ts` consome estas env vars.
- **Branch git**: Ambos os branches (`dev` e `main`) estao sincronizados com o GitHub. A `main` tem history limpo (v0.16.0). A `dev` tem o desenvolvimento completo.
- **Tauri IPC**: Novos comandos `exit_app` e `factory_reset` foram adicionados pelo Antigravity. Verificar `src-tauri/src/lib.rs` se houver erros de invoke.
- **Pipeline testado**: Fluxo completo funciona com FFmpeg bundled.
