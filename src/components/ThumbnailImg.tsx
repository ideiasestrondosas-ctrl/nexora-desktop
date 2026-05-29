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
