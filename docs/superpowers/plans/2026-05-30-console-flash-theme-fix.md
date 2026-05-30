# Console Flash + Theme Light Mode Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminar janelas de consola a piscar ao navegar para Definições, e corrigir o sistema de tema claro em toda a app (fundo preto, nav ilegível, componentes cloud hardcoded).

**Architecture:** Dois eixos independentes — (1) Rust: função utilitária `no_window()` em `commands/mod.rs` aplicada a todos os `Command::new()` de diagnóstico; (2) Frontend: inversão da lógica CSS de Mica/transparência + substituição de `gray-*` hardcoded por tokens de tema em 6 ficheiros TSX.

**Tech Stack:** Rust stable · Tauri 2 · React 19 + TypeScript · Tailwind CSS v4 (tokens custom em `index.css`)

---

## File Map

| Ficheiro                                    | Alteração                                                        |
| ------------------------------------------- | ---------------------------------------------------------------- |
| `src-tauri/src/commands/mod.rs`             | Adicionar `pub fn no_window()`                                   |
| `src-tauri/src/commands/system.rs`          | Aplicar `no_window` em 5 call sites                              |
| `src-tauri/src/commands/assets.rs`          | Aplicar `no_window` em `run_ffprobe`                             |
| `src-tauri/src/lib.rs`                      | Aplicar `no_window` em `startup_checks` + `get_startup_status`   |
| `src/index.css`                             | Inversão lógica CSS: transparência só quando `data-mica=active`  |
| `src/App.tsx`                               | Contraste nav: `text-text-muted` → `text-text-secondary`         |
| `src/pages/SettingsPage.tsx`                | Tab Cloud: substituir classes gray hardcoded                     |
| `src/components/CloudProfileModal.tsx`      | Modal inteiro: substituir classes gray hardcoded                 |
| `src/components/CloudDestinationPicker.tsx` | Picker: substituir classes gray hardcoded                        |
| `src/pages/AssetDetailPage.tsx`             | Pipeline steps + cloud destinations: substituir classes gray     |
| `src/pages/ProfilesPage.tsx`                | Badge "predefinido": `bg-gray-800` → `bg-bg-secondary`           |
| `src/pages/LogsPage.tsx`                    | `getLevelColor` debug/default: `bg-gray-800` → `bg-bg-secondary` |

---

## Task 1: Utilitário `no_window` em `commands/mod.rs`

**Files:**

- Modify: `src-tauri/src/commands/mod.rs`

- [ ] **Step 1: Adicionar a função `no_window` ao fim do ficheiro**

O ficheiro actual tem apenas as 8 linhas de `pub mod`. Adicionar a função a seguir:

```rust
pub mod assets;
pub mod cloud;
pub mod jobs;
pub mod logs;
pub mod metrics;
pub mod profiles;
pub mod settings;
pub mod system;

/// Suprime a janela de consola no Windows para processos filhos de diagnóstico.
/// No-op em macOS e Linux.
pub fn no_window(cmd: &mut std::process::Command) -> &mut std::process::Command {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
    }
    cmd
}
```

- [ ] **Step 2: Verificar que compila**

```bash
cd src-tauri && cargo check 2>&1 | tail -5
```

Expected: `Finished` sem erros. Se houver erro de `CommandExt` não encontrado em non-Windows, confirmar que o bloco `#[cfg(target_os = "windows")]` está correcto — o `use` dentro do cfg é intencional para não poluir o scope noutras plataformas.

---

## Task 2: Aplicar `no_window` em `system.rs`

**Files:**

- Modify: `src-tauri/src/commands/system.rs`

- [ ] **Step 1: Corrigir `get_installed_info` (linhas 33–45)**

Substituir o bloco das duas invocações (ffmpeg + node):

```rust
// ANTES:
let ffmpeg_version = Command::new("ffmpeg")
    .arg("-version")
    .output()
    .ok()
    .and_then(|o| String::from_utf8(o.stdout).ok())
    .and_then(|s| s.lines().next().map(|l| l.trim().to_string()));

let node_version = Command::new("node")
    .arg("--version")
    .output()
    .ok()
    .and_then(|o| String::from_utf8(o.stdout).ok())
    .map(|s| s.trim().to_string());
```

```rust
// DEPOIS:
let mut cmd = Command::new("ffmpeg");
let ffmpeg_version = super::no_window(cmd.arg("-version"))
    .output()
    .ok()
    .and_then(|o| String::from_utf8(o.stdout).ok())
    .and_then(|s| s.lines().next().map(|l| l.trim().to_string()));

let mut cmd = Command::new("node");
let node_version = super::no_window(cmd.arg("--version"))
    .output()
    .ok()
    .and_then(|o| String::from_utf8(o.stdout).ok())
    .map(|s| s.trim().to_string());
```

- [ ] **Step 2: Corrigir `detect_gpu` (linha 80 — `nvidia-smi`)**

```rust
// ANTES:
if Command::new("nvidia-smi").output().is_ok() {
```

```rust
// DEPOIS:
let nvidia_ok = {
    let mut cmd = Command::new("nvidia-smi");
    super::no_window(&mut cmd).output().is_ok()
};
if nvidia_ok {
```

- [ ] **Step 3: Corrigir `get_ffmpeg_info` (linhas 297–311)**

```rust
// ANTES:
let version = Command::new(&ffmpeg_path)
    .arg("-version")
    .output()
    .ok()
    .and_then(|o| String::from_utf8(o.stdout).ok())
    .and_then(|s| s.lines().next().map(|l| l.trim().to_string()))
    .unwrap_or_else(|| "Desconhecido".to_string());

let has_libvmaf = Command::new(&ffmpeg_path)
    .args(["-filters"])
    .output()
    .ok()
    .and_then(|o| String::from_utf8(o.stdout).ok())
    .map(|s| s.contains("libvmaf"))
    .unwrap_or(false);
```

```rust
// DEPOIS:
let mut cmd = Command::new(&ffmpeg_path);
let version = super::no_window(cmd.arg("-version"))
    .output()
    .ok()
    .and_then(|o| String::from_utf8(o.stdout).ok())
    .and_then(|s| s.lines().next().map(|l| l.trim().to_string()))
    .unwrap_or_else(|| "Desconhecido".to_string());

let mut cmd = Command::new(&ffmpeg_path);
let has_libvmaf = super::no_window(cmd.args(["-filters"]))
    .output()
    .ok()
    .and_then(|o| String::from_utf8(o.stdout).ok())
    .map(|s| s.contains("libvmaf"))
    .unwrap_or(false);
```

- [ ] **Step 4: Verificar compilação**

```bash
cd src-tauri && cargo check 2>&1 | tail -5
```

Expected: `Finished` sem erros.

---

## Task 3: Aplicar `no_window` em `assets.rs` e `lib.rs`

**Files:**

- Modify: `src-tauri/src/commands/assets.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Corrigir `run_ffprobe` em `assets.rs` (linhas 191–202)**

```rust
// ANTES:
let output = std::process::Command::new(&ffprobe)
    .args([
        "-v", "quiet",
        "-print_format", "json",
        "-show_streams",
        "-show_format",
        path,
    ])
    .output()
    .map_err(|e| e.to_string())?;
```

```rust
// DEPOIS:
let mut cmd = std::process::Command::new(&ffprobe);
let output = crate::commands::no_window(cmd.args([
    "-v",
    "quiet",
    "-print_format",
    "json",
    "-show_streams",
    "-show_format",
    path,
]))
.output()
.map_err(|e| e.to_string())?;
```

- [ ] **Step 2: Corrigir `startup_checks` em `lib.rs` (linhas 344–370)**

A função já tem `use std::process::Command;` no topo. Substituir os dois blocos `else`:

```rust
// ANTES (ffprobe):
} else {
    Command::new("ffprobe")
        .arg("-version")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
};
```

```rust
// DEPOIS (ffprobe):
} else {
    let mut cmd = Command::new("ffprobe");
    crate::commands::no_window(cmd.arg("-version"))
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
};
```

```rust
// ANTES (ffmpeg):
} else {
    Command::new("ffmpeg")
        .arg("-version")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
};
```

```rust
// DEPOIS (ffmpeg):
} else {
    let mut cmd = Command::new("ffmpeg");
    crate::commands::no_window(cmd.arg("-version"))
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
};
```

- [ ] **Step 3: Corrigir `get_startup_status` em `lib.rs` (linhas 388–400)**

A função tem `use std::process::Command;` local. Substituir os dois `||` inline:

```rust
// ANTES:
let ffprobe_ok = ffprobe_path.exists()
    || Command::new("ffprobe")
        .arg("-version")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false);

let ffmpeg_ok = ffmpeg_path.exists()
    || Command::new("ffmpeg")
        .arg("-version")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false);
```

```rust
// DEPOIS:
let ffprobe_ok = ffprobe_path.exists() || {
    let mut cmd = Command::new("ffprobe");
    crate::commands::no_window(cmd.arg("-version"))
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
};

let ffmpeg_ok = ffmpeg_path.exists() || {
    let mut cmd = Command::new("ffmpeg");
    crate::commands::no_window(cmd.arg("-version"))
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
};
```

- [ ] **Step 4: Verificar compilação + formato**

```bash
cd src-tauri && cargo check 2>&1 | tail -5
cargo fmt
```

Expected: `Finished` sem erros.

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/commands/mod.rs \
        src-tauri/src/commands/system.rs \
        src-tauri/src/commands/assets.rs \
        src-tauri/src/lib.rs
git commit -m "fix(rust): CREATE_NO_WINDOW em todos os subprocessos de diagnóstico"
```

---

## Task 4: Fix CSS — fundo transparente apenas com Mica activo

**Files:**

- Modify: `src/index.css` (linhas 167–237)

- [ ] **Step 1: Substituir o bloco "Phase B" completo**

Localizar e remover o bloco inteiro entre `/* ── Phase B: Transparent window for Mica/Vibrancy ──────────────────────── */` e o fim dos `[data-mica='inactive']` fallbacks (aproximadamente linhas 167–237).

Substituir por:

```css
/* ── Phase B: Mica/Vibrancy — só transparente quando activo ─────────────── */
/* Por omissão (data-mica indefinido ou inactive) o body usa fundo sólido    */
/* via var(--color-bg-primary). Transparência APENAS quando Mica confirmado. */

html[data-platform='windows'][data-mica='active'] body,
html[data-platform='macos'][data-mica='active'] body {
  background: transparent;
}

html[data-platform='windows'][data-mica='active'] #root,
html[data-platform='macos'][data-mica='active'] #root {
  background: transparent;
}

html[data-platform='windows'][data-mica='active'] main,
html[data-platform='macos'][data-mica='active'] main {
  background: transparent;
}

html[data-platform='windows'][data-mica='active'] .flex.h-screen,
html[data-platform='macos'][data-mica='active'] .flex.h-screen {
  background: transparent;
}

/* ── Glassmorphism — sidebar e topbar (só com Mica/Vibrancy activo) ──────── */

/* Sidebar — dark */
html.dark[data-platform='windows'][data-mica='active'] aside,
html.dark[data-platform='macos'][data-mica='active'] aside {
  background: rgba(10, 13, 20, 0.6);
  backdrop-filter: blur(20px) saturate(1.4);
}

/* Sidebar — light */
html:not(.dark)[data-platform='windows'][data-mica='active'] aside,
html:not(.dark)[data-platform='macos'][data-mica='active'] aside {
  background: rgba(248, 250, 252, 0.72);
  backdrop-filter: blur(20px) saturate(1.2);
}

/* TopBar — dark */
html.dark[data-platform='windows'][data-mica='active'] [data-topbar],
html.dark[data-platform='macos'][data-mica='active'] [data-topbar] {
  background: rgba(10, 13, 20, 0.7);
  backdrop-filter: blur(20px);
}

/* TopBar — light */
html:not(.dark)[data-platform='windows'][data-mica='active'] [data-topbar],
html:not(.dark)[data-platform='macos'][data-mica='active'] [data-topbar] {
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(20px);
}

/* ── Glassmorphism surface — modais, popups, dropdowns ──────────────────── */
html.dark[data-platform='windows'][data-mica='active'] .glass-surface,
html.dark[data-platform='macos'][data-mica='active'] .glass-surface {
  background: rgba(14, 18, 28, 0.78);
  backdrop-filter: blur(24px) saturate(1.4);
  border-color: rgba(255, 255, 255, 0.08);
}
html:not(.dark)[data-platform='windows'][data-mica='active'] .glass-surface,
html:not(.dark)[data-platform='macos'][data-mica='active'] .glass-surface {
  background: rgba(248, 250, 252, 0.84);
  backdrop-filter: blur(24px) saturate(1.2);
  border-color: rgba(0, 0, 0, 0.06);
}

/* Sonner toasts — inline styles exigem !important */
html.dark[data-platform='windows'][data-mica='active'] [data-sonner-toast],
html.dark[data-platform='macos'][data-mica='active'] [data-sonner-toast] {
  background: rgba(14, 18, 28, 0.88) !important;
  backdrop-filter: blur(20px) saturate(1.4) !important;
  border-color: rgba(255, 255, 255, 0.08) !important;
}
html:not(.dark)[data-platform='windows'][data-mica='active'] [data-sonner-toast],
html:not(.dark)[data-platform='macos'][data-mica='active'] [data-sonner-toast] {
  background: rgba(255, 255, 255, 0.86) !important;
  backdrop-filter: blur(20px) saturate(1.2) !important;
  border-color: rgba(0, 0, 0, 0.07) !important;
}
```

- [ ] **Step 2: Verificar TypeScript + build CSS**

```bash
npm run typecheck
```

Expected: zero erros.

- [ ] **Step 3: Testar visualmente — modo claro**

Arrancar em dev: `npm run tauri dev`

Verificar:

- App abre com fundo branco imediatamente (sem flash preto)
- Navegar entre menus: sem flash preto entre páginas
- Modo escuro: sidebar e topbar mantêm o glassmorphism se Mica activo; fundo sólido escuro se Sandbox

---

## Task 5: Contraste do nav — `App.tsx`

**Files:**

- Modify: `src/App.tsx` (linha ~329)

- [ ] **Step 1: Localizar e alterar a classe dos items inactivos do nav**

Procurar (único match em `App.tsx`):

```tsx
'text-text-muted hover:text-text-secondary hover:bg-bg-hover',
```

Substituir por:

```tsx
'text-text-secondary hover:text-text-primary hover:bg-bg-hover',
```

- [ ] **Step 2: Verificar typecheck**

```bash
npm run typecheck
```

Expected: zero erros.

- [ ] **Step 3: Testar visualmente — modo claro**

Com `npm run tauri dev` activo, activar modo claro em Definições → Interface.
Verificar: itens inactivos do nav (Biblioteca, Fila, Perfis, etc.) legíveis em fundo branco. Ícones Lucide também devem ficar visíveis (herdam a cor de texto).

- [ ] **Step 4: Commit**

```bash
git add src/index.css src/App.tsx
git commit -m "fix(theme): fundo sólido por omissão + contraste nav em modo claro"
```

---

## Task 6: Componentes cloud — classes hardcoded primárias

**Files:**

- Modify: `src/pages/SettingsPage.tsx`
- Modify: `src/components/CloudProfileModal.tsx`
- Modify: `src/components/CloudDestinationPicker.tsx`

### 6a — `SettingsPage.tsx` Cloud tab (linhas ~1470–1543)

- [ ] **Step 1: Substituir as classes da tab Cloud**

Fazer as seguintes substituições (usar replace-all onde aplicável):

| Old                                                                                                    | New                                                                                                  |
| ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `text-gray-300">Perfis de Cloud`                                                                       | `text-text-secondary">Perfis de Cloud`                                                               |
| `text-sm text-gray-500` (parágrafo vazio)                                                              | `text-sm text-text-muted`                                                                            |
| `bg-gray-800 rounded-lg px-4 py-3 border border-gray-700`                                              | `bg-bg-secondary rounded-lg px-4 py-3 border border-border`                                          |
| `text-xs text-gray-400 mt-0.5`                                                                         | `text-xs text-text-muted mt-0.5`                                                                     |
| `'text-gray-600 cursor-not-allowed opacity-40'`                                                        | `'text-text-muted cursor-not-allowed opacity-40'`                                                    |
| `'text-gray-400 hover:text-white'` (browse btn)                                                        | `'text-text-muted hover:text-text-primary'`                                                          |
| `border border-gray-600 rounded px-2 py-1 transition-colors`                                           | `border border-border rounded px-2 py-1 transition-colors`                                           |
| `className="text-xs text-gray-400 hover:text-white border border-gray-600 rounded px-2 py-1"` (editar) | `className="text-xs text-text-muted hover:text-text-primary border border-border rounded px-2 py-1"` |

### 6b — `CloudProfileModal.tsx` (linhas 195–325)

- [ ] **Step 2: Substituir as classes do modal**

```tsx
// Dialog.Title
// ANTES: className="text-white font-semibold"
// DEPOIS: className="text-text-primary font-semibold"

// Botão X (fechar)
// ANTES: className="text-gray-400 hover:text-white"
// DEPOIS: className="text-text-muted hover:text-text-primary"

// Labels dos campos
// ANTES: className="text-xs text-gray-400 block mb-1"
// DEPOIS: className="text-xs text-text-muted block mb-1"
// (replace_all: true — afecta todos os labels)

// Inputs e selects
// ANTES: className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm"
// DEPOIS: className="w-full bg-bg-secondary border border-border rounded px-3 py-2 text-text-primary text-sm"
// (replace_all: true — afecta todos os inputs/select)

// Caixa info Google Drive
// ANTES: className="bg-gray-800/50 rounded p-3 text-sm mt-2"
// DEPOIS: className="bg-bg-secondary/50 rounded p-3 text-sm mt-2"

// Parágrafo dentro da caixa GDrive
// ANTES: className="text-gray-400 mb-2 text-xs"
// DEPOIS: className="text-text-muted mb-2 text-xs"

// Instruções dentro da caixa GDrive
// ANTES: className="mt-2 text-xs text-gray-300 space-y-2"
// DEPOIS: className="mt-2 text-xs text-text-secondary space-y-2"

// Labels "Abra:", "Código:"
// ANTES: className="text-gray-400"  (dentro da caixa GDrive)
// DEPOIS: className="text-text-muted"

// Código de autenticação
// ANTES: className="text-white tracking-widest"
// DEPOIS: className="text-text-primary tracking-widest"

// Botão copiar código
// ANTES: className="text-gray-400 hover:text-white transition-colors"
// DEPOIS: className="text-text-muted hover:text-text-primary transition-colors"

// Botão "Testar ligação"
// ANTES: className="flex items-center gap-2 text-sm text-gray-300 hover:text-white border border-gray-600 rounded px-3 py-1.5"
// DEPOIS: className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary border border-border rounded px-3 py-1.5"

// Botão "Cancelar"
// ANTES: className="text-sm text-gray-400 hover:text-white px-3 py-1.5"
// DEPOIS: className="text-sm text-text-muted hover:text-text-primary px-3 py-1.5"
```

### 6c — `CloudDestinationPicker.tsx`

- [ ] **Step 3: Substituir as 3 classes**

```tsx
// Título "Destinos cloud (opcional)"
// ANTES: className="text-xs text-gray-400 mb-2"
// DEPOIS: className="text-xs text-text-muted mb-2"

// Botão inactivo (estado não seleccionado)
// ANTES: 'bg-gray-800 border-gray-600 text-gray-400 hover:border-gray-500'
// DEPOIS: 'bg-bg-secondary border-border text-text-muted hover:border-border-hover'

// Provider label
// ANTES: <span className="text-gray-400 text-[10px]">
// DEPOIS: <span className="text-text-muted text-[10px]">
```

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck
```

Expected: zero erros.

- [ ] **Step 5: Testar visualmente — modo claro**

Com `npm run tauri dev`, activar modo claro e navegar para Definições → aba Cloud. Verificar:

- Fundo claro em vez de cinzento escuro
- Texto legível
- Abrir CloudProfileModal: campos com fundo claro, labels legíveis

- [ ] **Step 6: Commit**

```bash
git add src/pages/SettingsPage.tsx \
        src/components/CloudProfileModal.tsx \
        src/components/CloudDestinationPicker.tsx
git commit -m "fix(theme): componentes cloud com tokens de tema (substitui gray hardcoded)"
```

---

## Task 7: Componentes secundários

**Files:**

- Modify: `src/pages/AssetDetailPage.tsx`
- Modify: `src/pages/ProfilesPage.tsx`
- Modify: `src/pages/LogsPage.tsx`

### 7a — `AssetDetailPage.tsx`

- [ ] **Step 1: Pipeline steps (linha ~941)**

```tsx
// ANTES:
'border-gray-700 text-gray-700';
// DEPOIS:
'border-border text-text-muted';
```

```tsx
// ANTES (linha ~953, conector h-px):
`flex-1 h-px mx-[-2px] ${isDone ? 'bg-green-500' : 'bg-gray-800'}`
// DEPOIS:
`flex-1 h-px mx-[-2px] ${isDone ? 'bg-green-500' : 'bg-border'}`;
```

```tsx
// ANTES (linha ~992, label VMAF):
className = 'text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1';
// DEPOIS:
className = 'text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1';
```

- [ ] **Step 2: Secção cloud destinations (linhas ~1032–1083)**

```tsx
// Título "Envios Cloud" (linha ~1032):
// ANTES: className="text-xs text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1"
// DEPOIS: className="text-xs text-text-muted uppercase tracking-wide mb-2 flex items-center gap-1"

// Container de cada destino (linha ~1041):
// ANTES: className="flex items-center justify-between bg-gray-800/50 rounded px-3 py-2 text-sm"
// DEPOIS: className="flex items-center justify-between bg-bg-secondary/50 rounded px-3 py-2 text-sm"

// Nome do perfil (linha ~1053):
// ANTES: <span className="text-gray-200">{dest.profileName}</span>
// DEPOIS: <span className="text-text-secondary">{dest.profileName}</span>

// Data de upload (linha ~1065):
// ANTES: <span className="text-xs text-gray-500">
// DEPOIS: <span className="text-xs text-text-muted">

// Botão "Retentar" (linha ~1083):
// ANTES: className="flex items-center gap-1 text-xs text-gray-400 hover:text-white"
// DEPOIS: className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary"
```

### 7b — `ProfilesPage.tsx`

- [ ] **Step 3: Badge "predefinido" (linha ~416)**

```tsx
// ANTES:
<span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest bg-gray-800 text-text-secondary px-3 py-1 rounded-full">
// DEPOIS:
<span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest bg-bg-secondary text-text-secondary px-3 py-1 rounded-full">
```

### 7c — `LogsPage.tsx`

- [ ] **Step 4: `getLevelColor` (linhas 79 e 87)**

```tsx
// ANTES:
case 'debug':
  return 'bg-gray-800 text-text-secondary';
// ...
default:
  return 'bg-gray-800 text-text-secondary';
```

```tsx
// DEPOIS:
case 'debug':
  return 'bg-bg-secondary text-text-secondary';
// ...
default:
  return 'bg-bg-secondary text-text-secondary';
```

- [ ] **Step 5: Typecheck**

```bash
npm run typecheck
```

Expected: zero erros.

- [ ] **Step 6: Testar visualmente — regressão modo escuro**

Com `npm run tauri dev`, activar modo escuro e verificar:

- AssetDetailPage: pipeline steps, cloud destinations — aparecem normalmente em escuro
- ProfilesPage: badge "predefinido" legível em escuro
- LogsPage: nível debug/default com fundo adequado

- [ ] **Step 7: Testar em modo claro**

Activar modo claro e verificar os mesmos ecrãs:

- AssetDetailPage: texto legível, sem caixas pretas
- ProfilesPage: badge com fundo cinzento claro
- LogsPage: debug com fundo claro

- [ ] **Step 8: Commit final**

```bash
git add src/pages/AssetDetailPage.tsx \
        src/pages/ProfilesPage.tsx \
        src/pages/LogsPage.tsx
git commit -m "fix(theme): componentes secundários com tokens de tema (AssetDetail, Profiles, Logs)"
```

---

## Checklist de verificação final

- [ ] Windows Sandbox: navegar para Definições → zero janelas de consola a piscar
- [ ] Modo claro: fundo branco imediato ao abrir a app
- [ ] Modo claro: navegar entre menus sem flash preto
- [ ] Modo claro: nav sidebar — texto e ícones legíveis em todos os itens inactivos
- [ ] Modo claro: Definições → tab Cloud — fundo branco, texto escuro
- [ ] Modo claro: CloudProfileModal — campos com fundo claro, labels legíveis
- [ ] Modo claro: AssetDetailPage — pipeline steps e cloud destinations sem caixas pretas
- [ ] Modo escuro: tudo igual ao que estava (regressão zero)
- [ ] `cargo fmt` + `npm run typecheck` + `npm run format:check` passam sem erros
