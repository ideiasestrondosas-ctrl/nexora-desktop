# Settings: Apply Live + Cache Display — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Emitir evento Tauri `settings:changed` após cada save para que linguagem e concorrência apliquem imediatamente; adicionar secção Cache na aba System das Settings com paths, tamanhos e botões Abrir/Limpar.

**Architecture:** `update_settings` Rust emite evento `settings:changed {key, value}` após upsert SQLite. Frontend subscreve e reage por chave (`language` → i18n, `max_concurrent_jobs` → `set_queue_concurrency`). Cinco novos comandos Rust em `system.rs` gerem informação e limpeza dos diretórios temp; a UI na aba System mostra dois cards com paths e tamanhos calculados ao montar.

**Tech Stack:** Rust/Tauri 2 (`tauri::Emitter`, `serde`), React 19 + TypeScript, Zustand, `@tauri-apps/api/event`, i18next.

---

## Mapa de Ficheiros

| Ficheiro                             | Tipo      | O que muda                                                                                                                                                                |
| ------------------------------------ | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src-tauri/src/commands/settings.rs` | Modificar | Adicionar `app: tauri::AppHandle` + `app.emit(...)` a `update_settings`                                                                                                   |
| `src-tauri/src/commands/system.rs`   | Modificar | Adicionar 5 funções: `set_queue_concurrency`, `get_temp_info`, `clear_transcode_cache`, `clear_thumbs_cache`, `open_path` + helpers `calc_pattern_size` / `calc_dir_size` |
| `src-tauri/src/lib.rs`               | Modificar | Registar os 5 novos comandos no `invoke_handler`                                                                                                                          |
| `src/pages/SettingsPage.tsx`         | Modificar | Listener `settings:changed`; interface `TempInfo`; estado + handlers + secção Cache na aba System                                                                         |

---

## Task 1: Rust — Emitir evento `settings:changed` após save

**Files:**

- Modify: `src-tauri/src/commands/settings.rs`

- [ ] **Step 1.1: Adicionar `use tauri::Emitter;` aos imports**

Abrir `src-tauri/src/commands/settings.rs`. A linha actual é:

```rust
use tauri::State;
```

Substituir por:

```rust
use tauri::{Emitter, State};
```

- [ ] **Step 1.2: Adicionar `app: tauri::AppHandle` à assinatura de `update_settings` e emitir evento**

Substituir a função `update_settings` existente:

```rust
#[tauri::command]
pub fn update_settings(key: String, value: String, state: State<AppState>) -> Result<bool, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "INSERT INTO settings (key, value) VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        rusqlite::params![key, value],
    )
    .map_err(|e| e.to_string())?;
    Ok(true)
}
```

Por esta versão nova:

```rust
#[tauri::command]
pub fn update_settings(
    app: tauri::AppHandle,
    key: String,
    value: String,
    state: State<AppState>,
) -> Result<bool, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "INSERT INTO settings (key, value) VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        rusqlite::params![key, value],
    )
    .map_err(|e| e.to_string())?;
    let _ = app.emit("settings:changed", serde_json::json!({ "key": key, "value": value }));
    Ok(true)
}
```

- [ ] **Step 1.3: Verificar que compila sem erros**

```powershell
cd C:\Dev\nexora-desktop
cargo build --manifest-path src-tauri/Cargo.toml 2>&1 | Select-String -Pattern "error"
```

Resultado esperado: nenhuma linha com `error[` (warnings são aceitáveis).

- [ ] **Step 1.4: Commit**

```powershell
git add src-tauri/src/commands/settings.rs
git commit -m "feat(settings): emit settings:changed event after each save"
```

---

## Task 2: Rust — Novos comandos de cache e fila em `system.rs`

**Files:**

- Modify: `src-tauri/src/commands/system.rs`

- [ ] **Step 2.1: Adicionar helpers de cálculo de tamanho e struct `TempInfo`**

Adicionar ao fim de `src-tauri/src/commands/system.rs`, antes do último `}` do ficheiro:

```rust
// ── Cache temp dirs ──────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct TempInfo {
    pub transcode_dir: String,
    pub thumbs_dir: String,
    pub transcode_size_bytes: u64,
    pub thumbs_size_bytes: u64,
    pub transcode_file_count: u32,
    pub thumbs_file_count: u32,
}

fn dir_size_recursive(path: &std::path::Path) -> u64 {
    if path.is_file() {
        return std::fs::metadata(path).map(|m| m.len()).unwrap_or(0);
    }
    let mut total = 0u64;
    if let Ok(entries) = std::fs::read_dir(path) {
        for entry in entries.flatten() {
            total += dir_size_recursive(&entry.path());
        }
    }
    total
}

fn calc_pattern_size(base: &std::path::Path, prefix: &str) -> (u64, u32) {
    let mut size = 0u64;
    let mut count = 0u32;
    if let Ok(entries) = std::fs::read_dir(base) {
        for entry in entries.flatten() {
            if entry.file_name().to_string_lossy().starts_with(prefix) {
                count += 1;
                size += dir_size_recursive(&entry.path());
            }
        }
    }
    (size, count)
}

fn calc_dir_size(dir: &std::path::Path) -> (u64, u32) {
    let mut size = 0u64;
    let mut count = 0u32;
    if !dir.exists() {
        return (0, 0);
    }
    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.flatten() {
            let p = entry.path();
            if p.is_file() {
                size += std::fs::metadata(&p).map(|m| m.len()).unwrap_or(0);
                count += 1;
            } else if p.is_dir() {
                let (s, c) = calc_dir_size(&p);
                size += s;
                count += c;
            }
        }
    }
    (size, count)
}
```

- [ ] **Step 2.2: Adicionar comando `get_temp_info`**

Adicionar imediatamente a seguir ao bloco do step 2.1:

```rust
#[tauri::command]
pub fn get_temp_info() -> Result<TempInfo, String> {
    let tmp = std::env::temp_dir();
    let thumbs_dir = tmp.join("nexora-thumbs");
    let (transcode_size_bytes, transcode_file_count) =
        calc_pattern_size(&tmp, "nexora-transcode-");
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

- [ ] **Step 2.3: Adicionar helper de guarda de jobs activos (extrai lógica comum)**

```rust
fn has_active_jobs(state: &State<'_, AppState>) -> Result<bool, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let count: i64 = db
        .query_row(
            "SELECT COUNT(*) FROM jobs WHERE status IN ('queued', 'processing')",
            [],
            |r| r.get(0),
        )
        .unwrap_or(0);
    Ok(count > 0)
}
```

- [ ] **Step 2.4: Adicionar `clear_transcode_cache`**

```rust
#[tauri::command]
pub fn clear_transcode_cache(state: State<'_, AppState>) -> Result<(), String> {
    if has_active_jobs(&state)? {
        return Err("Aguarda que os jobs terminem antes de limpar o cache".to_string());
    }
    let tmp = std::env::temp_dir();
    if let Ok(entries) = std::fs::read_dir(&tmp) {
        for entry in entries.flatten() {
            let name = entry.file_name().to_string_lossy().to_string();
            if name.starts_with("nexora-transcode-") || name.starts_with("nexora-proxy-") {
                let _ = std::fs::remove_dir_all(entry.path());
            }
        }
    }
    Ok(())
}
```

- [ ] **Step 2.5: Adicionar `clear_thumbs_cache`**

```rust
#[tauri::command]
pub fn clear_thumbs_cache(state: State<'_, AppState>) -> Result<(), String> {
    if has_active_jobs(&state)? {
        return Err("Aguarda que os jobs terminem antes de limpar o cache".to_string());
    }
    let thumbs_dir = std::env::temp_dir().join("nexora-thumbs");
    if thumbs_dir.exists() {
        if let Ok(entries) = std::fs::read_dir(&thumbs_dir) {
            for entry in entries.flatten() {
                let p = entry.path();
                if p.is_file() {
                    let _ = std::fs::remove_file(p);
                } else {
                    let _ = std::fs::remove_dir_all(p);
                }
            }
        }
    }
    Ok(())
}
```

- [ ] **Step 2.6: Adicionar `open_path`**

```rust
#[tauri::command]
pub fn open_path(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}
```

- [ ] **Step 2.7: Adicionar `set_queue_concurrency`**

```rust
#[tauri::command]
pub fn set_queue_concurrency(_max: u32) -> Result<(), String> {
    // SQLite já foi actualizada por update_settings.
    // O queue thread em queue.rs lê max_concurrent_jobs da BD a cada ciclo.
    // Esta função serve de hook para futura integração com AppState em memória.
    Ok(())
}
```

- [ ] **Step 2.8: Verificar que compila sem erros**

```powershell
cargo build --manifest-path src-tauri/Cargo.toml 2>&1 | Select-String -Pattern "error"
```

Resultado esperado: nenhuma linha com `error[`.

- [ ] **Step 2.9: Commit**

```powershell
git add src-tauri/src/commands/system.rs
git commit -m "feat(system): add get_temp_info, clear caches, open_path, set_queue_concurrency"
```

---

## Task 3: Rust — Registar novos comandos no `invoke_handler`

**Files:**

- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 3.1: Adicionar os 5 novos comandos ao `invoke_handler`**

No ficheiro `src-tauri/src/lib.rs`, localizar o bloco `.invoke_handler(tauri::generate_handler![...])` e adicionar as 5 linhas novas (qualquer posição dentro do bloco é válida; coloca-las junto aos outros comandos `system::` por coerência):

```rust
// Acrescentar dentro do generate_handler![...], a seguir a commands::system::factory_reset,
commands::system::get_temp_info,
commands::system::clear_transcode_cache,
commands::system::clear_thumbs_cache,
commands::system::open_path,
commands::system::set_queue_concurrency,
```

- [ ] **Step 3.2: Verificar que compila sem erros**

```powershell
cargo build --manifest-path src-tauri/Cargo.toml 2>&1 | Select-String -Pattern "error"
```

Resultado esperado: nenhuma linha com `error[`.

- [ ] **Step 3.3: Commit**

```powershell
git add src-tauri/src/lib.rs
git commit -m "feat(lib): register get_temp_info, clear caches, open_path, set_queue_concurrency"
```

---

## Task 4: Frontend — Listener `settings:changed` em `SettingsPage.tsx`

**Files:**

- Modify: `src/pages/SettingsPage.tsx`

- [ ] **Step 4.1: Adicionar import de `listen`**

Nos imports do topo de `src/pages/SettingsPage.tsx`, adicionar:

```typescript
import { listen } from '@tauri-apps/api/event';
```

(Coloca-lo junto ao import `import { invoke } from '@tauri-apps/api/core';` que já existe.)

- [ ] **Step 4.2: Expor `i18n` da hook `useTranslation`**

No componente `SettingsPage`, localizar a linha:

```typescript
const { t } = useTranslation();
```

Substituir por:

```typescript
const { t, i18n } = useTranslation();
```

- [ ] **Step 4.3: Adicionar `useEffect` com listener `settings:changed`**

Dentro do componente `SettingsPage`, após os `useEffect` existentes (o que carrega `get_settings`, etc.), adicionar:

```typescript
useEffect(() => {
  let unlisten: (() => void) | undefined;
  listen<{ key: string; value: string }>('settings:changed', async ({ payload }) => {
    if (payload.key === 'language') {
      await i18n.changeLanguage(payload.value);
    }
    if (payload.key === 'max_concurrent_jobs') {
      await invoke('set_queue_concurrency', { max: parseInt(payload.value, 10) }).catch(() =>
        toast.warning('Concorrência actualiza no próximo arranque'),
      );
    }
  })
    .then((fn) => {
      unlisten = fn;
    })
    .catch(console.error);
  return () => {
    unlisten?.();
  };
}, []);
```

- [ ] **Step 4.4: Verificar que TypeScript compila**

```powershell
npx tsc --noEmit
```

Resultado esperado: sem erros de tipo.

- [ ] **Step 4.5: Commit**

```powershell
git add src/pages/SettingsPage.tsx
git commit -m "feat(settings-ui): listen to settings:changed — apply language and queue concurrency live"
```

---

## Task 5: Frontend — Cache UI na aba System de `SettingsPage.tsx`

**Files:**

- Modify: `src/pages/SettingsPage.tsx`

- [ ] **Step 5.1: Adicionar interface `TempInfo`**

Na secção de interfaces do ficheiro (junto a `InstalledInfo`, `SystemInfo`, etc.), adicionar:

```typescript
interface TempInfo {
  transcode_dir: string;
  thumbs_dir: string;
  transcode_size_bytes: number;
  thumbs_size_bytes: number;
  transcode_file_count: number;
  thumbs_file_count: number;
}
```

- [ ] **Step 5.2: Adicionar helper `formatBytes`**

Fora do componente (acima da `export default function SettingsPage()`), adicionar:

```typescript
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
```

- [ ] **Step 5.3: Adicionar estado para cache**

Dentro do componente, junto às outras declarações de estado (`useState`), adicionar:

```typescript
const [tempInfo, setTempInfo] = useState<TempInfo | null>(null);
const [clearingTranscode, setClearingTranscode] = useState(false);
const [clearingThumbs, setClearingThumbs] = useState(false);
```

- [ ] **Step 5.4: Carregar `get_temp_info` quando a aba System fica activa**

Adicionar um `useEffect` que reage a mudanças de `activeTab`:

```typescript
useEffect(() => {
  if (activeTab !== 'system') return;
  invoke<TempInfo>('get_temp_info').then(setTempInfo).catch(console.error);
}, [activeTab]);
```

- [ ] **Step 5.5: Adicionar handlers de limpeza**

Dentro do componente, a seguir ao `useEffect` do step 5.4:

```typescript
async function handleClearTranscode() {
  setClearingTranscode(true);
  try {
    await invoke('clear_transcode_cache');
    const info = await invoke<TempInfo>('get_temp_info');
    setTempInfo(info);
    toast.success('Cache de processamento limpa');
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : String(e));
  } finally {
    setClearingTranscode(false);
  }
}

async function handleClearThumbs() {
  setClearingThumbs(true);
  try {
    await invoke('clear_thumbs_cache');
    const info = await invoke<TempInfo>('get_temp_info');
    setTempInfo(info);
    toast.success('Cache de thumbnails limpa');
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : String(e));
  } finally {
    setClearingThumbs(false);
  }
}
```

- [ ] **Step 5.6: Adicionar secção Cache no JSX da aba System**

Na secção `{activeTab === 'system' && ...}`, localizar o fim do conteúdo (depois do último `</section>` existente nessa aba, antes do fecho `</>` ou `</div>`). Adicionar:

```tsx
{
  /* Cache */
}
<section className="rounded-xl border border-border p-6 bg-bg-secondary">
  <SectionTitle>Cache</SectionTitle>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {/* Cache de Processamento */}
    <div className="p-4 bg-bg-primary rounded-lg border border-border space-y-2">
      <div className="flex items-center gap-2">
        <Server size={14} className="text-brand shrink-0" />
        <span className="text-xs font-medium text-text-primary">Cache de Processamento</span>
      </div>
      <p className="text-xs text-text-muted font-mono break-all">
        {tempInfo?.transcode_dir ?? '—'}
      </p>
      <p className="text-xs text-text-muted font-mono">nexora-transcode-*</p>
      <p className="text-xs text-text-secondary">
        {tempInfo ? formatBytes(tempInfo.transcode_size_bytes) : '—'} ·{' '}
        {tempInfo?.transcode_file_count ?? 0} pastas
      </p>
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => invoke('open_path', { path: tempInfo?.transcode_dir ?? '' })}
          disabled={!tempInfo}
          className="flex-1 py-1.5 text-xs bg-surface hover:bg-surface-hover text-text-primary rounded-lg transition-colors disabled:opacity-50"
        >
          Abrir pasta
        </button>
        <button
          onClick={handleClearTranscode}
          disabled={clearingTranscode || !tempInfo}
          className="flex-1 py-1.5 text-xs bg-surface hover:bg-surface-hover text-text-primary rounded-lg transition-colors disabled:opacity-50"
        >
          {clearingTranscode ? '…' : 'Limpar'}
        </button>
      </div>
    </div>

    {/* Cache de Thumbnails */}
    <div className="p-4 bg-bg-primary rounded-lg border border-border space-y-2">
      <div className="flex items-center gap-2">
        <Database size={14} className="text-purple-500 shrink-0" />
        <span className="text-xs font-medium text-text-primary">Cache de Thumbnails</span>
      </div>
      <p className="text-xs text-text-muted font-mono break-all">{tempInfo?.thumbs_dir ?? '—'}</p>
      <p className="text-xs text-text-secondary">
        {tempInfo ? formatBytes(tempInfo.thumbs_size_bytes) : '—'} ·{' '}
        {tempInfo?.thumbs_file_count ?? 0} ficheiros
      </p>
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => invoke('open_path', { path: tempInfo?.thumbs_dir ?? '' })}
          disabled={!tempInfo}
          className="flex-1 py-1.5 text-xs bg-surface hover:bg-surface-hover text-text-primary rounded-lg transition-colors disabled:opacity-50"
        >
          Abrir pasta
        </button>
        <button
          onClick={handleClearThumbs}
          disabled={clearingThumbs || !tempInfo}
          className="flex-1 py-1.5 text-xs bg-surface hover:bg-surface-hover text-text-primary rounded-lg transition-colors disabled:opacity-50"
        >
          {clearingThumbs ? '…' : 'Limpar'}
        </button>
      </div>
    </div>
  </div>
</section>;
```

- [ ] **Step 5.7: Verificar que TypeScript compila**

```powershell
npx tsc --noEmit
```

Resultado esperado: sem erros de tipo.

- [ ] **Step 5.8: Verificar que `Server` e `Database` estão importados**

Confirmar que os ícones `Server` e `Database` já existem no import de `lucide-react` no topo do ficheiro:

```typescript
import {
  // ... outros ícones existentes ...
  Server,
  Database,
  // ...
} from 'lucide-react';
```

Se não estiverem, adicionar ao import existente de lucide-react.

- [ ] **Step 5.9: Commit**

```powershell
git add src/pages/SettingsPage.tsx
git commit -m "feat(settings-ui): cache display section with transcode and thumbs dirs"
```

---

## Task 6: Verificação de ponta a ponta

- [ ] **Step 6.1: Arrancar a app em modo dev**

```powershell
npm run tauri dev
```

Aguardar até a janela abrir.

- [ ] **Step 6.2: Testar language ao vivo**

1. Abrir Settings → aba Interface
2. Mudar o idioma de PT para EN
3. Verificar que a UI muda para inglês **imediatamente** (sem fechar/reabrir)
4. Mudar de volta para PT e verificar

- [ ] **Step 6.3: Testar cards de cache na aba System**

1. Abrir Settings → aba System
2. Fazer scroll até ao fim — verificar que aparece a secção "Cache" com dois cards
3. Verificar que os paths são mostrados (ex: `C:\Users\...\AppData\Local\Temp`)
4. Clicar em "Abrir pasta" no card de Processamento — verificar que o Explorer abre na pasta correcta
5. Clicar em "Abrir pasta" no card de Thumbnails — verificar que o Explorer abre na pasta correcta (ou pasta vazia se não existir ainda)

- [ ] **Step 6.4: Testar limpeza de cache**

1. Correr um job de transcode (para gerar ficheiros temp)
2. Abrir Settings → System → observar tamanho não-zero no card de Processamento
3. Aguardar o job terminar
4. Clicar "Limpar" no card de Processamento
5. Verificar toast "Cache de processamento limpa" e tamanho volta a 0 B

- [ ] **Step 6.5: Testar guarda "jobs activos"**

1. Iniciar um job de processamento (não aguardar que termine)
2. Abrir Settings → System
3. Clicar "Limpar" num dos cards
4. Verificar toast de erro com a mensagem "Aguarda que os jobs terminem antes de limpar o cache"
5. Verificar que nenhum ficheiro foi apagado

- [ ] **Step 6.6: Commit final de verificação**

```powershell
git add .
git commit -m "chore: verify settings live-apply and cache display features"
```
