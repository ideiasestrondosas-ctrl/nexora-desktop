use super::provider::{CloudProvider, RemoteFile};
use async_trait::async_trait;
use std::path::Path;

const SIMPLE_UPLOAD_LIMIT: usize = 150 * 1024 * 1024; // 150 MB
const CHUNK_SIZE: usize = 128 * 1024 * 1024; // 128 MB

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
        let data = tokio::fs::read(local_path)
            .await
            .map_err(|e| e.to_string())?;
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
        let start_body: serde_json::Value = start_resp.json().await.map_err(|e| e.to_string())?;
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
            return Err(format!(
                "Dropbox upload session finish erro {status}: {detail}"
            ));
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
