use super::provider::CloudProvider;
use async_trait::async_trait;
use russh::client;
use russh_sftp::client::SftpSession;
use std::path::Path;
use std::sync::Arc;
use tokio::io::{AsyncReadExt, AsyncWriteExt};

pub struct SftpProvider {
    host: String,
    port: u16,
    username: String,
    password: String,
    base_path: String,
}

impl SftpProvider {
    pub fn new(config: &serde_json::Value, creds: &serde_json::Value) -> Result<Self, String> {
        Ok(Self {
            host: config["host"]
                .as_str()
                .ok_or_else(|| "host é obrigatório".to_string())?
                .to_string(),
            port: config["port"].as_u64().unwrap_or(22) as u16,
            base_path: config["base_path"]
                .as_str()
                .unwrap_or("/")
                .to_string(),
            username: creds["username"]
                .as_str()
                .ok_or_else(|| "username é obrigatório".to_string())?
                .to_string(),
            password: creds["password"].as_str().unwrap_or("").to_string(),
        })
    }

    fn full_remote_path(&self, relative: &str) -> String {
        let cleaned = relative.trim_start_matches('/');
        let base = self.base_path.trim_end_matches('/');
        if base.is_empty() {
            format!("/{cleaned}")
        } else {
            format!("{base}/{cleaned}")
        }
    }

    async fn open_sftp(&self) -> Result<SftpSession, String> {
        let config = Arc::new(client::Config::default());
        let addr = (self.host.as_str(), self.port);
        let mut handle = client::connect(config, addr, SshHandler)
            .await
            .map_err(|e| format!("Ligação SFTP falhou em {}:{}: {e}", self.host, self.port))?;
        let authenticated = handle
            .authenticate_password(&self.username, &self.password)
            .await
            .map_err(|e| format!("Autenticação SFTP falhou: {e}"))?;
        if !authenticated {
            return Err("Autenticação SFTP rejeitada pelo servidor".to_string());
        }
        let channel = handle
            .channel_open_session()
            .await
            .map_err(|e| format!("Abertura de canal SFTP falhou: {e}"))?;
        channel
            .request_subsystem(true, "sftp")
            .await
            .map_err(|e| format!("Subsistema SFTP falhou: {e}"))?;
        SftpSession::new(channel.into_stream())
            .await
            .map_err(|e| format!("Sessão SFTP falhou: {e}"))
    }
}

struct SshHandler;

#[async_trait]
impl client::Handler for SshHandler {
    type Error = russh::Error;

    async fn check_server_key(
        &mut self,
        _server_public_key: &russh::keys::key::PublicKey,
    ) -> Result<bool, Self::Error> {
        Ok(true)
    }
}

#[async_trait]
impl CloudProvider for SftpProvider {
    fn provider_type(&self) -> &'static str {
        "sftp"
    }

    async fn test_connection(&self) -> Result<(), String> {
        self.open_sftp().await.map(|_| ())
    }

    async fn upload(&self, local_path: &Path, remote_path: &str) -> Result<String, String> {
        let remote = self.full_remote_path(remote_path);
        let sftp = self.open_sftp().await?;

        let data = tokio::fs::read(local_path)
            .await
            .map_err(|e| format!("Falha ao ler {}: {e}", local_path.display()))?;

        let mut file = sftp
            .create(&remote)
            .await
            .map_err(|e| format!("Criação de ficheiro SFTP falhou em {remote}: {e}"))?;
        file.write_all(&data)
            .await
            .map_err(|e| format!("Escrita SFTP falhou: {e}"))?;
        file.shutdown()
            .await
            .map_err(|e| format!("Fecho de ficheiro SFTP falhou: {e}"))?;
        Ok(remote)
    }

    async fn download(&self, remote_path: &str, local_path: &Path) -> Result<(), String> {
        let remote = self.full_remote_path(remote_path);
        let sftp = self.open_sftp().await?;

        let mut file = sftp
            .open(&remote)
            .await
            .map_err(|e| format!("Abertura de ficheiro SFTP falhou em {remote}: {e}"))?;
        let mut data = Vec::new();
        file.read_to_end(&mut data)
            .await
            .map_err(|e| format!("Leitura SFTP falhou: {e}"))?;

        if let Some(parent) = local_path.parent() {
            tokio::fs::create_dir_all(parent)
                .await
                .map_err(|e| e.to_string())?;
        }
        tokio::fs::write(local_path, data)
            .await
            .map_err(|e| format!("Escrita local falhou: {e}"))
    }
}
