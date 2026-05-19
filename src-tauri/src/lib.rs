mod commands;
mod db;
mod logger;
mod queue;
mod sidecar;
mod state;
mod tray;

use state::AppState;
use tauri::{Emitter, Manager};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            let data_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&data_dir)?;

            let db_path = data_dir.join("nexora.db");
            let conn = db::open(&db_path)?;
            app.manage(AppState::new(conn));

            // Logger personalizado: escreve na DB + emite eventos Tauri
            logger::init(app.handle().clone(), &db_path);
            log::info!("Nexora Desktop v{} a arrancar", env!("CARGO_PKG_VERSION"));

            tray::setup(app)?;

            // Verificações de pré-requisitos no arranque
            startup_checks(app.handle());

            queue::start(app.handle().clone(), &db_path);

            // Thread de espaço em disco — emite "disk-space" a cada 10 s
            let disk_handle = app.handle().clone();
            std::thread::spawn(move || loop {
                std::thread::sleep(std::time::Duration::from_secs(10));
                let stats = disk_handle
                    .path()
                    .app_data_dir()
                    .ok()
                    .and_then(|p| p.to_str().map(str::to_string))
                    .and_then(|path| commands::system::get_disk_space(path).ok());
                if let Some(s) = stats {
                    let _ = disk_handle.emit(
                        "disk-space",
                        serde_json::json!({
                            "diskFreeBytes": s.free_bytes,
                            "diskTotalBytes": s.total_bytes,
                        }),
                    );
                }
            });

            // Thread de métricas do sistema — emite "system-metrics" a cada 2 s
            let metrics_handle = app.handle().clone();
            std::thread::spawn(move || {
                use sysinfo::{Networks, System};
                let mut sys = System::new();
                let mut nets = Networks::new_with_refreshed_list();

                // Primeira leitura de CPU (necessita de 2 amostras para valor correcto)
                sys.refresh_cpu_usage();
                std::thread::sleep(std::time::Duration::from_millis(600));

                loop {
                    std::thread::sleep(std::time::Duration::from_secs(2));
                    sys.refresh_cpu_usage();
                    sys.refresh_memory();
                    nets.refresh();

                    let rx: u64 = nets.values().map(|n| n.received()).sum();
                    let tx: u64 = nets.values().map(|n| n.transmitted()).sum();

                    let metrics = commands::metrics::SystemMetrics {
                        cpu_percent: sys.global_cpu_usage(),
                        mem_used_bytes: sys.used_memory(),
                        mem_total_bytes: sys.total_memory(),
                        net_rx_bps: rx / 2,
                        net_tx_bps: tx / 2,
                    };

                    let _ = metrics_handle.emit("system-metrics", &metrics);
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::assets::ingest_asset,
            commands::assets::list_assets,
            commands::assets::list_assets_slim,
            commands::assets::get_asset,
            commands::assets::delete_asset,
            commands::assets::scan_directory,
            commands::assets::find_asset_by_path,
            commands::jobs::submit_job,
            commands::jobs::cancel_job,
            commands::jobs::get_job_status,
            commands::jobs::list_jobs,
            commands::jobs::get_queue_stats,
            commands::jobs::retry_job,
            commands::jobs::approve_job,
            commands::jobs::reject_job,
            commands::settings::get_settings,
            commands::settings::update_settings,
            commands::system::detect_gpu,
            commands::system::get_disk_space,
            commands::system::get_app_version,
            commands::system::get_changelog,
            commands::system::get_stats,
            commands::system::get_installed_info,
            commands::system::get_system_info,
            commands::system::get_ffmpeg_info,
            commands::system::get_db_info,
            commands::system::exit_app,
            commands::system::open_data_dir,
            commands::system::factory_reset,
            commands::profiles::list_profiles,
            commands::profiles::create_profile,
            commands::profiles::update_profile,
            commands::profiles::delete_profile,
            commands::logs::list_logs,
            commands::logs::clear_logs,
            commands::logs::reset_database,
            commands::logs::get_log_stats,
            commands::logs::write_log,
            commands::logs::export_logs,
            commands::metrics::get_system_metrics,
            get_startup_status,
        ])
        .run(tauri::generate_context!())
        .expect("Erro ao iniciar a aplicação Nexora");
}

/// Verifica os pré-requisitos do sistema no arranque e loga o resultado.
fn startup_checks<R: tauri::Runtime>(app: &tauri::AppHandle<R>) {
    use std::process::Command;

    // 1. Node.js
    let node_ok = Command::new("node")
        .arg("--version")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false);

    if node_ok {
        log::info!("[startup] Node.js: OK");
    } else {
        log::warn!("[startup] Node.js NÃO encontrado no PATH — o processamento de vídeos não vai funcionar. Instala Node.js 20+ em https://nodejs.org");
    }

    // 2. Sidecar script
    let script_path = sidecar::resolve_script_path(app);
    if script_path.exists() {
        log::info!("[startup] Sidecar: OK ({:?})", script_path);
    } else {
        log::warn!(
            "[startup] Sidecar script NÃO encontrado em {:?} — executa 'npm run sidecar:build'",
            script_path
        );
    }

    // 3. FFprobe
    let ffprobe_path = sidecar::resolve_media_binary_path(app, "ffprobe");
    let ffprobe_ok = if ffprobe_path.exists() {
        true
    } else {
        Command::new("ffprobe")
            .arg("-version")
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    };

    if ffprobe_ok {
        log::info!("[startup] FFprobe: OK");
    } else {
        log::warn!(
            "[startup] FFprobe NÃO encontrado — instala FFmpeg (inclui ffprobe) e adiciona ao PATH"
        );
    }

    // 4. FFmpeg
    let ffmpeg_path = sidecar::resolve_media_binary_path(app, "ffmpeg");
    let ffmpeg_ok = if ffmpeg_path.exists() {
        true
    } else {
        Command::new("ffmpeg")
            .arg("-version")
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    };

    if ffmpeg_ok {
        log::info!("[startup] FFmpeg: OK");
    } else {
        log::warn!("[startup] FFmpeg NÃO encontrado — o processamento de vídeos vai falhar");
    }
}

/// Retorna o estado dos pré-requisitos para o frontend mostrar alertas.
#[tauri::command]
fn get_startup_status(app: tauri::AppHandle) -> serde_json::Value {
    use std::process::Command;

    let node_ok = Command::new("node")
        .arg("--version")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false);

    let script_path = sidecar::resolve_script_path(&app);
    let sidecar_ok = script_path.exists();

    let ffprobe_path = sidecar::resolve_media_binary_path(&app, "ffprobe");
    let ffprobe_ok = ffprobe_path.exists()
        || Command::new("ffprobe")
            .arg("-version")
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false);

    let ffmpeg_path = sidecar::resolve_media_binary_path(&app, "ffmpeg");
    let ffmpeg_ok = ffmpeg_path.exists()
        || Command::new("ffmpeg")
            .arg("-version")
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false);

    serde_json::json!({
        "nodeOk": node_ok,
        "sidecarOk": sidecar_ok,
        "ffprobeOk": ffprobe_ok,
        "ffmpegOk": ffmpeg_ok,
        "allOk": node_ok && sidecar_ok && ffprobe_ok && ffmpeg_ok,
    })
}
