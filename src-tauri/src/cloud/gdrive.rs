use super::provider::CloudProvider;
use async_trait::async_trait;
use std::path::Path;

const GDRIVE_UPLOAD_URL: &str =
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";

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
        // Suprimir aviso de campo não lido
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
        let url = format!("https://www.googleapis.com/drive/v3/files/{}?alt=media", remote_path);
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
}
