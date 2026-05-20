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

_Nexora Desktop — Open Source Media Processing_  
_GitHub: https://github.com/ideiasestrondosas-ctrl/nexora-desktop_
