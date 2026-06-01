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

/// Verifica que o ficheiro existe e tem tamanho > 4 KiB (rejeita stubs de 1 byte do Tauri).
fn is_real_binary(path: &std::path::Path) -> bool {
    path.metadata().map(|m| m.len() > 4096).unwrap_or(false)
}

/// Resolve o caminho absoluto de um binário media (ffmpeg ou ffprobe).
pub fn resolve_media_binary_path<R: Runtime>(app: &AppHandle<R>, name: &str) -> PathBuf {
    let ext = if cfg!(target_os = "windows") {
        ".exe"
    } else {
        ""
    };
    let bin_name = format!("{}{}", name, ext);

    // 1. Ao lado do executável (produção: Tauri copia binários reais aqui)
    if let Ok(exe) = std::env::current_exe() {
        if let Some(exe_dir) = exe.parent() {
            let candidate = exe_dir.join(&bin_name);
            if is_real_binary(&candidate) {
                return candidate;
            }

            // 2. src-tauri/binaries/ com nome triple (dev: stubs em target/debug/ têm 1 byte)
            // Sobe: debug/ → target/ → src-tauri/ → raiz do projecto
            if let Some(project_root) = exe_dir
                .parent()
                .and_then(|p| p.parent())
                .and_then(|p| p.parent())
            {
                let binaries_dir = project_root.join("src-tauri").join("binaries");
                if let Ok(entries) = std::fs::read_dir(&binaries_dir) {
                    for entry in entries.flatten() {
                        let fname = entry.file_name();
                        let fname_str = fname.to_string_lossy();
                        if fname_str.starts_with(&format!("{}-", name))
                            && fname_str.ends_with(ext)
                        {
                            let candidate = entry.path();
                            if is_real_binary(&candidate) {
                                return candidate;
                            }
                        }
                    }
                }
            }
        }
    }

    // 3. resource_dir do Tauri (produção: bundle do instalador)
    if let Ok(resource_dir) = app.path().resource_dir() {
        let candidate = resource_dir.join(&bin_name);
        if is_real_binary(&candidate) {
            return candidate;
        }
    }

    PathBuf::from(name)
}
