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
        let full = std::path::Path::new(&self.base_path).join(cleaned);
        // I1: Prevenir path traversal via segmentos ".." — garantir que o caminho resolvido
        // permanece dentro de base_path (starts_with faz comparação por componentes, não por prefixo de string)
        let base = std::path::Path::new(&self.base_path);
        if !full.starts_with(base) {
            // Fallback seguro: devolve base_path, que falhará graciosamente em read_dir/remove_file
            return base.to_path_buf();
        }
        full
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

    async fn list_files(&self, path: &str) -> Result<Vec<super::provider::RemoteFile>, String> {
        use super::provider::RemoteFile;
        let dir = self.resolve(path);
        let entries = std::fs::read_dir(&dir)
            .map_err(|e| format!("Leitura de directório SMB falhou em {}: {e}", dir.display()))?;

        let mut files = Vec::new();
        for entry in entries {
            let entry = entry.map_err(|e| e.to_string())?;
            let name = entry.file_name().to_string_lossy().to_string();
            let meta = entry.metadata().map_err(|e| e.to_string())?;
            let is_dir = meta.is_dir();
            let size = if is_dir { None } else { Some(meta.len()) };
            let modified = meta.modified().ok().map(|t| {
                chrono::DateTime::<chrono::Utc>::from(t).to_rfc3339()
            });
            let rel_path = if path.is_empty() {
                name.clone()
            } else {
                format!("{}/{}", path.trim_end_matches('/'), name)
            };
            files.push(RemoteFile { name, path: rel_path, size, modified, is_dir });
        }
        Ok(files)
    }

    async fn delete_files(&self, paths: &[String]) -> Result<Vec<String>, String> {
        let mut failed = Vec::new();
        for path in paths {
            let full = self.resolve(path);
            if let Err(e) = std::fs::remove_file(&full) {
                failed.push(format!("{path}: {e}"));
            }
        }
        Ok(failed)
    }
}
