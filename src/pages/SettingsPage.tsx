import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open, confirm } from '@tauri-apps/plugin-dialog';
import { toast } from 'react-hot-toast';
import { useSettingsStore } from '@/store/settings';
import { useGPU } from '@/hooks/useGPU';
import { check } from '@tauri-apps/plugin-updater';
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

  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [localSettings, setLocalSettings] = useState<Partial<Settings>>({
    language: 'pt',
    default_profile: 'broadcast-hd',
    vmaf_threshold: 85,
    target_lufs: -23,
  });

  const [installedInfo, setInstalledInfo] = useState<InstalledInfo | null>(null);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [systemError, setSystemError] = useState<string | null>(null);
  const [systemLoading, setSystemLoading] = useState(true);
  const [dbInfo, setDbInfo] = useState<DbInfo | null>(null);
  const [ffmpegInfo, setFfmpegInfo] = useState<FfmpegInfo | null>(null);
  const [changelog, setChangelog] = useState<string>('');
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [isDev, setIsDev] = useState(false);

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

    invoke<InstalledInfo>('get_installed_info').then(setInstalledInfo).catch(console.error);
    invoke<string>('get_changelog').then(setChangelog).catch(() => setChangelog('Sem registos de alterações disponíveis.'));

    // Novos comandos — com error handling visível e timeout de 5s
    setSystemLoading(true);
    setSystemError(null);
    const systemTimeout = setTimeout(() => {
      setSystemLoading(false);
      setSystemError('Timeout ao carregar informação do sistema (>5s)');
    }, 5000);
    invoke<SystemInfo>('get_system_info')
      .then(setSystemInfo)
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Erro desconhecido ao carregar informação do sistema';
        console.error('get_system_info failed:', msg);
        setSystemError(msg);
      })
      .finally(() => {
        clearTimeout(systemTimeout);
        setSystemLoading(false);
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
      toast.success('Definições importadas');
      window.location.reload();
    } catch {
      toast.error('Erro ao importar');
    }
  };

  const handleResetSettings = async () => {
    const ok = await confirm('Repor todas as definições para os valores por omissão?', { title: 'Reiniciar Definições', kind: 'warning' });
    if (!ok) return;
    await invoke('reset_database').catch(() => {});
    toast.success('Definições repostas');
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
    <h3 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-4">{children}</h3>
  );

  return (
    <div className="max-w-[900px] mx-auto pb-12 animate-in fade-in duration-300">
      {/* TABS HEADER */}
      <div className="flex gap-1 mb-6 bg-[#0f121a] border border-[#1e2433] rounded-xl p-1">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === t.id ? 'bg-[#1A6FD4] text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'
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
          <section className="rounded-xl border border-[#1e2433] p-6 bg-[#141824]">
            <SectionTitle>Processamento</SectionTitle>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Pasta de saída</label>
                <div className="flex gap-2">
                  <input type="text" readOnly value={settingsStore.outputDir}
                    className="flex-1 bg-[#0a0d14] border border-[#1e2433] rounded-lg px-4 text-gray-300 outline-none text-sm py-2"
                  />
                  <button onClick={handleSelectDir}
                    className="px-4 py-2 bg-[#1e2433] hover:bg-[#2a3143] text-white rounded-lg flex items-center gap-2 transition-colors text-sm"
                  >
                    <FolderOpen size={14} /> Escolher
                  </button>
                </div>
                {settingsStore.outputDir && <p className="mt-2 text-xs text-gray-500 font-mono">{settingsStore.outputDir}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Jobs simultâneos</label>
                <input type="range" min={1} max={4} step={1}
                  value={settingsStore.maxConcurrentJobs}
                  onChange={e => handleUpdateSetting('max_concurrent_jobs', parseInt(e.target.value))}
                  className="w-full accent-[#1A6FD4]"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>{settingsStore.maxConcurrentJobs} job{settingsStore.maxConcurrentJobs > 1 ? 's' : ''}</span>
                  <span>Mais jobs = mais CPU/RAM</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Perfil padrão</label>
                <select value={localSettings.default_profile}
                  onChange={e => handleUpdateSetting('default_profile', e.target.value)}
                  className="w-full bg-[#0a0d14] border border-[#1e2433] rounded-lg px-4 py-2 text-white outline-none text-sm"
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

          <section className="rounded-xl border border-[#1e2433] p-6 bg-[#141824]">
            <SectionTitle>Qualidade</SectionTitle>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium text-gray-300">VMAF Mínimo</label>
                  <span className="text-sm font-mono text-[#1A6FD4]">{localSettings.vmaf_threshold}</span>
                </div>
                <input type="range" min={0} max={100}
                  value={localSettings.vmaf_threshold}
                  onChange={e => handleUpdateSetting('vmaf_threshold', parseInt(e.target.value))}
                  className="w-full accent-[#1A6FD4]"
                />
                <p className="text-xs text-gray-500 mt-1">Jobs abaixo deste valor são marcados com aviso.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">LUFS Alvo</label>
                  <select value={localSettings.target_lufs}
                    onChange={e => handleUpdateSetting('target_lufs', parseInt(e.target.value))}
                    className="w-full bg-[#0a0d14] border border-[#1e2433] rounded-lg px-4 py-2 text-white outline-none text-sm"
                  >
                    <option value={-23}>-23 LUFS (Broadcast)</option>
                    <option value={-16}>-16 LUFS (Streaming)</option>
                    <option value={-14}>-14 LUFS (Podcast/Social)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">True Peak (dBTP)</label>
                  <input type="number" step={0.1} defaultValue={-1}
                    className="w-full bg-[#0a0d14] border border-[#1e2433] rounded-lg px-4 py-2 text-white outline-none text-sm"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-[#1e2433] p-6 bg-[#141824]">
            <SectionTitle>Aceleração de Hardware</SectionTitle>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-medium text-white mb-1">Usar aceleração GPU</div>
                <div className="text-xs text-gray-400">
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
                <div className="w-11 h-6 bg-[#1e2433] rounded-full peer peer-checked:after:translate-x-full after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1A6FD4]"></div>
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-[#1e2433] p-6 bg-[#141824]">
            <SectionTitle>Notificações</SectionTitle>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-white">Notificações do sistema</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer"
                    checked={settingsStore.notificationsEnabled}
                    onChange={e => handleUpdateSetting('notifications_enabled', e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-[#1e2433] rounded-full peer peer-checked:after:translate-x-full after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1A6FD4]"></div>
                </label>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* TAB: INTERFACE */}
      {activeTab === 'interface' && (
        <div className="space-y-6">
          <section className="rounded-xl border border-[#1e2433] p-6 bg-[#141824]">
            <SectionTitle>Tema</SectionTitle>
            <div className="flex gap-3">
              {(['system', 'light', 'dark'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => handleUpdateSetting('theme', t)}
                  className={`flex-1 py-3 rounded-lg text-sm font-bold border transition-all ${
                    settingsStore.theme === t
                      ? 'bg-[#1A6FD4] border-[#1A6FD4] text-white'
                      : 'bg-[#0a0d14] border-[#1e2433] text-gray-400 hover:text-white hover:border-gray-500'
                  }`}
                >
                  {t === 'system' && 'Sistema'}
                  {t === 'light' && 'Claro'}
                  {t === 'dark' && 'Escuro'}
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-gray-500">
              O tema "Sistema" segue a preferência do teu sistema operativo.
            </p>
          </section>

          <section className="rounded-xl border border-[#1e2433] p-6 bg-[#141824]">
            <SectionTitle>Idioma</SectionTitle>
            <select
              value={localSettings.language}
              onChange={e => handleUpdateSetting('language', e.target.value)}
              className="w-full bg-[#0a0d14] border border-[#1e2433] rounded-lg px-4 py-3 text-white outline-none text-sm"
            >
              <option value="pt">Português (Portugal)</option>
              <option value="en">English</option>
            </select>
            <p className="mt-3 text-xs text-gray-500">
              A alteração de idioma será aplicada após reiniciar a aplicação.
            </p>
          </section>
        </div>
      )}

      {/* TAB: SISTEMA */}
      {activeTab === 'system' && (
        <div className="space-y-6">
          {systemLoading && (
            <div className="rounded-xl border border-[#1e2433] p-12 bg-[#141824] text-center">
              <RefreshCw size={32} className="animate-spin mx-auto mb-4 text-[#1A6FD4]" />
              <p className="text-sm text-gray-400">A carregar informação do sistema...</p>
            </div>
          )}

          {!systemLoading && systemError && (
            <div className="rounded-xl border border-red-500/30 p-6 bg-red-500/5">
              <div className="flex items-start gap-3">
                <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-red-500 mb-1">Erro ao carregar informação do sistema</p>
                  <p className="text-xs text-gray-400 font-mono mb-4">{systemError}</p>
                  <button
                    onClick={() => {
                      setSystemLoading(true);
                      setSystemError(null);
                      invoke<SystemInfo>('get_system_info')
                        .then(setSystemInfo)
                        .catch((err: unknown) => {
                          const msg = err instanceof Error ? err.message : 'Erro desconhecido';
                          setSystemError(msg);
                        })
                        .finally(() => setSystemLoading(false));
                    }}
                    className="px-3 py-1.5 bg-[#1A6FD4] hover:bg-blue-600 text-white text-xs font-bold rounded-lg transition-colors"
                  >
                    Tentar novamente
                  </button>
                </div>
              </div>
            </div>
          )}

          {!systemLoading && !systemError && (
            <>
              <section className="rounded-xl border border-[#1e2433] p-6 bg-[#141824]">
                <SectionTitle>Informação do Sistema</SectionTitle>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
                  <div className="flex items-start gap-3 p-3 bg-[#0a0d14] rounded-lg border border-[#1e2433]">
                    <Terminal size={16} className="text-[#1A6FD4] shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-gray-500">Sistema Operativo</p>
                      <p className="text-white font-bold">{systemInfo?.os_name ?? '—'} {systemInfo?.os_version ?? ''}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-[#0a0d14] rounded-lg border border-[#1e2433]">
                    <Cpu size={16} className="text-[#1A6FD4] shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-gray-500">Processador</p>
                      <p className="text-white font-bold">{systemInfo?.cpu_model ?? '—'}</p>
                      <p className="text-gray-400">{systemInfo?.cpu_cores ?? '—'} cores / {systemInfo?.cpu_threads ?? '—'} threads</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-[#0a0d14] rounded-lg border border-[#1e2433]">
                    <MemoryStick size={16} className="text-green-500 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-gray-500">Memória RAM</p>
                      <p className="text-white font-bold">{systemInfo?.memory_total_gb?.toFixed(1) ?? '—'} GB total</p>
                      <p className="text-gray-400">{systemInfo?.memory_used_gb?.toFixed(1) ?? '—'} GB em uso</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-[#0a0d14] rounded-lg border border-[#1e2433]">
                    <HardDrive size={16} className="text-yellow-500 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-gray-500">Disco Principal</p>
                      <p className="text-white font-bold">{systemInfo?.disk_type ?? '—'}</p>
                      <p className="text-gray-400">{systemInfo?.disk_total_gb?.toFixed(0) ?? '—'} GB total / {systemInfo?.disk_free_gb?.toFixed(0) ?? '—'} GB livre</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-[#0a0d14] rounded-lg border border-[#1e2433]">
                    <Monitor size={16} className="text-purple-500 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-gray-500">GPU</p>
                      <p className="text-white font-bold">{installedInfo?.gpu?.vendor?.toUpperCase() ?? 'CPU'} — {installedInfo?.gpu?.encoder ?? 'libx264'}</p>
                      <p className="text-gray-400">{installedInfo?.gpu?.available ? 'Aceleração disponível' : 'Processamento por software'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-[#0a0d14] rounded-lg border border-[#1e2433]">
                    <Network size={16} className="text-teal-500 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-gray-500">Rede</p>
                      {systemInfo?.network_interfaces?.map((ni, i) => (
                        <p key={i} className="text-white font-bold">{ni.name} <span className="text-gray-400 font-normal">({ni.status})</span></p>
                      )) ?? <p className="text-white font-bold">—</p>}
                      {systemInfo?.wifi_ssid && <p className="text-gray-400"><Wifi size={10} className="inline mr-1" />SSID: {systemInfo.wifi_ssid}</p>}
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-[#1e2433] p-6 bg-[#141824]">
                <SectionTitle>Binários & Base de Dados</SectionTitle>
                <div className="space-y-3 font-mono text-xs">
                  <div className="flex justify-between border-b border-[#1e2433] pb-2">
                    <span className="text-gray-500 flex items-center gap-2"><Code2 size={12} /> FFmpeg</span>
                    <span className="text-gray-300">{ffmpegInfo?.version ?? installedInfo?.ffmpeg_version ?? 'Não encontrado'}</span>
                  </div>
                  <div className="flex justify-between border-b border-[#1e2433] pb-2">
                    <span className="text-gray-500 flex items-center gap-2"><Code2 size={12} /> libvmaf</span>
                    <span className={ffmpegInfo?.has_libvmaf ? 'text-green-500' : 'text-red-500'}>
                      {ffmpegInfo?.has_libvmaf ? 'Disponível' : 'Indisponível'}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-[#1e2433] pb-2">
                    <span className="text-gray-500 flex items-center gap-2"><Terminal size={12} /> Node.js</span>
                    <span className="text-gray-300">{installedInfo?.node_version ?? 'N/A'}</span>
                  </div>
                  <div className="flex justify-between pb-2">
                    <span className="text-gray-500 flex items-center gap-2"><Database size={12} /> Base de Dados</span>
                    <span className="text-gray-300 truncate max-w-[300px]">{installedInfo?.db_path ?? 'N/A'}</span>
                  </div>
                  {dbInfo && (
                    <div className="grid grid-cols-4 gap-2 pt-2">
                      <div className="text-center p-2 bg-[#0a0d14] rounded border border-[#1e2433]">
                        <p className="text-white font-bold">{dbInfo.db_size_mb.toFixed(1)} MB</p>
                        <p className="text-gray-500">Tamanho</p>
                      </div>
                      <div className="text-center p-2 bg-[#0a0d14] rounded border border-[#1e2433]">
                        <p className="text-white font-bold">{dbInfo.assets_count}</p>
                        <p className="text-gray-500">Assets</p>
                      </div>
                      <div className="text-center p-2 bg-[#0a0d14] rounded border border-[#1e2433]">
                        <p className="text-white font-bold">{dbInfo.jobs_count}</p>
                        <p className="text-gray-500">Jobs</p>
                      </div>
                      <div className="text-center p-2 bg-[#0a0d14] rounded border border-[#1e2433]">
                        <p className="text-white font-bold">{dbInfo.logs_count}</p>
                        <p className="text-gray-500">Logs</p>
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
          <section className="rounded-xl border border-[#1e2433] p-6 bg-[#141824]">
            <SectionTitle>Dados</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={handleExport}
                className="flex items-center justify-center gap-2 p-3 bg-[#1e2433] hover:bg-[#2a3143] text-white rounded-lg transition-colors text-sm font-medium"
              >
                <Download size={14} /> Exportar
              </button>
              <button onClick={handleImport}
                className="flex items-center justify-center gap-2 p-3 bg-[#1e2433] hover:bg-[#2a3143] text-white rounded-lg transition-colors text-sm font-medium"
              >
                <Upload size={14} /> Importar
              </button>
            </div>
          </section>

          <section className="rounded-xl border border-[#1e2433] p-6 bg-[#141824]">
            <SectionTitle>Manutenção</SectionTitle>
            <div className="space-y-3">
              <button onClick={handleResetSettings}
                className="flex items-center gap-3 w-full p-3 bg-[#1e2433] hover:bg-[#2a3143] text-white rounded-lg transition-colors text-left text-sm font-medium"
              >
                <RotateCcw size={14} /> Repor definições
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
          <section className="rounded-xl border border-[#1e2433] p-6 bg-[#141824]">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-[#1A6FD4] flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-blue-900/40">
                N
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Nexora Media Processing</h3>
                <p className="text-gray-400 text-sm">Desktop Edition — Native Multiplatform</p>
                <div className="inline-block mt-1 px-2 py-0.5 bg-[#1e2433] text-xs font-mono rounded text-gray-300">
                  v{installedInfo?.app_version ?? '...'}
                </div>
              </div>
            </div>

            <div className="border border-[#1e2433] rounded-lg overflow-hidden bg-[#0a0d14]">
              <div className="p-4 border-b border-[#1e2433]">
                <span className="font-medium text-gray-300 text-sm">Notas de Lançamento</span>
              </div>
              <div className="p-4 max-h-[200px] overflow-y-auto">
                <pre className="text-xs text-gray-400 font-mono whitespace-pre-wrap">{changelog}</pre>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 mt-6">
              <button onClick={handleCheckUpdates} disabled={checkingUpdate}
                className="px-4 py-2 bg-[#1A6FD4] hover:bg-blue-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <RefreshCw size={14} className={checkingUpdate ? 'animate-spin' : ''} /> Verificar Actualizações
              </button>
              <button onClick={handleOpenDataDir}
                className="px-4 py-2 bg-[#1e2433] hover:bg-[#2a3143] text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <ExternalLink size={14} /> Abrir Dados
              </button>
            </div>
          </section>

          <section className="rounded-xl border border-[#1e2433] p-6 bg-[#141824]">
            <SectionTitle>Histórico de Versões</SectionTitle>
            <div className="space-y-3 text-xs text-gray-400">
              <div className="flex gap-3">
                <span className="text-[#1A6FD4] font-bold shrink-0">v0.13.0</span>
                <span>Pipeline completo com 8 passos, FFmpeg bundled, GPU auto-detect, top bar com métricas circulares, definições por tabs, aprovação de quarentena, VMAF ativo.</span>
              </div>
              <div className="flex gap-3">
                <span className="text-gray-500 font-bold shrink-0">v0.12.0</span>
                <span>Factory reset, system tray, sidecar Node.js, SQLite schema completo, logs estruturados.</span>
              </div>
              <div className="flex gap-3">
                <span className="text-gray-500 font-bold shrink-0">v0.11.0</span>
                <span>Frontend React 19, Zustand, Tailwind v4, drag-and-drop, tema claro/escuro.</span>
              </div>
              <div className="flex gap-3">
                <span className="text-gray-500 font-bold shrink-0">v0.10.0</span>
                <span>Tauri 2.x setup, IPC commands, auto-updater config, CI/CD GitHub Actions.</span>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
