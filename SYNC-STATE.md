# Estado de Sincronizacao - Nexora Desktop

> Handoff entre Claude Code e Google Antigravity.
> Actualizar no FIM de cada sessao. Lido no INICIO de cada sessao.

---

Actualizado: 2026-05-16 14:00
Agente: Claude Code (Kimi K2.6)

## O que foi feito

### Sessao Anterior — README, docs, HelpOverlay, i18n — CONCLUIDO
*(Ver SYNC-STATE.md no historico do Git para detalhes)*

### Sessao Actual — Correcao help duplicado + Traducao 10 idiomas — CONCLUIDO

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

**4. Correcao bloco help duplicado em PT/ES/FR/DE**
- Causa: os ficheiros PT/ES/FR/DE tinham um segundo bloco `help` em ingles (duplicado) que sobrescrevia as traducoes novas.
- Solucao: removido o segundo bloco `help` (e blocos adjacentes duplicados) de cada ficheiro usando scripts de analise de JSON.
- Corrigido tambem o BOM (Byte Order Mark) que invalidava o JSON apos edicoes com PowerShell.
- Resultado: JSON valido, sem duplicacao, todas as chaves `help.*` resolvidas correctamente.

**5. Traducao para 10 novos idiomas via Ollama**
- Idiomas: Arabic (ar), Italian (it), Japanese (ja), Korean (ko), Dutch (nl), Polish (pl), Russian (ru), Swedish (sv), Turkish (tr), Chinese Simplified (zh).
- Criado script `scripts/translate-all.cjs` (batch size 4, resume automatico).
- Total: 618 chaves/idioma, 10 idiomas = ~6180 traducoes.
- Modelo: `qwen2.5:7b-instruct` via Ollama local.
- Resultado: todos os 15 idiomas da app agora tem `common.json` completo.

**6. Correcao mojibake (caracteres especiais corrompidos)**
- Causa: ficheiros PT/ES/FR/DE tinham caracteres UTF-8 interpretados como Windows-1252 (double-encoding), resultando em `VersÃ£o` em vez de `Versão`, `Ã‰dition` em vez de `Édition`.
- Criado script `scripts/fix-encoding.cjs` com mapeamento manual para padrões complexos (3+ chars) e automático para padrões simples (2 chars).
- Resultado: todos os caracteres especiais (acentos, cedilhas, em-dash, arrows, aspas curvas) estão corretos nos 4 ficheiros.

**7. Menu de idiomas expandido para 15 linguas**
- `src/i18n/index.ts`: registados os 10 novos idiomas no i18next.
- `src/pages/SettingsPage.tsx`: tipo `Settings.language`, cast e dropdown `<select>` expandidos para 15 opções.
- `src/i18n/locales/en/base.json` + PT/ES/FR/DE: adicionadas chaves `settings.interface.{ar,it,ja,ko,nl,pl,ru,sv,tr,zh}` com nomes traduzidos.
- Resultado: utilizador pode agora seleccionar qualquer um dos 15 idiomas em Definições > Interface.

---

## Estado de compilacao

- `cargo check`: **OK** (0 erros, 0 warnings)
- `tsc --noEmit`: **OK** (0 erros)
- `vitest run`: **OK** (21/21 tests passaram)
- `tauri build --debug`: **OK** (MSI 146MB + NSIS 92MB)
- Validacao JSON i18n: **OK** (16 ficheiros, 0 invalidos)
- `fix-encoding.cjs`: script de correcao de mojibake criado e executado com sucesso

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
PROGRESS-DESKTOP.md
src/i18n/index.ts
src/pages/SettingsPage.tsx
src/i18n/locales/en/base.json
src/i18n/locales/pt/common.json
src/i18n/locales/es/common.json
src/i18n/locales/fr/common.json
src/i18n/locales/de/common.json
NOVOS:
scripts/translate-all.cjs
scripts/fix-encoding.cjs
src/i18n/locales/ar/common.json
src/i18n/locales/it/common.json
src/i18n/locales/ja/common.json
src/i18n/locales/ko/common.json
src/i18n/locales/nl/common.json
src/i18n/locales/pl/common.json
src/i18n/locales/ru/common.json
src/i18n/locales/sv/common.json
src/i18n/locales/tr/common.json
src/i18n/locales/zh/common.json
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
