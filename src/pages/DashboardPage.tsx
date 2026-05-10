import React, { useEffect, useState } from 'react';
import { useTauriCommand } from '@/hooks/useTauriCommand';
import { LayoutDashboard, CheckCircle2, Server, AlertTriangle, HardDrive } from 'lucide-react';
import { VMAFGauge } from '@/components/VMAFGauge';
import { NexoraStatusBadge } from '@/components/NexoraStatusBadge';
import { ProgressBar } from '@/components/ProgressBar';
import { Job } from '@/store/jobs';

interface AppStats {
  total_assets: number;
  completed_today: number;
  failed_today: number;
  avg_vmaf: number | null;
  active_jobs: number;
  disk_free_gb: number;
  disk_total_gb: number;
}

export const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<AppStats | null>(null);
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const { execute: getStats } = useTauriCommand('get_stats');
  const { execute: listJobs } = useTauriCommand('list_jobs');
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchDashboardData = async () => {
      try {
        const [statsData, jobsData] = await Promise.all([
          getStats().catch(() => null),
          listJobs().catch(() => [])
        ]);

        if (!isMounted) return;

        if (statsData) {
          setStats(statsData as AppStats);
        } else {
          // Fallback during development if get_stats is not yet implemented
          setStats({
            total_assets: 0,
            completed_today: 0,
            failed_today: 0,
            avg_vmaf: 0,
            active_jobs: 0,
            disk_free_gb: 100,
            disk_total_gb: 500
          });
        }

        if (jobsData && Array.isArray(jobsData)) {
          // Sort by newest first and get top 5
          const sorted = [...jobsData].sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          ).slice(0, 5);
          setRecentJobs(sorted);
        }

        setLoading(false);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      }
    };

    fetchDashboardData();

    // Poll stats every 30s
    const statsInterval = setInterval(() => {
      getStats().then(data => {
        if (isMounted && data) setStats(data as AppStats);
      }).catch(() => {});
    }, 30000);

    // Poll jobs every 10s
    const jobsInterval = setInterval(() => {
      listJobs().then(data => {
        if (isMounted && data && Array.isArray(data)) {
          const sorted = [...data].sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          ).slice(0, 5);
          setRecentJobs(sorted);
        }
      }).catch(() => {});
    }, 10000);

    return () => {
      isMounted = false;
      clearInterval(statsInterval);
      clearInterval(jobsInterval);
    };
  }, [getStats, listJobs]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <Server className="w-12 h-12 mb-4 animate-pulse opacity-50" />
        <p>A carregar dashboard...</p>
      </div>
    );
  }

  const diskPercentage = stats && stats.disk_total_gb > 0 
    ? ((stats.disk_total_gb - stats.disk_free_gb) / stats.disk_total_gb) * 100 
    : 0;

  const lowDiskSpace = stats && stats.disk_free_gb < 5;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <LayoutDashboard className="text-nexora-blue w-6 h-6" />
          Dashboard
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Visão geral do sistema e estado do processamento.
        </p>
      </header>

      {/* Grid de 4 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Card: Assets Hoje */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
              Assets Hoje
            </h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
            {stats?.completed_today || 0}
          </p>
          {stats && stats.failed_today > 0 && (
            <p className="text-xs text-red-500 font-medium mt-1">
              + {stats.failed_today} com falha
            </p>
          )}
        </div>

        {/* Card: Em Processamento */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Server className="w-5 h-5 text-nexora-blue" />
            </div>
            <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
              Em Processamento
            </h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
            {stats?.active_jobs || 0}
          </p>
          <p className="text-xs text-gray-500 font-medium mt-1">
            Jobs ativos no momento
          </p>
        </div>

        {/* Card: VMAF Médio */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm flex flex-col items-center justify-center relative overflow-hidden">
          <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider absolute top-4 left-4 z-10">
            VMAF Médio
          </h3>
          <div className="scale-75 origin-center mt-6">
            <VMAFGauge score={stats?.avg_vmaf || 0} />
          </div>
        </div>

        {/* Card: Espaço Livre */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2 rounded-lg ${lowDiskSpace ? 'bg-red-100 dark:bg-red-900/30' : 'bg-gray-100 dark:bg-gray-800'}`}>
                {lowDiskSpace ? (
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                ) : (
                  <HardDrive className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                )}
              </div>
              <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Espaço Livre
              </h3>
            </div>
            <p className={`text-2xl font-bold mt-2 ${lowDiskSpace ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
              {stats?.disk_free_gb.toFixed(1)} GB
            </p>
            <p className="text-xs text-gray-500 font-medium mt-1">
              de {stats?.disk_total_gb.toFixed(1)} GB total
            </p>
          </div>
          
          <div className="mt-4">
            <ProgressBar 
              progress={diskPercentage} 
              color={lowDiskSpace ? "bg-red-500" : "bg-nexora-blue"} 
            />
          </div>
        </div>
      </div>

      {/* Tabela: Últimos Jobs */}
      <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/20">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
            Últimos 5 Jobs
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50/30 dark:bg-gray-800/30 border-b border-gray-200 dark:border-gray-800">
                <th className="px-6 py-3 font-semibold text-gray-500">ID</th>
                <th className="px-6 py-3 font-semibold text-gray-500">Perfil</th>
                <th className="px-6 py-3 font-semibold text-gray-500">Progresso</th>
                <th className="px-6 py-3 font-semibold text-gray-500">Status</th>
                <th className="px-6 py-3 font-semibold text-gray-500 text-right">Criado em</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {recentJobs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                    Nenhum job recente.
                  </td>
                </tr>
              ) : (
                recentJobs.map(job => (
                  <tr key={job.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-3 font-mono text-xs text-gray-500">
                      {job.id.split('-')[0]}
                    </td>
                    <td className="px-6 py-3 font-medium text-gray-900 dark:text-white">
                      {job.profile}
                    </td>
                    <td className="px-6 py-3">
                      <div className="w-32">
                        <ProgressBar progress={job.progress} showPercentage />
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <NexoraStatusBadge status={job.status} />
                    </td>
                    <td className="px-6 py-3 text-right text-xs text-gray-500">
                      {new Date(job.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
