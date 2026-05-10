use tauri::command;

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Profile {
    pub id: String,
    pub name: String,
    pub description: String,
    pub container: String,
    pub video_codec: String,
    pub resolution: String,
    pub fps: u32,
    pub vmaf_threshold: u32,
}

const PROFILES_RAW: &[(&str, &str)] = &[
    (
        "broadcast-hd",
        include_str!("../../../sidecar/profiles/broadcast-hd.json"),
    ),
    (
        "broadcast-sd",
        include_str!("../../../sidecar/profiles/broadcast-sd.json"),
    ),
    (
        "proxy",
        include_str!("../../../sidecar/profiles/proxy.json"),
    ),
    (
        "social",
        include_str!("../../../sidecar/profiles/social.json"),
    ),
    (
        "web-4k",
        include_str!("../../../sidecar/profiles/web-4k.json"),
    ),
    (
        "web-hd",
        include_str!("../../../sidecar/profiles/web-hd.json"),
    ),
];

#[command]
pub fn list_profiles() -> Vec<Profile> {
    PROFILES_RAW
        .iter()
        .filter_map(|(id, raw)| {
            let v: serde_json::Value = serde_json::from_str(raw).ok()?;
            Some(Profile {
                id: id.to_string(),
                name: v["name"].as_str().unwrap_or(id).to_string(),
                description: v["description"].as_str().unwrap_or("").to_string(),
                container: "mp4".to_string(),
                video_codec: v["videoCodec"].as_str().unwrap_or("").to_string(),
                resolution: v["resolution"].as_str().unwrap_or("").to_string(),
                fps: v["fps"].as_u64().unwrap_or(0) as u32,
                vmaf_threshold: v["vmafThreshold"].as_u64().unwrap_or(0) as u32,
            })
        })
        .collect()
}
