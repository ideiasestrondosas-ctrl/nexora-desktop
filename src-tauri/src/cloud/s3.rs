use super::provider::CloudProvider;
use async_trait::async_trait;
use s3::{Bucket, Region};
use s3::creds::Credentials;
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
        let access_key = creds["access_key"].as_str()
            .or_else(|| config["access_key"].as_str())
            .unwrap_or("");
        let secret_key = creds["secret_key"].as_str()
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

        let credentials = Credentials::new(
            Some(access_key),
            Some(secret_key),
            None,
            None,
            None,
        )
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
        let data = tokio::fs::read(local_path).await.map_err(|e| e.to_string())?;
        self.bucket
            .put_object(&key, &data)
            .await
            .map_err(|e| format!("S3 upload falhou: {e}"))?;
        Ok(format!("s3://{}/{}", self.bucket.name(), key))
    }

    async fn download(&self, remote_path: &str, local_path: &Path) -> Result<(), String> {
        let key = self.full_path(remote_path);
        let response = self.bucket
            .get_object(&key)
            .await
            .map_err(|e| format!("S3 download falhou: {e}"))?;
        if let Some(parent) = local_path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        tokio::fs::write(local_path, response.bytes()).await.map_err(|e| e.to_string())?;
        Ok(())
    }
}
