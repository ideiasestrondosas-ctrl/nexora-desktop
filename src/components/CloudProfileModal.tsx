import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';
import { X, Loader2, CheckCircle2, Copy, ExternalLink } from 'lucide-react';
import { openUrl } from '@tauri-apps/plugin-opener';
import {
  CloudProfile,
  CloudProviderType,
  PROVIDER_LABELS,
  PROVIDER_FIELDS,
  useCloudStore,
} from '@/store/cloud';

interface Props {
  open: boolean;
  onClose: () => void;
  editing?: CloudProfile | null;
}

export function CloudProfileModal({ open, onClose, editing }: Props) {
  const { addProfile, updateProfile } = useCloudStore();
  const [provider, setProvider] = useState<CloudProviderType>('ftp');
  const [name, setName] = useState('');
  const [fields, setFields] = useState<Record<string, unknown>>({});
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [gdriveAuthUrl, setGdriveAuthUrl] = useState('');
  const [gdriveUserCode, setGdriveUserCode] = useState('');
  const [gdrivePolling, setGdrivePolling] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setProvider(editing.provider);
      setName(editing.name);
      setFields(editing.config);
    } else {
      setProvider('ftp');
      setName('');
      setFields({});
    }
  }, [open, editing]);

  useEffect(() => {
    const defaults: Record<string, unknown> = {};
    PROVIDER_FIELDS[provider].forEach((f) => {
      if (f.defaultValue !== undefined) defaults[f.key] = f.defaultValue;
    });
    if (!editing) setFields(defaults);
  }, [provider, editing]);

  const setField = (key: string, value: unknown) =>
    setFields((prev) => ({ ...prev, [key]: value }));

  const splitFields = () => {
    const credKeys = [
      'username',
      'password',
      'access_key',
      'secret_key',
      'oauth_token',
      'oauth_refresh',
      'client_secret',
    ];
    const config: Record<string, unknown> = {};
    const creds: Record<string, unknown> = {};
    Object.entries(fields).forEach(([k, v]) => {
      if (credKeys.includes(k)) creds[k] = v;
      else config[k] = v;
    });
    return { config, creds };
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const { config, creds } = splitFields();
      await invoke('test_cloud_connection', {
        id: editing?.id ?? '',
        provider,
        configJson: JSON.stringify(config),
        credentialsJson: JSON.stringify(creds),
      });
      toast.success('Ligação bem-sucedida');
    } catch (e) {
      toast.error(`Falha na ligação: ${e}`);
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('O nome é obrigatório');
      return;
    }
    setSaving(true);
    try {
      const { config, creds } = splitFields();

      if (editing) {
        try {
          await invoke('test_cloud_connection', {
            id: editing.id,
            provider,
            configJson: JSON.stringify(config),
            credentialsJson: JSON.stringify(creds),
          });
        } catch (e) {
          toast.error(`Ligação falhou, perfil não actualizado: ${e}`);
          return;
        }
        await invoke('update_cloud_profile', {
          id: editing.id,
          name: name.trim(),
          configJson: JSON.stringify(config),
          credentialsJson: JSON.stringify(creds),
        });
        updateProfile(editing.id, { name: name.trim(), provider, config });
        toast.success('Perfil actualizado');
      } else {
        const created = await invoke<CloudProfile>('create_cloud_profile', {
          name: name.trim(),
          provider,
          configJson: JSON.stringify(config),
          credentialsJson: JSON.stringify(creds),
        });
        addProfile(created);
        toast.success('Perfil criado');
      }
      onClose();
    } catch (e) {
      toast.error(`Erro ao guardar: ${e}`);
    } finally {
      setSaving(false);
    }
  };

  const handleGDriveAuth = async () => {
    const clientId = String(fields['client_id'] ?? '');
    if (!clientId) {
      toast.error('Preencha o Client ID primeiro');
      return;
    }
    try {
      const challenge = await invoke<{
        url: string;
        userCode: string;
        deviceCode: string;
        expiresIn: number;
      }>('gdrive_start_auth', { clientId });
      setGdriveAuthUrl(challenge.url);
      setGdriveUserCode(challenge.userCode);
      setGdrivePolling(true);
      // Verificar a cada 5 segundos se o utilizador autorizou
      const interval = setInterval(async () => {
        try {
          const tokens = await invoke<Record<string, unknown>>('gdrive_poll_auth', {
            deviceCode: challenge.deviceCode,
            clientId,
            clientSecret: String(fields['client_secret'] ?? ''),
          });
          clearInterval(interval);
          setGdrivePolling(false);
          setField('oauth_token', tokens['access_token']);
          setField('oauth_refresh', tokens['refresh_token']);
          toast.success('Google Drive autenticado com sucesso');
        } catch (e) {
          if (String(e) !== 'authorization_pending' && String(e) !== 'slow_down') {
            clearInterval(interval);
            setGdrivePolling(false);
            toast.error(`Autenticação falhou: ${e}`);
          }
        }
      }, 5000);
    } catch (e) {
      toast.error(`Erro ao iniciar autenticação: ${e}`);
    }
  };

  const providerFields = PROVIDER_FIELDS[provider];

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 glass-surface border border-border rounded-xl p-6 w-full max-w-md z-50 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-text-primary font-semibold">
              {editing ? 'Editar Perfil' : 'Novo Perfil Cloud'}
            </Dialog.Title>
            <button onClick={onClose} className="text-text-muted hover:text-text-primary">
              <X size={18} />
            </button>
          </div>

          <div className="space-y-3">
            {!editing && (
              <div>
                <label className="text-xs text-text-muted block mb-1">Tipo</label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value as CloudProviderType)}
                  className="w-full bg-bg-secondary border border-border rounded px-3 py-2 text-text-primary text-sm"
                >
                  {(Object.keys(PROVIDER_LABELS) as CloudProviderType[]).map((k) => (
                    <option key={k} value={k}>
                      {PROVIDER_LABELS[k]}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="text-xs text-text-muted block mb-1">Nome</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ex: FTP cliente X"
                className="w-full bg-bg-secondary border border-border rounded px-3 py-2 text-text-primary text-sm"
              />
            </div>

            {providerFields.map((f) => (
              <div key={f.key}>
                <label className="text-xs text-text-muted block mb-1">{f.label}</label>
                {f.type === 'checkbox' ? (
                  <input
                    type="checkbox"
                    checked={Boolean(fields[f.key] ?? f.defaultValue)}
                    onChange={(e) => setField(f.key, e.target.checked)}
                    className="accent-blue-500"
                  />
                ) : (
                  <input
                    type={
                      f.type === 'password' ? 'password' : f.type === 'number' ? 'number' : 'text'
                    }
                    value={String(fields[f.key] ?? f.defaultValue ?? '')}
                    onChange={(e) =>
                      setField(f.key, f.type === 'number' ? Number(e.target.value) : e.target.value)
                    }
                    className="w-full bg-bg-secondary border border-border rounded px-3 py-2 text-text-primary text-sm"
                  />
                )}
              </div>
            ))}

            {provider === 'gdrive' && (
              <div className="bg-bg-secondary/50 rounded p-3 text-sm mt-2">
                <p className="text-text-muted mb-2 text-xs">
                  Requer Client ID e Secret registados em console.cloud.google.com.
                </p>
                <button
                  type="button"
                  onClick={handleGDriveAuth}
                  disabled={gdrivePolling}
                  className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded px-3 py-1.5 text-xs"
                >
                  {gdrivePolling ? 'A aguardar autorização...' : 'Autenticar com Google'}
                </button>
                {gdriveAuthUrl && (
                  <div className="mt-2 text-xs text-text-secondary space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-text-muted">Abra:</span>
                      <button
                        type="button"
                        onClick={() => openUrl(gdriveAuthUrl)}
                        className="flex items-center gap-1 text-blue-400 hover:text-blue-300 underline underline-offset-2 break-all text-left"
                      >
                        {gdriveAuthUrl}
                        <ExternalLink size={11} className="shrink-0" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-text-muted">Código:</span>
                      <strong className="text-text-primary tracking-widest">
                        {gdriveUserCode}
                      </strong>
                      <button
                        type="button"
                        onClick={() => navigator.clipboard.writeText(gdriveUserCode)}
                        title="Copiar código"
                        className="text-text-muted hover:text-text-primary transition-colors"
                      >
                        <Copy size={12} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-between mt-5">
            <button
              onClick={handleTest}
              disabled={testing}
              className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary border border-border rounded px-3 py-1.5"
            >
              {testing ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <CheckCircle2 size={14} />
              )}
              Testar ligação
            </button>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="text-sm text-text-muted hover:text-text-primary px-3 py-1.5"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded px-4 py-1.5"
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                {editing ? 'Actualizar' : 'Criar'}
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
