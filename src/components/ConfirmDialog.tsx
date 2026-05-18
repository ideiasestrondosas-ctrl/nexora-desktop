/**
 * ConfirmDialog — diálogo de confirmação reutilizável baseado em Radix AlertDialog.
 * Substitui window.confirm() em toda a aplicação.
 */
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** 'danger' = vermelho, 'warning' = amarelo */
  variant?: 'danger' | 'warning';
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  onConfirm,
  loading = false,
}: ConfirmDialogProps) {
  const isDanger = variant === 'danger';

  const handleConfirm = async () => {
    await onConfirm();
    onOpenChange(false);
  };

  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        {/* Overlay */}
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />

        {/* Content */}
        <AlertDialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
            'w-full max-w-md bg-bg-secondary border border-border rounded-2xl shadow-2xl p-6',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            'data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-48%',
            'data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-48%',
          )}
        >
          {/* Ícone */}
          <div
            className={cn(
              'w-12 h-12 rounded-full flex items-center justify-center mb-4',
              isDanger ? 'bg-red-500/10' : 'bg-yellow-500/10',
            )}
          >
            {isDanger ? (
              <Trash2 size={22} className="text-red-500" />
            ) : (
              <AlertTriangle size={22} className="text-yellow-500" />
            )}
          </div>

          <AlertDialog.Title className="text-lg font-black text-text-primary mb-2">
            {title}
          </AlertDialog.Title>

          <AlertDialog.Description className="text-sm text-text-secondary mb-6 leading-relaxed">
            {description}
          </AlertDialog.Description>

          <div className="flex gap-3 justify-end">
            <AlertDialog.Cancel asChild>
              <button
                className="px-5 py-2 bg-surface hover:bg-surface-hover text-text-secondary rounded-xl text-sm font-bold transition-colors"
                disabled={loading}
              >
                {cancelLabel}
              </button>
            </AlertDialog.Cancel>

            <button
              onClick={handleConfirm}
              disabled={loading}
              className={cn(
                'px-5 py-2 rounded-xl text-sm font-bold transition-colors flex items-center gap-2',
                isDanger
                  ? 'bg-red-500 hover:bg-red-600 text-white disabled:opacity-50'
                  : 'bg-yellow-500 hover:bg-yellow-600 text-black disabled:opacity-50',
              )}
            >
              {loading && (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              {confirmLabel}
            </button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
