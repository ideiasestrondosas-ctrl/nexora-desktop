# Spec: Google Drive (OAuth PKCE) + Dropbox — Fase 1

**Data:** 2026-06-02  
**Estado:** Aprovado  
**Scope:** Fase 1 de 2 (Mega fica para Fase 2)

---

## Contexto

O Nexora Desktop já tem um provider Google Drive funcional e testado, autenticado via **Device Flow** (utilizador copia um código para o browser). Esta spec descreve:

1. **Novo fluxo de autenticação para GDrive** — Authorization Code + PKCE via localhost callback (fluxo padrão para apps desktop), mantendo o Device Flow como fallback sem breaking changes.
2. **Novo provider Dropbox** — CloudProvider completo com OAuth PKCE e suporte a upload session para ficheiros grandes.

Os perfis GDrive já existentes e autenticados continuam a funcionar sem qualquer migração.

---

## Arquitectura

### Ficheiros novos

| Ficheiro                         | Responsabilidade                                                       |
| -------------------------------- | ---------------------------------------------------------------------- |
| `src-tauri/src/cloud/oauth.rs`   | PKCE, listener localhost, troca de code por tokens, refresh automático |
| `src-tauri/src/cloud/dropbox.rs` | CloudProvider Dropbox (upload/download/list/delete/test)               |

### Ficheiros alterados

| Ficheiro                               | Alteração                                                     |
| -------------------------------------- | ------------------------------------------------------------- |
| `src-tauri/src/cloud/mod.rs`           | Expõe `dropbox`, regista `"dropbox"` em `get_provider`        |
| `src-tauri/src/commands/cloud.rs`      | Novo comando `oauth_connect`; Device Flow intocado            |
| `src-tauri/src/lib.rs`                 | Registo de `oauth_connect` no `.invoke_handler`               |
| `src/store/cloud.ts`                   | `'dropbox'` adicionado a `CloudProviderType`, labels e fields |
| `src/components/CloudProfileModal.tsx` | Bloco OAuth partilhado para `gdrive` e `dropbox`              |

### Ficheiros intocados

Todos os outros providers (`ftp`, `sftp`, `s3`, `smb`, `icloud`), as operações existentes de `gdrive.rs`, e os comandos `gdrive_start_auth` / `gdrive_poll_auth`.

---

## Módulo `cloud/oauth.rs`

### PKCE

```rust
pub struct PkceParams {
    pub verifier: String,   // 32 bytes aleatórios, base64url
    pub challenge: String,  // SHA-256(verifier), base64url — método S256
}

pub fn generate_pkce() -> PkceParams
```

Usa `rand`, `sha2`, `base64` — dependências já presentes no projecto.

### Listener localhost efémero

```rust
pub fn find_free_port() -> Result<u16, String>
// Tenta 127.0.0.1:8080 a 127.0.0.1:8090; erro se todas ocupadas.

pub async fn await_oauth_callback(port: u16) -> Result<String, String>
// TcpListener em 127.0.0.1:{port}
// Timeout: 120 segundos
// Extrai `code` de: GET /callback?code=xxx[&state=yyy]
// Responde com HTML "Autorizado! Pode fechar esta janela."
// Devolve o code ou erro de timeout/parse
```

### Troca de code por tokens

```rust
pub enum OAuthProvider { GDrive, Dropbox }

pub struct OAuthTokens {
    pub access_token:  String,
    pub refresh_token: Option<String>,
    pub expires_in:    u64,         // segundos
    pub account_info:  String,      // email (GDrive) | display_name (Dropbox)
}

pub async fn exchange_code(
    provider:     OAuthProvider,
    code:         &str,
    verifier:     &str,   // PKCE verifier
    client_id:    &str,
    redirect_uri: &str,
) -> Result<OAuthTokens, String>
```

Endpoints por fornecedor:

| Provider | Token URL                                 |
| -------- | ----------------------------------------- |
| GDrive   | `https://oauth2.googleapis.com/token`     |
| Dropbox  | `https://api.dropboxapi.com/oauth2/token` |

### Refresh automático

```rust
pub async fn refresh_if_needed(
    creds:     &mut serde_json::Value,  // JSON guardado no keychain
    provider:  OAuthProvider,
    client_id: &str,
) -> Result<bool, String>
// Lê `token_expiry` (ISO 8601) das creds.
// Se faltar < 5 minutos, chama /token com grant_type=refresh_token.
// Actualiza `oauth_token` e `token_expiry` no JSON em memória.
// O chamador é responsável por persistir o JSON actualizado no keychain.
// Devolve true se refrescou, false se ainda válido.
```

Chamado no início de cada operação de `GDriveProvider` e `DropboxProvider`. Se o refresh falhar com 401 (token revogado), a operação devolve `"Sessão expirada — reautentique o perfil"`.

**Persistência após refresh:** `save_credentials(profile_id, creds_json)` é chamado pelo provider após refresh bem-sucedido. Para isso, `save_credentials` é movido de `commands/cloud.rs` para `cloud/oauth.rs`, tornando-o acessível aos providers. O `profile_id` é guardado no struct de cada provider (lido do `config` no `new()`).

**Campo `token_expiry` adicionado ao JSON de credenciais:**

```json
{
  "oauth_token": "ya29.xxx",
  "oauth_refresh": "1//xxx",
  "token_expiry": "2026-06-02T17:00:00Z"
}
```

Perfis existentes sem `token_expiry` são tratados como expirados → primeiro refresh ao próximo uso.

---

## Comando `oauth_connect`

```rust
#[tauri::command]
pub async fn oauth_connect(
    provider:   String,   // "gdrive" | "dropbox"
    client_id:  String,
    app_handle: tauri::AppHandle,
) -> Result<OAuthTokens, String>
```

Sequência completa:

1. `generate_pkce()` → verifier + challenge
2. `find_free_port()` → porta livre em 8080–8090
3. Constrói `redirect_uri = "http://127.0.0.1:{porta}/callback"`
4. Constrói URL de autorização do fornecedor (ver abaixo)
5. `app_handle.opener().open_url(auth_url)` — abre browser do SO
6. `await_oauth_callback(porta)` — aguarda até 120s
7. `exchange_code(...)` — troca code por tokens
8. Devolve `OAuthTokens` ao frontend

**Auth URLs:**

```
GDrive:
  https://accounts.google.com/o/oauth2/v2/auth
  ?client_id={}&response_type=code&redirect_uri={}&scope=https://www.googleapis.com/auth/drive
  &code_challenge={}&code_challenge_method=S256&access_type=offline&prompt=consent

Dropbox:
  https://www.dropbox.com/oauth2/authorize
  ?client_id={}&response_type=code&redirect_uri={}
  &code_challenge={}&code_challenge_method=S256&token_access_type=offline
```

O `client_secret` não é enviado no PKCE flow — o verifier substitui-o.

**Nota para GDrive:** `prompt=consent` força o ecrã de consentimento em cada autenticação, garantindo que o `refresh_token` é sempre devolvido (a Google só devolve o refresh_token na primeira autorização sem este parâmetro).

---

## Provider Dropbox (`cloud/dropbox.rs`)

```rust
pub struct DropboxProvider {
    creds:      serde_json::Value,  // JSON completo das creds (inclui oauth_token, oauth_refresh, token_expiry)
    client_id:  String,             // necessário para token refresh; lido de config no new()
    base_path:  String,             // ex: "/Nexora/Output"
}
// access_token é lido de creds["oauth_token"] antes de cada chamada HTTP,
// após refresh_if_needed actualizar o JSON em memória.
```

Implementa `CloudProvider`:

### `test_connection`

`POST https://api.dropboxapi.com/2/users/get_current_account`  
Verifica o token; devolve ok ou mensagem de erro.

### `upload`

```
se tamanho ≤ 150 MB:
    POST /files/upload  (simples)
se tamanho > 150 MB:
    POST /files/upload_session/start   → session_id
    POST /files/upload_session/append_v2 (chunks de 128 MB)
    POST /files/upload_session/finish
```

Upsert: se o ficheiro já existir, usa `WriteMode::Overwrite`.

### `download`

`POST /files/download` com header `Dropbox-API-Arg: {"path": "..."}`.

### `list_files`

`POST /files/list_folder` + `list_folder/continue` para paginação. Devolve `Vec<RemoteFile>` no mesmo formato que os outros providers.

### `delete_files`

`POST /files/delete_batch` (até 1000 paths por chamada). Aguarda conclusão via `delete_batch/check`.

---

## Alterações a `store/cloud.ts`

```typescript
// Tipo actualizado
export type CloudProviderType = 'ftp' | 'sftp' | 'smb' | 's3' | 'gdrive' | 'dropbox' | 'icloud';

// Label
PROVIDER_LABELS['dropbox'] = 'Dropbox';

// Campos
PROVIDER_FIELDS['dropbox'] = [
  { key: 'base_path', label: 'Pasta no Dropbox', type: 'text', defaultValue: '/Nexora/Output' },
  { key: 'client_id', label: 'App Key', type: 'text' },
  // client_secret NÃO exposto — PKCE não requer secret
];

// GDrive: campos existentes mantidos (client_secret necessário para Device Flow fallback)
```

---

## Alterações a `CloudProfileModal.tsx`

O bloco `provider === 'gdrive'` existente é substituído por um bloco partilhado para `gdrive` e `dropbox`.

### Estado do componente (novo)

```typescript
const [oauthStatus, setOauthStatus] = useState<'idle' | 'connecting' | 'connected'>('idle');
const [oauthAccountInfo, setOauthAccountInfo] = useState('');
```

Ao abrir o modal em modo edição com `oauth_token` presente → `oauthStatus = 'connected'`, `oauthAccountInfo` = email/nome guardado no config.

### UI do bloco OAuth

```
┌─────────────────────────────────────────────────┐
│  Estado: ● Não autenticado                       │  idle
│          ◌ A aguardar autorização no browser...  │  connecting (spinner)
│          ✓ utilizador@exemplo.com                │  connected (verde)
│                                                  │
│  [Conectar com Google Drive ↗]   (botão primário)│  gdrive
│  [Conectar com Dropbox ↗]        (botão primário)│  dropbox
│  [Autenticar com código]          (link discreto)│  só gdrive (Device Flow)
└─────────────────────────────────────────────────┘
```

### Lógica do botão "Conectar"

```typescript
const handleOAuthConnect = async () => {
  setOauthStatus('connecting');
  try {
    const tokens = await invoke<OAuthTokens>('oauth_connect', {
      provider,
      clientId: String(fields['client_id'] ?? ''),
    });
    setField('oauth_token', tokens.accessToken);
    setField('oauth_refresh', tokens.refreshToken);
    setOauthAccountInfo(tokens.accountInfo);
    setOauthStatus('connected');
    toast.success(`Autenticado como ${tokens.accountInfo}`);
  } catch (e) {
    setOauthStatus('idle');
    toast.error(`Autenticação falhou: ${e}`);
  }
};
```

Enquanto `connecting`, o botão fica desactivado. Fechar o modal cancela implicitamente (o listener Rust faz timeout em 120s e liberta a porta — sem leak).

---

## Error Handling

| Cenário                                | Comportamento                                                                    |
| -------------------------------------- | -------------------------------------------------------------------------------- |
| Portas 8080–8090 todas ocupadas        | Erro imediato: "Não foi possível iniciar autenticação — portas 8080–8090 em uso" |
| Utilizador fecha browser sem autorizar | Timeout 120s → "Autorização cancelada ou tempo esgotado"                         |
| Client ID inválido                     | Erro da API propagado ao utilizador                                              |
| Token expirado em operação             | Refresh automático transparente                                                  |
| Refresh token revogado                 | "Sessão expirada — reautentique o perfil"                                        |
| Upload session Dropbox interrompida    | Operação marcada como failed na job queue; utilizador pode re-submeter           |
| 401 persistente após refresh           | Operação falha com mensagem clara; perfil não é apagado                          |

---

## Fora de Scope (Fase 1)

- **Mega** — Fase 2 (API proprietária, padrão diferente)
- **GDrive upload >150MB resumable** — gap pré-existente, não introduzido agora
- **Client ID embutido na app** — requer verificação de publisher na Google/Dropbox; utilizadores usam o seu próprio Client ID
- **Revogação de acesso a partir da app** — utilizador revoga directamente na consola do fornecedor
- **Progressão de upload em tempo real** — a job queue já tem barras de progresso mas não recebe eventos de chunk; fica para trabalho futuro

---

## Dependências Rust

Nenhuma dependência nova de peso. Verificar se já presentes em `Cargo.toml`:

| Crate     | Uso                 | Estado esperado                                 |
| --------- | ------------------- | ----------------------------------------------- |
| `sha2`    | PKCE SHA-256        | Provavelmente presente (auditoria de segurança) |
| `base64`  | Encoding base64url  | Provavelmente presente                          |
| `rand`    | Geração do verifier | Provavelmente presente                          |
| `reqwest` | Chamadas HTTP OAuth | Presente                                        |
| `tokio`   | Async listener      | Presente                                        |

Se alguma faltar, adicionar com features mínimas.

---

## Configuração OAuth necessária (fora da app)

### Google Drive

1. Google Cloud Console → Credenciais → Criar ID de cliente OAuth → **Aplicação de computador**
2. Scope: `https://www.googleapis.com/auth/drive`
3. O utilizador copia o **Client ID** para o campo no modal (sem secret para PKCE)

### Dropbox

1. Dropbox App Console → Create App → **Full Dropbox** access
2. Em "OAuth 2" → adicionar `http://127.0.0.1` como redirect URI (aceita qualquer porta com este domínio)
3. O utilizador copia a **App Key** para o campo no modal

---

_Spec aprovada em 2026-06-02. Fase 2 (Mega) a definir separadamente._
