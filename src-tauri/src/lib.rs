mod commands;
mod db;
mod logger;
mod sidecar;
mod state;
mod tray;

use state::AppState;
use tauri::{Emitter, Manager};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            let data_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&data_dir)?;

            let db_path = data_dir.join("nexora.db");
            let conn = db::open(&db_path)?;
            app.manage(AppState::new(conn));

            // Logger personalizado: escreve na DB + emite eventos Tauri
            logger::init(app.handle().clone(), &db_path);
            log::info!(
                "Nexora Desktop v{} a arrancar",
                env!("CARGO_PKG_VERSION")
            );

            tray::setup(app)?;

            if let Err(e) = sidecar::spawn(app.handle().clone(), &db_path) {
                log::warn!("Sidecar não arrancou: {}", e);
            }

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

                    let rx: u64 = nets.iter().map(|(_, n)| n.received()).sum();
                    let tx: u64 = nets.iter().map(|(_, n)| n.transmitted()).sum();

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
            commands::assets::get_asset,
            commands::assets::delete_asset,
            commands::jobs::submit_job,
            commands::jobs::cancel_job,
            commands::jobs::get_job_status,
            commands::jobs::list_jobs,
            commands::settings::get_settings,
            commands::settings::update_settings,
            commands::system::detect_gpu,
            commands::system::get_disk_space,
            commands::system::get_app_version,
            commands::system::get_stats,
            commands::system::get_installed_info,
            commands::profiles::list_profiles,
            commands::logs::list_logs,
            commands::logs::clear_logs,
            commands::logs::get_log_stats,
            commands::logs::write_log,
            commands::metrics::get_system_metrics,
        ])
        .run(tauri::generate_context!())
        .expect("Erro ao iniciar a aplicação Nexora");
}
