## What's New

### Bug Fixes

- **Settings persistence** — valores numéricos/booleanos passados para Rust agora coercidos para `String`, corrigindo falha silenciosa do `serde_json` em `max_concurrent_jobs`, `gpu_acceleration`, `notifications_enabled`
- **Factory reset** — deixa de apagar `settings.json` (evita crash do LazyStore no relaunch); escreve `{}` para reinicialização limpa
- **Ecrã preto após reset** — `relaunch()` em dev mode substituído por `exit(0)` + toast; páginas lazy-loaded já não crasham no re-launch
- **Jobs presos em "processing"** — `AudioWorker` tornado não-crítico (try/catch); timeouts reduzidos de 600s → 120s
- **Mutex poison na fila** — `unwrap_or_else(|poison| poison.into_inner())` recupera lock sem bloquear polls subsequentes
- **Opener scope** — `opener:allow-open-url` agora com scope explícito para URLs `https://*` e `http://*` (fix "Abrir Guia Completo")
- **CI/CD** — placeholders para binários FFmpeg, `cargo fmt`, `cargo clippy` — todas as 3 plataformas passam

### New Features

- **Settings aplicam ao vivo** — alterações de idioma e concorrência da fila tomam efeito imediato via evento `settings:changed` sem reiniciar a app
- **Cache display na aba System** — secção "Cache" com:
  - Cache de Processamento (transcode + proxy): tamanho, contagem, abrir/limpar
  - Cache de Thumbnails: tamanho, contagem, abrir/limpar
  - Verificação de jobs activos antes de limpeza
- **Navegação in-app** — comando `find_asset_by_path` permite navegar de um job processado directamente para o Asset Detail
- **Reprocess popup em foreground** — `createPortal` renderiza popup fora do container com `overflow-hidden` da tabela
- **Pipeline Summary clicável** — badges de contagem expandem painel inline com lista de ficheiros + navegação
- **Delete com autorização** — segundo dialog nativo antes de apagar ficheiros do disco (asset individual e factory reset)
- **HelpModal remodelado** — sidebar vertical com badges numéricos, dimensões fixas, tips v0.23.0, botão "Copiar URL" via `tauri-plugin-clipboard-manager`
- **ErrorBoundary** — componente de recuperação para crashes de lazy-load entre tabs

### i18n

- 6 novas chaves de tradução (v0.23.0) + 16 chaves (v0.22.0) — total 22 chaves novas nos 15 idiomas
- Auditoria: 0 chaves em falta em qualquer locale

### Infrastructure

- `tauri-plugin-clipboard-manager` v2.3.2 adicionado (cargo + npm)
- Novos comandos Rust: `get_temp_info`, `clear_transcode_cache`, `clear_thumbs_cache`, `open_path`, `set_queue_concurrency`

### Documentation

- `USER_MANUAL.md` actualizado para v0.23.0
- `SCREEN_GUIDE.md` actualizado com UI patterns v0.23.0
- 10 screenshots actualizados (6 existentes + 4 novos v0.23.0)

---

### Instaladores

| Plataforma | Ficheiro                                  |
| ---------- | ----------------------------------------- |
| Windows    | `.msi` ou `.exe` (NSIS)                   |
| macOS      | `.dmg` (Universal: Intel + Apple Silicon) |
| Linux      | `.deb` (Debian/Ubuntu) ou `.AppImage`     |

Consulta o [CHANGELOG.md](CHANGELOG.md) para detalhes das alteracoes.
