# Estado de Sincronizacao - Nexora Desktop

> Handoff entre Claude Code e Google Antigravity.
> Actualizar no FIM de cada sessao. Lido no INICIO de cada sessao.

---

Actualizado: 2026-05-18
Agente: OpenCode (Kimi k2.6)

## O que foi feito

### Sessao 5 — Correção CI/CD (format:check, cargo clippy, placeholders) — CONCLUIDO

**Problema:** GitHub Actions `ci.yml` e `build.yml` com erros em TODAS as plataformas.

**Diagnóstico:**

- `lint-and-test` (Ubuntu): `format:check` falhava — 63 ficheiros não formatados com Prettier
- `rust-check` (Windows/macOS): `cargo clippy` falhava — `tauri_build::build()` exige binários `externalBin` (FFmpeg/FFprobe) que não existem no CI (estão no `.gitignore`)
- `rust-check` (Linux): `cargo fmt --check` falhava — código Rust nunca formatado com `cargo fmt`
- `rust-check` (macOS/Linux): `libc` não declarado em `Cargo.toml` — código Unix usava `libc::kill()` sem a crate
- `build.yml`: usava `npm install` em vez de `npm ci`; tinha input inválido `includeUpdaterJson`; `bundle.targets: "all"` tentava `.rpm` no Linux sem tooling

**Correcções aplicadas:**

1. `npm run format` + `cargo fmt` — formatados todos os ficheiros (63 Prettier + ~15 Rust)
2. `ci.yml` — adicionado step "Create resource placeholders" no job `rust-check` (cria ficheiros vazios para FFmpeg/FFprobe + sidecar antes do `cargo clippy`)
3. Código Rust — corrigidos 7 erros de Clippy:
   - `drop(state)` removido (`State` não implementa `Drop`)
   - `n % 100 == 0` → `n.is_multiple_of(100)`
   - `.max(1).min(8)` → `.clamp(1, 8)`
   - `#[allow(clippy::type_complexity)]` no tipo `Vec<(...11 tipos...)>`
   - `#[allow(clippy::too_many_arguments)]` na função `run_job` (13 args)
   - `nets.iter().map(|(_, n)| ...)` → `nets.values().map(...)` (2 ocorrências)
4. `Cargo.toml` — adicionada dependência condicional `[target.'cfg(not(target_os = "windows"))'.dependencies] libc = "0.2"`
5. `build.yml` — `npm install` → `npm ci`; removido `includeUpdaterJson: true`
6. `tauri.conf.json` — `bundle.targets: "all"` → `["deb", "appimage", "msi", "nsis", "dmg", "app"]`

**Verificação local:**

- `npm run format:check`: OK
- `npm run lint`: OK
- `cargo fmt --check`: OK
- `cargo clippy -- -D warnings`: OK

**Verificação GitHub Actions (run #92):**

- `lint-and-test` (Ubuntu): ✅ OK
- `rust-check` Windows: ✅ OK
- `rust-check` macOS: ✅ OK
- `rust-check` Linux: ✅ OK
- Todas as plataformas passaram

---

## Estado das branches

- `dev`: Sessao 5 (CI/CD fixes) committed e pushed — em sincronia com remote
- `main`: commit anterior (v0.20.0 area)
- Remote: apenas `main` e `dev`

---

## Proximos passos (v0.22.0 ou seguinte)

| Tarefa                                                              | Prioridade | Plan item |
| ------------------------------------------------------------------- | ---------- | --------- |
| B6: dedup startup_checks — cachear resultado em AppState            | Baixa      | B6        |
| Traducao profissional dos locales nao-pt (fallback em pt por agora) | Media      | -         |
| Screenshots / documentacao visual actualizada                       | Baixa      | -         |
| tauri dev golden path — testar drag-drop end-to-end                 | Alta       | -         |

---

## Notas tecnicas para o proximo agente

- **Sidecar dist nao esta no git** — correr `npm run sidecar:build` antes de cada `tauri dev`
- **15 linguas i18n completas** — ao adicionar texto novo, traduzir SEMPRE todos os 15 locales em `src/i18n/locales/`
- **FFmpeg execFile** — NUNCA usar `exec` com string; sempre `execFile` com array de argumentos
- **VMAF model escaping no Windows** — no filtergraph `-lavfi`, os caminhos absolutos como `C:/path` no Windows geram erro. Substituir sempre por `C\:/path` no `libvmaf=model='path=...'`.
- **active_pids** — `AppState` tem `active_pids: Mutex<HashMap<String, u32>>` para matar processos Node.js ao cancelar
- **list_assets_slim** — usar em listagens (Dashboard, LibraryPage) em vez de `list_assets` para evitar metadata JSON pesado
- **sidecar:event** — QueuePage e DashboardPage ouvem este evento para actualizacoes em tempo real; polling e fallback a 30s
- **tauri-plugin-store** — settings persistem em ficheiro nativo; nao usar localStorage
- **Videos_Tests/** — ja no git; 18 samples de video de teste
