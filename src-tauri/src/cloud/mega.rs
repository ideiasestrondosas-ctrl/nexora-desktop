use super::provider::{CloudProvider, RemoteFile};
use async_trait::async_trait;
use std::path::Path;

#[derive(Debug)]
pub struct MegaProvider {
    email: String,
    password: String,
    base_path: String, // ex: "Nexora/Output" (sem /Root/ — adicionado internamente)
}

impl MegaProvider {
    pub fn new(config: &serde_json::Value, creds: &serde_json::Value) -> Result<Self, String> {
        let email = config["email"]
            .as_str()
            .filter(|s| !s.is_empty())
            .ok_or("Email MEGA é obrigatório")?
            .to_string();
        let password = creds["password"]
            .as_str()
            .filter(|s| !s.is_empty())
            .ok_or("Password MEGA é obrigatória")?
            .to_string();
        let raw = config["base_path"]
            .as_str()
            .unwrap_or("Nexora/Output")
            .to_string();
        // Normalizar: remover / iniciais e finais
        let base_path = raw.trim_matches('/').to_string();
        let base_path = if base_path.is_empty() {
            "Nexora/Output".to_string()
        } else {
            base_path
        };
        Ok(Self { email, password, base_path })
    }

    fn full_path(&self, subpath: &str) -> String {
        let sub = subpath.trim_matches('/');
        if sub.is_empty() {
            format!("/Root/{}", self.base_path)
        } else {
            // subpath é um handle MEGA composto ("handle" ou "parent/handle")
            // extrai apenas o último segmento (o handle folha)
            let handle = sub.rsplit('/').next().unwrap_or(sub);
            handle.to_string() // usado com get_node_by_handle
        }
    }
}

#[async_trait]
impl CloudProvider for MegaProvider {
    fn provider_type(&self) -> &'static str {
        "mega"
    }

    async fn test_connection(&self) -> Result<(), String> {
        todo!()
    }

    async fn upload(&self, _local_path: &Path, _remote_path: &str) -> Result<String, String> {
        todo!()
    }

    async fn download(&self, _remote_path: &str, _local_path: &Path) -> Result<(), String> {
        todo!()
    }

    async fn list_files(&self, _path: &str) -> Result<Vec<RemoteFile>, String> {
        todo!()
    }

    async fn delete_files(&self, _paths: &[String]) -> Result<Vec<String>, String> {
        todo!()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn cfg(base_path: &str) -> serde_json::Value {
        serde_json::json!({ "base_path": base_path, "email": "test@example.com" })
    }
    fn creds() -> serde_json::Value {
        serde_json::json!({ "password": "secret" })
    }

    #[test]
    fn new_normalises_base_path_strips_slashes() {
        let p = MegaProvider::new(&cfg("/Nexora/Output/"), &creds()).unwrap();
        assert_eq!(p.base_path, "Nexora/Output");
    }

    #[test]
    fn new_normalises_base_path_no_slash() {
        let p = MegaProvider::new(&cfg("Nexora/Output"), &creds()).unwrap();
        assert_eq!(p.base_path, "Nexora/Output");
    }

    #[test]
    fn new_defaults_base_path_when_empty() {
        let p = MegaProvider::new(&serde_json::json!({ "email": "x@y.com" }), &creds()).unwrap();
        assert_eq!(p.base_path, "Nexora/Output");
    }

    #[test]
    fn new_fails_without_email() {
        let err = MegaProvider::new(&serde_json::json!({ "base_path": "A" }), &creds())
            .unwrap_err();
        assert!(err.contains("Email"));
    }

    #[test]
    fn new_fails_without_password() {
        let err = MegaProvider::new(&cfg("A"), &serde_json::json!({})).unwrap_err();
        assert!(err.contains("Password"));
    }

    #[test]
    fn new_fails_with_empty_email() {
        let err = MegaProvider::new(
            &serde_json::json!({ "base_path": "A", "email": "" }),
            &creds(),
        )
        .unwrap_err();
        assert!(err.contains("Email"));
    }

    #[test]
    fn new_fails_with_empty_password() {
        let err = MegaProvider::new(&cfg("A"), &serde_json::json!({ "password": "" })).unwrap_err();
        assert!(err.contains("Password"));
    }

    #[test]
    fn full_path_empty_subpath_returns_root_path() {
        let p = MegaProvider::new(&cfg("Nexora/Output"), &creds()).unwrap();
        assert_eq!(p.full_path(""), "/Root/Nexora/Output");
    }

    #[test]
    fn full_path_handle_returns_leaf_handle() {
        let p = MegaProvider::new(&cfg("Nexora/Output"), &creds()).unwrap();
        assert_eq!(p.full_path("AAAA1234"), "AAAA1234");
    }

    #[test]
    fn full_path_compound_returns_leaf_handle() {
        let p = MegaProvider::new(&cfg("Nexora/Output"), &creds()).unwrap();
        assert_eq!(p.full_path("AAAA/BBBB"), "BBBB");
    }
}
