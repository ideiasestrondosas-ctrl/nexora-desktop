import { useState, useCallback, useRef, useEffect } from 'react';
import { invoke, convertFileSrc } from '@tauri-apps/api/core';

function mimeFromPath(path: string): string {
  const ext = path.toLowerCase().split('.').pop() ?? '';
  const map: Record<string, string> = {
    mp4: 'video/mp4',
    webm: 'video/webm',
    mov: 'video/quicktime',
    avi: 'video/x-msvideo',
    mkv: 'video/x-matroska',
    m4v: 'video/mp4',
  };
  return map[ext] ?? 'video/mp4';
}

export function useVideoSrc(path: string | null): {
  src: string | null;
  tooLarge: boolean;
  onError: () => void;
} {
  const [src, setSrc] = useState<string | null>(() => (path ? convertFileSrc(path) : null));
  const [tooLarge, setTooLarge] = useState(false);
  const triedIpc = useRef(false);

  useEffect(() => {
    setSrc(path ? convertFileSrc(path) : null);
    setTooLarge(false);
    triedIpc.current = false;
  }, [path]);

  const onError = useCallback(async () => {
    if (!path || triedIpc.current) return;
    triedIpc.current = true;
    try {
      const b64 = await invoke<string>('read_video_base64', { path });
      setSrc(`data:${mimeFromPath(path)};base64,${b64}`);
    } catch (e: unknown) {
      const msg = String(e);
      if (msg.includes('FILE_TOO_LARGE')) {
        setTooLarge(true);
      }
      setSrc(null);
    }
  }, [path]);

  return { src, tooLarge, onError };
}
