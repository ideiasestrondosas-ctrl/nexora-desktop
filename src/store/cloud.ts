import { create } from 'zustand';

export interface CloudProfile {
  id: string;
  name: string;
  provider: 'ftp' | 'sftp' | 'smb' | 's3' | 'gdrive' | 'gdrive_personal' | 'dropbox' | 'icloud';
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
  gdrive_personal: 'Google Drive Pessoal',
  dropbox: 'Dropbox',
  icloud: 'iCloud Drive',
};

export const PROVIDER_HELP: Record<CloudProviderType, string | null> = {
  ftp: [
    '1. Introduza o endereço do servidor FTP no campo Host',
    '   (ex: ftp.exemplo.com ou 192.168.1.100)',
    '2. Porta: 21 para FTP standard; 990 para FTPS implícito',
    '3. Pasta base: caminho de destino no servidor (ex: /uploads/nexora)',
    '4. Utilizador e Password: credenciais da sua conta FTP',
    '5. Activar "Usar TLS (FTPS)" para ligação cifrada — recomendado sempre que o servidor suporte',
    '   NOTA: o servidor tem de aceitar ligações FTP activas ou passivas na porta configurada',
  ].join('\n'),
  sftp: [
    '1. Introduza o endereço do servidor no campo Host',
    '   (ex: sftp.exemplo.com ou endereço IP)',
    '2. Porta: 22 é o padrão SSH/SFTP',
    '3. Pasta base: caminho de destino no servidor (ex: /home/user/uploads)',
    '4. Utilizador: nome de utilizador SSH da sua conta no servidor',
    '5. Password: password da conta SSH (ou deixe vazio se usar chave SSH — não suportado ainda)',
    '   Na primeira ligação será pedido para confirmar a identidade do servidor (TOFU)',
    '   Verifique a fingerprint com o administrador antes de confiar',
  ].join('\n'),
  smb: [
    '1. Introduza o caminho UNC completo da pasta de rede no campo Caminho UNC',
    '   Formato: \\\\servidor\\pasta ou \\\\192.168.1.100\\partilha',
    '   Exemplos:',
    '     \\\\nas.local\\media\\nexora',
    '     \\\\192.168.1.50\\uploads',
    '2. A pasta tem de estar acessível pelo utilizador actual do Windows/macOS',
    '3. No Windows: certifique-se de que a partilha está montada ou acessível via explorador',
    '4. No macOS: o caminho UNC é convertido para montagem AFP/SMB automaticamente',
    '   NOTA: autenticação por credenciais SMB não está suportada — use a sessão do SO',
  ].join('\n'),
  s3: [
    '1. Bucket: nome do bucket S3 (ex: minha-empresa-nexora)',
    '2. Região: região AWS onde o bucket foi criado (ex: eu-west-1, us-east-1)',
    '3. Endpoint: deixe vazio para AWS S3 oficial',
    '   Para S3-compatível (Cloudflare R2, MinIO, Backblaze B2, Wasabi):',
    '     Cloudflare R2: https://<account-id>.r2.cloudflarestorage.com',
    '     MinIO:         http://127.0.0.1:9000',
    '     Backblaze B2:  https://s3.us-west-004.backblazeb2.com',
    '4. Pasta base: prefixo de destino dentro do bucket (ex: nexora/output/)',
    '5. Access Key e Secret Key: credenciais IAM com permissão s3:PutObject no bucket',
    '   Para gerar no AWS: IAM → Utilizadores → Chaves de Acesso → Criar chave de acesso',
  ].join('\n'),
  gdrive: [
    '1. Aceda a console.cloud.google.com → APIs e Serviços → Credenciais',
    '2. Criar credencial OAuth 2.0 → tipo "TV e dispositivos de entrada limitada"',
    '3. Ative a Google Drive API no mesmo projeto',
    '4. Copie o Client ID e o Client Secret para os campos acima',
    '5. Clique "Autenticar com Google" e siga as instruções no ecrã',
  ].join('\n'),
  gdrive_personal: [
    '1. Aceda a console.cloud.google.com → APIs e Serviços → Credenciais',
    '2. Criar credencial OAuth 2.0 → tipo "Aplicação de computador" (Desktop app)',
    '   ATENÇÃO: Não escolha "Aplicação Web" — deve ser "Desktop app"',
    '3. Em "URIs de redirecionamento autorizados" → deixe VAZIO',
    '   (Desktop app aceita 127.0.0.1 com qualquer porta automaticamente)',
    '4. Ative a Google Drive API (APIs e Serviços → Biblioteca → "Google Drive API")',
    '5. Copie o Client ID e o Client Secret para os campos acima',
    '   Client ID: 123456789-abc123xyz.apps.googleusercontent.com',
    '   Client Secret: GOCSPX-xxxx (visível na página da credencial)',
    '6. Se aparecer erro de acesso: Tela de consentimento OAuth → Utilizadores de teste',
    '   → adicione o seu email Google',
    '7. Clique "Conectar com Google Drive" — o browser abrirá para autorizar',
  ].join('\n'),
  dropbox: [
    '1. Aceda a dropbox.com/developers/apps e clique "Create app"',
    '2. Escolha "Scoped access" → "Full Dropbox" → dê um nome à app',
    '3. No separador "Settings", em "Redirect URIs", adicione exactamente:',
    '   http://127.0.0.1:8475',
    '   (incluindo a porta — o Dropbox exige correspondência exacta)',
    '4. Copie o "App key" (ex: abc1d2ef3g4h56) para o campo App Key acima',
    '   (Não é o seu email — é o identificador da app)',
    '5. Clique "Conectar com Dropbox" — o browser abrirá para autorizar',
  ].join('\n'),
  icloud: [
    '1. Apenas disponível em macOS — no Windows e Linux este provider não funciona',
    '2. Sub-pasta: nome da pasta dentro do iCloud Drive onde os ficheiros serão guardados',
    '   (ex: Nexora/ cria a pasta "Nexora" directamente no iCloud Drive)',
    '3. Certifique-se de que o iCloud Drive está activado e sincronizado:',
    '   Definições do Sistema → Apple ID → iCloud → iCloud Drive → Activado',
    '4. A pasta de destino é criada automaticamente na primeira transferência',
    '   NOTA: funciona como partilha SMB local ao iCloud — não usa a API oficial do iCloud',
  ].join('\n'),
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
  gdrive_personal: [
    { key: 'base_path', label: 'Pasta no Drive', type: 'text', defaultValue: 'Nexora/Output/' },
    { key: 'client_id', label: 'Client ID', type: 'text' },
    { key: 'client_secret', label: 'Client Secret', type: 'password' },
  ],
  dropbox: [
    {
      key: 'base_path',
      label: 'Pasta no Dropbox',
      type: 'text' as const,
      defaultValue: '/Nexora/Output',
    },
    { key: 'client_id', label: 'App Key', type: 'text' as const },
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
