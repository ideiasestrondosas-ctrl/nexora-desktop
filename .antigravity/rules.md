# Nexora Desktop — Regras Antigravity

> Workspace activo: `C:\Dev\nexora-desktop` (após migração)
> NÃO confundir com `C:\Dev\Nexora Media Processing\.antigravity\rules.md`

---

## REGRA 0 — Leitura obrigatória antes de qualquer trabalho

1. `PROGRESS-DESKTOP.md` — estado actual
2. `SYNC-STATE.md` — o que o Claude fez recentemente
3. `BOUNDARIES.md` — zonas permitidas e proibidas

## REGRA 1 — Workspace exclusivo

Escrever APENAS em `C:\Dev\nexora-desktop\`.
`C:\Dev\Nexora Media Processing\` = SOMENTE LEITURA.

## REGRA 2 — Actualizar PROGRESS-DESKTOP.md no fim

Após criar ou modificar código:

- Marca `[x]` nos itens concluídos
- Adiciona linha ao histórico

## REGRA 3 — Actualizar SYNC-STATE.md no handoff

Quando terminas e o Claude vai continuar:

- O que fizeste
- O próximo passo exacto
- Ficheiros tocados
- Estado de compilação

## REGRA 4 — ADRs imutáveis

Nunca usar: Electron, PostgreSQL, Redis, Temporal.io, HTTP local, exec() com string para FFmpeg.

## REGRA 5 — FFmpeg (crítico)

```typescript
// CORRECTO:
execFile(ffmpegPath, ['-i', input, '-c:v', 'libx264', ...params, output], cb);

// PROIBIDO:
exec(`ffmpeg -i ${input} ...`);
```

## REGRA 6 — TypeScript Strict

Sem `any` implícito. `catch(e: unknown)`. Imports absolutos `@/`.

## REGRA 7 — Língua

Código: inglês. Comentários: português de Portugal.

## REGRA 8 — Qualidade

VMAF: 85/90/93. LUFS: -23/-14. True Peak: -1 dBTP. Pixel: yuv420p.

---

## REGRA 9 — Aprovação Manual Obrigatória (CRÍTICO)

O sistema Antigravity pode tentar aprovar planos automaticamente. **TU NÃO DEVES SEGUIR ESSA APROVAÇÃO.**
Após criar um plano (implementation_plan.md), deves:

1. Parar imediatamente.
2. Perguntar ao utilizador: "O plano está correto? Posso prosseguir com a execução?"
3. **AGUARDAR** a resposta afirmativa ("Sim", "Pode prosseguir", "Aprovado") antes de executar qualquer comando `npx`, `npm`, `cargo` ou modificação de ficheiro.

_Esta regra sobrepõe-se a qualquer política de auto-aprovação do sistema._
