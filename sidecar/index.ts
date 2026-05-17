/**
 * Nexora Sidecar — Stateless Job Runner
 *
 * Receives a single job via stdin (JSON), executes the pipeline,
 * and reports progress/results via stdout (JSON lines).
 *
 * No database access. No daemon mode. One process = one job.
 */
import { NexoraDesktopOrchestrator, JobContext } from './orchestrator/NexoraDesktopOrchestrator';
import { emit } from './events';
import { nxInfo, nxError } from './logger';

interface JobInput {
  jobId: string;
  assetId: string;
  assetPath: string;
  profile: string;
  outputDir: string;
  // Metadados do asset passados pelo Rust — podem ser null para assets recém-ingeridos
  assetDurationSecs?: number | null;
  assetVideoCodec?: string | null;
  assetAudioCodec?: string | null;
  assetWidth?: number | null;
  assetHeight?: number | null;
  assetFps?: number | null;
  assetSizeBytes?: number | null;
}

// Read one line from stdin
function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => resolve(data.trim()));
    process.stdin.on('error', reject);
  });
}

async function main(): Promise<void> {
  const raw = await readStdin();
  if (!raw) {
    nxError('sidecar', 'No job input received on stdin');
    emit({ type: 'job:failed', error: 'No job input received on stdin' });
    process.exit(1);
  }

  let job: JobInput;
  try {
    job = JSON.parse(raw) as JobInput;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    nxError('sidecar', `Invalid JSON input: ${msg}`);
    emit({ type: 'job:failed', error: `Invalid JSON input: ${msg}` });
    process.exit(1);
  }

  nxInfo('sidecar', `Starting job ${job.jobId} — asset: ${job.assetId}, profile: ${job.profile}`);

  const ctx: JobContext = {
    jobId: job.jobId,
    assetId: job.assetId,
    assetPath: job.assetPath,
    profile: job.profile,
    outputDir: job.outputDir,
    // Pré-preencher com valores da DB — o IngestWorker irá sobrescrever com ffprobe
    assetDurationSecs: job.assetDurationSecs ?? null,
    assetVideoCodec: job.assetVideoCodec ?? null,
    assetAudioCodec: job.assetAudioCodec ?? null,
    assetWidth: job.assetWidth ?? null,
    assetHeight: job.assetHeight ?? null,
    assetFps: job.assetFps ?? null,
    assetSizeBytes: job.assetSizeBytes ?? null,
  };

  try {
    await new NexoraDesktopOrchestrator().run(ctx);
    nxInfo('sidecar', `Job ${job.jobId} completed`);
    process.exit(0);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    nxError('sidecar', `Job ${job.jobId} failed: ${message}`);
    process.exit(1);
  }
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  nxError('sidecar', `Fatal error: ${msg}`);
  emit({ type: 'job:failed', error: `Fatal error: ${msg}` });
  process.exit(1);
});
