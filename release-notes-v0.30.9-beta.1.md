## Resumo

Release v0.30.9-beta.1 — 17 alteracoes.

## Novas Funcionalidades

- botao 'Criar atalho no desktop' adaptativo por plataforma
- commands create_windows_shortcut, create_desktop_shortcut, create_macos_alias
- badge 'ja actualizado' inline com auto-dismiss 6s
- adicionar link 'Ver release notes completas' ao popup de actualizacao

## Correccoes

- verificacoes pre-push -- tsc + cargo fmt + cargo check antes de git push
- cargo fmt -- create_macos_alias let script numa linha so
- version.ts -- declaracao VERSION_HISTORY em falta + aspas + sync.ps1 Join-String -> -join
- hover overlay escuro em modo claro + badges de status visiveis
- melhorar contraste bordas e sidebar em modo claro e escuro
- corrigir regex overly-escaped em extractChangelogSection -- notes do latest.json agora populadas
- limpar mojibake UTF-8 -- caracteres garbled substituidos

## Infraestrutura e Documentacao

- v0.30.9-beta.1
- commitar plugin-os install + normalizar line endings docs sessao 40
- fechar sessao 41 -- 7 fixes UI/UX v0.30.9
- plano de implementacao 7 fixes UI/UX v0.30.9
- 7 melhorias UI/UX v0.30.9 -- HelpModal, badges, shortcuts, update modal, encoding
- 2: Implementámos os 7 fixes UI/UX v0.30.9 no branch dev (contraste HelpModal, badges biblioteca, overlay hover, badge já

---

## Instaladores

| Plataforma | Ficheiro                                |
| ---------- | --------------------------------------- |
| Windows    | .msi ou .exe (NSIS)                     |
| macOS      | .dmg (Universal: Intel + Apple Silicon) |
| Linux      | .deb (Debian/Ubuntu) ou .AppImage       |

Consulta o [CHANGELOG.md](CHANGELOG.md) para detalhes das alteracoes.
