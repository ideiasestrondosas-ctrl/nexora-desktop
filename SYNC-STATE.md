# Estado de Sincronizacao - Nexora Desktop

> Handoff entre Claude Code e Google Antigravity.
> Actualizar no FIM de cada sessao. Lido no INICIO de cada sessao.

---

Actualizado: 2026-05-14 17:45
Agente: Claude Code (Kimi K2.6)

## O que foi feito

### Sessao Actual — i18n Completo: Base Master EN + 5 Idiomas — CONCLUIDO

**1. Base Master EN (base.json)**
- Criado `src/i18n/locales/en/base.json` — **única fonte de verdade** com ~550 chaves estruturadas hierarquicamente.
- Namespaces: `app`, `nav`, `topbar`, `dashboard`, `library`, `queue`, `profiles`, `settings`, `logs`, `assetDetail`, `pipeline`, `dropZone`, `jobCard`, `systemMetrics`, `help`, `assetDetailModal`, `logViewer`, `status`, `vmafGauge`, `confirmations`, `common`.

**2. Infraestrutura i18n**
- `src/i18n/index.ts`: Removido `lng: 'pt'` hardcoded. Fallback EN. 5 idiomas registados.
- `src/i18n/useLanguageSync.ts`: Hook que sincroniza Zustand ↔ i18next no mount da app.
- `src/App.tsx`: Integrado `useLanguageSync()` para restaurar idioma guardado no arranque.

**3. Traduções geradas**
- **PT** (`pt/common.json`): Tradução manual original preservada + merge automático de chaves em falta do EN.
- **ES, FR, DE** (`es/common.json`, `fr/common.json`, `de/common.json`): Placeholders em EN (estrutura completa, aguardam tradução manual ou API paga).
- Script `scripts/translate-i18n.cjs` criado (Google Translate — falhou por rate limiting).
- Script `scripts/translate-i18n-libre.cjs` criado (LibreTranslate — falhou por bloqueio da instância pública).

**4. Extração massiva de strings hardcoded**
- **15 ficheiros** atualizados de PT hardcoded para `t()`:
  - `src/components/NexoraStatusBadge.tsx`
  - `src/components/SystemMetricsBar.tsx`
  - `src/components/VMAFGauge.tsx`
  - `src/components/DropZone.tsx`
  - `src/components/JobCard.tsx`
  - `src/components/LogViewer.tsx`
  - `src/components/AssetDetailModal.tsx`
  - `src/components/PipelineSummary.tsx`
  - `src/pages/DashboardPage.tsx`
  - `src/pages/LibraryPage.tsx`
  - `src/pages/QueuePage.tsx`
  - `src/pages/LogsPage.tsx`
  - `src/pages/ProfilesPage.tsx`
  - `src/pages/AssetDetailPage.tsx`
  - `src/components/HelpModal.tsx`
  - `src/pages/SettingsPage.tsx`
- **Zero** strings PT hardcoded restantes no frontend (verificado via grep).

**5. Formatação dinâmica de datas**
- Todos os `.toLocaleTimeString('pt-PT', ...)` substituídos por `.toLocaleTimeString(i18n.language, ...)`.
- Ficheiros afetados: `DashboardPage`, `AssetDetailPage`, `LogsPage`, `LogViewer`, `QueuePage`.

**6. Dropdown de idiomas**
- `SettingsPage.tsx`: Dropdown expandido para 5 opções (PT, EN, ES, FR, DE).
- Tipo `language` actualizado para `'pt' | 'en' | 'es' | 'fr' | 'de'`.

---

## Estado de compilacao

- `cargo check`: **OK** (0 erros, 0 warnings)
- `tsc --noEmit`: **OK** (0 erros)
- `vitest run`: **OK** (21/21 tests passaram)
- `tauri build --debug`: **OK** (MSI 146MB + NSIS 92MB)

---

## Proximos passos (Plano 5 — próxima sessao)

| Tarefa | Prioridade |
|---|---|
| Traduzir ES/FR/DE (manualmente ou via API paga) | Média |
| Testar fluxo real ingest → job → transcode (tauri dev + vídeo) | Critica |
| Adicionar bs1770gain ao download de binários | Média |
| Deep links `nexora://` (ADR-D012) | Baixa |
| Build macOS (.dmg universal) e Linux (.AppImage + .deb) | Baixa |

---

## Ficheiros modificados (sessao actual)

```
NOVOS:
src/i18n/locales/en/base.json
src/i18n/useLanguageSync.ts
scripts/translate-i18n.cjs
scripts/translate-i18n-libre.cjs

MODIFICADOS:
src/i18n/index.ts
src/App.tsx
src/store/settings.ts
src/components/NexoraStatusBadge.tsx
src/components/SystemMetricsBar.tsx
src/components/VMAFGauge.tsx
src/components/DropZone.tsx
src/components/JobCard.tsx
src/components/LogViewer.tsx
src/components/AssetDetailModal.tsx
src/components/PipelineSummary.tsx
src/components/HelpModal.tsx
src/pages/DashboardPage.tsx
src/pages/LibraryPage.tsx
src/pages/QueuePage.tsx
src/pages/LogsPage.tsx
src/pages/ProfilesPage.tsx
src/pages/AssetDetailPage.tsx
src/pages/SettingsPage.tsx
src/i18n/locales/pt/common.json
src/i18n/locales/es/common.json
src/i18n/locales/fr/common.json
src/i18n/locales/de/common.json
PROGRESS-DESKTOP.md
SYNC-STATE.md
```

---

## Notas tecnicas para o proximo agente

- **Base Master:** Editar SEMPRE `src/i18n/locales/en/base.json`. Nunca editar PT/ES/FR/DE directamente.
- **Merge PT:** `pt/common.json` tem todas as chaves (272 traduzidas manualmente + resto em EN como fallback).
- **Sync idioma:** `useLanguageSync()` no `App.tsx` garante que o idioma guardado em Zustand é aplicado no arranque.
- **Datas dinâmicas:** Usar `i18n.language` em `toLocaleTimeString()` / `toLocaleDateString()`.
- **ES/FR/DE:** São placeholders em inglês. Para traduzir, editar `base.json` e re-executar script de tradução (ou traduzir manualmente).
- **Termos técnicos:** Nunca traduzir VMAF, LUFS, FFmpeg, NVENC, GPU, codec names, etc.
