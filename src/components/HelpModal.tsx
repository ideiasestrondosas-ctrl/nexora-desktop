import React, { useState, useEffect } from 'react';
import { X, BookOpen, Cpu, Zap, Layers, Film, HelpCircle, Info, CheckCircle2, Settings, AlertTriangle } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface InstalledInfo {
  appVersion: string;
  ffmpegVersion: string | null;
  nodeVersion: string | null;
  gpu: { vendor: string; encoder: string; available: boolean };
  dbPath: string;
}

interface HelpModalProps {
  onClose: () => void;
}

type TabId = 'intro' | 'howto' | 'profiles' | 'metrics' | 'components' | 'troubleshoot' | 'about';

const TABS: { id: TabId; labelKey: string; icon: React.ReactNode }[] = [
  { id: 'intro',      labelKey: 'help.tabs.intro',  icon: <BookOpen className="w-4 h-4" /> },
  { id: 'howto',      labelKey: 'help.tabs.usage',   icon: <HelpCircle className="w-4 h-4" /> },
  { id: 'profiles',   labelKey: 'help.tabs.profiles',      icon: <Film className="w-4 h-4" /> },
  { id: 'metrics',    labelKey: 'help.tabs.metrics',    icon: <Zap className="w-4 h-4" /> },
  { id: 'components', labelKey: 'help.tabs.system',     icon: <Layers className="w-4 h-4" /> },
  { id: 'troubleshoot', labelKey: 'help.tabs.support',    icon: <AlertTriangle className="w-4 h-4" /> },
  { id: 'about',      labelKey: 'help.tabs.about',       icon: <Info className="w-4 h-4" /> },
];

const PROFILES = [
  { id: 'broadcast-hd', name: 'Broadcast HD', res: '1920×1080', fps: '25/50', codec: 'H.264', descKey: 'help.profiles.broadcastHd.desc' },
  { id: 'broadcast-sd', name: 'Broadcast SD', res: '720×576',   fps: '25',    codec: 'H.264', descKey: 'help.profiles.broadcastSd.desc' },
  { id: 'web-hd',       name: 'Web HD',       res: '1280×720',  fps: '30',    codec: 'H.264', descKey: 'help.profiles.webHd.desc' },
  { id: 'web-4k',       name: 'Web 4K',       res: '3840×2160', fps: '30',    codec: 'H.264', descKey: 'help.profiles.web4k.desc' },
  { id: 'social',       name: 'Social Media', res: '1080×1080', fps: '30',    codec: 'H.264', descKey: 'help.profiles.social.desc' },
  { id: 'proxy',        name: 'Proxy',        res: '640×360',   fps: '25',    codec: 'H.264', descKey: 'help.profiles.proxy.desc' },
];

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="w-7 h-7 rounded-full bg-nexora-blue text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
        {n}
      </div>
      <div>
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{children}</p>
      </div>
    </div>
  );
}

function InfoRow({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
      <div className="flex items-center gap-2">
        {ok !== undefined && (
          ok
            ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
            : <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />
        )}
        <span className="text-sm font-medium text-gray-900 dark:text-white font-mono">{value}</span>
      </div>
    </div>
  );
}

export const HelpModal: React.FC<HelpModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<TabId>('intro');
  const [info, setInfo] = useState<InstalledInfo | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    invoke<InstalledInfo>('get_installed_info').then(setInfo).catch(() => {});
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-800 animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-nexora-blue/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-nexora-blue/10 rounded-xl">
              <BookOpen className="w-5 h-5 text-nexora-blue" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t('help.title')}</h2>
              <p className="text-xs text-gray-500">{t('help.subtitle')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-4 py-2 border-b border-gray-100 dark:border-gray-800 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all',
                activeTab === tab.id
                  ? 'bg-nexora-blue text-white'
                  : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800',
              )}
            >
              {tab.icon}
              {t(tab.labelKey)}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">

          {activeTab === 'intro' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">{t('help.intro.whatIs')}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {t('help.intro.description')}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: <Film className="w-4 h-4 text-nexora-blue" />, titleKey: 'help.intro.features.transcoding', descKey: 'help.intro.features.transcodingDesc' },
                  { icon: <Zap className="w-4 h-4 text-nexora-green" />, titleKey: 'help.intro.features.vmafAnalysis', descKey: 'help.intro.features.vmafDesc' },
                  { icon: <Settings className="w-4 h-4 text-purple-500" />, titleKey: 'help.intro.features.profiles', descKey: 'help.intro.features.profilesDesc' },
                  { icon: <Cpu className="w-4 h-4 text-orange-500" />, titleKey: 'help.intro.features.gpuAuto', descKey: 'help.intro.features.gpuAutoDesc' },
                ].map((item) => (
                  <div key={item.titleKey} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2 mb-1.5">{item.icon}<span className="text-sm font-semibold text-gray-900 dark:text-white">{t(item.titleKey)}</span></div>
                    <p className="text-xs text-gray-500">{t(item.descKey)}</p>
                  </div>
                ))}
              </div>
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30 rounded-xl">
                <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                  <strong>{t('help.intro.architecture')}</strong>
                </p>
              </div>
            </div>
          )}

          {activeTab === 'howto' && (
            <div className="space-y-5">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">{t('help.usage.workflow')}</h3>
              <div className="space-y-4">
                <Step n={1} title={t('help.usage.step1Title')}>
                  {t('help.usage.step1Desc')}
                </Step>
                <Step n={2} title={t('help.usage.step2Title')}>
                  {t('help.usage.step2Desc')}
                </Step>
                <Step n={3} title={t('help.usage.step3Title')}>
                  {t('help.usage.step3Desc')}
                </Step>
                <Step n={4} title={t('help.usage.step4Title')}>
                  {t('help.usage.step4Desc')}
                </Step>
                <Step n={5} title={t('help.usage.step5Title')}>
                  {t('help.usage.step5Desc')}
                </Step>
                <Step n={6} title={t('help.usage.step6Title')}>
                  {t('help.usage.step6Desc')}
                </Step>
              </div>
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/30 rounded-xl space-y-1">
                <p className="text-xs font-bold text-yellow-700 dark:text-yellow-400">{t('help.usage.tips')}</p>
                <ul className="text-xs text-yellow-700 dark:text-yellow-300 space-y-1 list-disc list-inside">
                  <li>{t('help.usage.tip1')}</li>
                  <li>{t('help.usage.tip2')}</li>
                  <li>{t('help.usage.tip3')}</li>
                  <li>{t('help.usage.tip4')}</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'profiles' && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">{t('help.profiles.title')}</h3>
              <div className="space-y-3">
                {PROFILES.map((p) => (
                  <div key={p.id} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-bold text-gray-900 dark:text-white">{p.name}</span>
                          <span className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase">{p.id}</span>
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed">{t(p.descKey)}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-xs font-mono font-bold text-nexora-blue">{p.res}</div>
                        <div className="text-[10px] text-gray-400">{p.fps} fps • {p.codec}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400">{t('help.profiles.broadcastNote')} <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">-pix_fmt yuv420p -movflags +faststart -bf 0 -sc_threshold 0</code></p>
            </div>
          )}

          {activeTab === 'metrics' && (
            <div className="space-y-5">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">{t('help.metrics.title')}</h3>
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2">{t('help.metrics.vmafTitle')}</h4>
                  <p className="text-xs text-gray-500 leading-relaxed mb-3">{t('help.metrics.vmafDescription')}</p>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { range: '0–69', labelKey: 'help.metrics.vmafUnacceptable', color: 'bg-red-500' },
                      { range: '70–84', labelKey: 'help.metrics.vmafAcceptable', color: 'bg-yellow-500' },
                      { range: '85–92', labelKey: 'help.metrics.vmafGood', color: 'bg-blue-500' },
                      { range: '93–100', labelKey: 'help.metrics.vmafBroadcast', color: 'bg-green-500' },
                    ].map((s) => (
                      <div key={s.range} className="text-center">
                        <div className={`h-2 rounded-full mb-1.5 ${s.color}`} />
                        <div className="text-[9px] font-bold text-gray-700 dark:text-gray-300">{s.range}</div>
                        <div className="text-[9px] text-gray-400">{t(s.labelKey)}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2">{t('help.metrics.lufsTitle')}</h4>
                  <p className="text-xs text-gray-500 leading-relaxed">{t('help.metrics.lufsDescription')}</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2">{t('help.metrics.realtimeTitle')}</h4>
                  <ul className="text-xs text-gray-500 space-y-1.5 list-disc list-inside">
                    <li>{t('help.metrics.cpuDesc')}</li>
                    <li>{t('help.metrics.ramDesc')}</li>
                    <li>{t('help.metrics.networkDesc')}</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'components' && (
            <div className="space-y-5">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">{t('help.system.components')}</h3>
              {info ? (
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800 px-4">
                  <InfoRow label="Nexora Desktop" value={`v${info.appVersion}`} ok={true} />
                  <InfoRow
                    label="FFmpeg"
                    value={info.ffmpegVersion ?? t('settings.system.notFound')}
                    ok={!!info.ffmpegVersion}
                  />
                  <InfoRow
                    label="Node.js"
                    value={info.nodeVersion ?? t('settings.system.notFound')}
                    ok={!!info.nodeVersion}
                  />
                  <InfoRow
                    label="GPU"
                    value={info.gpu.available ? `${info.gpu.vendor} (${info.gpu.encoder})` : 'CPU — libx264'}
                    ok={info.gpu.available}
                  />
                  <InfoRow label={t('help.system.database')} value={info.dbPath} />
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400 text-sm">{t('help.system.loading')}</div>
              )}
              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{t('help.system.techStack')}</h4>
                <ul className="text-xs text-gray-500 space-y-1">
                  <li>• {t('help.system.stackShell')}</li>
                  <li>• {t('help.system.stackFrontend')}</li>
                  <li>• {t('help.system.stackSidecar')}</li>
                  <li>• {t('help.system.stackDb')}</li>
                  <li>• {t('help.system.stackCodec')}</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'troubleshoot' && (
            <div className="space-y-5">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">{t('help.support.troubleshooting')}</h3>
              
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-bold">
                  <AlertTriangle className="w-4 h-4" />
                  <span>{t('help.support.factoryResetTitle')}</span>
                </div>
                <p className="text-xs text-red-700 dark:text-red-300 leading-relaxed">
                  {t('help.support.factoryResetDescription')}
                </p>
                <ul className="text-[10px] text-red-600 dark:text-red-400 space-y-1 list-disc list-inside">
                  <li>{t('help.support.factoryResetAssets')}</li>
                  <li>{t('help.support.factoryResetProfiles')}</li>
                  <li>{t('help.support.factoryResetTemp')}</li>
                  <li>{t('help.support.factoryResetRestart')}</li>
                </ul>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{t('help.support.commonProblems')}</h4>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{t('help.support.problem1Title')}</p>
                    <p className="text-[11px] text-gray-500">{t('help.support.problem1Desc')}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{t('help.support.problem2Title')}</p>
                    <p className="text-[11px] text-gray-500">{t('help.support.problem2Desc')}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'about' && (
            <div className="space-y-5">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-nexora-blue/10 rounded-2xl">
                  <Film className="w-10 h-10 text-nexora-blue" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t('help.about.appName')}</h3>
                  <p className="text-sm text-gray-500">v{info?.appVersion ?? '...'}</p>
                </div>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800 space-y-2">
                <InfoRow label={t('help.about.version')} value={`v${info?.appVersion ?? '...'}`} />
                <InfoRow label={t('help.about.license')} value="Proprietary" />
                <InfoRow label={t('help.about.platforms')} value="Windows · macOS · Linux" />
                <InfoRow label={t('help.about.year')} value="2026" />
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                {t('help.about.footer')}
              </p>
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30 rounded-xl">
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  {t('help.about.reportIssues')}
                </p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
