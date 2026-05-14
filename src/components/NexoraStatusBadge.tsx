import React from 'react';
import { useTranslation } from 'react-i18next';

type Status = 'pending' | 'queued' | 'processing' | 'done' | 'error' | 'cancelled';

interface StatusBadgeProps {
  status: Status;
}

const statusColors: Record<Status, string> = {
  pending: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100',
  queued: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
  processing: 'bg-nexora-green/20 text-nexora-green',
  done: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
  error: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
  cancelled: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100',
};

export const NexoraStatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const { t } = useTranslation();
  const color = statusColors[status] || statusColors.pending;
  const label = t(`status.${status}`);

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {label}
    </span>
  );
};
