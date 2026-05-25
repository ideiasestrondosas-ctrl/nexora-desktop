# Platform-Adaptive UX — Plano de Implementação

> **Status:** CONCLUÍDO — implementado na Sessão 23 por Claude Code (claude-sonnet-4-6)

**Goal:** Fazer a app Nexora Desktop sentir-se nativa em Windows, macOS e Linux através de design tokens CSS por plataforma, controlos de janela React adaptativos, e efeitos de janela Mica/Vibrancy via crate Rust.

**Architecture:** Phase A (zero novos deps Rust) — tokens CSS via `data-platform` no `<html>`, componente `WindowControls.tsx`, extensão do `usePlatform` hook. Phase B — crate `window-vibrancy` + `transparent: true` na janela + CSS transparente nos elementos raiz.

**Tech Stack:** React 19, TypeScript strict, Tailwind CSS v4, `@tauri-apps/api/window`, Rust `window-vibrancy = "0.5"`.

**Spec:** `docs/superpowers/specs/2026-05-24-platform-adaptive-ux-design.md`

---

## Ficheiros modificados

| Ficheiro                            | Alteração                                                                                                    | Phase |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------ | ----- |
| `src/index.css`                     | Tokens `--app-font`, `--app-radius`, `--app-shadow`, `--app-easing`; scrollbars nativas; Phase B transparent | A+B   |
| `src/hooks/usePlatform.ts`          | + `modSymbol`, `modKey`, `shortcut()`                                                                        | A     |
| `src/components/WindowControls.tsx` | **NOVO** — macOS spacer / Windows Fluent / Linux neutro                                                      | A     |
| `src/components/TopBar.tsx`         | Integrar WindowControls + macOS padding + isMac hook                                                         | A     |
| `src-tauri/Cargo.toml`              | + `window-vibrancy = "0.5"`                                                                                  | B     |
| `src-tauri/src/lib.rs`              | `apply_mica` (Windows) + `apply_vibrancy` (macOS) no setup                                                   | B     |
| `src-tauri/tauri.conf.json`         | + `transparent: true`                                                                                        | B     |

---

## Commits

- `ab410b1` feat(platform): design tokens CSS por plataforma — font, radius, shadow, easing, scrollbars
- `c869748` feat(platform): adicionar modKey, modSymbol e shortcut() ao usePlatform
- `f3003f2` feat(platform): criar WindowControls — botões min/max/close adaptativos por SO
- `2e644b6` feat(platform): integrar WindowControls e macOS spacer no TopBar
- `4dd52ec` feat(platform): adicionar window-vibrancy crate para Mica/Vibrancy
- `819135a` feat(platform): aplicar Mica (Windows 11) e Vibrancy (macOS) na janela
- `d4064a6` feat(platform): Phase B — transparent window + CSS para Mica/Vibrancy

---

## Nota sobre window-vibrancy 0.5.x

A função `is_windows11()` não existe em `window-vibrancy = "0.5"`. O `apply_mica()` retorna `Result` e o `.ok()` lida graciosamente com Windows 10, VMs e ambientes sem compositor — sem crash, sem `unwrap()`.

---

## Verificação

- `tsc --noEmit`: ✅ sem erros
- `eslint . --max-warnings 0`: ✅ sem warnings
- `cargo check`: ✅ compila sem erros
- Visual (Windows): TopBar mostra botões Min/Max/Close à esquerda; fonte Segoe UI Variable; janela arrastável; efeito Mica se Windows 11
