import React from 'react';
import { useTranslation } from 'react-i18next';

interface VMAFGaugeProps {
  score: number | null;
  size?: 'sm' | 'md' | 'lg';
}

export const VMAFGauge: React.FC<VMAFGaugeProps> = ({ score, size = 'md' }) => {
  const { t } = useTranslation();
  if (score === null)
    return <span className="text-gray-400 text-xs">{t('vmafGauge.notAvailable')}</span>;

  const getScoreColor = (val: number) => {
    if (val >= 93) return 'text-green-500';
    if (val >= 90) return 'text-nexora-green';
    if (val >= 85) return 'text-yellow-500';
    return 'text-red-500';
  };

  const sizes = {
    sm: 'text-xs',
    md: 'text-sm font-bold',
    lg: 'text-lg font-bold',
  };

  return (
    <div className="flex items-center gap-1">
      <span className={`${sizes[size]} ${getScoreColor(score)}`}>{score.toFixed(2)}</span>
      <span className="text-[10px] text-gray-400 font-normal">{t('vmafGauge.label')}</span>
    </div>
  );
};
