import React, { useState, useEffect, useRef } from 'react';
<<<<<<< HEAD
=======
import { useTranslation } from 'react-i18next';
>>>>>>> dev
import { open } from '@tauri-apps/plugin-dialog';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { Upload, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

interface DropZoneProps {
  onFilesSelected: (paths: string[]) => void;
  className?: string;
}

const VALID_EXTENSIONS = ['.mp4', '.mkv', '.mov', '.mxf', '.avi', '.webm'];

export const DropZone: React.FC<DropZoneProps> = ({ onFilesSelected, className }) => {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);

  // Ref actualizado em cada render sem re-registar o listener
  const onFilesSelectedRef = useRef(onFilesSelected);
  useEffect(() => {
    onFilesSelectedRef.current = onFilesSelected;
  });

  // Listener registado UMA VEZ — evita acumulação de handlers com polling
  useEffect(() => {
    let unlistenFn: (() => void) | null = null;
    let cancelled = false;

    getCurrentWebviewWindow()
      .onDragDropEvent((event) => {
        const { type } = event.payload;
        if (type === 'enter' || type === 'over') {
          setIsDragging(true);
        } else if (type === 'leave') {
          setIsDragging(false);
        } else if (type === 'drop') {
          setIsDragging(false);
          const paths: string[] = (event.payload as { paths?: string[] }).paths ?? [];
          const validPaths = paths.filter((p) => {
            const ext = p.slice(p.lastIndexOf('.')).toLowerCase();
            if (!VALID_EXTENSIONS.includes(ext)) {
<<<<<<< HEAD
              toast.error(`Formato não suportado: ${ext}`);
=======
              toast.error(t('dropZone.unsupportedFormat', { ext }));
>>>>>>> dev
              return false;
            }
            return true;
          });
          if (validPaths.length > 0) {
            onFilesSelectedRef.current(validPaths);
          }
        }
      })
      .then((fn) => {
        if (cancelled) {
          fn();
        } else {
          unlistenFn = fn;
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      unlistenFn?.();
    };
  }, []); // deps vazias — regista exactamente uma vez

  const handleOpenDialog = async () => {
    try {
      const selected = await open({
        multiple: true,
<<<<<<< HEAD
        filters: [{ name: 'Video', extensions: ['mp4', 'mkv', 'mov', 'avi', 'mxf', 'webm'] }],
=======
        filters: [{ name: t('dropZone.videoFilter'), extensions: ['mp4', 'mkv', 'mov', 'avi', 'mxf', 'webm'] }],
>>>>>>> dev
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

  return (
    <div
      className={cn(
        'relative group cursor-pointer border-2 border-dashed rounded-xl p-12 transition-all duration-200 flex flex-col items-center justify-center gap-4',
        isDragging
          ? 'border-nexora-green bg-nexora-green/5'
          : 'border-gray-300 dark:border-gray-700 hover:border-nexora-blue hover:bg-nexora-blue/5',
        className
      )}
      onClick={handleOpenDialog}
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

      <button className="mt-2 flex items-center gap-2 bg-nexora-blue text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-600 transition-colors">
        <Plus className="w-4 h-4" />
        {t('dropZone.addMedia')}
      </button>
    </div>
  );
};
