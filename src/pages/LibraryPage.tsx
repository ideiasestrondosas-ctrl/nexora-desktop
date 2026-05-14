import React, { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { open } from '@tauri-apps/plugin-dialog';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { 
  Library, Search, Filter, Grid2X2, List, Film,
  ExternalLink, Trash2, Play
} from 'lucide-react';

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
  const { t } = useTranslation();

  // Listener de drag-and-drop do Tauri (regista uma unica vez)
  useEffect(() => {
    let unlistenFn: (() => void) | null = null;
    let cancelled = false;

    getCurrentWebviewWindow()
      .onDragDropEvent((event) => {
        const { type } = event.payload;
        if (type === 'enter' || type === 'over') {
          setIsDragging(true);
        } else if (type === 'leave') {
          setIsDragging(false);
        } else if (type === 'drop') {
          setIsDragging(false);
          const paths: string[] = (event.payload as { paths?: string[] }).paths ?? [];
          const VALID_EXTENSIONS = ['.mp4', '.mkv', '.mov', '.mxf', '.avi', '.webm', '.ts', '.m2ts'];
          const validPaths = paths.filter((p) => {
            const ext = p.slice(p.lastIndexOf('.')).toLowerCase();
            if (!VALID_EXTENSIONS.includes(ext)) {
              toast.error(t('library.unsupportedFormat', { ext }));
              return false;
            }
            return true;
          });

          if (validPaths.length > 0) {
            // Ingest cada ficheiro e refresca a lista
            Promise.all(validPaths.map((path) => invoke('ingest_asset', { path })))
              .then(() => {
                toast.success(t('library.filesAdded', { count: validPaths.length }));
                fetchAssets();
              })
              .catch((err: unknown) => {
                const message = err instanceof Error ? err.message : String(err);
                toast.error(t('library.addError', { message }));
              });
          }
        }
      })
      .then((fn) => {
        if (cancelled) {
          fn();
        } else {
          unlistenFn = fn;
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      unlistenFn?.();
    };
  }, []);

  const fetchAssets = useCallback(async () => {
    try {
      const data = await invoke<Asset[]>('list_assets');
      setAssets(data);
    } catch (error) {
      console.error('Failed to fetch assets:', error);
      // Mock data for development
      if (loading) {
        setAssets([
          {
            id: '1', path: '/path/to/video1.mp4', filename: 'campanha_verao_2026_v04.mp4',
            status: 'done', size_bytes: 1024 * 1024 * 1250, duration_secs: 45,
            video_codec: 'H.264', width: 1920, height: 1080, created_at: new Date().toISOString(),
            thumbnail_path: null, vmaf_score: 92.4
          },
          {
            id: '2', path: '/path/to/video2.mxf', filename: 'master_programa_042.mxf',
            status: 'processing', size_bytes: 1024 * 1024 * 8500, duration_secs: 1800,
            video_codec: 'ProRes 422', width: 1920, height: 1080, created_at: new Date().toISOString(),
            thumbnail_path: null, vmaf_score: null
          }
        ]);
      }
    } finally {
      setLoading(false);
    }
  }, [loading]);

  useEffect(() => {
    fetchAssets();
    const interval = setInterval(fetchAssets, 5000);
    return () => clearInterval(interval);
  }, [fetchAssets]);

  useEffect(() => {
    localStorage.setItem('library-view-mode', viewMode);
  }, [viewMode]);

  const handleAddVideos = async () => {
    try {
      const selected = await open({
        multiple: true,
        filters: [{ name: t('dropZone.videoFilter'), extensions: ['mp4', 'mov', 'mxf', 'avi', 'mkv', 'ts', 'm2ts'] }]
      });
      
      if (selected && Array.isArray(selected)) {
        for (const path of selected) {
          await invoke('ingest_asset', { path });
        }
        fetchAssets();
      }
    } catch (error) {
      console.error('Failed to add videos:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm(t('library.deleteConfirm'))) {
      try {
        await invoke('delete_asset', { id });
        fetchAssets();
      } catch (error) {
        console.error('Failed to delete asset:', error);
      }
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    // O ingest e tratado pelo listener onDragDropEvent do Tauri (registado no useEffect acima)
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
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
      s.toString().padStart(2, '0')
    ].filter(Boolean).join(':');
  };

  const filteredAssets = assets
    .filter(a => {
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      if (searchTerm && !a.filename.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortOrder === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortOrder === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortOrder === 'name') return a.filename.localeCompare(b.filename);
      if (sortOrder === 'size') return b.size_bytes - a.size_bytes;
      return 0;
    });

  return (
    <div className="flex flex-col h-full space-y-6 animate-in fade-in duration-500">
      {/* FILTERS BAR */}
      <div className="flex flex-wrap items-center gap-4 bg-bg-secondary border border-border rounded-xl p-3 shrink-0">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input 
            type="text" 
            placeholder={t('library.searchPlaceholder')} 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-bg-primary border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-text-primary outline-none focus:border-brand transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={16} className="text-text-muted" />
          <select 
            value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
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
          value={sortOrder} onChange={e => setSortOrder(e.target.value)}
          className="bg-bg-primary border border-border rounded-lg px-3 py-2 text-xs font-bold text-text-secondary outline-none"
        >
          <option value="newest">{t('library.newest')}</option>
          <option value="oldest">{t('library.oldest')}</option>
          <option value="name">{t('library.name')}</option>
          <option value="size">{t('library.size')}</option>
        </select>

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
      </div>

      {/* DRAG ZONE */}
      <div 
        className={`flex-1 overflow-y-auto min-h-0 border-2 border-dashed rounded-2xl transition-all ${
          isDragging ? 'border-brand bg-brand/5' : 'border-transparent'
        }`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        {filteredAssets.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-text-muted p-12">
            <Library size={64} className="mb-6 opacity-20" />
            <h2 className="text-xl font-bold text-text-primary mb-2">{t('library.noAssets')}</h2>
            <p className="text-sm max-w-xs text-center mb-6">{t('library.dragHint')}</p>
            <button 
              onClick={handleAddVideos}
              className="px-6 py-2 bg-brand text-white rounded-lg font-bold text-sm"
            >
              {t('library.addVideos')}
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-1">
            {filteredAssets.map(asset => (
              <div key={asset.id} className="bg-bg-secondary border border-border rounded-xl overflow-hidden group hover:border-brand/50 transition-all">
                {/* THUMBNAIL AREA */}
                <div className="aspect-video bg-bg-primary relative flex items-center justify-center">
                  {asset.thumbnail_path ? (
                    <img src={asset.thumbnail_path} alt={asset.filename} className="w-full h-full object-cover" />
                  ) : (
                    <Film size={32} className="text-gray-800" />
                  )}
                  
                  {/* STATUS BADGE */}
                  <div className={`absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${
                    asset.status === 'done' ? 'bg-green-500 text-white' :
                    asset.status === 'processing' ? 'bg-brand text-white animate-pulse' :
                    asset.status === 'error' ? 'bg-red-500 text-white' :
                    'bg-gray-700 text-text-secondary'
                  }`}>
                    {asset.status === 'processing' ? `${t('library.processing')}...` : asset.status === 'done' ? t('library.qcOk') : asset.status}
                  </div>

                  {/* VMAF BADGE */}
                  {asset.vmaf_score && (
                    <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/60 backdrop-blur-md rounded text-[10px] font-bold text-green-400 border border-green-500/30">
                      VMAF {asset.vmaf_score.toFixed(1)}
                    </div>
                  )}

                  {/* OVERLAY ACTIONS */}
                  <div className="absolute inset-0 bg-bg-primary/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button className="p-2 bg-brand text-white rounded-full hover:scale-110 transition-transform">
                      <ExternalLink size={18} />
                    </button>
                    {(asset.status === 'done' || asset.status === 'error') && (
                      <button className="p-2 bg-white text-black rounded-full hover:scale-110 transition-transform">
                        <Play size={18} />
                      </button>
                    )}
                  </div>
                </div>

                {/* INFO AREA */}
                <div className="p-4">
                  <h3 className="font-bold text-text-primary text-sm truncate mb-2" title={asset.filename}>
                    {asset.filename}
                  </h3>
                  <div className="flex items-center justify-between text-[11px] font-bold text-text-muted uppercase tracking-tighter">
                    <span>{formatBytes(asset.size_bytes)}</span>
                    <span>{formatDuration(asset.duration_secs)}</span>
                    <span className="text-text-muted">{asset.video_codec}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-bg-secondary border border-border rounded-xl overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-bg-primary text-[10px] font-bold uppercase text-text-muted border-b border-border">
                <tr>
                  <th className="px-6 py-3">{t('library.file')}</th>
                  <th className="px-6 py-3">{t('common.status')}</th>
                  <th className="px-6 py-3">{t('library.size')}</th>
                  <th className="px-6 py-3">{t('library.duration')}</th>
                  <th className="px-6 py-3">{t('profiles.codec')}</th>
                  <th className="px-6 py-3 text-right">{t('library.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredAssets.map(asset => (
                  <tr key={asset.id} className="hover:bg-surface/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Film size={16} className="text-text-muted" />
                        <span className="font-bold text-text-primary truncate max-w-[300px]">{asset.filename}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-black uppercase tracking-widest ${
                        asset.status === 'done' ? 'text-green-500' :
                        asset.status === 'processing' ? 'text-brand' :
                        'text-text-muted'
                      }`}>
                        {asset.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-text-secondary">{formatBytes(asset.size_bytes)}</td>
                    <td className="px-6 py-4 text-text-secondary">{formatDuration(asset.duration_secs)}</td>
                    <td className="px-6 py-4 text-text-muted font-mono text-xs">{asset.video_codec}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PAGINATION (Compact) */}
      <div className="flex items-center justify-between bg-bg-secondary border border-border rounded-xl px-4 py-2 shrink-0">
        <span className="text-xs text-text-muted font-bold uppercase tracking-widest">
          {t('library.showing', { count: filteredAssets.length, total: assets.length })}
        </span>
        <div className="flex gap-2">
          <button className="px-3 py-1 bg-surface text-text-muted rounded text-xs font-bold disabled:opacity-30" disabled>{t('common.previous')}</button>
          <button className="px-3 py-1 bg-surface text-text-secondary rounded text-xs font-bold">{t('common.next')}</button>
        </div>
      </div>
    </div>
  );
}
