import React from 'react';
import { DropZone } from '@/components/DropZone';
import { JobCard } from '@/components/JobCard';
import { useJobsStore } from '@/store/jobs';
import { useAssetsStore } from '@/store/assets';
import { useTauriCommand } from '@/hooks/useTauriCommand';
import { useJobStatus } from '@/hooks/useJobStatus';
import { useNotification } from '@/hooks/useNotification';
import { Rocket, History } from 'lucide-react';

export const ProcessPage: React.FC = () => {
  const { jobs } = useJobsStore();
  const { assets } = useAssetsStore();
  const { execute: ingestAsset } = useTauriCommand('ingest_asset');
  const { execute: submitJob } = useTauriCommand('submit_job');
  const { execute: cancelJob } = useTauriCommand('cancel_job');
  const { notify } = useNotification();

  // Start polling
  useJobStatus();

  const handleFilesSelected = async (paths: string[]) => {
    for (const path of paths) {
      try {
        // 1. Ingest asset
        const asset = await ingestAsset({ path });
        
        // 2. Submit job (using default broadcast-hd for now, or we could add a selector)
        await submitJob({ 
          assetId: (asset as any).id, 
          profile: 'broadcast-hd', 
          priority: 0 
        });

        notify('Processamento Iniciado', `O ficheiro ${path.split(/[\\/]/).pop()} foi adicionado à fila.`);
      } catch (err) {
        console.error('Failed to process file:', path, err);
      }
    }
  };

  const handleCancelJob = async (id: string) => {
    try {
      await cancelJob({ jobId: id });
    } catch (err) {
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

      <DropZone onFilesSelected={handleFilesSelected} />

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
