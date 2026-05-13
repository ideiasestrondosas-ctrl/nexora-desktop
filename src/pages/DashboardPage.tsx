import React, { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { 
  Archive, Activity, HardDrive, Cpu, 
  MemoryStick, Gauge, TrendingUp, Clock, 
  Loader2, Film, ChevronRight
} from 'lucide-react';
import { useSystemMetrics } from '@/hooks/useSystemMetrics';
import { useGPU } from '@/hooks/useGPU';

// Backend retorna camelCase via serde(rename_all = "camelCase")
interface AppStats {
  totalAssets: number;
  jobsToday: number;
  avgVmaf: number | null;
  activeJobs: number;
  diskFreeBytes: number | null;
  diskTotalBytes: number | null;
}

// Backend Job struct — sem campo filename (buscamos via assets)
interface Job {
  id: string;
  asset_id: string;
  profile: string;
  status: 'queued' | 'processing' | 'done' | 'error' | 'cancelled';
  priority: number;
  progress: number;
  step: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  finished_at: string | null;
  vmaf_score: number | null;
  lufs: number | null;
  output_path: string | null;
}

// Asset mínimo para resolver filenames
interface AssetMap {
  [id: string]: string; // asset_id → filename
}

interface DashboardPageProps {
  onNavigate: (page: string) => void;
  onSelectAsset: (id: string) => void;
}

export default function DashboardPage({ onNavigate, onSelectAsset }: DashboardPageProps) {
  const [stats, setStats] = useState<AppStats | null>(null);
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [assetMap, setAssetMap] = useState<AssetMap>({});
  const [loading, setLoading] = useState(true);
  const metrics = useSystemMetrics();
  const { gpu } = useGPU();

  const fetchData = useCallback(async () => {
    try {
      const [statsData, jobsData, assetsData] = await Promise.all([
        invoke<AppStats>('get_stats'),
        invoke<Job[]>('list_jobs'),
        invoke<{ id: string; filename: string }[]>('list_assets'),
      ]);
      setStats(statsData);
      setRecentJobs(jobsData.slice(0, 5));
      // Constrói mapa asset_id → filename para resolução de nomes
      const map: AssetMap = {};
      for (const a of assetsData) {
        map[a.id] = a.filename;
      }
      setAssetMap(map);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Converte bytes para GB com 1 decimal
  const bytesToGb = (bytes: number | null | undefined) => {
    if (!bytes) return 0;
    return bytes / (1024 * 1024 * 1024);
  };

  const getVmafColor = (score: number | null) => {
    if (score === null) return 'text-gray-500';
    if (score >= 85) return 'text-green-500';
    if (score >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  // Calcula distribuição VMAF real a partir dos jobs recentes
  const vmafDist = {
    below70: recentJobs.filter(j => j.vmaf_score !== null && j.vmaf_score < 70).length,
    from70to85: recentJobs.filter(j => j.vmaf_score !== null && j.vmaf_score >= 70 && j.vmaf_score < 85).length,
    from85to95: recentJobs.filter(j => j.vmaf_score !== null && j.vmaf_score >= 85 && j.vmaf_score < 95).length,
    above95: recentJobs.filter(j => j.vmaf_score !== null && j.vmaf_score >= 95).length,
  };

  const diskFreeGb = bytesToGb(stats?.diskFreeBytes).toFixed(0);
  const diskTotalGb = bytesToGb(stats?.diskTotalBytes);
  const diskUsedPct = diskTotalGb > 0
    ? ((diskTotalGb - bytesToGb(stats?.diskFreeBytes)) / diskTotalGb) * 100
    : 0;

  const ramUsedGb = bytesToGb(metrics?.memUsedBytes).toFixed(1);
  const ramTotalGb = bytesToGb(metrics?.memTotalBytes).toFixed(1);
  const ramUsedPct = metrics && metrics.memTotalBytes > 0
    ? (metrics.memUsedBytes / metrics.memTotalBytes) * 100
    : 0;

  const gpuLabel = gpu?.available
    ? `${gpu.vendor.toUpperCase()} (${gpu.encoder})`
    : 'CPU (sem GPU)';

  const StatCard = ({ title, value, subtitle, icon: Icon, color }: {
    title: string; value: string | number; subtitle: string;
    icon: React.ElementType; color: string;
  }) => (
    <div className="bg-[#141824] border border-[#1e2433] rounded-2xl p-6 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{title}</span>
        <div className={`p-2 rounded-lg bg-[#0a0d14] border border-[#1e2433] ${color}`}>
          <Icon size={20} />
        </div>
      </div>
      <div className="text-3xl font-black text-white mb-1">{value}</div>
      <div className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">{subtitle}</div>
    </div>
  );

  if (loading && !stats) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 animate-pulse">
        <Loader2 className="animate-spin mr-2" /> Carregando visão geral...
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* HEADER */}
      <header>
        <h1 className="text-3xl font-black text-white mb-1">Dashboard</h1>
        <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Visão geral do sistema</p>
      </header>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard
          title="Assets Totais"
          value={stats?.totalAssets ?? 0}
          subtitle="Ficheiros processados"
          icon={Archive}
          color="text-[#1A6FD4]"
        />
        <StatCard
          title="Jobs Hoje"
          value={stats?.jobsToday ?? 0}
          subtitle="Concluídos hoje"
          icon={Activity}
          color="text-green-500"
        />
        <StatCard
          title="VMAF Médio"
          value={stats?.avgVmaf != null ? stats.avgVmaf.toFixed(1) : '--'}
          subtitle="Média de qualidade"
          icon={Gauge}
          color={getVmafColor(stats?.avgVmaf ?? null)}
        />
        {/* Disco — card custom com barra de progresso */}
        <div className="bg-[#141824] border border-[#1e2433] rounded-2xl p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Disco Livre</span>
            <div className="p-2 rounded-lg bg-[#0a0d14] border border-[#1e2433] text-purple-500">
              <HardDrive size={20} />
            </div>
          </div>
          <div className="text-3xl font-black text-white mb-2">{diskFreeGb} GB</div>
          <div className="w-full h-1 bg-[#0a0d14] rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-500 transition-all duration-1000"
              style={{ width: `${Math.min(diskUsedPct, 100)}%` }}
            />
          </div>
          <div className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mt-2">
            {diskUsedPct.toFixed(0)}% utilizado
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* JOBS RECENTES */}
        <div className="xl:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">Jobs Recentes</h2>
            <button
              onClick={() => onNavigate('queue')}
              className="text-[11px] font-bold text-[#1A6FD4] hover:underline uppercase tracking-widest flex items-center gap-1"
            >
              Ver todos <ChevronRight size={14} />
            </button>
          </div>

          <div className="bg-[#141824] border border-[#1e2433] rounded-2xl overflow-hidden">
            {recentJobs.length === 0 ? (
              <div className="p-12 text-center text-gray-500 flex flex-col items-center">
                <Film size={32} className="mb-4 opacity-20" />
                <p className="text-sm">Sem jobs recentes.</p>
                <p className="text-[10px] font-bold uppercase tracking-widest mt-1">Arrasta vídeos para processar.</p>
              </div>
            ) : (
              <div className="divide-y divide-[#1e2433]">
                {recentJobs.map(job => (
                  <div
                    key={job.id}
                    className="p-4 flex items-center gap-4 hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={() => onSelectAsset(job.asset_id)}
                  >
                    <div className="w-10 h-10 bg-[#0a0d14] rounded-lg flex items-center justify-center shrink-0">
                      <Film size={18} className="text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-white truncate">
                        {/* P2: resolução de filename via assetMap */}
                        {assetMap[job.asset_id] ?? `Asset ${job.asset_id.slice(0, 8)}`}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-1.5 py-0.5 bg-[#1e2433] text-[9px] font-black uppercase text-blue-400 rounded">
                          {job.profile}
                        </span>
                        <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest flex items-center gap-1">
                          <Clock size={10} />
                          {job.started_at
                            ? new Date(job.started_at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
                            : new Date(job.created_at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${
                        job.status === 'done' ? 'text-green-500' :
                        job.status === 'processing' ? 'text-[#1A6FD4] animate-pulse' :
                        job.status === 'error' ? 'text-red-500' :
                        'text-gray-500'
                      }`}>
                        {job.status === 'processing' ? `A PROCESSAR ${Math.round(job.progress * 100)}%` : job.status.toUpperCase()}
                      </div>
                      {job.vmaf_score != null && (
                        <div className={`text-xs font-black ${getVmafColor(job.vmaf_score)}`}>
                          VMAF {job.vmaf_score.toFixed(1)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ESTADO DO SISTEMA */}
        <div className="xl:col-span-4 space-y-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">Estado do Sistema</h2>

          <div className="bg-[#141824] border border-[#1e2433] rounded-2xl p-6 space-y-6">
            {/* CPU */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                <span className="flex items-center gap-2 text-gray-400"><Cpu size={14} /> CPU</span>
                <span className={(metrics?.cpuPercent ?? 0) > 80 ? 'text-red-500' : 'text-white'}>
                  {Math.round(metrics?.cpuPercent ?? 0)}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-[#0a0d14] rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-1000 ${(metrics?.cpuPercent ?? 0) > 80 ? 'bg-red-500' : 'bg-[#1A6FD4]'}`}
                  style={{ width: `${metrics?.cpuPercent ?? 0}%` }}
                />
              </div>
            </div>

            {/* RAM — usa memTotalBytes real (P5) */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                <span className="flex items-center gap-2 text-gray-400"><MemoryStick size={14} /> RAM</span>
                <span className="text-white">{ramUsedGb} GB / {ramTotalGb} GB</span>
              </div>
              <div className="w-full h-1.5 bg-[#0a0d14] rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all duration-1000"
                  style={{ width: `${Math.min(ramUsedPct, 100)}%` }}
                />
              </div>
            </div>

            {/* GPU — usa detect_gpu (P4) */}
            <div className="pt-2 border-t border-[#1e2433]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#0a0d14] border border-[#1e2433] rounded-lg text-purple-500">
                  <TrendingUp size={16} />
                </div>
                <div>
                  <div className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">GPU Detectada</div>
                  <div className="text-xs font-bold text-white uppercase">{gpuLabel}</div>
                </div>
              </div>
            </div>
          </div>

          {/* DISTRIBUIÇÃO VMAF — valores reais (P3) */}
          <div className="bg-[#141824] border border-[#1e2433] rounded-2xl p-6">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-6">Distribuição VMAF</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded bg-red-500" />
                <span className="text-xs font-bold text-gray-400 flex-1">Abaixo de 70</span>
                <span className="text-xs font-bold text-white">{vmafDist.below70} jobs</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded bg-yellow-500" />
                <span className="text-xs font-bold text-gray-400 flex-1">70 a 85</span>
                <span className="text-xs font-bold text-white">{vmafDist.from70to85} jobs</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded bg-green-500" />
                <span className="text-xs font-bold text-gray-400 flex-1">85 a 95</span>
                <span className="text-xs font-bold text-white">{vmafDist.from85to95} jobs</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded bg-[#1A6FD4]" />
                <span className="text-xs font-bold text-gray-400 flex-1">Acima de 95</span>
                <span className="text-xs font-bold text-white">{vmafDist.above95} jobs</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
