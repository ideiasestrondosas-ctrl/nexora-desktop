import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Plus, Lock, Settings2, Trash2, Copy, X, AlertTriangle } from 'lucide-react';

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
  const [editingProfile, setEditingProfile] = useState<TranscodeProfile | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const fetchProfiles = async () => {
    try {
      const data = await invoke<TranscodeProfile[]>('list_profiles');
      // Sort: system first, then alphabetical
      const sorted = data.sort((a, b) => {
        if (a.is_system && !b.is_system) return -1;
        if (!a.is_system && b.is_system) return 1;
        return a.name.localeCompare(b.name);
      });
      setProfiles(sorted);
    } catch (e) {
      console.error('Failed to fetch profiles', e);
      // Fallback para design / test se o backend não estiver pronto
      setProfiles([
        { ...DEFAULT_PROFILE, id: 'broadcast-hd', name: 'broadcast-hd', is_system: true, description: 'Perfil padrão para televisão', resolution: '1920x1080', video_bitrate_k: 50000 },
        { ...DEFAULT_PROFILE, id: 'web-hd', name: 'web-hd', is_system: true, description: 'Perfil otimizado para web e streaming', resolution: '1920x1080', video_bitrate_k: 8000 },
        { ...DEFAULT_PROFILE, id: 'proxy', name: 'proxy', is_system: true, description: 'Edição offline rápida', resolution: '1280x720', video_bitrate_k: 2000 },
      ]);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const handleEdit = (profile: TranscodeProfile) => {
    setEditingProfile({ ...profile });
    setIsSidebarOpen(true);
  };

  const handleCreateNew = () => {
    setEditingProfile({ ...DEFAULT_PROFILE, id: `custom-${Date.now()}` });
    setIsSidebarOpen(true);
  };

  const handleDuplicate = (profile: TranscodeProfile) => {
    setEditingProfile({ 
      ...profile, 
      id: `custom-${Date.now()}`, 
      name: `Cópia de ${profile.name}`,
      is_system: false 
    });
    setIsSidebarOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tens a certeza que desejas apagar este perfil?')) {
      try {
        await invoke('delete_profile', { id });
        fetchProfiles();
      } catch (e) {
        console.error('Failed to delete profile', e);
      }
    }
  };

  const handleSave = async () => {
    if (!editingProfile) return;
    try {
      const isExisting = profiles.some(p => p.id === editingProfile.id);
      if (isExisting) {
        await invoke('update_profile', { id: editingProfile.id, profile: editingProfile });
      } else {
        await invoke('create_profile', { profile: editingProfile });
      }
      setIsSidebarOpen(false);
      fetchProfiles();
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
    return 'bg-gray-800 text-gray-300'; // custom
  };

  return (
    <div className="relative h-full animate-in fade-in duration-300 flex flex-col">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-8 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Perfis de Codificação</h1>
          <p className="text-gray-400 text-sm">Gere as tuas configurações de transcodificação de vídeo e áudio.</p>
        </div>
        <button 
          onClick={handleCreateNew}
          className="flex items-center gap-2 bg-[#1A6FD4] hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <Plus className="w-5 h-5" /> Novo Perfil
        </button>
      </div>

      {/* GRID DE PERFIS */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 overflow-y-auto pb-8">
        {profiles.map(profile => (
          <div key={profile.id} className="bg-[#141824] border border-[#1e2433] hover:border-l-4 hover:border-l-[#1A6FD4] rounded-xl p-5 flex flex-col transition-all">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${getBadgeColor(profile.name).split(' ')[0]}`}></span>
                  {profile.name}
                </h3>
                <div className="flex gap-2 mt-2">
                  {profile.is_system ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase bg-gray-800 text-gray-400 px-2 py-0.5 rounded">
                      <Lock className="w-3 h-3" /> Preset
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase bg-orange-900/50 text-orange-400 px-2 py-0.5 rounded">
                      Personalizado
                    </span>
                  )}
                  <span className="text-[10px] font-bold tracking-wider uppercase bg-[#1e2433] text-gray-300 px-2 py-0.5 rounded">{profile.container}</span>
                  <span className="text-[10px] font-bold tracking-wider uppercase bg-[#1e2433] text-gray-300 px-2 py-0.5 rounded">{profile.video_codec}</span>
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-400 mb-6 line-clamp-2 h-10">{profile.description}</p>

            <div className="grid grid-cols-2 gap-y-4 gap-x-2 bg-[#0a0d14] rounded-lg p-4 border border-[#1e2433] mb-6">
              <div>
                <div className="text-[10px] text-gray-500 font-bold uppercase">Resolução</div>
                <div className="text-sm text-gray-300 mt-1">{profile.resolution}</div>
              </div>
              <div>
                <div className="text-[10px] text-gray-500 font-bold uppercase">Vídeo Bitrate</div>
                <div className="text-sm text-gray-300 mt-1">{profile.video_bitrate_k === 0 ? 'Auto' : `${profile.video_bitrate_k / 1000} Mbps`}</div>
              </div>
              <div>
                <div className="text-[10px] text-gray-500 font-bold uppercase">Áudio Bitrate</div>
                <div className="text-sm text-gray-300 mt-1">{profile.audio_bitrate_k} kbps</div>
              </div>
              <div>
                <div className="text-[10px] text-gray-500 font-bold uppercase">Alvo LUFS</div>
                <div className="text-sm text-gray-300 mt-1">{profile.target_lufs}</div>
              </div>
            </div>

            <div className="mt-auto flex justify-end gap-2">
              {!profile.is_system && (
                <button 
                  onClick={() => handleDelete(profile.id)}
                  className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  title="Apagar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button 
                onClick={() => handleDuplicate(profile)}
                className="p-2 text-gray-500 hover:text-white hover:bg-[#1e2433] rounded-lg transition-colors"
                title="Duplicar"
              >
                <Copy className="w-4 h-4" />
              </button>
              <button 
                onClick={() => handleEdit(profile)}
                className="flex items-center gap-2 px-3 py-1.5 bg-[#1e2433] hover:bg-[#2a3143] text-gray-300 hover:text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Settings2 className="w-4 h-4" /> Editar
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* SIDEBAR DE EDIÇÃO */}
      {isSidebarOpen && editingProfile && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 animate-in fade-in" onClick={() => setIsSidebarOpen(false)} />
          <div className="fixed right-0 top-0 bottom-0 w-[420px] bg-[#141824] border-l border-[#1e2433] z-50 flex flex-col shadow-2xl animate-in slide-in-from-right">
            
            <div className="flex items-center justify-between p-6 border-b border-[#1e2433]">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                {editingProfile.id.startsWith('custom') ? 'Novo Perfil' : `Editar ${editingProfile.name}`}
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

              {/* GERAL */}
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

              {/* VÍDEO */}
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

              {/* ÁUDIO & QUALIDADE */}
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
