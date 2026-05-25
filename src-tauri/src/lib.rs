mod cloud;
mod commands;
mod db;
mod file_logger;
mod logger;
mod queue;
mod sidecar;
mod state;
mod tray;

use state::AppState;
use tauri::{Emitter, Manager};

#[cfg(target_os = "windows")]
use window_vibrancy::apply_mica;
#[cfg(target_os = "macos")]
use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial};

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
            file_logger::init(app.handle());
            log::info!("Nexora Desktop v{} a arrancar", env!("CARGO_PKG_VERSION"));

            tray::setup(app)?;

            // Efeitos de janela nativos — silencia erro se não suportado (Windows 10, VMs, etc.)
            #[cfg(any(target_os = "windows", target_os = "macos"))]
            {
                let main_window = app.get_webview_window("main").unwrap();
                #[cfg(target_os = "windows")]
                apply_mica(&main_window, Some(true)).ok();
                #[cfg(target_os = "macos")]
                apply_vibrancy(&main_window, NSVisualEffectMaterial::HudWindow, None, None).ok();
            }

            // Menu nativo da barra de menus — apenas macOS.
            // Garante que Cmd+C/V/X/Z/A funcionam em campos de texto
            // e que o menu "Nexora" aparece conforme a HIG da Apple.
            #[cfg(target_os = "macos")]
            setup_macos_menu(app)?;

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
            commands::system::get_temp_info,
            commands::system::clear_transcode_cache,
            commands::system::clear_thumbs_cache,
            commands::system::open_path,
            commands::system::set_queue_concurrency,
            commands::system::get_platform,
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
            commands::logs::get_log_storage_info,
            commands::logs::export_logs_bundle,
            commands::logs::clear_log_files,
            commands::logs::upload_logs_to_server,
            commands::logs::log_user_action,
            commands::cloud::get_cloud_profiles,
            commands::cloud::create_cloud_profile,
            commands::cloud::update_cloud_profile,
            commands::cloud::delete_cloud_profile,
            commands::cloud::test_cloud_connection,
            commands::cloud::get_job_cloud_destinations,
            commands::cloud::process_cloud_destinations,
            commands::cloud::retry_cloud_upload,
            commands::cloud::add_cloud_asset,
            commands::cloud::gdrive_start_auth,
            commands::cloud::gdrive_poll_auth,
            commands::cloud::cloud_list_files,
            commands::cloud::cloud_delete_files,
            commands::cloud::cloud_download_file,
            commands::metrics::get_system_metrics,
            get_startup_status,
        ])
        .run(tauri::generate_context!())
        .expect("Erro ao iniciar a aplicação Nexora");
}

/// Configura o menu nativo da barra de menus para macOS.
/// Inclui o menu "Nexora" (conforme HIG Apple) e o menu "Editar" com
/// atalhos padrão de edição de texto (Cmd+C/V/X/Z/A).
#[cfg(target_os = "macos")]
fn setup_macos_menu(app: &tauri::App) -> tauri::Result<()> {
    use tauri::menu::{Menu, PredefinedMenuItem, Submenu};

    let menu = Menu::new(app)?;

    // Menu "Nexora" — conforme Apple Human Interface Guidelines
    let app_menu = Submenu::with_items(
        app,
        "Nexora",
        true,
        &[
            &PredefinedMenuItem::about(app, Some("Sobre o Nexora"), None)?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::hide(app, Some("Ocultar Nexora"))?,
            &PredefinedMenuItem::hide_others(app, Some("Ocultar Outros"))?,
            &PredefinedMenuItem::show_all(app, Some("Mostrar Tudo"))?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::quit(app, Some("Sair do Nexora"))?,
        ],
    )?;

    // Menu "Editar" — necessário para Cmd+C/V/X/Z/A em campos de texto
    let edit_menu = Submenu::with_items(
        app,
        "Editar",
        true,
        &[
            &PredefinedMenuItem::undo(app, Some("Desfazer"))?,
            &PredefinedMenuItem::redo(app, Some("Refazer"))?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::cut(app, Some("Cortar"))?,
            &PredefinedMenuItem::copy(app, Some("Copiar"))?,
            &PredefinedMenuItem::paste(app, Some("Colar"))?,
            &PredefinedMenuItem::select_all(app, Some("Seleccionar Tudo"))?,
        ],
    )?;

    // Menu "Janela" — padrão Apple
    let window_menu = Submenu::with_items(
        app,
        "Janela",
        true,
        &[
            &PredefinedMenuItem::minimize(app, Some("Minimizar"))?,
            &PredefinedMenuItem::maximize(app, Some("Maximizar"))?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::bring_all_to_front(app, Some("Trazer Tudo para a Frente"))?,
        ],
    )?;

    menu.append_items(&[&app_menu, &edit_menu, &window_menu])?;
    app.set_menu(menu)?;

    Ok(())
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
