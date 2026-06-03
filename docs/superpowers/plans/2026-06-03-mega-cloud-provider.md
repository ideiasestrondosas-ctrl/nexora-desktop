# MEGA.nz Cloud Provider — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar MEGA.nz como nono provider cloud no Nexora Desktop, com suporte a upload, download, listagem e eliminação de ficheiros via E2EE.

**Architecture:** `MegaProvider` implementa o trait `CloudProvider` existente usando o crate `mega` (mega-rs v0.8). Auth por email + password guardados no keychain; login fresco em cada operação. O handle do nó MEGA é usado como `path` em `RemoteFile` (mesmo padrão do GDrive com file ID).

**Tech Stack:** Rust, crate `mega = "0.8"`, `tokio-util` (compat adapters), Tauri 2, SQLite, React + TypeScript.

**Spec:** `docs/superpowers/specs/2026-06-03-mega-cloud-provider-design.md`

---

## Mapa de Ficheiros

| Ficheiro                         | Acção     | Responsabilidade                                 |
| -------------------------------- | --------- | ------------------------------------------------ |
| `src-tauri/Cargo.toml`           | Modificar | Adicionar `mega`, `tokio-util`                   |
| `src-tauri/src/cloud/mega.rs`    | **Criar** | `MegaProvider` — todos os métodos CloudProvider  |
| `src-tauri/src/cloud/mod.rs`     | Modificar | Registar `"mega"` em `get_provider()`            |
| `src-tauri/src/db/migrations.rs` | Modificar | `migrate_cloud_v3` — adicionar `'mega'` ao CHECK |
| `src/store/cloud.ts`             | Modificar | `CloudProviderType`, labels, fields, help        |

---

## Task 1: Dependências Cargo.toml

**Files:**

- Modify: `src-tauri/Cargo.toml`

- [ ] **Step 1: Adicionar dependências**

Em `src-tauri/Cargo.toml`, na secção `[dependencies]`, adicionar após a linha `keyring = ...`:

```toml
mega = "0.8"
tokio-util = { version = "0.7", features = ["compat"] }
```

- [ ] **Step 2: Verificar que compila (sem erros de resolução)**

```powershell
cd src-tauri && cargo check 2>&1 | Select-String -Pattern "error" | head -20
```

Expected: sem linhas `error[E...]`. Avisos são aceitáveis.

- [ ] **Step 3: Commit**

```powershell
git add src-tauri/Cargo.toml src-tauri/Cargo.lock
git commit -m "chore(deps): adicionar mega e tokio-util para provider MEGA.nz"
```

---

## Task 2: MegaProvider struct + `new()` + testes unitários

**Files:**

- Create: `src-tauri/src/cloud/mega.rs`

- [ ] **Step 1: Criar ficheiro com struct e `new()`**

Criar `src-tauri/src/cloud/mega.rs` com o conteúdo:

```rust
use super::provider::{CloudProvider, RemoteFile};
use async_trait::async_trait;
use std::path::Path;

pub struct MegaProvider {
    email: String,
    password: String,
    base_path: String, // ex: "Nexora/Output" (sem /Root/ — adicionado internamente)
}

impl MegaProvider {
    pub fn new(config: &serde_json::Value, creds: &serde_json::Value) -> Result<Self, String> {
        let email = config["email"]
            .as_str()
            .filter(|s| !s.is_empty())
            .ok_or("Email MEGA é obrigatório")?
            .to_string();
        let password = creds["password"]
            .as_str()
            .filter(|s| !s.is_empty())
            .ok_or("Password MEGA é obrigatória")?
            .to_string();
        let raw = config["base_path"]
            .as_str()
            .unwrap_or("Nexora/Output")
            .to_string();
        // Normalizar: remover / iniciais e finais
        let base_path = raw.trim_matches('/').to_string();
        let base_path = if base_path.is_empty() {
            "Nexora/Output".to_string()
        } else {
            base_path
        };
        Ok(Self { email, password, base_path })
    }

    fn full_path(&self, subpath: &str) -> String {
        let sub = subpath.trim_matches('/');
        if sub.is_empty() {
            format!("/Root/{}", self.base_path)
        } else {
            // subpath é um handle MEGA composto ("handle" ou "parent/handle")
            // extrai apenas o último segmento (o handle folha)
            let handle = sub.rsplit('/').next().unwrap_or(sub);
            handle.to_string() // usado com get_node_by_handle
        }
    }
}

#[async_trait]
impl CloudProvider for MegaProvider {
    fn provider_type(&self) -> &'static str {
        "mega"
    }

    async fn test_connection(&self) -> Result<(), String> {
        todo!()
    }

    async fn upload(&self, _local_path: &Path, _remote_path: &str) -> Result<String, String> {
        todo!()
    }

    async fn download(&self, _remote_path: &str, _local_path: &Path) -> Result<(), String> {
        todo!()
    }

    async fn list_files(&self, _path: &str) -> Result<Vec<RemoteFile>, String> {
        todo!()
    }

    async fn delete_files(&self, _paths: &[String]) -> Result<Vec<String>, String> {
        todo!()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn cfg(base_path: &str) -> serde_json::Value {
        serde_json::json!({ "base_path": base_path, "email": "test@example.com" })
    }
    fn creds() -> serde_json::Value {
        serde_json::json!({ "password": "secret" })
    }

    #[test]
    fn new_normalises_base_path_strips_slashes() {
        let p = MegaProvider::new(&cfg("/Nexora/Output/"), &creds()).unwrap();
        assert_eq!(p.base_path, "Nexora/Output");
    }

    #[test]
    fn new_normalises_base_path_no_slash() {
        let p = MegaProvider::new(&cfg("Nexora/Output"), &creds()).unwrap();
        assert_eq!(p.base_path, "Nexora/Output");
    }

    #[test]
    fn new_defaults_base_path_when_empty() {
        let p = MegaProvider::new(&serde_json::json!({ "email": "x@y.com" }), &creds()).unwrap();
        assert_eq!(p.base_path, "Nexora/Output");
    }

    #[test]
    fn new_fails_without_email() {
        let err = MegaProvider::new(&serde_json::json!({ "base_path": "A" }), &creds())
            .unwrap_err();
        assert!(err.contains("Email"));
    }

    #[test]
    fn new_fails_without_password() {
        let err = MegaProvider::new(&cfg("A"), &serde_json::json!({})).unwrap_err();
        assert!(err.contains("Password"));
    }

    #[test]
    fn full_path_empty_subpath_returns_root_path() {
        let p = MegaProvider::new(&cfg("Nexora/Output"), &creds()).unwrap();
        assert_eq!(p.full_path(""), "/Root/Nexora/Output");
    }

    #[test]
    fn full_path_handle_returns_leaf_handle() {
        let p = MegaProvider::new(&cfg("Nexora/Output"), &creds()).unwrap();
        assert_eq!(p.full_path("AAAA1234"), "AAAA1234");
    }

    #[test]
    fn full_path_compound_returns_leaf_handle() {
        let p = MegaProvider::new(&cfg("Nexora/Output"), &creds()).unwrap();
        assert_eq!(p.full_path("AAAA/BBBB"), "BBBB");
    }
}
```

- [ ] **Step 2: Executar os testes unitários**

```powershell
cd src-tauri && cargo test mega::tests 2>&1 | tail -20
```

Expected: `test result: ok. 8 passed`

- [ ] **Step 3: Commit**

```powershell
git add src-tauri/src/cloud/mega.rs
git commit -m "feat(cloud/mega): MegaProvider struct + new() + unit tests"
```

---

## Task 3: `test_connection`

**Files:**

- Modify: `src-tauri/src/cloud/mega.rs`

- [ ] **Step 1: Implementar `test_connection`**

Substituir o `todo!()` no método `test_connection`:

```rust
async fn test_connection(&self) -> Result<(), String> {
    let http_client = reqwest::Client::new();
    let mut mega = mega::Client::builder()
        .build(http_client)
        .map_err(|e| format!("MEGA: falha ao criar cliente: {e}"))?;
    mega.login(&self.email, &self.password, None)
        .await
        .map_err(|_| "MEGA: credenciais inválidas — verifique email e password".to_string())?;
    let nodes = mega
        .fetch_own_nodes()
        .await
        .map_err(|e| format!("MEGA inacessível: {e}"))?;
    let root_path = format!("/Root/{}", self.base_path);
    nodes
        .get_node_by_path(&root_path)
        .ok_or_else(|| format!("Pasta '{}' não encontrada no MEGA. Crie-a primeiro em mega.nz", self.base_path))?;
    Ok(())
}
```

- [ ] **Step 2: Verificar que compila**

```powershell
cd src-tauri && cargo check 2>&1 | Select-String "error"
```

Expected: sem erros.

- [ ] **Step 3: Commit**

```powershell
git add src-tauri/src/cloud/mega.rs
git commit -m "feat(cloud/mega): test_connection — login + verifica pasta base"
```

---

## Task 4: `upload`

**Files:**

- Modify: `src-tauri/src/cloud/mega.rs`

- [ ] **Step 1: Adicionar import no topo do ficheiro**

No topo de `src-tauri/src/cloud/mega.rs`, logo após `use std::path::Path;`, adicionar:

```rust
use tokio_util::compat::TokioAsyncReadCompatExt;
```

- [ ] **Step 2: Implementar `upload`**

Substituir o `todo!()` no método `upload`:

```rust
async fn upload(&self, local_path: &Path, remote_path: &str) -> Result<String, String> {
    let filename = Path::new(remote_path)
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();

    let file = tokio::fs::File::open(local_path)
        .await
        .map_err(|e| format!("MEGA: falha ao ler ficheiro local: {e}"))?;
    let size = file
        .metadata()
        .await
        .map_err(|e| format!("MEGA: falha ao ler metadata: {e}"))?
        .len();
    let reader = file.compat();

    let http_client = reqwest::Client::new();
    let mut mega = mega::Client::builder()
        .build(http_client)
        .map_err(|e| format!("MEGA: falha ao criar cliente: {e}"))?;
    mega.login(&self.email, &self.password, None)
        .await
        .map_err(|_| "MEGA: credenciais inválidas — verifique email e password".to_string())?;

    let nodes = mega
        .fetch_own_nodes()
        .await
        .map_err(|e| format!("MEGA inacessível: {e}"))?;
    let root_path = format!("/Root/{}", self.base_path);
    let parent = nodes
        .get_node_by_path(&root_path)
        .ok_or_else(|| format!("Pasta '{}' não encontrada no MEGA. Crie-a primeiro em mega.nz", self.base_path))?;

    mega.upload_node(parent, &filename, size, reader, mega::LastModified::Now)
        .await
        .map_err(|e| format!("MEGA upload falhou: {e}"))?;

    Ok(format!("{}/{}", self.base_path, filename))
}
```

- [ ] **Step 3: Verificar que compila**

```powershell
cd src-tauri && cargo check 2>&1 | Select-String "error"
```

Expected: sem erros.

- [ ] **Step 4: Commit**

```powershell
git add src-tauri/src/cloud/mega.rs
git commit -m "feat(cloud/mega): upload via tokio compat reader"
```

---

## Task 5: `list_files`

**Files:**

- Modify: `src-tauri/src/cloud/mega.rs`

- [ ] **Step 1: Implementar `list_files`**

Substituir o `todo!()` no método `list_files`:

```rust
async fn list_files(&self, path: &str) -> Result<Vec<RemoteFile>, String> {
    let http_client = reqwest::Client::new();
    let mut mega = mega::Client::builder()
        .build(http_client)
        .map_err(|e| format!("MEGA: falha ao criar cliente: {e}"))?;
    mega.login(&self.email, &self.password, None)
        .await
        .map_err(|_| "MEGA: credenciais inválidas — verifique email e password".to_string())?;

    let nodes = mega
        .fetch_own_nodes()
        .await
        .map_err(|e| format!("MEGA inacessível: {e}"))?;

    // Se subpath vazio → usar base_path por caminho textual.
    // Se subpath não vazio → é um handle MEGA (potencialmente composto "pai/filho");
    //   extrai o handle folha (último segmento) e usa get_node_by_handle.
    let parent = if path.is_empty() {
        let root_path = format!("/Root/{}", self.base_path);
        nodes
            .get_node_by_path(&root_path)
            .ok_or_else(|| format!("Pasta '{}' não encontrada no MEGA", self.base_path))?
    } else {
        let handle = path.rsplit('/').next().unwrap_or(path);
        nodes
            .get_node_by_handle(handle)
            .ok_or_else(|| format!("Pasta com handle '{}' não encontrada", handle))?
    };

    let mut files = Vec::new();
    for child_handle in parent.children() {
        let Some(child) = nodes.get_node_by_handle(child_handle) else {
            continue;
        };
        let name = child.name().to_string();
        if name.is_empty() {
            continue;
        }
        let is_dir = child.kind().is_folder();
        // O path em RemoteFile é o handle — permite navegação e download/delete por handle.
        // Formato composto permite breadcrumb correcto no browser modal.
        let child_path = if path.is_empty() {
            child.handle().to_string()
        } else {
            format!("{}/{}", path.trim_end_matches('/'), child.handle())
        };
        let size = if is_dir { None } else { Some(child.size()) };
        let modified = child.modified_at().map(|dt| dt.to_rfc3339());
        files.push(RemoteFile {
            name,
            path: child_path,
            size,
            modified,
            is_dir,
        });
    }
    Ok(files)
}
```

- [ ] **Step 2: Verificar que compila**

```powershell
cd src-tauri && cargo check 2>&1 | Select-String "error"
```

Expected: sem erros.

- [ ] **Step 3: Commit**

```powershell
git add src-tauri/src/cloud/mega.rs
git commit -m "feat(cloud/mega): list_files — navega por handle, mapeia Node->RemoteFile"
```

---

## Task 6: `download`

**Files:**

- Modify: `src-tauri/src/cloud/mega.rs`

- [ ] **Step 1: Adicionar import no topo do ficheiro**

No topo de `src-tauri/src/cloud/mega.rs`, após o import `TokioAsyncReadCompatExt`, adicionar:

```rust
use tokio_util::compat::TokioAsyncWriteCompatExt;
```

- [ ] **Step 2: Implementar `download`**

Substituir o `todo!()` no método `download`:

```rust
async fn download(&self, remote_path: &str, local_path: &Path) -> Result<(), String> {
    // remote_path pode ser "pai/handle" — extrai o handle folha
    let handle = remote_path.rsplit('/').next().unwrap_or(remote_path);

    let http_client = reqwest::Client::new();
    let mut mega = mega::Client::builder()
        .build(http_client)
        .map_err(|e| format!("MEGA: falha ao criar cliente: {e}"))?;
    mega.login(&self.email, &self.password, None)
        .await
        .map_err(|_| "MEGA: credenciais inválidas — verifique email e password".to_string())?;

    let nodes = mega
        .fetch_own_nodes()
        .await
        .map_err(|e| format!("MEGA inacessível: {e}"))?;
    let node = nodes
        .get_node_by_handle(handle)
        .ok_or_else(|| format!("Ficheiro com handle '{}' não encontrado no MEGA", handle))?;

    if let Some(parent) = local_path.parent() {
        tokio::fs::create_dir_all(parent)
            .await
            .map_err(|e| e.to_string())?;
    }
    let file = tokio::fs::File::create(local_path)
        .await
        .map_err(|e| format!("MEGA: falha ao criar ficheiro local: {e}"))?;
    let writer = file.compat_write();

    mega.download_node(node, writer)
        .await
        .map_err(|e| format!("MEGA download falhou: {e}"))?;

    Ok(())
}
```

- [ ] **Step 3: Verificar que compila**

```powershell
cd src-tauri && cargo check 2>&1 | Select-String "error"
```

Expected: sem erros.

- [ ] **Step 4: Commit**

```powershell
git add src-tauri/src/cloud/mega.rs
git commit -m "feat(cloud/mega): download via tokio compat writer"
```

---

## Task 7: `delete_files`

**Files:**

- Modify: `src-tauri/src/cloud/mega.rs`

- [ ] **Step 1: Implementar `delete_files`**

Substituir o `todo!()` no método `delete_files`:

```rust
async fn delete_files(&self, paths: &[String]) -> Result<Vec<String>, String> {
    if paths.is_empty() {
        return Ok(vec![]);
    }

    let http_client = reqwest::Client::new();
    let mut mega = mega::Client::builder()
        .build(http_client)
        .map_err(|e| format!("MEGA: falha ao criar cliente: {e}"))?;
    mega.login(&self.email, &self.password, None)
        .await
        .map_err(|_| "MEGA: credenciais inválidas — verifique email e password".to_string())?;

    let nodes = mega
        .fetch_own_nodes()
        .await
        .map_err(|e| format!("MEGA inacessível: {e}"))?;

    let mut failed = Vec::new();
    for path in paths {
        // Extrai handle folha de path possivelmente composto
        let handle = path.rsplit('/').next().unwrap_or(path.as_str());
        match nodes.get_node_by_handle(handle) {
            None => failed.push(format!("{path}: handle não encontrado")),
            Some(node) => {
                if let Err(e) = mega.delete_node(node).await {
                    failed.push(format!("{path}: {e}"));
                }
            }
        }
    }
    Ok(failed)
}
```

- [ ] **Step 2: Verificar que compila**

```powershell
cd src-tauri && cargo check 2>&1 | Select-String "error"
```

Expected: sem erros.

- [ ] **Step 3: Executar todos os testes unitários**

```powershell
cd src-tauri && cargo test mega 2>&1 | tail -10
```

Expected: `test result: ok. 8 passed`

- [ ] **Step 4: Commit**

```powershell
git add src-tauri/src/cloud/mega.rs
git commit -m "feat(cloud/mega): delete_files — por handle, falhas acumuladas"
```

---

## Task 8: Registar provider em `mod.rs`

**Files:**

- Modify: `src-tauri/src/cloud/mod.rs`

- [ ] **Step 1: Adicionar `pub mod mega;` e arm no `get_provider()`**

Em `src-tauri/src/cloud/mod.rs`:

```rust
pub mod credentials;
pub mod dropbox;
pub mod ftp;
pub mod gdrive;
pub mod icloud;
pub mod mega;         // ← adicionar esta linha
pub mod oauth;
pub mod provider;
pub mod retry;
pub mod s3;
pub mod sftp;
pub mod smb;

use provider::CloudProvider;

pub fn get_provider(
    provider_type: &str,
    config: &serde_json::Value,
    creds: &serde_json::Value,
) -> Result<Box<dyn CloudProvider>, String> {
    match provider_type {
        "smb" => smb::SmbProvider::new(config)
            .map(|p| Box::new(p) as Box<dyn CloudProvider>)
            .map_err(|e| format!("Perfil SMB inválido: {e}")),
        "ftp" | "ftps" => ftp::FtpProvider::new(config, creds)
            .map(|p| Box::new(p) as Box<dyn CloudProvider>)
            .map_err(|e| format!("Perfil FTP inválido: {e}")),
        "sftp" => sftp::SftpProvider::new(config, creds)
            .map(|p| Box::new(p) as Box<dyn CloudProvider>)
            .map_err(|e| format!("Perfil SFTP inválido: {e}")),
        "s3" => s3::S3Provider::new(config, creds)
            .map(|p| Box::new(p) as Box<dyn CloudProvider>)
            .map_err(|e| format!("Perfil S3 inválido: {e}")),
        "dropbox" => dropbox::DropboxProvider::new(config, creds)
            .map(|p| Box::new(p) as Box<dyn CloudProvider>)
            .map_err(|e| format!("Perfil Dropbox inválido: {e}")),
        "gdrive" | "gdrive_personal" => gdrive::GDriveProvider::new(config, creds)
            .map(|p| Box::new(p) as Box<dyn CloudProvider>)
            .map_err(|e| format!("Perfil GDrive inválido: {e}")),
        "icloud" => icloud::ICloudProvider::new(config)
            .map(|p| Box::new(p) as Box<dyn CloudProvider>)
            .map_err(|e| format!("Perfil iCloud inválido: {e}")),
        "mega" => mega::MegaProvider::new(config, creds)  // ← adicionar este arm
            .map(|p| Box::new(p) as Box<dyn CloudProvider>)
            .map_err(|e| format!("Perfil MEGA inválido: {e}")),
        other => Err(format!("Fornecedor desconhecido: {other}")),
    }
}
```

- [ ] **Step 2: Verificar que compila**

```powershell
cd src-tauri && cargo check 2>&1 | Select-String "error"
```

Expected: sem erros.

- [ ] **Step 3: Commit**

```powershell
git add src-tauri/src/cloud/mod.rs
git commit -m "feat(cloud): registar MegaProvider em get_provider()"
```

---

## Task 9: Migration DB v3 — adicionar `'mega'` ao CHECK constraint

**Files:**

- Modify: `src-tauri/src/db/migrations.rs`

- [ ] **Step 1: Adicionar função `migrate_cloud_v3`**

Em `src-tauri/src/db/migrations.rs`, adicionar a função após `migrate_cloud_v2`:

```rust
/// Migração cloud v3: adiciona 'mega' ao CHECK constraint.
/// Mesmo padrão da v2 — detecta se já migrado, recria tabela se necessário.
fn migrate_cloud_v3(conn: &Connection) -> Result<()> {
    let already_updated: bool = conn
        .query_row(
            "SELECT sql FROM sqlite_master WHERE type='table' AND name='cloud_profiles'",
            [],
            |row| {
                let sql: String = row.get(0)?;
                Ok(sql.contains("'mega'"))
            },
        )
        .unwrap_or(false);

    if already_updated {
        return Ok(());
    }

    conn.execute_batch(
        r#"
        PRAGMA foreign_keys = OFF;

        CREATE TABLE cloud_profiles_new (
            id          TEXT PRIMARY KEY,
            name        TEXT NOT NULL,
            provider    TEXT NOT NULL
                            CHECK(provider IN ('ftp','ftps','sftp','smb','s3','gdrive','gdrive_personal','dropbox','icloud','mega')),
            config      TEXT NOT NULL,
            created_at  TEXT NOT NULL
        );

        INSERT INTO cloud_profiles_new SELECT * FROM cloud_profiles;
        DROP TABLE cloud_profiles;
        ALTER TABLE cloud_profiles_new RENAME TO cloud_profiles;

        PRAGMA foreign_keys = ON;
        "#,
    )?;
    Ok(())
}
```

- [ ] **Step 2: Adicionar chamada em `run()`**

Na função `run()` em `migrations.rs`, adicionar `migrate_cloud_v3(conn)?;` após `migrate_cloud_v2(conn)?;`:

```rust
pub fn run(conn: &Connection) -> Result<()> {
    conn.execute_batch(SCHEMA)?;
    migrate_jobs_status_check(conn)?;
    migrate_assets_v2(conn)?;
    migrate_cloud_v1(conn)?;
    migrate_cloud_v2(conn)?;
    migrate_cloud_v3(conn)?;   // ← adicionar esta linha
    migrate_watch_folders_v1(conn)?;
    migrate_telemetry_v1(conn)?;
    migrate_phase_durations_v1(conn)?;
    Ok(())
}
```

- [ ] **Step 3: Verificar que compila**

```powershell
cd src-tauri && cargo check 2>&1 | Select-String "error"
```

Expected: sem erros.

- [ ] **Step 4: Commit**

```powershell
git add src-tauri/src/db/migrations.rs
git commit -m "feat(db): migrate_cloud_v3 — adicionar 'mega' ao CHECK constraint"
```

---

## Task 10: Frontend — `src/store/cloud.ts`

**Files:**

- Modify: `src/store/cloud.ts`

- [ ] **Step 1: Adicionar `'mega'` ao `CloudProviderType`**

Na linha onde está definido `CloudProviderType`, adicionar `'mega'`:

```ts
export interface CloudProfile {
  id: string;
  name: string;
  provider:
    | 'ftp'
    | 'sftp'
    | 'smb'
    | 's3'
    | 'gdrive'
    | 'gdrive_personal'
    | 'dropbox'
    | 'icloud'
    | 'mega';
  config: Record<string, unknown>;
  createdAt: string;
}
```

- [ ] **Step 2: Adicionar `PROVIDER_LABELS`**

No objecto `PROVIDER_LABELS`, adicionar após `icloud`:

```ts
mega: 'MEGA',
```

- [ ] **Step 3: Adicionar `PROVIDER_HELP`**

No objecto `PROVIDER_HELP`, adicionar após `icloud`:

```ts
mega: [
  '1. Aceda a mega.nz e crie uma conta gratuita (ou use conta existente)',
  '2. Crie a pasta de destino no MEGA antes de guardar o perfil',
  '   Exemplo: na raiz do Cloud Drive, crie "Nexora" → dentro, crie "Output"',
  '3. Em "Pasta no MEGA" escreva o caminho sem barra inicial',
  '   Exemplos: Nexora/Output   uploads   Media/nexora',
  '4. Introduza o email e password da conta MEGA nos campos acima',
  '5. Clique "Testar ligação" para verificar acesso à pasta',
  '   NOTA: os ficheiros são cifrados automaticamente (E2EE) pelo MEGA —',
  '   o Nexora nunca envia dados em claro para os servidores',
].join('\n'),
```

- [ ] **Step 4: Adicionar `PROVIDER_FIELDS`**

No objecto `PROVIDER_FIELDS`, adicionar após `icloud`:

```ts
mega: [
  {
    key: 'base_path',
    label: 'Pasta no MEGA',
    type: 'text' as const,
    defaultValue: 'Nexora/Output',
  },
  { key: 'email', label: 'Email', type: 'text' as const },
  { key: 'password', label: 'Password', type: 'password' as const },
],
```

- [ ] **Step 5: Verificar TypeScript**

```powershell
npx tsc --noEmit 2>&1 | head -20
```

Expected: sem erros de tipo.

- [ ] **Step 6: Commit**

```powershell
git add src/store/cloud.ts
git commit -m "feat(ui): provider MEGA — tipo, label, fields, help"
```

---

## Task 11: Build completo + teste manual

**Files:** nenhum

- [ ] **Step 1: Build debug completo**

```powershell
cargo tauri build --debug 2>&1 | tail -30
```

Expected: `Finished` sem erros. Pode demorar 2–5 minutos na primeira compilação com o crate `mega`.

- [ ] **Step 2: Arrancar a app em modo dev**

```powershell
npm run tauri dev
```

- [ ] **Step 3: Criar perfil MEGA na UI**

1. Abrir Nexora Desktop → Definições → Cloud → "Novo Perfil"
2. Seleccionar "MEGA"
3. Preencher: Pasta = `Nexora/Output`, Email = conta MEGA real, Password = password real
4. Clicar "Testar ligação"
   - Expected: toast "Ligação bem-sucedida"
   - Se falhar com "Pasta não encontrada": criar a pasta no mega.nz primeiro

- [ ] **Step 4: Verificar browse**

1. Clicar no botão Browse no perfil MEGA criado
2. Expected: lista de ficheiros/pastas da pasta `Nexora/Output`
3. Navegar para uma subpasta (se existir)
4. Expected: breadcrumb actualizado, ficheiros listados

- [ ] **Step 5: Verificar upload (opcional — requer job existente)**

1. Num job concluído, adicionar o perfil MEGA como destino cloud
2. Clicar "Upload"
3. Expected: ficheiro aparece na pasta `Nexora/Output` no mega.nz

- [ ] **Step 6: Commit final de sessão**

```powershell
git add .wip-session.md .session-info.md PROGRESS-DESKTOP.md SYNC-STATE.md
git commit -m "docs(session): actualizar ficheiros fim de sessão — MEGA provider implementado"
```

---

## Self-Review

**Spec coverage:**

- ✅ Task 1: Cargo.toml — `mega = "0.8"`, `tokio-util`
- ✅ Task 2: `MegaProvider::new()` — email config, password keychain, base_path normalizado
- ✅ Task 3: `test_connection` — login + verifica pasta base
- ✅ Task 4: `upload` — tokio compat reader → `upload_node`
- ✅ Task 5: `list_files` — handle-based navigation, `RemoteFile.path` composto
- ✅ Task 6: `download` — tokio compat writer → `download_node`
- ✅ Task 7: `delete_files` — handle folha + falhas acumuladas
- ✅ Task 8: `mod.rs` — registo `"mega"` em `get_provider()`
- ✅ Task 9: `migrate_cloud_v3` — CHECK constraint actualizado
- ✅ Task 10: `cloud.ts` — CloudProviderType, labels, fields, help
- ✅ Task 11: build + teste manual

**Consistência de tipos:**

- `MegaProvider::new(config, creds)` → mesmo padrão que `DropboxProvider::new`
- `RemoteFile.path` = handle composto (`"parent_handle/child_handle"`) → `rsplit('/').next()` extrai handle folha em download/delete — consistente em Tasks 5, 6, 7
- `migrate_cloud_v3` usa o mesmo padrão de detecção que `migrate_cloud_v2` (check "contains")

**Sem placeholders:** todas as tasks têm código completo e comandos exactos.
