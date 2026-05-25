import { getCurrentWindow } from '@tauri-apps/api/window';
import { Minus, Square, X } from 'lucide-react';
import { usePlatform } from '@/hooks/usePlatform';
import { cn } from '@/lib/utils';

export default function WindowControls() {
  const { isMac, isWindows } = usePlatform();
  const win = getCurrentWindow();

  // macOS: espaço para os traffic lights nativos do Tauri (76px à esquerda da TopBar)
  if (isMac) {
    return <div className="w-[76px] flex-shrink-0" aria-hidden />;
  }

  const handleMinimize = () => void win.minimize();
  const handleMaximize = () => void win.toggleMaximize();
  const handleClose = () => void win.close();

  return (
    <div className="flex items-stretch h-full ml-1" data-tauri-drag-region="false">
      <button
        onClick={handleMinimize}
        className={cn(
          'w-11 flex items-center justify-center text-text-muted transition-colors',
          isWindows
            ? 'hover:bg-neutral-200/60 dark:hover:bg-white/10 rounded-none'
            : 'hover:bg-muted rounded-none',
        )}
        title="Minimizar"
        aria-label="Minimizar janela"
      >
        <Minus size={14} />
      </button>

      <button
        onClick={handleMaximize}
        className={cn(
          'w-11 flex items-center justify-center text-text-muted transition-colors',
          isWindows
            ? 'hover:bg-neutral-200/60 dark:hover:bg-white/10 rounded-none'
            : 'hover:bg-muted rounded-none',
        )}
        title="Maximizar"
        aria-label="Maximizar/restaurar janela"
      >
        <Square size={12} />
      </button>

      <button
        onClick={handleClose}
        className={cn(
          'w-11 flex items-center justify-center text-text-muted transition-colors rounded-none',
          isWindows ? 'hover:bg-red-500 hover:text-white dark:hover:bg-red-600' : 'hover:bg-muted',
        )}
        title="Fechar"
        aria-label="Fechar janela"
      >
        <X size={14} />
      </button>
    </div>
  );
}
