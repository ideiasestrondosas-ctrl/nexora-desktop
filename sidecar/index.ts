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
}

// Read one line from stdin
function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { data += chunk; });
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
  emit({ type: 'job:started', jobId: job.jobId, assetId: job.assetId });

  const ctx: JobContext = {
    jobId: job.jobId,
    assetId: job.assetId,
    assetPath: job.assetPath,
    profile: job.profile,
    outputDir: job.outputDir,
  };

  try {
    await new NexoraDesktopOrchestrator().run(ctx);
    nxInfo('sidecar', `Job ${job.jobId} completed`);
    emit({
      type: 'job:completed',
      jobId: job.jobId,
      assetId: job.assetId,
      data: {
        outputPath: ctx.transcodedPath ?? null,
        vmafScore: ctx.vmafScore ?? null,
        lufs: ctx.lufs ?? null,
      },
    });
    process.exit(0);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    nxError('sidecar', `Job ${job.jobId} failed: ${message}`);
    emit({ type: 'job:failed', jobId: job.jobId, error: message });
    process.exit(1);
  }
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  nxError('sidecar', `Fatal error: ${msg}`);
  emit({ type: 'job:failed', error: `Fatal error: ${msg}` });
  process.exit(1);
});
