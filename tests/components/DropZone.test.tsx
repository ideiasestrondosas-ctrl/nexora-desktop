import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DropZone, hasSupportedExtension, SUPPORTED_EXTENSIONS } from '@/components/DropZone';

// Mock Tauri APIs
vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(() => Promise.resolve(() => {})),
}));
vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn(),
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));
vi.mock('sonner', () => ({
  toast: { error: vi.fn() },
}));

describe('hasSupportedExtension', () => {
  it('accepts all supported extensions', () => {
    for (const ext of SUPPORTED_EXTENSIONS) {
      expect(hasSupportedExtension(`/path/to/video${ext}`)).toBe(true);
    }
  });

  it('rejects unsupported extensions', () => {
    expect(hasSupportedExtension('/path/to/file.pdf')).toBe(false);
    expect(hasSupportedExtension('/path/to/file.jpg')).toBe(false);
    expect(hasSupportedExtension('/path/to/file.txt')).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(hasSupportedExtension('/path/to/video.MP4')).toBe(true);
    expect(hasSupportedExtension('/path/to/video.MKV')).toBe(true);
    expect(hasSupportedExtension('/path/to/video.MOV')).toBe(true);
  });
});

describe('DropZone component', () => {
  const onFilesSelected = vi.fn();

  beforeEach(() => {
    onFilesSelected.mockClear();
  });

  it('renders drop zone with action buttons', () => {
    render(<DropZone onFilesSelected={onFilesSelected} />);

    expect(screen.getByText('dropZone.dropHere')).toBeInTheDocument();
    expect(screen.getByText('dropZone.addMedia')).toBeInTheDocument();
    expect(screen.getByText('dropZone.addFolder')).toBeInTheDocument();
  });

  it('prevents default on dragOver', () => {
    render(<DropZone onFilesSelected={onFilesSelected} />);
    const zone = screen.getByText('dropZone.dropHere').closest('div')!.parentElement!;
    const event = new Event('dragover', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'preventDefault', { value: vi.fn() });
    zone.dispatchEvent(event);
  });

  it('opens file dialog on addMedia click', async () => {
    const { open } = await import('@tauri-apps/plugin-dialog');
    vi.mocked(open).mockResolvedValueOnce(null);

    render(<DropZone onFilesSelected={onFilesSelected} />);
    fireEvent.click(screen.getByText('dropZone.addMedia'));

    expect(open).toHaveBeenCalledWith(expect.objectContaining({ multiple: true }));
  });

  it('calls onFilesSelected with result from file dialog', async () => {
    const { open } = await import('@tauri-apps/plugin-dialog');
    vi.mocked(open).mockResolvedValueOnce(['/path/video.mp4', '/path/clip.mkv']);

    render(<DropZone onFilesSelected={onFilesSelected} />);
    fireEvent.click(screen.getByText('dropZone.addMedia'));

    await vi.waitFor(() => {
      expect(onFilesSelected).toHaveBeenCalledWith(['/path/video.mp4', '/path/clip.mkv']);
    });
  });

  it('opens folder dialog on addFolder click', async () => {
    const { open } = await import('@tauri-apps/plugin-dialog');
    vi.mocked(open).mockResolvedValueOnce(null);

    render(<DropZone onFilesSelected={onFilesSelected} />);
    fireEvent.click(screen.getByText('dropZone.addFolder'));

    expect(open).toHaveBeenCalledWith(expect.objectContaining({ directory: true }));
  });
});
