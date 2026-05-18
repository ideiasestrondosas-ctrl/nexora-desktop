import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { invoke, convertFileSrc } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { open } from '@tauri-apps/plugin-dialog';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import {
  Library,
  Search,
  Filter,
  Grid2X2,
  List,
  Film,
  ExternalLink,
  Trash2,
  Play,
  Plus,
  FolderOpen,
  Download,
} from 'lucide-react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useJobsStore } from '@/store/jobs';
import { logActivity } from '@/lib/activityLog';

interface Asset {
  id: string;
  path: string;
  filename: string;
  status: 'pending' | 'ingesting' | 'qc_passed' | 'processing' | 'done' | 'error';
  size_bytes: number;
  duration_secs: number | null;
  video_codec: string | null;
  width: number | null;
  height: number | null;
  created_at: string;
  thumbnail_path: string | null;
  vmaf_score: number | null;
  output_path: string | null;
}

interface LibraryPageProps {
  /** Chamado quando o utilizador quer importar ficheiros — abre o IngestProfileModal no App.tsx */
  onImportRequest?: (paths: string[]) => void;
  onSelectAsset?: (id: string) => void;
}

export default function LibraryPage({ onImportRequest, onSelectAsset }: LibraryPageProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    return (localStorage.getItem('library-view-mode') as 'grid' | 'list') || 'grid';
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');
  const [loading, setLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [isIngesting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { t } = useTranslation();

  // Estado do modal de confirmação de delete
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    id: string | null;
    multi: boolean;
  }>({ open: false, id: null, multi: false });
  const [deleteLoading, setDeleteLoading] = useState(false);

  const removeJobsByAsset = useJobsStore((s) => s.removeJobsByAsset);

  const fetchAssets = useCallback(async () => {
    try {
      const data = await invoke<Asset[]>('list_assets');
      setAssets(data);
    } catch (error) {
      console.error('Failed to fetch assets:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Listeners Tauri apenas para estado visual de drag — o ingest é gerido pelo App.tsx
  useEffect(() => {
    const unlisteners: Array<Promise<() => void>> = [
      listen('tauri://drag-enter', () => setIsDragging(true)),
      listen('tauri://drag-over', () => setIsDragging(true)),
      listen('tauri://drag-leave', () => setIsDragging(false)),
      listen('tauri://drag-drop', () => setIsDragging(false)),
    ];
    return () => {
      unlisteners.forEach((p) => p.then((fn) => fn()));
    };
  }, []);

  useEffect(() => {
    fetchAssets();
    const interval = setInterval(fetchAssets, 5000);
    return () => clearInterval(interval);
  }, [fetchAssets]);

  useEffect(() => {
    localStorage.setItem('library-view-mode', viewMode);
  }, [viewMode]);

  const handleAddFileDialog = async () => {
    try {
      const selected = await open({
        multiple: true,
        filters: [
          {
            name: t('dropZone.videoFilter'),
            extensions: ['mp4', 'mov', 'mxf', 'avi', 'mkv', 'webm', 'ts', 'm2ts'],
          },
        ],
      });
      if (!selected) return;
      const paths = Array.isArray(selected) ? selected : [selected];
      if (onImportRequest) {
        onImportRequest(paths);
      }
    } catch (err) {
      console.error('Failed to open file dialog:', err);
    }
  };

  const handleAddFolderDialog = async () => {
    try {
      const selected = await open({ directory: true, multiple: true });
      if (!selected) return;
      const dirs = Array.isArray(selected) ? selected : [selected];
      if (onImportRequest) {
        onImportRequest(dirs);
      }
    } catch (err) {
      console.error('Failed to open folder dialog:', err);
    }
  };

  // Fallback HTML drop — ficheiros do SO chegam via 'tauri://drag-drop'; este handler
  // apenas previne o comportamento padrão do browser e repõe o estado visual
  const handleHtmlDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDelete = (id: string) => {
    setDeleteConfirm({ open: true, id, multi: false });
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    setDeleteConfirm({ open: true, id: null, multi: true });
  };

  const executeDelete = async () => {
    setDeleteLoading(true);
    try {
      if (deleteConfirm.multi) {
        // Multi-delete
        await Promise.all(Array.from(selectedIds).map((id) => invoke('delete_asset', { id })));
        // Remover do store local imediatamente
        Array.from(selectedIds).forEach((id) => removeJobsByAsset(id));
        setAssets((prev) => prev.filter((a) => !selectedIds.has(a.id)));
        setSelectedIds(new Set());
        toast.success(
          t('library.deletedSuccessMultiple', { defaultValue: 'Assets apagados com sucesso!' }),
        );
      } else if (deleteConfirm.id) {
        const id = deleteConfirm.id;
        await invoke('delete_asset', { id });
        // Remover do store local imediatamente
        removeJobsByAsset(id);
        setAssets((prev) => prev.filter((a) => a.id !== id));
        setSelectedIds((prev) => {
          const n = new Set(prev);
          n.delete(id);
          return n;
        });
      }
    } catch (error) {
      console.error('Failed to delete asset:', error);
      toast.error(t('library.deleteError'));
    } finally {
      setDeleteLoading(false);
      setDeleteConfirm({ open: false, id: null, multi: false });
    }
  };

  const handleSelect = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredAssets.map((a) => a.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleDownload = async (asset: Asset) => {
    if (!asset.output_path) {
      logActivity(
        'Download Processado (Biblioteca)',
        'attempt',
        `asset_id=${asset.id} sem output_path`,
      );
      toast.warning(t('assetDetail.downloadNoOutput', 'Sem ficheiro processado disponível'));
      return;
    }
    logActivity('Download Processado (Biblioteca)', 'execute', `asset_id=${asset.id}`);
    try {
      const { downloadFile } = await import('@/lib/fileUtils');
      const filename = asset.output_path.split(/[/\\]/).pop() ?? 'output.mp4';
      const dest = await downloadFile(asset.output_path, filename);
      if (dest) {
        toast.success(
          t('assetDetail.downloadSuccess', { path: dest, defaultValue: `Guardado em ${dest}` }),
        );
      }
    } catch (e: unknown) {
      console.error('Download failed:', e);
      toast.error(t('common.error', 'Ocorreu um erro'));
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number | null) => {
    if (seconds === null) return '--:--';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return [
      h > 0 ? h : null,
      m.toString().padStart(h > 0 ? 2 : 1, '0'),
      s.toString().padStart(2, '0'),
    ]
      .filter(Boolean)
      .join(':');
  };

  const filteredAssets = assets
    .filter((a) => {
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      if (searchTerm && !a.filename.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortOrder === 'newest')
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortOrder === 'oldest')
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortOrder === 'name') return a.filename.localeCompare(b.filename);
      if (sortOrder === 'size') return b.size_bytes - a.size_bytes;
      return 0;
    });

  // Referência do contentor de scroll para a vista em lista (virtualização)
  const listParentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: viewMode === 'list' ? filteredAssets.length : 0,
    getScrollElement: () => listParentRef.current,
    estimateSize: () => 57,
    overscan: 8,
  });

  return (
    <div className="flex flex-col flex-1 min-h-0 space-y-4">
      {/* TOOLBAR */}
      <div className="flex flex-wrap items-center gap-3 bg-bg-secondary border border-border rounded-xl p-3 shrink-0">
        {/* Pesquisa */}
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder={t('library.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-bg-primary border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-text-primary outline-none focus:border-brand transition-colors"
          />
        </div>

        {/* Filtros */}
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-text-muted" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-bg-primary border border-border rounded-lg px-3 py-2 text-xs font-bold text-text-secondary outline-none"
          >
            <option value="all">{t('library.allStatuses')}</option>
            <option value="pending">{t('library.pending')}</option>
            <option value="processing">{t('library.processing')}</option>
            <option value="done">{t('library.completed')}</option>
            <option value="error">{t('library.errors')}</option>
          </select>
        </div>

        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          className="bg-bg-primary border border-border rounded-lg px-3 py-2 text-xs font-bold text-text-secondary outline-none"
        >
          <option value="newest">{t('library.newest')}</option>
          <option value="oldest">{t('library.oldest')}</option>
          <option value="name">{t('library.name')}</option>
          <option value="size">{t('library.size')}</option>
        </select>

        {/* Vista grid/lista */}
        <div className="flex bg-bg-primary border border-border rounded-lg p-1">
          <button
            onClick={() => setViewMode('grid')}
            title={t('library.gridView')}
            className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-surface text-brand' : 'text-text-muted hover:text-text-secondary'}`}
          >
            <Grid2X2 size={16} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            title={t('library.listView')}
            className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-surface text-brand' : 'text-text-muted hover:text-text-secondary'}`}
          >
            <List size={16} />
          </button>
        </div>

        {/* Botões de adicionar — sempre visíveis */}
        <div className="flex items-center gap-2 ml-auto">
          {selectedIds.size > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 border border-red-500/30 text-red-500 rounded-lg text-xs font-bold hover:bg-red-500 hover:text-white transition-colors"
            >
              <Trash2 size={14} />
              {t('library.deleteSelected', { defaultValue: `Apagar ${selectedIds.size}` })}
            </button>
          )}
          <button
            onClick={handleAddFolderDialog}
            disabled={isIngesting}
            className="flex items-center gap-1.5 px-3 py-2 bg-bg-primary border border-border text-text-secondary rounded-lg text-xs font-bold hover:border-brand hover:text-brand transition-colors disabled:opacity-50"
          >
            <FolderOpen size={14} />
            {t('dropZone.addFolder')}
          </button>
          <button
            onClick={handleAddFileDialog}
            disabled={isIngesting}
            className="flex items-center gap-1.5 px-3 py-2 bg-brand text-white rounded-lg text-xs font-bold hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            <Plus size={14} />
            {isIngesting ? t('library.adding') : t('library.addVideos')}
          </button>
        </div>
      </div>

      {/* ZONA DE DROP — flex column para garantir altura definida em todos os estados */}
      <div
        className={`flex-1 min-h-0 flex flex-col border-2 border-dashed rounded-2xl transition-all duration-200 ${
          isDragging ? 'border-brand bg-brand/5 scale-[0.995]' : 'border-transparent'
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleHtmlDrop}
      >
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredAssets.length === 0 ? (
          /* Estado vazio */
          <div className="flex-1 flex flex-col items-center justify-center text-text-muted p-12">
            <Library size={64} className="mb-6 opacity-20" />
            <h2 className="text-xl font-bold text-text-primary mb-2">{t('library.noAssets')}</h2>
            <p className="text-sm max-w-xs text-center mb-6">{t('library.dragHint')}</p>
            <button
              onClick={handleAddFileDialog}
              className="px-6 py-2 bg-brand text-white rounded-lg font-bold text-sm"
            >
              {t('library.addVideos')}
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          /* Vista em grelha — scroll próprio, não depende de h-full */
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-1">
              {filteredAssets.map((asset) => (
                <div
                  key={asset.id}
                  className="bg-bg-secondary border border-border rounded-xl overflow-hidden group hover:border-brand/50 transition-all"
                >
                  {/* THUMBNAIL */}
                  <div className="aspect-video bg-bg-primary relative flex items-center justify-center">
                    {/* Checkbox de Seleção */}
                    <div className="absolute top-2 left-2 z-10">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(asset.id)}
                        onChange={(e) => handleSelect(asset.id, e.target.checked)}
                        className="w-4 h-4 rounded border-border bg-bg-secondary text-brand focus:ring-brand cursor-pointer"
                      />
                    </div>

                    {asset.thumbnail_path ? (
                      <img
                        src={convertFileSrc(asset.thumbnail_path)}
                        alt={asset.filename}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <Film size={32} className="text-gray-800" />
                    )}

                    {/* BADGE DE STATUS */}
                    <div
                      className={`absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${
                        asset.status === 'done'
                          ? 'bg-green-500 text-white'
                          : asset.status === 'processing'
                            ? 'bg-brand text-white animate-pulse'
                            : asset.status === 'error'
                              ? 'bg-red-500 text-white'
                              : 'bg-gray-700 text-text-secondary'
                      }`}
                    >
                      {asset.status === 'processing'
                        ? `${t('library.processing')}...`
                        : asset.status === 'done'
                          ? t('library.qcOk')
                          : asset.status === 'pending'
                            ? t('library.pending')
                            : asset.status}
                    </div>

                    {/* VMAF BADGE */}
                    {asset.vmaf_score != null && (
                      <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/60 backdrop-blur-md rounded text-[10px] font-bold text-green-400 border border-green-500/30">
                        VMAF {Number(asset.vmaf_score).toFixed(1)}
                      </div>
                    )}

                    {/* ACÇÕES OVERLAY */}
                    <div className="absolute inset-0 bg-bg-primary/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <button
                        onClick={() => onSelectAsset?.(asset.id)}
                        title={t('queue.viewAsset')}
                        className="p-2 bg-brand text-white rounded-full hover:scale-110 transition-transform"
                      >
                        <ExternalLink size={18} />
                      </button>
                      {(asset.status === 'done' || asset.status === 'error') && (
                        <button
                          title={t('detail.playerOriginal')}
                          className="p-2 bg-white text-black rounded-full hover:scale-110 transition-transform"
                        >
                          <Play size={18} />
                        </button>
                      )}
                      {asset.output_path && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(asset);
                          }}
                          title={t('assetDetail.downloadProcessed', 'Descarregar processado')}
                          className="p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-md transition-colors"
                        >
                          <Download size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(asset.id)}
                        title={t('common.delete')}
                        className="p-2 bg-red-600 text-white rounded-full hover:scale-110 transition-transform"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* INFO */}
                  <div className="p-4">
                    <h3
                      className="font-bold text-text-primary text-sm truncate mb-2 cursor-pointer hover:text-brand transition-colors"
                      title={asset.filename}
                      onClick={() => onSelectAsset?.(asset.id)}
                    >
                      {asset.filename}
                    </h3>
                    <div className="flex items-center justify-between text-[11px] font-bold text-text-muted uppercase tracking-tighter">
                      <span>{formatBytes(asset.size_bytes)}</span>
                      <span>{formatDuration(asset.duration_secs)}</span>
                      <span className="text-text-muted">{asset.video_codec ?? '—'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Vista em lista — virtualizada com TanStack Virtual */
          <div
            ref={listParentRef}
            className="flex-1 bg-bg-secondary border border-border rounded-xl overflow-auto"
          >
            {/* Cabeçalho fixo da tabela */}
            <div className="grid grid-cols-[40px_1fr_auto_auto_auto_auto_auto] gap-0 bg-bg-primary border-b border-border px-6 py-3 text-[10px] font-bold uppercase text-text-muted sticky top-0 z-10 items-center">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={filteredAssets.length > 0 && selectedIds.size === filteredAssets.length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="w-4 h-4 rounded border-border bg-bg-secondary text-brand focus:ring-brand cursor-pointer"
                />
              </div>
              <span>{t('library.file')}</span>
              <span className="px-6">{t('common.status')}</span>
              <span className="px-6">{t('library.size')}</span>
              <span className="px-6">{t('library.duration')}</span>
              <span className="px-6">{t('profiles.codec')}</span>
              <span className="px-6 text-right">{t('library.actions')}</span>
            </div>
            {/* Contentor de scroll virtual */}
            <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const asset = filteredAssets[virtualRow.index];
                return (
                  <div
                    key={virtualRow.key}
                    data-index={virtualRow.index}
                    ref={rowVirtualizer.measureElement}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                    className="grid grid-cols-[40px_1fr_auto_auto_auto_auto_auto] gap-0 items-center border-b border-border hover:bg-surface/30 transition-colors group px-6"
                  >
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(asset.id)}
                        onChange={(e) => handleSelect(asset.id, e.target.checked)}
                        className="w-4 h-4 rounded border-border bg-bg-secondary text-brand focus:ring-brand cursor-pointer"
                      />
                    </div>
                    <div
                      className="flex items-center gap-3 py-4 cursor-pointer group-hover:text-brand transition-colors"
                      onClick={() => onSelectAsset?.(asset.id)}
                    >
                      <Film size={16} className="text-text-muted shrink-0 group-hover:text-brand" />
                      <span className="font-bold text-text-primary truncate max-w-[300px] group-hover:text-brand">
                        {asset.filename}
                      </span>
                    </div>
                    <span
                      className={`px-6 text-[10px] font-black uppercase tracking-widest ${
                        asset.status === 'done'
                          ? 'text-green-500'
                          : asset.status === 'processing'
                            ? 'text-brand'
                            : asset.status === 'error'
                              ? 'text-red-500'
                              : 'text-text-muted'
                      }`}
                    >
                      {asset.status}
                    </span>
                    <span className="px-6 text-text-secondary text-sm">
                      {formatBytes(asset.size_bytes)}
                    </span>
                    <span className="px-6 text-text-secondary text-sm">
                      {formatDuration(asset.duration_secs)}
                    </span>
                    <span className="px-6 text-text-muted font-mono text-xs">
                      {asset.video_codec ?? '—'}
                    </span>
                    <div className="px-6 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onSelectAsset?.(asset.id)}
                        title={t('queue.viewAsset')}
                        className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface rounded"
                      >
                        <ExternalLink size={14} />
                      </button>
                      {asset.output_path && (
                        <button
                          onClick={() => handleDownload(asset)}
                          title={t('assetDetail.downloadProcessed', 'Descarregar processado')}
                          className="p-1.5 text-text-muted hover:text-brand hover:bg-surface rounded transition-colors"
                        >
                          <Download size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(asset.id)}
                        title={t('common.delete')}
                        className="p-1.5 text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* PAGINAÇÃO */}
      <div className="flex items-center justify-between bg-bg-secondary border border-border rounded-xl px-4 py-2 shrink-0">
        <span className="text-xs text-text-muted font-bold uppercase tracking-widest">
          {t('library.showing', { count: filteredAssets.length, total: assets.length })}
        </span>
        <div className="flex gap-2">
          <button
            className="px-3 py-1 bg-surface text-text-muted rounded text-xs font-bold disabled:opacity-30"
            disabled
          >
            {t('common.previous')}
          </button>
          <button className="px-3 py-1 bg-surface text-text-secondary rounded text-xs font-bold">
            {t('common.next')}
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => !loading && setDeleteConfirm((prev) => ({ ...prev, open }))}
        title={
          deleteConfirm.multi
            ? t('library.deleteConfirmMultiple', 'Apagar assets selecionados?')
            : t('library.deleteConfirm', 'Apagar asset?')
        }
        description={
          deleteConfirm.multi
            ? t(
                'library.deleteConfirmMultipleDesc',
                'Esta ação é irreversível. Os ficheiros gerados serão apagados do disco.',
              )
            : t(
                'library.deleteConfirmDesc',
                'Esta ação é irreversível. Os ficheiros gerados serão apagados do disco.',
              )
        }
        confirmLabel={t('common.delete', 'Apagar')}
        cancelLabel={t('common.cancel', 'Cancelar')}
        onConfirm={executeDelete}
        loading={deleteLoading}
      />
    </div>
  );
}
