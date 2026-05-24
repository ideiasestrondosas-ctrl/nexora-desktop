# Design Spec: Platform-Adaptive UX

**Data:** 2026-05-24
**Versão alvo:** 0.27.0
**Estado:** Aprovado

---

## Contexto

O Nexora Desktop corre em Windows, macOS e Linux mas apresenta actualmente uma UI visualmente genérica em todas as plataformas. A base já existe (`usePlatform.ts` com detecção síncrona via `navigator.userAgent`, atributo `data-platform` no `<html>`), mas os design tokens, controlos de janela, fontes nativas e efeitos de SO ainda não foram implementados.

Quatro agentes (OpenCode/Kimi K2 2.6, Antigravity/Gemini, Codex, Claude Sonnet 4.7) analisaram a situação de forma independente e convergiram na mesma abordagem: CSS custom properties por plataforma + componente React para controlos de janela + crate `window-vibrancy` para efeitos nativos. O CommunityToolkit/Windows (C#/XAML/.NET) foi descartado unanimamente como incompatível com Tauri/React.

---

## Objectivo

Fazer a app sentir-se nativa em cada plataforma sem:

- forks de backend
- segunda stack UI
- alterações a lógica de processamento, queue, sidecar, IPC, SQLite ou cloud providers

Toda a variação por plataforma vive em tokens CSS, um componente React novo, e inicialização condicional de efeitos em Rust.

---

## Abordagem

**Frame nativo mantido** (`decorations` não muda no `tauri.conf.json`). Os botões de controlo da janela são sobrepostos via React à direita da TopBar em Windows/Linux. No macOS o Tauri renderiza os traffic lights nativos — adicionamos apenas um spacer para não os sobrepor.

---

## Phase A — CSS-First + React (sem novos deps Rust)

### 1. `src/index.css` — Design tokens por plataforma

```css
/* Tokens base (fallback) */
:root {
  --app-font: system-ui, sans-serif;
  --app-radius: 6px;
  --app-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  --app-easing: cubic-bezier(0.4, 0, 0.2, 1);
}

[data-platform='windows'] {
  --app-font: 'Segoe UI Variable', 'Segoe UI', system-ui, sans-serif;
  --app-radius: 4px;
  --app-shadow: 0 4px 16px rgba(0, 0, 0, 0.14), 0 1px 4px rgba(0, 0, 0, 0.08);
  --app-easing: cubic-bezier(0.1, 0.9, 0.2, 1);
}

[data-platform='macos'] {
  --app-font: -apple-system, 'SF Pro Text', system-ui, sans-serif;
  --app-radius: 10px;
  --app-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
  --app-easing: cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

[data-platform='linux'] {
  --app-font: 'Cantarell', 'Ubuntu', system-ui, sans-serif;
  --app-radius: 6px;
  --app-shadow: 0 1px 4px rgba(0, 0, 0, 0.16);
  --app-easing: ease-out;
}

body {
  font-family: var(--app-font);
}

/* Scrollbars nativas por plataforma */
[data-platform='macos'] ::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
[data-platform='macos'] ::-webkit-scrollbar-track {
  background: transparent;
}
[data-platform='macos'] ::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}
[data-platform='macos'] ::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.35);
}

[data-platform='windows'] {
  scrollbar-width: auto;
  scrollbar-color: rgba(0, 0, 0, 0.3) transparent;
}
[data-platform='linux'] {
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 0, 0, 0.25) transparent;
}
```

Os tokens `--app-radius` e `--app-shadow` são aplicados nos componentes card via `rounded-[var(--app-radius)]` (Tailwind arbitrary value) ou directamente em CSS.

### 2. `src/hooks/usePlatform.ts` — Adicionar `modKey`, `modSymbol`, `shortcut()`

Alteração mínima ao hook existente. Manter a detecção síncrona via `navigator.userAgent` (sem async, sem flash):

```ts
// Adições ao retorno do hook:
modSymbol: PLATFORM === 'macos' ? '⌘' : 'Ctrl',
modKey:    PLATFORM === 'macos' ? 'Meta' : 'Control',
shortcut:  (key: string) => `${modSymbol}+${key}`,
```

- `modSymbol` — para exibir na UI (ex: `⌘K` vs `Ctrl+K`)
- `modKey` — para comparações em `event.key` / `event.metaKey` / `event.ctrlKey`
- `shortcut()` — helper de formatação para o HelpModal e tooltips

### 3. `src/components/WindowControls.tsx` — NOVO

Componente que usa `Window.getCurrent()` da `@tauri-apps/api/window`:

| Plataforma | Comportamento                                                                                                                                            |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| macOS      | Spacer `w-[76px] flex-shrink-0` à esquerda da TopBar — espaço para os traffic lights nativos do Tauri                                                    |
| Windows    | Botões Minimizar / Maximizar / Fechar à direita; hover `bg-neutral-200/50` em min/max, `bg-red-500 text-white` no close; sem border-radius (look Fluent) |
| Linux      | Idêntico Windows mas hover `bg-muted` em todos (sem vermelho no close)                                                                                   |

API Tauri: `.minimize()`, `.toggleMaximize()`, `.close()`.

### 4. `src/components/TopBar.tsx` — Integrar WindowControls

- macOS: `className` da div principal recebe `pl-[76px]` condicional (via `isMac`)
- Windows/Linux: `<WindowControls />` inserido à direita (antes do botão Sair, ou Sair movido para dentro do componente)
- `data-tauri-drag-region` mantido

---

## Phase B — Efeitos de janela nativos (novo dep Rust)

### Dependência

```toml
# src-tauri/Cargo.toml
window-vibrancy = "0.5"
```

### `src-tauri/tauri.conf.json`

```json
"windows": [{
  "transparent": true
}]
```

### `src-tauri/src/lib.rs` — setup()

```rust
#[cfg(target_os = "windows")]
{
    use window_vibrancy::{apply_mica, is_windows11};
    if is_windows11() {
        apply_mica(&window, Some(true)).ok();
    }
}

#[cfg(target_os = "macos")]
{
    use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial};
    apply_vibrancy(&window, NSVisualEffectMaterial::HudWindow, None, None).ok();
}
```

`.ok()` em ambos os casos — se o efeito falhar (Windows 10, VM, Wayland sem compositing), a app continua com fundo sólido. Sem crash, sem `unwrap()`.

### CSS para efeito transparente

```css
/* src/index.css — Phase B */
[data-platform='windows'] body,
[data-platform='macos'] body {
  background: transparent;
}

/* Cards com glass effect */
[data-platform='windows'] .card,
[data-platform='macos'] .card {
  background: hsl(var(--background) / 0.8);
  backdrop-filter: blur(12px);
}
```

---

## Ficheiros a modificar

| Ficheiro                            | Alteração                                            | Phase |
| ----------------------------------- | ---------------------------------------------------- | ----- |
| `src/index.css`                     | Tokens CSS: font, radius, shadow, easing, scrollbars | A     |
| `src/hooks/usePlatform.ts`          | + `modKey`, `modSymbol`, `shortcut()`                | A     |
| `src/components/WindowControls.tsx` | Novo ficheiro                                        | A     |
| `src/components/TopBar.tsx`         | Integrar WindowControls + macOS padding              | A     |
| `src-tauri/Cargo.toml`              | + `window-vibrancy = "0.5"`                          | B     |
| `src-tauri/src/lib.rs`              | `apply_mica` / `apply_vibrancy` no setup             | B     |
| `src-tauri/tauri.conf.json`         | `transparent: true`                                  | B     |

---

## O que NÃO muda

- Toda a lógica de processamento, queue, sidecar, IPC
- Estrutura do backend Rust e schema SQLite
- Cloud providers e comandos existentes
- Testes existentes (nenhum teste precisa de ser alterado)
- `data-platform` detection (mantém abordagem síncrona via userAgent)
- `decorations` no `tauri.conf.json` (frame nativo mantido)

---

## Critérios de sucesso (Codex)

- A app sente-se "nativa o suficiente" em Windows 11, macOS, e Linux
- Não há forks de backend nem segunda stack UI
- A build continua limpa para as 3 plataformas
- A diferença por plataforma vive exclusivamente em tokens/componentes pequenos

---

## Verificação

1. `tsc --noEmit` — sem erros de tipo
2. `cargo check` — compila sem warnings novos
3. `npm run dev` em Windows 11:
   - TopBar mostra botões Minimizar/Maximizar/Fechar à direita
   - Fonte é Segoe UI Variable (inspecionar no DevTools)
   - Janela pode ser arrastada pela TopBar
   - Phase B: efeito Mica visível no fundo (se Windows 11)
4. `npm run lint` — sem warnings
5. `cargo test` — 27/27 testes passam
