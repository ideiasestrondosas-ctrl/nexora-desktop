# Nexora Desktop — Instrucoes para Agentes IA

> Aplica a todos os agentes: Claude Code, Google Antigravity, OpenCode, e quaisquer outras IAs que trabalhem neste repositorio.

---

## Regra Obrigatoria: Preencher `.session-info.md`

### No INICIO de cada sessao

1. **Verificar** se existe `C:\Dev\nexora-desktop\.session-info.md`
2. **Se nao existir**, criar a partir de `scripts/session-info-template.md`
3. **Preencher imediatamente** a secao `Identidade`:
   - `Agente:` <nome do agente>
   - `Modelo:` <modelo/versao>
   - `Data_Inicio:` <data/hora ISO8601>
   - `Versao:` <versao em desenvolvimento>
   - `Titulo:` <resumo da tarefa>
   - `Descricao:` <objetivo detalhado>

### Durante a sessao

- Adicionar itens em `Alteracoes` em tempo real (nao deixar para o final)
- Actualizar `Ficheiros Alterados` apos cada commit ou grupo de alteracoes
- Anotar `Breaking Changes` imediatamente se ocorrerem
- Anotar `Dependencias` (adicionadas/removidas)

### No FINAL da sessao

- Preencher `Data_Fim`
- Completar `Notas para o proximo agente`
- Este ficheiro e essencial para a automacao do release via `sync.ps1 -Release`

---

## Workflow por Sessao

### Inicio

```bash
cd "C:\Dev\nexora-desktop"
```

1. Ler `PROGRESS-DESKTOP.md`
2. Ler `SYNC-STATE.md`
3. Criar/preencher `.session-info.md`
4. **Aprovar plano** antes de implementar (parar e aguardar confirmacao)

### Fim

1. Actualizar `PROGRESS-DESKTOP.md`
2. Actualizar `SYNC-STATE.md`
3. Completar `.session-info.md`
4. `git add . && git commit -m "feat(desktop): ..."`
5. (Opcional) Correr `scripts/sync.ps1` para push

---

## Convencoes de Commit

Usar conventional commits — o sync.ps1 classifica automaticamente:

- `feat:` → New Features
- `fix:` → Bug Fixes
- `refactor:`, `style:`, `perf:` → Changed
- `docs:` → Documentation
- `build:`, `ci:`, `chore:`, `deps:` → Infrastructure
- `test:` → Infrastructure

---

## Ficheiros de Contexto (Ler antes de trabalhar)

| Ficheiro              | Porque                                          |
| --------------------- | ----------------------------------------------- |
| `PROGRESS-DESKTOP.md` | Estado actual do projecto, fases concluidas     |
| `SYNC-STATE.md`       | Handoff do agente anterior, notas tecnicas      |
| `CLAUDE.md`           | Regras especificas do projeto (se fores Claude) |
| `BOUNDARIES.md`       | Limites de arquitetura e decisoes tecnicas      |

---

## Regras de Acesso

| Caminho                                        | Permissao     |
| ---------------------------------------------- | ------------- |
| `C:\Dev\nexora-desktop\`                       | ESCRITA TOTAL |
| `C:\Dev\Nexora Media Processing\src\workers\`  | LEITURA       |
| `C:\Dev\Nexora Media Processing\src\pipeline\` | LEITURA       |
| `C:\Dev\Nexora Media Processing\arquitetura\`  | LEITURA       |
| `C:\Dev\Nexora Media Processing\.antigravity\` | PROIBIDO      |

---

## Stack Tecnologica

| Camada        | Tecnologia                                     |
| ------------- | ---------------------------------------------- |
| Shell         | Tauri 2.x (Rust)                               |
| Frontend      | React 19 + TypeScript + Tailwind CSS + Zustand |
| Sidecar       | Node.js 20 + TypeScript + esbuild              |
| Base de dados | SQLite via better-sqlite3                      |
| Build CI/CD   | GitHub Actions + Tauri Action                  |

---

## Karpathy Guidelines — Regras de Comportamento

> Derivado das observacoes de Andrej Karpathy sobre erros comuns de LLMs em coding.
> Estas regras complementam o system prompt e as Superpowers skills.
> Fonte: https://github.com/multica-ai/andrej-karpathy-skills

### Merge com Regras Existentes

| Regra Karpathy                                                | Ja existia no system prompt?                              | O que muda                                                                                                    |
| ------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Simplicity First** ("minimum code", "nothing speculative")  | Sim — "Make MINIMAL changes", "keep it stupidly simple"   | Reforco: teste "Would a senior engineer call this overcomplicated?"                                           |
| **Surgical Changes** ("touch only what you must")             | Parcial — "Make MINIMAL changes", "follow existing style" | **Novo:** proibicao explicita de "melhorar" codigo adjacente, comentarios, ou formatting nao relacionados     |
| **Goal-Driven Execution**                                     | Parcial — Superpowers skills (TDD, verification, plans)   | **Novo:** para multi-step tasks, declarar plano com verificacao por passo                                     |
| **Think Before Coding** ("don't assume", "surface tradeoffs") | Parcial — "Ask for clarification if unclear"              | **Novo:** obrigacao de apresentar multiplas interpretacoes, fazer push back, e nomear confusao explicitamente |

### 1. Think Before Coding

**Nao assumir. Nao esconder confusao. Apresentar tradeoffs.**

Antes de implementar:

- **Estado as tuas assuncoes explicitamente.** Se incerto, pergunta — nao adivinhes.
- **Se existirem multiplas interpretacoes, apresenta-as** — nao escolhas em silencio.
- **Se existir uma abordagem mais simples, diz.** Faz push back quando justificado.
- **Se algo estiver confuso, para.** Nomeia o que esta confuso. Pergunta.

### 2. Simplicity First

**Minimo de codigo que resolve o problema. Nada especulativo.**

- Sem funcionalidades alem do que foi pedido.
- Sem abstracoes para codigo de uso unico.
- Sem "flexibilidade" ou "configurabilidade" que nao foi pedida.
- Sem error handling para cenarios impossiveis.
- Se escreves 200 linhas e podiam ser 50, reescreve.

**Teste:** Um senior engineer diria que isto esta overcomplicated? Se sim, simplifica.

### 3. Surgical Changes

**Toca apenas no que deves. Limpa apenas a tua propria confusao.**

Ao editar codigo existente:

- **Nao "melhores" codigo, comentarios, ou formatting adjacentes** que nao estejam relacionados com o pedido.
- **Nao facas refactor de coisas que nao estao partidas.**
- **Respeita o estilo existente,** mesmo que o farias diferente.
- **Se notares dead code nao relacionado, menciona-o** — nao o apagues a menos que seja pedido.

Quando as tuas alteracoes criam orfaos (imports/variaveis/funcoes nao usadas):

- **Remove-os se foram CRIADOS pelas tuas alteracoes.**
- **Nao removes dead code pre-existente** a menos que seja explicitamente pedido.

**Teste:** Cada linha alterada deve rastrear directamente ao pedido do utilizador.

### 4. Goal-Driven Execution

**Define criterios de sucesso. Itera ate verificar.**

Transforma tarefas imperativas em objectivos declarativos verificaveis:

| Em vez de...         | Transforma em...                                          |
| -------------------- | --------------------------------------------------------- |
| "Adiciona validacao" | "Escreve testes para inputs invalidos, depois faz passar" |
| "Corrige o bug"      | "Escreve um teste que reproduz o bug, depois corrige"     |
| "Refactor X"         | "Garante que os testes passam antes e depois"             |

Para tarefas multi-passos, declara um plano breve:

```
1. [Passo] -> verificar: [check]
2. [Passo] -> verificar: [check]
3. [Passo] -> verificar: [check]
```

Criterios de sucesso fortes permitem iteracao independente. Criterios fracos ("faz funcionar") exigem clarificacao constante.

---

**Tradeoff:** Estas guidelines favorecem cautela sobre velocidade. Para tarefas triviais (typos, one-liners), usar bom senso — nem toda a alteracao precisa do rigor completo.

---

_Ultima revisao: Maio 2026 — Workspace: C:\Dev\nexora-desktop_
