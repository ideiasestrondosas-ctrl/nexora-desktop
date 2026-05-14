import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Toaster } from 'react-hot-toast';
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

import { useSettingsStore } from '@/store/settings';
import { cn } from '@/lib/utils';

type Tab = 'dashboard' | 'library' | 'queue' | 'profiles' | 'settings' | 'logs' | 'detail';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [appVersion, setAppVersion] = useState('2.0.0');
  
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

  // Load app version
  useEffect(() => {
    if (typeof invoke === 'function') {
      invoke<string>('get_app_version')
        .then(setAppVersion)
        .catch(() => setAppVersion('2.0.0'));
    }
  }, []);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'library', label: 'Biblioteca', icon: LibraryIcon },
    { id: 'queue', label: 'Fila', icon: ListVideo },
    { id: 'profiles', label: 'Perfis', icon: UserCircle },
    { id: 'settings', label: 'Definições', icon: Settings },
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
    <div className="flex h-screen bg-[#0a0d14] text-gray-100 overflow-hidden font-sans selection:bg-[#1A6FD4]/30">
      <Toaster 
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#141824',
            color: '#fff',
            border: '1px border #1e2433',
            fontSize: '12px',
            fontWeight: 'bold'
          }
        }}
      />

      {/* SIDEBAR */}
      <aside className="w-64 bg-[#0a0d14] border-r border-[#1e2433] flex flex-col shrink-0 z-50">
        {/* DRAG AREA (Tauri) */}
        <div data-tauri-drag-region className="h-8 w-full shrink-0"></div>

        {/* LOGO */}
        <div className="px-6 py-4 flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-[#1A6FD4] rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/40">
            <ShieldCheck className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tighter text-white leading-none">NEXORA</h1>
            <span className="text-[10px] font-black tracking-[0.2em] text-[#1A6FD4] uppercase">Desktop</span>
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
                    ? "bg-[#1A6FD4]/10 text-white font-bold" 
                    : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                )}
              >
                <Icon size={20} className={cn("transition-transform", isActive ? "text-[#1A6FD4]" : "group-hover:scale-110")} />
                <span className="text-sm">{item.label}</span>
                {isActive && (
                  <div className="absolute left-0 w-1 h-6 bg-[#1A6FD4] rounded-r-full"></div>
                )}
              </button>
            );
          })}
        </nav>

        {/* BOTTOM NAV */}
        <div className="p-4 space-y-2 border-t border-[#1e2433]">
          <button
            onClick={() => setActiveTab('logs')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200",
              activeTab === 'logs' ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300"
            )}
          >
            <Terminal size={18} />
            <span className="text-xs font-bold uppercase tracking-widest">Registos</span>
          </button>

          <div className="px-4 py-2 flex flex-col">
            <span className="text-[9px] font-black text-gray-700 uppercase tracking-[0.3em]">Versão</span>
            <span className="text-[10px] font-bold text-[#1A6FD4] uppercase">v{appVersion}</span>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#0a0d14] relative">
        <TopBar activeTab={activeTab} />

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
