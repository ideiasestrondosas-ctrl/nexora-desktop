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

| Caminho | Permissão |
|---|---|
| `C:\Dev\nexora-desktop\` (pós-migração) | ✅ ESCRITA TOTAL |
| `C:\Dev\Nexora Media Processing\src\workers\` | 👁️ LEITURA — referência |
| `C:\Dev\Nexora Media Processing\src\pipeline\` | 👁️ LEITURA — referência |
| `C:\Dev\Nexora Media Processing\arquitetura\` | 👁️ LEITURA — documentação |
| `C:\Dev\Nexora Media Processing\.antigravity\` | 🚫 PROIBIDO — nunca tocar |
| Todo o resto do projecto base | 🚫 PROIBIDO modificar |

---

## Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Shell nativa | Tauri 2.x (Rust stable) |
| Frontend | React 19 + TypeScript + Tailwind CSS + Zustand |
| Sidecar | Node.js 20 + TypeScript + esbuild |
| Base de dados | SQLite via better-sqlite3 |
| Build CI/CD | GitHub Actions + Tauri Action |
| Plataformas | Windows x64 · macOS Universal · Linux x64 |

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

### Fim
1. Actualiza `PROGRESS-DESKTOP.md`
2. Actualiza `SYNC-STATE.md`
3. `git add . && git commit -m "feat(desktop): ..."`

---

## ADRs Desktop (Imutáveis)

| ADR | Decisão |
|---|---|
| D001 | Tauri 2.x (não Electron) |
| D002 | Node.js sidecar para media |
| D003 | SQLite (sem PostgreSQL) |
| D004 | Fila em memória + SQLite (sem Redis) |
| D005 | Orchestrator local (sem Temporal.io) |
| D006 | Binários incluídos no instalador |
| D007 | GPU auto-detectada |
| D008 | Notificações nativas do SO |
| D009 | Auto-updater Tauri built-in |
| D010 | Mesmos parâmetros FFmpeg que servidor |
| D011 | IPC via Tauri Commands (sem HTTP) |
| D012 | Deep links `nexora://` |

*Última revisão: Maio 2026 — Workspace: C:\Dev\nexora-desktop*
