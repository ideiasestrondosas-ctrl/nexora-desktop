# Cloud File Browser — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a file browser modal to each cloud profile in Settings → Cloud, allowing users to list, navigate, download, and delete remote files within the configured `base_path`.

**Architecture:** Extend the `CloudProvider` trait with `list_files` and `delete_files` default methods, implement per provider (FTP/SFTP/SMB/S3/GDrive), add three Tauri commands, and build a `CloudFileBrowserModal` React component with tests. iCloud delegates to its inner SmbProvider for listing but the spec calls for an explicit Err return; the Browse button in the UI is disabled for iCloud profiles.

**Tech Stack:** Rust (async_trait, suppaftp 6, russh-sftp 2, rust-s3 0.37, reqwest 0.12), React 19 + TypeScript strict, Zustand, react-i18next, Vitest + Testing Library, Tauri 2 IPC (camelCase invoke params).

---

## File Map

| File                                              | Action | What changes                                                                                                     |
| ------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------- |
| `src-tauri/src/cloud/provider.rs`                 | Modify | Add `RemoteFile` struct; add `list_files` + `delete_files` with default `Err` impl; remove `#[allow(dead_code)]` |
| `src-tauri/src/cloud/ftp.rs`                      | Modify | Implement `list_files` + `delete_files`                                                                          |
| `src-tauri/src/cloud/sftp.rs`                     | Modify | Implement `list_files` + `delete_files`                                                                          |
| `src-tauri/src/cloud/smb.rs`                      | Modify | Implement `list_files` + `delete_files`                                                                          |
| `src-tauri/src/cloud/icloud.rs`                   | Modify | Implement `list_files` + `delete_files` returning explicit Err                                                   |
| `src-tauri/src/cloud/s3.rs`                       | Modify | Implement `list_files` + `delete_files`                                                                          |
| `src-tauri/src/cloud/gdrive.rs`                   | Modify | Implement `list_files` + `delete_files`                                                                          |
| `src-tauri/src/commands/cloud.rs`                 | Modify | Add 3 new async commands: `cloud_list_files`, `cloud_delete_files`, `cloud_download_file`                        |
| `src-tauri/src/lib.rs`                            | Modify | Register 3 new commands in `invoke_handler`                                                                      |
| `src/components/CloudFileBrowserModal.tsx`        | Create | Full file browser modal component                                                                                |
| `src/pages/SettingsPage.tsx`                      | Modify | Add Browse button + modal to cloud profile cards                                                                 |
| `src/i18n/locales/*/common.json`                  | Modify | Add `cloudBrowser.*` keys in all 15 locales                                                                      |
| `tests/components/CloudFileBrowserModal.test.tsx` | Create | Unit tests (written before component)                                                                            |

---

## Task 1: RemoteFile type + trait extension

**Files:**

- Modify: `src-tauri/src/cloud/provider.rs`

- [ ] **Step 1: Replace the entire `provider.rs` with the extended version**

```rust
use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct RemoteFile {
    pub name: String,
    pub path: String,
    pub size: Option<u64>,
    pub modified: Option<String>,
    pub is_dir: bool,
}

#[async_trait]
pub trait CloudProvider: Send + Sync {
    async fn test_connection(&self) -> Result<(), String>;
    async fn upload(&self, local_path: &Path, remote_path: &str) -> Result<String, String>;
    async fn download(&self, remote_path: &str, local_path: &Path) -> Result<(), String>;
    fn provider_type(&self) -> &'static str;

    async fn list_files(&self, _path: &str) -> Result<Vec<RemoteFile>, String> {
        Err("Listagem de ficheiros não suportada para este fornecedor.".to_string())
    }

    async fn delete_files(&self, _paths: &[String]) -> Result<Vec<String>, String> {
        Err("Eliminação de ficheiros não suportada para este fornecedor.".to_string())
    }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd src-tauri && cargo check 2>&1`
Expected: no errors (existing providers still compile — they inherit the default impl)

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/cloud/provider.rs
git commit -m "feat(cloud): RemoteFile type + list_files/delete_files trait defaults"
```

---

## Task 2: FTP — list_files + delete_files

**Files:**

- Modify: `src-tauri/src/cloud/ftp.rs`

- [ ] **Step 1: Add the parse helper and implement both methods in `ftp.rs`**

Add a free function `parse_ftp_list_line` above the `impl FtpProvider` block, then add the two trait methods inside the `impl CloudProvider for FtpProvider` block:

```rust
// Free function — parses one LINE from the FTP LIST command (UNIX ls -l format)
// Example: "-rw-r--r-- 1 user group 12345 Jan 01 12:00 clip.mp4"
fn parse_ftp_list_line(line: &str, subpath: &str) -> Option<super::provider::RemoteFile> {
    use super::provider::RemoteFile;
    let parts: Vec<&str> = line.split_whitespace().collect();
    if parts.len() < 9 {
        return None;
    }
    let is_dir = parts[0].starts_with('d');
    let size: Option<u64> = if is_dir { None } else { parts[4].parse().ok() };
    let name = parts[8..].join(" ");
    if name == "." || name == ".." || name.is_empty() {
        return None;
    }
    let path = if subpath.is_empty() {
        name.clone()
    } else {
        format!("{}/{}", subpath.trim_end_matches('/'), name)
    };
    Some(RemoteFile { name, path, size, modified: None, is_dir })
}
```

Inside `impl CloudProvider for FtpProvider`, add after the `download` method:

```rust
async fn list_files(&self, path: &str) -> Result<Vec<super::provider::RemoteFile>, String> {
    let full = self.full_remote_path(path);
    let mut ftp = self.connect().await?;
    let lines = ftp
        .list(Some(&full))
        .await
        .map_err(|e| format!("FTP LIST falhou em {full}: {e}"))?;
    let _ = ftp.quit().await;
    Ok(lines.iter().filter_map(|l| parse_ftp_list_line(l, path)).collect())
}

async fn delete_files(&self, paths: &[String]) -> Result<Vec<String>, String> {
    let mut ftp = self.connect().await?;
    let mut failed = Vec::new();
    for path in paths {
        let full = self.full_remote_path(path);
        if let Err(e) = ftp.rm(&full).await {
            failed.push(format!("{path}: {e}"));
        }
    }
    let _ = ftp.quit().await;
    Ok(failed)
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd src-tauri && cargo check 2>&1`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/cloud/ftp.rs
git commit -m "feat(cloud/ftp): list_files + delete_files"
```

---

## Task 3: SFTP — list_files + delete_files

**Files:**

- Modify: `src-tauri/src/cloud/sftp.rs`

- [ ] **Step 1: Add imports and implement both methods**

Add to the imports at the top of `sftp.rs`:

```rust
use futures::StreamExt;
```

Inside `impl CloudProvider for SftpProvider`, add after the `download` method:

```rust
async fn list_files(&self, path: &str) -> Result<Vec<super::provider::RemoteFile>, String> {
    use super::provider::RemoteFile;
    let dir_path = self.full_remote_path(path);
    let sftp = self.open_sftp().await?;

    // russh-sftp 2.x: read_dir returns a Stream of (name, FileAttributes)
    let mut rd = sftp
        .read_dir(&dir_path)
        .await
        .map_err(|e| format!("SFTP readdir falhou em {dir_path}: {e}"))?;

    let mut files = Vec::new();
    while let Some(entry) = rd.next().await {
        let (name, attrs) = entry.map_err(|e| format!("SFTP readdir entry: {e}"))?;
        if name == "." || name == ".." {
            continue;
        }
        let is_dir = attrs.file_type().is_dir();
        let size = if is_dir { None } else { attrs.size };
        let modified = attrs.mtime.map(|t| {
            chrono::DateTime::<chrono::Utc>::from_timestamp(t as i64, 0)
                .map(|dt| dt.to_rfc3339())
                .unwrap_or_default()
        });
        let rel_path = if path.is_empty() {
            name.clone()
        } else {
            format!("{}/{}", path.trim_end_matches('/'), name)
        };
        files.push(RemoteFile { name, path: rel_path, size, modified, is_dir });
    }
    Ok(files)
}

async fn delete_files(&self, paths: &[String]) -> Result<Vec<String>, String> {
    let sftp = self.open_sftp().await?;
    let mut failed = Vec::new();
    for path in paths {
        let full = self.full_remote_path(path);
        if let Err(e) = sftp.remove(&full).await {
            failed.push(format!("{path}: {e}"));
        }
    }
    Ok(failed)
}
```

> **Note:** If `cargo check` fails on `sftp.read_dir`, check the exact method name with `cargo doc -p russh-sftp --open`. The russh-sftp 2.x API may expose `read_dir` returning a `Stream` or a `Vec` — adapt accordingly. `attrs.file_type().is_dir()` may be `attrs.is_dir()` depending on the version.

- [ ] **Step 2: Add `futures` dependency if missing**

Run: `cd src-tauri && grep 'futures' Cargo.toml`

If not present, add to `Cargo.toml`:

```toml
futures = "0.3"
```

- [ ] **Step 3: Verify it compiles**

Run: `cd src-tauri && cargo check 2>&1`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/cloud/sftp.rs src-tauri/Cargo.toml src-tauri/Cargo.lock
git commit -m "feat(cloud/sftp): list_files + delete_files"
```

---

## Task 4: SMB + iCloud

**Files:**

- Modify: `src-tauri/src/cloud/smb.rs`
- Modify: `src-tauri/src/cloud/icloud.rs`

- [ ] **Step 1: Implement `list_files` + `delete_files` on `SmbProvider` in `smb.rs`**

Inside `impl CloudProvider for SmbProvider`, add after the `download` method:

```rust
async fn list_files(&self, path: &str) -> Result<Vec<super::provider::RemoteFile>, String> {
    use super::provider::RemoteFile;
    let dir = self.resolve(path);
    let entries = std::fs::read_dir(&dir)
        .map_err(|e| format!("Leitura de directório SMB falhou em {}: {e}", dir.display()))?;

    let mut files = Vec::new();
    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let name = entry.file_name().to_string_lossy().to_string();
        let meta = entry.metadata().map_err(|e| e.to_string())?;
        let is_dir = meta.is_dir();
        let size = if is_dir { None } else { Some(meta.len()) };
        let modified = meta.modified().ok().map(|t| {
            chrono::DateTime::<chrono::Utc>::from(t).to_rfc3339()
        });
        let rel_path = if path.is_empty() {
            name.clone()
        } else {
            format!("{}/{}", path.trim_end_matches('/'), name)
        };
        files.push(RemoteFile { name, path: rel_path, size, modified, is_dir });
    }
    Ok(files)
}

async fn delete_files(&self, paths: &[String]) -> Result<Vec<String>, String> {
    let mut failed = Vec::new();
    for path in paths {
        let full = self.resolve(path);
        if let Err(e) = std::fs::remove_file(&full) {
            failed.push(format!("{path}: {e}"));
        }
    }
    Ok(failed)
}
```

- [ ] **Step 2: Add explicit Err implementations to `ICloudProvider` in `icloud.rs`**

Inside `impl CloudProvider for ICloudProvider`, add after the `download` method:

```rust
async fn list_files(&self, _path: &str) -> Result<Vec<super::provider::RemoteFile>, String> {
    Err("Navegação de ficheiros não suportada para iCloud nesta versão.".to_string())
}

async fn delete_files(&self, _paths: &[String]) -> Result<Vec<String>, String> {
    Err("Eliminação de ficheiros não suportada para iCloud nesta versão.".to_string())
}
```

- [ ] **Step 3: Add `chrono` import to `smb.rs`**

`smb.rs` already uses std::fs but needs chrono for `DateTime`. Check if chrono is in scope; if not, add at top of `smb.rs`:

```rust
use chrono::DateTime;
```

(chrono is already a dependency of the crate — used in jobs.rs and cloud.rs)

- [ ] **Step 4: Verify it compiles**

Run: `cd src-tauri && cargo check 2>&1`
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/cloud/smb.rs src-tauri/src/cloud/icloud.rs
git commit -m "feat(cloud/smb): list_files + delete_files; icloud: explicit not-supported"
```

---

## Task 5: S3 — list_files + delete_files

**Files:**

- Modify: `src-tauri/src/cloud/s3.rs`

- [ ] **Step 1: Implement `list_files` + `delete_files` on `S3Provider`**

Inside `impl CloudProvider for S3Provider`, add after the `download` method:

```rust
async fn list_files(&self, path: &str) -> Result<Vec<super::provider::RemoteFile>, String> {
    use super::provider::RemoteFile;

    // Build the S3 prefix for the requested subpath
    let base = self.base_path.trim_end_matches('/');
    let prefix = if path.is_empty() {
        if base.is_empty() { String::new() } else { format!("{base}/") }
    } else {
        let rel = path.trim_end_matches('/');
        if base.is_empty() { format!("{rel}/") } else { format!("{base}/{rel}/") }
    };

    let results = self
        .bucket
        .list(prefix.clone(), Some("/"))
        .await
        .map_err(|e| format!("S3 list falhou: {e}"))?;

    let mut files = Vec::new();
    for page in results {
        // Pastas (common_prefixes): strip the full prefix to get relative path
        for cp in page.common_prefixes.unwrap_or_default() {
            let folder_full = cp.prefix.trim_end_matches('/');
            let name = folder_full.rsplit('/').next().unwrap_or("").to_string();
            if name.is_empty() { continue; }
            let rel = folder_full.trim_start_matches(base).trim_start_matches('/').to_string();
            files.push(RemoteFile { name, path: rel, size: None, modified: None, is_dir: true });
        }
        // Ficheiros (contents): skip the prefix "directory" entry itself
        for obj in page.contents {
            if obj.key.ends_with('/') { continue; }
            let name = obj.key.rsplit('/').next().unwrap_or("").to_string();
            if name.is_empty() { continue; }
            let rel = obj.key.trim_start_matches(base).trim_start_matches('/').to_string();
            files.push(RemoteFile {
                name,
                path: rel,
                size: Some(obj.size as u64),
                modified: Some(obj.last_modified.clone()),
                is_dir: false,
            });
        }
    }
    Ok(files)
}

async fn delete_files(&self, paths: &[String]) -> Result<Vec<String>, String> {
    let mut failed = Vec::new();
    for path in paths {
        let key = self.full_path(path);
        if let Err(e) = self.bucket.delete_object(&key).await {
            failed.push(format!("{path}: {e}"));
        }
    }
    Ok(failed)
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd src-tauri && cargo check 2>&1`
Expected: no errors

> **Note:** If `page.common_prefixes` is not `Option<Vec<CommonPrefix>>` but `Vec<CommonPrefix>`, remove the `.unwrap_or_default()`. Check with `cargo doc -p rust-s3 --open` if needed.

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/cloud/s3.rs
git commit -m "feat(cloud/s3): list_files + delete_files"
```

---

## Task 6: Google Drive — list_files + delete_files

**Files:**

- Modify: `src-tauri/src/cloud/gdrive.rs`

- [ ] **Step 1: Implement `list_files` + `delete_files` on `GDriveProvider`**

Replace the entire `gdrive.rs` with the following (keeps existing constants + struct + other methods, adds `list_files` and `delete_files`):

```rust
use super::provider::{CloudProvider, RemoteFile};
use async_trait::async_trait;
use std::path::Path;

const GDRIVE_UPLOAD_URL: &str =
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";
const GDRIVE_FILES_URL: &str = "https://www.googleapis.com/drive/v3/files";

pub struct GDriveProvider {
    access_token: String,
    base_folder_id: Option<String>,
}

impl GDriveProvider {
    pub fn new(_config: &serde_json::Value, creds: &serde_json::Value) -> Result<Self, String> {
        let token = creds["oauth_token"]
            .as_str()
            .ok_or("oauth_token é obrigatório — autentique o perfil primeiro")?
            .to_string();
        let folder_id = creds
            .get("folder_id")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());
        Ok(Self { access_token: token, base_folder_id: folder_id })
    }

    // Resolve a folder name to its Drive ID within a parent folder (or root)
    async fn resolve_folder_id(
        &self,
        client: &reqwest::Client,
        name: &str,
        parent_id: Option<&str>,
    ) -> Result<String, String> {
        let q = match parent_id {
            Some(pid) => format!(
                "name='{}' and mimeType='application/vnd.google-apps.folder' and '{}' in parents and trashed=false",
                name.replace('\'', "\\'"),
                pid
            ),
            None => format!(
                "name='{}' and mimeType='application/vnd.google-apps.folder' and trashed=false",
                name.replace('\'', "\\'")
            ),
        };
        let resp = client
            .get(GDRIVE_FILES_URL)
            .bearer_auth(&self.access_token)
            .query(&[("q", &q), ("fields", &"files(id,name)".to_string()), ("pageSize", &"1".to_string())])
            .send()
            .await
            .map_err(|e| format!("Google Drive: falha ao resolver pasta '{name}': {e}"))?;
        if resp.status().as_u16() == 401 {
            return Err("Token expirado — reautentique o perfil".to_string());
        }
        let body: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
        body["files"][0]["id"]
            .as_str()
            .map(|s| s.to_string())
            .ok_or_else(|| format!("Pasta '{name}' não encontrada no Google Drive"))
    }

    // Resolve a slash-separated subpath to a Drive folder ID, starting from base_folder_id
    async fn resolve_path_id(
        &self,
        client: &reqwest::Client,
        subpath: &str,
    ) -> Result<String, String> {
        let start_id = match &self.base_folder_id {
            Some(id) => id.clone(),
            None => return Err("folder_id não configurado — reautentique o perfil".to_string()),
        };
        if subpath.is_empty() {
            return Ok(start_id);
        }
        let mut current_id = start_id;
        for segment in subpath.split('/').filter(|s| !s.is_empty()) {
            current_id = self.resolve_folder_id(client, segment, Some(&current_id)).await?;
        }
        Ok(current_id)
    }
}

#[async_trait]
impl CloudProvider for GDriveProvider {
    fn provider_type(&self) -> &'static str {
        "gdrive"
    }

    async fn test_connection(&self) -> Result<(), String> {
        let client = reqwest::Client::new();
        let resp = client
            .get("https://www.googleapis.com/drive/v3/about?fields=user")
            .bearer_auth(&self.access_token)
            .send()
            .await
            .map_err(|e| format!("Google Drive inacessível: {e}"))?;
        if resp.status().is_success() {
            Ok(())
        } else if resp.status().as_u16() == 401 {
            Err("Token expirado — reautentique o perfil".to_string())
        } else {
            Err(format!("Google Drive erro: {}", resp.status()))
        }
    }

    async fn upload(&self, local_path: &Path, remote_path: &str) -> Result<String, String> {
        let _ = &self.base_folder_id;
        let filename = Path::new(remote_path)
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();
        let data = tokio::fs::read(local_path).await.map_err(|e| e.to_string())?;
        let client = reqwest::Client::new();
        let metadata = serde_json::json!({ "name": filename });
        let metadata_part = reqwest::multipart::Part::text(metadata.to_string())
            .mime_str("application/json")
            .map_err(|e| e.to_string())?;
        let file_part = reqwest::multipart::Part::bytes(data)
            .mime_str("application/octet-stream")
            .map_err(|e| e.to_string())?;
        let form = reqwest::multipart::Form::new()
            .part("metadata", metadata_part)
            .part("file", file_part);
        let resp = client
            .post(GDRIVE_UPLOAD_URL)
            .bearer_auth(&self.access_token)
            .multipart(form)
            .send()
            .await
            .map_err(|e| format!("Google Drive upload falhou: {e}"))?;
        if resp.status().is_success() {
            let body: serde_json::Value = resp.json().await.unwrap_or_default();
            Ok(body["id"].as_str().unwrap_or("").to_string())
        } else {
            Err(format!("Google Drive upload erro: {}", resp.status()))
        }
    }

    async fn download(&self, remote_path: &str, local_path: &Path) -> Result<(), String> {
        let client = reqwest::Client::new();
        let url = format!("{}/{}?alt=media", GDRIVE_FILES_URL, remote_path);
        let resp = client
            .get(&url)
            .bearer_auth(&self.access_token)
            .send()
            .await
            .map_err(|e| format!("Google Drive download falhou: {e}"))?;
        let bytes = resp.bytes().await.map_err(|e| e.to_string())?;
        if let Some(parent) = local_path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        tokio::fs::write(local_path, bytes).await.map_err(|e| e.to_string())?;
        Ok(())
    }

    async fn list_files(&self, path: &str) -> Result<Vec<RemoteFile>, String> {
        let client = reqwest::Client::new();
        let folder_id = self.resolve_path_id(&client, path).await?;

        let q = format!("'{}' in parents and trashed=false", folder_id);
        let resp = client
            .get(GDRIVE_FILES_URL)
            .bearer_auth(&self.access_token)
            .query(&[(
                "fields",
                "files(id,name,size,modifiedTime,mimeType)",
            )])
            .query(&[("q", &q)])
            .send()
            .await
            .map_err(|e| format!("Google Drive list falhou: {e}"))?;

        if resp.status().as_u16() == 401 {
            return Err("Token expirado — reautentique o perfil".to_string());
        }

        let body: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
        let files_arr = body["files"].as_array().cloned().unwrap_or_default();

        let gdoc_mime = "application/vnd.google-apps.";
        let folder_mime = "application/vnd.google-apps.folder";

        let mut files = Vec::new();
        for f in files_arr {
            let name = f["name"].as_str().unwrap_or("").to_string();
            let mime = f["mimeType"].as_str().unwrap_or("").to_string();
            let file_id = f["id"].as_str().unwrap_or("").to_string();
            if name.is_empty() || file_id.is_empty() { continue; }

            let is_dir = mime == folder_mime;
            // Google Docs native files: use file ID as path (for download/delete)
            // Regular files: same
            let rel_path = if path.is_empty() {
                file_id.clone()
            } else {
                format!("{}/{}", path.trim_end_matches('/'), file_id)
            };
            let size = f["size"].as_str().and_then(|s| s.parse().ok());
            let modified = f["modifiedTime"].as_str().map(|s| s.to_string());
            // Mark Google Docs native files so frontend can disable their buttons
            let is_gdoc = !is_dir && mime.starts_with(gdoc_mime);
            let display_name = if is_gdoc {
                format!("{name} [Google Doc]")
            } else {
                name.clone()
            };
            files.push(RemoteFile {
                name: display_name,
                path: rel_path,
                size,
                modified,
                is_dir,
            });
        }
        Ok(files)
    }

    async fn delete_files(&self, paths: &[String]) -> Result<Vec<String>, String> {
        let client = reqwest::Client::new();
        let mut failed = Vec::new();
        for path in paths {
            // For GDrive, `path` is the file ID (or "subpath/file_id")
            let file_id = path.rsplit('/').next().unwrap_or(path.as_str());
            let url = format!("{}/{}", GDRIVE_FILES_URL, file_id);
            match client.delete(&url).bearer_auth(&self.access_token).send().await {
                Ok(resp) if resp.status().is_success() || resp.status().as_u16() == 204 => {}
                Ok(resp) => failed.push(format!("{path}: HTTP {}", resp.status())),
                Err(e) => failed.push(format!("{path}: {e}")),
            }
        }
        Ok(failed)
    }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd src-tauri && cargo check 2>&1`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/cloud/gdrive.rs
git commit -m "feat(cloud/gdrive): list_files + delete_files via Drive v3 API"
```

---

## Task 7: Tauri commands + registration

**Files:**

- Modify: `src-tauri/src/commands/cloud.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Add 3 new commands to `cloud.rs`**

Add the following at the end of `cloud.rs`, before any closing brace (the file has no module wrapper — just add after the last `}`):

```rust
// ── File browser commands ─────────────────────────────────────────────────────

fn load_profile_provider(
    profile_id: &str,
    state: &tauri::State<AppState>,
) -> Result<(Box<dyn cloud::provider::CloudProvider>, String), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let (provider_type, config_str): (String, String) = db
        .query_row(
            "SELECT provider, config FROM cloud_profiles WHERE id=?1",
            [profile_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|_| format!("Perfil '{}' não encontrado", profile_id))?;
    drop(db);
    let config: serde_json::Value =
        serde_json::from_str(&config_str).map_err(|e| e.to_string())?;
    let provider = cloud::get_provider(&provider_type, &config, &config)?;
    Ok((provider, provider_type))
}

#[tauri::command]
pub async fn cloud_list_files(
    profile_id: String,
    subpath: Option<String>,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<cloud::provider::RemoteFile>, String> {
    let (provider, _) = load_profile_provider(&profile_id, &state)?;
    let path = subpath.as_deref().unwrap_or("");
    provider.list_files(path).await
}

#[tauri::command]
pub async fn cloud_delete_files(
    profile_id: String,
    paths: Vec<String>,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<String>, String> {
    let (provider, _) = load_profile_provider(&profile_id, &state)?;
    provider.delete_files(&paths).await
}

#[tauri::command]
pub async fn cloud_download_file(
    profile_id: String,
    remote_path: String,
    local_path: String,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let (provider, _) = load_profile_provider(&profile_id, &state)?;
    provider.download(&remote_path, std::path::Path::new(&local_path)).await
}
```

- [ ] **Step 2: Register in `lib.rs`**

In `src-tauri/src/lib.rs`, find the last `commands::cloud::` line in the `invoke_handler` block (currently `commands::cloud::gdrive_poll_auth`). Add the 3 new commands after it:

```rust
            commands::cloud::gdrive_poll_auth,
            commands::cloud::cloud_list_files,
            commands::cloud::cloud_delete_files,
            commands::cloud::cloud_download_file,
```

- [ ] **Step 3: Verify it compiles**

Run: `cd src-tauri && cargo check 2>&1`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/commands/cloud.rs src-tauri/src/lib.rs
git commit -m "feat(cloud): Tauri commands cloud_list_files, cloud_delete_files, cloud_download_file"
```

---

## Task 8: Failing tests for CloudFileBrowserModal

**Files:**

- Create: `tests/components/CloudFileBrowserModal.test.tsx`

- [ ] **Step 1: Write the test file**

```tsx
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CloudFileBrowserModal } from '@/components/CloudFileBrowserModal';
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ save: vi.fn() }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string, opts?: Record<string, unknown>) => {
      if (!opts) return k;
      return Object.entries(opts).reduce((s, [k2, v]) => s.replace(`{{${k2}}}`, String(v)), k);
    },
  }),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// ── Fixtures ───────────────────────────────────────────────────────────────────

const profile = {
  id: 's3-prod',
  name: 'S3-prod',
  provider: 's3' as const,
  config: {},
  createdAt: '2024-01-01',
};

const mockFiles = [
  { name: 'footage', path: 'footage', size: null, modified: null, isDir: true },
  {
    name: 'clip.mp4',
    path: 'clip.mp4',
    size: 1000000,
    modified: '2026-05-22T10:00:00Z',
    isDir: false,
  },
  {
    name: 'promo.mp4',
    path: 'promo.mp4',
    size: 500000,
    modified: '2026-05-21T08:00:00Z',
    isDir: false,
  },
];

const mockSubFiles = [
  {
    name: 'raw.mp4',
    path: 'footage/raw.mp4',
    size: 2000000,
    modified: '2026-05-20T06:00:00Z',
    isDir: false,
  },
];

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('CloudFileBrowserModal', () => {
  beforeEach(() => {
    vi.mocked(invoke).mockClear();
    vi.mocked(save).mockClear();
  });

  it('não renderiza nada quando profile é null', () => {
    const { container } = render(<CloudFileBrowserModal profile={null} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('mostra spinner enquanto cloud_list_files está pendente', async () => {
    vi.mocked(invoke).mockImplementation(() => new Promise(() => {}));
    render(<CloudFileBrowserModal profile={profile} onClose={vi.fn()} />);
    expect(screen.getByTestId('browser-loading')).toBeInTheDocument();
  });

  it('renderiza lista de ficheiros após resposta do backend', async () => {
    vi.mocked(invoke).mockResolvedValue(mockFiles);
    render(<CloudFileBrowserModal profile={profile} onClose={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText('clip.mp4')).toBeInTheDocument();
      expect(screen.getByText('promo.mp4')).toBeInTheDocument();
      expect(screen.getByText('footage')).toBeInTheDocument();
    });
  });

  it('mostra estado vazio quando lista é vazia', async () => {
    vi.mocked(invoke).mockResolvedValue([]);
    render(<CloudFileBrowserModal profile={profile} onClose={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByTestId('browser-empty')).toBeInTheDocument();
    });
  });

  it('mostra banner de erro quando cloud_list_files falha', async () => {
    vi.mocked(invoke).mockRejectedValue(new Error('Ligação recusada'));
    render(<CloudFileBrowserModal profile={profile} onClose={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByTestId('browser-error')).toBeInTheDocument();
    });
  });

  it('clicar numa pasta chama cloud_list_files com subpath correcto', async () => {
    vi.mocked(invoke).mockResolvedValueOnce(mockFiles).mockResolvedValueOnce(mockSubFiles);
    render(<CloudFileBrowserModal profile={profile} onClose={vi.fn()} />);
    await waitFor(() => screen.getByText('footage'));
    fireEvent.click(screen.getByTestId('folder-footage'));
    await waitFor(() => {
      expect(vi.mocked(invoke)).toHaveBeenCalledWith('cloud_list_files', {
        profileId: 's3-prod',
        subpath: 'footage',
      });
    });
  });

  it('breadcrumb: clicar na raiz volta ao path inicial', async () => {
    vi.mocked(invoke).mockResolvedValue(mockFiles);
    render(<CloudFileBrowserModal profile={profile} onClose={vi.fn()} />);
    await waitFor(() => screen.getByTestId('breadcrumb-root'));
    fireEvent.click(screen.getByTestId('breadcrumb-root'));
    expect(vi.mocked(invoke)).toHaveBeenCalledWith('cloud_list_files', {
      profileId: 's3-prod',
      subpath: null,
    });
  });

  it('"Sel. Todos" selecciona todos os ficheiros (não pastas)', async () => {
    vi.mocked(invoke).mockResolvedValue(mockFiles);
    render(<CloudFileBrowserModal profile={profile} onClose={vi.fn()} />);
    await waitFor(() => screen.getByTestId('select-all'));
    fireEvent.click(screen.getByTestId('select-all'));
    expect(screen.getByTestId('checkbox-clip.mp4')).toBeChecked();
    expect(screen.getByTestId('checkbox-promo.mp4')).toBeChecked();
    // pastas não ficam seleccionadas
    expect(screen.queryByTestId('checkbox-footage')).not.toBeChecked();
  });

  it('apagar ficheiro individual chama cloud_delete_files com o path correcto', async () => {
    vi.mocked(invoke).mockResolvedValueOnce(mockFiles).mockResolvedValueOnce([]);
    render(<CloudFileBrowserModal profile={profile} onClose={vi.fn()} />);
    await waitFor(() => screen.getByTestId('delete-btn-clip.mp4'));
    fireEvent.click(screen.getByTestId('delete-btn-clip.mp4'));
    await waitFor(() => {
      expect(vi.mocked(invoke)).toHaveBeenCalledWith('cloud_delete_files', {
        profileId: 's3-prod',
        paths: ['clip.mp4'],
      });
    });
  });

  it('"Apagar Tudo" chama cloud_delete_files com todos os paths de ficheiros', async () => {
    vi.mocked(invoke).mockResolvedValueOnce(mockFiles).mockResolvedValueOnce([]);
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<CloudFileBrowserModal profile={profile} onClose={vi.fn()} />);
    await waitFor(() => screen.getByTestId('delete-all-btn'));
    fireEvent.click(screen.getByTestId('delete-all-btn'));
    await waitFor(() => {
      expect(vi.mocked(invoke)).toHaveBeenCalledWith('cloud_delete_files', {
        profileId: 's3-prod',
        paths: expect.arrayContaining(['clip.mp4', 'promo.mp4']),
      });
    });
    confirmSpy.mockRestore();
  });

  it('falhas parciais de delete mostram toast.error', async () => {
    const { toast } = await import('sonner');
    vi.mocked(invoke)
      .mockResolvedValueOnce(mockFiles)
      .mockResolvedValueOnce(['clip.mp4: permissão negada']);
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<CloudFileBrowserModal profile={profile} onClose={vi.fn()} />);
    await waitFor(() => screen.getByTestId('delete-btn-clip.mp4'));
    fireEvent.click(screen.getByTestId('delete-btn-clip.mp4'));
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
    confirmSpy.mockRestore();
  });

  it('download chama save() e depois cloud_download_file', async () => {
    vi.mocked(invoke).mockResolvedValueOnce(mockFiles).mockResolvedValueOnce(undefined);
    vi.mocked(save).mockResolvedValue('/downloads/clip.mp4');
    render(<CloudFileBrowserModal profile={profile} onClose={vi.fn()} />);
    await waitFor(() => screen.getByTestId('download-btn-clip.mp4'));
    fireEvent.click(screen.getByTestId('download-btn-clip.mp4'));
    await waitFor(() => {
      expect(vi.mocked(save)).toHaveBeenCalled();
      expect(vi.mocked(invoke)).toHaveBeenCalledWith('cloud_download_file', {
        profileId: 's3-prod',
        remotePath: 'clip.mp4',
        localPath: '/downloads/clip.mp4',
      });
    });
  });

  it('cancelar o diálogo de download não chama cloud_download_file', async () => {
    vi.mocked(invoke).mockResolvedValueOnce(mockFiles);
    vi.mocked(save).mockResolvedValue(null);
    render(<CloudFileBrowserModal profile={profile} onClose={vi.fn()} />);
    await waitFor(() => screen.getByTestId('download-btn-clip.mp4'));
    fireEvent.click(screen.getByTestId('download-btn-clip.mp4'));
    await waitFor(() => expect(vi.mocked(save)).toHaveBeenCalled());
    expect(vi.mocked(invoke)).not.toHaveBeenCalledWith('cloud_download_file', expect.anything());
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail (component doesn't exist yet)**

Run: `npm test -- --reporter=verbose tests/components/CloudFileBrowserModal.test.tsx 2>&1 | head -30`
Expected: FAIL — "Cannot find module '@/components/CloudFileBrowserModal'"

- [ ] **Step 3: Commit the failing tests**

```bash
git add tests/components/CloudFileBrowserModal.test.tsx
git commit -m "test(cloud): failing tests for CloudFileBrowserModal"
```

---

## Task 9: CloudFileBrowserModal component

**Files:**

- Create: `src/components/CloudFileBrowserModal.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import {
  X,
  FolderOpen,
  File,
  Download,
  Trash2,
  AlertTriangle,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';
import type { CloudProfile } from '@/store/cloud';
import { cn } from '@/lib/utils';

interface RemoteFile {
  name: string;
  path: string;
  size: number | null;
  modified: string | null;
  isDir: boolean;
}

interface Props {
  profile: CloudProfile | null;
  onClose: () => void;
}

function formatSize(bytes: number | null): string {
  if (bytes === null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export function CloudFileBrowserModal({ profile, onClose }: Props) {
  const { t } = useTranslation();
  const [currentPath, setCurrentPath] = useState<string>('');
  const [files, setFiles] = useState<RemoteFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [operating, setOperating] = useState(false);

  const load = useCallback(
    async (path: string) => {
      if (!profile) return;
      setLoading(true);
      setError(null);
      setSelected(new Set());
      try {
        const result = await invoke<RemoteFile[]>('cloud_list_files', {
          profileId: profile.id,
          subpath: path || null,
        });
        setFiles(result);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    },
    [profile],
  );

  useEffect(() => {
    if (profile) {
      setCurrentPath('');
      load('');
    }
  }, [profile, load]);

  const navigateTo = (path: string) => {
    setCurrentPath(path);
    load(path);
  };

  const breadcrumbs = currentPath ? currentPath.split('/').filter(Boolean) : [];

  const fileItems = files.filter((f) => !f.isDir);

  const toggleSelect = (path: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === fileItems.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(fileItems.map((f) => f.path)));
    }
  };

  const handleDelete = async (paths: string[]) => {
    if (paths.length === 0) return;
    const ok = window.confirm(
      t('cloudBrowser.confirmDeleteSelected', {
        count: paths.length,
        profile: profile!.name,
      }),
    );
    if (!ok) return;
    setOperating(true);
    try {
      const failed = await invoke<string[]>('cloud_delete_files', {
        profileId: profile!.id,
        paths,
      });
      if (failed.length > 0) {
        toast.error(
          t('cloudBrowser.deletePartialError', {
            count: failed.length,
            names: failed.join(', '),
          }),
        );
      }
      await load(currentPath);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setOperating(false);
    }
  };

  const handleDeleteAll = () => {
    const ok = window.confirm(
      t('cloudBrowser.confirmDeleteAll', {
        path: currentPath || '/',
        profile: profile!.name,
      }),
    );
    if (!ok) return;
    const allFilePaths = fileItems.map((f) => f.path);
    handleDelete(allFilePaths);
  };

  const handleDownload = async (file: RemoteFile) => {
    const dest = await save({ defaultPath: file.name });
    if (!dest) return;
    setOperating(true);
    try {
      await invoke('cloud_download_file', {
        profileId: profile!.id,
        remotePath: file.path,
        localPath: dest,
      });
      toast.success(t('cloudBrowser.downloadSuccess', { name: file.name }));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setOperating(false);
    }
  };

  if (!profile) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-bg-primary border border-border rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <FolderOpen size={20} className="text-brand" />
            <span className="font-bold text-text-primary">{profile.name}</span>
            <span className="text-xs text-text-muted bg-bg-secondary px-2 py-0.5 rounded-full">
              {profile.provider}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center gap-1 px-6 py-2 text-xs text-text-muted border-b border-border shrink-0">
          <button
            data-testid="breadcrumb-root"
            onClick={() => navigateTo('')}
            className="hover:text-text-primary transition-colors"
          >
            /
          </button>
          {breadcrumbs.map((seg, i) => {
            const path = breadcrumbs.slice(0, i + 1).join('/');
            return (
              <span key={path} className="flex items-center gap-1">
                <ChevronRight size={12} />
                <button
                  onClick={() => navigateTo(path)}
                  className="hover:text-text-primary transition-colors"
                >
                  {seg}
                </button>
              </span>
            );
          })}
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 px-6 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              data-testid="select-all"
              checked={fileItems.length > 0 && selected.size === fileItems.length}
              onChange={toggleAll}
              className="rounded"
            />
            {selected.size > 0 && (
              <span className="text-xs text-text-secondary">
                {t('cloudBrowser.selected', { count: selected.size })}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleDelete([...selected])}
              disabled={selected.size === 0 || operating}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-bg-secondary border border-border rounded-lg hover:bg-surface text-text-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Trash2 size={13} />
              {t('cloudBrowser.deleteSelected')}
            </button>
            <button
              data-testid="delete-all-btn"
              onClick={handleDeleteAll}
              disabled={fileItems.length === 0 || operating}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-red-500/10 border border-red-500/30 rounded-lg hover:bg-red-500/20 text-red-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <AlertTriangle size={13} />
              {t('cloudBrowser.deleteAll')}
            </button>
            <button
              onClick={() => load(currentPath)}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-bg-secondary border border-border rounded-lg hover:bg-surface text-text-secondary transition-colors"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              {t('cloudBrowser.refresh')}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {loading && (
            <div
              data-testid="browser-loading"
              className="h-full flex items-center justify-center text-text-muted"
            >
              <RefreshCw size={24} className="animate-spin" />
            </div>
          )}

          {!loading && error && (
            <div
              data-testid="browser-error"
              className="m-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-start gap-3"
            >
              <AlertTriangle size={18} className="shrink-0 mt-0.5" />
              <div className="flex-1">
                <p>{t('cloudBrowser.connectionError')}</p>
                <p className="text-xs mt-1 text-red-300/70">{error}</p>
                <button
                  onClick={() => load(currentPath)}
                  className="mt-2 text-xs underline hover:no-underline"
                >
                  {t('cloudBrowser.retry')}
                </button>
              </div>
            </div>
          )}

          {!loading && !error && files.length === 0 && (
            <div
              data-testid="browser-empty"
              className="h-full flex flex-col items-center justify-center gap-3 text-text-muted py-16"
            >
              <FolderOpen size={40} className="opacity-30" />
              <p className="text-sm">{t('cloudBrowser.empty')}</p>
            </div>
          )}

          {!loading && !error && files.length > 0 && (
            <>
              {/* Table header */}
              <div className="grid grid-cols-[32px_1fr_100px_160px_80px] gap-3 px-6 py-2 text-xs font-semibold text-text-muted border-b border-border bg-bg-secondary sticky top-0">
                <div />
                <div>Nome</div>
                <div className="text-right">{t('cloudBrowser.size')}</div>
                <div>{t('cloudBrowser.modified')}</div>
                <div />
              </div>

              {/* Rows */}
              {files.map((file) => {
                const isGdoc = file.name.endsWith(' [Google Doc]');
                const isSelected = !file.isDir && selected.has(file.path);
                return (
                  <div
                    key={file.path}
                    className={cn(
                      'grid grid-cols-[32px_1fr_100px_160px_80px] gap-3 px-6 py-2.5 items-center hover:bg-bg-secondary/50 transition-colors text-sm border-b border-border/40',
                      isSelected && 'bg-brand/5',
                    )}
                  >
                    <div>
                      {!file.isDir && (
                        <input
                          type="checkbox"
                          data-testid={`checkbox-${file.name.replace(' [Google Doc]', '')}`}
                          checked={isSelected}
                          onChange={() => toggleSelect(file.path)}
                          className="rounded"
                        />
                      )}
                    </div>
                    <div className="flex items-center gap-2 min-w-0">
                      {file.isDir ? (
                        <button
                          data-testid={`folder-${file.name}`}
                          onClick={() => navigateTo(file.path)}
                          className="flex items-center gap-2 text-text-primary hover:text-brand transition-colors truncate"
                        >
                          <FolderOpen size={15} className="text-brand/70 shrink-0" />
                          <span className="truncate font-medium">{file.name}</span>
                        </button>
                      ) : (
                        <span className="flex items-center gap-2 truncate text-text-secondary">
                          <File size={15} className="shrink-0 opacity-40" />
                          <span className="truncate">{file.name}</span>
                          {isGdoc && (
                            <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded shrink-0">
                              Google Doc
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                    <div className="text-right text-xs text-text-muted font-mono">
                      {formatSize(file.size)}
                    </div>
                    <div className="text-xs text-text-muted truncate">
                      {file.modified ? new Date(file.modified).toLocaleDateString() : '—'}
                    </div>
                    <div className="flex items-center gap-1 justify-end">
                      {!file.isDir && !isGdoc && (
                        <>
                          <button
                            data-testid={`download-btn-${file.name}`}
                            onClick={() => handleDownload(file)}
                            disabled={operating}
                            className="p-1 rounded hover:bg-brand/20 hover:text-brand text-text-muted transition-colors disabled:opacity-40"
                            title={t('cloudBrowser.download')}
                          >
                            <Download size={14} />
                          </button>
                          <button
                            data-testid={`delete-btn-${file.name}`}
                            onClick={() => handleDelete([file.path])}
                            disabled={operating}
                            className="p-1 rounded hover:bg-red-500/20 hover:text-red-400 text-text-muted transition-colors disabled:opacity-40"
                            title={t('cloudBrowser.deleteSelected')}
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-2 border-t border-border text-xs text-text-muted flex items-center justify-between shrink-0">
          <span>
            {files.length} {files.length === 1 ? 'item' : 'itens'} · {currentPath || '/'}
          </span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run the tests**

Run: `npm test -- --reporter=verbose tests/components/CloudFileBrowserModal.test.tsx 2>&1`
Expected: all 12 tests PASS

- [ ] **Step 3: Run TypeScript check**

Run: `npm run typecheck 2>&1`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/components/CloudFileBrowserModal.tsx
git commit -m "feat(ui): CloudFileBrowserModal — browse, download, delete por perfil cloud"
```

---

## Task 10: SettingsPage Browse button + i18n

**Files:**

- Modify: `src/pages/SettingsPage.tsx`
- Modify: `src/i18n/locales/*/common.json` (all 15 locales)

- [ ] **Step 1: Add `CloudFileBrowserModal` import and state to `SettingsPage.tsx`**

Find the existing import block at the top of `SettingsPage.tsx` that includes `CloudProfileModal`:

```tsx
import { CloudProfileModal } from '@/components/CloudProfileModal';
```

Add after it:

```tsx
import { CloudFileBrowserModal } from '@/components/CloudFileBrowserModal';
import { FolderOpen } from 'lucide-react';
import type { CloudProfile } from '@/store/cloud';
```

- [ ] **Step 2: Add state for the browser modal**

Find in `SettingsPage.tsx` the existing state variable:

```tsx
const [cloudModalOpen, setCloudModalOpen] = useState(false);
```

Add after it:

```tsx
const [browseProfile, setBrowseProfile] = useState<CloudProfile | null>(null);
```

- [ ] **Step 3: Add Browse button to each profile card**

Find the profile card buttons section in `SettingsPage.tsx` (around line 1346):

```tsx
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingProfile(profile);
                          setCloudModalOpen(true);
                        }}
```

Add the Browse button **before** the Edit button:

```tsx
                    <div className="flex gap-2">
                      <button
                        onClick={() => profile.provider !== 'icloud' ? setBrowseProfile(profile) : undefined}
                        disabled={profile.provider === 'icloud'}
                        title={
                          profile.provider === 'icloud'
                            ? 'Navegação não suportada para iCloud'
                            : 'Navegar ficheiros'
                        }
                        className={cn(
                          'flex items-center gap-1.5 text-xs border border-gray-600 rounded px-2 py-1 transition-colors',
                          profile.provider === 'icloud'
                            ? 'text-gray-600 cursor-not-allowed opacity-40'
                            : 'text-gray-400 hover:text-white',
                        )}
                      >
                        <FolderOpen size={12} />
                        Browse
                      </button>
```

- [ ] **Step 4: Add `CloudFileBrowserModal` to the JSX**

Find where `<CloudProfileModal` is rendered in `SettingsPage.tsx` (around line 1378) and add the browser modal after it:

```tsx
<CloudFileBrowserModal profile={browseProfile} onClose={() => setBrowseProfile(null)} />
```

- [ ] **Step 5: Add i18n keys to all 15 locale files**

Run this PowerShell script to add the `cloudBrowser` section to every locale. Add the block after the last `"logs"` section closing brace and before `"assetDetail"` in each file. The keys use English values for all locales (same pattern as existing untranslated keys):

```powershell
$block = @'
  "cloudBrowser": {
    "title": "Ficheiros em {{profile}}",
    "selectAll": "Sel. Todos",
    "selected": "{{count}} sel.",
    "download": "Download",
    "deleteSelected": "Apagar Seleccionados",
    "deleteAll": "Apagar Tudo",
    "confirmDeleteSelected": "Apagar {{count}} ficheiros de {{profile}}? Esta acção não pode ser desfeita.",
    "confirmDeleteAll": "Apagar TODOS os ficheiros em {{path}} de {{profile}}? Esta acção não pode ser desfeita.",
    "refresh": "Actualizar",
    "empty": "Pasta vazia",
    "connectionError": "Não foi possível ligar ao servidor.",
    "retry": "Tentar novamente",
    "downloadSuccess": "Ficheiro descarregado: {{name}}",
    "deletePartialError": "{{count}} ficheiros não foram apagados: {{names}}",
    "size": "Tamanho",
    "modified": "Modificado",
    "notSupported": "Navegação não suportada para iCloud"
  },
'@

foreach ($lang in @('en','pt','ar','de','es','fr','it','ja','ko','nl','pl','ru','sv','tr','zh')) {
  $file = "src/i18n/locales/$lang/common.json"
  $content = Get-Content $file -Raw -Encoding UTF8
  # Insert before "assetDetail"
  $content = $content -replace '(\s+"assetDetail")', "`n$block`$1"
  [System.IO.File]::WriteAllText($file, $content, [System.Text.Encoding]::UTF8)
  Write-Host "OK: $lang"
}
```

Run the script from `C:\Dev\nexora-desktop`:

```
cd C:\Dev\nexora-desktop
# paste and run the PowerShell block above
```

- [ ] **Step 6: TypeScript check**

Run: `npm run typecheck 2>&1`
Expected: no errors

- [ ] **Step 7: Run all tests**

Run: `npm test 2>&1 | tail -20`
Expected: all tests PASS

- [ ] **Step 8: Commit**

```bash
git add src/pages/SettingsPage.tsx src/i18n/locales/*/common.json
git commit -m "feat(settings): Browse button per cloud profile + i18n cloudBrowser keys"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement                                        | Task that implements it                                                      |
| ------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `RemoteFile` struct + trait `list_files`/`delete_files` | Task 1                                                                       |
| FTP list + delete                                       | Task 2                                                                       |
| SFTP list + delete                                      | Task 3                                                                       |
| SMB list + delete                                       | Task 4                                                                       |
| iCloud returns explicit Err                             | Task 4                                                                       |
| S3 list + delete                                        | Task 5                                                                       |
| Google Drive list + delete                              | Task 6                                                                       |
| 3 Tauri commands + registration                         | Task 7                                                                       |
| Unit tests                                              | Task 8                                                                       |
| `CloudFileBrowserModal` component                       | Task 9                                                                       |
| SettingsPage Browse button (disabled for iCloud)        | Task 10                                                                      |
| i18n keys                                               | Task 10                                                                      |
| Navigation limited to base_path                         | Enforced by provider: `full_remote_path(subpath)` never goes above base_path |
| Breadcrumb navigation                                   | Task 9 (`navigateTo` + breadcrumb rendering)                                 |
| Download: native save dialog defaulting to filename     | Task 9 (`save({ defaultPath: file.name })`)                                  |
| Error banner + retry                                    | Task 9 (`browser-error` + retry button)                                      |
| Delete with confirmation                                | Task 9 (`window.confirm`)                                                    |
| Partial delete failure → toast                          | Task 9 + Test in Task 8                                                      |
| Google Docs disabled in UI                              | Task 9 (isGdoc check; buttons hidden)                                        |

**Placeholder scan:** No TBDs, TODOs, or vague steps found.

**Type consistency:** `RemoteFile` defined once in `provider.rs` (Rust) and inline interface in `CloudFileBrowserModal.tsx` (TypeScript) — both use `camelCase` for `isDir`, consistent with `serde(rename_all = "camelCase")`. `cloud_list_files` → `cloudListFiles` in invoke → `invoke('cloud_list_files', { profileId, subpath })` — Tauri 2 uses snake_case command names with camelCase params, consistent with existing commands.
