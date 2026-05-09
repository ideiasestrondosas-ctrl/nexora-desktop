import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  outputDir: string;
  maxConcurrentJobs: number;
  gpuAcceleration: boolean;
  notificationsEnabled: boolean;
  theme: 'light' | 'dark' | 'system';
  setOutputDir: (dir: string) => void;
  setMaxConcurrentJobs: (count: number) => void;
  setGpuAcceleration: (enabled: boolean) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      outputDir: '',
      maxConcurrentJobs: 2,
      gpuAcceleration: true,
      notificationsEnabled: true,
      theme: 'system',
      setOutputDir: (dir) => set({ outputDir: dir }),
      setMaxConcurrentJobs: (count) => set({ maxConcurrentJobs: count }),
      setGpuAcceleration: (enabled) => set({ gpuAcceleration: enabled }),
      setNotificationsEnabled: (enabled) => set({ notificationsEnabled: enabled }),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'nexora-settings',
      version: 1,
    }
  )
);
