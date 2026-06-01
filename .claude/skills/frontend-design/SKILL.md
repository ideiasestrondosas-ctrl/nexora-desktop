---
name: frontend-design
description: React 19 + TypeScript + Tailwind CSS UI work for Nexora Desktop — tokens, patterns, modal rules, dark/light mode
metadata:
  type: implementation
---

# Frontend Design — Nexora Desktop

## Tokens de Cor (nunca usar gray-\* hardcoded)

| Token                     | Uso                           |
| ------------------------- | ----------------------------- |
| `bg-bg-primary`           | Fundo principal, modais raiz  |
| `bg-bg-secondary`         | Cards, sidebars               |
| `bg-bg-tertiary`          | Elementos de destaque leve    |
| `text-text-primary`       | Texto principal               |
| `text-text-secondary`     | Texto secundário, labels      |
| `text-text-muted`         | Placeholder, hints            |
| `border-border`           | Bordas standard               |
| `bg-brand` / `text-brand` | Cor de destaque (azul Nexora) |

**Nunca:** `bg-gray-800`, `text-gray-400`, cores hardcoded. Sempre tokens de tema.

## Regras de Modais e Overlays

- **Modal raiz / container principal:** `bg-bg-primary` — nunca `glass-surface`
- **`glass-surface`:** apenas overlays pequenos e dropdowns internos dentro de um modal já sólido
- **Fundo Mica (Windows):** transparência só com `data-mica=active`. CSS fallback: `var(--color-bg-primary)`

## Padrões de Componentes

### Ícones

Usar `lucide-react`. Exemplo: `import { Check, Film, Clock } from 'lucide-react'`

### Toast

`react-hot-toast` com `theme={theme}` — sempre passar o tema actual do settings store para Sonner/Toaster.

### Imagens / Thumbnails

Usar `<ThumbnailImg>` (`src/components/ThumbnailImg.tsx`) — faz fallback IPC automático se `convertFileSrc` falhar.

### Vídeo

Usar hook `useVideoSrc` (`src/hooks/useVideoSrc.ts`) — tenta `convertFileSrc`, fallback para `read_video_base64` IPC (≤50 MB).

## Regras de Acessibilidade e Contraste

- Sidebar inactivo: `text-text-secondary` (contraste 5.4:1) — **não** `text-text-muted` (2.4:1, falha WCAG AA)
- Hover overlays em thumbnails: `bg-black/50` — independente do tema (funciona em light e dark)
- Status badges: sempre com variante dark explícita (`dark:bg-...`)

## Checklist antes de submeter UI

- [ ] Sem `gray-*` hardcoded — usar tokens
- [ ] Modal raiz usa `bg-bg-primary`
- [ ] Contraste de texto verificado em light e dark mode
- [ ] `npm run typecheck` sem erros
- [ ] Testado visualmente em dev mode (tauri dev)
