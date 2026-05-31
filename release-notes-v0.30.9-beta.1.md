## Resumo

Release v0.30.9-beta.1 — 12 alteracoes.

## Novas Funcionalidades

- botao 'Criar atalho no desktop' adaptativo por plataforma
- commands create_windows_shortcut, create_desktop_shortcut, create_macos_alias
- badge 'ja actualizado' inline com auto-dismiss 6s
- adicionar link 'Ver release notes completas' ao popup de actualizacao

## Correccoes

- hover overlay escuro em modo claro + badges de status visiveis
- melhorar contraste bordas e sidebar em modo claro e escuro
- corrigir regex overly-escaped em extractChangelogSection -- notes do latest.json agora populadas
- limpar mojibake UTF-8 -- caracteres garbled substituidos

## Infraestrutura e Documentacao

- fechar sessao 41 -- 7 fixes UI/UX v0.30.9
- plano de implementacao 7 fixes UI/UX v0.30.9
- 7 melhorias UI/UX v0.30.9 -- HelpModal, badges, shortcuts, update modal, encoding
- commitar plugin-os install + normalizar line endings docs sessao 40

## :warning: Breaking Changes

- `get_startup_status` IPC command: campos `nodeOk` e `sidecarOk` removidos, `engineOk` adicionado. Qualquer frontend que lesse `status.nodeOk` ou `status.sidecarOk` deixa de funcionar — mas nao existia outro consumer alem de `App.tsx` que ja foi actualizado.

---

## Instaladores

| Plataforma | Ficheiro                                |
| ---------- | --------------------------------------- |
| Windows    | .msi ou .exe (NSIS)                     |
| macOS      | .dmg (Universal: Intel + Apple Silicon) |
| Linux      | .deb (Debian/Ubuntu) ou .AppImage       |

Consulta o [CHANGELOG.md](CHANGELOG.md) para detalhes das alteracoes.
