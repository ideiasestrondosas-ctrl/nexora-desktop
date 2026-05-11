import React, { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { 
  Library, Upload, Search, Filter, Grid2X2, List, Film, Clock, 
  CheckCircle2, AlertCircle, Loader2, FolderOpen, Play, 
  ExternalLink, Trash2, MoreVertical
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
        filters: [{ name: 'Vídeo', extensions: ['mp4', 'mov', 'mxf', 'avi', 'mkv', 'ts', 'm2ts'] }]
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
    if (confirm('Tens a certeza que desejas remover este asset da biblioteca?')) {
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
    // In Tauri, webview drag and drop is usually handled by the OS/Plugin, 
    // but we can implement visual feedback here.
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
      {/* HEADER */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Biblioteca</h1>
          <p className="text-xs font-medium text-gray-500">{filteredAssets.length} assets encontrados</p>
        </div>
        <button 
          onClick={handleAddVideos}
          className="flex items-center gap-2 bg-[#1A6FD4] hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-bold transition-all shadow-lg shadow-blue-900/20"
        >
          <Upload size={18} /> Adicionar Vídeos
        </button>
      </div>

      {/* FILTERS BAR */}
      <div className="flex flex-wrap items-center gap-4 bg-[#141824] border border-[#1e2433] rounded-xl p-3 shrink-0">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input 
            type="text" 
            placeholder="Pesquisar na biblioteca..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-[#0a0d14] border border-[#1e2433] rounded-lg pl-9 pr-4 py-2 text-sm text-white outline-none focus:border-[#1A6FD4] transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={16} className="text-gray-500" />
          <select 
            value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="bg-[#0a0d14] border border-[#1e2433] rounded-lg px-3 py-2 text-xs font-bold text-gray-300 outline-none"
          >
            <option value="all">Todos os Estados</option>
            <option value="pending">Pendentes</option>
            <option value="processing">A Processar</option>
            <option value="done">Concluídos</option>
            <option value="error">Erros</option>
          </select>
        </div>

        <select 
          value={sortOrder} onChange={e => setSortOrder(e.target.value)}
          className="bg-[#0a0d14] border border-[#1e2433] rounded-lg px-3 py-2 text-xs font-bold text-gray-300 outline-none"
        >
          <option value="newest">Mais recentes</option>
          <option value="oldest">Mais antigos</option>
          <option value="name">Nome (A-Z)</option>
          <option value="size">Tamanho</option>
        </select>

        <div className="flex bg-[#0a0d14] border border-[#1e2433] rounded-lg p-1">
          <button 
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-[#1e2433] text-[#1A6FD4]' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <Grid2X2 size={16} />
          </button>
          <button 
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-[#1e2433] text-[#1A6FD4]' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {/* DRAG ZONE */}
      <div 
        className={`flex-1 overflow-y-auto min-h-0 border-2 border-dashed rounded-2xl transition-all ${
          isDragging ? 'border-[#1A6FD4] bg-[#1A6FD4]/5' : 'border-transparent'
        }`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        {filteredAssets.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 p-12">
            <Library size={64} className="mb-6 opacity-20" />
            <h2 className="text-xl font-bold text-white mb-2">Sem assets na biblioteca</h2>
            <p className="text-sm max-w-xs text-center mb-6">Arrasta ficheiros de vídeo para aqui ou clica no botão para começar.</p>
            <button 
              onClick={handleAddVideos}
              className="px-6 py-2 bg-[#1A6FD4] text-white rounded-lg font-bold text-sm"
            >
              Adicionar Vídeos
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-1">
            {filteredAssets.map(asset => (
              <div key={asset.id} className="bg-[#141824] border border-[#1e2433] rounded-xl overflow-hidden group hover:border-[#1A6FD4]/50 transition-all">
                {/* THUMBNAIL AREA */}
                <div className="aspect-video bg-[#0a0d14] relative flex items-center justify-center">
                  {asset.thumbnail_path ? (
                    <img src={asset.thumbnail_path} alt={asset.filename} className="w-full h-full object-cover" />
                  ) : (
                    <Film size={32} className="text-gray-800" />
                  )}
                  
                  {/* STATUS BADGE */}
                  <div className={`absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${
                    asset.status === 'done' ? 'bg-green-500 text-white' :
                    asset.status === 'processing' ? 'bg-[#1A6FD4] text-white animate-pulse' :
                    asset.status === 'error' ? 'bg-red-500 text-white' :
                    'bg-gray-700 text-gray-300'
                  }`}>
                    {asset.status === 'processing' ? 'A Processar...' : asset.status === 'done' ? 'QC OK' : asset.status}
                  </div>

                  {/* VMAF BADGE */}
                  {asset.vmaf_score && (
                    <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/60 backdrop-blur-md rounded text-[10px] font-bold text-green-400 border border-green-500/30">
                      VMAF {asset.vmaf_score.toFixed(1)}
                    </div>
                  )}

                  {/* OVERLAY ACTIONS */}
                  <div className="absolute inset-0 bg-[#0a0d14]/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button className="p-2 bg-[#1A6FD4] text-white rounded-full hover:scale-110 transition-transform">
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
                  <h3 className="font-bold text-white text-sm truncate mb-2" title={asset.filename}>
                    {asset.filename}
                  </h3>
                  <div className="flex items-center justify-between text-[11px] font-bold text-gray-500 uppercase tracking-tighter">
                    <span>{formatBytes(asset.size_bytes)}</span>
                    <span>{formatDuration(asset.duration_secs)}</span>
                    <span className="text-gray-600">{asset.video_codec}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-[#141824] border border-[#1e2433] rounded-xl overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#0a0d14] text-[10px] font-bold uppercase text-gray-500 border-b border-[#1e2433]">
                <tr>
                  <th className="px-6 py-3">Ficheiro</th>
                  <th className="px-6 py-3">Estado</th>
                  <th className="px-6 py-3">Tamanho</th>
                  <th className="px-6 py-3">Duração</th>
                  <th className="px-6 py-3">Codec</th>
                  <th className="px-6 py-3 text-right">Acções</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e2433]">
                {filteredAssets.map(asset => (
                  <tr key={asset.id} className="hover:bg-[#1e2433]/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Film size={16} className="text-gray-500" />
                        <span className="font-bold text-white truncate max-w-[300px]">{asset.filename}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-black uppercase tracking-widest ${
                        asset.status === 'done' ? 'text-green-500' :
                        asset.status === 'processing' ? 'text-[#1A6FD4]' :
                        'text-gray-500'
                      }`}>
                        {asset.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-400">{formatBytes(asset.size_bytes)}</td>
                    <td className="px-6 py-4 text-gray-400">{formatDuration(asset.duration_secs)}</td>
                    <td className="px-6 py-4 text-gray-600 font-mono text-xs">{asset.video_codec}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1.5 text-gray-500 hover:text-white hover:bg-[#1e2433] rounded">
                          <ExternalLink size={14} />
                        </button>
                        <button 
                          onClick={() => handleDelete(asset.id)}
                          className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded"
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
      <div className="flex items-center justify-between bg-[#141824] border border-[#1e2433] rounded-xl px-4 py-2 shrink-0">
        <span className="text-xs text-gray-500 font-bold uppercase tracking-widest">
          Mostrar {filteredAssets.length} de {assets.length} assets
        </span>
        <div className="flex gap-2">
          <button className="px-3 py-1 bg-[#1e2433] text-gray-500 rounded text-xs font-bold disabled:opacity-30" disabled>Anterior</button>
          <button className="px-3 py-1 bg-[#1e2433] text-gray-300 rounded text-xs font-bold">Próximo</button>
        </div>
      </div>
    </div>
  );
}
