import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { openUrl } from '@tauri-apps/plugin-opener';
import { useTranslation } from 'react-i18next';
import { X, Copy, Github, FileText } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function BugReportModal({ open, onClose }: Props) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [includeLogs, setIncludeLogs] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [titleError, setTitleError] = useState(false);

  if (!open) return null;

  const buildContent = async (): Promise<string> => {
    let content = `## ${title}\n\n${desc}`;
    if (includeLogs) {
      const logs = await invoke<string>('get_last_n_logs_text', { n: 50 });
      content += `\n\n## Logs\n\`\`\`\n${logs}\n\`\`\``;
    }
    return content;
  };

  const validate = () => {
    if (!title.trim()) {
      setTitleError(true);
      return false;
    }
    setTitleError(false);
    return true;
  };

  const handleCopy = async () => {
    if (!validate()) return;
    setStatus(null);
    try {
      const content = await buildContent();
      await writeText(content);
      setStatus(t('bugReport.copied'));
    } catch {
      setStatus('Failed. Please try again.');
    }
  };

  const handleGitHub = async () => {
    if (!validate()) return;
    setStatus(null);
    try {
      const content = await buildContent();
      const url = `https://github.com/ideiasestrondosas-ctrl/nexora-desktop/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(content)}`;
      await openUrl(url);
    } catch {
      setStatus('Failed to open browser.');
    }
  };

  const handleSave = async () => {
    if (!validate()) return;
    setStatus(null);
    try {
      const content = await buildContent();
      const path = await invoke<string>('save_bug_report', { content });
      setStatus(t('bugReport.saved', { path }));
    } catch {
      setStatus('Failed to save file.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-bg-primary border border-border rounded-2xl shadow-2xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-text-primary">{t('bugReport.title')}</h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">
              {t('bugReport.titleLabel')} *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setTitleError(false);
              }}
              placeholder={t('bugReport.titlePlaceholder')}
              className={`w-full px-3 py-2 rounded-lg bg-bg-secondary border text-sm text-text-primary outline-none focus:ring-1 focus:ring-brand ${titleError ? 'border-red-500' : 'border-border'}`}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">
              {t('bugReport.descLabel')}
            </label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder={t('bugReport.descPlaceholder')}
              rows={4}
              className="w-full px-3 py-2 rounded-lg bg-bg-secondary border border-border text-sm text-text-primary outline-none focus:ring-1 focus:ring-brand resize-none"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-sm text-text-muted">
            <input
              type="checkbox"
              checked={includeLogs}
              onChange={(e) => setIncludeLogs(e.target.checked)}
              className="accent-brand"
            />
            {t('bugReport.includeLogs')}
          </label>
          {status && <p className="text-xs text-green-500">{status}</p>}
        </div>
        <div className="px-6 pb-6 flex gap-2 flex-wrap">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm text-text-muted hover:bg-muted transition-colors"
          >
            <Copy size={14} /> {t('bugReport.copyClipboard')}
          </button>
          <button
            onClick={handleGitHub}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm text-text-muted hover:bg-muted transition-colors"
          >
            <Github size={14} /> {t('bugReport.openGitHub')}
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand text-white text-sm font-medium hover:bg-brand/90 transition-colors"
          >
            <FileText size={14} /> {t('bugReport.saveFile')}
          </button>
        </div>
      </div>
    </div>
  );
}
