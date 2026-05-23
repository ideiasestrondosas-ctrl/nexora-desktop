# Nexora Desktop — Instruções para Claude Code

## Contexto do Projecto

O **Nexora Desktop** é a versão nativa multiplataforma (Windows/macOS/Linux) do Nexora Media Processing.
Após migração, o seu workspace independente ficará em `C:\Dev\nexora-desktop`.

```
C:\Dev\Nexora Media Processing\     ← Projecto base (SOMENTE LEITURA)
└── nexora-desktop\                 ← Pré-migração: ficheiros aqui
    ├── scripts\                    ← Scripts de setup e migração
    └── ...

C:\Dev\nexora-desktop\              ← Workspace final após migração (escrita total)
├── CLAUDE.md
├── BOUNDARIES.md
├── PROGRESS-DESKTOP.md
├── src\, src-tauri\, sidecar\, tests\
└── ...
```

---

## Regras de Acesso

| Caminho                                        | Permissão                 |
| ---------------------------------------------- | ------------------------- |
| `C:\Dev\nexora-desktop\` (pós-migração)        | ✅ ESCRITA TOTAL          |
| `C:\Dev\Nexora Media Processing\src\workers\`  | 👁️ LEITURA — referência   |
| `C:\Dev\Nexora Media Processing\src\pipeline\` | 👁️ LEITURA — referência   |
| `C:\Dev\Nexora Media Processing\arquitetura\`  | 👁️ LEITURA — documentação |
| `C:\Dev\Nexora Media Processing\.antigravity\` | 🚫 PROIBIDO — nunca tocar |
| Todo o resto do projecto base                  | 🚫 PROIBIDO modificar     |

---

## Stack Tecnológica

| Camada        | Tecnologia                                     |
| ------------- | ---------------------------------------------- |
| Shell nativa  | Tauri 2.x (Rust stable)                        |
| Frontend      | React 19 + TypeScript + Tailwind CSS + Zustand |
| Sidecar       | Node.js 20 + TypeScript + esbuild              |
| Base de dados | SQLite via better-sqlite3                      |
| Build CI/CD   | GitHub Actions + Tauri Action                  |
| Plataformas   | Windows x64 · macOS Universal · Linux x64      |

---

## Convenções de Código (Imutáveis)

- **TypeScript strict** — sem `any` implícito em nenhuma circunstância
- **Código em inglês**, comentários em **português de Portugal**
- Imports absolutos: `@/components/`, `@/hooks/`, `@/store/`
- IDs: UUID v4 (`crypto.randomUUID()`)
- Erros: typed (`catch(e: unknown)`)
- FFmpeg: **sempre** `execFile` com array — **NUNCA** `exec` com string
- Parâmetros broadcast: `-g [fps*2] -keyint_min [fps*2] -sc_threshold 0 -flags +cgop -bf 0 -pix_fmt yuv420p -movflags +faststart`

---

## Workflow por Sessão

### Início

```bash
cd "C:\Dev\nexora-desktop"   # após migração
claude
```

1. Lê `PROGRESS-DESKTOP.md`
2. Lê `SYNC-STATE.md`
3. **Aprovação de Plano**: Após gerar um plano, **PARA** e aguarda aprovação explícita ("Pode prosseguir").

### Fim

1. Actualiza `PROGRESS-DESKTOP.md`
2. Actualiza `SYNC-STATE.md`
3. `git add . && git commit -m "feat(desktop): ..."`

---

## ADRs Desktop (Imutáveis)

| ADR  | Decisão                               |
| ---- | ------------------------------------- |
| D001 | Tauri 2.x (não Electron)              |
| D002 | Node.js sidecar para media            |
| D003 | SQLite (sem PostgreSQL)               |
| D004 | Fila em memória + SQLite (sem Redis)  |
| D005 | Orchestrator local (sem Temporal.io)  |
| D006 | Binários incluídos no instalador      |
| D007 | GPU auto-detectada                    |
| D008 | Notificações nativas do SO            |
| D009 | Auto-updater Tauri built-in           |
| D010 | Mesmos parâmetros FFmpeg que servidor |
| D011 | IPC via Tauri Commands (sem HTTP)     |
| D012 | Deep links `nexora://`                |

---

## Regra Obrigatoria: Preencher `.session-info.md`

Antes de comecar qualquer sessao de desenvolvimento no Nexora Desktop:

1. **Verificar** se `.session-info.md` existe no root do projeto (`C:\Dev\nexora-desktop\.session-info.md`)
2. **Se nao existir**, criar a partir do template em `scripts/session-info-template.md`
3. **Preencher imediatamente** a secao `Identidade`:
   - `Agente:` Claude Code
   - `Modelo:` <modelo actual, ex: claude-sonnet-4-6>
   - `Data_Inicio:` <data/hora actual ISO8601>
   - `Versao:` <ver package.json ou versao em desenvolvimento>
   - `Titulo:` <resumo curto da tarefa desta sessao>
   - `Descricao:` <descricao mais detalhada do objetivo>

Durante a sessao:

- **Adicionar itens** nas seccoes `Alteracoes` conforme se implementa (nao acumular para o final)
- **Actualizar `Ficheiros Alterados`** apos cada commit ou grupo de alteracoes
- Se houver **breaking changes**, anotar imediatamente na secao correspondente
- Se houver **novas dependencias**, anotar na secao `Dependencias`

No final da sessao:

- Preencher `Data_Fim`
- Completar `Notas para o proximo agente` com contexto essencial
- Garantir que o sync.ps1 podera gerar um release completo a partir deste ficheiro

> **IMPORTANTE:** O `sync.ps1` (opcao 3, modo Release) le este ficheiro para gerar o CHANGELOG, release-notes e SYNC-STATE automaticamente. Sem isto, o release fica incompleto e o agente seguinte perde contexto.

---

## Karpathy Guidelines — Regras de Comportamento (Sempre Activas)

### 1. Pensar Antes de Codificar

- Enunciar pressupostos antes de implementar. Se incerto, perguntar.
- Se existirem múltiplas interpretações válidas, apresentá-las — nunca escolher silenciosamente.
- Se houver uma abordagem mais simples, dizê-lo e questionar.
- Se algo não estiver claro, parar. Nomear o que está confuso. Perguntar.

### 2. Simplicidade Primeiro

- Código mínimo que resolve o problema. Nada especulativo.
- Sem features além do pedido explicitamente.
- Sem abstrações para código de uso único.
- Sem error handling para cenários impossíveis.
- Se 50 linhas chegam, não escrever 200.

### 3. Alterações Cirúrgicas

- Tocar apenas o que é necessário. Limpar apenas o lixo próprio.
- Não "melhorar" código adjacente, comentários ou formatação não relacionados.
- Manter o estilo existente, mesmo que se prefira outro.
- Se se notar dead code não relacionado, mencionar — não apagar silenciosamente.
- Remover apenas imports/variáveis/funções que AS PRÓPRIAS alterações tornaram unused.

### 4. Execução Orientada a Objectivos

- Transformar tarefas imperativas em critérios verificáveis.
- Para tarefas multi-passo, enunciar um plano com verify steps antes de começar.
- "Corrigir o bug" → "Escrever teste que o reproduz, depois fazê-lo passar."

---

_Ultima revisão: Maio 2026 — Workspace: C:\Dev\nexora-desktop_
