# Estado de Sincronizacao - Nexora Desktop

> Handoff entre Claude Code e Google Antigravity.
> Actualizar no FIM de cada sessao. Lido no INICIO de cada sessao.

---

Actualizado: 2026-05-14 07:35
Agente: Claude Code (Kimi K2.6)

## O que foi feito

### Sessao Actual — Hotfix: Tab Sistema em Branco + Versão Centralizada — CONCLUIDO

**1. Tab Sistema — Ecrã em Branco Corrigido**
- **src/pages/SettingsPage.tsx**:
  - Race condition do timeout corrigida via `useRef` (`systemTimedOut`) — evita que o timeout sobreponha o sucesso
  - Tab Sistema agora mostra conteúdo **SEMPRE**, mesmo com erro — nunca fica vazia
  - Dados mostram "N/A" como fallback quando `systemInfo` é null
  - Botão "Tentar novamente" reutiliza a mesma lógica defensiva
- **src-tauri/src/commands/system.rs**:
  - `get_system_info` completamente reescrito — **não usa `sysinfo` para CPU/rede**
  - CPU: `num_cpus` crate (instantâneo, nunca bloqueia)
  - Memória: `sysinfo` apenas com `RefreshKind::new().with_memory(...)` — mínimo possível
  - Rede: devolve `vec![]` (desactivada — `Networks::new_with_refreshed_list()` bloqueava)
  - Disco: reutiliza `get_disk_space` (já testado, rápido)
- **src-tauri/Cargo.toml**: Adicionada dependência `num_cpus = "1"`

**2. Tab Sobre — Versão Centralizada + Histórico Dinâmico**
- **src/lib/version.ts (NOVO)**:
  - `APP_VERSION = '0.16.0'` — ponto único de verdade
  - `VERSION_HISTORY` — array tipado com todas as versões e descrições
  - Actualizar aqui propaga automaticamente para toda a UI
- **src/pages/SettingsPage.tsx**:
  - Badge de versão: `installedInfo?.app_version ?? APP_VERSION` — nunca mostra "..."
  - Indicador "(offline)" se `get_installed_info` falhar
  - Histórico de versões: renderizado a partir de `VERSION_HISTORY` em vez de hardcoded
  - Primeira entrada destacada a azul (`text-[#1A6FD4]`), resto a cinza
  - `installedError` state adicionado para mostrar falhas de `get_installed_info`

**3. Error Handling Geral**
- `get_installed_info` agora tem `.catch()` visível (antes tinha só `console.error`)
- `get_system_info` retry reutiliza a mesma lógica de timeout defensiva

---

## Estado de compilacao

- `cargo check`: **OK** (0 erros, 1 warning `mut` desnecessário corrigido)
- `tsc --noEmit`: **OK** (0 erros)
- `vitest run`: **OK** (25/25 tests passaram)

---

## Proximos passos (Plano 3 — próxima sessao)

| Tarefa | Prioridade |
|---|---|
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

- **Tab Sistema**: A versão anterior usava `sysinfo::System::new()` + `refresh_cpu_all()` que ainda bloqueava em alguns sistemas Windows. A nova versão usa `num_cpus` para CPU (instantâneo) e `sysinfo` apenas para memória. Se continuar a haver problemas, remover também `sysinfo` da memória e devolver `0.0`.
- **version.ts**: Este é o único sítio onde a versão da app é definida. `APP_VERSION` é usado como fallback no Sobre; `VERSION_HISTORY` é usado para o histórico. O Rust `env!("CARGO_PKG_VERSION")` devolve a versão do `Cargo.toml` — garantir que ambos estão sincronizados em cada release.
- **Tab Sistema retry**: O botão "Tentar novamente" cria um novo timer e reseta `systemTimedOut.current = false`. Se o utilizador clicar múltiplas vezes rápido, timers antigos podem ficar órfãos — não é crítico mas pode causar state inconsistente em cenários extremos.
