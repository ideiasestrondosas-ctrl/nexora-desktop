import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';

// QCPreWorker — não usa FFmpeg, ideal para testes unitários puros

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    statSync: vi.fn(),
  };
});

vi.mock('../sidecar/db', () => ({
  getAsset: vi.fn(),
  writeAuditLog: vi.fn(),
  updateJobStatus: vi.fn(),
}));

import { statSync } from 'fs';
import { QCPreWorker } from '../sidecar/workers/qc-pre-worker';
import * as db from '../sidecar/db';
import type { JobContext } from '../sidecar/orchestrator/NexoraDesktopOrchestrator';

const mockStatSync = statSync as Mock;
const mockGetAsset = db.getAsset as Mock;
const mockWriteAuditLog = db.writeAuditLog as Mock;
const mockUpdateJobStatus = db.updateJobStatus as Mock;

const BASE_CTX: JobContext = {
  jobId: 'job-1',
  assetId: 'asset-1',
  assetPath: '/media/video.mp4',
  profile: 'broadcast-hd',
  outputDir: '/output',
};

const VALID_ASSET = {
  id: 'asset-1',
  path: '/media/video.mp4',
  filename: 'video.mp4',
  status: 'pending',
  size_bytes: 1024 * 1024 * 100,
  duration_secs: 30,
  video_codec: 'h264',
  audio_codec: 'aac',
  width: 1920,
  height: 1080,
  fps: 25,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  metadata: null,
};

describe('QCPreWorker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStatSync.mockReturnValue({ size: 1024 * 1024 * 50 }); // 50 MB por defeito
    mockGetAsset.mockReturnValue(VALID_ASSET);
  });

  it('passa quando o asset é válido', async () => {
    const worker = new QCPreWorker();
    await expect(worker.run(BASE_CTX)).resolves.toBe('PASS');
    expect(mockWriteAuditLog).toHaveBeenCalledWith('job-1', 'qc-pre:passed', expect.any(Object));
  });

  it('rejeita ficheiro vazio (size = 0)', async () => {
    mockStatSync.mockReturnValue({ size: 0 });
    const worker = new QCPreWorker();
    await expect(worker.run(BASE_CTX)).rejects.toThrow('ficheiro vazio');
  });

  it('rejeita ficheiro maior que 100 GB', async () => {
    const over100GB = 101 * 1024 ** 3;
    mockStatSync.mockReturnValue({ size: over100GB });
    const worker = new QCPreWorker();
    await expect(worker.run(BASE_CTX)).rejects.toThrow('demasiado grande');
  });

  it('rejeita quando o asset não existe na BD', async () => {
    mockGetAsset.mockReturnValue(null);
    const worker = new QCPreWorker();
    await expect(worker.run(BASE_CTX)).rejects.toThrow('não encontrado');
  });

  it('rejeita ficheiro sem stream de vídeo', async () => {
    mockGetAsset.mockReturnValue({ ...VALID_ASSET, video_codec: null });
    const worker = new QCPreWorker();
    await expect(worker.run(BASE_CTX)).rejects.toThrow('sem stream de vídeo');
  });

  it('rejeita duração inferior a 0.5s', async () => {
    mockGetAsset.mockReturnValue({ ...VALID_ASSET, duration_secs: 0.3 });
    const worker = new QCPreWorker();
    await expect(worker.run(BASE_CTX)).rejects.toThrow('duração insuficiente');
  });

  it('passa quando duration_secs é null (desconhecido)', async () => {
    mockGetAsset.mockReturnValue({ ...VALID_ASSET, duration_secs: null });
    const worker = new QCPreWorker();
    await expect(worker.run(BASE_CTX)).resolves.toBe('PASS');
  });

  it('coloca em quarentena ficheiros > 50 GB', async () => {
    const size100GB = 100 * 1024 ** 3;
    mockStatSync.mockReturnValue({ size: size100GB });
    const worker = new QCPreWorker();
    await expect(worker.run(BASE_CTX)).resolves.toBe('QUARANTINE');
  });

  it('coloca em quarentena ficheiros com codec não suportado', async () => {
    mockGetAsset.mockReturnValue({ ...VALID_ASSET, video_codec: 'hevc' });
    const worker = new QCPreWorker();
    await expect(worker.run(BASE_CTX)).resolves.toBe('QUARANTINE');
    expect(mockUpdateJobStatus).toHaveBeenCalledWith('job-1', 'qc_quarantined');
  });

  it('inclui metadados do asset no audit log', async () => {
    const worker = new QCPreWorker();
    await worker.run(BASE_CTX);

    expect(mockWriteAuditLog).toHaveBeenCalledWith(
      'job-1',
      'qc-pre:passed',
      expect.objectContaining({
        assetId: 'asset-1',
        videoCodec: 'h264',
        durationSecs: 30,
      })
    );
  });
});
