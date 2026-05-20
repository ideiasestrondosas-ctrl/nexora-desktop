# Settings: Apply Live + Cache Display

**Data:** 2026-05-20  
**Estado:** Aprovado — pronto para implementação

---

## Contexto

Duas melhorias independentes às Settings do Nexora Desktop:

1. **Apply live** — Certas settings (língua, concorrência da fila) só tomavam efeito após reiniciar a app. O utilizador espera que qualquer alteração produza efeito imediato na sessão activa.

2. **Cache display** — Os diretórios temporários de processamento (`nexora-transcode-*`, `nexora-thumbs`) são usados internamente mas nunca expostos ao utilizador. Sem visibilidade, é impossível gerir espaço ou depurar problemas de disco.

---

## Âmbito

### Incluído

- Emissão de evento Tauri `settings:changed` após cada save
- Handler no frontend para `language` e `max_concurrent_jobs`
- Novo comando Rust `set_queue_concurrency` para notificar o sidecar
- Novo comando Rust `get_temp_info` com caminhos, tamanhos e contagens
- Dois novos comandos Rust `clear_transcode_cache` / `clear_thumbs_cache`
- Dois cards informativos na aba System das Settings

### Excluído

- Pasta de cache configurável pelo utilizador (fora de âmbito — alteraria toda a pipeline FFmpeg)
- Botão de refresh automático dos tamanhos de cache (manual é suficiente)
- Notificação ao sidecar via evento Tauri (sidecar não tem acesso directo ao canal de eventos WebView; usa `set_queue_concurrency` como comando dedicado)

---

## Arquitectura

### Feature A — Settings aplicam ao vivo

#### Fluxo actual (problema)

```
UI change → handleUpdateSetting(key, value)
              → invoke('update_settings')  →  SQLite upsert  ✓
              → settingsStore.set[Xxx]()   →  Zustand update ✓
              ✗ i18n NÃO actualiza
              ✗ sidecar NÃO sabe da nova concorrência
```

#### Fluxo novo

```
UI change → handleUpdateSetting(key, value)
              → invoke('update_settings')  →  SQLite upsert
                                           →  app.emit('settings:changed', {key, value})  ← NOVO
              → settingsStore.set[Xxx]()   →  Zustand update (React re-render imediato)

Frontend listener (montado em SettingsPage):
  'settings:changed' { key: 'language' }          → i18n.changeLanguage(value)
  'settings:changed' { key: 'max_concurrent_jobs'} → invoke('set_queue_concurrency', {max})
  outros keys                                       → sem acção extra (Zustand já actualizou)
```

#### Ficheiros a modificar

| Ficheiro                                                    | Alteração                                                 |
| ----------------------------------------------------------- | --------------------------------------------------------- |
| `src-tauri/src/commands/settings.rs`                        | Adicionar `app.emit("settings:changed", …)` após upsert   |
| `src/pages/SettingsPage.tsx`                                | Adicionar `useEffect` com `listen('settings:changed', …)` |
| `src-tauri/src/commands/mod.rs`                             | Registar `set_queue_concurrency`                          |
| `src-tauri/src/lib.rs`                                      | Adicionar `set_queue_concurrency` ao `invoke_handler`     |
| `src-tauri/src/commands/` (novo ficheiro ou em `system.rs`) | Implementar `set_queue_concurrency`                       |

#### Contrato do evento

```typescript
// payload de 'settings:changed'
interface SettingsChangedPayload {
  key: string; // ex: 'language', 'max_concurrent_jobs'
  value: string; // sempre string (igual à SQLite)
}
```

#### Comando `set_queue_concurrency`

```rust
#[tauri::command]
pub async fn set_queue_concurrency(
    // state: referência ao canal do sidecar
    max: u32,
) -> Result<(), String>
```

Encaminha `max` para o sidecar via o canal IPC existente (stdin/stdout ou equivalente já em uso). Se o canal falhar, devolve `Err` — o frontend mostra um toast de aviso e a setting fica guardada na SQLite para aplicar no próximo arranque.

---

### Feature B — Cache display na aba System

#### Estrutura de dados

```rust
#[derive(serde::Serialize)]
pub struct TempInfo {
    pub transcode_dir: String,       // caminho base (sem wildcard)
    pub thumbs_dir: String,
    pub transcode_size_bytes: u64,
    pub thumbs_size_bytes: u64,
    pub transcode_file_count: u32,   // número de entradas (dirs ou ficheiros)
    pub thumbs_file_count: u32,
}
```

#### Comando `get_temp_info`

```rust
#[tauri::command]
pub async fn get_temp_info() -> Result<TempInfo, String> {
    let tmp = std::env::temp_dir();
    let thumbs_dir = tmp.join("nexora-thumbs");

    // transcode: soma todas as dirs que começam com "nexora-transcode-"
    let (transcode_size_bytes, transcode_file_count) = calc_dir_size_pattern(&tmp, "nexora-transcode-");

    // thumbs: soma nexora-thumbs/ recursivamente
    let (thumbs_size_bytes, thumbs_file_count) = calc_dir_size(&thumbs_dir);

    Ok(TempInfo {
        transcode_dir: tmp.to_string_lossy().into_owned(),
        thumbs_dir: thumbs_dir.to_string_lossy().into_owned(),
        transcode_size_bytes,
        thumbs_size_bytes,
        transcode_file_count,
        thumbs_file_count,
    })
}
```

Se uma pasta não existir, `calc_dir_size*` devolve `(0, 0)` — sem erro.

#### Comandos de limpeza

```rust
#[tauri::command]
pub async fn clear_transcode_cache(state: tauri::State<'_, DbState>) -> Result<(), String>
// Verifica se há jobs com status 'processing' na BD.
// Se sim → Err("Aguarda que os jobs terminem")
// Se não → remove_dir_all para cada nexora-transcode-* em temp_dir()

#[tauri::command]
pub async fn clear_thumbs_cache(state: tauri::State<'_, DbState>) -> Result<(), String>
// Mesma guarda: sem jobs activos
// Remove conteúdo de nexora-thumbs/ (mantém a pasta raiz)
```

A lógica de remoção é extraída do `factory_reset` existente — sem duplicação.

#### UI — aba System, nova secção "Cache"

Localização: no fim da aba System, após as informações de versão existentes.

**Maquete:**

```
─── Cache de Processamento ───────────────────────────────────
  Pasta: C:\Users\arnal\AppData\Local\Temp
  Padrão: nexora-transcode-*
  Tamanho: 234 MB · 12 pastas
                                          [Abrir pasta]  [Limpar]

─── Cache de Thumbnails ──────────────────────────────────────
  Pasta: C:\Users\arnal\AppData\Local\Temp\nexora-thumbs
  Tamanho: 45 MB · 89 ficheiros
                                          [Abrir pasta]  [Limpar]
```

- **[Abrir pasta]** — `invoke('open_path', { path })` usando `tauri-plugin-opener`
- **[Limpar]** — chama `clear_transcode_cache` / `clear_thumbs_cache`; em caso de sucesso recarrega `get_temp_info()`; em caso de erro mostra toast com a mensagem devolvida pelo Rust
- Tamanhos calculados uma vez ao montar a aba (`useEffect` no mount)
- Se 0 bytes: mostra "0 B · vazia"

#### Ficheiros a modificar / criar

| Ficheiro                           | Alteração                                                                             |
| ---------------------------------- | ------------------------------------------------------------------------------------- |
| `src-tauri/src/commands/system.rs` | Adicionar `get_temp_info`, `clear_transcode_cache`, `clear_thumbs_cache`, `open_path` |
| `src-tauri/src/lib.rs`             | Registar os 4 novos comandos                                                          |
| `src/pages/SettingsPage.tsx`       | Nova secção "Cache" na aba System                                                     |
| `src/types/` (se existir)          | Adicionar tipo `TempInfo`                                                             |

---

## Tratamento de Erros

| Cenário                              | Comportamento                                                        |
| ------------------------------------ | -------------------------------------------------------------------- |
| `app.emit('settings:changed')` falha | Log Rust; save já concluído — não bloqueia o utilizador              |
| `set_queue_concurrency` falha        | Toast "Concorrência actualiza no próximo arranque"; setting guardada |
| `get_temp_info` — pasta inexistente  | 0 bytes / 0 ficheiros; UI mostra "vazia"                             |
| `clear_*` com jobs activos           | Rust verifica BD; devolve Err → toast "Aguarda que os jobs terminem" |
| `i18n.changeLanguage` falha          | Log silencioso; idioma actual mantém-se                              |

---

## Plano de Verificação

| Teste                 | Procedimento                     | Resultado esperado              |
| --------------------- | -------------------------------- | ------------------------------- |
| Language ao vivo      | Mudar idioma → não reiniciar     | UI muda imediatamente           |
| Concorrência ao vivo  | Reduzir de 4→1 com jobs em fila  | Novos slots não abrem           |
| Concorrência ao vivo  | Aumentar de 1→3 com jobs em fila | Queue retoma com 3 slots        |
| Cards de cache        | Abrir aba System                 | Paths e tamanhos visíveis       |
| Crescimento de cache  | Correr um job de transcode       | Tamanho aumenta após refresh    |
| Limpar transcode      | Sem jobs activos → [Limpar]      | Tamanho volta a 0 B             |
| Limpar com job activo | Job a correr → [Limpar]          | Toast de aviso, sem apagar      |
| Abrir pasta           | [Abrir pasta]                    | Explorer abre na pasta correcta |
| Pasta inexistente     | Sem jobs anteriores → abrir aba  | Cards mostram "0 B · vazia"     |

---

## Dependências

- `tauri-plugin-opener` — já disponível no Tauri 2 para abrir paths no gestor de ficheiros
- `serde_json` — já em uso no projecto
- Canal IPC sidecar existente — `set_queue_concurrency` segue o mesmo padrão dos comandos já implementados

---

## Decisões de Design

| Decisão                                           | Alternativa rejeitada       | Motivo                                                     |
| ------------------------------------------------- | --------------------------- | ---------------------------------------------------------- |
| Evento `settings:changed` para notificar frontend | Polling / re-fetch          | Desacoplado, zero latência                                 |
| Comando dedicado `set_queue_concurrency`          | Evento Tauri para o sidecar | Sidecar não tem acesso directo ao canal de eventos WebView |
| Limpeza extrai lógica do `factory_reset`          | Duplicar código             | Evitar divergência de comportamento                        |
| Caminhos temp fixos (OS temp dir)                 | Pasta configurável          | Fora de âmbito; alteraria pipeline FFmpeg                  |
| Tamanhos calculados no mount da aba               | Auto-refresh periódico      | Suficiente para o caso de uso; evita I/O contínuo          |
