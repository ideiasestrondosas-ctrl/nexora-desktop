import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Mock } from 'vitest';

// Mocks declarados antes dos imports do módulo
vi.mock('../sidecar/db', () => ({
  getQueuedJobs: vi.fn(),
  getRunningJobCount: vi.fn(),
  getAsset: vi.fn(),
}));

vi.mock('../sidecar/events', () => ({
  emit: vi.fn(),
}));

vi.mock('../sidecar/orchestrator/NexoraDesktopOrchestrator', () => ({
  NexoraDesktopOrchestrator: vi.fn().mockImplementation(() => ({
    run: vi.fn().mockResolvedValue(undefined),
  })),
}));

import { NexoraSimpleQueue } from '../sidecar/queue/NexoraSimpleQueue';
import * as db from '../sidecar/db';
import * as events from '../sidecar/events';

const mockGetQueuedJobs = db.getQueuedJobs as Mock;
const mockGetRunningJobCount = db.getRunningJobCount as Mock;
const mockGetAsset = db.getAsset as Mock;
const mockEmit = events.emit as Mock;

describe('NexoraSimpleQueue', () => {
  let queue: NexoraSimpleQueue;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    queue = new NexoraSimpleQueue('/tmp/output');
  });

  afterEach(() => {
    queue.stop();
    vi.useRealTimers();
  });

  it('emite ready ao arrancar', () => {
    mockGetRunningJobCount.mockReturnValue(0);
    mockGetQueuedJobs.mockReturnValue([]);

    queue.start();

    expect(mockEmit).toHaveBeenCalledWith({ type: 'ready' });
  });

  it('não emite ready duas vezes se start() chamado duas vezes', () => {
    mockGetRunningJobCount.mockReturnValue(0);
    mockGetQueuedJobs.mockReturnValue([]);

    queue.start();
    queue.start();

    expect(mockEmit).toHaveBeenCalledTimes(1);
  });

  it('stop() para o ciclo de polling', () => {
    mockGetRunningJobCount.mockReturnValue(0);
    mockGetQueuedJobs.mockReturnValue([]);

    queue.start();
    queue.stop();

    vi.advanceTimersByTime(10_000);

    // Após stop, o contador de chamadas ao DB não deve aumentar
    const callsAfterStop = mockGetRunningJobCount.mock.calls.length;
    vi.advanceTimersByTime(10_000);
    expect(mockGetRunningJobCount.mock.calls.length).toBe(callsAfterStop);
  });

  it('não despacha jobs quando MAX_CONCURRENT atingido', async () => {
    mockGetRunningJobCount.mockReturnValue(2); // MAX_CONCURRENT = 2
    mockGetQueuedJobs.mockReturnValue([]);

    queue.start();
    // Avança exactamente um ciclo de polling (2000ms) — não entra em loop infinito
    await vi.advanceTimersByTimeAsync(2_001);

    expect(mockGetQueuedJobs).not.toHaveBeenCalled();
  });

  it('emite job:failed quando asset não encontrado', async () => {
    const fakeJob = { id: 'job-1', asset_id: 'asset-missing', profile: 'broadcast-hd', output_path: null };
    mockGetRunningJobCount.mockReturnValue(0);
    mockGetQueuedJobs.mockReturnValue([fakeJob]);
    mockGetAsset.mockReturnValue(null);

    queue.start();
    await vi.advanceTimersByTimeAsync(2_001);

    expect(mockEmit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'job:failed', jobId: 'job-1' })
    );
  });

  it('respeita MAX_CONCURRENT ao calcular slots disponíveis', async () => {
    mockGetRunningJobCount.mockReturnValue(1); // 1 em curso → 1 slot livre
    mockGetQueuedJobs.mockReturnValue([]);

    queue.start();
    await vi.advanceTimersByTimeAsync(2_001);

    expect(mockGetQueuedJobs).toHaveBeenCalledWith(1);
  });
});
