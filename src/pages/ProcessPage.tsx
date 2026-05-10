import React, { useState, useEffect } from 'react';
import { DropZone } from '@/components/DropZone';
import { JobCard } from '@/components/JobCard';
import { useJobsStore } from '@/store/jobs';
import { useAssetsStore } from '@/store/assets';
import { useTauriCommand } from '@/hooks/useTauriCommand';
import { useJobStatus } from '@/hooks/useJobStatus';
import { useNotification } from '@/hooks/useNotification';
import toast from 'react-hot-toast';
import { Rocket, History } from 'lucide-react';

export const ProcessPage: React.FC = () => {
  const { jobs } = useJobsStore();
  const { assets } = useAssetsStore();
  const { execute: ingestAsset } = useTauriCommand('ingest_asset');
  const { execute: submitJob } = useTauriCommand('submit_job');
  const { execute: cancelJob } = useTauriCommand('cancel_job');
  const { execute: listProfiles } = useTauriCommand('list_profiles');
  const { notify } = useNotification();

  const [profiles, setProfiles] = useState<{ id: string, name: string, description: string }[]>([]);
  const [selectedProfile, setSelectedProfile] = useState('broadcast-hd');
  const [loadingProfiles, setLoadingProfiles] = useState(true);

  // Fetch profiles on mount
  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const data = await listProfiles();
        if (data && Array.isArray(data) && data.length > 0) {
          setProfiles(data);
          setSelectedProfile(data[0].id);
        } else {
          throw new Error('Lista vazia');
        }
      } catch (err) {
        // Fallback
        const fallback = [
          { id: 'broadcast-hd', name: 'Broadcast HD', description: 'XDCAM HD422 50Mbps 1080i50' },
          { id: 'broadcast-sd', name: 'Broadcast SD', description: 'IMX 50Mbps 576i50' },
          { id: 'web-4k', name: 'Web 4K', description: 'H.264 25Mbps 2160p25' },
          { id: 'web-hd', name: 'Web HD', description: 'H.264 8Mbps 1080p25' },
          { id: 'proxy', name: 'Proxy', description: 'H.264 2Mbps 540p' },
          { id: 'social', name: 'Social', description: 'H.264 5Mbps 1080x1920 (Vertical)' }
        ];
        setProfiles(fallback);
      } finally {
        setLoadingProfiles(false);
      }
    };
    fetchProfiles();
  }, []);

  // Start polling
  useJobStatus();

  const handleFilesSelected = async (paths: string[]) => {
    for (const path of paths) {
      try {
        // 1. Ingest asset
        const asset = await ingestAsset({ path });
        
        // 2. Submit job using selected profile
        await submitJob({ 
          assetId: (asset as any).id, 
          profile: selectedProfile, 
          priority: 0 
        });

        toast.success('Ficheiro aceite — a processar');
        notify('Processamento Iniciado', `O ficheiro ${path.split(/[\\/]/).pop()} foi adicionado à fila.`);
      } catch (err: any) {
        toast.error(`Erro: ${err?.message || err || 'Desconhecido'}`);
        console.error('Failed to process file:', path, err);
      }
    }
  };

  const handleCancelJob = async (id: string) => {
    try {
      await cancelJob({ jobId: id });
      toast.success('Job cancelado');
    } catch (err: any) {
      toast.error(`Erro ao cancelar: ${err?.message || err || 'Desconhecido'}`);
      console.error('Failed to cancel job:', id, err);
    }
  };

  const activeJobs = jobs.filter(j => j.status === 'processing' || j.status === 'queued');
  const recentJobs = jobs.filter(j => j.status !== 'processing' && j.status !== 'queued').slice(0, 5);

  // Helper to find filename for a job
  const getFilename = (assetId: string) => {
    return assets.find(a => a.id === assetId)?.filename || 'Ficheiro desconhecido';
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Rocket className="text-nexora-blue w-6 h-6" />
          Processar Media
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Adicione ficheiros para iniciar o transcode e análise de qualidade.
        </p>
      </header>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm mb-6">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Perfil de Encoding
          </label>
          <select 
            value={selectedProfile}
            onChange={(e) => setSelectedProfile(e.target.value)}
            disabled={loadingProfiles}
            className="w-full md:w-1/2 px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-nexora-blue transition-all disabled:opacity-50"
          >
            {loadingProfiles ? (
              <option>A carregar perfis...</option>
            ) : (
              profiles.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.description}
                </option>
              ))
            )}
          </select>
        </div>

        <DropZone onFilesSelected={handleFilesSelected} />
      </div>

      {activeJobs.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
            Trabalhos Activos ({activeJobs.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeJobs.map(job => (
              <JobCard 
                key={job.id} 
                job={job} 
                filename={getFilename(job.asset_id)} 
                onCancel={handleCancelJob}
              />
            ))}
          </div>
        </section>
      )}

      {recentJobs.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
            Recentemente Concluídos
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-75">
            {recentJobs.map(job => (
              <JobCard 
                key={job.id} 
                job={job} 
                filename={getFilename(job.asset_id)} 
              />
            ))}
          </div>
        </section>
      )}

      {activeJobs.length === 0 && recentJobs.length === 0 && (
        <div className="py-20 flex flex-col items-center justify-center text-gray-400 opacity-50">
          <History className="w-12 h-12 mb-4" />
          <p>Nenhuma actividade recente.</p>
        </div>
      )}
    </div>
  );
};
