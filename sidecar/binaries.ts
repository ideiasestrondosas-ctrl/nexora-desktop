import { existsSync } from 'fs';
import { dirname, join } from 'path';

/**
 * Resolve o caminho absoluto do FFmpeg a usar.
 * Ordem de prioridade:
 * 1. Variável de ambiente NEXORA_FFMPEG_PATH (passada pelo Rust no spawn do sidecar)
 * 2. Diretório do sidecar/dist/ (fallback para dev)
 * 3. Nome do comando no PATH ('ffmpeg')
 */
export function getFfmpegPath(): string {
  const envPath = process.env['NEXORA_FFMPEG_PATH'];
  if (envPath && existsSync(envPath)) {
    return envPath;
  }

  // Fallback: procurar ao lado do sidecar (estrutura de dev)
  const sidecarDir = dirname(__dirname); // sidecar/ a partir de sidecar/dist/
  const candidates = [
    join(sidecarDir, 'src-tauri', 'target', 'debug', 'ffmpeg.exe'),
    join(sidecarDir, 'src-tauri', 'target', 'release', 'ffmpeg.exe'),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }

  return 'ffmpeg';
}

/**
 * Resolve o caminho absoluto do FFprobe a usar.
 * Mesma lógica que getFfmpegPath.
 */
export function getFfprobePath(): string {
  const envPath = process.env['NEXORA_FFPROBE_PATH'];
  if (envPath && existsSync(envPath)) {
    return envPath;
  }

  const sidecarDir = dirname(__dirname);
  const candidates = [
    join(sidecarDir, 'src-tauri', 'target', 'debug', 'ffprobe.exe'),
    join(sidecarDir, 'src-tauri', 'target', 'release', 'ffprobe.exe'),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }

  return 'ffprobe';
}
