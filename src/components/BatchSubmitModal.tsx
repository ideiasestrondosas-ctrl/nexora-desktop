import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import * as Dialog from '@radix-ui/react-dialog';
import { invoke } from '@tauri-apps/api/core';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { useTranslation } from 'react-i18next';
import {
  X,
  Film,
  ChevronDown,
  CheckCircle2,
  XCircle,
  Loader2,
  Play,
  AlertTriangle,
  FolderOpen,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { estimateProcessingTime } from '@/lib/estimate';

// ── Types ──────────────────────────────────────────────────────────────────────

interface TranscodeProfile {
  id: string;
  name: string;
  description: string;
  is_system: boolean;
  container: string;
  video_codec: string;
  resolution: string;
  fps: number;
  bitrate_kbps: number | null;
  vmaf_threshold: number;
}

type RowStatus = 'idle' | 'processing' | 'done' | 'error';

interface FileRow {
  path: string;
  filename: string;
  profileId: string;
  status: RowStatus;
  error?: string;
}

export interface BatchSubmitModalProps {
  open: boolean;
  paths: string[];
  defaultProfileId?: string;
  onClose: () => void;
  onComplete: (count: number) => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getProfileDot(name: string): string {
  if (name.includes('broadcast-hd')) return 'bg-purple-500';
  if (name.includes('broadcast-sd')) return 'bg-purple-400';
  if (name.includes('web-4k')) return 'bg-blue-500';
  if (name.includes('web-hd')) return 'bg-brand';
  if (name.includes('proxy')) return 'bg-gray-500';
  if (name.includes('social')) return 'bg-orange-500';
  if (name.includes('archive-hevc')) return 'bg-green-500';
  if (name.includes('web-vp9')) return 'bg-teal-500';
  return 'bg-teal-500';
}

// ── ProfileDropdown ────────────────────────────────────────────────────────────

function ProfileDropdown({
  profiles,
  value,
  onChange,
  compact = false,
}: {
  profiles: TranscodeProfile[];
  value: string;
  onChange: (id: string) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties & { zIndex: number }>({
    zIndex: 9999,
  });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const selected = profiles.find((p) => p.id === value);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => {
          if (!open && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setMenuStyle({
              position: 'fixed',
              top: rect.bottom + 4,
              left: rect.left,
              minWidth: Math.max(rect.width, 180),
              zIndex: 9999,
            });
          }
          setOpen((v) => !v);
        }}
        className={cn(
          'flex items-center gap-1.5 border border-border rounded-lg bg-bg-primary hover:border-brand/50 transition-colors',
          compact ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm',
        )}
      >
        {selected && (
          <span className={cn('w-2 h-2 rounded-full shrink-0', getProfileDot(selected.name))} />
        )}
        <span className="font-medium truncate max-w-[120px]">{selected?.name ?? '—'}</span>
        <ChevronDown
          size={12}
          className={cn('text-text-muted shrink-0 transition-transform', open && 'rotate-180')}
        />
      </button>

      {open &&
        createPortal(
          <>
            {/* pointer-events: auto necessário porque Radix Dialog aplica pointer-events: none no body */}
            <div
              className="fixed inset-0"
              style={{ zIndex: 9998, pointerEvents: 'auto' }}
              onClick={() => setOpen(false)}
            />
            <div
              className="bg-bg-secondary border border-border rounded-xl shadow-2xl max-h-56 overflow-y-auto"
              style={{ ...menuStyle, pointerEvents: 'auto' }}
            >
              {profiles.map((p) => (
                <button
                  key={p.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(p.id);
                    setOpen(false);
                  }}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-bg-hover transition-colors text-sm',
                    value === p.id && 'bg-brand/10 text-brand',
                  )}
                >
                  <span className={cn('w-2 h-2 rounded-full shrink-0', getProfileDot(p.name))} />
                  <span className="font-medium">{p.name}</span>
                </button>
              ))}
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────

export function BatchSubmitModal({
  open,
  paths,
  defaultProfileId = 'web-hd',
  onClose,
  onComplete,
}: BatchSubmitModalProps) {
  const { t } = useTranslation();
  const [profiles, setProfiles] = useState<TranscodeProfile[]>([]);
  const [globalProfileId, setGlobalProfileId] = useState<string>(defaultProfileId);
  const [rows, setRows] = useState<FileRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [outputDir, setOutputDir] = useState<string>('');
  // Valores anteriores para detectar mudanças durante o render (evita setState em useEffect)
  const [prevOpen, setPrevOpen] = useState(false);
  const [prevPaths, setPrevPaths] = useState<string[]>([]);
  if (prevOpen !== open || (open && prevPaths !== paths)) {
    setPrevOpen(open);
    setPrevPaths(paths);
    if (open) {
      setRows(
        paths.map((path) => ({
          path,
          filename: path.split(/[/\\]/).pop() ?? path,
          profileId: globalProfileId,
          status: 'idle',
        })),
      );
    }
  }

  useEffect(() => {
    if (!open) return;
    invoke<Record<string, string>>('get_settings')
      .then((s) => {
        if (s.output_dir) setOutputDir(s.output_dir);
      })
      .catch(() => {});
  }, [open]);

  const handleChangeOutputDir = useCallback(async () => {
    const selected = await openDialog({ directory: true }).catch(() => null);
    if (selected && typeof selected === 'string') {
      await invoke('update_settings', { key: 'output_dir', value: selected }).catch(() => {});
      setOutputDir(selected);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    invoke<TranscodeProfile[]>('list_profiles')
      .then((data) => {
        const sorted = data.sort((a, b) => {
          if (a.is_system && !b.is_system) return -1;
          if (!a.is_system && b.is_system) return 1;
          return a.name.localeCompare(b.name);
        });
        setProfiles(sorted);
        const exists = sorted.some((p) => p.id === defaultProfileId);
        if (!exists && sorted.length > 0) {
          setGlobalProfileId(sorted[0].id);
        }
      })
      .catch(console.error);
  }, [open, defaultProfileId]);

  // Quando o perfil global muda, aplica a todas as linhas ainda não iniciadas
  const handleGlobalProfileChange = useCallback((id: string) => {
    setGlobalProfileId(id);
    setRows((prev) => prev.map((r) => (r.status === 'idle' ? { ...r, profileId: id } : r)));
  }, []);

  const handleRowProfileChange = useCallback((idx: number, id: string) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, profileId: id } : r)));
  }, []);

  const handleSubmitAll = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    let successCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.status !== 'idle') continue;

      setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, status: 'processing' } : r)));

      try {
        const asset = await invoke<{ id: string }>('ingest_asset', { path: row.path });
        await invoke('submit_job', { assetId: asset.id, profile: row.profileId, priority: 0 });
        setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, status: 'done' } : r)));
        successCount++;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setRows((prev) =>
          prev.map((r, idx) => (idx === i ? { ...r, status: 'error', error: msg } : r)),
        );
      }
    }

    setSubmitting(false);

    if (successCount > 0) {
      toast.success(t('batch.successToast', { count: successCount }));
      onComplete(successCount);
    }
  }, [rows, submitting, t, onComplete]);

  const pendingCount = rows.filter((r) => r.status === 'idle').length;
  const doneCount = rows.filter((r) => r.status === 'done').length;
  const errorCount = rows.filter((r) => r.status === 'error').length;

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && !submitting && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 animate-in fade-in duration-200" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50',
            'w-full max-w-2xl bg-bg-secondary border border-border rounded-2xl shadow-2xl',
            'flex flex-col max-h-[85vh] overflow-hidden',
            'animate-in fade-in zoom-in-95 duration-200',
          )}
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand/10 rounded-xl">
                <Film size={20} className="text-brand" />
              </div>
              <div>
                <Dialog.Title className="text-base font-bold text-text-primary">
                  {t('batch.title', { count: paths.length })}
                </Dialog.Title>
                <p className="text-xs text-text-muted mt-0.5">
                  {doneCount > 0 && `${doneCount} ${t('batch.done')} · `}
                  {errorCount > 0 && `${errorCount} ${t('batch.error')} · `}
                  {pendingCount} {t('batch.pending')}
                </p>
              </div>
            </div>
            {!submitting && (
              <Dialog.Close asChild>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors"
                >
                  <X size={18} />
                </button>
              </Dialog.Close>
            )}
          </div>

          {/* Global profile selector + Output dir */}
          <div className="px-6 py-3 border-b border-border bg-bg-primary/50 shrink-0 flex items-center gap-4 flex-wrap">
            <span className="text-xs font-bold text-text-muted uppercase tracking-widest">
              {t('batch.globalProfile')}
            </span>
            {profiles.length > 0 && (
              <ProfileDropdown
                profiles={profiles}
                value={globalProfileId}
                onChange={handleGlobalProfileChange}
              />
            )}
            <div className="ml-auto flex items-center gap-2 min-w-0">
              <FolderOpen size={13} className="text-text-muted shrink-0" />
              <button
                onClick={handleChangeOutputDir}
                title={outputDir || t('batch.outputDirTitle')}
                className="text-xs text-text-muted hover:text-text-primary transition-colors truncate max-w-[200px] text-left"
              >
                {outputDir
                  ? outputDir.split(/[/\\]/).slice(-2).join('/')
                  : t('batch.outputDirDefault')}
              </button>
            </div>
          </div>

          {paths.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-text-muted text-sm py-12">
              <AlertTriangle size={16} className="mr-2" />
              {t('batch.noFiles')}
            </div>
          ) : (
            /* File table */
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-bg-secondary border-b border-border">
                  <tr>
                    <th className="text-left px-4 py-2 text-[10px] font-black uppercase tracking-widest text-text-muted">
                      {t('batch.file')}
                    </th>
                    <th className="text-left px-4 py-2 text-[10px] font-black uppercase tracking-widest text-text-muted w-40">
                      {t('batch.perFile')}
                    </th>
                    <th className="text-right px-4 py-2 text-[10px] font-black uppercase tracking-widest text-text-muted w-24">
                      {t('batch.estimate')}
                    </th>
                    <th className="text-center px-4 py-2 text-[10px] font-black uppercase tracking-widest text-text-muted w-16">
                      {t('batch.status')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((row, i) => (
                    <tr
                      key={row.path}
                      className={cn(
                        'transition-colors',
                        row.status === 'done' && 'opacity-60',
                        row.status === 'error' && 'bg-red-500/5',
                      )}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <Film size={13} className="text-text-muted shrink-0" />
                          <span className="font-medium text-text-primary truncate" title={row.path}>
                            {row.filename}
                          </span>
                        </div>
                        {row.error && (
                          <p className="text-[10px] text-red-400 mt-0.5 truncate">{row.error}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {row.status === 'idle' && profiles.length > 0 ? (
                          <ProfileDropdown
                            profiles={profiles}
                            value={row.profileId}
                            onChange={(id) => handleRowProfileChange(i, id)}
                            compact
                          />
                        ) : (
                          <span className="text-text-muted text-xs">
                            {profiles.find((p) => p.id === row.profileId)?.name ?? row.profileId}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-text-muted tabular-nums">
                        {estimateProcessingTime(row.profileId, null, null)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {row.status === 'idle' && (
                          <span className="w-4 h-4 block mx-auto rounded-full bg-border" />
                        )}
                        {row.status === 'processing' && (
                          <Loader2 size={16} className="animate-spin text-brand mx-auto" />
                        )}
                        {row.status === 'done' && (
                          <CheckCircle2 size={16} className="text-green-500 mx-auto" />
                        )}
                        {row.status === 'error' && (
                          <XCircle size={16} className="text-red-500 mx-auto" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer */}
          <div className="p-4 border-t border-border shrink-0 flex items-center justify-end gap-3 bg-bg-primary/50">
            <button
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
            >
              {t('batch.cancel')}
            </button>
            <button
              onClick={handleSubmitAll}
              disabled={submitting || pendingCount === 0}
              className="px-5 py-2 bg-brand text-white rounded-xl text-sm font-bold hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
              {submitting ? t('batch.processing') : t('batch.processAll', { count: pendingCount })}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
