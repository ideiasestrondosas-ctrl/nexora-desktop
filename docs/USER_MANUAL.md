# Nexora Desktop — User Manual

> **Version**: 0.17.0  
> **Languages**: English (base), Portuguese, Spanish, French, German, Italian, Japanese, Korean, Dutch, Polish, Russian, Swedish, Turkish, Arabic, Chinese  
> **Platforms**: Windows x64, macOS Universal, Linux x64

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Getting Started](#2-getting-started)
3. [Screens](#3-screens)
4. [Processing Pipeline](#4-processing-pipeline)
5. [Transcoding Profiles](#5-transcoding-profiles)
6. [Quality Control (QC)](#6-quality-control-qc)
7. [Asset Management](#7-asset-management)
8. [Settings](#8-settings)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Introduction

Nexora Desktop is a native, multiplatform application for professional video processing. It takes raw media files and processes them through an automated 8-stage pipeline — from ingest and quality control, through GPU-accelerated transcoding and audio normalization, to final delivery with perceptual quality verification.

### Who is it for?

- **Broadcast engineers** preparing content for TV transmission
- **Web producers** creating streaming-ready files
- **Social media managers** generating platform-optimised clips
- **Archivists** creating proxies and thumbnails for cataloguing
- **Anyone** who needs reliable, repeatable, quality-controlled video transcoding

### Core Concepts

| Term           | Definition                                                                                       |
| -------------- | ------------------------------------------------------------------------------------------------ |
| **Asset**      | A media file that has been ingested into Nexora (with metadata extracted)                        |
| **Job**        | A processing request assigned to an asset, using a specific profile                              |
| **Profile**    | A preset or custom configuration defining output codec, resolution, bitrate, and quality targets |
| **Pipeline**   | The 8 sequential stages every job passes through                                                 |
| **QC**         | Quality Control — automated checks before and after transcoding                                  |
| **VMAF**       | Video Multi-Method Assessment Fusion — perceptual quality score (0-100)                          |
| **LUFS**       | Loudness Units Full Scale — broadcast-standard audio loudness measurement                        |
| **Quarantine** | A state where a job is paused awaiting manual approval after a QC failure                        |

---

## 2. Getting Started

### 2.1 Installation

See [INSTALL.md](INSTALL.md) for platform-specific instructions.

### 2.2 First Launch

1. **Open Nexora Desktop** after installation.
2. **FFmpeg binaries** will be downloaded automatically on first run (or use bundled ones if available).
3. Go to **Settings → General** and set your **Output Directory**.
4. Go to **Settings → Interface** and choose your **Language** and **Theme**.
5. Your system will be scanned for **GPU acceleration** automatically.

### 2.3 Your First Job

1. Go to **Library**.
2. Drag a video file onto the window (or click **Add Videos**).
3. The file appears in the Library with a **Pending** status.
4. Click the file → click **Reprocess**.
5. Select **Broadcast HD** (or any profile) → click **Start**.
6. Go to **Queue** to watch the pipeline progress.
7. When done, click the file in Library → **Asset Detail** to see the QC report.

---

## 3. Screens

### 3.1 Dashboard

The Dashboard is your system overview. It shows:

- **Total Assets** — number of files in your library
- **Jobs Today** — completed jobs in the last 24 hours
- **Average VMAF** — mean quality score of recent outputs
- **Recent Jobs** — last 5 jobs with status, profile, and score
- **VMAF Distribution** — visual breakdown of quality tiers

Click any job in the Recent Jobs list to jump to its **Asset Detail** page.

### 3.2 Library

The Library is your media repository.

**Features:**

- **Grid view** — thumbnail cards with status badges
- **List view** — table with sortable columns
- **Drag & drop** — drop files from anywhere on your OS
- **File dialog** — multi-select via native file picker
- **Search** — filter by filename
- **Status filter** — show only Pending, Processing, Completed, or Errors
- **Sort** — by Newest, Oldest, Name, or Size

**Actions per asset:**

- **Open** — open the original file in your default player
- **Play** — preview the file (if supported)
- **Delete** — remove from library (with confirmation)
- **Reprocess** — submit a new job with a chosen profile

**Ingestion formats:** `.mp4`, `.mkv`, `.mov`, `.mxf`, `.avi`, `.webm`, `.ts`, `.m2ts`

### 3.3 Queue

The Queue is the heart of Nexora — real-time job monitoring.

**Sections:**

1. **Pipeline Summary** — counts of queued, processing, completed, and quarantined jobs
2. **Pending Approvals** — jobs that failed Pre-QC and need manual review
3. **Processing** — currently active jobs with live pipeline visualizer
4. **Queued** — jobs waiting for a free processing slot
5. **Completed & History** — finished jobs (success, error, cancelled, rejected)

**Pipeline Visualizer:**
Each processing job shows an 8-step timeline:

- Green checkmark = step completed
- Blue pulsing dot = step in progress
- Yellow shield = step quarantined
- Red alert = step failed

Hover any step for its name and description.

**Actions:**

- **Cancel** — stop a queued or processing job
- **Approve / Reject** — for quarantined jobs
- **Retry** — re-run a failed job
- **Open output** — open the processed file's location

### 3.4 Profiles

Profiles define how your media is transcoded.

**System Profiles** (read-only, 6 presets):

- Broadcast HD, Broadcast SD, Web 4K, Web HD, Proxy, Social

**Custom Profiles:**

- **Create** — start from scratch
- **Edit** — modify existing custom profile
- **Duplicate** — clone any profile (system or custom) as a starting point
- **Delete** — remove custom profile

**Profile settings:**

- General: name, description, container (MP4/MKV/MOV)
- Video: codec (H.264/HEVC/AV1), resolution, fps, bitrate, CPU preset, H.264 profile/level
- Audio & Quality: audio codec, bitrate, sample rate, target LUFS, true peak limit, VMAF minimum threshold, acceleration mode

### 3.5 Settings

Settings are organised into 5 tabs.

**General:**

- Output directory (where processed files are saved)
- Concurrent jobs (1–4, default 2)
- Default profile for quick submits
- VMAF minimum threshold (0–100)
- Target LUFS (-23 Broadcast, -16 Streaming, -14 Social)
- True peak limit (dB)
- GPU acceleration toggle
- System notifications toggle

**Interface:**

- Theme: System / Light / Dark
- Language: 15 languages available

**System:**

- OS, CPU, RAM, Disk, GPU info
- FFmpeg/libvmaf/Node.js versions
- Database path and statistics

**Advanced:**

- Export settings + profiles to JSON
- Import settings from JSON
- Reset settings to defaults
- **Factory Reset** — wipes everything (irreversible)

**About:**

- App version and edition
- Changelog / release notes
- Check for updates
- Open data directory

### 3.6 Logs

Structured log viewer for debugging.

**Filters:**

- Level: DEBUG, INFO, WARN, ERROR
- Source: sidecar, tauri, ffmpeg, app
- Time: 1h, 6h, 24h, 7d, All
- Search: free-text search in messages

**Actions:**

- Export logs to text file
- Clear all logs (with confirmation)
- Auto-scroll toggle

**Visual indicators:**

- Red left border = ERROR
- Yellow left border = WARN
- Expandable rows for multi-line messages

### 3.7 Asset Detail

Deep-dive into a single media file.

**Sections:**

- **Hero** — thumbnail/preview, filename, status badge, metadata grid
- **QC Report** — verification checks (codec, resolution, VMAF, audio) with pass/fail
- **Processing History** — timeline of all jobs for this asset with mini pipeline
- **Sticky Action Bar** — Reprocess, Open in Explorer, Delete

---

## 4. Processing Pipeline

Every job follows this exact sequence:

```
Ingest → QC-Pre → Transcode → Audio → Proxy → Thumbnail → QC-Post → Delivery
```

### Stage 1: Ingest (5%)

- Compute SHA-256 hash of the source file
- Extract metadata via ffprobe (codec, resolution, duration, fps, bitrate)
- Store in database as an Asset

### Stage 2: QC-Pre (5%)

- Validate file size (< 100 GB)
- Validate duration (> 0.5 seconds)
- Check for video stream
- **Quarantine triggers:**
  - File > 50 GB
  - Unsupported codec (HEVC, ProRes, DNxHD, AV1)
  - No video stream
  - Duration too short

### Stage 3: Transcode (50%)

- GPU auto-detection: NVENC → AMF → QSV → CPU (libx264 fallback)
- Build FFmpeg command based on profile settings
- Broadcast parameters applied: closed GOP, no B-frames, YUV 4:2:0, faststart
- Progress parsed from FFmpeg stderr

### Stage 4: Audio (15%)

- 2-pass EBU R128 loudness normalization
- Pass 1: analyse loudness
- Pass 2: apply gain + alimiter for true peak limiting
- Verify result within ±1.5 LUFS of target

### Stage 5: Proxy (10%)

- Generate 960×540 preview file
- Veryfast preset, 800 kbps
- Non-critical: failure does not fail the job

### Stage 6: Thumbnail (3%)

- Extract frame at min(5s, duration/2)
- Scale to 640px width
- Non-critical: failure does not fail the job

### Stage 7: QC-Post (7%)

- Compute SHA-256 of output file
- Run VMAF comparing source vs. output
- **Thresholds per profile:**
  - Broadcast: VMAF ≥ 90
  - Web: VMAF ≥ 85
  - Proxy: VMAF ≥ 70
  - Social: VMAF ≥ 80
- Non-critical: low VMAF does not fail the job (reported only)

### Stage 8: Delivery (5%)

- Copy final file to the configured output directory
- Rename with timestamp suffix if file exists
- Job marked as **Done**

---

## 5. Transcoding Profiles

### Built-in Profiles

| Profile      | Resolution | Video          | Bitrate  | LUFS | VMAF | Use Case          |
| ------------ | ---------- | -------------- | -------- | ---- | ---- | ----------------- |
| Broadcast HD | 1920×1080  | H.264 High     | 15 Mbps  | -23  | 90   | TV broadcast      |
| Broadcast SD | 720×576    | H.264 Main     | 5 Mbps   | -23  | 90   | Legacy TV         |
| Web 4K       | 3840×2160  | H.264 High     | 35 Mbps  | -16  | 85   | UHD streaming     |
| Web HD       | 1920×1080  | H.264 High     | 8 Mbps   | -16  | 85   | HD streaming      |
| Proxy        | 960×540    | H.264 Baseline | 800 kbps | —    | 70   | Preview / editing |
| Social       | 1080×1080  | H.264 Main     | 4 Mbps   | -14  | 80   | Social media      |

### Creating Custom Profiles

1. Go to **Profiles**.
2. Click **Create New** (or Duplicate an existing one).
3. Fill in:
   - **Name** and **Description**
   - **Container**: MP4 (most compatible), MKV, or MOV
   - **Video Codec**: H.264 (recommended), HEVC, or AV1
   - **Resolution**: preset or custom width×height
   - **FPS**: match source or target (24, 25, 30, 50, 60)
   - **Bitrate**: in kbps (e.g., 15000 for 15 Mbps)
   - **CPU Preset**: slower = better quality, faster = quicker encode
   - **H.264 Profile/Level**: High 4.1 for broadcast, Main 3.1 for web
   - **Audio Codec**: AAC (recommended), or OPUS
   - **Audio Bitrate**: 128–384 kbps
   - **Sample Rate**: 48 kHz (broadcast standard)
   - **Target LUFS**: -23 (broadcast), -16 (web), -14 (social)
   - **True Peak**: -1.0 dBTP (standard), -2.0 dBTP (conservative)
   - **VMAF Threshold**: minimum acceptable score (0–100)
   - **Acceleration**: Auto-detect, Force GPU, or Force CPU
4. Click **Save**.

### Technical Notes

All profiles apply these broadcast-standard FFmpeg parameters:

```
-g [fps*2]          # GOP length
-keyint_min [fps*2] # Minimum keyframe interval
-sc_threshold 0     # Disable scene-cut detection
-flags +cgop        # Closed GOP
-bf 0               # No B-frames
-pix_fmt yuv420p    # YUV 4:2:0 chroma subsampling
-movflags +faststart # Web-optimised MP4
```

---

## 6. Quality Control (QC)

### Pre-QC (Before Transcoding)

Pre-QC runs automatically after Ingest. If a file fails any check, it is **quarantined**:

| Check        | Fail Condition              | Result            |
| ------------ | --------------------------- | ----------------- |
| File size    | > 100 GB                    | Error (job fails) |
| File size    | > 50 GB                     | Quarantine        |
| Duration     | < 0.5 seconds               | Error             |
| Video stream | Missing                     | Error             |
| Codec        | HEVC / ProRes / DNxHD / AV1 | Quarantine        |

**What to do with quarantined files:**

1. Go to **Queue → Pending Approvals**.
2. Review the file info and quarantine reason.
3. Click **Approve** to continue processing, or **Reject** to cancel the job.

### Post-QC (After Transcoding)

Post-QC runs after transcoding completes:

| Check             | Description                                  |
| ----------------- | -------------------------------------------- |
| SHA-256 match     | Verify output file integrity                 |
| VMAF score        | Compare perceptual quality vs. source        |
| LUFS verification | Confirm audio loudness within ±1.5 of target |

**QC Report** in Asset Detail shows:

- PASS / FAIL for each check
- Actual value vs. limit
- Timestamp of QC run

### VMAF Score Interpretation

| Score  | Quality Level   | Action                         |
| ------ | --------------- | ------------------------------ |
| 93–100 | Broadcast-grade | Excellent                      |
| 85–92  | Good            | Acceptable for most uses       |
| 70–84  | Acceptable      | May be noticeable quality loss |
| 0–69   | Poor            | Review profile settings        |

---

## 7. Asset Management

### Ingesting Files

**Method 1 — Drag & Drop:**

1. Open any file manager (Explorer, Finder, etc.).
2. Drag video files onto the Nexora Library window.
3. Files are validated and added automatically.

**Method 2 — File Dialog:**

1. Click **Add Videos** in the Library.
2. Select one or more files.
3. Click **Open**.

**Validation:**

- Supported formats: MP4, MKV, MOV, MXF, AVI, WebM, TS, M2TS
- Unsupported files trigger a toast error and are ignored

### Viewing Assets

- **Grid view** — visual thumbnails, hover for actions
- **List view** — compact table with all metadata
- **Asset Detail** — full metadata, QC reports, job history

### Deleting Assets

1. In Library, hover the asset and click the **Trash** icon.
2. Confirm the deletion dialog.
3. The asset is soft-deleted (marked as `deleted` in the database).

> To permanently remove data, use **Settings → Advanced → Factory Reset**.

---

## 8. Settings

### General Settings

| Setting          | Default              | Description                      |
| ---------------- | -------------------- | -------------------------------- |
| Output Directory | User's home / Nexora | Where processed files are saved  |
| Concurrent Jobs  | 2                    | Max simultaneous processing jobs |
| Default Profile  | Broadcast HD         | Profile used for quick reprocess |
| VMAF Threshold   | 85                   | Minimum acceptable VMAF score    |
| Target LUFS      | -23                  | Audio loudness target            |
| True Peak        | -1.0 dBTP            | Maximum audio peak level         |
| GPU Acceleration | On                   | Use NVENC/AMF/QSV when available |
| Notifications    | On                   | System notifications for events  |

### Interface Settings

| Setting  | Default | Options               |
| -------- | ------- | --------------------- |
| Theme    | System  | System / Light / Dark |
| Language | English | 15 languages          |

### System Information

Shows real-time and static system data:

- OS version and architecture
- CPU model, cores, threads
- RAM used / total
- Disk type, free / total space
- GPU vendor, encoder, availability
- FFmpeg version, libvmaf availability
- Node.js version
- Database path and size
- Asset, job, and log counts

### Advanced Settings

**Export Settings:**

- Saves all settings and custom profiles to a JSON file
- Useful for backup or migrating to another machine

**Import Settings:**

- Loads settings from a previously exported JSON file
- App restarts automatically after import

**Reset Settings:**

- Resets all settings to defaults
- Preserves assets, jobs, and custom profiles

**Factory Reset:**

- **WARNING: Irreversible**
- Clears all data: assets, jobs, profiles, logs, settings
- Deletes downloaded binaries
- Restarts the application

---

## 9. Troubleshooting

### Common Issues

#### "FFmpeg not found"

- Nexora downloads FFmpeg automatically on first launch.
- If it fails, check your internet connection.
- Alternatively, place `ffmpeg` and `ffprobe` in your system PATH.

#### "No GPU detected"

- Ensure GPU drivers are up to date.
- NVIDIA: install latest drivers from nvidia.com.
- AMD: install Adrenalin drivers.
- Intel: install latest graphics drivers.
- Nexora falls back to CPU (libx264) if no GPU is found.

#### "Job failed at Transcode stage"

- Check Logs for FFmpeg error output.
- Common causes:
  - Source file is corrupted
  - Insufficient disk space
  - Incompatible source codec
- Try a different profile or re-ingest the file.

#### "Low VMAF score"

- Increase the bitrate in your custom profile.
- Use a slower CPU preset (better quality).
- Ensure source file is high quality.

#### "App won't start"

- Check that Node.js 20+ is installed (for sidecar).
- Delete `%APPDATA%/com.nexora.desktop` (Windows) or `~/Library/Application Support/com.nexora.desktop` (macOS) and restart.
- See Logs for startup errors.

### Where to Get Help

1. **In-app Help** — Click the ❓ button in the top-right corner for contextual help.
2. **Logs** — Go to Settings → Logs for detailed error messages.
3. **GitHub Issues** — [github.com/ideiasestrondosas-ctrl/nexora-desktop/issues](https://github.com/ideiasestrondosas-ctrl/nexora-desktop/issues)
4. **Export Logs** — Use Ctrl+Shift+E to export logs for sharing.

### Factory Reset

If the application is in an unrecoverable state:

1. Go to **Settings → Advanced**.
2. Click **Factory Reset**.
3. Read the confirmation dialog carefully.
4. Type "RESET" to confirm.
5. The app will close and restart with a clean state.

> **Note:** Factory reset deletes all data. Export settings first if you want to preserve custom profiles.
