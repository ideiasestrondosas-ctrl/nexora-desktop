use log::{info, warn};
use std::path::PathBuf;
use tauri::{AppHandle, Manager, Runtime};

/// Resolve o caminho absoluto do binário nexora-engine.
/// Ordem de prioridade:
/// 1. Ao lado do executável (desenvolvimento: target/debug/ ou target/release/)
/// 2. resource_dir() do Tauri (produção: bundle do instalador)
/// 3. Nome do comando no PATH (fallback)
pub fn resolve_engine_path<R: Runtime>(app: &AppHandle<R>) -> PathBuf {
    let name = if cfg!(target_os = "windows") {
        "nexora-engine.exe"
    } else {
        "nexora-engine"
    };

    // 1. Desenvolvimento: ao lado do executável
    if let Ok(exe) = std::env::current_exe() {
        if let Some(exe_dir) = exe.parent() {
            let candidate = exe_dir.join(name);
            if candidate.exists() {
                info!("nexora-engine encontrado ao lado do exe: {:?}", candidate);
                return candidate;
            }
        }
    }

    // 2. Produção: resource_dir do Tauri
    if let Ok(resource_dir) = app.path().resource_dir() {
        let candidate = resource_dir.join(name);
        if candidate.exists() {
            info!("nexora-engine encontrado em resource_dir: {:?}", candidate);
            return candidate;
        }
    }

    warn!("nexora-engine não encontrado — a usar '{}' do PATH", name);
    PathBuf::from(name)
}

/// Resolve o caminho absoluto de um binário media (ffmpeg ou ffprobe).
pub fn resolve_media_binary_path<R: Runtime>(app: &AppHandle<R>, name: &str) -> PathBuf {
    let ext = if cfg!(target_os = "windows") { ".exe" } else { "" };

    if let Ok(exe) = std::env::current_exe() {
        if let Some(exe_dir) = exe.parent() {
            let candidate = exe_dir.join(format!("{}{}", name, ext));
            if candidate.exists() {
                return candidate;
            }
        }
    }

    if let Ok(resource_dir) = app.path().resource_dir() {
        let candidate = resource_dir.join(format!("{}{}", name, ext));
        if candidate.exists() {
            return candidate;
        }
    }

    PathBuf::from(name)
}
