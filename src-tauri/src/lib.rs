mod commands;
mod db;
mod sidecar;
mod state;
mod tray;

use state::AppState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::init();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            let data_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&data_dir)?;

            let conn = db::open(&data_dir.join("nexora.db"))?;
            app.manage(AppState::new(conn));

            tray::setup(app)?;

            if let Err(e) = sidecar::spawn(app.handle().clone()) {
                log::warn!("Sidecar não arrancou: {}", e);
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::assets::ingest_asset,
            commands::assets::list_assets,
            commands::assets::get_asset,
            commands::jobs::submit_job,
            commands::jobs::cancel_job,
            commands::jobs::get_job_status,
            commands::jobs::list_jobs,
            commands::settings::get_settings,
            commands::settings::update_settings,
            commands::system::detect_gpu,
            commands::system::get_disk_space,
            commands::system::get_app_version,
        ])
        .run(tauri::generate_context!())
        .expect("Erro ao iniciar a aplicação Nexora");
}
