# Estado de Sincronizacao - Nexora Desktop

> Handoff entre Claude Code e Google Antigravity.
> Actualizar no FIM de cada sessao. Lido no INICIO de cada sessao.

---

Actualizado: 2026-05-15 01:00
Agente: Claude Code (Kimi K2.6)

## O que foi feito

### Sessao Anterior — README, docs, HelpOverlay, i18n — CONCLUIDO
*(Ver SYNC-STATE.md no historico do Git para detalhes)*

### Sessao Actual — Correcoes HelpOverlay + screenshots — CONCLUIDO

**1. Correcao das traducoes EN no HelpOverlay (v2)**
- Causa: as chaves `help.screens.*` foram adicionadas dentro de `help.about.screens` no `base.json`, mas o componente procura `help.screens.*`.
- Solucao: movidas as chaves `help.screens.*` do nivel `help.about` para o nivel `help` (raiz da secao help).
- Adicionadas tambem `help.openFullGuide`, `help.intro.quickStart` e `help.intro.quickStartDesc` ao nivel correto.
- Resultado: todas as chaves de traducao sao resolvidas correctamente.

**2. Correcao do scroll horizontal no HelpOverlay**
- Adicionada classe CSS `.scrollbar-hide` ao `index.css` (esconde scrollbar em todos os browsers).
- As tabs do HelpOverlay usam `scrollbar-hide` + padding reduzido (`px-2.5 py-1.5`).
- Resultado: sem scroll horizontal visivel.

**3. Correcao dos screenshots + Lightbox**
- Renomeado `docs/screenshots/queues.png` → `queue.png` (o README procurava `queue.png`).
- Copiados todos os PNGs para `public/screenshots/` para serem servidos pela app Tauri.
- Adicionadas imagens aos cards de cada ecra no HelpOverlay.
- **Lightbox**: ao clicar numa imagem, abre overlay em tamanho completo (`max-w-[90vw] max-h-[85vh]`) com fundo escurecido.
- Fecha com click fora, botao X, ou tecla Escape.
- Resultado: screenshots visiveis no card e ampliaveis para analise detalhada.

---

## Estado de compilacao

- `cargo check`: **OK** (0 erros, 0 warnings)
- `tsc --noEmit`: **OK** (0 erros)
- `vitest run`: **OK** (21/21 tests passaram)
- `tauri build --debug`: **OK** (MSI 146MB + NSIS 92MB)

---

## Proximos passos (Plano 6 — proxima sessao)

| Tarefa | Prioridade |
|---|---|
| Testar fluxo real ingest -> job -> transcode (tauri dev + video) | Critica |
| Adicionar bs1770gain ao download de binarios | Media |
| Deep links `nexora://` (ADR-D012) | Baixa |
| Build macOS (.dmg universal) e Linux (.AppImage + .deb) | Baixa |
| Criar GitHub Release v0.17.0 manualmente (se necessario) | Baixa |
| Traduzir docs/ para ES/FR/DE/PT com Ollama (futuro) | Baixa |

---

## Ficheiros modificados (sessao actual)

```
MODIFICADOS:
SYNC-STATE.md
src/components/HelpModal.tsx
src/i18n/locales/en/base.json
src/index.css
docs/screenshots/queue.png (renomeado)
NOVOS:
public/screenshots/
```

---

## Notas tecnicas para o proximo agente

- **Base Master:** Editar SEMPRE `src/i18n/locales/en/base.json`. Nunca editar PT/ES/FR/DE directamente.
- **Sync idioma:** `useLanguageSync()` no `App.tsx` garante que o idioma guardado em Zustand e aplicado no arranque.
- **Datas dinamicas:** Usar `i18n.language` em `toLocaleTimeString()` / `toLocaleDateString()`.
- **Termos tecnicos:** Nunca traduzir VMAF, LUFS, FFmpeg, NVENC, GPU, codec names, etc.
- **Ollama:** Script suporta resume automatico. Se falhar a meio, re-executar o mesmo comando continua de onde parou.
- **sync.ps1:** Agora suporta promocao de releases existentes mesmo com workspace limpo. Usar `sync.ps1 -Release` ou opcao 3 no menu interactivo.
- **HelpOverlay:** Usa `@tauri-apps/plugin-opener` para abrir o guia completo no browser. Screenshots sao servidos de `public/screenshots/`.
- **Screenshots:** `docs/screenshots/` para GitHub; `public/screenshots/` para a app. Manter ambos sincronizados.
