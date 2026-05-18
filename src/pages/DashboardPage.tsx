import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { invoke, convertFileSrc } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { logActivity } from '@/lib/activityLog';
import { Archive, Activity, Gauge, Clock, Loader2, Film, ChevronRight, Upload } from 'lucide-react';
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { useSystemMetrics } from '@/hooks/useSystemMetrics';

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
  status:
    | 'queued'
    | 'processing'
    | 'done'
    | 'error'
    | 'cancelled'
    | 'qc_quarantined'
    | 'qc_rejected';
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

interface AssetInfo {
  filename: string;
  thumbnail_path: string | null;
}

interface AssetMap {
  [id: string]: AssetInfo;
}

interface DashboardPageProps {
  onNavigate: (page: string) => void;
  onSelectAsset: (id: string) => void;
}

export default function DashboardPage({ onNavigate, onSelectAsset }: DashboardPageProps) {
  const { t, i18n } = useTranslation();
  const [stats, setStats] = useState<AppStats | null>(null);
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [assetMap, setAssetMap] = useState<AssetMap>({});
  const [loading, setLoading] = useState(true);
  const metrics = useSystemMetrics();
  const [metricsHistory, setMetricsHistory] = useState<{ cpu: number; ram: number }[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const [statsData, jobsData, assetsData] = await Promise.all([
        invoke<AppStats>('get_stats'),
        invoke<Job[]>('list_jobs'),
        invoke<{ id: string; filename: string; thumbnail_path: string | null }[]>(
          'list_assets_slim',
        ),
      ]);
      setStats(statsData);
      setAllJobs(jobsData);
      const map: AssetMap = {};
      for (const a of assetsData) {
        map[a.id] = { filename: a.filename, thumbnail_path: a.thumbnail_path };
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
    // Fallback polling a 30s; actualizações em tempo real via evento sidecar:event
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Actualizar em tempo real quando o sidecar emite eventos de job
  useEffect(() => {
    const unlisten = listen('sidecar:event', () => {
      fetchData();
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [fetchData]);

  // Manter histórico de 60 amostras (1 min a 1 sample/2s)
  useEffect(() => {
    if (!metrics) return;
    const ramPct =
      metrics.memTotalBytes > 0 ? (metrics.memUsedBytes / metrics.memTotalBytes) * 100 : 0;
    setMetricsHistory((h) => [...h.slice(-59), { cpu: metrics.cpuPercent, ram: ramPct }]);
  }, [metrics]);

  const recentJobs = allJobs;

  const getVmafColor = (score: number | null) => {
    if (score === null) return 'text-text-muted';
    if (score >= 85) return 'text-green-500';
    if (score >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  const vmafDist = {
    below70: recentJobs.filter((j) => j.vmaf_score !== null && j.vmaf_score < 70).length,
    from70to85: recentJobs.filter(
      (j) => j.vmaf_score !== null && j.vmaf_score >= 70 && j.vmaf_score < 85,
    ).length,
    from85to95: recentJobs.filter(
      (j) => j.vmaf_score !== null && j.vmaf_score >= 85 && j.vmaf_score < 95,
    ).length,
    above95: recentJobs.filter((j) => j.vmaf_score !== null && j.vmaf_score >= 95).length,
  };

  const StatCard = ({
    title,
    value,
    subtitle,
    icon: Icon,
    color,
  }: {
    title: string;
    value: string | number;
    subtitle: string;
    icon: React.ElementType;
    color: string;
  }) => (
    <div className="bg-bg-secondary border border-border rounded-2xl p-6 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">
          {title}
        </span>
        <div className={`p-2 rounded-lg bg-bg-primary border border-border ${color}`}>
          <Icon size={20} />
        </div>
      </div>
      <div className="text-3xl font-black text-text-primary mb-1">{value}</div>
      <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
        {subtitle}
      </div>
    </div>
  );

  if (loading && !stats) {
    return (
      <div className="h-full flex items-center justify-center text-text-muted animate-pulse">
        <Loader2 className="animate-spin mr-2" /> {t('common.loading')}
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* STATS CARDS — 3 colunas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title={t('dashboard.assetsTotal')}
          value={stats?.totalAssets ?? 0}
          subtitle={t('dashboard.processedFiles')}
          icon={Archive}
          color="text-brand"
        />
        <StatCard
          title={t('dashboard.jobsToday')}
          value={stats?.jobsToday ?? 0}
          subtitle={t('dashboard.completedToday')}
          icon={Activity}
          color="text-green-500"
        />
        <StatCard
          title={t('dashboard.vmafAvg')}
          value={stats?.avgVmaf != null ? stats.avgVmaf.toFixed(1) : '--'}
          subtitle={t('dashboard.avgQuality')}
          icon={Gauge}
          color={getVmafColor(stats?.avgVmaf ?? null)}
        />
      </div>

      {/* EMPTY STATE — primeiro uso */}
      {stats?.totalAssets === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-16 bg-bg-secondary border border-dashed border-border rounded-2xl gap-4">
          <div className="w-20 h-20 bg-brand/10 rounded-full flex items-center justify-center">
            <Upload size={36} className="text-brand" />
          </div>
          <div className="text-center">
            <p className="text-base font-black text-text-primary">{t('dashboard.emptyTitle')}</p>
            <p className="text-sm text-text-muted mt-1">{t('dashboard.emptyHint')}</p>
          </div>
          <button
            onClick={() => onNavigate('library')}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand hover:bg-blue-600 text-white rounded-xl text-sm font-bold transition-colors"
          >
            <Upload size={16} /> {t('dashboard.addFirstVideo')}
          </button>
        </div>
      )}

      {/* JOBS RECENTES — largura total */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-text-muted">
            {t('dashboard.recentJobs')}
            {allJobs.length > 0 && (
              <span className="ml-2 text-[10px] font-bold text-text-muted normal-case tracking-normal">
                ({allJobs.length})
              </span>
            )}
          </h2>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('queue')}
              className="text-[11px] font-bold text-brand hover:underline uppercase tracking-widest flex items-center gap-1"
            >
              {t('dashboard.viewAll')} <ChevronRight size={14} />
            </button>
          </div>
        </div>

        <div className="bg-bg-secondary border border-border rounded-2xl overflow-hidden max-h-[520px] overflow-y-auto custom-scrollbar">
          {recentJobs.length === 0 ? (
            <div className="p-12 text-center text-text-muted flex flex-col items-center">
              <Film size={32} className="mb-4 opacity-20" />
              <p className="text-sm">{t('dashboard.noJobs')}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest mt-1">
                {t('dashboard.noJobsHint')}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recentJobs.map((job) => (
                <div
                  key={job.id}
                  className="p-4 flex items-center gap-4 hover:bg-bg-hover transition-colors cursor-pointer"
                  onClick={() => {
                    logActivity(
                      'Job Recente — abrir asset',
                      'navigate',
                      `asset_id=${job.asset_id}`,
                    );
                    onSelectAsset(job.asset_id);
                  }}
                >
                  <div className="w-10 h-10 bg-bg-primary rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                    {assetMap[job.asset_id]?.thumbnail_path ? (
                      <img
                        src={convertFileSrc(assetMap[job.asset_id].thumbnail_path!)}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <Film size={18} className="text-text-muted" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-text-primary truncate">
                      {assetMap[job.asset_id]?.filename ?? `Asset ${job.asset_id.slice(0, 8)}`}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-1.5 py-0.5 bg-surface text-[9px] font-black uppercase text-blue-400 rounded">
                        {job.profile}
                      </span>
                      <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest flex items-center gap-1">
                        <Clock size={10} />
                        {job.started_at
                          ? new Date(job.started_at).toLocaleTimeString(i18n.language, {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : new Date(job.created_at).toLocaleTimeString(i18n.language, {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div
                      className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${
                        job.status === 'done'
                          ? 'text-green-500'
                          : job.status === 'processing'
                            ? 'text-brand animate-pulse'
                            : job.status === 'error'
                              ? 'text-red-500'
                              : 'text-text-muted'
                      }`}
                    >
                      {job.status === 'processing'
                        ? `${t('dashboard.processing')} ${Math.round(job.progress * 100)}%`
                        : job.status === 'done'
                          ? t('dashboard.completed')
                          : job.status === 'error'
                            ? t('dashboard.error')
                            : job.status === 'cancelled'
                              ? t('dashboard.cancelled')
                              : job.status.toUpperCase()}
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

      {/* GRÁFICOS — VMAF + Sistema */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Histograma VMAF */}
        <div className="bg-bg-secondary border border-border rounded-2xl p-6">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-4">
            {t('dashboard.vmafDistribution')}
          </h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart
              data={[
                { range: '<70', count: vmafDist.below70, fill: '#ef4444' },
                { range: '70–85', count: vmafDist.from70to85, fill: '#eab308' },
                { range: '85–95', count: vmafDist.from85to95, fill: '#22c55e' },
                { range: '>95', count: vmafDist.above95, fill: '#1A6FD4' },
              ]}
              margin={{ top: 4, right: 4, bottom: 0, left: -20 }}
            >
              <XAxis dataKey="range" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 8,
                  fontSize: 11,
                }}
                cursor={{ fill: 'var(--color-bg-hover)' }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {[
                  { fill: '#ef4444' },
                  { fill: '#eab308' },
                  { fill: '#22c55e' },
                  { fill: '#1A6FD4' },
                ].map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Sparklines CPU + RAM */}
        <div className="bg-bg-secondary border border-border rounded-2xl p-6 space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-text-muted">
            {t('dashboard.systemMetrics')}
          </h3>
          <div>
            <div className="flex justify-between text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">
              <span>CPU</span>
              <span>{metrics ? `${metrics.cpuPercent.toFixed(0)}%` : '—'}</span>
            </div>
            <ResponsiveContainer width="100%" height={50}>
              <AreaChart data={metricsHistory} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <Area
                  type="monotone"
                  dataKey="cpu"
                  stroke="#1A6FD4"
                  fill="#1A6FD4"
                  fillOpacity={0.15}
                  strokeWidth={1.5}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div>
            <div className="flex justify-between text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">
              <span>RAM</span>
              <span>
                {metrics
                  ? `${((metrics.memUsedBytes / metrics.memTotalBytes) * 100).toFixed(0)}%`
                  : '—'}
              </span>
            </div>
            <ResponsiveContainer width="100%" height={50}>
              <AreaChart data={metricsHistory} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <Area
                  type="monotone"
                  dataKey="ram"
                  stroke="#4FB8A0"
                  fill="#4FB8A0"
                  fillOpacity={0.15}
                  strokeWidth={1.5}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
