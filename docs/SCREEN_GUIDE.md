# Nexora Desktop — Screen Guide

> Visual reference for every screen, UI element, badge, colour code, and interaction flow.

---

## Table of Contents

1. [Global UI Elements](#1-global-ui-elements)
2. [Dashboard](#2-dashboard)
3. [Library](#3-library)
4. [Queue](#4-queue)
5. [Profiles](#5-profiles)
6. [Settings](#6-settings)
7. [Logs](#7-logs)
8. [Asset Detail](#8-asset-detail)
9. [Colour Reference](#9-colour-reference)
10. [Badge Reference](#10-badge-reference)
11. [Icon Reference](#11-icon-reference)

---

## 1. Global UI Elements

### Sidebar (Left, 256px)

```
┌─────────────────────┐
│ [drag area]         │  ← Tauri window drag region (8px)
├─────────────────────┤
│ [🔷] NEXORA         │  ← Logo + "Desktop" subtitle
│      Desktop        │
├─────────────────────┤
│ 📊 Dashboard        │  ← Main nav items
│ 📁 Library          │
│ ▶️  Queue           │
│ 👤 Profiles         │
│ ⚙️  Settings        │
├─────────────────────┤
│ 🖥️  Logs            │  ← Bottom nav (border-top separator)
│                     │
│ VERSION             │  ← Version badge
│ v0.17.0             │
└─────────────────────┘
```

**Active item indicator:**
- Background: `bg-brand/10` (blue tint)
- Text: bold, `text-text-primary`
- Left edge: 4px blue bar `bg-[#1A6FD4]` rounded-r-full
- Icon: `text-brand`

**Inactive item:**
- Text: `text-text-muted`
- Hover: `text-text-secondary` + `bg-bg-hover`

### TopBar (Top, 64px)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Dashboard                    [CPU] [RAM] [GPU] [Disk]              [⏻] │
│ System overview and real-time metrics                                   │
└─────────────────────────────────────────────────────────────────────────┘
```

**Left:**
- Screen title (bold, 16px)
- Screen description (muted, 12px)

**Centre-Right (hidden on small screens):**
- 4 circular SVG gauges:
  - **CPU** — `Cpu` icon, green/yellow/red stroke
  - **RAM** — `MemoryStick` icon
  - **GPU** — `Monitor` icon
  - **Disk** — `HardDrive` icon
- Gauge colour thresholds:
  - ≤ 60%: green
  - 61–80%: yellow
  - > 80%: red

**Far Right:**
- **Exit** button — `LogOut` icon, red on hover

---

## 2. Dashboard

### Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Dashboard                                                          [⏻] │
│ System overview and real-time metrics                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │ Total Assets │  │ Jobs Today   │  │ Avg VMAF     │                  │
│  │     42       │  │     12       │  │    91.3      │                  │
│  └──────────────┘  └──────────────┘  └──────────────┘                  │
│                                                                         │
│  ┌────────────────────────────────────────────────────┐                │
│  │ Recent Jobs (5)                          View All → │                │
│  │                                                     │                │
│  │ 🎬 video.mp4    [Broadcast HD]  Done    94 VMAF   │                │
│  │ 🎬 clip.mov     [Web HD]        Error   —         │                │
│  │ ...                                                │                │
│  └────────────────────────────────────────────────────┘                │
│                                                                         │
│  ┌────────────────────────────────────────────────────┐                │
│  │ VMAF Distribution                                   │                │
│  │ 🔴 Below 70: 1   🟡 70–85: 3   🟢 85–95: 8   🔵 >95: 5 │          │
│  └────────────────────────────────────────────────────┘                │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Stat Cards

| Element | Style | Interaction |
|---------|-------|-------------|
| **Total Assets** | Brand colour icon, large number | None |
| **Jobs Today** | Green icon, large number | None |
| **Average VMAF** | Colour-matched to score value | None |

### Recent Jobs List

| Column | Content |
|--------|---------|
| Icon | `Film` icon |
| Filename | Truncated if too long |
| Profile Badge | Coloured pill with profile name |
| Status Badge | Coloured pill (see Badge Reference) |
| VMAF Score | Colour-coded number or "—" |
| Timestamp | Relative time (e.g., "2 min ago") |

**Click action:** Navigate to Asset Detail for that job's asset.

### VMAF Distribution Bar

4 segments with coloured dots:
- 🔴 Red: Below 70
- 🟡 Yellow: 70–84
- 🟢 Green: 85–95
- 🔵 Blue/Brand: Above 95

---

## 3. Library

### Filter Bar

```
┌─────────────────────────────────────────────────────────────────────────┐
│ [Search... 🔍]  [All Statuses ▼]  [Newest ▼]  [Grid ▦] [List ☰]        │
└─────────────────────────────────────────────────────────────────────────┘
```

**Elements:**
- Search input — filters by filename
- Status dropdown — All, Pending, Processing, Completed, Errors
- Sort dropdown — Newest, Oldest, Name, Size
- View toggle — Grid (default) / List (persisted in localStorage)

### Grid View

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│ │ [thumbnail]  │  │ [thumbnail]  │  │ [thumbnail]  │                  │
│ │   🎬         │  │   🎬         │  │   🎬         │                  │
│ │  Done  94    │  │ Processing   │  │  Error       │                  │
│ │              │  │              │  │              │                  │
│ │ video.mp4    │  │ clip.mov     │  │ intro.mp4    │                  │
│ └──────────────┘  └──────────────┘  └──────────────┘                  │
└─────────────────────────────────────────────────────────────────────────┘
```

**Card elements:**
- Thumbnail area (aspect-video)
  - Actual thumbnail if available, else `Film` icon
  - Hover overlay: Open (`ExternalLink`) + Play (`Play`) buttons
- Status badge (top-right corner)
- VMAF score badge (bottom-right, green)
- Filename (bottom, truncated)

### List View

```
┌─────────────────────────────────────────────────────────────────────────┐
│ File          │ Status    │ Size   │ Duration │ Codec │ Actions        │
├───────────────┼───────────┼────────┼──────────┼───────┼────────────────┤
│ video.mp4     │ Done      │ 1.2 GB │ 02:34:12 │ H.264 │ [👁] [🗑]      │
│ clip.mov      │ Processing│ 450 MB │ 00:15:30 │ ProRes│ [👁] [🗑]      │
└───────────────┴───────────┴────────┴──────────┴───────┴────────────────┘
```

**Row hover:** Reveal Open and Delete buttons.

### Drag & Drop Zone

When dragging files over the Library:
- Entire area gets a dashed border highlight
- Text: "Drop files here to ingest"
- On drop: files are validated and added

### Empty State

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│                          🎬                                             │
│                   No assets in library                                  │
│    Drag video files here or click the button to get started.            │
│                        [Add Videos]                                     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Queue

### Pipeline Summary (Top)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Pipeline Summary  │  42 total jobs                                       │
│                   │                                                      │
│  ○ ○ ● ○ ○ ○ ○   │  Queued: 3  Processing: 1  Done: 35  Quarantined: 3 │
│  ingest transcode │                                                      │
└─────────────────────────────────────────────────────────────────────────┘
```

**Dot visualizer:**
- 8 dots in a row, one per pipeline stage
- Green dot = all jobs at that stage are done
- Blue pulsing dot = at least one job currently at that stage
- Yellow dot = at least one job quarantined at that stage
- Red dot = at least one job failed at that stage
- Gray dot = no jobs reached that stage yet

### Quarantine Banner

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ⚠️  3 assets in quarantine awaiting approval. Review below.             │
└─────────────────────────────────────────────────────────────────────────┘
```

- Yellow background (`bg-yellow-500/10`)
- `ShieldAlert` icon
- Count badge

### Error Banner

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 🚨 2 errors today. Check logs for details.                              │
└─────────────────────────────────────────────────────────────────────────┘
```

- Red background (`bg-red-500/10`)
- `AlertCircle` icon

### Pending Approvals (Quarantined Jobs)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Pending Approvals                                                       │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ 🎬 large_file.mov                                                   │ │
│ │    Quarantined: File exceeds 50 GB (82 GB)                          │ │
│ │                                                                     │ │
│ │    [👍 Approve]          [👎 Reject]                                │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

**Card elements:**
- Filename + file icon
- Quarantine reason (e.g., "Unsupported codec: hevc", "File > 50 GB")
- **Approve** button — green, `ThumbsUp` icon
- **Reject** button — red, `ThumbsDown` icon

### Processing Cards

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Processing — 1/2 slots in use                                           │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ 🎬 video.mp4                                    [✕ Cancel]          │ │
│ │ [Broadcast HD]  Processing  45%                                   │ │
│ │                                                                     │ │
│ │ ●──●──●──○──○──○──○──○                                            │ │
│ │ ingest qc-pre transcode audio proxy thumbnail qc-post delivery      │ │
│ │ Done Done  Active   —     —     —       —      —                    │ │
│ │                                                                     │ │
│ │ 🖥️ GPU: NVENC                    Started: 14:32:05                  │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

**Pipeline visualizer (8 steps):**
- Completed: green checkmark `✓`
- Active: blue pulsing dot `●`
- Pending: gray dot `○`
- Quarantined: yellow shield `🛡`
- Error: red alert `⚠`

**Hover tooltip on steps:** Shows step name and description.

### Queued Table

| Column | Content |
|--------|---------|
| Position | Queue order number |
| Filename | Truncated |
| Profile | Coloured badge |
| Added At | Timestamp |
| State | "Waiting" or status |
| Actions | Cancel button |

### Completed & History Table

| Column | Content |
|--------|---------|
| Filename | Truncated |
| Profile | Coloured badge |
| VMAF | Colour-coded score or "—" |
| State | Icon + text (Done, Error, Rejected, Cancelled) |
| Finished At | Timestamp |
| Actions | Open folder, Retry |

**Status icons:**
- Done: `CheckCircle2` green
- Error: `AlertCircle` red
- Rejected: `ShieldX` orange
- Cancelled: `X` gray

---

## 5. Profiles

### Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Profiles                                                           [⏻] │
│ Transcode profile configuration                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Profile: [Broadcast HD ▼]         [+ Create] [✏️ Edit] [📋 Duplicate] [🗑]│
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ 🔵 Broadcast HD                                    System           ││
│  │ High-definition broadcast standard (1920×1080, 15 Mbps)             ││
│  │                                                                     ││
│  │ [MP4] [H.264] [1920×1080]                                           ││
│  │                                                                     ││
│  │ ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               ││
│  │ │ 🖥️ Video     │  │ 🔊 Audio     │  │ ⚖️ Quality   │               ││
│  │ │ Codec: H.264 │  │ Codec: AAC   │  │ VMAF: 90     │               ││
│  │ │ Res: 1920×1080│  │ Bitrate: 256k│  │ GPU: Auto    │               ││
│  │ │ FPS: 25      │  │ LUFS: -23    │  │              │               ││
│  │ │ Bitrate: 15M │  │ Peak: -1.0   │  │              │               ││
│  │ └──────────────┘  └──────────────┘  └──────────────┘               ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Profile Dropdown

- Split into **Built-in** (with `Lock` icon) and **Custom** sections
- Each item: colour dot, name, description
- Custom profiles show `CheckCircle2` icon

### Detail Cards

| Card | Fields |
|------|--------|
| **Video** (`Monitor` icon) | Codec, Resolution, FPS, Bitrate, CPU Preset, H.264 Profile/Level |
| **Audio** (`Volume2` icon) | Codec, Bitrate, Sample Rate, Target LUFS, True Peak |
| **Quality** (`SlidersHorizontal` icon) | VMAF Threshold, Acceleration Mode |

### Edit Sidebar (Right Drawer)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                     [✕] │
│ Edit Profile                                                            │
│                                                                         │
│ ── General ──────────────────────────────────────────────────────────── │
│ Name:        [Broadcast HD Copy         ]                               │
│ Description: [Custom broadcast preset   ]                               │
│ Container:   [MP4 ▼]                                                    │
│                                                                         │
│ ── Video ────────────────────────────────────────────────────────────── │
│ Codec:       [H.264 ▼]                                                  │
│ Resolution:  [1920×1080 ▼]                                              │
│ FPS:         [25 ▼]                                                     │
│ Bitrate:     [15000 ] kbps                                              │
│ ...                                                                       │
│                                                                         │
│                           [Cancel]  [Save]                              │
└─────────────────────────────────────────────────────────────────────────┘
```

- Width: 420px
- Backdrop: semi-transparent overlay
- Animation: `animate-in slide-in-from-right`
- System profiles show yellow warning: "System profiles cannot be edited."

---

## 6. Settings

### Tab Navigation

```
┌─────────────────────────────────────────────────────────────────────────┐
│ [🛡 General] [🎨 Interface] [🖥️ System] [🌐 Advanced] [ℹ️ About]        │
└─────────────────────────────────────────────────────────────────────────┘
```

**Active tab:** `bg-brand text-white`  
**Inactive tab:** `text-text-muted hover:bg-bg-hover`

### General Tab

| Setting | Control |
|---------|---------|
| Output Directory | Text field + "Browse" button (opens Tauri dialog) |
| Concurrent Jobs | Slider (1–4) + numeric display |
| Default Profile | Dropdown |
| VMAF Threshold | Slider (0–100) |
| Target LUFS | Dropdown (-23, -16, -14) |
| True Peak | Number input (dBTP) |
| GPU Acceleration | Toggle switch |
| Notifications | Toggle switch |

### Interface Tab

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Theme                                                                   │
│ ┌────────────┐  ┌────────────┐  ┌────────────┐                         │
│ │ 🌓 System  │  │ ☀️ Light   │  │ 🌙 Dark    │                         │
│ └────────────┘  └────────────┘  └────────────┘                         │
│                                                                         │
│ Language                                                                │
│ ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐         │
│ │ 🇬🇧 English │  │ 🇵🇹 Português│  │ 🇪🇸 Español │  │ 🇫🇷 Français  │         │
│ └────────────┘  └────────────┘  └────────────┘  └────────────┘         │
│ ... (15 languages total)                                                │
└─────────────────────────────────────────────────────────────────────────┘
```

### System Tab

**Loading state:** Spinner with "Loading system information..."
**Error state:** Red card with retry button

**Info Grid (2 columns):**
- OS: name, version, architecture
- CPU: model, cores, threads
- RAM: used / total (with progress bar)
- Disk: type, total, free (with progress bar)
- GPU: vendor, encoder, availability badge
- Network: interfaces list, WiFi SSID

**Binaries Section:**
- FFmpeg version
- libvmaf availability
- Node.js version
- Database path

**DB Stats (4 mini cards):**
- DB size
- Asset count
- Job count
- Log count

### Advanced Tab

**Buttons:**
- Export Settings + Profiles → JSON file
- Import Settings from JSON → file picker, auto-restart
- Reset Settings → confirmation dialog
- **Factory Reset** → red destructive button, detailed confirmation with "RESET" text input

### About Tab

- App logo + name + "Desktop Edition — Native Multiplatform"
- Version badge (with "(offline)" if backend error)
- Changelog scrollable box
- **Check for Updates** button
- **Open Data Directory** button
- Version history list

---

## 7. Logs

### Header

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Logs                                                               [⏻] │
│ Event history and diagnostics                                           │
├─────────────────────────────────────────────────────────────────────────┤
│ Total: 1,234  Errors: 12  Warnings: 45                         [⬇] [🗑]│
└─────────────────────────────────────────────────────────────────────────┘
```

**Stats:**
- Total logs count
- Error count (red badge)
- Warning count (yellow badge)
- Export button (`Download`)
- Clear button (`Trash2`)

### Filter Bar

```
┌─────────────────────────────────────────────────────────────────────────┐
│ [Search... 🔍]  [All Levels ▼]  [All Sources ▼]  [All Time ▼]  [🔘 Auto]│
└─────────────────────────────────────────────────────────────────────────┘
```

**Filters:**
- Search: free-text
- Level: All, DEBUG, INFO, WARN, ERROR
- Source: All, sidecar, tauri, ffmpeg, app
- Time: All, 1h, 6h, 24h, 7d
- Auto-scroll toggle

### Log Table

| Column | Style |
|--------|-------|
| Time | `HH:MM:SS.mmm`, mono font |
| Level | Coloured badge (see Badge Reference) |
| Source | Grey mono tag |
| Message | Truncated, expandable |

**Row styles:**
- ERROR: Red left border (`border-l-2 border-red-500`)
- WARN: Yellow left border (`border-l-2 border-yellow-500`)
- INFO/DEBUG: No border

**Expandable rows:** Click to show full multi-line message.

---

## 8. Asset Detail

### Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Asset Detail                                                       [⏻] │
│ File metadata and processing                                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ ← Back to Library                                                       │
│                                                                         │
│ ┌────────────────────────┐  ┌────────────────────────────────────────┐ │
│ │ [thumbnail/preview]    │  │ video.mp4                              │ │
│ │                        │  │ [Done]                                 │ │
│ │                        │  │                                        │ │
│ │                        │  │ Size: 1.2 GB    Duration: 02:34:12    │ │
│ │                        │  │ Video: H.264    Audio: AAC            │ │
│ │                        │  │ 1920×1080 @ 25fps   2 channels        │ │
│ │                        │  │                                        │ │
│ │                        │  │ ┌─────────────────────────────────┐   │ │
│ │                        │  │ │ Best Quality VMAF: 94          │   │ │
│ │                        │  │ └─────────────────────────────────┘   │ │
│ └────────────────────────┘  └────────────────────────────────────────┘ │
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐│
│ │ QC Report                                                    [▼]   ││
│ │ ─────────────────────────────────────────────────────────────────── ││
│ │ [PASS] Codec Supported    pass    H.264          —                  ││
│ │ [PASS] Min Resolution     pass    1920×1080      1280×720           ││
│ │ [PASS] VMAF Score         pass    94             90                 ││
│ │ [PASS] Audio Levels       pass    -23.2 LUFS     ±1.5               ││
│ │                                                                     ││
│ │ Approved at: 2026-05-14 14:32:05                                   ││
│ └─────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐│
│ │ Processing History                                             [▼]  ││
│ │ ─────────────────────────────────────────────────────────────────── ││
│ │ ●──●──●──●──●──●──●──●                                             ││
│ │ Job #1  [Broadcast HD]  Done  14:32:05  2m34s  VMAF:94  LUFS:-23   ││
│ │ Job #2  [Web HD]        Error 14:45:12  0m15s  —        —          ││
│ └─────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐│
│ │ [▶ Reprocess]  [📁 Open in Explorer]  [🗑 Delete Asset]            ││
│ └─────────────────────────────────────────────────────────────────────┘│
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Hero Section

- **Thumbnail/Preview** — actual thumbnail or placeholder
- **Filename** — bold, large
- **Status badge** — top-right of metadata area
- **Metadata grid** — 2 columns: Size, Duration, Video, Audio, Resolution, Channels
- **Best Quality VMAF** — green card if any job has a score

### QC Report

- Collapsible section (`ChevronDown` / `ChevronUp`)
- "QC PASS" or "QC FAIL" badge
- Table: Check name, Result (pass/fail), Value, Limit
- Approval timestamp

### Processing History Timeline

- Vertical timeline with dots and connecting line
- Each job card:
  - Job number + profile badge
  - Status badge
  - Mini pipeline (8 steps with checkmarks)
  - Date/time grid
  - Duration
  - VMAF + LUFS scores
  - "Open Processed File" link (if output exists)

### Sticky Action Bar (Bottom)

Fixed at bottom of page:
- **Reprocess** — brand button, `Play` icon
- **Open in Explorer** — `FolderOpen` icon
- **Delete Asset** — red button, `Trash2` icon

---

## 9. Colour Reference

### Status Colours

| Status | Light Mode | Dark Mode | Hex (approx) |
|--------|-----------|-----------|--------------|
| Brand/Primary | Blue | Blue | `#1A6FD4` |
| Done/Success | Green | Green | `#22c55e` |
| Processing | Blue pulse | Blue pulse | `#1A6FD4` animated |
| Error | Red | Red | `#ef4444` |
| Warning | Yellow/Orange | Yellow | `#eab308` |
| Quarantine | Yellow | Yellow | `#eab308` |
| Cancelled | Gray | Gray | `#6b7280` |
| Pending | Muted | Muted | `#9ca3af` |

### VMAF Score Colours

| Range | Colour | Tailwind Class |
|-------|--------|----------------|
| < 70 | Red | `text-red-500` |
| 70–84 | Yellow | `text-yellow-500` |
| 85–92 | Green | `text-green-500` |
| 93–100 | Brand | `text-brand` |

### Gauge Colours

| Load | Stroke Colour |
|------|---------------|
| ≤ 60% | Green |
| 61–80% | Yellow |
| > 80% | Red |

---

## 10. Badge Reference

### Status Badges

| Status | Background | Text | Icon |
|--------|-----------|------|------|
| `done` / `qc_passed` | `bg-green-500/10` | `text-green-500` | `CheckCircle2` |
| `processing` | `bg-brand/10` | `text-brand` | Pulsing dot |
| `error` | `bg-red-500/10` | `text-red-500` | `AlertCircle` |
| `qc_quarantined` | `bg-yellow-500/10` | `text-yellow-500` | `ShieldAlert` |
| `qc_rejected` | `bg-orange-500/10` | `text-orange-500` | `ShieldX` |
| `cancelled` | `bg-gray-500/10` | `text-gray-500` | `X` |
| `queued` / `pending` | `bg-gray-500/10` | `text-gray-400` | `Clock` |

### Profile Badges

| Profile | Dot Colour |
|---------|-----------|
| Broadcast HD | Blue (`#1A6FD4`) |
| Broadcast SD | Blue |
| Web 4K | Purple |
| Web HD | Cyan |
| Proxy | Gray |
| Social | Pink |

### Log Level Badges

| Level | Background | Text |
|-------|-----------|------|
| DEBUG | `bg-gray-500/10` | `text-gray-500` |
| INFO | `bg-blue-500/10` | `text-blue-500` |
| WARN | `bg-yellow-500/10` | `text-yellow-500` |
| ERROR | `bg-red-500/10` | `text-red-500` |

---

## 11. Icon Reference

### Navigation Icons

| Screen | Icon | Lucide Name |
|--------|------|-------------|
| Dashboard | 📊 | `LayoutDashboard` |
| Library | 📁 | `Library` |
| Queue | ▶️ | `ListVideo` |
| Profiles | 👤 | `UserCircle` |
| Settings | ⚙️ | `Settings` |
| Logs | 🖥️ | `Terminal` |

### Action Icons

| Action | Icon | Lucide Name |
|--------|------|-------------|
| Open file | 👁 | `ExternalLink` |
| Play | ▶️ | `Play` |
| Delete | 🗑 | `Trash2` |
| Cancel | ✕ | `X` |
| Retry | 🔄 | `Repeat` |
| Approve | 👍 | `ThumbsUp` |
| Reject | 👎 | `ThumbsDown` |
| Export | ⬇️ | `Download` |
| Clear | 🗑 | `Trash2` |
| Search | 🔍 | `Search` |
| Add | + | `Plus` |
| Edit | ✏️ | `Settings2` |
| Duplicate | 📋 | `Copy` |
| Back | ← | `ArrowLeft` |
| Expand | ▼ | `ChevronDown` |
| Collapse | ▲ | `ChevronUp` |

### System Icons

| Metric | Icon | Lucide Name |
|--------|------|-------------|
| CPU | 🖥️ | `Cpu` |
| RAM | 💾 | `MemoryStick` |
| GPU | 🖥️ | `Monitor` |
| Disk | 💿 | `HardDrive` |
| Network | 🌐 | `Network` |
| Time | 🕐 | `Clock` |
| Info | ℹ️ | `Info` |
| Warning | ⚠️ | `AlertTriangle` |
| Error | 🚨 | `AlertCircle` |
| Success | ✅ | `CheckCircle2` |
| Help | ❓ | `HelpCircle` |
| Exit | ⏻ | `LogOut` |

---

*Last updated: 2026-05-15 for Nexora Desktop v0.17.0*
