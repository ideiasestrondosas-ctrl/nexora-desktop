import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Toaster } from 'react-hot-toast';
import { DashboardPage } from '@/pages/DashboardPage';
import { ProcessPage } from '@/pages/ProcessPage';
import { HistoryPage } from '@/pages/HistoryPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { useSettingsStore } from '@/store/settings';
import { useGPU } from '@/hooks/useGPU';
import { useTauriCommand } from '@/hooks/useTauriCommand';
import { Rocket, History, Settings, ShieldCheck, LayoutDashboard, Cpu, HardDrive, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

type Tab = 'dashboard' | 'process' | 'history' | 'settings';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [appVersion, setAppVersion] = useState('...');
  const [diskSpace, setDiskSpace] = useState<{ free_bytes: number, total_bytes: number } | null>(null);
  
  const theme = useSettingsStore(state => state.theme);
  const outputDir = useSettingsStore(state => state.outputDir);
  const { gpu } = useGPU();
  const { execute: getDiskSpace } = useTauriCommand('get_disk_space');

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
    // Check if invoke is available to avoid crash in non-Tauri env
    if (typeof invoke === 'function') {
      invoke<string>('get_app_version')
        .then(setAppVersion)
        .catch(() => setAppVersion('?'));
    } else {
      setAppVersion('Dev');
    }
  }, []);

  // Load disk space
  useEffect(() => {
    const fetchDiskSpace = async () => {
      if (outputDir) {
        const res = await getDiskSpace({ path: outputDir });
        if (res) setDiskSpace(res as any);
      }
    };
    
    fetchDiskSpace();
    const interval = setInterval(fetchDiskSpace, 60000);
    return () => clearInterval(interval);
  }, [outputDir, getDiskSpace]);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'process', label: 'Processar', icon: Rocket },
    { id: 'history', label: 'Histórico', icon: History },
    { id: 'settings', label: 'Definições', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-gray-100 flex flex-col transition-colors duration-300">
      <Toaster position="top-right" />
      {/* Sidebar / Navbar */}
      <nav className="fixed bottom-0 left-0 right-0 md:top-0 md:bottom-auto bg-white dark:bg-gray-900 border-t md:border-t-0 md:border-b border-gray-200 dark:border-gray-800 z-50 px-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-16">
          <div className="hidden md:flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="bg-nexora-blue p-1.5 rounded-lg">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg tracking-tight text-nexora-blue">NEXORA <span className="text-gray-400 dark:text-gray-600 font-light">DESKTOP</span></span>
            </div>

            {/* GPU Badge */}
            {gpu && gpu.available && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/30 rounded-full">
                <Cpu className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-green-700 dark:text-green-400">
                  {gpu.encoder === 'libx264' ? 'CPU' : gpu.encoder.replace('h264_', '')}
                </span>
              </div>
            )}
            {gpu && !gpu.available && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full">
                <Cpu className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">CPU</span>
              </div>
            )}
          </div>

          <div className="flex flex-1 md:flex-none justify-around md:justify-end gap-1 md:gap-4">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as Tab)}
                  className={cn(
                    "flex flex-col md:flex-row items-center gap-1 md:gap-2 px-4 py-2 rounded-xl transition-all duration-200 relative group",
                    isActive 
                      ? "text-nexora-blue md:bg-nexora-blue/10" 
                      : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                  )}
                >
                  <Icon className={cn("w-5 h-5 transition-transform group-hover:scale-110", isActive && "animate-pulse")} />
                  <span className="text-[10px] md:text-sm font-semibold">{tab.label}</span>
                  {isActive && (
                    <span className="absolute -bottom-1 left-4 right-4 h-0.5 bg-nexora-blue rounded-full md:hidden" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-8 pt-6 md:pt-24 mb-20 md:mb-0">
        {activeTab === 'dashboard' && <DashboardPage />}
        {activeTab === 'process' && <ProcessPage />}
        {activeTab === 'history' && <HistoryPage />}
        {activeTab === 'settings' && <SettingsPage />}
      </main>

      {/* Footer (Desktop) */}
      <footer className="hidden md:flex py-4 border-t border-gray-200 dark:border-gray-800 items-center justify-between px-8">
        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">
          Nexora Media Processing • Nexora Desktop v{appVersion} • 2026
        </p>

        {diskSpace && (
          <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${
            diskSpace.free_bytes < 5 * 1024 * 1024 * 1024 
              ? 'text-red-500' 
              : 'text-gray-400'
          }`}>
            {diskSpace.free_bytes < 5 * 1024 * 1024 * 1024 ? (
              <AlertTriangle className="w-3.5 h-3.5" />
            ) : (
              <HardDrive className="w-3.5 h-3.5" />
            )}
            <span>{(diskSpace.free_bytes / (1024 * 1024 * 1024)).toFixed(1)} GB livres</span>
          </div>
        )}
      </footer>
    </div>
  );
}

export default App;
