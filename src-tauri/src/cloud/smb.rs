use super::provider::CloudProvider;
use async_trait::async_trait;
use std::path::Path;

#[cfg(test)]
mod tests {
    use super::*;

    fn make_provider(base: &str) -> SmbProvider {
        SmbProvider { base_path: base.to_string() }
    }

    #[test]
    fn resolve_caminho_normal() {
        let p = make_provider("/mnt/share");
        assert_eq!(p.resolve("videos/clip.mp4"), std::path::PathBuf::from("/mnt/share/videos/clip.mp4"));
    }

    #[test]
    fn resolve_remove_barra_inicial() {
        let p = make_provider("/mnt/share");
        assert_eq!(p.resolve("/sub/file.mp4"), std::path::PathBuf::from("/mnt/share/sub/file.mp4"));
    }

    #[test]
    fn resolve_caminho_vazio_retorna_base() {
        let p = make_provider("/mnt/share");
        assert_eq!(p.resolve(""), std::path::PathBuf::from("/mnt/share"));
    }

    #[test]
    fn validate_rejeita_traversal_simples() {
        assert!(SmbProvider::validate_remote_path("../etc/passwd").is_err());
        assert!(SmbProvider::validate_remote_path("..").is_err());
    }

    #[test]
    fn validate_rejeita_traversal_profundo() {
        assert!(SmbProvider::validate_remote_path("videos/../../etc/shadow").is_err());
        assert!(SmbProvider::validate_remote_path("a\\..\\b").is_err());
    }

    #[test]
    fn validate_aceita_caminhos_normais() {
        assert!(SmbProvider::validate_remote_path("videos/clip.mp4").is_ok());
        assert!(SmbProvider::validate_remote_path("").is_ok());
        assert!(SmbProvider::validate_remote_path("a..b/file").is_ok());
    }

    #[test]
    fn resolve_backslash_removida() {
        let p = make_provider("/mnt/share");
        // Backslashes no início são tratados como barra
        let result = p.resolve("\\sub\\file.mp4");
        assert_eq!(result, std::path::PathBuf::from("/mnt/share/sub/file.mp4"));
    }

    #[test]
    fn resolve_base_windows() {
        let p = make_provider(r"C:\Shares\nexora");
        let result = p.resolve("clips\\video.mp4");
        // Path::join no Windows usa os separadores nativos
        assert!(result.starts_with(r"C:\Shares\nexora"));
    }
}

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

    fn validate_remote_path(path: &str) -> Result<(), String> {
        if path.split(['/', '\\']).any(|c| c == "..") {
            return Err("Caminho inválido: componentes '..' não são permitidos".to_string());
        }
        Ok(())
    }

    fn resolve(&self, remote_path: &str) -> std::path::PathBuf {
        let cleaned = remote_path.trim_start_matches(['/', '\\']);
        std::path::Path::new(&self.base_path).join(cleaned)
    }

    async fn copy_file(src: &Path, dst: &Path) -> Result<(), String> {
        // Tenta copy atómica primeiro; em caso de falha cross-device usa read+write
        if tokio::fs::copy(src, dst).await.is_ok() {
            return Ok(());
        }
        let data = tokio::fs::read(src)
            .await
            .map_err(|e| format!("Leitura falhou: {e}"))?;
        tokio::fs::write(dst, data)
            .await
            .map_err(|e| format!("Escrita falhou: {e}"))
    }
}

#[async_trait]
impl CloudProvider for SmbProvider {
    fn provider_type(&self) -> &'static str {
        "smb"
    }

    async fn test_connection(&self) -> Result<(), String> {
        let base = std::path::PathBuf::from(&self.base_path);

        if !tokio::fs::try_exists(&base).await.unwrap_or(false) {
            return Err(format!("Pasta inacessível: {}", self.base_path));
        }

        // Verifica permissão de escrita com ficheiro temporário
        let probe = base.join(".nexora_probe");
        tokio::fs::write(&probe, b"probe")
            .await
            .map_err(|e| format!("Sem permissão de escrita: {e}"))?;
        let _ = tokio::fs::remove_file(&probe).await;
        Ok(())
    }

    async fn upload(&self, local_path: &Path, remote_path: &str) -> Result<String, String> {
        Self::validate_remote_path(remote_path)?;
        let dest = self.resolve(remote_path);
        if let Some(parent) = dest.parent() {
            tokio::fs::create_dir_all(parent)
                .await
                .map_err(|e| e.to_string())?;
        }
        Self::copy_file(local_path, &dest).await?;
        Ok(dest.to_string_lossy().to_string())
    }

    async fn download(&self, remote_path: &str, local_path: &Path) -> Result<(), String> {
        Self::validate_remote_path(remote_path)?;
        let src = self.resolve(remote_path);
        if let Some(parent) = local_path.parent() {
            tokio::fs::create_dir_all(parent)
                .await
                .map_err(|e| e.to_string())?;
        }
        Self::copy_file(&src, local_path).await
    }

    async fn list_files(&self, path: &str) -> Result<Vec<super::provider::RemoteFile>, String> {
        use super::provider::RemoteFile;
        Self::validate_remote_path(path)?;
        let dir = self.resolve(path);

        let mut read_dir = tokio::fs::read_dir(&dir).await.map_err(|e| {
            format!(
                "Leitura de directório SMB falhou em {}: {e}",
                dir.display()
            )
        })?;

        let mut files = Vec::new();
        while let Some(entry) = read_dir
            .next_entry()
            .await
            .map_err(|e| e.to_string())?
        {
            let name = entry.file_name().to_string_lossy().to_string();
            let meta = entry.metadata().await.map_err(|e| e.to_string())?;
            let is_dir = meta.is_dir();
            let size = if is_dir { None } else { Some(meta.len()) };
            let modified = meta
                .modified()
                .ok()
                .map(|t| chrono::DateTime::<chrono::Utc>::from(t).to_rfc3339());
            let rel_path = if path.is_empty() {
                name.clone()
            } else {
                format!("{}/{}", path.trim_end_matches('/'), name)
            };
            files.push(RemoteFile {
                name,
                path: rel_path,
                size,
                modified,
                is_dir,
            });
        }
        Ok(files)
    }

    async fn delete_files(&self, paths: &[String]) -> Result<Vec<String>, String> {
        for path in paths {
            Self::validate_remote_path(path)?;
        }
        let mut failed = Vec::new();
        for path in paths {
            let full = self.resolve(path);
            if let Err(e) = tokio::fs::remove_file(&full).await {
                failed.push(format!("{path}: {e}"));
            }
        }
        Ok(failed)
    }
}
