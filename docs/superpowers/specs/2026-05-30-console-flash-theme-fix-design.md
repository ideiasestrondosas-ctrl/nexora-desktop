---
title: 'Fix: Console Flash + Theme Light Mode'
date: 2026-05-30
version: v0.30.7-beta.1
status: approved
---

# Fix: Console Flash Windows + Theme Light Mode

## Contexto

Dois bugs reportados em testes no Windows Sandbox com modo claro activo:

1. **Janelas de consola a piscar** ao navegar para Definições — subprocessos (FFmpeg, Node, nvidia-smi) são spawned sem `CREATE_NO_WINDOW` no Windows.
2. **Tema claro incompleto** — fundo preto ao mudar de menu, texto/ícones do nav quase invisíveis, componentes cloud com cores hardcoded escuras.

---

## Bug 1 — Janelas de Consola (Rust)

### Causa raiz

`std::process::Command::new()` em Windows cria por omissão uma janela de consola visível para cada processo filho. O `queue.rs` já usa `CREATE_NO_WINDOW` correctamente para o sidecar engine, mas os comandos de diagnóstico não têm esta flag.

### Ficheiros afectados

| Ficheiro                           | Funções              | Processos spawned                     |
| ---------------------------------- | -------------------- | ------------------------------------- |
| `src-tauri/src/commands/system.rs` | `get_installed_info` | `ffmpeg -version`, `node --version`   |
| `src-tauri/src/commands/system.rs` | `get_ffmpeg_info`    | `ffmpeg -version`, `ffmpeg -filters`  |
| `src-tauri/src/commands/system.rs` | `detect_gpu`         | `nvidia-smi`                          |
| `src-tauri/src/commands/assets.rs` | `run_ffprobe`        | `ffprobe`                             |
| `src-tauri/src/lib.rs`             | startup checks       | `ffmpeg -version`, `ffprobe -version` |

### Fix

Adicionar uma função utilitária partilhada em `src-tauri/src/commands/mod.rs`:

```rust
pub fn no_window(cmd: &mut std::process::Command) -> &mut std::process::Command {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
    }
    cmd
}
```

Todos os `Command::new(...)` de diagnóstico decompõem o chain em `let mut cmd = ...; no_window(&mut cmd); cmd.output()`. Padrão já existente em `queue.rs` (linhas 324–350) — apenas generalizamos.

Adicionalmente, redirigir stdout/stderr para `Stdio::null()` em todas as invocações de diagnóstico (os outputs são parseados da struct `Output`, não dos pipes em live).

---

## Bug 2 — Tema Light Mode (Frontend)

### 2a — Fundo preto ao navegar

**Causa raiz:** A CSS faz `body` e `#root` transparentes para `[data-platform='windows']` incondicionalmente. O atributo `data-mica` começa indefinido até o evento `mica-status` chegar do Rust (pode ser 100-500ms). Durante esse intervalo, não existe nenhum fallback de fundo sólido.

**Fix — inversão da lógica CSS (`src/index.css`):**

Remover as regras que tornam transparente por plataforma; tornar transparente apenas quando `data-mica='active'`.

```css
/* REMOVER: */
[data-platform='windows'] body,
[data-platform='macos'] body { background: transparent; }
[data-platform='windows'] #root,
[data-platform='macos'] #root { background: transparent; }
html[data-platform='windows'] main, ... { background: transparent; }
html[data-platform='windows'] .flex.h-screen, ... { background: transparent; }

/* REMOVER (obsoleto após inversão): */
html[data-platform='windows'][data-mica='inactive'] body { ... }
html[data-platform='macos'][data-mica='inactive'] body { ... }
/* ... e todos os outros [data-mica='inactive'] fallbacks */

/* ADICIONAR: transparência APENAS quando mica está activo */
html[data-platform='windows'][data-mica='active'] body,
html[data-platform='macos'][data-mica='active'] body { background: transparent; }
html[data-platform='windows'][data-mica='active'] #root,
html[data-platform='macos'][data-mica='active'] #root { background: transparent; }
html[data-platform='windows'][data-mica='active'] main,
html[data-platform='macos'][data-mica='active'] main { background: transparent; }
html[data-platform='windows'][data-mica='active'] .flex.h-screen,
html[data-platform='macos'][data-mica='active'] .flex.h-screen { background: transparent; }
```

As regras de glassmorphism para `aside` e `[data-topbar]` também ficam condicionadas a `[data-mica='active']` em vez de `[data-platform]`.

### 2b — Contraste do nav/sidebar em modo claro

**Causa raiz:** Items inactivos do nav usam `text-text-muted` (`#94a3b8`) em fundo branco — contraste 2.4:1, insuficiente para leitura.

**Fix (`src/App.tsx`):**

```tsx
// Antes:
'text-text-muted hover:text-text-secondary hover:bg-bg-hover';

// Depois:
'text-text-secondary hover:text-text-primary hover:bg-bg-hover';
```

`text-text-secondary` = `#475569` → contraste 5.4:1 em fundo branco (passa AA).

Os ícones Lucide herdam a cor do texto, pelo que o fix é automático.

### 2c — Componentes com cores hardcoded escuras

**Causa raiz:** Componentes cloud e outros usam `bg-gray-800`, `text-gray-300`, `border-gray-600` etc. sem variante de modo claro. O sistema de design usa tokens custom (`bg-bg-secondary`, `text-text-muted`, `border-border`) que respondem ao tema.

**Mapeamento de substituição:**

| Classe Tailwind hardcoded             | Token equivalente                     |
| ------------------------------------- | ------------------------------------- |
| `bg-gray-800`                         | `bg-bg-secondary`                     |
| `bg-gray-700`                         | `bg-bg-tertiary`                      |
| `border-gray-700` / `border-gray-600` | `border-border`                       |
| `text-gray-300` / `text-gray-400`     | `text-text-muted`                     |
| `text-gray-500`                       | `text-text-muted`                     |
| `text-white` (em contexto de tema)    | `text-text-primary`                   |
| `hover:text-white`                    | `hover:text-text-primary`             |
| `bg-gray-800 text-text-secondary`     | `bg-bg-secondary text-text-secondary` |

**Ficheiros a corrigir (primários — sem variante dark: alguma):**

1. `src/pages/SettingsPage.tsx` — Tab Cloud (linhas ~1470–1543)
2. `src/components/CloudProfileModal.tsx` — modal inteiro
3. `src/components/CloudDestinationPicker.tsx` — picker

**Ficheiros a corrigir (secundários — alguns elementos sem dark:):**

4. `src/pages/AssetDetailPage.tsx` — secção pipeline steps e cloud destinations
5. `src/pages/ProfilesPage.tsx` — badge de cor do perfil
6. `src/pages/LogsPage.tsx` — função de cor por nível (`bg-gray-800`)

**Não alterar:**

- `VisualComparatorPlayer.tsx` — `bg-black` é correcto para container de vídeo
- `AssetDetailPage.tsx` linhas 347/363 — player de vídeo usa `bg-black` correctamente
- Todos os `bg-black/60` de overlay de modal — correcto
- `AssetDetailModal.tsx` linha 163 — code block com `bg-gray-900` (look de terminal, intencional)

---

## Scope

| Área                | Ficheiros                                                                 | Tipo          |
| ------------------- | ------------------------------------------------------------------------- | ------------- |
| Console flash       | `system.rs`, `assets.rs`, `lib.rs`                                        | Rust          |
| CSS background race | `src/index.css`                                                           | CSS           |
| Nav contraste       | `src/App.tsx`                                                             | TSX (1 linha) |
| Cloud hardcoded     | `SettingsPage.tsx`, `CloudProfileModal.tsx`, `CloudDestinationPicker.tsx` | TSX           |
| Secundários         | `AssetDetailPage.tsx`, `ProfilesPage.tsx`, `LogsPage.tsx`                 | TSX           |

Estimativa: 9 ficheiros, sem novas dependências, sem breaking changes de API.

---

## Critérios de Verificação

- [ ] Em Windows Sandbox: navegar para Definições sem janelas de consola a piscar
- [ ] Modo claro: fundo branco imediato ao abrir a app (sem flash preto)
- [ ] Modo claro: navegar entre menus sem flash preto
- [ ] Modo claro: texto e ícones do nav legíveis em todos os itens
- [ ] Modo claro: Tab Cloud com fundo branco/cinzento claro
- [ ] Modo claro: CloudProfileModal legível
- [ ] Modo escuro: tudo igual ao que estava (regressão zero)
- [ ] `cargo fmt` + `prettier` passam sem erros
