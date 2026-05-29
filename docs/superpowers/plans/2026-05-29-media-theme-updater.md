# Media Loading, Light Mode Fallback & UpdateModal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix media loading (thumbnails/player/comparator), add Mica fallback for light mode on Windows Sandbox/VMs, and improve UpdateModal with real CHANGELOG notes and animated progress bar.

**Architecture:** Three independent fixes: (1) widen `assetProtocol.scope` with multiple patterns + add IPC base64 fallback for thumbnails; (2) capture `apply_mica` result in Rust, emit `mica-status` event, apply solid CSS fallback when inactive; (3) parse CHANGELOG in CI script for real notes, fix stale closure in UpdateModal progress.

**Tech Stack:** Rust (Tauri 2.x, base64 crate), TypeScript/React, Tailwind CSS v4, Node.js (CI script)

---

## File Map

| File                                        | Change                                                          |
| ------------------------------------------- | --------------------------------------------------------------- |
| `src-tauri/Cargo.toml`                      | Add `base64 = "0.22"` dependency                                |
| `src-tauri/tauri.conf.json`                 | Widen `assetProtocol.scope`                                     |
| `src-tauri/src/commands/assets.rs`          | Add `read_thumbnail_base64` command                             |
| `src-tauri/src/lib.rs`                      | Register command; capture mica result; emit `mica-status` event |
| `src/App.tsx`                               | Listen to `mica-status`, set `data-mica` on `<html>`            |
| `src/index.css`                             | Solid background fallback when `data-mica=inactive`             |
| `src/pages/LibraryPage.tsx`                 | Thumbnail with IPC fallback on `onError`                        |
| `src/pages/AssetDetailPage.tsx`             | `onError` logging on video + img thumbnail                      |
| `src/components/VisualComparatorPlayer.tsx` | `onError` logging on both video elements                        |
| `src/components/UpdateModal.tsx`            | Fix stale closure; add CSS transition to progress bar           |
| `scripts/ci-generate-updater-json.mjs`      | Parse CHANGELOG section for real release notes                  |

---

## Task 1: Widen asset protocol scope + add base64 Rust dependency

**Files:**

- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/tauri.conf.json`

- [ ] **Step 1: Add base64 dependency to Cargo.toml**

Open `src-tauri/Cargo.toml`. After the `zip = "2"` line (currently line ~34), add:

```toml
base64 = "0.22"
```

The relevant section of Cargo.toml should now look like:

```toml
zip = "2"
base64 = "0.22"
reqwest = { version = "0.12", features = ["multipart", "json"] }
```

- [ ] **Step 2: Widen assetProtocol scope in tauri.conf.json**

Open `src-tauri/tauri.conf.json`. Find the `"assetProtocol"` block (currently under `app.security`) and replace:

```json
"assetProtocol": {
  "enable": true,
  "scope": ["$HOME/**", "$TEMP/**"]
}
```

with:

```json
"assetProtocol": {
  "enable": true,
  "scope": [
    "**",
    "$HOME/**",
    "$TEMP/**",
    "$APPDATA/**",
    "$LOCALAPPDATA/**",
    "$VIDEO/**",
    "$DESKTOP/**",
    "$DOWNLOAD/**"
  ]
}
```

- [ ] **Step 3: Verify Cargo compiles with the new dependency**

```bash
cd src-tauri && cargo check 2>&1 | tail -5
```

Expected: no errors. If `base64` crate not found, run `cargo update` first.

- [ ] **Step 4: Commit**

```bash
git add src-tauri/Cargo.toml src-tauri/tauri.conf.json
git commit -m "fix(media): wider assetProtocol scope + base64 dep"
```

---

## Task 2: Add `read_thumbnail_base64` Rust command

**Files:**

- Modify: `src-tauri/src/commands/assets.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Add the command to assets.rs**

Open `src-tauri/src/commands/assets.rs`. At the very end of the file (after the last `pub fn`), add:

```rust
/// Lê um ficheiro de thumbnail e devolve conteúdo como base64.
/// Usado como fallback quando o asset protocol falha (scope/CSP).
/// Só para ficheiros pequenos (thumbnails ~50KB) — não usar para vídeos.
#[tauri::command]
pub fn read_thumbnail_base64(path: String) -> Result<String, String> {
    use base64::engine::general_purpose::STANDARD;
    use base64::Engine;
    let bytes = std::fs::read(&path).map_err(|e| format!("read_thumbnail_base64: {e}"))?;
    Ok(STANDARD.encode(bytes))
}
```

- [ ] **Step 2: Register the command in lib.rs**

Open `src-tauri/src/lib.rs`. Find the `invoke_handler` block (around line 185). The list of commands ends with `get_startup_status,`. Add the new command before the closing `]`:

```rust
            commands::assets::read_thumbnail_base64,
            get_startup_status,
```

- [ ] **Step 3: Verify it compiles**

```bash
cd src-tauri && cargo check 2>&1 | tail -10
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/commands/assets.rs src-tauri/src/lib.rs
git commit -m "feat(rust): add read_thumbnail_base64 IPC command"
```

---

## Task 3: Thumbnail fallback in LibraryPage

**Files:**

- Modify: `src/pages/LibraryPage.tsx`

The goal: when `<img src={convertFileSrc(path)}>` fails (onError), invoke `read_thumbnail_base64` and use the returned base64 as the `src`. This guarantees thumbnails work even if the asset protocol scope is wrong.

> **Note:** Steps 1–4 add `ThumbnailImg` as a local component in LibraryPage temporarily. Task 4 then extracts it to a shared file and updates both LibraryPage and AssetDetailPage. Follow both tasks in order.

- [ ] **Step 1: Update the thumbnail rendering in LibraryPage.tsx**

Open `src/pages/LibraryPage.tsx`. After the existing imports (around line 26), add the `invoke` import if not already present — it is already imported (`import { invoke, convertFileSrc } from '@tauri-apps/api/core';` at line 3).

Now find the thumbnail rendering block (around line 521):

```tsx
{
  asset.thumbnail_path ? (
    <img
      src={convertFileSrc(asset.thumbnail_path)}
      alt={asset.filename}
      className="w-full h-full object-cover"
      onError={(e) => {
        (e.target as HTMLImageElement).style.display = 'none';
      }}
    />
  ) : (
    <Film size={32} className="text-gray-800" />
  );
}
```

Replace it with:

```tsx
{
  asset.thumbnail_path ? (
    <ThumbnailImg
      path={asset.thumbnail_path}
      alt={asset.filename}
      className="w-full h-full object-cover"
    />
  ) : (
    <Film size={32} className="text-text-muted" />
  );
}
```

- [ ] **Step 2: Add the ThumbnailImg component before the LibraryPage function**

Find the line `export default function LibraryPage(` and insert the following component definition ABOVE it:

```tsx
function ThumbnailImg({ path, alt, className }: { path: string; alt: string; className?: string }) {
  const [src, setSrc] = useState<string>(() => convertFileSrc(path));
  const [failed, setFailed] = useState(false);

  const handleError = useCallback(async () => {
    if (failed) return;
    try {
      const b64 = await invoke<string>('read_thumbnail_base64', { path });
      setSrc(`data:image/jpeg;base64,${b64}`);
    } catch {
      setFailed(true);
    }
  }, [path, failed]);

  if (failed) return <Film size={32} className="text-text-muted" />;
  return <img src={src} alt={alt} className={className} onError={handleError} />;
}
```

Note: `useState`, `useCallback` are already imported in LibraryPage. `invoke` and `convertFileSrc` are already imported. `Film` is already imported.

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep -E "error|warning" | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/pages/LibraryPage.tsx
git commit -m "fix(media): thumbnail fallback via IPC base64 on asset protocol error"
```

---

## Task 4: `onError` logging in AssetDetailPage and VisualComparatorPlayer

**Files:**

- Modify: `src/pages/AssetDetailPage.tsx`
- Modify: `src/components/VisualComparatorPlayer.tsx`

These logs will appear in the in-app activity log, visible to the user in the Logs tab — useful for diagnosing media failures in production without a dev console.

- [ ] **Step 1: Add onError to video element in AssetDetailPage**

Open `src/pages/AssetDetailPage.tsx`. Find the inline player `<video>` element (around line 332):

```tsx
<video
  controls
  autoPlay
  className="w-full h-full object-contain bg-black"
  src={convertFileSrc(
    heroView === 'out' && (asset.output_path ?? jobs[0]?.output_path)
      ? (asset.output_path ?? jobs[0]?.output_path)!
      : asset.path,
  )}
  key={heroView + (asset.output_path ?? jobs[0]?.output_path ?? '')}
/>
```

Replace with:

```tsx
<video
  controls
  autoPlay
  className="w-full h-full object-contain bg-black"
  src={convertFileSrc(
    heroView === 'out' && (asset.output_path ?? jobs[0]?.output_path)
      ? (asset.output_path ?? jobs[0]?.output_path)!
      : asset.path,
  )}
  key={heroView + (asset.output_path ?? jobs[0]?.output_path ?? '')}
  onError={() => {
    const p =
      heroView === 'out' && (asset.output_path ?? jobs[0]?.output_path)
        ? (asset.output_path ?? jobs[0]?.output_path)!
        : asset.path;
    logActivity('video_load_error', 'error', `path: ${p.slice(-80)}`);
  }}
/>
```

- [ ] **Step 2: Add onError to img thumbnail in AssetDetailPage**

In the same file, find the hero thumbnail `<img>` (around line 347):

```tsx
<img
  src={convertFileSrc(heroView === 'orig' ? asset.thumbnail_path! : asset.thumbnail_output_path!)}
  alt={asset.filename}
  className="w-full h-full object-cover"
  onError={(e) => {
    (e.target as HTMLImageElement).style.display = 'none';
  }}
/>
```

Replace with:

```tsx
<ThumbnailImg
  path={heroView === 'orig' ? asset.thumbnail_path! : asset.thumbnail_output_path!}
  alt={asset.filename}
  className="w-full h-full object-cover"
/>
```

Then add the `ThumbnailImg` import at the top of the file (after other imports):

```tsx
import { ThumbnailImg } from '@/components/ThumbnailImg';
```

Wait — we defined `ThumbnailImg` as a local component in LibraryPage. To reuse it in AssetDetailPage, we need to extract it to a shared component file.

- [ ] **Step 3: Extract ThumbnailImg to shared component**

Create new file `src/components/ThumbnailImg.tsx`:

```tsx
import { useState, useCallback } from 'react';
import { invoke, convertFileSrc } from '@tauri-apps/api/core';
import { Film } from 'lucide-react';

export function ThumbnailImg({
  path,
  alt,
  className,
}: {
  path: string;
  alt: string;
  className?: string;
}) {
  const [src, setSrc] = useState<string>(() => convertFileSrc(path));
  const [failed, setFailed] = useState(false);

  const handleError = useCallback(async () => {
    if (failed) return;
    try {
      const b64 = await invoke<string>('read_thumbnail_base64', { path });
      setSrc(`data:image/jpeg;base64,${b64}`);
    } catch {
      setFailed(true);
    }
  }, [path, failed]);

  if (failed) return <Film size={32} className="text-text-muted" />;
  return <img src={src} alt={alt} className={className} onError={handleError} />;
}
```

- [ ] **Step 4: Update LibraryPage to import from shared component**

Open `src/pages/LibraryPage.tsx`. Remove the local `ThumbnailImg` function definition added in Task 3 Step 2, and add the import instead:

```tsx
import { ThumbnailImg } from '@/components/ThumbnailImg';
```

- [ ] **Step 5: Use ThumbnailImg in AssetDetailPage**

Open `src/pages/AssetDetailPage.tsx`. Add at the top with other imports:

```tsx
import { ThumbnailImg } from '@/components/ThumbnailImg';
```

Replace the hero thumbnail `<img>` block with:

```tsx
<ThumbnailImg
  path={heroView === 'orig' ? asset.thumbnail_path! : asset.thumbnail_output_path!}
  alt={asset.filename}
  className="w-full h-full object-cover"
/>
```

- [ ] **Step 6: Add onError logging to VisualComparatorPlayer**

Open `src/components/VisualComparatorPlayer.tsx`. Add import at the top:

```tsx
import { logActivity } from '@/lib/activityLog';
```

Find the two `<video>` elements (around lines 116 and 127). Add `onError` to both:

First video (left — original):

```tsx
<video
  ref={leftRef}
  src={leftSrc}
  className="absolute inset-0 w-full h-full object-contain"
  preload="metadata"
  onError={() => logActivity('comparator_load_error', 'error', `orig: ${originalPath.slice(-80)}`)}
/>
```

Second video (right — processed):

```tsx
<video
  ref={rightRef}
  src={rightSrc}
  className="absolute inset-0 w-full h-full object-contain"
  preload="metadata"
  onError={() => logActivity('comparator_load_error', 'error', `proc: ${processedPath.slice(-80)}`)}
/>
```

- [ ] **Step 7: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep error | head -20
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/components/ThumbnailImg.tsx src/pages/LibraryPage.tsx src/pages/AssetDetailPage.tsx src/components/VisualComparatorPlayer.tsx
git commit -m "fix(media): ThumbnailImg shared component + onError logging in video/comparator"
```

---

## Task 5: Mica detection — Rust event emission

**Files:**

- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Capture mica/vibrancy result and emit event**

Open `src-tauri/src/lib.rs`. Find the window vibrancy block (around lines 62–69):

```rust
            #[cfg(any(target_os = "windows", target_os = "macos"))]
            {
                let main_window = app.get_webview_window("main").unwrap();
                #[cfg(target_os = "windows")]
                apply_mica(&main_window, Some(true)).ok();
                #[cfg(target_os = "macos")]
                apply_vibrancy(&main_window, NSVisualEffectMaterial::HudWindow, None, None).ok();
            }
```

Replace with:

```rust
            #[cfg(any(target_os = "windows", target_os = "macos"))]
            {
                let main_window = app.get_webview_window("main").unwrap();
                #[cfg(target_os = "windows")]
                {
                    let mica_ok = apply_mica(&main_window, Some(true)).is_ok();
                    main_window.emit("mica-status", mica_ok).ok();
                }
                #[cfg(target_os = "macos")]
                {
                    let vibrancy_ok = apply_vibrancy(
                        &main_window,
                        NSVisualEffectMaterial::HudWindow,
                        None,
                        None,
                    )
                    .is_ok();
                    main_window.emit("mica-status", vibrancy_ok).ok();
                }
            }
```

On platforms without Mica/Vibrancy support (Linux), no event is emitted — the frontend handles the missing attribute gracefully via CSS.

- [ ] **Step 2: Verify it compiles**

```bash
cd src-tauri && cargo check 2>&1 | tail -5
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/lib.rs
git commit -m "feat(rust): emit mica-status event after apply_mica/apply_vibrancy"
```

---

## Task 6: Mica fallback CSS + App.tsx listener

**Files:**

- Modify: `src/App.tsx`
- Modify: `src/index.css`

- [ ] **Step 1: Add mica-status listener in App.tsx**

Open `src/App.tsx`. The file already imports `listen` from `@tauri-apps/api/event` (line 4) and uses `useEffect`.

Find the existing effects (around line 79 — the `useEffect` for cloud profiles). Add a new effect BEFORE it:

```tsx
// Mica/Vibrancy status — aplica data-mica ao <html> para CSS fallback
useEffect(() => {
  const unlisten = listen<boolean>('mica-status', (e) => {
    document.documentElement.dataset.mica = e.payload ? 'active' : 'inactive';
  });
  return () => {
    unlisten.then((fn) => fn());
  };
}, []);
```

- [ ] **Step 2: Add fallback CSS to index.css**

Open `src/index.css`. Find the end of the "Phase B: Transparent window" section (around line 218). Add immediately after:

```css
/* Fallback: Mica/Vibrancy não disponível (Sandbox, Windows 10, VMs) */
/* Aplica fundo sólido para evitar que o HWND preto apareça */
html[data-platform='windows'][data-mica='inactive'] body,
html[data-platform='windows'][data-mica='inactive'] #root {
  background-color: var(--color-bg-primary);
}
html[data-platform='windows'][data-mica='inactive'] main,
html[data-platform='windows'][data-mica='inactive'] .flex.h-screen {
  background-color: var(--color-bg-primary);
}
html[data-platform='macos'][data-mica='inactive'] body,
html[data-platform='macos'][data-mica='inactive'] #root {
  background-color: var(--color-bg-primary);
}
html[data-platform='macos'][data-mica='inactive'] main,
html[data-platform='macos'][data-mica='inactive'] .flex.h-screen {
  background-color: var(--color-bg-primary);
}
```

The `var(--color-bg-primary)` resolves to `#ffffff` in light mode (`.dark` not present) and `#0a0d14` in dark mode (`.dark` class applied by the theme system). Both are correct.

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep error | head -10
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/index.css
git commit -m "fix(theme): solid background fallback when Mica/Vibrancy unavailable"
```

---

## Task 7: CHANGELOG parsing in CI script

**Files:**

- Modify: `scripts/ci-generate-updater-json.mjs`

- [ ] **Step 1: Add the extractChangelogSection function and use it**

Open `scripts/ci-generate-updater-json.mjs`. The full current file is:

```js
#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';

const tag = process.env.GITHUB_REF_NAME;
if (!tag) throw new Error('GITHUB_REF_NAME not set');

const artifactsDir = process.argv[2];
if (!artifactsDir) {
  console.error('Usage: node ci-generate-updater-json.mjs <artifacts-dir>');
  process.exit(1);
}

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const version = pkg.version.replace(/-.*$/, '');
const baseUrl = `https://github.com/ideiasestrondosas-ctrl/nexora-desktop/releases/download/${tag}`;

const platforms = {};

const dirs = readdirSync(artifactsDir).filter((d) => statSync(join(artifactsDir, d)).isDirectory());

if (dirs.length === 0) {
  console.error('No updater artifact directories found in:', artifactsDir);
  process.exit(1);
}

for (const dir of dirs) {
  const dirPath = join(artifactsDir, dir);
  const platform = readFileSync(join(dirPath, 'platform.txt'), 'utf8').trim();
  const bundleName = readFileSync(join(dirPath, 'bundle-name.txt'), 'utf8').trim();
  const sig = readFileSync(join(dirPath, 'sig.txt'), 'utf8').trim();
  const encodedName = bundleName.replace(/ /g, '.');

  console.log(`  ${platform}: ${bundleName}`);
  platforms[platform] = {
    signature: sig,
    url: `${baseUrl}/${encodedName}`,
  };
}

const latestJson = {
  version,
  notes: 'See the CHANGELOG.md for details.',
  pub_date: new Date().toISOString(),
  platforms,
};

writeFileSync('latest.json', JSON.stringify(latestJson, null, 2));
console.log('\nGenerated latest.json:');
console.log(JSON.stringify(latestJson, null, 2));

execSync(`gh release upload "${tag}" latest.json --clobber`, { stdio: 'inherit' });
console.log('\nUploaded latest.json to release.');
```

Replace the entire file with:

```js
#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';

const tag = process.env.GITHUB_REF_NAME;
if (!tag) throw new Error('GITHUB_REF_NAME not set');

const artifactsDir = process.argv[2];
if (!artifactsDir) {
  console.error('Usage: node ci-generate-updater-json.mjs <artifacts-dir>');
  process.exit(1);
}

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
// Versão puramente numérica (sem sufixo pre-release) — igual ao tauri.conf.json
const version = pkg.version.replace(/-.*$/, '');
const baseUrl = `https://github.com/ideiasestrondosas-ctrl/nexora-desktop/releases/download/${tag}`;

/**
 * Extrai a secção do CHANGELOG para a versão dada.
 * Procura por headers "## v0.30.X..." ou "## 0.30.X..." e extrai até ao próximo "## ".
 * Retorna null se a secção não for encontrada.
 */
function extractChangelogSection(changelogText, ver) {
  const escaped = ver.replace(/\./g, '\\.');
  const patterns = [
    new RegExp(`##\\s+v${escaped}[^\\n]*\\n([\\s\\S]*?)(?=\\n##\\s|$)`),
    new RegExp(`##\\s+${escaped}[^\\n]*\\n([\\s\\S]*?)(?=\\n##\\s|$)`),
  ];
  for (const pattern of patterns) {
    const match = changelogText.match(pattern);
    if (match?.[1]?.trim()) return match[1].trim();
  }
  return null;
}

const platforms = {};

const dirs = readdirSync(artifactsDir).filter((d) => statSync(join(artifactsDir, d)).isDirectory());

if (dirs.length === 0) {
  console.error('No updater artifact directories found in:', artifactsDir);
  process.exit(1);
}

for (const dir of dirs) {
  const dirPath = join(artifactsDir, dir);
  const platform = readFileSync(join(dirPath, 'platform.txt'), 'utf8').trim();
  const bundleName = readFileSync(join(dirPath, 'bundle-name.txt'), 'utf8').trim();
  const sig = readFileSync(join(dirPath, 'sig.txt'), 'utf8').trim();
  // GitHub converte espaços para pontos em nomes de assets de release
  const encodedName = bundleName.replace(/ /g, '.');

  console.log(`  ${platform}: ${bundleName}`);
  platforms[platform] = {
    signature: sig,
    url: `${baseUrl}/${encodedName}`,
  };
}

// Extrair notas do CHANGELOG para esta versão
let notes = 'Ver CHANGELOG.md para detalhes das alterações.';
try {
  const changelog = readFileSync('CHANGELOG.md', 'utf8');
  const extracted = extractChangelogSection(changelog, version);
  if (extracted) {
    notes = extracted;
    console.log(`\nExtracted CHANGELOG section for v${version} (${extracted.length} chars)`);
  } else {
    console.log(`\nNo CHANGELOG section found for v${version}, using default notes`);
  }
} catch (e) {
  console.log(`\nCould not read CHANGELOG.md: ${e.message}`);
}

const latestJson = {
  version,
  notes,
  pub_date: new Date().toISOString(),
  platforms,
};

writeFileSync('latest.json', JSON.stringify(latestJson, null, 2));
console.log('\nGenerated latest.json:');
console.log(JSON.stringify(latestJson, null, 2));

execSync(`gh release upload "${tag}" latest.json --clobber`, { stdio: 'inherit' });
console.log('\nUploaded latest.json to release.');
```

- [ ] **Step 2: Verify the script runs without error**

```bash
cd "C:\dev\nexora-desktop"
node --input-type=module <<'EOF'
import { readFileSync } from 'fs';
const changelog = readFileSync('CHANGELOG.md', 'utf8');
const version = '0.30.4';
const escaped = version.replace(/\./g, '\\.');
const patterns = [
  new RegExp(`##\\s+v${escaped}[^\\n]*\\n([\\s\\S]*?)(?=\\n##\\s|$)`),
  new RegExp(`##\\s+${escaped}[^\\n]*\\n([\\s\\S]*?)(?=\\n##\\s|$)`),
];
for (const p of patterns) {
  const m = changelog.match(p);
  if (m?.[1]?.trim()) { console.log('Found section, length:', m[1].trim().length); process.exit(0); }
}
console.log('Section not found for v' + version + ' — fallback will be used');
EOF
```

On Windows PowerShell, run this alternative if the heredoc doesn't work:

```bash
node scripts/test-changelog-parse.mjs
```

Where `scripts/test-changelog-parse.mjs` is a temporary file you can create with the above content and delete after testing.

Expected: either "Found section, length: N" or "Section not found — fallback will be used". No errors either way.

- [ ] **Step 3: Commit**

```bash
git add scripts/ci-generate-updater-json.mjs
git commit -m "feat(ci): parse CHANGELOG section for real release notes in latest.json"
```

---

## Task 8: Fix UpdateModal stale closure + progress bar animation

**Files:**

- Modify: `src/components/UpdateModal.tsx`

- [ ] **Step 1: Fix the stale closure and add progress bar transition**

Open `src/components/UpdateModal.tsx`. The current file uses `totalSize` state inside `downloadAndInstall`'s callback, which causes a stale closure where `totalSize` is always `0` when `Progress` events fire.

Replace the entire component content with the corrected version. The key changes are:

1. Add `const totalSizeRef = useRef(0);`
2. In `Started` event: set `totalSizeRef.current` synchronously
3. In `Progress` event: use `totalSizeRef.current` (not the state)
4. Add `transition-[width] duration-300` to the progress bar

Find these lines (around line 16–51):

```tsx
  const [state, setState] = useState<'idle' | 'downloading' | 'installing' | 'done' | 'error'>(
    'idle',
  );
  const [progress, setProgress] = useState(0);
  const [totalSize, setTotalSize] = useState(0);
  const [downloaded, setDownloaded] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const isDev = import.meta.env.DEV;

  const handleUpdate = async () => {
    setState('downloading');
    setProgress(0);
    try {
      await update.downloadAndInstall((event) => {
        if (event.event === 'Started') {
          setTotalSize(event.data.contentLength ?? 0);
        } else if (event.event === 'Progress') {
          setDownloaded((prev) => {
            const next = prev + (event.data.chunkLength ?? 0);
            if (totalSize > 0) setProgress(Math.round((next / totalSize) * 100));
            return next;
          });
        } else if (event.event === 'Finished') {
          setState('installing');
        }
      });
```

Replace with:

```tsx
  const [state, setState] = useState<'idle' | 'downloading' | 'installing' | 'done' | 'error'>(
    'idle',
  );
  const [progress, setProgress] = useState(0);
  const [totalSize, setTotalSize] = useState(0);
  const [downloaded, setDownloaded] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const isDev = import.meta.env.DEV;
  // Ref para evitar stale closure no callback de downloadAndInstall
  const totalSizeRef = useRef(0);

  const handleUpdate = async () => {
    setState('downloading');
    setProgress(0);
    totalSizeRef.current = 0;
    try {
      await update.downloadAndInstall((event) => {
        if (event.event === 'Started') {
          totalSizeRef.current = event.data.contentLength ?? 0;
          setTotalSize(totalSizeRef.current);
        } else if (event.event === 'Progress') {
          setDownloaded((prev) => {
            const next = prev + (event.data.chunkLength ?? 0);
            if (totalSizeRef.current > 0) {
              setProgress(Math.round((next / totalSizeRef.current) * 100));
            }
            return next;
          });
        } else if (event.event === 'Finished') {
          setState('installing');
        }
      });
```

- [ ] **Step 2: Add CSS transition to progress bar**

In the same file, find the progress bar div (around line 130):

```tsx
<div
  className="bg-blue-500 h-1.5 rounded-full transition-all duration-200"
  style={{ width: state === 'installing' ? '100%' : `${progress}%` }}
/>
```

Replace `transition-all duration-200` with `transition-[width] duration-300 ease-out`:

```tsx
<div
  className="bg-blue-500 h-1.5 rounded-full transition-[width] duration-300 ease-out"
  style={{ width: state === 'installing' ? '100%' : `${progress}%` }}
/>
```

- [ ] **Step 3: Ensure `useRef` is imported**

The current line 1 of `UpdateModal.tsx` is: `import React, { useState } from 'react';`

Replace with:

```tsx
import React, { useState, useRef } from 'react';
```

- [ ] **Step 4: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep error | head -10
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/UpdateModal.tsx
git commit -m "fix(updater): stale closure em progress bar + transição CSS"
```

---

## Task 9: Full build verification

- [ ] **Step 1: Run all frontend checks**

```bash
cd "C:\dev\nexora-desktop"
npx tsc --noEmit && npm run lint && npm test
```

Expected: TypeScript clean, ESLint 0 warnings, all tests pass.

- [ ] **Step 2: Run Rust checks**

```bash
cd "C:\dev\nexora-desktop/src-tauri"
cargo fmt --check && cargo clippy -- -D warnings
```

Expected: no format issues, no clippy warnings.

If clippy warns about `read_thumbnail_base64` not being used: it IS used via Tauri's invoke system, so add `#[allow(dead_code)]` if needed. But typically Tauri commands don't trigger this.

- [ ] **Step 3: Push and monitor CI**

```bash
cd "C:\dev\nexora-desktop"
git push origin dev
```

Monitor via:

```bash
gh run list --limit 5 --json status,name,conclusion,headBranch --jq '.[] | [.status, (.conclusion // "running"), .name, .headBranch] | join(" | ")'
```

Expected: CI — Verificação de Qualidade passes on `dev`.

- [ ] **Step 4: Merge dev → main and fix main CI**

```bash
git checkout main && git merge dev --no-ff -m "fix: media loading + light mode fallback + UpdateModal v0.30.5" && git push origin main && git checkout dev
```

---

## Manual Verification Checklist (after installing build)

After a new release is built and installed on Windows Sandbox:

- [ ] Library page shows thumbnails after video processing completes
- [ ] Clicking on an asset → hero area shows thumbnail image (not Film icon)
- [ ] Clicking play button → video plays with visible frames (not black screen)
- [ ] Comparador tab → both original and processed videos show frames
- [ ] Light mode: main content area background is white (not black)
- [ ] Dark mode: glassmorphism effect still visible where Mica active; solid dark otherwise
- [ ] Auto-update modal: "O que há de novo" section shows actual CHANGELOG content
- [ ] Auto-update: clicking "Actualizar Agora" shows progress bar that visually grows

---

## Notes for implementer

- **`ThumbnailImg` component**: handles the `path` that changes over time (asset gets a thumbnail_path after processing). The `useState` initialiser uses a callback so `convertFileSrc` is called once on mount with the initial path. If the path changes (unlikely but possible), the `src` won't update — this is acceptable for now.

- **Mica flash on startup**: there's a ~100ms window between app load and the `mica-status` event where `data-mica` is undefined. During this time the transparent background CSS applies. On machines without Mica this causes a brief black flash. This is acceptable and typical for platform-adaptive apps. If it becomes noticeable, the fix is to set `data-mica=inactive` as a default in HTML before JS loads.

- **CHANGELOG parsing**: the regex looks for `## v0.30.X` or `## 0.30.X` headers. If the CHANGELOG uses a different format, the fallback message is used. Check `CHANGELOG.md` header format before release.
