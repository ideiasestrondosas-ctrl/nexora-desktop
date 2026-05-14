import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Terminal, Trash2, RefreshCw, Search, AlertTriangle, Info, AlertCircle, ChevronDown } from 'lucide-react';
import { useLogs } from '@/hooks/useLogs';
import { cn } from '@/lib/utils';

type LevelFilter = 'all' | 'ERROR' | 'WARN' | 'INFO';

const LEVEL_CONFIG: Record<string, { badge: string; icon: React.ReactNode }> = {
  ERROR: {
    badge: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
    icon: <AlertCircle className="w-3 h-3" />,
  },
  WARN: {
    badge: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
    icon: <AlertTriangle className="w-3 h-3" />,
  },
  INFO: {
    badge: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    icon: <Info className="w-3 h-3" />,
  },
};

function LevelBadge({ level }: { level: string }) {
  const { t } = useTranslation();
  const cfg = LEVEL_CONFIG[level] ?? LEVEL_CONFIG['INFO'];
  return (
    <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase', cfg.badge)}>
      {cfg.icon}
      {t(`logViewer.${level.toLowerCase()}`)}
    </span>
  );
}

function formatTs(ts: string, locale: string) {
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return ts;
  }
}

export const LogViewer: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('all');
  const [search, setSearch] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);

  const { logs, stats, loading, refresh, clearLogs } = useLogs(
    levelFilter !== 'all' ? levelFilter : undefined,
    search || undefined,
  );

  useEffect(() => {
    if (autoScroll && listRef.current) {
      listRef.current.scrollTop = 0;
    }
  }, [logs.length, autoScroll]);

  const levels: { id: LevelFilter; labelKey: string; count?: number; color: string }[] = [
    { id: 'all', labelKey: 'all', count: stats.total, color: 'text-gray-600 dark:text-gray-400' },
    { id: 'ERROR', labelKey: 'error', count: stats.errors, color: 'text-red-600 dark:text-red-400' },
    { id: 'WARN', labelKey: 'warn', count: stats.warnings, color: 'text-yellow-600 dark:text-yellow-400' },
    { id: 'INFO', labelKey: 'info', count: stats.info, color: 'text-blue-600 dark:text-blue-400' },
  ];

  return (
    <div className="flex flex-col bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-nexora-blue" />
          <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{t('logViewer.title')}</span>
          {stats.errors > 0 && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
              {stats.errors} ERR
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoScroll((v) => !v)}
            title={autoScroll ? t('logViewer.autoScrollActive') : t('logViewer.autoScrollInactive')}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase transition-colors',
              autoScroll
                ? 'bg-nexora-blue/10 text-nexora-blue'
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300',
            )}
          >
            <ChevronDown className="w-3 h-3" /> {t('logViewer.auto')}
          </button>
          <button
            onClick={refresh}
            disabled={loading}
            className="p-1.5 text-gray-400 hover:text-nexora-blue transition-colors"
            title={t('common.refresh')}
          >
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          </button>
          <button
            onClick={clearLogs}
            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
            title={t('logViewer.clearLogs')}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 px-5 py-2.5 border-b border-gray-100 dark:border-gray-800">
        <div className="flex gap-1">
          {levels.map((l) => (
            <button
              key={l.id}
              onClick={() => setLevelFilter(l.id)}
              className={cn(
                'px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all',
                levelFilter === l.id
                  ? 'bg-nexora-blue text-white'
                  : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800',
              )}
            >
              {t(`logViewer.${l.labelKey}`)}
              {l.count !== undefined && l.count > 0 && (
                <span className={cn('ml-1.5', levelFilter === l.id ? 'text-blue-200' : l.color)}>
                  {l.count}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('logViewer.searchPlaceholder')}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-1 focus:ring-nexora-blue"
          />
        </div>
      </div>

      {/* Lista de entradas */}
      <div ref={listRef} className="overflow-y-auto max-h-96 font-mono text-xs">
        {logs.length === 0 ? (
          <div className="px-5 py-10 text-center text-gray-400">
            {loading ? t('logViewer.loading') : t('logViewer.noLogs')}
          </div>
        ) : (
          <table className="w-full border-collapse">
            <tbody>
              {logs.map((entry) => (
                <tr
                  key={entry.id}
                  className={cn(
                    'border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors',
                    entry.level === 'ERROR' && 'bg-red-50/30 dark:bg-red-900/10',
                    entry.level === 'WARN' && 'bg-yellow-50/30 dark:bg-yellow-900/10',
                  )}
                >
                  <td className="px-4 py-1.5 whitespace-nowrap text-gray-400 w-20">
                    {formatTs(entry.ts, i18n.language)}
                  </td>
                  <td className="px-2 py-1.5 w-16">
                    <LevelBadge level={entry.level} />
                  </td>
                  <td className="px-2 py-1.5 whitespace-nowrap text-gray-400 dark:text-gray-500 w-44 truncate max-w-[11rem]" title={entry.source}>
                    {entry.source.replace('rust:nexora_desktop_lib::', '').replace('rust:', '')}
                  </td>
                  <td className="px-2 py-1.5 text-gray-700 dark:text-gray-300 break-all">
                    {entry.message}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-2 border-t border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-800/20 text-[10px] text-gray-400 flex justify-between">
        <span>{t('logViewer.entriesVisible', { count: logs.length })}</span>
        <span>{t('logViewer.autoRotate')}</span>
      </div>
    </div>
  );
};
