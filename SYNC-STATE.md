# Estado de Sincronizacao - Nexora Desktop

> Handoff entre Claude Code e Google Antigravity.
> Actualizar no FIM de cada sessao. Lido no INICIO de cada sessao.

---

Actualizado: 2026-05-15 00:45
Agente: Claude Code (Kimi K2.6)

## O que foi feito

### Sessao Anterior — Correcao sync.ps1 (Opção A) + Merge main actualizado — CONCLUIDO
*(Ver SYNC-STATE.md no historico do Git para detalhes)*

### Sessao Actual — README, docs, HelpOverlay, i18n — CONCLUIDO

**1. README.md completo**
- Reescrito completamente em ingles (base): hero, badges, features, screenshots placeholders, arquitectura, quick start, perfis, atalhos, desenvolvimento, licenca GPL v3.

**2. Documentacao em `docs/`**
- `docs/USER_MANUAL.md` — manual completo do utilizador (intro, getting started, todos os ecras, pipeline de 8 passos, perfis, QC, troubleshooting).
- `docs/SCREEN_GUIDE.md` — guia visual de cada ecra com todos os elementos UI, badges, cores, icones, fluxos de interaccao.
- `docs/FUNCTIONS.md` — referencia tecnica: Tauri commands, workers, DB schema, hooks, eventos IPC, parametros FFmpeg.
- `docs/INSTALL.md` — guia por plataforma (Win/macOS/Linux) com requisitos, instalacao, primeiro arranque, atualizacoes, desinstalacao.
- `docs/LICENSE.md` — GPL v3 com notas de componentes de terceiros.

**3. HelpOverlay (Opcao B)**
- `src/components/HelpModal.tsx` — redesenhado como overlay transparente com backdrop blur.
- Cards concisos por ecra (Dashboard, Library, Queue, Profiles, Settings, Logs) + tab Intro.
- Botao "Open Full Guide" que abre o README no browser via `openUrl`.
- Fecha com Escape, click fora, ou botao X.
- Integrado com i18n (traduzido para PT/ES/FR/DE).

**4. Botao HelpCircle no TopBar**
- `src/components/TopBar.tsx` — adicionado icone `HelpCircle` (❓) no canto superior direito, ao lado do Exit.
- Tooltip e callback `onHelpOpen` passado pelo App.tsx.

**5. i18n**
- Adicionadas ~80 chaves `help.*` a `src/i18n/locales/en/common.json`.
- Traduzidas para PT, ES, FR, DE nos respectivos ficheiros `common.json`.

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
README.md
SYNC-STATE.md
src/components/HelpModal.tsx
src/components/TopBar.tsx
src/App.tsx
src/i18n/locales/en/common.json
src/i18n/locales/pt/common.json
src/i18n/locales/es/common.json
src/i18n/locales/fr/common.json
src/i18n/locales/de/common.json
NOVOS:
docs/USER_MANUAL.md
docs/SCREEN_GUIDE.md
docs/FUNCTIONS.md
docs/INSTALL.md
docs/LICENSE.md
```

---

## Notas tecnicas para o proximo agente

- **Base Master:** Editar SEMPRE `src/i18n/locales/en/base.json`. Nunca editar PT/ES/FR/DE directamente.
- **Sync idioma:** `useLanguageSync()` no `App.tsx` garante que o idioma guardado em Zustand e aplicado no arranque.
- **Datas dinamicas:** Usar `i18n.language` em `toLocaleTimeString()` / `toLocaleDateString()`.
- **Termos tecnicos:** Nunca traduzir VMAF, LUFS, FFmpeg, NVENC, GPU, codec names, etc.
- **Ollama:** Script suporta resume automatico. Se falhar a meio, re-executar o mesmo comando continua de onde parou.
- **sync.ps1:** Agora suporta promocao de releases existentes mesmo com workspace limpo. Usar `sync.ps1 -Release` ou opcao 3 no menu interactivo.
- **HelpOverlay:** O overlay usa `@tauri-apps/plugin-opener` para abrir o guia completo no browser. Se o plugin nao estiver disponivel, falha silenciosamente.
- **Screenshots:** Os placeholders em `docs/screenshots/*.png` devem ser substituidos por capturas reais da aplicacao.
