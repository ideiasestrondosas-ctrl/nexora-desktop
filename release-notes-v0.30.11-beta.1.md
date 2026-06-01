## Resumo

Release v0.30.11-beta.1 — 10 alteracoes: UI em tempo real, correcoes de transparencia, engine fix e bugs de i18n.

## Novas Funcionalidades

- **TopBar QueuePill** — indicador de fila em tempo real: dot azul pulsante quando a processar, cinzento quando inactivo; mostra contagem de videos em curso e concluidos sem entrar no menu Fila
- **AssetDetailPage reactivo** — historico de jobs e metadata (VMAF, codec, output) actualizam em tempo real enquanto o video e processado, sem sair da pagina

## Correccoes

- **engine SEA** — corrigido erro "A dynamic import callback was not specified" no Node 22: pkg agora compilado com `--no-bytecode --public`; afectava processamento de videos reais
- **i18n pipeline** — chaves `pipeline.qc-pre` e `pipeline.qc-post` adicionadas aos locales EN e PT; antes mostravam os nomes brutos das keys em vez do texto traduzido
- **modais transparentes** — HelpModal, IngestProfileModal, BatchSubmitModal e respectivos dropdowns de perfil: `glass-surface` substituido por `bg-bg-primary`; antes ficavam invisiveis/invisiveis em dev mode, Windows 10 e Linux sem Mica
- **useJobStatus** — hook montado globalmente em App.tsx; o store de jobs ficava sempre vazio, impedindo actualizacoes em tempo real
- **sync.ps1 backreference** — bug no gerador de release que apagava a declaracao `VERSION_HISTORY` do version.ts; corrigido para proximo release bump

## Infraestrutura

- `npm run engine:build:*` actualizado com `--no-bytecode --public` para builds correctos
- `useShallow` no selector do AssetDetailPage para evitar re-renders desnecessarios
- Logging de diagnostico `[DIAG] step=X:start` adicionado ao orchestrator do engine

---

## Instaladores

| Plataforma | Ficheiro                                |
| ---------- | --------------------------------------- |
| Windows    | .msi ou .exe (NSIS)                     |
| macOS      | .dmg (Universal: Intel + Apple Silicon) |
| Linux      | .deb (Debian/Ubuntu) ou .AppImage       |

Consulta o [CHANGELOG.md](CHANGELOG.md) para detalhes das alteracoes.
