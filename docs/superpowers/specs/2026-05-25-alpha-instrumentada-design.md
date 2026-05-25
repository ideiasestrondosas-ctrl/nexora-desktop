# Nexora Desktop — Alpha Instrumentada v0.29.0 — Spec

## Contexto

Versão actual: v0.28.0. Pipeline completa (14 fases), 15 idiomas, cloud (6 providers), Mica/Vibrancy, auto-updater, CI/CD. Caminho escolhido: Alpha Equilibrada (Opção B do roadmap) + ferramentas de feedback integradas (Opção C). Alpha fechada com 10–30 colegas e amigos técnicos durante ~2 semanas.

Objectivos da alpha: validar estabilidade da pipeline em máquinas reais, UX/usabilidade, compatibilidade de plataforma (Windows/macOS/Linux) e performance.

---

## Escopo — 7 Componentes

### 1. Watch Folders

Monitoriza directorias do SO e adiciona automaticamente ficheiros novos à fila de transcodificação.

**Backend (Rust):**

- Crate `notify = "6"` (cross-platform: inotify/Linux, FSEvents/macOS, ReadDirectoryChangesW/Windows)
- Novos comandos Tauri registados em `lib.rs`:
  - `add_watch_folder(path: String) -> Result<WatchFolder, String>`
  - `remove_watch_folder(id: String) -> Result<(), String>`
  - `list_watch_folders() -> Result<Vec<WatchFolder>, String>`
  - `toggle_watch_folder(id: String, enabled: bool) -> Result<(), String>`
- Evento emitido ao frontend: `watch-folder-file-added` com payload `{ path: string, watch_folder_id: string }`
- Filtros: só ficheiros de vídeo (extensões suportadas pela pipeline)
- Estado persistido em SQLite: tabela `watch_folders (id TEXT PRIMARY KEY, path TEXT NOT NULL, enabled INTEGER DEFAULT 1, created_at TEXT NOT NULL)`

**Frontend (React):**

- Nova tab "Watch Folders" na página Settings (ao lado de "Geral", "Cloud", etc.)
- Lista de pastas activas com toggle on/off e botão remover
- Botão "Adicionar pasta" — abre diálogo nativo via `dialog.open({ directory: true })`
- Listener `useEffect` para evento `watch-folder-file-added` → `addToQueue(path)`
- i18n: chaves em EN + PT obrigatórias

**Tipo TypeScript:**

```typescript
interface WatchFolder {
  id: string;
  path: string;
  enabled: boolean;
  createdAt: string;
}
```

---

### 2. Onboarding — Primeiro Arranque

Modal de 4 passos mostrado na primeira vez que a app abre.

**Activação:** `localStorage` key `nexora_onboarding_complete`. Se ausente, mostra o modal ao montar `App.tsx`.

**Passos:**

1. **Bem-vindo** — nome da app, descrição breve, screenshot ou ícone
2. **Pasta de output** — picker de directoria, pré-preenchida com `~/Videos/Nexora`; chamada `invoke('set_output_dir', { path })`
3. **Privacidade / Telemetria** — toggle opt-in; explicação: "Dados de erros anónimos, só neste dispositivo, nunca enviados"
4. **Pronto** — botão "Começar"; define `nexora_onboarding_complete = '1'`

**Reset para testers:** Settings → Avançado → botão "Resetar onboarding" (apaga a chave localStorage).

**Componente:** `src/components/OnboardingModal.tsx` — usa o sistema de modal existente da app.

---

### 3. Mensagens de Erro UX

Substituir erros raw de FFmpeg por mensagens accionáveis na UI da Queue.

**Categorias de erro (mapeamento):**
| Padrão FFmpeg | Mensagem UI | Acção sugerida |
|---|---|---|
| `No space left on device` | "Disco cheio" | "Liberta espaço em disco e tenta novamente" |
| `Permission denied` | "Sem permissão" | "Verifica as permissões da pasta de destino" |
| `Invalid data found` / `moov atom not found` | "Ficheiro corrompido ou formato não suportado" | "Verifica se o ficheiro original está íntegro" |
| `Encoder not found` / `codec not found` | "Codec não disponível" | "Selecciona um preset diferente" |
| `SIGKILL` / `killed` | "Processo interrompido" | "A conversão foi cancelada ou o sistema ficou sem memória" |
| (outros) | "Erro de transcodificação" | "Consulta os Logs para detalhes" |

**Componente:** `src/components/PipelineErrorMessage.tsx` — recebe `rawError: string`, retorna `{ title, suggestion }`.

**Integração:** Substituir exibição de erro raw nas cards da Queue pelo novo componente.

---

### 4. Botão "Reportar Problema" + Export de Logs

**Botão na TopBar:** ícone `Bug` (lucide-react) à direita do botão de ajuda → abre `BugReportModal`.

**BugReportModal (`src/components/BugReportModal.tsx`):**

- Campo: Título (obrigatório)
- Campo: Descrição (textarea)
- Checkbox: "Incluir últimas 50 linhas de log" (marcado por default)
- 3 acções:
  1. **Copiar para clipboard** — título + descrição + logs formatados
  2. **Abrir GitHub Issue** — `open('https://github.com/ideiasestrondosas-ctrl/nexora-desktop/issues/new?title=...&body=...')` com campos pré-preenchidos via URL encoding
  3. **Guardar como ficheiro** — `invoke('save_bug_report', { content })` → guarda `nexora-bug-YYYY-MM-DD.txt` na pasta de Downloads

**Export de Logs (página Logs):**

- Botão "Exportar Logs" existente ou novo → `invoke('export_logs')` → guarda `nexora-logs-YYYY-MM-DD.txt`
- Novo comando Tauri `export_logs() -> Result<String, String>` que devolve o path do ficheiro guardado

---

### 5. Telemetria Opt-in (Local — Alpha Only)

**Escopo alpha:** apenas armazenamento local, sem envio remoto. Serve para o developer ver dados recolhidos em testes.

**SQLite — tabela `telemetry_events`:**

```sql
CREATE TABLE telemetry_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  payload_json TEXT,
  created_at TEXT NOT NULL
);
```

**Eventos registados:**

- `app_launch` — ao iniciar (version, platform, os_version)
- `pipeline_error` — por cada erro de transcodificação (error_category sem dados pessoais)
- `pipeline_success` — por cada transcodificação bem-sucedida (duration_ms, preset_name)
- `crash_detected` — se app anterior terminou sem `app_exit` no log

**Opt-in:** Perguntado no Onboarding passo 3. Guardado em Settings (`telemetry_enabled` em SQLite `settings` table).

**Settings → Privacidade:**

- Toggle "Partilhar dados de erros anónimos"
- Botão "Ver dados recolhidos" — abre modal com lista dos eventos em JSON
- Botão "Apagar todos os dados"

**Nota:** Para beta/v1.0, avaliar envio remoto (Sentry ou endpoint próprio). Fora do escopo desta spec.

---

### 6. Auditoria de Traduções EN + PT

**Script:** `scripts/check-translations.mjs`

Compara todas as chaves de `src/i18n/en.json` contra cada ficheiro de língua. Imprime:

- Chaves presentes em EN mas ausentes na língua X
- Chaves presentes na língua X mas ausentes em EN (chaves órfãs)

**Execução:** `node scripts/check-translations.mjs`

**Alpha gate:** EN + PT devem ter 0 chaves em falta. As restantes 13 línguas: listar discrepâncias mas não bloquear.

**Correção:** Preencher manualmente as chaves em falta em PT. Para as outras línguas, deixar fallback para EN (já implementado no i18n).

---

### 7. ALPHA-TESTING.md

Documento entregue aos testers com o link de download.

**Estrutura:**

- Requisitos mínimos (Windows 10 / macOS 11 / Ubuntu 20.04, 4 GB RAM)
- Link de download (GitHub Release `v0.29.0-alpha.1`)
- Instalação passo-a-passo por plataforma
- Lista de 20 acções de teste (cobrindo: onboarding, import, queue, transcodificação, Watch Folders, cloud, logs, bug report)
- Secção "Bugs conhecidos" (actualizada antes de enviar)
- Como reportar: botão na app OU GitHub Issues OU email directo

---

## Versão e Release

- **Tag:** `v0.29.0-alpha.1`
- **CI:** GitHub Actions gera instaladores para Windows (.msi + .exe), macOS (.dmg), Linux (.deb + .AppImage)
- **Distribuição:** GitHub Release como draft → partilhar link directo com testers (não publicar publicamente)
- **Após alpha:** Corrigir bugs reportados → `v0.29.0-alpha.2` (ou mais) → fechar alpha → `v0.29.0` Beta Pública

---

## O que NÃO está neste escopo

- Envio remoto de telemetria (Sentry, etc.) — Beta/v1.0
- Novas línguas além de EN + PT — Beta
- Menus nativos por plataforma — Beta
- Store submission (Windows Store, Mac App Store) — v1.0
- Acessibilidade (WCAG) — v1.0
- Drag-drop rewrite (se já funcionar end-to-end com ficheiros reais, não alterar)

---

## Sequência de implementação recomendada

1. `check-translations.mjs` + correcções EN/PT (rápido, desbloqueador)
2. Watch Folders (Rust + frontend) — maior esforço, melhor começar cedo
3. Onboarding modal
4. Mensagens de erro UX
5. Telemetria opt-in (depende de onboarding para o passo de opt-in)
6. BugReportModal + export de logs
7. ALPHA-TESTING.md
8. Tag `v0.29.0-alpha.1` + PublishDraft

---

## Ficheiros afectados

| Ficheiro                                  | Alteração                                                          |
| ----------------------------------------- | ------------------------------------------------------------------ |
| `src-tauri/Cargo.toml`                    | + `notify = "6"`                                                   |
| `src-tauri/src/lib.rs`                    | + comandos watch_folders, export_logs, save_bug_report, telemetria |
| `src-tauri/src/watch_folders.rs`          | NOVO — lógica do watcher                                           |
| `src-tauri/src/telemetry.rs`              | NOVO — registo de eventos                                          |
| `src-tauri/migrations/`                   | + tabelas `watch_folders`, `telemetry_events`                      |
| `src/components/OnboardingModal.tsx`      | NOVO                                                               |
| `src/components/BugReportModal.tsx`       | NOVO                                                               |
| `src/components/PipelineErrorMessage.tsx` | NOVO                                                               |
| `src/components/TopBar.tsx`               | + botão Bug → BugReportModal                                       |
| `src/pages/Settings.tsx`                  | + tab Watch Folders + secção Privacidade                           |
| `src/i18n/en.json`                        | + chaves novas (watch folders, onboarding, telemetria, bug report) |
| `src/i18n/pt.json`                        | + todas as chaves de EN                                            |
| `scripts/check-translations.mjs`          | NOVO                                                               |
| `ALPHA-TESTING.md`                        | NOVO                                                               |
