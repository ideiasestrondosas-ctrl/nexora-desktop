# Nexora Desktop — Guia Completo para Antigravity
> Versão 1.0 — Maio 2026
> Lê do início ao fim antes de começares.

---

## ÍNDICE

1. [O que é o Antigravity e como funciona](#1-o-que-é-o-antigravity-e-como-funciona)
2. [Antes de começar — Pré-requisitos](#2-antes-de-começar--pré-requisitos)
3. [Como usar este guia](#3-como-usar-este-guia)
4. [ECRÃ 1 — Dashboard](#4-ecrã-1--dashboard)
5. [ECRÃ 2 — Biblioteca](#5-ecrã-2--biblioteca)
6. [ECRÃ 3 — Fila de Processamento](#6-ecrã-3--fila-de-processamento)
7. [ECRÃ 4 — Detalhe do Asset](#7-ecrã-4--detalhe-do-asset)
8. [ECRÃ 5 — Perfis de Codificação](#8-ecrã-5--perfis-de-codificação)
9. [ECRÃ 6 — Registos do Sistema](#9-ecrã-6--registos-do-sistema)
10. [ECRÃ 7 — Definições](#10-ecrã-7--definições)
11. [Navegação Principal — Actualizar App.tsx](#11-navegação-principal--actualizar-apptsx)
12. [Ordem de execução recomendada](#12-ordem-de-execução-recomendada)
13. [O que o Claude faz em paralelo (backend)](#13-o-que-o-claude-faz-em-paralelo-backend)
14. [Resolução de problemas comuns](#14-resolução-de-problemas-comuns)

---

## 1. O que é o Antigravity e como funciona

O **Antigravity** é o teu editor de código com inteligência artificial integrada.  
Funciona como um assistente que **escreve código por ti** quando lhe dás instruções em texto.

### Como funciona em termos simples:
1. Abres um ficheiro no Antigravity
2. Abres o painel de chat da IA (geralmente no lado direito ou em baixo)
3. Colas a "prompt" — um texto de instruções que descreve o que queres
4. A IA escreve o código automaticamente
5. Tu aceitas as alterações

### O que são os ficheiros .tsx?
São ficheiros de código que criam os ecrãs visuais da aplicação.  
Cada ecrã = 1 ficheiro .tsx.

---

## 2. Antes de começar — Pré-requisitos

### Verifica que tens estes ficheiros no projecto:

```
C:\Dev\nexora-desktop\
├── src\
│   ├── App.tsx          ← já existe
│   ├── pages\           ← pasta dos ecrãs
│   │   ├── DashboardPage.tsx    ← já existe
│   │   ├── ProcessPage.tsx      ← já existe
│   │   ├── HistoryPage.tsx      ← já existe
│   │   └── SettingsPage.tsx     ← já existe
│   └── components\      ← pasta dos componentes
```

### O que vamos criar/melhorar:

| Ecrã | Ficheiro | Estado |
|------|----------|--------|
| Dashboard | `src/pages/DashboardPage.tsx` | Melhorar o que existe |
| Biblioteca | `src/pages/LibraryPage.tsx` | Criar novo (substituir History) |
| Fila | `src/pages/QueuePage.tsx` | Criar novo |
| Detalhe Asset | `src/pages/AssetDetailPage.tsx` | Criar novo |
| Perfis | `src/pages/ProfilesPage.tsx` | Criar novo |
| Registos | `src/pages/LogsPage.tsx` | Criar novo |
| Definições | `src/pages/SettingsPage.tsx` | Melhorar o que existe |
| Navegação | `src/App.tsx` | Actualizar ligações |

---

## 3. Como usar este guia

### Passo a passo para CADA ecrã:

```
① Abre o Antigravity
② Cria ou abre o ficheiro indicado
③ Selecciona TODO o conteúdo do ficheiro (Ctrl+A)
④ Abre o chat da IA
⑤ Copia e cola a prompt indicada neste guia
⑥ Aguarda a IA gerar o código
⑦ Aceita as alterações
⑧ Verifica se o ficheiro ficou correcto
⑨ Passa ao ecrã seguinte
```

### Regras importantes:
- **Não saltes ecrãs** — segue a ordem deste guia
- **Copia a prompt completa** — do `---INÍCIO---` ao `---FIM---`
- **Se a IA parar a meio**, pede-lhe: `"Continua o código a partir de onde paraste"`
- **Se houver erro vermelho**, pede-lhe: `"Corrige os erros de TypeScript neste ficheiro"`

---

## 4. ECRÃ 1 — Dashboard

### O que é este ecrã?
É a página principal que aparece quando abres o Nexora.  
Mostra um resumo de tudo: quantos vídeos processaste, o estado dos jobs activos, qualidade VMAF, espaço em disco.

### Ficheiro a modificar:
`src/pages/DashboardPage.tsx`

### Passos:
1. No Antigravity, abre o ficheiro `src/pages/DashboardPage.tsx`
2. Selecciona todo (Ctrl+A)
3. Abre o chat da IA
4. Copia e cola a prompt abaixo

---

```
---INÍCIO DA PROMPT PARA ANTIGRAVITY---

Reescreve completamente o ficheiro DashboardPage.tsx para a aplicação Nexora Desktop.

CONTEXTO DA APLICAÇÃO:
- Nexora Desktop é uma aplicação nativa Tauri 2 + React 19 + TypeScript + Tailwind CSS
- Processa vídeos profissionais (broadcast, streaming, social media)
- Usa Zustand para estado global, hooks personalizados para dados
- Comunica com o backend via `invoke` do Tauri (sem HTTP)
- Tema escuro com cores: fundo #0a0d14, cards #141824, bordas #1e2433, azul primário #1A6FD4

IMPORTS DISPONÍVEIS:
- `invoke` de `@tauri-apps/api/core`
- Lucide React para ícones: LayoutDashboard, Archive, Activity, HardDrive, Cpu, MemoryStick, Gauge, TrendingUp, Clock, CheckCircle2, AlertCircle, Loader2
- Tipos do store de jobs: `useJobsStore` de `@/store/jobs`
- Hook: `useSystemMetrics` de `@/hooks/useSystemMetrics`

ESTRUTURA DO ECRÃ (de cima para baixo):

1. CABEÇALHO DA PÁGINA:
   - Título "Dashboard" em texto grande branco
   - Subtítulo cinzento "Visão geral do sistema"

2. LINHA DE 4 CARDS DE ESTATÍSTICAS:
   Cada card tem: ícone (24px), label cinzento em cima, número grande branco, subtítulo pequeno cinzento
   
   Card 1 — "Assets Totais": ícone Archive azul, número do total de assets, "ficheiros processados"
   Card 2 — "Jobs Hoje": ícone Activity verde, número de jobs do dia, "concluídos hoje"  
   Card 3 — "VMAF Médio": ícone Gauge, número com 1 decimal (ex: "91.4"), cor verde se >85, amarelo se 70-85, vermelho se <70
   Card 4 — "Disco Livre": ícone HardDrive, valor em GB (ex: "234 GB"), barra de progresso fina abaixo mostrando uso

3. LINHA COM DOIS PAINÉIS:
   
   PAINEL ESQUERDO (65% de largura) — "Jobs Recentes":
   - Cabeçalho com título e link "Ver todos →" que navega para /queue
   - Lista dos últimos 5 jobs, cada linha:
     * Ícone de ficheiro de vídeo
     * Nome do ficheiro (truncado com ..., max 30 chars)
     * Badge do perfil: "broadcast-hd" roxo, "web-hd" azul, "proxy" cinzento, "social" laranja
     * Badge de estado: queued=cinzento, processing=azul com animação pulse, done=verde, error=vermelho
     * Barra de progresso (só se processing)
     * Tempo decorrido em texto pequeno cinzento (ex: "há 2 min")
     * Pontuação VMAF em verde (só se done, ex: "VMAF 91.4")
   - Estado vazio: ícone + mensagem "Sem jobs recentes. Arrasta vídeos para processar."

   PAINEL DIREITO (35% de largura) — "Estado do Sistema":
   - Card com métricas do sistema em tempo real:
     * CPU: label + percentagem + barra de progresso (vermelho se >80%)
     * RAM: label + "X.X GB / Y.Y GB" + barra de progresso
     * GPU: label + nome da GPU detectada (ex: "NVIDIA RTX 3080") ou "CPU (sem GPU)"
   - Em baixo: card "Distribuição VMAF" — lista simples com contagem:
     * 🟥 Abaixo de 70: X jobs
     * 🟨 70 a 85: X jobs  
     * 🟩 85 a 95: X jobs
     * 💚 Acima de 95: X jobs

DADOS E ESTADO:
- Usa `invoke<AppStats>('get_stats')` para buscar as estatísticas (retorna: total_assets, jobs_today, avg_vmaf, disk_free_gb, disk_total_gb)
- Usa `invoke<Job[]>('list_jobs')` para os jobs recentes (limita aos 5 mais recentes)
- Usa `useSystemMetrics()` hook para CPU/RAM em tempo real
- Estado de loading: mostra skeleton (cinzento animado) enquanto carrega
- Refresca automaticamente a cada 10 segundos via setInterval

INTERFACES TYPESCRIPT necessárias (define no topo do ficheiro):
```typescript
interface AppStats {
  total_assets: number;
  jobs_today: number;
  avg_vmaf: number | null;
  disk_free_gb: number;
  disk_total_gb: number;
}

interface Job {
  id: string;
  asset_id: string;
  profile: string;
  status: 'queued' | 'processing' | 'done' | 'error';
  progress: number; // 0.0 a 1.0
  step: string | null;
  error: string | null;
  created_at: string;
  vmaf_score: number | null;
  // filename vem do asset, mas para simplificar podes guardar no estado local
}
```

ESTILO:
- Background da página: bg-[#0a0d14]
- Cards: bg-[#141824] border border-[#1e2433] rounded-xl p-6
- Texto principal: text-white
- Texto secundário: text-gray-400
- Azul primário: text-[#1A6FD4] ou bg-[#1A6FD4]
- Sem shadows, usar bordas em vez disso
- Espaçamento: gap-6 entre elementos principais

Gera o ficheiro TypeScript/React completo e funcional. Usa `export default function DashboardPage()`.

---FIM DA PROMPT PARA ANTIGRAVITY---
```

### O que verificar depois:
- [ ] A página abre sem erros a vermelho
- [ ] Os 4 cards aparecem com números (mesmo que sejam zeros)
- [ ] A lista de jobs aparece (mesmo que vazia)
- [ ] Não há erros de TypeScript

---

## 5. ECRÃ 2 — Biblioteca

### O que é este ecrã?
É onde vês todos os vídeos que já adicionaste ao Nexora.  
Podes filtrar por estado, arrastar novos vídeos, e clicar para ver detalhes de cada um.

### Ficheiro a criar:
`src/pages/LibraryPage.tsx` ← **ficheiro novo**

### Passos:
1. No Antigravity, cria um ficheiro novo: `src/pages/LibraryPage.tsx`
2. Com o ficheiro vazio aberto, abre o chat da IA
3. Copia e cola a prompt abaixo

---

```
---INÍCIO DA PROMPT PARA ANTIGRAVITY---

Cria um ficheiro novo LibraryPage.tsx para a aplicação Nexora Desktop.

CONTEXTO DA APLICAÇÃO:
- Nexora Desktop: Tauri 2 + React 19 + TypeScript + Tailwind CSS
- Tema escuro: fundo #0a0d14, cards #141824, bordas #1e2433, azul #1A6FD4
- Comunicação via `invoke` do Tauri (sem HTTP)

IMPORTS NECESSÁRIOS:
- `invoke` de `@tauri-apps/api/core`
- `open` de `@tauri-apps/plugin-dialog` para diálogo de ficheiros
- Lucide React: Library, Upload, Search, Filter, Grid2X2, List, Film, Clock, CheckCircle2, AlertCircle, Loader2, FolderOpen, Play, ExternalLink, Trash2
- `useCallback, useEffect, useState` de react

INTERFACE DO ASSET (define no topo):
```typescript
interface Asset {
  id: string;
  path: string;
  filename: string;
  status: 'pending' | 'ingesting' | 'qc_passed' | 'processing' | 'done' | 'error';
  size_bytes: number;
  duration_secs: number | null;
  video_codec: string | null;
  width: number | null;
  height: number | null;
  created_at: string;
  thumbnail_path: string | null;
  vmaf_score: number | null;
}
```

ESTRUTURA DO ECRÃ:

1. CABEÇALHO:
   - Título "Biblioteca" + subtítulo "X assets encontrados" (actualiza dinamicamente)
   - Botão "Adicionar Vídeos" (azul, ícone Upload) — usa `open()` com filtro de extensões: mp4, mov, mxf, avi, mkv, ts, m2ts

2. BARRA DE FILTROS (linha horizontal):
   - Input de pesquisa com ícone lupa (pesquisa por nome de ficheiro)
   - Dropdown "Estado": Todos | Pendente | A Processar | Concluído | Erro
   - Dropdown "Ordenar": Mais recente | Mais antigo | Nome (A-Z) | Tamanho
   - Toggle de vista: ícone grelha (Grid2X2) / lista (List) — guarda preferência em localStorage

3. ZONA DE DRAG-AND-DROP:
   - Área dashed visível quando a grelha está vazia OU como barra compacta (80px altura) quando há assets
   - Texto: "Arrasta vídeos aqui para adicionar" com ícone Upload
   - On drag-over: bordar fica azul, fundo fica ligeiramente mais claro
   - On drop: chama `invoke('ingest_asset', { path: ficheiro, profile: 'broadcast-hd' })`

4. GRELHA DE CARDS (vista grelha, 4 colunas em desktop, 2 em tablet):
   Cada card de asset:
   - THUMBNAIL: área 16:9 com fundo escuro; se thumbnail_path existe mostra imagem; senão mostra ícone Film centrado cinzento
   - BADGE DE ESTADO sobreposto no canto superior direito:
     * pending=cinzento "Pendente"
     * ingesting=azul pulsante "A processar..."
     * qc_passed=verde "QC OK"
     * processing=azul pulsante "A processar..."
     * done=verde "Concluído"
     * error=vermelho "Erro"
   - BADGE VMAF (se vmaf_score > 0): canto inferior direito, verde se >85, amarelo se >70
   - NOME DO FICHEIRO (2 linhas max, truncado)
   - METADATA LINE: tamanho formatado (ex: "2.3 GB") + duração formatada (ex: "9:52")
   - HOVER: overlay semi-transparente com 2 botões:
     * "Detalhes" (ExternalLink) — navega para /asset/:id
     * "Processar" (Play) — só se status=done ou status=error; abre modal de selecção de perfil

5. VISTA LISTA (alternativa à grelha):
   Tabela com colunas: Nome | Estado | Tamanho | Duração | Codec | Criado em | Acções
   Acções: ícone ExternalLink + ícone Trash2 (com confirmação)

6. PAGINAÇÃO:
   - Barra no fundo: "Mostrar 20 de X assets" + botões Anterior/Próximo
   - 20 assets por página

7. ESTADO VAZIO (quando não há assets):
   - Ícone grande Library cinzento centrado
   - Texto "Sem assets na biblioteca"
   - Subtítulo "Arrasta ficheiros de vídeo ou clica em Adicionar Vídeos"
   - Botão "Adicionar Vídeos" azul

LÓGICA:
- `invoke<Asset[]>('list_assets')` para buscar todos os assets
- Filtragem e pesquisa feitas no frontend (não no backend)
- Refresca a cada 5 segundos via setInterval (para apanhar mudanças de estado)
- Função para formatar bytes: `1024 * 1024 = 1 MB`, etc.
- Função para formatar segundos em MM:SS ou HH:MM:SS

ESTILO igual ao DashboardPage: bg-[#0a0d14], cards bg-[#141824] border border-[#1e2433] rounded-xl

Gera o ficheiro completo. `export default function LibraryPage()`.

---FIM DA PROMPT PARA ANTIGRAVITY---
```

### O que verificar depois:
- [ ] O ficheiro foi criado sem erros
- [ ] A zona de drag-and-drop aparece
- [ ] A grelha aparece (mesmo que vazia)
- [ ] Os filtros de estado funcionam visualmente

---

## 6. ECRÃ 3 — Fila de Processamento

### O que é este ecrã?
Mostra em tempo real todos os jobs a correr, em espera e os já terminados.  
É como um painel de controlo da fila de processamento.

### Ficheiro a criar:
`src/pages/QueuePage.tsx` ← **ficheiro novo**

---

```
---INÍCIO DA PROMPT PARA ANTIGRAVITY---

Cria um ficheiro novo QueuePage.tsx para o Nexora Desktop.

CONTEXTO:
- Tauri 2 + React 19 + TypeScript + Tailwind CSS
- Tema escuro: fundo #0a0d14, cards #141824, bordas #1e2433, azul #1A6FD4
- `invoke` do Tauri para comunicação com backend

INTERFACES (define no topo do ficheiro):
```typescript
interface Job {
  id: string;
  asset_id: string;
  profile: string;
  status: 'queued' | 'processing' | 'done' | 'error' | 'cancelled';
  progress: number; // 0.0 a 1.0
  step: string | null;
  error: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  vmaf_score: number | null;
  lufs: number | null;
  output_path: string | null;
  filename: string; // nome do ficheiro do asset associado
}

interface QueueStats {
  queued: number;
  processing: number;
  done_today: number;
  error_today: number;
}
```

OS 8 PASSOS DO PIPELINE (usa esta constante):
```typescript
const PIPELINE_STEPS = [
  { key: 'ingest',     label: 'Ingest',    short: 'IN' },
  { key: 'qc-pre',     label: 'QC Pré',    short: 'QC' },
  { key: 'transcode',  label: 'Transco.',  short: 'TR' },
  { key: 'audio',      label: 'Áudio',     short: 'AU' },
  { key: 'proxy',      label: 'Proxy',     short: 'PX' },
  { key: 'thumbnail',  label: 'Thumb',     short: 'TH' },
  { key: 'qc-post',    label: 'QC Pós',    short: 'QP' },
  { key: 'delivery',   label: 'Entrega',   short: 'DL' },
];
```

ESTRUTURA DO ECRÃ:

1. CABEÇALHO:
   - Título "Fila de Processamento"
   - 4 CHIPS DE ESTATÍSTICAS em linha:
     * "Em fila: X" — badge cinzento
     * "A processar: X" — badge azul com círculo pulsante antes do número
     * "Concluídos hoje: X" — badge verde
     * "Erros hoje: X" — badge vermelho (só aparece se X > 0)

2. SECÇÃO "A PROCESSAR" (só aparece se há jobs com status=processing):
   Cabeçalho: "A Processar" + "X/2 slots a ser usados"
   
   Para cada job processing — CARD GRANDE:
   - LINHA SUPERIOR: ícone Film + nome do ficheiro (bold) + badge do perfil (colorido por tipo)
   - INDICADOR DE PIPELINE (fila horizontal de 8 círculos ligados por linhas):
     * Círculo concluído: preenchido verde com checkmark ✓
     * Círculo actual (step actual): círculo azul pulsante com ponto
     * Círculo futuro: círculo vazio cinzento
     * Entre cada círculo: linha horizontal; verde se passado, cinzenta se futuro
     * Abaixo de cada círculo: label curto (IN, QC, TR, etc.)
   - BARRA DE PROGRESSO: larga, mostra % e o step actual em texto abaixo ("A transcodificar... 67%")
   - LINHA DE MÉTRICAS: "Iniciado há X min" | "GPU: NVENC" (se disponível) | "Estimado: X min restantes"
   - BOTÃO CANCELAR: canto superior direito, ícone X, cinzento, vermelho no hover
     On click: `invoke('cancel_job', { jobId: job.id })`

3. SECÇÃO "EM FILA" (jobs com status=queued):
   Cabeçalho: "Em Fila" + badge com contagem
   
   TABELA COMPACTA com colunas:
   Pos. | Nome do ficheiro | Perfil | Tamanho | Estado | Acção
   - Pos.: número de posição na fila (1, 2, 3...)
   - Estado: badge "Aguardar" cinzento
   - Acção: botão "×" para cancelar

4. SECÇÃO "CONCLUÍDOS HOJE":
   Cabeçalho: "Concluídos Hoje" + link "Ver histórico completo →" que navega para /library
   
   TABELA com colunas:
   Nome | Perfil | Duração | VMAF | Estado | Concluído há | Acção
   - VMAF: número colorido (verde >85, amarelo >70, vermelho <70)
   - Estado: badge verde "Concluído" ou vermelho "Erro"
   - Acção: ícone pasta (abre output_path no explorador) + ícone repetir (re-processa)
   - "Re-processar": chama `invoke('retry_job', { jobId: job.id })`

5. SECÇÃO "ERROS" (só se houver errors):
   Cabeçalho vermelho "Com Erros"
   
   Para cada job com error:
   - Nome + perfil + mensagem de erro em texto vermelho (truncada, expansível)
   - Botão "Repetir" azul
   - Botão "Ignorar" cinzento

LÓGICA:
- `invoke<Job[]>('list_jobs')` — busca todos os jobs
- `invoke<QueueStats>('get_queue_stats')` — busca estatísticas
- Polling a cada 2 segundos para jobs activos
- Polling a cada 10 segundos para os restantes
- Função helper para calcular tempo decorrido desde started_at
- Função para determinar o índice do step actual no PIPELINE_STEPS

ESTILO:
- Cards de "A Processar": border-l-4 border-[#1A6FD4] bg-[#141824]
- Círculo activo no pipeline: animate-pulse
- Progresso de jobs em processamento: bg-[#1A6FD4] com transition-all duration-500
- Bordas dos cards: border-[#1e2433]

Gera o ficheiro completo. `export default function QueuePage()`.

---FIM DA PROMPT PARA ANTIGRAVITY---
```

### O que verificar depois:
- [ ] Os 8 círculos do pipeline aparecem correctamente
- [ ] Os chips de estatísticas aparecem no topo
- [ ] A lista de jobs aparece (mesmo que vazia)
- [ ] O botão cancelar existe

---

## 7. ECRÃ 4 — Detalhe do Asset

### O que é este ecrã?
Quando clicas num asset na Biblioteca ou na Fila, abre este ecrã com toda a informação detalhada:  
metadados técnicos, relatório QC, histórico de todos os jobs desse vídeo.

### Ficheiro a criar:
`src/pages/AssetDetailPage.tsx` ← **ficheiro novo**

---

```
---INÍCIO DA PROMPT PARA ANTIGRAVITY---

Cria um ficheiro novo AssetDetailPage.tsx para o Nexora Desktop.

CONTEXTO:
- Tauri 2 + React 19 + TypeScript + Tailwind CSS
- Tema escuro: fundo #0a0d14, cards #141824, bordas #1e2433, azul #1A6FD4
- Este ecrã recebe um `assetId` como prop ou parâmetro de URL

INTERFACES (define no topo):
```typescript
interface Asset {
  id: string;
  path: string;
  filename: string;
  status: string;
  size_bytes: number;
  duration_secs: number | null;
  video_codec: string | null;
  audio_codec: string | null;
  width: number | null;
  height: number | null;
  fps: number | null;
  created_at: string;
  thumbnail_path: string | null;
  metadata: Record<string, unknown> | null;
}

interface Job {
  id: string;
  asset_id: string;
  profile: string;
  status: string;
  progress: number;
  step: string | null;
  error: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  vmaf_score: number | null;
  lufs: number | null;
  output_path: string | null;
}

interface AssetDetailPageProps {
  assetId: string;
  onBack: () => void; // função para voltar à página anterior
}
```

ESTRUTURA DO ECRÃ:

1. BREADCRUMB + BOTÃO VOLTAR:
   - "← Biblioteca > [nome do ficheiro]"
   - Clicar em "← Biblioteca" ou na seta volta para a página anterior (chama onBack())

2. SECÇÃO HERO (layout duas colunas):
   
   COLUNA ESQUERDA (40%):
   - Thumbnail grande (aspect ratio 16:9, rounded-xl, bg-[#0a0d14])
     Se thumbnail_path existe: mostra a imagem
     Se não existe: fundo escuro com ícone Film grande centrado
   - Abaixo: caminho do ficheiro em monospace pequeno cinzento + ícone copiar
   - Se existe proxy (ficheiro _proxy na mesma pasta): botão "▶ Ver Proxy"
   
   COLUNA DIREITA (60%):
   - Nome do ficheiro (título grande, bold)
   - Badge de estado colorido
   - GRELHA DE METADADOS (2 colunas, linhas alternadas):
     * Tamanho: "2.3 GB"
     * Duração: "9:52" ou "01:23:45"
     * Vídeo: "H.264 / 1920×1080 / 25fps / 50 Mbps"
     * Áudio: "AAC / 48kHz / Stereo / 256 kbps"
     * Container: "QuickTime MOV"
     * Adicionado: "há 2 horas" (com tooltip da data completa)
   - Se VMAF disponível: badge verde grande "VMAF 91.4" com ícone shield

3. CARD "RELATÓRIO QC" (expansível, aberto por padrão):
   - Cabeçalho: "Relatório de Qualidade" + badge PASS verde / QUARANTINE amarelo / REJECT vermelho
   - TABELA DE VERIFICAÇÕES:
     Colunas: Verificação | Resultado | Valor | Limite
     Linhas exemplo:
     * "Codec suportado" | ✓ | "h264" | "—"
     * "Resolução mínima" | ✓ | "1920×1080" | "≥ 720p"
     * "VMAF Score" | ✓ | "91.4" | "≥ 85"
     * "Níveis de áudio" | ✓ | "-23.1 LUFS" | "-23 ±1"
     * Resultado ✓: ícone verde, ✗: ícone vermelho, ⚠: ícone amarelo
   - Rodapé: "Aprovado automaticamente pelo pipeline em [data]"
   - Se o QC falhou: mensagem de erro em vermelho

4. SECÇÃO "HISTÓRICO DE PROCESSAMENTO":
   - Cabeçalho: "Histórico de Jobs" + badge com contagem
   - LINHA DO TEMPO VERTICAL: cada job = 1 card
   
   Cada CARD DE JOB:
   - Cabeçalho: ID do job (primeiros 8 chars) + badge do perfil + badge de estado + botão "⋮" menu
   - INDICADOR DE PIPELINE (8 círculos, mesmo estilo da QueuePage):
     Completados: verde, Actual (se running): pulsante azul, Futuros: cinzento vazio
   - MÉTRICAS DO JOB (linha horizontal):
     "Iniciado: X" | "Duração: X min Y seg" | "VMAF: X" | "LUFS: X"
   - Se output_path existe: botão "Abrir ficheiro" (abre no explorador do sistema)
   - Se status=error: caixa vermelha com mensagem de erro
   - Se status=done: botão "Processar novamente" (re-abre com mesmo perfil)
   - Menu "⋮": opções "Re-processar", "Copiar ID", "Ver logs deste job"
   
   Linha de tempo vertical: linha cinzenta à esquerda, círculo em cada card

5. BARRA DE ACÇÕES (fundo da página, sticky):
   - "Processar Novamente" — botão azul principal, abre selector de perfil
   - "Abrir no Explorador" — abre pasta do ficheiro original
   - "Apagar Asset" — botão vermelho, abre dialog de confirmação:
     "Tens a certeza? Esta acção não pode ser desfeita."
     Botões: "Cancelar" + "Apagar" (vermelho)
     On confirm: `invoke('delete_asset', { assetId })` + volta para Library

LÓGICA:
- `invoke<Asset>('get_asset', { assetId })` — busca o asset
- `invoke<Job[]>('list_jobs', { assetId })` — busca todos os jobs deste asset
- Cálculo de duração do job: diferença entre finished_at e started_at
- Formatação de bytes em GB/MB/KB

ESTILO:
- Hover nos cards de job: borda esquerda azul
- Timeline: linha vertical cinzenta #1e2433 à esquerda dos cards

Gera o ficheiro completo. `export default function AssetDetailPage({ assetId, onBack }: AssetDetailPageProps)`.

---FIM DA PROMPT PARA ANTIGRAVITY---
```

### O que verificar depois:
- [ ] O ecrã mostra duas colunas no hero
- [ ] A tabela de metadados aparece
- [ ] O relatório QC está expansível
- [ ] O histórico de jobs mostra os círculos do pipeline

---

## 8. ECRÃ 5 — Perfis de Codificação

### O que é este ecrã?
Aqui podes ver e gerir os perfis de codificação.  
Os perfis definem como os teus vídeos vão ser processados (qualidade, resolução, formato).

### Ficheiro a criar:
`src/pages/ProfilesPage.tsx` ← **ficheiro novo**

---

```
---INÍCIO DA PROMPT PARA ANTIGRAVITY---

Cria um ficheiro novo ProfilesPage.tsx para o Nexora Desktop.

CONTEXTO:
- Tauri 2 + React 19 + TypeScript + Tailwind CSS
- Tema escuro: fundo #0a0d14, cards #141824, bordas #1e2433, azul #1A6FD4

INTERFACES:
```typescript
interface TranscodeProfile {
  id: string;
  name: string;
  description: string;
  is_system: boolean; // true = preset do sistema, não pode ser apagado
  container: string;
  video_codec: string;
  resolution: string;
  fps: number | null;
  video_bitrate_k: number;
  audio_codec: string;
  audio_bitrate_k: number;
  audio_sample_rate: number;
  target_lufs: number;
  true_peak_limit_dbtp: number;
  vmaf_threshold: number;
  cpu_preset: string;
  h264_profile: string;
  h264_level: string;
}
```

OS 6 PERFIS DO SISTEMA (referência visual para as cores dos badges):
- "broadcast-hd" → roxo escuro
- "broadcast-sd" → roxo claro  
- "web-4k" → azul escuro
- "web-hd" → azul
- "proxy" → cinzento
- "social" → laranja

ESTRUTURA DO ECRÃ:

1. CABEÇALHO:
   - Título "Perfis de Codificação"
   - Botão "Novo Perfil +" azul no canto direito

2. GRELHA DE CARDS (3 colunas):
   Cada card de perfil:
   
   CABEÇALHO DO CARD:
   - Nome em bold grande
   - Badge "PRESET" cinzento com ícone cadeado 🔒 (se is_system=true)
   - Badge "PERSONALIZADO" laranja (se is_system=false)
   
   LINHA DE BADGES TÉCNICOS:
   - Badge container: "MOV" / "MP4" / "MXF"
   - Badge codec: "H.264" / "H.265" / "ProRes"
   - Badge resolução: "1920×1080" / "1280×720" etc.
   
   GRELHA DE ESPECIFICAÇÕES (2 colunas, 5 linhas):
   FPS | Bitrate Vídeo
   Bitrate Áudio | LUFS Alvo
   VMAF Mínimo | — | —
   Cada item: label pequeno cinzento + valor branco
   
   DESCRIÇÃO: 2 linhas de texto cinzento (truncadas)
   
   RODAPÉ DO CARD:
   - Botão "Editar" (secondary) → abre painel lateral
   - Botão "Duplicar" (ghost) → cria cópia com nome "Cópia de X"
   - Botão "Apagar" (só se is_system=false, vermelho, com confirmação)
   
   Hover no card: borda esquerda azul

3. PAINEL LATERAL DE EDIÇÃO (Sheet/Drawer desliza da direita, 420px):
   Aparece ao clicar "Editar" ou "Novo Perfil"
   
   CABEÇALHO: "Editar broadcast-hd" ou "Novo Perfil" + botão X para fechar
   
   Se is_system=true: banner amarelo "⚠ Este é um preset do sistema e não pode ser modificado"
   
   FORMULÁRIO EM SECÇÕES (accordion ou separadas por linha divisória):
   
   GERAL:
   - Nome (text input, obrigatório)
   - Descrição (textarea, 3 linhas)
   - Container: select ["MOV", "MP4", "MXF", "TS"]
   
   VÍDEO:
   - Codec: select ["H.264", "H.265 (HEVC)", "Apple ProRes 422"]
   - Resolução: select ["Original", "3840×2160 (4K)", "1920×1080 (Full HD)", "1280×720 (HD)", "720×576 (SD PAL)", "640×360 (Web)"]
   - FPS: select ["Original", "23.976", "25", "29.97", "50", "59.94", "60"]
   - Bitrate Vídeo (Mbps): number input, placeholder "0 = automático"
   - Bitrate Máximo (Mbps): number input
   - GOP Fechado: toggle (importante para broadcast)
   - B-frames: toggle (desactivar para broadcast)
   - Perfil H.264: select ["baseline", "main", "high"]
   - Nível H.264: select ["3.1", "4.0", "4.1", "4.2"]
   - Preset CPU: select ["ultrafast", "superfast", "veryfast", "faster", "fast", "medium", "slow", "slower", "veryslow"]
   
   ÁUDIO:
   - Codec: select ["AAC", "MP3", "PCM (WAV)"]
   - Taxa de amostragem: select ["44100 Hz", "48000 Hz", "96000 Hz"]
   - Bitrate Áudio (kbps): number input
   
   QUALIDADE:
   - VMAF Mínimo: slider 0-100 + número (default 85)
   - LUFS Alvo: select ["-23 LUFS (Broadcast)", "-16 LUFS (Streaming)", "-14 LUFS (Podcast/Social)"]
   - True Peak (dBTP): number input (ex: -1)
   
   RODAPÉ DO PAINEL:
   - Botão "Guardar" azul (disabled se is_system=true)
   - Botão "Cancelar" ghost
   - On Guardar: `invoke('create_profile', { profile })` ou `invoke('update_profile', { id, profile })`

LÓGICA:
- `invoke<TranscodeProfile[]>('list_profiles')` — busca todos os perfis
- Perfis do sistema vêm primeiro, depois os personalizados
- Ao duplicar: cria novo perfil com nome "Cópia de [nome]" e is_system=false
- Ao apagar: `invoke('delete_profile', { id })` + confirmação

Gera o ficheiro completo. `export default function ProfilesPage()`.

---FIM DA PROMPT PARA ANTIGRAVITY---
```

### O que verificar depois:
- [ ] Os 6 perfis aparecem na grelha
- [ ] Os perfis do sistema têm o cadeado
- [ ] O painel lateral de edição abre e fecha
- [ ] O formulário tem todos os campos

---

## 9. ECRÃ 6 — Registos do Sistema

### O que é este ecrã?
Mostra todos os registos (logs) do sistema em tempo real.  
Útil para perceber o que está a acontecer internamente ou diagnosticar problemas.

### Ficheiro a criar:
`src/pages/LogsPage.tsx` ← **ficheiro novo**

---

```
---INÍCIO DA PROMPT PARA ANTIGRAVITY---

Cria um ficheiro novo LogsPage.tsx para o Nexora Desktop.

CONTEXTO:
- Tauri 2 + React 19 + TypeScript + Tailwind CSS
- Tema escuro: fundo #0a0d14, cards #141824, bordas #1e2433
- Já existe o componente LogViewer em `@/components/LogViewer`
- Já existe o hook `useLogs` em `@/hooks/useLogs`

INTERFACE DE LOG (já definida no projecto, usa esta):
```typescript
interface LogEntry {
  id: number;
  ts: string;        // timestamp ISO
  level: 'debug' | 'info' | 'warn' | 'error';
  source: string;    // ex: "sidecar", "tauri", "ffmpeg", "app"
  message: string;
}

interface LogStats {
  total: number;
  errors: number;
  warnings: number;
  oldest_ts: string | null;
}
```

ESTRUTURA DO ECRÃ:

1. CABEÇALHO:
   - Título "Registos do Sistema"
   - LINHA DE CHIPS DE ESTADO (atualiza automaticamente):
     * "Total: X" cinzento
     * "Erros: X" vermelho (só se X > 0)
     * "Avisos: X" amarelo (só se X > 0)
   - BOTÕES no canto direito:
     * "Exportar" (ícone Download) — exporta para ficheiro .txt via `invoke('export_logs', { path })`
     * "Limpar" (ícone Trash, cinzento) — `invoke('clear_logs')` com confirmação

2. BARRA DE FILTROS (linha horizontal, abaixo do cabeçalho):
   - Input de PESQUISA (ícone lupa): filtra por texto na mensagem
   - FILTRO DE NÍVEL (segmented control ou dropdown):
     "Todos" | "DEBUG" | "INFO" | "WARN" | "ERROR"
   - FILTRO DE FONTE (dropdown):
     "Todas" | "sidecar" | "tauri" | "ffmpeg" | "app"
   - PERÍODO (dropdown):
     "Última hora" | "Últimas 6h" | "Últimas 24h" | "7 dias" | "Tudo"
   - TOGGLE "Auto-scroll": switch pequeno, ON por defeito

3. TABELA DE LOGS (ocupa o restante da altura disponível, com scroll):
   Colunas: Hora | Nível | Fonte | Mensagem
   
   - HORA: monospace, formato "HH:MM:SS.ms" em texto cinzento-400
   - NÍVEL: badge pill colorido:
     * DEBUG → cinzento escuro
     * INFO → azul escuro
     * WARN → amarelo escuro
     * ERROR → vermelho escuro
   - FONTE: tag pequena monospace (ex: `sidecar`, `ffmpeg`)
   - MENSAGEM: texto que pode ter múltiplas linhas
     Se ERROR: borda esquerda vermelha na linha
     Se WARN: borda esquerda amarela na linha
   - HOVER: fundo ligeiramente mais claro
   
   Linhas mais recentes aparecem em baixo (scroll to bottom automático se auto-scroll ON)
   Novas linhas aparecem com animação fade-in suave
   
   Cada linha de ERROR é expansível: click revela stack trace (se disponível) em caixa monospace

4. ESTADO VAZIO:
   - Ícone ScrollText centrado
   - "Sem registos encontrados"
   - Se há filtros activos: "Tenta remover os filtros"

LÓGICA:
- Usa o hook `useLogs` existente que já faz o fetch inicial e subscreve eventos em tempo real
- Filtragem feita no frontend sobre os logs recebidos
- Auto-scroll: ref no elemento da lista, scroll to bottom quando novo log chega (se toggle ON)
- Exportar: formata logs como texto e usa `save` dialog do Tauri para guardar

ESTILO:
- Tabela: fundo #0a0d14, sem bordas nas células, apenas padding
- Monospace font: `font-mono text-xs` para timestamp e source
- Linhas de erro: `border-l-2 border-red-500 pl-2`
- Linhas de warn: `border-l-2 border-yellow-500 pl-2`

Gera o ficheiro completo. `export default function LogsPage()`.

---FIM DA PROMPT PARA ANTIGRAVITY---
```

### O que verificar depois:
- [ ] A tabela de logs aparece
- [ ] Os filtros de nível funcionam visualmente
- [ ] O toggle de auto-scroll existe
- [ ] As cores dos níveis estão correctas

---

## 10. ECRÃ 7 — Definições

### O que é este ecrã?
Onde configuras o Nexora: pasta de saída, número de jobs simultâneos, GPU, notificações, etc.

### Ficheiro a modificar:
`src/pages/SettingsPage.tsx`

---

```
---INÍCIO DA PROMPT PARA ANTIGRAVITY---

Reescreve o ficheiro SettingsPage.tsx para o Nexora Desktop.

CONTEXTO:
- Tauri 2 + React 19 + TypeScript + Tailwind CSS
- Tema escuro: fundo #0a0d14, cards #141824, bordas #1e2433, azul #1A6FD4
- Já existe o store `useSettingsStore` de `@/store/settings`
- Já existe o componente `LogViewer` de `@/components/LogViewer`
- Já existe o hook `useGPU` de `@/hooks/useGPU`

INTERFACE DE SETTINGS:
```typescript
interface Settings {
  output_dir: string;
  max_concurrent_jobs: number;  // 1-4
  gpu_acceleration: boolean;
  notifications_enabled: boolean;
  theme: 'system' | 'light' | 'dark';
  language: 'pt' | 'en';
  default_profile: string;
  vmaf_threshold: number;
  target_lufs: number;
}

interface InstalledInfo {
  ffmpeg_version: string | null;
  nodejs_version: string | null;
  gpu_name: string | null;
  db_path: string;
  app_version: string;
}
```

ESTRUTURA DO ECRÃ:
Container centrado, max-width 800px, com scroll vertical.

SECÇÃO 1 — "Processamento" (card):
- PASTA DE SAÍDA:
  Label "Pasta de saída"
  Row: input readonly mostrando o caminho actual + botão "Escolher pasta" (ícone FolderOpen)
  Clicar "Escolher pasta" → `open({ directory: true })` do @tauri-apps/plugin-dialog
  Abaixo: caminho em monospace cinzento + link "Abrir" que abre no explorador
  On change: `invoke('update_settings', { key: 'output_dir', value: path })`

- JOBS SIMULTÂNEOS:
  Label "Jobs simultâneos"
  Slider 1-4 com marcas em 1, 2, 3, 4
  Label dinâmica: "1 job de cada vez" / "2 jobs em paralelo" / etc.
  Helper text: "Mais jobs = mais CPU e RAM utilizados"
  On change: `invoke('update_settings', { key: 'max_concurrent_jobs', value: n })`

- PERFIL PADRÃO:
  Label "Perfil padrão para novos ficheiros"
  Select com os 6 perfis disponíveis
  On change: guarda no store e `invoke`

SECÇÃO 2 — "Qualidade" (card):
- VMAF MÍNIMO: slider 0-100 + campo numérico + helper "Jobs abaixo deste valor são marcados com aviso"
- LUFS ALVO: select [-23 (Broadcast), -16 (Streaming), -14 (Podcast/Social)]
- TRUE PEAK: number input, default -1

SECÇÃO 3 — "Aceleração de Hardware" (card):
- GPU toggle: "Usar aceleração GPU quando disponível"
  Subtexto dinâmico baseado em useGPU():
  * Se GPU detectada: "GPU detectada: NVIDIA RTX 3080 (NVENC ativo)"
  * Se não: "Sem GPU compatível — a usar CPU (libx264)"
  Nota informativa: "Desliga para forçar processamento CPU (pode ser necessário para compatibilidade)"

SECÇÃO 4 — "Notificações" (card):
- "Notificações do sistema" toggle → notifica quando job conclui ou dá erro
- "Som de conclusão" toggle

SECÇÃO 5 — "Interface" (card):
- TEMA: segmented control de 3 opções: [Sistema | Claro | Escuro]
  On change: aplica imediatamente
- IDIOMA: select [Português (Portugal) | English]

SECÇÃO 6 — "Sobre" (card):
- Logo Nexora + "Nexora Media Processing" + "Desktop Edition"
- Versão: "v0.6.0" em badge
- CHANGELOG (accordion expansível):
  Busca via `invoke<string>('get_changelog')` — retorna texto markdown simples
  Mostra as primeiras 500 chars com botão "Ver mais"
- Row de botões: "Verificar Actualizações" (azul) + "Abrir Dados" (secondary, abre pasta BD)

SECÇÃO 7 — "Sistema" (card, colapsável por defeito):
  Info técnica via `invoke<InstalledInfo>('get_installed_info')`:
  - FFmpeg: versão instalada ou "Não encontrado"
  - Node.js: versão
  - GPU: nome ou "CPU only"
  - Base de dados: caminho do ficheiro .db

SECÇÃO 8 — "Avançado" (card, colapsável, fundo ligeiramente mais escuro):
- "Limpar base de dados" → botão vermelho + dialog: "Apaga todos os assets e jobs. Não pode ser desfeito."
- "Exportar definições" → guarda settings.json
- "Importar definições" → carrega settings.json
- "Reiniciar definições" → volta aos defaults

Gera o ficheiro completo. `export default function SettingsPage()`.

---FIM DA PROMPT PARA ANTIGRAVITY---
```

### O que verificar depois:
- [ ] Todas as secções aparecem com cards
- [ ] O slider de jobs simultâneos funciona
- [ ] O selector de tema funciona (muda a aparência)
- [ ] A secção Sobre mostra a versão

---

## 11. Navegação Principal — Actualizar App.tsx

### O que é este passo?
Depois de criar todos os ecrãs, precisas de os "ligar" à navegação da aplicação.  
O App.tsx é o ficheiro que controla o que aparece quando carregas em cada item do menu.

### Ficheiro a modificar:
`src/App.tsx`

---

```
---INÍCIO DA PROMPT PARA ANTIGRAVITY---

Reescreve o ficheiro App.tsx do Nexora Desktop para incluir os 7 novos ecrãs.

CONTEXTO:
- Tauri 2 + React 19 + TypeScript + Tailwind CSS
- A navegação usa estado React simples (sem React Router — é uma aplicação nativa)
- Os ecrãs existem como componentes importados de src/pages/

PÁGINAS DISPONÍVEIS (importa todas):
- DashboardPage de '@/pages/DashboardPage'
- LibraryPage de '@/pages/LibraryPage'
- QueuePage de '@/pages/QueuePage'
- AssetDetailPage de '@/pages/AssetDetailPage' (precisa de prop assetId + onBack)
- ProfilesPage de '@/pages/ProfilesPage'
- LogsPage de '@/pages/LogsPage'
- SettingsPage de '@/pages/SettingsPage'

COMPONENTES EXISTENTES (mantém e usa):
- SystemMetricsBar de '@/components/SystemMetricsBar'
- HelpModal de '@/components/HelpModal'

TIPO DA NAVEGAÇÃO:
```typescript
type Page = 'dashboard' | 'library' | 'queue' | 'asset-detail' | 'profiles' | 'logs' | 'settings';
```

ESTADO DA APLICAÇÃO:
```typescript
const [currentPage, setCurrentPage] = useState<Page>('dashboard');
const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
const [showHelp, setShowHelp] = useState(false);
```

ESTRUTURA DO LAYOUT:

SIDEBAR (esquerda, 220px, fixo, fundo #0f1117):
  - Logo "N" em círculo azul + texto "Nexora" em bold branco (topo, 64px de altura)
  - ITENS DE NAVEGAÇÃO (lista vertical, 48px cada):
    * Dashboard (ícone LayoutDashboard) → setCurrentPage('dashboard')
    * Biblioteca (ícone Library) → setCurrentPage('library')
    * Fila (ícone ListVideo) → setCurrentPage('queue')
    * Perfis (ícone Sliders) → setCurrentPage('profiles')
    * Registos (ícone ScrollText) → setCurrentPage('logs')
  - SEPARADOR
  - Item activo: fundo azul-900/30, texto branco, barra azul à esquerda (4px)
  - Item inactivo: texto cinzento-400, hover: fundo branco/5
  - Em baixo da sidebar (posição absoluta bottom):
    * Botão "?" circular cinzento (abre HelpModal)
    * Botão "⚙" (Definições) → setCurrentPage('settings')

ÁREA PRINCIPAL (direita, flex-1, fundo #0a0d14, overflow-y-auto):
  TOPBAR (barra superior, 52px altura, border-bottom #1e2433):
    Esquerda: título da página actual em branco + subtítulo cinzento (varia por página)
    Direita: SystemMetricsBar (CPU/RAM/Rede)
  
  CONTEÚDO (padding 24px, render condicional):
    currentPage === 'dashboard' → <DashboardPage onNavigate={setCurrentPage} onSelectAsset={(id) => { setSelectedAssetId(id); setCurrentPage('asset-detail'); }} />
    currentPage === 'library' → <LibraryPage onSelectAsset={(id) => { setSelectedAssetId(id); setCurrentPage('asset-detail'); }} />
    currentPage === 'queue' → <QueuePage onSelectAsset={(id) => { setSelectedAssetId(id); setCurrentPage('asset-detail'); }} />
    currentPage === 'asset-detail' && selectedAssetId → <AssetDetailPage assetId={selectedAssetId} onBack={() => setCurrentPage('library')} />
    currentPage === 'profiles' → <ProfilesPage />
    currentPage === 'logs' → <LogsPage />
    currentPage === 'settings' → <SettingsPage />

  HelpModal: <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} /> — renderizado fora do conteúdo principal

TÍTULOS DAS PÁGINAS (para a topbar):
```typescript
const PAGE_TITLES: Record<Page, { title: string; subtitle: string }> = {
  'dashboard':    { title: 'Dashboard',                subtitle: 'Visão geral do sistema' },
  'library':      { title: 'Biblioteca',               subtitle: 'Todos os teus assets de vídeo' },
  'queue':        { title: 'Fila de Processamento',    subtitle: 'Jobs activos e histórico' },
  'asset-detail': { title: 'Detalhe do Asset',         subtitle: 'Informação completa do ficheiro' },
  'profiles':     { title: 'Perfis de Codificação',    subtitle: 'Configurações de processamento' },
  'logs':         { title: 'Registos do Sistema',      subtitle: 'Actividade e diagnósticos' },
  'settings':     { title: 'Definições',               subtitle: 'Configuração da aplicação' },
};
```

COMPORTAMENTO ESPECIAL:
- Quando currentPage muda, a área de conteúdo faz scroll para o topo automaticamente
- O item activo na sidebar corresponde sempre à currentPage
- asset-detail não tem item de navegação directa na sidebar (acede-se pela Library/Queue)

Gera o ficheiro completo. `export default function App()`.

---FIM DA PROMPT PARA ANTIGRAVITY---
```

### O que verificar depois:
- [ ] A sidebar aparece à esquerda com os 5 itens
- [ ] Clicar em cada item muda o ecrã principal
- [ ] O ecrã "Detalhe do Asset" só aparece quando há um asset seleccionado
- [ ] O botão de ajuda (?) abre o modal

---

## 12. Ordem de execução recomendada

Faz exactamente nesta ordem para evitar erros:

```
PASSO 1  →  ECRÃ 7 — Definições (SettingsPage) — melhora o que existe
PASSO 2  →  ECRÃ 6 — Registos (LogsPage) — cria novo
PASSO 3  →  ECRÃ 5 — Perfis (ProfilesPage) — cria novo
PASSO 4  →  ECRÃ 3 — Fila (QueuePage) — cria novo
PASSO 5  →  ECRÃ 2 — Biblioteca (LibraryPage) — cria novo
PASSO 6  →  ECRÃ 4 — Detalhe do Asset (AssetDetailPage) — cria novo
PASSO 7  →  ECRÃ 1 — Dashboard (DashboardPage) — melhora o que existe
PASSO 8  →  Navegação (App.tsx) — actualiza por último
```

**Porquê esta ordem?**  
Os ecrãs mais simples primeiro, os mais complexos (que dependem de outros) depois.  
O App.tsx vai por último porque importa todos os outros.

---

## 13. O que o Claude faz em paralelo (backend)

Enquanto tu trabalhas nos ecrãs com o Antigravity, o Claude está a:

### ✅ Corrigir o bug da fila (race condition)
O problema em que múltiplos processos liam o mesmo job ao mesmo tempo está a ser corrigido.

### ✅ Adicionar tabela de perfis personalizados
Assim podes criar/editar/apagar perfis directamente na app.

### ✅ Novos comandos Tauri (para os novos ecrãs funcionarem):

| Comando | O que faz | Usado em |
|---------|-----------|----------|
| `get_queue_stats` | Conta jobs por estado | Fila |
| `retry_job` | Re-processa um job falhado | Fila, Detalhe |
| `get_asset_detail` | Dados completos de um asset | Detalhe |
| `create_profile` | Cria perfil personalizado | Perfis |
| `update_profile` | Modifica um perfil | Perfis |
| `delete_profile` | Apaga perfil personalizado | Perfis |
| `export_logs` | Exporta logs para ficheiro | Registos |
| `get_changelog` | Lê notas de versão | Definições |

### Quando o Claude termina:
Recebes uma mensagem a dizer que o backend está pronto. Nessa altura:
1. Corre `npm run tauri dev` para testar
2. Se houver erros de TypeScript, pede ao Antigravity para os corrigir

---

## 14. Resolução de problemas comuns

### "O Antigravity parou a meio do código"
→ Escreve no chat: `"Continua o código a partir de onde paraste"`

### "Erro vermelho: Cannot find module '@/pages/...'"
→ Verifica se criaste o ficheiro na pasta correcta: `src/pages/`

### "Erro: Property 'X' does not exist on type 'Y'"
→ Escreve: `"Corrige o erro de TypeScript: [copia o erro]"`

### "O ecrã está em branco"
→ Escreve: `"O ecrã está em branco. Verifica se o componente está a exportar correctamente"`

### "A aplicação não arranca após as alterações"
→ No terminal: `npm run typecheck` — copia os erros e pede ao Antigravity para corrigir

### "Preciso de desfazer as alterações do Antigravity"
→ Usa Ctrl+Z no editor, ou no terminal: `git checkout src/pages/NomeDoFicheiro.tsx`

---

*Guia criado em 2026-05-10 por Claude Sonnet 4.6*  
*Para o projecto Nexora Desktop v0.6.0*
