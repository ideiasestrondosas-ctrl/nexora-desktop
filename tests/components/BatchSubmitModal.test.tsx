import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { BatchSubmitModal } from '@/components/BatchSubmitModal';
import { useCloudStore } from '@/store/cloud';
import { invoke } from '@tauri-apps/api/core';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockCloudProfiles = [
  { id: 's3-prod', name: 'S3-prod', provider: 's3' as const, config: {}, createdAt: '2024-01-01' },
  {
    id: 'gd-work',
    name: 'GDrive-work',
    provider: 'gdrive' as const,
    config: {},
    createdAt: '2024-01-01',
  },
];

const mockTranscodeProfile = {
  id: 'web-hd',
  name: 'web-hd',
  description: '',
  is_system: true,
  container: 'mp4',
  video_codec: 'h264',
  resolution: '1920x1080',
  fps: 30,
  bitrate_kbps: null,
  vmaf_threshold: 93,
};

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn() }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/store/cloud', () => ({
  useCloudStore: vi.fn((selector: (s: { profiles: typeof mockCloudProfiles }) => unknown) =>
    selector({ profiles: [] }),
  ),
  PROVIDER_LABELS: {
    ftp: 'FTP/FTPS',
    sftp: 'SFTP',
    smb: 'Pasta de Rede (SMB)',
    s3: 'Amazon S3 / Compatível',
    gdrive: 'Google Drive',
    icloud: 'iCloud Drive',
  },
}));
vi.mock('@/lib/estimate', () => ({ estimateProcessingTime: () => '~1 min' }));

// ── Helpers ────────────────────────────────────────────────────────────────────

const defaultProps = {
  open: true,
  paths: ['/videos/clip.mp4'],
  onClose: vi.fn(),
  onComplete: vi.fn(),
};

function withProfiles() {
  vi.mocked(useCloudStore).mockImplementation((selector) =>
    selector({ profiles: mockCloudProfiles }),
  );
}

function withoutProfiles() {
  vi.mocked(useCloudStore).mockImplementation((selector) => selector({ profiles: [] }));
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('BatchSubmitModal — cloud destinations', () => {
  beforeEach(() => {
    defaultProps.onClose.mockClear();
    defaultProps.onComplete.mockClear();
    vi.mocked(invoke).mockClear();
    vi.mocked(invoke).mockImplementation(async (cmd) => {
      if (cmd === 'get_settings') return { output_dir: '/output' };
      if (cmd === 'list_profiles') return [mockTranscodeProfile];
      if (cmd === 'ingest_asset') return { id: 'asset-1' };
      if (cmd === 'submit_job') return {};
      return {};
    });
    withoutProfiles();
  });

  it('mostra CTA quando não há perfis cloud', () => {
    withoutProfiles();
    render(<BatchSubmitModal {...defaultProps} />);
    expect(screen.getByText(/batch.cloudNoneConfigured/i)).toBeInTheDocument();
  });

  it('não mostra CTA quando há perfis cloud', () => {
    withProfiles();
    render(<BatchSubmitModal {...defaultProps} />);
    expect(screen.queryByText(/batch.cloudNoneConfigured/i)).not.toBeInTheDocument();
  });

  it('mostra picker global com perfis quando há cloud configurada', () => {
    withProfiles();
    render(<BatchSubmitModal {...defaultProps} />);
    expect(screen.getByText('S3-prod')).toBeInTheDocument();
    expect(screen.getByText('GDrive-work')).toBeInTheDocument();
  });

  it('chama onOpenCloudSettings e onClose ao clicar na CTA', () => {
    withoutProfiles();
    const onOpenCloudSettings = vi.fn();
    const onClose = vi.fn();
    render(
      <BatchSubmitModal
        {...defaultProps}
        onClose={onClose}
        onOpenCloudSettings={onOpenCloudSettings}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /batch\.cloudAddProfile/i }));
    expect(onOpenCloudSettings).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('clicar no botão de destino de uma linha expande a secção de override', () => {
    withProfiles();
    render(<BatchSubmitModal {...defaultProps} />);
    const destBtn = screen.getByTestId('dest-btn-/videos/clip.mp4');
    fireEvent.click(destBtn);
    expect(screen.getByTestId('override-section-/videos/clip.mp4')).toBeInTheDocument();
    expect(screen.getByText(/batch\.cloudOverrideLabel/i)).toBeInTheDocument();
  });

  it('clicar duas vezes no botão de destino fecha o override', () => {
    withProfiles();
    render(<BatchSubmitModal {...defaultProps} />);
    const destBtn = screen.getByTestId('dest-btn-/videos/clip.mp4');
    fireEvent.click(destBtn);
    expect(screen.getByTestId('override-section-/videos/clip.mp4')).toBeInTheDocument();
    fireEvent.click(destBtn);
    expect(screen.queryByTestId('override-section-/videos/clip.mp4')).not.toBeInTheDocument();
  });

  it('submit_job recebe cloudProfileIds do picker global', async () => {
    withProfiles();
    render(<BatchSubmitModal {...defaultProps} />);
    fireEvent.click(screen.getByTestId('global-cloud-s3-prod'));
    fireEvent.click(screen.getByRole('button', { name: /batch.processAll/i }));
    await waitFor(() => {
      expect(vi.mocked(invoke)).toHaveBeenCalledWith(
        'submit_job',
        expect.objectContaining({ cloudProfileIds: ['s3-prod'] }),
      );
    });
  });

  it('submit_job recebe cloudProfileIds do override por ficheiro', async () => {
    withProfiles();
    render(<BatchSubmitModal {...defaultProps} />);
    fireEvent.click(screen.getByTestId('dest-btn-/videos/clip.mp4'));
    const overrideSection = screen.getByTestId('override-section-/videos/clip.mp4');
    fireEvent.click(within(overrideSection).getByTestId('override-cloud-gd-work'));
    fireEvent.click(screen.getByRole('button', { name: /batch.processAll/i }));
    await waitFor(() => {
      expect(vi.mocked(invoke)).toHaveBeenCalledWith(
        'submit_job',
        expect.objectContaining({ cloudProfileIds: ['gd-work'] }),
      );
    });
  });

  it('override por ficheiro tem precedência sobre o picker global', async () => {
    withProfiles();
    render(<BatchSubmitModal {...defaultProps} />);
    fireEvent.click(screen.getByTestId('global-cloud-s3-prod'));
    fireEvent.click(screen.getByTestId('dest-btn-/videos/clip.mp4'));
    const overrideSection = screen.getByTestId('override-section-/videos/clip.mp4');
    fireEvent.click(within(overrideSection).getByTestId('override-cloud-gd-work'));
    fireEvent.click(screen.getByRole('button', { name: /batch.processAll/i }));
    await waitFor(() => {
      const submitCalls = vi.mocked(invoke).mock.calls.filter(([cmd]) => cmd === 'submit_job');
      expect(submitCalls).toHaveLength(1);
      expect(submitCalls[0][1]).toMatchObject({ cloudProfileIds: ['gd-work'] });
      expect((submitCalls[0][1] as { cloudProfileIds: string[] }).cloudProfileIds).toEqual([
        'gd-work',
      ]);
    });
  });

  it('submit_job recebe cloudProfileIds vazio quando sem selecção', async () => {
    withProfiles();
    render(<BatchSubmitModal {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /batch.processAll/i }));
    await waitFor(() => {
      expect(vi.mocked(invoke)).toHaveBeenCalledWith(
        'submit_job',
        expect.objectContaining({ cloudProfileIds: [] }),
      );
    });
  });

  it('override local tem precedência sobre picker global — envia cloudProfileIds vazio', async () => {
    withProfiles();
    render(<BatchSubmitModal {...defaultProps} />);
    // seleccionar S3-prod globalmente
    fireEvent.click(screen.getByTestId('global-cloud-s3-prod'));
    // abrir override e seleccionar Local
    fireEvent.click(screen.getByTestId('dest-btn-/videos/clip.mp4'));
    const overrideSection = screen.getByTestId('override-section-/videos/clip.mp4');
    fireEvent.click(within(overrideSection).getByTestId('override-local-/videos/clip.mp4'));
    // processar
    fireEvent.click(screen.getByRole('button', { name: /batch.processAll/i }));
    await waitFor(() => {
      const submitCalls = vi.mocked(invoke).mock.calls.filter(([cmd]) => cmd === 'submit_job');
      expect(submitCalls).toHaveLength(1);
      expect((submitCalls[0][1] as { cloudProfileIds: string[] }).cloudProfileIds).toEqual([]);
    });
  });
});
