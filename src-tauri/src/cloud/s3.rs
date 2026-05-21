// Implementação completa em Task 14
use super::provider::CloudProvider;
use async_trait::async_trait;
use std::path::Path;

pub struct S3Provider;

impl S3Provider {
    pub fn new(_config: &serde_json::Value, _creds: &serde_json::Value) -> Result<Self, String> {
        Err("S3 será implementado na Fase 2".to_string())
    }
}

#[async_trait]
impl CloudProvider for S3Provider {
    fn provider_type(&self) -> &'static str { "s3" }
    async fn test_connection(&self) -> Result<(), String> { Err("não implementado".to_string()) }
    async fn upload(&self, _: &Path, _: &str) -> Result<String, String> { Err("não implementado".to_string()) }
    async fn download(&self, _: &str, _: &Path) -> Result<(), String> { Err("não implementado".to_string()) }
}
