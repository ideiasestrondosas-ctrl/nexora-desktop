import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';

// QCPreWorker — stateless, lê metadados do ctx (não da BD)

vi.mock('fs', () => {
  const statSyncMock = vi.fn();
  return {
    statSync: statSyncMock,
    default: {
      statSync: statSyncMock,
    },
  };
});

vi.mock('../sidecar/events', () => ({
  emit: vi.fn(),
}));

import { statSync } from 'fs';
import { QCPreWorker } from '../sidecar/workers/qc-pre-worker';
import { emit } from '../sidecar/events';
import type { JobContext } from '../sidecar/orchestrator/NexoraDesktopOrchestrator';

const mockStatSync = statSync as Mock;
const mockEmit = emit as Mock;

function makeCtx(overrides: Partial<JobContext> = {}): JobContext {
  return {
    jobId: 'job-1',
    assetId: 'asset-1',
    assetPath: '/media/video.mp4',
    profile: 'broadcast-hd',
    outputDir: '/output',
    assetVideoCodec: 'h264',
    assetAudioCodec: 'aac',
    assetDurationSecs: 30,
    assetWidth: 1920,
    assetHeight: 1080,
    assetFps: 25,
    assetSizeBytes: 1024 * 1024 * 100,
    ...overrides,
  };
}

describe('QCPreWorker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStatSync.mockReturnValue({ size: 1024 * 1024 * 50 }); // 50 MB por defeito
  });

  it('passa quando o asset é válido', async () => {
    const worker = new QCPreWorker();
    await expect(worker.run(makeCtx())).resolves.toBe('PASS');
    expect(mockEmit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'log', source: 'qc-pre-worker' }),
    );
  });

  it('rejeita ficheiro vazio (size = 0)', async () => {
    mockStatSync.mockReturnValue({ size: 0 });
    const worker = new QCPreWorker();
    await expect(worker.run(makeCtx())).rejects.toThrow('ficheiro vazio');
  });

  it('rejeita ficheiro maior que 100 GB', async () => {
    const over100GB = 101 * 1024 ** 3;
    mockStatSync.mockReturnValue({ size: over100GB });
    const worker = new QCPreWorker();
    await expect(worker.run(makeCtx())).rejects.toThrow('demasiado grande');
  });

  it('rejeita ficheiro sem stream de vídeo', async () => {
    const worker = new QCPreWorker();
    await expect(worker.run(makeCtx({ assetVideoCodec: null }))).rejects.toThrow(
      'sem stream de vídeo',
    );
  });

  it('rejeita duração inferior a 0.5s', async () => {
    const worker = new QCPreWorker();
    await expect(worker.run(makeCtx({ assetDurationSecs: 0.3 }))).rejects.toThrow(
      'duração insuficiente',
    );
  });

  it('passa quando duration_secs é null (desconhecido)', async () => {
    const worker = new QCPreWorker();
    await expect(worker.run(makeCtx({ assetDurationSecs: null }))).resolves.toBe('PASS');
  });

  it('coloca em quarentena ficheiros > 50 GB', async () => {
    const size100GB = 100 * 1024 ** 3;
    mockStatSync.mockReturnValue({ size: size100GB });
    const worker = new QCPreWorker();
    await expect(worker.run(makeCtx())).resolves.toBe('QUARANTINE');
    expect(mockEmit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'job:status', jobId: 'job-1', status: 'qc_quarantined' }),
    );
  });

  it('coloca em quarentena ficheiros com codec não suportado', async () => {
    const worker = new QCPreWorker();
    // hevc é agora suportado como input (v0.19.0); usar prores que continua na blacklist
    await expect(worker.run(makeCtx({ assetVideoCodec: 'prores' }))).resolves.toBe('QUARANTINE');
    expect(mockEmit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'job:status', jobId: 'job-1', status: 'qc_quarantined' }),
    );
  });

  it('inclui metadados do asset no emit log', async () => {
    const worker = new QCPreWorker();
    await worker.run(makeCtx());

    const logCall = mockEmit.mock.calls.find(
      (call: [unknown]) => (call[0] as { type: string }).type === 'log',
    );
    expect(logCall).toBeDefined();
    expect(logCall![0]).toMatchObject({
      source: 'qc-pre-worker',
      message: expect.stringContaining('h264'),
    });
  });
});
