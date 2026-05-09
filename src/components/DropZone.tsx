import React, { useState, useCallback } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { Upload, FileVideo, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DropZoneProps {
  onFilesSelected: (paths: string[]) => void;
  className?: string;
}

export const DropZone: React.FC<DropZoneProps> = ({ onFilesSelected, className }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleOpenDialog = async () => {
    try {
      const selected = await open({
        multiple: true,
        filters: [{
          name: 'Video',
          extensions: ['mp4', 'mkv', 'mov', 'avi', 'mxf', 'webm']
        }]
      });
      
      if (Array.isArray(selected)) {
        onFilesSelected(selected);
      } else if (selected) {
        onFilesSelected([selected]);
      }
    } catch (err) {
      console.error('Failed to open file dialog:', err);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    // In Tauri, standard drag and drop for files might require specific handling
    // or the 'tauri-plugin-drag-drop'. 
    // For now, we rely on the Click-to-Upload which is safer.
    // If we have tauri events for file drop, we would use them here.
  };

  return (
    <div 
      className={cn(
        "relative group cursor-pointer border-2 border-dashed rounded-xl p-12 transition-all duration-200 flex flex-col items-center justify-center gap-4",
        isDragging 
          ? "border-nexora-green bg-nexora-green/5" 
          : "border-gray-300 dark:border-gray-700 hover:border-nexora-blue hover:bg-nexora-blue/5",
        className
      )}
      onClick={handleOpenDialog}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
        <Upload className="w-8 h-8 text-gray-500 group-hover:text-nexora-blue" />
      </div>
      
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Arraste vídeos para aqui
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Ou clique para seleccionar ficheiros (MP4, MKV, MOV, MXF...)
        </p>
      </div>

      <button className="mt-2 flex items-center gap-2 bg-nexora-blue text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-600 transition-colors">
        <Plus className="w-4 h-4" />
        Adicionar Media
      </button>
    </div>
  );
};
