import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {
  X,
  HelpCircle,
  LayoutDashboard,
  Library,
  ListVideo,
  UserCircle,
  Settings,
  Terminal,
  Film,
  ExternalLink,
  BookOpen,
  ChevronRight,
  Cloud,
  FileVideo,
  Download,
  ScanLine,
  FolderOpen,
  Shield,
  Bug,
  FlaskConical,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { openUrl } from '@tauri-apps/plugin-opener';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { logActivity } from '@/lib/activityLog';
import { APP_VERSION } from '@/lib/version';
import ptGuide from '../../docs/BETA_TESTING_GUIDE.pt.md?raw';
import enGuide from '../../docs/BETA_TESTING_GUIDE.en.md?raw';

interface HelpOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ScreenTab =
  | 'dashboard'
  | 'library'
  | 'queue'
  | 'profiles'
  | 'settings'
  | 'logs'
  | 'intro'
  | 'cloud'
  | 'assetDetail'
  | 'import'
  | 'comparator'
  | 'betaGuide';

const SCREEN_TABS: { id: ScreenTab; labelKey: string; icon: React.ReactNode }[] = [
  { id: 'intro', labelKey: 'help.tabs.intro', icon: <BookOpen className="w-4 h-4" /> },
  {
    id: 'dashboard',
    labelKey: 'help.tabs.dashboard',
    icon: <LayoutDashboard className="w-4 h-4" />,
  },
  { id: 'library', labelKey: 'help.tabs.library', icon: <Library className="w-4 h-4" /> },
  { id: 'assetDetail', labelKey: 'help.tabs.assetDetail', icon: <FileVideo className="w-4 h-4" /> },
  { id: 'import', labelKey: 'help.tabs.import', icon: <Download className="w-4 h-4" /> },
  { id: 'queue', labelKey: 'help.tabs.queue', icon: <ListVideo className="w-4 h-4" /> },
  { id: 'profiles', labelKey: 'help.tabs.profiles', icon: <UserCircle className="w-4 h-4" /> },
  { id: 'settings', labelKey: 'help.tabs.settings', icon: <Settings className="w-4 h-4" /> },
  { id: 'cloud', labelKey: 'help.tabs.cloud', icon: <Cloud className="w-4 h-4" /> },
  { id: 'comparator', labelKey: 'help.tabs.comparator', icon: <ScanLine className="w-4 h-4" /> },
  { id: 'logs', labelKey: 'help.tabs.logs', icon: <Terminal className="w-4 h-4" /> },
];

const TAB_COUNTS: Record<ScreenTab, number> = {
  intro: 4,
  dashboard: 1,
  library: 2,
  assetDetail: 1,
  import: 2,
  queue: 3,
  profiles: 1,
  settings: 5,
  cloud: 7,
  comparator: 5,
  logs: 1,
  betaGuide: 0,
};

const DEV_TABS: { id: ScreenTab; labelKey: string; icon: React.ReactNode }[] = [
  {
    id: 'betaGuide',
    labelKey: 'help.tabs.betaGuide',
    icon: <FlaskConical className="w-4 h-4" />,
  },
];

const SCREENSHOTS = {
  dashboard: '/screenshots/dashboard.png',
  library: '/screenshots/library.png',
  queue: '/screenshots/queue.png',
  profiles: '/screenshots/profiles.png',
  settings: '/screenshots/settings.png',
  logs: '/screenshots/logs.png',
  'asset-detail': '/screenshots/asset-detail.png',
  'ingest-modal': '/screenshots/ingest-modal.png',
  'settings-logs': '/screenshots/settings-logs-tab.png',
  'settings-cloud': '/screenshots/settings-cloud-tab.png',
  'cloud-browser': '/screenshots/cloud-file-browser.png',
  'pipeline-summary': '/screenshots/pipeline-summary-expanded.png',
  'reprocess-popup': '/screenshots/reprocess-popup.png',
  'delete-confirm': '/screenshots/delete-confirm.png',
  'factory-reset': '/screenshots/factory-reset-confirm.png',
  // Novos screenshots v0.30.0-beta.1
  onboarding: '/screenshots/onboarding-wizard.png',
  'watch-folders': '/screenshots/watch-folders.png',
  'privacy-telemetry': '/screenshots/privacy-telemetry.png',
  'bug-report': '/screenshots/bug-report.png',
  'pipeline-error': '/screenshots/pipeline-error.png',
  comparator: '/screenshots/comparator.png',
  'batch-submit': '/screenshots/batch-submit.png',
  // v0.30.2 screenshots
  'settings-cache': '/screenshots/settings-cache.png',
  'cloud-gdrive-oauth': '/screenshots/cloud-gdrive-oauth.png',
  'cloud-s3': '/screenshots/cloud-s3.png',
  'cloud-icloud': '/screenshots/cloud-icloud.png',
} as const;

function ScreenCard({
  title,
  icon,
  children,
  tips,
  screenshot,
  onImageClick,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  tips?: string[];
  screenshot?: string;
  onImageClick?: () => void;
}) {
  return (
    <div className="bg-bg-secondary rounded-xl border border-border overflow-hidden">
      {screenshot && (
        <div
          className="w-full h-40 bg-bg-tertiary border-b border-border/50 overflow-hidden cursor-pointer group relative"
          onClick={onImageClick}
          title="Click to enlarge"
        >
          <img
            src={screenshot}
            alt={title}
            className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
            <span className="text-white text-xs font-bold bg-black/50 px-2 py-1 rounded-md">
              Click to enlarge
            </span>
          </div>
        </div>
      )}
      <div className="p-5 space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-brand/10 rounded-lg text-brand">{icon}</div>
          <h3 className="text-sm font-bold text-text-primary">{title}</h3>
        </div>
        <div className="text-xs text-text-secondary leading-relaxed space-y-1.5">{children}</div>
        {tips && tips.length > 0 && (
          <div className="pt-2 border-t border-border/50">
            <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">
              Tips
            </p>
            <ul className="space-y-1">
              {tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-1.5 text-[11px] text-text-muted">
                  <ChevronRight className="w-3 h-3 shrink-0 mt-0.5 text-brand/80" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function extractText(node: React.ReactNode): string {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (React.isValidElement(node)) {
    return extractText((node.props as { children?: React.ReactNode }).children);
  }
  return '';
}

// Matches GitHub's heading anchor algorithm (keeps accented chars, replaces spaces with hyphens)
function githubSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N} -]/gu, '')
    .replace(/ /g, '-');
}

const MD_COMPONENTS: React.ComponentProps<typeof ReactMarkdown>['components'] = {
  h1: ({ children }) => {
    const id = githubSlug(extractText(children));
    return (
      <h1
        id={id}
        className="text-base font-bold text-text-primary mt-5 mb-2 pb-1 border-b border-border/50"
      >
        {children}
      </h1>
    );
  },
  h2: ({ children }) => {
    const id = githubSlug(extractText(children));
    return (
      <h2 id={id} className="text-sm font-bold text-text-primary mt-4 mb-1.5">
        {children}
      </h2>
    );
  },
  h3: ({ children }) => {
    const id = githubSlug(extractText(children));
    return (
      <h3 id={id} className="text-xs font-bold text-brand mt-3 mb-1">
        {children}
      </h3>
    );
  },
  h4: ({ children }) => {
    const id = githubSlug(extractText(children));
    return (
      <h4 id={id} className="text-xs font-semibold text-text-secondary mt-2 mb-1">
        {children}
      </h4>
    );
  },
  p: ({ children }) => (
    <p className="text-xs text-text-secondary leading-relaxed mb-2">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="list-disc list-inside space-y-0.5 mb-2 text-xs text-text-secondary">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-inside space-y-0.5 mb-2 text-xs text-text-secondary">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-brand/40 pl-3 my-2 text-xs text-text-muted italic">
      {children}
    </blockquote>
  ),
  code: ({ children, className }) => {
    const isBlock = className?.includes('language-');
    return isBlock ? (
      <pre className="bg-bg-tertiary rounded-lg p-3 my-2 overflow-x-auto text-[11px] font-mono text-text-secondary">
        <code>{children}</code>
      </pre>
    ) : (
      <code className="bg-bg-tertiary px-1 py-0.5 rounded text-[11px] font-mono text-brand">
        {children}
      </code>
    );
  },
  pre: ({ children }) => <>{children}</>,
  table: ({ children }) => (
    <div className="overflow-x-auto my-3">
      <table className="w-full text-xs border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-bg-tertiary">{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => <tr className="border-b border-border/30">{children}</tr>,
  th: ({ children }) => (
    <th className="text-left px-2 py-1.5 font-semibold text-text-primary text-[11px] uppercase tracking-wide">
      {children}
    </th>
  ),
  td: ({ children }) => <td className="px-2 py-1.5 text-text-secondary align-top">{children}</td>,
  hr: () => <hr className="my-4 border-border/50" />,
  a: ({ href, children }) => {
    if (href?.startsWith('#')) {
      return (
        <a
          href={href}
          className="text-brand hover:underline cursor-pointer"
          onClick={(e) => {
            e.preventDefault();
            const id = decodeURIComponent(href.slice(1));
            document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          {children}
        </a>
      );
    }
    return (
      <a
        href={href}
        className="text-brand hover:underline"
        onClick={(e) => {
          e.preventDefault();
          if (href) openUrl(href).catch(console.error);
        }}
      >
        {children}
      </a>
    );
  },
  strong: ({ children }) => <strong className="font-semibold text-text-primary">{children}</strong>,
  em: ({ children }) => <em className="italic text-text-muted">{children}</em>,
};

function BetaGuidePanel() {
  const { i18n } = useTranslation();
  const [saving, setSaving] = useState(false);

  const isPt = i18n.language === 'pt';
  const content = isPt ? ptGuide : enGuide;
  const filename = isPt ? 'BETA_TESTING_GUIDE.pt.md' : 'BETA_TESTING_GUIDE.en.md';

  const handleDownload = async () => {
    setSaving(true);
    try {
      const path = await save({
        defaultPath: filename,
        filters: [{ name: 'Markdown', extensions: ['md'] }],
      });
      if (path) {
        await writeTextFile(path, content);
        toast.success(isPt ? 'Guia guardado com sucesso' : 'Guide saved successfully');
      }
    } catch (err) {
      console.error('Save guide failed:', err);
      toast.error(isPt ? 'Erro ao guardar o guia' : 'Failed to save guide');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full -m-6">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-bg-tertiary/50 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-text-muted">
            {isPt
              ? `Guia de Testes Beta — v${APP_VERSION}`
              : `Beta Testing Guide — v${APP_VERSION}`}
          </span>
        </div>
        <button
          onClick={handleDownload}
          disabled={saving}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-brand/10 text-brand hover:bg-brand/20 transition-colors disabled:opacity-50"
        >
          <Download className="w-3.5 h-3.5" />
          {saving ? (isPt ? 'A guardar…' : 'Saving…') : isPt ? 'Descarregar .md' : 'Download .md'}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}

export const HelpOverlay: React.FC<HelpOverlayProps> = ({ open, onOpenChange }) => {
  const [activeTab, setActiveTab] = useState<ScreenTab>('intro');
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const { t } = useTranslation();

  const visibleTabs = [...SCREEN_TABS, ...DEV_TABS];

  const GUIDE_URL =
    'https://github.com/ideiasestrondosas-ctrl/nexora-desktop/blob/main/docs/USER_MANUAL.md';

  const openFullGuide = async () => {
    logActivity('Abrir Guia Completo', 'execute');
    try {
      await openUrl(GUIDE_URL);
      toast.success(t('help.guideOpened'));
    } catch (err) {
      console.error('openUrl failed:', err);
      toast.error(t('help.guideOpenFailed'), {
        description: 'Clique em Copiar URL para usar manualmente.',
        action: {
          label: 'Copiar URL',
          onClick: async () => {
            try {
              await writeText(GUIDE_URL);
              toast.success('URL copiado!');
            } catch (clipErr) {
              console.error('Clipboard failed:', clipErr);
              toast.error('Falha ao copiar. Selecione e copie manualmente.');
            }
          },
        },
      });
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in" />
        <Dialog.Content
          className="fixed inset-0 z-50 flex items-center justify-center p-4 outline-none"
          onEscapeKeyDown={() => {
            if (lightboxImage) {
              setLightboxImage(null);
            }
          }}
        >
          <div className="bg-bg-primary rounded-xl border border-border shadow-2xl w-full max-w-5xl h-[85vh] min-h-[600px] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-brand/10 rounded-xl shrink-0">
                  <HelpCircle className="w-5 h-5 text-brand" />
                </div>
                <div className="min-w-0">
                  <Dialog.Title asChild>
                    <h2 className="text-lg font-bold text-text-primary truncate">
                      {t('help.title')}
                    </h2>
                  </Dialog.Title>
                  <Dialog.Description asChild>
                    <p className="text-xs text-text-muted truncate">{t('help.subtitle')}</p>
                  </Dialog.Description>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={openFullGuide}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-brand bg-brand/10 hover:bg-brand/20 transition-colors"
                  title={t('help.openFullGuide')}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t('help.openFullGuide')}</span>
                </button>
                <Dialog.Close asChild>
                  <button
                    className="p-2 text-text-muted hover:text-text-primary hover:bg-bg-hover rounded-full transition-colors"
                    title={t('common.close')}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </Dialog.Close>
              </div>
            </div>

            {/* Main layout: sidebar + content */}
            <div className="flex flex-1 overflow-hidden">
              {/* Sidebar */}
              <div className="w-48 shrink-0 border-r border-border bg-bg-secondary flex flex-col overflow-y-auto h-full">
                {visibleTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'flex items-center gap-2 px-4 py-3 text-xs font-semibold transition-all text-left',
                      activeTab === tab.id
                        ? 'bg-brand/15 text-brand border-l-2 border-brand'
                        : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary border-l-2 border-transparent',
                    )}
                  >
                    {tab.icon}
                    <span className="flex-1">{t(tab.labelKey)}</span>
                    {TAB_COUNTS[tab.id] > 1 && (
                      <span className="text-[10px] font-bold bg-brand/20 text-brand px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
                        {TAB_COUNTS[tab.id]}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar h-full">
                {activeTab === 'intro' && (
                  <div className="space-y-5">
                    <div className="bg-bg-secondary/80 backdrop-blur-sm rounded-xl border border-border/50 p-5">
                      <h3 className="text-sm font-bold text-text-primary mb-2">
                        {t('help.intro.whatIs')}
                      </h3>
                      <p className="text-xs text-text-secondary leading-relaxed">
                        {t('help.intro.description')}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <ScreenCard
                        title={t('help.intro.features.transcoding')}
                        icon={<Film className="w-4 h-4" />}
                      >
                        {t('help.intro.features.transcodingDesc')}
                      </ScreenCard>
                      <ScreenCard
                        title={t('help.intro.features.vmafAnalysis')}
                        icon={<HelpCircle className="w-4 h-4" />}
                      >
                        {t('help.intro.features.vmafDesc')}
                      </ScreenCard>
                      <ScreenCard
                        title={t('help.intro.features.profiles')}
                        icon={<UserCircle className="w-4 h-4" />}
                      >
                        {t('help.intro.features.profilesDesc')}
                      </ScreenCard>
                      <ScreenCard
                        title={t('help.intro.features.gpuAuto')}
                        icon={<Settings className="w-4 h-4" />}
                      >
                        {t('help.intro.features.gpuAutoDesc')}
                      </ScreenCard>
                    </div>

                    <div className="bg-brand/5 border border-brand/20 rounded-xl p-4">
                      <p className="text-xs text-brand leading-relaxed">
                        <strong>{t('help.intro.quickStart')}</strong>{' '}
                        {t('help.intro.quickStartDesc')}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <ScreenCard
                        title={t('help.platform.title')}
                        icon={<Settings className="w-4 h-4" />}
                      >
                        <p>{t('help.platform.desc')}</p>
                        <ul className="list-disc list-inside space-y-1 mt-2">
                          <li>{t('help.platform.windows')}</li>
                          <li>{t('help.platform.macos')}</li>
                          <li>{t('help.platform.linux')}</li>
                        </ul>
                      </ScreenCard>
                      <ScreenCard
                        title={t('help.security.title')}
                        icon={<HelpCircle className="w-4 h-4" />}
                      >
                        <p>{t('help.security.desc')}</p>
                        <ul className="list-disc list-inside space-y-1 mt-2">
                          <li>{t('help.security.keychain')}</li>
                          <li>{t('help.security.pathTraversal')}</li>
                          <li>{t('help.security.endpointValidation')}</li>
                        </ul>
                      </ScreenCard>
                    </div>
                  </div>
                )}

                {activeTab === 'dashboard' && (
                  <div className="space-y-4">
                    <ScreenCard
                      title={t('help.screens.dashboard.title')}
                      icon={<LayoutDashboard className="w-4 h-4" />}
                      onImageClick={() => setLightboxImage(SCREENSHOTS.dashboard)}
                      tips={[
                        t('help.screens.dashboard.tip1'),
                        t('help.screens.dashboard.tip2'),
                        t('help.screens.dashboard.tip3'),
                      ]}
                      screenshot={SCREENSHOTS.dashboard}
                    >
                      <p>{t('help.screens.dashboard.desc')}</p>
                      <ul className="list-disc list-inside space-y-1 mt-2">
                        <li>{t('help.screens.dashboard.stat1')}</li>
                        <li>{t('help.screens.dashboard.stat2')}</li>
                        <li>{t('help.screens.dashboard.stat3')}</li>
                        <li>{t('help.screens.dashboard.recentJobs')}</li>
                      </ul>
                    </ScreenCard>
                  </div>
                )}

                {activeTab === 'library' && (
                  <div className="space-y-4">
                    <ScreenCard
                      title={t('help.screens.library.title')}
                      icon={<Library className="w-4 h-4" />}
                      onImageClick={() => setLightboxImage(SCREENSHOTS.library)}
                      tips={[
                        t('help.screens.library.tip1'),
                        t('help.screens.library.tip2'),
                        t('help.screens.library.tip3'),
                      ]}
                      screenshot={SCREENSHOTS.library}
                    >
                      <p>{t('help.screens.library.desc')}</p>
                      <ul className="list-disc list-inside space-y-1 mt-2">
                        <li>{t('help.screens.library.dragDrop')}</li>
                        <li>{t('help.screens.library.gridList')}</li>
                        <li>{t('help.screens.library.searchFilter')}</li>
                        <li>{t('help.screens.library.reprocess')}</li>
                      </ul>
                    </ScreenCard>
                    <ScreenCard
                      title={t('help.screens.library.deleteConfirmTitle')}
                      icon={<Library className="w-4 h-4" />}
                      onImageClick={() => setLightboxImage(SCREENSHOTS['delete-confirm'])}
                      tips={[
                        'Passo 1: Confirma remoção do asset e jobs associados',
                        'Passo 2: Pergunta se apaga o ficheiro processado do disco',
                        'Prevenção contra perda acidental de dados',
                      ]}
                      screenshot={SCREENSHOTS['delete-confirm']}
                    >
                      <p>{t('help.screens.library.deleteConfirmDesc')}</p>
                    </ScreenCard>
                  </div>
                )}

                {activeTab === 'assetDetail' && (
                  <div className="space-y-4">
                    <ScreenCard
                      title={t('help.screens.assetDetail.title')}
                      icon={<FileVideo className="w-4 h-4" />}
                      onImageClick={() => setLightboxImage(SCREENSHOTS['asset-detail'])}
                      tips={[
                        t('help.screens.assetDetail.tip1'),
                        t('help.screens.assetDetail.tip2'),
                        t('help.screens.assetDetail.tip3'),
                      ]}
                      screenshot={SCREENSHOTS['asset-detail']}
                    >
                      <p>{t('help.screens.assetDetail.desc')}</p>
                      <ul className="list-disc list-inside space-y-1 mt-2">
                        <li>{t('help.screens.assetDetail.hero')}</li>
                        <li>{t('help.screens.assetDetail.mediaInfo')}</li>
                        <li>{t('help.screens.assetDetail.technicalAnalysis')}</li>
                        <li>{t('help.screens.assetDetail.jobHistory')}</li>
                      </ul>
                    </ScreenCard>
                  </div>
                )}

                {activeTab === 'import' && (
                  <div className="space-y-4">
                    <ScreenCard
                      title={t('help.screens.import.title')}
                      icon={<Download className="w-4 h-4" />}
                      onImageClick={() => setLightboxImage(SCREENSHOTS['ingest-modal'])}
                      tips={[
                        t('help.screens.import.tip1'),
                        t('help.screens.import.tip2'),
                        t('help.screens.import.tip3'),
                      ]}
                      screenshot={SCREENSHOTS['ingest-modal']}
                    >
                      <p>{t('help.screens.import.desc')}</p>
                      <ul className="list-disc list-inside space-y-1 mt-2">
                        <li>{t('help.screens.import.dragDrop')}</li>
                        <li>{t('help.screens.import.fileDialog')}</li>
                        <li>{t('help.screens.import.folderScan')}</li>
                      </ul>
                    </ScreenCard>
                    <ScreenCard
                      title={t('help.screens.import.batchTitle')}
                      icon={<Download className="w-4 h-4" />}
                      tips={[t('help.screens.import.cloudPicker')]}
                      screenshot={SCREENSHOTS['batch-submit']}
                      onImageClick={() => setLightboxImage(SCREENSHOTS['batch-submit'])}
                    >
                      <p>{t('help.screens.import.batchDesc')}</p>
                    </ScreenCard>
                  </div>
                )}

                {activeTab === 'queue' && (
                  <div className="space-y-4">
                    <ScreenCard
                      title={t('help.screens.queue.title')}
                      icon={<ListVideo className="w-4 h-4" />}
                      onImageClick={() => setLightboxImage(SCREENSHOTS.queue)}
                      tips={[
                        t('help.screens.queue.tip1'),
                        t('help.screens.queue.tip2'),
                        t('help.screens.queue.tip3'),
                      ]}
                      screenshot={SCREENSHOTS.queue}
                    >
                      <p>{t('help.screens.queue.desc')}</p>
                      <ul className="list-disc list-inside space-y-1 mt-2">
                        <li>{t('help.screens.queue.pipeline')}</li>
                        <li>{t('help.screens.queue.quarantine')}</li>
                        <li>{t('help.screens.queue.approveReject')}</li>
                        <li>{t('help.screens.queue.retry')}</li>
                      </ul>
                    </ScreenCard>
                    <ScreenCard
                      title={t('help.screens.queue.pipelineSummaryTitle')}
                      icon={<ListVideo className="w-4 h-4" />}
                      onImageClick={() => setLightboxImage(SCREENSHOTS['pipeline-summary'])}
                      tips={[
                        'Clique em qualquer badge para expandir o painel inline',
                        'Lista mostra nome do ficheiro, perfil e navegação →',
                        'Válido para todos os estados: Queued, Processing, Done, Quarantined',
                      ]}
                      screenshot={SCREENSHOTS['pipeline-summary']}
                    >
                      <p>{t('help.screens.queue.pipelineSummaryDesc')}</p>
                    </ScreenCard>
                    <ScreenCard
                      title={t('help.screens.queue.reprocessPopupTitle')}
                      icon={<ListVideo className="w-4 h-4" />}
                      onImageClick={() => setLightboxImage(SCREENSHOTS['reprocess-popup'])}
                      tips={[
                        'Renderizado via React Portal para document.body',
                        'Escapa o overflow:hidden do container da tabela',
                        'Fecha ao clicar fora, no ✕, ou ao selecionar perfil',
                      ]}
                      screenshot={SCREENSHOTS['reprocess-popup']}
                    >
                      <p>{t('help.screens.queue.reprocessPopupDesc')}</p>
                    </ScreenCard>
                  </div>
                )}

                {activeTab === 'profiles' && (
                  <div className="space-y-4">
                    <ScreenCard
                      title={t('help.screens.profiles.title')}
                      icon={<UserCircle className="w-4 h-4" />}
                      onImageClick={() => setLightboxImage(SCREENSHOTS.profiles)}
                      tips={[
                        t('help.screens.profiles.tip1'),
                        t('help.screens.profiles.tip2'),
                        t('help.screens.profiles.tip3'),
                      ]}
                      screenshot={SCREENSHOTS.profiles}
                    >
                      <p>{t('help.screens.profiles.desc')}</p>
                      <ul className="list-disc list-inside space-y-1 mt-2">
                        <li>{t('help.screens.profiles.presets')}</li>
                        <li>{t('help.screens.profiles.custom')}</li>
                        <li>{t('help.screens.profiles.duplicate')}</li>
                        <li>{t('help.screens.profiles.settings')}</li>
                      </ul>
                    </ScreenCard>
                  </div>
                )}

                {activeTab === 'settings' && (
                  <div className="space-y-4">
                    <ScreenCard
                      title={t('help.screens.settings.title')}
                      icon={<Settings className="w-4 h-4" />}
                      onImageClick={() => setLightboxImage(SCREENSHOTS.settings)}
                      tips={[
                        t('help.screens.settings.tip1'),
                        t('help.screens.settings.tip2'),
                        t('help.screens.settings.tip3'),
                      ]}
                      screenshot={SCREENSHOTS.settings}
                    >
                      <p>{t('help.screens.settings.desc')}</p>
                      <ul className="list-disc list-inside space-y-1 mt-2">
                        <li>{t('help.screens.settings.general')}</li>
                        <li>{t('help.screens.settings.interface')}</li>
                        <li>{t('help.screens.settings.system')}</li>
                        <li>{t('help.screens.settings.advanced')}</li>
                        <li>{t('help.screens.settings.cloud')}</li>
                      </ul>
                    </ScreenCard>
                    <ScreenCard
                      title={t('help.screens.settings.factoryResetConfirmTitle')}
                      icon={<Settings className="w-4 h-4" />}
                      onImageClick={() => setLightboxImage(SCREENSHOTS['factory-reset'])}
                      tips={[
                        'Passo 1: Confirmação do reset total de dados',
                        'Passo 2: Opção de apagar ficheiros do diretório de output',
                        'A aplicação reinicia automaticamente após o reset',
                      ]}
                      screenshot={SCREENSHOTS['factory-reset']}
                    >
                      <p>{t('help.screens.settings.factoryResetConfirmDesc')}</p>
                    </ScreenCard>
                    <ScreenCard
                      title={t('help.screens.settings.logsTab.title')}
                      icon={<Terminal className="w-4 h-4" />}
                      onImageClick={() => setLightboxImage(SCREENSHOTS['settings-logs'])}
                      screenshot={SCREENSHOTS['settings-logs']}
                    >
                      <p>{t('help.screens.settings.logsTab.desc')}</p>
                      <ul className="list-disc list-inside space-y-1 mt-2">
                        <li>{t('help.screens.settings.logsTab.verbosity')}</li>
                        <li>{t('help.screens.settings.logsTab.retention')}</li>
                        <li>{t('help.screens.settings.logsTab.upload')}</li>
                      </ul>
                    </ScreenCard>
                    <ScreenCard
                      title={t('help.screens.settings.cache.title')}
                      icon={<Settings className="w-4 h-4" />}
                      screenshot={SCREENSHOTS['settings-cache']}
                      onImageClick={() => setLightboxImage(SCREENSHOTS['settings-cache'])}
                    >
                      <p>{t('help.screens.settings.cache.desc')}</p>
                      <ul className="list-disc list-inside space-y-1 mt-2">
                        <li>{t('help.screens.settings.cache.transcodeCache')}</li>
                        <li>{t('help.screens.settings.cache.thumbCache')}</li>
                        <li>{t('help.screens.settings.cache.clear')}</li>
                      </ul>
                    </ScreenCard>
                    <ScreenCard
                      title={t('help.screens.settings.shortcuts.title')}
                      icon={<Settings className="w-4 h-4" />}
                    >
                      <p>{t('help.screens.settings.shortcuts.desc')}</p>
                      <ul className="list-disc list-inside space-y-1 mt-2">
                        <li>{t('help.screens.settings.shortcuts.exportLogs')}</li>
                        <li>{t('help.screens.settings.shortcuts.closeWindow')}</li>
                        <li>{t('help.screens.settings.shortcuts.navTabs')}</li>
                      </ul>
                    </ScreenCard>
                  </div>
                )}

                {activeTab === 'cloud' && (
                  <div className="space-y-4">
                    <ScreenCard
                      title={t('help.screens.cloud.destinations.title')}
                      icon={<Cloud className="w-4 h-4" />}
                      onImageClick={() => setLightboxImage(SCREENSHOTS['settings-cloud'])}
                      screenshot={SCREENSHOTS['settings-cloud']}
                      tips={[
                        t('help.screens.cloud.destinations.tip1'),
                        t('help.screens.cloud.destinations.tip2'),
                        t('help.screens.cloud.destinations.tip3'),
                      ]}
                    >
                      <p>{t('help.screens.cloud.desc')}</p>
                      <p className="mt-1">{t('help.screens.cloud.destinations.desc')}</p>
                    </ScreenCard>
                    <ScreenCard
                      title={t('help.screens.cloud.browser.title')}
                      icon={<Cloud className="w-4 h-4" />}
                      onImageClick={() => setLightboxImage(SCREENSHOTS['cloud-browser'])}
                      screenshot={SCREENSHOTS['cloud-browser']}
                      tips={[
                        t('help.screens.cloud.browser.tip1'),
                        t('help.screens.cloud.browser.tip2'),
                        t('help.screens.cloud.browser.tip3'),
                      ]}
                    >
                      <p>{t('help.screens.cloud.browser.desc')}</p>
                    </ScreenCard>
                    <ScreenCard
                      title={t('help.screens.cloud.upload.title')}
                      icon={<Cloud className="w-4 h-4" />}
                      tips={[
                        t('help.screens.cloud.upload.tip1'),
                        t('help.screens.cloud.upload.tip2'),
                        t('help.screens.cloud.upload.tip3'),
                      ]}
                    >
                      <p>{t('help.screens.cloud.upload.desc')}</p>
                    </ScreenCard>
                    <ScreenCard
                      title={t('help.screens.cloud.gdriveOAuth.title')}
                      icon={<Cloud className="w-4 h-4" />}
                      screenshot={SCREENSHOTS['cloud-gdrive-oauth']}
                      onImageClick={() => setLightboxImage(SCREENSHOTS['cloud-gdrive-oauth'])}
                      tips={[
                        t('help.screens.cloud.gdriveOAuth.step1'),
                        t('help.screens.cloud.gdriveOAuth.step2'),
                        t('help.screens.cloud.gdriveOAuth.step3'),
                      ]}
                    >
                      <p>{t('help.screens.cloud.gdriveOAuth.desc')}</p>
                    </ScreenCard>
                    <ScreenCard
                      title={t('help.screens.cloud.s3.title')}
                      icon={<Cloud className="w-4 h-4" />}
                      screenshot={SCREENSHOTS['cloud-s3']}
                      onImageClick={() => setLightboxImage(SCREENSHOTS['cloud-s3'])}
                      tips={[t('help.screens.cloud.s3.providers')]}
                    >
                      <p>{t('help.screens.cloud.s3.desc')}</p>
                    </ScreenCard>
                    <ScreenCard
                      title={t('help.screens.cloud.icloud.title')}
                      icon={<Cloud className="w-4 h-4" />}
                      screenshot={SCREENSHOTS['cloud-icloud']}
                      onImageClick={() => setLightboxImage(SCREENSHOTS['cloud-icloud'])}
                      tips={[t('help.screens.cloud.icloud.localPath')]}
                    >
                      <p>{t('help.screens.cloud.icloud.desc')}</p>
                    </ScreenCard>
                  </div>
                )}

                {activeTab === 'comparator' && (
                  <div className="space-y-4">
                    <ScreenCard
                      title={t('help.screens.comparator.title')}
                      icon={<ScanLine className="w-4 h-4" />}
                      onImageClick={() => setLightboxImage(SCREENSHOTS.comparator)}
                      tips={[
                        t('help.screens.comparator.tip1'),
                        t('help.screens.comparator.tip2'),
                        t('help.screens.comparator.tip3'),
                      ]}
                      screenshot={SCREENSHOTS.comparator}
                    >
                      <p>{t('help.screens.comparator.desc')}</p>
                      <ul className="list-disc list-inside space-y-1 mt-2">
                        <li>{t('help.screens.comparator.splitScreen')}</li>
                        <li>{t('help.screens.comparator.scrubSync')}</li>
                        <li>{t('help.screens.comparator.playPause')}</li>
                      </ul>
                    </ScreenCard>
                    <ScreenCard
                      title={t('help.screens.comparator.onboarding.title')}
                      icon={<BookOpen className="w-4 h-4" />}
                      onImageClick={() => setLightboxImage(SCREENSHOTS.onboarding)}
                      screenshot={SCREENSHOTS.onboarding}
                      tips={[
                        t('help.screens.comparator.onboarding.tip1'),
                        t('help.screens.comparator.onboarding.tip2'),
                      ]}
                    >
                      <p>{t('help.screens.comparator.onboarding.desc')}</p>
                    </ScreenCard>
                    <ScreenCard
                      title={t('help.screens.comparator.watchFolders.title')}
                      icon={<FolderOpen className="w-4 h-4" />}
                      onImageClick={() => setLightboxImage(SCREENSHOTS['watch-folders'])}
                      screenshot={SCREENSHOTS['watch-folders']}
                      tips={[
                        t('help.screens.comparator.watchFolders.tip1'),
                        t('help.screens.comparator.watchFolders.tip2'),
                      ]}
                    >
                      <p>{t('help.screens.comparator.watchFolders.desc')}</p>
                    </ScreenCard>
                    <ScreenCard
                      title={t('help.screens.comparator.privacy.title')}
                      icon={<Shield className="w-4 h-4" />}
                      onImageClick={() => setLightboxImage(SCREENSHOTS['privacy-telemetry'])}
                      screenshot={SCREENSHOTS['privacy-telemetry']}
                      tips={[
                        t('help.screens.comparator.privacy.tip1'),
                        t('help.screens.comparator.privacy.tip2'),
                      ]}
                    >
                      <p>{t('help.screens.comparator.privacy.desc')}</p>
                    </ScreenCard>
                    <ScreenCard
                      title={t('help.screens.comparator.bugReport.title')}
                      icon={<Bug className="w-4 h-4" />}
                      onImageClick={() => setLightboxImage(SCREENSHOTS['bug-report'])}
                      screenshot={SCREENSHOTS['bug-report']}
                      tips={[
                        t('help.screens.comparator.bugReport.tip1'),
                        t('help.screens.comparator.bugReport.tip2'),
                        t('help.screens.comparator.bugReport.tip3'),
                      ]}
                    >
                      <p>{t('help.screens.comparator.bugReport.desc')}</p>
                    </ScreenCard>
                  </div>
                )}

                {activeTab === 'logs' && (
                  <div className="space-y-4">
                    <ScreenCard
                      title={t('help.screens.logs.title')}
                      icon={<Terminal className="w-4 h-4" />}
                      onImageClick={() => setLightboxImage(SCREENSHOTS.logs)}
                      tips={[
                        t('help.screens.logs.tip1'),
                        t('help.screens.logs.tip2'),
                        t('help.screens.logs.tip3'),
                      ]}
                      screenshot={SCREENSHOTS.logs}
                    >
                      <p>{t('help.screens.logs.desc')}</p>
                      <ul className="list-disc list-inside space-y-1 mt-2">
                        <li>{t('help.screens.logs.filter')}</li>
                        <li>{t('help.screens.logs.export')}</li>
                        <li>{t('help.screens.logs.levels')}</li>
                        <li>{t('help.screens.logs.autoScroll')}</li>
                      </ul>
                    </ScreenCard>
                  </div>
                )}

                {activeTab === 'betaGuide' && <BetaGuidePanel />}
              </div>
            </div>
          </div>

          {/* Lightbox */}
          {lightboxImage && (
            <div
              className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
              onClick={() => setLightboxImage(null)}
            >
              <div className="relative max-w-[90vw] max-h-[85vh] flex flex-col items-center">
                <button
                  onClick={() => setLightboxImage(null)}
                  className="absolute -top-10 right-0 p-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                  title={t('common.close')}
                >
                  <X className="w-5 h-5" />
                </button>
                <img
                  src={lightboxImage}
                  alt="Screenshot"
                  className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                />
                <p className="text-white/60 text-xs mt-2">Click outside to close</p>
              </div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
