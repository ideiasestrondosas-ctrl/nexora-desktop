import { create } from 'zustand';

export interface CloudProfile {
  id: string;
  name: string;
  provider: 'ftp' | 'sftp' | 'smb' | 's3' | 'gdrive' | 'icloud';
  config: Record<string, unknown>;
  createdAt: string;
}

export interface JobCloudDestination {
  profileId: string;
  profileName: string;
  status: 'pending' | 'uploading' | 'uploaded' | 'failed';
  errorMsg: string | null;
  uploadedAt: string | null;
}

export type CloudProviderType = CloudProfile['provider'];

export interface CloudCredentials {
  username?: string;
  password?: string;
  accessKey?: string;
  secretKey?: string;
  oauthToken?: string;
  oauthRefresh?: string;
}

interface CloudState {
  profiles: CloudProfile[];
  setProfiles: (profiles: CloudProfile[]) => void;
  addProfile: (profile: CloudProfile) => void;
  updateProfile: (id: string, updates: Partial<CloudProfile>) => void;
  removeProfile: (id: string) => void;
}

export const useCloudStore = create<CloudState>((set) => ({
  profiles: [],
  setProfiles: (profiles) => set({ profiles }),
  addProfile: (profile) => set((state) => ({ profiles: [profile, ...state.profiles] })),
  updateProfile: (id, updates) =>
    set((state) => ({
      profiles: state.profiles.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    })),
  removeProfile: (id) => set((state) => ({ profiles: state.profiles.filter((p) => p.id !== id) })),
}));

export const PROVIDER_LABELS: Record<CloudProviderType, string> = {
  ftp: 'FTP/FTPS',
  sftp: 'SFTP',
  smb: 'Pasta de Rede (SMB)',
  s3: 'Amazon S3 / Compatível',
  gdrive: 'Google Drive',
  icloud: 'iCloud Drive',
};

export const PROVIDER_FIELDS: Record<
  CloudProviderType,
  {
    key: string;
    label: string;
    type: 'text' | 'number' | 'password' | 'checkbox';
    defaultValue?: unknown;
  }[]
> = {
  ftp: [
    { key: 'host', label: 'Host', type: 'text' },
    { key: 'port', label: 'Porta', type: 'number', defaultValue: 21 },
    { key: 'base_path', label: 'Pasta base', type: 'text', defaultValue: '/' },
    { key: 'username', label: 'Utilizador', type: 'text' },
    { key: 'password', label: 'Password', type: 'password' },
    { key: 'use_tls', label: 'Usar TLS (FTPS)', type: 'checkbox', defaultValue: false },
  ],
  sftp: [
    { key: 'host', label: 'Host', type: 'text' },
    { key: 'port', label: 'Porta', type: 'number', defaultValue: 22 },
    { key: 'base_path', label: 'Pasta base', type: 'text', defaultValue: '/' },
    { key: 'username', label: 'Utilizador', type: 'text' },
    { key: 'password', label: 'Password', type: 'password' },
  ],
  smb: [{ key: 'base_path', label: 'Caminho UNC (ex: \\\\servidor\\pasta)', type: 'text' }],
  s3: [
    { key: 'bucket', label: 'Bucket', type: 'text' },
    { key: 'region', label: 'Região', type: 'text', defaultValue: 'us-east-1' },
    { key: 'endpoint', label: 'Endpoint (vazio = AWS)', type: 'text', defaultValue: '' },
    { key: 'base_path', label: 'Pasta base', type: 'text', defaultValue: 'nexora/output/' },
    { key: 'access_key', label: 'Access Key', type: 'password' },
    { key: 'secret_key', label: 'Secret Key', type: 'password' },
  ],
  gdrive: [
    { key: 'base_path', label: 'Pasta no Drive', type: 'text', defaultValue: 'Nexora/Output/' },
    { key: 'client_id', label: 'Client ID', type: 'text' },
    { key: 'client_secret', label: 'Client Secret', type: 'password' },
  ],
  icloud: [
    {
      key: 'base_path',
      label: 'Sub-pasta no iCloud Drive',
      type: 'text',
      defaultValue: 'Nexora/',
    },
  ],
};
