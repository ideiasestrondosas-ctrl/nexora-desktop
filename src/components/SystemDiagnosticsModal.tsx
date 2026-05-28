import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, CheckCircle, XCircle, AlertTriangle, ExternalLink } from 'lucide-react';
import { openUrl } from '@tauri-apps/plugin-opener';
import { useTranslation } from 'react-i18next';
import { useSystemHealth } from '@/store/systemHealth';

const RELEASES_URL = 'https://github.com/ideiasestrondosas-ctrl/nexora-desktop/releases/latest';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SystemDiagnosticsModal: React.FC<Props> = ({ open, onOpenChange }) => {
  const { t } = useTranslation();
  const { health } = useSystemHealth();

  const items = [
    {
      label: 'FFmpeg',
      ok: health.ffmpegOk,
      detail: health.ffmpegOk ? t('diagnostics.bundled') : t('diagnostics.notFound'),
    },
    {
      label: 'FFprobe',
      ok: health.ffprobeOk,
      detail: health.ffprobeOk ? t('diagnostics.bundled') : t('diagnostics.notFound'),
    },
    {
      label: 'Nexora Engine',
      ok: health.engineOk,
      detail: health.engineOk ? t('diagnostics.bundled') : t('diagnostics.notFound'),
    },
  ];

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-bg-secondary border border-border rounded-xl shadow-2xl p-6 outline-none">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              <Dialog.Title className="text-base font-bold text-text-primary">
                {t('diagnostics.title')}
              </Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <button className="p-1.5 text-text-muted hover:text-text-primary rounded-full hover:bg-bg-hover transition-colors">
                <X className="w-4 h-4" />
              </button>
            </Dialog.Close>
          </div>

          <Dialog.Description className="text-xs text-text-muted mb-4">
            {t('diagnostics.desc')}
          </Dialog.Description>

          <div className="space-y-2 mb-5">
            {items.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between p-3 rounded-lg bg-bg-tertiary border border-border/50"
              >
                <div className="flex items-center gap-2.5">
                  {item.ok ? (
                    <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                  )}
                  <span className="text-sm font-medium text-text-primary">{item.label}</span>
                </div>
                <span className="text-xs text-text-muted">{item.detail}</span>
              </div>
            ))}
          </div>

          {!health.allOk && (
            <button
              onClick={() => openUrl(RELEASES_URL).catch(console.error)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-brand/10 text-brand hover:bg-brand/20 transition-colors text-sm font-semibold"
            >
              <ExternalLink className="w-4 h-4" />
              {t('diagnostics.reinstall')}
            </button>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
