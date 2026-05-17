export interface TranscodeProfile {
  name: string;
  labelFriendly?: string;
  description: string;
  videoCodec?: 'libx264' | 'libx265' | 'libvpx-vp9';
  videoBitrateK: number;
  maxrateK: number;
  bufsizeK: number;
  resolution: string;
  fps: number;
  gopSize: number;
  pixFmt: string;
  h264Profile: string;
  h264Level: string;
  bFrames: number;
  cpuPreset: string;
  nvencPreset: string;
  audioCodec: string;
  audioBitrateK: number;
  audioSampleRate: number;
  targetLufs: number;
  truePeakLimitDbtp: number;
  vmafThreshold: number;
  // HEVC
  hevcPreset?: string;
  hevcCrf?: number;
  // VP9
  vp9Crf?: number;
  vp9Speed?: number;
  // Container override (para VP9 → webm)
  container?: string;
}

import broadcastHd from './broadcast-hd.json';
import broadcastSd from './broadcast-sd.json';
import web4k from './web-4k.json';
import webHd from './web-hd.json';
import proxy from './proxy.json';
import social from './social.json';
import archiveHevc from './archive-hevc.json';
import webVp9 from './web-vp9.json';

const PROFILES: Record<string, TranscodeProfile> = {
  'broadcast-hd': broadcastHd as TranscodeProfile,
  'broadcast-sd': broadcastSd as TranscodeProfile,
  'web-4k': web4k as TranscodeProfile,
  'web-hd': webHd as TranscodeProfile,
  proxy: proxy as TranscodeProfile,
  social: social as TranscodeProfile,
  'archive-hevc': archiveHevc as TranscodeProfile,
  'web-vp9': webVp9 as TranscodeProfile,
};

export function loadProfile(name: string): TranscodeProfile {
  const p = PROFILES[name];
  if (!p) {
    console.warn(`Perfil '${name}' não encontrado — a usar broadcast-hd`);
    return PROFILES['broadcast-hd']!;
  }
  return p;
}

export function listProfileNames(): string[] {
  return Object.keys(PROFILES);
}
