import React, { useState, useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Download, RefreshCw, X } from 'lucide-react';
import { relaunch } from '@tauri-apps/plugin-process';
import { useTranslation } from 'react-i18next';
import type { Update } from '@tauri-apps/plugin-updater';

interface Props {
  update: Update;
  open: boolean;
  onClose: () => void;
}

export const UpdateModal: React.FC<Props> = ({ update, open, onClose }) => {
  const { t } = useTranslation();
  const [state, setState] = useState<'idle' | 'downloading' | 'installing' | 'done' | 'error'>(
    'idle',
  );
  const [progress, setProgress] = useState(0);
  const [totalSize, setTotalSize] = useState(0);
  const [downloaded, setDownloaded] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const isDev = import.meta.env.DEV;
  // Ref para evitar stale closure no callback de downloadAndInstall
  const totalSizeRef = useRef(0);

  const handleUpdate = async () => {
    setState('downloading');
    setProgress(0);
    totalSizeRef.current = 0;
    try {
      await update.downloadAndInstall((event) => {
        if (event.event === 'Started') {
          totalSizeRef.current = event.data.contentLength ?? 0;
          setTotalSize(totalSizeRef.current);
        } else if (event.event === 'Progress') {
          setDownloaded((prev) => {
            const next = prev + (event.data.chunkLength ?? 0);
            if (totalSizeRef.current > 0) {
              setProgress(Math.round((next / totalSizeRef.current) * 100));
            }
            return next;
          });
        } else if (event.event === 'Finished') {
          setState('installing');
        }
      });
      setState('done');
      if (isDev) {
        // relaunch() não funciona em dev mode — informar apenas
        return;
      }
      await relaunch();
    } catch (e: unknown) {
      setState('error');
      setErrorMsg(e instanceof Error ? e.message : String(e));
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const mb = bytes / (1024 * 1024);
    return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
  };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && state === 'idle' && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 glass-surface border border-border rounded-xl shadow-2xl w-[480px] max-w-[90vw] p-6 focus:outline-none">
          {/* Header */}
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Download className="w-5 h-5 text-blue-400" />
              </div>
              <Dialog.Title className="text-lg font-semibold text-text-primary">
                {t('update.title')}
              </Dialog.Title>
            </div>
            {state === 'idle' && (
              <Dialog.Close asChild>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-md hover:bg-bg-hover text-text-muted"
                  aria-label="Fechar"
                >
                  <X className="w-4 h-4" />
                </button>
              </Dialog.Close>
            )}
          </div>

          {/* Versões */}
          <div className="flex items-center gap-3 mb-5 p-3 rounded-lg bg-bg-secondary border border-border">
            <div className="flex-1 text-center">
              <p className="text-xs text-text-muted mb-1">{t('update.currentVersion')}</p>
              <p className="text-sm font-mono font-medium text-text-primary">
                v{update.currentVersion}
              </p>
            </div>
            <div className="text-text-muted">→</div>
            <div className="flex-1 text-center">
              <p className="text-xs text-text-muted mb-1">{t('update.newVersion')}</p>
              <p className="text-sm font-mono font-medium text-green-400">v{update.version}</p>
            </div>
          </div>

          {/* Notas de release */}
          {update.body && (
            <div className="mb-5">
              <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
                {t('update.whatsNew')}
              </p>
              <div className="text-sm text-text-secondary bg-bg-secondary border border-border rounded-lg p-3 max-h-40 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                {update.body}
              </div>
            </div>
          )}

          {/* Progresso de download */}
          {(state === 'downloading' || state === 'installing') && (
            <div className="mb-5">
              <div className="flex justify-between text-xs text-text-muted mb-1.5">
                <span>
                  {state === 'installing' ? t('update.installing') : t('update.downloading')}
                </span>
                {totalSize > 0 && state === 'downloading' && (
                  <span>
                    {formatBytes(downloaded)} / {formatBytes(totalSize)}
                  </span>
                )}
              </div>
              <div className="w-full bg-bg-secondary rounded-full h-1.5">
                <div
                  className="bg-blue-500 h-1.5 rounded-full transition-[width] duration-300 ease-out"
                  style={{ width: state === 'installing' ? '100%' : `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Erro */}
          {state === 'error' && (
            <p className="text-sm text-red-400 mb-4">
              {t('update.downloadError')}: {errorMsg}
            </p>
          )}

          {/* Dev mode warning */}
          {state === 'done' && isDev && (
            <p className="text-sm text-yellow-400 mb-4">{t('update.devModeRestart')}</p>
          )}

          {/* Botões */}
          <div className="flex gap-3 justify-end">
            {state === 'idle' && (
              <>
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-bg-hover text-text-secondary transition-colors"
                >
                  {t('update.later')}
                </button>
                <button
                  onClick={handleUpdate}
                  className="px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  {t('update.updateNow')}
                </button>
              </>
            )}
            {state === 'error' && (
              <>
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-bg-hover text-text-secondary transition-colors"
                >
                  {t('update.later')}
                </button>
                <button
                  onClick={handleUpdate}
                  className="px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  {t('update.retry')}
                </button>
              </>
            )}
            {(state === 'downloading' || state === 'installing') && (
              <button
                disabled
                className="px-4 py-2 text-sm rounded-lg bg-blue-600/50 text-white/50 cursor-not-allowed flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4 animate-spin" />
                {state === 'installing' ? t('update.installing') : t('update.downloading')}
              </button>
            )}
            {state === 'done' && !isDev && (
              <button
                disabled
                className="px-4 py-2 text-sm rounded-lg bg-green-600/50 text-white/50 cursor-not-allowed"
              >
                {t('update.restarting')}
              </button>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
