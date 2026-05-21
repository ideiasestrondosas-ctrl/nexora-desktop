use async_trait::async_trait;
use std::path::Path;

#[async_trait]
pub trait CloudProvider: Send + Sync {
    async fn test_connection(&self) -> Result<(), String>;
    async fn upload(&self, local_path: &Path, remote_path: &str) -> Result<String, String>;
    async fn download(&self, remote_path: &str, local_path: &Path) -> Result<(), String>;
    fn provider_type(&self) -> &'static str;
}
