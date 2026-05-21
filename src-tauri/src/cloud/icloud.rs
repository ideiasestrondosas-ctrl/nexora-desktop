// Implementação completa em Task 16
use super::provider::CloudProvider;
use async_trait::async_trait;
use std::path::Path;

pub struct ICloudProvider;

impl ICloudProvider {
    pub fn new(_config: &serde_json::Value) -> Result<Self, String> {
        Err("iCloud será implementado na Fase 4".to_string())
    }
}

#[async_trait]
impl CloudProvider for ICloudProvider {
    fn provider_type(&self) -> &'static str { "icloud" }
    async fn test_connection(&self) -> Result<(), String> { Err("não implementado".to_string()) }
    async fn upload(&self, _: &Path, _: &str) -> Result<String, String> { Err("não implementado".to_string()) }
    async fn download(&self, _: &str, _: &Path) -> Result<(), String> { Err("não implementado".to_string()) }
}
