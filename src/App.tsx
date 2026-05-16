import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { getVersion } from '@tauri-apps/api/app';
import { Toaster } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard, Library as LibraryIcon, ListVideo,
  Settings, Terminal, UserCircle, ShieldCheck
} from 'lucide-react';

import DashboardPage from '@/pages/DashboardPage';
import LibraryPage from '@/pages/LibraryPage';
import QueuePage from '@/pages/QueuePage';
import ProfilesPage from '@/pages/ProfilesPage';
import SettingsPage from '@/pages/SettingsPage';
import LogsPage from '@/pages/LogsPage';
import AssetDetailPage from '@/pages/AssetDetailPage';
import TopBar from '@/components/TopBar';
import { HelpOverlay } from '@/components/HelpModal';

import { useSettingsStore } from '@/store/settings';
import { useLanguageSync } from '@/i18n/useLanguageSync';
import { cn } from '@/lib/utils';

type Tab = 'dashboard' | 'library' | 'queue' | 'profiles' | 'settings' | 'logs' | 'detail';

function App() {
  useLanguageSync();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [appVersion, setAppVersion] = useState('—');
  const [helpOpen, setHelpOpen] = useState(false);

  const theme = useSettingsStore(state => state.theme);

  // Handle theme changes
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  }, [theme]);

  // Carregar versão real do binário Tauri
  useEffect(() => {
    getVersion()
      .then(setAppVersion)
      .catch(() =>
        invoke<string>('get_app_version')
          .then(setAppVersion)
          .catch(() => setAppVersion('?'))
      );
  }, []);

  const navItems = [
    { id: 'dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
    { id: 'library', label: t('nav.library'), icon: LibraryIcon },
    { id: 'queue', label: t('nav.queue'), icon: ListVideo },
    { id: 'profiles', label: t('nav.profiles'), icon: UserCircle },
    { id: 'settings', label: t('nav.settings'), icon: Settings },
  ];

  const handleNavigate = (tab: string) => {
    setActiveTab(tab as Tab);
    setSelectedAssetId(null);
  };

  const handleSelectAsset = (id: string) => {
    setSelectedAssetId(id);
    setActiveTab('detail');
  };

  return (
    <div className="flex h-screen bg-bg-primary text-text-primary overflow-hidden font-sans selection:bg-brand/30">
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'var(--color-bg-secondary)',
            color: 'var(--color-text-primary)',
            border: '1px solid var(--color-border)',
            fontSize: '12px',
            fontWeight: 'bold'
          }
        }}
      />

      {/* SIDEBAR */}
      <aside className="w-64 bg-bg-primary border-r border-border flex flex-col shrink-0 z-50">
        {/* DRAG AREA (Tauri) */}
        <div data-tauri-drag-region className="h-8 w-full shrink-0"></div>

        {/* LOGO */}
        <div className="px-6 py-4 flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-brand rounded-xl flex items-center justify-center shadow-lg shadow-brand/20">
            <ShieldCheck className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tighter text-text-primary leading-none">NEXORA</h1>
            <span className="text-[10px] font-black tracking-[0.2em] text-brand uppercase">Desktop</span>
          </div>
        </div>

        {/* MAIN NAV */}
        <nav className="flex-1 px-4 space-y-2">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id || (item.id === 'library' && activeTab === 'detail');
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative",
                  isActive
                    ? "bg-brand/10 text-text-primary font-bold"
                    : "text-text-muted hover:text-text-secondary hover:bg-bg-hover"
                )}
              >
                <Icon size={20} className={cn("transition-transform", isActive ? "text-brand" : "group-hover:scale-110")} />
                <span className="text-sm">{item.label}</span>
                {isActive && (
                  <div className="absolute left-0 w-1 h-6 bg-[#1A6FD4] rounded-r-full"></div>
                )}
              </button>
            );
          })}
        </nav>

        {/* BOTTOM NAV */}
        <div className="p-4 space-y-2 border-t border-border">
          <button
            onClick={() => setActiveTab('logs')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200",
              activeTab === 'logs' ? "bg-bg-hover text-text-primary" : "text-text-muted hover:text-text-secondary"
            )}
          >
            <Terminal size={18} />
            <span className="text-xs font-bold uppercase tracking-widest">{t('nav.logs')}</span>
          </button>

          <div className="px-4 py-2 flex flex-col">
            <span className="text-[9px] font-black text-text-muted uppercase tracking-[0.3em]">{t('app.version')}</span>
            <span className="text-[10px] font-bold text-brand uppercase">v{appVersion}</span>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 bg-bg-primary relative">
        <TopBar activeTab={activeTab} onHelpOpen={() => setHelpOpen(true)} />

        {helpOpen && <HelpOverlay onClose={() => setHelpOpen(false)} />}

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {activeTab === 'dashboard' && (
            <DashboardPage
              onNavigate={handleNavigate}
              onSelectAsset={handleSelectAsset}
            />
          )}
          {activeTab === 'library' && <LibraryPage />}
          {activeTab === 'queue' && <QueuePage />}
          {activeTab === 'profiles' && <ProfilesPage />}
          {activeTab === 'settings' && <SettingsPage />}
          {activeTab === 'logs' && <LogsPage />}
          {activeTab === 'detail' && selectedAssetId && (
            <AssetDetailPage
              assetId={selectedAssetId}
              onBack={() => setActiveTab('library')}
            />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
