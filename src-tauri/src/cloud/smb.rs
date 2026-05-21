use super::provider::CloudProvider;
use async_trait::async_trait;
use std::path::Path;

pub struct SmbProvider {
    base_path: String,
}

impl SmbProvider {
    pub fn new(config: &serde_json::Value) -> Result<Self, String> {
        let base_path = config["base_path"]
            .as_str()
            .ok_or_else(|| "base_path é obrigatório".to_string())?
            .to_string();
        Ok(Self { base_path })
    }

    fn resolve(&self, remote_path: &str) -> std::path::PathBuf {
        let cleaned = remote_path.trim_start_matches(['/', '\\']);
        std::path::Path::new(&self.base_path).join(cleaned)
    }
}

#[async_trait]
impl CloudProvider for SmbProvider {
    fn provider_type(&self) -> &'static str {
        "smb"
    }

    async fn test_connection(&self) -> Result<(), String> {
        if std::path::Path::new(&self.base_path).exists() {
            Ok(())
        } else {
            Err(format!("Pasta inacessível: {}", self.base_path))
        }
    }

    async fn upload(&self, local_path: &Path, remote_path: &str) -> Result<String, String> {
        let dest = self.resolve(remote_path);
        if let Some(parent) = dest.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        std::fs::copy(local_path, &dest).map_err(|e| e.to_string())?;
        Ok(dest.to_string_lossy().to_string())
    }

    async fn download(&self, remote_path: &str, local_path: &Path) -> Result<(), String> {
        let src = self.resolve(remote_path);
        if let Some(parent) = local_path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        std::fs::copy(&src, local_path).map_err(|e| e.to_string())?;
        Ok(())
    }
}
