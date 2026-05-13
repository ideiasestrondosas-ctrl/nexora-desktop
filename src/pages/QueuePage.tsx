import React, { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { 
  ListVideo, X, CheckCircle2, AlertCircle, 
  Clock, ExternalLink, Repeat, Film, Cpu
} from 'lucide-react';

interface Job {
  id: string;
  asset_id: string;
  profile: string;
  status: 'queued' | 'processing' | 'done' | 'error' | 'cancelled';
  progress: number;
  step: string | null;
  error: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  vmaf_score: number | null;
  lufs: number | null;
  output_path: string | null;
  filename: string;
}

interface QueueStats {
  queued: number;
  processing: number;
  doneToday: number;
  errorToday: number;
}

const PIPELINE_STEPS = [
  { key: 'ingest',     label: 'Ingest',    short: 'IN' },
  { key: 'qc-pre',     label: 'QC Pré',    short: 'QC' },
  { key: 'transcode',  label: 'Transco.',  short: 'TR' },
  { key: 'audio',      label: 'Áudio',     short: 'AU' },
  { key: 'proxy',      label: 'Proxy',     short: 'PX' },
  { key: 'thumbnail',  label: 'Thumb',     short: 'TH' },
  { key: 'qc-post',    label: 'QC Pós',    short: 'QP' },
  { key: 'delivery',   label: 'Entrega',   short: 'DL' },
];

export default function QueuePage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [stats, setStats] = useState<QueueStats>({ queued: 0, processing: 0, doneToday: 0, errorToday: 0 });
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [jobsData, statsData] = await Promise.all([
        invoke<Job[]>('list_jobs'),
        invoke<QueueStats>('get_queue_stats')
      ]);
      setJobs(jobsData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to fetch queue data:', error);
      // Mock data for development if backend fails
      if (loading) {
        setJobs([
          {
            id: 'job-1', asset_id: 'asset-1', profile: 'broadcast-hd', status: 'processing',
            progress: 0.65, step: 'transcode', error: null, created_at: new Date().toISOString(),
            started_at: new Date().toISOString(), finished_at: null, vmaf_score: null,
            lufs: null, output_path: null, filename: 'video_producao_01.mxf'
          },
          {
            id: 'job-2', asset_id: 'asset-2', profile: 'web-hd', status: 'queued',
            progress: 0, step: null, error: null, created_at: new Date().toISOString(),
            started_at: null, finished_at: null, vmaf_score: null,
            lufs: null, output_path: null, filename: 'entrevista_final.mp4'
          }
        ]);
      }
    } finally {
      setLoading(false);
    }
  }, [loading]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleCancel = async (jobId: string) => {
    try {
      await invoke('cancel_job', { id: jobId });
      fetchData();
    } catch (error) {
      console.error('Failed to cancel job:', error);
    }
  };

  const handleRetry = async (jobId: string) => {
    try {
      await invoke('retry_job', { id: jobId });
      fetchData();
    } catch (error) {
      console.error('Failed to retry job:', error);
    }
  };

  const processingJobs = jobs.filter(j => j.status === 'processing');
  const queuedJobs = jobs.filter(j => j.status === 'queued');
  const finishedJobs = jobs.filter(j => j.status === 'done' || j.status === 'error' || j.status === 'cancelled');

  const getStepIndex = (stepKey: string | null) => {
    if (!stepKey) return -1;
    return PIPELINE_STEPS.findIndex(s => s.key === stepKey);
  };

  const formatTime = (isoString: string | null) => {
    if (!isoString) return '--:--';
    const date = new Date(isoString);
    return date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
  };

  const getVmafColor = (score: number | null) => {
    if (score === null) return 'text-gray-500';
    if (score >= 85) return 'text-green-500';
    if (score >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* HEADER & STATS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <ListVideo className="text-[#1A6FD4]" />
          Fila de Processamento
        </h1>
        <div className="flex flex-wrap gap-2">
          <div className="px-3 py-1 bg-[#1e2433] rounded-full text-xs font-bold text-gray-400 flex items-center gap-2">
            Em fila: {stats.queued}
          </div>
          <div className="px-3 py-1 bg-[#1A6FD4]/10 border border-[#1A6FD4]/20 rounded-full text-xs font-bold text-[#1A6FD4] flex items-center gap-2">
            <span className="w-2 h-2 bg-[#1A6FD4] rounded-full animate-pulse"></span>
            A processar: {stats.processing}
          </div>
          <div className="px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full text-xs font-bold text-green-500 flex items-center gap-2">
            Concluídos hoje: {stats.doneToday}
          </div>
          {stats.errorToday > 0 && (
            <div className="px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-full text-xs font-bold text-red-500 flex items-center gap-2">
              Erros hoje: {stats.errorToday}
            </div>
          )}
        </div>
      </div>

      {/* A PROCESSAR */}
      {processingJobs.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">A Processar</h2>
            <span className="text-xs text-gray-500">{stats.processing}/2 slots em uso</span>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            {processingJobs.map(job => {
              const currentStepIdx = getStepIndex(job.step);
              return (
                <div key={job.id} className="bg-[#141824] border-l-4 border-[#1A6FD4] border-y border-r border-[#1e2433] rounded-xl p-6 relative group">
                  <button 
                    onClick={() => handleCancel(job.id)}
                    className="absolute top-4 right-4 p-2 text-gray-500 hover:text-red-500 transition-colors"
                  >
                    <X size={20} />
                  </button>

                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-[#0a0d14] rounded-lg flex items-center justify-center">
                      <Film className="text-gray-500" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white leading-tight mb-1">{job.filename}</h3>
                      <span className="px-2 py-0.5 bg-[#1e2433] text-[10px] font-bold uppercase text-purple-400 rounded">
                        {job.profile}
                      </span>
                    </div>
                  </div>

                  {/* PIPELINE VISUALIZER */}
                  <div className="mb-8 overflow-x-auto">
                    <div className="flex items-center justify-between min-w-[600px] px-2">
                      {PIPELINE_STEPS.map((step, idx) => (
                        <React.Fragment key={step.key}>
                          <div className="flex flex-col items-center gap-2 relative z-10">
                            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                              idx < currentStepIdx ? 'bg-green-500 border-green-500 text-white' :
                              idx === currentStepIdx ? 'border-[#1A6FD4] text-[#1A6FD4] animate-pulse' :
                              'border-[#1e2433] text-gray-600'
                            }`}>
                              {idx < currentStepIdx ? <CheckCircle2 size={16} /> : 
                               idx === currentStepIdx ? <div className="w-2 h-2 bg-[#1A6FD4] rounded-full"></div> : 
                               <span className="text-[10px] font-bold">{step.short}</span>}
                            </div>
                            <span className={`text-[10px] font-bold uppercase ${
                              idx === currentStepIdx ? 'text-[#1A6FD4]' : 'text-gray-500'
                            }`}>{step.label}</span>
                          </div>
                          {idx < PIPELINE_STEPS.length - 1 && (
                            <div className={`flex-1 h-0.5 mx-[-4px] mb-6 transition-all ${
                              idx < currentStepIdx ? 'bg-green-500' : 'bg-[#1e2433]'
                            }`}></div>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>

                  {/* PROGRESS BAR */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-end">
                      <span className="text-xs font-bold text-gray-400">A {job.step || 'preparar'}...</span>
                      <span className="text-xl font-black text-white">{(job.progress * 100).toFixed(0)}%</span>
                    </div>
                    <div className="w-full h-3 bg-[#0a0d14] rounded-full overflow-hidden border border-[#1e2433]">
                      <div 
                        className="h-full bg-[#1A6FD4] transition-all duration-500 ease-out"
                        style={{ width: `${job.progress * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-6 text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                    <div className="flex items-center gap-1">
                      <Clock size={14} /> Iniciado há 2 min
                    </div>
                    <div className="flex items-center gap-1">
                      <Cpu size={14} /> GPU: NVENC
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock size={14} /> Est: 5 min restantes
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* EM FILA */}
      {queuedJobs.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
            Em Fila <span className="bg-[#1e2433] px-2 py-0.5 rounded text-[10px]">{queuedJobs.length}</span>
          </h2>
          <div className="bg-[#141824] border border-[#1e2433] rounded-xl overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#0a0d14] text-[10px] font-bold uppercase text-gray-500 border-b border-[#1e2433]">
                <tr>
                  <th className="px-6 py-3 w-16">Pos.</th>
                  <th className="px-6 py-3">Nome do Ficheiro</th>
                  <th className="px-6 py-3">Perfil</th>
                  <th className="px-6 py-3">Adicionado em</th>
                  <th className="px-6 py-3">Estado</th>
                  <th className="px-6 py-3 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e2433]">
                {queuedJobs.map((job, idx) => (
                  <tr key={job.id} className="hover:bg-[#1e2433]/30 transition-colors">
                    <td className="px-6 py-4 font-mono text-gray-500">{idx + 1}</td>
                    <td className="px-6 py-4 font-bold text-white">{job.filename}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 bg-[#1e2433] text-[10px] font-bold uppercase text-blue-400 rounded">
                        {job.profile}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-400">{formatTime(job.created_at)}</td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-2 text-gray-500 font-bold uppercase text-[10px]">
                        <Clock size={14} /> Aguardar
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button onClick={() => handleCancel(job.id)} className="text-gray-500 hover:text-red-500">
                        <X size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* CONCLUÍDOS E ERROS */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">Concluídos e Histórico</h2>
          <button className="text-[11px] font-bold text-[#1A6FD4] hover:underline uppercase tracking-widest">
            Ver histórico completo →
          </button>
        </div>
        
        <div className="bg-[#141824] border border-[#1e2433] rounded-xl overflow-hidden">
          {finishedJobs.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Clock size={32} className="mx-auto mb-4 opacity-20" />
              <p>Nenhum job processado recentemente.</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-[#0a0d14] text-[10px] font-bold uppercase text-gray-500 border-b border-[#1e2433]">
                <tr>
                  <th className="px-6 py-3">Ficheiro</th>
                  <th className="px-6 py-3">Perfil</th>
                  <th className="px-6 py-3">VMAF</th>
                  <th className="px-6 py-3">Estado</th>
                  <th className="px-6 py-3">Finalizado</th>
                  <th className="px-6 py-3 w-24 text-right">Acções</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e2433]">
                {finishedJobs.map(job => (
                  <tr key={job.id} className="hover:bg-[#1e2433]/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-white truncate max-w-[200px]">{job.filename}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 bg-[#1e2433] text-[10px] font-bold uppercase text-gray-400 rounded">
                        {job.profile}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-mono font-bold ${getVmafColor(job.vmaf_score)}`}>
                        {job.vmaf_score ? job.vmaf_score.toFixed(1) : '--'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {job.status === 'done' ? (
                        <span className="flex items-center gap-1.5 text-green-500 font-bold uppercase text-[10px]">
                          <CheckCircle2 size={14} /> Concluído
                        </span>
                      ) : job.status === 'error' ? (
                        <span className="flex items-center gap-1.5 text-red-500 font-bold uppercase text-[10px]">
                          <AlertCircle size={14} /> Erro
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-gray-500 font-bold uppercase text-[10px]">
                          <X size={14} /> Cancelado
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-400">{formatTime(job.finished_at || job.created_at)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {job.output_path && (
                          <button className="p-1.5 text-gray-500 hover:text-white hover:bg-[#1e2433] rounded transition-colors">
                            <ExternalLink size={14} />
                          </button>
                        )}
                        <button 
                          onClick={() => handleRetry(job.id)}
                          className="p-1.5 text-[#1A6FD4] hover:text-white hover:bg-[#1A6FD4] rounded transition-colors"
                        >
                          <Repeat size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
