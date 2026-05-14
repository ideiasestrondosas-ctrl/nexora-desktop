import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  Plus, Lock, Settings2, Trash2, Copy, X, AlertTriangle,
  ChevronDown, Film, Monitor, Volume2, SlidersHorizontal,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TranscodeProfile {
  id: string;
  name: string;
  description: string;
  is_system: boolean;
  container: string;
  video_codec: string;
  resolution: string;
  fps: number | null;
  video_bitrate_k: number;
  audio_codec: string;
  audio_bitrate_k: number;
  audio_sample_rate: number;
  target_lufs: number;
  true_peak_limit_dbtp: number;
  vmaf_threshold: number;
  cpu_preset: string;
  h264_profile: string;
  h264_level: string;
}

const DEFAULT_PROFILE: TranscodeProfile = {
  id: '',
  name: 'Novo Perfil',
  description: 'Descrição do perfil',
  is_system: false,
  container: 'MP4',
  video_codec: 'H.264',
  resolution: 'Original',
  fps: null,
  video_bitrate_k: 0,
  audio_codec: 'AAC',
  audio_bitrate_k: 256,
  audio_sample_rate: 48000,
  target_lufs: -23,
  true_peak_limit_dbtp: -1,
  vmaf_threshold: 85,
  cpu_preset: 'medium',
  h264_profile: 'high',
  h264_level: '4.1'
};

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState<TranscodeProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState<TranscodeProfile | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const fetchProfiles = async () => {
    try {
      const data = await invoke<TranscodeProfile[]>('list_profiles');
      const sorted = data.sort((a, b) => {
        if (a.is_system && !b.is_system) return -1;
        if (!a.is_system && b.is_system) return 1;
        return a.name.localeCompare(b.name);
      });
      setProfiles(sorted);
      if (!selectedProfileId && sorted.length > 0) {
        setSelectedProfileId(sorted[0].id);
      }
    } catch (e) {
      console.error('Failed to fetch profiles', e);
      const fallback = [
        { ...DEFAULT_PROFILE, id: 'broadcast-hd', name: 'broadcast-hd', is_system: true, description: 'Perfil padrão para televisão', resolution: '1920x1080', video_bitrate_k: 50000 },
        { ...DEFAULT_PROFILE, id: 'broadcast-sd', name: 'broadcast-sd', is_system: true, description: 'Televisão definição standard', resolution: '720x576', video_bitrate_k: 15000 },
        { ...DEFAULT_PROFILE, id: 'web-4k', name: 'web-4k', is_system: true, description: 'Streaming 4K UHD', resolution: '3840x2160', video_bitrate_k: 25000 },
        { ...DEFAULT_PROFILE, id: 'web-hd', name: 'web-hd', is_system: true, description: 'Perfil otimizado para web e streaming', resolution: '1920x1080', video_bitrate_k: 8000 },
        { ...DEFAULT_PROFILE, id: 'proxy', name: 'proxy', is_system: true, description: 'Edição offline rápida', resolution: '1280x720', video_bitrate_k: 2000 },
        { ...DEFAULT_PROFILE, id: 'social', name: 'social', is_system: true, description: 'Redes sociais — vertical e quadrado', resolution: '1080x1920', video_bitrate_k: 4000 },
      ];
      setProfiles(fallback);
      if (!selectedProfileId) setSelectedProfileId(fallback[0].id);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const selectedProfile = profiles.find(p => p.id === selectedProfileId) || null;

  const handleCreateNew = () => {
    setEditingProfile({ ...DEFAULT_PROFILE, id: `custom-${Date.now()}` });
    setIsSidebarOpen(true);
  };

  const handleEdit = () => {
    if (!selectedProfile) return;
    setEditingProfile({ ...selectedProfile });
    setIsSidebarOpen(true);
  };

  const handleDuplicate = () => {
    if (!selectedProfile) return;
    setEditingProfile({
      ...selectedProfile,
      id: `custom-${Date.now()}`,
      name: `Cópia de ${selectedProfile.name}`,
      is_system: false
    });
    setIsSidebarOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedProfile || selectedProfile.is_system) return;
    if (confirm('Tens a certeza que desejas apagar este perfil?')) {
      try {
        await invoke('delete_profile', { id: selectedProfile.id });
        setSelectedProfileId(profiles.find(p => p.is_system)?.id || null);
        fetchProfiles();
      } catch (e) {
        console.error('Failed to delete profile', e);
      }
    }
  };

  const handleSave = async () => {
    if (!editingProfile) return;
    try {
      const isExisting = profiles.some(p => p.id === editingProfile.id && !p.id.startsWith('custom-'));
      if (isExisting) {
        await invoke('update_profile', { id: editingProfile.id, profile: editingProfile });
      } else {
        await invoke('create_profile', { profile: editingProfile });
      }
      setIsSidebarOpen(false);
      fetchProfiles();
      setSelectedProfileId(editingProfile.id);
    } catch (e) {
      console.error('Failed to save profile', e);
    }
  };

  const getBadgeColor = (name: string) => {
    if (name.includes('broadcast-hd')) return 'bg-purple-900 text-purple-300';
    if (name.includes('broadcast-sd')) return 'bg-purple-800/50 text-purple-300';
    if (name.includes('web-4k')) return 'bg-blue-900 text-blue-300';
    if (name.includes('web-hd')) return 'bg-blue-600 text-blue-100';
    if (name.includes('proxy')) return 'bg-gray-700 text-gray-300';
    if (name.includes('social')) return 'bg-orange-900 text-orange-300';
    return 'bg-teal-900 text-teal-300';
  };

  return (
    <div className="relative h-full animate-in fade-in duration-300 flex flex-col">
      {/* DROPDOWN + ACÇÕES */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8 shrink-0">
        {/* Dropdown */}
        <div className="relative flex-1 min-w-0">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-full flex items-center justify-between gap-3 bg-[#141824] border border-[#1e2433] hover:border-[#1A6FD4]/50 rounded-xl px-4 py-3 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              {selectedProfile && (
                <span className={cn('w-3 h-3 rounded-full shrink-0', getBadgeColor(selectedProfile.name).split(' ')[0])} />
              )}
              <div className="text-left min-w-0">
                <div className="text-sm font-bold text-white truncate">
                  {selectedProfile?.name ?? 'Seleccionar perfil...'}
                </div>
                <div className="text-[10px] text-gray-500 truncate">
                  {selectedProfile?.description ?? ''}
                </div>
              </div>
            </div>
            <ChevronDown size={16} className={cn('text-gray-500 shrink-0 transition-transform', dropdownOpen && 'rotate-180')} />
          </button>

          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setDropdownOpen(false)} />
              <div className="absolute top-full left-0 right-0 mt-2 bg-[#141824] border border-[#1e2433] rounded-xl shadow-2xl z-40 max-h-72 overflow-y-auto">
                {/* Sistema */}
                <div className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-gray-500">Pré-definidos</div>
                {profiles.filter(p => p.is_system).map(p => (
                  <button
                    key={p.id}
                    onClick={() => { setSelectedProfileId(p.id); setDropdownOpen(false); }}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[#1e2433] transition-colors',
                      selectedProfileId === p.id && 'bg-[#1A6FD4]/10'
                    )}
                  >
                    <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', getBadgeColor(p.name).split(' ')[0])} />
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-white truncate">{p.name}</div>
                      <div className="text-[10px] text-gray-500 truncate">{p.description}</div>
                    </div>
                    <Lock size={10} className="text-gray-600 shrink-0 ml-auto" />
                  </button>
                ))}
                {/* Personalizados */}
                {profiles.some(p => !p.is_system) && (
                  <>
                    <div className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-gray-500 border-t border-[#1e2433]">Personalizados</div>
                    {profiles.filter(p => !p.is_system).map(p => (
                      <button
                        key={p.id}
                        onClick={() => { setSelectedProfileId(p.id); setDropdownOpen(false); }}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[#1e2433] transition-colors',
                          selectedProfileId === p.id && 'bg-[#1A6FD4]/10'
                        )}
                      >
                        <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', getBadgeColor(p.name).split(' ')[0])} />
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-white truncate">{p.name}</div>
                          <div className="text-[10px] text-gray-500 truncate">{p.description}</div>
                        </div>
                        <CheckCircle2 size={10} className="text-teal-500 shrink-0 ml-auto" />
                      </button>
                    ))}
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {/* Acções */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleCreateNew}
            className="flex items-center gap-2 bg-[#1A6FD4] hover:bg-blue-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-colors"
          >
            <Plus size={16} /> Criar
          </button>
          {selectedProfile && !selectedProfile.is_system && (
            <>
              <button
                onClick={handleEdit}
                className="flex items-center gap-2 bg-[#1e2433] hover:bg-[#2a3143] text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-colors"
              >
                <Settings2 size={16} /> Editar
              </button>
              <button
                onClick={handleDuplicate}
                className="flex items-center gap-2 bg-[#1e2433] hover:bg-[#2a3143] text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-colors"
                title="Duplicar"
              >
                <Copy size={16} />
              </button>
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 px-4 py-2.5 rounded-xl font-bold text-sm transition-colors"
                title="Apagar"
              >
                <Trash2 size={16} />
              </button>
            </>
          )}
          {selectedProfile?.is_system && (
            <button
              onClick={handleDuplicate}
              className="flex items-center gap-2 bg-[#1e2433] hover:bg-[#2a3143] text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-colors"
              title="Duplicar preset"
            >
              <Copy size={16} /> Duplicar
            </button>
          )}
        </div>
      </div>

      {/* VISTA DETALHE */}
      {selectedProfile ? (
        <div className="flex-1 overflow-y-auto space-y-6 pb-8">
          {/* Header do perfil */}
          <div className="bg-[#141824] border border-[#1e2433] rounded-2xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className={cn('w-4 h-4 rounded-full', getBadgeColor(selectedProfile.name).split(' ')[0])} />
                <div>
                  <h2 className="text-xl font-bold text-white">{selectedProfile.name}</h2>
                  <p className="text-sm text-gray-400 mt-1">{selectedProfile.description}</p>
                </div>
              </div>
              {selectedProfile.is_system ? (
                <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest bg-gray-800 text-gray-400 px-3 py-1 rounded-full">
                  <Lock size={10} /> Pré-definido
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest bg-teal-900/50 text-teal-400 px-3 py-1 rounded-full">
                  <CheckCircle2 size={10} /> Personalizado
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="px-2.5 py-1 bg-[#0a0d14] border border-[#1e2433] rounded-lg text-xs font-bold text-gray-300">{selectedProfile.container}</span>
              <span className="px-2.5 py-1 bg-[#0a0d14] border border-[#1e2433] rounded-lg text-xs font-bold text-gray-300">{selectedProfile.video_codec}</span>
              <span className="px-2.5 py-1 bg-[#0a0d14] border border-[#1e2433] rounded-lg text-xs font-bold text-gray-300">{selectedProfile.resolution}</span>
            </div>
          </div>

          {/* Grid de propriedades */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#141824] border border-[#1e2433] rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Monitor size={14} className="text-[#1A6FD4]" />
                <h3 className="text-xs font-black uppercase tracking-widest text-gray-500">Vídeo</h3>
              </div>
              <div className="space-y-3">
                <PropertyRow label="Codec" value={selectedProfile.video_codec} />
                <PropertyRow label="Resolução" value={selectedProfile.resolution} />
                <PropertyRow label="FPS" value={selectedProfile.fps?.toString() ?? 'Original'} />
                <PropertyRow label="Bitrate" value={selectedProfile.video_bitrate_k === 0 ? 'Auto' : `${(selectedProfile.video_bitrate_k / 1000).toFixed(1)} Mbps`} />
                <PropertyRow label="Preset CPU" value={selectedProfile.cpu_preset} />
                <PropertyRow label="Perfil H.264" value={`${selectedProfile.h264_profile} @ ${selectedProfile.h264_level}`} />
              </div>
            </div>

            <div className="bg-[#141824] border border-[#1e2433] rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Volume2 size={14} className="text-green-500" />
                <h3 className="text-xs font-black uppercase tracking-widest text-gray-500">Áudio</h3>
              </div>
              <div className="space-y-3">
                <PropertyRow label="Codec" value={selectedProfile.audio_codec} />
                <PropertyRow label="Bitrate" value={`${selectedProfile.audio_bitrate_k} kbps`} />
                <PropertyRow label="Sample Rate" value={`${selectedProfile.audio_sample_rate} Hz`} />
                <PropertyRow label="LUFS Alvo" value={`${selectedProfile.target_lufs} LUFS`} />
                <PropertyRow label="True Peak" value={`${selectedProfile.true_peak_limit_dbtp} dBTP`} />
              </div>
            </div>

            <div className="bg-[#141824] border border-[#1e2433] rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <SlidersHorizontal size={14} className="text-purple-500" />
                <h3 className="text-xs font-black uppercase tracking-widest text-gray-500">Qualidade</h3>
              </div>
              <div className="space-y-3">
                <PropertyRow label="VMAF Mínimo" value={`${selectedProfile.vmaf_threshold}`} />
                <PropertyRow label="Aceleração" value={selectedProfile.is_system ? 'GPU se disponível' : 'Conforme sistema'} />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
          <Film size={48} className="mb-4 opacity-20" />
          <p className="text-sm">Nenhum perfil seleccionado</p>
        </div>
      )}

      {/* SIDEBAR DE EDIÇÃO */}
      {isSidebarOpen && editingProfile && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 animate-in fade-in" onClick={() => setIsSidebarOpen(false)} />
          <div className="fixed right-0 top-0 bottom-0 w-[420px] bg-[#141824] border-l border-[#1e2433] z-50 flex flex-col shadow-2xl animate-in slide-in-from-right">
            <div className="flex items-center justify-between p-6 border-b border-[#1e2433]">
              <h2 className="text-xl font-bold text-white">
                {editingProfile.id.startsWith('custom') && !profiles.some(p => p.id === editingProfile.id) ? 'Novo Perfil' : `Editar ${editingProfile.name}`}
              </h2>
              <button onClick={() => setIsSidebarOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {editingProfile.is_system && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 p-4 rounded-lg flex gap-3 text-sm">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <p>Este é um preset do sistema e não pode ser modificado. Duplica-o se quiseres fazer alterações.</p>
                </div>
              )}

              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider border-b border-[#1e2433] pb-2">Geral</h3>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Nome</label>
                  <input
                    type="text"
                    value={editingProfile.name}
                    onChange={e => setEditingProfile({...editingProfile, name: e.target.value})}
                    disabled={editingProfile.is_system}
                    className="w-full bg-[#0a0d14] border border-[#1e2433] rounded-lg px-3 py-2 text-white outline-none focus:border-[#1A6FD4] disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Descrição</label>
                  <textarea
                    value={editingProfile.description}
                    onChange={e => setEditingProfile({...editingProfile, description: e.target.value})}
                    disabled={editingProfile.is_system}
                    rows={2}
                    className="w-full bg-[#0a0d14] border border-[#1e2433] rounded-lg px-3 py-2 text-white outline-none focus:border-[#1A6FD4] disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Container</label>
                  <select
                    value={editingProfile.container}
                    onChange={e => setEditingProfile({...editingProfile, container: e.target.value})}
                    disabled={editingProfile.is_system}
                    className="w-full bg-[#0a0d14] border border-[#1e2433] rounded-lg px-3 py-2 text-white outline-none focus:border-[#1A6FD4] disabled:opacity-50"
                  >
                    <option value="MOV">MOV</option>
                    <option value="MP4">MP4</option>
                    <option value="MXF">MXF</option>
                    <option value="TS">TS</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider border-b border-[#1e2433] pb-2">Vídeo</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Codec</label>
                    <select
                      value={editingProfile.video_codec}
                      onChange={e => setEditingProfile({...editingProfile, video_codec: e.target.value})}
                      disabled={editingProfile.is_system}
                      className="w-full bg-[#0a0d14] border border-[#1e2433] rounded-lg px-3 py-2 text-white outline-none focus:border-[#1A6FD4] disabled:opacity-50"
                    >
                      <option value="H.264">H.264</option>
                      <option value="H.265 (HEVC)">H.265 (HEVC)</option>
                      <option value="Apple ProRes 422">Apple ProRes 422</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Resolução</label>
                    <select
                      value={editingProfile.resolution}
                      onChange={e => setEditingProfile({...editingProfile, resolution: e.target.value})}
                      disabled={editingProfile.is_system}
                      className="w-full bg-[#0a0d14] border border-[#1e2433] rounded-lg px-3 py-2 text-white outline-none focus:border-[#1A6FD4] disabled:opacity-50"
                    >
                      <option value="Original">Original</option>
                      <option value="3840×2160">3840×2160 (4K)</option>
                      <option value="1920×1080">1920×1080 (HD)</option>
                      <option value="1280×720">1280×720 (HD)</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Bitrate Vídeo (kbps)</label>
                    <input
                      type="number"
                      value={editingProfile.video_bitrate_k}
                      onChange={e => setEditingProfile({...editingProfile, video_bitrate_k: parseInt(e.target.value) || 0})}
                      disabled={editingProfile.is_system}
                      className="w-full bg-[#0a0d14] border border-[#1e2433] rounded-lg px-3 py-2 text-white outline-none focus:border-[#1A6FD4] disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">FPS</label>
                    <select
                      value={editingProfile.fps || ''}
                      onChange={e => setEditingProfile({...editingProfile, fps: e.target.value ? parseFloat(e.target.value) : null})}
                      disabled={editingProfile.is_system}
                      className="w-full bg-[#0a0d14] border border-[#1e2433] rounded-lg px-3 py-2 text-white outline-none focus:border-[#1A6FD4] disabled:opacity-50"
                    >
                      <option value="">Original</option>
                      <option value="25">25</option>
                      <option value="29.97">29.97</option>
                      <option value="50">50</option>
                      <option value="59.94">59.94</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider border-b border-[#1e2433] pb-2">Áudio e Qualidade</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Codec Áudio</label>
                    <select
                      value={editingProfile.audio_codec}
                      onChange={e => setEditingProfile({...editingProfile, audio_codec: e.target.value})}
                      disabled={editingProfile.is_system}
                      className="w-full bg-[#0a0d14] border border-[#1e2433] rounded-lg px-3 py-2 text-white outline-none focus:border-[#1A6FD4] disabled:opacity-50"
                    >
                      <option value="AAC">AAC</option>
                      <option value="PCM">PCM (WAV)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Bitrate Áudio (kbps)</label>
                    <input
                      type="number"
                      value={editingProfile.audio_bitrate_k}
                      onChange={e => setEditingProfile({...editingProfile, audio_bitrate_k: parseInt(e.target.value) || 0})}
                      disabled={editingProfile.is_system}
                      className="w-full bg-[#0a0d14] border border-[#1e2433] rounded-lg px-3 py-2 text-white outline-none focus:border-[#1A6FD4] disabled:opacity-50"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">LUFS Alvo</label>
                    <input
                      type="number"
                      value={editingProfile.target_lufs}
                      onChange={e => setEditingProfile({...editingProfile, target_lufs: parseFloat(e.target.value) || 0})}
                      disabled={editingProfile.is_system}
                      className="w-full bg-[#0a0d14] border border-[#1e2433] rounded-lg px-3 py-2 text-white outline-none focus:border-[#1A6FD4] disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">VMAF Mínimo</label>
                    <input
                      type="number"
                      value={editingProfile.vmaf_threshold}
                      onChange={e => setEditingProfile({...editingProfile, vmaf_threshold: parseInt(e.target.value) || 0})}
                      disabled={editingProfile.is_system}
                      className="w-full bg-[#0a0d14] border border-[#1e2433] rounded-lg px-3 py-2 text-white outline-none focus:border-[#1A6FD4] disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-[#1e2433] flex justify-end gap-3 bg-[#0a0d14]">
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={editingProfile.is_system}
                className="px-6 py-2 bg-[#1A6FD4] hover:bg-blue-600 disabled:opacity-50 disabled:hover:bg-[#1A6FD4] text-white text-sm font-medium rounded-lg transition-colors"
              >
                Guardar
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function PropertyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-500 font-medium">{label}</span>
      <span className="text-sm font-bold text-white">{value}</span>
    </div>
  );
}
