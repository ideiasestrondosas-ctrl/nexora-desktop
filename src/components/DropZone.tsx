import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { open } from '@tauri-apps/plugin-dialog';
import { listen } from '@tauri-apps/api/event';
import { Upload, Plus, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';
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

  // Listeners registados UMA VEZ via eventos Tauri nativos (ADR-D011)
  useEffect(() => {
    const unlisteners: Array<Promise<() => void>> = [
      listen<{ paths: string[] }>('tauri://drag-drop', (event) => {
        setIsDragging(false);
        const paths = event.payload.paths.filter(hasSupportedExtension);
        if (paths.length === 0) {
          toast.error(t('dropZone.noSupportedFiles'));
          return;
        }
        onFilesSelectedRef.current(paths);
      }),
      listen('tauri://drag-enter', () => setIsDragging(true)),
      listen('tauri://drag-leave', () => setIsDragging(false)),
      listen('tauri://drag-over', () => setIsDragging(true)),
    ];

    return () => {
      unlisteners.forEach((p) => p.then((fn) => fn()));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // deps vazias — listeners registados uma única vez; onFilesSelectedRef garante acesso à versão actual

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
      // Directórias são passadas para o pai tratar (scan recursivo via T03 da v0.19.0)
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
          ? 'border-nexora-green bg-nexora-green/5'
          : 'border-gray-300 dark:border-gray-700 hover:border-nexora-blue hover:bg-nexora-blue/5',
        className,
      )}
      onDragOver={(e) => e.preventDefault()}
    >
      <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
        <Upload className="w-8 h-8 text-gray-500 group-hover:text-nexora-blue" />
      </div>

      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {t('dropZone.dropHere')}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {t('dropZone.clickToSelect')}
        </p>
      </div>

      <div className="flex items-center gap-3 mt-2">
        <button
          onClick={handleOpenFileDialog}
          className="flex items-center gap-2 bg-nexora-blue text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t('dropZone.addMedia')}
        </button>
        <button
          onClick={handleOpenFolderDialog}
          className="flex items-center gap-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          <FolderOpen className="w-4 h-4" />
          {t('dropZone.addFolder')}
        </button>
      </div>
    </div>
  );
};
