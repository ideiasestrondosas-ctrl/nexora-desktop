import fs from 'node:fs';
import path from 'node:path';

export function isSupportedVideo(filePath, extensions) {
  return extensions.includes(path.extname(filePath).toLowerCase());
}

function walkFiles(dir) {
  const found = [];
  if (!fs.existsSync(dir)) return found;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...walkFiles(full));
    } else {
      found.push(full);
    }
  }
  return found;
}

export function discoverVideos(repoRoot, config, explicitDir = null) {
  const extensions = config.supportedVideoExtensions;
  const candidates = [];
  const defaultFixture = path.resolve(repoRoot, 'qa-runner', config.defaultFixture);
  const optionalDir = path.resolve(repoRoot, 'qa-runner', config.optionalVideoDirectory);

  if (fs.existsSync(defaultFixture) && isSupportedVideo(defaultFixture, extensions)) {
    candidates.push(defaultFixture);
  }

  for (const dir of [optionalDir, explicitDir].filter(Boolean)) {
    for (const file of walkFiles(dir)) {
      if (isSupportedVideo(file, extensions)) candidates.push(file);
    }
  }

  return [...new Set(candidates)];
}

export function prepareQaVideos(videos, runDir, targetCopies = 1) {
  const inputDir = path.join(runDir, 'qa-input');
  fs.mkdirSync(inputDir, { recursive: true });

  if (videos.length === 0) return [];

  const copies = [];
  for (let i = 0; i < targetCopies; i += 1) {
    const source = videos[i % videos.length];
    const ext = path.extname(source);
    const base = path.basename(source, ext).replace(/[^a-zA-Z0-9._-]/g, '_');
    const dest = path.join(inputDir, `${String(i + 1).padStart(3, '0')}-${base}${ext}`);
    fs.copyFileSync(source, dest);
    copies.push({ source, dest, sizeBytes: fs.statSync(dest).size });
  }
  return copies;
}
