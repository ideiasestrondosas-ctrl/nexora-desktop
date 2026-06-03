# Design: Provider MEGA.nz

**Data:** 2026-06-03
**Sessão:** 65
**Estado:** Aprovado — pronto para implementação

---

## Contexto

Adicionar MEGA.nz como nono provider cloud no Nexora Desktop, seguindo o padrão
`CloudProvider` trait já estabelecido (FTP, SFTP, SMB, S3, GDrive, GDrive Personal,
Dropbox, iCloud). MEGA diferencia-se por usar encriptação E2EE no cliente — os
ficheiros são cifrados antes de saírem para a rede, o que exige um cliente especializado.

---

## Decisões de Design

### Abordagem de integração: crate `mega` (mega-rs)

Escolhida de entre três opções:

| Opção                | Descrição                                    | Motivo rejeitado                            |
| -------------------- | -------------------------------------------- | ------------------------------------------- |
| **A — crate `mega`** | Biblioteca Rust comunitária (Hirevo/mega-rs) | **Escolhida**                               |
| B — MEGAcmd sidecar  | Binário oficial (~30 MB/plataforma)          | Demasiado pesado, complexidade de bundling  |
| C — API HTTP directa | reqwest + AES/RSA manual                     | ~500–1000 LOC de crypto, alto risco de bugs |

**Crate escolhida:** `mega = "0.8"` (v0.8.0, Outubro 2024, 21k downloads, docs.rs 93% cobertura).

### Autenticação: email + password, login por operação

Sem sessão persistente na v1. Cada operação faz login → executa → termina. Simples e
correcto. Email fica no config (DB), password no keychain (mesmo padrão FTP/SFTP).

### Paths MEGA

MEGA usa internamente `/Root/pasta`. O utilizador configura `base_path` sem o prefixo
`/Root/` (ex: `Nexora/Output`). O provider prefixa `/Root/` automaticamente.

Para navegação no browser, o `path` em `RemoteFile` guarda o **handle** do nó MEGA
(não um caminho textual), tal como o GDrive guarda o file ID. O download e delete
recebem o handle directamente via `get_node_by_handle`.

---

## Arquitectura

### Ficheiros

| Ficheiro                         | Acção       | Descrição                                                                  |
| -------------------------------- | ----------- | -------------------------------------------------------------------------- |
| `src-tauri/src/cloud/mega.rs`    | **Criar**   | `MegaProvider` — implementa `CloudProvider`                                |
| `src-tauri/src/cloud/mod.rs`     | **Alterar** | Registar `"mega"` em `get_provider()`                                      |
| `src-tauri/Cargo.toml`           | **Alterar** | Adicionar `mega = "0.8"`                                                   |
| `src-tauri/src/db/migrations.rs` | **Alterar** | `migrate_cloud_v3`: adicionar `'mega'` ao CHECK constraint                 |
| `src/store/cloud.ts`             | **Alterar** | `CloudProviderType`, `PROVIDER_LABELS`, `PROVIDER_FIELDS`, `PROVIDER_HELP` |

### Struct

```rust
pub struct MegaProvider {
    email: String,
    password: String,
    base_path: String,  // ex: "Nexora/Output" (sem "/Root/" — adicionado internamente)
}
```

---

## Implementação: CloudProvider

### `new(config, creds) -> Result<Self, String>`

- `email` — de `config["email"]` (campo de texto, não é segredo)
- `password` — de `creds["password"]` (keychain)
- `base_path` — de `config["base_path"]`, normalizado: strip de `/` iniciais e finais

### `test_connection`

```rust
let client = mega::Client::builder().build(reqwest::Client::new())?;
client.login(&self.email, &self.password, None).await?;
let nodes = client.fetch_own_nodes().await?;
let full_path = format!("/Root/{}", self.base_path);
nodes.get_node_by_path(&full_path)
    .ok_or_else(|| format!("Pasta '{}' não encontrada no MEGA", self.base_path))?;
Ok(())
```

### `upload(local_path, remote_path)`

1. Login
2. `fetch_own_nodes`
3. `get_node_by_path("/Root/" + base_path)` — erro claro se pasta não existe
4. `upload_node(&node, filename, size, reader, LastModified::Now).await`
5. Devolve o handle do nó criado como `String`

O `reader` é criado via `tokio::fs::File::open` + `tokio_util::compat::TokioAsyncReadCompatExt`
para compatibilidade com a API `futures::AsyncRead` do mega-rs.

### `list_files(subpath)`

1. Login + `fetch_own_nodes`
2. Path completo: `/Root/{base_path}/{subpath}` (subpath pode ser vazio)
3. `get_node_by_path` → iterar `node.children()`
4. Para cada filho: mapear `Node` → `RemoteFile`:
   - `name` = `node.name()`
   - `path` = handle do nó (`node.handle()`) — usado para download/delete
   - `size` = `node.size()` (None para pastas)
   - `modified` = `node.last_modified()` → ISO 8601
   - `is_dir` = `node.kind().is_folder()`

### `download(remote_path, local_path)`

- `remote_path` é o handle do nó (guardado em `RemoteFile.path`)
- `get_node_by_handle(handle)`
- Download via pipe: `sluice::pipe::pipe()` + `tokio::spawn` para writer concorrente
- `mega.download_node(node, writer).await`

**Dependência adicional:** `sluice` (já usado nos exemplos do mega-rs para o pipe).

### `delete_files(paths)`

- Para cada path (=handle): `get_node_by_handle` → `delete_node`
- Falhas acumuladas num `Vec<String>` (mesmo padrão GDrive/Dropbox)
- Um login por operação delete (não reutilizar sessão entre ficheiros)

---

## Frontend — `src/store/cloud.ts`

### `CloudProviderType`

```ts
'ftp' | 'sftp' | 'smb' | 's3' | 'gdrive' | 'gdrive_personal' | 'dropbox' | 'icloud' | 'mega';
```

### `PROVIDER_LABELS`

```ts
mega: 'MEGA';
```

### `PROVIDER_FIELDS`

```ts
mega: [
  { key: 'base_path', label: 'Pasta no MEGA', type: 'text', defaultValue: 'Nexora/Output' },
  { key: 'email', label: 'Email', type: 'text' },
  { key: 'password', label: 'Password', type: 'password' },
];
```

### `PROVIDER_HELP`

```
1. Aceda a mega.nz e crie uma conta gratuita (ou use existente)
2. Crie a pasta de destino no MEGA (ex: Nexora/Output) antes de testar
3. Introduza o email e password da conta MEGA
4. Pasta no MEGA: caminho dentro do Cloud Drive (sem /Root/)
   Exemplos: Nexora/Output    uploads/nexora    Media
5. Clique "Testar ligação" para verificar acesso à pasta
   NOTA: os ficheiros são cifrados automaticamente (E2EE) — o Nexora
   nunca envia dados em claro para os servidores MEGA
```

---

## Base de Dados — Migration v3

```sql
-- migrate_cloud_v3: adicionar 'mega' ao CHECK constraint
-- Padrão: DROP + recreate tabela (SQLite não suporta ALTER COLUMN)
-- Mesmo padrão da migrate_cloud_v2 (adicionou 'dropbox', 'gdrive_personal')
```

A migration recria `cloud_profiles` com o CHECK actualizado:

```sql
CHECK(provider IN ('ftp','ftps','sftp','smb','s3','gdrive','gdrive_personal','dropbox','icloud','mega'))
```

---

## Tratamento de Erros

| Situação             | Mensagem ao utilizador                                           |
| -------------------- | ---------------------------------------------------------------- |
| Login inválido       | `"MEGA: credenciais inválidas — verifique email e password"`     |
| Pasta não encontrada | `"Pasta 'X' não encontrada no MEGA. Crie-a primeiro em mega.nz"` |
| Upload falhou        | `"MEGA upload falhou: {detalhe}"`                                |
| Download falhou      | `"MEGA download falhou: {detalhe}"`                              |
| Erro de rede         | `"MEGA inacessível: {detalhe}"`                                  |

`mega::Error` é convertido via `.map_err(|e| format!("MEGA: {e}"))` com contexto específico por operação.

---

## Dependências novas

| Crate        | Versão  | Motivo                                |
| ------------ | ------- | ------------------------------------- |
| `mega`       | `"0.8"` | Cliente MEGA com E2EE                 |
| `sluice`     | `"0.5"` | Pipe async para download_node         |
| `tokio-util` | `"0.7"` | `TokioAsyncReadCompatExt` para upload |
| `futures`    | `"0.3"` | `futures::io::copy` no download       |

**Nota:** `tokio-util` e `futures` são provavelmente já transitivas — confirmar com `cargo tree` antes de adicionar explicitamente.

---

## O que NÃO está no scope (v1)

- MFA (2FA) — campo opcional na v2 se pedido
- Sessão persistente / token caching — v2 se performance for problema
- Criação automática da pasta base — erro claro pede ao utilizador para criar manualmente
- Partilha de ficheiros / links públicos MEGA
- MEGA Business API keys

---

## Ficheiros de Teste

Não são criados testes automáticos para este provider na v1 (requer credenciais reais).
O teste é manual via "Testar ligação" no modal + browse.
