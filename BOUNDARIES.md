# Nexora Desktop — Fronteiras de Modificação

> Aplica-se a Claude Code e Google Antigravity.
> Workspace activo (pós-migração): `C:\Dev\nexora-desktop`
> Projecto base (somente leitura): `C:\Dev\Nexora Media Processing`

---

## ZONA VERMELHA — Proibido a Todos os Agentes

| Caminho | Razão |
|---|---|
| `C:\Dev\Nexora Media Processing\src\` | Servidor em produção |
| `C:\Dev\Nexora Media Processing\prisma\` | Schema PostgreSQL |
| `C:\Dev\Nexora Media Processing\docker-compose.yml` | Infra de produção |
| `C:\Dev\Nexora Media Processing\.antigravity\` | Config Antigravity do servidor |
| `C:\Dev\Nexora Media Processing\.agents\` | Skills do servidor |
| `C:\Dev\Nexora Media Processing\PROGRESS.md` | Rastreamento do servidor |
| `C:\Dev\Nexora Media Processing\.env` | Segredos de produção |

---

## ZONA VERDE — Escrita Total (C:\Dev\nexora-desktop\)

| Caminho | O que criar/modificar |
|---|---|
| `src\` | Componentes React, páginas, hooks, stores |
| `src-tauri\src\` | Rust: commands, tray, sidecar, db |
| `sidecar\` | Workers Node.js, queue, orchestrator |
| `tests\` | Testes unitários e de integração |
| `scripts\` | Scripts de automação |
| `.github\workflows\` | CI/CD do desktop |
| `PROGRESS-DESKTOP.md` | SEMPRE actualizar no fim |
| `SYNC-STATE.md` | Actualizar no handoff |

---

## Somente Leitura (Referência)

| Caminho | Para que serve |
|---|---|
| `nexora-desktop-documento.md` | Especificação técnica completa |
| `C:\Dev\Nexora Media Processing\src\workers\` | Referência para adaptar workers |
| `C:\Dev\Nexora Media Processing\arquitetura\` | Documentação do projecto base |

---

## Protocolo de Handoff (Claude ↔ Antigravity)

Ao terminar uma sessão, actualiza:

**PROGRESS-DESKTOP.md** — marca ✓ o que ficou pronto

**SYNC-STATE.md:**
```markdown
Actualizado: YYYY-MM-DD HH:MM
Agente: Claude Code / Antigravity

## Concluído
- [lista]

## Próximo passo exacto
1. [passo específico]

## Ficheiros tocados
- [paths]

## Estado de compilação
- cargo check: ✓/✗
- tsc --noEmit: ✓/✗
- esbuild: ✓/✗
```

*Última revisão: Maio 2026*
