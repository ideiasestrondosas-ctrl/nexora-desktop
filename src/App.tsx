import { useState, useEffect, useRef, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { getVersion } from '@tauri-apps/api/app';
import { listen } from '@tauri-apps/api/event';
import { Toaster, toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Library as LibraryIcon,
  ListVideo,
  Settings,
  Terminal,
  UserCircle,
  ShieldCheck,
  Upload,
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
import { IngestProfileModal } from '@/components/IngestProfileModal';
import { BatchSubmitModal } from '@/components/BatchSubmitModal';
import { hasSupportedExtension } from '@/components/DropZone';
import { resolveVideoPaths } from '@/lib/scan';

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

  // ── IngestProfileModal state (fallback — mantido para file dialog interno) ──
  const [ingestPaths, setIngestPaths] = useState<string[] | null>(null);
  // ── BatchSubmitModal state ─────────────────────────────────────────────────
  const [batchPaths, setBatchPaths] = useState<string[]>([]);
  const [batchOpen, setBatchOpen] = useState(false);
  /** overlay visual de "a arrastar" sobre o conteúdo */
  const [isDragging, setIsDragging] = useState(false);

  const theme = useSettingsStore((state) => state.theme);
  const defaultProfile = useSettingsStore((state) => state.defaultProfile ?? 'web-hd');

  // Refs para aceder ao tab activo e à função t sem re-registar listeners
  const activeTabRef = useRef<Tab>(activeTab);
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  // ── Drag-drop global centralizado ──────────────────────────────────────────
  // Um único listener tauri://drag-drop — intercepta drops em QUALQUER página
  // e abre o IngestProfileModal em vez de ingerir silenciosamente.
  useEffect(() => {
    const unlisteners: Array<Promise<() => void>> = [
      // Visual: mostrar overlay de "drop zone" quando ficheiros entram na janela
      listen('tauri://drag-enter', () => setIsDragging(true)),
      listen('tauri://drag-over', () => setIsDragging(true)),
      listen('tauri://drag-leave', () => setIsDragging(false)),
      // Segurança: se o utilizador sai da janela durante um drag (alt-tab, etc.)
      // o drag-leave pode não disparar — resetar pelo blur da janela
      listen('tauri://blur', () => setIsDragging(false)),

      // Drop real: expandir pastas e abrir BatchSubmitModal
      listen<{ paths: string[] }>('tauri://drag-drop', async (event) => {
        setIsDragging(false);
        const resolved = await resolveVideoPaths(event.payload.paths);
        if (resolved.length > 0) {
          setBatchPaths(resolved);
          setBatchOpen(true);
        } else if (event.payload.paths.length > 0) {
          // Nenhum vídeo encontrado — ainda assim abre o modal antigo para feedback
          const valid = event.payload.paths.filter(hasSupportedExtension);
          if (valid.length > 0 || event.payload.paths.length > 0) {
            setIngestPaths(event.payload.paths);
          }
        }
      }),
    ];
    return () => {
      unlisteners.forEach((p) => p.then((fn) => fn()));
    };
  }, []); // registado uma vez — state gerido via setters

  // Callback chamado pelos botões Add File/Folder da LibraryPage
  const handleImportRequest = useCallback((paths: string[]) => {
    // Usar BatchSubmitModal para consistência
    resolveVideoPaths(paths)
      .then((resolved) => {
        if (resolved.length > 0) {
          setBatchPaths(resolved);
          setBatchOpen(true);
        } else {
          setIngestPaths(paths);
        }
      })
      .catch(() => setIngestPaths(paths));
  }, []);

  // Callback quando ingest+jobs foram submetidos com sucesso
  const handleIngestComplete = useCallback((_count: number) => {
    setActiveTab('library');
  }, []);

  // ── Theme ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  }, [theme]);

  // ── App version & Startup checks ──────────────────────────────────────────
  useEffect(() => {
    getVersion()
      .then(setAppVersion)
      .catch(() =>
        invoke<string>('get_app_version')
          .then(setAppVersion)
          .catch(() => setAppVersion('?')),
      );

    // Verificar pré-requisitos no arranque
    invoke<{
      nodeOk: boolean;
      sidecarOk: boolean;
      ffprobeOk: boolean;
      ffmpegOk: boolean;
      allOk: boolean;
    }>('get_startup_status')
      .then((status) => {
        if (!status.nodeOk) {
          toast.error(
            t(
              'startup.nodeMissing',
              'Node.js não encontrado no PATH. Instale o Node.js 20+ para o processamento de vídeo funcionar.',
            ),
            { duration: Number.POSITIVE_INFINITY },
          );
        }
        if (!status.ffmpegOk || !status.ffprobeOk) {
          toast.error(
            t(
              'startup.ffmpegMissing',
              'FFmpeg/FFprobe não encontrados. Instale o FFmpeg e adicione ao PATH para ingerir vídeos.',
            ),
            { duration: Number.POSITIVE_INFINITY },
          );
        }
        if (!status.sidecarOk) {
          toast.warning(
            t(
              'startup.sidecarMissing',
              'Script do Sidecar não encontrado. Execute npm run sidecar:build se estiver em desenvolvimento.',
            ),
            { duration: Number.POSITIVE_INFINITY },
          );
        }
      })
      .catch(console.error);
  }, [t]);

  // ── Navigation ─────────────────────────────────────────────────────────────
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
      <Toaster position="bottom-right" richColors closeButton />

      {/* ── IngestProfileModal (fallback para extensões inválidas) ── */}
      <IngestProfileModal
        paths={ingestPaths}
        defaultProfileId={defaultProfile}
        onClose={() => setIngestPaths(null)}
        onComplete={handleIngestComplete}
      />

      {/* ── BatchSubmitModal (drag-drop + Add File/Folder) ── */}
      <BatchSubmitModal
        open={batchOpen}
        paths={batchPaths}
        defaultProfileId={defaultProfile}
        onClose={() => setBatchOpen(false)}
        onComplete={(count) => {
          setBatchOpen(false);
          setActiveTab('library');
          toast.success(t('library.filesAdded', { count }));
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
            <h1 className="text-lg font-black tracking-tighter text-text-primary leading-none">
              NEXORA
            </h1>
            <span className="text-[10px] font-black tracking-[0.2em] text-brand uppercase">
              Desktop
            </span>
          </div>
        </div>

        {/* MAIN NAV */}
        <nav className="flex-1 px-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              activeTab === item.id || (item.id === 'library' && activeTab === 'detail');
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative',
                  isActive
                    ? 'bg-brand/10 text-text-primary font-bold'
                    : 'text-text-muted hover:text-text-secondary hover:bg-bg-hover',
                )}
              >
                <Icon
                  size={20}
                  className={cn(
                    'transition-transform',
                    isActive ? 'text-brand' : 'group-hover:scale-110',
                  )}
                />
                <span className="text-sm">{item.label}</span>
                {isActive && (
                  <div className="absolute left-0 w-1 h-6 bg-brand rounded-r-full"></div>
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
              'w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200',
              activeTab === 'logs'
                ? 'bg-bg-hover text-text-primary'
                : 'text-text-muted hover:text-text-secondary',
            )}
          >
            <Terminal size={18} />
            <span className="text-xs font-bold uppercase tracking-widest">{t('nav.logs')}</span>
          </button>

          <div className="px-4 py-2 flex flex-col">
            <span className="text-[9px] font-black text-text-muted uppercase tracking-[0.3em]">
              {t('app.version')}
            </span>
            <span className="text-[10px] font-bold text-brand uppercase">v{appVersion}</span>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 bg-bg-primary relative">
        <TopBar activeTab={activeTab} onHelpOpen={() => setHelpOpen(true)} />
        <HelpOverlay open={helpOpen} onOpenChange={setHelpOpen} />

        {/* Drag overlay visual — cobre o conteúdo enquanto se arrasta sobre a janela */}
        {isDragging && (
          <div className="absolute inset-0 z-40 pointer-events-none">
            <div className="absolute inset-4 border-2 border-dashed border-brand/60 rounded-2xl bg-brand/5 backdrop-blur-[1px] flex flex-col items-center justify-center gap-3 animate-in fade-in duration-150">
              <div className="w-16 h-16 bg-brand/20 rounded-full flex items-center justify-center">
                <Upload size={28} className="text-brand" />
              </div>
              <p className="text-base font-black text-brand">{t('dropZone.dropHere')}</p>
              <p className="text-xs text-brand/60">{t('dropZone.clickToSelect')}</p>
            </div>
          </div>
        )}

        <div
          className={cn(
            'flex-1 p-8 custom-scrollbar',
            activeTab === 'library' ? 'flex flex-col overflow-hidden' : 'overflow-y-auto',
          )}
        >
          {activeTab === 'dashboard' && (
            <DashboardPage onNavigate={handleNavigate} onSelectAsset={handleSelectAsset} />
          )}
          {activeTab === 'library' && (
            <LibraryPage onImportRequest={handleImportRequest} onSelectAsset={handleSelectAsset} />
          )}
          {activeTab === 'queue' && <QueuePage onSelectAsset={handleSelectAsset} />}
          {activeTab === 'profiles' && <ProfilesPage />}
          {activeTab === 'settings' && <SettingsPage />}
          {activeTab === 'logs' && <LogsPage />}
          {activeTab === 'detail' && selectedAssetId && (
            <AssetDetailPage assetId={selectedAssetId} onBack={() => setActiveTab('library')} />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
