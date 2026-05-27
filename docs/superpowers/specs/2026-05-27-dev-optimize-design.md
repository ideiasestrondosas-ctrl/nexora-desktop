# Design Spec — dev-optimize.ps1

**Data:** 2026-05-27  
**Autor:** Claude Code (brainstorming session)  
**Estado:** Aprovado pelo utilizador

---

## Contexto

O sistema de desenvolvimento tem as seguintes características relevantes:

- **CPU:** Intel Core i7-1355U (13ª geração) — 10 cores / 12 threads
- **RAM:** 15.6 GB total (tipicamente 10-11 GB usada durante sessão de dev)
- **OS:** Windows 11 Pro 10.0.26200
- **Dev stack:** Tauri 2 / Rust / Node 24 / Docker 29 / WSL2 (Ubuntu 24.04)
- **Ferramentas activas em simultâneo:** Claude Code, Antigravity, OpenCode, GitHub Desktop, Docker Desktop, WSL, Chrome

**Problemas identificados:**

- Windows Defender sem exclusões para pastas de build → builds 2-3× mais lentos
- Windows Search indexa `node_modules`, `target/`, `.cargo/registry` → I/O desnecessário
- Docker Desktop sem limites de RAM/CPU → pode engolir recursos
- Serviços de telemetria e Superfetch a correr sempre
- Discos virtuais WSL e Docker (`.vhdx`) sujeitos a scan do Defender

---

## Objectivo

Um único script PowerShell (`dev-optimize.ps1`) que:

1. Aplica configurações permanentes de exclusão e limites (uma vez, como Admin)
2. Permite activar/desactivar um "modo desenvolvimento" por sessão
3. Mostra o estado actual do sistema
4. Tem ajuda completa integrada, sem necessidade de documentação externa

---

## Restrições

| Processo / Serviço                        | Comportamento no script                                  |
| ----------------------------------------- | -------------------------------------------------------- |
| `iCloudDrive`, `iCloudHome`, `iCloudCKKS` | **Nunca toca** — necessário sempre activo                |
| `OneDrive`                                | **Nunca toca** — necessário sempre activo                |
| `chrome.exe`                              | **Nunca toca** — utilizador pode ter aberto com trabalho |
| Windows Defender (serviço)                | Nunca desactiva — só adiciona exclusões                  |
| WSL (`.wslconfig`)                        | Só lê e valida — já está bem configurado                 |

---

## Comandos

### `help`

Imprime no terminal:

- Descrição de cada comando
- O que cada um faz e o que NÃO toca
- Requisitos (Admin ou não)
- Como reverter cada acção
- Exemplos de uso

Não requer Admin. Não altera nada.

---

### `status`

Lê e apresenta:

```
[STATUS] YYYY-MM-DD HH:MM
──────────────────────────────────────────
RAM:        XX.X GB usada / X.X GB livre (15.6 GB total)
Modo Dev:   ON | OFF
──────────────────────────────────────────
Defender:   exclusões aplicadas ✓ | NÃO aplicadas ✗
WSearch:    exclusões aplicadas ✓ | NÃO aplicadas ✗
Docker:     4 GB / 4 CPUs ✓ | sem limites ✗
WSL:        6 GB / 4 cores ✓ | configuração em falta ✗
──────────────────────────────────────────
Serviços:   SysMain: Running/Stopped | DiagTrack: Running/Stopped | WerSvc: Running/Stopped
──────────────────────────────────────────
Top 5 RAM:  [nome processo] [MB] · ...
```

Detecta se `setup` foi executado lendo `~\.dev-optimize-backup.json`.  
Não requer Admin.

---

### `setup` — Configuração permanente

**Requer: Administrador**  
**Reversível com: `reset`**

#### Passo 1 — Windows Defender: exclusões de pastas

| Pasta                                                 | Ferramenta / Motivo                                 |
| ----------------------------------------------------- | --------------------------------------------------- |
| `C:\dev`                                              | Projecto principal Nexora                           |
| `$HOME\.cargo`                                        | Compilador Rust, registry de crates                 |
| `$HOME\AppData\Roaming\npm`                           | OpenCode e outros pacotes globais                   |
| `$HOME\.npm`                                          | Cache npm                                           |
| `$HOME\.antigravity`                                  | Extensões Antigravity (milhares de ficheiros JS/TS) |
| `$HOME\AppData\Local\GitHubDesktop`                   | Binários e cache GitHub Desktop                     |
| `$HOME\AppData\Local\Docker\wsl`                      | Discos virtuais Docker (`.vhdx`)                    |
| `$HOME\AppData\Local\Packages\CanonicalGroupLimited*` | Disco virtual WSL Ubuntu (`.vhdx`)                  |

#### Passo 2 — Windows Defender: exclusões de processos

`cargo.exe`, `rustc.exe`, `node.exe`, `docker.exe`, `com.docker.backend.exe`

#### Passo 3 — Windows Search: excluir pastas de indexação

Mesmas pastas do Passo 1, via registo (`HKLM:\SOFTWARE\Microsoft\Windows Search\CrawlScopeManager\Windows\SystemIndex\WorkingSetRules`).

Não desactiva o serviço WSearch — só remove as pastas de dev do âmbito de indexação.

#### Passo 4 — Docker Desktop: limites de recursos

Edita `$HOME\AppData\Roaming\Docker\settings-store.json`:

- `memoryMiB`: 4096
- `cpus`: 4

Requer restart do Docker Desktop para ter efeito (script avisa o utilizador).

#### Passo 5 — WSL: validar configuração

Lê `$HOME\.wslconfig` e confirma que os valores estão correctos (6GB, 4 cores, gradual reclaim). Se estiver em falta, cria o ficheiro com os valores recomendados. Não sobrescreve se já existir.

#### Passo 6 — Backup do estado original

Guarda em `$HOME\.dev-optimize-backup.json`:

- Lista de exclusões Defender antes do setup
- Lista de exclusões WSearch antes do setup
- Valores Docker antes do setup

---

### `dev-on` — Activa modo desenvolvimento

**Não requer Admin** (serviços podem ser parados por utilizador standard se `Stop-Service` permitir; caso contrário, eleva automaticamente com `Start-Process -Verb RunAs`).

| Acção                        | Detalhe                                                                    |
| ---------------------------- | -------------------------------------------------------------------------- |
| Para `SysMain`               | Superfetch — pré-carrega apps em RAM, inútil durante dev activo            |
| Para `DiagTrack`             | Telemetria Connected User — envia dados à Microsoft em background          |
| Para `WerSvc`                | Windows Error Reporting — faz scan de dumps, desnecessário                 |
| Eleva prioridade do terminal | `[System.Diagnostics.Process]::GetCurrentProcess().PriorityClass = 'High'` |
| Aviso se RAM livre < 4 GB    | Imprime alerta amarelo mas não bloqueia                                    |
| Aviso se Docker > 2 GB RAM   | Lembra que está a usar muitos recursos                                     |

**Nunca toca em:** `iCloudDrive`, `iCloudHome`, `iCloudCKKS`, `ApplePhotoStreams`, `OneDrive`, `chrome.exe`

Guarda estado `dev-on` em `$HOME\.dev-optimize-state.json` para que `dev-off` saiba o que foi alterado.

---

### `dev-off` — Desactiva modo desenvolvimento

**Não requer Admin.**

| Acção                        | Detalhe                                     |
| ---------------------------- | ------------------------------------------- |
| Inicia `SysMain`             | Retoma ao estado Running                    |
| Inicia `DiagTrack`           | Retoma ao estado Running                    |
| Inicia `WerSvc`              | Retoma ao estado Running (StartType Manual) |
| Repõe prioridade do terminal | `Normal`                                    |

Docker Desktop não é reiniciado automaticamente — é gerido manualmente pelo utilizador.  
Lê `$HOME\.dev-optimize-state.json` para saber quais serviços foram parados por `dev-on` (evita iniciar serviços que já estavam parados antes).

---

### `reset` — Desfaz configuração permanente

**Requer: Administrador**

1. Remove exclusões do Defender adicionadas pelo `setup` (lê backup)
2. Remove exclusões do WSearch adicionadas pelo `setup`
3. Restaura valores Docker do backup
4. Apaga `$HOME\.dev-optimize-backup.json`
5. Apaga `$HOME\.dev-optimize-state.json`

Não altera `.wslconfig` (foi criado pelo utilizador, não pelo script).

---

## Ficheiros criados pelo script

| Ficheiro                                         | Propósito                                            |
| ------------------------------------------------ | ---------------------------------------------------- |
| `~\.dev-optimize-backup.json`                    | Estado original antes do setup (para reset)          |
| `~\.dev-optimize-state.json`                     | Estado actual do modo dev (para dev-off idempotente) |
| `C:\dev\nexora-desktop\scripts\dev-optimize.ps1` | O script em si                                       |

---

## Fluxo de utilização típico

```
# Primeira vez (como Admin):
.\scripts\dev-optimize.ps1 setup

# Início de cada sessão de dev:
.\scripts\dev-optimize.ps1 dev-on

# Verificar durante sessão:
.\scripts\dev-optimize.ps1 status

# Fim da sessão:
.\scripts\dev-optimize.ps1 dev-off

# Se quiser desfazer tudo:
.\scripts\dev-optimize.ps1 reset   # como Admin
```

---

## Critérios de sucesso

- `setup` aplica todas as exclusões sem erros e cria backup
- `dev-on` para os 3 serviços e confirma no terminal
- `dev-off` retoma apenas os serviços que `dev-on` parou (idempotente)
- `status` detecta correctamente se setup foi executado
- `reset` restaura ao estado pré-setup sem deixar resíduos
- Nenhum comando toca em iCloud, OneDrive ou Chrome
- `help` imprime documentação legível sem flags adicionais
