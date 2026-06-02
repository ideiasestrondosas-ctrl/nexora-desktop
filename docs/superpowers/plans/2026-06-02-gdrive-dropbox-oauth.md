# Google Drive OAuth PKCE + Dropbox — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Authorization Code + PKCE OAuth flow for Google Drive (alongside existing Device Flow) and a full Dropbox cloud provider, with automatic token refresh for both.

**Architecture:** A new `cloud/credentials.rs` module centralises keychain helpers; `cloud/oauth.rs` provides a reusable PKCE listener and token exchange; `cloud/dropbox.rs` implements the CloudProvider trait; `commands/cloud.rs` gains a new `oauth_connect` command. The existing Device Flow commands are untouched. A bug in `load_profile_provider` (passes `config` as `creds`) is fixed as part of this work.

**Tech Stack:** Rust (tokio TcpListener, reqwest, sha2, rand, base64), React 19 + TypeScript, Tauri 2.x tauri-plugin-opener.

---

## File Map

| Action | Path                                   |
| ------ | -------------------------------------- |
| Create | `src-tauri/src/cloud/credentials.rs`   |
| Create | `src-tauri/src/cloud/oauth.rs`         |
| Create | `src-tauri/src/cloud/dropbox.rs`       |
| Modify | `src-tauri/src/cloud/mod.rs`           |
| Modify | `src-tauri/src/commands/cloud.rs`      |
| Modify | `src-tauri/src/lib.rs`                 |
| Modify | `src-tauri/Cargo.toml`                 |
| Modify | `src/store/cloud.ts`                   |
| Modify | `src/components/CloudProfileModal.tsx` |

---

## Task 1: Dependencies + `cloud/credentials.rs` + fix `load_profile_provider`

**Files:**

- Modify: `src-tauri/Cargo.toml`
- Create: `src-tauri/src/cloud/credentials.rs`
- Modify: `src-tauri/src/cloud/mod.rs`
- Modify: `src-tauri/src/commands/cloud.rs`

- [ ] **Step 1: Add missing Rust dependencies**

In `src-tauri/Cargo.toml`, add after the `base64` line:

```toml
rand = "0.8"
sha2 = "0.10"
```

- [ ] **Step 2: Create `src-tauri/src/cloud/credentials.rs`**

```rust
use keyring::Entry;

const KEYRING_SERVICE: &str = "nexora-cloud";

pub fn save(profile_id: &str, creds_json: &str) -> Result<(), String> {
    Entry::new(KEYRING_SERVICE, profile_id)
        .map_err(|e| format!("Keychain inacessível: {e}"))?
        .set_secret(creds_json.as_bytes())
        .map_err(|e| format!("Falha ao guardar credenciais no keychain: {e}"))
}

pub fn load(profile_id: &str) -> serde_json::Value {
    Entry::new(KEYRING_SERVICE, profile_id)
        .ok()
        .and_then(|e| e.get_secret().ok())
        .and_then(|b| serde_json::from_slice(&b).ok())
        .unwrap_or(serde_json::Value::Object(Default::default()))
}

pub fn delete(profile_id: &str) {
    if let Ok(entry) = Entry::new(KEYRING_SERVICE, profile_id) {
        let _ = entry.delete_credential();
    }
}
```

- [ ] **Step 3: Expose `credentials` in `src-tauri/src/cloud/mod.rs`**

Add `pub mod credentials;` as the first line of the file (before `pub mod ftp`):

```rust
pub mod credentials;
pub mod ftp;
pub mod gdrive;
pub mod icloud;
pub mod oauth;      // will exist after Task 2
pub mod provider;
pub mod retry;
pub mod s3;
pub mod sftp;
pub mod smb;
```

Keep only `pub mod credentials;` for now — add `pub mod oauth;` in Task 2 and `pub mod dropbox;` in Task 4.

- [ ] **Step 4: Replace inline credential helpers in `src-tauri/src/commands/cloud.rs`**

Remove the three private functions at lines 12–31 (the `save_credentials`, `load_credentials`, and `delete_credentials` private fns). Replace all call sites:

| Old                                         | New                                                 |
| ------------------------------------------- | --------------------------------------------------- |
| `save_credentials(&id, &credentials_json)?` | `cloud::credentials::save(&id, &credentials_json)?` |
| `load_credentials(&profile_id)`             | `cloud::credentials::load(&profile_id)`             |
| `delete_credentials(&id)`                   | `cloud::credentials::delete(&id)`                   |

There are 4 occurrences total: lines 93, 120, 133, 286.

- [ ] **Step 5: Fix `load_profile_provider` — make it async and load creds from keychain**

Replace the existing `fn load_profile_provider` (non-async, passes config as creds) with:

```rust
async fn load_profile_provider(
    profile_id: &str,
    state: &tauri::State<'_, AppState>,
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
    let creds = cloud::credentials::load(profile_id);
    let provider = cloud::get_provider(&provider_type, &config, &creds)?;
    Ok((provider, provider_type))
}
```

- [ ] **Step 6: Add `.await` to the three callers of `load_profile_provider`**

In `cloud_list_files`, `cloud_delete_files`, and `cloud_download_file`, change:

```rust
let (provider, _) = load_profile_provider(&profile_id, &state)?;
```

to:

```rust
let (provider, _) = load_profile_provider(&profile_id, &state).await?;
```

- [ ] **Step 7: Verify it compiles**

```bash
cd src-tauri && cargo check 2>&1 | head -40
```

Expected: no errors. Warnings about unused `oauth` module are OK (it doesn't exist yet).

- [ ] **Step 8: Commit**

```bash
git add src-tauri/Cargo.toml src-tauri/src/cloud/credentials.rs src-tauri/src/cloud/mod.rs src-tauri/src/commands/cloud.rs
git commit -m "refactor(cloud): extrair credentials para cloud/credentials.rs e corrigir load_profile_provider"
```

---

## Task 2: `cloud/oauth.rs` — PKCE, listener localhost, troca de tokens

**Files:**

- Create: `src-tauri/src/cloud/oauth.rs`
- Modify: `src-tauri/src/cloud/mod.rs`

- [ ] **Step 1: Add `pub mod oauth;` to `cloud/mod.rs`**

The file should now read:

```rust
pub mod credentials;
pub mod dropbox;    // add in Task 4 — leave commented for now: // pub mod dropbox;
pub mod ftp;
pub mod gdrive;
pub mod icloud;
pub mod oauth;
pub mod provider;
pub mod retry;
pub mod s3;
pub mod sftp;
pub mod smb;
```

For now add `pub mod oauth;` but NOT `pub mod dropbox;` yet.

- [ ] **Step 2: Write unit test for PKCE generation first**

Create `src-tauri/src/cloud/oauth.rs` with only the test:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pkce_verifier_is_base64url() {
        let p = generate_pkce();
        // Base64URL uses only [A-Za-z0-9_-] and no padding
        assert!(p.verifier.chars().all(|c| c.is_alphanumeric() || c == '_' || c == '-'));
        assert!(!p.verifier.contains('='));
    }

    #[test]
    fn pkce_challenge_differs_from_verifier() {
        let p = generate_pkce();
        assert_ne!(p.verifier, p.challenge);
        // challenge is also valid base64url
        assert!(p.challenge.chars().all(|c| c.is_alphanumeric() || c == '_' || c == '-'));
    }

    #[test]
    fn find_free_port_returns_valid_port() {
        let port = find_free_port().expect("deve encontrar uma porta livre");
        assert!(port >= 8080 && port <= 8090);
    }
}
```

- [ ] **Step 3: Run test to confirm it fails**

```bash
cd src-tauri && cargo test cloud::oauth 2>&1 | tail -20
```

Expected: compile error — `generate_pkce` and `find_free_port` not defined.

- [ ] **Step 4: Implement the full `cloud/oauth.rs`**

```rust
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
use rand::RngCore;
use serde::Serialize;
use sha2::{Digest, Sha256};

// ── Types ─────────────────────────────────────────────────────────────────────

pub enum OAuthProvider {
    GDrive,
    Dropbox,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct OAuthTokens {
    pub access_token: String,
    pub refresh_token: Option<String>,
    pub expires_in: u64,
    pub account_info: String,
}

pub struct PkceParams {
    pub verifier: String,
    pub challenge: String,
}

// ── PKCE ──────────────────────────────────────────────────────────────────────

pub fn generate_pkce() -> PkceParams {
    let mut bytes = [0u8; 32];
    rand::thread_rng().fill_bytes(&mut bytes);
    let verifier = URL_SAFE_NO_PAD.encode(bytes);

    let mut hasher = Sha256::new();
    hasher.update(verifier.as_bytes());
    let hash = hasher.finalize();
    let challenge = URL_SAFE_NO_PAD.encode(hash);

    PkceParams { verifier, challenge }
}

// ── Port ──────────────────────────────────────────────────────────────────────

pub fn find_free_port() -> Result<u16, String> {
    for port in 8080..=8090u16 {
        if std::net::TcpListener::bind(format!("127.0.0.1:{port}")).is_ok() {
            return Ok(port);
        }
    }
    Err("Portas 8080–8090 todas ocupadas. Verifique processos em execução.".to_string())
}

// ── Callback listener ─────────────────────────────────────────────────────────

pub async fn await_oauth_callback(port: u16) -> Result<String, String> {
    use tokio::io::{AsyncReadExt, AsyncWriteExt};
    use tokio::net::TcpListener;
    use tokio::time::{timeout, Duration};

    let listener = TcpListener::bind(format!("127.0.0.1:{port}"))
        .await
        .map_err(|e| format!("Não foi possível iniciar listener OAuth na porta {port}: {e}"))?;

    timeout(Duration::from_secs(120), async {
        let (mut stream, _) = listener.accept().await.map_err(|e| e.to_string())?;
        let mut buf = vec![0u8; 8192];
        let n = stream.read(&mut buf).await.map_err(|e| e.to_string())?;
        let request = String::from_utf8_lossy(&buf[..n]);

        // Extract `code` from: GET /callback?code=xxx&state=yyy HTTP/1.1
        let code = request
            .lines()
            .next()
            .and_then(|line| line.split('?').nth(1))
            .and_then(|query| {
                let end = query.find(' ').unwrap_or(query.len());
                extract_query_param(&query[..end], "code")
            })
            .ok_or_else(|| {
                "Parâmetro 'code' não encontrado na resposta OAuth".to_string()
            })?;

        let html = "<html><head><meta charset='utf-8'></head>\
            <body style='font-family:sans-serif;padding:40px;text-align:center'>\
            <h2>&#10003; Autorizado!</h2>\
            <p>Pode fechar esta janela e regressar ao <strong>Nexora Desktop</strong>.</p>\
            </body></html>";
        let response = format!(
            "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\n\
             Content-Length: {}\r\nConnection: close\r\n\r\n{}",
            html.len(),
            html
        );
        let _ = stream.write_all(response.as_bytes()).await;

        Ok(code)
    })
    .await
    .map_err(|_| "Tempo de autorização esgotado (120 segundos). Tente de novo.".to_string())?
}

fn extract_query_param(query: &str, key: &str) -> Option<String> {
    for pair in query.split('&') {
        if let Some((k, v)) = pair.split_once('=') {
            if k == key {
                return Some(v.to_string());
            }
        }
    }
    None
}

// ── Token exchange ────────────────────────────────────────────────────────────

pub async fn exchange_code(
    provider: &OAuthProvider,
    code: &str,
    verifier: &str,
    client_id: &str,
    redirect_uri: &str,
) -> Result<OAuthTokens, String> {
    let client = reqwest::Client::new();

    let token_url = match provider {
        OAuthProvider::GDrive => "https://oauth2.googleapis.com/token",
        OAuthProvider::Dropbox => "https://api.dropboxapi.com/oauth2/token",
    };

    let params = [
        ("grant_type", "authorization_code"),
        ("code", code),
        ("redirect_uri", redirect_uri),
        ("client_id", client_id),
        ("code_verifier", verifier),
    ];

    let resp = client
        .post(token_url)
        .form(&params)
        .send()
        .await
        .map_err(|e| format!("Falha na troca de tokens: {e}"))?;

    let body: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;

    if let Some(err) = body["error"].as_str() {
        let desc = body["error_description"].as_str().unwrap_or(err);
        return Err(format!("OAuth falhou: {desc}"));
    }

    let access_token = body["access_token"]
        .as_str()
        .ok_or("Resposta OAuth sem access_token")?
        .to_string();
    let refresh_token = body["refresh_token"].as_str().map(|s| s.to_string());
    let expires_in = body["expires_in"].as_u64().unwrap_or(3600);

    let account_info = fetch_account_info(&client, provider, &access_token)
        .await
        .unwrap_or_else(|_| "Conta autenticada".to_string());

    Ok(OAuthTokens {
        access_token,
        refresh_token,
        expires_in,
        account_info,
    })
}

async fn fetch_account_info(
    client: &reqwest::Client,
    provider: &OAuthProvider,
    access_token: &str,
) -> Result<String, String> {
    match provider {
        OAuthProvider::GDrive => {
            let resp = client
                .get("https://www.googleapis.com/oauth2/v2/userinfo?fields=email")
                .bearer_auth(access_token)
                .send()
                .await
                .map_err(|e| e.to_string())?;
            let body: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
            Ok(body["email"].as_str().unwrap_or("").to_string())
        }
        OAuthProvider::Dropbox => {
            let resp = client
                .post("https://api.dropboxapi.com/2/users/get_current_account")
                .bearer_auth(access_token)
                .header("Content-Type", "application/json")
                .body("null")
                .send()
                .await
                .map_err(|e| e.to_string())?;
            let body: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
            Ok(body["name"]["display_name"]
                .as_str()
                .unwrap_or("")
                .to_string())
        }
    }
}

// ── Token refresh ─────────────────────────────────────────────────────────────

/// Verifica se o access_token está a expirar em <5 min e, se sim, renova-o.
/// Actualiza `creds` em memória (oauth_token + token_expiry ± oauth_refresh).
/// O chamador é responsável por persistir as creds actualizadas no keychain.
/// Devolve `true` se refrescou, `false` se ainda válido.
pub async fn refresh_if_needed(
    creds: &mut serde_json::Value,
    provider: &OAuthProvider,
    client_id: &str,
) -> Result<bool, String> {
    let refresh_token = match creds["oauth_refresh"].as_str() {
        Some(t) if !t.is_empty() => t.to_string(),
        _ => return Ok(false), // sem refresh token → nada a fazer
    };

    // Se não há token_expiry, assume expirado
    let should_refresh = match creds["token_expiry"].as_str() {
        Some(s) => match chrono::DateTime::parse_from_rfc3339(s) {
            Ok(expiry) => {
                let margin = chrono::Duration::minutes(5);
                chrono::Utc::now() + margin >= expiry.with_timezone(&chrono::Utc)
            }
            Err(_) => true,
        },
        None => true,
    };

    if !should_refresh {
        return Ok(false);
    }

    let client = reqwest::Client::new();
    let token_url = match provider {
        OAuthProvider::GDrive => "https://oauth2.googleapis.com/token",
        OAuthProvider::Dropbox => "https://api.dropboxapi.com/oauth2/token",
    };

    let params = [
        ("grant_type", "refresh_token"),
        ("refresh_token", &refresh_token),
        ("client_id", client_id),
    ];

    let resp = client
        .post(token_url)
        .form(&params)
        .send()
        .await
        .map_err(|e| format!("Refresh falhou: {e}"))?;

    let body: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;

    if let Some(err) = body["error"].as_str() {
        return Err(format!(
            "Sessão expirada — reautentique o perfil ({})",
            err
        ));
    }

    let access_token = body["access_token"]
        .as_str()
        .ok_or("Refresh não devolveu access_token")?;
    let expires_in = body["expires_in"].as_u64().unwrap_or(3600);
    let expiry = chrono::Utc::now() + chrono::Duration::seconds(expires_in as i64);

    creds["oauth_token"] = serde_json::Value::String(access_token.to_string());
    creds["token_expiry"] = serde_json::Value::String(expiry.to_rfc3339());

    // Alguns providers rodam o refresh_token em cada uso
    if let Some(new_refresh) = body["refresh_token"].as_str() {
        creds["oauth_refresh"] = serde_json::Value::String(new_refresh.to_string());
    }

    Ok(true)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pkce_verifier_is_base64url() {
        let p = generate_pkce();
        assert!(p.verifier.chars().all(|c| c.is_alphanumeric() || c == '_' || c == '-'));
        assert!(!p.verifier.contains('='));
    }

    #[test]
    fn pkce_challenge_differs_from_verifier() {
        let p = generate_pkce();
        assert_ne!(p.verifier, p.challenge);
        assert!(p.challenge.chars().all(|c| c.is_alphanumeric() || c == '_' || c == '-'));
    }

    #[test]
    fn find_free_port_returns_valid_port() {
        let port = find_free_port().expect("deve encontrar uma porta livre");
        assert!((8080..=8090).contains(&port));
    }

    #[test]
    fn extract_query_param_finds_code() {
        assert_eq!(
            extract_query_param("code=abc123&state=xyz", "code"),
            Some("abc123".to_string())
        );
    }

    #[test]
    fn extract_query_param_returns_none_when_missing() {
        assert_eq!(extract_query_param("state=xyz", "code"), None);
    }
}
```

- [ ] **Step 5: Run tests**

```bash
cd src-tauri && cargo test cloud::oauth 2>&1 | tail -20
```

Expected: 5 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src-tauri/src/cloud/oauth.rs src-tauri/src/cloud/mod.rs
git commit -m "feat(cloud): oauth.rs — PKCE, listener localhost, exchange_code, refresh_if_needed"
```

---

## Task 3: Comando `oauth_connect` + refresh automático em `load_profile_provider`

**Files:**

- Modify: `src-tauri/src/commands/cloud.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Add `oauth_connect` command to `src-tauri/src/commands/cloud.rs`**

Add at the end of the file (after `cloud_delete_files`):

```rust
// ── OAuth PKCE connect ────────────────────────────────────────────────────────

#[tauri::command]
pub async fn oauth_connect(
    provider: String,
    client_id: String,
    app: tauri::AppHandle,
) -> Result<cloud::oauth::OAuthTokens, String> {
    use tauri_plugin_opener::OpenerExt;

    let oauth_provider = match provider.as_str() {
        "gdrive" => cloud::oauth::OAuthProvider::GDrive,
        "dropbox" => cloud::oauth::OAuthProvider::Dropbox,
        other => return Err(format!("Provider OAuth desconhecido: {other}")),
    };

    let pkce = cloud::oauth::generate_pkce();
    let port = cloud::oauth::find_free_port()?;
    let redirect_uri = format!("http://127.0.0.1:{port}/callback");

    let auth_url = match oauth_provider {
        cloud::oauth::OAuthProvider::GDrive => format!(
            "https://accounts.google.com/o/oauth2/v2/auth\
             ?client_id={client_id}\
             &response_type=code\
             &redirect_uri={redirect_uri}\
             &scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fdrive\
             &code_challenge={challenge}\
             &code_challenge_method=S256\
             &access_type=offline\
             &prompt=consent",
            redirect_uri = urlencoding_encode(&redirect_uri),
            challenge = pkce.challenge,
        ),
        cloud::oauth::OAuthProvider::Dropbox => format!(
            "https://www.dropbox.com/oauth2/authorize\
             ?client_id={client_id}\
             &response_type=code\
             &redirect_uri={redirect_uri}\
             &code_challenge={challenge}\
             &code_challenge_method=S256\
             &token_access_type=offline",
            redirect_uri = urlencoding_encode(&redirect_uri),
            challenge = pkce.challenge,
        ),
    };

    app.opener()
        .open_url(&auth_url, None::<&str>)
        .map_err(|e| format!("Falha ao abrir browser: {e}"))?;

    let code = cloud::oauth::await_oauth_callback(port).await?;

    cloud::oauth::exchange_code(
        &oauth_provider,
        &code,
        &pkce.verifier,
        &client_id,
        &redirect_uri,
    )
    .await
}

fn urlencoding_encode(s: &str) -> String {
    s.chars()
        .flat_map(|c| match c {
            'A'..='Z' | 'a'..='z' | '0'..='9' | '-' | '_' | '.' | '~' => {
                vec![c]
            }
            _ => format!("%{:02X}", c as u32).chars().collect(),
        })
        .collect()
}
```

- [ ] **Step 2: Add refresh call to `load_profile_provider`**

Update the `load_profile_provider` function (created in Task 1) to add refresh for OAuth providers:

```rust
async fn load_profile_provider(
    profile_id: &str,
    state: &tauri::State<'_, AppState>,
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
    let mut creds = cloud::credentials::load(profile_id);

    // Refresh automático para providers OAuth
    if matches!(provider_type.as_str(), "gdrive" | "dropbox") {
        let oauth_provider = match provider_type.as_str() {
            "gdrive" => cloud::oauth::OAuthProvider::GDrive,
            _ => cloud::oauth::OAuthProvider::Dropbox,
        };
        let client_id = config["client_id"].as_str().unwrap_or("");
        if cloud::oauth::refresh_if_needed(&mut creds, &oauth_provider, client_id).await? {
            let updated = creds.to_string();
            cloud::credentials::save(profile_id, &updated)?;
        }
    }

    let provider = cloud::get_provider(&provider_type, &config, &creds)?;
    Ok((provider, provider_type))
}
```

- [ ] **Step 3: Register `oauth_connect` in `src-tauri/src/lib.rs`**

Find the `.invoke_handler(tauri::generate_handler![` block and add `commands::cloud::oauth_connect` after `commands::cloud::gdrive_poll_auth`:

```rust
commands::cloud::gdrive_poll_auth,
commands::cloud::oauth_connect,   // ← add this line
commands::cloud::cloud_list_files,
```

- [ ] **Step 4: Verify compilation**

```bash
cd src-tauri && cargo check 2>&1 | head -40
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/commands/cloud.rs src-tauri/src/lib.rs
git commit -m "feat(cloud): comando oauth_connect (PKCE) + refresh automático em load_profile_provider"
```

---

## Task 4: Provider Dropbox (`cloud/dropbox.rs`)

**Files:**

- Create: `src-tauri/src/cloud/dropbox.rs`
- Modify: `src-tauri/src/cloud/mod.rs`

- [ ] **Step 1: Write unit tests first**

Create `src-tauri/src/cloud/dropbox.rs` with only the tests:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    fn make_config(base_path: &str) -> serde_json::Value {
        serde_json::json!({ "base_path": base_path })
    }

    fn make_creds(token: &str) -> serde_json::Value {
        serde_json::json!({ "oauth_token": token })
    }

    #[test]
    fn new_normalises_base_path_without_leading_slash() {
        let p = DropboxProvider::new(&make_config("Nexora/Output"), &make_creds("tok")).unwrap();
        assert_eq!(p.base_path, "/Nexora/Output");
    }

    #[test]
    fn new_preserves_leading_slash() {
        let p = DropboxProvider::new(&make_config("/Nexora/Output"), &make_creds("tok")).unwrap();
        assert_eq!(p.base_path, "/Nexora/Output");
    }

    #[test]
    fn new_defaults_base_path_when_absent() {
        let p = DropboxProvider::new(&serde_json::json!({}), &make_creds("tok")).unwrap();
        assert_eq!(p.base_path, "/Nexora/Output");
    }

    #[test]
    fn dest_path_combines_base_and_filename() {
        let p = DropboxProvider::new(&make_config("/Nexora"), &make_creds("tok")).unwrap();
        let dest = p.dest_path("video.mp4");
        assert_eq!(dest, "/Nexora/video.mp4");
    }
}
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd src-tauri && cargo test cloud::dropbox 2>&1 | tail -10
```

Expected: compile error — `DropboxProvider` not defined.

- [ ] **Step 3: Implement `src-tauri/src/cloud/dropbox.rs`**

```rust
use super::provider::{CloudProvider, RemoteFile};
use async_trait::async_trait;
use std::path::Path;

const SIMPLE_UPLOAD_LIMIT: usize = 150 * 1024 * 1024; // 150 MB
const CHUNK_SIZE: usize = 128 * 1024 * 1024;           // 128 MB

pub struct DropboxProvider {
    pub(crate) creds: serde_json::Value,
    pub(crate) base_path: String,
}

impl DropboxProvider {
    pub fn new(config: &serde_json::Value, creds: &serde_json::Value) -> Result<Self, String> {
        let raw = config["base_path"]
            .as_str()
            .unwrap_or("/Nexora/Output")
            .to_string();
        let base_path = if raw.starts_with('/') {
            raw
        } else {
            format!("/{raw}")
        };
        Ok(Self {
            creds: creds.clone(),
            base_path,
        })
    }

    /// Constrói o caminho completo no Dropbox para um ficheiro.
    pub(crate) fn dest_path(&self, filename: &str) -> String {
        format!(
            "{}/{}",
            self.base_path.trim_end_matches('/'),
            filename.trim_start_matches('/')
        )
    }

    fn token(&self) -> Result<&str, String> {
        self.creds["oauth_token"]
            .as_str()
            .ok_or_else(|| "Token Dropbox não encontrado — reautentique o perfil".to_string())
    }
}

#[async_trait]
impl CloudProvider for DropboxProvider {
    fn provider_type(&self) -> &'static str {
        "dropbox"
    }

    async fn test_connection(&self) -> Result<(), String> {
        let token = self.token()?;
        let client = reqwest::Client::new();
        let resp = client
            .post("https://api.dropboxapi.com/2/users/get_current_account")
            .bearer_auth(token)
            .header("Content-Type", "application/json")
            .body("null")
            .send()
            .await
            .map_err(|e| format!("Dropbox inacessível: {e}"))?;

        if resp.status().is_success() {
            Ok(())
        } else if resp.status().as_u16() == 401 {
            Err("Token expirado — reautentique o perfil".to_string())
        } else {
            Err(format!("Dropbox erro: {}", resp.status()))
        }
    }

    async fn upload(&self, local_path: &Path, remote_path: &str) -> Result<String, String> {
        let token = self.token()?;
        let data = tokio::fs::read(local_path).await.map_err(|e| e.to_string())?;
        let size = data.len();
        let dest = self.dest_path(
            Path::new(remote_path)
                .file_name()
                .unwrap_or_default()
                .to_str()
                .unwrap_or(remote_path),
        );
        let client = reqwest::Client::new();

        if size <= SIMPLE_UPLOAD_LIMIT {
            let arg = serde_json::json!({
                "path": dest,
                "mode": "overwrite",
                "autorename": false,
            });
            let resp = client
                .post("https://content.dropboxapi.com/2/files/upload")
                .bearer_auth(token)
                .header("Dropbox-API-Arg", arg.to_string())
                .header("Content-Type", "application/octet-stream")
                .body(data)
                .send()
                .await
                .map_err(|e| format!("Dropbox upload falhou: {e}"))?;

            if !resp.status().is_success() {
                let status = resp.status();
                let detail = resp.text().await.unwrap_or_default();
                return Err(format!("Dropbox upload erro {status}: {detail}"));
            }
            let body: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
            return Ok(body["path_display"].as_str().unwrap_or(&dest).to_string());
        }

        // Upload session para ficheiros >150 MB
        // 1. Start — enviar primeiro chunk
        let first_chunk = data[..CHUNK_SIZE.min(size)].to_vec();
        let start_resp = client
            .post("https://content.dropboxapi.com/2/files/upload_session/start")
            .bearer_auth(token)
            .header("Dropbox-API-Arg", r#"{"close":false}"#)
            .header("Content-Type", "application/octet-stream")
            .body(first_chunk)
            .send()
            .await
            .map_err(|e| format!("Dropbox upload session start falhou: {e}"))?;

        if !start_resp.status().is_success() {
            return Err(format!(
                "Dropbox upload session start erro: {}",
                start_resp.status()
            ));
        }
        let start_body: serde_json::Value =
            start_resp.json().await.map_err(|e| e.to_string())?;
        let session_id = start_body["session_id"]
            .as_str()
            .ok_or("Dropbox não devolveu session_id")?
            .to_string();

        // 2. Append chunks intermédios
        let mut offset = CHUNK_SIZE.min(size);
        while offset + CHUNK_SIZE < size {
            let chunk = data[offset..offset + CHUNK_SIZE].to_vec();
            let arg = serde_json::json!({
                "cursor": { "session_id": &session_id, "offset": offset },
                "close": false,
            });
            let resp = client
                .post("https://content.dropboxapi.com/2/files/upload_session/append_v2")
                .bearer_auth(token)
                .header("Dropbox-API-Arg", arg.to_string())
                .header("Content-Type", "application/octet-stream")
                .body(chunk)
                .send()
                .await
                .map_err(|e| format!("Dropbox upload session append falhou: {e}"))?;

            if !resp.status().is_success() {
                return Err(format!(
                    "Dropbox upload session append erro: {}",
                    resp.status()
                ));
            }
            offset += CHUNK_SIZE;
        }

        // 3. Finish com dados restantes
        let remaining = data[offset..].to_vec();
        let finish_arg = serde_json::json!({
            "cursor": { "session_id": &session_id, "offset": offset },
            "commit": { "path": dest, "mode": "overwrite", "autorename": false },
        });
        let finish_resp = client
            .post("https://content.dropboxapi.com/2/files/upload_session/finish")
            .bearer_auth(token)
            .header("Dropbox-API-Arg", finish_arg.to_string())
            .header("Content-Type", "application/octet-stream")
            .body(remaining)
            .send()
            .await
            .map_err(|e| format!("Dropbox upload session finish falhou: {e}"))?;

        if !finish_resp.status().is_success() {
            let status = finish_resp.status();
            let detail = finish_resp.text().await.unwrap_or_default();
            return Err(format!("Dropbox upload session finish erro {status}: {detail}"));
        }
        let body: serde_json::Value = finish_resp.json().await.map_err(|e| e.to_string())?;
        Ok(body["path_display"].as_str().unwrap_or(&dest).to_string())
    }

    async fn download(&self, remote_path: &str, local_path: &Path) -> Result<(), String> {
        let token = self.token()?;
        let client = reqwest::Client::new();
        let arg = serde_json::json!({ "path": remote_path });
        let resp = client
            .post("https://content.dropboxapi.com/2/files/download")
            .bearer_auth(token)
            .header("Dropbox-API-Arg", arg.to_string())
            .send()
            .await
            .map_err(|e| format!("Dropbox download falhou: {e}"))?;

        if !resp.status().is_success() {
            return Err(format!("Dropbox download erro: HTTP {}", resp.status()));
        }
        let bytes = resp.bytes().await.map_err(|e| e.to_string())?;
        if let Some(parent) = local_path.parent() {
            tokio::fs::create_dir_all(parent)
                .await
                .map_err(|e| e.to_string())?;
        }
        tokio::fs::write(local_path, bytes)
            .await
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    async fn list_files(&self, path: &str) -> Result<Vec<RemoteFile>, String> {
        let token = self.token()?;
        let client = reqwest::Client::new();

        let list_path = if path.is_empty() {
            self.base_path.clone()
        } else {
            format!(
                "{}/{}",
                self.base_path.trim_end_matches('/'),
                path.trim_start_matches('/')
            )
        };

        let mut files = Vec::new();
        let mut cursor: Option<String> = None;

        loop {
            let (url, body) = match &cursor {
                Some(c) => (
                    "https://api.dropboxapi.com/2/files/list_folder/continue",
                    serde_json::json!({ "cursor": c }),
                ),
                None => (
                    "https://api.dropboxapi.com/2/files/list_folder",
                    serde_json::json!({ "path": list_path, "recursive": false }),
                ),
            };

            let resp = client
                .post(url)
                .bearer_auth(token)
                .json(&body)
                .send()
                .await
                .map_err(|e| format!("Dropbox list falhou: {e}"))?;

            if resp.status().as_u16() == 401 {
                return Err("Sessão expirada — reautentique o perfil".to_string());
            }
            if !resp.status().is_success() {
                return Err(format!("Dropbox list erro: HTTP {}", resp.status()));
            }

            let data: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;

            for entry in data["entries"].as_array().cloned().unwrap_or_default() {
                let tag = entry[".tag"].as_str().unwrap_or("");
                let name = entry["name"].as_str().unwrap_or("").to_string();
                let path_display = entry["path_display"].as_str().unwrap_or("").to_string();
                let is_dir = tag == "folder";
                let size = entry["size"].as_u64();
                let modified = entry["server_modified"].as_str().map(|s| s.to_string());
                if name.is_empty() {
                    continue;
                }
                files.push(RemoteFile {
                    name,
                    path: path_display,
                    size,
                    modified,
                    is_dir,
                });
            }

            if !data["has_more"].as_bool().unwrap_or(false) {
                break;
            }
            cursor = data["cursor"].as_str().map(|s| s.to_string());
        }

        Ok(files)
    }

    async fn delete_files(&self, paths: &[String]) -> Result<Vec<String>, String> {
        let token = self.token()?;
        let client = reqwest::Client::new();
        let mut failed = Vec::new();

        for path in paths {
            match client
                .post("https://api.dropboxapi.com/2/files/delete_v2")
                .bearer_auth(token)
                .json(&serde_json::json!({ "path": path }))
                .send()
                .await
            {
                Ok(r) if r.status().is_success() => {}
                Ok(r) => failed.push(format!("{path}: HTTP {}", r.status())),
                Err(e) => failed.push(format!("{path}: {e}")),
            }
        }

        Ok(failed)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_config(base_path: &str) -> serde_json::Value {
        serde_json::json!({ "base_path": base_path })
    }

    fn make_creds(token: &str) -> serde_json::Value {
        serde_json::json!({ "oauth_token": token })
    }

    #[test]
    fn new_normalises_base_path_without_leading_slash() {
        let p = DropboxProvider::new(&make_config("Nexora/Output"), &make_creds("tok")).unwrap();
        assert_eq!(p.base_path, "/Nexora/Output");
    }

    #[test]
    fn new_preserves_leading_slash() {
        let p = DropboxProvider::new(&make_config("/Nexora/Output"), &make_creds("tok")).unwrap();
        assert_eq!(p.base_path, "/Nexora/Output");
    }

    #[test]
    fn new_defaults_base_path_when_absent() {
        let p = DropboxProvider::new(&serde_json::json!({}), &make_creds("tok")).unwrap();
        assert_eq!(p.base_path, "/Nexora/Output");
    }

    #[test]
    fn dest_path_combines_base_and_filename() {
        let p = DropboxProvider::new(&make_config("/Nexora"), &make_creds("tok")).unwrap();
        assert_eq!(p.dest_path("video.mp4"), "/Nexora/video.mp4");
    }
}
```

- [ ] **Step 4: Expose dropbox in `cloud/mod.rs` and register in `get_provider`**

Add `pub mod dropbox;` to `cloud/mod.rs`.

In `get_provider`, add after the `"s3"` arm:

```rust
"dropbox" => dropbox::DropboxProvider::new(config, creds)
    .map(|p| Box::new(p) as Box<dyn CloudProvider>)
    .map_err(|e| format!("Perfil Dropbox inválido: {e}")),
```

- [ ] **Step 5: Run unit tests**

```bash
cd src-tauri && cargo test cloud::dropbox 2>&1 | tail -15
```

Expected: 4 tests pass.

- [ ] **Step 6: Full cargo check**

```bash
cd src-tauri && cargo check 2>&1 | head -40
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src-tauri/src/cloud/dropbox.rs src-tauri/src/cloud/mod.rs
git commit -m "feat(cloud): provider Dropbox com upload session para ficheiros >150MB"
```

---

## Task 5: Frontend — `src/store/cloud.ts`

**Files:**

- Modify: `src/store/cloud.ts`

- [ ] **Step 1: Add `dropbox` to type, labels, and fields**

In `src/store/cloud.ts`, make three changes:

**1 — CloudProfile provider union (line 4):**

```typescript
provider: 'ftp' | 'sftp' | 'smb' | 's3' | 'gdrive' | 'dropbox' | 'icloud';
```

**2 — PROVIDER_LABELS (after `gdrive` entry):**

```typescript
dropbox: 'Dropbox',
```

**3 — PROVIDER_FIELDS (after the `gdrive` block):**

```typescript
dropbox: [
  {
    key: 'base_path',
    label: 'Pasta no Dropbox',
    type: 'text' as const,
    defaultValue: '/Nexora/Output',
  },
  { key: 'client_id', label: 'App Key', type: 'text' as const },
],
```

**4 — TAB_COUNTS update in `HelpModal.tsx`** — update `cloud: 6` to `cloud: 7` (one more card for Dropbox).

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors related to `cloud.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/store/cloud.ts src/components/HelpModal.tsx
git commit -m "feat(cloud): adicionar Dropbox a CloudProviderType, labels e fields"
```

---

## Task 6: Frontend — `CloudProfileModal.tsx` — OAuth shared UI

**Files:**

- Modify: `src/components/CloudProfileModal.tsx`

- [ ] **Step 1: Add TypeScript interface for OAuthTokens near the top of the component file**

After the imports, before the `Props` interface:

```typescript
interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  accountInfo: string;
}
```

- [ ] **Step 2: Add OAuth state variables to the component**

Inside `CloudProfileModal`, after the existing state declarations:

```typescript
const [oauthStatus, setOauthStatus] = useState<'idle' | 'connecting' | 'connected'>('idle');
const [oauthAccountInfo, setOauthAccountInfo] = useState('');
```

- [ ] **Step 3: Initialise OAuth status when modal opens in edit mode**

In the `useEffect` that handles `open` and `editing`, add after `setFields(editing.config)`:

```typescript
if (
  editing.config['oauth_token'] ||
  editing.provider === 'gdrive' ||
  editing.provider === 'dropbox'
) {
  // Considera autenticado se já existe token nos campos
  const existingToken = editing.config['oauth_token'] as string | undefined;
  if (existingToken) {
    setOauthStatus('connected');
    setOauthAccountInfo((editing.config['account_info'] as string) || '');
  } else {
    setOauthStatus('idle');
    setOauthAccountInfo('');
  }
}
```

And reset in the `else` branch (new profile):

```typescript
setOauthStatus('idle');
setOauthAccountInfo('');
```

- [ ] **Step 4: Add `handleOAuthConnect` function**

After `handleGDriveAuth` (the existing Device Flow handler), add:

```typescript
const handleOAuthConnect = async () => {
  const clientId = String(fields['client_id'] ?? '');
  if (!clientId) {
    toast.error('Preencha o Client ID / App Key primeiro');
    return;
  }
  setOauthStatus('connecting');
  try {
    const tokens = await invoke<OAuthTokens>('oauth_connect', {
      provider,
      clientId,
    });
    setField('oauth_token', tokens.accessToken);
    setField('oauth_refresh', tokens.refreshToken ?? '');
    setField('account_info', tokens.accountInfo);
    setOauthAccountInfo(tokens.accountInfo);
    setOauthStatus('connected');
    toast.success(`Autenticado como ${tokens.accountInfo}`);
  } catch (e) {
    setOauthStatus('idle');
    toast.error(`Autenticação falhou: ${e}`);
  }
};
```

- [ ] **Step 5: Replace the existing `provider === 'gdrive'` block with the shared OAuth block**

Find the block starting with `{provider === 'gdrive' && (` and replace it with:

```tsx
{
  (provider === 'gdrive' || provider === 'dropbox') && (
    <div className="bg-bg-secondary/50 rounded-lg p-3 space-y-3 mt-1">
      {/* Status */}
      <div className="flex items-center gap-2 text-xs">
        {oauthStatus === 'idle' && <span className="text-text-muted">● Não autenticado</span>}
        {oauthStatus === 'connecting' && (
          <span className="flex items-center gap-1.5 text-yellow-400">
            <Loader2 size={12} className="animate-spin" />A aguardar autorização no browser…
          </span>
        )}
        {oauthStatus === 'connected' && (
          <span className="flex items-center gap-1.5 text-green-400">
            <CheckCircle2 size={12} />
            {oauthAccountInfo || 'Conta autenticada'}
          </span>
        )}
      </div>

      {/* Primary: PKCE flow */}
      <button
        type="button"
        onClick={handleOAuthConnect}
        disabled={oauthStatus === 'connecting'}
        className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded px-3 py-1.5 text-xs w-full justify-center"
      >
        <ExternalLink size={12} />
        {oauthStatus === 'connecting'
          ? 'A autenticar…'
          : provider === 'gdrive'
            ? 'Conectar com Google Drive'
            : 'Conectar com Dropbox'}
      </button>

      {/* Fallback: Device Flow (apenas GDrive) */}
      {provider === 'gdrive' && (
        <div className="border-t border-border/30 pt-2">
          <p className="text-[10px] text-text-muted mb-1.5">
            Alternativa — autenticar com código (Device Flow):
          </p>
          <button
            type="button"
            onClick={handleGDriveAuth}
            disabled={gdrivePolling}
            className="text-xs text-text-muted hover:text-text-primary underline underline-offset-2"
          >
            {gdrivePolling ? 'A aguardar autorização…' : 'Autenticar com código'}
          </button>
          {gdriveAuthUrl && (
            <div className="mt-2 text-xs text-text-secondary space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-text-muted">Abra:</span>
                <button
                  type="button"
                  onClick={() => openUrl(gdriveAuthUrl)}
                  className="flex items-center gap-1 text-blue-400 hover:text-blue-300 underline break-all text-left"
                >
                  {gdriveAuthUrl}
                  <ExternalLink size={11} className="shrink-0" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-text-muted">Código:</span>
                <strong className="text-text-primary tracking-widest">{gdriveUserCode}</strong>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(gdriveUserCode)}
                  className="text-text-muted hover:text-text-primary"
                >
                  <Copy size={12} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/CloudProfileModal.tsx
git commit -m "feat(cloud): UI OAuth partilhada para GDrive e Dropbox — PKCE connect + Device Flow fallback"
```

---

## Task 7: Verificação manual

- [ ] **Step 1: Verificar compilação completa**

```bash
cd src-tauri && cargo build 2>&1 | tail -20
```

Expected: `Finished ... in Xs` sem erros.

- [ ] **Step 2: Verificar todos os testes Rust**

```bash
cd src-tauri && cargo test 2>&1 | tail -30
```

Expected: todos os testes passam (inclui os novos de `oauth` e `dropbox`).

- [ ] **Step 3: Iniciar a app em dev mode**

```bash
npm run tauri dev
```

- [ ] **Step 4: Checklist Dropbox**

```
□ Definições → Cloud → Novo Perfil → Tipo = Dropbox
□ Campos "Pasta no Dropbox" e "App Key" aparecem
□ Clicar "Conectar com Dropbox" → browser abre em dropbox.com/oauth2/authorize
□ Após autorizar → toast "Autenticado como [nome]" + status verde no modal
□ Clicar Criar → perfil aparece na lista
□ Clicar Testar Ligação no perfil guardado → sucesso
```

- [ ] **Step 5: Checklist GDrive PKCE**

```
□ Definições → Cloud → Novo Perfil → Tipo = Google Drive
□ Clicar "Conectar com Google Drive" → browser abre em accounts.google.com/o/oauth2/v2/auth
□ Após autorizar → toast "Autenticado como email@gmail.com" + status verde
□ Criar perfil → testar ligação → sucesso
□ Perfis GDrive já existentes (Device Flow) continuam a funcionar sem reautenticar
```

- [ ] **Step 6: Commit final**

```bash
git add -A
git commit -m "chore: verificação manual Google Drive PKCE + Dropbox concluída"
```

---

## Checklist de Self-Review

- [x] **Spec coverage:** credentials.rs (Task 1), oauth.rs PKCE+listener+exchange+refresh (Task 2+3), oauth_connect command (Task 3), dropbox.rs full provider (Task 4), store/cloud.ts (Task 5), CloudProfileModal.tsx (Task 6)
- [x] **Bug fix incluído:** `load_profile_provider` agora carrega creds do keychain (Task 1 Step 5)
- [x] **Backward compat:** Device Flow (`gdrive_start_auth`, `gdrive_poll_auth`) intocados; perfis existentes funcionam sem migração
- [x] **Tipos consistentes:** `OAuthTokens` definido em Rust (`oauth.rs`) e TypeScript (`CloudProfileModal.tsx`); campos camelCase via `#[serde(rename_all = "camelCase")]`
- [x] **Sem placeholders:** todo o código está escrito
- [x] **Dependências verificadas:** `rand` e `sha2` adicionados; `base64`, `reqwest`, `tokio::net`, `chrono` já presentes
