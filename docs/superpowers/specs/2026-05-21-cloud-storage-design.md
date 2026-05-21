# Sub-projecto A — Cloud Storage Integration

**Data:** 2026-05-21
**Estado:** Aprovado — pronto para implementação

---

## Contexto

O Nexora Desktop processa ficheiros localmente. Este sub-projecto adiciona integração opcional com fornecedores de cloud e playout, em duas direcções:

- **Envio (output):** após processar localmente, enviar o ficheiro de saída para um ou mais destinos cloud/playout
- **Ingestão (input):** adicionar um asset que está na cloud, que é descarregado antes de entrar no pipeline

Local é sempre o comportamento por defeito. A cloud é opt-in, escolhida explicitamente pelo utilizador por job.

---

## Âmbito

### Incluído

- Trait `CloudProvider` em Rust com interface unificada para todos os fornecedores
- Cinco implementações: FTP/FTPS, SFTP, SMB/watched folder, S3 (+ compatíveis), Google Drive, iCloud (wrapper SMB)
- Perfis de cloud: nomeados, reutilizáveis, guardados em SQLite (metadados) + store cifrado (credenciais)
- Override de credenciais por job (opção C aprovada)
- Envio automático após Delivery Worker (0..N destinos por job)
- Ingestão cloud: asset com origem cloud é descarregado para temp antes de entrar no pipeline
- Settings → aba "Cloud": gestão de perfis (criar, editar, apagar, testar)
- Submissão de job: selector de destinos cloud (checkboxes)
- AssetDetailPage: secção "Envios Cloud" com estado por destino e botão Retentar
- Retry automático 3× com backoff exponencial para falhas transitórias
- Entrega faseada: Grupo 1 (FTP/SFTP/SMB) → Grupo 2 (S3) → Grupo 3 (Google Drive) → Grupo 4 (iCloud)

### Excluído

- Sincronização contínua ou bidireccional de pastas
- Browser de ficheiros cloud na UI (ingestão é por path directo)
- Integração com APIs proprietárias de sistemas de playout (Viz, Grass Valley, Dalet) — modeladas como FTP/SMB; API específica em iteração futura
- Streaming de upload (transferência começa antes de processar terminar)
- Cifra end-to-end dos ficheiros antes do upload (responsabilidade do fornecedor)

---

## Arquitectura

### Trait CloudProvider

```rust
// src-tauri/src/cloud/provider.rs

#[async_trait]
pub trait CloudProvider: Send + Sync {
    async fn test_connection(&self) -> Result<(), String>;
    async fn upload(&self, local_path: &Path, remote_path: &str) -> Result<String, String>;
    async fn download(&self, remote_path: &str, local_path: &Path) -> Result<(), String>;
    fn provider_type(&self) -> &'static str;
}
```

### Estrutura de módulos

```
src-tauri/src/cloud/
    mod.rs              — re-exporta trait + factory fn get_provider(profile, creds)
    provider.rs         — trait CloudProvider
    ftp.rs              — FtpProvider (suppaftp)
    sftp.rs             — SftpProvider (russh + russh-sftp)
    smb.rs              — SmbProvider (std::fs, UNC paths)
    s3.rs               — S3Provider (crate s3)
    gdrive.rs           — GDriveProvider (reqwest + OAuth 2.0)
    icloud.rs           — ICloudProvider (wrapper SmbProvider)
    retry.rs            — retry_with_backoff(f, max=3) utility
```

### Integração no pipeline

```
IngestWorker
    └─ se asset.cloud_source_profile IS NOT NULL:
           cloud::get_provider(profile, creds).download(remote, temp_path)
           asset.local_path = temp_path
           continua pipeline normal

DeliveryWorker (após cópia local bem-sucedida)
    └─ para cada profile_id em job.cloud_destinations:
           cloud::get_provider(profile, creds).upload(output_path, remote_path)
           atualiza job_cloud_destinations.status
```

A falha num destino cloud não falha o job. O output local é sempre preservado.

---

## Modelo de Dados

### SQLite — novas tabelas

```sql
CREATE TABLE cloud_profiles (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    provider    TEXT NOT NULL CHECK(provider IN ('ftp','sftp','smb','s3','gdrive','icloud')),
    config      TEXT NOT NULL,      -- JSON: host, port, bucket, region, base_path, endpoint, etc.
    created_at  TEXT NOT NULL
);

CREATE TABLE job_cloud_destinations (
    job_id      TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    profile_id  TEXT NOT NULL REFERENCES cloud_profiles(id) ON DELETE CASCADE,
    status      TEXT NOT NULL DEFAULT 'pending'
                    CHECK(status IN ('pending','uploading','uploaded','failed')),
    error_msg   TEXT,
    uploaded_at TEXT,
    PRIMARY KEY (job_id, profile_id)
);
```

### SQLite — extensão à tabela assets

```sql
ALTER TABLE assets ADD COLUMN cloud_source_profile TEXT;   -- NULL = local
ALTER TABLE assets ADD COLUMN cloud_source_path    TEXT;   -- path remoto original
-- assets.local_path continua a apontar para o ficheiro local/temp
```

### Store cifrado (settings.json via tauri-plugin-store)

```json
{
  "cloud_credentials": {
    "<profile_id>": {
      "username": "...",
      "password": "...",
      "access_key": "...",
      "secret_key": "...",
      "oauth_token": "...",
      "oauth_refresh": "..."
    }
  }
}
```

As credenciais nunca entram no SQLite.

---

## Fornecedores — Detalhes Técnicos

### Grupo 1: FTP/FTPS + SFTP + SMB

| Fornecedor         | Crate                                           | Notas                                                                   |
| ------------------ | ----------------------------------------------- | ----------------------------------------------------------------------- |
| FTP/FTPS           | `suppaftp 6` com feature `async` + `native-tls` | suporta TLS implícito e explícito                                       |
| SFTP               | `russh 0.45` + `russh-sftp 2`                   | puro Rust, sem dependências nativas (libssh2)                           |
| SMB/watched folder | `std::fs`                                       | UNC paths no Windows (`\\servidor\pasta\`); mount points no macOS/Linux |

Config JSON para FTP/SFTP:

```json
{ "host": "ftp.example.com", "port": 21, "base_path": "/uploads/nexora/", "use_tls": true }
```

Config JSON para SMB:

```json
{ "base_path": "\\\\servidor\\nexora\\output\\" }
```

### Grupo 2: S3 e compatíveis

Crate: `s3 0.35` com feature `tokio-rustls-tls`.

Config JSON:

```json
{
  "bucket": "my-bucket",
  "region": "us-east-1",
  "endpoint": "", // vazio = AWS padrão; preenchido = Wasabi/B2/MinIO
  "base_path": "nexora/output/"
}
```

O campo `endpoint` customizável cobre S3, Wasabi, Backblaze B2 e MinIO sem código adicional.

Upload multipart automático para ficheiros > 100 MB (via crate s3).

### Grupo 3: Google Drive

Fluxo de autenticação: **OAuth 2.0 Device Flow** (sem browser embutido).

1. `invoke('gdrive_start_auth', { profile_id })` → retorna `{ url, device_code, user_code }`
2. UI mostra: "Abra [URL] e introduza o código [XXXX-XXXX]"
3. Polling: `invoke('gdrive_poll_auth', { profile_id, device_code })` a cada 5s até token recebido
4. Token e refresh token guardados no store cifrado
5. Refresh automático antes de cada operação se token expirado

API: REST via `reqwest`. Upload multipart para ficheiros > 5 MB (resumable upload API).

Config JSON:

```json
{ "base_path": "Nexora/Output/", "folder_id": "" }
```

### Grupo 4: iCloud

Wrapper de `SmbProvider`. Pasta detectada automaticamente:

- Windows: `%USERPROFILE%\iCloudDrive\`
- macOS: `~/Library/Mobile Documents/com~apple~CloudDocs/`

`test_connection()` verifica existência da pasta. Se não existir: erro "iCloud Drive não está instalado neste computador".

Config JSON: igual a SMB (base_path auto-preenchida na criação do perfil).

---

## Crates a Adicionar

```toml
# src-tauri/Cargo.toml
suppaftp = { version = "6", features = ["async", "native-tls"] }
russh = "0.45"
russh-sftp = "2"
s3 = { version = "0.35", default-features = false, features = ["tokio-rustls-tls"] }
async-trait = "0.1"
# reqwest já existe (logging system)
```

---

## Comandos Rust

```rust
// Perfis
get_cloud_profiles() -> Result<Vec<CloudProfilePublic>, String>
create_cloud_profile(name, provider, config_json, credentials_json) -> Result<String, String>  // retorna id
update_cloud_profile(id, name, config_json, credentials_json) -> Result<(), String>
delete_cloud_profile(id) -> Result<(), String>
test_cloud_connection(id) -> Result<(), String>

// Autenticação Google Drive
gdrive_start_auth(profile_id) -> Result<GDriveAuthChallenge, String>
gdrive_poll_auth(profile_id, device_code) -> Result<bool, String>  // true = autenticado

// Upload manual (Retentar)
retry_cloud_upload(job_id, profile_id) -> Result<(), String>

// Ingestão cloud
add_cloud_asset(profile_id, remote_path, name) -> Result<String, String>  // retorna asset id

// Destinos por job
get_job_cloud_destinations(job_id) -> Result<Vec<JobCloudDestination>, String>
```

`CloudProfilePublic` não inclui credenciais — apenas id, name, provider, config (sem secrets):

```rust
pub struct CloudProfilePublic { pub id: String, pub name: String, pub provider: String, pub config: serde_json::Value }
pub struct GDriveAuthChallenge { pub url: String, pub device_code: String, pub user_code: String }
pub struct JobCloudDestination { pub profile_id: String, pub profile_name: String, pub status: String, pub error_msg: Option<String>, pub uploaded_at: Option<String> }
```

---

## UI/UX

### Settings → aba "Cloud"

```
─── Perfis de Cloud ────────────────────────────────────
  [+ Novo Perfil]

  ┌───────────────────────────────────────────────────┐
  │ S3 produção       Amazon S3     us-east-1    [✓]  │ [Editar] [Apagar]
  │ FTP cliente X     FTP           ftp.x.com    [✓]  │ [Editar] [Apagar]
  │ Pasta de rede     SMB           \\server\    [✓]  │ [Editar] [Apagar]
  └───────────────────────────────────────────────────┘
```

Modal "Novo/Editar Perfil":

```
  Tipo:  [Amazon S3 ▾]   Nome: [S3 produção        ]
  Bucket: [my-bucket]    Região: [us-east-1         ]
  Endpoint: [            ] (vazio = AWS; preencher para Wasabi/MinIO/B2)
  Pasta base: [nexora/output/              ]
  Access Key: [••••••••••••]  Secret Key: [••••••••••••]
                                          [Testar ligação]  [Guardar]
```

Campos variam consoante o tipo seleccionado. Google Drive mostra botão "Autenticar com Google" que inicia o Device Flow.

### Submissão de job

No painel de submissão de job (existente), novo campo:

```
  Destinos cloud (opcional):
  ☑ S3 produção     ☐ FTP cliente X     ☐ Pasta de rede
  (sem selecção = apenas ficheiro local)
```

Visível apenas se existirem perfis configurados.

**Override de credenciais por job:** ao expandir um destino cloud na submissão, o utilizador pode opcionalmente preencher credenciais alternativas (username/password ou access key/secret). Se deixado em branco, usam-se as credenciais do perfil. As credenciais de override não são guardadas — apenas usadas nesse job.

### Adicionar asset de origem cloud

Novo botão no header da fila ao lado de "Adicionar":

```
  [+ Da Cloud ▾]
    ├ S3 produção      → modal: [s3://bucket/path/ficheiro.mxf]
    ├ FTP cliente X    → modal: [/uploads/ficheiro.mxf        ]
    └ Pasta de rede    → modal: [\\servidor\pasta\ficheiro.mxf]
```

Asset aparece na fila com ícone de cloud e estado "A descarregar..." durante o Ingest Worker.

### AssetDetailPage — secção "Envios Cloud"

Aparece apenas em jobs com destinos cloud:

```
  Envios Cloud
  ├ S3 produção     ✓ Enviado    2026-05-21 14:32
  ├ FTP cliente X   ✗ Falhou     Timeout de ligação   [Retentar]
  └ Pasta de rede   ⏳ A enviar...
```

---

## Tratamento de Erros

| Cenário                                      | Comportamento                                                                                    |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Credenciais erradas no `test_connection`     | Toast de erro no modal; perfil não é guardado                                                    |
| Upload falha (rede, timeout, espaço)         | Retry 3× com backoff (2s, 4s, 8s); se falhar → `status=failed`, error_msg guardado               |
| Ingest cloud falha (ficheiro não encontrado) | Job falha no IngestWorker; asset fica em `error`; mensagem clara                                 |
| Token Google Drive expirado                  | Refresh automático antes de cada operação; se refresh falhar → toast "Reautenticação necessária" |
| iCloud Drive não instalado                   | `test_connection` retorna erro; modal mostra mensagem explicativa                                |
| Destino cloud falha após entrega local OK    | Job fica `completed`; destino fica `failed`; utilizador pode Retentar                            |
| Store de credenciais inacessível             | Cloud desactivado nessa sessão; log de erro; pipeline local funciona normalmente                 |
| Falha de compressão SMB path (Windows)       | Path normalizado automaticamente (`/` → `\`, prefixo `\\`)                                       |

**Princípio:** a cloud é sempre opcional. Um job entregue localmente é um job completo.

---

## Estados de Destino Cloud

```
pending → uploading → uploaded
                   ↘ failed   → [Retentar] → uploading → uploaded
                                                       ↘ failed
```

---

## Ficheiros a Criar / Modificar

| Ficheiro                                    | Operação  | Responsabilidade                                                             |
| ------------------------------------------- | --------- | ---------------------------------------------------------------------------- |
| `src-tauri/src/cloud/mod.rs`                | Criar     | Re-exporta trait + factory `get_provider()`                                  |
| `src-tauri/src/cloud/provider.rs`           | Criar     | Trait `CloudProvider`                                                        |
| `src-tauri/src/cloud/ftp.rs`                | Criar     | `FtpProvider` via suppaftp                                                   |
| `src-tauri/src/cloud/sftp.rs`               | Criar     | `SftpProvider` via russh                                                     |
| `src-tauri/src/cloud/smb.rs`                | Criar     | `SmbProvider` via std::fs                                                    |
| `src-tauri/src/cloud/s3.rs`                 | Criar     | `S3Provider` via crate s3                                                    |
| `src-tauri/src/cloud/gdrive.rs`             | Criar     | `GDriveProvider` via reqwest + OAuth                                         |
| `src-tauri/src/cloud/icloud.rs`             | Criar     | Wrapper de `SmbProvider`                                                     |
| `src-tauri/src/cloud/retry.rs`              | Criar     | `retry_with_backoff()` utility                                               |
| `src-tauri/src/commands/cloud.rs`           | Criar     | Todos os comandos IPC cloud                                                  |
| `src-tauri/src/commands/mod.rs`             | Modificar | Exportar `cloud` module                                                      |
| `src-tauri/src/lib.rs`                      | Modificar | `mod cloud;` + registar comandos                                             |
| `src-tauri/src/workers/ingest.rs`           | Modificar | Download de assets cloud antes de processar                                  |
| `src-tauri/src/workers/delivery.rs`         | Modificar | Upload para destinos cloud após entrega local                                |
| `src-tauri/Cargo.toml`                      | Modificar | Adicionar suppaftp, russh, russh-sftp, s3, async-trait                       |
| `src-tauri/src/db/migrations.rs`            | Modificar | Adicionar tabelas cloud_profiles, job_cloud_destinations; ALTER TABLE assets |
| `src-tauri/src/db/schema.sql`               | Modificar | Reflectir novas tabelas na schema de referência                              |
| `src/pages/SettingsPage.tsx`                | Modificar | Nova aba "Cloud" com lista e modal de perfis                                 |
| `src/pages/AssetDetailPage.tsx`             | Modificar | Secção "Envios Cloud" com estado e Retentar                                  |
| `src/components/CloudProfileModal.tsx`      | Criar     | Modal criar/editar perfil (campos dinâmicos por tipo)                        |
| `src/components/CloudDestinationPicker.tsx` | Criar     | Checkboxes de destinos na submissão de job                                   |
| `src/store/cloud.ts`                        | Criar     | Zustand store para perfis cloud                                              |

---

## Plano de Entrega Faseada

| Fase | Grupos                                                          | Pré-requisito   |
| ---- | --------------------------------------------------------------- | --------------- |
| 1    | FTP/SFTP + SMB + infra (trait, perfis, UI base, pipeline hooks) | —               |
| 2    | S3 e compatíveis                                                | Fase 1 completa |
| 3    | Google Drive (OAuth Device Flow)                                | Fase 1 completa |
| 4    | iCloud (wrapper SMB)                                            | Fase 1 completa |

Fases 2, 3 e 4 são independentes entre si e podem ser implementadas em qualquer ordem após a Fase 1.
