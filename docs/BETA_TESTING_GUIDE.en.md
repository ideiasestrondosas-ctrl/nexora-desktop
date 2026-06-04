# Nexora Desktop — Beta Testing Guide

**Version:** v0.33.0-beta.1  
**Date:** June 2026  
**Application:** Nexora Desktop — Native Media Processing

---

> **This guide is for you.**  
> You don't need to know anything about programming, video, or technology to use it.  
> Every test has all the steps explained one by one, from the very beginning.  
> Your feedback is essential to make the application better.

---

## Table of Contents

1. [What is Nexora Desktop?](#1-what-is-nexora-desktop)
2. [Before You Start](#2-before-you-start)
3. [How to Report a Problem](#3-how-to-report-a-problem)
4. [Tests](#4-tests)
   - [T01 — First Launch](#t01--first-launch-onboarding-wizard)
   - [T02 — Dashboard](#t02--dashboard)
   - [T03 — Library](#t03--library)
   - [T04 — Processing Queue](#t04--processing-queue)
   - [T05 — Transcoding Profiles](#t05--transcoding-profiles)
   - [T06 — Settings › General](#t06--settings--general)
   - [T07 — Settings › Interface](#t07--settings--interface)
   - [T08 — Settings › System](#t08--settings--system)
   - [T09 — Settings › Logs](#t09--settings--logs)
   - [T10 — Settings › Cloud](#t10--settings--cloud)
   - [T11 — Settings › Watch Folders](#t11--settings--watch-folders)
   - [T12 — Settings › Privacy](#t12--settings--privacy)
   - [T13 — Settings › Advanced](#t13--settings--advanced)
   - [T14 — Settings › About](#t14--settings--about)
   - [T15 — Asset Detail](#t15--asset-detail)
   - [T16 — Visual Comparator](#t16--visual-comparator)
   - [T17 — Bug Report](#t17--bug-report)
   - [T18 — Help Manual](#t18--help-manual)
   - [T19 — Keyboard Shortcuts](#t19--keyboard-shortcuts)
   - [T20 — Visual Themes](#t20--visual-themes)
   - [T21 — Languages](#t21--languages)
   - [T22 — Features Since v0.30.11](#t22--features-introduced-since-v03011)
5. [Glossary](#5-glossary)
6. [Contacts and Support](#6-contacts-and-support)

---

## 1. What is Nexora Desktop?

**Nexora Desktop** is a Windows application that converts video files from one format to another (for example, from `.mov` to `.mp4`), adjusts image and audio quality, and organises all processed files in one place.

**You can use it to:**

- Import videos from your computer or a network folder
- Convert videos to different formats and qualities (broadcast TV, web, social media)
- Watch the status of each conversion in real time
- Compare the original video with the converted one side by side
- Manage cloud destinations (FTP, S3, Google Drive) for automatic file delivery

---

## 2. Before You Start

### System Requirements

| Component           | Minimum                                      |
| ------------------- | -------------------------------------------- |
| Operating System    | Windows 10 (64-bit) or newer                 |
| Processor           | Any modern 64-bit processor                  |
| RAM                 | 4 GB                                         |
| Disk Space          | 500 MB for the app + space for your videos   |
| Internet Connection | Optional (only needed for updates and cloud) |

### How to Install

1. Download the `.msi` or `.exe` file from the link provided by the team.
2. Double-click the downloaded file.
3. Follow the installation wizard instructions (click **Next** until the end).
4. At the end, click **Finish** — the app opens automatically.

### What to Prepare Before Testing

You will need **2 to 3 video files** on your computer to run the tests. Any video works:

- Preferred format: `.mp4` or `.mkv`
- Recommended duration: between 30 seconds and 5 minutes (so tests don't take too long)
- If you don't have videos handy, you can download free samples at [sample-videos.com](https://sample-videos.com)

---

## 3. How to Report a Problem

### When Should You Report?

Report whenever:

- The app freezes, closes by itself, or shows an unexpected error message
- A button does nothing when clicked
- A feature doesn't produce the result described in this guide
- Text is cut off, unreadable, or appears as code (e.g., `help.tabs.assetDetail`)
- Something seems "off" even if you're not sure why

### Using the In-App Report Button

1. In the application, click the **?** (question mark) icon in the top-right corner.
2. In the menu that appears, select **Report Bug**.
3. Fill in the form:
   - **Title** _(required)_: Describe the problem in a few words. E.g., "App crashes when clicking Library"
   - **Description** _(optional)_: Explain what you were doing when it happened
   - **Include logs** _(keep enabled)_: Sends useful technical information to the team
4. Click one of the options:
   - **Copy to Clipboard**: Paste it in an email or message
   - **Open on GitHub**: Creates a report directly on GitHub (requires a GitHub account)
   - **Save File**: Saves the report as a file on your computer

### Report Template (if you don't use the in-app button)

```
TITLE: [describe the problem in a few words]

WHAT HAPPENED:
[describe what the app did wrong]

STEPS TO REPRODUCE:
1. Opened the app
2. Clicked on...
3. Then on...
4. This happened...

WHAT SHOULD HAVE HAPPENED:
[describe what you expected to happen]

SEVERITY:
[ ] Blocker — app becomes unusable
[ ] Major — important feature doesn't work
[ ] Minor — secondary feature has a problem
[ ] Suggestion — idea for improvement

SYSTEM:
- Windows: [e.g., Windows 11 Home]
- App version: [see in Settings › About]
- Does the problem always happen? [ ] Yes [ ] No [ ] Sometimes
```

### What NOT to Report (Known Limitations)

These issues are **already known** by the team and don't need to be reported:

- Automatic updates show an error — normal in test versions
- iCloud Drive appears but doesn't work — not supported in this version
- macOS and Linux versions are not available in this beta
- Google Drive and Dropbox require OAuth configuration — a credentials error is expected if you haven't configured them
- There is a 3-second delay in Watch Folders before detecting new files — this is intentional
- VMAF scoring may take 2–3× the video duration for files longer than 10 minutes — this is expected
- The "Create desktop shortcut" button only appears on Windows (macOS and Linux: button not visible)

---

## 4. Tests

> **How to use this section:**  
> Each test has an **ID** (e.g., T01-01), an **objective**, numbered **steps**, and the **expected result**.  
> Follow the steps in the order shown.  
> If the result is different from expected, report the problem using the template above.  
> At the end of each test, mark ✅ (passed) or ❌ (failed) to track your progress.

---

### T01 — First Launch (Onboarding Wizard)

> **Objective:** Verify that the welcome wizard appears on first launch and that the initial settings are saved correctly.

---

#### T01-01 — Wizard appears on first launch

**You need:** The app installed, never opened before (or use "Reset Onboarding" in Settings › Advanced).

**Steps:**

1. Open Nexora Desktop for the first time.
2. Wait for the main window to load.

**What should happen:**

- A centred window appears with the title "Welcome to Nexora".
- The window has a progress bar at the top and shows "Step 1 of 4".

**If it doesn't work:** Report with title "Welcome wizard does not appear on first launch".

---

#### T01-02 — Navigate through the wizard (Steps 1 to 4)

**You need:** The welcome wizard to be open (T01-01 passed).

**Steps:**

1. On Step 1 (Welcome), read the text and click **Next**.
2. On Step 2 (Output Folder), verify that a folder path appears. Click **Choose** and select a folder on your computer. Click **Next**.
3. On Step 3 (Privacy), verify that a toggle switch exists. You can enable or disable it as you prefer. Click **Next**.
4. On Step 4 (Done), click **Start** (green button).

**What should happen:**

- Each step advances without errors.
- The progress bar fills progressively.
- The **Back** button works to return to the previous step.
- After clicking **Start**, the wizard closes and the main app appears.

**If it doesn't work:** Report with title "Onboarding wizard — error on step [X]" and describe what happened.

---

#### T01-03 — Settings saved after the wizard

**You need:** To have completed T01-02 with an output folder different from the default.

**Steps:**

1. With the app open, click **Settings** in the left menu (gear icon).
2. Click the **General** tab.
3. Look for the "Output Directory" section.

**What should happen:**

- The folder you chose in the wizard appears here.

**If it doesn't work:** Report with title "Output folder not saved after onboarding wizard".

---

### T02 — Dashboard

> **Objective:** Verify that the main dashboard shows correct and up-to-date information.

---

#### T02-01 — Dashboard loads without errors

**Steps:**

1. With the app open, click **Dashboard** in the left menu (home or grid icon).

**What should happen:**

- The page loads in under 3 seconds.
- No error messages appear.
- You see at least three cards with numbers at the top ("Total Assets", "Jobs Today", "Avg VMAF").

**If it doesn't work:** Report with title "Dashboard does not load" and note any error message.

---

#### T02-02 — Initial state (no files)

**Steps:**

1. If you haven't imported any files yet, the Dashboard should show an empty state.
2. Check what appears in the central area of the page.

**What should happen:**

- A welcome message or icon appears indicating there are no files.
- There is a button or link to go to the Library and import the first file.

**If it doesn't work:** Report with title "Dashboard does not show initial state correctly".

---

#### T02-03 — System charts (CPU and RAM)

**Steps:**

1. Stay on the Dashboard for 10 to 15 seconds.
2. Observe the bottom of the page.

**What should happen:**

- There are two line charts: one for **CPU** and one for **RAM**.
- The values update approximately every 2 seconds.
- The percentage values shown make sense (e.g., CPU at 5–30% at idle).

**If it doesn't work:** Report with title "CPU/RAM charts don't appear or don't update".

---

#### T02-04 — Recent jobs list (after processing)

> _This test only applies after you have processed at least one file (see T03 and T04)._

**Steps:**

1. Return to the Dashboard after processing a file.
2. Observe the "Recent Jobs" section.

**What should happen:**

- The processed file appears in the list with the name, profile used, status (e.g., "Completed"), and time.
- Clicking an item takes you to that file's detail page.

**If it doesn't work:** Report with title "Recent jobs don't appear on Dashboard".

---

#### T02-05 — QueuePill: Real-Time Queue Indicator

**You need:** A job currently being processed (T04-01 passed).

**Steps:**

1. With a job processing, look at the **top bar** (the horizontal bar above the main content area).
2. To the right of the circular metrics (CPU, RAM, GPU, Disk), look for a small pill/badge.

**What should happen:**

- While jobs are in progress: the pill shows a **pulsing blue dot** and text like "1 in progress".
- When all jobs finish: the dot turns grey and the text changes to "Idle".
- A green number with ✓ appears alongside, showing how many jobs have completed in this session.

**If it doesn't work:** Report with the title "QueuePill does not appear or does not update in the top bar".

---

### T03 — Library

> **Objective:** Verify all ways to import files, navigate, filter, and delete.

---

#### T03-01 — Open the Library

**Steps:**

1. Click **Library** in the left menu.

**What should happen:**

- The Library page opens.
- If no files have been imported, an area shows text saying you can drag files or click a button to import.
- If files have been imported, cards or a list of files appears.

---

#### T03-02 — Import a file via button

**You need:** A video file (`.mp4`, `.mkv`, `.mov`, `.avi`) on your computer.

**Steps:**

1. In the Library, click the **+ Add Videos** button (top right, blue).
2. In the window that opens, navigate to your video file.
3. Select the file and click **Open**.

**What should happen:**

- The file appears in the Library with a thumbnail image or icon.
- The status shows "Pending" or "Analysing" (grey or blue).
- After a few seconds, the status changes to "Completed" or "Ready".

**If it doesn't work:** Report with title "Import via button doesn't work" and note the file type.

---

#### T03-03 — Import a file via drag-and-drop

**You need:** A video file and the Library window open.

**Steps:**

1. Open **Windows Explorer** (Windows key + E).
2. Navigate to your video file.
3. Hold the mouse button down on the file and drag it to the Nexora window.
4. Release the mouse button.

**What should happen:**

- While dragging over the window, the Library area changes appearance (a blue border appears).
- On release, the file appears in the list just like in T03-02.

**If it doesn't work:** Report with title "Drag-and-drop doesn't work in Library".

---

#### T03-04 — Import an entire folder

**You need:** A folder with 2 or more video files.

**Steps:**

1. In the Library, click the **Add Folder** button (folder icon, next to the blue button).
2. In the window that opens, select the folder with your videos.
3. Click **Select Folder**.

**What should happen:**

- All video files in the folder appear in the Library.

**If it doesn't work:** Report with title "Folder import doesn't work".

---

#### T03-05 — Switch between grid and list view

**You need:** At least one file in the Library.

**Steps:**

1. In the Library, find the two view icons in the top right (one looks like a grid, the other like lines).
2. Click the **list** icon (lines).
3. Observe how files are shown.
4. Click back on the **grid** icon.

**What should happen:**

- In list view, files appear as rows with columns (name, status, size, duration).
- In grid view, files appear as cards with thumbnail images.
- Switching is immediate, without losing files or data.

**If it doesn't work:** Report with title "Grid/list view toggle doesn't work".

---

#### T03-06 — Search for files

**You need:** At least 2 files in the Library with different names.

**Steps:**

1. In the search bar at the top of the Library, type part of one file's name (e.g., if you have "test_video.mp4", type "test").
2. Observe the results as you type.
3. Clear the search text.

**What should happen:**

- As you type, only files whose names contain the text appear.
- When you clear the text, all files appear again.
- Search is case-insensitive.

**If it doesn't work:** Report with title "Library search doesn't filter correctly".

---

#### T03-07 — Filter by status

**You need:** Files with different statuses (at least one "Completed" and one "Pending").

**Steps:**

1. Click the status dropdown (shows "All Statuses" by default).
2. Select **Completed**.
3. Observe the files shown.
4. Select **Pending**.
5. Select **All Statuses** again.

**What should happen:**

- Each filter shows only files in the corresponding status.
- Selecting "All Statuses" shows everything again.

**If it doesn't work:** Report with title "Status filter in Library doesn't work".

---

#### T03-08 — Sort files

**Steps:**

1. Click the sort dropdown (shows "Newest" by default).
2. Select **Oldest**.
3. Verify that the files have reordered.
4. Select **Name (A-Z)**.
5. Verify alphabetical order.

**What should happen:**

- Each sort option visibly reorders the files.

**If it doesn't work:** Report with title "Sorting in Library doesn't work".

---

#### T03-09 — Select and delete files

**Warning:** This test deletes files from the Library. Use test files you can afford to lose.

**Steps:**

1. Hover over a file card — a selection checkbox should appear in the top-left corner.
2. Click the checkbox to select the file.
3. Select a second file the same way.
4. Observe the buttons that appear (a red "Delete X selected" button should appear).
5. Click the red delete button.
6. Read the confirmation window carefully.
7. Click **Cancel** (to not delete now).

**What should happen:**

- Checkboxes appear on hover.
- Selecting multiple files activates group action buttons.
- The confirmation window asks for confirmation before deleting.
- Clicking Cancel does not delete anything.

**If it doesn't work:** Report with title "Multi-selection in Library doesn't work".

---

### T04 — Processing Queue

> **Objective:** Verify that a processing job can be submitted, progress monitored, and jobs managed.  
> _Note: Real processing takes time. For tests, use short files (under 1 minute)._

---

#### T04-01 — Submit a processing job

**You need:** An imported file in the Library (T03-02 passed).

**Steps:**

1. In the Library, click on a file's card to open its detail, **or** hover over it and click the eye icon.
2. On the detail page, find the **Process** or **Reprocess** button.
3. Click that button.
4. A menu or modal appears — select the **web-hd** profile (a good option for quick tests).
5. Click **Confirm** or **Start**.

**What should happen:**

- The job is added to the queue.
- A notification or message appears to confirm.

**If it doesn't work:** Report with title "Cannot submit a processing job".

---

#### T04-02 — Monitor progress in the Queue

**You need:** A job being processed (T04-01 passed).

**Steps:**

1. Click **Queue** in the left menu.
2. Observe the "Processing" section.

**What should happen:**

- The job appears with the file name, profile, and a progress bar.
- There is a pipeline phase visualiser (Analyse → Convert → Verify).
- The progress bar advances while the job processes.
- Phase indicators change from grey to blue (in progress) and then green (done).

**If it doesn't work:** Report with title "Job progress doesn't appear in Queue".

---

#### T04-03 — Cancel a queued job

**You need:** A job waiting in queue (not actively processing).

**Steps:**

1. Submit a second job (T04-01) — if one is already processing, the second waits.
2. In the Queue, find the "Queued" or "Waiting" section.
3. Click the **X** (cancel) button next to the waiting job.

**What should happen:**

- The job disappears from the queue.
- It appears in the history section with status "Cancelled".

**If it doesn't work:** Report with title "Cannot cancel a queued job".

---

#### T04-04 — View completed jobs history

**You need:** At least one completed job.

**Steps:**

1. In the Queue, scroll down to the "Completed & History" section.
2. Observe the completed jobs table.

**What should happen:**

- A row appears for each job with: file name, profile, VMAF score (if available), status, and time.
- The "COMPLETED" status appears in green.
- If VMAF is above 85, the number is green; 70–85, yellow; below 70, red.

**If it doesn't work:** Report with title "Job history doesn't appear in Queue".

---

#### T04-05 — Reprocess with a different profile

**You need:** A completed job in the history.

**Steps:**

1. In the history table, click the **repeat** icon (circular arrows) next to a completed job.
2. A small menu appears with profile options.
3. Select a different profile (e.g., **proxy**).

**What should happen:**

- A new job is created with the same file but the selected profile.
- The job appears in the "Queued" section or starts processing immediately.

**If it doesn't work:** Report with title "Reprocessing with a different profile doesn't work".

---

#### T04-06 — Approve a quarantined file

> _Quarantine occurs when the app detects a possible quality problem after processing. It may not happen with all files._

**If you see the "QUARANTINE" section in the Queue:**

**Steps:**

1. Observe the files listed in the quarantine section (yellow/orange background).
2. Click the **thumbs up** icon (green) to approve a file.
3. Click the **thumbs down** icon (red) to reject another.

**What should happen:**

- Approving removes the file from quarantine and marks it as "Completed" in history.
- Rejecting marks it as "Rejected" in history.

**If it doesn't work:** Report with title "Quarantine approve/reject doesn't work".

---

### T05 — Transcoding Profiles

> **Objective:** Verify profile management — view, create, edit, duplicate, and delete.  
> _Profiles define how videos are converted: resolution, quality, format._

---

#### T05-01 — View preset profiles

**Steps:**

1. Click **Profiles** in the left menu.
2. Click the profile dropdown at the top of the page.

**What should happen:**

- 6 preset profiles appear (with a lock icon indicating they can't be edited):
  - broadcast-hd
  - broadcast-sd
  - web-4k
  - web-hd
  - proxy
  - social
- Selecting a profile shows its details on the left (resolution, bitrate, codec, etc.).

**If it doesn't work:** Report with title "Preset profiles don't appear".

---

#### T05-02 — Create a custom profile

**Steps:**

1. On the Profiles page, click the **+ Create** button (top area).
2. In the side panel that opens:
   - **Name**: type "Beta Test"
   - **Description**: type "Profile created during testing"
   - **Container**: select MP4
   - **Video Codec**: select H.264
   - **Resolution**: select 1920×1080
   - Leave the remaining fields at their default values
3. Click **Save**.

**What should happen:**

- The "Beta Test" profile appears in the "Custom" section of the dropdown.
- The details you configured are displayed correctly.

**If it doesn't work:** Report with title "Custom profile creation failed".

---

#### T05-03 — Edit a custom profile

**You need:** The "Beta Test" profile created in T05-02.

**Steps:**

1. Select the "Beta Test" profile from the dropdown.
2. Click the **Edit** button.
3. Change the description to "Profile edited during testing".
4. Click **Save**.

**What should happen:**

- The new description appears in the profile details.

**If it doesn't work:** Report with title "Custom profile editing failed".

---

#### T05-04 — Try to edit a preset profile

**Steps:**

1. Select one of the preset profiles (e.g., broadcast-hd).
2. Observe the available buttons.

**What should happen:**

- The **Edit** button is disabled (grey) or doesn't exist.
- It is not possible to modify preset profiles.

**If it doesn't work:** Report with title "Preset profile allows editing — it shouldn't".

---

#### T05-05 — Duplicate a profile

**Steps:**

1. Select any profile (preset or custom).
2. Click the **duplicate** icon (two overlapping documents).

**What should happen:**

- A new profile is created named "Copy of [original name]" or similar.
- The new profile appears in the "Custom" section and can be edited.

**If it doesn't work:** Report with title "Profile duplication doesn't work".

---

#### T05-06 — Delete a custom profile

**You need:** The "Beta Test" profile (or any custom one).

**Steps:**

1. Select the custom profile.
2. Click the **Delete** button (red).
3. Read the confirmation window and click **Confirm**.

**What should happen:**

- The profile disappears from the list.
- A message confirms the deletion.

**If it doesn't work:** Report with title "Custom profile deletion failed".

---

### T06 — Settings › General

> **Objective:** Verify that general settings are saved correctly.

---

#### T06-01 — Open Settings › General

**Steps:**

1. Click **Settings** in the left menu.
2. Confirm you're on the **General** tab (should be the first).

**What should happen:**

- The page loads with several sections: Import, Processing, Quality, Hardware Acceleration, Notifications.

---

#### T06-02 — Change the output folder

**Steps:**

1. In the "Processing" section, next to "Output Directory", click **Choose**.
2. Select a different folder (e.g., your Desktop).
3. Click **Select Folder**.

**What should happen:**

- The folder path updates immediately.
- The setting is saved (even after closing and reopening Settings).

**If it doesn't work:** Report with title "Output folder doesn't save in Settings › General".

---

#### T06-03 — Change concurrent jobs

**Steps:**

1. In the "Processing" section, find the "Concurrent Jobs" slider.
2. Drag the slider to value 2.
3. Navigate to another page and return to Settings › General.

**What should happen:**

- The value 2 is saved when you return.

---

#### T06-04 — Enable/disable notifications

**Steps:**

1. In the "Notifications" section, click the toggle to enable system notifications.
2. Verify that the toggle changes state (enabled = blue, disabled = grey).
3. Click again to disable.

**What should happen:**

- The toggle responds to clicks and changes visually.
- The state is saved.

---

### T07 — Settings › Interface

> **Objective:** Verify the theme and language options.

---

#### T07-01 — Switch theme

**Steps:**

1. In Settings, click the **Interface** tab.
2. In the "Theme" section, click **Light**.
3. Observe the app.
4. Click **Dark**.
5. Click **System**.

**What should happen:**

- Clicking Light makes the app background white/light immediately.
- Clicking Dark makes the background black/dark immediately.
- Clicking System makes the app adopt the Windows theme (Windows Settings → Personalisation → Colours).

**If it doesn't work:** Report with title "Theme switching doesn't work".

---

#### T07-02 — Switch language

**Steps:**

1. In the "Language" section, click the dropdown.
2. Select **Português**.
3. Observe the app's menus and labels.
4. Return to the dropdown and select **English**.

**What should happen:**

- The interface switches immediately to the selected language — menus, buttons, labels.
- Switching back to English returns everything to English.

**If it doesn't work:** Report with title "Language switching doesn't work" and note which language failed.

---

#### T07-03 — Verify French language

**Steps:**

1. In the Language dropdown, select **Français**.
2. Navigate through Dashboard, Library, and Settings.
3. Verify that the texts are in French.

**What should happen:**

- The main texts are in French.
- No texts appear in code format (e.g., `help.tabs.assetDetail`).

**If it doesn't work:** Report with title "French language — texts in code format or untranslated".

---

### T08 — Settings › System

> **Objective:** Verify system information and cache clearing.

---

#### T08-01 — View system information

**Steps:**

1. In Settings, click the **System** tab.
2. Wait for the page to load (may take up to 5 seconds).

**What should happen:**

- Information about your computer appears: operating system, processor, RAM, disk, and graphics card (GPU).
- The values make sense (e.g., your Windows version, the correct processor, the correct RAM amount).

**If it doesn't work:** Report with title "System information doesn't load" and note any error.

---

#### T08-02 — Clear thumbnail cache

> _Cache is temporary files the app stores to run faster. Clearing it doesn't delete your videos._

**Steps:**

1. In the "Cache" section, find the "Thumbnail Cache" card.
2. Note the size shown (e.g., "850 MB").
3. Click the **Clear** button (on that card).
4. Confirm in any window that appears.
5. Wait a few seconds.

**What should happen:**

- The cache size decreases (may show "0 MB" or a much smaller value).
- A message confirms that clearing was completed.
- The app continues to work normally.

**If it doesn't work:** Report with title "Thumbnail cache clearing failed".

---

#### T08-03 — System Diagnostics Modal

**Steps:**

1. Look at the **Settings** icon in the left menu.
2. If there is a **yellow dot** in the corner of the icon, click on Settings.
3. Check if a warning banner appears at the top of the Settings page.
4. If it appears, click **View details** (or equivalent).

**What should happen:**

- A modal opens showing the status of three components: **FFmpeg**, **FFprobe**, and **Engine**.
- In a normal installation, all three should show **green** status (OK).
- If any appears red, the modal indicates the problem and suggests how to fix it.

**Note:** In a correct installation, the yellow dot should not appear in the sidebar. Report it if it appears without an obvious reason with the title "Warning badge in Settings with no apparent reason".

---

### T09 — Settings › Logs

> **Objective:** Verify activity log settings.  
> _Logs are automatic records of what the app does — useful for diagnosing problems._

---

#### T09-01 — Change verbosity level

**Steps:**

1. In Settings, click the **Logs** tab.
2. In the "Verbosity" section, verify the three options: Basic, Normal, and Debug.
3. Click **Debug**.
4. Click **Normal** to go back.

**What should happen:**

- Options behave like radio buttons (only one active at a time).
- The selection is immediately visible.

---

#### T09-02 — Open logs folder

**Steps:**

1. In the "Storage" section, click the **Open Folder** button.

**What should happen:**

- Windows Explorer opens in the folder where logs are saved.
- The folder exists and may contain `.log` files.

**If it doesn't work:** Report with title "Open Logs Folder button doesn't work".

---

### T10 — Settings › Cloud

> **Objective:** Verify the configuration of cloud destinations for automatic file delivery.  
> _You can configure FTP servers, S3, Google Drive, etc. where the app sends videos after processing._

---

#### T10-01 — Add an FTP profile

**You need:** Access to an FTP server (host, username, password). If you don't have one, you can use fake test credentials just to verify the form.

**Steps:**

1. In Settings, click the **Cloud** tab.
2. Click the **+ New Profile** button.
3. In the window that opens:
   - **Provider**: select **FTP**
   - **Profile name**: type "Test Server"
   - **Host**: type any value (e.g., `ftp.example.com`)
   - **Port**: keep 21
   - **Username**: type `user`
   - **Password**: type `password`
4. Click **Test Connection** (wait for the response — may fail if the server doesn't exist).
5. Click **Create**.

**What should happen:**

- The form accepts the data without validation errors.
- The "Test Server" profile appears in the Cloud tab list.
- The "Test Connection" button shows some result (success or connection error — both are valid).

**If the form fails to save:** Report with title "Cannot create FTP Cloud profile".

---

#### T10-02 — Edit and delete a cloud profile

**You need:** The "Test Server" profile created in T10-01.

**Steps:**

1. In the cloud profiles list, click the **edit** icon (pencil) next to the "Test Server" profile.
2. Change the name to "Edited FTP".
3. Click **Update**.
4. Click the **delete** icon (red bin) next to the profile.
5. Confirm the deletion.

**What should happen:**

- The name updates in the list.
- After deleting, the profile disappears from the list.

---

#### T10-03 — Create an SFTP profile (form validation)

**You need:** Access to an SFTP server (host, username, password), or fake credentials to test the form only.

**Steps:**

1. In Settings, click the **Cloud** tab.
2. Click **+ New Profile**.
3. In the window that opens:
   - **Provider**: select **SFTP**
   - **Profile name**: type "SFTP Test"
   - **Host**: type any value (e.g. `sftp.example.com`)
   - **Port**: keep 22
   - **Username**: type `user`
   - **Password**: type `password`
   - **Remote folder**: type `/upload/nexora`
4. Click **Test Connection** (may fail if the server doesn't exist — this is valid).
5. Click **Create**.

**What should happen:**

- The form accepts the data without validation errors.
- The "SFTP Test" profile appears in the Cloud tab list with the "SFTP" badge.
- The "Test Connection" button shows some result (success or connection error — both are valid).

**If the form fails to save:** Report with title "Cannot create SFTP Cloud profile".

---

#### T10-04 — Create an SMB / Windows Share profile (form validation)

**You need:** Access to a Windows share or NAS, or fake values to test the form only.

**Steps:**

1. In Settings, click the **Cloud** tab.
2. Click **+ New Profile**.
3. In the window that opens:
   - **Provider**: select **SMB**
   - **Profile name**: type "SMB Test"
   - **Share path**: type `\\server\share` (or `//server/share`)
   - **Username**: type `user`
   - **Password**: type `password`
4. Click **Test Connection**.
5. Click **Create**.

**What should happen:**

- The form accepts the data without validation errors.
- The "SMB Test" profile appears in the Cloud tab list with the "SMB" badge.

**If the form fails to save:** Report with title "Cannot create SMB Cloud profile".

---

#### T10-05 — Create an S3 profile (form validation)

**You need:** S3 credentials (AWS, MinIO, Wasabi, Backblaze B2, etc.), or fake values to test the form.

**Steps:**

1. In Settings, click the **Cloud** tab.
2. Click **+ New Profile**.
3. In the window that opens:
   - **Provider**: select **S3**
   - **Profile name**: type "S3 Test"
   - **Endpoint**: leave blank (for AWS) or enter your provider's endpoint
   - **Bucket**: type `nexora-test`
   - **Region**: type `eu-west-1` (or your bucket's region)
   - **Access Key ID**: type any value
   - **Secret Access Key**: type any value
4. Click **Test Connection**.
5. Click **Create**.

**What should happen:**

- The form accepts the data without validation errors.
- The "S3 Test" profile appears in the Cloud tab list with the "S3" badge.

**If the form fails to save:** Report with title "Cannot create S3 Cloud profile".

---

#### T10-06 — Authenticate Google Drive (Device Flow)

**You need:** A Google account.

**Steps:**

1. In Settings, click the **Cloud** tab.
2. Click **+ New Profile**.
3. In the window that opens:
   - **Provider**: select **Google Drive**
   - **Profile name**: type "GDrive Test"
   - **Base folder**: type `Nexora/Output`
4. Click **Authenticate**.
5. Read the instructions that appear: it should show a URL and a user code.
6. Open the URL in your browser, enter the code, and authorize Nexora.

**What should happen:**

- The URL and code appear in the interface after clicking Authenticate.
- After authorizing in the browser, the interface shows a confirmation of successful authentication.
- The profile appears in the list with the "Google Drive" badge.

**If it doesn't work:** Report with title "Google Drive — Device Flow authentication failed" and describe which step it stopped at.

---

#### T10-07 — Authenticate Google Drive Personal (PKCE OAuth)

**You need:** Client ID and Client Secret from Google Cloud Console (see USER_MANUAL.md for instructions).

**Steps:**

1. In Settings, click the **Cloud** tab.
2. Click **+ New Profile**.
3. In the window that opens:
   - **Provider**: select **Google Drive Personal**
   - **Profile name**: type "GDrive Personal Test"
   - **Client ID**: enter your Google Cloud Console Client ID
   - **Client Secret**: enter your Client Secret
   - **Base folder**: type `Nexora/Output`
4. Click **Authenticate**.
5. A browser window opens — log in and authorize.

**What should happen:**

- A browser window opens automatically to the Google authorization page.
- After authorizing, the browser closes (or shows a confirmation page).
- The profile appears in the list with the "Google Drive Personal" badge and "Authenticated" status.

**If it doesn't work:** Report with title "Google Drive Personal — PKCE authentication failed".

---

#### T10-08 — Authenticate Dropbox (PKCE OAuth)

**You need:** A Dropbox App Key (see USER_MANUAL.md for how to create an app at developers.dropbox.com).

**Steps:**

1. In Settings, click the **Cloud** tab.
2. Click **+ New Profile**.
3. In the window that opens:
   - **Provider**: select **Dropbox**
   - **Profile name**: type "Dropbox Test"
   - **App Key**: enter your Dropbox App Key
   - **Base folder**: type `/Nexora/Output`
4. Click **Authenticate**.
5. A browser window opens — log in and authorize the app.

**What should happen:**

- A browser window opens to the Dropbox authorization page.
- After authorizing, the profile appears in the list with the "Dropbox" badge and "Authenticated" status.
- The Browse button works and lists files in the base folder.

**If it doesn't work:** Report with title "Dropbox — PKCE authentication failed".

---

#### T10-09 — Create a MEGA profile (form validation)

**You need:** A MEGA account at mega.nz (or fake credentials to test the form only).

**Steps:**

1. In Settings, click the **Cloud** tab.
2. Click **+ New Profile**.
3. In the window that opens:
   - **Provider**: select **MEGA**
   - **Profile name**: type "MEGA Test"
   - **Folder in MEGA**: type `Nexora/Output`
   - **Email**: type your MEGA email (or `test@example.com` to test the form)
   - **Password**: type your MEGA password (or `password123`)
4. Verify the **Test Connection** button is visible.
5. If you have a real account: click **Test Connection** — should show a success toast or a clear error ("Folder not found" if the folder doesn't exist in MEGA yet).
6. Click **Create**.

**What should happen:**

- The form accepts email, password, and folder path without validation errors.
- The "MEGA Test" profile appears in the Cloud tab list with the "MEGA" badge.
- If you used real credentials and the folder exists: the Browse button works and lists files.

**Notes:**

- The folder must exist in MEGA before testing — create `Nexora/Output` in mega.nz first.
- Files in MEGA are always end-to-end encrypted (E2EE); Nexora never sends data in plaintext.
- If "Folder not found" appears: create the folder in mega.nz and test again.

**If the form fails to save:** Report with title "Cannot create MEGA Cloud profile".

---

### T11 — Settings › Watch Folders

> **Objective:** Verify the automatic folder monitoring feature.  
> _With this feature, you can point the app to a folder and it automatically imports new videos that appear there._

---

#### T11-01 — Add a watch folder

**Steps:**

1. In Settings, click the **Watch Folders** tab.
2. Click **Add Folder**.
3. Select a folder on your computer (e.g., a "Test Videos" folder on the Desktop).
4. Click **Select Folder**.

**What should happen:**

- The folder appears in the list with the path and status "Active" (green).

---

#### T11-02 — Disable and re-enable a folder

**Steps:**

1. In the folder list, click the enable/disable toggle next to the added folder.
2. Observe the status change.
3. Click again to re-enable.

**What should happen:**

- The status changes from "Active" (green) to "Disabled" (grey) and back.

---

#### T11-03 — Remove a watch folder

**Steps:**

1. Click the **Remove** button (red) next to the folder.
2. Confirm if a confirmation window appears.

**What should happen:**

- The folder disappears from the list.

---

### T12 — Settings › Privacy

> **Objective:** Verify the privacy and telemetry options.  
> _Telemetry is anonymous usage data the app may send to help improve it. You can disable it at any time._

---

#### T12-01 — Enable/disable telemetry

**Steps:**

1. In Settings, click the **Privacy** tab.
2. Click the telemetry toggle.

**What should happen:**

- The toggle changes state visually.
- No error message appears.

---

#### T12-02 — View collected data

**Steps:**

1. Click the **View Collected Data** button.

**What should happen:**

- A box appears with text (may be empty if telemetry was disabled, or with JSON data if it was active).
- The box scrolls if there is a lot of content.

---

#### T12-03 — Clear telemetry data

**Steps:**

1. Click the **Clear All Data** button.

**What should happen:**

- A confirmation is requested.
- After confirming, the "View Data" box becomes empty.

---

### T13 — Settings › Advanced

> **Objective:** Verify the advanced maintenance tools.  
> ⚠️ **Warning:** "Factory Reset" deletes EVERYTHING. Only do it if you genuinely want to start over.

---

#### T13-01 — Export settings

**Steps:**

1. In Settings, click the **Advanced** tab.
2. In the "Data" section, click the **Export** button (download icon).
3. Select where to save the backup file.

**What should happen:**

- A `.json` file is saved to the chosen location.
- The file can be opened with a text editor and contains your settings.

---

#### T13-02 — Import settings

**You need:** The file exported in T13-01.

**Steps:**

1. Click the **Import** button (upload icon).
2. Select the exported `.json` file.

**What should happen:**

- Settings are imported without errors.
- A confirmation message appears.

---

#### T13-03 — Reset the onboarding wizard

**Steps:**

1. In the "Maintenance" section, click the **Reset** button next to "Show welcome wizard again".
2. Close and reopen the app.

**What should happen:**

- On the next launch, the welcome wizard appears again (as in T01-01).

---

#### T13-04 — Factory Reset _(OPTIONAL — deletes everything)_

> ⚠️ **Only do this test if you want to delete all app data and start over.**

**Steps:**

1. Click the **Factory Reset** button (red).
2. Read the **first** confirmation window carefully and click **Confirm**.
3. Read the **second** window carefully (asks if you want to also delete processed files) and choose.
4. Wait for the app to restart.

**What should happen:**

- **Two** confirmation windows appear (protection against accidental clicks).
- The app closes and reopens.
- On reopening, it is as if it's the first time (welcome wizard appears, no history).

**If it doesn't work:** Report with title "Factory Reset doesn't work correctly" and describe which step failed.

---

### T14 — Settings › About

> **Objective:** Verify version information and the update functionality.

---

#### T14-01 — View app version

**Steps:**

1. In Settings, click the **About** tab.

**What should happen:**

- The app version appears clearly (e.g., "v0.30.0-beta.1").
- There is a list of update notes (changelog) with what's new in the current version.

---

#### T14-02 — Check for updates

**Steps:**

1. On the About tab, click the **Check for Updates** button.

**What should happen:**

- The button is temporarily disabled (checking).
- After a few seconds, a message appears:
  - "You're on the latest version" — if no updates are available
  - Or information about a new available version
- _Note: In test (beta) builds, a "dev mode" warning may appear — this is normal._

---

#### T14-03 — Desktop Shortcut and "Already Up To Date" Badge

**Steps:**

1. In Settings › About, look for the **"Create desktop shortcut"** button (only visible on Windows).
2. Click the button.
3. Minimise the app and check the Desktop.
4. Return to the app and click **"Check for Updates"** when you already have the latest version installed.

**What should happen:**

- A Nexora Desktop shortcut appears on the Windows Desktop.
- When checking for updates with the latest version already installed, an **"Already up to date ✓"** inline badge appears in green and automatically disappears after approximately 6 seconds.

**If it doesn't work:** Report with the title "Create desktop shortcut button doesn't work" or "'Already up to date' badge doesn't appear".

---

### T15 — Asset Detail

> **Objective:** Verify the file detail page with metadata and job history.

---

#### T15-01 — Open asset detail

**You need:** An imported file in the Library.

**Steps:**

1. In the Library, click on a file's name or thumbnail.

**What should happen:**

- A page opens with detailed information about the file:
  - File name
  - Size
  - Duration
  - Resolution (e.g., 1920×1080)
  - Video codec (e.g., H.264)
  - Audio codec (e.g., AAC)
- There is a section with the history of jobs done on this file.

---

#### T15-02 — Submit a job from the detail page

**Steps:**

1. On the detail page, click the **Process** button.
2. Select a profile.
3. Confirm.

**What should happen:**

- The job is added to the queue (you can verify in Queue).
- The detail page shows the new job in the history with status "Queued" or "Processing".

---

#### T15-03 — Asset Detail Page Updates in Real Time

**You need:** An imported file with a recently submitted job (T04-01 passed).

**Steps:**

1. Open the detail page of a file you have just submitted for processing (T15-01).
2. Stay on this page without navigating to another screen.
3. Wait for the processing to progress.

**What should happen:**

- The job status in the history section changes from **"Queued"** → **"Processing"** → **"Completed"** without reloading the page or navigating.
- When the job finishes, the **VMAF** score, output codec, and the path of the processed file appear automatically on the page.
- You do not need to return to the Library and reopen the file to see the updated results.

**If it doesn't work:** Report with the title "Asset detail page does not update in real time during processing".

---

### T16 — Visual Comparator

> **Objective:** Verify the side-by-side comparison of original vs. processed video.  
> _The comparator only appears when a file has been processed and has an output file._

---

#### T16-01 — Open the comparator

**You need:** A file with completed processing (green "Completed" status).

**Steps:**

1. On the processed file's detail page, find the **Compare** or **Visual Comparator** button.
2. Click that button.

**What should happen:**

- A window or section opens with two videos side by side.
- The left side shows the original video, the right side shows the processed one.
- There is a dividing line between the two that you can drag.
- Labels indicate "Original" and "Processed".

**If it doesn't work:** Report with title "Visual Comparator doesn't open".

---

#### T16-02 — Control the divider line

**Steps:**

1. With the comparator open, click and drag the dividing line to the left.
2. Drag to the right.

**What should happen:**

- The line moves with the mouse.
- Moving left shows more of the processed video; moving right shows more of the original.

---

#### T16-03 — Synchronised playback

**Steps:**

1. Click the **Play** button below the videos.
2. Observe both videos.
3. Click the **Pause** button.
4. Drag the progress bar to a different point.

**What should happen:**

- Both videos play in sync.
- Pause stops both.
- Moving the progress bar updates the position in both videos.

---

### T17 — Bug Report

> **Objective:** Verify the integrated bug report form.

---

#### T17-01 — Open the bug report form

**Steps:**

1. Click the **?** icon in the top-right corner of the app.
2. Select **Report Bug** (or equivalent).

**What should happen:**

- A window opens with a form containing: Title, Description, and an option to include logs.

---

#### T17-02 — Required field validation

**Steps:**

1. With the form open, don't fill in any field.
2. Click the **Copy to Clipboard** button (or equivalent).

**What should happen:**

- The Title field is highlighted in red indicating it's required.
- No action is executed without the title.

---

#### T17-03 — Copy report to clipboard

**Steps:**

1. In the Title field, type "Bug report test".
2. In the Description field, type "This is a test".
3. Ensure "Include logs" is active.
4. Click **Copy to Clipboard**.

**What should happen:**

- A confirmation message appears (e.g., "Copied!").
- You can paste (Ctrl+V) elsewhere and see the formatted report.

---

### T18 — Help Manual

> **Objective:** Verify the integrated help manual.

---

#### T18-01 — Open the manual

**Steps:**

1. Click the **?** icon in the top-right corner.
2. Select **Help** or **Manual** (if there's a separate option), or click directly on the icon.

**What should happen:**

- A large window opens with a sidebar menu on the left and content on the right.
- The side menu has 12 tabs (Introduction, Dashboard, Library, Asset Detail, Import, Queue, Profiles, Settings, Cloud, Comparator, Logs, Beta Guide).

---

#### T18-02 — Navigate through the tabs

**Steps:**

1. Click each tab in the sidebar menu, one by one.
2. Observe the content that appears on the right.

**What should happen:**

- Each tab shows relevant content (explanatory text, sample image, tips).
- Tab names are in English (or the selected language) — **not** in code format like `help.tabs.assetDetail`.
- Sample images load correctly.

**If any tab shows text in code format:** Report with title "Help manual — tab name in code format" and note which tab is affected.

---

#### T18-03 — View image full size

**Steps:**

1. On a tab that has an image (e.g., Dashboard), click on the image.

**What should happen:**

- The image opens larger in a window/overlay.
- You can close it by clicking outside the image or on a close (X) button.

---

### T19 — Keyboard Shortcuts

> **Objective:** Verify that keyboard shortcuts work correctly.

---

#### T19-01 — Navigation shortcuts

**Steps:**

1. With the app open, press **Ctrl + 1** (or Ctrl + D).
2. Then **Ctrl + 2** (or Ctrl + L).
3. Then **Ctrl + 3** (or Ctrl + Q).
4. Then **Ctrl + 4** (or Ctrl + P).
5. Then **Ctrl + 5** (or Ctrl + comma).

**What should happen:**

- Each shortcut navigates to the respective section: Dashboard, Library, Queue, Profiles, Settings.

**If it doesn't work:** Report with title "Keyboard shortcut [combination] doesn't work".

---

#### T19-02 — Close modals with Escape

**Steps:**

1. Open any modal or floating window (e.g., the help manual, a form).
2. Press the **Escape** (Esc) key.

**What should happen:**

- The modal closes.

---

#### T19-03 — Open help with F1

**Steps:**

1. On any screen, press **F1**.

**What should happen:**

- The help manual opens.

---

### T20 — Visual Themes

> **Objective:** Confirm that all three themes work correctly throughout the app.

---

#### T20-01 — Verify Light theme in all sections

**Steps:**

1. Go to Settings › Interface and select the **Light** theme.
2. Navigate through: Dashboard → Library → Queue → Profiles → Settings.

**What should happen:**

- The background is white or very light in all sections.
- Text is dark and readable.
- There are no areas with a very dark background that "break" the theme.

**If it doesn't work:** Report with title "Light theme inconsistent in [section]" and describe the visual issue.

---

#### T20-02 — Verify Dark theme in all sections

**Steps:**

1. Select the **Dark** theme.
2. Navigate through the same sections.

**What should happen:**

- The background is dark in all sections.
- Text is light and readable.
- There are no areas with a very light background that "break" the theme.

---

### T21 — Languages

> **Objective:** Verify translation in a few selected languages.

---

#### T21-01 — Verify Portuguese

**Steps:**

1. Change the language to **Português**.
2. Navigate through: Library → Queue → Settings.
3. Check menus and buttons.

**What should happen:**

- All texts are in Portuguese.
- No text appears in code format.

---

#### T21-02 — Verify Spanish

**Steps:**

1. Change the language to **Español**.
2. Navigate through the same sections.

**What should happen:**

- Main texts are in Spanish.
- No text in code format.

---

#### T21-03 — Verify German

**Steps:**

1. Change the language to **Deutsch**.
2. Navigate through the same sections.

**What should happen:**

- Main texts are in German.
- Special characters (Ä, Ö, Ü, ß) display correctly.

---

#### T21-04 — Return to English

**Steps:**

1. Change back to **English**.
2. Confirm that the entire interface has returned to English.

---

### T22 — Features Introduced Since v0.30.11

> **Note:** This section tests features added in versions v0.30.11 to v0.31.5. They complement the previous tests — if you have already done T02 to T21, these tests focus on the specific details of the new versions.

---

#### T22-01 — QueuePill: Behaviour in All States

> **Objective:** Test all states of the queue indicator in the top bar.

**Steps:**

1. With the app and no jobs in progress, observe the top bar.
2. Submit a job (see T04-01).
3. Observe the pill during processing.
4. Wait for the job to complete.
5. Submit another job and cancel it immediately (see T04-03).

**What should happen:**

- **Idle** state (no jobs): grey pill with "Idle" text, no job count.
- **Active** state (processing): pulsing blue dot, number of in-progress jobs visible.
- **With completed jobs**: green number with ✓ appears and increments with each finished job.
- A **cancelled** job does not increment the green completed counter.

**If it doesn't work:** Report with the title "QueuePill — incorrect behaviour in state [X]".

---

#### T22-02 — AssetDetailPage: Complete Reactive Update

> **Objective:** Confirm all fields that update in real time during processing.

**You need:** An imported file in the Library.

**Steps:**

1. Open the detail page of a file (T15-01).
2. Click **Process** and select the **web-hd** profile.
3. Stay on the detail page without navigating.
4. Observe the following fields during and after processing:
   - Job status in the history section
   - VMAF score (appears after completion)
   - Codec and resolution of the output file
   - Path of the processed file

**What should happen:**

- All of the above fields update without reloading the page or navigating to another screen.
- The VMAF appears with the score and the corresponding colour (green ≥ 85, yellow 70–84, red < 70).

**If it doesn't work:** Report with the title "AssetDetailPage — field [X] does not update in real time".

---

#### T22-03 — QC States: Quarantine and Rejection

> **Objective:** Verify the specific quality control states in the Queue history.

> _This test may not occur with every file — quarantine happens when the app detects a potential quality issue. You can try with low-quality or heavily compressed videos._

**If you see a "QUARANTINE" section in the Queue:**

**Steps:**

1. In the Queue, observe the quarantine section (orange/yellow background).
2. Click the **thumbs down** icon (reject) next to a quarantined file.
3. Check the final status of the file in the job history.

**What should happen:**

- After rejecting: the status changes to **"Rejected"** (red) in the history.
- The rejected file does not return to "Completed" or "Queued".
- The status persists after navigating to another screen and returning to the Queue.

**If it doesn't work:** Report with the title "'Rejected' status does not appear correctly in history".

---

#### T22-04 — Filename Visible in Queue

> **Objective:** Confirm that the filename appears correctly during processing.

**Steps:**

1. Submit a job (T04-01).
2. Navigate immediately to **Queue**.
3. Observe the job in the "Processing" section.

**What should happen:**

- The **filename** (e.g. `test_video.mp4`) is clearly visible next to the selected profile and the progress bar.
- A generic ID (e.g. a UUID like `a3f8b2c1-...`) or a blank field does not appear.

**If it doesn't work:** Report with the title "Filename does not appear in Queue during processing".

---

## 5. Glossary

Technical terms explained in plain language:

| Term           | Explanation                                                                                                                         |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **VMAF**       | Video quality score from 0 to 100. Above 85 = good quality. Below 70 = degraded quality. Created by Netflix.                        |
| **LUFS**       | Audio loudness measurement. -23 LUFS is the broadcast TV standard. More negative values = quieter.                                  |
| **Codec**      | Technology used to compress video or audio. H.264 is the most common (used on YouTube, Netflix, etc.).                              |
| **Pipeline**   | The 8 automatic steps the app runs on every file: analysis, pre-check, conversion, audio, proxy, thumbnail, post-check, delivery.   |
| **Proxy**      | A low-quality copy of a video used for fast preview without loading the full file.                                                  |
| **QC**         | Quality Control — automatic checks the app runs before and after processing to ensure the result is good.                           |
| **GPU**        | Graphics card. When available, the app uses it to accelerate video conversion (up to 10× faster).                                   |
| **Transcode**  | Converting a video from one format/quality to another. For example, from `.mov` to `.mp4` at 1080p resolution.                      |
| **Quarantine** | A state where the app has flagged a file because it detected a possible quality problem. You need to manually approve or reject it. |
| **Profile**    | A set of preset settings (resolution, quality, format) for a specific output type, like "Broadcast HD" or "Web HD".                 |
| **Bitrate**    | The amount of data used to represent one second of video. Higher = better quality but larger file. Measured in Mbps.                |
| **FTP / SFTP** | Protocols for transferring files to remote servers. FTP is basic; SFTP is the secure (encrypted) version.                           |
| **S3**         | Amazon's storage service (and compatible alternatives like Wasabi, MinIO). Similar to an online folder.                             |
| **Log**        | An automatic record of what the app did. Useful for understanding what happened when something went wrong.                          |
| **Cache**      | Temporary files stored by the app to run faster. Can be cleared without losing your videos or settings.                             |

---

## 6. Contacts and Support

**Report bugs:**

- Via the app: **?** button → Report Bug
- GitHub Issues: [https://github.com/ideiasestrondosas-ctrl/nexora-desktop/issues](https://github.com/ideiasestrondosas-ctrl/nexora-desktop/issues)

**Full documentation:**

- User manual: `docs/USER_MANUAL.md` (in the app folder)
- Visual guide: `docs/SCREEN_GUIDE.md`

**Version tested:** v0.33.0-beta.1  
**Last updated:** June 2026

---

_Thank you for participating in the Nexora Desktop beta test. Your feedback makes a difference!_
