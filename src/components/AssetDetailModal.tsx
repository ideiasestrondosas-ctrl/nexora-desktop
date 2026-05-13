import React, { useEffect, useState } from 'react';
import { useTauriCommand } from '@/hooks/useTauriCommand';
import { X, FileVideo, Activity, RefreshCw } from 'lucide-react';
import { Job } from '@/store/jobs';

interface Asset {
  id: string;
  filename: string;
  path: string;
  status: string;
  size_bytes: number | null;
  duration_secs: number | null;
  video_codec: string | null;
  audio_codec: string | null;
  width: number | null;
  height: number | null;
  fps: number | null;
  metadata: string | null;
  created_at: string;
}

interface AssetDetailModalProps {
  asset: Asset;
  onClose: () => void;
  onReprocess: (assetId: string) => void;
}

export const AssetDetailModal: React.FC<AssetDetailModalProps> = ({ asset, onClose, onReprocess }) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const { execute: listJobs, loading } = useTauriCommand('list_jobs');

  useEffect(() => {
    // Assuming list_jobs backend accepts asset_id parameter
    listJobs({ asset_id: asset.id }).then(data => {
      if (data && Array.isArray(data)) {
        setJobs(data);
      }
    }).catch(err => console.error("Error fetching jobs for asset", err));
  }, [asset.id, listJobs]);

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

  let parsedMetadata: any = null;
  try {
    if (asset.metadata) parsedMetadata = JSON.parse(asset.metadata);
  } catch (e) {
    // ignore
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-200 dark:border-gray-800">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-nexora-blue/10 rounded-xl">
              <FileVideo className="w-6 h-6 text-nexora-blue" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white truncate max-w-lg">
                {asset.filename}
              </h2>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 uppercase mt-1">
                {asset.status}
              </span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* File Details */}
          <section>
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4" /> Detalhes do Ficheiro Original
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                <p className="text-xs text-gray-500 mb-1">Tamanho</p>
                <p className="font-semibold text-gray-900 dark:text-white">{formatSize(asset.size_bytes)}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                <p className="text-xs text-gray-500 mb-1">Duração</p>
                <p className="font-semibold text-gray-900 dark:text-white">{formatDuration(asset.duration_secs)}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                <p className="text-xs text-gray-500 mb-1">Vídeo</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {asset.video_codec ? asset.video_codec.toUpperCase() : 'N/A'}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {asset.width && asset.height ? `${asset.width}x${asset.height} @ ${asset.fps}fps` : ''}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                <p className="text-xs text-gray-500 mb-1">Áudio</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {asset.audio_codec ? asset.audio_codec.toUpperCase() : 'N/A'}
                </p>
              </div>
            </div>
          </section>

          {/* Jobs History */}
          <section>
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4" /> Histórico de Processamentos
            </h3>
            <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                    <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Perfil</th>
                    <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Status</th>
                    <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">VMAF</th>
                    <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">LUFS</th>
                    <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 text-right">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {loading && jobs.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">A carregar jobs...</td></tr>
                  ) : jobs.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Nenhum processamento encontrado para este ficheiro.</td></tr>
                  ) : (
                    jobs.map(job => (
                      <tr key={job.id} className="bg-white dark:bg-gray-900">
                        <td className="px-4 py-3 font-medium">{job.profile}</td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] uppercase font-bold text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                            {job.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">{job.vmaf_score ? job.vmaf_score.toFixed(1) : '-'}</td>
                        <td className="px-4 py-3">{job.lufs ? job.lufs.toFixed(1) : '-'}</td>
                        <td className="px-4 py-3 text-right text-xs text-gray-500">
                          {new Date(job.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Metadata JSON */}
          {parsedMetadata && (
            <section>
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4" /> Metadados Brutos
              </h3>
              <div className="bg-gray-900 text-gray-300 p-4 rounded-xl overflow-x-auto text-xs font-mono">
                <pre>{JSON.stringify(parsedMetadata, null, 2)}</pre>
              </div>
            </section>
          )}

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-5 py-2 rounded-lg font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
          >
            Fechar
          </button>
          <button 
            onClick={() => {
              onClose();
              onReprocess(asset.id);
            }}
            className="px-5 py-2 rounded-lg font-medium bg-nexora-blue text-white hover:bg-blue-600 flex items-center gap-2 transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Reprocessar
          </button>
        </div>
      </div>
    </div>
  );
};
