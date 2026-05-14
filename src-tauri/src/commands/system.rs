use crate::state::AppState;
use serde::{Deserialize, Serialize};
use std::process::Command;
use tauri::{Manager, State};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InstalledInfo {
    pub app_version: String,
    pub ffmpeg_version: Option<String>,
    pub node_version: Option<String>,
    pub gpu: GpuInfo,
    pub db_path: String,
}

#[tauri::command]
pub fn get_installed_info(app: tauri::AppHandle) -> InstalledInfo {
    let ffmpeg_version = Command::new("ffmpeg")
        .arg("-version")
        .output()
        .ok()
        .and_then(|o| String::from_utf8(o.stdout).ok())
        .and_then(|s| s.lines().next().map(|l| l.trim().to_string()));

    let node_version = Command::new("node")
        .arg("--version")
        .output()
        .ok()
        .and_then(|o| String::from_utf8(o.stdout).ok())
        .map(|s| s.trim().to_string());

    let db_path = app
        .path()
        .app_data_dir()
        .ok()
        .map(|p| p.join("nexora.db").to_string_lossy().into_owned())
        .unwrap_or_default();

    InstalledInfo {
        app_version: env!("CARGO_PKG_VERSION").to_string(),
        ffmpeg_version,
        node_version,
        gpu: detect_gpu(),
        db_path,
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GpuInfo {
    pub vendor: String,
    pub encoder: String,
    pub available: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DiskSpace {
    pub path: String,
    pub free_bytes: u64,
    pub total_bytes: u64,
}

#[tauri::command]
pub fn detect_gpu() -> GpuInfo {
    // NVENC (NVIDIA) — todas as plataformas
    if Command::new("nvidia-smi").output().is_ok() {
        return GpuInfo {
            vendor: "nvidia".to_string(),
            encoder: "h264_nvenc".to_string(),
            available: true,
        };
    }

    // AMF (AMD) — Windows
    #[cfg(target_os = "windows")]
    if std::path::Path::new("C:/Windows/System32/amfrt64.dll").exists() {
        return GpuInfo {
            vendor: "amd".to_string(),
            encoder: "h264_amf".to_string(),
            available: true,
        };
    }

    // QSV (Intel) — Windows
    #[cfg(target_os = "windows")]
    if std::path::Path::new("C:/Windows/System32/libmfxhw64.dll").exists()
        || std::path::Path::new("C:/Windows/System32/libmfx64-gen.dll").exists()
    {
        return GpuInfo {
            vendor: "intel".to_string(),
            encoder: "h264_qsv".to_string(),
            available: true,
        };
    }

    // QSV (Intel) — Linux
    #[cfg(target_os = "linux")]
    if std::path::Path::new("/dev/dri/renderD128").exists() {
        return GpuInfo {
            vendor: "intel".to_string(),
            encoder: "h264_qsv".to_string(),
            available: true,
        };
    }

    GpuInfo {
        vendor: "cpu".to_string(),
        encoder: "libx264".to_string(),
        available: false,
    }
}

#[tauri::command]
pub fn get_disk_space(path: String) -> Result<DiskSpace, String> {
    disk_space_impl(path)
}

#[cfg(target_os = "windows")]
fn disk_space_impl(path: String) -> Result<DiskSpace, String> {
    use std::ffi::OsStr;
    use std::os::windows::ffi::OsStrExt;

    extern "system" {
        fn GetDiskFreeSpaceExW(
            lpDirectoryName: *const u16,
            lpFreeBytesAvailableToCaller: *mut u64,
            lpTotalNumberOfBytes: *mut u64,
            lpTotalNumberOfFreeBytes: *mut u64,
        ) -> i32;
    }

    let wide: Vec<u16> = OsStr::new(&path)
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();
    let (mut free, mut total, mut total_free) = (0u64, 0u64, 0u64);
    let ok =
        unsafe { GetDiskFreeSpaceExW(wide.as_ptr(), &mut free, &mut total, &mut total_free) };
    if ok != 0 {
        Ok(DiskSpace {
            path,
            free_bytes: free,
            total_bytes: total,
        })
    } else {
        Err("GetDiskFreeSpaceExW falhou".to_string())
    }
}

#[cfg(not(target_os = "windows"))]
fn disk_space_impl(path: String) -> Result<DiskSpace, String> {
    let output = Command::new("df")
        .args(["-B1", &path])
        .output()
        .map_err(|e| e.to_string())?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let line = stdout
        .lines()
        .nth(1)
        .ok_or("df: output inesperado")?;
    let parts: Vec<&str> = line.split_whitespace().collect();
    if parts.len() < 4 {
        return Err("df: formato inesperado".to_string());
    }
    let total: u64 = parts[1].parse().map_err(|_| "df: total inválido")?;
    let free: u64 = parts[3].parse().map_err(|_| "df: free inválido")?;
    Ok(DiskSpace {
        path,
        free_bytes: free,
        total_bytes: total,
    })
}

#[tauri::command]
pub fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[tauri::command]
pub fn get_changelog() -> String {
    include_str!("../../../CHANGELOG.md").to_string()
}

// ── System Info (cross-platform via sysinfo + std) ───────────────────────────

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemInfo {
    pub os_name: String,
    pub os_version: String,
    pub cpu_model: String,
    pub cpu_cores: usize,
    pub cpu_threads: usize,
    pub memory_total_gb: f64,
    pub memory_used_gb: f64,
    pub disk_type: String,
    pub disk_total_gb: f64,
    pub disk_free_gb: f64,
    pub network_interfaces: Vec<NetworkInterface>,
    pub wifi_ssid: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NetworkInterface {
    pub name: String,
    pub status: String,
}

#[tauri::command]
pub fn get_system_info(app: tauri::AppHandle) -> Result<SystemInfo, String> {
    // ── Sistema Operativo (std, instantâneo) ─────────────────────────────────
    let os_name = format!("{} {}", std::env::consts::OS, std::env::consts::ARCH);
    let os_version = "Desconhecido".to_string();

    // ── CPU (num_cpus, instantâneo — nunca bloqueia) ─────────────────────────
    let cpu_model = std::env::var("PROCESSOR_IDENTIFIER").unwrap_or_else(|_| "N/A".to_string());
    let cpu_cores = num_cpus::get_physical();
    let cpu_threads = num_cpus::get();

    // ── Memória (sysinfo mínimo — apenas memória, sem CPU/rede/discos) ───────
    let (mem_total_gb, mem_used_gb) = {
        use sysinfo::{System, RefreshKind, MemoryRefreshKind};
        let sys = System::new_with_specifics(
            RefreshKind::new().with_memory(MemoryRefreshKind::everything()),
        );
        let total = sys.total_memory() as f64 / (1024.0 * 1024.0 * 1024.0);
        let used = sys.used_memory() as f64 / (1024.0 * 1024.0 * 1024.0);
        (total, used)
    };

    // ── Disco (função existente, rápida) ─────────────────────────────────────
    let (disk_total_gb, disk_free_gb, disk_type) = {
        if let Ok(data_dir) = app.path().app_data_dir() {
            if let Some(path_str) = data_dir.to_str() {
                if let Ok(disk) = get_disk_space(path_str.to_string()) {
                    let total = disk.total_bytes as f64 / (1024.0 * 1024.0 * 1024.0);
                    let free = disk.free_bytes as f64 / (1024.0 * 1024.0 * 1024.0);
                    let dtype = if cfg!(target_os = "windows") {
                        "SSD/HDD".to_string()
                    } else {
                        "Desconhecido".to_string()
                    };
                    (total, free, dtype)
                } else {
                    (0.0, 0.0, "N/A".to_string())
                }
            } else {
                (0.0, 0.0, "N/A".to_string())
            }
        } else {
            (0.0, 0.0, "N/A".to_string())
        }
    };

    // ── Rede (desactivada — Networks::new_with_refreshed_list() bloqueia) ────
    let network_interfaces: Vec<NetworkInterface> = vec![];

    Ok(SystemInfo {
        os_name,
        os_version,
        cpu_model,
        cpu_cores,
        cpu_threads,
        memory_total_gb: mem_total_gb,
        memory_used_gb: mem_used_gb,
        disk_type,
        disk_total_gb,
        disk_free_gb,
        network_interfaces,
        wifi_ssid: None,
    })
}

// ── FFmpeg Info ──────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FfmpegInfo {
    pub version: String,
    pub has_libvmaf: bool,
    pub codecs: Vec<String>,
}

#[tauri::command]
pub fn get_ffmpeg_info(app: tauri::AppHandle) -> Result<FfmpegInfo, String> {
    let ffmpeg_path = resolve_media_binary_path(&app, "ffmpeg");

    let version = Command::new(&ffmpeg_path)
        .arg("-version")
        .output()
        .ok()
        .and_then(|o| String::from_utf8(o.stdout).ok())
        .and_then(|s| s.lines().next().map(|l| l.trim().to_string()))
        .unwrap_or_else(|| "Desconhecido".to_string());

    let has_libvmaf = Command::new(&ffmpeg_path)
        .args(["-filters"])
        .output()
        .ok()
        .and_then(|o| String::from_utf8(o.stdout).ok())
        .map(|s| s.contains("libvmaf"))
        .unwrap_or(false);

    Ok(FfmpegInfo {
        version,
        has_libvmaf,
        codecs: vec![],
    })
}

// ── DB Info ──────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DbInfo {
    pub db_size_mb: f64,
    pub assets_count: i64,
    pub jobs_count: i64,
    pub logs_count: i64,
}

#[tauri::command]
pub fn get_db_info(state: State<'_, AppState>, app: tauri::AppHandle) -> Result<DbInfo, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let db_path = app.path().app_data_dir()
        .ok()
        .map(|p| p.join("nexora.db"))
        .unwrap_or_default();

    let db_size_mb = std::fs::metadata(&db_path)
        .map(|m| m.len() as f64 / (1024.0 * 1024.0))
        .unwrap_or(0.0);

    let assets_count: i64 = db.query_row("SELECT COUNT(*) FROM assets", [], |r| r.get(0)).unwrap_or(0);
    let jobs_count: i64 = db.query_row("SELECT COUNT(*) FROM jobs", [], |r| r.get(0)).unwrap_or(0);
    let logs_count: i64 = db.query_row("SELECT COUNT(*) FROM logs", [], |r| r.get(0)).unwrap_or(0);

    Ok(DbInfo {
        db_size_mb,
        assets_count,
        jobs_count,
        logs_count,
    })
}

// Helper local para resolver path do FFmpeg (reusa lógica do sidecar.rs)
use std::path::PathBuf;
fn resolve_media_binary_path<R: tauri::Runtime>(app: &tauri::AppHandle<R>, name: &str) -> PathBuf {
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

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppStats {
    pub total_assets: i64,
    pub jobs_today: i64,
    pub avg_vmaf: Option<f64>,
    pub active_jobs: i64,
    pub disk_free_bytes: Option<u64>,
    pub disk_total_bytes: Option<u64>,
}

#[tauri::command]
pub fn get_stats(
    state: State<'_, AppState>,
    app: tauri::AppHandle,
) -> Result<AppStats, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let total_assets: i64 = db
        .query_row("SELECT COUNT(*) FROM assets", [], |row| row.get(0))
        .map_err(|e| e.to_string())?;

    let jobs_today: i64 = db
        .query_row(
            "SELECT COUNT(*) FROM jobs WHERE date(created_at) = date('now')",
            [],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    let avg_vmaf: Option<f64> = db
        .query_row(
            "SELECT AVG(vmaf_score) FROM jobs WHERE vmaf_score IS NOT NULL",
            [],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    let active_jobs: i64 = db
        .query_row(
            "SELECT COUNT(*) FROM jobs WHERE status IN ('queued', 'processing')",
            [],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    let (disk_free_bytes, disk_total_bytes) = app
        .path()
        .app_data_dir()
        .ok()
        .and_then(|p| p.to_str().map(str::to_string))
        .and_then(|path| disk_space_impl(path).ok())
        .map(|d| (Some(d.free_bytes), Some(d.total_bytes)))
        .unwrap_or((None, None));

    Ok(AppStats {
        total_assets,
        jobs_today,
        avg_vmaf,
        active_jobs,
        disk_free_bytes,
        disk_total_bytes,
    })
}

#[tauri::command]
pub fn open_data_dir(app: tauri::AppHandle) -> Result<(), String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&dir)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&dir)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&dir)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn exit_app(app: tauri::AppHandle) {
    app.exit(0);
}

#[tauri::command]
pub async fn factory_reset(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    // 1. Matar sidecar se estiver a correr
    let pid = {
        let pid_lock = state.sidecar_pid.lock().unwrap();
        *pid_lock
    };

    if let Some(p) = pid {
        #[cfg(target_os = "windows")]
        let _ = Command::new("taskkill")
            .args(["/F", "/PID", &p.to_string()])
            .status();
        
        #[cfg(not(target_os = "windows"))]
        let _ = Command::new("kill")
            .arg("-9")
            .arg(p.to_string())
            .status();
    }

    // 2. Limpar ficheiros gerados pela aplicação (transcodes, proxies, thumbnails)
    {
        if let Ok(db) = state.db.lock() {
            // Obter todos os caminhos de ficheiros de saída registados nos jobs
            if let Ok(mut stmt) = db.prepare("SELECT output_path FROM jobs WHERE output_path IS NOT NULL") {
                if let Ok(paths) = stmt.query_map([], |r| r.get::<_, String>(0)) {
                    for path in paths.flatten() {
                        let _ = std::fs::remove_file(path);
                    }
                }
            }
            // Obter caminhos do audit_log (thumbnails e proxies que não estão na tabela jobs)
            if let Ok(mut stmt) = db.prepare("SELECT data FROM audit_log WHERE event IN ('delivery:completed', 'thumbnail:completed', 'proxy:completed')") {
                if let Ok(rows) = stmt.query_map([], |r| r.get::<_, String>(0)) {
                    for json_str in rows.flatten() {
                        if let Ok(json) = serde_json::from_str::<serde_json::Value>(&json_str) {
                            // Tentar apagar campos comuns de caminhos
                            for key in ["destination", "thumbnailPath", "proxyPath", "thumbPath", "finalPath"] {
                                if let Some(p) = json.get(key).and_then(|v| v.as_str()) {
                                    let _ = std::fs::remove_file(p);
                                }
                            }
                        }
                    }
                }
            }

            // 3. Limpar a BD por dentro (DELETE)
            let _ = db.execute("PRAGMA foreign_keys = OFF", []);
            let _ = db.execute("DELETE FROM jobs", []);
            let _ = db.execute("DELETE FROM assets", []);
            let _ = db.execute("DELETE FROM logs", []);
            let _ = db.execute("DELETE FROM audit_log", []);
            let _ = db.execute("DELETE FROM settings", []);
            let _ = db.execute("DELETE FROM profiles WHERE is_system = 0", []);
            let _ = db.execute("PRAGMA foreign_keys = ON", []);
            let _ = db.execute("VACUUM", []);
        }
    }

    // 4. Libertar estado (fechar Mutex/Conexão)
    drop(state); 

    // 5. Tentar apagar ficheiros físicos do sistema (AppData)
    if let Ok(data_dir) = app.path().app_data_dir() {
        tokio::time::sleep(std::time::Duration::from_millis(500)).await;

        if data_dir.exists() {
            if let Ok(entries) = std::fs::read_dir(&data_dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if path.is_file() {
                        let name = path.file_name().unwrap_or_default().to_string_lossy();
                        if !name.starts_with("nexora.db") {
                            let _ = std::fs::remove_file(&path);
                        }
                    } else if path.is_dir() {
                        let _ = std::fs::remove_dir_all(&path);
                    }
                }
            }
        }
    }

    // 6. Limpar pasta temporária do sidecar se existir
    let temp_dir = std::env::temp_dir().join("nexora-output");
    if temp_dir.exists() {
        let _ = std::fs::remove_dir_all(&temp_dir);
    }

    // 7. Reiniciar a aplicação
    app.restart();
    
    #[allow(unreachable_code)]
    Ok(())
}
