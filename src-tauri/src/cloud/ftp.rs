use super::provider::CloudProvider;
use async_trait::async_trait;
use std::path::Path;
use suppaftp::AsyncFtpStream;

pub struct FtpProvider {
    host: String,
    port: u16,
    username: String,
    password: String,
    base_path: String,
}

impl FtpProvider {
    pub fn new(config: &serde_json::Value, creds: &serde_json::Value) -> Result<Self, String> {
        Ok(Self {
            host: config["host"]
                .as_str()
                .ok_or_else(|| "host é obrigatório".to_string())?
                .to_string(),
            port: config["port"].as_u64().unwrap_or(21) as u16,
            base_path: config["base_path"]
                .as_str()
                .unwrap_or("/")
                .to_string(),
            username: creds["username"]
                .as_str()
                .unwrap_or("anonymous")
                .to_string(),
            password: creds["password"].as_str().unwrap_or("").to_string(),
        })
    }

    fn addr(&self) -> String {
        format!("{}:{}", self.host, self.port)
    }

    // Fix 2: evita double-slash quando base_path é "/" ou vazio
    fn full_remote_path(&self, relative: &str) -> String {
        let cleaned = relative.trim_start_matches('/');
        let base = self.base_path.trim_end_matches('/');
        if base.is_empty() {
            format!("/{cleaned}")
        } else {
            format!("{base}/{cleaned}")
        }
    }

    async fn connect(&self) -> Result<AsyncFtpStream, String> {
        let mut ftp = AsyncFtpStream::connect(self.addr())
            .await
            .map_err(|e| format!("Ligação FTP falhou em {}: {e}", self.addr()))?;
        ftp.login(&self.username, &self.password)
            .await
            .map_err(|e| format!("Autenticação FTP falhou: {e}"))?;
        Ok(ftp)
    }

    // Fix 1: lógica real de upload separada para garantir quit() sempre executado
    async fn do_upload(
        &self,
        ftp: &mut AsyncFtpStream,
        local_path: &Path,
        remote: &str,
    ) -> Result<String, String> {
        // Fix 3: usar rfind('/') em vez de std::path::Path::new no caminho remoto
        if let Some(last_slash) = remote.rfind('/') {
            let dir = &remote[..last_slash];
            if !dir.is_empty() {
                // Ignora erro — directório pode já existir
                let _ = ftp.mkdir(dir).await;
            }
        }

        // Fix 4: verificar tamanho antes de carregar o ficheiro inteiro em memória
        let metadata = tokio::fs::metadata(local_path)
            .await
            .map_err(|e| format!("Não foi possível ler metadados de {}: {e}", local_path.display()))?;
        if metadata.len() > 2 * 1024 * 1024 * 1024 {
            return Err(format!(
                "Ficheiro demasiado grande para FTP ({} GB). Use S3 ou SMB para ficheiros > 2 GB",
                metadata.len() / 1024 / 1024 / 1024
            ));
        }

        // Ler ficheiro local para memória; &[u8] implementa futures_io::AsyncRead
        let data = tokio::fs::read(local_path)
            .await
            .map_err(|e| format!("Falha ao ler {}: {e}", local_path.display()))?;

        ftp.put_file(remote, &mut data.as_slice())
            .await
            .map_err(|e| format!("Upload FTP falhou: {e}"))?;

        Ok(remote.to_string())
    }

    // Fix 1: lógica real de download separada para garantir quit() sempre executado
    async fn do_download(
        &self,
        ftp: &mut AsyncFtpStream,
        remote: &str,
        local_path: &Path,
    ) -> Result<(), String> {
        use futures_lite::io::AsyncReadExt;

        // Obter stream de leitura e ler todo o conteúdo para buffer
        let mut stream = ftp
            .retr_as_stream(remote)
            .await
            .map_err(|e| format!("Download FTP falhou: {e}"))?;

        let mut data: Vec<u8> = Vec::new();
        stream
            .read_to_end(&mut data)
            .await
            .map_err(|e| format!("Leitura do stream FTP falhou: {e}"))?;

        ftp.finalize_retr_stream(stream)
            .await
            .map_err(|e| format!("Finalização do stream FTP falhou: {e}"))?;

        // Criar directório local se necessário
        if let Some(parent) = local_path.parent() {
            tokio::fs::create_dir_all(parent)
                .await
                .map_err(|e| e.to_string())?;
        }
        tokio::fs::write(local_path, &data)
            .await
            .map_err(|e| e.to_string())?;

        Ok(())
    }
}

#[async_trait]
impl CloudProvider for FtpProvider {
    fn provider_type(&self) -> &'static str {
        "ftp"
    }

    async fn test_connection(&self) -> Result<(), String> {
        let mut ftp = self.connect().await?;
        let _ = ftp.quit().await;
        Ok(())
    }

    // Fix 1: quit() é chamado mesmo que o upload falhe
    async fn upload(&self, local_path: &Path, remote_path: &str) -> Result<String, String> {
        let remote = self.full_remote_path(remote_path);
        let mut ftp = self.connect().await?;

        let result = self.do_upload(&mut ftp, local_path, &remote).await;
        let _ = ftp.quit().await;
        result
    }

    // Fix 1: quit() é chamado mesmo que o download falhe
    async fn download(&self, remote_path: &str, local_path: &Path) -> Result<(), String> {
        let remote = self.full_remote_path(remote_path);
        let mut ftp = self.connect().await?;

        let result = self.do_download(&mut ftp, &remote, local_path).await;
        let _ = ftp.quit().await;
        result
    }
}
