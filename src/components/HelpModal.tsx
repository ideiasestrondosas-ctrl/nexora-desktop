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
} from 'lucide-react';
import { openUrl } from '@tauri-apps/plugin-opener';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface HelpOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ScreenTab = 'dashboard' | 'library' | 'queue' | 'profiles' | 'settings' | 'logs' | 'intro';

const SCREEN_TABS: { id: ScreenTab; labelKey: string; icon: React.ReactNode }[] = [
  { id: 'intro', labelKey: 'help.tabs.intro', icon: <BookOpen className="w-4 h-4" /> },
  {
    id: 'dashboard',
    labelKey: 'help.tabs.dashboard',
    icon: <LayoutDashboard className="w-4 h-4" />,
  },
  { id: 'library', labelKey: 'help.tabs.library', icon: <Library className="w-4 h-4" /> },
  { id: 'queue', labelKey: 'help.tabs.queue', icon: <ListVideo className="w-4 h-4" /> },
  { id: 'profiles', labelKey: 'help.tabs.profiles', icon: <UserCircle className="w-4 h-4" /> },
  { id: 'settings', labelKey: 'help.tabs.settings', icon: <Settings className="w-4 h-4" /> },
  { id: 'logs', labelKey: 'help.tabs.logs', icon: <Terminal className="w-4 h-4" /> },
];

const SCREENSHOTS: Record<Exclude<ScreenTab, 'intro'>, string> = {
  dashboard: '/screenshots/dashboard.png',
  library: '/screenshots/library.png',
  queue: '/screenshots/queue.png',
  profiles: '/screenshots/profiles.png',
  settings: '/screenshots/settings.png',
  logs: '/screenshots/asset-detail.png',
};

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
    <div className="bg-bg-secondary/80 backdrop-blur-sm rounded-xl border border-border/50 overflow-hidden">
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
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">
              Tips
            </p>
            <ul className="space-y-1">
              {tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-1.5 text-[11px] text-text-muted">
                  <ChevronRight className="w-3 h-3 shrink-0 mt-0.5 text-brand/60" />
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

export const HelpOverlay: React.FC<HelpOverlayProps> = ({ open, onOpenChange }) => {
  const [activeTab, setActiveTab] = useState<ScreenTab>('intro');
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const { t } = useTranslation();

  const openFullGuide = async () => {
    try {
      await openUrl(
        'https://github.com/ideiasestrondosas-ctrl/nexora-desktop/blob/main/docs/USER_MANUAL.md',
      );
    } catch {
      // falha silenciosa se o opener não estiver disponível
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
          <div className="bg-card/95 backdrop-blur-md rounded-xl border border-border/50 shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-gradient-to-r from-brand/5 to-transparent shrink-0">
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

            {/* Tabs */}
            <div className="flex gap-1 px-4 py-2 border-b border-border/50 overflow-x-auto scrollbar-hide shrink-0">
              {SCREEN_TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all shrink-0',
                    activeTab === tab.id
                      ? 'bg-brand text-white'
                      : 'text-text-muted hover:bg-bg-hover hover:text-text-secondary',
                  )}
                >
                  {tab.icon}
                  {t(tab.labelKey)}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
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
                      <strong>{t('help.intro.quickStart')}</strong> {t('help.intro.quickStartDesc')}
                    </p>
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
                    </ul>
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
