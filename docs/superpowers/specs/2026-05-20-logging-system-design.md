# Sistema de Logging Completo + Envio ao Desenvolvedor

**Data:** 2026-05-20
**Estado:** Aprovado — pronto para implementação

---

## Contexto

O Nexora Desktop tem um sistema de logging básico (`logger.rs`) que escreve eventos Rust para SQLite e emite-os para a LogsPage via evento Tauri. Não captura acções do utilizador (cliques, navegação, alterações), não persiste logs em ficheiro, não tem rotação/compressão, e não tem mecanismo de envio ao desenvolvedor.

Este spec define o sistema de logging completo: dois canais de escrita (SQLite para UI + ficheiros para persistência), captura de acções React configurável por verbosidade, rotação e retenção automáticas, nova aba "Logs" nas Settings, e botões de envio por email e por upload para servidor.

---

## Âmbito

### Incluído

- Novo módulo `file_logger.rs` que escreve logs em ficheiros diários `nexora-YYYY-MM-DD.log` em `{AppDataLocal}/Nexora/logs/`
- Rotação automática: compressão ZIP de ficheiros com mais de 1 dia; verificação no arranque e a cada nova entrada diária
- Retenção automática: eliminar ficheiros com mais de N dias OU quando total ultrapassa X MB (defaults: 30 dias / 200 MB, configuráveis em Settings)
- Novos comandos Rust: `get_log_storage_info`, `export_logs_bundle`, `clear_log_files`, `upload_logs_to_server`
- Hook React `useActionLog` com função `logAction(event, details?)` que envia eventos ao Rust via `invoke('log_user_action')`
- Verbosidade configurável em três níveis: Básico / Normal / Debug
- Captura explícita em handlers existentes (Básico+) e listener global de cliques com `data-log-id` (Debug)
- Nova aba "Logs" nas Settings com selector de verbosidade, campos de retenção, info de armazenamento, e botões de envio
- "Enviar por email": constrói `mailto:` com subject e body pré-preenchidos
- "Enviar para servidor": upload `multipart/form-data` via Rust (`reqwest`) para endpoint configurável; desactivado se endpoint vazio

### Excluído

- Logging de eventos de hover, scroll, ou movimento do rato
- Streaming de logs em tempo real para servidor (apenas on-demand via botão)
- Autenticação no endpoint de upload (o endpoint é responsável pela sua própria segurança)
- Rotação intra-diária (um ficheiro por dia é suficiente)
- Alterar a LogsPage existente (continua a ler do SQLite)

---

## Arquitectura

### Dois Canais de Escrita

```
Evento (Rust ou React)
    │
    ├─► logger.rs (canal existente, inalterado)
    │       └─► SQLite nexora.db — serve a LogsPage
    │
    └─► file_logger.rs (novo canal)
            └─► AppDataLocal/Nexora/logs/nexora-YYYY-MM-DD.log
                    └─► rotação/compressão → nexora-YYYY-MM-DD.log.zip
```

Os dois canais são independentes. Uma falha no `file_logger` não afecta o canal SQLite.

---

## Feature 1 — file_logger.rs

### Localização dos ficheiros

```
{AppDataLocal}/Nexora/logs/
  nexora-2026-05-20.log       ← ficheiro do dia (escrita activa)
  nexora-2026-05-19.log.zip   ← dia anterior comprimido
  nexora-2026-05-18.log.zip
  ...
```

Em Windows: `C:\Users\{user}\AppData\Local\Nexora\logs\`
Em macOS: `~/Library/Application Support/Nexora/logs/`
Em Linux: `~/.local/share/Nexora/logs/`

Obtido via `tauri::api::path::local_data_dir()` (Tauri 2: `app.path().local_data_dir()`).

### Formato de cada linha de log

```
2026-05-20T14:23:01.456Z [INFO] rust:queue — Job abc123 iniciado
2026-05-20T14:23:02.100Z [ACTION:NORMAL] ui:settings — language changed to en
2026-05-20T14:23:02.200Z [ACTION:DEBUG] ui:button — add-to-queue clicked {asset_id: "xyz"}
```

Formato: `{ISO8601} [{level}] {source} — {message}\n`

Para acções UI, o level é `ACTION:{verbosity_level}` (ex: `ACTION:BASIC`, `ACTION:NORMAL`, `ACTION:DEBUG`).

### Rotação e Compressão

Verifica no arranque (`file_logger::init()`) e sempre que uma nova entrada seria escrita num dia diferente do ficheiro activo:

```
Para cada ficheiro nexora-*.log onde data < hoje:
  comprimir para nexora-*.log.zip (zip com entrada única)
  apagar o .log original
```

Biblioteca de compressão: `zip` crate (adicionar ao `Cargo.toml`).

### Retenção

Após cada operação de compressão, e no arranque:

```
Calcular tamanho total de todos os ficheiros em logs/
Se total > max_size_mb * 1024 * 1024:
  apagar os ficheiros mais antigos até ficar abaixo do limite

Para cada ficheiro (log ou zip) com data > retention_days:
  apagar
```

Os valores `retention_days` e `max_size_mb` são lidos das settings SQLite.

### Inicialização

```rust
pub fn init(app: &tauri::AppHandle) -> Result<(), String>
```

Chamado em `lib.rs` durante o setup, após carregar as settings. Abre/cria o ficheiro do dia, corre rotação e retenção.

### Escrita

```rust
pub fn write(level: &str, source: &str, message: &str)
```

Thread-safe via `Mutex<BufWriter<File>>` em `OnceLock`. Escreve a linha formatada e faz flush imediato para evitar perda de dados.

---

## Feature 2 — Integração em logger.rs

Adicionar uma chamada a `file_logger::write()` no final da função `write()` existente do `logger.rs`:

```rust
// No fim de logger::write():
crate::file_logger::write(level, source, message);
```

Sem mais alterações ao `logger.rs`.

---

## Feature 3 — Comandos Rust (commands/logs.rs)

### `get_log_storage_info`

```rust
#[derive(Serialize)]
pub struct LogStorageInfo {
    pub log_dir: String,
    pub total_size_bytes: u64,
    pub file_count: u32,
    pub oldest_file_date: Option<String>,  // "YYYY-MM-DD" ou null
}

#[tauri::command]
pub async fn get_log_storage_info(app: tauri::AppHandle) -> Result<LogStorageInfo, String>
```

### `export_logs_bundle`

```rust
#[tauri::command]
pub async fn export_logs_bundle(app: tauri::AppHandle) -> Result<String, String>
// Retorna path do ZIP criado em temp_dir: nexora-logs-{timestamp}.zip
// Inclui todos os ficheiros .log e .log.zip da pasta de logs
```

### `clear_log_files`

```rust
#[tauri::command]
pub async fn clear_log_files(app: tauri::AppHandle) -> Result<(), String>
// Remove todos os ficheiros em logs/; recria o ficheiro do dia vazio
```

### `upload_logs_to_server`

```rust
#[tauri::command]
pub async fn upload_logs_to_server(
    app: tauri::AppHandle,
    endpoint: String,
) -> Result<String, String>
// 1. Chama export_logs_bundle internamente
// 2. POST multipart/form-data com o ficheiro ZIP para endpoint
// 3. Retorna Ok(response_body) ou Err(mensagem)
// Usa reqwest (dependência transitiva do Tauri — sem adicionar ao Cargo.toml)
```

### `log_user_action`

```rust
#[tauri::command]
pub fn log_user_action(
    level: String,   // "BASIC", "NORMAL", "DEBUG"
    event: String,   // ex: "settings:language_changed"
    details: Option<String>,  // JSON string opcional
    state: tauri::State<'_, AppState>,
) -> Result<(), String>
// Verifica se o nível do evento >= verbosidade configurada
// Se sim: chama logger::write() e file_logger::write()
```

Lógica de filtragem por verbosidade:

```
BASIC  >= BASIC               → escreve
NORMAL >= BASIC, >= NORMAL    → escreve
DEBUG  >= BASIC/NORMAL/DEBUG  → escreve sempre
```

---

## Feature 4 — Hook React: useActionLog

**Ficheiro:** `src/hooks/useActionLog.ts`

```typescript
export function useActionLog() {
  const verbosity = useSettingsStore((s) => s.logVerbosity); // 'basic' | 'normal' | 'debug'

  const logAction = useCallback(
    (event: string, details?: Record<string, unknown>) => {
      const level = getEventLevel(event); // vê tabela abaixo
      if (!shouldLog(level, verbosity)) return;
      invoke('log_user_action', {
        level: level.toUpperCase(),
        event,
        details: details ? JSON.stringify(details) : null,
      }).catch(console.error);
    },
    [verbosity],
  );

  return { logAction };
}
```

**Tabela de níveis por evento:**

| Evento                                       | Nível mínimo |
| -------------------------------------------- | ------------ |
| `error:*`                                    | BASIC        |
| `job:started`, `job:completed`, `job:failed` | BASIC        |
| `asset:deleted`, `reset:factory`             | BASIC        |
| `nav:*`, `settings:*`, `queue:*`             | NORMAL       |
| `button:*`, `modal:*`, `input:*`             | DEBUG        |

**Listener global de cliques (nível DEBUG):**

Em `App.tsx`, dentro de `useEffect`:

```typescript
useEffect(() => {
  const handleClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const logId = target.closest('[data-log-id]')?.getAttribute('data-log-id');
    if (!logId) return;
    logAction(`button:${logId}`);
  };
  document.addEventListener('click', handleClick);
  return () => document.removeEventListener('click', handleClick);
}, [logAction]);
```

Botões que devem ser rastreados em Debug recebem `data-log-id="nome-do-botao"`.

---

## Feature 5 — Settings: Nova aba "Logs"

Localização: nova tab "Logs" na SettingsPage, a seguir a "System".

### Maquete

```
─── Verbosidade ───────────────────────────────────────
  Nível de detalhe:
  ○ Básico    Erros e acções críticas
  ● Normal    + Navegação e alterações de settings
  ○ Debug     + Todos os cliques e eventos de UI

─── Armazenamento ─────────────────────────────────────
  Pasta:   C:\Users\arnal\AppData\Local\Nexora\logs
  Total:   12,4 MB · 8 ficheiros · mais antigo: 2026-04-20
  Reter:   [30] dias     Máximo: [200] MB
                                    [Abrir pasta]  [Limpar]

─── Enviar Logs ao Desenvolvedor ──────────────────────
  Endpoint de upload:
  [https://                                          ]
  (deixar vazio para desactivar o upload)

  [✉ Enviar por email]    [↑ Enviar para servidor]
```

### Comportamento

- Selector de verbosidade: radio buttons; grava imediatamente via `handleUpdateSetting('log_verbosity', value)`
- "Reter dias" / "Máximo MB": inputs numéricos, gravam no `onBlur`
- Info de armazenamento: carregada no mount da aba via `invoke('get_log_storage_info')`
- "Abrir pasta": `invoke('open_path', { path: logDir })`
- "Limpar": dialog nativo de confirmação → `invoke('clear_log_files')` → reload da info
- Endpoint: input de texto, grava no `onBlur`; se vazio → botão "Enviar para servidor" fica `disabled`
- "Enviar por email":
  ```typescript
  const subject = `Nexora Logs v${version} — ${new Date().toISOString().slice(0, 10)}`;
  const bundlePath = await invoke<string>('export_logs_bundle');
  const body = `Logs anexados em:\n${bundlePath}`;
  window.open(
    `mailto:dev@nexora.app?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
  );
  ```
- "Enviar para servidor": chama `invoke('upload_logs_to_server', { endpoint })` → toast sucesso com ID de referência, ou toast de erro

---

## Settings adicionadas

| Chave SQLite          | Tipo   | Default  | Descrição                    |
| --------------------- | ------ | -------- | ---------------------------- |
| `log_verbosity`       | string | `normal` | `basic` / `normal` / `debug` |
| `log_retention_days`  | string | `30`     | Número de dias a reter       |
| `log_max_size_mb`     | string | `200`    | Tamanho máximo total em MB   |
| `log_upload_endpoint` | string | `""`     | URL do endpoint de upload    |

Adicionadas à migração SQLite existente via `INSERT OR IGNORE` no arranque (não requer nova migration — usa o sistema de upsert existente).

---

## Ficheiros a Criar / Modificar

| Ficheiro                         | Operação  | Responsabilidade                                       |
| -------------------------------- | --------- | ------------------------------------------------------ |
| `src-tauri/src/file_logger.rs`   | Criar     | Escrita em ficheiro, rotação, compressão ZIP, retenção |
| `src-tauri/src/logger.rs`        | Modificar | Adicionar chamada a `file_logger::write()`             |
| `src-tauri/src/commands/logs.rs` | Modificar | Adicionar 5 novos comandos                             |
| `src-tauri/src/commands/mod.rs`  | Modificar | Exportar novos comandos                                |
| `src-tauri/src/lib.rs`           | Modificar | Registar comandos + `file_logger::init()`              |
| `src-tauri/Cargo.toml`           | Modificar | Adicionar crate `zip`                                  |
| `src/hooks/useActionLog.ts`      | Criar     | Hook de logging de acções UI                           |
| `src/pages/SettingsPage.tsx`     | Modificar | Nova aba "Logs"                                        |
| `src/App.tsx`                    | Modificar | Listener global de cliques para Debug                  |

---

## Tratamento de Erros

| Cenário                                               | Comportamento                                                                    |
| ----------------------------------------------------- | -------------------------------------------------------------------------------- |
| `file_logger::write()` falha (disco cheio, permissão) | Log silencioso no stderr; canal SQLite continua                                  |
| `export_logs_bundle` — pasta vazia                    | Retorna ZIP com ficheiro README.txt explicativo                                  |
| `upload_logs_to_server` — endpoint inacessível        | `Err("Servidor inacessível: {detalhe}")` → toast de erro                         |
| `upload_logs_to_server` — endpoint vazio              | `Err("Endpoint não configurado")` (não deveria acontecer — UI desactiva o botão) |
| Compressão ZIP falha                                  | Log de aviso; ficheiro `.log` mantido sem compressão                             |
| Retenção: erro ao apagar ficheiro                     | Log de aviso; continua para o próximo                                            |

---

## Plano de Verificação

| Teste                  | Procedimento                                  | Resultado esperado                      |
| ---------------------- | --------------------------------------------- | --------------------------------------- |
| Ficheiro de log criado | Arrancar a app                                | `nexora-YYYY-MM-DD.log` existe em logs/ |
| Acção Básica registada | Deletar um asset                              | Linha `ACTION:BASIC` no log             |
| Filtro de verbosidade  | Mudar para Básico, clicar botão               | Sem entrada `ACTION:DEBUG`              |
| Rotação                | Criar ficheiro com data ontem → reiniciar     | Ficheiro comprimido para `.zip`         |
| Retenção por dias      | Criar ficheiro com 31 dias → reiniciar        | Ficheiro apagado                        |
| Retenção por tamanho   | Simular total > 200 MB → reiniciar            | Ficheiros antigos apagados              |
| Info de armazenamento  | Abrir aba Logs                                | Path, tamanho e contagem correctos      |
| Limpar logs            | [Limpar] → confirmar                          | Pasta vazia, info actualizada           |
| Enviar por email       | [Enviar por email]                            | Cliente de email abre com subject/body  |
| Upload sem endpoint    | Endpoint vazio                                | Botão desactivado                       |
| Upload com endpoint    | Endpoint configurado → [Enviar para servidor] | Toast sucesso com ID                    |
| Upload falha           | Endpoint inválido                             | Toast de erro com mensagem              |
