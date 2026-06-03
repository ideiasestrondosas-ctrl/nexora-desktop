import { useState, useEffect, useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';
import {
  X,
  Loader2,
  CheckCircle2,
  Check,
  Copy,
  ExternalLink,
  ShieldAlert,
  HelpCircle,
} from 'lucide-react';
import { openUrl } from '@tauri-apps/plugin-opener';
import {
  CloudProfile,
  CloudProviderType,
  PROVIDER_LABELS,
  PROVIDER_FIELDS,
  PROVIDER_HELP,
  useCloudStore,
} from '@/store/cloud';

interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  accountInfo: string;
}

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
  const [codeCopied, setCodeCopied] = useState(false);
  // Confirmação TOFU da host key SFTP (C1)
  const [fpPrompt, setFpPrompt] = useState<{
    fingerprint: string;
    changed: boolean;
    action: 'test' | 'save';
  } | null>(null);
  // Estado OAuth para providers PKCE (gdrive_personal, dropbox)
  const [oauthStatus, setOauthStatus] = useState<'idle' | 'connecting' | 'connected'>('idle');
  const [oauthAccountInfo, setOauthAccountInfo] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  // Ref síncrono para tokens OAuth — evita race condition entre toast e commit de estado React.
  // O toast.success aparece antes do React commitar os setField(), então handleTest pode
  // executar a partir de um closure stale sem oauth_token em fields. O ref é sempre actual.
  const oauthTokensRef = useRef<{ token: string; refresh: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    setFpPrompt(null);
    if (editing) {
      setProvider(editing.provider);
      setName(editing.name);
      setFields(editing.config);
      if (editing.provider === 'gdrive_personal' || editing.provider === 'dropbox') {
        // oauth_token fica no keychain, não no config DB — mostramos como conectado se existir
        const existingToken = editing.config['oauth_token'] as string | undefined;
        if (existingToken) {
          setOauthStatus('connected');
          setOauthAccountInfo((editing.config['account_info'] as string) || '');
        } else {
          setOauthStatus('idle');
          setOauthAccountInfo('');
        }
      } else {
        setOauthStatus('idle');
        setOauthAccountInfo('');
      }
    } else {
      setProvider('ftp');
      setName('');
      setFields({});
      setOauthStatus('idle');
      setOauthAccountInfo('');
      oauthTokensRef.current = null;
    }
  }, [open, editing]);

  useEffect(() => {
    const defaults: Record<string, unknown> = {};
    PROVIDER_FIELDS[provider].forEach((f) => {
      if (f.defaultValue !== undefined) defaults[f.key] = f.defaultValue;
    });
    if (!editing) setFields(defaults);
    setShowHelp(false);
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
    // Para providers PKCE: injectar token do ref síncrono se fields ainda não o tiver
    // (o ref é actualizado antes do toast, pelo que é sempre mais recente que o estado React)
    if ((provider === 'gdrive_personal' || provider === 'dropbox') && oauthTokensRef.current) {
      creds['oauth_token'] = oauthTokensRef.current.token;
      if (oauthTokensRef.current.refresh) creds['oauth_refresh'] = oauthTokensRef.current.refresh;
    }
    return { config, creds };
  };

  const ensureSftpTrust = async (
    config: Record<string, unknown>,
    creds: Record<string, unknown>,
    action: 'test' | 'save',
  ): Promise<boolean> => {
    if (provider !== 'sftp') return true;
    const probe = await invoke<{ fingerprint: string; matchesStored: boolean }>('sftp_probe_host', {
      configJson: JSON.stringify(config),
      credentialsJson: JSON.stringify(creds),
    });
    if (probe.matchesStored) return true;
    setFpPrompt({
      fingerprint: probe.fingerprint,
      changed: Boolean(config.hostFingerprint),
      action,
    });
    return false;
  };

  const doTest = async (config: Record<string, unknown>, creds: Record<string, unknown>) => {
    await invoke('test_cloud_connection', {
      id: editing?.id ?? '',
      provider,
      configJson: JSON.stringify(config),
      credentialsJson: JSON.stringify(creds),
    });
    toast.success('Ligação bem-sucedida');
  };

  const doSave = async (config: Record<string, unknown>, creds: Record<string, unknown>) => {
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
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const { config, creds } = splitFields();
      if (!(await ensureSftpTrust(config, creds, 'test'))) return;
      await doTest(config, creds);
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
      if (!(await ensureSftpTrust(config, creds, 'save'))) return;
      await doSave(config, creds);
    } catch (e) {
      toast.error(`Erro ao guardar: ${e}`);
    } finally {
      setSaving(false);
    }
  };

  const confirmFingerprint = async () => {
    if (!fpPrompt) return;
    const fingerprint = fpPrompt.fingerprint;
    const action = fpPrompt.action;
    setFpPrompt(null);
    setField('hostFingerprint', fingerprint);
    const { config, creds } = splitFields();
    config.hostFingerprint = fingerprint;
    try {
      if (action === 'test') {
        setTesting(true);
        await doTest(config, creds);
      } else {
        setSaving(true);
        await doSave(config, creds);
      }
    } catch (e) {
      toast.error(`${e}`);
    } finally {
      setTesting(false);
      setSaving(false);
    }
  };

  // GDrive Device Flow (perfis com client_secret, credenciais "TV/dispositivos limitados")
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

  // OAuth PKCE (gdrive_personal e dropbox — sem client_secret)
  const handleOAuthConnect = async () => {
    const clientId = String(fields['client_id'] ?? '');
    if (!clientId) {
      toast.error('Preencha o Client ID / App Key primeiro');
      return;
    }
    setOauthStatus('connecting');
    try {
      const tokens = await invoke<OAuthTokens>('oauth_connect', {
        provider,
        clientId,
      });
      // Guardar no ref de forma SÍNCRONA antes do toast — evita race condition onde
      // o toast aparece antes do React commitar os setField(), fazendo handleTest
      // executar a partir de um closure stale sem oauth_token.
      oauthTokensRef.current = {
        token: tokens.accessToken,
        refresh: tokens.refreshToken ?? '',
      };
      setField('oauth_token', tokens.accessToken);
      setField('oauth_refresh', tokens.refreshToken ?? '');
      setField('account_info', tokens.accountInfo);
      setOauthAccountInfo(tokens.accountInfo);
      setOauthStatus('connected');
      toast.success(`Autenticado como ${tokens.accountInfo}`);
    } catch (e) {
      setOauthStatus('idle');
      toast.error(`Autenticação falhou: ${e}`);
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
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-bg-primary border border-border rounded-2xl w-full max-w-lg z-50 shadow-2xl">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <Dialog.Title className="text-base font-semibold text-text-primary">
              {editing ? 'Editar Perfil' : 'Novo Perfil Cloud'}
            </Dialog.Title>
            <div className="flex items-center gap-2">
              {PROVIDER_HELP[provider] && (
                <button
                  type="button"
                  onClick={() => setShowHelp((v) => !v)}
                  title="Como configurar este provider"
                  className={`transition-colors ${showHelp ? 'text-blue-600' : 'text-text-secondary hover:text-text-primary'}`}
                >
                  <HelpCircle size={18} />
                </button>
              )}
              <button
                onClick={onClose}
                className="text-text-muted hover:text-text-primary transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {showHelp && PROVIDER_HELP[provider] && (
            <div className="mx-6 mt-4 rounded-lg border border-border bg-bg-secondary p-3">
              <p className="text-xs font-semibold text-text-primary mb-1.5">
                Como configurar: {PROVIDER_LABELS[provider]}
              </p>
              <pre className="text-xs text-text-secondary whitespace-pre-wrap leading-relaxed">
                {PROVIDER_HELP[provider]}
              </pre>
            </div>
          )}

          <div className="px-6 py-5 space-y-3">
            {/* Seleção de tipo: cards clicáveis em vez de dropdown */}
            {!editing && (
              <div>
                <label className="text-xs text-text-muted block mb-1.5">Tipo de destino</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(Object.keys(PROVIDER_LABELS) as CloudProviderType[]).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setProvider(k)}
                      className={`rounded-lg border px-2 py-2.5 text-left transition-colors ${
                        provider === k
                          ? 'border-blue-500 bg-blue-500/15 text-blue-300'
                          : 'border-border hover:border-border bg-bg-secondary text-text-muted hover:text-text-secondary'
                      }`}
                    >
                      <div className="text-[11px] font-medium leading-tight">
                        {PROVIDER_LABELS[k]}
                      </div>
                    </button>
                  ))}
                </div>
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

            {/* GDrive Device Flow — para perfis com Client Secret (credenciais "TV/dispositivos") */}
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
                        onClick={() => {
                          navigator.clipboard.writeText(gdriveUserCode);
                          setCodeCopied(true);
                          setTimeout(() => setCodeCopied(false), 2000);
                        }}
                        title="Copiar código"
                        className="transition-colors"
                      >
                        {codeCopied ? (
                          <Check size={12} className="text-green-500" />
                        ) : (
                          <Copy size={12} className="text-text-muted hover:text-text-primary" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* OAuth PKCE — para gdrive_personal e dropbox (sem client_secret) */}
            {(provider === 'gdrive_personal' || provider === 'dropbox') && (
              <div className="bg-bg-secondary/50 rounded-lg p-3 space-y-3 mt-1">
                <div className="flex items-center gap-2 text-xs">
                  {oauthStatus === 'idle' && (
                    <span className="text-text-muted">● Não autenticado</span>
                  )}
                  {oauthStatus === 'connecting' && (
                    <span className="flex items-center gap-1.5 text-yellow-400">
                      <Loader2 size={12} className="animate-spin" />A aguardar autorização no
                      browser…
                    </span>
                  )}
                  {oauthStatus === 'connected' && (
                    <span className="flex items-center gap-1.5 text-green-400">
                      <CheckCircle2 size={12} />
                      {oauthAccountInfo || 'Conta autenticada'}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleOAuthConnect}
                  disabled={oauthStatus === 'connecting'}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded px-3 py-1.5 text-xs w-full justify-center"
                >
                  <ExternalLink size={12} />
                  {oauthStatus === 'connecting'
                    ? 'A autenticar…'
                    : provider === 'gdrive_personal'
                      ? 'Conectar com Google Drive'
                      : 'Conectar com Dropbox'}
                </button>
              </div>
            )}
          </div>

          {fpPrompt && (
            <div className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
              <div className="flex items-center gap-2 text-amber-300 font-medium mb-1">
                <ShieldAlert size={16} />
                {fpPrompt.changed
                  ? 'A identidade do servidor MUDOU'
                  : 'Confirmar identidade do servidor'}
              </div>
              <p className="text-text-secondary text-xs mb-2">
                {fpPrompt.changed
                  ? 'A host key deste servidor é diferente da que confiou anteriormente. Pode ser uma reinstalação legítima — ou um ataque man-in-the-middle. Só confie se reconhecer esta fingerprint.'
                  : 'É a primeira ligação a este servidor. Verifique que esta fingerprint corresponde ao servidor real antes de confiar.'}
              </p>
              <code className="block bg-bg-secondary rounded px-2 py-1 text-xs text-text-primary break-all mb-3">
                {fpPrompt.fingerprint}
              </code>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setFpPrompt(null)}
                  className="text-xs text-text-muted hover:text-text-primary px-3 py-1.5"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmFingerprint}
                  className="text-xs bg-amber-600 hover:bg-amber-500 text-white rounded px-3 py-1.5"
                >
                  Confiar e continuar
                </button>
              </div>
            </div>
          )}

          <div className="px-6 pb-6 flex justify-between">
            <button
              onClick={handleTest}
              disabled={testing || oauthStatus === 'connecting'}
              className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary border border-border rounded px-3 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
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
