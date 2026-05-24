use super::provider::CloudProvider;
use async_trait::async_trait;
use s3::creds::Credentials;
use s3::{Bucket, Region};
use std::path::Path;

pub struct S3Provider {
    bucket: Box<Bucket>,
    base_path: String,
}

impl S3Provider {
    pub fn new(config: &serde_json::Value, creds: &serde_json::Value) -> Result<Self, String> {
        let bucket_name = config["bucket"].as_str().ok_or("bucket obrigatório")?;
        let region_str = config["region"].as_str().unwrap_or("us-east-1");
        let endpoint = config["endpoint"].as_str().unwrap_or("");
        let base_path = config["base_path"].as_str().unwrap_or("").to_string();
        // Credenciais: lê de creds (teste) ou de config (perfil guardado com merge)
        let access_key = creds["access_key"]
            .as_str()
            .or_else(|| config["access_key"].as_str())
            .unwrap_or("");
        let secret_key = creds["secret_key"]
            .as_str()
            .or_else(|| config["secret_key"].as_str())
            .unwrap_or("");

        let region = if endpoint.is_empty() {
            region_str.parse::<Region>().map_err(|e| e.to_string())?
        } else {
            Region::Custom {
                region: region_str.to_string(),
                endpoint: endpoint.to_string(),
            }
        };

        let credentials = Credentials::new(Some(access_key), Some(secret_key), None, None, None)
            .map_err(|e| e.to_string())?;

        let bucket = Bucket::new(bucket_name, region, credentials)
            .map_err(|e| e.to_string())?
            .with_path_style();

        Ok(Self { bucket, base_path })
    }

    fn full_path(&self, relative: &str) -> String {
        let cleaned = relative.trim_start_matches('/');
        if self.base_path.is_empty() {
            cleaned.to_string()
        } else {
            format!("{}/{}", self.base_path.trim_end_matches('/'), cleaned)
        }
    }
}

#[async_trait]
impl CloudProvider for S3Provider {
    fn provider_type(&self) -> &'static str {
        "s3"
    }

    async fn test_connection(&self) -> Result<(), String> {
        // head_object usa response_header() sem XML parsing — list() falha porque
        // list_page() não verifica o HTTP status antes de deserializar, e quando
        // o MinIO retorna um erro XML (<Error>) o serde falha com "missing field Name"
        let status = self
            .bucket
            .head_object("_nexora_probe")
            .await
            .map(|(_, s)| s)
            .map_err(|e| format!("S3 ligação falhou: {e}"))?;
        match status {
            200 | 404 => Ok(()),
            403 => Err("S3 ligação falhou: credenciais inválidas ou acesso negado".to_string()),
            s => Err(format!("S3 ligação falhou: HTTP {s}")),
        }
    }

    async fn upload(&self, local_path: &Path, remote_path: &str) -> Result<String, String> {
        let key = self.full_path(remote_path);
        let data = tokio::fs::read(local_path)
            .await
            .map_err(|e| e.to_string())?;
        self.bucket
            .put_object(&key, &data)
            .await
            .map_err(|e| format!("S3 upload falhou: {e}"))?;
        Ok(format!("s3://{}/{}", self.bucket.name(), key))
    }

    async fn download(&self, remote_path: &str, local_path: &Path) -> Result<(), String> {
        let key = self.full_path(remote_path);
        let response = self
            .bucket
            .get_object(&key)
            .await
            .map_err(|e| format!("S3 download falhou: {e}"))?;
        if let Some(parent) = local_path.parent() {
            tokio::fs::create_dir_all(parent)
                .await
                .map_err(|e| e.to_string())?;
        }
        tokio::fs::write(local_path, response.bytes())
            .await
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    async fn list_files(&self, path: &str) -> Result<Vec<super::provider::RemoteFile>, String> {
        use super::provider::RemoteFile;

        // Constrói o prefixo S3 para o subpath pedido
        let base = self.base_path.trim_end_matches('/');
        let prefix = if path.is_empty() {
            if base.is_empty() {
                String::new()
            } else {
                format!("{base}/")
            }
        } else {
            let rel = path.trim_matches('/');
            if base.is_empty() {
                format!("{rel}/")
            } else {
                format!("{base}/{rel}/")
            }
        };

        let results = self
            .bucket
            .list(prefix.clone(), Some("/".to_string()))
            .await
            .map_err(|e| format!("S3 list falhou: {e}"))?;

        let mut files = Vec::new();
        for page in results {
            // Pastas (common_prefixes): retira o prefixo completo para obter caminho relativo
            for cp in page.common_prefixes.unwrap_or_default() {
                let folder_full = cp.prefix.trim_end_matches('/');
                let name = folder_full.rsplit('/').next().unwrap_or("").to_string();
                if name.is_empty() {
                    continue;
                }
                let rel = folder_full
                    .strip_prefix(base)
                    .unwrap_or(folder_full)
                    .trim_start_matches('/')
                    .to_string();
                files.push(RemoteFile {
                    name,
                    path: rel,
                    size: None,
                    modified: None,
                    is_dir: true,
                });
            }
            // Ficheiros (contents): ignora entradas "directório" que terminam em '/'
            for obj in page.contents {
                if obj.key.ends_with('/') {
                    continue;
                }
                let name = obj.key.rsplit('/').next().unwrap_or("").to_string();
                if name.is_empty() {
                    continue;
                }
                let rel = obj
                    .key
                    .strip_prefix(base)
                    .unwrap_or(obj.key.as_str())
                    .trim_start_matches('/')
                    .to_string();
                files.push(RemoteFile {
                    name,
                    path: rel,
                    size: Some(obj.size),
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
}
