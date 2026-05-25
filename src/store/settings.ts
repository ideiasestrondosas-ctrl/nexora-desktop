import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import { LazyStore } from '@tauri-apps/plugin-store';

interface SettingsState {
  outputDir: string;
  maxConcurrentJobs: number;
  gpuAcceleration: boolean;
  notificationsEnabled: boolean;
  theme: 'light' | 'dark' | 'system';
  language: string;
  telemetryEnabled: boolean;
  // Importação
  defaultProfile: string;
  autoAnalyze: boolean;
  showProfileModal: boolean;
  logVerbosity: 'basic' | 'normal' | 'debug';
  logRetentionDays: number;
  logMaxSizeMb: number;
  logUploadEndpoint: string;
  setLogVerbosity: (v: 'basic' | 'normal' | 'debug') => void;
  setLogRetentionDays: (days: number) => void;
  setLogMaxSizeMb: (mb: number) => void;
  setLogUploadEndpoint: (url: string) => void;
  setOutputDir: (dir: string) => void;
  setMaxConcurrentJobs: (count: number) => void;
  setGpuAcceleration: (enabled: boolean) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setLanguage: (lang: string) => void;
  setTelemetryEnabled: (enabled: boolean) => void;
  setDefaultProfile: (profile: string) => void;
  setAutoAnalyze: (enabled: boolean) => void;
  setShowProfileModal: (show: boolean) => void;
}

// LazyStore abre o ficheiro apenas quando a primeira operação ocorre — sem bloquear o startup
const store = new LazyStore('settings.json');

const tauriStorage: StateStorage = {
  getItem: async (name) => {
    const value = await store.get<string>(name);
    return value ?? null;
  },
  setItem: async (name, value) => {
    await store.set(name, value);
  },
  removeItem: async (name) => {
    await store.delete(name);
  },
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      outputDir: '',
      maxConcurrentJobs: 2,
      gpuAcceleration: true,
      notificationsEnabled: true,
      theme: 'system',
      language: 'pt',
      telemetryEnabled: false,
      // Importação
      defaultProfile: 'web-hd',
      autoAnalyze: true,
      showProfileModal: true,
      setOutputDir: (dir) => set({ outputDir: dir }),
      setMaxConcurrentJobs: (count) => set({ maxConcurrentJobs: count }),
      setGpuAcceleration: (enabled) => set({ gpuAcceleration: enabled }),
      setNotificationsEnabled: (enabled) => set({ notificationsEnabled: enabled }),
      setTheme: (theme) => set({ theme }),
      setLanguage: (lang) => set({ language: lang }),
      setTelemetryEnabled: (enabled) => set({ telemetryEnabled: enabled }),
      setDefaultProfile: (profile) => set({ defaultProfile: profile }),
      setAutoAnalyze: (enabled) => set({ autoAnalyze: enabled }),
      setShowProfileModal: (show) => set({ showProfileModal: show }),
      logVerbosity: 'normal',
      logRetentionDays: 30,
      logMaxSizeMb: 200,
      logUploadEndpoint: '',
      setLogVerbosity: (v) => set({ logVerbosity: v }),
      setLogRetentionDays: (days) => set({ logRetentionDays: days }),
      setLogMaxSizeMb: (mb) => set({ logMaxSizeMb: mb }),
      setLogUploadEndpoint: (url) => set({ logUploadEndpoint: url }),
    }),
    {
      name: 'nexora-settings',
      version: 3,
      storage: createJSONStorage(() => tauriStorage),
    },
  ),
);
