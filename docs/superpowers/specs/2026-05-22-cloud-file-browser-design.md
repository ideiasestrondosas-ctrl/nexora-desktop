# Cloud File Browser — Design Spec

**Data:** 2026-05-22  
**Estado:** Aprovado — pronto para implementação

---

## Objectivo

Adicionar um browser de ficheiros a cada perfil cloud no menu Definições → Cloud. O utilizador pode listar, navegar, descarregar e apagar ficheiros directamente dentro do `base_path` configurado no perfil, sem sair da aplicação.

---

## Âmbito

### Dentro do âmbito

- 6 providers: FTP, SFTP, SMB, S3, Google Drive (com limitações), iCloud (não suportado — mensagem clara)
- Operações: listar, navegar em subdirectórios, descarregar ficheiro individual, apagar ficheiro(s) individual/seleccionados/todos
- Navegação limitada ao `base_path` do perfil — não é possível subir acima

### Fora do âmbito

- Upload via browser (o upload continua a ser feito pelo pipeline de jobs)
- Download de múltiplos ficheiros simultâneos ou como ZIP
- Pré-visualização de conteúdo de ficheiros
- Renomear ou mover ficheiros
- Criar pastas

---

## Arquitectura

### Extensão do trait `CloudProvider`

**Ficheiro:** `src-tauri/src/cloud/provider.rs`

Dois novos métodos obrigatórios adicionados ao trait existente:

```rust
async fn list_files(&self, path: &str) -> Result<Vec<RemoteFile>, String>;
async fn delete_files(&self, paths: &[String]) -> Result<Vec<String>, String>;
// download() já existe no trait — apenas activar (remover #[allow(dead_code)])
```

`delete_files` retorna a lista de paths que **falharam** (vazia em caso de sucesso total), permitindo delete parcial com feedback ao utilizador.

### Novo tipo de dados `RemoteFile`

**Ficheiro:** `src-tauri/src/cloud/provider.rs`

```rust
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct RemoteFile {
    pub name: String,
    pub path: String,       // relativo ao base_path do perfil
    pub size: Option<u64>,  // None para pastas
    pub modified: Option<String>, // ISO 8601 ou None se provider não suportar
    pub is_dir: bool,
}
```

### Novos comandos Tauri

**Ficheiro:** `src-tauri/src/commands/cloud.rs`

```rust
#[tauri::command]
pub async fn cloud_list_files(
    profile_id: String,
    subpath: Option<String>,  // relativo ao base_path; None = raiz
    state: State<'_, AppState>,
) -> Result<Vec<RemoteFile>, String>

#[tauri::command]
pub async fn cloud_delete_files(
    profile_id: String,
    paths: Vec<String>,  // caminhos relativos ao base_path
    state: State<'_, AppState>,
) -> Result<Vec<String>, String>  // paths que falharam

#[tauri::command]
pub async fn cloud_download_file(
    profile_id: String,
    remote_path: String,  // relativo ao base_path
    local_path: String,   // caminho local absoluto (escolhido pelo utilizador)
    state: State<'_, AppState>,
) -> Result<(), String>
```

Os 3 comandos carregam o perfil da BD, reconstroem o provider (igual a `test_cloud_connection`), e delegam para o trait.

Os comandos devem ser registados em `lib.rs` no `.invoke_handler()`.

### Ficheiros frontend

| Ficheiro                                          | Tipo      | Descrição                                      |
| ------------------------------------------------- | --------- | ---------------------------------------------- |
| `src/components/CloudFileBrowserModal.tsx`        | Novo      | Modal completo de browser                      |
| `src/pages/SettingsPage.tsx`                      | Modificar | Botão Browse em cada cartão de perfil          |
| `src/i18n/locales/*/common.json`                  | Modificar | Chaves `cloudBrowser.*` em todos os 15 locales |
| `tests/components/CloudFileBrowserModal.test.tsx` | Novo      | Testes unitários                               |

---

## Implementações por Provider

### FTP (`src-tauri/src/cloud/ftp.rs`)

- **`list_files`**: ligar ao servidor, navegar para `base_path + "/" + subpath`, executar comando `LIST`, fazer parse das linhas no formato MLSD ou UNIX ls (nome, tamanho, data, tipo `d`/`-`). Retornar `Vec<RemoteFile>`.
- **`delete_files`**: para cada path, executar `DELE base_path/path`. Acumular erros; retornar lista de falhados.
- **`download`**: `retr(base_path/remote_path)` → escrever bytes para `local_path`.

### SFTP (`src-tauri/src/cloud/sftp.rs`)

- **`list_files`**: `sftp.readdir(base_path + "/" + subpath)` → iterar entradas, extrair `SftpFileType`, `size`, `mtime`.
- **`delete_files`**: `sftp.remove(path)` por ficheiro. Acumular erros.
- **`download`**: `sftp.open(remote_path)` + leitura em chunks de 32 KB → `tokio::fs::File`.

### SMB (`src-tauri/src/cloud/smb.rs`)

- **`list_files`**: `std::fs::read_dir(unc_path + subpath)` → iterar `DirEntry`, extrair `metadata()` (len, modified, is_dir).
- **`delete_files`**: `std::fs::remove_file(path)` por ficheiro.
- **`download`**: `std::fs::copy(remote_unc_path, local_path)`.

### S3 (`src-tauri/src/cloud/s3.rs`)

- **`list_files`**: `list_objects_v2` com `prefix = base_path + "/" + subpath + "/"` e `delimiter = "/"`. Prefixos comuns (`common_prefixes`) são pastas; objectos (`contents`) são ficheiros. Remover o prefixo do `base_path` do campo `path` retornado.
- **`delete_files`**: `delete_objects` com batch de até 1000 paths por chamada.
- **`download`**: `get_object` → stream para ficheiro local via `tokio::io::copy`.

### Google Drive (`src-tauri/src/cloud/gdrive.rs`)

- **Resolução de ID:** na primeira chamada `list_files`, resolver `base_path` (nome de pasta) para folder ID via `GET /drive/v3/files?q=name='<base_path>' and mimeType='application/vnd.google-apps.folder'`. Para subpastas, resolver o ID da subpasta a partir do ID da pasta pai.
- **`list_files`**: `GET /drive/v3/files?q='<folder_id>'+in+parents&fields=id,name,size,modifiedTime,mimeType`. Pastas identificadas por `mimeType = application/vnd.google-apps.folder`. Ficheiros Google Docs nativos (Sheets, Docs, Slides) marcados com `is_dir = false` e tamanho `None` — o frontend mostra-os desactivados.
- **`delete_files`**: `DELETE /drive/v3/files/<file_id>` por ficheiro.
- **`download`**: `GET /drive/v3/files/<file_id>?alt=media` com header `Authorization: Bearer <token>` → stream para ficheiro local.
- O token OAuth é lido do campo `oauth_token` no config do perfil.

### iCloud (`src-tauri/src/cloud/icloud.rs`)

- **`list_files`**, **`delete_files`**, **`download`**: todos retornam `Err("Navegação de ficheiros não suportada para iCloud nesta versão.")`.
- O frontend desactiva o botão Browse para perfis iCloud.

---

## Design da UI

### Botão Browse no cartão de perfil

`SettingsPage.tsx` — na secção de acções de cada perfil cloud, adicionar botão com ícone `FolderOpen` (lucide-react) antes dos botões Editar e Apagar:

```
[Nome — Amazon S3]   [🗂 Browse]  [✏ Editar]  [🗑 Apagar]
```

Para perfis `iCloud`, o botão Browse aparece com `opacity-40 cursor-not-allowed` e `title="Não suportado nesta versão"`.

### CloudFileBrowserModal — layout

```
╔══════════════════════════════════════════════════════════╗
║  🗂 S3-prod  ·  Amazon S3                             ✕  ║
║  📁 /upload/ > videos/ > 2026/                           ║
║──────────────────────────────────────────────────────────║
║  [☐ Sel. Todos]  3 sel.   [↓ Download]  [🗑 Apagar Sel.] [⚠ Apagar Tudo] ║
║──────────────────────────────────────────────────────────║
║  ☐  📁  footage/            —          2026-05-20        ║
║  ☐  📄  clip_final.mp4    2.3 GB       2026-05-21  [↓][🗑]║
║  ☐  📄  promo_v2.mp4      890 MB       2026-05-22  [↓][🗑]║
║──────────────────────────────────────────────────────────║
║  3 itens · /upload/videos/2026/                  [↻ Actualizar] ║
╚══════════════════════════════════════════════════════════╝
```

**Colunas da tabela:** checkbox | ícone tipo | nome | tamanho | data modificação | acções (↓ 🗑)

**Estado `loading`:** spinner centrado, tabela oculta. Aparece no carregamento inicial e ao navegar para subpastas.

**Estado `error`:** banner no topo do modal com mensagem do backend + botão "Tentar novamente". Lista oculta.

**Estado `empty`:** ícone `FolderOpen` + texto "Pasta vazia" centrados.

### Comportamentos de interacção

**Navegação:**

- Clicar no nome de uma pasta navega para dentro — chama `cloud_list_files` com o subpath actualizado
- O breadcrumb mostra cada segmento do path como link clicável; clicar num segmento volta a esse nível
- Não é possível navegar acima do `base_path` (primeiro segmento do breadcrumb não é clicável)

**Selecção:**

- Checkbox individual por linha
- "Sel. Todos" selecciona todos os ficheiros da vista actual (não pastas)
- Desmarcar qualquer linha desmarca "Sel. Todos"
- Contador "N sel." visível quando N > 0

**Download (ficheiro individual):**

- Ícone `↓` na linha ou botão "↓ Download" na toolbar (activo só com 1 ficheiro seleccionado)
- Frontend chama `save({ defaultPath: output_dir + "/" + filename })` (diálogo nativo)
- Se o utilizador cancelar o diálogo, nada acontece
- Se o utilizador confirmar, chama `cloud_download_file(profile_id, remote_path, local_path)`
- `toast.success("Ficheiro descarregado: [nome]")` no sucesso

**Apagar Seleccionados:**

- `confirm("Apagar N ficheiros de [perfil]? Esta acção não pode ser desfeita.")`
- Chama `cloud_delete_files(profile_id, selectedPaths)`
- Se `failedPaths.length > 0`: `toast.error("N ficheiros não foram apagados: [nomes]")`
- Recarrega a listagem após a operação

**Apagar Tudo:**

- Botão vermelho na toolbar, sempre visível
- Confirmação em 2 passos: primeiro `confirm` com nome do perfil e path; se confirmado, chama `cloud_list_files` para obter todos os paths da vista actual (não recursivo — apenas o nível actual), depois `cloud_delete_files` com todos eles
- Recarrega listagem após operação

**Pastas:** navegáveis mas não apagáveis individualmente. Os ícones ↓ e 🗑 não aparecem nas linhas de pasta.

---

## Error Handling

| Cenário                               | Comportamento                                                       |
| ------------------------------------- | ------------------------------------------------------------------- |
| Ligação falha ao abrir modal          | Banner de erro + "Tentar novamente"                                 |
| Delete de um ficheiro falha (em lote) | `toast.error` com nomes falhados; sucesso parcial aceite            |
| Download cancelado pelo utilizador    | Nenhuma acção (verificação antes do `invoke`)                       |
| Download falha (rede/permissões)      | `toast.error` com mensagem do backend                               |
| Provider iCloud                       | Botão desactivado no cartão; mensagem estática se aberto via código |
| Google Docs nativo no Drive           | Linha visível mas botões ↓ e 🗑 desactivados; badge "Google Doc"    |

---

## Testes

**Ficheiro:** `tests/components/CloudFileBrowserModal.test.tsx`

Cenários a cobrir com vitest + testing-library:

1. Renderiza spinner enquanto `cloud_list_files` está pendente
2. Renderiza tabela com ficheiros após resposta do mock
3. Clicar numa pasta chama `cloud_list_files` com subpath correcto
4. Breadcrumb: clicar num segmento anterior navega de volta e chama `cloud_list_files`
5. "Sel. Todos" selecciona todas as linhas de ficheiros (não pastas)
6. Desmarcar uma linha remove-a da selecção e desmarca "Sel. Todos"
7. "Apagar Seleccionados" chama `cloud_delete_files` com os paths correctos
8. "Apagar Tudo" chama `cloud_list_files` e depois `cloud_delete_files` com todos os paths
9. Falhas parciais de delete mostram `toast.error` com os nomes falhados
10. Erro de ligação mostra banner de erro; "Tentar novamente" recarrega
11. Perfil iCloud: botão Browse desactivado no cartão de perfil
12. Pasta vazia: mostra estado "Pasta vazia"

---

## Chaves i18n a adicionar (`cloudBrowser.*`)

```json
"cloudBrowser": {
  "title": "Ficheiros em {{profile}}",
  "selectAll": "Sel. Todos",
  "selected": "{{count}} sel.",
  "download": "Download",
  "deleteSelected": "Apagar Seleccionados",
  "deleteAll": "Apagar Tudo",
  "refresh": "Actualizar",
  "empty": "Pasta vazia",
  "confirmDeleteSelected": "Apagar {{count}} ficheiros de {{profile}}? Esta acção não pode ser desfeita.",
  "confirmDeleteAll": "Apagar TODOS os ficheiros em {{path}} de {{profile}}? Esta acção não pode ser desfeita.",
  "downloadSuccess": "Ficheiro descarregado: {{name}}",
  "deletePartialError": "{{count}} ficheiros não foram apagados: {{names}}",
  "connectionError": "Não foi possível ligar ao servidor.",
  "retry": "Tentar novamente",
  "notSupported": "Não suportado nesta versão",
  "googleDocBadge": "Google Doc",
  "size": "Tamanho",
  "modified": "Modificado",
  "browseTooltipDisabled": "Navegação não suportada para iCloud"
}
```

---

## Dependências e riscos

| Item                | Notas                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| suppaftp (FTP list) | Parse do formato LIST varia por servidor; testar com FileZilla Server |
| Google Drive API    | Requer token OAuth válido; expiração de token tratada com erro claro  |
| S3 list_objects_v2  | Funciona com MinIO (endpoint personalizado) e AWS S3 standard         |
| russh_sftp readdir  | API disponível na versão actual da dependência — verificar antes      |
| SMB (Windows)       | Paths UNC funcionam nativamente; macOS/Linux requerem montagem prévia |
