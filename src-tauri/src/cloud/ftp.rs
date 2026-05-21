// Implementação completa em Task 3
use super::provider::CloudProvider;
use async_trait::async_trait;
use std::path::Path;

pub struct FtpProvider;

impl FtpProvider {
    pub fn new(_config: &serde_json::Value, _creds: &serde_json::Value) -> Result<Self, String> {
        Err("FTP será implementado em Task 3".to_string())
    }
}

#[async_trait]
impl CloudProvider for FtpProvider {
    fn provider_type(&self) -> &'static str { "ftp" }
    async fn test_connection(&self) -> Result<(), String> { Err("não implementado".to_string()) }
    async fn upload(&self, _: &Path, _: &str) -> Result<String, String> { Err("não implementado".to_string()) }
    async fn download(&self, _: &str, _: &Path) -> Result<(), String> { Err("não implementado".to_string()) }
}
