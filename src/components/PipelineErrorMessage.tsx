import { useTranslation } from 'react-i18next';
import { AlertCircle } from 'lucide-react';

interface ErrorInfo {
  title: string;
  hint: string;
}

function categorize(raw: string, t: (key: string) => string): ErrorInfo {
  const r = raw.toLowerCase();
  if (r.includes('no space left') || r.includes('disk full') || r.includes('enospc')) {
    return { title: t('jobCard.errors.diskFull'), hint: t('jobCard.errors.diskFullHint') };
  }
  if (r.includes('permission denied') || r.includes('access is denied') || r.includes('eperm')) {
    return { title: t('jobCard.errors.permission'), hint: t('jobCard.errors.permissionHint') };
  }
  if (
    r.includes('invalid data found') ||
    r.includes('moov atom not found') ||
    r.includes('not supported')
  ) {
    return { title: t('jobCard.errors.corrupt'), hint: t('jobCard.errors.corruptHint') };
  }
  if (
    r.includes('encoder not found') ||
    r.includes('codec not found') ||
    r.includes('unknown encoder')
  ) {
    return { title: t('jobCard.errors.codec'), hint: t('jobCard.errors.codecHint') };
  }
  if (r.includes('sigkill') || r.includes('killed') || r.includes('signal 9')) {
    return { title: t('jobCard.errors.killed'), hint: t('jobCard.errors.killedHint') };
  }
  return { title: t('jobCard.errors.generic'), hint: t('jobCard.errors.genericHint') };
}

interface Props {
  rawError: string | null | undefined;
}

export default function PipelineErrorMessage({ rawError }: Props) {
  const { t } = useTranslation();
  const { title, hint } = rawError
    ? categorize(rawError, t)
    : { title: t('jobCard.unknownError'), hint: t('jobCard.errorSuggestion') };

  return (
    <span className="flex flex-col gap-0.5">
      <span className="flex items-center gap-1 text-red-400">
        <AlertCircle className="w-3 h-3 flex-shrink-0" />
        {title}
      </span>
      <span className="text-xs text-text-muted pl-4">{hint}</span>
    </span>
  );
}
