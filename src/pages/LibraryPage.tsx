import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { invoke } from '@tauri-apps/api/core';
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
} from 'lucide-react';
import { hasSupportedExtension } from '@/components/DropZone';

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
}

const DEFAULT_PROFILE = 'web-hd';

export default function LibraryPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    return (localStorage.getItem('library-view-mode') as 'grid' | 'list') || 'grid';
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');
  const [loading, setLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [isIngesting, setIsIngesting] = useState(false);
  const { t } = useTranslation();

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

  // Ingerir lista de paths e submeter jobs automaticamente
  const ingestPaths = useCallback(
    async (paths: string[]) => {
      const validPaths = paths.filter(hasSupportedExtension);
      if (validPaths.length === 0) {
        toast.error(t('dropZone.noSupportedFiles'));
        return;
      }

      setIsIngesting(true);
      let ingested = 0;
      const errors: string[] = [];

      for (const path of validPaths) {
        try {
          const asset = await invoke<Asset>('ingest_asset', { path });
          // Submeter job automaticamente com o perfil por defeito
          await invoke('submit_job', { assetId: asset.id, profile: DEFAULT_PROFILE, priority: 0 });
          ingested++;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push(msg);
          console.error('Ingest/submit failed:', msg);
        }
      }

      setIsIngesting(false);

      if (ingested > 0) {
        toast.success(t('library.filesAdded', { count: ingested }));
        await fetchAssets();
      }
      if (errors.length > 0) {
        toast.error(t('library.addError', { message: errors[0] }));
      }
    },
    [fetchAssets, t],
  );

  // Listeners Tauri para drag-and-drop nativo (registados uma vez)
  useEffect(() => {
    const unlisteners: Array<Promise<() => void>> = [
      listen<{ paths: string[] }>('tauri://drag-drop', (event) => {
        setIsDragging(false);
        ingestPaths(event.payload.paths);
      }),
      listen('tauri://drag-enter', () => setIsDragging(true)),
      listen('tauri://drag-over', () => setIsDragging(true)),
      listen('tauri://drag-leave', () => setIsDragging(false)),
    ];
    return () => {
      unlisteners.forEach((p) => p.then((fn) => fn()));
    };
  }, [ingestPaths]);

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
      await ingestPaths(paths);
    } catch (err) {
      console.error('Failed to open file dialog:', err);
    }
  };

  const handleAddFolderDialog = async () => {
    try {
      const selected = await open({ directory: true, multiple: true });
      if (!selected) return;
      const dirs = Array.isArray(selected) ? selected : [selected];
      // Passa as directórias para ingestPaths — o suporte a scan recursivo virá na v0.19.0
      await ingestPaths(dirs);
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

  const handleDelete = async (id: string) => {
    if (!confirm(t('library.deleteConfirm'))) return;
    try {
      await invoke('delete_asset', { id });
      await fetchAssets();
    } catch (error) {
      console.error('Failed to delete asset:', error);
      toast.error(t('library.deleteError'));
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
    <div className="flex flex-col flex-1 min-h-0 space-y-4 animate-in fade-in duration-500">
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
            className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-surface text-brand' : 'text-text-muted hover:text-text-secondary'}`}
          >
            <Grid2X2 size={16} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-surface text-brand' : 'text-text-muted hover:text-text-secondary'}`}
          >
            <List size={16} />
          </button>
        </div>

        {/* Botões de adicionar — sempre visíveis */}
        <div className="flex items-center gap-2 ml-auto">
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

      {/* ZONA DE DROP */}
      <div
        className={`flex-1 overflow-y-auto min-h-0 border-2 border-dashed rounded-2xl transition-all duration-200 ${
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
          <div className="h-full flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredAssets.length === 0 ? (
          /* Estado vazio */
          <div className="h-full flex flex-col items-center justify-center text-text-muted p-12">
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
          /* Vista em grelha */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-1">
            {filteredAssets.map((asset) => (
              <div
                key={asset.id}
                className="bg-bg-secondary border border-border rounded-xl overflow-hidden group hover:border-brand/50 transition-all"
              >
                {/* THUMBNAIL */}
                <div className="aspect-video bg-bg-primary relative flex items-center justify-center">
                  {asset.thumbnail_path ? (
                    <img
                      src={asset.thumbnail_path}
                      alt={asset.filename}
                      className="w-full h-full object-cover"
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
                  {asset.vmaf_score !== null && (
                    <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/60 backdrop-blur-md rounded text-[10px] font-bold text-green-400 border border-green-500/30">
                      VMAF {asset.vmaf_score.toFixed(1)}
                    </div>
                  )}

                  {/* ACÇÕES OVERLAY */}
                  <div className="absolute inset-0 bg-bg-primary/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button className="p-2 bg-brand text-white rounded-full hover:scale-110 transition-transform">
                      <ExternalLink size={18} />
                    </button>
                    {(asset.status === 'done' || asset.status === 'error') && (
                      <button className="p-2 bg-white text-black rounded-full hover:scale-110 transition-transform">
                        <Play size={18} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(asset.id)}
                      className="p-2 bg-red-600 text-white rounded-full hover:scale-110 transition-transform"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* INFO */}
                <div className="p-4">
                  <h3
                    className="font-bold text-text-primary text-sm truncate mb-2"
                    title={asset.filename}
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
        ) : (
          /* Vista em lista — virtualizada com TanStack Virtual */
          <div
            ref={listParentRef}
            className="bg-bg-secondary border border-border rounded-xl overflow-auto"
            style={{ height: '100%' }}
          >
            {/* Cabeçalho fixo da tabela */}
            <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-0 bg-bg-primary border-b border-border px-6 py-3 text-[10px] font-bold uppercase text-text-muted sticky top-0 z-10">
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
                    className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-0 items-center border-b border-border hover:bg-surface/30 transition-colors group px-6"
                  >
                    <div className="flex items-center gap-3 py-4">
                      <Film size={16} className="text-text-muted shrink-0" />
                      <span className="font-bold text-text-primary truncate max-w-[300px]">
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
                      <button className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface rounded">
                        <ExternalLink size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(asset.id)}
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
    </div>
  );
}
