# Estado de Sincronização — Nexora Desktop

> Handoff entre Claude Code e Google Antigravity.
> Actualizar no FIM de cada sessão. Lido no INÍCIO de cada sessão.

---

Actualizado: 2026-05-11
Agente: Antigravity (Gemini)

## O que foi feito

### Sessão Actual — Fixes Críticos + Automação de Ambiente — Concluído

**1. Fix Erro de Compilação (JSX)**
- `src/pages/AssetDetailPage.tsx`: Corrigido erro de sintaxe no `.map()` de jobs (falta de parêntesis de fecho). O erro impedia o Babel de compilar o ficheiro.

**2. Fix Erro de Configuração Vite (PostCSS/JSON)**
- `package.json`: Reescrito para remover o caractere invisível BOM (Byte Order Mark). O Vite tentava ler este ficheiro para procurar configs PostCSS e crashava com `SyntaxError: Unexpected token`.
- `postcss.config.cjs`: Identificado como obsoleto/inválido para Tailwind 4; recomendada a remoção.

**3. Fix Ecrã Preto (Runtime Crash)**
- `src/pages/DashboardPage.tsx`:
    - Corrigido crash de destruturação (`null`) no hook `useSystemMetrics`.
    - Corrigido uso de propriedades: `cpu` -> `cpuPercent` e `memory` -> `memUsedBytes` para alinhar com o modelo Rust/Tauri.
    - Implementada renderização segura com optional chaining (`metrics?.`).

**4. Automação do Ambiente de Desenvolvimento**
- `scripts/06-run-dev.ps1`: 
    - Implementada função `nxVerifyEnvironment` para verificar automaticamente `node_modules`, binários FFmpeg e builds do sidecar.
    - Adicionado logging persistente via `Start-Transcript` na pasta oculta `.logs/` (adicionada ao `.gitignore`).
    - Implementado handler de erro global que sugere prompts para a AI resolver problemas de compilação/execução.

**5. Refactoring de Testes e Orchestrator**
- `sidecar/queue/NexoraSimpleQueue.ts`: Alinhado com o padrão `getQueuedJobs(slots)` para satisfazer os mocks dos testes.
- `sidecar/db.ts`: Adicionados métodos `getQueuedJobs` e `markJobRunning`.
- `sidecar/orchestrator/NexoraDesktopOrchestrator.ts`: Adicionada chamada a `markJobRunning` no início do processamento para rastreio de estado nos testes.

---

## Estado de compilação

- `cargo check`: OK
- `npm run typecheck`: OK
- `npm test`: OK (Testes de Queue e Orchestrator corrigidos)
- `npm run tauri dev`: OK (Sem ecrã preto, dashboard funcional)
- `FFmpeg Sidecar`: Verificado e presente via script.

---

## Próximos passos

| Tarefa | Prioridade |
|---|---|
| Finalizar integração visual dos 7 ecrãs (ver ANTIGRAVITY-GUIA.md) | Alta |
| Testar fluxo de importação real de vídeo (Drag & Drop no Library/Dashboard) | Alta |
| Validar comunicação em tempo real dos logs no `LogViewer` | Média |

---

## Ficheiros criados/modificados (sessão actual)

```
scripts/06-run-dev.ps1                  (Automação, verification, logging)
src/pages/AssetDetailPage.tsx           (Fix syntax error)
src/pages/DashboardPage.tsx             (Fix black screen crash)
package.json                            (Fix BOM corruption)
.gitignore                              (Ignora .logs/)
sidecar/queue/NexoraSimpleQueue.ts      (Refactor para testes)
sidecar/db.ts                           (Novos helpers DB)
sidecar/orchestrator/NexoraDesktopOrchestrator.ts (Fix state tracking)
```

## Notas técnicas para o próximo agente

- **Métricas**: O hook `useSystemMetrics` pode retornar `null` inicialmente. Use sempre `metrics?.` e forneça valores por defeito (`|| 0`).
- **Logs**: Todas as sessões de dev são gravadas em `.logs/`. Se houver um erro novo, peça ao utilizador para colar o conteúdo do último ficheiro de log.
- **FFmpeg**: O script de dev agora garante a presença do binário. Não é necessário descarregar manualmente se usar o `06-run-dev.ps1`.
- **BOM**: Evite usar editores que adicionem Byte Order Mark ao `package.json`, pois quebra o parser do Vite para CSS.
