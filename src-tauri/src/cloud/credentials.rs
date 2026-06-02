use keyring::Entry;

const KEYRING_SERVICE: &str = "nexora-cloud";

pub fn save(profile_id: &str, creds_json: &str) -> Result<(), String> {
    Entry::new(KEYRING_SERVICE, profile_id)
        .map_err(|e| format!("Keychain inacessível: {e}"))?
        .set_secret(creds_json.as_bytes())
        .map_err(|e| format!("Falha ao guardar credenciais no keychain: {e}"))
}

pub fn load(profile_id: &str) -> serde_json::Value {
    Entry::new(KEYRING_SERVICE, profile_id)
        .ok()
        .and_then(|e| e.get_secret().ok())
        .and_then(|b| serde_json::from_slice(&b).ok())
        .unwrap_or(serde_json::Value::Object(Default::default()))
}

pub fn delete(profile_id: &str) {
    if let Ok(entry) = Entry::new(KEYRING_SERVICE, profile_id) {
        let _ = entry.delete_credential();
    }
}
