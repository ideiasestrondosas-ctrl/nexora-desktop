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

    fn copy_file(src: &Path, dst: &Path) -> Result<(), String> {
        // Tenta fs::copy primeiro; em caso de falha cross-device usa read+write
        if let Ok(_) = std::fs::copy(src, dst) {
            return Ok(());
        }
        let data = std::fs::read(src).map_err(|e| format!("Leitura falhou: {e}"))?;
        std::fs::write(dst, data).map_err(|e| format!("Escrita falhou: {e}"))
    }
}

#[async_trait]
impl CloudProvider for SmbProvider {
    fn provider_type(&self) -> &'static str {
        "smb"
    }

    async fn test_connection(&self) -> Result<(), String> {
        let base = std::path::Path::new(&self.base_path);
        if !base.exists() {
            return Err(format!("Pasta inacessível: {}", self.base_path));
        }
        // Verifica permissão de escrita com ficheiro temporário
        let probe = base.join(".nexora_probe");
        std::fs::write(&probe, b"probe").map_err(|e| format!("Sem permissão de escrita: {e}"))?;
        let _ = std::fs::remove_file(&probe);
        Ok(())
    }

    async fn upload(&self, local_path: &Path, remote_path: &str) -> Result<String, String> {
        let dest = self.resolve(remote_path);
        if let Some(parent) = dest.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        Self::copy_file(local_path, &dest)?;
        Ok(dest.to_string_lossy().to_string())
    }

    async fn download(&self, remote_path: &str, local_path: &Path) -> Result<(), String> {
        let src = self.resolve(remote_path);
        if let Some(parent) = local_path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        Self::copy_file(&src, local_path)
    }
}
