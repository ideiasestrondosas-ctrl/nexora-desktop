import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import {
  X,
  FolderOpen,
  File,
  Download,
  Trash2,
  AlertTriangle,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';
import type { CloudProfile } from '@/store/cloud';
import { cn } from '@/lib/utils';

interface RemoteFile {
  name: string;
  path: string;
  size: number | null;
  modified: string | null;
  isDir: boolean;
}

interface Props {
  profile: CloudProfile | null;
  onClose: () => void;
}

function formatSize(bytes: number | null): string {
  if (bytes === null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export function CloudFileBrowserModal({ profile, onClose }: Props) {
  const { t } = useTranslation();
  const [currentPath, setCurrentPath] = useState<string>('');
  const [files, setFiles] = useState<RemoteFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [operating, setOperating] = useState(false);

  const load = useCallback(
    async (path: string) => {
      if (!profile) return;
      setLoading(true);
      setError(null);
      setSelected(new Set());
      try {
        const result = await invoke<RemoteFile[]>('cloud_list_files', {
          profileId: profile.id,
          subpath: path || null,
        });
        setFiles(result);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    },
    [profile],
  );

  useEffect(() => {
    if (profile) {
      setCurrentPath('');
      load('');
    }
  }, [profile, load]);

  const navigateTo = (path: string) => {
    setCurrentPath(path);
    load(path);
  };

  const breadcrumbs = currentPath ? currentPath.split('/').filter(Boolean) : [];

  const fileItems = files.filter((f) => !f.isDir);

  const toggleSelect = (path: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === fileItems.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(fileItems.map((f) => f.path)));
    }
  };

  const handleDelete = async (paths: string[]) => {
    if (paths.length === 0) return;
    const ok = window.confirm(
      t('cloudBrowser.confirmDeleteSelected', {
        count: paths.length,
        profile: profile!.name,
      }),
    );
    if (!ok) return;
    setOperating(true);
    try {
      const failed = await invoke<string[]>('cloud_delete_files', {
        profileId: profile!.id,
        paths,
      });
      if (failed.length > 0) {
        toast.error(
          t('cloudBrowser.deletePartialError', {
            count: failed.length,
            names: failed.join(', '),
          }),
        );
      }
      await load(currentPath);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setOperating(false);
    }
  };

  const handleDeleteAll = () => {
    const allFilePaths = fileItems.map((f) => f.path);
    handleDelete(allFilePaths);
  };

  const handleDownload = async (file: RemoteFile) => {
    const dest = await save({ defaultPath: file.name });
    if (!dest) return;
    setOperating(true);
    try {
      await invoke('cloud_download_file', {
        profileId: profile!.id,
        remotePath: file.path,
        localPath: dest,
      });
      toast.success(t('cloudBrowser.downloadSuccess', { name: file.name }));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setOperating(false);
    }
  };

  if (!profile) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="glass-surface border border-border rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <FolderOpen size={20} className="text-brand" />
            <span className="font-bold text-text-primary">{profile.name}</span>
            <span className="text-xs text-text-muted bg-bg-secondary px-2 py-0.5 rounded-full">
              {profile.provider}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center gap-1 px-6 py-2 text-xs text-text-muted border-b border-border shrink-0">
          <button
            data-testid="breadcrumb-root"
            onClick={() => navigateTo('')}
            className="hover:text-text-primary transition-colors"
          >
            /
          </button>
          {breadcrumbs.map((seg, i) => {
            const path = breadcrumbs.slice(0, i + 1).join('/');
            return (
              <span key={path} className="flex items-center gap-1">
                <ChevronRight size={12} />
                <button
                  onClick={() => navigateTo(path)}
                  className="hover:text-text-primary transition-colors"
                >
                  {seg}
                </button>
              </span>
            );
          })}
        </div>

        {/* Barra de ferramentas */}
        <div className="flex items-center justify-between gap-3 px-6 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              data-testid="select-all"
              checked={fileItems.length > 0 && selected.size === fileItems.length}
              onChange={toggleAll}
              className="rounded"
            />
            {selected.size > 0 && (
              <span className="text-xs text-text-secondary">
                {t('cloudBrowser.selected', { count: selected.size })}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleDelete([...selected])}
              disabled={selected.size === 0 || operating}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-bg-secondary border border-border rounded-lg hover:bg-surface text-text-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Trash2 size={13} />
              {t('cloudBrowser.deleteSelected')}
            </button>
            <button
              data-testid="delete-all-btn"
              onClick={handleDeleteAll}
              disabled={fileItems.length === 0 || operating}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-red-500/10 border border-red-500/30 rounded-lg hover:bg-red-500/20 text-red-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <AlertTriangle size={13} />
              {t('cloudBrowser.deleteAll')}
            </button>
            <button
              onClick={() => load(currentPath)}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-bg-secondary border border-border rounded-lg hover:bg-surface text-text-secondary transition-colors"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              {t('cloudBrowser.refresh')}
            </button>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {loading && (
            <div
              data-testid="browser-loading"
              className="h-full flex items-center justify-center text-text-muted"
            >
              <RefreshCw size={24} className="animate-spin" />
            </div>
          )}

          {!loading && error && (
            <div
              data-testid="browser-error"
              className="m-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-start gap-3"
            >
              <AlertTriangle size={18} className="shrink-0 mt-0.5" />
              <div className="flex-1">
                <p>{t('cloudBrowser.connectionError')}</p>
                <p className="text-xs mt-1 text-red-300/70">{error}</p>
                <button
                  onClick={() => load(currentPath)}
                  className="mt-2 text-xs underline hover:no-underline"
                >
                  {t('cloudBrowser.retry')}
                </button>
              </div>
            </div>
          )}

          {!loading && !error && files.length === 0 && (
            <div
              data-testid="browser-empty"
              className="h-full flex flex-col items-center justify-center gap-3 text-text-muted py-16"
            >
              <FolderOpen size={40} className="opacity-30" />
              <p className="text-sm">{t('cloudBrowser.empty')}</p>
            </div>
          )}

          {!loading && !error && files.length > 0 && (
            <>
              {/* Cabeçalho da tabela */}
              <div className="grid grid-cols-[32px_1fr_100px_160px_80px] gap-3 px-6 py-2 text-xs font-semibold text-text-muted border-b border-border bg-bg-secondary sticky top-0">
                <div />
                <div>Nome</div>
                <div className="text-right">{t('cloudBrowser.size')}</div>
                <div>{t('cloudBrowser.modified')}</div>
                <div />
              </div>

              {/* Linhas */}
              {files.map((file) => {
                const isGdoc = file.name.endsWith(' [Google Doc]');
                const isSelected = !file.isDir && selected.has(file.path);
                return (
                  <div
                    key={file.path}
                    className={cn(
                      'grid grid-cols-[32px_1fr_100px_160px_80px] gap-3 px-6 py-2.5 items-center hover:bg-bg-secondary/50 transition-colors text-sm border-b border-border/40',
                      isSelected && 'bg-brand/5',
                    )}
                  >
                    <div>
                      {file.isDir ? (
                        /* Pastas não são seleccionáveis — checkbox desactivado e sempre desmarcado */
                        <input
                          type="checkbox"
                          data-testid={`checkbox-${file.name}`}
                          checked={false}
                          disabled
                          onChange={() => {}}
                          className="rounded opacity-0 pointer-events-none"
                        />
                      ) : (
                        <input
                          type="checkbox"
                          data-testid={`checkbox-${file.name.replace(' [Google Doc]', '')}`}
                          checked={isSelected}
                          onChange={() => toggleSelect(file.path)}
                          className="rounded"
                        />
                      )}
                    </div>
                    <div className="flex items-center gap-2 min-w-0">
                      {file.isDir ? (
                        <button
                          data-testid={`folder-${file.name}`}
                          onClick={() => navigateTo(file.path)}
                          className="flex items-center gap-2 text-text-primary hover:text-brand transition-colors truncate"
                        >
                          <FolderOpen size={15} className="text-brand/70 shrink-0" />
                          <span className="truncate font-medium">{file.name}</span>
                        </button>
                      ) : (
                        <span className="flex items-center gap-2 truncate text-text-secondary">
                          <File size={15} className="shrink-0 opacity-40" />
                          <span className="truncate">{file.name}</span>
                          {isGdoc && (
                            <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded shrink-0">
                              Google Doc
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                    <div className="text-right text-xs text-text-muted font-mono">
                      {formatSize(file.size)}
                    </div>
                    <div className="text-xs text-text-muted truncate">
                      {file.modified ? new Date(file.modified).toLocaleDateString() : '—'}
                    </div>
                    <div className="flex items-center gap-1 justify-end">
                      {!file.isDir && !isGdoc && (
                        <>
                          <button
                            data-testid={`download-btn-${file.name}`}
                            onClick={() => handleDownload(file)}
                            disabled={operating}
                            className="p-1 rounded hover:bg-brand/20 hover:text-brand text-text-muted transition-colors disabled:opacity-40"
                            title={t('cloudBrowser.download')}
                          >
                            <Download size={14} />
                          </button>
                          <button
                            data-testid={`delete-btn-${file.name}`}
                            onClick={() => handleDelete([file.path])}
                            disabled={operating}
                            className="p-1 rounded hover:bg-red-500/20 hover:text-red-400 text-text-muted transition-colors disabled:opacity-40"
                            title={t('cloudBrowser.deleteSelected')}
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Rodapé */}
        <div className="px-6 py-2 border-t border-border text-xs text-text-muted flex items-center justify-between shrink-0">
          <span>
            {files.length} {files.length === 1 ? 'item' : 'itens'} · {currentPath || '/'}
          </span>
        </div>
      </div>
    </div>
  );
}
