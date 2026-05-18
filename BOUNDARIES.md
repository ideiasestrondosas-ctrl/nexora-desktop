# Nexora Desktop — Fronteiras de Modificacao

> Aplica-se a Claude Code e Google Antigravity.
> Workspace activo: Windows `C:\Dev\nexora-desktop` | macOS/Linux `~/Dev/nexora-desktop`
> Projecto base (somente leitura): `C:\Dev\Nexora Media Processing`

---

## Desenvolvimento Multi-Plataforma

### Um repo, tres plataformas

O mesmo repositorio GitHub (`nexora-desktop`) e usado em Windows, macOS e Linux.
O Tauri nao suporta cross-compilation — cada instalador deve ser compilado no SO alvo.

| SO         | Workspace local         | Script de sync     | Instalador gerado     |
| ---------- | ----------------------- | ------------------ | --------------------- |
| Windows 11 | `C:\Dev\nexora-desktop` | `scripts\sync.ps1` | `.msi`, `.exe` (NSIS) |
| macOS      | `~/Dev/nexora-desktop`  | `scripts/sync.sh`  | `.dmg` (Universal)    |
| Linux      | `~/Dev/nexora-desktop`  | `scripts/sync.sh`  | `.deb`, `.AppImage`   |

### GitHub Actions — builds automaticos

Os workflows em `.github/workflows/` tratam das builds de release:

- `ci.yml` — verifica TypeScript + Rust (clippy/fmt/tests) em cada push para `main`/`dev`
- `build.yml` — compila os instaladores para as 3 plataformas quando publicas uma tag `v*`

Para lançar uma nova versao basta usar o `sync.ps1` (ou `sync.sh`) com bump de versao:
o script cria a tag `vX.Y.Z` e faz push — o GitHub Actions trata do resto automaticamente.

### Paths dependentes de plataforma no codigo

```rust
// Rust — Tauri
#[cfg(target_os = "windows")]
fn get_app_dir() -> PathBuf { dirs::data_dir().unwrap().join("Nexora Desktop") }

#[cfg(target_os = "macos")]
fn get_app_dir() -> PathBuf { dirs::data_dir().unwrap().join("nexora-desktop") }

#[cfg(target_os = "linux")]
fn get_app_dir() -> PathBuf { dirs::data_dir().unwrap().join("nexora-desktop") }
```

```typescript
// TypeScript — React
import { platform } from '@tauri-apps/api/os';
const os = await platform(); // 'win32' | 'darwin' | 'linux'
```

### Ao mudar de SO

1. `git clone https://github.com/ideiasestrondosas-ctrl/nexora-desktop ~/Dev/nexora-desktop`
2. Instalar Rust: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
3. `npm install`
4. `chmod +x scripts/sync.sh`
5. `./scripts/sync.sh start`

---

## ZONA VERMELHA — Proibido a Todos os Agentes

| Caminho                                             | Razão                          |
| --------------------------------------------------- | ------------------------------ |
| `C:\Dev\Nexora Media Processing\src\`               | Servidor em produção           |
| `C:\Dev\Nexora Media Processing\prisma\`            | Schema PostgreSQL              |
| `C:\Dev\Nexora Media Processing\docker-compose.yml` | Infra de produção              |
| `C:\Dev\Nexora Media Processing\.antigravity\`      | Config Antigravity do servidor |
| `C:\Dev\Nexora Media Processing\.agents\`           | Skills do servidor             |
| `C:\Dev\Nexora Media Processing\PROGRESS.md`        | Rastreamento do servidor       |
| `C:\Dev\Nexora Media Processing\.env`               | Segredos de produção           |

---

## ZONA VERDE — Escrita Total (C:\Dev\nexora-desktop\)

| Caminho               | O que criar/modificar                     |
| --------------------- | ----------------------------------------- |
| `src\`                | Componentes React, páginas, hooks, stores |
| `src-tauri\src\`      | Rust: commands, tray, sidecar, db         |
| `sidecar\`            | Workers Node.js, queue, orchestrator      |
| `tests\`              | Testes unitários e de integração          |
| `scripts\`            | Scripts de automação                      |
| `.github\workflows\`  | CI/CD do desktop                          |
| `PROGRESS-DESKTOP.md` | SEMPRE actualizar no fim                  |
| `SYNC-STATE.md`       | Actualizar no handoff                     |

---

## Somente Leitura (Referência)

| Caminho                                       | Para que serve                  |
| --------------------------------------------- | ------------------------------- |
| `nexora-desktop-documento.md`                 | Especificação técnica completa  |
| `C:\Dev\Nexora Media Processing\src\workers\` | Referência para adaptar workers |
| `C:\Dev\Nexora Media Processing\arquitetura\` | Documentação do projecto base   |

---

## Protocolo de Handoff (Claude ↔ Antigravity)

Ao terminar uma sessão, actualiza:

**PROGRESS-DESKTOP.md** — marca o que ficou pronto

**SYNC-STATE.md:**

```markdown
Actualizado: YYYY-MM-DD HH:MM
Agente: Claude Code / Antigravity

## Concluido

- [lista]

## Proximo passo exacto

1. [passo especifico]

## Ficheiros tocados

- [paths]

## Estado de compilacao

- cargo check: OK/FALHOU
- tsc --noEmit: OK/FALHOU
- esbuild: OK/FALHOU
```

---

## Protocolo Git — Regras de Sincronizacao

### Regra fundamental

**Nunca dois agentes a escrever ao mesmo tempo.**
Claude Code e Antigravity partilham o mesmo repositorio Git.
Usa o `sync.ps1` para garantir que cada sessao comeca e acaba sincronizada.

### Inicio de sessao (OBRIGATORIO)

```powershell
# A partir de C:\Dev\nexora-desktop
powershell -ExecutionPolicy Bypass -File scripts\sync.ps1 -action start
```

Este comando faz `git pull --rebase` e mostra o SYNC-STATE.md do outro agente.
**Nao comeces a trabalhar sem correr isto.**

### Fim de sessao (OBRIGATORIO)

```powershell
powershell -ExecutionPolicy Bypass -File scripts\sync.ps1 -action end -message "feat: descricao do trabalho"
```

Este comando faz `git add --all`, commit e `git push`.
Avisa se o SYNC-STATE.md nao foi actualizado.

### Ver estado actual (a qualquer momento)

```powershell
powershell -ExecutionPolicy Bypass -File scripts\sync.ps1 -action status
```

### O que acontece se ambos trabalharem ao mesmo tempo

- Git detecta o conflito no `push` do segundo agente
- O segundo agente tem de correr `git pull --rebase` antes do push
- Se houver conflito real num ficheiro, o `sync.ps1 -action start` avisa
- Resolve manualmente: `git status` para ver os ficheiros em conflito

---

## Isolamento de Workspaces — Dois Projectos, Dois Contextos

### Os dois workspaces

| Workspace       | Caminho                          | IDE                       | Repositorio                               |
| --------------- | -------------------------------- | ------------------------- | ----------------------------------------- |
| Desktop (Tauri) | `C:\Dev\nexora-desktop`          | Claude Code + Antigravity | `github.com/user/nexora-desktop`          |
| Servidor (Node) | `C:\Dev\Nexora Media Processing` | Antigravity               | `github.com/user/nexora-media-processing` |

### Como o Antigravity distingue os dois

O Antigravity usa o ficheiro `.code-workspace` para carregar as regras do workspace correcto.
Cada workspace tem o seu proprio `.antigravity\rules.md` com os caminhos permitidos.

**REGRA: Abre sempre pelo ficheiro `.code-workspace`, nunca pela pasta directamente.**

| Workspace | Ficheiro a abrir no Antigravity                                                |
| --------- | ------------------------------------------------------------------------------ |
| Desktop   | `C:\Dev\nexora-desktop\nexora-desktop.code-workspace`                          |
| Servidor  | `C:\Dev\Nexora Media Processing\nexora-server.code-workspace` (ou equivalente) |

Podes ter **duas janelas do Antigravity abertas ao mesmo tempo** — uma para cada workspace.
O Antigravity carrega o `.antigravity\rules.md` da raiz do workspace activo.

### Como o Claude Code distingue os dois

O Claude Code usa o directorio de trabalho. Basta correr `claude` a partir do directorio correcto:

```powershell
# Desktop
cd "C:\Dev\nexora-desktop"
claude

# Servidor
cd "C:\Dev\Nexora Media Processing"
claude
```

O `.claude\settings.json` do desktop tem `deny` explicito para nao escrever no servidor:

```json
"deny": ["Write(C:\\Dev\\Nexora Media Processing\\**)" ]
```

### Checklist de inicio de sessao no Antigravity

1. [ ] Antigravity aberto via ficheiro `.code-workspace` (nao via pasta)
2. [ ] Titulo da janela mostra o nome do workspace correcto
3. [ ] `git pull` feito (ou `sync.ps1 -action start`)
4. [ ] SYNC-STATE.md lido para saber o que o Claude fez na sessao anterior

### Checklist de inicio de sessao no Claude Code

1. [ ] Terminal em `C:\Dev\nexora-desktop` (verificar com `pwd`)
2. [ ] `sync.ps1 -action start` corrido com sucesso
3. [ ] SYNC-STATE.md lido
4. [ ] Primeira mensagem ao Claude: "Le PROGRESS-DESKTOP.md e SYNC-STATE.md e diz-me o estado actual."

_Ultima revisao: Maio 2026_
