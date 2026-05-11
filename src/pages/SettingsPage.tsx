import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { useSettingsStore } from '@/store/settings';
import { useGPU } from '@/hooks/useGPU';
import { LogViewer } from '@/components/LogViewer';
import { 
  FolderOpen, Cpu, Monitor, Palette, Bell, FileText, Download, 
  Trash2, Upload, RotateCcw, Shield, Image, Globe, ChevronDown, ChevronRight
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

interface InstalledInfo {
  ffmpeg_version: string | null;
  nodejs_version: string | null;
  gpu_name: string | null;
  db_path: string;
  app_version: string;
}

export default function SettingsPage() {
  const settingsStore = useSettingsStore();
  const { gpu, loading: gpuLoading } = useGPU();
  
  // Local state for settings not in the current store implementation
  const [localSettings, setLocalSettings] = useState<Partial<Settings>>({
    language: 'pt',
    default_profile: 'broadcast-hd',
    vmaf_threshold: 85,
    target_lufs: -23,
  });

  const [installedInfo, setInstalledInfo] = useState<InstalledInfo | null>(null);
  const [changelog, setChangelog] = useState<string>('');
  const [changelogExpanded, setChangelogExpanded] = useState(false);
  const [systemExpanded, setSystemExpanded] = useState(false);
  const [advancedExpanded, setAdvancedExpanded] = useState(false);

  useEffect(() => {
    invoke<InstalledInfo>('get_installed_info')
      .then(setInstalledInfo)
      .catch(console.error);

    invoke<string>('get_changelog')
      .then(setChangelog)
      .catch(() => setChangelog('Sem registos de alterações disponíveis.'));
  }, []);

  const handleUpdateSetting = async (key: keyof Settings, value: any) => {
    try {
      // Tenta invocar o comando backend
      await invoke('update_settings', { key, value }).catch(console.warn);
      
      // Actualiza o store local (Zustand) se existir o método correspondente
      if (key === 'output_dir') settingsStore.setOutputDir(value);
      if (key === 'max_concurrent_jobs') settingsStore.setMaxConcurrentJobs(value);
      if (key === 'gpu_acceleration') settingsStore.setGpuAcceleration(value);
      if (key === 'notifications_enabled') settingsStore.setNotificationsEnabled(value);
      if (key === 'theme') settingsStore.setTheme(value);
      
      // Actualiza o state local
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

  const Card = ({ title, icon: Icon, children, collapsible, expanded, onToggle, dark }: any) => (
    <section className={`rounded-xl border border-[#1e2433] p-6 mb-6 ${dark ? 'bg-[#0f121a]' : 'bg-[#141824]'}`}>
      <div 
        className={`flex items-center justify-between ${collapsible ? 'cursor-pointer select-none' : ''}`}
        onClick={collapsible ? onToggle : undefined}
      >
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Icon className="w-5 h-5 text-[#1A6FD4]" />
          {title}
        </h2>
        {collapsible && (
          expanded ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />
        )}
      </div>
      {(!collapsible || expanded) && <div className="mt-6 space-y-6">{children}</div>}
    </section>
  );

  return (
    <div className="max-w-[800px] mx-auto pb-12 animate-in fade-in duration-300">
      
      {/* SECÇÃO 1 — Processamento */}
      <Card title="Processamento" icon={Cpu}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Pasta de saída</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                readOnly 
                value={settingsStore.outputDir} 
                className="flex-1 bg-[#0a0d14] border border-[#1e2433] rounded-lg px-4 text-gray-300 outline-none"
              />
              <button 
                onClick={handleSelectDir}
                className="px-4 py-2 bg-[#1e2433] hover:bg-[#2a3143] text-white rounded-lg flex items-center gap-2 transition-colors"
              >
                <FolderOpen className="w-4 h-4" /> Escolher pasta
              </button>
            </div>
            {settingsStore.outputDir && (
              <div className="mt-2 text-xs text-gray-500 font-mono flex items-center gap-2">
                {settingsStore.outputDir}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Jobs simultâneos</label>
            <input 
              type="range" min="1" max="4" step="1"
              value={settingsStore.maxConcurrentJobs}
              onChange={(e) => handleUpdateSetting('max_concurrent_jobs', parseInt(e.target.value))}
              className="w-full accent-[#1A6FD4]"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-2">
              <span>{settingsStore.maxConcurrentJobs} job{settingsStore.maxConcurrentJobs > 1 ? 's em paralelo' : ' de cada vez'}</span>
              <span>Mais jobs = mais CPU e RAM utilizados</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Perfil padrão para novos ficheiros</label>
            <select 
              value={localSettings.default_profile}
              onChange={(e) => handleUpdateSetting('default_profile', e.target.value)}
              className="w-full bg-[#0a0d14] border border-[#1e2433] rounded-lg px-4 py-2 text-white outline-none"
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
      </Card>

      {/* SECÇÃO 2 — Qualidade */}
      <Card title="Qualidade" icon={Shield}>
        <div className="space-y-6">
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm font-medium text-gray-300">VMAF Mínimo</label>
              <span className="text-sm font-mono text-[#1A6FD4]">{localSettings.vmaf_threshold}</span>
            </div>
            <input 
              type="range" min="0" max="100" 
              value={localSettings.vmaf_threshold}
              onChange={(e) => handleUpdateSetting('vmaf_threshold', parseInt(e.target.value))}
              className="w-full accent-[#1A6FD4]"
            />
            <p className="text-xs text-gray-500 mt-1">Jobs abaixo deste valor são marcados com aviso.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">LUFS Alvo</label>
              <select 
                value={localSettings.target_lufs}
                onChange={(e) => handleUpdateSetting('target_lufs', parseInt(e.target.value))}
                className="w-full bg-[#0a0d14] border border-[#1e2433] rounded-lg px-4 py-2 text-white outline-none"
              >
                <option value="-23">-23 LUFS (Broadcast)</option>
                <option value="-16">-16 LUFS (Streaming)</option>
                <option value="-14">-14 LUFS (Podcast/Social)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">True Peak (dBTP)</label>
              <input 
                type="number" step="0.1"
                defaultValue="-1"
                className="w-full bg-[#0a0d14] border border-[#1e2433] rounded-lg px-4 py-2 text-white outline-none"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* SECÇÃO 3 — Aceleração de Hardware */}
      <Card title="Aceleração de Hardware" icon={Monitor}>
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm font-medium text-white mb-1">Usar aceleração GPU quando disponível</div>
            <div className="text-xs text-gray-400">
              {gpuLoading ? 'A verificar hardware...' : 
                gpu?.available ? `GPU detectada: ${gpu.vendor} ${gpu.encoder}` : 
                'Sem GPU compatível — a usar CPU (libx264)'}
            </div>
            <p className="text-xs text-gray-500 mt-2 italic">
              Desliga para forçar processamento CPU (pode ser necessário para compatibilidade).
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer mt-1">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={settingsStore.gpuAcceleration}
              onChange={(e) => handleUpdateSetting('gpu_acceleration', e.target.checked)}
            />
            <div className="w-11 h-6 bg-[#1e2433] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1A6FD4]"></div>
          </label>
        </div>
      </Card>

      {/* SECÇÃO 4 — Notificações */}
      <Card title="Notificações" icon={Bell}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-white">Notificações do sistema</div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={settingsStore.notificationsEnabled}
                onChange={(e) => handleUpdateSetting('notifications_enabled', e.target.checked)}
              />
              <div className="w-11 h-6 bg-[#1e2433] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1A6FD4]"></div>
            </label>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-white">Som de conclusão</div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-[#1e2433] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1A6FD4]"></div>
            </label>
          </div>
        </div>
      </Card>

      {/* SECÇÃO 5 — Interface */}
      <Card title="Interface" icon={Palette}>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Tema</label>
            <div className="flex bg-[#0a0d14] rounded-lg p-1 border border-[#1e2433]">
              {(['system', 'light', 'dark'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => handleUpdateSetting('theme', t)}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md capitalize transition-colors ${
                    settingsStore.theme === t ? 'bg-[#1A6FD4] text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {t === 'system' ? 'Sistema' : t === 'light' ? 'Claro' : 'Escuro'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Idioma</label>
            <select 
              value={localSettings.language}
              onChange={(e) => handleUpdateSetting('language', e.target.value)}
              className="w-full bg-[#0a0d14] border border-[#1e2433] rounded-lg px-4 py-2 text-white outline-none"
            >
              <option value="pt">Português (Portugal)</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>
      </Card>

      {/* SECÇÃO 6 — Sobre */}
      <Card title="Sobre" icon={Image}>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-[#1A6FD4] flex items-center justify-center text-white font-bold text-2xl">
            N
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Nexora Media Processing</h3>
            <p className="text-gray-400">Desktop Edition</p>
            <div className="inline-block mt-1 px-2 py-0.5 bg-[#1e2433] text-xs font-mono rounded text-gray-300">
              v{installedInfo?.app_version || '0.7.0'}
            </div>
          </div>
        </div>

        <div className="border border-[#1e2433] rounded-lg overflow-hidden bg-[#0a0d14]">
          <div 
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-[#141824] transition-colors"
            onClick={() => setChangelogExpanded(!changelogExpanded)}
          >
            <span className="font-medium text-gray-300">Notas de Lançamento (Changelog)</span>
            {changelogExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
          </div>
          {changelogExpanded && (
            <div className="p-4 border-t border-[#1e2433]">
              <pre className="text-xs text-gray-400 font-mono whitespace-pre-wrap">{changelog.slice(0, 500)}{changelog.length > 500 ? '...' : ''}</pre>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button className="px-4 py-2 bg-[#1A6FD4] hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors">
            Verificar Actualizações
          </button>
          <button className="px-4 py-2 bg-[#1e2433] hover:bg-[#2a3143] text-white text-sm font-medium rounded-lg transition-colors">
            Abrir Dados
          </button>
        </div>
      </Card>

      {/* SECÇÃO 7 — Sistema */}
      <Card 
        title="Sistema" 
        icon={Cpu} 
        collapsible 
        expanded={systemExpanded} 
        onToggle={() => setSystemExpanded(!systemExpanded)}
      >
        <div className="space-y-3 font-mono text-xs">
          <div className="flex justify-between border-b border-[#1e2433] pb-2">
            <span className="text-gray-500">FFmpeg</span>
            <span className="text-gray-300">{installedInfo?.ffmpeg_version || 'Não encontrado'}</span>
          </div>
          <div className="flex justify-between border-b border-[#1e2433] pb-2">
            <span className="text-gray-500">Node.js</span>
            <span className="text-gray-300">{installedInfo?.nodejs_version || 'N/A'}</span>
          </div>
          <div className="flex justify-between border-b border-[#1e2433] pb-2">
            <span className="text-gray-500">GPU Detectada</span>
            <span className="text-gray-300">{installedInfo?.gpu_name || gpu?.vendor || 'CPU only'}</span>
          </div>
          <div className="flex justify-between pb-2">
            <span className="text-gray-500">Base de Dados</span>
            <span className="text-gray-300 truncate max-w-[250px]">{installedInfo?.db_path || 'N/A'}</span>
          </div>
        </div>
      </Card>

      {/* SECÇÃO 8 — Avançado */}
      <Card 
        title="Avançado" 
        icon={Globe} 
        collapsible 
        expanded={advancedExpanded} 
        onToggle={() => setAdvancedExpanded(!advancedExpanded)}
        dark
      >
        <div className="grid gap-3">
          <button className="flex items-center gap-3 w-full p-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors text-left text-sm font-medium">
            <Trash2 className="w-4 h-4" /> Limpar base de dados (Atenção)
          </button>
          <div className="grid grid-cols-2 gap-3">
            <button className="flex items-center justify-center gap-2 p-3 bg-[#1e2433] hover:bg-[#2a3143] text-white rounded-lg transition-colors text-sm font-medium">
              <Download className="w-4 h-4" /> Exportar
            </button>
            <button className="flex items-center justify-center gap-2 p-3 bg-[#1e2433] hover:bg-[#2a3143] text-white rounded-lg transition-colors text-sm font-medium">
              <Upload className="w-4 h-4" /> Importar
            </button>
          </div>
          <button className="flex items-center justify-center gap-2 p-3 bg-[#1e2433] hover:bg-[#2a3143] text-gray-400 rounded-lg transition-colors text-sm font-medium">
            <RotateCcw className="w-4 h-4" /> Reiniciar definições
          </button>
        </div>
      </Card>

    </div>
  );
}
