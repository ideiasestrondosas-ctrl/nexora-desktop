---
name: webapp-testing
description: Frontend + sidecar testing para Nexora Desktop — Jest, Vitest, o que testar e o que não testar
metadata:
  type: implementation
---

# Webapp Testing — Nexora Desktop

## Stack de Testes

| Camada                                 | Framework                | Localização                   |
| -------------------------------------- | ------------------------ | ----------------------------- |
| Sidecar (queue, workers, orchestrator) | Jest + ts-jest           | `tests/*.test.ts`             |
| Frontend React                         | Vitest + Testing Library | `src/**/*.test.tsx` (a criar) |
| Rust commands                          | `cargo test`             | `src-tauri/src/**`            |

## O que Testar

### Sidecar (já tem cobertura)

- `tests/queue.test.ts` — 6 testes de fila (prioridade, retry, claim atómico)
- `tests/orchestrator.test.ts` — 9 testes de fluxo de pipeline
- `tests/workers.test.ts` — 9 testes de workers individuais

### Frontend (a expandir)

- **Hooks com lógica** — `usePhaseEta`, `useJobStatus`, `useVideoSrc`
- **Stores Zustand** — mutações de estado, selectores com `useShallow`
- **Utilitários** — `formatEtaMs`, `pipeline.ts` helpers
- **Componentes críticos** — `QueuePill`, `ThumbnailImg` (fallback IPC)

## O que NÃO Testar

- Componentes puramente visuais (cor, layout) — testar manualmente em dev mode
- Comandos Tauri IPC — mockar `invoke` é frágil; testar ponta-a-ponta em dev
- Lógica do Rust que já tem `cargo test`

## Regras

1. **Não mockar a base de dados** nos testes de sidecar — usar SQLite em memória (`:memory:`)
2. **Não mockar `invoke()`** em testes unitários de hooks — extrair a lógica pura e testar essa
3. **Cobertura mínima aceitável:** 80% nas funções utilitárias e stores

## Comandos

```bash
npm test                    # Jest (sidecar)
npm run test:coverage       # com cobertura
cargo test                  # Rust
```

## Padrão para Novos Testes de Hook

```typescript
// Extrair lógica pura do hook para função testável
// Testar a função, não o hook diretamente
import { formatEtaMs } from '@/lib/eta';

describe('formatEtaMs', () => {
  it('formata minutos correctamente', () => {
    expect(formatEtaMs(125000)).toBe('~2min');
  });
  it('devolve null para input null', () => {
    expect(formatEtaMs(null)).toBeNull();
  });
});
```
