import React from 'react';

type Status = 'pending' | 'queued' | 'processing' | 'done' | 'error' | 'cancelled';

interface StatusBadgeProps {
  status: Status;
}

const statusConfig: Record<Status, { label: string, color: string }> = {
  pending: { label: 'Pendente', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100' },
  queued: { label: 'Na Fila', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100' },
  processing: { label: 'Processando', color: 'bg-nexora-green/20 text-nexora-green' },
  done: { label: 'Concluído', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' },
  error: { label: 'Erro', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100' },
  cancelled: { label: 'Cancelado', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100' },
};

export const NexoraStatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const config = statusConfig[status] || statusConfig.pending;
  
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
};
