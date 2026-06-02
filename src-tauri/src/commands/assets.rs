use crate::state::AppState;
use rusqlite::{OptionalExtension, Row};
use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Asset {
    pub id: String,
    pub path: String,
    pub filename: String,
    pub status: String,
    pub size_bytes: Option<i64>,
    pub duration_secs: Option<f64>,
    pub video_codec: Option<String>,
    pub audio_codec: Option<String>,
    pub width: Option<i64>,
    pub height: Option<i64>,
    pub fps: Option<f64>,
    pub created_at: String,
    pub updated_at: String,
    pub metadata: Option<serde_json::Value>,
    pub thumbnail_path: Option<String>,
    pub thumbnail_output_path: Option<String>,
    pub output_metadata: Option<serde_json::Value>,
    pub output_path: Option<String>,
}

fn row_to_asset(row: &Row) -> rusqlite::Result<Asset> {
    let metadata_str: Option<String> = row.get(13)?;
    let output_metadata_str: Option<String> = row.get(16)?;
    Ok(Asset {
        id: row.get(0)?,
        path: row.get(1)?,
        filename: row.get(2)?,
        status: row.get(3)?,
        size_bytes: row.get(4)?,
        duration_secs: row.get(5)?,
        video_codec: row.get(6)?,
        audio_codec: row.get(7)?,
        width: row.get(8)?,
        height: row.get(9)?,
        fps: row.get(10)?,
        created_at: row.get(11)?,
        updated_at: row.get(12)?,
        metadata: metadata_str.and_then(|s| serde_json::from_str(&s).ok()),
        thumbnail_path: row.get(14)?,
        thumbnail_output_path: row.get(15)?,
        output_metadata: output_metadata_str.and_then(|s| serde_json::from_str(&s).ok()),
        output_path: row.get(17)?,
    })
}

const COLS: &str = "id, path, filename, status, size_bytes, duration_secs,
                    video_codec, audio_codec, width, height, fps,
                    created_at, updated_at, metadata,
                    thumbnail_path, thumbnail_output_path, output_metadata, output_path";

fn collect_assets(
    db: &rusqlite::Connection,
    sql: &str,
    param: Option<&str>,
) -> Result<Vec<Asset>, String> {
    let mut stmt = db.prepare(sql).map_err(|e| e.to_string())?;
    let iter = match param {
        Some(p) => stmt.query_map([p], row_to_asset),
        None => stmt.query_map([], row_to_asset),
    }
    .map_err(|e| e.to_string())?;
    let collected: rusqlite::Result<Vec<_>> = iter.collect();
    collected.map_err(|e| e.to_string())
}

#[tauri::command]
pub fn ingest_asset(
    path: String,
    app: tauri::AppHandle,
    state: State<AppState>,
) -> Result<Asset, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    let filename = std::path::Path::new(&path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string();
    let size_bytes = std::fs::metadata(&path).ok().map(|m| m.len() as i64);

    // Extrair metadata com FFprobe imediatamente (não espera pelo sidecar)
    let probe = run_ffprobe(&app, &path);
    let duration_secs = probe.as_ref().ok().and_then(|p| {
        p.get("format")?
            .get("duration")?
            .as_str()?
            .parse::<f64>()
            .ok()
    });
    let video_stream = probe.as_ref().ok().and_then(|p| {
        p.get("streams")?
            .as_array()?
            .iter()
            .find(|s| s.get("codec_type").and_then(|v| v.as_str()) == Some("video"))
            .cloned()
    });
    let audio_stream = probe.as_ref().ok().and_then(|p| {
        p.get("streams")?
            .as_array()?
            .iter()
            .find(|s| s.get("codec_type").and_then(|v| v.as_str()) == Some("audio"))
            .cloned()
    });
    let video_codec = video_stream
        .as_ref()
        .and_then(|v| v.get("codec_name")?.as_str().map(str::to_string));
    let audio_codec = audio_stream
        .as_ref()
        .and_then(|a| a.get("codec_name")?.as_str().map(str::to_string));
    let width = video_stream.as_ref().and_then(|v| v.get("width")?.as_i64());
    let height = video_stream
        .as_ref()
        .and_then(|v| v.get("height")?.as_i64());
    let fps: Option<f64> = video_stream.as_ref().and_then(|v| {
        let fr = v.get("r_frame_rate")?.as_str()?;
        if let Some((n, d)) = fr.split_once('/') {
            let n: f64 = n.parse().ok()?;
            let d: f64 = d.parse().ok()?;
            if d > 0.0 {
                Some((n / d * 100.0).round() / 100.0)
            } else {
                None
            }
        } else {
            fr.parse().ok()
        }
    });
    let metadata_json = probe
        .ok()
        .map(|p| serde_json::to_string(&p).unwrap_or_default());

    db.execute(
        "INSERT INTO assets (id, path, filename, status, size_bytes, duration_secs, \
         video_codec, audio_codec, width, height, fps, metadata, created_at, updated_at) \
         VALUES (?1, ?2, ?3, 'pending', ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?12)",
        rusqlite::params![
            id,
            path,
            filename,
            size_bytes,
            duration_secs,
            video_codec,
            audio_codec,
            width,
            height,
            fps,
            metadata_json,
            now
        ],
    )
    .map_err(|e| e.to_string())?;

    let metadata_val = metadata_json
        .as_deref()
        .and_then(|s| serde_json::from_str(s).ok());

    Ok(Asset {
        id,
        path,
        filename,
        status: "pending".to_string(),
        size_bytes,
        duration_secs,
        video_codec,
        audio_codec,
        width,
        height,
        fps,
        created_at: now.clone(),
        updated_at: now,
        metadata: metadata_val,
        thumbnail_path: None,
        thumbnail_output_path: None,
        output_metadata: None,
        output_path: None,
    })
}

/// Executa ffprobe e retorna o JSON completo como Value
fn run_ffprobe(app: &tauri::AppHandle, path: &str) -> Result<serde_json::Value, String> {
    let ffprobe = crate::sidecar::resolve_media_binary_path(app, "ffprobe");
    let mut cmd = std::process::Command::new(&ffprobe);
    let output = crate::commands::no_window(cmd.args([
        "-v",
        "quiet",
        "-print_format",
        "json",
        "-show_streams",
        "-show_format",
        path,
    ]))
    .output()
    .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err(format!("ffprobe exit code: {:?}", output.status.code()));
    }

    serde_json::from_slice(&output.stdout).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_assets(status: Option<String>, state: State<AppState>) -> Result<Vec<Asset>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    match status.as_deref() {
        Some(s) => collect_assets(
            &db,
            &format!("SELECT {COLS} FROM assets WHERE status = ?1 ORDER BY created_at DESC"),
            Some(s),
        ),
        None => collect_assets(
            &db,
            &format!("SELECT {COLS} FROM assets ORDER BY created_at DESC"),
            None,
        ),
    }
}

/// Versão leve de list_assets sem o campo metadata (JSON ffprobe grande).
/// Usar em listagens onde só é necessário filename/thumbnail/status/dimensões.
#[derive(Debug, Serialize)]
pub struct AssetSlim {
    pub id: String,
    pub filename: String,
    pub status: String,
    pub thumbnail_path: Option<String>,
    pub duration_secs: Option<f64>,
    pub width: Option<i64>,
    pub height: Option<i64>,
}

#[tauri::command]
pub fn list_assets_slim(state: State<AppState>) -> Result<Vec<AssetSlim>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db
        .prepare(
            "SELECT id, filename, status, thumbnail_path, duration_secs, width, height \
             FROM assets ORDER BY created_at DESC",
        )
        .map_err(|e| e.to_string())?;
    let iter = stmt
        .query_map([], |row| {
            Ok(AssetSlim {
                id: row.get(0)?,
                filename: row.get(1)?,
                status: row.get(2)?,
                thumbnail_path: row.get(3)?,
                duration_secs: row.get(4)?,
                width: row.get(5)?,
                height: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?;
    let collected: rusqlite::Result<Vec<_>> = iter.collect();
    collected.map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_asset(id: String, delete_files: bool, state: State<AppState>) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    // 1. Recolher caminhos de output dos jobs para apagar ficheiros gerados
    let mut stmt = db
        .prepare("SELECT output_path FROM jobs WHERE asset_id = ?1 AND output_path IS NOT NULL")
        .map_err(|e| e.to_string())?;
    let output_paths: Vec<String> = stmt
        .query_map([&id], |row| row.get::<_, String>(0))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    // 2. Cancelar jobs queued/processing deste asset (o queue poller vai ignorá-los)
    let now = chrono::Utc::now().to_rfc3339();
    let _ = db.execute(
        "UPDATE jobs SET status='cancelled', updated_at=?1 \
         WHERE asset_id=?2 AND status IN ('queued','processing')",
        rusqlite::params![now, id],
    );

    // 3. Apagar entradas de audit_log associadas aos jobs deste asset
    let _ = db.execute(
        "DELETE FROM audit_log WHERE job_id IN \
         (SELECT id FROM jobs WHERE asset_id=?1)",
        rusqlite::params![id],
    );

    // 4. Apagar todos os jobs deste asset
    db.execute("DELETE FROM jobs WHERE asset_id=?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;

    // 5. Hard delete do asset
    let affected = db
        .execute("DELETE FROM assets WHERE id=?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;

    if affected == 0 {
        return Err(format!("Asset '{}' não encontrado", id));
    }

    // 6. Apagar ficheiros gerados do disco (não crítico — falhas são ignoradas)
    if delete_files {
        for path in output_paths {
            if !path.is_empty() {
                let _ = std::fs::remove_file(&path);
            }
        }
    }

    Ok(())
}

#[tauri::command]
pub fn get_asset(id: String, state: State<AppState>) -> Result<Option<Asset>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db
        .prepare(&format!("SELECT {COLS} FROM assets WHERE id = ?1"))
        .map_err(|e| e.to_string())?;
    let iter = stmt
        .query_map([&id], row_to_asset)
        .map_err(|e| e.to_string())?;
    let collected: rusqlite::Result<Vec<_>> = iter.collect();
    let mut rows = collected.map_err(|e| e.to_string())?;
    Ok(rows.pop())
}

#[tauri::command]
pub async fn scan_directory(path: String) -> Result<Vec<String>, String> {
    use walkdir::WalkDir;
    const VIDEO_EXTS: &[&str] = &[
        "mp4", "mov", "mxf", "avi", "mkv", "webm", "ts", "m2ts", "m4v",
    ];

    let mut paths: Vec<String> = WalkDir::new(&path)
        .follow_links(true)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
        .filter(|e| {
            e.path()
                .extension()
                .and_then(|ext| ext.to_str())
                .map(|ext| VIDEO_EXTS.contains(&ext.to_lowercase().as_str()))
                .unwrap_or(false)
        })
        .map(|e| e.path().to_string_lossy().into_owned())
        .collect();

    paths.sort();
    Ok(paths)
}

#[tauri::command]
pub fn find_asset_by_path(path: String, state: State<AppState>) -> Result<Option<String>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let result = db
        .query_row(
            "SELECT id FROM assets WHERE path = ?1 LIMIT 1",
            rusqlite::params![path],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|e| e.to_string())?;
    Ok(result)
}

/// Valida que o caminho corresponde a um asset registado na BD antes de servir o
/// seu conteúdo ao webview. Defesa-em-profundidade contra leitura arbitrária de
/// ficheiros via IPC (ex.: ~/.ssh, ficheiros de sistema) — o frontend só pede
/// caminhos que vieram de registos de assets. [M1]
fn assert_registered_asset(db: &rusqlite::Connection, path: &str) -> Result<(), String> {
    let known: Option<i64> = db
        .query_row(
            "SELECT 1 FROM assets \
             WHERE path=?1 OR output_path=?1 OR thumbnail_path=?1 OR thumbnail_output_path=?1 \
             LIMIT 1",
            [path],
            |r| r.get(0),
        )
        .optional()
        .map_err(|e| e.to_string())?;
    if known.is_none() {
        return Err("Acesso negado: o caminho não corresponde a um asset conhecido".to_string());
    }
    Ok(())
}

/// Lê um ficheiro de thumbnail e devolve conteúdo como base64.
/// Usado como fallback quando o asset protocol falha (scope/CSP).
/// Só para ficheiros pequenos (thumbnails ~50KB) — não usar para vídeos.
#[tauri::command]
pub fn read_thumbnail_base64(path: String, state: State<AppState>) -> Result<String, String> {
    use base64::engine::general_purpose::STANDARD;
    use base64::Engine;
    {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        assert_registered_asset(&db, &path)?;
    }
    let bytes = std::fs::read(&path).map_err(|e| format!("read_thumbnail_base64: {e}"))?;
    Ok(STANDARD.encode(bytes))
}

/// Lê um ficheiro de vídeo pequeno (<= 50 MB) e devolve como base64.
/// Fallback quando o asset protocol não serve o ficheiro (Windows scope mismatch).
/// Para ficheiros maiores retorna Err("FILE_TOO_LARGE:{bytes}").
#[tauri::command]
pub fn read_video_base64(path: String, state: State<AppState>) -> Result<String, String> {
    use base64::engine::general_purpose::STANDARD;
    use base64::Engine;
    {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        assert_registered_asset(&db, &path)?;
    }

    let metadata = std::fs::metadata(&path).map_err(|e| format!("read_video_base64: {e}"))?;

    const MAX_BYTES: u64 = 50 * 1024 * 1024;
    if metadata.len() > MAX_BYTES {
        return Err(format!("FILE_TOO_LARGE:{}", metadata.len()));
    }

    let bytes = std::fs::read(&path).map_err(|e| format!("read_video_base64: {e}"))?;
    Ok(STANDARD.encode(bytes))
}

#[cfg(test)]
mod m1_tests {
    use super::assert_registered_asset;
    use rusqlite::Connection;

    fn db_com_asset(path: &str) -> Connection {
        let db = Connection::open_in_memory().unwrap();
        db.execute_batch(
            "CREATE TABLE assets (path TEXT, output_path TEXT, thumbnail_path TEXT, thumbnail_output_path TEXT);",
        )
        .unwrap();
        db.execute("INSERT INTO assets VALUES (?1, NULL, NULL, NULL)", [path])
            .unwrap();
        db
    }

    #[test]
    fn aceita_caminho_de_asset_registado() {
        let db = db_com_asset("/videos/clip.mp4");
        assert!(assert_registered_asset(&db, "/videos/clip.mp4").is_ok());
    }

    #[test]
    fn rejeita_caminho_arbitrario() {
        let db = db_com_asset("/videos/clip.mp4");
        let err = assert_registered_asset(&db, "/home/user/.ssh/id_rsa").unwrap_err();
        assert!(err.contains("Acesso negado"));
    }
}
