use crate::state::AppState;
use log::{error, info, warn};
use std::path::PathBuf;
use std::process::{Command, Stdio};
use tauri::{AppHandle, Emitter, Manager, Runtime};

pub fn spawn<R: Runtime>(app: AppHandle<R>, db_path: &std::path::Path) -> anyhow::Result<()> {
    let script_path = resolve_script_path(&app);

    if !script_path.exists() {
        warn!(
            "nexora-sidecar.js nao encontrado em {:?} — executa 'npm run sidecar:build' primeiro",
            script_path
        );
        return Ok(());
    }

    // Verificar se node esta disponivel no PATH antes de tentar o spawn
    Command::new("node")
        .arg("--version")
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()
        .map_err(|_| {
            anyhow::anyhow!(
                "Node.js nao encontrado no PATH — instala Node.js 20+ para o sidecar funcionar"
            )
        })?;

    // Resolver caminhos dos binarios media (FFmpeg / FFprobe)
    let ffmpeg_path = resolve_media_binary_path(&app, "ffmpeg");
    let ffprobe_path = resolve_media_binary_path(&app, "ffprobe");

    if ffmpeg_path.exists() {
        info!("FFmpeg bundled encontrado: {:?}", ffmpeg_path);
    } else {
        warn!(
            "FFmpeg bundled nao encontrado — a usar 'ffmpeg' do PATH (o utilizador pode precisar de instalar FFmpeg)"
        );
    }

    if ffprobe_path.exists() {
        info!("FFprobe bundled encontrado: {:?}", ffprobe_path);
    } else {
        warn!(
            "FFprobe bundled nao encontrado — a usar 'ffprobe' do PATH (o utilizador pode precisar de instalar FFmpeg)"
        );
    }

    let mut child = Command::new("node")
        .arg(&script_path)
        .env("NEXORA_DB_PATH", db_path)
        .env("NEXORA_FFMPEG_PATH", &ffmpeg_path)
        .env("NEXORA_FFPROBE_PATH", &ffprobe_path)
        .stdout(Stdio::piped())
        .stderr(Stdio::inherit())
        .spawn()
        .map_err(|e| anyhow::anyhow!("Falha ao arrancar sidecar Node.js: {}", e))?;

    let pid = child.id();
    {
        let state = app.state::<AppState>();
        *state.sidecar_pid.lock().unwrap() = Some(pid);
    }
    info!("Sidecar Node.js PID={} script={:?}", pid, script_path);

    // Le eventos JSON do stdout numa thread dedicada e emite para o frontend
    if let Some(stdout) = child.stdout.take() {
        let app_handle = app.clone();
        std::thread::spawn(move || {
            use std::io::{BufRead, BufReader};
            for line in BufReader::new(stdout).lines() {
                match line {
                    Ok(l) if !l.trim().is_empty() => {
                        match serde_json::from_str::<serde_json::Value>(&l) {
                            Ok(json) => {
                                // Eventos de log e de job vao para o sistema de registos
                                if let Some(t) = json.get("type").and_then(|v| v.as_str()) {
                                    match t {
                                        "log" => {
                                            let level = json.get("level").and_then(|v| v.as_str()).unwrap_or("INFO");
                                            let source = json.get("source").and_then(|v| v.as_str()).unwrap_or("sidecar");
                                            let msg = json.get("message").and_then(|v| v.as_str()).unwrap_or("");
                                            crate::logger::write(level, &format!("sidecar:{source}"), msg);
                                        }
                                        "job:started" => {
                                            let job_id = json.get("jobId").and_then(|v| v.as_str()).unwrap_or("?");
                                            crate::logger::write("INFO", "sidecar:orchestrator", &format!("Job iniciado: {job_id}"));
                                        }
                                        "job:completed" => {
                                            let job_id = json.get("jobId").and_then(|v| v.as_str()).unwrap_or("?");
                                            crate::logger::write("INFO", "sidecar:orchestrator", &format!("Job concluido: {job_id}"));
                                        }
                                        "job:failed" => {
                                            let job_id = json.get("jobId").and_then(|v| v.as_str()).unwrap_or("?");
                                            let err = json.get("error").and_then(|v| v.as_str()).unwrap_or("erro desconhecido");
                                            crate::logger::write("ERROR", "sidecar:orchestrator", &format!("Job falhou: {job_id} — {err}"));
                                        }
                                        _ => {}
                                    }
                                }
                                let _ = app_handle.emit("sidecar:event", &json);
                            }
                            Err(_) => info!("sidecar stdout: {}", l),
                        }
                    }
                    Err(e) => error!("sidecar stdout: {}", e),
                    _ => {}
                }
            }
        });
    }

    // Aguarda o processo terminar numa thread separada
    std::thread::spawn(move || match child.wait() {
        Ok(status) => info!("Sidecar terminou: {}", status),
        Err(e) => error!("Erro ao aguardar sidecar: {}", e),
    });

    Ok(())
}

/// Localiza nexora-sidecar.js por ordem de prioridade:
/// 1. resource_dir do Tauri (producao: ficheiro bundled no instalador)
/// 2. Relativo ao executavel (desenvolvimento: exe em target/debug/ ou target/release/)
/// 3. Working directory corrente (tauri dev define cwd como workspace)
fn resolve_script_path<R: Runtime>(app: &AppHandle<R>) -> std::path::PathBuf {
    // 1. Producao: recurso incluido no bundle pelo Tauri
    if let Ok(resource_dir) = app.path().resource_dir() {
        // Tauri pode flattened o caminho ou manter a estrutura relativa
        for candidate in [
            resource_dir.join("nexora-sidecar.cjs"),
            resource_dir.join("sidecar").join("dist").join("nexora-sidecar.cjs"),
        ] {
            if candidate.exists() {
                return candidate;
            }
        }
    }

    // 2. Desenvolvimento: exe em workspace/src-tauri/target/(debug|release)/
    //    Sobe 4 niveis para chegar ao workspace root
    if let Ok(exe) = std::env::current_exe() {
        if let Some(workspace) = exe.ancestors().nth(4) {
            let candidate = workspace
                .join("sidecar")
                .join("dist")
                .join("nexora-sidecar.cjs");
            if candidate.exists() {
                return candidate;
            }
        }
    }

    // 3. Fallback: diretorio de trabalho corrente (tauri dev)
    std::env::current_dir()
        .unwrap_or_default()
        .join("sidecar")
        .join("dist")
        .join("nexora-sidecar.cjs")
}

/// Resolve o caminho absoluto de um binario media (ffmpeg ou ffprobe).
/// Ordem de prioridade:
/// 1. Ao lado do executavel do Tauri (target/debug/ ou target/release/) — dev
/// 2. resource_dir() do Tauri — producao (bundle do instalador)
/// 3. Nome do comando no PATH (fallback)
fn resolve_media_binary_path<R: Runtime>(app: &AppHandle<R>, name: &str) -> PathBuf {
    let ext = if cfg!(target_os = "windows") { ".exe" } else { "" };

    // 1. Desenvolvimento: ao lado do executavel (Tauri copia os externalBin para target/debug/)
    if let Ok(exe) = std::env::current_exe() {
        if let Some(exe_dir) = exe.parent() {
            let candidate = exe_dir.join(format!("{}{}", name, ext));
            if candidate.exists() {
                return candidate;
            }
        }
    }

    // 2. Producao: resource_dir do Tauri
    if let Ok(resource_dir) = app.path().resource_dir() {
        let candidate = resource_dir.join(format!("{}{}", name, ext));
        if candidate.exists() {
            return candidate;
        }
    }

    // 3. Fallback: comando no PATH
    PathBuf::from(name)
}
