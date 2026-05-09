import { useState, useEffect } from 'react';
import { ProcessPage } from '@/pages/ProcessPage';
import { HistoryPage } from '@/pages/HistoryPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { useSettingsStore } from '@/store/settings';
import { Rocket, History, Settings, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

type Tab = 'process' | 'history' | 'settings';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('process');
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

  const tabs = [
    { id: 'process', label: 'Processar', icon: Rocket },
    { id: 'history', label: 'Histórico', icon: History },
    { id: 'settings', label: 'Definições', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-gray-100 flex flex-col transition-colors duration-300">
      {/* Sidebar / Navbar */}
      <nav className="fixed bottom-0 left-0 right-0 md:top-0 md:bottom-auto bg-white dark:bg-gray-900 border-t md:border-t-0 md:border-b border-gray-200 dark:border-gray-800 z-50 px-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-16">
          <div className="hidden md:flex items-center gap-2">
            <div className="bg-nexora-blue p-1.5 rounded-lg">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight text-nexora-blue">NEXORA <span className="text-gray-400 dark:text-gray-600 font-light">DESKTOP</span></span>
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
        {activeTab === 'process' && <ProcessPage />}
        {activeTab === 'history' && <HistoryPage />}
        {activeTab === 'settings' && <SettingsPage />}
      </main>

      {/* Footer (Desktop) */}
      <footer className="hidden md:block py-4 border-t border-gray-200 dark:border-gray-800 text-center">
         <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">
           Nexora Media Processing • Versão Desktop 0.2.0 • 2026
         </p>
      </footer>
    </div>
  );
}

export default App;
