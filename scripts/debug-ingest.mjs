import { execFile } from 'child_process';
import { promisify } from 'util';
import { createReadStream } from 'fs';
import { createHash } from 'crypto';
import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';

const execFileAsync = promisify(execFile);
const filePath = 'C:\\Dev\\Video_Testes\\big_buck_bunny_1080p_h264.mov';
const dbPath = process.env.APPDATA + '\\com.nexora.desktop\\nexora.db';

console.log('=== DEBUG INGEST ===');
console.log('Ficheiro:', filePath);

// Passo 1: SHA256
console.log('\n[1] SHA256...');
const t1 = Date.now();
const sha256 = await new Promise((resolve, reject) => {
  const hash = createHash('sha256');
  const stream = createReadStream(filePath);
  stream.on('data', chunk => hash.update(chunk));
  stream.on('end', () => resolve(hash.digest('hex')));
  stream.on('error', reject);
});
console.log(`    OK em ${Date.now()-t1}ms — ${sha256.slice(0,16)}...`);

// Passo 2: ffprobe
console.log('\n[2] ffprobe...');
const t2 = Date.now();
try {
  const { stdout } = await execFileAsync(
    'ffprobe',
    ['-v', 'quiet', '-print_format', 'json', '-show_streams', '-show_format', filePath],
    { timeout: 30_000 }
  );
  const data = JSON.parse(stdout);
  const video = data.streams?.find(s => s.codec_type === 'video');
  const audio = data.streams?.find(s => s.codec_type === 'audio');
  console.log(`    OK em ${Date.now()-t2}ms`);
  console.log(`    codec_video=${video?.codec_name} codec_audio=${audio?.codec_name}`);
  console.log(`    resolucao=${video?.width}x${video?.height} duracao=${data.format?.duration}s`);
} catch (e) {
  console.log(`    ERRO: ${e.message}`);
}

// Passo 3: DB write
console.log('\n[3] DB write...');
const t3 = Date.now();
try {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');

  const id = randomUUID();
  const now = new Date().toISOString();
  db.prepare("INSERT INTO assets (id, path, filename, status, size_bytes, created_at, updated_at) VALUES (?, ?, 'test.mov', 'ingested', 1000, ?, ?)").run(id, filePath, now, now);
  db.prepare("DELETE FROM assets WHERE id = ?").run(id);
  db.close();
  console.log(`    OK em ${Date.now()-t3}ms`);
} catch (e) {
  console.log(`    ERRO: ${e.message}`);
}

// Passo 4: ffmpeg transcode pequena amostra (primeiros 10s)
console.log('\n[4] ffmpeg transcode teste (10s)...');
const t4 = Date.now();
try {
  const out = process.env.TEMP + '\\nexora-debug-test.mp4';
  const { stderr } = await execFileAsync(
    'ffmpeg',
    ['-i', filePath, '-t', '10', '-c:v', 'libx264', '-preset', 'ultrafast',
     '-c:a', 'aac', '-y', out],
    { timeout: 120_000 }
  ).catch(e => ({ stderr: e.stderr || e.message }));
  console.log(`    OK em ${Date.now()-t4}ms → ${out}`);
} catch (e) {
  console.log(`    ERRO: ${e.message}`);
}

console.log('\n=== DONE ===');
