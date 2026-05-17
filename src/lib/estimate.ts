const PROFILE_MULTIPLIERS: Record<string, number> = {
  proxy: 0.4,
  social: 0.8,
  'web-hd': 1.5,
  'broadcast-sd': 1.8,
  'broadcast-hd': 2.0,
  'web-4k': 3.0,
  'web-vp9': 3.0,
  'archive-hevc': 4.0,
};

function resolutionMultiplier(width: number | null): number {
  if (!width) return 1.5;
  if (width >= 3840) return 4.0;
  if (width >= 1920) return 1.5;
  if (width >= 1280) return 1.0;
  return 0.6;
}

function formatSeconds(secs: number): string {
  if (secs < 60) return `~${Math.ceil(secs)} seg`;
  if (secs < 3600) return `~${Math.ceil(secs / 60)} min`;
  return `~${(secs / 3600).toFixed(1)} h`;
}

export function estimateProcessingTime(
  profileName: string,
  widthOrNull: number | null,
  durationSecs: number | null,
): string {
  if (!durationSecs) return '—';
  const pm = PROFILE_MULTIPLIERS[profileName] ?? 1.5;
  const rm = resolutionMultiplier(widthOrNull);
  const estimatedSecs = durationSecs * pm * rm;
  return formatSeconds(estimatedSecs);
}
