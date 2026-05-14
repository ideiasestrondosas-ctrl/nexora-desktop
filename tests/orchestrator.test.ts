import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';

<<<<<<< HEAD
vi.mock('../sidecar/db', () => ({
  markJobRunning: vi.fn(),
  updateJobProgress: vi.fn(),
  markJobDone: vi.fn(),
  markJobFailed: vi.fn(),
  writeAuditLog: vi.fn(),
}));

=======
>>>>>>> dev
vi.mock('../sidecar/events', () => ({
  emit: vi.fn(),
}));

vi.mock('../sidecar/workers/ingest-worker', () => ({
  IngestWorker: vi.fn().mockImplementation(() => ({ run: vi.fn().mockResolvedValue(undefined) })),
}));
vi.mock('../sidecar/workers/qc-pre-worker', () => ({
  QCPreWorker: vi.fn().mockImplementation(() => ({ run: vi.fn().mockResolvedValue(undefined) })),
}));
vi.mock('../sidecar/workers/transcode-worker', () => ({
  TranscodeWorker: vi.fn().mockImplementation(() => ({
<<<<<<< HEAD
    run: vi.fn().mockImplementation((_ctx, onProgress: (n: number) => void) => {
=======
    run: vi.fn().mockImplementation((_ctx: any, onProgress: (n: number) => void) => {
>>>>>>> dev
      onProgress(1.0);
      return Promise.resolve();
    }),
  })),
}));
vi.mock('../sidecar/workers/audio-worker', () => ({
  AudioWorker: vi.fn().mockImplementation(() => ({
    run: vi.fn().mockResolvedValue(undefined),
  })),
}));
vi.mock('../sidecar/workers/proxy-worker', () => ({
  ProxyWorker: vi.fn().mockImplementation(() => ({
    run: vi.fn().mockResolvedValue(undefined),
  })),
}));
vi.mock('../sidecar/workers/thumbnail-worker', () => ({
  ThumbnailWorker: vi.fn().mockImplementation(() => ({
    run: vi.fn().mockResolvedValue(undefined),
  })),
}));
vi.mock('../sidecar/workers/qc-post-worker', () => ({
  QCPostWorker: vi.fn().mockImplementation(() => ({
    run: vi.fn().mockResolvedValue(undefined),
  })),
}));
vi.mock('../sidecar/workers/delivery-worker', () => ({
  DeliveryWorker: vi.fn().mockImplementation(() => ({
    run: vi.fn().mockResolvedValue(undefined),
  })),
}));

import { NexoraDesktopOrchestrator } from '../sidecar/orchestrator/NexoraDesktopOrchestrator';
<<<<<<< HEAD
import * as db from '../sidecar/db';
import * as events from '../sidecar/events';

const mockMarkJobRunning = db.markJobRunning as Mock;
const mockMarkJobDone = db.markJobDone as Mock;
const mockMarkJobFailed = db.markJobFailed as Mock;
const mockUpdateJobProgress = db.updateJobProgress as Mock;
const mockEmit = events.emit as Mock;

const fakeJob = {
  id: 'job-abc',
  asset_id: 'asset-xyz',
  profile: 'broadcast-hd',
  output_path: null,
=======
import type { JobContext } from '../sidecar/orchestrator/NexoraDesktopOrchestrator';
import * as events from '../sidecar/events';

const mockEmit = events.emit as Mock;

const baseCtx: JobContext = {
  jobId: 'job-abc',
  assetId: 'asset-xyz',
  assetPath: '/input/video.mp4',
  profile: 'broadcast-hd',
  outputDir: '/output',
  assetVideoCodec: 'h264',
  assetDurationSecs: 60,
>>>>>>> dev
};

describe('NexoraDesktopOrchestrator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

<<<<<<< HEAD
  it('marca o job como running no início', async () => {
    const orch = new NexoraDesktopOrchestrator();
    await orch.run(fakeJob, '/input/video.mp4', '/output');

    expect(mockMarkJobRunning).toHaveBeenCalledWith('job-abc');
  });

  it('emite job:started com jobId e assetId correctos', async () => {
    const orch = new NexoraDesktopOrchestrator();
    await orch.run(fakeJob, '/input/video.mp4', '/output');
=======
  it('emite job:started com jobId e assetId correctos', async () => {
    const orch = new NexoraDesktopOrchestrator();
    await orch.run(baseCtx);
>>>>>>> dev

    expect(mockEmit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'job:started', jobId: 'job-abc', assetId: 'asset-xyz' })
    );
  });

<<<<<<< HEAD
  it('chama markJobDone no final do pipeline com sucesso', async () => {
    const orch = new NexoraDesktopOrchestrator();
    await orch.run(fakeJob, '/input/video.mp4', '/output');

    expect(mockMarkJobDone).toHaveBeenCalledWith('job-abc', null, null, null);
  });

  it('emite job:completed no final', async () => {
    const orch = new NexoraDesktopOrchestrator();
    await orch.run(fakeJob, '/input/video.mp4', '/output');
=======
  it('emite job:completed no final', async () => {
    const orch = new NexoraDesktopOrchestrator();
    await orch.run(baseCtx);
>>>>>>> dev

    expect(mockEmit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'job:completed', jobId: 'job-abc' })
    );
  });

  it('emite progresso durante o pipeline', async () => {
    const orch = new NexoraDesktopOrchestrator();
<<<<<<< HEAD
    await orch.run(fakeJob, '/input/video.mp4', '/output');
=======
    await orch.run(baseCtx);
>>>>>>> dev

    const progressCalls = mockEmit.mock.calls.filter(
      ([arg]) => arg.type === 'job:progress'
    );
    expect(progressCalls.length).toBeGreaterThan(0);
  });

  it('progresso está sempre entre 0 e 1', async () => {
    const orch = new NexoraDesktopOrchestrator();
<<<<<<< HEAD
    await orch.run(fakeJob, '/input/video.mp4', '/output');

    const progressValues = mockUpdateJobProgress.mock.calls.map(([, p]) => p as number);
=======
    await orch.run(baseCtx);

    const progressValues = mockEmit.mock.calls
      .filter(([arg]) => arg.type === 'job:progress')
      .map(([arg]) => arg.progress as number);

>>>>>>> dev
    for (const p of progressValues) {
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    }
  });

<<<<<<< HEAD
  it('chama markJobFailed quando um worker falha', async () => {
=======
  it('emite job:failed quando um worker falha', async () => {
>>>>>>> dev
    const { TranscodeWorker } = await import('../sidecar/workers/transcode-worker');
    (TranscodeWorker as Mock).mockImplementationOnce(() => ({
      run: vi.fn().mockRejectedValue(new Error('GPU falhou')),
    }));

    const orch = new NexoraDesktopOrchestrator();
<<<<<<< HEAD
    await orch.run(fakeJob, '/input/video.mp4', '/output');

    expect(mockMarkJobFailed).toHaveBeenCalledWith('job-abc', expect.stringContaining('GPU falhou'));
  });

  it('emite job:failed quando um worker falha', async () => {
    const { TranscodeWorker } = await import('../sidecar/workers/transcode-worker');
    (TranscodeWorker as Mock).mockImplementationOnce(() => ({
      run: vi.fn().mockRejectedValue(new Error('codec inválido')),
    }));

    const orch = new NexoraDesktopOrchestrator();
    await orch.run(fakeJob, '/input/video.mp4', '/output');
=======
    await expect(orch.run(baseCtx)).rejects.toThrow('GPU falhou');
>>>>>>> dev

    expect(mockEmit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'job:failed', jobId: 'job-abc' })
    );
  });

<<<<<<< HEAD
  it('usa output_path do job quando definido', async () => {
    const jobWithOutput = { ...fakeJob, output_path: '/custom/output' };
    const orch = new NexoraDesktopOrchestrator();

    // Verificar que o ctx.outputDir é o output_path e não o outputDir passado como arg
    await orch.run(jobWithOutput, '/input/video.mp4', '/default/output');

    // O pipeline deve ter corrido com sucesso (sem erro de path)
    expect(mockMarkJobDone).toHaveBeenCalled();
=======
  it('usa outputDir do ctx', async () => {
    const ctxWithOutput = { ...baseCtx, outputDir: '/custom/output' };
    const orch = new NexoraDesktopOrchestrator();
    await orch.run(ctxWithOutput);

    expect(mockEmit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'job:completed', jobId: 'job-abc' })
    );
>>>>>>> dev
  });
});
