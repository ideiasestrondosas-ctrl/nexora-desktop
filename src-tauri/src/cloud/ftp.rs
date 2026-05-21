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

    fn full_remote_path(&self, relative: &str) -> String {
        let cleaned = relative.trim_start_matches('/');
        format!("{}/{}", self.base_path.trim_end_matches('/'), cleaned)
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

    async fn upload(&self, local_path: &Path, remote_path: &str) -> Result<String, String> {
        let remote = self.full_remote_path(remote_path);
        let mut ftp = self.connect().await?;

        // Criar directório remoto se necessário
        if let Some(dir) = std::path::Path::new(&remote).parent() {
            let dir_str = dir.to_string_lossy();
            if !dir_str.is_empty() && dir_str != "/" {
                let _ = ftp.mkdir(dir_str.as_ref()).await;
            }
        }

        // Ler ficheiro local para memória; &[u8] implementa futures_io::AsyncRead
        let data = std::fs::read(local_path).map_err(|e| e.to_string())?;

        ftp.put_file(&remote, &mut data.as_slice())
            .await
            .map_err(|e| format!("Upload FTP falhou: {e}"))?;
        let _ = ftp.quit().await;
        Ok(remote)
    }

    async fn download(&self, remote_path: &str, local_path: &Path) -> Result<(), String> {
        use futures_lite::io::AsyncReadExt;

        let remote = self.full_remote_path(remote_path);
        let mut ftp = self.connect().await?;

        // Obter stream de leitura e ler todo o conteúdo para buffer
        let mut stream = ftp
            .retr_as_stream(&remote)
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
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        std::fs::write(local_path, &data).map_err(|e| e.to_string())?;

        let _ = ftp.quit().await;
        Ok(())
    }
}
