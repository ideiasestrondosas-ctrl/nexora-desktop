export interface TranscodeProfile {
  name: string;
  description: string;
  videoCodec: string;
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
}

import broadcastHd from './broadcast-hd.json';
import broadcastSd from './broadcast-sd.json';
import web4k from './web-4k.json';
import webHd from './web-hd.json';
import proxy from './proxy.json';
import social from './social.json';

const PROFILES: Record<string, TranscodeProfile> = {
  'broadcast-hd': broadcastHd as TranscodeProfile,
  'broadcast-sd': broadcastSd as TranscodeProfile,
  'web-4k': web4k as TranscodeProfile,
  'web-hd': webHd as TranscodeProfile,
  'proxy': proxy as TranscodeProfile,
  'social': social as TranscodeProfile,
};

export function loadProfile(name: string): TranscodeProfile {
  const p = PROFILES[name];
  if (!p) {
    console.warn(`Perfil '${name}' não encontrado — a usar broadcast-hd`);
    return PROFILES['broadcast-hd']!;
  }
  return p;
}
