use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct RemoteFile {
    pub name: String,
    pub path: String,
    pub size: Option<u64>,
    pub modified: Option<String>,
    pub is_dir: bool,
}

#[async_trait]
pub trait CloudProvider: Send + Sync {
    async fn test_connection(&self) -> Result<(), String>;
    async fn upload(&self, local_path: &Path, remote_path: &str) -> Result<String, String>;
    async fn download(&self, remote_path: &str, local_path: &Path) -> Result<(), String>;
    #[allow(dead_code)]
    fn provider_type(&self) -> &'static str;

    async fn list_files(&self, _path: &str) -> Result<Vec<RemoteFile>, String> {
        Err("Listagem de ficheiros não suportada para este fornecedor.".to_string())
    }

    async fn delete_files(&self, _paths: &[String]) -> Result<Vec<String>, String> {
        Err("Eliminação de ficheiros não suportada para este fornecedor.".to_string())
    }
}
