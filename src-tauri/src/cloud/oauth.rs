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

    PkceParams {
        verifier,
        challenge,
    }
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
            .ok_or_else(|| "Parâmetro 'code' não encontrado na resposta OAuth".to_string())?;

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
    client_secret: Option<&str>,
    redirect_uri: &str,
) -> Result<OAuthTokens, String> {
    let client = reqwest::Client::new();

    let token_url = match provider {
        OAuthProvider::GDrive => "https://oauth2.googleapis.com/token",
        OAuthProvider::Dropbox => "https://api.dropboxapi.com/oauth2/token",
    };

    let mut params = vec![
        ("grant_type", "authorization_code"),
        ("code", code),
        ("redirect_uri", redirect_uri),
        ("client_id", client_id),
        ("code_verifier", verifier),
    ];
    if let Some(secret) = client_secret {
        params.push(("client_secret", secret));
    }

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

    let client_secret = creds["client_secret"].as_str().map(|s| s.to_string());
    let mut params = vec![
        ("grant_type", "refresh_token"),
        ("refresh_token", refresh_token.as_str()),
        ("client_id", client_id),
    ];
    if let Some(secret) = &client_secret {
        params.push(("client_secret", secret.as_str()));
    }

    let resp = client
        .post(token_url)
        .form(&params)
        .send()
        .await
        .map_err(|e| format!("Refresh falhou: {e}"))?;

    let body: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;

    if let Some(err) = body["error"].as_str() {
        return Err(format!("Sessão expirada — reautentique o perfil ({})", err));
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
        assert!(p
            .verifier
            .chars()
            .all(|c| c.is_alphanumeric() || c == '_' || c == '-'));
        assert!(!p.verifier.contains('='));
    }

    #[test]
    fn pkce_challenge_differs_from_verifier() {
        let p = generate_pkce();
        assert_ne!(p.verifier, p.challenge);
        assert!(p
            .challenge
            .chars()
            .all(|c| c.is_alphanumeric() || c == '_' || c == '-'));
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
