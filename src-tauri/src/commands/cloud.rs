use crate::cloud;
use crate::state::AppState;
use chrono::Utc;
use serde::Serialize;
use tauri::State;
use uuid::Uuid;

// ── Public types (sent to frontend) ──────────────────────────────────────────

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CloudProfile {
    pub id: String,
    pub name: String,
    pub provider: String,
    pub config: serde_json::Value,
    pub created_at: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct JobCloudDestination {
    pub profile_id: String,
    pub profile_name: String,
    pub status: String,
    pub error_msg: Option<String>,
    pub uploaded_at: Option<String>,
}

// ── Commands ─────────────────────────────────────────────────────────────────

#[tauri::command]
pub fn get_cloud_profiles(state: State<AppState>) -> Result<Vec<CloudProfile>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db
        .prepare("SELECT id, name, provider, config, created_at FROM cloud_profiles ORDER BY created_at DESC")
        .map_err(|e| e.to_string())?;
    let profiles = stmt
        .query_map([], |row| {
            let config_str: String = row.get(3)?;
            Ok(CloudProfile {
                id: row.get(0)?,
                name: row.get(1)?,
                provider: row.get(2)?,
                config: serde_json::from_str(&config_str).unwrap_or_default(),
                created_at: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(profiles)
}

#[tauri::command]
pub fn create_cloud_profile(
    name: String,
    provider: String,
    config_json: String,
    credentials_json: String,
    state: State<AppState>,
) -> Result<CloudProfile, String> {
    let config: serde_json::Value =
        serde_json::from_str(&config_json).map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    // Guarda credenciais no keychain do SO antes de escrever na BD
    cloud::credentials::save(&id, &credentials_json)?;
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "INSERT INTO cloud_profiles (id, name, provider, config, created_at) VALUES (?1,?2,?3,?4,?5)",
        rusqlite::params![id, name, provider, config_json, now],
    )
    .map_err(|e| e.to_string())?;
    Ok(CloudProfile {
        id,
        name,
        provider,
        config,
        created_at: now,
    })
}

#[tauri::command]
pub fn update_cloud_profile(
    id: String,
    name: String,
    config_json: String,
    credentials_json: String,
    state: State<AppState>,
) -> Result<(), String> {
    let new_creds: serde_json::Value =
        serde_json::from_str(&credentials_json).unwrap_or_default();
    if new_creds.as_object().is_some_and(|o| !o.is_empty()) {
        // Merge com keychain existente: novos valores substituem, mas campos ausentes
        // (como oauth_token) são preservados para não quebrar perfis OAuth ao editar.
        let existing = cloud::credentials::load(&id);
        let merged = merge_creds(existing, new_creds);
        cloud::credentials::save(&id, &merged.to_string())?;
    }
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "UPDATE cloud_profiles SET name=?1, config=?2 WHERE id=?3",
        rusqlite::params![name, config_json, id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_cloud_profile(id: String, state: State<AppState>) -> Result<(), String> {
    cloud::credentials::delete(&id);
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute("DELETE FROM cloud_profiles WHERE id=?1", [&id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn test_cloud_connection(
    id: String,
    config_json: String,
    provider: String,
    credentials_json: String,
) -> Result<(), String> {
    let config: serde_json::Value =
        serde_json::from_str(&config_json).map_err(|e| e.to_string())?;
    let passed: serde_json::Value =
        serde_json::from_str(&credentials_json).map_err(|e| e.to_string())?;
    // Merge keychain (base) + passed creds (override se não-vazio) para que editar o
    // perfil sem re-autenticar não perca o oauth_token já guardado no keychain.
    let kc = if !id.is_empty() {
        cloud::credentials::load(&id)
    } else {
        serde_json::Value::Object(Default::default())
    };
    let creds = merge_creds(kc, passed);
    let provider = cloud::get_provider(&provider, &config, &creds)?;
    provider.test_connection().await
}

/// Merge: base (ex: keychain) + overrides (ex: form fields).
/// Valores em overrides só substituem se forem não-empty-string.
fn merge_creds(base: serde_json::Value, overrides: serde_json::Value) -> serde_json::Value {
    match (base.as_object(), overrides.as_object()) {
        (Some(b), Some(o)) => {
            let mut merged = b.clone();
            for (k, v) in o {
                if !v.as_str().map(|s| s.is_empty()).unwrap_or(false) {
                    merged.insert(k.clone(), v.clone());
                }
            }
            serde_json::Value::Object(merged)
        }
        _ => {
            if overrides.as_object().is_some_and(|o| !o.is_empty()) {
                overrides
            } else {
                base
            }
        }
    }
}

/// Resultado da sondagem TOFU de um host SFTP.
#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SftpHostProbe {
    /// Fingerprint SHA256 da host key (`SHA256:...`).
    pub fingerprint: String,
    /// True se coincidir com o `hostFingerprint` já guardado no config do perfil.
    pub matches_stored: bool,
}

/// Liga ao servidor SFTP em modo descoberta e devolve a fingerprint da host key,
/// para o utilizador confirmar a identidade (Trust-On-First-Use) antes de confiar.
#[tauri::command]
pub async fn sftp_probe_host(
    config_json: String,
    credentials_json: String,
) -> Result<SftpHostProbe, String> {
    let config: serde_json::Value =
        serde_json::from_str(&config_json).map_err(|e| e.to_string())?;
    let creds: serde_json::Value =
        serde_json::from_str(&credentials_json).map_err(|e| e.to_string())?;
    let provider = cloud::sftp::SftpProvider::new(&config, &creds)?;
    let fingerprint = provider.probe_fingerprint().await?;
    let matches_stored = config
        .get("hostFingerprint")
        .and_then(|v| v.as_str())
        .map(|s| s == fingerprint)
        .unwrap_or(false);
    Ok(SftpHostProbe {
        fingerprint,
        matches_stored,
    })
}

#[tauri::command]
pub fn get_job_cloud_destinations(
    job_id: String,
    state: State<AppState>,
) -> Result<Vec<JobCloudDestination>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db
        .prepare(
            "SELECT jcd.profile_id, cp.name, jcd.status, jcd.error_msg, jcd.uploaded_at
             FROM job_cloud_destinations jcd
             JOIN cloud_profiles cp ON cp.id = jcd.profile_id
             WHERE jcd.job_id = ?1",
        )
        .map_err(|e| e.to_string())?;
    let destinations = stmt
        .query_map([&job_id], |row| {
            Ok(JobCloudDestination {
                profile_id: row.get(0)?,
                profile_name: row.get(1)?,
                status: row.get(2)?,
                error_msg: row.get(3)?,
                uploaded_at: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(destinations)
}

/// Lógica interna de upload — chamada pelo comando Tauri e pelo queue após job:completed.
pub(crate) async fn run_cloud_uploads(job_id: &str, state: &AppState) -> Result<(), String> {
    let (output_path, destinations): (Option<String>, Vec<(String, String, String)>) = {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        let output: Option<String> = db
            .query_row(
                "SELECT output_path FROM jobs WHERE id=?1",
                [job_id],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?;
        let mut stmt = db
            .prepare(
                "SELECT jcd.profile_id, cp.provider, cp.config
                 FROM job_cloud_destinations jcd
                 JOIN cloud_profiles cp ON cp.id = jcd.profile_id
                 WHERE jcd.job_id = ?1 AND jcd.status = 'pending'",
            )
            .map_err(|e| e.to_string())?;
        let dests: Vec<(String, String, String)> = stmt
            .query_map([job_id], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                ))
            })
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;
        (output, dests)
    };

    let output_path = match output_path {
        Some(p) if !p.is_empty() => p,
        _ => return Ok(()),
    };

    let filename = std::path::Path::new(&output_path)
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();

    for (profile_id, provider_type, config_str) in destinations {
        let config: serde_json::Value = match serde_json::from_str(&config_str) {
            Ok(v) => v,
            Err(e) => {
                let db = state.db.lock().map_err(|e2| e2.to_string())?;
                let _ = db.execute(
                    "UPDATE job_cloud_destinations SET status='failed', error_msg=?1 WHERE job_id=?2 AND profile_id=?3",
                    rusqlite::params![format!("Config JSON inválido: {e}"), job_id, profile_id],
                );
                continue;
            }
        };
        {
            let db = state.db.lock().map_err(|e| e.to_string())?;
            let _ = db.execute(
                "UPDATE job_cloud_destinations SET status='uploading' WHERE job_id=?1 AND profile_id=?2",
                rusqlite::params![job_id, profile_id],
            );
        }

        let local_path = std::path::Path::new(&output_path);
        // Creds: keychain (perfis novos) → fallback para config blob (perfis migrados)
        let keychain_creds = cloud::credentials::load(&profile_id);
        let creds = if keychain_creds.as_object().is_some_and(|o| !o.is_empty()) {
            keychain_creds
        } else {
            config.clone()
        };
        let provider = match cloud::get_provider(&provider_type, &config, &creds) {
            Ok(p) => p,
            Err(e) => {
                let db = state.db.lock().map_err(|e2| e2.to_string())?;
                let _ = db.execute(
                    "UPDATE job_cloud_destinations SET status='failed', error_msg=?1 WHERE job_id=?2 AND profile_id=?3",
                    rusqlite::params![e, job_id, profile_id],
                );
                continue;
            }
        };

        // Loop de retry manual — evita problemas de lifetime com async closures
        let mut result: Result<String, String> = Err(String::new());
        for attempt in 0u32..3 {
            result = provider.upload(local_path, &filename).await;
            if result.is_ok() {
                break;
            }
            if attempt < 2 {
                let delay = 2u64.saturating_pow(attempt).min(30);
                tokio::time::sleep(std::time::Duration::from_secs(delay)).await;
            }
        }

        let db = state.db.lock().map_err(|e| e.to_string())?;
        match result {
            Ok(_) => {
                let now = Utc::now().to_rfc3339();
                let _ = db.execute(
                    "UPDATE job_cloud_destinations SET status='uploaded', uploaded_at=?1, error_msg=NULL WHERE job_id=?2 AND profile_id=?3",
                    rusqlite::params![now, job_id, profile_id],
                );
            }
            Err(e) => {
                let _ = db.execute(
                    "UPDATE job_cloud_destinations SET status='failed', error_msg=?1 WHERE job_id=?2 AND profile_id=?3",
                    rusqlite::params![e, job_id, profile_id],
                );
            }
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn process_cloud_destinations(
    job_id: String,
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let _ = &app;
    run_cloud_uploads(&job_id, &state).await
}

#[tauri::command]
pub async fn retry_cloud_upload(
    job_id: String,
    profile_id: String,
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<(), String> {
    {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        db.execute(
            "UPDATE job_cloud_destinations SET status='pending', error_msg=NULL WHERE job_id=?1 AND profile_id=?2",
            rusqlite::params![job_id, profile_id],
        )
        .map_err(|e| e.to_string())?;
    }
    process_cloud_destinations(job_id, app, state).await
}

#[tauri::command]
pub fn add_cloud_asset(
    profile_id: String,
    remote_path: String,
    name: String,
    state: State<AppState>,
    app: tauri::AppHandle,
) -> Result<String, String> {
    use tauri::Manager;

    let db = state.db.lock().map_err(|e| e.to_string())?;
    let profile: Option<(String, String)> = db
        .query_row(
            "SELECT provider, config FROM cloud_profiles WHERE id=?1",
            [&profile_id],
            |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)),
        )
        .ok();

    if profile.is_none() {
        return Err("Perfil cloud não encontrado".to_string());
    }

    let temp_path = app
        .path()
        .temp_dir()
        .map_err(|e| e.to_string())?
        .join(&name);

    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    db.execute(
        "INSERT INTO assets (id, path, filename, status, created_at, updated_at, cloud_source_profile, cloud_source_path)
         VALUES (?1,?2,?3,'pending',?4,?4,?5,?6)",
        rusqlite::params![
            id,
            temp_path.to_string_lossy().as_ref(),
            name,
            now,
            profile_id,
            remote_path
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(id)
}

// ── Google Drive OAuth Device Flow ───────────────────────────────────────────

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GDriveAuthChallenge {
    pub url: String,
    pub user_code: String,
    pub device_code: String,
    pub expires_in: u64,
}

#[tauri::command]
pub async fn gdrive_start_auth(client_id: String) -> Result<GDriveAuthChallenge, String> {
    let client = reqwest::Client::new();
    let resp = client
        .post("https://oauth2.googleapis.com/device/code")
        .form(&[
            ("client_id", client_id.as_str()),
            ("scope", "https://www.googleapis.com/auth/drive.file"),
        ])
        .send()
        .await
        .map_err(|e| e.to_string())?;
    let body: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    // Google devolve {"error": "...", "error_description": "..."} em caso de falha
    if let Some(err) = body["error"].as_str() {
        let desc = body["error_description"].as_str().unwrap_or(err);
        return Err(format!("Google recusou autenticação: {desc}"));
    }
    let device_code = body["device_code"].as_str()
        .ok_or("Google não devolveu device_code — verifique o tipo de cliente OAuth (deve ser 'TV e dispositivos de entrada limitada')")?
        .to_string();
    Ok(GDriveAuthChallenge {
        url: body["verification_url"].as_str().unwrap_or("").to_string(),
        user_code: body["user_code"].as_str().unwrap_or("").to_string(),
        device_code,
        expires_in: body["expires_in"].as_u64().unwrap_or(300),
    })
}

#[tauri::command]
pub async fn gdrive_poll_auth(
    device_code: String,
    client_id: String,
    client_secret: String,
) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::new();
    let resp = client
        .post("https://oauth2.googleapis.com/token")
        .form(&[
            ("client_id", client_id.as_str()),
            ("client_secret", client_secret.as_str()),
            ("device_code", device_code.as_str()),
            ("grant_type", "urn:ietf:params:oauth:grant-type:device_code"),
        ])
        .send()
        .await
        .map_err(|e| e.to_string())?;
    let body: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    if body.get("access_token").is_some() {
        Ok(body)
    } else {
        Err(body["error"].as_str().unwrap_or("pending").to_string())
    }
}

// ── File browser commands ─────────────────────────────────────────────────────

async fn load_profile_provider(
    profile_id: &str,
    state: &tauri::State<'_, AppState>,
) -> Result<(Box<dyn cloud::provider::CloudProvider>, String), String> {
    let (provider_type, config_str) = {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        let row: (String, String) = db
            .query_row(
                "SELECT provider, config FROM cloud_profiles WHERE id=?1",
                [profile_id],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .map_err(|_| format!("Perfil '{}' não encontrado", profile_id))?;
        row
        // db (MutexGuard) drops here — antes de qualquer await
    };
    let config: serde_json::Value =
        serde_json::from_str(&config_str).map_err(|e| e.to_string())?;
    // Backward compat: perfis criados antes da migração keychain (b6b76d1) têm as creds
    // no blob config da DB. Se o keychain estiver vazio, usar config como fallback.
    let kc = cloud::credentials::load(profile_id);
    let mut creds = if kc.as_object().is_some_and(|o| !o.is_empty()) {
        kc
    } else {
        config.clone()
    };

    // Refresh automático apenas para providers PKCE (gdrive_personal, dropbox).
    // "gdrive" (Device Flow) não entra aqui — o refresh requer client_secret que
    // não é guardado em perfis PKCE e não está disponível neste contexto.
    if matches!(provider_type.as_str(), "gdrive_personal" | "dropbox") {
        let oauth_provider = match provider_type.as_str() {
            "gdrive_personal" => cloud::oauth::OAuthProvider::GDrive,
            _ => cloud::oauth::OAuthProvider::Dropbox,
        };
        let client_id = config["client_id"].as_str().unwrap_or("").to_string();
        if cloud::oauth::refresh_if_needed(&mut creds, &oauth_provider, &client_id).await? {
            let updated = creds.to_string();
            cloud::credentials::save(profile_id, &updated)?;
        }
    }

    let provider = cloud::get_provider(&provider_type, &config, &creds)?;
    Ok((provider, provider_type))
}

#[tauri::command]
pub async fn cloud_list_files(
    profile_id: String,
    subpath: Option<String>,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<cloud::provider::RemoteFile>, String> {
    let (provider, _) = load_profile_provider(&profile_id, &state).await?;
    let path = subpath.as_deref().unwrap_or("");
    provider.list_files(path).await
}

#[tauri::command]
pub async fn cloud_delete_files(
    profile_id: String,
    paths: Vec<String>,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<String>, String> {
    let (provider, _) = load_profile_provider(&profile_id, &state).await?;
    provider.delete_files(&paths).await
}

#[tauri::command]
pub async fn cloud_download_file(
    profile_id: String,
    remote_path: String,
    local_path: String,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let (provider, _) = load_profile_provider(&profile_id, &state).await?;
    provider
        .download(&remote_path, std::path::Path::new(&local_path))
        .await
}

// ── OAuth PKCE connect ────────────────────────────────────────────────────────

#[tauri::command]
pub async fn oauth_connect(
    provider: String,
    client_id: String,
    app: tauri::AppHandle,
) -> Result<cloud::oauth::OAuthTokens, String> {
    use tauri_plugin_opener::OpenerExt;

    let oauth_provider = match provider.as_str() {
        "gdrive_personal" => cloud::oauth::OAuthProvider::GDrive,
        "dropbox" => cloud::oauth::OAuthProvider::Dropbox,
        other => return Err(format!("Provider OAuth desconhecido: {other}")),
    };

    let pkce = cloud::oauth::generate_pkce();
    // Google ignora a porta para URIs 127.0.0.1 em apps Desktop → porta dinâmica OK.
    // Dropbox exige match exacto → porta fixa 8475; utilizador regista http://127.0.0.1:8475
    let (port, redirect_uri) = match oauth_provider {
        cloud::oauth::OAuthProvider::GDrive => {
            let p = cloud::oauth::find_free_port()?;
            (p, format!("http://127.0.0.1:{p}/callback"))
        }
        cloud::oauth::OAuthProvider::Dropbox => (8475u16, "http://127.0.0.1:8475".to_string()),
    };

    let auth_url = match oauth_provider {
        cloud::oauth::OAuthProvider::GDrive => format!(
            "https://accounts.google.com/o/oauth2/v2/auth\
             ?client_id={client_id}\
             &response_type=code\
             &redirect_uri={redirect_uri_enc}\
             &scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fdrive\
             &code_challenge={challenge}\
             &code_challenge_method=S256\
             &access_type=offline\
             &prompt=consent",
            redirect_uri_enc = urlencoding_encode(&redirect_uri),
            challenge = pkce.challenge,
        ),
        cloud::oauth::OAuthProvider::Dropbox => format!(
            "https://www.dropbox.com/oauth2/authorize\
             ?client_id={client_id}\
             &response_type=code\
             &redirect_uri={redirect_uri_enc}\
             &code_challenge={challenge}\
             &code_challenge_method=S256\
             &token_access_type=offline",
            redirect_uri_enc = urlencoding_encode(&redirect_uri),
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
