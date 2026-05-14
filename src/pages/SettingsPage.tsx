import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open, confirm } from '@tauri-apps/plugin-dialog';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '@/store/settings';
import { useGPU } from '@/hooks/useGPU';
import { check } from '@tauri-apps/plugin-updater';
import { APP_VERSION, VERSION_HISTORY } from '@/lib/version';
import {
  FolderOpen, Monitor, Palette, Cpu,
  Trash2, Upload, Shield, Globe, Download,
  RotateCcw, RefreshCw, ExternalLink, HardDrive,
  MemoryStick, Network, Wifi, Server, Database,
  Code2, Terminal, Info, AlertCircle
} from 'lucide-react';

interface Settings {
  output_dir: string;
  max_concurrent_jobs: number;
  gpu_acceleration: boolean;
  notifications_enabled: boolean;
  theme: 'system' | 'light' | 'dark';
  language: 'pt' | 'en';
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
      .then(backendSettings => {
        if (backendSettings.output_dir) settingsStore.setOutputDir(backendSettings.output_dir);
        if (backendSettings.max_concurrent_jobs) settingsStore.setMaxConcurrentJobs(Number(backendSettings.max_concurrent_jobs));
        if (backendSettings.gpu_acceleration !== undefined) settingsStore.setGpuAcceleration(backendSettings.gpu_acceleration === 'true');
        if (backendSettings.notifications_enabled !== undefined) settingsStore.setNotificationsEnabled(backendSettings.notifications_enabled === 'true');
        if (backendSettings.theme) settingsStore.setTheme(backendSettings.theme as 'system' | 'light' | 'dark');
        setLocalSettings(prev => ({
          ...prev,
          language: (backendSettings.language as 'pt' | 'en') || 'pt',
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
        const msg = err instanceof Error ? err.message : 'Erro ao carregar info instalada';
        console.error('get_installed_info failed:', msg);
        setInstalledError(msg);
      });

    invoke<string>('get_changelog').then(setChangelog).catch(() => setChangelog('Sem registos de alterações disponíveis.'));

    // get_system_info — com timeout defensivo (race condition corrigida via ref)
    setSystemLoading(true);
    setSystemError(null);
    systemTimedOut.current = false;
    const systemTimeout = setTimeout(() => {
      systemTimedOut.current = true;
      setSystemLoading(false);
      setSystemError('Timeout ao carregar informação do sistema (>5s)');
    }, 5000);
    invoke<SystemInfo>('get_system_info')
      .then(data => {
        if (!systemTimedOut.current) {
          clearTimeout(systemTimeout);
          setSystemInfo(data);
          setSystemLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!systemTimedOut.current) {
          clearTimeout(systemTimeout);
          const msg = err instanceof Error ? err.message : 'Erro desconhecido ao carregar informação do sistema';
          console.error('get_system_info failed:', msg);
          setSystemError(msg);
          setSystemLoading(false);
        }
      });

    invoke<DbInfo>('get_db_info').then(setDbInfo).catch(() => {});
    invoke<FfmpegInfo>('get_ffmpeg_info').then(setFfmpegInfo).catch(() => {});

    // Detectar modo de desenvolvimento
    setIsDev(import.meta.env.DEV);
  }, []);

  const handleUpdateSetting = async (key: keyof Settings, value: any) => {
    try {
      await invoke('update_settings', { key, value }).catch(console.warn);
      if (key === 'output_dir') settingsStore.setOutputDir(value);
      if (key === 'max_concurrent_jobs') settingsStore.setMaxConcurrentJobs(value);
      if (key === 'gpu_acceleration') settingsStore.setGpuAcceleration(value);
      if (key === 'notifications_enabled') settingsStore.setNotificationsEnabled(value);
      if (key === 'theme') settingsStore.setTheme(value);
      if (key === 'language') {
        settingsStore.setLanguage(value);
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { default: i18n } = await import('@/i18n');
        i18n.changeLanguage(value);
      }
      setLocalSettings(prev => ({ ...prev, [key]: value }));
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
    } catch (err) {
      toast.error('Erro ao abrir pasta de dados');
    }
  };

  const handleCheckUpdates = async () => {
    if (isDev) {
      toast('Verificação de actualizações não disponível em modo de desenvolvimento', { icon: '⚠️' });
      return;
    }
    setCheckingUpdate(true);
    try {
      const update = await check();
      if (update) {
        toast.success(`Nova versão disponível: ${update.version}`);
        await update.downloadAndInstall();
      } else {
        toast('Já tens a versão mais recente', { icon: '✅' });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('Updater error:', msg);
      if (msg.toLowerCase().includes('key') || msg.toLowerCase().includes('pubkey') || msg.toLowerCase().includes('updater')) {
        toast.error('Verificação de actualizações apenas disponível em builds assinados de release');
      } else if (msg.toLowerCase().includes('network') || msg.toLowerCase().includes('fetch')) {
        toast.error('Erro de rede. Verifica a tua ligação à internet.');
      } else {
        toast.error(`Erro ao verificar actualizações: ${msg}`);
      }
    } finally {
      setCheckingUpdate(false);
    }
  };

  const handleFactoryReset = async () => {
    const confirmed = await confirm(
      'Tens a certeza que desejas realizar um RESET TOTAL?\n\n' +
      'Isto irá apagar ABSOLUTAMENTE TUDO:\n' +
      '• Toda a biblioteca de assets\n' +
      '• Histórico de jobs e logs\n' +
      '• Todos os perfis personalizados\n' +
      '• Todas as tuas definições\n\n' +
      'A aplicação será reiniciada. Esta acção é irreversível.',
      { title: 'Nexora Desktop — Factory Reset', kind: 'error' }
    );
    if (confirmed) {
      toast.loading('A preparar reset total...');
      await invoke('factory_reset').catch(() => toast.error('Erro ao realizar reset'));
    }
  };

  const handleExport = async () => {
    try {
      const settings = await invoke<Record<string, string>>('get_settings');
      const profiles = await invoke<unknown[]>('list_profiles');
      const blob = new Blob([JSON.stringify({ settings, profiles }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nexora-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Backup exportado');
    } catch {
      toast.error('Erro ao exportar');
    }
  };

  const handleImport = async () => {
    try {
      const selected = await open({ filters: [{ name: 'JSON', extensions: ['json'] }] });
      if (!selected || typeof selected !== 'string') return;
      const text = await fetch(selected).then(r => r.text());
      const data = JSON.parse(text);
      if (data.settings) {
        for (const [k, v] of Object.entries(data.settings)) {
          await invoke('update_settings', { key: k, value: String(v) });
        }
      }
      toast.success(t('settings.advanced.importSuccess'));
      window.location.reload();
    } catch {
      toast.error('Erro ao importar');
    }
  };

  const handleResetSettings = async () => {
    const ok = await confirm('Repor todas as definições para os valores por omissão?', { title: 'Reiniciar Definições', kind: 'warning' });
    if (!ok) return;
    await invoke('reset_database').catch(() => {});
    toast.success(t('settings.advanced.resetSuccess'));
    window.location.reload();
  };

  const tabs: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
    { id: 'general', label: 'Geral', icon: Shield },
    { id: 'interface', label: 'Interface', icon: Palette },
    { id: 'system', label: 'Sistema', icon: Server },
    { id: 'advanced', label: 'Avançado', icon: Globe },
    { id: 'about', label: 'Sobre', icon: Info },
  ];

  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <h3 className="text-xs font-black uppercase tracking-widest text-text-muted mb-4">{children}</h3>
  );

  return (
    <div className="max-w-[900px] mx-auto pb-12 animate-in fade-in duration-300">
      {/* TABS HEADER */}
      <div className="flex gap-1 mb-6 bg-bg-tertiary border border-border rounded-xl p-1">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === t.id ? 'bg-brand text-white' : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
              }`}
            >
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* TAB: GERAL */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          <section className="rounded-xl border border-border p-6 bg-bg-secondary">
            <SectionTitle>Processamento</SectionTitle>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Pasta de saída</label>
                <div className="flex gap-2">
                  <input type="text" readOnly value={settingsStore.outputDir}
                    className="flex-1 bg-bg-primary border border-border rounded-lg px-4 text-text-secondary outline-none text-sm py-2"
                  />
                  <button onClick={handleSelectDir}
                    className="px-4 py-2 bg-surface hover:bg-surface-hover text-text-primary rounded-lg flex items-center gap-2 transition-colors text-sm"
                  >
                    <FolderOpen size={14} /> {t('settings.general.choose')}
                  </button>
                </div>
                {settingsStore.outputDir && <p className="mt-2 text-xs text-text-muted font-mono">{settingsStore.outputDir}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Jobs simultâneos</label>
                <input type="range" min={1} max={4} step={1}
                  value={settingsStore.maxConcurrentJobs}
                  onChange={e => handleUpdateSetting('max_concurrent_jobs', parseInt(e.target.value))}
                  className="w-full accent-brand"
                />
                <div className="flex justify-between text-xs text-text-secondary mt-1">
                  <span>{settingsStore.maxConcurrentJobs} job{settingsStore.maxConcurrentJobs > 1 ? 's' : ''}</span>
                  <span>Mais jobs = mais CPU/RAM</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Perfil padrão</label>
                <select value={localSettings.default_profile}
                  onChange={e => handleUpdateSetting('default_profile', e.target.value)}
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
            </div>
          </section>

          <section className="rounded-xl border border-border p-6 bg-bg-secondary">
            <SectionTitle>Qualidade</SectionTitle>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium text-text-secondary">VMAF Mínimo</label>
                  <span className="text-sm font-mono text-brand">{localSettings.vmaf_threshold}</span>
                </div>
                <input type="range" min={0} max={100}
                  value={localSettings.vmaf_threshold}
                  onChange={e => handleUpdateSetting('vmaf_threshold', parseInt(e.target.value))}
                  className="w-full accent-brand"
                />
                <p className="text-xs text-text-muted mt-1">Jobs abaixo deste valor são marcados com aviso.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">LUFS Alvo</label>
                  <select value={localSettings.target_lufs}
                    onChange={e => handleUpdateSetting('target_lufs', parseInt(e.target.value))}
                    className="w-full bg-bg-primary border border-border rounded-lg px-4 py-2 text-text-primary outline-none text-sm"
                  >
                    <option value={-23}>-23 LUFS (Broadcast)</option>
                    <option value={-16}>-16 LUFS (Streaming)</option>
                    <option value={-14}>-14 LUFS (Podcast/Social)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">True Peak (dBTP)</label>
                  <input type="number" step={0.1} defaultValue={-1}
                    className="w-full bg-bg-primary border border-border rounded-lg px-4 py-2 text-text-primary outline-none text-sm"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-border p-6 bg-bg-secondary">
            <SectionTitle>Aceleração de Hardware</SectionTitle>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-medium text-text-primary mb-1">Usar aceleração GPU</div>
                <div className="text-xs text-text-secondary">
                  {gpuLoading ? 'A verificar...' : gpu?.available
                    ? `GPU: ${gpu.vendor} (${gpu.encoder})`
                    : 'Sem GPU compatível — a usar CPU (libx264)'}
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer"
                  checked={settingsStore.gpuAcceleration}
                  onChange={e => handleUpdateSetting('gpu_acceleration', e.target.checked)}
                />
                <div className="w-11 h-6 bg-surface rounded-full peer peer-checked:after:translate-x-full after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand"></div>
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-border p-6 bg-bg-secondary">
            <SectionTitle>Notificações</SectionTitle>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-text-primary">Notificações do sistema</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer"
                    checked={settingsStore.notificationsEnabled}
                    onChange={e => handleUpdateSetting('notifications_enabled', e.target.checked)}
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
            <SectionTitle>Tema</SectionTitle>
            <div className="flex gap-3">
              {(['system', 'light', 'dark'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => handleUpdateSetting('theme', t)}
                  className={`flex-1 py-3 rounded-lg text-sm font-bold border transition-all ${
                    settingsStore.theme === t
                      ? 'bg-brand border-brand text-white'
                      : 'bg-bg-primary border-border text-text-secondary hover:text-text-primary hover:border-gray-500'
                  }`}
                >
                  {t === 'system' && 'Sistema'}
                  {t === 'light' && 'Claro'}
                  {t === 'dark' && 'Escuro'}
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-text-muted">
              O tema "Sistema" segue a preferência do teu sistema operativo.
            </p>
          </section>

          <section className="rounded-xl border border-border p-6 bg-bg-secondary">
            <SectionTitle>Idioma</SectionTitle>
            <select
              value={localSettings.language}
              onChange={e => handleUpdateSetting('language', e.target.value)}
              className="w-full bg-bg-primary border border-border rounded-lg px-4 py-3 text-text-primary outline-none text-sm"
            >
              <option value="pt">Português (Portugal)</option>
              <option value="en">English</option>
            </select>
            <p className="mt-3 text-xs text-text-muted">
              {t('settings.interface.languageHint')}
            </p>
          </section>
        </div>
      )}

      {/* TAB: SISTEMA */}
      {activeTab === 'system' && (
        <div className="space-y-6">
          {systemLoading && (
            <div className="rounded-xl border border-border p-12 bg-bg-secondary text-center">
              <RefreshCw size={32} className="animate-spin mx-auto mb-4 text-brand" />
              <p className="text-sm text-text-secondary">A carregar informação do sistema...</p>
            </div>
          )}

          {/* ERRO — mostra card de erro MAS também os dados que temos */}
          {!systemLoading && systemError && (
            <div className="rounded-xl border border-red-500/30 p-6 bg-red-500/5">
              <div className="flex items-start gap-3">
                <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-red-500 mb-1">Erro ao carregar informação do sistema</p>
                  <p className="text-xs text-text-secondary font-mono mb-4">{systemError}</p>
                  <button
                    onClick={() => {
                      setSystemLoading(true);
                      setSystemError(null);
                      systemTimedOut.current = false;
                      const timer = setTimeout(() => {
                        systemTimedOut.current = true;
                        setSystemLoading(false);
                        setSystemError('Timeout ao carregar informação do sistema (>5s)');
                      }, 5000);
                      invoke<SystemInfo>('get_system_info')
                        .then(data => {
                          if (!systemTimedOut.current) {
                            clearTimeout(timer);
                            setSystemInfo(data);
                            setSystemLoading(false);
                          }
                        })
                        .catch((err: unknown) => {
                          if (!systemTimedOut.current) {
                            clearTimeout(timer);
                            const msg = err instanceof Error ? err.message : 'Erro desconhecido';
                            setSystemError(msg);
                            setSystemLoading(false);
                          }
                        });
                    }}
                    className="px-3 py-1.5 bg-brand hover:bg-blue-600 text-white text-xs font-bold rounded-lg transition-colors"
                  >
                    Tentar novamente
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* CONTEÚDO — mostra SEMPRE, mesmo com systemInfo null (usa defaults) */}
          {!systemLoading && (
            <>
              <section className="rounded-xl border border-border p-6 bg-bg-secondary">
                <SectionTitle>Informação do Sistema</SectionTitle>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
                  <div className="flex items-start gap-3 p-3 bg-bg-primary rounded-lg border border-border">
                    <Terminal size={16} className="text-brand shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-text-muted">Sistema Operativo</p>
                      <p className="text-text-primary font-bold">{systemInfo?.os_name ?? 'N/A'} {systemInfo?.os_version ?? ''}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-bg-primary rounded-lg border border-border">
                    <Cpu size={16} className="text-brand shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-text-muted">Processador</p>
                      <p className="text-text-primary font-bold">{systemInfo?.cpu_model ?? 'N/A'}</p>
                      <p className="text-text-secondary">{systemInfo?.cpu_cores ?? '—'} cores / {systemInfo?.cpu_threads ?? '—'} threads</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-bg-primary rounded-lg border border-border">
                    <MemoryStick size={16} className="text-green-500 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-text-muted">Memória RAM</p>
                      <p className="text-text-primary font-bold">{systemInfo?.memory_total_gb?.toFixed(1) ?? '—'} GB total</p>
                      <p className="text-text-secondary">{systemInfo?.memory_used_gb?.toFixed(1) ?? '—'} GB em uso</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-bg-primary rounded-lg border border-border">
                    <HardDrive size={16} className="text-yellow-500 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-text-muted">Disco Principal</p>
                      <p className="text-text-primary font-bold">{systemInfo?.disk_type ?? 'N/A'}</p>
                      <p className="text-text-secondary">{systemInfo?.disk_total_gb?.toFixed(0) ?? '—'} GB total / {systemInfo?.disk_free_gb?.toFixed(0) ?? '—'} GB livre</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-bg-primary rounded-lg border border-border">
                    <Monitor size={16} className="text-purple-500 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-text-muted">GPU</p>
                      <p className="text-text-primary font-bold">{installedInfo?.gpu?.vendor?.toUpperCase() ?? 'CPU'} — {installedInfo?.gpu?.encoder ?? 'libx264'}</p>
                      <p className="text-text-secondary">{installedInfo?.gpu?.available ? 'Aceleração disponível' : 'Processamento por software'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-bg-primary rounded-lg border border-border">
                    <Network size={16} className="text-teal-500 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-text-muted">Rede</p>
                      {systemInfo?.network_interfaces && systemInfo.network_interfaces.length > 0 ? (
                        systemInfo.network_interfaces.map((ni, i) => (
                          <p key={i} className="text-text-primary font-bold">{ni.name} <span className="text-text-secondary font-normal">({ni.status})</span></p>
                        ))
                      ) : (
                        <p className="text-text-secondary">Nenhuma informação disponível</p>
                      )}
                      {systemInfo?.wifi_ssid && <p className="text-text-secondary"><Wifi size={10} className="inline mr-1" />SSID: {systemInfo.wifi_ssid}</p>}
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-border p-6 bg-bg-secondary">
                <SectionTitle>Binários & Base de Dados</SectionTitle>
                <div className="space-y-3 font-mono text-xs">
                  <div className="flex justify-between border-b border-border pb-2">
                    <span className="text-text-muted flex items-center gap-2"><Code2 size={12} /> FFmpeg</span>
                    <span className="text-text-secondary">{ffmpegInfo?.version ?? installedInfo?.ffmpeg_version ?? 'Não encontrado'}</span>
                  </div>
                  <div className="flex justify-between border-b border-border pb-2">
                    <span className="text-text-muted flex items-center gap-2"><Code2 size={12} /> libvmaf</span>
                    <span className={ffmpegInfo?.has_libvmaf ? 'text-green-500' : 'text-red-500'}>
                      {ffmpegInfo?.has_libvmaf ? 'Disponível' : 'Indisponível'}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-border pb-2">
                    <span className="text-text-muted flex items-center gap-2"><Terminal size={12} /> Node.js</span>
                    <span className="text-text-secondary">{installedInfo?.node_version ?? 'N/A'}</span>
                  </div>
                  <div className="flex justify-between pb-2">
                    <span className="text-text-muted flex items-center gap-2"><Database size={12} /> Base de Dados</span>
                    <span className="text-text-secondary truncate max-w-[300px]">{installedInfo?.db_path ?? 'N/A'}</span>
                  </div>
                  {dbInfo && (
                    <div className="grid grid-cols-4 gap-2 pt-2">
                      <div className="text-center p-2 bg-bg-primary rounded border border-border">
                        <p className="text-text-primary font-bold">{dbInfo.db_size_mb.toFixed(1)} MB</p>
                        <p className="text-text-muted">Tamanho</p>
                      </div>
                      <div className="text-center p-2 bg-bg-primary rounded border border-border">
                        <p className="text-text-primary font-bold">{dbInfo.assets_count}</p>
                        <p className="text-text-muted">Assets</p>
                      </div>
                      <div className="text-center p-2 bg-bg-primary rounded border border-border">
                        <p className="text-text-primary font-bold">{dbInfo.jobs_count}</p>
                        <p className="text-text-muted">Jobs</p>
                      </div>
                      <div className="text-center p-2 bg-bg-primary rounded border border-border">
                        <p className="text-text-primary font-bold">{dbInfo.logs_count}</p>
                        <p className="text-text-muted">Logs</p>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            </>
          )}
        </div>
      )}

      {/* TAB: AVANÇADO */}
      {activeTab === 'advanced' && (
        <div className="space-y-6">
          <section className="rounded-xl border border-border p-6 bg-bg-secondary">
            <SectionTitle>Dados</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={handleExport}
                className="flex items-center justify-center gap-2 p-3 bg-surface hover:bg-surface-hover text-text-primary rounded-lg transition-colors text-sm font-medium"
              >
                <Download size={14} /> {t('settings.advanced.export')}
              </button>
              <button onClick={handleImport}
                className="flex items-center justify-center gap-2 p-3 bg-surface hover:bg-surface-hover text-text-primary rounded-lg transition-colors text-sm font-medium"
              >
                <Upload size={14} /> {t('settings.advanced.import')}
              </button>
            </div>
          </section>

          <section className="rounded-xl border border-border p-6 bg-bg-secondary">
            <SectionTitle>Manutenção</SectionTitle>
            <div className="space-y-3">
              <button onClick={handleResetSettings}
                className="flex items-center gap-3 w-full p-3 bg-surface hover:bg-surface-hover text-text-primary rounded-lg transition-colors text-left text-sm font-medium"
              >
                <RotateCcw size={14} /> {t('settings.advanced.resetSettings')}
              </button>
              <button onClick={handleFactoryReset}
                className="flex items-center gap-3 w-full p-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors text-left text-sm font-medium"
              >
                <Trash2 size={14} /> Reset Total (Factory Reset)
              </button>
            </div>
          </section>
        </div>
      )}

      {/* TAB: SOBRE */}
      {activeTab === 'about' && (
        <div className="space-y-6">
          <section className="rounded-xl border border-border p-6 bg-bg-secondary">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-brand flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-blue-900/40">
                N
              </div>
              <div>
                <h3 className="text-xl font-bold text-text-primary">Nexora Media Processing</h3>
                <p className="text-text-secondary text-sm">Desktop Edition — Native Multiplatform</p>
                <div className="inline-block mt-1 px-2 py-0.5 bg-surface text-xs font-mono rounded text-text-secondary">
                  v{installedInfo?.app_version ?? APP_VERSION}
                  {installedError && <span className="ml-2 text-red-400" title={installedError}>(offline)</span>}
                </div>
              </div>
            </div>

            <div className="border border-border rounded-lg overflow-hidden bg-bg-primary">
              <div className="p-4 border-b border-border">
                <span className="font-medium text-text-secondary text-sm">{t('settings.about.releaseNotes')}</span>
              </div>
              <div className="p-4 max-h-[200px] overflow-y-auto">
                <pre className="text-xs text-text-secondary font-mono whitespace-pre-wrap">{changelog}</pre>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 mt-6">
              <button onClick={handleCheckUpdates} disabled={checkingUpdate}
                className="px-4 py-2 bg-brand hover:bg-blue-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <RefreshCw size={14} className={checkingUpdate ? 'animate-spin' : ''} /> {t('settings.about.checkUpdates')}
              </button>
              <button onClick={handleOpenDataDir}
                className="px-4 py-2 bg-surface hover:bg-surface-hover text-text-primary text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <ExternalLink size={14} /> Abrir Dados
              </button>
            </div>
          </section>

          <section className="rounded-xl border border-border p-6 bg-bg-secondary">
            <SectionTitle>{t('settings.about.versionHistory')}</SectionTitle>
            <div className="space-y-3 text-xs text-text-secondary">
              {VERSION_HISTORY.map((entry, idx) => (
                <div key={entry.version} className="flex gap-3">
                  <span className={idx === 0 ? 'text-brand font-bold shrink-0' : 'text-text-muted font-bold shrink-0'}>
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
