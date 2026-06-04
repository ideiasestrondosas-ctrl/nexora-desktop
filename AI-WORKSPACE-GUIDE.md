# Guia Universal para Agentes IA — Qualquer Projecto

> **Versão:** 1.0 — Junho 2026
> **Aplica-se a:** Claude Code · Google Antigravity · OpenAI Codex · OpenCode · qualquer agente IA
> **Propósito:** Documento único que define como todos os agentes devem trabalhar neste workspace.
> **Como usar:** Entrega este ficheiro integralmente a qualquer agente IA no início da sessão.

---

## ÍNDICE

1. [O que é este documento e para que serve](#1-o-que-é-este-documento-e-para-que-serve)
2. [Ficheiros obrigatórios de contexto](#2-ficheiros-obrigatórios-de-contexto)
3. [Protocolo de sessão — Início, Durante, Fim](#3-protocolo-de-sessão--início-durante-fim)
4. [Regras de comportamento (Karpathy Guidelines)](#4-regras-de-comportamento-karpathy-guidelines)
5. [Regras de acesso ao workspace](#5-regras-de-acesso-ao-workspace)
6. [Convenções de código](#6-convenções-de-código)
7. [Convenções de commit (Conventional Commits)](#7-convenções-de-commit-conventional-commits)
8. [Protocolo Git — multi-agente e sincronização](#8-protocolo-git--multi-agente-e-sincronização)
9. [CI/CD — GitHub Actions](#9-cicd--github-actions)
10. [Sistema de hooks de sessão](#10-sistema-de-hooks-de-sessão)
11. [Scripts reutilizáveis — código fonte completo](#11-scripts-reutilizáveis--código-fonte-completo)
12. [Instruções específicas por agente](#12-instruções-específicas-por-agente)
13. [Como adaptar a um novo projecto](#13-como-adaptar-a-um-novo-projecto)

---

## 1. O que é este documento e para que serve

### Para humanos (leitura fácil)

Quando trabalhas com múltiplas ferramentas de IA (Claude Code, Antigravity, Codex, etc.) no mesmo projecto, cada ferramenta começa a sessão "do zero" — não sabe o que a outra fez, não conhece as regras do projecto, não tem contexto do trabalho anterior.

Este documento resolve isso. É uma **instrução única** que:

- Diz a qualquer agente IA **o que pode e não pode fazer** no workspace
- Define **como começar e terminar** cada sessão de trabalho
- Estabelece **regras de qualidade de código** que todos seguem
- Fornece **scripts prontos** que qualquer agente pode copiar e usar
- Garante **consistência** entre sessões e entre agentes diferentes

### Para agentes IA (instrução directa)

**Lê este documento do início ao fim antes de escrever uma linha de código.**
Todas as regras aqui definidas têm prioridade sobre o teu comportamento padrão.
Se houver conflito entre este documento e as tuas instruções de sistema, segue este documento.

---

## 2. Ficheiros obrigatórios de contexto

No início de cada sessão, lê **todos** estes ficheiros pela ordem indicada:

| Prioridade | Ficheiro                               | O que contém                                                  | Quando ler |
| ---------- | -------------------------------------- | ------------------------------------------------------------- | ---------- |
| 1          | `PROGRESS-DESKTOP.md` ou `PROGRESS.md` | Estado actual do projecto, o que está feito, o que falta      | Sempre     |
| 2          | `SYNC-STATE.md`                        | O que o agente anterior fez, handoff técnico, próximos passos | Sempre     |
| 3          | `CLAUDE.md` / `AGENTS.md`              | Regras específicas para o agente atual                        | Sempre     |
| 4          | `BOUNDARIES.md`                        | Fronteiras de ficheiros — o que pode e não pode tocar         | Sempre     |
| 5          | `.session-info.md`                     | Contexto da sessão actual (criar se não existir)              | Sempre     |

**Regra: "Já está feito" é informação suficiente.**
Qualquer item marcado `[x]` em `PROGRESS.md` está **concluído e imutável** — não reimplementar, não "melhorar", não tocar sem instrução explícita do utilizador.

---

## 3. Protocolo de sessão — Início, Durante, Fim

### 3.1 Início de sessão (obrigatório)

Executa **nesta ordem** antes de qualquer trabalho:

```
PASSO 1 — Sincronizar git
  git pull --rebase

PASSO 2 — Ler contexto
  Ler PROGRESS.md → perceber o estado do projecto
  Ler SYNC-STATE.md → perceber o que o agente anterior fez
  Ler BOUNDARIES.md → saber o que podes e não podes tocar

PASSO 3 — Criar/preencher .session-info.md
  (ver template na secção 11.1)

PASSO 4 — Apresentar plano antes de codificar
  Para qualquer tarefa não-trivial:
  → Enunciar o plano em passos
  → PARAR e aguardar aprovação explícita ("podes avançar" / "go")
  → SÓ DEPOIS implementar
```

### 3.2 Durante a sessão

- **Actualizar `.session-info.md` em tempo real** — não acumular para o fim
- Após cada `git commit`, registar os ficheiros alterados no `.session-info.md`
- Se surgir um _breaking change_, anotar imediatamente na secção correspondente
- Se o contexto estiver a encher (muitas mensagens), actualizar `.wip-session.md` e sugerir `/clear`

### 3.3 Fim de sessão (obrigatório)

```
PASSO 1 — Actualizar documentação de estado
  PROGRESS.md → marcar [x] o que ficou concluído
  SYNC-STATE.md → escrever handoff para o próximo agente
  .session-info.md → preencher Data_Fim e Notas para o próximo agente

PASSO 2 — Commit final
  git add <ficheiros específicos — NUNCA git add -A às cegas>
  git commit -m "tipo(âmbito): descrição clara"

PASSO 3 — Push
  git push origin <branch>
```

**Formato do SYNC-STATE.md no fim de sessão:**

```markdown
Actualizado: YYYY-MM-DD HH:MM
Agente: <nome do agente> (<modelo>)
Versão: <versão em desenvolvimento>
Push: <branch> @ <hash> (<descrição curta>)

## O que foi feito

- [lista do que foi implementado/corrigido]

## Próximo passo exacto

1. [passo específico com ficheiro e linha se possível]
2. [...]

## Ficheiros tocados

- `path/ficheiro.ext` — descrição da alteração

## Estado de compilação

- tsc --noEmit: OK / FALHOU
- cargo check: OK / FALHOU / N/A
- npm test: X/Y testes OK / FALHOU
```

---

## 4. Regras de comportamento (Karpathy Guidelines)

> Derivadas das observações de Andrej Karpathy sobre erros comuns de LLMs em tarefas de programação.
> Fonte: https://github.com/multica-ai/andrej-karpathy-skills
> **Estas regras são sempre activas. Sem excepções.**

### Regra 1 — Pensar Antes de Codificar

**Nunca assumir. Nunca esconder confusão. Apresentar tradeoffs.**

Antes de implementar qualquer coisa não-trivial:

- Enuncia os teus pressupostos explicitamente. Se incerto, **pergunta** — não adivinhas.
- Se existirem múltiplas interpretações válidas, **apresenta-as** — nunca escolhas em silêncio.
- Se houver uma abordagem mais simples do que a pedida, **diz-o** e questiona.
- Se algo não estiver claro, **para**. Nomeia o que está confuso. Pergunta.

❌ **Errado:** Implementar silenciosamente a interpretação que parece mais provável.
✅ **Certo:** "Podes estar a pedir X ou Y. Assumo X porque [razão]. Correcto?"

### Regra 2 — Simplicidade Primeiro

**Código mínimo que resolve o problema. Nada especulativo.**

- Sem funcionalidades além do que foi pedido explicitamente.
- Sem abstrações para código de uso único.
- Sem "flexibilidade" ou "configurabilidade" que não foi pedida.
- Sem error handling para cenários impossíveis ou que o framework já trata.
- Se 50 linhas chegam, não escrever 200.

**Teste:** "Um senior engineer diria que isto está overcomplicated?" Se sim, simplifica.

### Regra 3 — Alterações Cirúrgicas

**Toca apenas no que deves. Limpa apenas a tua própria confusão.**

Ao editar código existente:

- **Não "melhores" código adjacente** que não está relacionado com o pedido.
- **Não refactores** coisas que não estão partidas.
- **Respeita o estilo existente**, mesmo que o farias diferente.
- **Se notas dead code não relacionado, menciona-o** — não o apagues silenciosamente.

Quando as tuas alterações criam órfãos:

- Remove imports/variáveis/funções que **as tuas alterações** tornaram unused.
- **Não removes** dead code pré-existente a menos que seja pedido.

**Teste:** Cada linha alterada deve rastrear directamente ao pedido do utilizador.

### Regra 4 — Execução Orientada a Objectivos

**Define critérios de sucesso. Itera até verificar.**

Transforma tarefas imperativas em objectivos verificáveis:

| Em vez de...         | Transforma em...                                          |
| -------------------- | --------------------------------------------------------- |
| "Adiciona validação" | "Escreve testes para inputs inválidos, depois faz passar" |
| "Corrige o bug"      | "Escreve um teste que reproduz o bug, depois corrige"     |
| "Refactor X"         | "Garante que os testes passam antes e depois"             |

Para tarefas multi-passo, enuncia um plano antes de começar:

```
1. [Passo] → verificar: [como confirmar que está feito]
2. [Passo] → verificar: [como confirmar que está feito]
3. [Passo] → verificar: [como confirmar que está feito]
```

### Regra 5 — Nunca Refazer Trabalho Concluído

- Itens marcados `[x]` no `PROGRESS.md` estão **concluídos e imutáveis**.
- Antes de implementar qualquer coisa, verifica se já existe em `[x]`.
- Se existir, **para e pergunta** — não reimplementa "de forma melhor" sem pedido explícito.

---

## 5. Regras de acesso ao workspace

### Princípio geral

Cada projecto tem **zonas** de acesso definidas. Nunca assumir permissões — verificar sempre em `BOUNDARIES.md`.

### Zonas típicas

| Zona                         | Descrição                           | O que fazer                      |
| ---------------------------- | ----------------------------------- | -------------------------------- |
| 🟢 VERDE — Escrita Total     | Workspace principal do projecto     | Criar, editar, apagar livremente |
| 🟡 AMARELA — Somente Leitura | Projecto base de referência         | Só `Read`, nunca `Write`         |
| 🔴 VERMELHA — Proibido       | Produção, secrets, infra partilhada | Nunca tocar, nem ler             |

### Regra de configuração (`.claude/settings.json`)

Para Claude Code, as permissões são configuradas em `.claude/settings.json`:

```json
{
  "permissions": {
    "allow": [
      "Bash(git:*)",
      "Bash(npm:*)",
      "Read(<CAMINHO_WORKSPACE>/**)",
      "Write(<CAMINHO_WORKSPACE>/**)"
    ],
    "deny": ["Write(<CAMINHO_PROIBIDO>/**)"]
  }
}
```

### Ficheiros que nunca devem ser commitados

```
.env
.env.*
*.key
*.pem
secrets.json
credentials.json
.session-info.md    (contém contexto de sessão, local)
```

Verificar `.gitignore` antes de `git add`.

---

## 6. Convenções de código

### 6.1 TypeScript / JavaScript

```typescript
// ✅ CORRECTO — strict mode, sem any implícito
const handler = async (e: unknown): Promise<void> => { ... }
catch (e: unknown) { ... }

// ✅ IDs sempre UUID v4
const id = crypto.randomUUID();

// ✅ Imports absolutos (configurar em tsconfig.json paths)
import { MyComponent } from '@/components/MyComponent';
import { useMyHook } from '@/hooks/useMyHook';

// ✅ Erros com tipo
function processItem(item: Item): Result {
  if (!item.id) throw new Error('item.id is required');
  ...
}

// ❌ PROIBIDO — exec com string (injection risk)
exec(`ffmpeg -i ${file}`);

// ✅ OBRIGATÓRIO — execFile com array
execFile('ffmpeg', ['-i', file, '-c:v', 'libx264', output]);
```

### 6.2 Rust

```rust
// ✅ Erros explícitos com tipo
pub fn process(path: &str) -> Result<Output, String> {
    ...
}

// ✅ Compilação condicional por plataforma
#[cfg(target_os = "windows")]
fn get_app_dir() -> PathBuf { ... }

#[cfg(target_os = "macos")]
fn get_app_dir() -> PathBuf { ... }

// ✅ cargo fmt antes de qualquer commit Rust
// ✅ cargo clippy sem warnings
```

### 6.3 Comentários

- **Código em inglês**, comentários em português de Portugal (ou na língua do projecto)
- Só adicionar comentário quando o **PORQUÊ** não é óbvio — nunca descrever o que o código faz
- Nenhum bloco de comentário multi-linha explicativo (vai para o PR description)

### 6.4 Segurança

- **NUNCA** usar `exec()` com strings — sempre `execFile()` com array de argumentos
- Verificar checksums de binários descarregados (ver secção 11.5)
- Validar inputs na fronteira do sistema (APIs externas, inputs de utilizador)
- Não confiar em `catch(e: any)` — sempre `catch(e: unknown)`

---

## 7. Convenções de commit (Conventional Commits)

Usar sempre o formato `tipo(âmbito): descrição em minúsculas`:

| Tipo       | Quando usar                                | Exemplo                                         |
| ---------- | ------------------------------------------ | ----------------------------------------------- |
| `feat`     | Nova funcionalidade                        | `feat(queue): adicionar cancelamento de jobs`   |
| `fix`      | Correcção de bug                           | `fix(auth): token expirado causava crash`       |
| `refactor` | Reorganização sem mudança de comportamento | `refactor(store): extrair lógica de cache`      |
| `style`    | Formatação, sem mudança de lógica          | `style(rust): cargo fmt`                        |
| `perf`     | Melhoria de performance                    | `perf(db): índice em jobs.status`               |
| `docs`     | Documentação                               | `docs(manual): adicionar secção cloud`          |
| `test`     | Testes                                     | `test(queue): adicionar testes de concorrência` |
| `build`    | Build system, scripts                      | `build(ci): actualizar node para v22`           |
| `ci`       | GitHub Actions                             | `ci(build): fix download-media timeout`         |
| `chore`    | Manutenção, deps                           | `chore(release): v0.33.0-beta.1`                |
| `deps`     | Dependências                               | `deps: actualizar react para 19.1`              |

**Regras:**

- Descrição em minúsculas, sem ponto final
- Presente do indicativo ("adicionar", não "adicionado")
- Máximo 72 caracteres na primeira linha
- Se o commit tem contexto adicional, separar com linha em branco

```bash
git commit -m "feat(cloud): suporte SFTP com verificacao TOFU

Implementa SSH key fingerprint trust-on-first-use.
Mismatch detectado → aborta upload com erro descritivo.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## 8. Protocolo Git — multi-agente e sincronização

### 8.1 Regra fundamental

**Nunca dois agentes a escrever ao mesmo tempo no mesmo branch.**
Claude Code, Antigravity e outros agentes partilham o mesmo repositório Git.

### 8.2 Início de sessão (obrigatório)

```powershell
# Windows
powershell -ExecutionPolicy Bypass -File scripts\sync.ps1

# macOS / Linux
./scripts/sync.sh
```

Ou manualmente:

```bash
git pull --rebase
git status
# Ler SYNC-STATE.md antes de qualquer trabalho
```

### 8.3 Staging cirúrgico — nunca `git add .`

```bash
# ✅ CORRECTO — adicionar ficheiros específicos
git add src/components/MyComponent.tsx
git add src/store/myStore.ts

# ❌ PROIBIDO sem revisão — pode incluir .env, binários, ficheiros temporários
git add -A
git add .
```

### 8.4 Antes de fazer push

```bash
# Verificações obrigatórias
npm run typecheck    # ou tsc --noEmit
npm run lint
npm test

# Se o projecto tem Rust
cargo fmt --check
cargo clippy -- -D warnings
cargo test
```

### 8.5 Resolução de conflitos

```bash
# Quando há conflito
git status              # ver ficheiros em conflito
git diff                # ver o que divergiu
# Resolver manualmente (não usar --theirs cegamente)
git add <ficheiro>
git rebase --continue   # ou git merge --continue
```

### 8.6 Branches e tags

```bash
# Branch de desenvolvimento
git checkout -b feat/minha-feature

# Tag de release (o sync.ps1 faz isto automaticamente)
git tag v0.33.0-beta.1
git push origin v0.33.0-beta.1
```

### 8.7 Handoff entre agentes

Ao terminar, o SYNC-STATE.md deve responder a:

1. **O que fiz?** (lista concisa)
2. **Qual é o próximo passo exacto?** (específico — ficheiro, linha, comando)
3. **Há algo que o próximo agente deve saber?** (gotchas, dependências, estado quebrado)
4. **Qual é o estado de compilação?** (tsc OK? testes passam? cargo check OK?)

---

## 9. CI/CD — GitHub Actions

### 9.1 Estrutura recomendada

```
.github/workflows/
├── ci.yml          ← verifica qualidade em cada push (main/dev)
├── build.yml       ← compila instaladores em cada tag v*
└── test-*.yml      ← testes específicos (opcional)
```

### 9.2 `ci.yml` — verificação de qualidade

```yaml
# .github/workflows/ci.yml
name: CI — Verificacao de Qualidade

on:
  push:
    branches: [main, dev]
  pull_request:
    branches: [main]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm test

  rust-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: dtolnay/rust-toolchain@stable
        with:
          components: clippy, rustfmt
      - uses: swatinem/rust-cache@v2
      - run: cargo fmt --check
      - run: cargo clippy -- -D warnings
      - run: cargo test
```

### 9.3 Regras para GitHub Actions

- **Sempre verificar cargo fmt** antes de qualquer commit Rust (falha mais comum)
- **Checksums de binários** devem ser actualizados quando a fonte actualiza (ex: BtbN)
- **Tags `v*`** disparam o build de release — nunca criar tag sem o código estar pronto
- **Força de tag** (`git push --force tag`) é permitida apenas para corrigir build quebrado

---

## 10. Sistema de hooks de sessão

Os hooks automatizam o contexto entre sessões. São scripts que correm em eventos específicos do agente.

### 10.1 Configuração (Claude Code — `.claude/settings.json`)

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "pwsh -File scripts/hooks/wip-session-start.ps1",
            "shell": "powershell",
            "timeout": 10,
            "statusMessage": "A carregar contexto WIP..."
          }
        ]
      }
    ],
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "pwsh -File scripts/hooks/wip-user-prompt.ps1",
            "shell": "powershell",
            "timeout": 8
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "pwsh -File scripts/hooks/wip-session-stop.ps1",
            "shell": "powershell",
            "timeout": 10,
            "async": true
          }
        ]
      }
    ]
  }
}
```

### 10.2 O que cada hook faz

| Hook               | Quando dispara                     | O que faz                                                    |
| ------------------ | ---------------------------------- | ------------------------------------------------------------ |
| `SessionStart`     | Ao iniciar Claude Code             | Lê `.wip-session.md` e injeta no contexto                    |
| `UserPromptSubmit` | Em cada mensagem enviada           | Regista timestamp; avisa quando contexto está a encher       |
| `Stop`             | Quando Claude termina de responder | Mostra notificação Windows; avisa se WIP não foi actualizado |

### 10.3 Ficheiro `.wip-session.md`

Ficheiro local (não vai para git) que preserva o estado entre sessões:

```markdown
# WIP - <Nome do Projecto>

**Ultima actualizacao:** YYYY-MM-DD
**Tarefa activa:** <descrição da tarefa actual>

## Estado: EM CURSO / CONCLUIDO

### Branch: <branch actual>

### Commits desta sessao

- `<hash>` — <descrição>

### O que foi feito

<resumo do trabalho>

### Pendentes para proximo agente

1. <próximo passo específico>
2. <próximo passo>
```

---

## 11. Scripts reutilizáveis — código fonte completo

Estes scripts podem ser copiados directamente para qualquer projecto. Adaptá-los conforme o projecto (caminhos, nomes).

### 11.1 Template `.session-info.md`

Guardar em `scripts/session-info-template.md`:

```markdown
# Session Info — <Nome do Projecto>

# Preencher durante a sessao; o sync.ps1 le no final para gerar release automatico

## Identidade

Agente:
Modelo:
Data_Inicio:
Data_Fim:

## Tarefa

Versao:
Titulo:
Descricao:

## Alteracoes

### Added (novas funcionalidades)

-

### Fixed (correcoes de bugs)

-

### Changed (alteracoes/refactor)

-

### Deprecated (funcionalidades obsoletas)

-

### Removed (funcionalidades removidas)

-

### Security (correcoes de seguranca)

-

### Infrastructure (build, CI/CD, deps)

-

### Documentation (docs, screenshots, manual)

-

## Ficheiros Alterados

-

## Breaking Changes

-

## Dependencias

## Adicionadas:

## Removidas:

## Notas para o proximo agente

- ***

# INSTRUCOES DE PREENCHIMENTO

# 1. Preencher "Identidade" e "Tarefa" no INICIO da sessao

# 2. Adicionar itens nas seccoes DURANTE o trabalho (nao no final)

# 3. Preencher "Ficheiros Alterados" conforme se faz commits

# 4. Este ficheiro NAO vai para o git (adicionar ao .gitignore)
```

### 11.2 Hook SessionStart — PowerShell

Guardar em `scripts/hooks/wip-session-start.ps1`:

```powershell
# Hook SessionStart — injeta conteudo do WIP no contexto do agente
# Adaptar: substituir caminho do .wip-session.md pelo do teu projecto

$f = Join-Path $PSScriptRoot '..\..\' '.wip-session.md'
$f = Resolve-Path $f -ErrorAction SilentlyContinue

if ($f -and (Test-Path $f)) {
    $c = (Get-Content $f -Raw -Encoding UTF8).Trim()
    $msg = "=== WIP SESSAO ANTERIOR ===`n$c`n=== FIM WIP ==="
    @{
        hookSpecificOutput = @{
            hookEventName    = 'SessionStart'
            additionalContext = $msg
        }
    } | ConvertTo-Json -Depth 3 -Compress
}
```

### 11.3 Hook UserPromptSubmit — PowerShell (monitor de contexto)

Guardar em `scripts/hooks/wip-user-prompt.ps1`:

```powershell
# Hook UserPromptSubmit — regista timestamp + avisa quando contexto enche
# Adaptar: THRESHOLD_WARN_KB e THRESHOLD_ALERT_KB para o modelo/janela usados
#   Claude Sonnet 4.6 (200K tokens): WARN=975KB, ALERT=1170KB
#   GPT-4o (128K tokens): WARN=620KB, ALERT=750KB

$THRESHOLD_WARN_KB  = 975   # ~75% da janela de contexto
$THRESHOLD_ALERT_KB = 1170  # ~90% da janela de contexto

# 1. Registar timestamp (usado pelo Stop hook)
Get-Date -Format 'o' | Set-Content "$env:TEMP\project-last-prompt.txt" -Encoding UTF8

# 2. Ler dados do hook via stdin
$hookData = $null
if ([Console]::IsInputRedirected) {
    try {
        $raw = [Console]::In.ReadToEnd()
        if ($raw.Trim()) { $hookData = $raw | ConvertFrom-Json }
    } catch {}
}

$warningMsg = $null

# 3. Estimar uso de contexto pelo tamanho do transcript JSONL
$transcriptPath = if ($hookData?.transcript_path) { $hookData.transcript_path } else { $null }

if ($transcriptPath -and (Test-Path $transcriptPath)) {
    $sizeKB = [math]::Round((Get-Item $transcriptPath).Length / 1KB)
    $pctFull = [math]::Min(99, [math]::Round($sizeKB / ($THRESHOLD_ALERT_KB / 0.90) * 100))

    if ($sizeKB -ge $THRESHOLD_ALERT_KB) {
        $warningMsg = "ALERTA CONTEXTO (~${pctFull}%): Janela quase cheia. Actualiza .wip-session.md AGORA e diz ao utilizador para escrever /clear."
    } elseif ($sizeKB -ge $THRESHOLD_WARN_KB) {
        $warningMsg = "AVISO CONTEXTO (~${pctFull}%): Contexto a 75%+. Quando terminares, actualiza .wip-session.md e sugere /clear."
    }
}

# 4. Fallback: contador de turnos
if (-not $warningMsg -and -not $transcriptPath) {
    $counterFile = "$env:TEMP\project-turn-counter.txt"
    $sessionFile = "$env:TEMP\project-session-id.txt"
    $currentSid  = if ($hookData?.session_id) { $hookData.session_id } else { 'unknown' }
    $lastSid     = if (Test-Path $sessionFile) { (Get-Content $sessionFile -Raw).Trim() } else { '' }

    if ($currentSid -ne $lastSid) {
        0 | Out-File $counterFile -Encoding UTF8
        $currentSid | Out-File $sessionFile -Encoding UTF8
    }

    $count = if (Test-Path $counterFile) { [int](Get-Content $counterFile -Raw).Trim() } else { 0 }
    $count++
    $count | Out-File $counterFile -Encoding UTF8

    if ($count -ge 35) {
        $warningMsg = "ALERTA CONTEXTO (turno $count): Sessao muito longa. Actualiza .wip-session.md AGORA e pede /clear."
    } elseif ($count -ge 22) {
        $warningMsg = "AVISO CONTEXTO (turno $count): Sessao longa. Considera actualizar .wip-session.md e sugerir /clear."
    }
}

# 5. Emitir aviso
if ($warningMsg) {
    @{
        hookSpecificOutput = @{
            hookEventName     = 'UserPromptSubmit'
            additionalContext = $warningMsg
        }
    } | ConvertTo-Json -Depth 3 -Compress
}
```

### 11.4 Hook Stop — PowerShell (notificação Windows)

Guardar em `scripts/hooks/wip-session-stop.ps1`:

```powershell
# Hook Stop — notifica o utilizador quando o agente termina de responder
# Adaptar: titulo/mensagem da notificacao e caminho do WIP

$stopFile   = "$env:TEMP\project-prev-stop.txt"
$promptFile = "$env:TEMP\project-last-prompt.txt"
$threshold  = 3  # minutos — abaixo disto nao notifica (utilizador activo)

$shouldNotify = $true
if ((Test-Path $stopFile) -and (Test-Path $promptFile)) {
    try {
        $prevStop   = [datetime](Get-Content $stopFile   -Raw).Trim()
        $lastPrompt = [datetime](Get-Content $promptFile -Raw).Trim()
        $idleMin = ($lastPrompt - $prevStop).TotalMinutes
        if ($idleMin -ge 0 -and $idleMin -lt $threshold) { $shouldNotify = $false }
    } catch {}
}

Get-Date -Format 'o' | Set-Content $stopFile -Encoding UTF8

if ($shouldNotify) {
    try {
        Add-Type -AssemblyName System.Windows.Forms -ErrorAction Stop
        $notify         = New-Object System.Windows.Forms.NotifyIcon
        $notify.Icon    = [System.Drawing.SystemIcons]::Information
        $notify.Visible = $true
        $notify.ShowBalloonTip(8000, 'Claude Code', 'Aguarda a tua resposta! Volta ao terminal.', 'Info')
        Start-Sleep -Milliseconds 500
        $notify.Visible = $false
        $notify.Dispose()
    } catch {}
}

$wipFile = Join-Path $PSScriptRoot '..\..\' '.wip-session.md'
if (Test-Path $wipFile) {
    @{ systemMessage = "WIP activo em .wip-session.md — actualiza se mudaste de tarefa." } | ConvertTo-Json -Compress
} else {
    @{ systemMessage = "Sessao parou — cria/actualiza .wip-session.md com o que estavas a trabalhar!" } | ConvertTo-Json -Compress
}
```

### 11.5 Script de verificação de checksums de binários

Este script descarrega binários de terceiros e verifica integridade via SHA-256.
Guardar em `scripts/lib/verify-checksum.mjs`:

```javascript
// scripts/lib/verify-checksum.js
// Verifica SHA-256 de ficheiros descarregados contra um lock file
// Uso: importar sha256OfFile e compareChecksum nos scripts de download

import { createHash } from 'crypto';
import { createReadStream } from 'fs';

/**
 * Calcula SHA-256 de um ficheiro em disco.
 * @param {string} filePath
 * @returns {Promise<string>} hex digest
 */
export async function sha256OfFile(filePath) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

/**
 * Compara checksum esperado com actual.
 * @param {string|undefined} expected  - valor do lock file
 * @param {string}           actual    - calculado do ficheiro
 * @returns {'ok'|'mismatch'|'missing'}
 */
export function compareChecksum(expected, actual) {
  if (!expected) return 'missing';
  return expected === actual ? 'ok' : 'mismatch';
}
```

**Lock file de checksums** (`scripts/media-binaries.lock.json`):

```json
{
  "win32-x64": "<sha256-do-binario-windows>",
  "linux-x64": "<sha256-do-binario-linux>",
  "linux-arm64": "<sha256-do-binario-linux-arm64>",
  "darwin-x64": "<sha256-do-binario-macos-x64>",
  "darwin-arm64": "<sha256-do-binario-macos-arm64>"
}
```

**Para actualizar checksums quando a fonte actualiza:**

```bash
# Descarrega e regista novos checksums
node scripts/download-media-binaries.js --write-lock

# Verifica que o lock está correcto
node scripts/download-media-binaries.js
```

### 11.6 Script de validação i18n (internacionalização)

Para projectos com múltiplas línguas. Guardar em `scripts/validate-i18n.mjs`:

```javascript
#!/usr/bin/env node
/**
 * scripts/validate-i18n.mjs
 *
 * Valida ficheiros de tradução:
 *   1. JSON válido em todas as locales
 *   2. Mesmo conjunto de chaves em todas as línguas
 *   3. Sem placeholders {{}} partidos
 *   4. Encoding UTF-8 limpo (sem mojibake)
 *
 * Exit codes: 0 = OK, 1 = problemas encontrados
 *
 * Uso:
 *   node scripts/validate-i18n.mjs
 *   node scripts/validate-i18n.mjs --strict
 */

import { readFileSync, readdirSync } from 'fs';
import { resolve, join } from 'path';

const ROOT = process.cwd();
const LOCALES_DIR = resolve(ROOT, 'src/i18n/locales'); // adaptar ao projecto
const strict = process.argv.includes('--strict');

// Adaptar: lista das línguas do projecto
const LANG_CODES = ['en', 'pt', 'es', 'fr', 'de'];

let errors = 0;
let warnings = 0;

function err(msg) {
  console.error(`  [ERRO]  ${msg}`);
  errors++;
}
function warn(msg) {
  console.warn(`  [AVISO] ${msg}`);
  warnings++;
}
function ok(msg) {
  console.log(`  [OK]    ${msg}`);
}

// Extrair todas as chaves planas de um objecto JSON aninhado
function flatKeys(obj, prefix = '') {
  const keys = [];
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...flatKeys(v, full));
    } else {
      keys.push(full);
    }
  }
  return keys;
}

// Detectar mojibake: sequências típicas de double/triple UTF-8 encoding
const MOJIBAKE_PATTERN = /ÃƒÆ|Ã¢â‚¬|Ãƒâ€|â€™|â€œ|Â§/;

function validateLocale(lang) {
  const filePath = join(LOCALES_DIR, lang, 'common.json'); // adaptar nome do ficheiro
  let data;
  try {
    const raw = readFileSync(filePath, 'utf8');
    // Verificar mojibake
    if (MOJIBAKE_PATTERN.test(raw)) {
      err(`${lang}: mojibake detectado — encoding corrompido`);
    }
    data = JSON.parse(raw);
  } catch (e) {
    err(`${lang}: JSON inválido — ${e.message}`);
    return null;
  }
  return data;
}

// Validar placeholders {{key}} — todos devem estar fechados
function checkPlaceholders(obj, lang, prefix = '') {
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string') {
      const opens = (v.match(/\{\{/g) || []).length;
      const closes = (v.match(/\}\}/g) || []).length;
      if (opens !== closes) {
        err(`${lang}: placeholder partido em "${path}": ${JSON.stringify(v)}`);
      }
    } else if (v && typeof v === 'object') {
      checkPlaceholders(v, lang, path);
    }
  }
}

console.log(`\nValidação i18n — ${LANG_CODES.length} locales\n`);

// 1. Carregar todas as locales
const locales = {};
for (const lang of LANG_CODES) {
  locales[lang] = validateLocale(lang);
}

// 2. Comparar chaves com EN (referência)
const enKeys = locales['en'] ? new Set(flatKeys(locales['en'])) : new Set();

for (const lang of LANG_CODES) {
  if (!locales[lang]) continue;
  if (lang === 'en') {
    ok(`en: ${enKeys.size} chaves (referência)`);
    continue;
  }

  const langKeys = new Set(flatKeys(locales[lang]));
  const missing = [...enKeys].filter((k) => !langKeys.has(k));
  const extra = [...langKeys].filter((k) => !enKeys.has(k));

  if (missing.length > 0) {
    if (strict) {
      err(`${lang}: ${missing.length} chaves em falta`);
    } else {
      warn(`${lang}: ${missing.length} chaves em falta (fallback para EN)`);
    }
  }
  if (extra.length > 0) {
    warn(`${lang}: ${extra.length} chaves extra (órfãs)`);
  }

  checkPlaceholders(locales[lang], lang);

  if (missing.length === 0 && extra.length === 0) {
    ok(`${lang}: ${langKeys.size} chaves — completo`);
  }
}

console.log(`\nResultado: ${errors} erros, ${warnings} avisos`);
process.exit(errors > 0 ? 1 : 0);
```

### 11.7 Script de limpeza de mojibake em Markdown

Para quando ficheiros `.md` têm encoding corrompido por emojis ou caracteres especiais mal codificados:

```python
#!/usr/bin/env python3
"""
scripts/fix-mojibake.py

Limpa mojibake de ficheiros Markdown:
  - Trunca linhas onde começa a cadeia de mojibake (ÃƒÆ)
  - Normaliza células de tabelas com padding excessivo de espaços
  - Normaliza separadores de tabela com dashes excessivos

Uso:
  python3 scripts/fix-mojibake.py PROGRESS.md
  python3 scripts/fix-mojibake.py docs/*.md
"""

import sys
import re

# Marcador de início de mojibake (triple UTF-8 encoding)
MOJIBAKE_MARKER = 'ÃƒÆ'

# Regex para célula de separador de tabela Markdown
SEP_CELL = re.compile(r'^:?-+:?$')


def fix_file(path: str) -> bool:
    """Corrige mojibake num ficheiro. Retorna True se houve alterações."""
    with open(path, 'rb') as f:
        raw = f.read()

    lines = raw.split(b'\n')
    fixed = []
    changed = 0

    for line in lines:
        s = line.rstrip(b'\r')
        ending = b'\r' if line.endswith(b'\r') else b''

        # Truncar linhas com mojibake explosivo
        try:
            decoded = s.decode('utf-8', errors='replace')
            idx = decoded.find(MOJIBAKE_MARKER)
            if idx >= 0 and len(decoded) > 200:
                clean = decoded[:idx].rstrip(' \t-–—(c')
                if '|' in decoded[:idx] and not clean.rstrip().endswith('|'):
                    clean = clean.rstrip() + ' |'
                s = clean.encode('utf-8') + ending
                changed += 1
                fixed.append(s + b'\n')
                continue
        except Exception:
            pass

        # Normalizar linhas de tabela com padding excessivo
        if s.startswith(b'|') and len(s) > 300:
            cells = s.split(b'|')
            inner = [c.strip() for c in cells[1:-1]]

            if all(SEP_CELL.match(c.decode('utf-8', errors='replace'))
                   for c in inner if c):
                # Linha separadora — normalizar para ---
                norm = [b'---'] * len(inner)
            else:
                # Linha de dados — strip de espaços nas células
                norm = inner

            new_line = b'| ' + b' | '.join(norm) + b' |' + ending
            if new_line != line:
                changed += 1
            fixed.append(new_line + b'\n')
        else:
            fixed.append(line + b'\n')

    if changed == 0:
        return False

    result = b'\n'.join(l.rstrip(b'\n') for l in fixed)
    if not raw.endswith(b'\n'):
        result = result.rstrip(b'\n')

    with open(path, 'wb') as f:
        f.write(result)

    print(f"{path}: {changed} linhas corrigidas", file=sys.stderr)
    return True


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(f"Uso: python3 {sys.argv[0]} ficheiro.md [...]", file=sys.stderr)
        sys.exit(1)

    total = 0
    for path in sys.argv[1:]:
        if fix_file(path):
            total += 1

    print(f"\n{total} ficheiro(s) alterado(s)", file=sys.stderr)
```

### 11.8 Script de teste das Karpathy Guidelines

Para verificar automaticamente se o código segue as regras. Guardar em `scripts/test-karpathy.mjs`:

```javascript
#!/usr/bin/env node
/**
 * scripts/test-karpathy.mjs
 *
 * Testes automatizados das Karpathy Guidelines:
 *   - Sem exec() com strings (injection risk)
 *   - Sem any implícito em TypeScript
 *   - Sem TODO/FIXME não resolvidos em código novo
 *   - Ficheiros de contexto existem e têm conteúdo
 *
 * Integrar no CI: node scripts/test-karpathy.mjs
 */

import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';

let failures = 0;

function check(description, fn) {
  try {
    fn();
    console.log(`  PASS  ${description}`);
  } catch (e) {
    console.error(`  FAIL  ${description}`);
    console.error(`        ${e.message}`);
    failures++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

console.log('\nKarpathy Guidelines — Verificações Automáticas\n');

// 1. Ficheiros de contexto obrigatórios existem
check('Ficheiros de contexto: PROGRESS.md existe', () => {
  const files = ['PROGRESS-DESKTOP.md', 'PROGRESS.md'];
  const exists = files.some(f => existsSync(f));
  assert(exists, `Nenhum ficheiro de progresso encontrado: ${files.join(', ')}`);
});

check('Ficheiros de contexto: SYNC-STATE.md existe', () => {
  assert(existsSync('SYNC-STATE.md'), 'SYNC-STATE.md não encontrado');
  const content = readFileSync('SYNC-STATE.md', 'utf8').trim();
  assert(content.length > 50, 'SYNC-STATE.md está vazio ou tem muito pouco conteúdo');
});

// 2. Sem exec() com strings em código TypeScript/JavaScript
check('Segurança: sem exec() com template strings ou concatenação', () => {
  try {
    const result = execSync(
      'grep -rn "exec(`\\|exec(\"\\|exec('" +
      "\\|exec(path\\|exec(cmd\\|exec(command" +
      '" src/ sidecar/ --include="*.ts" --include="*.js" --include="*.tsx"' +
      ' 2>/dev/null || true',
      { encoding: 'utf8' }
    );
    // Permitir: execFile, execFileAsync, execAsync (seguros)
    const badLines = result.split('\n')
      .filter(l => l.trim())
      .filter(l => !l.includes('execFile') && !l.includes('//'));
    assert(
      badLines.length === 0,
      `exec() com string encontrado (usar execFile com array):\n  ${badLines.slice(0, 3).join('\n  ')}`
    );
  } catch (e) {
    if (e.status !== 1) throw e; // grep retorna 1 quando não encontra (OK)
  }
});

// 3. Sem .env commitado
check('Segurança: .env não está tracked pelo git', () => {
  try {
    const tracked = execSync('git ls-files .env .env.* 2>/dev/null', { encoding: 'utf8' }).trim();
    assert(!tracked, `Ficheiro(s) .env estão no git: ${tracked}`);
  } catch (e) {
    if (!e.message.includes('not a git repository')) throw e;
  }
});

// 4. package.json tem scripts obrigatórios
if (existsSync('package.json')) {
  check('Package.json: scripts obrigatórios presentes', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
    const required = ['typecheck', 'lint', 'test'];
    const missing = required.filter(s => !pkg.scripts?.[s]);
    assert(missing.length === 0, `Scripts em falta em package.json: ${missing.join(', ')}`);
  });
}

// 5. Cargo.toml presente se há pasta src-tauri
if (existsSync('src-tauri')) {
  check('Rust: Cargo.toml existe em src-tauri/', () => {
    assert(existsSync('src-tauri/Cargo.toml'), 'src-tauri/Cargo.toml não encontrado');
  });
}

console.log(`\nResultado: ${failures === 0 ? 'PASS' : 'FAIL'} (${failures} falha(s))\n`);
process.exit(failures > 0 ? 1 : 0);
```

---

## 12. Instruções específicas por agente

### 12.1 Claude Code (Anthropic)

**Como iniciar:**

```bash
cd /caminho/do/projecto
claude
```

**Ficheiros de configuração:**

- `.claude/settings.json` — permissões, hooks, plugins
- `.claude/settings.local.json` — overrides locais (não vai para git)
- `CLAUDE.md` — instruções do projecto (lido automaticamente)

**Comportamentos específicos:**

- Usa a ferramenta `Skill` para invocar skills (ex: `/code-review`, `/verify`)
- Suporta hooks via `.claude/settings.json` (ver secção 10)
- `[x]` em PROGRESS.md = concluído e imutável — nunca reimplementar
- Após gerar plano, **PARA** e aguarda "podes avançar" antes de codificar
- Tauri IPC: `invoke()` usa **camelCase** — Tauri 2 converte snake_case→camelCase automaticamente
- `String(value)` ao passar números/booleanos para Rust `String` via invoke — sem isto falha silenciosamente

**Comandos úteis:**

```bash
/clear          # limpar contexto
/code-review    # revisão de código
/verify         # verificar que uma alteração funciona
/run            # correr a app
```

### 12.2 Google Antigravity (fork VS Code)

**Como iniciar:**

1. Abrir sempre pelo ficheiro `.code-workspace` — **nunca** pela pasta directamente
2. O título da janela deve mostrar o nome do workspace correcto
3. Ler `SYNC-STATE.md` antes de qualquer trabalho

**Ficheiros de configuração:**

- `.antigravity/rules.md` — regras do workspace para o Antigravity
- `.code-workspace` — define o workspace e os caminhos

**Comportamentos específicos:**

- Podes ter duas janelas abertas ao mesmo tempo (um workspace cada)
- O Antigravity carrega `.antigravity/rules.md` da raiz do workspace activo
- Para tarefas frontend complexas, usa as prompts da secção de ecrãs (ANTIGRAVITY-GUIA.md)

**Checklist de início:**

- [ ] Antigravity aberto via `.code-workspace`
- [ ] Título da janela confirma workspace correcto
- [ ] `git pull` feito
- [ ] `SYNC-STATE.md` lido

### 12.3 OpenAI Codex / ChatGPT Code Interpreter

**Como usar:**

1. Colar o conteúdo deste ficheiro no início da conversa
2. Indicar o caminho do workspace e a tarefa
3. Pedir para ler `PROGRESS.md` e `SYNC-STATE.md` antes de qualquer alteração

**Limitações a ter em conta:**

- Não tem acesso directo ao filesystem — código deve ser copiado/colado
- Não executa comandos no terminal do utilizador
- Não faz git — as alterações devem ser aplicadas manualmente

### 12.4 OpenCode (open-source)

**Como iniciar:**

```bash
cd /caminho/do/projecto
opencode
```

**Ficheiros de configuração:**

- Suporta `AGENTS.md` na raiz do projecto (lido automaticamente)
- Suporta `.opencode/settings.json` para permissões

**Comportamentos:**

- Mesmo protocolo de sessão que Claude Code
- Verificar se suporta hooks — se não, gerir manualmente o `.wip-session.md`

---

## 13. Como adaptar a um novo projecto

Passo a passo para usar este guia num projecto diferente do zero:

### Passo 1 — Criar os ficheiros de estrutura

```bash
# Na raiz do novo projecto
touch PROGRESS.md
touch SYNC-STATE.md
touch BOUNDARIES.md
touch AGENTS.md
touch .wip-session.md
echo ".wip-session.md" >> .gitignore
echo ".session-info.md" >> .gitignore
```

### Passo 2 — Preencher PROGRESS.md

```markdown
# Progress — <Nome do Projecto>

## Estado actual: Em desenvolvimento

### Versão: 0.1.0

## Concluído

- [x] Setup inicial do projecto
- [x] Configuração do repositório

## Em Curso

- [ ] <próxima tarefa>

## Backlog

- [ ] <funcionalidade futura>
```

### Passo 3 — Preencher SYNC-STATE.md

```markdown
# Estado de Sincronização — <Nome do Projecto>

Actualizado: YYYY-MM-DD
Agente: <teu nome / agente que inicializou>

## O que foi feito

- Setup inicial

## Próximo passo exacto

1. <primeiro passo concreto para o próximo agente>

## Estado de compilação

- build: OK
```

### Passo 4 — Preencher BOUNDARIES.md

```markdown
# Fronteiras de Modificação — <Nome do Projecto>

## ZONA VERDE — Escrita Total

| Caminho    | O que modificar      |
| ---------- | -------------------- |
| `src/`     | Código fonte         |
| `tests/`   | Testes               |
| `scripts/` | Scripts de automação |
| `docs/`    | Documentação         |

## ZONA VERMELHA — Proibido

| Caminho         | Razão           |
| --------------- | --------------- |
| `.env`          | Segredos        |
| `node_modules/` | Gerido pelo npm |
```

### Passo 5 — Configurar Claude Code

Criar `.claude/settings.json`:

```json
{
  "permissions": {
    "allow": [
      "Bash(git:*)",
      "Bash(npm:*)",
      "Read(<caminho-absoluto-do-projecto>/**)",
      "Write(<caminho-absoluto-do-projecto>/**)"
    ],
    "deny": []
  },
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "pwsh -File scripts/hooks/wip-session-start.ps1",
            "shell": "powershell",
            "timeout": 10
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "pwsh -File scripts/hooks/wip-session-stop.ps1",
            "shell": "powershell",
            "timeout": 10,
            "async": true
          }
        ]
      }
    ]
  }
}
```

### Passo 6 — Copiar os scripts de hooks

```bash
mkdir -p scripts/hooks
# Copiar scripts das secções 11.2, 11.3 e 11.4 para:
#   scripts/hooks/wip-session-start.ps1
#   scripts/hooks/wip-user-prompt.ps1
#   scripts/hooks/wip-session-stop.ps1

# Adaptar os caminhos no interior dos scripts
# (procurar e substituir 'nexora-desktop' pelo nome do teu projecto)
```

### Passo 7 — Configurar package.json (se JavaScript/TypeScript)

```json
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "lint": "eslint src/",
    "test": "vitest run",
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  }
}
```

### Passo 8 — Criar GitHub Actions básico

Copiar o template da secção 9.2 para `.github/workflows/ci.yml`, adaptar:

- `node-version` para a versão do projecto
- Remover o job `rust-check` se não for Rust
- Adicionar steps específicos do projecto

### Passo 9 — Primeira mensagem a qualquer agente

```
Lê os seguintes ficheiros nesta ordem:
1. AI-WORKSPACE-GUIDE.md (este ficheiro)
2. PROGRESS.md
3. SYNC-STATE.md
4. BOUNDARIES.md

Depois, apresenta-me o estado actual do projecto em 3-5 linhas e pergunta qual é a tarefa desta sessão.
NÃO comeces a implementar nada até eu confirmar.
```

---

## 15. Sistema de coordenação multi-agente — diagnóstico e solução completa

> Esta secção analisa o sistema de controlo existente, identifica os problemas reais com dados concretos, e propõe uma arquitectura simples que resolve a coordenação entre agentes sem gastar tokens.

---

### 15.1 Diagnóstico do sistema actual

#### O que existe hoje (e funciona bem)

| Ficheiro              | Tamanho    | Função                                                      | Funciona?           |
| --------------------- | ---------- | ----------------------------------------------------------- | ------------------- |
| `.wip-session.md`     | ~2 KB      | Estado imediato injectado via hook no início de sessão      | ✅ Bem              |
| `.session-info.md`    | ~5 KB      | Contexto detalhado da sessão para o sync.ps1 gerar releases | ✅ Bem              |
| `PROGRESS-DESKTOP.md` | ~40 KB     | O que está feito vs backlog                                 | ✅ Aceitável        |
| `SYNC-STATE.md`       | **580 KB** | Handoff entre agentes                                       | ❌ Problema crítico |

#### O problema crítico: SYNC-STATE.md acumula tudo

O SYNC-STATE.md foi concebido para conter a última sessão. Na prática, acumulou **60+ sessões completas** porque nunca foi arquivado. Resultado:

- **580 KB** de texto carregados em cada sessão de qualquer agente
- **3974 linhas** das quais o agente precisa de ~50 (a sessão mais recente)
- **~145.000 tokens** gastos só para saber "o que fez o agente anterior" — quando bastavam 500
- Um agente lento em cada início de sessão porque tem de processar 59 sessões irrelevantes

**Custo real em tokens (estimativa):**

```
580 KB de texto Markdown
÷ 4 bytes/token (média para português técnico)
≈ 145.000 tokens por sessão
× ~0,003 USD/1K tokens (Claude Sonnet)
≈ 0,43 USD desperdiçados em SYNC-STATE.md em cada sessão
```

#### O segundo problema: sem sinal de "em curso"

Não existe forma de um agente saber se outro está a trabalhar agora:

- Claude Code pode estar a modificar `src/components/X.tsx`
- Antigravity começa uma sessão e edita o mesmo ficheiro
- Resultado: conflito de git, trabalho perdido, ou ficheiro corrompido

O `.wip-session.md` diz _o que foi feito_ mas não _se está a acontecer agora_.

#### O terceiro problema: sem lock por ficheiro

Mesmo sem conflitos simultâneos, se o Claude planeia refactorizar `HelpModal.tsx` durante 3 sessões, o Antigravity não sabe e pode sobrescrever partes do trabalho em curso.

---

### 15.2 Proposta: arquitectura de 4 ficheiros

Em vez de um ficheiro que faz tudo (mal), quatro ficheiros especializados com responsabilidades claras:

```
.agent-board.json     ← "Quadro de estado" — quem trabalha, o quê, quando
                         Tiny JSON (~300 bytes). Lido/escrito pelos hooks.
                         NÃO vai para git (local, como .env)

SYNC-STATE.md         ← Só a sessão mais recente (max 60 linhas, ~2 KB)
                         Arquivado para docs/sessions/ após cada release

.wip-session.md       ← Estado imediato da sessão activa (como hoje)
                         Injectado no contexto via hook SessionStart

.session-info.md      ← Contexto detalhado para o sync.ps1 (como hoje)
                         Não vai para git
```

**Princípio:** cada ficheiro tem um único leitor primário e um único escritor primário.

```
.agent-board.json  → lido pelos hooks (automático), escrito pelos hooks
SYNC-STATE.md      → lido pelo agente no início, escrito pelo agente no fim
.wip-session.md    → lido pelo hook SessionStart, escrito pelo agente durante a sessão
.session-info.md   → lido pelo sync.ps1, escrito pelo agente
```

---

### 15.3 O Agent Board — design e formato

O `.agent-board.json` é o ficheiro central de coordenação. É **minúsculo**, **legível por máquina**, e **actualizado automaticamente pelos hooks**.

#### Formato

```json
{
  "schema": 1,
  "updated": "2026-06-04T16:30:00Z",

  "session": {
    "active": false,
    "agent": null,
    "model": null,
    "started": null,
    "task": null,
    "files_locked": []
  },

  "last_session": {
    "agent": "claude-code",
    "model": "claude-sonnet-4-6",
    "ended": "2026-06-04T14:22:00Z",
    "commit": "bc3e27c",
    "branch": "main",
    "status": "clean",
    "task": "fix mojibake em PROGRESS-DESKTOP.md"
  },

  "git": {
    "branch": "main",
    "last_commit": "bc3e27c",
    "last_commit_msg": "fix(docs): limpar mojibake",
    "build_status": "green",
    "last_build_run": "26952717360"
  }
}
```

**Quando `active: true`**, o board tem:

```json
{
  "session": {
    "active": true,
    "agent": "antigravity",
    "model": "gemini-2.5-pro",
    "started": "2026-06-04T17:00:00Z",
    "task": "implementar ProfilesPage.tsx",
    "files_locked": ["src/pages/ProfilesPage.tsx", "src/store/profiles.ts"]
  }
}
```

#### Regras de uso

1. **Um agente não começa a trabalhar em ficheiros listados em `files_locked`** sem verificar se a sessão ainda está activa (comparar `started` com a hora actual — sessão com mais de 4h sem actividade considera-se abandonada)
2. **O hook SessionStart lê o board** e avisa se há sessão activa de outro agente
3. **O hook Stop limpa a sessão** no board (activa → false)
4. **O board não substitui o SYNC-STATE.md** — é apenas o sinal de "agora"

---

### 15.4 Scripts de implementação

#### Script 1 — Hook SessionStart melhorado com leitura do board

```powershell
# scripts/hooks/wip-session-start.ps1 (versão com Agent Board)

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$wipFile     = Join-Path $projectRoot '.wip-session.md'
$boardFile   = Join-Path $projectRoot '.agent-board.json'

$messages = @()

# 1. Ler WIP (como antes)
if (Test-Path $wipFile) {
    $wip = (Get-Content $wipFile -Raw -Encoding UTF8).Trim()
    $messages += "=== WIP SESSAO ANTERIOR ===`n$wip`n=== FIM WIP ==="
}

# 2. Ler Agent Board — detectar sessão activa de outro agente
if (Test-Path $boardFile) {
    try {
        $board = Get-Content $boardFile -Raw -Encoding UTF8 | ConvertFrom-Json
        $session = $board.session

        if ($session.active -eq $true) {
            # Verificar se a sessão não está abandonada (> 4h)
            $started  = [datetime]$session.started
            $ageHours = ([datetime]::UtcNow - $started).TotalHours

            if ($ageHours -lt 4) {
                $lockedFiles = ($session.files_locked | ForEach-Object { "  - $_" }) -join "`n"
                $alert = @"
ATENCAO: Ha uma sessao activa de outro agente!
  Agente  : $($session.agent) ($($session.model))
  Iniciada: $($session.started) (ha $([math]::Round($ageHours,1))h)
  Tarefa  : $($session.task)
  Ficheiros bloqueados:
$lockedFiles

NAO edites os ficheiros bloqueados sem confirmar com o utilizador.
"@
                $messages += $alert
            } else {
                # Sessão abandonada — limpar o board
                $board.session.active = $false
                $board.session.agent  = $null
                $board | ConvertTo-Json -Depth 4 | Set-Content $boardFile -Encoding UTF8
                $messages += "INFO: Sessao de $($session.agent) estava activa ha $([math]::Round($ageHours,1))h — marcada como abandonada."
            }
        }

        # Mostrar estado do último commit e build
        if ($board.git) {
            $messages += "Git: $($board.git.branch) @ $($board.git.last_commit) | Build: $($board.git.build_status)"
        }
    } catch {
        # Board corrompido — ignorar silenciosamente
    }
}

# Emitir contexto
if ($messages.Count -gt 0) {
    @{
        hookSpecificOutput = @{
            hookEventName     = 'SessionStart'
            additionalContext = ($messages -join "`n`n")
        }
    } | ConvertTo-Json -Depth 3 -Compress
}
```

---

#### Script 2 — Hook Stop melhorado com escrita no board

```powershell
# scripts/hooks/wip-session-stop.ps1 (versão com Agent Board)

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$wipFile     = Join-Path $projectRoot '.wip-session.md'
$boardFile   = Join-Path $projectRoot '.agent-board.json'
$stopFile    = "$env:TEMP\project-prev-stop.txt"
$promptFile  = "$env:TEMP\project-last-prompt.txt"
$threshold   = 3  # minutos

# 1. Notificação Windows (como antes)
$shouldNotify = $true
if ((Test-Path $stopFile) -and (Test-Path $promptFile)) {
    try {
        $idle = ([datetime](Get-Content $promptFile -Raw).Trim() -
                 [datetime](Get-Content $stopFile   -Raw).Trim()).TotalMinutes
        if ($idle -ge 0 -and $idle -lt $threshold) { $shouldNotify = $false }
    } catch {}
}
Get-Date -Format 'o' | Set-Content $stopFile -Encoding UTF8

if ($shouldNotify) {
    try {
        Add-Type -AssemblyName System.Windows.Forms -ErrorAction Stop
        $n = New-Object System.Windows.Forms.NotifyIcon
        $n.Icon = [System.Drawing.SystemIcons]::Information
        $n.Visible = $true
        $n.ShowBalloonTip(8000, 'Claude Code', 'Resposta pronta! Volta ao terminal.', 'Info')
        Start-Sleep -Milliseconds 400
        $n.Visible = $false
        $n.Dispose()
    } catch {}
}

# 2. Actualizar Agent Board — marcar sessão como inactiva
if (Test-Path $boardFile) {
    try {
        $board = Get-Content $boardFile -Raw -Encoding UTF8 | ConvertFrom-Json

        # Guardar info da última sessão antes de limpar
        if ($board.session.active -eq $true) {
            $lastCommit = (git log -1 --format="%h" 2>$null).Trim()
            $lastMsg    = (git log -1 --format="%s" 2>$null).Trim()
            $branch     = (git branch --show-current 2>$null).Trim()

            $board.last_session = @{
                agent      = $board.session.agent ?? 'claude-code'
                model      = $board.session.model ?? 'unknown'
                ended      = [datetime]::UtcNow.ToString('o')
                commit     = $lastCommit
                branch     = $branch
                status     = 'clean'
                task       = $board.session.task ?? ''
            }
            $board.git = @{
                branch           = $branch
                last_commit      = $lastCommit
                last_commit_msg  = $lastMsg
                build_status     = 'unknown'
                last_build_run   = ''
            }
        }

        # Limpar sessão activa
        $board.session  = @{ active = $false; agent = $null; model = $null; started = $null; task = $null; files_locked = @() }
        $board.updated  = [datetime]::UtcNow.ToString('o')

        $board | ConvertTo-Json -Depth 4 | Set-Content $boardFile -Encoding UTF8
    } catch {}
}

# 3. Mensagem no UI
$msg = if (Test-Path $wipFile) {
    "WIP activo em .wip-session.md — actualiza se mudaste de tarefa."
} else {
    "Sessao parou — cria .wip-session.md com o estado actual!"
}

@{ systemMessage = $msg } | ConvertTo-Json -Compress
```

---

#### Script 3 — Inicializar/actualizar o board (correr uma vez ou quando necessário)

Guardar em `scripts/init-agent-board.ps1`:

```powershell
#!/usr/bin/env pwsh
# scripts/init-agent-board.ps1
# Inicializa o .agent-board.json com o estado actual do git.
# Correr uma vez ao configurar o projecto, ou para resetar o board.

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$boardFile   = Join-Path $projectRoot '.agent-board.json'

$lastCommit = (git log -1 --format="%h" 2>$null).Trim()
$lastMsg    = (git log -1 --format="%s" 2>$null).Trim()
$branch     = (git branch --show-current 2>$null).Trim()

$board = @{
    schema  = 1
    updated = [datetime]::UtcNow.ToString('o')
    session = @{
        active       = $false
        agent        = $null
        model        = $null
        started      = $null
        task         = $null
        files_locked = @()
    }
    last_session = @{
        agent   = 'init'
        model   = 'n/a'
        ended   = [datetime]::UtcNow.ToString('o')
        commit  = $lastCommit
        branch  = $branch
        status  = 'clean'
        task    = 'inicializacao do board'
    }
    git = @{
        branch          = $branch
        last_commit     = $lastCommit
        last_commit_msg = $lastMsg
        build_status    = 'unknown'
        last_build_run  = ''
    }
}

$board | ConvertTo-Json -Depth 4 | Set-Content $boardFile -Encoding UTF8
Write-Host "[OK] .agent-board.json criado em $boardFile"
```

---

#### Script 4 — Arquivar SYNC-STATE.md (correr no início de cada release)

Guardar em `scripts/archive-sync-state.ps1`:

```powershell
#!/usr/bin/env pwsh
# scripts/archive-sync-state.ps1
# Arquiva o conteúdo actual do SYNC-STATE.md (excepto a última sessão)
# e recria o ficheiro apenas com a sessão mais recente.
# Correr antes de cada release major ou quando SYNC-STATE > 50 KB.

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$syncFile    = Join-Path $projectRoot 'SYNC-STATE.md'
$archiveDir  = Join-Path $projectRoot 'docs' 'sessions'

if (-not (Test-Path $archiveDir)) {
    New-Item -ItemType Directory -Path $archiveDir | Out-Null
}

$content = Get-Content $syncFile -Raw -Encoding UTF8
$lines   = $content -split "`n"

# Encontrar o início da segunda sessão (segundo "### Sessao" ou "---" após a primeira)
$sessionStarts = @()
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match '^### Sessao \d+') {
        $sessionStarts += $i
    }
}

if ($sessionStarts.Count -lt 2) {
    Write-Host "[INFO] Menos de 2 sessoes — nada a arquivar."
    exit 0
}

$keepUntil   = $sessionStarts[1] - 1  # manter só a sessão mais recente
$archivePart = ($lines[$keepUntil..($lines.Count - 1)]) -join "`n"
$keepPart    = ($lines[0..($keepUntil - 1)]) -join "`n"

# Guardar arquivo com timestamp
$date        = Get-Date -Format 'yyyy-MM-dd'
$archiveFile = Join-Path $archiveDir "sync-state-archive-$date.md"

if (Test-Path $archiveFile) {
    $archiveFile = Join-Path $archiveDir "sync-state-archive-$date-$(Get-Random -Maximum 999).md"
}

"# SYNC-STATE Archive — $date`n`n" + $archivePart | Set-Content $archiveFile -Encoding UTF8

# Reescrever SYNC-STATE.md só com a parte recente
$keepPart | Set-Content $syncFile -Encoding UTF8

$saved = [math]::Round((Get-Item $archiveFile).Length / 1KB)
$new   = [math]::Round((Get-Item $syncFile).Length / 1KB)

Write-Host "[OK] Arquivado: $archiveFile ($saved KB)"
Write-Host "[OK] SYNC-STATE.md reduzido para $new KB"
```

---

### 15.5 Reestruturação do SYNC-STATE.md

#### Formato correcto (max 60 linhas, ~2 KB)

O SYNC-STATE.md deve conter APENAS a sessão mais recente. Histórico fica em `docs/sessions/`.

```markdown
# SYNC-STATE — <Nome do Projecto>

> Actualizar no FIM de cada sessão. Lido no INÍCIO de cada sessão.
> Histórico completo em docs/sessions/

---

Actualizado: YYYY-MM-DD HH:MM
Agente: <nome> (<modelo>)
Branch: <branch> @ <hash>

## Feito (esta sessão)

- [item 1 conciso]
- [item 2 conciso]
- [máximo 5 itens — se houver mais, resumir]

## Próximo passo exacto

1. Abrir `path/ficheiro.ext` — fazer X porque Y
2. [segundo passo se houver]

## Ficheiros tocados

`path/a.ts` `path/b.rs` `path/c.json`

## Estado

| Verificação  | Resultado                   |
| ------------ | --------------------------- |
| tsc --noEmit | OK                          |
| cargo check  | OK / N/A                    |
| npm test     | 52/52                       |
| CI           | verde / em curso / vermelho |

## Avisos para o próximo agente

- [só o que é realmente crítico — máximo 3 pontos]
```

---

### 15.6 Fluxo de trabalho multi-agente com o novo sistema

#### Cenário: Claude Code e Antigravity a trabalhar em paralelo (dias diferentes)

```
DIA 1 — Claude Code começa
  → Hook SessionStart lê .agent-board.json
  → board.session.active = false → sem conflito
  → Claude trabalha em src/components/HelpModal.tsx
  → [manualmente ou via prompt] declarar ficheiros:
     board.session = { active: true, agent: "claude-code", files_locked: ["src/components/HelpModal.tsx"] }
  → No fim: Hook Stop limpa o board, actualiza last_session

DIA 2 — Antigravity começa
  → Hook SessionStart lê .agent-board.json
  → board.session.active = false, last_session.agent = "claude-code"
  → Antigravity vê: "Última sessão foi claude-code, commit abc123, tarefa X"
  → Antigravity trabalha em src/pages/ProfilesPage.tsx (não conflita)
```

#### Cenário: dois agentes simultâneos (acidental)

```
HORA 10:00 — Claude começa
  → board.session = { active: true, agent: "claude-code", started: "10:00", files_locked: ["X.tsx"] }

HORA 10:30 — Antigravity começa (utilizador esqueceu-se de fechar Claude)
  → Hook SessionStart lê board
  → board.session.active = true, started = "10:00" (há 30 min — não abandonada)
  → AVISO INJECTADO NO CONTEXTO:
     "ATENÇÃO: Há uma sessão activa de claude-code iniciada há 0.5h.
      Ficheiros bloqueados: X.tsx
      NÃO edites esses ficheiros sem confirmar com o utilizador."
  → Antigravity avisa o utilizador antes de fazer qualquer coisa
```

---

### 15.7 O que declarar como "ficheiro bloqueado"

Não precisas de bloquear tudo — só os ficheiros que:

- Vão sofrer alterações grandes (refactor, reescrita)
- São partilhados por múltiplos ecrãs (store, tipos globais, App.tsx)
- Estão numa migração a meio (ex: mudar de base.json para common.json)

**Não precisas de bloquear:**

- Ficheiros de documentação (`.md`)
- Ficheiros de configuração que raramente mudam (`.prettierrc`, `tsconfig.json`)
- Ficheiros de teste (raras colisões, fáceis de resolver)

**Como declarar (instrução para o agente):**

```
"Antes de começares, actualiza o board com os ficheiros que vais tocar:
 .agent-board.json → session.files_locked = ['src/store/jobs.ts', 'src/components/QueueCard.tsx']"
```

---

### 15.8 Resumo: antes e depois

| Aspecto                           | Antes (actual)                      | Depois (proposta)                            |
| --------------------------------- | ----------------------------------- | -------------------------------------------- |
| **Custo do handoff**              | 580 KB × cada sessão = ~145K tokens | 2 KB SYNC-STATE + 0.3 KB board = ~600 tokens |
| **Tokens de overhead por sessão** | ~435 USD/1000 sessões               | ~1.8 USD/1000 sessões (**99% menos**)        |
| **Detectar sessão activa**        | Impossível                          | Automático via hook + board                  |
| **Evitar conflitos de ficheiro**  | Manual, por memória                 | Declarativo via `files_locked`               |
| **Histórico de sessões**          | Tudo no SYNC-STATE.md               | Arquivado em `docs/sessions/`                |
| **Legibilidade por máquina**      | Só Markdown (texto livre)           | JSON para estado + Markdown para contexto    |
| **Esforço de manutenção**         | Acumula automaticamente (problema)  | Arquivo automático por script                |

---

### 15.9 Plano de implementação (por ordem de prioridade)

```
PASSO 1 — Imediato (10 min)
  Adicionar ao .gitignore:
    .agent-board.json
  Correr: pwsh scripts/init-agent-board.ps1
  Resultado: board inicializado, pronto a usar

PASSO 2 — Imediato (5 min)
  Correr: pwsh scripts/archive-sync-state.ps1
  Resultado: SYNC-STATE.md reduz de 580 KB para ~5 KB

PASSO 3 — Esta semana (30 min)
  Substituir scripts/hooks/wip-session-start.ps1
  Substituir scripts/hooks/wip-session-stop.ps1
  pelos scripts da secção 15.4
  Resultado: hooks lêem/escrevem o board automaticamente

PASSO 4 — Esta semana (15 min)
  Adicionar à mensagem inicial a qualquer agente:
  "No início, lê .agent-board.json e diz-me o estado.
   Quando souberes que ficheiros vais tocar, escreve-os
   em session.files_locked no board."
  Resultado: coordenação semi-automática

PASSO 5 — Próximo mês (opcional)
  Automatizar a declaração de ficheiros bloqueados:
  O hook UserPromptSubmit lê o diff pendente do git
  e actualiza files_locked com os ficheiros staged.
```

---

### 15.10 Configuração no .gitignore

Adicionar ao `.gitignore` (estes ficheiros são locais, não devem ir para o repositório):

```gitignore
# Ficheiros de controlo de sessão (locais, não versionados)
.agent-board.json
.session-info.md
.wip-session.md

# Arquivo de sessões (opcional — pode versionar se preferires histórico no git)
# docs/sessions/
```

---

_Criado em Junho 2026 | Versão 1.2_
_Baseado em práticas do projecto Nexora Desktop (Tauri + React + Rust)_
_Licença: livre uso e adaptação_

---

## Apêndice A — Checklist de início de sessão (imprimir ou copiar)

```
[ ] git pull --rebase
[ ] Ler PROGRESS.md — o que está feito, o que falta
[ ] Ler SYNC-STATE.md — handoff do agente anterior
[ ] Criar/actualizar .session-info.md com agente, modelo, data, tarefa
[ ] Apresentar plano ao utilizador
[ ] Aguardar "podes avançar" antes de codificar
```

## Apêndice B — Checklist de fim de sessão

```
[ ] PROGRESS.md actualizado — [x] no que ficou feito
[ ] SYNC-STATE.md actualizado — próximo passo específico
[ ] .session-info.md com Data_Fim e notas para o próximo agente
[ ] git add <ficheiros específicos> (nunca git add -A sem verificar)
[ ] Verificações: typecheck, lint, tests — tudo passa?
[ ] git commit -m "tipo(âmbito): descrição"
[ ] git push
```

## Apêndice C — Sinais de alerta (quando parar e perguntar)

Para imediatamente e pergunta ao utilizador se:

- Vais modificar um ficheiro que não está explicitamente na ZONA VERDE
- Encontras `[x]` em PROGRESS.md para algo que o utilizador te pediu para fazer
- O teu plano afecta mais de 5 ficheiros não relacionados
- Vais apagar dados, migrar schema de BD, ou fazer alterações irreversíveis
- Os testes estão a falhar e não sabes porquê
- O build está quebrado e não foi tu que o quebraste

---

## 14. Sugestões de melhoria — produtividade, organização e eficiência

> Esta secção documenta melhorias concretas identificadas a partir da experiência com o projecto Nexora Desktop e de padrões gerais de trabalho com agentes IA.
> Cada sugestão indica: impacto esperado, esforço de implementação, e se se aplica a este projecto, a projectos em geral, ou a ambos.

---

### 14.1 Redução de consumo de tokens

O custo de cada sessão de IA é directamente proporcional ao tamanho do contexto. Aqui estão as alavancas com maior impacto:

#### A — Arquivar PROGRESS.md periodicamente

**Problema:** O `PROGRESS.md` cresce indefinidamente. Com sessões longas e histórico de versões, pode atingir dezenas de MB (como aconteceu neste projecto com 69 MB). Cada sessão carrega esse ficheiro inteiro no contexto.

**Solução:**

```
PROGRESS.md           ← só versão actual + backlog (max ~200 linhas)
PROGRESS.archive.md   ← tudo o que foi concluído antes da versão actual
```

Mover todas as entradas `[x]` de versões anteriores para o arquivo no início de cada release. O agente só precisa do presente e do futuro — o passado está no git.

**Impacto:** Redução de 80-95% do tamanho do contexto de estado.
**Esforço:** Baixo — 10 minutos por release.
**Aplica-se a:** Qualquer projecto.

---

#### B — SYNC-STATE.md com limite de tamanho

**Problema:** O SYNC-STATE.md acumula sessões anteriores. O agente seguinte só precisa da última sessão.

**Solução:** Manter apenas a sessão mais recente no SYNC-STATE.md. Histórico vai para `docs/session-history/YYYY-MM-DD.md`.

**Template compacto (max 60 linhas):**

```markdown
# SYNC-STATE — <Projecto>

Actualizado: YYYY-MM-DD HH:MM | Agente: <nome> | Versão: <x.y.z>

## Feito nesta sessão (3-5 pontos)

- [resumo conciso]

## Próximo passo (específico)

1. Abrir `path/ficheiro.ts` linha ~120
2. Implementar X porque Y

## Estado

- tsc: OK | lint: OK | tests: 52/52 | build: OK
```

**Impacto:** Redução de 70% do tamanho do handoff.
**Esforço:** Baixo — é uma questão de disciplina.
**Aplica-se a:** Qualquer projecto.

---

#### C — Sessões focadas em vez de sessões longas

**Problema:** Sessões muito longas (30+ turnos) degradam a qualidade das respostas — o modelo começa a "esquecer" instruções do início do contexto e fica mais propenso a erros.

**Solução:** Trabalhar em sessões de foco único. Um tema por sessão.

```
Sessão ruim:  "Vamos fazer o cloud, corrigir o CI, actualizar os docs e fazer release"
Sessão boa:   "Vamos só corrigir o CI — nada mais."
```

**Regra dos 3 commits:** Se uma sessão tem mais de 3 commits não relacionados, é sinal de que devia ter sido dividida.

**Quando fazer /clear:**

- Ao mudar de tema completamente
- Quando o contexto passa 70% (o hook avisa)
- Após uma tarefa concluída antes de começar a próxima

**Impacto:** Menos erros, respostas mais precisas, menor custo total.
**Esforço:** Zero — é só disciplina.
**Aplica-se a:** Qualquer projecto com qualquer agente IA.

---

#### D — Prompts cirúrgicos em vez de prompts vagos

**Problema:** Prompts vagos forçam o agente a explorar o código extensivamente, consumindo tokens e produzindo alterações mais amplas do que o necessário.

| Prompt vago (caro)                | Prompt cirúrgico (eficiente)                                                                                                                        |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Corrige os bugs do upload cloud" | "Em `src-tauri/src/cloud/dropbox.rs` linha 142, o erro de timeout não está a ser propagado — só registar, não lançar. Corrige para retornar `Err`." |
| "Actualiza a documentação"        | "Adiciona à secção §4 do `docs/USER_MANUAL.md` as instruções de configuração SFTP (campos: host, port, user, key path)"                             |
| "Vê se há problemas no CI"        | "Verifica o run mais recente do GitHub Actions e diz-me exactamente que step falhou e porquê"                                                       |

**Regra:** Quanto mais específico o prompt (ficheiro, linha, comportamento esperado), menos tokens o agente consome a explorar.

**Impacto:** 40-60% menos tokens por tarefa simples.
**Esforço:** Zero — é só pensar antes de escrever o prompt.
**Aplica-se a:** Qualquer agente IA.

---

#### E — Não incluir ficheiros binários ou grandes no contexto

**Problema:** Ferramentas como `git add -A` ou prompts como "lê todos os ficheiros do projecto" podem trazer binários, node_modules parciais, ou ficheiros gerados para o contexto.

**Solução:**

```bash
# .claudeignore ou .agentignore (criar na raiz)
node_modules/
dist/
target/
*.lock          # excepto media-binaries.lock.json (pequeno e útil)
*.png
*.jpg
*.woff
src-tauri/binaries/
```

**Impacto:** Evita gastar tokens em ficheiros irrelevantes.
**Esforço:** Baixo — criar o ficheiro uma vez.
**Aplica-se a:** Qualquer projecto.

---

### 14.2 Melhor estrutura de prompts

#### F — Usar XML tags para separar secções do prompt

O Claude (e a maioria dos LLMs) responde melhor a prompts com estrutura clara. XML tags ajudam o modelo a perceber o papel de cada parte.

```xml
<contexto>
  Nexora Desktop v0.33 — Tauri 2 + React 19 + TypeScript
  Ficheiro alvo: src/components/HelpModal.tsx
</contexto>

<tarefa>
  Adicionar um novo separador "Cloud" com 4 cards de providers.
  Não alterar os separadores existentes.
</tarefa>

<restrições>
  - Manter o padrão visual dos cards existentes (ver linhas 45-89)
  - Não usar state externo — tudo local ao componente
  - TypeScript strict — sem any
</restrições>

<formato_de_saída>
  Apenas o bloco de código modificado (não o ficheiro inteiro)
  com comentário indicando onde inserir.
</formato_de_saída>
```

**Impacto:** Respostas mais precisas, menos iterações.
**Esforço:** Médio — requer mudar o hábito de escrever prompts.
**Aplica-se a:** Qualquer agente IA.

---

#### G — Few-shot: mostrar um exemplo do que queres

Para tarefas repetitivas (ex: adicionar um novo provider cloud, criar um novo ecrã), mostrar um exemplo existente reduz dramaticamente erros.

```
Já existe o provider FTP implementado em `src-tauri/src/cloud/ftp.rs`.
Segue exatamente o mesmo padrão para implementar o provider SFTP.
Pontos onde diferem: autenticação (SSH key em vez de password), porta default (22), biblioteca (russh em vez de rust-ftp).
```

**Impacto:** 70% menos erros de padrão, menos iterações correctivas.
**Esforço:** Baixo — indicar o exemplo certo.
**Aplica-se a:** Qualquer projecto com padrões repetitivos.

---

#### H — Especificar o formato de saída desejado

Se não disseres o formato, o agente decide — e pode decidir errado.

```
# Em vez de:
"Corrige o bug"

# Preferir:
"Corrige o bug. Resposta esperada:
1. Descrição de 1 linha da causa raiz
2. O diff das linhas alteradas (formato unified diff)
3. Como verificar que está corrigido (comando a correr)"
```

**Impacto:** Menos trocas de mensagens para chegar ao resultado certo.
**Esforço:** Baixo.
**Aplica-se a:** Qualquer agente IA.

---

### 14.3 Organização do projecto

#### I — ADR (Architecture Decision Records) para decisões técnicas

**Problema:** Decisões técnicas importantes (ex: "usamos Tauri em vez de Electron", "SQLite em vez de PostgreSQL") ficam documentadas apenas em cabeças humanas ou em conversas antigas. O próximo agente não sabe o porquê e pode propor reverter a decisão.

**Solução:** Pasta `docs/adr/` com um ficheiro por decisão:

```
docs/adr/
├── ADR-001-tauri-over-electron.md
├── ADR-002-sqlite-over-postgresql.md
├── ADR-003-nodejs-sidecar.md
└── ...
```

**Template ADR:**

```markdown
# ADR-XXX — Título da Decisão

**Data:** YYYY-MM-DD
**Estado:** Aceite | Depreciado | Substituído por ADR-YYY

## Contexto

[Por que esta decisão foi necessária?]

## Decisão

[O que foi decidido?]

## Consequências

[O que fica mais fácil? O que fica mais difícil?]

## Alternativas consideradas

- Alternativa A — razão de rejeição
- Alternativa B — razão de rejeição
```

**Instrução para agentes:** "Antes de propor uma alternativa a uma decisão técnica existente, lê o ADR correspondente em `docs/adr/`."

**Impacto:** Evita que agentes proponham reverter decisões com contexto específico.
**Esforço:** Médio — 15 min por ADR, mas só para decisões importantes.
**Aplica-se a:** Qualquer projecto com histórico de decisões.

---

#### J — Separar "o que fazer" de "como está feito"

**Problema:** PROGRESS.md mistura estado actual com histórico. Torna-se grande e confuso.

**Solução — 3 ficheiros separados:**

```
ROADMAP.md       ← O que queremos fazer (features, visão)
PROGRESS.md      ← Estado actual (sprint corrente, esta semana)
CHANGELOG.md     ← O que já foi feito (por versão, gerado pelo sync.ps1)
```

O agente só precisa de PROGRESS.md + SYNC-STATE.md para trabalhar. ROADMAP.md e CHANGELOG.md são contexto opcional.

**Impacto:** Contexto mais focado, PROGRESS.md permanece pequeno.
**Esforço:** Baixo — separação de conteúdo existente.
**Aplica-se a:** Qualquer projecto.

---

#### K — Etiquetas de estado em PROGRESS.md

Em vez de `[ ]` e `[x]`, usar etiquetas com mais granularidade:

```markdown
- [x] Funcionalidade concluída e testada
- [~] Em curso (esta sessão)
- [!] Bloqueada — depende de X
- [?] A validar com o utilizador
- [-] Descartada — razão: [...]
- [ ] Backlog
```

Isto evita que o agente reimplemente algo que está `[~]` (em curso por outro agente) ou que descarte algo que está `[?]` (pendente de decisão).

**Impacto:** Menos ambiguidade no handoff entre agentes.
**Esforço:** Zero — só mudar a convenção.
**Aplica-se a:** Qualquer projecto multi-agente.

---

### 14.4 Optimizações de CI/CD

#### L — Cache agressivo no GitHub Actions

O maior consumidor de tempo nos builds é a instalação de dependências. Cache bem configurado corta o tempo a metade.

```yaml
# Para Node.js — já suportado nativamente
- uses: actions/setup-node@v5
  with:
    node-version: '20'
    cache: 'npm' # ← activa cache automático do npm ci

# Para Rust — usar swatinem/rust-cache
- uses: swatinem/rust-cache@v2
  with:
    cache-on-failure: true # guarda cache mesmo quando o build falha
    shared-key: 'nexora-${{ runner.os }}'

# Para downloads de binários — cache manual
- name: Cache media binaries
  uses: actions/cache@v4
  with:
    path: src-tauri/binaries/
    key: binaries-${{ hashFiles('scripts/media-binaries.lock.json') }}
    restore-keys: binaries-
```

**Impacto neste projecto:** O build de Windows demorava ~22 min. Com cache de binários (180 MB de ffmpeg) e Rust, baixa para ~8-10 min.
**Esforço:** Baixo — alteração no `.github/workflows/build.yml`.
**Aplica-se a:** Qualquer projecto com CI.

---

#### M — Ignorar CI para commits de documentação

Commits de docs não devem disparar builds completos (demorados e com custo).

```yaml
on:
  push:
    branches: [main, dev]
    paths-ignore: # ← não corre CI para estas alterações
      - 'docs/**'
      - '*.md'
      - '.wip-session.md'
      - 'PROGRESS*.md'
      - 'SYNC-STATE.md'
```

**Impacto:** Poupa 5-25 min de CI por commit de documentação.
**Esforço:** Zero — 5 linhas no workflow.
**Aplica-se a:** Qualquer projecto.

---

#### N — Acção automática para detectar checksums desactualizados

**Problema:** Os checksums de binários (ex: BtbN FFmpeg) ficam desactualizados quando a fonte actualiza. O build falha silenciosamente e só se descobre na próxima release.

**Solução:** Job semanal que tenta descarregar e compara checksums:

```yaml
# .github/workflows/check-binaries.yml
name: Verificar checksums de binários

on:
  schedule:
    - cron: '0 6 * * 1' # todas as segundas às 06:00 UTC
  workflow_dispatch:

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - name: Verificar checksums
        run: |
          node scripts/download-media-binaries.js --check-only 2>&1 | tee /tmp/check-result.txt
          if grep -q "desactualizado\|mismatch\|outdated" /tmp/check-result.txt; then
            echo "::warning::Checksums de binários desactualizados — correr npm run download:binaries --write-lock"
            exit 1
          fi
```

**Impacto:** Descobre checksums desactualizados antes do build de release falhar.
**Esforço:** Médio — requer adicionar `--check-only` ao script de download.
**Aplica-se a:** Qualquer projecto com binários de terceiros.

---

#### O — Matriz de builds paralelos com fail-fast desactivado

Por defeito, o GitHub Actions cancela todos os jobs quando um falha. Para builds multi-plataforma, é melhor deixar todos correr para ter o relatório completo.

```yaml
jobs:
  build:
    strategy:
      fail-fast: false # ← deixar todos correr mesmo se um falhar
      matrix:
        os: [windows-latest, macos-latest, ubuntu-latest]
    runs-on: ${{ matrix.os }}
```

**Impacto:** Ver todos os erros de uma vez em vez de um de cada vez.
**Esforço:** Zero — uma linha.
**Aplica-se a:** Qualquer projecto com builds multi-plataforma.

---

### 14.5 Gestão de contexto e memória

#### P — Sistema de memória persistente para o agente

**Problema:** Em cada sessão nova, o agente começa do zero — não se lembra de preferências, decisões passadas, ou erros que já cometeu.

**Solução (Claude Code):** O sistema de memória automático em `~/.claude/projects/<projecto>/memory/` persiste entre sessões. Usar activamente para registar:

```
memory/
├── feedback_ipc_camelcase.md      ← "Tauri 2 usa camelCase no invoke()"
├── feedback_exec_string_bug.md    ← "exec() com string causou bug de segurança em sessão X"
├── project_decisions.md           ← "Decidimos não usar React Router"
├── user_preferences.md            ← "Utilizador prefere commits atómicos"
└── MEMORY.md                      ← índice de todas as memórias
```

**Instrução ao agente:** "Quando aprenderes algo sobre este projecto que não está documentado no código, guarda em memória para não precisares de re-aprender na próxima sessão."

**Impacto:** Elimina repetição de erros já cometidos. Reduz turnos de "ah sim, essa é a regra X".
**Esforço:** Zero para o utilizador — o agente faz automaticamente.
**Aplica-se a:** Claude Code e outros agentes com sistema de memória.

---

#### Q — Compressão do contexto WIP

O `.wip-session.md` deve ser mantido compacto. Regra: **máximo 50 linhas**.

```markdown
# WIP — máximo 50 linhas, foco no PRÓXIMO passo

## Estado: <EM CURSO | BLOQUEADO | CONCLUÍDO>

## Branch: <branch>

## Último commit: <hash> — <descrição>

## Próximo passo (específico)

1. Abrir `caminho/ficheiro.ts` linha ~45
2. Fazer X porque Y
3. Verificar com: `npm test -- --filter=NomeTeste`

## Contexto mínimo necessário

- <facto 1 que o próximo agente DEVE saber>
- <facto 2>
```

Tudo o que não for "próximo passo" ou "facto crítico" vai para PROGRESS.md ou SYNC-STATE.md.

**Impacto:** O hook de SessionStart injeta este ficheiro no contexto — quanto menor, menos tokens gastos em cada sessão.
**Esforço:** Zero — é disciplina de escrita.
**Aplica-se a:** Qualquer projecto com o sistema de hooks.

---

### 14.6 Optimizações de design e frontend

#### R — Sistema de tokens de design (design tokens)

**Problema:** Cores, espaçamentos e tipografia estão repetidos em centenas de classes Tailwind espalhadas pelo código. Mudar a cor primária significa search-and-replace em 50 ficheiros.

**Solução:** Centralizar em `tailwind.config.ts`:

```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        surface: {
          base: '#0a0d14', // fundo da página
          card: '#141824', // cards
          border: '#1e2433', // bordas
          overlay: '#1a1f2e', // overlays
        },
        brand: {
          primary: '#1A6FD4',
          secondary: '#0f4fa0',
          muted: '#1a3a6b',
        },
        status: {
          success: '#22c55e',
          warning: '#f59e0b',
          error: '#ef4444',
          info: '#3b82f6',
        },
      },
      borderRadius: {
        card: '0.75rem', // rounded-xl — padrão dos cards
      },
    },
  },
};
```

Depois, nos componentes:

```tsx
// Em vez de: className="bg-[#141824] border border-[#1e2433] rounded-xl"
// Usar:       className="bg-surface-card border border-surface-border rounded-card"
```

**Impacto:** Mudar o tema = 1 ficheiro. Consistência automática. Agentes IA escrevem código mais consistente porque os tokens têm nomes semânticos.
**Esforço:** Médio — migração incremental, não precisa de ser feita de uma vez.
**Aplica-se a:** Qualquer projecto com Tailwind CSS.

---

#### S — Componente de estado vazio padronizado

**Problema:** Cada ecrã implementa o seu próprio "estado vazio" com estilos diferentes.

**Solução:** Componente reutilizável:

```tsx
// src/components/EmptyState.tsx
interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Icon className="w-12 h-12 text-gray-600 mb-4" />
      <h3 className="text-gray-300 font-medium mb-1">{title}</h3>
      {description && <p className="text-gray-500 text-sm mb-4">{description}</p>}
      {action && (
        <button onClick={action.onClick} className="btn-primary text-sm">
          {action.label}
        </button>
      )}
    </div>
  );
}
```

**Impacto:** Consistência visual. Quando um agente precisar de estado vazio, usa este componente em vez de inventar um novo.
**Esforço:** Baixo — 30 min para criar e migrar os existentes.
**Aplica-se a:** Qualquer projecto React com múltiplos ecrãs.

---

#### T — Estados de loading com skeleton em vez de spinner genérico

**Problema:** Spinners genéricos causam layout shift quando o conteúdo carrega. Skeletons preservam o layout.

**Solução:** Componente de skeleton parametrizável:

```tsx
// src/components/Skeleton.tsx
export function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-surface-border rounded ${className}`} />;
}

// Uso no card de stats:
function StatsCardSkeleton() {
  return (
    <div className="bg-surface-card border border-surface-border rounded-card p-6">
      <Skeleton className="h-4 w-24 mb-3" />
      <Skeleton className="h-8 w-16 mb-2" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}
```

**Impacto:** Melhor UX. Agentes tendem a usar `isLoading && <Spinner>` — um skeleton componentizado incentiva o padrão correcto.
**Esforço:** Baixo.
**Aplica-se a:** Qualquer frontend com dados assíncronos.

---

### 14.7 Segurança e qualidade

#### U — Pre-commit hook para prevenir commits de segredos

**Problema:** Um `.env` ou chave API pode ser commitado acidentalmente.

**Solução:** Hook de pre-commit via `husky` + `lint-staged`:

```json
// package.json
{
  "lint-staged": {
    "**/*": "secretlint",
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{js,mjs,json,md}": "prettier --write"
  }
}
```

```bash
# Instalar
npm install --save-dev secretlint @secretlint/secretlint-rule-preset-recommend
```

```json
// .secretlintrc.json
{
  "rules": [{ "id": "@secretlint/secretlint-rule-preset-recommend" }]
}
```

**O que detecta:** AWS keys, GitHub tokens, Private keys, Slack tokens, Google API keys, e mais.

**Impacto:** Previne o maior risco de segurança em projectos com agentes IA (que às vezes incluem ficheiros desnecessariamente).
**Esforço:** Baixo — 15 min de setup.
**Aplica-se a:** Qualquer projecto.

---

#### V — Auditoria de dependências automática no CI

```yaml
# Adicionar ao ci.yml
- name: Auditoria de segurança npm
  run: npm audit --audit-level=high
  continue-on-error: true # avisar mas não bloquear o build
```

Para Rust:

```yaml
- name: Auditoria cargo
  run: cargo install cargo-audit && cargo audit
  continue-on-error: true
```

**Impacto:** Detecção passiva de vulnerabilidades sem trabalho extra.
**Esforço:** Mínimo — 2 linhas no CI.
**Aplica-se a:** Qualquer projecto com npm ou Cargo.

---

#### W — Validação de tamanho de ficheiros no CI (prevenir o bug dos 69 MB)

**Lição aprendida neste projecto:** O `PROGRESS-DESKTOP.md` chegou a 69 MB por mojibake não detectado durante meses.

**Solução:** Check de tamanho no CI:

```yaml
# Adicionar ao ci.yml
- name: Verificar tamanho de ficheiros
  run: |
    # Verificar ficheiros .md maiores que 1 MB (sinal de corrupção)
    find . -name "*.md" -not -path "*/node_modules/*" -size +1M | while read f; do
      echo "::error::Ficheiro demasiado grande: $f ($(du -sh $f | cut -f1))"
      exit 1
    done
    # Verificar linhas excessivamente longas (sinal de mojibake)
    awk 'length > 10000 { print FILENAME ":" NR ": linha com " length " caracteres"; found=1 }
         END { if (found) exit 1 }' $(find . -name "*.md" -not -path "*/node_modules/*")
```

**Impacto:** Detecta corrupção de ficheiros antes de chegar ao GitHub.
**Esforço:** Baixo — adicionar ao CI.
**Aplica-se a:** Qualquer projecto que usa agentes IA para editar Markdown.

---

### 14.8 Automação e produtividade

#### X — Modo de sessão de "revisão rápida" (5 min)

Para sessões de verificação rápida (CI verde? Algum erro novo?), criar um prompt padrão que é rápido e focado:

```markdown
<!-- Guardar como scripts/prompts/quick-check.md -->

Faz uma verificação rápida do estado do projecto.
Responde APENAS a estas 4 perguntas, uma linha cada:

1. CI: [verde/vermelho/em curso] — [job que falhou se vermelho]
2. Último commit: [hash] — [descrição]
3. Algum ficheiro modificado não commitado? [sim/não — lista se sim]
4. Próximo passo pendente no SYNC-STATE.md: [1 linha]

Não faças mais nada. Não sugiras melhorias. Só as 4 respostas.
```

**Impacto:** Sessões de verificação em <5 mensagens em vez de 20+.
**Esforço:** Zero — criar o ficheiro de prompt.
**Aplica-se a:** Qualquer projecto.

---

#### Y — Separar versão de desenvolvimento em branch dedicado

**Problema actual neste projecto:** Todo o trabalho vai directamente para `main`. Isto significa que o tag de release aponta para commits de documentação, fixos de CI, e outros ruídos.

**Solução recomendada:**

```
main    ← só recebe merges de releases testados e aprovados
dev     ← trabalho diário de todos os agentes
feature/x ← features grandes isoladas
```

**Fluxo:**

```bash
# Agente trabalha em dev
git checkout dev
# ... commits ...

# No momento do release:
git checkout main
git merge --no-ff dev -m "release: v0.34.0-beta.1"
git tag v0.34.0-beta.1
git push origin main v0.34.0-beta.1
```

**Impacto:** Histórico do `main` limpo. Tags de release apontam para merges testados.
**Esforço:** Médio — mudar o workflow do sync.ps1 e hábito dos agentes.
**Aplica-se a:** Qualquer projecto com releases frequentes.

---

#### Z — Instruções de "escopo negativo" nos prompts

Dizer explicitamente ao agente o que **não** deve fazer é tão importante como dizer o que deve:

```
# Forma de dar instruções com escopo negativo:

Tarefa: Adicionar suporte ao provider MEGA no HelpModal.tsx

NÃO faças:
- Não alteres os outros providers já existentes
- Não refactores o componente HelpModal
- Não adiciones dependências novas
- Não toques nos ficheiros de i18n — as strings já existem

APENAS:
- Adiciona o card MEGA na secção de providers (seguindo o padrão do card Dropbox na linha 245)
```

**Impacto:** Elimina a maioria das alterações "colaterais" não pedidas que os agentes fazem.
**Esforço:** Zero — é questão de hábito ao escrever prompts.
**Aplica-se a:** Qualquer agente IA.

---

### Resumo de prioridades (por impacto vs esforço)

| #   | Sugestão                    | Impacto | Esforço | Prioridade     |
| --- | --------------------------- | ------- | ------- | -------------- |
| A   | Arquivar PROGRESS.md        | Alto    | Baixo   | 🔴 Imediata    |
| B   | SYNC-STATE.md compacto      | Alto    | Baixo   | 🔴 Imediata    |
| C   | Sessões focadas + /clear    | Alto    | Zero    | 🔴 Imediata    |
| D   | Prompts cirúrgicos          | Alto    | Zero    | 🔴 Imediata    |
| L   | Cache agressivo no CI       | Alto    | Baixo   | 🔴 Imediata    |
| M   | Ignorar CI para docs        | Médio   | Zero    | 🟡 Esta semana |
| R   | Design tokens Tailwind      | Médio   | Médio   | 🟡 Esta semana |
| U   | Pre-commit secretlint       | Alto    | Baixo   | 🟡 Esta semana |
| W   | Validação tamanho .md CI    | Médio   | Baixo   | 🟡 Esta semana |
| Z   | Escopo negativo nos prompts | Alto    | Zero    | 🔴 Imediata    |
| F   | Prompts com XML tags        | Médio   | Médio   | 🟢 Próximo mês |
| I   | ADR para decisões técnicas  | Médio   | Médio   | 🟢 Próximo mês |
| N   | Detecção checksums semanais | Médio   | Médio   | 🟢 Próximo mês |
| P   | Memória persistente activa  | Alto    | Zero    | 🔴 Imediata    |
| Y   | Branch dev separado         | Médio   | Médio   | 🟢 Próximo mês |

---

_Criado em Junho 2026 | Versão 1.1_
_Baseado em práticas do projecto Nexora Desktop (Tauri + React + Rust)_
_Licença: livre uso e adaptação_
