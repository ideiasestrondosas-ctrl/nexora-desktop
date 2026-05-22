import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CloudFileBrowserModal } from '@/components/CloudFileBrowserModal';
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ save: vi.fn() }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string, opts?: Record<string, unknown>) => {
      if (!opts) return k;
      return Object.entries(opts).reduce((s, [k2, v]) => s.replace(`{{${k2}}}`, String(v)), k);
    },
  }),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// ── Fixtures ───────────────────────────────────────────────────────────────────

const profile = {
  id: 's3-prod',
  name: 'S3-prod',
  provider: 's3' as const,
  config: {},
  createdAt: '2024-01-01',
};

const mockFiles = [
  { name: 'footage', path: 'footage', size: null, modified: null, isDir: true },
  {
    name: 'clip.mp4',
    path: 'clip.mp4',
    size: 1000000,
    modified: '2026-05-22T10:00:00Z',
    isDir: false,
  },
  {
    name: 'promo.mp4',
    path: 'promo.mp4',
    size: 500000,
    modified: '2026-05-21T08:00:00Z',
    isDir: false,
  },
];

const mockSubFiles = [
  {
    name: 'raw.mp4',
    path: 'footage/raw.mp4',
    size: 2000000,
    modified: '2026-05-20T06:00:00Z',
    isDir: false,
  },
];

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('CloudFileBrowserModal', () => {
  beforeEach(() => {
    vi.mocked(invoke).mockClear();
    vi.mocked(save).mockClear();
  });

  it('não renderiza nada quando profile é null', () => {
    const { container } = render(<CloudFileBrowserModal profile={null} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('mostra spinner enquanto cloud_list_files está pendente', async () => {
    vi.mocked(invoke).mockImplementation(() => new Promise(() => {}));
    render(<CloudFileBrowserModal profile={profile} onClose={vi.fn()} />);
    expect(screen.getByTestId('browser-loading')).toBeInTheDocument();
  });

  it('renderiza lista de ficheiros após resposta do backend', async () => {
    vi.mocked(invoke).mockResolvedValue(mockFiles);
    render(<CloudFileBrowserModal profile={profile} onClose={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText('clip.mp4')).toBeInTheDocument();
      expect(screen.getByText('promo.mp4')).toBeInTheDocument();
      expect(screen.getByText('footage')).toBeInTheDocument();
    });
  });

  it('mostra estado vazio quando lista é vazia', async () => {
    vi.mocked(invoke).mockResolvedValue([]);
    render(<CloudFileBrowserModal profile={profile} onClose={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByTestId('browser-empty')).toBeInTheDocument();
    });
  });

  it('mostra banner de erro quando cloud_list_files falha', async () => {
    vi.mocked(invoke).mockRejectedValue(new Error('Ligação recusada'));
    render(<CloudFileBrowserModal profile={profile} onClose={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByTestId('browser-error')).toBeInTheDocument();
    });
  });

  it('clicar numa pasta chama cloud_list_files com subpath correcto', async () => {
    vi.mocked(invoke).mockResolvedValueOnce(mockFiles).mockResolvedValueOnce(mockSubFiles);
    render(<CloudFileBrowserModal profile={profile} onClose={vi.fn()} />);
    await waitFor(() => screen.getByText('footage'));
    fireEvent.click(screen.getByTestId('folder-footage'));
    await waitFor(() => {
      expect(vi.mocked(invoke)).toHaveBeenCalledWith('cloud_list_files', {
        profileId: 's3-prod',
        subpath: 'footage',
      });
    });
  });

  it('breadcrumb: clicar na raiz volta ao path inicial', async () => {
    vi.mocked(invoke).mockResolvedValue(mockFiles);
    render(<CloudFileBrowserModal profile={profile} onClose={vi.fn()} />);
    await waitFor(() => screen.getByTestId('breadcrumb-root'));
    fireEvent.click(screen.getByTestId('breadcrumb-root'));
    expect(vi.mocked(invoke)).toHaveBeenCalledWith('cloud_list_files', {
      profileId: 's3-prod',
      subpath: null,
    });
  });

  it('"Sel. Todos" selecciona todos os ficheiros (não pastas)', async () => {
    vi.mocked(invoke).mockResolvedValue(mockFiles);
    render(<CloudFileBrowserModal profile={profile} onClose={vi.fn()} />);
    await waitFor(() => screen.getByTestId('select-all'));
    fireEvent.click(screen.getByTestId('select-all'));
    expect(screen.getByTestId('checkbox-clip.mp4')).toBeChecked();
    expect(screen.getByTestId('checkbox-promo.mp4')).toBeChecked();
    // pastas não ficam seleccionadas
    expect(screen.queryByTestId('checkbox-footage')).not.toBeChecked();
  });

  it('apagar ficheiro individual chama cloud_delete_files com o path correcto', async () => {
    vi.mocked(invoke).mockResolvedValueOnce(mockFiles).mockResolvedValueOnce([]);
    render(<CloudFileBrowserModal profile={profile} onClose={vi.fn()} />);
    await waitFor(() => screen.getByTestId('delete-btn-clip.mp4'));
    fireEvent.click(screen.getByTestId('delete-btn-clip.mp4'));
    await waitFor(() => {
      expect(vi.mocked(invoke)).toHaveBeenCalledWith('cloud_delete_files', {
        profileId: 's3-prod',
        paths: ['clip.mp4'],
      });
    });
  });

  it('"Apagar Tudo" chama cloud_delete_files com todos os paths de ficheiros', async () => {
    vi.mocked(invoke).mockResolvedValueOnce(mockFiles).mockResolvedValueOnce([]);
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<CloudFileBrowserModal profile={profile} onClose={vi.fn()} />);
    await waitFor(() => screen.getByTestId('delete-all-btn'));
    fireEvent.click(screen.getByTestId('delete-all-btn'));
    await waitFor(() => {
      expect(vi.mocked(invoke)).toHaveBeenCalledWith('cloud_delete_files', {
        profileId: 's3-prod',
        paths: expect.arrayContaining(['clip.mp4', 'promo.mp4']),
      });
    });
    confirmSpy.mockRestore();
  });

  it('falhas parciais de delete mostram toast.error', async () => {
    const { toast } = await import('sonner');
    vi.mocked(invoke)
      .mockResolvedValueOnce(mockFiles)
      .mockResolvedValueOnce(['clip.mp4: permissão negada']);
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<CloudFileBrowserModal profile={profile} onClose={vi.fn()} />);
    await waitFor(() => screen.getByTestId('delete-btn-clip.mp4'));
    fireEvent.click(screen.getByTestId('delete-btn-clip.mp4'));
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
    confirmSpy.mockRestore();
  });

  it('download chama save() e depois cloud_download_file', async () => {
    vi.mocked(invoke).mockResolvedValueOnce(mockFiles).mockResolvedValueOnce(undefined);
    vi.mocked(save).mockResolvedValue('/downloads/clip.mp4');
    render(<CloudFileBrowserModal profile={profile} onClose={vi.fn()} />);
    await waitFor(() => screen.getByTestId('download-btn-clip.mp4'));
    fireEvent.click(screen.getByTestId('download-btn-clip.mp4'));
    await waitFor(() => {
      expect(vi.mocked(save)).toHaveBeenCalled();
      expect(vi.mocked(invoke)).toHaveBeenCalledWith('cloud_download_file', {
        profileId: 's3-prod',
        remotePath: 'clip.mp4',
        localPath: '/downloads/clip.mp4',
      });
    });
  });

  it('cancelar o diálogo de download não chama cloud_download_file', async () => {
    vi.mocked(invoke).mockResolvedValueOnce(mockFiles);
    vi.mocked(save).mockResolvedValue(null);
    render(<CloudFileBrowserModal profile={profile} onClose={vi.fn()} />);
    await waitFor(() => screen.getByTestId('download-btn-clip.mp4'));
    fireEvent.click(screen.getByTestId('download-btn-clip.mp4'));
    await waitFor(() => expect(vi.mocked(save)).toHaveBeenCalled());
    expect(vi.mocked(invoke)).not.toHaveBeenCalledWith('cloud_download_file', expect.anything());
  });
});
