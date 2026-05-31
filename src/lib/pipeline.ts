export const PIPELINE_STEPS = [
  { key: 'ingest', short: 'IN' },
  { key: 'qc-pre', short: 'QC' },
  { key: 'transcode', short: 'TR' },
  { key: 'audio', short: 'AU' },
  { key: 'proxy', short: 'PX' },
  { key: 'thumbnail', short: 'TH' },
  { key: 'qc-post', short: 'QP' },
  { key: 'delivery', short: 'DL' },
] as const;

export type PipelineStepKey = (typeof PIPELINE_STEPS)[number]['key'];

export const PIPELINE_PHASES = [
  { labelKey: 'queue.phaseAnalyse', steps: ['ingest', 'qc-pre'] as PipelineStepKey[] },
  {
    labelKey: 'queue.phaseConvert',
    steps: ['transcode', 'audio', 'proxy', 'thumbnail'] as PipelineStepKey[],
  },
  { labelKey: 'queue.phaseVerify', steps: ['qc-post', 'delivery'] as PipelineStepKey[] },
];

export function getStepIndex(stepKey: string | null): number {
  if (!stepKey) return -1;
  return PIPELINE_STEPS.findIndex((s) => s.key === stepKey);
}
