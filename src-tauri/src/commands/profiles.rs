use crate::state::AppState;
use chrono::Utc;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Profile {
    pub id: String,
    pub name: String,
    pub description: String,
    pub container: String,
    pub video_codec: String,
    pub resolution: String,
    pub fps: u32,
    pub bitrate_kbps: Option<u32>,
    pub vmaf_threshold: u32,
    pub is_system: bool,
}

// Perfis de sistema compilados no binário
const PROFILES_RAW: &[(&str, &str)] = &[
    ("broadcast-hd", include_str!("../../../sidecar/profiles/broadcast-hd.json")),
    ("broadcast-sd", include_str!("../../../sidecar/profiles/broadcast-sd.json")),
    ("proxy",        include_str!("../../../sidecar/profiles/proxy.json")),
    ("social",       include_str!("../../../sidecar/profiles/social.json")),
    ("web-4k",       include_str!("../../../sidecar/profiles/web-4k.json")),
    ("web-hd",       include_str!("../../../sidecar/profiles/web-hd.json")),
];

fn system_profiles() -> Vec<Profile> {
    PROFILES_RAW
        .iter()
        .filter_map(|(id, raw)| {
            let v: serde_json::Value = serde_json::from_str(raw).ok()?;
            Some(Profile {
                id: id.to_string(),
                name: v["name"].as_str().unwrap_or(id).to_string(),
                description: v["description"].as_str().unwrap_or("").to_string(),
                container: "mp4".to_string(),
                video_codec: v["videoCodec"].as_str().unwrap_or("libx264").to_string(),
                resolution: v["resolution"].as_str().unwrap_or("").to_string(),
                fps: v["fps"].as_u64().unwrap_or(25) as u32,
                bitrate_kbps: v["videoBitrateK"].as_u64().map(|n| n as u32),
                vmaf_threshold: v["vmafThreshold"].as_u64().unwrap_or(93) as u32,
                is_system: true,
            })
        })
        .collect()
}

fn row_to_profile(row: &rusqlite::Row) -> rusqlite::Result<Profile> {
    Ok(Profile {
        id: row.get(0)?,
        name: row.get(1)?,
        description: row.get(2)?,
        container: row.get(3)?,
        video_codec: row.get(4)?,
        resolution: row.get(5)?,
        fps: row.get::<_, i64>(6)? as u32,
        bitrate_kbps: row.get::<_, Option<i64>>(7)?.map(|n| n as u32),
        vmaf_threshold: row.get::<_, i64>(8)? as u32,
        is_system: row.get::<_, i64>(9)? != 0,
    })
}

#[tauri::command]
pub fn list_profiles(state: State<AppState>) -> Result<Vec<Profile>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db
        .prepare(
            "SELECT id,name,description,container,video_codec,resolution,fps,bitrate_kbps,vmaf_threshold,is_system
             FROM profiles ORDER BY is_system DESC, name ASC",
        )
        .map_err(|e| e.to_string())?;
    let custom: Vec<Profile> = stmt
        .query_map([], row_to_profile)
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    let mut all = system_profiles();
    all.extend(custom);
    Ok(all)
}

#[derive(Debug, Deserialize)]
pub struct ProfileInput {
    pub name: String,
    pub description: Option<String>,
    pub container: Option<String>,
    pub video_codec: String,
    pub resolution: String,
    pub fps: u32,
    pub bitrate_kbps: Option<u32>,
    pub vmaf_threshold: Option<u32>,
}

#[tauri::command]
pub fn create_profile(profile: ProfileInput, state: State<AppState>) -> Result<Profile, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let description = profile.description.unwrap_or_default();
    let container = profile.container.unwrap_or_else(|| "mp4".to_string());
    let vmaf_threshold = profile.vmaf_threshold.unwrap_or(93);

    db.execute(
        "INSERT INTO profiles (id,name,description,container,video_codec,resolution,fps,bitrate_kbps,vmaf_threshold,is_system,created_at,updated_at)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,0,?10,?10)",
        params![
            id, profile.name, description, container, profile.video_codec,
            profile.resolution, profile.fps as i64, profile.bitrate_kbps.map(|n| n as i64),
            vmaf_threshold as i64, now
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(Profile {
        id,
        name: profile.name,
        description,
        container,
        video_codec: profile.video_codec,
        resolution: profile.resolution,
        fps: profile.fps,
        bitrate_kbps: profile.bitrate_kbps,
        vmaf_threshold,
        is_system: false,
    })
}

#[tauri::command]
pub fn update_profile(
    id: String,
    profile: ProfileInput,
    state: State<AppState>,
) -> Result<bool, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    // Impede alteração de perfis de sistema
    let is_system: i64 = db
        .query_row(
            "SELECT is_system FROM profiles WHERE id=?1",
            params![id],
            |r| r.get(0),
        )
        .unwrap_or(1);
    if is_system != 0 {
        return Err("Perfis de sistema não podem ser alterados".to_string());
    }

    let now = Utc::now().to_rfc3339();
    let description = profile.description.unwrap_or_default();
    let container = profile.container.unwrap_or_else(|| "mp4".to_string());
    let vmaf_threshold = profile.vmaf_threshold.unwrap_or(93);

    let rows = db
        .execute(
            "UPDATE profiles SET name=?1,description=?2,container=?3,video_codec=?4,
             resolution=?5,fps=?6,bitrate_kbps=?7,vmaf_threshold=?8,updated_at=?9
             WHERE id=?10 AND is_system=0",
            params![
                profile.name, description, container, profile.video_codec,
                profile.resolution, profile.fps as i64,
                profile.bitrate_kbps.map(|n| n as i64),
                vmaf_threshold as i64, now, id
            ],
        )
        .map_err(|e| e.to_string())?;
    Ok(rows > 0)
}

#[tauri::command]
pub fn delete_profile(id: String, state: State<AppState>) -> Result<bool, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let rows = db
        .execute(
            "DELETE FROM profiles WHERE id=?1 AND is_system=0",
            params![id],
        )
        .map_err(|e| e.to_string())?;
    Ok(rows > 0)
}
