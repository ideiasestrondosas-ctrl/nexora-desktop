# Estado de Sincronização — Nexora Desktop

> Handoff entre Claude Code e Google Antigravity.
> Actualizar no FIM de cada sessão. Lido no INÍCIO de cada sessão.

---

Actualizado: 2026-05-10
Agente: Claude Sonnet 4.6

## O que foi feito

### Prompt Desktop 5 — Bug fixes + Gap Analysis — Concluído

Todos os 7 passos do plano Claude Code executados e validados (`cargo check` + `sidecar:check` limpos):

**Passo 1 — A2 · sidecar.rs corrigido**
- Substituído: tentativa de executável nativo `binaries/nexora-sidecar-{OS}-{ARCH}` (não existia)
- Novo: `Command::new("node").arg(&script_path)` com env `NEXORA_DB_PATH`
- `resolve_script_path()`: fallback em 3 níveis (resource_dir → exe/../../../sidecar/dist → cwd)
- Pré-verifica `node --version` antes do spawn; warn gracioso se sidecar.js não encontrado

**Passo 2 — A1-A · drag-drop activado**
- `tauri.conf.json`: `"dragDropEnabled": false` na janela main
  (Tauri 2.x: desactivar intercepção nativa é obrigatório para HTML5/React onDrop no Windows)
- Capabilities: sem alteração — `drag-drop:default` não existe no ACL do Tauri 2

**Passo 3 — B1-A · comando list_profiles**
- Criado `src-tauri/src/commands/profiles.rs`
- 6 perfis embutidos em compile-time via `include_str!`
- Retorna `Vec<Profile>` com: `id`, `name`, `description`, `container` ("mp4"), `videoCodec`, `resolution`, `fps`, `vmafThreshold`
- Registado em `mod.rs` e `invoke_handler` em `lib.rs`

**Passo 4 — B3-A · react-hot-toast instalado**
- `react-hot-toast@2.6.0` — peer dep `react: ">=16"`, compatível com React 19.1
- Tipos bundled; 0 vulnerabilidades
- Uso: `import { Toaster, toast } from 'react-hot-toast'`

**Passo 5 — B5-A · comando get_stats**
- Adicionado a `system.rs`; retorna `AppStats` com `camelCase` serialization
- 4 queries SQLite: `totalAssets`, `jobsToday` (date atual UTC), `avgVmaf` (apenas scores preenchidos), `activeJobs` (queued + running)
- Disco: lê `app_data_dir()` como caminho de referência, reutiliza `disk_space_impl`; retorna `null` se falhar

**Passo 6 — B7-A · delete_asset + filtro list_assets**
- `delete_asset(id)`: soft delete via `UPDATE assets SET status = 'deleted', updated_at = now`; erro se ID não existir
- `list_assets` sem `status`: exclui automaticamente `status = 'deleted'`; chamada explícita com `status: "deleted"` mostra lixeira
- Registado no `invoke_handler`

**Passo 7 — B8 · delivery-worker.ts — output_dir por perfil**
- Cadeia de prioridade: `output_dir_{profile}` → `output_dir` global → `ctx.outputDir`
- `|| null` em ambas as lookups: strings vazias (default das settings) activam o fallback correctamente
- Exemplo: `update_settings("output_dir_broadcast-hd", "/exports/broadcast")` — sem schema extra

### Sessão anterior — Prompt Desktop 4 — também concluído

CI GitHub Actions v0.3.5: ✓ Windows · ✓ macOS Universal · ✓ Linux
(ver SYNC-STATE sessão anterior para detalhes)

---

## Estado de compilação

- `cargo check`: OK
- `npm run sidecar:check` (tsc): OK
- `npm test` (vitest): OK — 24 testes passam (queue: 6, orchestrator: 9, workers: 9)
- CI GitHub Actions v0.3.5: ✓ Windows · ✓ macOS Universal · ✓ Linux

---

## Próximos passos — Para Google Antigravity

Todos os pré-requisitos Claude Code estão prontos. Antigravity pode implementar:

| Tarefa | Depende de | Prioridade |
|---|---|---|
| **A1-B** — `DropZone.tsx`: `onDrop` handler com `invoke('ingest_asset')` | A1-A ✓ | Alta |
| **A3** — `App.tsx`: versão dinâmica no footer via `invoke('get_app_version')` | — | Baixa |
| **B1-B** — Dropdown de perfil em `ProcessPage.tsx` via `invoke('list_profiles')` | B1-A ✓ | Alta |
| **B2** — Search + filtros + acções em `HistoryPage.tsx` | — | Média |
| **B3-B** — Integrar toasts (`<Toaster />` no `App.tsx`, `toast.success/error` nos handlers) | B3-A ✓ | Alta |
| **B4** — `AssetDetailModal.tsx` | — | Média |
| **B5-B** — `DashboardPage.tsx` com métricas via `invoke('get_stats')` | B5-A ✓ | Alta |
| **B6** — GPU badge + disco no header/footer | — | Baixa |
| **B7-B** — Botão "remover" em `HistoryPage.tsx` via `invoke('delete_asset')` | B7-A ✓ | Alta |
| **B9** — Secção Changelog nas Settings | — | Baixa |

---

## Ficheiros criados/modificados nesta sessão

```
src-tauri/src/commands/profiles.rs      (novo — list_profiles, 6 perfis embed)
src-tauri/src/commands/assets.rs        (delete_asset + filtro list_assets)
src-tauri/src/commands/system.rs        (get_stats + AppStats)
src-tauri/src/commands/mod.rs           (pub mod profiles)
src-tauri/src/lib.rs                    (list_profiles, get_stats, delete_asset)
src-tauri/src/sidecar.rs               (reescrito — node sidecar.js, 3-level path)
src-tauri/tauri.conf.json              (dragDropEnabled: false)
sidecar/workers/delivery-worker.ts     (output_dir_{profile} priority)
scripts/sync.ps1                       (large file guard + BOM fix)
.gitignore                             (IDE/runtime files adicionados)
package.json                           (react-hot-toast adicionado)
SYNC-STATE.md
```

---

## Notas técnicas para o próximo agente

- **dragDropEnabled**: `false` é correcto (não `true`). Desactivar a intercepção nativa do Tauri é o que permite os eventos HTML5 chegarem ao React no Windows
- **list_profiles**: os perfis estão embutidos em compile-time — alterações nos JSONs em `sidecar/profiles/` requerem recompilação Rust
- **delete_asset**: é soft delete — o asset permanece na DB com `status = 'deleted'`. Não há hard delete implementado
- **output_dir_{profile}**: a chave da setting é `output_dir_` + nome do perfil (ex: `output_dir_broadcast-hd`). Não há defaults — se a chave não existir, usa `output_dir` global
- **react-hot-toast**: `<Toaster />` ainda não foi colocado em nenhum componente — Antigravity tem de o adicionar ao `App.tsx`
- **Versão**: `0.4.0` em `tauri.conf.json` e `package.json`
- **CI**: próxima release será v0.4.x quando Antigravity completar o frontend
