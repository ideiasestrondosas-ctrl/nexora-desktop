import React from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useSystemMetrics } from '@/hooks/useSystemMetrics';
import { useGPU } from '@/hooks/useGPU';
import { useDiskSpace } from '@/hooks/useDiskSpace';
import { LogOut, Cpu, MemoryStick, HardDrive, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ScreenInfo {
  name: string;
  description: string;
}

const SCREEN_MAP: Record<string, ScreenInfo> = {
  dashboard: { name: 'Dashboard', description: 'Visão geral do sistema e métricas em tempo real' },
  library: { name: 'Biblioteca', description: 'Gestão de assets e pré-visualização' },
  queue: { name: 'Fila de Processamento', description: 'Pipeline de jobs e aprovações' },
  profiles: { name: 'Perfis de Codificação', description: 'Configuração de perfis de transcode' },
  settings: { name: 'Definições', description: 'Preferências e informação do sistema' },
  logs: { name: 'Registos', description: 'Histórico de eventos e diagnóstico' },
  detail: { name: 'Detalhe do Asset', description: 'Metadados e processamento do ficheiro' },
};

function CircularGauge({ value, label, icon: Icon, colorClass }: {
  value: number; label: string; icon: React.ElementType; colorClass: string;
}) {
  const pct = Math.min(Math.max(value, 0), 100);
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  let strokeColor = 'stroke-green-500';
  if (pct > 80) strokeColor = 'stroke-red-500';
  else if (pct > 60) strokeColor = 'stroke-yellow-500';

  return (
    <div className="flex items-center gap-2.5" title={`${label}: ${isNaN(pct) ? '--' : pct.toFixed(0)}%`}>
      <div className="relative w-12 h-12 flex items-center justify-center">
        <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
          <circle
            cx="24" cy="24" r={radius}
            className="stroke-[#1e2433] fill-none"
            strokeWidth="4"
          />
          <circle
            cx="24" cy="24" r={radius}
            className={cn('fill-none transition-all duration-700', strokeColor)}
            strokeWidth="4"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <Icon size={16} className={cn('absolute', colorClass)} />
      </div>
      <div className="flex flex-col leading-none">
        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{label}</span>
        <span className={cn('text-xs font-bold', pct > 80 ? 'text-red-500' : 'text-white')}>
          {isNaN(pct) ? '--' : `${pct.toFixed(0)}%`}
        </span>
      </div>
    </div>
  );
}

interface TopBarProps {
  activeTab: string;
}

export default function TopBar({ activeTab }: TopBarProps) {
  const metrics = useSystemMetrics();
  const { gpu } = useGPU();
  const disk = useDiskSpace();

  const screen = SCREEN_MAP[activeTab] ?? { name: activeTab, description: '' };

  const cpuPercent = metrics?.cpuPercent ?? 0;
  const memPercent = metrics && metrics.memTotalBytes > 0
    ? (metrics.memUsedBytes / metrics.memTotalBytes) * 100
    : 0;
  const gpuPercent = gpu?.available ? 15 : 0;
  const diskPercent = disk.usedPercent ?? 0;

  return (
    <div className="h-16 bg-[#0a0d14] border-b border-[#1e2433] flex items-center justify-between px-6 shrink-0 z-40">
      {/* Drag area + Título */}
      <div data-tauri-drag-region className="flex-1 flex items-center gap-3 min-w-0">
        <div className="flex flex-col">
          <h2 className="text-base font-bold text-white leading-tight truncate">{screen.name}</h2>
          <span className="text-xs text-gray-500 font-medium truncate">{screen.description}</span>
        </div>
      </div>

      {/* Métricas circulares */}
      <div className="hidden md:flex items-center gap-6 mr-5">
        <CircularGauge value={cpuPercent} label="CPU" icon={Cpu} colorClass="text-[#1A6FD4]" />
        <CircularGauge value={memPercent} label="RAM" icon={MemoryStick} colorClass="text-green-500" />
        <CircularGauge value={gpuPercent} label="GPU" icon={Monitor} colorClass="text-purple-500" />
        <CircularGauge value={diskPercent} label="Disco" icon={HardDrive} colorClass="text-yellow-500" />
      </div>

      {/* Botão Sair */}
      <button
        onClick={() => invoke('exit_app')}
        className="p-2.5 rounded-lg text-gray-500 hover:text-red-500 hover:bg-red-500/10 transition-colors"
        title="Sair do programa"
      >
        <LogOut size={20} />
      </button>
    </div>
  );
}
