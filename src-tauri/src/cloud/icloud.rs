use super::provider::CloudProvider;
use super::smb::SmbProvider;
use async_trait::async_trait;
use std::path::Path;

pub struct ICloudProvider {
    inner: SmbProvider,
}

impl ICloudProvider {
    pub fn new(config: &serde_json::Value) -> Result<Self, String> {
        let detected_base = detect_icloud_path()?;
        let sub_path = config["base_path"].as_str().unwrap_or("Nexora/");
        let full_base = std::path::Path::new(&detected_base)
            .join(sub_path.trim_start_matches(['/', '\\']))
            .to_string_lossy()
            .to_string();
        let smb_config = serde_json::json!({ "base_path": full_base });
        Ok(Self {
            inner: SmbProvider::new(&smb_config)?,
        })
    }
}

fn detect_icloud_path() -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        let userprofile =
            std::env::var("USERPROFILE").map_err(|_| "USERPROFILE não definido".to_string())?;
        let path = std::path::Path::new(&userprofile).join("iCloudDrive");
        if path.exists() {
            return Ok(path.to_string_lossy().to_string());
        }
        Err(
            "iCloud Drive não encontrado. Instale o iCloud para Windows em apple.com/icloud"
                .to_string(),
        )
    }
    #[cfg(target_os = "macos")]
    {
        let home = std::env::var("HOME").map_err(|_| "HOME não definido".to_string())?;
        let path = std::path::Path::new(&home).join("Library/Mobile Documents/com~apple~CloudDocs");
        if path.exists() {
            return Ok(path.to_string_lossy().to_string());
        }
        Err(
            "iCloud Drive não encontrado. Activa o iCloud Drive nas Preferências do Sistema"
                .to_string(),
        )
    }
    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    {
        Err("iCloud Drive não é suportado nesta plataforma".to_string())
    }
}

#[async_trait]
impl CloudProvider for ICloudProvider {
    fn provider_type(&self) -> &'static str {
        "icloud"
    }
    async fn test_connection(&self) -> Result<(), String> {
        self.inner.test_connection().await
    }
    async fn upload(&self, local_path: &Path, remote_path: &str) -> Result<String, String> {
        self.inner.upload(local_path, remote_path).await
    }
    async fn download(&self, remote_path: &str, local_path: &Path) -> Result<(), String> {
        self.inner.download(remote_path, local_path).await
    }

    async fn list_files(&self, _path: &str) -> Result<Vec<super::provider::RemoteFile>, String> {
        Err("Navegação de ficheiros não suportada para iCloud nesta versão.".to_string())
    }

    async fn delete_files(&self, _paths: &[String]) -> Result<Vec<String>, String> {
        Err("Eliminação de ficheiros não suportada para iCloud nesta versão.".to_string())
    }
}
