# Nexora Desktop — Installation Guide

> Platform-specific installation, first-run setup, and uninstallation instructions.

---

## Table of Contents

1. [System Requirements](#1-system-requirements)
2. [Windows](#2-windows)
3. [macOS](#3-macos)
4. [Linux](#4-linux)
5. [First Launch Setup](#5-first-launch-setup)
6. [Updating](#6-updating)
7. [Uninstallation](#7-uninstallation)
8. [Troubleshooting Installation](#8-troubleshooting-installation)

---

## 1. System Requirements

### Minimum Requirements

| Component            | Specification                                               |
| -------------------- | ----------------------------------------------------------- |
| **Operating System** | Windows 10 (64-bit) / macOS 11 (Big Sur) / Ubuntu 20.04 LTS |
| **Processor**        | 64-bit dual-core CPU (Intel or AMD)                         |
| **Memory**           | 4 GB RAM                                                    |
| **Storage**          | 500 MB for application + working space for media            |
| **Display**          | 1280×800 resolution                                         |
| **Internet**         | Required for first-run binary download and updates          |

### Recommended Requirements

| Component            | Specification                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------ |
| **Operating System** | Windows 11 / macOS 14 (Sonoma) / Ubuntu 22.04 LTS                                          |
| **Processor**        | 64-bit quad-core CPU or better                                                             |
| **Memory**           | 8 GB RAM or more                                                                           |
| **Storage**          | SSD with 10 GB+ free space                                                                 |
| **GPU**              | NVIDIA (GTX 10 series or newer), AMD (RX 500 series or newer), or Intel (Iris Xe or newer) |
| **Display**          | 1920×1080 resolution or higher                                                             |

### GPU Acceleration Support

| Vendor     | Minimum GPU             | Encoder            | Notes                           |
| ---------- | ----------------------- | ------------------ | ------------------------------- |
| **NVIDIA** | GTX 1050 / Quadro P1000 | NVENC (h264_nvenc) | Requires NVIDIA drivers 470+    |
| **AMD**    | RX 560 / Vega 8         | AMF (h264_amf)     | Requires Adrenalin drivers      |
| **Intel**  | UHD 630 / Iris Xe       | QSV (h264_qsv)     | Requires Intel Graphics drivers |

> If no supported GPU is detected, Nexora falls back to CPU encoding with libx264.

---

## 2. Windows

### Download

1. Visit the [Releases](https://github.com/ideiasestrondosas-ctrl/nexora-desktop/releases) page.
2. Download the appropriate installer:
   - **`.msi`** (recommended) — Standard Windows installer with automatic updates
   - **`.exe`** (NSIS) — Alternative installer, smaller size

### Installation (MSI)

1. Double-click the downloaded `.msi` file.
2. If Windows SmartScreen appears, click **"More info"** → **"Run anyway"**.
3. Follow the installation wizard:
   - Accept the license agreement (GPL v3)
   - Choose installation directory (default: `C:\Program Files\Nexora Desktop`)
   - Choose Start Menu folder
   - Click **Install**
4. Click **Finish** to launch Nexora Desktop.

### Installation (EXE)

1. Double-click the downloaded `.exe` file.
2. If prompted by Windows Defender, click **"More info"** → **"Run anyway"**.
3. The installer will extract and install automatically.
4. Nexora Desktop will launch when complete.

### Silent Installation (Enterprise)

For IT administrators deploying via Group Policy or SCCM:

```powershell
# MSI silent install
msiexec /i "Nexora-Desktop-0.17.0-x64.msi" /qn /norestart INSTALLDIR="C:\Nexora"

# EXE silent install
Nexora-Desktop-0.17.0-x64-setup.exe /S /D=C:\Nexora
```

### Post-Installation

- Nexora creates a desktop shortcut and Start Menu entry automatically.
- The application data directory is created at:
  ```
  %APPDATA%\com.nexora.desktop
  ```
- FFmpeg binaries are downloaded on first launch (~200 MB).

---

## 3. macOS

### Download

1. Visit the [Releases](https://github.com/ideiasestrondosas-ctrl/nexora-desktop/releases) page.
2. Download the `.dmg` file (Universal binary for Intel and Apple Silicon).

### Installation

1. Double-click the downloaded `.dmg` file.
2. A window opens showing the Nexora Desktop app icon and a shortcut to **Applications**.
3. Drag the **Nexora Desktop** icon into the **Applications** folder shortcut.
4. Eject the DMG by clicking the eject icon in Finder sidebar.

### First Launch (macOS Security)

macOS may block the app on first launch because it is not signed with an Apple Developer ID:

**Option 1 — System Settings:**

1. Open **System Settings** → **Privacy & Security**.
2. Scroll to **Security** section.
3. Click **"Open Anyway"** next to the Nexora Desktop block message.
4. Confirm by clicking **"Open Anyway"** in the dialog.

**Option 2 — Right-click:**

1. Find Nexora Desktop in **Applications**.
2. Right-click (or Control-click) the app icon.
3. Select **"Open"** from the context menu.
4. Click **"Open"** in the security dialog.

**Option 3 — Terminal (advanced):**

```bash
xattr -dr com.apple.quarantine /Applications/Nexora\ Desktop.app
```

### Post-Installation

- The application data directory is created at:
  ```
  ~/Library/Application Support/com.nexora.desktop
  ```
- FFmpeg binaries are downloaded on first launch (~200 MB).

---

## 4. Linux

### Debian / Ubuntu (.deb)

#### Download

1. Visit the [Releases](https://github.com/ideiasestrondosas-ctrl/nexora-desktop/releases) page.
2. Download the `.deb` file.

#### Installation

```bash
# Install via dpkg
sudo dpkg -i nexora-desktop_0.17.0_amd64.deb

# Fix any dependency issues
sudo apt-get install -f
```

Or using `gdebi` (handles dependencies automatically):

```bash
sudo gdebi nexora-desktop_0.17.0_amd64.deb
```

#### Launch

```bash
# From terminal
nexora-desktop

# Or from applications menu (under "Multimedia" or "Sound & Video")
```

### Universal (.AppImage)

#### Download

1. Visit the [Releases](https://github.com/ideiasestrondosas-ctrl/nexora-desktop/releases) page.
2. Download the `.AppImage` file.

#### Installation

```bash
# Make executable
chmod +x Nexora-Desktop-0.17.0-x86_64.AppImage

# Run directly
./Nexora-Desktop-0.17.0-x86_64.AppImage
```

#### Optional: Integrate with System

```bash
# Install appimaged for automatic integration
wget https://github.com/probonopd/go-appimage/releases/download/continuous/appimaged-xxx-x86_64.AppImage
chmod +x appimaged-xxx-x86_64.AppImage
./appimaged-xxx-x86_64.AppImage

# Move Nexora AppImage to standard location
mkdir -p ~/Applications
mv Nexora-Desktop-*.AppImage ~/Applications/
```

### Post-Installation

- The application data directory is created at:
  ```
  ~/.config/com.nexora.desktop
  ```
- FFmpeg binaries are downloaded on first launch (~200 MB).

### Dependencies

Nexora requires the following system libraries (installed automatically with `.deb`):

```
libgtk-3-0
libwebkit2gtk-4.0-37
libappindicator3-1
libnotify4
libxtst6
libnss3
libxss1
libasound2
```

If running the AppImage, these should be present on most modern distributions.

---

## 5. First Launch Setup

### Step 1: Binary Download

On first launch, Nexora will check for FFmpeg and FFprobe binaries:

- If bundled: uses the included binaries (no download needed).
- If not bundled: downloads the appropriate binaries for your platform:
  - **Windows**: `ffmpeg.exe`, `ffprobe.exe`
  - **macOS**: `ffmpeg`, `ffprobe` (Universal binary via `lipo`)
  - **Linux**: `ffmpeg`, `ffprobe`

Download size: approximately **200 MB**.

**Progress indicator:** A modal shows download progress with a percentage bar.

### Step 2: Output Directory

1. Go to **Settings → General**.
2. Click **"Browse"** next to "Output Directory".
3. Select a folder where processed files will be saved.
4. Recommended: create a dedicated folder (e.g., `~/Nexora-Output` or `D:\Nexora-Output`).

### Step 3: Interface Preferences

1. Go to **Settings → Interface**.
2. Select your preferred **Theme**: System (follows OS), Light, or Dark.
3. Select your preferred **Language** from the 15 available options.

### Step 4: GPU Verification

1. Go to **Settings → System**.
2. Check the **GPU** section:
   - If a GPU is detected, it shows the vendor and encoder (e.g., "NVIDIA — NVENC").
   - If no GPU is detected, it shows "CPU — libx264".
3. You can toggle GPU acceleration in **Settings → General**.

### Step 5: Test Job

1. Go to **Library**.
2. Drag a small video file (under 100 MB) onto the window.
3. Click the file → **Reprocess** → select **Proxy** profile.
4. Go to **Queue** and verify the job completes successfully.

---

## 6. Updating

### Automatic Updates

Nexora includes a built-in auto-updater (Tauri updater):

1. The app checks for updates on startup (if enabled).
2. If an update is available, a notification appears.
3. Click **"Update Now"** to download and install.
4. The app restarts automatically.

> On Windows, updates install silently in the background. On macOS and Linux, you may need to confirm.

### Manual Update Check

1. Go to **Settings → About**.
2. Click **"Check for Updates"**.
3. Follow the prompts if an update is available.

### Manual Download

1. Visit the [Releases](https://github.com/ideiasestrondosas-ctrl/nexora-desktop/releases) page.
2. Download the latest version for your platform.
3. Install over the existing installation (settings and data are preserved).

---

## 7. Uninstallation

### Windows

**Via Settings:**

1. Open **Windows Settings** → **Apps** → **Installed apps**.
2. Find **Nexora Desktop** in the list.
3. Click **⋯** → **Uninstall**.
4. Follow the uninstaller wizard.

**Via Control Panel:**

1. Open **Control Panel** → **Programs and Features**.
2. Find **Nexora Desktop**.
3. Right-click → **Uninstall**.

**Data cleanup (optional):**

```powershell
# Remove application data
Remove-Item -Recurse -Force "$env:APPDATA\com.nexora.desktop"
```

### macOS

1. Open **Finder** → **Applications**.
2. Find **Nexora Desktop**.
3. Drag to **Trash** (or right-click → **Move to Trash**).
4. Empty Trash.

**Data cleanup (optional):**

```bash
# Remove application data
rm -rf ~/Library/Application\ Support/com.nexora.desktop
rm -rf ~/Library/Caches/com.nexora.desktop
rm -rf ~/Library/Preferences/com.nexora.desktop.plist
```

### Linux (.deb)

```bash
# Remove the package
sudo apt-get remove nexora-desktop

# Remove configuration files (optional)
sudo apt-get purge nexora-desktop

# Remove application data (optional)
rm -rf ~/.config/com.nexora.desktop
```

### Linux (.AppImage)

1. Delete the `.AppImage` file.
2. Remove desktop integration (if used):
   ```bash
   rm -rf ~/.config/com.nexora.desktop
   rm ~/.local/share/applications/appimagekit-nexora-desktop.desktop
   ```

---

## 8. Troubleshooting Installation

### "This app can't run on your PC" (Windows)

**Cause:** 32-bit Windows or ARM processor.

**Solution:** Nexora requires 64-bit x86_64 architecture. Ensure you downloaded the correct installer.

### "Nexora Desktop is damaged and can't be opened" (macOS)

**Cause:** macOS Gatekeeper blocking unsigned apps.

**Solution:** Follow the macOS security bypass steps in §3 (First Launch).

### "Failed to download FFmpeg binaries"

**Cause:** No internet connection or firewall blocking GitHub.

**Solution:**

1. Check internet connection.
2. Temporarily disable firewall/VPN.
3. Manually download FFmpeg from [https://ffmpeg.org/download.html](https://ffmpeg.org/download.html).
4. Place `ffmpeg` and `ffprobe` in your system PATH.

### "Missing libwebkit2gtk" (Linux)

**Cause:** Missing WebKit dependency.

**Solution:**

```bash
# Debian/Ubuntu
sudo apt-get install libwebkit2gtk-4.0-37

# Fedora
sudo dnf install webkit2gtk3

# Arch
sudo pacman -S webkit2gtk
```

### "App launches but shows white screen"

**Cause:** GPU acceleration conflict or missing display drivers.

**Solution:**

1. Update GPU drivers.
2. Try launching with software rendering:
   - Windows: set environment variable `WEBKIT_DISABLE_COMPOSITING_MODE=1`
   - Linux: launch with `--disable-gpu`

### "Disk space full during installation"

**Cause:** Insufficient space for app + FFmpeg binaries.

**Solution:** Free up at least 1 GB of disk space before installation.

---

_Last updated: 2026-05-15 for Nexora Desktop v0.17.0_
