import React from 'react';
import { Cpu, MemoryStick, ArrowDown, ArrowUp } from 'lucide-react';
import { useSystemMetrics } from '@/hooks/useSystemMetrics';
import { cn } from '@/lib/utils';

function fmtBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B/s`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB/s`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB/s`;
}

function fmtGb(bytes: number): string {
  return (bytes / (1024 ** 3)).toFixed(1);
}

function MiniBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
      <div
        className={cn('h-full rounded-full transition-all duration-700', color)}
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  );
}

export const SystemMetricsBar: React.FC = () => {
  const m = useSystemMetrics();

  if (!m) {
    return (
      <div className="hidden xl:flex items-center gap-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider animate-pulse">
        <span>A carregar métricas...</span>
      </div>
    );
  }

  const cpuColor = m.cpuPercent > 80 ? 'bg-red-500' : m.cpuPercent > 50 ? 'bg-yellow-500' : 'bg-nexora-green';
  const memPercent = m.memTotalBytes > 0 ? (m.memUsedBytes / m.memTotalBytes) * 100 : 0;
  const memColor = memPercent > 80 ? 'bg-red-500' : memPercent > 60 ? 'bg-yellow-500' : 'bg-nexora-blue';

  return (
    <div className="hidden xl:flex items-center gap-5 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider select-none">
      {/* CPU */}
      <div className="flex items-center gap-1.5">
        <Cpu className="w-3 h-3" />
        <span className={cn(m.cpuPercent > 80 ? 'text-red-500' : '')}>
          {m.cpuPercent.toFixed(0)}%
        </span>
        <MiniBar value={m.cpuPercent} color={cpuColor} />
      </div>

      <span className="text-gray-200 dark:text-gray-700">|</span>

      {/* RAM */}
      <div className="flex items-center gap-1.5">
        <MemoryStick className="w-3 h-3" />
        <span className={cn(memPercent > 80 ? 'text-red-500' : '')}>
          {fmtGb(m.memUsedBytes)}/{fmtGb(m.memTotalBytes)} GB
        </span>
        <MiniBar value={memPercent} color={memColor} />
      </div>

      <span className="text-gray-200 dark:text-gray-700">|</span>

      {/* Rede */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <ArrowDown className="w-3 h-3 text-nexora-green" />
          <span>{fmtBytes(m.netRxBps)}</span>
        </div>
        <div className="flex items-center gap-1">
          <ArrowUp className="w-3 h-3 text-nexora-blue" />
          <span>{fmtBytes(m.netTxBps)}</span>
        </div>
      </div>
    </div>
  );
};
