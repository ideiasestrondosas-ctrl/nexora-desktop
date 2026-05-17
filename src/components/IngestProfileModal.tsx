/**
 * IngestProfileModal — Modal de selecção de perfil antes do ingest.
 *
 * Aparece sempre que o utilizador arrasta ficheiros ou usa o diálogo de ficheiros.
 * Permite escolher o perfil de transcodificação antes de submeter jobs,
 * ou importar sem processar. Substitui o ingest automático com perfil hardcoded.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { invoke } from '@tauri-apps/api/core';
import { useTranslation } from 'react-i18next';
import {
  X,
  Film,
  ChevronDown,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Play,
  Import,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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

// Codecs que o QCPreWorker manda para quarentena — avisamos o utilizador
const QUARANTINE_CODECS = ['prores', 'dnxhd', 'av1'];

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getFileSize(path: string): number {
  // Tauri não expõe stat directamente no frontend; usamos 0 como fallback.
  // O tamanho real é obtido em ingest_asset no Rust.
  void path;
  return 0;
}

// ── Profile colour helpers ─────────────────────────────────────────────────────

function getProfileDot(name: string): string {
  if (name.includes('broadcast-hd')) return 'bg-purple-500';
  if (name.includes('broadcast-sd')) return 'bg-purple-400';
  if (name.includes('web-4k')) return 'bg-blue-500';
  if (name.includes('web-hd')) return 'bg-brand';
  if (name.includes('proxy')) return 'bg-gray-500';
  if (name.includes('social')) return 'bg-orange-500';
  return 'bg-teal-500';
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface IngestProfileModalProps {
  /** Paths a importar. null = modal fechado. */
  paths: string[] | null;
  /** Callback quando o modal fecha (cancelado ou concluído). */
  onClose: () => void;
  /** Callback quando o ingest+job foi submetido com sucesso. */
  onComplete: (count: number) => void;
  /** Perfil padrão pré-seleccionado (do store de settings). */
  defaultProfileId?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function IngestProfileModal({
  paths,
  onClose,
  onComplete,
  defaultProfileId = 'web-hd',
}: IngestProfileModalProps) {
  const { t } = useTranslation();
  const [profiles, setProfiles] = useState<TranscodeProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>(defaultProfileId);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [analyzeOnly, setAnalyzeOnly] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showAllFiles, setShowAllFiles] = useState(false);

  const { hasSupportedExtension, detectPossibleQuarantine } = useMemo(
    () => ({
      hasSupportedExtension: (p: string) => {
        const ext = p.split('.').pop()?.toLowerCase();
        return ['mp4', 'mkv', 'mov', 'mxf', 'avi', 'm4v', 'ts', 'webm'].includes(ext || '');
      },
      detectPossibleQuarantine: (name: string) => {
        const n = name.toLowerCase();
        return QUARANTINE_CODECS.some((c) => n.includes(c));
      },
    }),
    [],
  );

  const validPaths = useMemo(
    () => paths?.filter(hasSupportedExtension) ?? [],
    [paths, hasSupportedExtension],
  );
  const invalidPaths = useMemo(
    () => paths?.filter((p) => !hasSupportedExtension(p)) ?? [],
    [paths, hasSupportedExtension],
  );
  const hasQuarantineRisk = useMemo(
    () => validPaths.some((p) => detectPossibleQuarantine(p.split(/[/\\]/).pop() ?? '')),
    [validPaths, detectPossibleQuarantine],
  );

  // Carregar perfis disponíveis
  useEffect(() => {
    if (!paths) return;
    invoke<TranscodeProfile[]>('list_profiles')
      .then((data) => {
        const sorted = data.sort((a, b) => {
          if (a.is_system && !b.is_system) return -1;
          if (!a.is_system && b.is_system) return 1;
          return a.name.localeCompare(b.name);
        });
        setProfiles(sorted);
        // Se o perfil padrão existe, mantê-lo; se não, usar o primeiro disponível
        const exists = sorted.some((p) => p.id === defaultProfileId);
        if (!exists && sorted.length > 0) {
          setSelectedProfileId(sorted[0].id);
        } else {
          setSelectedProfileId(defaultProfileId);
        }
      })
      .catch((e) => console.error('list_profiles failed:', e));
  }, [paths, defaultProfileId]);

  const selectedProfile = profiles.find((p) => p.id === selectedProfileId) ?? null;

  const handleSubmit = useCallback(
    async (withProcessing: boolean) => {
      if (validPaths.length === 0) return;
      setSubmitting(true);

      let ingested = 0;
      const errors: string[] = [];

      for (const path of validPaths) {
        try {
          const asset = await invoke<{ id: string }>('ingest_asset', { path });
          if (withProcessing && !analyzeOnly && selectedProfile) {
            await invoke('submit_job', {
              assetId: asset.id,
              profile: selectedProfile.id,
              priority: 0,
            });
          }
          ingested++;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push(msg);
          console.error('Ingest/submit failed:', path, msg);
        }
      }

      setSubmitting(false);

      if (errors.length > 0) {
        toast.error(t('library.addError', { message: errors[0] }));
      }
      if (ingested > 0) {
        const msg =
          withProcessing && !analyzeOnly
            ? t('ingestModal.successProcess', { count: ingested })
            : t('ingestModal.successImport', { count: ingested });
        toast.success(msg);
        onComplete(ingested);
      }
      onClose();
    },
    [validPaths, analyzeOnly, selectedProfile, t, onComplete, onClose],
  );

  const isOpen = paths !== null && paths.length > 0;
  const displayFiles = showAllFiles ? validPaths : validPaths.slice(0, 5);

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        {/* Overlay */}
        <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 animate-in fade-in duration-200" />

        {/* Content */}
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50',
            'w-full max-w-lg bg-bg-secondary border border-border rounded-2xl shadow-2xl',
            'flex flex-col max-h-[90vh] overflow-hidden',
            'animate-in fade-in zoom-in-95 duration-200',
          )}
          onPointerDownOutside={(e) => e.preventDefault()} // evitar fecho acidental
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand/10 rounded-xl">
                <Import size={20} className="text-brand" />
              </div>
              <div>
                <Dialog.Title className="text-base font-bold text-text-primary">
                  {t('ingestModal.title')}
                </Dialog.Title>
                <p className="text-xs text-text-muted mt-0.5">
                  {t('ingestModal.filesSelected', { count: validPaths.length })}
                </p>
              </div>
            </div>
            <Dialog.Close asChild>
              <button className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors">
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>

          {/* Body — scrollable */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Ficheiros inválidos */}
            {invalidPaths.length > 0 && (
              <div className="flex items-start gap-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-sm text-yellow-400">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <p>
                  {t('ingestModal.invalidFiles', { count: invalidPaths.length })}{' '}
                  <span className="font-mono text-[11px] opacity-70">
                    ({invalidPaths.map((p) => p.split(/[/\\]/).pop()).join(', ')})
                  </span>
                </p>
              </div>
            )}

            {/* Aviso quarentena */}
            {hasQuarantineRisk && (
              <div className="flex items-start gap-3 p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl text-sm text-orange-400">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <p>{t('ingestModal.quarantineWarning')}</p>
              </div>
            )}

            {/* Lista de ficheiros */}
            <div>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-2">
                {t('ingestModal.fileList')}
              </h3>
              <div className="bg-bg-primary border border-border rounded-xl overflow-hidden">
                {displayFiles.map((path) => {
                  const name = path.split(/[/\\]/).pop() ?? path;
                  const size = getFileSize(path);
                  return (
                    <div
                      key={path}
                      className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0"
                    >
                      <Film size={14} className="text-text-muted shrink-0" />
                      <span className="flex-1 text-sm text-text-primary truncate font-medium">
                        {name}
                      </span>
                      {size > 0 && (
                        <span className="text-xs text-text-muted shrink-0">
                          {formatBytes(size)}
                        </span>
                      )}
                    </div>
                  );
                })}
                {validPaths.length > 5 && !showAllFiles && (
                  <button
                    onClick={() => setShowAllFiles(true)}
                    className="w-full text-xs text-brand py-2 hover:bg-bg-hover transition-colors"
                  >
                    {t('ingestModal.showMore', { count: validPaths.length - 5 })}
                  </button>
                )}
              </div>
            </div>

            {/* Selecção de perfil */}
            <div>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-2">
                {t('ingestModal.selectProfile')}
              </h3>

              {/* Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setProfileDropdownOpen((v) => !v)}
                  className="w-full flex items-center justify-between gap-3 bg-bg-primary border border-border hover:border-brand/50 rounded-xl px-4 py-3 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {selectedProfile && (
                      <span
                        className={cn(
                          'w-2.5 h-2.5 rounded-full shrink-0',
                          getProfileDot(selectedProfile.name),
                        )}
                      />
                    )}
                    <div className="text-left min-w-0">
                      <div className="text-sm font-bold text-text-primary truncate">
                        {selectedProfile?.name ?? t('profiles.selectProfile')}
                      </div>
                      {selectedProfile && (
                        <div className="text-[10px] text-text-muted truncate">
                          {selectedProfile.description}
                        </div>
                      )}
                    </div>
                  </div>
                  <ChevronDown
                    size={16}
                    className={cn(
                      'text-text-muted shrink-0 transition-transform',
                      profileDropdownOpen && 'rotate-180',
                    )}
                  />
                </button>

                {profileDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setProfileDropdownOpen(false)}
                    />
                    <div className="absolute top-full left-0 right-0 mt-2 bg-bg-secondary border border-border rounded-xl shadow-2xl z-20 max-h-56 overflow-y-auto">
                      {/* Predefinidos */}
                      <div className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-text-muted">
                        {t('profiles.predefined')}
                      </div>
                      {profiles
                        .filter((p) => p.is_system)
                        .map((p) => (
                          <button
                            key={p.id}
                            onClick={() => {
                              setSelectedProfileId(p.id);
                              setProfileDropdownOpen(false);
                            }}
                            className={cn(
                              'w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-bg-hover transition-colors',
                              selectedProfileId === p.id && 'bg-brand/10',
                            )}
                          >
                            <span
                              className={cn('w-2 h-2 rounded-full shrink-0', getProfileDot(p.name))}
                            />
                            <div className="min-w-0">
                              <div className="text-sm font-bold text-text-primary truncate">
                                {p.name}
                              </div>
                              <div className="text-[10px] text-text-muted truncate">
                                {p.description}
                              </div>
                            </div>
                            <Lock size={10} className="text-text-muted shrink-0 ml-auto" />
                          </button>
                        ))}
                      {/* Personalizados */}
                      {profiles.some((p) => !p.is_system) && (
                        <>
                          <div className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-text-muted border-t border-border">
                            {t('profiles.custom')}
                          </div>
                          {profiles
                            .filter((p) => !p.is_system)
                            .map((p) => (
                              <button
                                key={p.id}
                                onClick={() => {
                                  setSelectedProfileId(p.id);
                                  setProfileDropdownOpen(false);
                                }}
                                className={cn(
                                  'w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-bg-hover transition-colors',
                                  selectedProfileId === p.id && 'bg-brand/10',
                                )}
                              >
                                <span
                                  className={cn(
                                    'w-2 h-2 rounded-full shrink-0',
                                    getProfileDot(p.name),
                                  )}
                                />
                                <div className="min-w-0">
                                  <div className="text-sm font-bold text-text-primary truncate">
                                    {p.name}
                                  </div>
                                  <div className="text-[10px] text-text-muted truncate">
                                    {p.description}
                                  </div>
                                </div>
                                <CheckCircle2
                                  size={10}
                                  className="text-teal-500 shrink-0 ml-auto"
                                />
                              </button>
                            ))}
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Preview do perfil seleccionado */}
              {selectedProfile && (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {[
                    {
                      label: t('profiles.codec'),
                      value: selectedProfile.video_codec.toUpperCase(),
                    },
                    { label: t('profiles.resolution'), value: selectedProfile.resolution },
                    {
                      label: t('profiles.bitrate'),
                      value: selectedProfile.bitrate_kbps
                        ? `${(selectedProfile.bitrate_kbps / 1000).toFixed(0)} Mbps`
                        : t('profiles.auto'),
                    },
                    { label: 'VMAF ≥', value: String(selectedProfile.vmaf_threshold) },
                    {
                      label: 'FPS',
                      value: selectedProfile.fps ? `${selectedProfile.fps}` : 'Source',
                    },
                    {
                      label: t('profiles.container'),
                      value: selectedProfile.container.toUpperCase(),
                    },
                  ].map(({ label, value }) => (
                    <div
                      key={label}
                      className="bg-bg-primary border border-border rounded-lg px-3 py-2"
                    >
                      <div className="text-[9px] font-black uppercase tracking-widest text-text-muted">
                        {label}
                      </div>
                      <div className="text-xs font-bold text-text-primary mt-0.5">{value}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Opção: apenas analisar */}
            <label className="flex items-center gap-3 cursor-pointer group">
              <div
                onClick={() => setAnalyzeOnly((v) => !v)}
                className={cn(
                  'w-10 h-5 rounded-full transition-colors relative',
                  analyzeOnly ? 'bg-brand' : 'bg-border',
                )}
              >
                <div
                  className={cn(
                    'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
                    analyzeOnly ? 'translate-x-5' : 'translate-x-0.5',
                  )}
                />
              </div>
              <div>
                <div className="text-sm font-bold text-text-primary">
                  {t('ingestModal.analyzeOnly')}
                </div>
                <div className="text-[10px] text-text-muted">
                  {t('ingestModal.analyzeOnlyHint')}
                </div>
              </div>
            </label>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border shrink-0 flex items-center justify-end gap-3 bg-bg-primary/50">
            <button
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={() => handleSubmit(false)}
              disabled={submitting || validPaths.length === 0}
              className="px-4 py-2 bg-bg-secondary border border-border text-text-secondary rounded-xl text-sm font-bold hover:border-brand hover:text-brand transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Import size={14} />}
              {t('ingestModal.importOnly')}
            </button>
            <button
              onClick={() => handleSubmit(true)}
              disabled={submitting || validPaths.length === 0 || (!analyzeOnly && !selectedProfile)}
              className="px-5 py-2 bg-brand text-white rounded-xl text-sm font-bold hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
              {analyzeOnly ? t('ingestModal.analyzeBtn') : t('ingestModal.importProcess')}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
