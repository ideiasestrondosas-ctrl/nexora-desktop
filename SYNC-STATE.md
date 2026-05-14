# Estado de Sincronizacao - Nexora Desktop

> Handoff entre Claude Code e Google Antigravity.
> Actualizar no FIM de cada sessao. Lido no INICIO de cada sessao.

---

Actualizado: 2026-05-14 07:15
Agente: Claude Code (Kimi K2.6)

## O que foi feito

### Sessao Actual — Plano V2: Correcções UI/UX Pós-Teste — CONCLUIDO

**1. Settings > Tab Interface — Conteúdo Recuperado**
- **src/pages/SettingsPage.tsx**:
  - Adicionado tab `interface` com controles de **Tema** (botões Sistema / Claro / Escuro) e **Idioma** (dropdown pt/en)
  - Integrado com `settingsStore.theme` e `handleUpdateSetting('theme'/'language')`

**2. Settings > Tab Sistema — Timeout + Rust Simplificado**
- **src/pages/SettingsPage.tsx**:
  - Timeout de 5s no frontend para `get_system_info` — evita spinner infinito
  - Mensagem "Timeout ao carregar informação do sistema (>5s)" se exceder
- **src-tauri/src/commands/system.rs**:
  - `get_system_info`: `System::new_all()` → `System::new()` + `refresh_cpu_all()` + `refresh_memory()`
  - Removido `Networks::new_with_refreshed_list()` que bloqueava em alguns sistemas
  - `network_interfaces` devolve array vazio como fallback seguro

**3. Settings > Tab Sobre — Versão Fallback Corrigida**
- **src/pages/SettingsPage.tsx**:
  - `v{installedInfo?.app_version || '0.13.0'}` → `v{installedInfo?.app_version ?? '...'}`
  - Elimina versão hardcoded incorreta quando `installedInfo` é null

**4. TopBar — Aumento de Fontes e Widgets**
- **src/components/TopBar.tsx**:
  - Altura: `h-14` → `h-16`
  - Título: `text-sm` → `text-base`
  - Descrição: `text-[10px]` → `text-xs`
  - Gauges: `w-10 h-10` → `w-12 h-12`, ícones `size={14}` → `size={16}`
  - Labels de gauge: `text-[9px]` → `text-[10px]`
  - Botão Sair: `size={18}` → `size={20}`, padding `p-2` → `p-2.5`

**5. PipelineSummary — Estados Globais no Header**
- **src/components/PipelineSummary.tsx**:
  - Adicionado header com badges globais: **Em fila**, **A processar** (com pulse), **Concluídos**
  - Valores calculados a partir do array `jobs` (filtrados por status)
  - Layout em `flex flex-wrap gap-3` acima das fases individuais

**6. QueuePage — Header Redundante Removido**
- **src/pages/QueuePage.tsx**:
  - Removido `<h1>Fila de Processamento</h1>` e badges globais (Em fila / A processar / Concluídos)
  - Mantidos apenas badges de Quarentena e Erros quando >0
  - PipelineSummary já mostra os estados globais

**7. ProfilesPage — Dropdown + Vista Detalhe**
- **src/pages/ProfilesPage.tsx** (reescrito):
  - Dropdown no topo com grupos: **Pré-definidos** (system) e **Personalizados** (custom)
  - Indicador visual: cadeado para system, checkmark para custom
  - Vista detalhe do perfil seleccionado com cards de Vídeo / Áudio / Qualidade
  - Acções no topo: **Criar** (sempre), **Editar** / **Duplicar** / **Apagar** (só para custom)
  - Botão **Duplicar** disponível também para presets system
  - Sidebar de edição mantida com validação de system vs custom

**8. LibraryPage — Header Redundante Removido**
- **src/pages/LibraryPage.tsx**:
  - Removido cabeçalho com `<h1>Biblioteca</h1>` e botão "Adicionar Vídeos" no topo
  - Mantidos: filters bar, drag-and-drop zone, empty state com botão, grid/list view

---

## Estado de compilacao

- `cargo check`: **OK** (0 erros)
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
MODIFICADOS:
src/components/TopBar.tsx
src/components/PipelineSummary.tsx
src/pages/SettingsPage.tsx
src/pages/QueuePage.tsx
src/pages/ProfilesPage.tsx
src/pages/LibraryPage.tsx
src-tauri/src/commands/system.rs
SYNC-STATE.md
```

---

## Notas tecnicas para o proximo agente

- **Tab Interface**: Tema e idioma são guardados em settingsStore mas o tema ainda não aplica CSS vars (apenas guarda valor). Light/Dark real é tarefa do Plano 3.
- **Tab Sistema**: O timeout de 5s no frontend + simplificação Rust resolve o ecrã em branco. Se `get_system_info` continuar lento, considerar cache no Rust.
- **PipelineSummary**: Os estados globais são calculados inline; se o array `jobs` for grande (>1000), considerar memoização com `useMemo`.
- **ProfilesPage**: O dropdown usa estado local (`dropdownOpen`) com overlay fixed. O perfil seleccionado é guardado em `selectedProfileId`.
- **QueuePage**: Remover o header foi seguro porque o TopBar já mostra "Fila de Processamento" e o PipelineSummary mostra os contadores globais.
