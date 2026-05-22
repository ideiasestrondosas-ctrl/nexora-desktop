use super::provider::{CloudProvider, RemoteFile};
use async_trait::async_trait;
use std::path::Path;

const GDRIVE_UPLOAD_BASE: &str = "https://www.googleapis.com/upload/drive/v3/files";
const GDRIVE_FILES_URL: &str = "https://www.googleapis.com/drive/v3/files";

pub struct GDriveProvider {
    access_token: String,
    base_folder_id: Option<String>,
    base_path: String,
}

impl GDriveProvider {
    pub fn new(config: &serde_json::Value, creds: &serde_json::Value) -> Result<Self, String> {
        let token = creds["oauth_token"]
            .as_str()
            .ok_or("oauth_token é obrigatório — autentique o perfil primeiro")?
            .to_string();
        let folder_id = creds
            .get("folder_id")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());
        let base_path = config
            .get("base_path")
            .and_then(|v| v.as_str())
            .unwrap_or("/")
            .to_string();
        Ok(Self {
            access_token: token,
            base_folder_id: folder_id,
            base_path,
        })
    }

    /// Resolve o nome de uma pasta para o seu ID no Drive, dentro de um pai opcional.
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
            // Sem parent explícito: pesquisa na raiz do My Drive
            None => format!(
                "name='{}' and mimeType='application/vnd.google-apps.folder' and 'root' in parents and trashed=false",
                name.replace('\'', "\\'")
            ),
        };
        let resp = client
            .get(GDRIVE_FILES_URL)
            .bearer_auth(&self.access_token)
            .query(&[
                ("q", q.as_str()),
                ("fields", "files(id,name)"),
                ("pageSize", "1"),
            ])
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
            .ok_or_else(|| format!(
                "Pasta '{name}' não encontrada no Google Drive. Verifique o campo 'Pasta no Drive' nas definições do perfil (use '/' para navegar desde a raiz)."
            ))
    }

    /// Resolve um caminho relativo (separado por `/`) a partir da pasta-raiz configurada.
    /// Se `base_folder_id` não estiver em cache, resolve `base_path` segmento a segmento
    /// a partir da raiz do Drive antes de descer o subpath.
    async fn resolve_path_id(
        &self,
        client: &reqwest::Client,
        subpath: &str,
    ) -> Result<String, String> {
        // Resolve pasta base: usa o ID em cache ou percorre base_path desde a raiz
        let mut current_id = match &self.base_folder_id {
            Some(id) => id.clone(),
            None => {
                let segments: Vec<&str> = self
                    .base_path
                    .split('/')
                    .filter(|s| !s.is_empty())
                    .collect();
                if segments.is_empty() {
                    // base_path vazio ou "/" → raiz do Drive
                    "root".to_string()
                } else {
                    let mut id = String::new();
                    for segment in segments {
                        let parent = if id.is_empty() {
                            None
                        } else {
                            Some(id.as_str())
                        };
                        id = self.resolve_folder_id(client, segment, parent).await?;
                    }
                    id
                }
            }
        };
        // Desce o subpath de navegação
        for segment in subpath.split('/').filter(|s| !s.is_empty()) {
            current_id = self
                .resolve_folder_id(client, segment, Some(&current_id))
                .await?;
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
        let filename = Path::new(remote_path)
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();
        let data = tokio::fs::read(local_path)
            .await
            .map_err(|e| e.to_string())?;

        let client = reqwest::Client::new();

        // Resolver a pasta de destino (base_path configurada no perfil)
        let parent_id = self.resolve_path_id(&client, "").await?;

        // Verificar se já existe um ficheiro com o mesmo nome na pasta de destino
        let q = format!(
            "name='{}' and '{}' in parents and mimeType!='application/vnd.google-apps.folder' and trashed=false",
            filename.replace('\'', "\\'"),
            parent_id
        );
        let search = client
            .get(GDRIVE_FILES_URL)
            .bearer_auth(&self.access_token)
            .query(&[
                ("q", q.as_str()),
                ("fields", "files(id)"),
                ("pageSize", "1"),
            ])
            .send()
            .await
            .map_err(|e| format!("Google Drive: pesquisa falhou: {e}"))?;
        if search.status().as_u16() == 401 {
            return Err("Token expirado — reautentique o perfil".to_string());
        }
        let search_body: serde_json::Value = search.json().await.map_err(|e| e.to_string())?;
        let existing_id = search_body["files"][0]["id"]
            .as_str()
            .map(|s| s.to_string());

        // Upsert: PATCH se já existe, POST se é novo
        let (url, metadata, use_patch) = match &existing_id {
            Some(id) => (
                format!("{}/{}?uploadType=multipart", GDRIVE_UPLOAD_BASE, id),
                serde_json::json!({ "name": filename }),
                true,
            ),
            None => (
                format!("{}?uploadType=multipart", GDRIVE_UPLOAD_BASE),
                serde_json::json!({ "name": filename, "parents": [parent_id] }),
                false,
            ),
        };

        let metadata_part = reqwest::multipart::Part::text(metadata.to_string())
            .mime_str("application/json")
            .map_err(|e| e.to_string())?;
        let file_part = reqwest::multipart::Part::bytes(data)
            .mime_str("application/octet-stream")
            .map_err(|e| e.to_string())?;
        let form = reqwest::multipart::Form::new()
            .part("metadata", metadata_part)
            .part("file", file_part);

        let req = if use_patch {
            client.patch(&url)
        } else {
            client.post(&url)
        };
        let resp = req
            .bearer_auth(&self.access_token)
            .multipart(form)
            .send()
            .await
            .map_err(|e| format!("Google Drive upload falhou: {e}"))?;

        if resp.status().is_success() {
            let body: serde_json::Value = resp.json().await.unwrap_or_default();
            Ok(body["id"].as_str().unwrap_or("").to_string())
        } else {
            let status = resp.status();
            let detail = resp.text().await.unwrap_or_default();
            Err(format!("Google Drive upload erro: {status} — {detail}"))
        }
    }

    async fn download(&self, remote_path: &str, local_path: &Path) -> Result<(), String> {
        let client = reqwest::Client::new();
        // C1: O remote_path pode ser "subpasta/FILE_ID" — a API do Drive requer apenas o ID
        let file_id = remote_path.rsplit('/').next().unwrap_or(remote_path);
        let url = format!("{}/{file_id}?alt=media", GDRIVE_FILES_URL);
        let resp = client
            .get(&url)
            .bearer_auth(&self.access_token)
            .send()
            .await
            .map_err(|e| format!("Google Drive download falhou: {e}"))?;
        // C2: Verificar o estado HTTP antes de consumir o corpo (evita escrever JSON de erro no disco)
        if !resp.status().is_success() {
            return Err(format!(
                "Google Drive download falhou: HTTP {}",
                resp.status()
            ));
        }
        let bytes = resp.bytes().await.map_err(|e| e.to_string())?;
        if let Some(parent) = local_path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        tokio::fs::write(local_path, bytes)
            .await
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    async fn list_files(&self, path: &str) -> Result<Vec<RemoteFile>, String> {
        let client = reqwest::Client::new();
        let folder_id = self.resolve_path_id(&client, path).await?;

        let q = format!("'{}' in parents and trashed=false", folder_id);
        let resp = client
            .get(GDRIVE_FILES_URL)
            .bearer_auth(&self.access_token)
            .query(&[("fields", "files(id,name,size,modifiedTime,mimeType)")])
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
            if name.is_empty() || file_id.is_empty() {
                continue;
            }

            let is_dir = mime == folder_mime;
            // O campo `path` armazena o ID do Drive (não um caminho de sistema de ficheiros),
            // pois o download e eliminação necessitam do ID directamente.
            let rel_path = if path.is_empty() {
                file_id.clone()
            } else {
                format!("{}/{}", path.trim_end_matches('/'), file_id)
            };
            let size = if is_dir {
                None
            } else {
                f["size"].as_str().and_then(|s| s.parse().ok())
            };
            let modified = f["modifiedTime"].as_str().map(|s| s.to_string());
            // Documentos nativos do Google (Docs, Sheets, etc.) não são ficheiros transferíveis directamente
            let is_gdoc = !is_dir && mime.starts_with(gdoc_mime);
            let display_name = if is_gdoc {
                format!("{name} [Google Doc]")
            } else {
                name
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
            // O `path` pode ser "subpasta/file_id" — o ID é sempre o último segmento
            let file_id = path.rsplit('/').next().unwrap_or(path.as_str());
            let url = format!("{}/{}", GDRIVE_FILES_URL, file_id);
            match client
                .delete(&url)
                .bearer_auth(&self.access_token)
                .send()
                .await
            {
                Ok(resp) if resp.status().is_success() || resp.status().as_u16() == 204 => {}
                Ok(resp) => failed.push(format!("{path}: HTTP {}", resp.status())),
                Err(e) => failed.push(format!("{path}: {e}")),
            }
        }
        Ok(failed)
    }
}
