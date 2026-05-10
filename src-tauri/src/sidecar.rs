use crate::state::AppState;
use log::{error, info, warn};
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

    let mut child = Command::new("node")
        .arg(&script_path)
        .env("NEXORA_DB_PATH", db_path)
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
                                // Eventos de log e de job vão para o sistema de registos
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
                                            crate::logger::write("INFO", "sidecar:orchestrator", &format!("Job concluído: {job_id}"));
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
