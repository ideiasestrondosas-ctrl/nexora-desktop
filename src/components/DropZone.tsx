import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { open } from '@tauri-apps/plugin-dialog';
import { listen } from '@tauri-apps/api/event';
import { Upload, Plus, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DropZoneProps {
  onFilesSelected: (paths: string[]) => void;
  className?: string;
}

export const SUPPORTED_EXTENSIONS = [
  '.mp4',
  '.mkv',
  '.mov',
  '.mxf',
  '.avi',
  '.webm',
  '.ts',
  '.m2ts',
] as const;

export function hasSupportedExtension(path: string): boolean {
  const lower = path.toLowerCase();
  return SUPPORTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export const DropZone: React.FC<DropZoneProps> = ({ onFilesSelected, className }) => {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);

  // Ref actualizado em cada render sem re-registar o listener
  const onFilesSelectedRef = useRef(onFilesSelected);
  useEffect(() => {
    onFilesSelectedRef.current = onFilesSelected;
  });

  // Apenas estado visual (enter/leave/over/drop) — o ingest real é gerido centralmente
  // no App.tsx via IngestProfileModal. Nenhum listener tauri://drag-drop processa ficheiros aqui.
  useEffect(() => {
    const unlisteners: Array<Promise<() => void>> = [
      listen('tauri://drag-enter', () => setIsDragging(true)),
      listen('tauri://drag-over', () => setIsDragging(true)),
      listen('tauri://drag-leave', () => setIsDragging(false)),
      listen('tauri://drag-drop', () => setIsDragging(false)),
    ];

    return () => {
      unlisteners.forEach((p) => p.then((fn) => fn()));
    };
  }, []);

  const handleOpenFileDialog = async () => {
    try {
      const selected = await open({
        multiple: true,
        filters: [
          {
            name: t('dropZone.videoFilter'),
            extensions: ['mp4', 'mkv', 'mov', 'avi', 'mxf', 'webm', 'ts', 'm2ts'],
          },
        ],
      });
      if (Array.isArray(selected)) {
        onFilesSelectedRef.current(selected);
      } else if (selected) {
        onFilesSelectedRef.current([selected]);
      }
    } catch (err) {
      console.error('Failed to open file dialog:', err);
    }
  };

  const handleOpenFolderDialog = async () => {
    try {
      const selected = await open({ directory: true, multiple: true });
      if (!selected) return;
      const dirs = Array.isArray(selected) ? selected : [selected];
      onFilesSelectedRef.current(dirs);
    } catch (err) {
      console.error('Failed to open folder dialog:', err);
    }
  };

  return (
    <div
      className={cn(
        'relative group border-2 border-dashed rounded-xl p-12 transition-all duration-200 flex flex-col items-center justify-center gap-4',
        isDragging
          ? 'border-brand bg-brand/5'
          : 'border-border hover:border-brand hover:bg-brand/5',
        className,
      )}
      onDragOver={(e) => e.preventDefault()}
    >
      <div className="w-16 h-16 rounded-full bg-bg-secondary flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
        <Upload className="w-8 h-8 text-text-muted group-hover:text-brand" />
      </div>

      <div className="text-center">
        <h3 className="text-lg font-semibold text-text-primary">
          {t('dropZone.dropHere')}
        </h3>
        <p className="text-sm text-text-muted mt-1">
          {t('dropZone.clickToSelect')}
        </p>
      </div>

      <div className="flex items-center gap-3 mt-2">
        <button
          onClick={handleOpenFileDialog}
          className="flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t('dropZone.addMedia')}
        </button>
        <button
          onClick={handleOpenFolderDialog}
          className="flex items-center gap-2 bg-bg-secondary border border-border text-text-secondary px-4 py-2 rounded-lg font-medium hover:border-brand hover:text-brand transition-colors"
        >
          <FolderOpen className="w-4 h-4" />
          {t('dropZone.addFolder')}
        </button>
      </div>
    </div>
  );
};
