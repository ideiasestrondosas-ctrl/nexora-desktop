import React, { useState, useEffect } from 'react';
import { useAssetsStore } from '@/store/assets';
import { useTauriCommand } from '@/hooks/useTauriCommand';
import { Archive, Search, Filter, ExternalLink, RefreshCw, Info, Trash2 } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import toast from 'react-hot-toast';
import { AssetDetailModal } from '@/components/AssetDetailModal';

export const HistoryPage: React.FC = () => {
  const { assets, setAssets } = useAssetsStore();
  const { execute: listAssets, loading } = useTauriCommand('list_assets');
  const { execute: submitJob } = useTauriCommand('submit_job');
  const { execute: deleteAsset } = useTauriCommand('delete_asset');

  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedAsset, setSelectedAsset] = useState<any | null>(null);

  useEffect(() => {
    listAssets().then(data => {
      if (data) setAssets(data as any[]);
    });
  }, [listAssets, setAssets]);

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.filename.toLowerCase().includes(searchText.toLowerCase());
    const matchesStatus = filterStatus === 'all' || asset.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleOpenPath = async (path: string) => {
    try {
      // Tentar usar o plugin opener nativo
      await invoke('plugin:opener|open', { path });
    } catch (err) {
      toast.error('Erro ao abrir pasta');
    }
  };

  const handleReprocess = async (assetId: string) => {
    try {
      await submitJob({ assetId, profile: 'broadcast-hd', priority: 0 });
      toast.success('Reprocessamento iniciado');
    } catch (err: any) {
      toast.error(`Erro: ${err?.message || 'Falha ao reprocessar'}`);
    }
  };

  const handleDelete = async (asset: any) => {
    if (window.confirm(`Remover "${asset.filename}" do histórico? O ficheiro original não será apagado.`)) {
      try {
        await deleteAsset({ id: asset.id });
        // Remove locally from store without full reload
        setAssets(assets.filter(a => a.id !== asset.id));
        toast.success('Asset removido do histórico');
      } catch (err: any) {
        toast.error(`Erro: ${err?.message || 'Falha ao remover asset'}`);
      }
    }
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return 'N/A';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'N/A';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':');
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Archive className="text-nexora-blue w-6 h-6" />
            Histórico de Assets
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Ficheiros processados e metadados extraídos.
          </p>
        </div>
        
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Procurar ficheiro..."
              className="pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-nexora-blue outline-none transition-all"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-nexora-blue outline-none transition-all appearance-none cursor-pointer"
            >
              <option value="all">Todos</option>
              <option value="queued">Em Fila</option>
              <option value="processing">A Processar</option>
              <option value="done">Concluídos</option>
              <option value="error">Com Erro</option>
            </select>
          </div>
        </div>
      </header>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Ficheiro</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Duração</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Codec</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Tamanho</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 text-right">Acções</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-gray-400">
                    {loading ? 'A carregar assets...' : 'Nenhum asset encontrado.'}
                  </td>
                </tr>
              ) : (
                filteredAssets.map(asset => (
                  <tr key={asset.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-xs">
                          {asset.filename}
                        </span>
                        <span className="text-[10px] text-gray-400 truncate max-w-xs">
                          {asset.path}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {formatDuration(asset.duration_secs)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 uppercase">
                        {asset.video_codec || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {formatSize(asset.size_bytes)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => setSelectedAsset(asset)}
                          title="Ver Detalhes"
                          className="p-1.5 text-gray-400 hover:text-nexora-blue transition-colors"
                        >
                          <Info className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleOpenPath(asset.path)}
                          title="Abrir pasta"
                          className="p-1.5 text-gray-400 hover:text-nexora-blue transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleReprocess(asset.id)}
                          title="Reprocessar"
                          className="p-1.5 text-gray-400 hover:text-nexora-green transition-colors"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(asset)}
                          title="Remover do Histórico"
                          className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedAsset && (
        <AssetDetailModal 
          asset={selectedAsset} 
          onClose={() => setSelectedAsset(null)} 
          onReprocess={handleReprocess} 
        />
      )}
    </div>
  );
};
