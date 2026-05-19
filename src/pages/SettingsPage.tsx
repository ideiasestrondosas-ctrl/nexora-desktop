import React, { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open, confirm } from '@tauri-apps/plugin-dialog';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '@/store/settings';
import { useGPU } from '@/hooks/useGPU';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { APP_VERSION, VERSION_HISTORY } from '@/lib/version';
import {
  FolderOpen,
  Monitor,
  Palette,
  Cpu,
  Trash2,
  Upload,
  Shield,
  Globe,
  Download,
  RotateCcw,
  RefreshCw,
  ExternalLink,
  HardDrive,
  MemoryStick,
  Network,
  Wifi,
  Server,
  Database,
  Code2,
  Terminal,
  Info,
  AlertCircle,
} from 'lucide-react';

interface Settings {
  output_dir: string;
  max_concurrent_jobs: number;
  gpu_acceleration: boolean;
  notifications_enabled: boolean;
  theme: 'system' | 'light' | 'dark';
  language:
    | 'pt'
    | 'en'
    | 'es'
    | 'fr'
    | 'de'
    | 'ar'
    | 'it'
    | 'ja'
    | 'ko'
    | 'nl'
    | 'pl'
    | 'ru'
    | 'sv'
    | 'tr'
    | 'zh';
  default_profile: string;
  vmaf_threshold: number;
  target_lufs: number;
}

interface GpuInfo {
  vendor: string;
  encoder: string;
  available: boolean;
}

interface InstalledInfo {
  ffmpeg_version: string | null;
  node_version: string | null;
  gpu: GpuInfo;
  db_path: string;
  app_version: string;
}

interface SystemInfo {
  os_name: string;
  os_version: string;
  cpu_model: string;
  cpu_cores: number;
  cpu_threads: number;
  memory_total_gb: number;
  memory_used_gb: number;
  disk_type: string;
  disk_total_gb: number;
  disk_free_gb: number;
  network_interfaces: Array<{ name: string; status: string }>;
  wifi_ssid: string | null;
}

interface DbInfo {
  db_size_mb: number;
  assets_count: number;
  jobs_count: number;
  logs_count: number;
}

interface FfmpegInfo {
  version: string;
  has_libvmaf: boolean;
  codecs: string[];
}

type SettingsTab = 'general' | 'interface' | 'system' | 'advanced' | 'about';

export default function SettingsPage() {
  const settingsStore = useSettingsStore();
  const { gpu, loading: gpuLoading } = useGPU();
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [localSettings, setLocalSettings] = useState<Partial<Settings>>({
    language: 'pt',
    default_profile: 'broadcast-hd',
    vmaf_threshold: 85,
    target_lufs: -23,
  });

  const [installedInfo, setInstalledInfo] = useState<InstalledInfo | null>(null);
  const [installedError, setInstalledError] = useState<string | null>(null);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [systemError, setSystemError] = useState<string | null>(null);
  const [systemLoading, setSystemLoading] = useState(true);
  const [dbInfo, setDbInfo] = useState<DbInfo | null>(null);
  const [ffmpegInfo, setFfmpegInfo] = useState<FfmpegInfo | null>(null);
  const [changelog, setChangelog] = useState<string>('');
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [isDev, setIsDev] = useState(false);

  const systemTimedOut = useRef(false);

  useEffect(() => {
    invoke<Record<string, string>>('get_settings')
      .then((backendSettings) => {
        if (backendSettings.output_dir) settingsStore.setOutputDir(backendSettings.output_dir);
        if (backendSettings.max_concurrent_jobs)
          settingsStore.setMaxConcurrentJobs(Number(backendSettings.max_concurrent_jobs));
        if (backendSettings.gpu_acceleration !== undefined)
          settingsStore.setGpuAcceleration(backendSettings.gpu_acceleration === 'true');
        if (backendSettings.notifications_enabled !== undefined)
          settingsStore.setNotificationsEnabled(backendSettings.notifications_enabled === 'true');
        if (backendSettings.theme)
          settingsStore.setTheme(backendSettings.theme as 'system' | 'light' | 'dark');
        setLocalSettings((prev) => ({
          ...prev,
          language: (backendSettings.language as Settings['language']) || 'pt',
          default_profile: backendSettings.default_profile || 'broadcast-hd',
          vmaf_threshold: Number(backendSettings.vmaf_threshold) || 85,
          target_lufs: Number(backendSettings.target_lufs) || -23,
        }));
      })
      .catch(() => {});

    // get_installed_info — com error handling visível
    invoke<InstalledInfo>('get_installed_info')
      .then(setInstalledInfo)
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : t('settings.errors.installedInfo');
        console.error('get_installed_info failed:', msg);
        setInstalledError(msg);
      });

    invoke<string>('get_changelog')
      .then(setChangelog)
      .catch(() => setChangelog(t('settings.about.noChangelog')));

    // get_system_info — com timeout defensivo (race condition corrigida via ref)
    setSystemLoading(true);
    setSystemError(null);
    systemTimedOut.current = false;
    const systemTimeout = setTimeout(() => {
      systemTimedOut.current = true;
      setSystemLoading(false);
      setSystemError(t('settings.system.timeout'));
    }, 5000);
    invoke<SystemInfo>('get_system_info')
      .then((data) => {
        if (!systemTimedOut.current) {
          clearTimeout(systemTimeout);
          setSystemInfo(data);
          setSystemLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!systemTimedOut.current) {
          clearTimeout(systemTimeout);
          const msg = err instanceof Error ? err.message : t('settings.system.unknownError');
          console.error('get_system_info failed:', msg);
          setSystemError(msg);
          setSystemLoading(false);
        }
      });

    invoke<DbInfo>('get_db_info')
      .then(setDbInfo)
      .catch(() => {});
    invoke<FfmpegInfo>('get_ffmpeg_info')
      .then(setFfmpegInfo)
      .catch(() => {});

    // Detectar modo de desenvolvimento
    setIsDev(import.meta.env.DEV);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // executa apenas na montagem; settingsStore e t sao referencias estaveis

  const handleUpdateSetting = async (key: keyof Settings, value: unknown) => {
    try {
      await invoke('update_settings', { key, value }).catch(console.warn);
      if (key === 'output_dir') settingsStore.setOutputDir(value as string);
      if (key === 'max_concurrent_jobs') settingsStore.setMaxConcurrentJobs(value as number);
      if (key === 'gpu_acceleration') settingsStore.setGpuAcceleration(value as boolean);
      if (key === 'notifications_enabled') settingsStore.setNotificationsEnabled(value as boolean);
      if (key === 'theme') settingsStore.setTheme(value as 'light' | 'dark' | 'system');
      if (key === 'language') {
        settingsStore.setLanguage(value as string);
        const { default: i18n } = await import('@/i18n');
        i18n.changeLanguage(value as string);
      }
      setLocalSettings((prev) => ({ ...prev, [key]: value }));
    } catch (error) {
      console.error('Failed to update setting', error);
    }
  };

  const handleSelectDir = async () => {
    try {
      const selected = await open({ directory: true });
      if (selected && typeof selected === 'string') {
        handleUpdateSetting('output_dir', selected);
      }
    } catch (err) {
      console.error('Failed to open dialog', err);
    }
  };

  const handleOpenDataDir = async () => {
    try {
      await invoke('open_data_dir');
    } catch {
      toast.error(t('settings.toasts.openDataDirError'));
    }
  };

  const handleCheckUpdates = async () => {
    if (isDev) {
      toast(t('settings.advanced.noUpdatesDev'), { icon: '⚠️' });
      return;
    }
    setCheckingUpdate(true);
    try {
      const update = await check();
      if (update) {
        toast.success(t('settings.advanced.updateAvailable', { version: update.version }));
        await update.downloadAndInstall();
      } else {
        toast(t('settings.advanced.latestVersion'), { icon: '✅' });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('Updater error:', msg);
      if (
        msg.toLowerCase().includes('key') ||
        msg.toLowerCase().includes('pubkey') ||
        msg.toLowerCase().includes('updater')
      ) {
        toast.error(t('settings.advanced.updateErrorSigned'));
      } else if (msg.toLowerCase().includes('network') || msg.toLowerCase().includes('fetch')) {
        toast.error(t('settings.advanced.updateErrorNetwork'));
      } else {
        toast.error(t('settings.advanced.updateErrorGeneric', { msg }));
      }
    } finally {
      setCheckingUpdate(false);
    }
  };

  const handleFactoryReset = async () => {
    const confirmed = await confirm(t('settings.advanced.factoryResetConfirmDetailed'), {
      title: t('settings.advanced.factoryResetTitle'),
      kind: 'error',
    });
    if (!confirmed) return;

    // Segunda confirmação: também apagar os ficheiros de output do disco?
    const deleteFiles = await confirm(t('settings.advanced.factoryResetDeleteFilesConfirm'), {
      title: t('settings.advanced.factoryResetDeleteFilesTitle'),
      kind: 'warning',
    });

    const toastId = toast.loading(t('settings.advanced.factoryResetPreparing'));
    try {
      await invoke('factory_reset', { deleteFiles });
      await relaunch();
    } catch (err) {
      console.error('[factory_reset] erro:', err);
      toast.dismiss(toastId);
      toast.error(t('settings.toasts.resetError'));
    }
  };

  const handleExport = async () => {
    try {
      const settings = await invoke<Record<string, string>>('get_settings');
      const profiles = await invoke<unknown[]>('list_profiles');
      const blob = new Blob([JSON.stringify({ settings, profiles }, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nexora-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t('settings.toasts.exportSuccess'));
    } catch {
      toast.error(t('settings.advanced.exportError'));
    }
  };

  const handleImport = async () => {
    try {
      const selected = await open({ filters: [{ name: 'JSON', extensions: ['json'] }] });
      if (!selected || typeof selected !== 'string') return;
      const text = await fetch(selected).then((r) => r.text());
      const data = JSON.parse(text);
      if (data.settings) {
        for (const [k, v] of Object.entries(data.settings)) {
          await invoke('update_settings', { key: k, value: String(v) });
        }
      }
      toast.success(t('settings.advanced.importSuccess'));
      window.location.reload();
    } catch {
      toast.error(t('settings.toasts.importError'));
    }
  };

  const handleResetSettings = async () => {
    const ok = await confirm(t('settings.advanced.resetConfirm'), {
      title: t('settings.advanced.resetTitle'),
      kind: 'warning',
    });
    if (!ok) return;
    await invoke('reset_database').catch(() => {});
    toast.success(t('settings.advanced.resetSuccess'));
    window.location.reload();
  };

  const tabs: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
    { id: 'general', label: t('settings.tabs.general'), icon: Shield },
    { id: 'interface', label: t('settings.tabs.interface'), icon: Palette },
    { id: 'system', label: t('settings.tabs.system'), icon: Server },
    { id: 'advanced', label: t('settings.tabs.advanced'), icon: Globe },
    { id: 'about', label: t('settings.tabs.about'), icon: Info },
  ];

  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <h3 className="text-xs font-black uppercase tracking-widest text-text-muted mb-4">
      {children}
    </h3>
  );

  return (
    <div className="max-w-[900px] mx-auto pb-12 animate-in fade-in duration-300">
      {/* TABS HEADER */}
      <div className="flex gap-1 mb-6 bg-bg-tertiary border border-border rounded-xl p-1">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === t.id
                  ? 'bg-brand text-white'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
              }`}
            >
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* TAB: GENERAL */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          {/* SECÇÃO IMPORTAÇÃO */}
          <section className="rounded-xl border border-border p-6 bg-bg-secondary">
            <SectionTitle>{t('settings.sections.importation')}</SectionTitle>
            <div className="space-y-6">
              {/* Default Profile */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  {t('settings.general.defaultProfile')}
                </label>
                <select
                  value={localSettings.default_profile}
                  onChange={(e) => handleUpdateSetting('default_profile', e.target.value)}
                  className="w-full bg-bg-primary border border-border rounded-lg px-4 py-2 text-text-primary outline-none text-sm"
                >
                  <option value="broadcast-hd">broadcast-hd</option>
                  <option value="broadcast-sd">broadcast-sd</option>
                  <option value="web-4k">web-4k</option>
                  <option value="web-hd">web-hd</option>
                  <option value="proxy">proxy</option>
                  <option value="social">social</option>
                </select>
              </div>

              {/* Mostrar Modal de Perfil */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-medium text-text-primary mb-1">
                    {t('settings.general.showProfileModal')}
                  </div>
                  <div className="text-xs text-text-secondary">
                    {t('settings.general.showProfileModalHint')}
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={settingsStore.showProfileModal}
                    onChange={(e) => settingsStore.setShowProfileModal(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-surface rounded-full peer peer-checked:after:translate-x-full after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand"></div>
                </label>
              </div>

              {/* Analisar Automaticamente */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-medium text-text-primary mb-1">
                    {t('settings.general.autoAnalyze')}
                  </div>
                  <div className="text-xs text-text-secondary">
                    {t('settings.general.autoAnalyzeHint')}
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={settingsStore.autoAnalyze}
                    onChange={(e) => settingsStore.setAutoAnalyze(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-surface rounded-full peer peer-checked:after:translate-x-full after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand"></div>
                </label>
              </div>
            </div>
          </section>

          {/* SECÇÃO PROCESSAMENTO */}
          <section className="rounded-xl border border-border p-6 bg-bg-secondary">
            <SectionTitle>{t('settings.sections.processing')}</SectionTitle>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  {t('settings.general.outputDir')}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={settingsStore.outputDir}
                    className="flex-1 bg-bg-primary border border-border rounded-lg px-4 text-text-secondary outline-none text-sm py-2"
                  />
                  <button
                    onClick={handleSelectDir}
                    className="px-4 py-2 bg-surface hover:bg-surface-hover text-text-primary rounded-lg flex items-center gap-2 transition-colors text-sm"
                  >
                    <FolderOpen size={14} /> {t('settings.general.choose')}
                  </button>
                </div>
                {settingsStore.outputDir && (
                  <p className="mt-2 text-xs text-text-muted font-mono">
                    {settingsStore.outputDir}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  {t('settings.general.concurrentJobs')}
                </label>
                <input
                  type="range"
                  min={1}
                  max={4}
                  step={1}
                  value={settingsStore.maxConcurrentJobs}
                  onChange={(e) =>
                    handleUpdateSetting('max_concurrent_jobs', parseInt(e.target.value))
                  }
                  className="w-full accent-brand"
                />
                <div className="flex justify-between text-xs text-text-secondary mt-1">
                  <span>
                    {t('settings.general.jobsLabel', { count: settingsStore.maxConcurrentJobs })}
                  </span>
                  <span>{t('settings.general.moreJobsCpuRam')}</span>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-border p-6 bg-bg-secondary">
            <SectionTitle>{t('settings.sections.quality')}</SectionTitle>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium text-text-secondary">
                    {t('settings.general.vmafMin')}
                  </label>
                  <span className="text-sm font-mono text-brand">
                    {localSettings.vmaf_threshold}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={localSettings.vmaf_threshold}
                  onChange={(e) => handleUpdateSetting('vmaf_threshold', parseInt(e.target.value))}
                  className="w-full accent-brand"
                />
                <p className="text-xs text-text-muted mt-1">{t('settings.general.vmafHint')}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    {t('settings.general.targetLufs')}
                  </label>
                  <select
                    value={localSettings.target_lufs}
                    onChange={(e) => handleUpdateSetting('target_lufs', parseInt(e.target.value))}
                    className="w-full bg-bg-primary border border-border rounded-lg px-4 py-2 text-text-primary outline-none text-sm"
                  >
                    <option value={-23}>-23 LUFS (Broadcast)</option>
                    <option value={-16}>-16 LUFS (Streaming)</option>
                    <option value={-14}>-14 LUFS (Podcast/Social)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    {t('settings.general.truePeak')}
                  </label>
                  <input
                    type="number"
                    step={0.1}
                    defaultValue={-1}
                    className="w-full bg-bg-primary border border-border rounded-lg px-4 py-2 text-text-primary outline-none text-sm"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-border p-6 bg-bg-secondary">
            <SectionTitle>{t('settings.sections.hardwareAcceleration')}</SectionTitle>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-medium text-text-primary mb-1">
                  {t('settings.general.useGpu')}
                </div>
                <div className="text-xs text-text-secondary">
                  {gpuLoading
                    ? t('settings.general.checkingGpu')
                    : gpu?.available
                      ? t('settings.general.gpuAvailable', {
                          vendor: gpu.vendor,
                          encoder: gpu.encoder,
                        })
                      : t('settings.general.noGpu')}
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={settingsStore.gpuAcceleration}
                  onChange={(e) => handleUpdateSetting('gpu_acceleration', e.target.checked)}
                />
                <div className="w-11 h-6 bg-surface rounded-full peer peer-checked:after:translate-x-full after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand"></div>
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-border p-6 bg-bg-secondary">
            <SectionTitle>{t('settings.sections.notifications')}</SectionTitle>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-text-primary">
                  {t('settings.general.systemNotifications')}
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={settingsStore.notificationsEnabled}
                    onChange={(e) => handleUpdateSetting('notifications_enabled', e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-surface rounded-full peer peer-checked:after:translate-x-full after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand"></div>
                </label>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* TAB: INTERFACE */}
      {activeTab === 'interface' && (
        <div className="space-y-6">
          <section className="rounded-xl border border-border p-6 bg-bg-secondary">
            <SectionTitle>{t('settings.interface.theme')}</SectionTitle>
            <div className="flex gap-3">
              {(['system', 'light', 'dark'] as const).map((tTheme) => (
                <button
                  key={tTheme}
                  onClick={() => handleUpdateSetting('theme', tTheme)}
                  className={`flex-1 py-3 rounded-lg text-sm font-bold border transition-all ${
                    settingsStore.theme === tTheme
                      ? 'bg-brand border-brand text-white'
                      : 'bg-bg-primary border-border text-text-secondary hover:text-text-primary hover:border-gray-500'
                  }`}
                >
                  {tTheme === 'system' && t('settings.interface.system')}
                  {tTheme === 'light' && t('settings.interface.light')}
                  {tTheme === 'dark' && t('settings.interface.dark')}
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-text-muted">{t('settings.interface.themeHint')}</p>
          </section>

          <section className="rounded-xl border border-border p-6 bg-bg-secondary">
            <SectionTitle>{t('settings.interface.language')}</SectionTitle>
            <select
              value={localSettings.language}
              onChange={(e) => handleUpdateSetting('language', e.target.value)}
              className="w-full bg-bg-primary border border-border rounded-lg px-4 py-3 text-text-primary outline-none text-sm"
            >
              <option value="pt">{t('settings.interface.pt')}</option>
              <option value="en">{t('settings.interface.en')}</option>
              <option value="es">{t('settings.interface.es')}</option>
              <option value="fr">{t('settings.interface.fr')}</option>
              <option value="de">{t('settings.interface.de')}</option>
              <option value="ar">{t('settings.interface.ar')}</option>
              <option value="it">{t('settings.interface.it')}</option>
              <option value="ja">{t('settings.interface.ja')}</option>
              <option value="ko">{t('settings.interface.ko')}</option>
              <option value="nl">{t('settings.interface.nl')}</option>
              <option value="pl">{t('settings.interface.pl')}</option>
              <option value="ru">{t('settings.interface.ru')}</option>
              <option value="sv">{t('settings.interface.sv')}</option>
              <option value="tr">{t('settings.interface.tr')}</option>
              <option value="zh">{t('settings.interface.zh')}</option>
            </select>
            <p className="mt-3 text-xs text-text-muted">{t('settings.interface.languageHint')}</p>
          </section>
        </div>
      )}

      {/* TAB: SYSTEM */}
      {activeTab === 'system' && (
        <div className="space-y-6">
          {systemLoading && (
            <div className="rounded-xl border border-border p-12 bg-bg-secondary text-center">
              <RefreshCw size={32} className="animate-spin mx-auto mb-4 text-brand" />
              <p className="text-sm text-text-secondary">{t('settings.system.loading')}</p>
            </div>
          )}

          {/* ERROR — mostra card de erro MAS também os dados que temos */}
          {!systemLoading && systemError && (
            <div className="rounded-xl border border-red-500/30 p-6 bg-red-500/5">
              <div className="flex items-start gap-3">
                <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-red-500 mb-1">
                    {t('settings.system.errorTitle')}
                  </p>
                  <p className="text-xs text-text-secondary font-mono mb-4">{systemError}</p>
                  <button
                    onClick={() => {
                      setSystemLoading(true);
                      setSystemError(null);
                      systemTimedOut.current = false;
                      const timer = setTimeout(() => {
                        systemTimedOut.current = true;
                        setSystemLoading(false);
                        setSystemError(t('settings.system.timeout'));
                      }, 5000);
                      invoke<SystemInfo>('get_system_info')
                        .then((data) => {
                          if (!systemTimedOut.current) {
                            clearTimeout(timer);
                            setSystemInfo(data);
                            setSystemLoading(false);
                          }
                        })
                        .catch((err: unknown) => {
                          if (!systemTimedOut.current) {
                            clearTimeout(timer);
                            const msg =
                              err instanceof Error
                                ? err.message
                                : t('settings.system.unknownError');
                            setSystemError(msg);
                            setSystemLoading(false);
                          }
                        });
                    }}
                    className="px-3 py-1.5 bg-brand hover:bg-blue-600 text-white text-xs font-bold rounded-lg transition-colors"
                  >
                    {t('settings.system.retry')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* CONTEÚDO — mostra SEMPRE, mesmo com systemInfo null (usa defaults) */}
          {!systemLoading && (
            <>
              <section className="rounded-xl border border-border p-6 bg-bg-secondary">
                <SectionTitle>{t('settings.system.systemInfo')}</SectionTitle>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
                  <div className="flex items-start gap-3 p-3 bg-bg-primary rounded-lg border border-border">
                    <Terminal size={16} className="text-brand shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-text-muted">{t('settings.system.os')}</p>
                      <p className="text-text-primary font-bold">
                        {systemInfo?.os_name ?? 'N/A'} {systemInfo?.os_version ?? ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-bg-primary rounded-lg border border-border">
                    <Cpu size={16} className="text-brand shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-text-muted">{t('settings.system.cpu')}</p>
                      <p className="text-text-primary font-bold">
                        {systemInfo?.cpu_model ?? 'N/A'}
                      </p>
                      <p className="text-text-secondary">
                        {t('settings.system.coresThreads', {
                          cores: systemInfo?.cpu_cores ?? '—',
                          threads: systemInfo?.cpu_threads ?? '—',
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-bg-primary rounded-lg border border-border">
                    <MemoryStick size={16} className="text-green-500 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-text-muted">{t('settings.system.memory')}</p>
                      <p className="text-text-primary font-bold">
                        {t('settings.system.memoryTotal', {
                          total: systemInfo?.memory_total_gb?.toFixed(1) ?? '—',
                        })}
                      </p>
                      <p className="text-text-secondary">
                        {t('settings.system.memoryUsed', {
                          used: systemInfo?.memory_used_gb?.toFixed(1) ?? '—',
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-bg-primary rounded-lg border border-border">
                    <HardDrive size={16} className="text-yellow-500 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-text-muted">{t('settings.system.disk')}</p>
                      <p className="text-text-primary font-bold">
                        {systemInfo?.disk_type ?? 'N/A'}
                      </p>
                      <p className="text-text-secondary">
                        {t('settings.system.diskTotalFree', {
                          total: systemInfo?.disk_total_gb?.toFixed(0) ?? '—',
                          free: systemInfo?.disk_free_gb?.toFixed(0) ?? '—',
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-bg-primary rounded-lg border border-border">
                    <Monitor size={16} className="text-purple-500 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-text-muted">{t('settings.system.gpu')}</p>
                      <p className="text-text-primary font-bold">
                        {installedInfo?.gpu?.vendor?.toUpperCase() ?? 'CPU'} —{' '}
                        {installedInfo?.gpu?.encoder ?? 'libx264'}
                      </p>
                      <p className="text-text-secondary">
                        {installedInfo?.gpu?.available
                          ? t('settings.system.gpuAccelerationAvailable')
                          : t('settings.system.gpuSoftware')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-bg-primary rounded-lg border border-border">
                    <Network size={16} className="text-teal-500 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-text-muted">{t('settings.system.network')}</p>
                      {systemInfo?.network_interfaces &&
                      systemInfo.network_interfaces.length > 0 ? (
                        systemInfo.network_interfaces.map((ni, i) => (
                          <p key={i} className="text-text-primary font-bold">
                            {ni.name}{' '}
                            <span className="text-text-secondary font-normal">({ni.status})</span>
                          </p>
                        ))
                      ) : (
                        <p className="text-text-secondary">{t('settings.system.noNetworkInfo')}</p>
                      )}
                      {systemInfo?.wifi_ssid && (
                        <p className="text-text-secondary">
                          <Wifi size={10} className="inline mr-1" />
                          SSID: {systemInfo.wifi_ssid}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-border p-6 bg-bg-secondary">
                <SectionTitle>{t('settings.system.binaries')}</SectionTitle>
                <div className="space-y-3 font-mono text-xs">
                  <div className="flex justify-between border-b border-border pb-2">
                    <span className="text-text-muted flex items-center gap-2">
                      <Code2 size={12} /> FFmpeg
                    </span>
                    <span className="text-text-secondary">
                      {ffmpegInfo?.version ??
                        installedInfo?.ffmpeg_version ??
                        t('settings.system.notFound')}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-border pb-2">
                    <span className="text-text-muted flex items-center gap-2">
                      <Code2 size={12} /> libvmaf
                    </span>
                    <span className={ffmpegInfo?.has_libvmaf ? 'text-green-500' : 'text-red-500'}>
                      {ffmpegInfo?.has_libvmaf
                        ? t('settings.system.available')
                        : t('settings.system.unavailable')}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-border pb-2">
                    <span className="text-text-muted flex items-center gap-2">
                      <Terminal size={12} /> Node.js
                    </span>
                    <span className="text-text-secondary">
                      {installedInfo?.node_version ?? 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between pb-2">
                    <span className="text-text-muted flex items-center gap-2">
                      <Database size={12} /> {t('settings.system.database')}
                    </span>
                    <span className="text-text-secondary truncate max-w-[300px]">
                      {installedInfo?.db_path ?? 'N/A'}
                    </span>
                  </div>
                  {dbInfo && (
                    <div className="grid grid-cols-4 gap-2 pt-2">
                      <div className="text-center p-2 bg-bg-primary rounded border border-border">
                        <p className="text-text-primary font-bold">
                          {dbInfo.db_size_mb.toFixed(1)} MB
                        </p>
                        <p className="text-text-muted">{t('settings.system.dbSize')}</p>
                      </div>
                      <div className="text-center p-2 bg-bg-primary rounded border border-border">
                        <p className="text-text-primary font-bold">{dbInfo.assets_count}</p>
                        <p className="text-text-muted">{t('settings.system.dbAssets')}</p>
                      </div>
                      <div className="text-center p-2 bg-bg-primary rounded border border-border">
                        <p className="text-text-primary font-bold">{dbInfo.jobs_count}</p>
                        <p className="text-text-muted">{t('settings.system.dbJobs')}</p>
                      </div>
                      <div className="text-center p-2 bg-bg-primary rounded border border-border">
                        <p className="text-text-primary font-bold">{dbInfo.logs_count}</p>
                        <p className="text-text-muted">{t('settings.system.dbLogs')}</p>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            </>
          )}
        </div>
      )}

      {/* TAB: ADVANCED */}
      {activeTab === 'advanced' && (
        <div className="space-y-6">
          <section className="rounded-xl border border-border p-6 bg-bg-secondary">
            <SectionTitle>{t('settings.sections.privacy')}</SectionTitle>
            <div className="flex items-start justify-between">
              <div className="flex-1 pr-4">
                <div className="text-sm font-medium text-text-primary mb-1">
                  {t('settings.advanced.telemetry')}
                </div>
                <div className="text-xs text-text-secondary">
                  {t('settings.advanced.telemetryHint')}
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={settingsStore.telemetryEnabled}
                  onChange={(e) => settingsStore.setTelemetryEnabled(e.target.checked)}
                />
                <div className="w-11 h-6 bg-surface rounded-full peer peer-checked:after:translate-x-full after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand"></div>
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-border p-6 bg-bg-secondary">
            <SectionTitle>{t('settings.sections.data')}</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleExport}
                className="flex items-center justify-center gap-2 p-3 bg-surface hover:bg-surface-hover text-text-primary rounded-lg transition-colors text-sm font-medium"
              >
                <Download size={14} /> {t('settings.advanced.export')}
              </button>
              <button
                onClick={handleImport}
                className="flex items-center justify-center gap-2 p-3 bg-surface hover:bg-surface-hover text-text-primary rounded-lg transition-colors text-sm font-medium"
              >
                <Upload size={14} /> {t('settings.advanced.import')}
              </button>
            </div>
          </section>

          <section className="rounded-xl border border-border p-6 bg-bg-secondary">
            <SectionTitle>{t('settings.sections.maintenance')}</SectionTitle>
            <div className="space-y-3">
              <button
                onClick={handleResetSettings}
                className="flex items-center gap-3 w-full p-3 bg-surface hover:bg-surface-hover text-text-primary rounded-lg transition-colors text-left text-sm font-medium"
              >
                <RotateCcw size={14} /> {t('settings.advanced.resetSettings')}
              </button>
              <button
                onClick={handleFactoryReset}
                className="flex items-center gap-3 w-full p-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors text-left text-sm font-medium"
              >
                <Trash2 size={14} /> {t('settings.advanced.factoryReset')}
              </button>
            </div>
          </section>
        </div>
      )}

      {/* TAB: ABOUT */}
      {activeTab === 'about' && (
        <div className="space-y-6">
          <section className="rounded-xl border border-border p-6 bg-bg-secondary">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-brand flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-blue-900/40">
                N
              </div>
              <div>
                <h3 className="text-xl font-bold text-text-primary">Nexora Media Processing</h3>
                <p className="text-text-secondary text-sm">
                  Desktop Edition — Native Multiplatform
                </p>
                <div className="inline-block mt-1 px-2 py-0.5 bg-surface text-xs font-mono rounded text-text-secondary">
                  v{installedInfo?.app_version ?? APP_VERSION}
                  {installedError && (
                    <span className="ml-2 text-red-400" title={installedError}>
                      (offline)
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="border border-border rounded-lg overflow-hidden bg-bg-primary">
              <div className="p-4 border-b border-border">
                <span className="font-medium text-text-secondary text-sm">
                  {t('settings.about.releaseNotes')}
                </span>
              </div>
              <div className="p-4 max-h-[200px] overflow-y-auto">
                <pre className="text-xs text-text-secondary font-mono whitespace-pre-wrap">
                  {changelog}
                </pre>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 mt-6">
              <button
                onClick={handleCheckUpdates}
                disabled={checkingUpdate}
                className="px-4 py-2 bg-brand hover:bg-blue-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <RefreshCw size={14} className={checkingUpdate ? 'animate-spin' : ''} />{' '}
                {t('settings.about.checkUpdates')}
              </button>
              <button
                onClick={handleOpenDataDir}
                className="px-4 py-2 bg-surface hover:bg-surface-hover text-text-primary text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <ExternalLink size={14} /> {t('settings.about.openData')}
              </button>
            </div>
          </section>

          <section className="rounded-xl border border-border p-6 bg-bg-secondary">
            <SectionTitle>{t('settings.about.versionHistory')}</SectionTitle>
            <div className="space-y-3 text-xs text-text-secondary">
              {VERSION_HISTORY.map((entry, idx) => (
                <div key={entry.version} className="flex gap-3">
                  <span
                    className={
                      idx === 0
                        ? 'text-brand font-bold shrink-0'
                        : 'text-text-muted font-bold shrink-0'
                    }
                  >
                    v{entry.version}
                  </span>
                  <span>{entry.description}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
