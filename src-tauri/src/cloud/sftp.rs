use super::provider::CloudProvider;
use async_trait::async_trait;
use russh::client;
use russh_sftp::client::SftpSession;
use std::path::Path;
use std::sync::{Arc, Mutex};
use tokio::io::{AsyncReadExt, AsyncWriteExt};

/// Calcula a fingerprint SHA256 de uma chave pública SSH no formato OpenSSH
/// (`SHA256:<base64-sem-padding>`), usada para verificação de host key (TOFU).
fn compute_fingerprint(key: &ssh_key::PublicKey) -> String {
    key.fingerprint(ssh_key::HashAlg::Sha256).to_string()
}

// Módulo de testes unitários para funções puras do SftpProvider
#[cfg(test)]
mod tests {
    use super::*;

    fn make_provider(host: &str, base_path: &str) -> SftpProvider {
        SftpProvider {
            host: host.to_string(),
            port: 22,
            username: "user".to_string(),
            password: "pass".to_string(),
            base_path: base_path.to_string(),
            expected_fingerprint: None,
        }
    }

    #[test]
    fn full_remote_path_com_base_e_relativo() {
        // base_path com barra final não deve duplicar a barra
        let p = make_provider("host", "/uploads/");
        assert_eq!(
            p.full_remote_path("videos/foo.mp4"),
            "/uploads/videos/foo.mp4"
        );
    }

    #[test]
    fn full_remote_path_base_vazia_usa_raiz() {
        let p = make_provider("host", "");
        assert_eq!(p.full_remote_path("media/bar.mkv"), "/media/bar.mkv");
    }

    #[test]
    fn full_remote_path_relativo_com_barra_inicial_e_removido() {
        // O método trim_start_matches('/') deve remover a barra inicial do relativo
        let p = make_provider("host", "/home/user");
        assert_eq!(
            p.full_remote_path("/sub/file.mp4"),
            "/home/user/sub/file.mp4"
        );
    }

    #[test]
    fn full_remote_path_relativo_vazio() {
        let p = make_provider("host", "/srv/sftp");
        // Relativo vazio deve resultar em base + "/"
        assert_eq!(p.full_remote_path(""), "/srv/sftp/");
    }

    #[test]
    fn validate_remote_path_rejeita_traversal() {
        assert!(SftpProvider::validate_remote_path("../etc/passwd").is_err());
        assert!(SftpProvider::validate_remote_path("videos/../../etc").is_err());
        assert!(SftpProvider::validate_remote_path("..").is_err());
    }

    #[test]
    fn validate_remote_path_aceita_caminhos_normais() {
        assert!(SftpProvider::validate_remote_path("videos/clip.mp4").is_ok());
        assert!(SftpProvider::validate_remote_path("").is_ok());
        assert!(SftpProvider::validate_remote_path("a..b/file.mp4").is_ok());
    }

    // ── Verificação de host key (C1) ──────────────────────────────────────────

    #[test]
    fn host_key_modo_descoberta_aceita_qualquer_fingerprint() {
        // expected=None (TOFU descoberta): aceita para captar a fingerprint
        assert!(fingerprint_is_trusted(&None, "SHA256:qualquer"));
    }

    #[test]
    fn host_key_aceita_fingerprint_coincidente() {
        let expected = Some("SHA256:abc123".to_string());
        assert!(fingerprint_is_trusted(&expected, "SHA256:abc123"));
    }

    #[test]
    fn host_key_rejeita_fingerprint_divergente() {
        // Divergência = possível MITM → rejeitar
        let expected = Some("SHA256:abc123".to_string());
        assert!(!fingerprint_is_trusted(&expected, "SHA256:OUTRA"));
    }

    #[test]
    fn new_le_host_fingerprint_do_config() {
        let config =
            serde_json::json!({ "host": "h", "port": 22, "hostFingerprint": "SHA256:xyz" });
        let creds = serde_json::json!({ "username": "u", "password": "p" });
        let p = SftpProvider::new(&config, &creds).unwrap();
        assert_eq!(p.expected_fingerprint.as_deref(), Some("SHA256:xyz"));
    }

    #[test]
    fn new_sem_fingerprint_fica_nao_confiavel() {
        let config = serde_json::json!({ "host": "h", "port": 22 });
        let creds = serde_json::json!({ "username": "u", "password": "p" });
        let p = SftpProvider::new(&config, &creds).unwrap();
        assert!(p.expected_fingerprint.is_none());
    }

    #[tokio::test]
    async fn open_sftp_recusa_host_nao_confiavel_sem_ligar() {
        // Sem fingerprint confiável, open_sftp falha imediatamente (sem rede).
        let p = make_provider("host", "/uploads");
        let err = match p.open_sftp().await {
            Ok(_) => panic!("esperava erro de host não confiável"),
            Err(e) => e,
        };
        assert!(err.contains("não confiável"), "mensagem inesperada: {err}");
    }
}

pub struct SftpProvider {
    host: String,
    port: u16,
    username: String,
    password: String,
    base_path: String,
    /// Fingerprint SHA256 da host key em que o utilizador confiou (TOFU).
    /// `None` = host ainda não confiado; operações de I/O são recusadas.
    expected_fingerprint: Option<String>,
}

impl SftpProvider {
    pub fn new(config: &serde_json::Value, creds: &serde_json::Value) -> Result<Self, String> {
        Ok(Self {
            host: config["host"]
                .as_str()
                .ok_or_else(|| "host é obrigatório".to_string())?
                .to_string(),
            port: config["port"].as_u64().unwrap_or(22) as u16,
            base_path: config["base_path"].as_str().unwrap_or("/").to_string(),
            username: creds["username"]
                .as_str()
                .ok_or_else(|| "username é obrigatório".to_string())?
                .to_string(),
            password: creds["password"].as_str().unwrap_or("").to_string(),
            expected_fingerprint: config["hostFingerprint"]
                .as_str()
                .filter(|s| !s.is_empty())
                .map(|s| s.to_string()),
        })
    }

    fn validate_remote_path(path: &str) -> Result<(), String> {
        if path.split('/').any(|c| c == "..") {
            return Err("Caminho inválido: componentes '..' não são permitidos".to_string());
        }
        Ok(())
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

    /// Liga ao servidor verificando a host key contra `expected`.
    /// Devolve o handle autenticado e o estado partilhado com a fingerprint observada.
    async fn connect_handle(
        &self,
        expected: Option<String>,
    ) -> Result<(client::Handle<SshHandler>, Arc<Mutex<Option<String>>>), String> {
        let observed = Arc::new(Mutex::new(None));
        let handler = SshHandler {
            expected: expected.clone(),
            observed: observed.clone(),
        };
        let config = Arc::new(client::Config::default());
        let addr = (self.host.as_str(), self.port);
        let mut handle = match client::connect(config, addr, handler).await {
            Ok(h) => h,
            Err(e) => {
                // Se capturámos uma fingerprint diferente da esperada, a ligação foi
                // recusada por divergência de host key (possível MITM).
                if let (Some(exp), Some(obs)) = (&expected, observed.lock().unwrap().clone()) {
                    if exp != &obs {
                        return Err(format!(
                            "Identidade do servidor SFTP mudou! Esperado {exp}, recebido {obs}. \
                             Ligação recusada (possível ataque MITM). Se a mudança for legítima, \
                             edite o perfil e confirme a nova identidade do servidor."
                        ));
                    }
                }
                return Err(format!(
                    "Ligação SFTP falhou em {}:{}: {e}",
                    self.host, self.port
                ));
            }
        };
        let authenticated = handle
            .authenticate_password(&self.username, &self.password)
            .await
            .map_err(|e| format!("Autenticação SFTP falhou: {e}"))?;
        if !matches!(authenticated, russh::client::AuthResult::Success) {
            return Err("Autenticação SFTP rejeitada pelo servidor".to_string());
        }
        Ok((handle, observed))
    }

    /// Liga em modo descoberta (sem verificação) e devolve a fingerprint SHA256 da
    /// host key do servidor — usado pelo fluxo TOFU para confirmação do utilizador.
    pub async fn probe_fingerprint(&self) -> Result<String, String> {
        let (_handle, observed) = self.connect_handle(None).await?;
        let fingerprint = observed.lock().unwrap().clone();
        fingerprint
            .ok_or_else(|| "Não foi possível obter a identidade do servidor SFTP".to_string())
    }

    async fn open_sftp(&self) -> Result<SftpSession, String> {
        // Recusa operações de I/O se o host ainda não foi confiado (TOFU).
        let expected = self.expected_fingerprint.clone().ok_or_else(|| {
            "Servidor SFTP não confiável — abra o perfil, teste a ligação e confirme a \
             identidade do servidor antes de carregar ou transferir ficheiros."
                .to_string()
        })?;
        let (handle, _observed) = self.connect_handle(Some(expected)).await?;
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

struct SshHandler {
    /// Fingerprint confiável esperada. `None` = modo descoberta (aceita e capta).
    expected: Option<String>,
    /// Fingerprint observada do servidor, captada durante o handshake.
    observed: Arc<Mutex<Option<String>>>,
}

impl client::Handler for SshHandler {
    type Error = russh::Error;

    async fn check_server_key(
        &mut self,
        server_public_key: &ssh_key::PublicKey,
    ) -> Result<bool, Self::Error> {
        let fingerprint = compute_fingerprint(server_public_key);
        *self.observed.lock().unwrap() = Some(fingerprint.clone());
        Ok(fingerprint_is_trusted(&self.expected, &fingerprint))
    }
}

/// Decisão de confiança da host key (lógica pura, testável sem rede).
/// `None` esperado = modo descoberta (aceita). Caso contrário só aceita igualdade exacta.
fn fingerprint_is_trusted(expected: &Option<String>, observed: &str) -> bool {
    match expected {
        None => true,
        Some(expected) => expected == observed,
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
        Self::validate_remote_path(remote_path)?;
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
        Self::validate_remote_path(remote_path)?;
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

    async fn list_files(&self, path: &str) -> Result<Vec<super::provider::RemoteFile>, String> {
        use super::provider::RemoteFile;
        Self::validate_remote_path(path)?;
        let dir_path = self.full_remote_path(path);
        let sftp = self.open_sftp().await?;

        // read_dir devolve um iterador síncrono ReadDir; já omite "." e ".."
        let read_dir = match sftp.read_dir(&dir_path).await {
            Ok(rd) => rd,
            Err(e) => {
                let _ = sftp.close().await;
                return Err(format!("SFTP readdir falhou em {dir_path}: {e}"));
            }
        };

        let mut files = Vec::new();
        for entry in read_dir {
            let name = entry.file_name();
            let meta = entry.metadata();
            let is_dir = entry.file_type().is_dir();

            // Tamanho só faz sentido para ficheiros
            let size = if is_dir { None } else { meta.size };

            // mtime é Option<u32> — segundos Unix
            let modified = meta.mtime.map(|t| {
                chrono::DateTime::from_timestamp(t as i64, 0)
                    .map(|dt| dt.to_rfc3339())
                    .unwrap_or_default()
            });

            // Caminho relativo à base_path (sem barra inicial)
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

        let _ = sftp.close().await;

        Ok(files)
    }

    async fn delete_files(&self, paths: &[String]) -> Result<Vec<String>, String> {
        for path in paths {
            Self::validate_remote_path(path)?;
        }
        let sftp = self.open_sftp().await?;
        let mut failed = Vec::new();

        for path in paths {
            let full = self.full_remote_path(path);
            if let Err(e) = sftp.remove_file(&full).await {
                failed.push(format!("{path}: {e}"));
            }
        }

        // Fechar a sessão independentemente dos erros
        let _ = sftp.close().await;

        Ok(failed)
    }
}
