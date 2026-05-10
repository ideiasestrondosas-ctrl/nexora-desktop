import React, { useState, useEffect } from 'react';
import { X, BookOpen, Cpu, Zap, Layers, Film, HelpCircle, Info, CheckCircle2, Settings, AlertTriangle } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { cn } from '@/lib/utils';

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

type TabId = 'intro' | 'howto' | 'profiles' | 'metrics' | 'components' | 'about';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'intro',      label: 'Introdução',  icon: <BookOpen className="w-4 h-4" /> },
  { id: 'howto',      label: 'Como usar',   icon: <HelpCircle className="w-4 h-4" /> },
  { id: 'profiles',   label: 'Perfis',      icon: <Film className="w-4 h-4" /> },
  { id: 'metrics',    label: 'Métricas',    icon: <Zap className="w-4 h-4" /> },
  { id: 'components', label: 'Sistema',     icon: <Layers className="w-4 h-4" /> },
  { id: 'about',      label: 'Sobre',       icon: <Info className="w-4 h-4" /> },
];

const PROFILES = [
  { id: 'broadcast-hd', name: 'Broadcast HD', res: '1920×1080', fps: '25/50', codec: 'H.264', desc: 'Conformidade broadcast plena. GOP fechado, B-frames desactivados, YUV 4:2:0.' },
  { id: 'broadcast-sd', name: 'Broadcast SD', res: '720×576',   fps: '25',    codec: 'H.264', desc: 'Standard Definition para emissão terrestre ou arquivo SD.' },
  { id: 'web-hd',       name: 'Web HD',       res: '1280×720',  fps: '30',    codec: 'H.264', desc: 'Streaming web HD. Optimizado para CDN e plataformas OTT.' },
  { id: 'web-4k',       name: 'Web 4K',       res: '3840×2160', fps: '30',    codec: 'H.264', desc: 'Ultra HD para plataformas premium. Requer GPU para velocidade aceitável.' },
  { id: 'social',       name: 'Social Media', res: '1080×1080', fps: '30',    codec: 'H.264', desc: 'Quadrado — optimizado para Instagram, Facebook, TikTok.' },
  { id: 'proxy',        name: 'Proxy',        res: '640×360',   fps: '25',    codec: 'H.264', desc: 'Baixa resolução para edição offline rápida. Não usar para entrega final.' },
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
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Manual Nexora Desktop</h2>
              <p className="text-xs text-gray-500">Guia de referência rápida</p>
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
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">

          {activeTab === 'intro' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">O que é o Nexora Desktop?</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  O <strong>Nexora Desktop</strong> é uma plataforma nativa de processamento e qualificação de vídeo, construída com Tauri 2 (Rust) + React. Permite transcodificar ficheiros de vídeo para formatos de entrega broadcast, web e social media, com análise automática de qualidade (VMAF) e conformidade de áudio (LUFS).
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: <Film className="w-4 h-4 text-nexora-blue" />, title: 'Transcodificação', desc: 'FFmpeg com aceleração GPU (NVENC, AMF, QSV) ou CPU (libx264)' },
                  { icon: <Zap className="w-4 h-4 text-nexora-green" />, title: 'Análise VMAF', desc: 'Score de qualidade perceptual 0-100 em cada job' },
                  { icon: <Settings className="w-4 h-4 text-purple-500" />, title: '6 Perfis', desc: 'Broadcast HD/SD, Web HD/4K, Social, Proxy' },
                  { icon: <Cpu className="w-4 h-4 text-orange-500" />, title: 'GPU Auto', desc: 'Detecção automática de NVIDIA, AMD e Intel' },
                ].map((item) => (
                  <div key={item.title} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2 mb-1.5">{item.icon}<span className="text-sm font-semibold text-gray-900 dark:text-white">{item.title}</span></div>
                    <p className="text-xs text-gray-500">{item.desc}</p>
                  </div>
                ))}
              </div>
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30 rounded-xl">
                <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                  <strong>Arquitectura:</strong> Shell nativa em Rust (Tauri 2) + frontend React + sidecar Node.js para processamento assíncrono. Base de dados SQLite local. Processamento 100% offline — sem servidor externo necessário.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'howto' && (
            <div className="space-y-5">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Fluxo de trabalho</h3>
              <div className="space-y-4">
                <Step n={1} title='Abrir o separador "Processar"'>
                  Clica no ícone de foguetão na barra de navegação para aceder à página de processamento.
                </Step>
                <Step n={2} title="Arrastar o ficheiro de vídeo">
                  Arrasta um ficheiro MP4, MXF, MOV ou qualquer formato suportado pelo FFmpeg para a zona de drop. Podes também clicar para abrir o selector de ficheiros.
                </Step>
                <Step n={3} title="Seleccionar o perfil de codificação">
                  Escolhe o perfil adequado ao destino final (broadcast, web, social). Cada perfil tem parâmetros pré-configurados para conformidade e qualidade óptimas.
                </Step>
                <Step n={4} title="Iniciar o processamento">
                  Clica em <em>Processar</em>. O job é adicionado à fila e processado em background. A app continua responsiva durante o processamento.
                </Step>
                <Step n={5} title='Monitorizar no "Dashboard"'>
                  O Dashboard mostra jobs activos, score VMAF médio e espaço em disco. A barra de progresso actualiza em tempo real.
                </Step>
                <Step n={6} title='Consultar resultados no "Histórico"'>
                  Após conclusão, o asset aparece no Histórico com codec, duração, tamanho e score VMAF. Usa o botão de detalhes para ver todos os metadados.
                </Step>
              </div>
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/30 rounded-xl space-y-1">
                <p className="text-xs font-bold text-yellow-700 dark:text-yellow-400">Dicas</p>
                <ul className="text-xs text-yellow-700 dark:text-yellow-300 space-y-1 list-disc list-inside">
                  <li>Activa a GPU nas Definições para transcodificação 5-10× mais rápida</li>
                  <li>O perfil Proxy é ideal para criar versões de edição — nunca para entrega final</li>
                  <li>Guarda os logs em Definições → Registos para diagnóstico de problemas</li>
                  <li>O directório de saída pode ser definido globalmente ou por perfil nas Definições</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'profiles' && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Perfis de codificação disponíveis</h3>
              <div className="space-y-3">
                {PROFILES.map((p) => (
                  <div key={p.id} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-bold text-gray-900 dark:text-white">{p.name}</span>
                          <span className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase">{p.id}</span>
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed">{p.desc}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-xs font-mono font-bold text-nexora-blue">{p.res}</div>
                        <div className="text-[10px] text-gray-400">{p.fps} fps • {p.codec}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400">Todos os perfis broadcast utilizam: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">-pix_fmt yuv420p -movflags +faststart -bf 0 -sc_threshold 0</code></p>
            </div>
          )}

          {activeTab === 'metrics' && (
            <div className="space-y-5">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Métricas de qualidade</h3>
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2">VMAF — Video Multimethod Assessment Fusion</h4>
                  <p className="text-xs text-gray-500 leading-relaxed mb-3">Métrica perceptual de qualidade de vídeo desenvolvida pela Netflix. Simula a percepção humana comparando o vídeo processado com o original.</p>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { range: '0–69', label: 'Inaceitável', color: 'bg-red-500' },
                      { range: '70–84', label: 'Aceitável', color: 'bg-yellow-500' },
                      { range: '85–92', label: 'Bom', color: 'bg-blue-500' },
                      { range: '93–100', label: 'Broadcast', color: 'bg-green-500' },
                    ].map((s) => (
                      <div key={s.range} className="text-center">
                        <div className={`h-2 rounded-full mb-1.5 ${s.color}`} />
                        <div className="text-[9px] font-bold text-gray-700 dark:text-gray-300">{s.range}</div>
                        <div className="text-[9px] text-gray-400">{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2">LUFS — Loudness Units Full Scale</h4>
                  <p className="text-xs text-gray-500 leading-relaxed">Medida de loudness integrado segundo a norma EBU R128. O target standard para broadcast europeu é <strong>−23 LUFS ±1 LU</strong>. Para streaming (Spotify, YouTube) o target é tipicamente −14 LUFS.</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Métricas em tempo real (barra superior)</h4>
                  <ul className="text-xs text-gray-500 space-y-1.5 list-disc list-inside">
                    <li><strong>CPU %</strong> — utilização global do processador (actualizado a cada 2s)</li>
                    <li><strong>RAM</strong> — memória usada / total em GB</li>
                    <li><strong>Rede ↓↑</strong> — débito de download e upload agregado de todas as interfaces</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'components' && (
            <div className="space-y-5">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Componentes instalados</h3>
              {info ? (
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800 px-4">
                  <InfoRow label="Nexora Desktop" value={`v${info.appVersion}`} ok={true} />
                  <InfoRow
                    label="FFmpeg"
                    value={info.ffmpegVersion ?? 'Não encontrado'}
                    ok={!!info.ffmpegVersion}
                  />
                  <InfoRow
                    label="Node.js"
                    value={info.nodeVersion ?? 'Não encontrado'}
                    ok={!!info.nodeVersion}
                  />
                  <InfoRow
                    label="GPU"
                    value={info.gpu.available ? `${info.gpu.vendor} (${info.gpu.encoder})` : 'CPU — libx264'}
                    ok={info.gpu.available}
                  />
                  <InfoRow label="Base de dados" value={info.dbPath} />
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400 text-sm">A carregar informação do sistema...</div>
              )}
              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Stack tecnológica</h4>
                <ul className="text-xs text-gray-500 space-y-1">
                  <li>• <strong>Shell nativa:</strong> Tauri 2.x (Rust stable)</li>
                  <li>• <strong>Frontend:</strong> React 19 + TypeScript + Tailwind CSS 4 + Zustand</li>
                  <li>• <strong>Sidecar:</strong> Node.js 20 + TypeScript + esbuild</li>
                  <li>• <strong>DB:</strong> SQLite (rusqlite bundled)</li>
                  <li>• <strong>Codec:</strong> FFmpeg com GPU auto-detectada</li>
                </ul>
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
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Nexora Desktop</h3>
                  <p className="text-sm text-gray-500">v{info?.appVersion ?? '...'}</p>
                </div>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800 space-y-2">
                <InfoRow label="Versão" value={`v${info?.appVersion ?? '...'}`} />
                <InfoRow label="Licença" value="Proprietária" />
                <InfoRow label="Plataformas" value="Windows · macOS · Linux" />
                <InfoRow label="Ano" value="2026" />
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                O Nexora Desktop é desenvolvido como plataforma de processamento de media profissional. Os logs do sistema estão disponíveis em <em>Definições → Registos do Sistema</em> para diagnóstico de problemas.
              </p>
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30 rounded-xl">
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Para reportar problemas ou sugestões, consulta os logs do sistema e inclui o output relevante no relatório.
                </p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
