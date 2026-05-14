# Estado de Sincronizacao - Nexora Desktop

> Handoff entre Claude Code e Google Antigravity.
> Actualizar no FIM de cada sessao. Lido no INICIO de cada sessao.

---

Actualizado: 2026-05-14 07:45
Agente: Claude Code (Kimi K2.6)

## O que foi feito

### Sessao Actual — Hotfix: Tab Sistema em Branco (causa raiz encontrada) — CONCLUIDO

**1. Tab Sistema — Ecrã em Branco (causa raiz: serde rename_all camelCase vs snake_case)**
- **src-tauri/src/commands/system.rs**:
  - Removido `#[serde(rename_all = "camelCase")]` de `InstalledInfo`, `SystemInfo`, `NetworkInterface`, `FfmpegInfo`, `DbInfo`
  - **Porquê:** Os structs Rust com `rename_all = "camelCase"` convertiam `db_size_mb` → `dbSizeMb`, `app_version` → `appVersion`, etc.
  - O frontend acedia `dbInfo.db_size_mb.toFixed(1)` mas a chave real era `dbSizeMb` → `undefined.toFixed(1)` → `TypeError` → React desmonta a tab → ecrã em branco
  - O `AppStats` **mantém** `rename_all = "camelCase"` porque o frontend (Dashboard, useDiskSpace) já usa camelCase (`totalAssets`, `diskFreeBytes`)
- **src-tauri/Cargo.toml**: Adicionada dependência `num_cpus = "1"` (usada no `get_system_info`)
- **src-tauri/src/commands/system.rs**:
  - `get_system_info` usa `num_cpus` para CPU (instantâneo, nunca bloqueia)
  - Memória: `sysinfo` apenas com `RefreshKind::new().with_memory(...)`
  - Rede: devolve `vec![]` (desactivada)

**2. SettingsPage — Error Handling + Race Condition**
- **src/pages/SettingsPage.tsx**:
  - Race condition do timeout corrigida via `useRef` (`systemTimedOut`)
  - Tab Sistema mostra conteúdo **SEMPRE** (mesmo com erro — "N/A" fallback)
  - `installedError` state para mostrar falhas de `get_installed_info`
  - Botão "Tentar novamente" com timeout defensivo

**3. Tab Sobre — Versão Centralizada**
- **src/lib/version.ts**: `APP_VERSION = '0.16.0'` + `VERSION_HISTORY` tipado
- Badge de versão usa `installedInfo?.app_version ?? APP_VERSION`
- Histórico dinâmico a partir de `VERSION_HISTORY`

---

## Estado de compilacao

- `cargo check`: **OK** (0 erros)
- `tsc --noEmit`: **OK** (0 erros)
- `vitest run`: **OK** (25/25 tests passaram)

---

## Proximos passos (Plano 3 — próxima sessao)

| Tarefa | Prioridade |
|---|---|
| Corrigir `profiles.rs` — `Profile` tem `rename_all = "camelCase"` mas frontend usa snake_case | Alta |
| Tema Light/Dark real (CSS vars, ~10 ficheiros) | Alta |
| i18n completo em 15 idiomas (~150 chaves) | Alta |
| Validar build Windows (`tauri build --debug`) | Critica |
| Testar fluxo real: ingest -> job -> transcode -> done | Critica |

---

## Ficheiros modificados (sessao actual)

```
NOVOS:
src/lib/version.ts

MODIFICADOS:
src/pages/SettingsPage.tsx
src-tauri/src/commands/system.rs
src-tauri/Cargo.toml
SYNC-STATE.md
```

---

## Notas tecnicas para o proximo agente

- **CAUSA RAIZ do ecrã em branco:** `#[serde(rename_all = "camelCase")]` em structs Rust que têm propriedades snake_case. Quando serializados para JSON, as chaves ficam em camelCase, mas o frontend TypeScript acede em snake_case. Acessos como `dbInfo.db_size_mb.toFixed(1)` resultam em `undefined.toFixed(1)` → crash de runtime → React desmonta a tab inteira (sem Error Boundary).
- **REGRA:** Se o frontend usa snake_case, o Rust NÃO deve ter `rename_all = "camelCase"`. Se o frontend usa camelCase (ex: Dashboard `AppStats`), o Rust DEVE ter `rename_all = "camelCase"`.
- **Structs ainda por corrigir:** `Profile` e `ProfileInput` em `profiles.rs` têm `rename_all = "camelCase"` mas o frontend `TranscodeProfile` usa snake_case. Isso faz com que todos os campos sejam `undefined` na lista de perfis.
- **version.ts:** Ponto único de verdade para a versão. `Cargo.toml` deve estar sincronizado.
