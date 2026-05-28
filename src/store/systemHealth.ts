// src/store/systemHealth.ts
import { create } from 'zustand';

interface SystemHealth {
  engineOk: boolean;
  ffmpegOk: boolean;
  ffprobeOk: boolean;
  allOk: boolean;
  checked: boolean;
}

interface SystemHealthStore {
  health: SystemHealth;
  setHealth: (h: Omit<SystemHealth, 'checked'>) => void;
}

export const useSystemHealth = create<SystemHealthStore>((set) => ({
  health: {
    engineOk: true,
    ffmpegOk: true,
    ffprobeOk: true,
    allOk: true,
    checked: false,
  },
  setHealth: (h) => set({ health: { ...h, checked: true } }),
}));
