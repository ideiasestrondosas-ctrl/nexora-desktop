import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';
import { X, Loader2, CheckCircle2 } from 'lucide-react';
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
    const credKeys = ['username', 'password', 'access_key', 'secret_key', 'oauth_token'];
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
      // Credenciais mescladas em config_json — v1 simplification (store é async, não lido nos comandos Rust)
      const configJson = JSON.stringify({ ...config, ...creds });

      if (editing) {
        await invoke('update_cloud_profile', {
          id: editing.id,
          name: name.trim(),
          configJson,
        });
        updateProfile(editing.id, { name: name.trim(), provider, config: { ...config, ...creds } });
        toast.success('Perfil actualizado');
      } else {
        const created = await invoke<CloudProfile>('create_cloud_profile', {
          name: name.trim(),
          provider,
          configJson,
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
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md z-50 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-white font-semibold">
              {editing ? 'Editar Perfil' : 'Novo Perfil Cloud'}
            </Dialog.Title>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <X size={18} />
            </button>
          </div>

          <div className="space-y-3">
            {!editing && (
              <div>
                <label className="text-xs text-gray-400 block mb-1">Tipo</label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value as CloudProviderType)}
                  className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm"
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
              <label className="text-xs text-gray-400 block mb-1">Nome</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ex: FTP cliente X"
                className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm"
              />
            </div>

            {providerFields.map((f) => (
              <div key={f.key}>
                <label className="text-xs text-gray-400 block mb-1">{f.label}</label>
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
                    className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                  />
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-between mt-5">
            <button
              onClick={handleTest}
              disabled={testing}
              className="flex items-center gap-2 text-sm text-gray-300 hover:text-white border border-gray-600 rounded px-3 py-1.5"
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
                className="text-sm text-gray-400 hover:text-white px-3 py-1.5"
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
