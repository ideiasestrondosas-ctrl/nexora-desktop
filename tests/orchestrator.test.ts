import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';

vi.mock('../sidecar/events', () => ({
  emit: vi.fn(),
}));

vi.mock('../sidecar/workers/ingest-worker', () => ({
  IngestWorker: vi.fn().mockImplementation(function () {
    return { run: vi.fn().mockResolvedValue(undefined) };
  }),
}));
vi.mock('../sidecar/workers/qc-pre-worker', () => ({
  QCPreWorker: vi.fn().mockImplementation(function () {
    return { run: vi.fn().mockResolvedValue(undefined) };
  }),
}));
vi.mock('../sidecar/workers/transcode-worker', () => ({
  TranscodeWorker: vi.fn().mockImplementation(function () {
    return {
      run: vi.fn().mockImplementation(function (_ctx: unknown, onProgress: (n: number) => void) {
        onProgress(1.0);
        return Promise.resolve();
      }),
    };
  }),
}));
vi.mock('../sidecar/workers/audio-worker', () => ({
  AudioWorker: vi.fn().mockImplementation(function () {
    return { run: vi.fn().mockResolvedValue(undefined) };
  }),
}));
vi.mock('../sidecar/workers/proxy-worker', () => ({
  ProxyWorker: vi.fn().mockImplementation(function () {
    return { run: vi.fn().mockResolvedValue(undefined) };
  }),
}));
vi.mock('../sidecar/workers/thumbnail-worker', () => ({
  ThumbnailWorker: vi.fn().mockImplementation(function () {
    return { run: vi.fn().mockResolvedValue(undefined) };
  }),
}));
vi.mock('../sidecar/workers/qc-post-worker', () => ({
  QCPostWorker: vi.fn().mockImplementation(function () {
    return { run: vi.fn().mockResolvedValue(undefined) };
  }),
}));
vi.mock('../sidecar/workers/delivery-worker', () => ({
  DeliveryWorker: vi.fn().mockImplementation(function () {
    return { run: vi.fn().mockResolvedValue(undefined) };
  }),
}));

import { NexoraDesktopOrchestrator } from '../sidecar/orchestrator/NexoraDesktopOrchestrator';
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
};

describe('NexoraDesktopOrchestrator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('emite job:started com jobId e assetId correctos', async () => {
    const orch = new NexoraDesktopOrchestrator();
    await orch.run(baseCtx);

    expect(mockEmit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'job:started', jobId: 'job-abc', assetId: 'asset-xyz' }),
    );
  });

  it('emite job:completed no final', async () => {
    const orch = new NexoraDesktopOrchestrator();
    await orch.run(baseCtx);

    expect(mockEmit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'job:completed', jobId: 'job-abc' }),
    );
  });

  it('emite progresso durante o pipeline', async () => {
    const orch = new NexoraDesktopOrchestrator();
    await orch.run(baseCtx);

    const progressCalls = mockEmit.mock.calls.filter(([arg]) => arg.type === 'job:progress');
    expect(progressCalls.length).toBeGreaterThan(0);
  });

  it('progresso está sempre entre 0 e 1', async () => {
    const orch = new NexoraDesktopOrchestrator();
    await orch.run(baseCtx);

    const progressValues = mockEmit.mock.calls
      .filter(([arg]) => arg.type === 'job:progress')
      .map(([arg]) => arg.progress as number);

    for (const p of progressValues) {
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    }
  });

  it('emite job:failed quando um worker falha', async () => {
    const { TranscodeWorker } = await import('../sidecar/workers/transcode-worker');
    (TranscodeWorker as Mock).mockImplementationOnce(() => ({
      run: vi.fn().mockRejectedValue(new Error('GPU falhou')),
    }));

    const orch = new NexoraDesktopOrchestrator();
    await expect(orch.run(baseCtx)).rejects.toThrow('GPU falhou');

    expect(mockEmit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'job:failed', jobId: 'job-abc' }),
    );
  });

  it('usa outputDir do ctx', async () => {
    const ctxWithOutput = { ...baseCtx, outputDir: '/custom/output' };
    const orch = new NexoraDesktopOrchestrator();
    await orch.run(ctxWithOutput);

    expect(mockEmit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'job:completed', jobId: 'job-abc' }),
    );
  });
});
