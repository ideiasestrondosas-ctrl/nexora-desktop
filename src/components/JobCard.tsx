import React from 'react';
import { useTranslation } from 'react-i18next';
import { Job } from '@/store/jobs';
import { ProgressBar } from './ProgressBar';
import { NexoraStatusBadge } from './NexoraStatusBadge';
import { VMAFGauge } from './VMAFGauge';
import { FileVideo, XCircle, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface JobCardProps {
  job: Job;
  filename: string;
  onCancel?: (id: string) => void;
}

export const JobCard: React.FC<JobCardProps> = ({ job, filename, onCancel }) => {
  const { t } = useTranslation();
  const isProcessing = job.status === 'processing';
  const isDone = job.status === 'done';
  const isError = job.status === 'error';

  return (
    <div className={cn(
      "p-4 rounded-xl border transition-all duration-200 bg-white dark:bg-gray-900",
      isProcessing ? "border-nexora-blue shadow-sm" : "border-gray-200 dark:border-gray-800"
    )}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn(
            "p-2 rounded-lg",
            isDone ? "bg-green-50 dark:bg-green-900/20" : "bg-gray-100 dark:bg-gray-800"
          )}>
            <FileVideo className={cn(
              "w-5 h-5",
              isDone ? "text-green-500" : "text-gray-500"
            )} />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {filename}
            </h4>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400">
                {job.profile}
              </span>
              <span className="text-gray-300 dark:text-gray-700">|</span>
              <NexoraStatusBadge status={job.status} />
            </div>
          </div>
        </div>

        {isProcessing && onCancel && (
          <button 
            onClick={() => onCancel(job.id)}
            className="text-gray-400 hover:text-red-500 transition-colors"
            title={t('jobCard.cancel')}
          >
            <XCircle className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="mt-4">
        <div className="flex justify-between items-end mb-1.5">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {job.step || (isProcessing ? t('jobCard.processing') : '')}
          </span>
          <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
            {Math.round(job.progress * 100)}%
          </span>
        </div>
        <ProgressBar
          progress={job.progress * 100}
          color={isError ? 'bg-red-500' : isDone ? 'bg-green-500' : 'bg-nexora-blue'}
        />
      </div>

      {(isDone || isError) && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div className="flex gap-4">
            {job.vmaf_score && <VMAFGauge score={job.vmaf_score} />}
            {job.lufs && (
              <div className="flex items-center gap-1">
                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                  {job.lufs.toFixed(1)}
                </span>
                <span className="text-[10px] text-gray-400">LUFS</span>
              </div>
            )}
          </div>
          
          <div className="text-[10px] text-gray-400 flex items-center gap-1">
             {isDone ? (
               <><CheckCircle className="w-3 h-3 text-green-500" /> {t('jobCard.completedAt', { date: job.finished_at ? new Date(job.finished_at).toLocaleTimeString() : '' })}</>
             ) : isError ? (
               <><AlertCircle className="w-3 h-3 text-red-500" /> {job.error || t('jobCard.unknownError')}</>
             ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
