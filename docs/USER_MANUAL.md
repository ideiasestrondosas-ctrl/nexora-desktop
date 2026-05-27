# Nexora Desktop — User Manual

**Version:** 0.23.0 | **Platform:** Windows · macOS · Linux

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Dashboard](#2-dashboard)
3. [Library](#3-library)
4. [Queue](#4-queue)
5. [Asset Detail](#5-asset-detail)
6. [Profiles](#6-profiles)
7. [Settings](#7-settings)
8. [Logs & Diagnostics](#8-logs--diagnostics)

---

## 1. Introduction

Nexora Desktop is a native multiplatform application for professional video transcoding. It provides:

- **GPU-accelerated transcoding** — auto-detects NVIDIA NVENC, AMD AMF, Intel QSV, or falls back to CPU
- **VMAF quality scoring** — perceptual quality measurement comparing source vs. output
- **EBU R128 audio normalization** — broadcast-standard loudness compliance
- **8-stage QC pipeline** — Ingest → Pre-QC → Transcode → Audio → Proxy → Thumbnail → Post-QC → Delivery
- **Quarantine & approval workflow** — review flagged assets before delivery

### Quick Start

1. Go to **Library** → drag a video file onto the window
2. Select a processing profile in the dialog that appears
3. Monitor progress in **Queue**
4. Click any asset in **Queue** or **Library** to open **Asset Detail**

---

## 2. Dashboard

The Dashboard is your system overview.

### Statistics Cards

| Card         | Description                                     |
| ------------ | ----------------------------------------------- |
| Total Assets | All media files in your library                 |
| Jobs Today   | Processing jobs completed in the last 24 hours  |
| Average VMAF | Mean perceptual quality score of recent outputs |

### Recent Jobs

Shows all jobs in a scrollable list. Click any row to open its Asset Detail. The list scrolls with the mouse wheel when hovered.

### VMAF Distribution

Bar chart showing quality tiers: below 70 (poor), 70–85 (acceptable), 85–95 (good), above 95 (broadcast grade).

---

## 3. Library

The Library is your media repository.

### Adding Files

- **Drag & drop** video files anywhere on the window
- **Add Videos button** — opens a file picker dialog
- **Add Folder button** — imports all supported videos from a directory

Supported formats: MP4, MKV, MOV, MXF, AVI, WebM, TS, M2TS

### Asset Cards

- **Grid view** — thumbnails with hover actions (Open, Play, Download, Delete)
- **List view** — sortable table with full metadata

### Download Processed File

Assets with a processed output show a **Download** button (↓ icon). Click to choose where to save the processed file.

### Filtering & Sorting

Use the toolbar to filter by status (All, Pending, Processing, Completed, Error) and sort by newest, oldest, name, or size.

---

## 4. Queue

The Queue monitors all processing jobs in real time.

### Sections

| Section             | Description                                               |
| ------------------- | --------------------------------------------------------- |
| Processing          | Currently active jobs — shows 3-phase pipeline visualizer |
| Pending Approvals   | Quarantined assets awaiting manual review                 |
| Queued              | Jobs waiting to start                                     |
| Completed & History | All finished jobs (done, error, cancelled, rejected)      |

### Pipeline Summary

At the top of the Queue page, a pipeline summary shows the overall state of all jobs. Click any count badge (Queued, Processing, Done, Quarantined) to expand an inline panel listing the files at that stage. Click the arrow (→) next to any file to navigate directly to its Asset Detail.

### Completed & History Actions

Each finished job has two action icons:

- **↗ Open Asset** — navigates to Asset Detail for that video
- **⟳ Reprocess** — opens a profile picker in a foreground popup (portal-rendered) to reprocess with the same or a different profile

---

## 5. Asset Detail

Asset Detail is the main workspace for a single video file.

### Hero Section

- **Toggle Original / Processed** — switch the preview between source and output
- **Play button** — plays the video inline; the path shown updates with the active view
- **Open in player** — opens in the system default media player

**In-App Navigation:** When viewing a processed file, clicking "View Processed" first attempts to navigate to the asset's detail page within the app. If the asset is not found in the library, it falls back to opening the file location in the system file manager.

### Tabs

#### Quality Report (QC)

Shows QC checks: codec support, minimum resolution, VMAF score, audio LUFS.

#### Technical Metadata

Shows full ffprobe metadata for the selected file (original or processed).

Sub-tabs within Technical Metadata:

- **General** — format, duration, bitrate, file size
- **Video** — codec, resolution, frame rate, colour space, HDR data
- **Audio** — codec, sample rate, channels, bitrate
- **Tags** — container metadata tags
- **SHA-256** — file integrity hash

Both original and processed paths are shown above their respective metadata panels.

#### Technical Analysis

Side-by-side comparison of original vs. processed:

- File name, full path, and file size
- Codec, resolution, fps, bit depth, HDR, colour space, container, scan type

#### Job History

Shows all processing jobs for this asset (creation and reprocessing). Each entry shows the pipeline stages, timing, VMAF, and LUFS scores.

### Action Bar

**Delete Confirmation:** The Delete button shows a two-step confirmation. First, a native dialog asks to confirm asset removal. Second, if the asset has a processed output file, a second dialog asks whether to also delete that file from disk. This prevents accidental data loss.

| Button         | Action                                                                  |
| -------------- | ----------------------------------------------------------------------- |
| Reprocess ▾    | Opens profile picker — select a profile to queue a new job              |
| View Original  | Opens the source file location in Explorer/Finder                       |
| View Processed | Tries to open the processed asset in-app; falls back to Explorer/Finder |
| Download       | Saves the processed file to a chosen destination                        |
| Delete         | Removes the asset and all jobs; asks whether to delete processed files  |

---

## 6. Profiles

Profiles define how media is transcoded.

### Built-in Presets (read-only)

| Profile      | Use case                                 |
| ------------ | ---------------------------------------- |
| Broadcast HD | 1080p H.264, broadcast-standard loudness |
| Broadcast SD | 576p/480p for legacy broadcast           |
| Web 4K       | 2160p H.265, web delivery                |
| Web HD       | 720p H.264, streaming                    |
| Proxy        | Fast low-res for offline editing         |
| Social       | Optimized for social media platforms     |

### Custom Profiles

Click **Create** to build a custom profile. Configure:

- Video: codec, resolution, fps, bitrate
- Audio: codec, sample rate, LUFS target, true peak
- Quality: VMAF minimum threshold, CPU preset

Duplicate any built-in preset to use it as a starting point.

---

## 7. Settings

### General

- **Output folder** — where processed files are saved
- **Concurrent jobs** — number of parallel processing jobs (start with 2)
- **GPU acceleration** — enable/disable NVENC/AMF/QSV
- **Notifications** — system tray alerts on job completion

### Interface

- **Theme** — System (follows OS), Light, Dark
- **Language** — 15 languages supported; changes apply instantly

### System

Shows hardware info (CPU, RAM, disk), FFmpeg version, and database statistics.

### Advanced

Export settings to JSON, import from a backup, or reset to factory defaults.

- **Factory Reset** — red destructive button; shows a first confirmation, then asks whether to delete output files, then clears all data, kills the sidecar, and restarts the app

---

## 8. Logs & Diagnostics

The Logs page shows structured application logs with full-text search.

### Log Levels

| Level | Meaning                      |
| ----- | ---------------------------- |
| INFO  | Normal operations            |
| WARN  | Non-fatal issues             |
| ERROR | Failures requiring attention |
| DEBUG | Verbose diagnostic output    |

`[ACTIVITY]` entries record all user interactions: clicks, executions, navigation, and attempted actions.

### Controls

- **Filter** by level and search by keyword
- **Export** all logs to a text file (`Ctrl+Shift+E`)
- **Clear** removes log entries from the database (does not affect jobs or assets)

---

## 9. Asset Detail

Asset Detail is the main workspace for a single video file.

### Hero Section

- **Toggle Original / Processed** — switch the preview between source and output
- **Play button** — plays the video inline; the path shown updates with the active view
- **Open in player** — opens in the system default media player

### MediaInfo Tabs

Sub-tabs within Technical Metadata:

- **General** — format, duration, bitrate, file size
- **Video** — codec, resolution, frame rate, colour space, HDR data
- **Audio** — codec, sample rate, channels, bitrate
- **Subtitles** — embedded subtitle tracks
- **Tags** — container metadata tags
- **SHA-256** — file integrity hash

### Technical Analysis

Side-by-side comparison of original vs. processed:

- File name, full path, and file size
- Codec, resolution, fps, bit depth, HDR, colour space, container, scan type

### Action Bar

| Button         | Action                                                                  |
| -------------- | ----------------------------------------------------------------------- |
| Reprocess      | Opens profile picker to queue a new job                                 |
| View Original  | Opens the source file location in Explorer/Finder                       |
| View Processed | Tries to open the processed asset in-app; falls back to Explorer/Finder |
| Download       | Saves the processed file to a chosen destination                        |
| Delete         | Removes the asset and all jobs; asks whether to delete processed files  |

---

## 10. Cloud Storage

Configure cloud storage destinations for automatic file delivery after transcoding.

### Supported Providers

| Provider         | Protocol    | Browse | Upload | Download | Notes                                   |
| ---------------- | ----------- | :----: | :----: | :------: | --------------------------------------- |
| **FTP**          | FTP / FTPS  |   ✅   |   ✅   |    ✅    | Plain FTP or explicit TLS               |
| **SFTP**         | SSH         |   ✅   |   ✅   |    ✅    | Password or key-based auth              |
| **SMB**          | CIFS / SMB2 |   ✅   |   ✅   |    ✅    | Windows shares and NAS devices          |
| **S3**           | HTTPS       |   ✅   |   ✅   |    ✅    | AWS S3, MinIO, Wasabi, Backblaze B2     |
| **Google Drive** | HTTPS       |   ✅   |   ✅   |    ✅    | OAuth device flow; upserts on re-upload |
| **iCloud**       | —           |   ❌   |   ❌   |    ❌    | Via local folder sync only              |

### Google Drive Authentication

Nexora uses OAuth 2.0 Device Flow (no password storage):

1. Click **Authenticate** in the Google Drive profile — Nexora requests a device code
2. Open the provided URL in your browser and enter the user code
3. Nexora polls Google every 5 seconds until authorized. The token is stored locally.

### Cloud File Browser

Click **Browse** on any profile to open the file browser:

- Navigate into subdirectories
- Select multiple files with checkboxes
- Download to a local folder via the native OS file picker
- Delete files permanently from remote storage

### Automatic Upload

When a job completes, the output file is uploaded to all configured cloud destinations:

- 3 retries with exponential backoff
- Failed uploads are logged but do not mark the job as failed
- Google Drive upserts: existing files with the same name are replaced, not duplicated

---

## 11. Security & Privacy

### Credential Storage

Cloud provider credentials are stored in the OS keychain:

- **Windows** — Windows Credential Manager
- **macOS** — macOS Keychain
- **Linux** — Secret Service / libsecret

Credentials are **never** stored in plaintext in the SQLite database.

### Path Validation

Remote paths are validated to prevent directory traversal attacks. SMB paths containing `..` components are rejected.

### Log Endpoint Validation

Log upload endpoints must use `http://` or `https://` protocols. URLs without a protocol are rejected.

### Factory Reset

A two-step confirmation process ensures intentional data loss:

1. Confirm the total reset of all data, settings, and history
2. Choose whether to delete output files from disk
3. The app restarts automatically after cleanup

---

## 12. Visual Comparator (v0.30.0-beta.1)

The Visual Comparator lets you compare original and processed videos side-by-side with synchronized playback.

### Features

- **Split-Screen**: Drag the vertical divider to reveal more of one side or the other
- **Synchronized Scrubbing**: Move the timeline scrubber to navigate to any frame — both videos stay in sync
- **Play/Pause**: Toggle playback on both videos simultaneously
- **Auto-Appearance**: The Comparator tab only appears when a processed output exists

### How to Use

1. Process a job to completion (status = "Done")
2. Open the asset in **Asset Detail**
3. Click the **"Comparator"** tab
4. Drag the divider to adjust the split
5. Use the scrubber or Play/Pause to navigate frames

---

## 13. Onboarding Wizard (v0.30.0-beta.1)

At first launch, a 4-step wizard guides new users through initial setup.

### Steps

1. **Welcome** — Overview of Nexora's core features
2. **Output Directory** — Choose where processed files will be saved
3. **Privacy & Telemetry** — Opt-in to anonymous telemetry (disabled by default)
4. **Done** — Start processing

---

## 14. Watch Folders (v0.30.0-beta.1)

Automatically monitor local directories for new video files. When a new file is detected and stabilised (debounced for 3 seconds), it is automatically ingested into the Library.

### Usage

- Go to **Settings → Watch Folders**
- Click "Add Folder" to monitor a directory
- Toggle enable/disable per folder
- Files are ingested automatically after the debounce period

---

## 15. Bug Reporting (v0.30.0-beta.1)

Report issues directly from the app via the orange bug icon in the TopBar.

### Features

- **Copy to Clipboard**: Copy the bug report with recent logs (50 lines) to your clipboard
- **GitHub Issue**: Open a pre-filled GitHub issue with the report attached
- **Save to File**: Save the report as a text file for later use

### How to Report

1. Click the **Bug icon** (orange) in the TopBar
2. Fill in the title and description
3. Optionally include recent logs
4. Choose: Copy, GitHub, or Save

---

## 16. Pipeline Error Messages (v0.30.0-beta.1)

When a job fails, Nexora now categorizes the error and provides actionable hints.

### Categories

| Category              | Trigger                                 | Hint                                          |
| --------------------- | --------------------------------------- | --------------------------------------------- |
| **Disk Full**         | "no space left", "disk full"            | Free up disk space or change output directory |
| **Permission Denied** | "permission denied", "access is denied" | Check file/directory permissions              |
| **Corrupt File**      | "invalid data", "moov atom not found"   | Re-encode the source file                     |
| **Codec Error**       | "encoder not found", "codec not found"  | Update FFmpeg or reinstall                    |
| **Killed**            | "SIGKILL", "signal 9"                   | Check system logs for OOM killer              |
| **Generic**           | Any other error                         | Check logs for details                        |

---

_Nexora Desktop — Open Source Media Processing_
_GitHub: https://github.com/ideiasestrondosas-ctrl/nexora-desktop_
