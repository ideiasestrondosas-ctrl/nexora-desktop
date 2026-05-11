# Estado de Sincronização — Nexora Desktop

> Handoff entre Claude Code e Google Antigravity.
> Actualizar no FIM de cada sessão. Lido no INÍCIO de cada sessão.

---

Actualizado: 2026-05-11
Agente: Antigravity (Gemini 3.1 Pro)

## O que foi feito

### Sessão Actual — Alinhamento Total Frontend ↔ Backend — CONCLUÍDO

**1. Auditoria e Alinhamento de Tipos (Phase A & B)**
- Realizada auditoria completa dos 28 comandos Tauri contra as chamadas `invoke` nos 7 ecrãs.
- **DashboardPage.tsx**: 
    - Corrigida interface `AppStats` para `camelCase` e conversão de `bytes` para `GB`.
    - Implementada resolução de `filename` nos jobs através de um join local com `list_assets`.
    - Ligas métricas reais de CPU, RAM e detecção de GPU (`useGPU`).
    - Implementada distribuição VMAF real baseada nos jobs recentes.
- **AssetDetailPage.tsx**:
    - Corrigido `get_asset` para tratar retorno `Option<Asset>` (null handling).
    - Corrigidos parâmetros `id` e `asset_id` em múltiplas chamadas.
    - **Novo**: Ligado o botão "Processar Novamente" ao comando `submit_job`.
- **QueuePage.tsx**:
    - Corrigido `QueueStats` para `camelCase` (`doneToday`, `errorToday`).
    - Corrigidos comandos `cancel_job` e `retry_job` para usar a chave `{ id }` conforme esperado pelo Rust.
- **LibraryPage.tsx**:
    - Corrigido `ingest_asset` (removido parâmetro `profile` incompatível).
    - Corrigido `delete_asset` para usar `{ id }`.
- **SettingsPage.tsx**:
    - Corrigida interface `InstalledInfo` (campo `gpu` agora é um objecto `GpuInfo`).
    - **Sincronização**: Implementado o carregamento das definições do backend SQLite (`get_settings`) no arranque da aplicação.

**2. Fix Erro de Configuração Vite (PostCSS/JSON)**
- Re-verificado e corrigido o `package.json` para garantir a ausência de BOM (Byte Order Mark) que causava crash no loader de PostCSS do Vite.

**3. Limpeza e Refactoring (Phase C)**
- Removidos ficheiros obsoletos `HistoryPage.tsx` e `ProcessPage.tsx` que não eram utilizados no `App.tsx`.

---

## Estado de compilação

- `cargo check`: OK
- `npm run typecheck`: OK (Tipos alinhados entre TS e Rust)
- `npm run tauri dev`: OK (Dashboard funcional, comunicação total com backend)

---

## Próximos passos

| Tarefa | Prioridade |
|---|---|
| Testar fluxo de importação real de vídeo (Drag & Drop no Library/Dashboard) | Alta |
| Validar comunicação em tempo real dos logs no `LogViewer` | Média |
| Iniciar Fase 4 do Plano: Build + Testes + Distribuição | Baixa |

---

## Ficheiros modificados (sessão actual)

```
src/pages/DashboardPage.tsx      (Alinhamento total + métricas reais)
src/pages/AssetDetailPage.tsx    (Fix API calls + Submit Job)
src/pages/QueuePage.tsx          (Fix params + stats types)
src/pages/LibraryPage.tsx        (Fix API calls)
src/pages/SettingsPage.tsx       (Fix hardware info + load settings)
package.json                     (BOM removal)
src/pages/HistoryPage.tsx        (DELETED)
src/pages/ProcessPage.tsx        (DELETED)
```

## Notas técnicas para o próximo agente

- **API Contracts**: O backend Rust usa `serde(rename_all = "camelCase")`. Todos os novos DTOs no frontend devem seguir este padrão.
- **Job Identifiers**: Sempre que chamar `cancel_job` ou `retry_job`, a chave do parâmetro deve ser `id` (e não `jobId`).
- **Asset Detail**: O ecrã de detalhe agora está robusto contra assets apagados no backend.
- **Settings**: As definições no store Zustand são persistentes localmente, mas são sincronizadas com o SQLite no `SettingsPage`.
