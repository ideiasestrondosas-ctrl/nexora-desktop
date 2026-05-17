import { invoke } from '@tauri-apps/api/core';

const VIDEO_EXTENSIONS = ['mp4', 'mov', 'mxf', 'avi', 'mkv', 'webm', 'ts', 'm2ts', 'm4v'];

export function isVideoPath(path: string): boolean {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  return VIDEO_EXTENSIONS.includes(ext);
}

export async function resolveVideoPaths(paths: string[]): Promise<string[]> {
  const resolved: string[] = [];

  for (const path of paths) {
    if (isVideoPath(path)) {
      resolved.push(path);
    } else {
      try {
        const found = await invoke<string[]>('scan_directory', { path });
        resolved.push(...found);
      } catch {
        // Caminho não reconhecido — ignorar silenciosamente
      }
    }
  }

  return [...new Set(resolved)];
}
