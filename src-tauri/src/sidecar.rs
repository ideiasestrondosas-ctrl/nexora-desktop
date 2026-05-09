use crate::state::AppState;
use log::{error, info, warn};
use std::process::{Command, Stdio};
use tauri::{AppHandle, Emitter, Manager, Runtime};

pub fn spawn<R: Runtime>(app: AppHandle<R>) -> anyhow::Result<()> {
    // Localiza o sidecar relativo ao executável corrente
    let exe_dir = std::env::current_exe()
        .unwrap_or_default()
        .parent()
        .map(|p| p.to_path_buf())
        .unwrap_or_default();
    let sidecar_path = exe_dir.join("binaries").join(bin_name());

    if !sidecar_path.exists() {
        warn!(
            "Sidecar não encontrado em {:?} — ignorado (instalar na Fase 2)",
            sidecar_path
        );
        return Ok(());
    }

    let mut child = Command::new(&sidecar_path)
        .stdout(Stdio::piped())
        .stderr(Stdio::inherit())
        .spawn()
        .map_err(|e| anyhow::anyhow!("Falha ao arrancar sidecar: {}", e))?;

    let pid = child.id();
    {
        let state = app.state::<AppState>();
        *state.sidecar_pid.lock().unwrap() = Some(pid);
    }
    info!("Sidecar PID={}", pid);

    // Lê eventos JSON do stdout numa thread dedicada
    if let Some(stdout) = child.stdout.take() {
        let app_handle = app.clone();
        std::thread::spawn(move || {
            use std::io::{BufRead, BufReader};
            for line in BufReader::new(stdout).lines() {
                match line {
                    Ok(l) if !l.trim().is_empty() => {
                        match serde_json::from_str::<serde_json::Value>(&l) {
                            Ok(json) => {
                                let _ = app_handle.emit("sidecar:event", &json);
                            }
                            Err(_) => info!("sidecar: {}", l),
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

fn bin_name() -> String {
    format!(
        "nexora-sidecar-{}-{}",
        std::env::consts::OS,
        std::env::consts::ARCH
    )
}
