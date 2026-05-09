# Plano — Bugs + Gap Analysis Nexora Desktop

> **Legenda de agentes:**
> - 🤖 **Claude Code (Sonnet)** — Rust, Node.js, config, lógica, IPC, BD
> - 🎨 **Antigravity (Gemini)** — Componentes React, UI, CSS, Tailwind, UX

---

## CONTEXTO

Quatro pedidos combinados:
1. **Bug** — Drag-and-drop de ficheiros não funciona
2. **Bug** — App não processa nada (sidecar nunca arranca)
3. **Fix** — Versão mostrada na UI está hardcoded e desactualizada
4. **Análise** — O que falta implementar vs. a app base (Cloud), excluindo login

---

## PARTE A — BUGS CRÍTICOS

---

### A1 — Drag-and-drop não funciona

**Causa-raiz:** Dois problemas independentes.
- `onDrop` em `src/components/DropZone.tsx` não faz nada (handler vazio)
- `src-tauri/tauri.conf.json` não tem `dragDropEnabled: true` → Tauri cancela os eventos antes de chegarem ao React
- `capabilities/default.json` não tem permissão `drag-drop:default`

---

#### 🤖 Prompt A1-A — Claude Code: activar drag-drop no Tauri

```
CONTEXTO: Nexora Desktop — C:\Dev\nexora-desktop
Stack: Tauri 2.x (Rust) + React 19 + TypeScript

TAREFA: Activar drag-and-drop de ficheiros no Tauri.

PROBLEMA: O drag-and-drop não funciona porque o Tauri 2 intercepta os eventos
de ficheiros por defeito. Dois ficheiros precisam de ser modificados:

1. src-tauri/tauri.conf.json
   - No objecto windows[0], adicionar: "dragDropEnabled": true
   - Também adicionar em resources o sidecar (ver bug A2): "resources": ["sidecar/dist/nexora-sidecar.js"]

2. src-tauri/capabilities/default.json
   - Adicionar "drag-drop:default" ao array permissions

Após as alterações, faz cargo check para confirmar que não há erros de compilação Rust.

FICHEIROS A MODIFICAR:
- src-tauri/tauri.conf.json
- src-tauri/capabilities/default.json

NÃO modificar nenhum outro ficheiro nesta tarefa.
```

---

#### 🎨 Prompt A1-B — Antigravity: implementar handler onDrop no DropZone

```
CONTEXTO: Nexora Desktop — C:\Dev\nexora-desktop
Stack: React 19 + TypeScript + Tailwind CSS
Ficheiro a modificar: src/components/DropZone.tsx

TAREFA: Implementar o handler onDrop que está vazio.

PROBLEMA ACTUAL:
O handler onDrop existe mas não faz nada:
  onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    // sem lógica — ficheiros ignorados
  };

IMPLEMENTAÇÃO NECESSÁRIA:
1. Extrair ficheiros de e.dataTransfer.files
2. Em Tauri, o objecto File tem uma propriedade .path com o caminho absoluto do ficheiro
   — acessível via: (file as unknown as { path?: string }).path
3. Filtrar apenas ficheiros com extensões suportadas: .mp4, .mkv, .mov, .mxf, .avi, .webm
4. Se nenhum path obtido via .path, mostrar mensagem de erro ao utilizador
5. Chamar a prop onFilesSelected(paths: string[]) com os paths válidos

A interface do componente já tem: onFilesSelected: (paths: string[]) => void

REGRAS DE CÓDIGO (obrigatórias):
- TypeScript strict — sem any implícito
- Código em inglês, comentários em português de Portugal
- Sem alterações ao layout visual — apenas a lógica do handler
- Manter o estado isDragging a false após o drop

FICHEIRO A MODIFICAR:
- src/components/DropZone.tsx (apenas o handler onDrop)
```

---

### A2 — App não processa nada (sidecar nunca arranca)

**Causa-raiz:** `sidecar.rs` tenta arrancar um executável nativo em
`binaries/nexora-sidecar-{target_triple}`, mas esse binário não existe.
O sidecar é um script Node.js em `sidecar/dist/nexora-sidecar.js`.
O spawn falha silenciosamente e nenhum job é processado.

---

#### 🤖 Prompt A2 — Claude Code: corrigir sidecar.rs para chamar node

```
CONTEXTO: Nexora Desktop — C:\Dev\nexora-desktop
Stack: Tauri 2.x (Rust) + Node.js sidecar

TAREFA: Corrigir src-tauri/src/sidecar.rs para arrancar o sidecar Node.js
em vez de tentar encontrar um executável nativo que não existe.

PROBLEMA ACTUAL:
O código tenta: Command::new(&sidecar_path) onde sidecar_path aponta para
binaries/nexora-sidecar-{target_triple} — este ficheiro não existe.
O sidecar compilado está em: sidecar/dist/nexora-sidecar.js

SOLUÇÃO:
Substituir a invocação do binário por uma chamada a `node`:
  - Usar app.path().resource_dir() para resolver o path do script
  - Chamar `std::process::Command::new("node").arg(&script_path)`
  - Manter a variável de ambiente NEXORA_DB_PATH
  - Manter a leitura de stdout JSON em thread dedicada (não alterar essa lógica)
  - Manter a emissão de eventos Tauri (sidecar:event) — não alterar

REGRAS:
- Manter tratamento de erros existente (anyhow::Result)
- Se `node` não estiver no PATH, retornar erro descritivo (não panic)
- Logging com log::info! quando sidecar arrancar com sucesso

FICHEIRO A MODIFICAR:
- src-tauri/src/sidecar.rs

Após as alterações, executa: cargo check
Reporta o resultado e mostra as linhas exactas que foram alteradas.
```

---

### A3 — Versão hardcoded na UI

**Causa-raiz:** `src/App.tsx` tem `"Versão Desktop 0.2.0"` hardcoded no footer.
O Tauri command `get_app_version()` existe mas nunca é chamado do frontend.

---

#### 🎨 Prompt A3 — Antigravity: versão dinâmica no footer

```
CONTEXTO: Nexora Desktop — C:\Dev\nexora-desktop
Stack: React 19 + TypeScript + Tauri 2
Ficheiro a modificar: src/App.tsx

TAREFA: Substituir a versão hardcoded no footer pela versão real do Tauri.

PROBLEMA ACTUAL:
No footer do App.tsx existe algo como:
  <span>Versão Desktop 0.2.0</span>
Este valor está hardcoded e está errado (a versão real é diferente).

SOLUÇÃO:
1. Importar: import { invoke } from '@tauri-apps/api/core'
2. Adicionar estado: const [appVersion, setAppVersion] = useState('...')
3. Adicionar useEffect no mount: invoke<string>('get_app_version').then(setAppVersion).catch(() => setAppVersion('?'))
4. No footer: <span>Nexora Desktop v{appVersion}</span>

REGRAS:
- TypeScript strict — sem any
- Não alterar o layout visual do footer, apenas o texto da versão
- Mostrar '...' enquanto carrega, '?' se falhar

FICHEIRO A MODIFICAR:
- src/App.tsx (apenas a secção do footer e os hooks no topo do componente)
```

---

---

## PARTE B — FEATURES EM FALTA (Gap Analysis Cloud → Desktop)

> Ordenado por prioridade. Cada item tem o prompt para o agente adequado.

---

### B1 — Selector de perfil no ProcessPage ⚡ ALTA

**Estado:** Hardcoded `broadcast-hd`. Utilizador não pode escolher perfil.
**Equivalente Cloud:** Dropdown com todos os perfis (broadcast-hd/sd, proxy, social, web-4k, web-hd)

#### 🤖 Prompt B1-A — Claude Code: command list_profiles

```
CONTEXTO: Nexora Desktop — C:\Dev\nexora-desktop
Stack: Tauri 2.x (Rust) + SQLite

TAREFA: Criar Tauri command list_profiles que retorna os perfis disponíveis.

Os 6 perfis estão em ficheiros JSON: sidecar/profiles/*.json
Cada ficheiro tem no mínimo: name, description, container, videoCodec

IMPLEMENTAR:
1. Em src-tauri/src/commands/ criar ficheiro profiles.rs com:
   - Struct Profile { id: String, name: String, description: String, container: String, video_codec: String }
   - Command list_profiles() → Result<Vec<Profile>, String>
   - Ler os ficheiros JSON de sidecar/profiles/ usando include_str! ou fs::read_to_string
   - Retornar lista ordenada

2. Em src-tauri/src/commands/mod.rs: pub mod profiles;

3. Em src-tauri/src/lib.rs: registar list_profiles no invoke_handler

Após implementar, executa: cargo check
```

#### 🎨 Prompt B1-B — Antigravity: dropdown de perfil no ProcessPage

```
CONTEXTO: Nexora Desktop — C:\Dev\nexora-desktop
Stack: React 19 + TypeScript + Tailwind CSS + Tauri 2
Ficheiro a modificar: src/pages/ProcessPage.tsx

TAREFA: Adicionar dropdown de selecção de perfil antes de submeter um job.

ESTADO ACTUAL:
O processamento está hardcoded: submitJob({ assetId, profile: 'broadcast-hd', priority: 0 })

IMPLEMENTAÇÃO:
1. Usar o hook useTauriCommand para chamar 'list_profiles' no mount
2. Criar estado selectedProfile (default: 'broadcast-hd')
3. Adicionar um <select> com os perfis carregados (label = name, value = id)
4. Usar selectedProfile ao chamar submitJob

DESIGN:
- Select com estilo Tailwind consistente com o resto da UI
- Mostrar nome + descrição curta (placeholder quando a carregar)
- Posicionar acima do DropZone ou abaixo, onde ficar mais natural visualmente
- Label: "Perfil de encoding"

REGRAS:
- TypeScript strict
- Loading state enquanto lista de perfis carrega
- Se list_profiles falhar, usar lista hardcoded de fallback com os 6 perfis conhecidos
```

---

### B2 — Search e filtros no Histórico ⚡ ALTA

**Estado:** Inputs de search e filter presentes na UI mas sem handlers.
**Equivalente Cloud:** Filtros por status, data, perfil + search por nome

#### 🎨 Prompt B2 — Antigravity: ligar search e filtros no HistoryPage

```
CONTEXTO: Nexora Desktop — C:\Dev\nexora-desktop
Stack: React 19 + TypeScript + Tailwind CSS + Zustand
Ficheiro a modificar: src/pages/HistoryPage.tsx

TAREFA: Ligar os inputs de search e filter que estão visualmente presentes mas sem lógica.

ESTADO ACTUAL:
- Input de search existe mas sem onChange handler
- Botão/select de filter existe mas sem funcionalidade
- Os assets são mostrados directamente do store sem filtragem

IMPLEMENTAÇÃO:
1. Adicionar estados locais: searchText (string), filterStatus (string | 'all')
2. Ligar input de search ao estado searchText com onChange
3. Ligar selector de status (queued/processing/done/error/all) ao estado filterStatus
4. Filtrar os assets do store antes de renderizar:
   - Por searchText: case-insensitive match em filename
   - Por filterStatus: match em asset.status (ou 'all' para mostrar tudo)
5. Mostrar contagem de resultados: "X de Y assets"

BOTÕES DE ACÇÃO (já presentes na UI):
- Botão ExternalLink → chamar invoke('open_output_folder', { path: asset.outputPath })
  (se o command não existir, usar invoke com 'opener:open-path' do plugin opener)
- Botão de reprocessar → chamar invoke('submit_job', { assetId: asset.id, profile: selectedProfile })

REGRAS:
- Não alterar o layout/design da tabela, apenas adicionar a lógica
- TypeScript strict
```

---

### B3 — Toast notifications (feedback visual) ⚡ ALTA

**Estado:** Erros e sucessos sem feedback visual para o utilizador.
**Equivalente Cloud:** react-hot-toast em todos os handlers

#### 🤖 Prompt B3-A — Claude Code: instalar dependência

```
CONTEXTO: Nexora Desktop — C:\Dev\nexora-desktop

TAREFA: Instalar biblioteca de toast notifications.

Executar: npm install react-hot-toast

Confirmar que foi adicionado ao package.json e que não há conflitos de versão com React 19.
Reportar o resultado.
```

#### 🎨 Prompt B3-B — Antigravity: integrar toasts na app

```
CONTEXTO: Nexora Desktop — C:\Dev\nexora-desktop
Stack: React 19 + TypeScript + Tailwind CSS
Biblioteca: react-hot-toast (já instalada)

TAREFA: Integrar toast notifications nos pontos críticos da aplicação.

FICHEIROS A MODIFICAR:

1. src/App.tsx
   - Adicionar <Toaster position="top-right" /> no JSX raiz

2. src/pages/ProcessPage.tsx
   - toast.success('Ficheiro aceite — a processar') após ingestAsset com sucesso
   - toast.error(`Erro: ${message}`) quando ingestAsset ou submitJob falhar
   - toast.success('Job cancelado') após cancelJob

3. src/pages/SettingsPage.tsx
   - toast.success('Definições guardadas') após updateSettings com sucesso
   - toast.error('Erro ao guardar definições') se falhar

4. src/components/DropZone.tsx
   - toast.error('Formato não suportado') se ficheiro arrastado não for válido
   - toast.error('Não foi possível obter o caminho do ficheiro') se path vazio

REGRAS:
- Mensagens em português de Portugal
- Duração padrão (não alterar defaults do react-hot-toast)
- Não duplicar toasts — verificar se já existe um similar activo
```

---

### B4 — Modal de detalhe de Asset / QC Report 🟡 MÉDIA

**Estado:** Nenhum componente de detalhe.
**Equivalente Cloud:** Página `/assets/:id` com QC report completo, MediaInfo, timeline de jobs

#### 🎨 Prompt B4 — Antigravity: componente AssetDetailModal

```
CONTEXTO: Nexora Desktop — C:\Dev\nexora-desktop
Stack: React 19 + TypeScript + Tailwind CSS + Tauri 2

TAREFA: Criar componente modal de detalhe de asset.

FICHEIRO A CRIAR: src/components/AssetDetailModal.tsx

DADOS DISPONÍVEIS (já na BD via list_assets):
- filename, path, status, size_bytes, duration_secs
- video_codec, audio_codec, width, height, fps
- created_at, updated_at, metadata (JSON)

DADOS A BUSCAR VIA INVOKE:
- list_jobs com assetId para mostrar histórico de jobs deste asset
- Cada job tem: profile, status, progress, vmaf_score, lufs, error, step

LAYOUT DO MODAL:
1. Header: filename + status badge + botão fechar (X)
2. Secção "Ficheiro": tamanho, duração, codec vídeo/áudio, resolução, fps
3. Secção "Jobs": tabela com todos os jobs deste asset (profile, status, VMAF, LUFS, data)
4. Secção "Metadados": mostrar os campos do metadata JSON de forma legível (key: value)
5. Footer: botão "Reprocessar" (abre dropdown de perfil) + botão "Fechar"

INTEGRAÇÃO:
- Adicionar em HistoryPage.tsx um botão por linha da tabela que abre este modal
- Estado no HistoryPage: selectedAsset (Asset | null)

REGRAS:
- Modal com backdrop escuro semi-transparente
- Fechar ao clicar fora do modal ou no X
- Responsive (funciona em janela 800px largura mínima)
- Tailwind CSS consistente com o resto da app
- TypeScript strict
```

---

### B5 — Dashboard de métricas 🟡 MÉDIA

**Estado:** Inexistente no Desktop.
**Equivalente Cloud:** Página `/` com VMAF history, taxa de sucesso, jobs 24h, espaço em disco

#### 🤖 Prompt B5-A — Claude Code: command get_stats

```
CONTEXTO: Nexora Desktop — C:\Dev\nexora-desktop
Stack: Tauri 2.x (Rust) + SQLite

TAREFA: Criar Tauri command get_stats que agrega métricas da BD.

Em src-tauri/src/commands/system.rs adicionar:

pub struct AppStats {
    total_assets: i64,
    completed_today: i64,
    failed_today: i64,
    avg_vmaf: Option<f64>,       // média dos jobs completed com vmaf_score
    active_jobs: i64,
    disk_free_gb: f64,
    disk_total_gb: f64,
}

#[tauri::command]
pub fn get_stats(state: State<AppState>) → Result<AppStats, String>
  Queries SQL necessárias:
  - COUNT assets por status
  - COUNT jobs WHERE created_at >= hoje AND status IN ('done','error')
  - AVG vmaf_score FROM jobs WHERE vmaf_score IS NOT NULL
  - COUNT jobs WHERE status IN ('queued','processing')
  - get_disk_space do outputDir (settings)

Registar get_stats no invoke_handler de lib.rs.
Executa cargo check após implementar.
```

#### 🎨 Prompt B5-B — Antigravity: Dashboard page

```
CONTEXTO: Nexora Desktop — C:\Dev\nexora-desktop
Stack: React 19 + TypeScript + Tailwind CSS + Tauri 2

TAREFA: Adicionar uma 4ª aba "Dashboard" à navegação principal.

FICHEIRO A CRIAR: src/pages/DashboardPage.tsx

DADOS (via invoke 'get_stats' a cada 30s):
- total_assets, completed_today, failed_today
- avg_vmaf (VMAF médio de todos os assets)
- active_jobs (jobs em fila/a processar)
- disk_free_gb, disk_total_gb

LAYOUT:
1. Grid de 4 cards no topo:
   - "Assets hoje" (completed_today)
   - "Em processamento" (active_jobs)  
   - "VMAF médio" (avg_vmaf com VMAFGauge já existente)
   - "Espaço livre" (disk_free_gb / disk_total_gb, barra de progresso)

2. Alerta visual se disk_free_gb < 5 GB (cor vermelha, ícone de aviso)

3. Lista dos últimos 5 jobs (polling 10s via list_jobs)

INTEGRAÇÃO:
- Adicionar aba "Dashboard" em App.tsx (antes de Processar)
- Usar componentes existentes: VMAFGauge, NexoraStatusBadge, ProgressBar

REGRAS:
- Auto-refresh a cada 30s com useEffect + setInterval
- Cleanup do interval no unmount
- Loading skeleton enquanto dados carregam
- Tailwind CSS consistente com resto da app
```

---

### B6 — Espaço em disco e GPU na UI 🟡 MÉDIA

**Estado:** Commands existem mas nunca chamados do frontend.

#### 🎨 Prompt B6 — Antigravity: GPU badge + alerta de disco no header/footer

```
CONTEXTO: Nexora Desktop — C:\Dev\nexora-desktop
Stack: React 19 + TypeScript + Tailwind CSS
Ficheiro a modificar: src/App.tsx

TAREFA: Mostrar GPU activa e espaço em disco no header/footer da app.

HOOKS JÁ EXISTENTES:
- useGPU() → { gpu: GpuInfo | null, loading: boolean }
  GpuInfo: { vendor: string, encoder: string, available: boolean }
- get_disk_space command (invoke com path do output dir)

IMPLEMENTAÇÃO:
1. No header/navbar adicionar um badge com o encoder GPU:
   - Verde: "NVENC" / "AMF" / "QSV"
   - Cinzento: "CPU"
   - Sem texto se loading

2. No footer (onde está a versão) adicionar espaço livre:
   - "42.3 GB livres" em texto pequeno cinzento
   - Se < 5 GB: texto vermelho com ícone ⚠

3. Refresh do espaço em disco a cada 60s

REGRAS:
- Não alterar estrutura do layout, apenas adicionar estes elementos inline
- Textos em português de Portugal
- TypeScript strict
```

---

### B7 — Soft delete e "remover do histórico" 🟢 BAIXA

#### 🤖 Prompt B7-A — Claude Code: command delete_asset

```
CONTEXTO: Nexora Desktop — C:\Dev\nexora-desktop
Stack: Tauri 2.x (Rust) + SQLite

TAREFA: Adicionar soft delete de assets.

Em src-tauri/src/commands/assets.rs adicionar:

#[tauri::command]
pub fn delete_asset(id: String, state: State<AppState>) → Result<bool, String>
  UPDATE assets SET status = 'deleted', updated_at = datetime('now') WHERE id = ?

Em list_assets, adicionar filtro automático: WHERE status != 'deleted'
(a menos que o parâmetro status='deleted' seja explicitamente pedido)

Registar delete_asset no invoke_handler.
Executa cargo check.
```

#### 🎨 Prompt B7-B — Antigravity: botão de remover no HistoryPage

```
CONTEXTO: Nexora Desktop — C:\Dev\nexora-desktop
Ficheiro a modificar: src/pages/HistoryPage.tsx

TAREFA: Adicionar botão de "Remover do histórico" por cada asset.

IMPLEMENTAÇÃO:
1. Adicionar ícone Trash2 (já disponível via lucide-react) por linha da tabela
2. Ao clicar: mostrar confirm dialog nativo (window.confirm ou modal simples)
   Texto: "Remover [filename] do histórico? O ficheiro original não será apagado."
3. Se confirmado: invoke('delete_asset', { id: asset.id })
4. Após sucesso: remover asset do store local (sem reload completo)
5. Toast: "Asset removido do histórico"

REGRAS:
- Botão de lixo pequeno, à direita dos outros botões de acção
- Cor vermelha ao hover
- TypeScript strict
```

---

### B8 — Destinos de entrega múltiplos 🟢 BAIXA

#### 🤖 Prompt B8 — Claude Code: suporte a outputDir por perfil nas Settings

```
CONTEXTO: Nexora Desktop — C:\Dev\nexora-desktop

TAREFA: Permitir que cada perfil de encoding tenha um directório de saída diferente.

IMPLEMENTAÇÃO MINIMAL (não replicar S3/FTP do servidor):
1. Na tabela settings (SQLite), adicionar suporte a chaves: output_dir_broadcast-hd, output_dir_proxy, etc.
2. Em delivery-worker.ts (sidecar): ao determinar outputDir, verificar se existe setting específico para o perfil — se sim, usar; se não, usar o outputDir global.
3. Em src-tauri/src/commands/settings.rs: nenhuma alteração necessária (já suporta chaves arbitrárias)

O frontend (SettingsPage) será actualizado noutra tarefa para mostrar estes campos.
Documentar no código como a chave deve ser formatada.
```

---

### B9 — Changelog viewer 🟢 BAIXA

#### 🎨 Prompt B9 — Antigravity: secção Changelog nas Settings

```
CONTEXTO: Nexora Desktop — C:\Dev\nexora-desktop
Ficheiro a modificar: src/pages/SettingsPage.tsx

TAREFA: Adicionar secção "Novidades" no final da página de Definições.

DADOS:
- Ler ficheiro CHANGELOG.md via invoke com Tauri fs plugin
  (ou via command Rust: get_changelog que faz fs::read_to_string("../../CHANGELOG.md"))
  
IMPLEMENTAÇÃO SIMPLES:
1. Mostrar conteúdo do CHANGELOG.md num <pre> com scroll (max-height: 200px)
2. Título "Novidades / Changelog"
3. Botão para colapsar/expandir

ALTERNATIVA se fs não estiver disponível:
- Hardcodar as últimas 3 entradas do changelog até implementar o command Rust

REGRAS:
- Tailwind CSS consistente
- Texto em mono-space para preservar formatação markdown
- TypeScript strict
```

---

## ORDEM DE EXECUÇÃO SUGERIDA

```
SESSÃO 1 — Bugs (app inoperacional) — Claude Code + Antigravity
  1. Claude Code:   Prompt A2  (sidecar.rs — fix pipeline)
  2. Claude Code:   Prompt A1-A (tauri.conf.json — drag-drop enable)
  3. Antigravity:   Prompt A1-B (DropZone.tsx — onDrop handler)
  4. Antigravity:   Prompt A3  (App.tsx — versão dinâmica)

SESSÃO 2 — Features core — Claude Code + Antigravity
  5. Claude Code:   Prompt B1-A (command list_profiles)
  6. Antigravity:   Prompt B1-B (dropdown de perfil)
  7. Claude Code:   Prompt B3-A (instalar react-hot-toast)
  8. Antigravity:   Prompt B3-B (integrar toasts)
  9. Antigravity:   Prompt B2  (search + filtros + acções no Histórico)

SESSÃO 3 — Qualidade — Claude Code + Antigravity
  10. Antigravity:  Prompt B4  (AssetDetailModal)
  11. Claude Code:  Prompt B5-A (command get_stats)
  12. Antigravity:  Prompt B5-B (Dashboard page)
  13. Antigravity:  Prompt B6  (GPU badge + disco no header)

SESSÃO 4 — Avançado — Claude Code + Antigravity
  14. Claude Code:  Prompt B7-A (command delete_asset)
  15. Antigravity:  Prompt B7-B (botão remover no Histórico)
  16. Claude Code:  Prompt B8  (output dirs por perfil)
  17. Antigravity:  Prompt B9  (Changelog nas Settings)
```

---

## VERIFICAÇÃO GLOBAL (após Sessão 1)

```powershell
cd "C:\Dev\nexora-desktop"
npm run sidecar:build          # recompilar sidecar
npm run tauri dev              # arrancar app em dev

# Testes manuais:
# 1. Arrastar .mp4 para a DropZone → aceite sem erro
# 2. Job aparece como 'queued' → muda para 'processing'
# 3. Steps progridem: 5% → 50% → 100%
# 4. Footer mostra versão real (ex: "Nexora Desktop v0.3.1")
# 5. Notificação nativa ao concluir
```
