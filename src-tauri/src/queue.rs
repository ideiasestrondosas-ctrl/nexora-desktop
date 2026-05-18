use crate::state::AppState;
use log::{error, info};
use std::process::{Command, Stdio};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager, Runtime};

const POLL_INTERVAL_MS: u64 = 2_000;

struct QueueState {
    running_count: usize,
}

pub fn start<R: Runtime>(app: AppHandle<R>, db_path: &std::path::Path) {
    let state = Arc::new(Mutex::new(QueueState { running_count: 0 }));
    let app_handle = app.clone();
    let db_path_buf = db_path.to_path_buf();

    std::thread::spawn(move || loop {
        std::thread::sleep(Duration::from_millis(POLL_INTERVAL_MS));

        if let Err(e) = poll(&app_handle, &db_path_buf, &state) {
            error!("Queue poll error: {}", e);
        }
    });

    info!(
        "Queue worker started — polling every {}s",
        POLL_INTERVAL_MS / 1000
    );
}

fn poll<R: Runtime>(
    app: &AppHandle<R>,
    db_path: &std::path::Path,
    queue_state: &Arc<Mutex<QueueState>>,
) -> anyhow::Result<()> {
    let app_state = app.state::<AppState>();
    let db = app_state
        .db
        .lock()
        .map_err(|e| anyhow::anyhow!("DB lock error: {}", e))?;

    // Recuperar jobs presos em 'processing' há mais de 15 minutos
    // (o sidecar pode ter crashado sem emitir job:failed)
    let _ = db.execute(
        "UPDATE jobs SET status='error', error='Timeout: processo interrompido inesperadamente', \
         finished_at=datetime('now'), updated_at=datetime('now') \
         WHERE status='processing' AND \
         (julianday('now') - julianday(COALESCE(started_at, updated_at))) * 24 * 60 > 15",
        [],
    );

    // Ler max_concurrent_jobs da BD (respeita a setting do utilizador)
    let max_concurrent: usize = db
        .query_row(
            "SELECT value FROM settings WHERE key = 'max_concurrent_jobs'",
            [],
            |row| row.get::<_, String>(0),
        )
        .ok()
        .and_then(|v| v.parse::<usize>().ok())
        .unwrap_or(2)
        .clamp(1, 8);

    // Contar jobs em processamento
    let running_count: i64 = db
        .query_row(
            "SELECT COUNT(*) FROM jobs WHERE status = 'processing'",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let slots = max_concurrent.saturating_sub(running_count as usize);
    if slots == 0 {
        return Ok(());
    }

    // Obter próximos jobs queued
    let mut stmt = db
        .prepare(
            "SELECT j.id, j.asset_id, j.profile, a.path, a.duration_secs, a.video_codec,
                    a.audio_codec, a.width, a.height, a.fps, a.size_bytes
             FROM jobs j JOIN assets a ON j.asset_id = a.id
             WHERE j.status = 'queued'
             ORDER BY j.priority DESC, j.created_at ASC
             LIMIT ?",
        )
        .map_err(|e| anyhow::anyhow!("DB prepare error: {}", e))?;

    #[allow(clippy::type_complexity)]
    let jobs: Vec<(
        String,
        String,
        String,
        String,
        Option<f64>,
        Option<String>,
        Option<String>,
        Option<i64>,
        Option<i64>,
        Option<f64>,
        Option<i64>,
    )> = stmt
        .query_map([slots as i64], |row| {
            Ok((
                row.get::<_, String>(0)?,         // job_id
                row.get::<_, String>(1)?,         // asset_id
                row.get::<_, String>(2)?,         // profile
                row.get::<_, String>(3)?,         // asset_path
                row.get::<_, Option<f64>>(4)?,    // duration_secs
                row.get::<_, Option<String>>(5)?, // video_codec
                row.get::<_, Option<String>>(6)?, // audio_codec
                row.get::<_, Option<i64>>(7)?,    // width
                row.get::<_, Option<i64>>(8)?,    // height
                row.get::<_, Option<f64>>(9)?,    // fps
                row.get::<_, Option<i64>>(10)?,   // size_bytes
            ))
        })
        .map_err(|e| anyhow::anyhow!("DB query error: {}", e))?
        .filter_map(|r| r.ok())
        .collect();

    drop(stmt);

    // Marcar todos os jobs como 'processing' enquanto ainda temos o lock da BD —
    // elimina a race condition onde outro poll pode pegar no mesmo job antes de
    // incrementarmos o contador in-memory.
    let now = chrono::Utc::now().to_rfc3339();
    let jobs_to_run: Vec<_> = jobs
        .into_iter()
        .filter(|(job_id, ..)| {
            db.execute(
                "UPDATE jobs SET status = 'processing', started_at = ?, updated_at = ? \
                 WHERE id = ? AND status = 'queued'",
                [&now, &now, job_id.as_str()],
            )
            .map(|rows| rows > 0)
            .unwrap_or(false)
        })
        .collect();

    drop(db);

    for (
        job_id,
        asset_id,
        profile,
        asset_path,
        duration_secs,
        video_codec,
        audio_codec,
        width,
        height,
        fps,
        size_bytes,
    ) in jobs_to_run
    {
        let app_clone = app.clone();
        let db_path_buf = db_path.to_path_buf();
        let queue_state_clone = Arc::clone(queue_state);

        std::thread::spawn(move || {
            if let Err(e) = run_job(
                &app_clone,
                &db_path_buf,
                &job_id,
                &asset_id,
                &profile,
                &asset_path,
                duration_secs,
                video_codec,
                audio_codec,
                width,
                height,
                fps,
                size_bytes,
            ) {
                error!("Job {} failed: {}", job_id, e);
                // Se o erro é por cancelamento (processo morto), não sobrescrever status
                let already_cancelled = app_clone
                    .state::<AppState>()
                    .db
                    .lock()
                    .ok()
                    .and_then(|db| {
                        db.query_row("SELECT status FROM jobs WHERE id = ?", [&job_id], |r| {
                            r.get::<_, String>(0)
                        })
                        .ok()
                    })
                    .map(|s| s == "cancelled")
                    .unwrap_or(false);

                if !already_cancelled {
                    if let Ok(db) = app_clone.state::<AppState>().db.lock() {
                        let now = chrono::Utc::now().to_rfc3339();
                        let err_str = e.to_string();
                        let _ = db.execute(
                            "UPDATE jobs SET status = 'error', finished_at = ?, updated_at = ?, error = ? WHERE id = ?",
                            [&now, &now, &err_str[..200.min(err_str.len())], &job_id],
                        );
                    }
                    let _ = app_clone.emit(
                        "sidecar:event",
                        serde_json::json!({
                            "type": "job:failed",
                            "jobId": job_id,
                            "error": e.to_string(),
                        }),
                    );
                }
            }
            // Remover PID do mapa de activos
            if let Ok(mut pids) = app_clone.state::<AppState>().active_pids.lock() {
                pids.remove(&job_id);
            }
            // Decrementar contador
            if let Ok(mut qs) = queue_state_clone.lock() {
                qs.running_count = qs.running_count.saturating_sub(1);
            }
        });

        // Incrementar contador
        if let Ok(mut qs) = queue_state.lock() {
            qs.running_count += 1;
        }
    }

    Ok(())
}

#[allow(clippy::too_many_arguments)]
fn run_job<R: Runtime>(
    app: &AppHandle<R>,
    db_path: &std::path::Path,
    job_id: &str,
    asset_id: &str,
    profile: &str,
    asset_path: &str,
    duration_secs: Option<f64>,
    video_codec: Option<String>,
    audio_codec: Option<String>,
    width: Option<i64>,
    height: Option<i64>,
    fps: Option<f64>,
    size_bytes: Option<i64>,
) -> anyhow::Result<()> {
    use std::io::{BufRead, BufReader, Write};

    let script_path = super::sidecar::resolve_script_path(app);
    if !script_path.exists() {
        return Err(anyhow::anyhow!(
            "Sidecar script not found: {:?}",
            script_path
        ));
    }

    let ffmpeg_path = super::sidecar::resolve_media_binary_path(app, "ffmpeg");
    let ffprobe_path = super::sidecar::resolve_media_binary_path(app, "ffprobe");
    let resource_dir = app.path().resource_dir().ok();

    // Settings — output_dir
    let output_dir: String = {
        let state = app.state::<AppState>();
        let db = state
            .db
            .lock()
            .map_err(|e| anyhow::anyhow!("DB lock error: {}", e))?;
        let row = db
            .query_row(
                "SELECT value FROM settings WHERE key = 'output_dir'",
                [],
                |row| row.get::<_, String>(0),
            )
            .unwrap_or_default();

        if row.trim().is_empty() {
            std::env::temp_dir()
                .join("nexora-output")
                .to_string_lossy()
                .into_owned()
        } else {
            row
        }
    };

    // Garantir que o directório de saída existe antes de arrancar o sidecar
    if let Err(e) = std::fs::create_dir_all(&output_dir) {
        return Err(anyhow::anyhow!(
            "Falha ao criar output_dir '{output_dir}': {e}"
        ));
    }
    info!("[queue] output_dir: {}", output_dir);

    // Verificar que o asset ainda existe no disco
    if !std::path::Path::new(asset_path).exists() {
        return Err(anyhow::anyhow!(
            "Asset não encontrado no disco: {asset_path}"
        ));
    }

    let job_input = serde_json::json!({
        "jobId": job_id,
        "assetId": asset_id,
        "assetPath": asset_path,
        "profile": profile,
        "outputDir": output_dir,
        "assetDurationSecs": duration_secs,
        "assetVideoCodec": video_codec,
        "assetAudioCodec": audio_codec,
        "assetWidth": width,
        "assetHeight": height,
        "assetFps": fps,
        "assetSizeBytes": size_bytes,
    });

    let mut cmd = Command::new("node");
    cmd.arg(&script_path)
        .env("NEXORA_DB_PATH", db_path)
        .env("NEXORA_FFMPEG_PATH", &ffmpeg_path)
        .env("NEXORA_FFPROBE_PATH", &ffprobe_path)
        .env(
            "NEXORA_RESOURCE_DIR",
            resource_dir
                .as_ref()
                .map(|p| p.to_string_lossy().to_string())
                .unwrap_or_default(),
        )
        .env("NEXORA_OUTPUT_DIR", &output_dir)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::inherit());

    // Esconder a janela de console Node.js no Windows
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    let mut child = cmd
        .spawn()
        .map_err(|e| anyhow::anyhow!("Failed to spawn sidecar: {}", e))?;

    let pid = child.id();
    info!("[sidecar] arrancou com PID {} para job {}", pid, job_id);

    // Registar PID para permitir kill ao cancelar
    if let Ok(mut pids) = app.state::<AppState>().active_pids.lock() {
        pids.insert(job_id.to_string(), pid);
    }

    // Enviar job JSON via stdin
    if let Some(mut stdin) = child.stdin.take() {
        let json = job_input.to_string();
        stdin.write_all(json.as_bytes())?;
        stdin.write_all(b"\n")?;
        // Fechar stdin para o sidecar saber que acabou
        drop(stdin);
    }

    let app_handle = app.clone();
    let job_id_owned = job_id.to_string();

    // Ler stdout
    if let Some(stdout) = child.stdout.take() {
        for line in BufReader::new(stdout).lines() {
            match line {
                Ok(l) if !l.trim().is_empty() => {
                    match serde_json::from_str::<serde_json::Value>(&l) {
                        Ok(json) => {
                            if let Some(t) = json.get("type").and_then(|v| v.as_str()) {
                                match t {
                                    "log" => {
                                        let level = json
                                            .get("level")
                                            .and_then(|v| v.as_str())
                                            .unwrap_or("INFO");
                                        let source = json
                                            .get("source")
                                            .and_then(|v| v.as_str())
                                            .unwrap_or("sidecar");
                                        let msg = json
                                            .get("message")
                                            .and_then(|v| v.as_str())
                                            .unwrap_or("");
                                        crate::logger::write(
                                            level,
                                            &format!("sidecar:{source}"),
                                            msg,
                                        );
                                    }
                                    "job:started" => {
                                        info!("Job started: {}", job_id_owned);
                                        let _ = app_handle.emit("sidecar:event", &json);
                                    }
                                    "job:progress" => {
                                        if let (Some(progress), Some(step)) = (
                                            json.get("progress").and_then(|v| v.as_f64()),
                                            json.get("step").and_then(|v| v.as_str()),
                                        ) {
                                            if let Ok(db) = app_handle.state::<AppState>().db.lock()
                                            {
                                                let now = chrono::Utc::now().to_rfc3339();
                                                let _ = db.execute(
                                                    "UPDATE jobs SET progress = ?, step = ?, updated_at = ? WHERE id = ?",
                                                    [&progress.to_string(), step, &now, &job_id_owned],
                                                );
                                            }
                                        }
                                        let _ = app_handle.emit("sidecar:event", &json);
                                    }
                                    "job:completed" => {
                                        let output_path = json
                                            .get("data")
                                            .and_then(|d| d.get("outputPath"))
                                            .and_then(|v| v.as_str());
                                        let vmaf_score = json
                                            .get("data")
                                            .and_then(|d| d.get("vmafScore"))
                                            .and_then(|v| v.as_f64());
                                        let lufs = json
                                            .get("data")
                                            .and_then(|d| d.get("lufs"))
                                            .and_then(|v| v.as_f64());
                                        if let Ok(db) = app_handle.state::<AppState>().db.lock() {
                                            let now = chrono::Utc::now().to_rfc3339();
                                            let _ = db.execute(
                                                "UPDATE jobs SET status = 'done', progress = 1.0, finished_at = ?, updated_at = ?, output_path = ?, vmaf_score = ?, lufs = ? WHERE id = ?",
                                                [&now, &now, output_path.unwrap_or(""), &vmaf_score.map(|v| v.to_string()).unwrap_or_default(), &lufs.map(|v| v.to_string()).unwrap_or_default(), &job_id_owned],
                                            );
                                        }
                                        let _ = app_handle.emit("sidecar:event", &json);
                                    }
                                    "job:failed" => {
                                        let error = json
                                            .get("error")
                                            .and_then(|v| v.as_str())
                                            .unwrap_or("unknown error");
                                        if let Ok(db) = app_handle.state::<AppState>().db.lock() {
                                            let now = chrono::Utc::now().to_rfc3339();
                                            let _ = db.execute(
                                                "UPDATE jobs SET status = 'error', finished_at = ?, updated_at = ?, error = ? WHERE id = ?",
                                                [&now, &now, &error[..200.min(error.len())], &job_id_owned],
                                            );
                                        }
                                        let _ = app_handle.emit("sidecar:event", &json);
                                    }
                                    "job:quarantined" => {
                                        if let Ok(db) = app_handle.state::<AppState>().db.lock() {
                                            let now = chrono::Utc::now().to_rfc3339();
                                            let _ = db.execute(
                                                "UPDATE jobs SET status = 'qc_quarantined', updated_at = ? WHERE id = ?",
                                                [&now, &job_id_owned],
                                            );
                                        }
                                        let _ = app_handle.emit("sidecar:event", &json);
                                    }
                                    "asset:updated" => {
                                        if let (Some(asset_id), Some(data)) = (
                                            json.get("assetId").and_then(|v| v.as_str()),
                                            json.get("data"),
                                        ) {
                                            if let Ok(db) = app_handle.state::<AppState>().db.lock()
                                            {
                                                let now = chrono::Utc::now().to_rfc3339();
                                                let duration_secs = data
                                                    .get("duration_secs")
                                                    .and_then(|v| v.as_f64());
                                                let video_codec = data
                                                    .get("video_codec")
                                                    .and_then(|v| v.as_str())
                                                    .filter(|s| !s.is_empty());
                                                let audio_codec = data
                                                    .get("audio_codec")
                                                    .and_then(|v| v.as_str())
                                                    .filter(|s| !s.is_empty());
                                                let width =
                                                    data.get("width").and_then(|v| v.as_i64());
                                                let height =
                                                    data.get("height").and_then(|v| v.as_i64());
                                                let fps = data.get("fps").and_then(|v| v.as_f64());
                                                let metadata = data
                                                    .get("metadata")
                                                    .and_then(|v| v.as_str())
                                                    .filter(|s| !s.is_empty());
                                                let status =
                                                    data.get("status").and_then(|v| v.as_str());
                                                let thumbnail_path = data
                                                    .get("thumbnail_path")
                                                    .and_then(|v| v.as_str())
                                                    .filter(|s| !s.is_empty());
                                                let thumbnail_output_path = data
                                                    .get("thumbnail_output_path")
                                                    .and_then(|v| v.as_str())
                                                    .filter(|s| !s.is_empty());
                                                let output_metadata = data
                                                    .get("output_metadata")
                                                    .and_then(|v| v.as_str())
                                                    .filter(|s| !s.is_empty());
                                                let output_path = data
                                                    .get("output_path")
                                                    .and_then(|v| v.as_str())
                                                    .filter(|s| !s.is_empty());
                                                // COALESCE preserva o valor existente quando o novo valor é NULL
                                                let _ = db.execute(
                                                    "UPDATE assets SET \
                                                     duration_secs = COALESCE(?, duration_secs), \
                                                     video_codec = COALESCE(?, video_codec), \
                                                     audio_codec = COALESCE(?, audio_codec), \
                                                     width = COALESCE(?, width), \
                                                     height = COALESCE(?, height), \
                                                     fps = COALESCE(?, fps), \
                                                     metadata = COALESCE(?, metadata), \
                                                     status = COALESCE(?, status), \
                                                     thumbnail_path = COALESCE(?, thumbnail_path), \
                                                     thumbnail_output_path = COALESCE(?, thumbnail_output_path), \
                                                     output_metadata = COALESCE(?, output_metadata), \
                                                     output_path = COALESCE(?, output_path), \
                                                     updated_at = ? \
                                                     WHERE id = ?",
                                                    rusqlite::params![
                                                        duration_secs,
                                                        video_codec,
                                                        audio_codec,
                                                        width,
                                                        height,
                                                        fps,
                                                        metadata,
                                                        status,
                                                        thumbnail_path,
                                                        thumbnail_output_path,
                                                        output_metadata,
                                                        output_path,
                                                        now,
                                                        asset_id,
                                                    ],
                                                );
                                                info!("[queue] asset:updated — {asset_id}");
                                            }
                                        }
                                    }
                                    _ => {}
                                }
                            }
                        }
                        Err(_) => info!("sidecar stdout: {}", l),
                    }
                }
                Err(e) => error!("sidecar stdout: {}", e),
                _ => {}
            }
        }
    }

    let status = child.wait()?;
    if !status.success() {
        return Err(anyhow::anyhow!(
            "Sidecar exited with code {:?}",
            status.code()
        ));
    }

    Ok(())
}
