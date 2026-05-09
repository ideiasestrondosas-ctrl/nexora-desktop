import { create } from 'zustand';

export interface Asset {
  id: string;
  path: string;
  filename: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  size_bytes: number | null;
  duration_secs: number | null;
  video_codec: string | null;
  audio_codec: string | null;
  width: number | null;
  height: number | null;
  fps: number | null;
  created_at: string;
  updated_at: string;
  metadata: string | null;
}

interface AssetsState {
  assets: Asset[];
  setAssets: (assets: Asset[]) => void;
  addAsset: (asset: Asset) => void;
  updateAsset: (assetId: string, updates: Partial<Asset>) => void;
}

export const useAssetsStore = create<AssetsState>((set) => ({
  assets: [],
  setAssets: (assets) => set({ assets }),
  addAsset: (asset) => set((state) => ({ assets: [asset, ...state.assets] })),
  updateAsset: (assetId, updates) =>
    set((state) => ({
      assets: state.assets.map((a) => (a.id === assetId ? { ...a, ...updates } : a)),
    })),
}));
