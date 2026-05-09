use serde::{Deserialize, Serialize};
use std::process::Command;

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
