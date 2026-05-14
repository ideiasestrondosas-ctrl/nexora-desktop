import React, { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Archive, Activity, Gauge, Clock, Loader2, Film, ChevronRight } from 'lucide-react';

// Backend retorna camelCase via serde(rename_all = "camelCase")
interface AppStats {
  totalAssets: number;
  jobsToday: number;
  avgVmaf: number | null;
  activeJobs: number;
  diskFreeBytes: number | null;
  diskTotalBytes: number | null;
}

interface Job {
  id: string;
  asset_id: string;
  profile: string;
  status: 'queued' | 'processing' | 'done' | 'error' | 'cancelled' | 'qc_quarantined' | 'qc_rejected';
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

interface AssetMap {
  [id: string]: string;
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

  const fetchData = useCallback(async () => {
    try {
      const [statsData, jobsData, assetsData] = await Promise.all([
        invoke<AppStats>('get_stats'),
        invoke<Job[]>('list_jobs'),
        invoke<{ id: string; filename: string }[]>('list_assets'),
      ]);
      setStats(statsData);
      setRecentJobs(jobsData.slice(0, 5));
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

  const getVmafColor = (score: number | null) => {
    if (score === null) return 'text-gray-500';
    if (score >= 85) return 'text-green-500';
    if (score >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  const vmafDist = {
    below70: recentJobs.filter(j => j.vmaf_score !== null && j.vmaf_score < 70).length,
    from70to85: recentJobs.filter(j => j.vmaf_score !== null && j.vmaf_score >= 70 && j.vmaf_score < 85).length,
    from85to95: recentJobs.filter(j => j.vmaf_score !== null && j.vmaf_score >= 85 && j.vmaf_score < 95).length,
    above95: recentJobs.filter(j => j.vmaf_score !== null && j.vmaf_score >= 95).length,
  };

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
        <Loader2 className="animate-spin mr-2" /> A carregar...
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* STATS CARDS — 3 colunas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
      </div>

      {/* JOBS RECENTES — largura total */}
      <div className="space-y-4">
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

      {/* DISTRIBUIÇÃO VMAF — largura total */}
      <div className="bg-[#141824] border border-[#1e2433] rounded-2xl p-6">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-6">Distribuição VMAF</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
  );
}
