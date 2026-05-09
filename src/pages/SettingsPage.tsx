import React, { useEffect, useState } from 'react';
import { useSettingsStore } from '@/store/settings';
import { useGPU } from '@/hooks/useGPU';
import { useTauriCommand } from '@/hooks/useTauriCommand';
import { Settings, Folder, Cpu, Bell, Monitor, Save, RefreshCw } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { cn } from '@/lib/utils';

export const SettingsPage: React.FC = () => {
  const settings = useSettingsStore();
  const { gpu, loading: gpuLoading } = useGPU();
  const { execute: updateSettings } = useTauriCommand('update_settings');
  const [isSaving, setIsSaving] = useState(false);

  // Defensive check for settings
  if (!settings) return <div className="p-8 text-center text-red-500">Erro: Settings Store não carregada.</div>;

  const handleSelectDir = async () => {
    try {
      if (typeof open !== 'function') {
        alert('Plugin de Diálogo não disponível neste ambiente.');
        return;
      }
      const selected = await open({
        directory: true,
        multiple: false,
      });
      if (selected && typeof selected === 'string') {
        settings.setOutputDir(selected);
      }
    } catch (err) {
      console.error('Failed to select directory:', err);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSettings({
        settings: {
          output_dir: settings.outputDir,
          max_concurrent_jobs: settings.maxConcurrentJobs.toString(),
          gpu_acceleration: settings.gpuAcceleration ? 'true' : 'false',
        }
      });
      console.log('Settings saved to backend');
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <header>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Settings className="text-nexora-blue w-6 h-6" />
          Definições
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Personalize o comportamento do Nexora Desktop.
        </p>
      </header>

      <div className="space-y-6">
        {/* Armazenamento */}
        <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Folder className="w-5 h-5 text-nexora-blue" />
            Armazenamento
          </h2>
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Directório de Destino
              </label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={settings.outputDir || ''}
                  readOnly
                  placeholder="Seleccione uma pasta para os ficheiros processados..."
                  className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-400 outline-none"
                />
                <button 
                  onClick={handleSelectDir}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Procurar...
                </button>
              </div>
              <p className="text-[11px] text-gray-400">
                Os ficheiros processados serão guardados nesta localização.
              </p>
            </div>
          </div>
        </section>

        {/* Processamento */}
        <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-nexora-blue" />
            Processamento e Performance
          </h2>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">Aceleração por Hardware (GPU)</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">Utilizar o encoder da placa gráfica para maior velocidade.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={settings.gpuAcceleration}
                  onChange={(e) => settings.setGpuAcceleration(e.target.checked)}
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-nexora-blue"></div>
              </label>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Hardware Detectado</span>
                {gpuLoading && <RefreshCw className="w-3 h-3 text-gray-400 animate-spin" />}
              </div>
              {gpu ? (
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white dark:bg-gray-800 rounded border border-gray-100 dark:border-gray-700">
                    <Cpu className="w-4 h-4 text-nexora-green" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white capitalize">{gpu.vendor} Graphics</div>
                    <div className="text-[10px] text-gray-500 uppercase font-bold">Encoder: {gpu.encoder}</div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500 italic">
                  {gpuLoading ? 'Detectando hardware...' : 'Aceleração por hardware não detectada.'}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Jobs Simultâneos</label>
              <input 
                type="range" 
                min="1" 
                max="4" 
                step="1"
                value={settings.maxConcurrentJobs}
                onChange={(e) => settings.setMaxConcurrentJobs(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-nexora-blue"
              />
              <div className="flex justify-between text-[10px] font-bold text-gray-400">
                <span>1 JOB</span>
                <span>{settings.maxConcurrentJobs} JOBS EM SIMULTÂNEO</span>
                <span>4 JOBS</span>
              </div>
            </div>
          </div>
        </section>

        {/* Notificações e Tema */}
        <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Monitor className="w-5 h-5 text-nexora-blue" />
            Interface e Sistema
          </h2>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">Notificações Nativas</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">Receber alertas quando os trabalhos terminarem.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={settings.notificationsEnabled}
                  onChange={(e) => settings.setNotificationsEnabled(e.target.checked)}
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-nexora-blue"></div>
              </label>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Tema Visual</label>
              <div className="grid grid-cols-3 gap-2">
                {(['light', 'dark', 'system'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => settings.setTheme(t)}
                    className={cn(
                      "px-4 py-2 text-xs font-medium rounded-lg border transition-all capitalize",
                      settings.theme === t 
                        ? "bg-nexora-blue text-white border-nexora-blue" 
                        : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                    )}
                  >
                    {t === 'system' ? 'Sistema' : t === 'light' ? 'Claro' : 'Escuro'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="flex justify-end pt-4">
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 bg-nexora-blue text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-600 transition-all disabled:opacity-50 shadow-lg shadow-nexora-blue/20"
          >
            {isSaving ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            Guardar Configurações
          </button>
        </div>
      </div>
    </div>
  );
};
