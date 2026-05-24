# Estado de Sincronizacao - Nexora Desktop

> Handoff entre Claude Code e Google Antigravity.
> Actualizar no FIM de cada sessao. Lido no INICIO de cada sessao.

---

Actualizado: 2026-05-24 18:30
Agente: Claude Code (claude-sonnet-4-6)

## O que foi feito

### Sessao 20 — Auditoria Completa: Segurança, Performance, Platform UX + Keychain — CONCLUIDO

**Pedido:** Implementar todas as melhorias levantadas pela auditoria das sessões 17/18 (segurança, performance, UX adaptativa) e as fases de documentação em falta.

**Implementacao:**

1. **Segurança S1 — Credenciais cloud no keychain OS:**
   - `keyring = "3"` adicionado ao `Cargo.toml`
   - `save_credentials`, `load_credentials`, `delete_credentials` em `commands/cloud.rs`
   - `create_cloud_profile` e `update_cloud_profile` guardam creds no keychain; `delete_cloud_profile` limpa entrada
   - `run_cloud_uploads` carrega do keychain, fallback para config blob (backward-compat)
   - `CloudProfileModal.tsx`: `splitFields()` separa credenciais de config; `credentialsJson` passado separadamente no invoke

2. **Segurança S2 — Path traversal SMB:**
   - `validate_remote_path()` em `cloud/smb.rs` rejeita componentes `..` com `split(['/', '\\']).any(|c| c == "..")`
   - 4 unit tests: traversal simples, traversal profundo, caminhos normais aceites, resolve\_\*
   - Fix: o teste anterior usava `Path::starts_with` que falha para paths não-normalizados

3. **Segurança S3 — Validação endpoint logs:**
   - `validate_log_endpoint(raw)` em `commands/logs.rs` — rejeita URLs sem protocolo http/https
   - 4 unit tests: http aceite, https aceite, sem protocolo rejeitado, vazio rejeitado

4. **Segurança S4 — FTP max file size:**
   - `FTP_MAX_FILE_BYTES: u64 = 2 * 1024 * 1024 * 1024` substituindo magic number em `cloud/ftp.rs`

5. **Segurança S5 — cargo audit:**
   - `src-tauri/audit.toml` criado com `RUSTSEC-2023-0071` documentado (RSA Marvin, via russh, password auth only)
   - `[warnings] unmaintained = "warn"` configurado

6. **Performance Phase 3:**
   - `vite.config.ts`: removido `manualChunks` vendor chunk quebrado (gerava bundle 0 bytes)
   - Lazy loading: 4 páginas pesadas com `React.lazy()` + `<Suspense>`
   - `tokio::fs` em comandos Rust async (substituindo `std::fs` bloqueante)
   - Clone desnecessário eliminado em `run_cloud_uploads`
   - Polling de logs: 2s → 5s, scroll condicional

7. **Platform UX Phase 4:**
   - `src/hooks/usePlatform.ts` com `isMac`, `isWindows`, `isLinux`, `modKey`, `accentStyle`
   - `get_platform` comando Rust com `#[cfg(target_os)]`
   - Menus nativos por plataforma (Tauri menu builder)
   - `WindowControls.tsx` — titlebar adaptativa (traffic lights macOS, controlos Windows)
   - `window-vibrancy` crate para efeitos Mica/Acrylic (Windows 11) e Vibrancy (macOS)

8. **Documentation Phase 1:**
   - i18n lazy-load: 14 locales on-demand, só `en.json` no bundle inicial; `initI18n()` awaited em `main.tsx`
   - README.md actualizado (stack, cloud, screenshots, build)
   - HelpModal — aba Cloud com documentação de todos os providers + GDrive OAuth step-by-step
   - `package.json` metadata (`description`, `author`, `license`) preenchidos

9. **Watch-GitHubActions em sync.ps1:**
   - Função `Watch-GitHubActions($sha, $version, $token)` adicionada ao `scripts/sync.ps1`
   - Poll da GitHub REST API (`/actions/runs?head_sha=`) a cada 30s
   - Mostra ⏳/✅/❌ por workflow; termina quando todos concluídos ou timeout (30 min)
   - Chamada no bloco Release após merge bem-sucedido (opt-in: [S/N])

10. **Testes:** 27/27 `cargo test` passam (smb×8, logs×4, ftp×4, sftp×3, outros×8)

## Proximo passo exacto

Aguardar próximo pedido do utilizador. Possíveis prioridades:

- Watch Folders (crate `notify`) — monitorização automática de pastas
- Tradução profissional dos locales não-PT
- Próximo release (bump versão, tag, GitHub Release)

## Ficheiros tocados

- `src-tauri/Cargo.toml` (keyring, window-vibrancy)
- `src-tauri/src/commands/cloud.rs` (keychain helpers, create/update/delete/run_cloud_uploads)
- `src-tauri/src/cloud/smb.rs` (validate_remote_path + tests)
- `src-tauri/src/cloud/ftp.rs` (FTP_MAX_FILE_BYTES constante)
- `src-tauri/src/commands/logs.rs` (validate_log_endpoint + tests)
- `src-tauri/audit.toml` (novo)
- `src/components/CloudProfileModal.tsx` (splitFields com client_secret, credentialsJson separado)
- `src/hooks/usePlatform.ts` (novo)
- `src/components/WindowControls.tsx` (novo)
- `src/i18n/index.ts` (lazy-load)
- `src/main.tsx` (await initI18n)
- `vite.config.ts` (remove manualChunks)
- `scripts/sync.ps1` (Watch-GitHubActions)
- `package.json` (description, author, license)
- `PROGRESS-DESKTOP.md`
- `SYNC-STATE.md`

## Estado de compilacao

- `cargo test`: 27/27 ✅
- `cargo check`: OK ✅
- `tsc --noEmit`: OK ✅

## Commits desta sessao

- `efed769` security(cloud): path traversal fix in SMB + audit hardening
- `b6b76d1` security(cloud): store credentials in OS keychain instead of SQLite plaintext
- `7b7a22c` perf(rust): substituir std::fs por tokio::fs em comandos async
- `7f4e33b` perf: eliminar clone desnecessário e reduzir polling de logs
- `eb797ba` perf(bundle): lazy-load 4 heavy pages, remove broken vendor chunk
- `f3d8abf` perf(i18n): lazy-load locales on demand
- `65a52dc` feat(platform): UX adaptativo por plataforma — Phase 4
- `e556f0c` feat(sync): Watch-GitHubActions após merge Release

---

Actualizado: 2026-05-24 16:00
Agente: Antigravity (Gemini 3.5 Flash)

## O que foi feito

### Sessao 19 — Plano de Análise de UX Adaptativa e Viabilidade do Windows Community Toolkit — CONCLUIDO

**Pedido:** Criar um plano de análise (sem atualizar código) para a feature "Platform-Adaptive UX" (não iniciada). Investigar se o Windows Community Toolkit (https://github.com/CommunityToolkit/Windows) pode ser adaptado para Windows, se vale a pena ou não, ou se o que foi feito está correto. O objetivo é adotar a UX mais próxima possível de cada plataforma (Windows, macOS, Linux) mantendo a lógica de negócio e o backend unificados.

**Implementacao:**

1. **Investigação do Windows Community Toolkit**:
   - Conclusão: É uma biblioteca nativa para C# / XAML / .NET (WinUI 3/UWP). Como o Nexora Desktop utiliza Tauri 2.x + React + WebView, é um mismatch tecnológico total.
   - Veredicto: **Não vale a pena**, pois fragmentaria a base de código, exigiria bridges C++/C# extremamente pesadas e complexas, e quebraria a unificação cross-platform.
2. **Validação da Abordagem Atual**:
   - Confirmado que a stack atual (Tauri 2.x + React 19 + Tailwind CSS v4) é a **correta, moderna e recomendada** para conseguir interfaces responsivas e de alta fidelidade visual.
3. **Desenho da Estratégia de UX Adaptativa Multiplataforma**:
   - Apresentada estratégia dividida em duas camadas (Nativa com Rust `window-vibrancy` e Apresentação com React/Tailwind/i18n).
   - Efeitos visuais nativos: Mica/Acrylic no Windows 11, Vibrancy (NSVisualEffectView) no macOS.
   - UI adaptada ao SO em tempo de execução: Tipografia (Segoe UI vs SF Pro vs Cantarell), arredondamento de cantos (rounded-lg vs rounded-xl vs rounded-md), cabeçalho e controlos de janela adaptativos (semáforos à esquerda no macOS vs controlos Fluent à direita no Windows 11), atalhos de teclado dinâmicos (Cmd vs Ctrl).
4. **Criação do Plano de Análise**:
   - Guardado em `implementation_plan.md` no diretório de artifacts da conversação.
5. **Atualização do Contexto do Repositório**:
   - Preenchido o `.session-info.md` no início e atualizado no fim.
   - Atualizado o `PROGRESS-DESKTOP.md` e o `SYNC-STATE.md`.

## Proximo passo exacto

1. Obter aprovação do utilizador sobre o plano de análise e a não adoção do Windows Community Toolkit.
2. Decidir se avançamos para a fase de implementação técnica da UX Adaptativa.

## Ficheiros tocados

- .session-info.md
- PROGRESS-DESKTOP.md
- SYNC-STATE.md
- C:\Users\arnal\.gemini\antigravity-ide\brain\da7b78f4-e0c9-4262-aa58-8f5d75b8fffa\implementation_plan.md (novo)

## Estado de compilacao

- cargo check: OK
- tsc --noEmit: OK
- esbuild: OK

---

Actualizado: 2026-05-24 15:35
Agente: Antigravity (Gemini 3.5 Flash)

## O que foi feito

### Sessao 18 — Analise Estruturada e Plano de Melhorias (UX, Seguranca, Optimizacao) — CONCLUIDO

**Pedido:** Criar um plano detalhado e priorizado de melhorias, segurança, otimização e UX multiplataforma (Windows, macOS, Linux) para a aplicação Nexora Desktop, mantendo a paridade de funcionalidades e o backend unificado. Sem implementar código na aplicação.

**Implementacao:**

1. **Preenchimento do `.session-info.md`:**
   - Inicializado de acordo com o template e as regras em `AGENTS.md`.

2. **Auditoria de Segurança (P0):**
   - Identificada vulnerabilidade crítica no armazenamento de credenciais cloud em texto plano no SQLite. Proposta integração de `tauri-plugin-stronghold` ou Keychain nativa do SO (`keyring-rs`).
   - Proposta de proteção contra Path Traversal em APIs que tocam o sistema de ficheiros com validações estritas em Rust.

3. **Otimizações e Resiliência (P1):**
   - Proposta de mecanismo de Heartbeat bidirecional no sidecar para terminação limpa de processos zumbis de `FFmpeg`.
   - Proposta de Dynamic Thread Throttle baseado na carga de CPU/GPU recolhida dinamicamente.
   - Proposta de Auto-Purging para limitar e manter limpo o tamanho da cache local de forma configurável.

4. **Experiência de Utilizador Multiplataforma (P1):**
   - Análise de UX premium para Windows 11 (Mica/Acrylic, Frameless title bar), macOS (Vibrancy, layout seguro de semáforos) e Linux (GTK Scroll styling, decorações nativas estáveis).
   - Proposta de teclado de atalho com correspondência de modificadores dinâmica (`Ctrl` vs `Cmd`).

5. **Novas Funcionalidades Premium Recomendadas (P2):**
   - Proposta de **Watch Folders** (Pastas de Monitorização ativa) integradas no Rust usando a crate `notify`.
   - Proposta de **Leitor de Vídeo Premium com Comparador de Qualidade Visual** Side-by-Side em React.
   - Proposta de **Visual Preset Creator** na interface de configurações.

6. **Criação do Plano de Ação Estruturado:**
   - Criado e guardado o plano de análise detalhado no artifact `implementation_plan.md`.

**Verificação:**

- Sem alterações funcionais no código principal da aplicação em conformidade com as restrições do utilizador.
- Ficheiro `.session-info.md` devidamente preenchido.

---

Actualizado: 2026-05-24
Agente: OpenCode (kimi-k2.6)

## O que foi feito

### Sessao 17 — Karpathy Guidelines Integration — CONCLUIDO

**Pedido:** Integrar as Karpathy Guidelines (andrejkarpthy-skills) no workflow do projecto: atualizar AGENTS.md, criar skill OpenCode, e criar test script automatizado.

**Implementacao:**

1. **AGENTS.md atualizado:**
   - Nova secao "Karpathy Guidelines — Regras de Comportamento" com 4 principios em PT
   - Tabela de merge analysis (o que ja existia vs. o que e novo)
   - Think Before Coding, Simplicity First, Surgical Changes, Goal-Driven Execution

2. **Skill `karpathy-guidelines` criada:**
   - Localizacao: `~/.opencode/skills/karpathy-guidelines/SKILL.md`
   - Frontmatter YAML valido (name, description)
   - Tipo: Rigid (follow exactly)
   - Merge analysis em ingles (consistente com Superpowers skills)

3. **Configuracao OpenCode:**
   - `~/.config/opencode/opencode.jsonc` atualizado com `skills.paths`
   - Aponta para `C:/Users/arnal/.opencode/skills`

4. **Test script `scripts/test-karpathy.mjs`:**
   - Valida estrutura do SKILL.md (frontmatter, secoes, tipo Rigid)
   - Valida AGENTS.md (secao Karpathy, regras em PT)
   - Valida opencode.jsonc (skills.paths)
   - Simula 4 cenarios heurísticos (Think Before Coding, Goal-Driven, Surgical, Simplicity)
   - Exit code 0/1 (para CI)
   - Resultado actual: 25/25 passaram

5. **CI workflow `.github/workflows/test-karpathy.yml`:**
   - Dispara em push/PR para main
   - Node.js 20, corre `scripts/test-karpathy.mjs`
   - Graceful degradation em CI (skill nao disponivel no runner, valida so AGENTS.md)

**Impacto nos agentes:**

- Claude Code e Antigravity: recebem guidelines via AGENTS.md (ja aplicavel)
- OpenCode: recebe guidelines via AGENTS.md + skill `karpathy-guidelines` (reforco extra)
- Test script: nao afecta runtime dos agentes (apenas CI/validacao)

---

Actualizado: 2026-05-22
Agente: Claude Code (claude-sonnet-4-6)

## O que foi feito

### Sessao 16 — Cloud File Browser + Cloud Upload Fix + GDrive Upsert (v0.25.0) — CONCLUIDO

**Pedido:** (1) Cloud File Browser em cada perfil cloud nas Definições; (2) investigar porque ficheiros processados não são enviados para FTP/SMB; (3) GDrive upsert no upload.

**Implementação:**

1. **Cloud File Browser (10 tasks, 22 commits):**
   - `RemoteFile` struct (`name, path, size, modified, is_dir`, camelCase serde) + `list_files`/`delete_files` defaults no trait `CloudProvider`
   - `FtpProvider`: parser UNIX + DOS, quit-safe, 7 unit tests
   - `SftpProvider`: `read_dir` sync iterator, sessão fechada em caso de erro
   - `SmbProvider`: `std::fs::read_dir`, guarda de path traversal (`full.starts_with(base)`)
   - `S3Provider`: `list_objects_v2` com delimiter `"/"`, `common_prefixes`=pastas, `contents`=ficheiros, strip_prefix exacto
   - `GDriveProvider`: Drive v3 API, resolve `base_path` para folder ID, download com HTTP status check, file ID extraído de compound path
   - `ICloudProvider`: `Err` explícito em `list_files`/`delete_files`/`download`
   - 3 comandos Tauri: `cloud_list_files`, `cloud_delete_files`, `cloud_download_file` + helper `load_profile_provider`
   - `CloudFileBrowserModal.tsx`: spinner, erro+retry, vazio, tabela, breadcrumb, selecção, download (diálogo nativo), delete individual/seleccionados/todos
   - `SettingsPage.tsx`: botão Browse antes de Editar; disabled+tooltip para iCloud
   - 18 chaves `cloudBrowser.*` em 15 locales; 13 testes de componente

2. **CRÍTICO — Cloud upload nunca accionado:**
   - `queue.rs`: `job:completed` actualizava a BD mas não chamava `process_cloud_destinations`
   - Fix: `tauri::async_runtime::spawn` após emitir o evento, chama `run_cloud_uploads(&job_id, &state)`
   - Extraída função `pub(crate) run_cloud_uploads` de `process_cloud_destinations` para reutilização

3. **Credenciais vazias em process_cloud_destinations:**
   - Linha 209: `let creds = serde_json::Value::Object(Default::default())` passava creds vazias
   - Fix: `let creds = config.clone()` — credenciais estão no mesmo JSON que config

4. **GDrive Browse bugs:**
   - "folder_id não configurado": `folder_id` nunca é persistido, apenas `base_path`. Fix: resolver segmentos de `base_path` via Drive API quando `folder_id` é None; `""` ou `"/"` retorna `"root"`
   - "Pasta não encontrada": pesquisa sem `parent_id` não restrita à raiz. Fix: `'root' in parents` quando `parent_id` is None

5. **GDrive upsert:**
   - Upload sempre criava duplicados (POST cria novo ID). Fix: pesquisar ficheiro por nome na pasta de destino; PATCH se existe, POST com `parents` se novo

**Commits chave:**

- `006a496` feat(cloud): RemoteFile + trait defaults
- `c230f0b..6f163f5` feat(cloud/\*): list_files + delete_files por provider
- `151b4f0` feat(cloud): comandos Tauri
- `0fc4936` feat(ui): CloudFileBrowserModal
- `0b9e1f1` feat(settings): Browse button + i18n
- `067bdfa` fix(cloud/gdrive): resolve base_path segments
- `091c045` fix(cloud/gdrive): 'root' in parents
- `2febb7b` fix(cloud): disparar upload + creds fix
- `377a75a` fix(cloud/gdrive): upsert upload

**Verificação:** cargo check limpo · 48 testes passam · confirmado por utilizador (FTP/SMB upload funciona)

---

### Sessao 15 — Cloud Storage Integration (Sub-projecto A, todas as 4 fases) — CONCLUIDO

**Pedido:** Integrar S3, Google Drive, iCloud e outras drives cloud para entrega automática de ficheiros processados e ingestão de ficheiros a partir da cloud. Entrega faseada: Fase 1 (infra + FTP/SFTP/SMB + UI), Fase 2 (S3), Fase 3 (Google Drive + OAuth), Fase 4 (iCloud).

**Implementacao (16 tasks, 11 commits):**

1. **Migracao SQLite** — 2 novas tabelas: `cloud_profiles` (id, name, provider_type, config_json, created_at) e `job_cloud_destinations` (job_id, profile_id, status, upload_url, error_msg, uploaded_at).

2. **Trait `CloudProvider`** (`src-tauri/src/cloud/provider.rs`) — interface async com `upload()`, `download()`, `test_connection()`, `provider_type()`.

3. **6 providers Rust:**
   - `SmbProvider` — pasta local/rede via `std::fs`
   - `FtpProvider` — `suppaftp 6` async
   - `SftpProvider` — `russh 0.45` + `russh-sftp 2`
   - `S3Provider` — `rust-s3 0.37`, `Region::Custom` para MinIO/Wasabi/B2, `with_path_style()`
   - `GDriveProvider` — `reqwest`, multipart upload, bearer auth, 401 especifico
   - `ICloudProvider` — wrapper de `SmbProvider`, auto-deteta `%USERPROFILE%\iCloudDrive` (Windows) ou `~/Library/Mobile Documents/com~apple~CloudDocs` (macOS)

4. **11 comandos IPC** (`src-tauri/src/commands/cloud.rs`):
   - CRUD de perfis: `get_cloud_profiles`, `create_cloud_profile`, `update_cloud_profile`, `delete_cloud_profile`
   - Teste e upload: `test_cloud_connection`, `process_cloud_destinations`, `retry_cloud_upload`, `add_cloud_asset`
   - Job cloud: `get_job_cloud_destinations`
   - OAuth GDrive: `gdrive_start_auth`, `gdrive_poll_auth`

5. **Frontend:**
   - `src/store/cloud.ts` — Zustand store com `CloudProfile`, `JobCloudDestination`, `PROVIDER_LABELS`, `PROVIDER_FIELDS`
   - `CloudProfileModal.tsx` — Radix UI Dialog, dynamic fields, test connection, GDrive OAuth panel com polling a 5s
   - `SettingsPage.tsx` — nova aba "Cloud" com lista de perfis, editar/apagar
   - `CloudDestinationPicker.tsx` — toggle buttons no modal de submissao de job
   - `IngestProfileModal.tsx` — integra `CloudDestinationPicker`
   - `App.tsx` — `useEffect` bare que deteta transicoes job→done e chama `process_cloud_destinations`
   - `AssetDetailPage.tsx` — secao de destinos cloud com status icons, timestamps, erros, botao retry
   - `LibraryPage.tsx` — botao "Da Cloud" para ingerir ficheiros a partir de perfil cloud

6. **Credenciais (v1):** Sem encrypted store (async incompativel com sync Rust). Credenciais guardadas junto com config em `config_json` no SQLite. Frontend passa credenciais directamente no `test_cloud_connection`.

7. **Retry manual:** `process_cloud_destinations` usa loop manual 3 tentativas com backoff exponencial (2^attempt s) — `async_trait` nao aceita `FnMut() -> Fut` com lifetime da trait.

**Bugs corrigidos durante implementacao:**

- `filter_map(|r| r.ok())` em destinations query → substituido por `.collect::<Result<Vec<_>, _>>()` para propagar erros
- `unwrap_or_default()` em config JSON parse → substituido por `match` que marca destination como 'failed' e faz `continue`
- `useEffect` deps em `CloudProfileModal` — `editing` adicionado ao array `[provider, editing]`
- `rust-s3` (crate correcto) em vez de `s3 = "0.35"` (crate errado no plano)
- `reqwest` sem feature `"json"` — adicionada para chamadas `.json()` em `GDriveProvider` e OAuth

**Commits:**

- `f89e707` feat(cloud): register cloud commands in Tauri invoke handler
- `789bd7b` feat(cloud): cloud Zustand store + provider metadata
- `1751a2a` feat(cloud): CloudProfileModal — create/edit/test profiles
- `2a1b61f` feat(cloud): Settings Cloud tab — profile list and management
- `604eebe` feat(cloud): CloudDestinationPicker + submit_job cloud destinations
- `71158af` feat(cloud): auto-trigger cloud upload on job completion
- `0148676` feat(cloud): AssetDetailPage cloud destinations section
- `7bc4c2a` feat(cloud): Da Cloud button — add cloud-sourced assets
- `30392db` feat(cloud): S3Provider — AWS S3 and compatibles
- `82c844b` feat(cloud): GDriveProvider + OAuth Device Flow
- `3ec60de` feat(cloud): ICloudProvider — iCloud Drive via local folder

**Verificacao:** cargo check nao foi executado no final (contexto esgotado) — recomendado executar `cargo check` e `npm run lint` antes do proximo release.

---

### Sessao 14 — sync.ps1: Automacao Completa do Release (Preview + Agent + Ficheiros) — CONCLUIDO

**Pedido:** Tornar o script `sync.ps1` (opcao 3, modo Release) completamente automatico: gerar todos os ficheiros de release, identificar o agente, mostrar preview antes de executar, e dar opcao de modo manual.

**Implementacao:**

1. **Preview interativo (`Show-ReleasePreview`)** — antes de fazer qualquer alteracao, mostra:
   - Agente detectado
   - Ficheiros que serao criados/atualizados
   - Numero de commits por categoria (Added/Fixed/Changed/Infra/Docs)
   - Titulo gerado automaticamente
   - Opcoes: [Enter] continuar / [M] manual / [C] cancelar

2. **Deteccao do agente (`Get-AgentInfo`)** — por ordem de prioridade:
   - SYNC-STATE.md (campo "Agente:")
   - Variavel de ambiente `$env:NEXORA_AGENT`
   - Ficheiro `.agent` no workspace
   - Pergunta interativa com opcoes Claude/Antigravity/OpenCode/Outro

3. **Geracao automatica de ficheiros:**
   - `release-notes-vX.Y.Z.md` — formato estruturado com secoes (Bug Fixes, New Features, Changed, i18n, Infrastructure, Documentation) + tabela de instaladores
   - `SYNC-STATE.md` — nova sessao com agente, data, resumo por categoria, ficheiros alterados
   - `src/lib/version.ts` — nova entrada no `VERSION_HISTORY`
   - `CHANGELOG.md` — agrega TODOS os commits desde a ultima tag (nao so a mensagem de commit)

4. **Classificacao de commits (`CategorizeCommits`)**:
   - `feat:` → Added
   - `fix:` → Fixed
   - `refactor:/style:/perf:` → Changed
   - `docs:` → Documentation
   - `build:/ci:/chore:/deps:` → Infrastructure

5. **Integracao no fluxo de release**:
   - Preview → Modo Manual (sai para edicao manual) / Continuar
   - Aplica alteracoes nos ficheiros
   - Commit de release inclui: package.json, Cargo.toml, tauri.conf.json, CHANGELOG.md, PROGRESS-DESKTOP.md, release-notes-vX.Y.Z.md, SYNC-STATE.md, version.ts
   - Tag + push + merge main + GitHub Release (com titulo e corpo automaticos)

**Testes:**

- Sintaxe do script: validada via PowerShell AST parser ✅
- `Parse-ChangelogSection`: extrai secao v0.22.0 corretamente (949 chars)
- `Get-ReleaseTitle`: v0.22.0 → "MediaInfo, Bug Fixes & Platform Polish"
- `Update-VersionTs`: adiciona entrada no array corretamente
- Sem erros de sintaxe no script completo (16 funcoes definidas)

**Ficheiro alterado:** `scripts/sync.ps1` (~+350 linhas, 7 funcoes novas, 2 blocos modificados)

---

### Sessao 12 — Script sync.ps1: GitHub Release automatico com titulo e corpo inteligente — CONCLUIDO

**Pedido:** Adicionar ao script `sync.ps1` (opcao 3, modo Release) a criacao automatica de GitHub Releases com titulo e corpo preenchidos automaticamente, ao mesmo genero do que se fez para v0.22.0 ("Media Info UX, Bug Fixes & Platform Polish").

**Implementacao:**

1. **Nova funcao `Parse-ChangelogSection($version)`** — extrai a secao da versao do `CHANGELOG.md` usando regex `(?s)` single-line mode.

2. **Nova funcao `Get-ReleaseTitle($version, $changelogSection)`** — classifica itens por categoria (`### Added`, `### Fixed`, etc.), remove prefixos conventional commits (`feat:`, `fix:`), extrai nome curto da feature principal (ate 40 chars) e gera titulo automatico:
   - Features + Fixes → `"FeatureName, Bug Fixes & Platform Polish"`
   - Apenas Features → `"FeatureName & Enhancements"`
   - Apenas Fixes → `"Bug Fixes & Stability"`
   - Docs/Infra → `"Documentation & Platform Updates"`

3. **Nova funcao `Build-ReleaseBody($version, $commitMsg)`** — monta corpo estruturado em Markdown com prioridade:
   - **P1:** `release-notes-vX.Y.Z.md` (se existir)
   - **P2:** `CHANGELOG.md` (secao da versao, categorizado em New Features / Bug Fixes / Changed / Infrastructure & Documentation + tabela de instaladores)
   - **P3:** Fallback com mensagem de commit

4. **Modificacao do bloco de criacao da release** — o `name` e `body` da GitHub API agora usam `$releaseTitle` e `$releaseBodyText` em vez do texto estatico.

**Testes:**

- v0.22.0 → titulo: `"MediaInfo, Bug Fixes & Platform Polish"` (23 features + 3 fixes detectados)
- v0.24.0 → titulo: `"Settings: Apply Live + Cache Display & Enhancements"` (1 feature)
- Corpo estruturado com secoes corretas e tabela de instaladores

**Ficheiro alterado:** `scripts/sync.ps1` (~+120 linhas, 3 funcoes novas)

---

### Sessao 6 — v0.23.0 UX Fixes — CONCLUIDO

**5 melhorias UX implementadas:**

1. **Item 1 — "Abrir ficheiro processado" navega in-app**: novo comando Rust `find_asset_by_path` em `assets.rs`; `AssetDetailPage` tenta navegar para o asset de output; fallback para `revealItemInDir` se não estiver na biblioteca.

2. **Item 2 — Job history filtrado por asset**: confirmado que já estava correcto (`list_jobs` já filtrava por `asset_id`). Sem alterações de código necessárias.

3. **Item 3 — Reprocess popup em foreground**: `QueuePage` usa `createPortal` (react-dom) para renderizar o popup em `document.body` com `position: fixed`, escapando o `overflow-hidden` do container da tabela.

4. **Item 4 — Pipeline Summary clicável**: badges de contagem tornados `<button>` que expandem painel inline com lista de ficheiros (nome + perfil + seta de navegação para o asset).

5. **Item 5 — Delete com autorização explícita para ficheiros**: `delete_asset` e `factory_reset` Rust aceitam `delete_files: bool`; frontend apresenta segundo dialog nativo antes de apagar.

**Ficheiros alterados:** `assets.rs`, `system.rs`, `lib.rs`, `App.tsx`, `AssetDetailPage.tsx`, `LibraryPage.tsx`, `SettingsPage.tsx`, `PipelineSummary.tsx`, `QueuePage.tsx`, 15 locales i18n.

**Commits v0.23.0 (10 commits, branch dev):**

- `0a6fc13` feat(i18n): 6 novas chaves para v0.23.0
- `4412bd2` feat(queue): portal para popup de reprocessamento
- `0a8204a` feat(pipeline-summary): painel expansível inline
- `fca036f` feat(settings): factory reset com autorização de ficheiros
- `fea4162` feat(library): delete com autorização de ficheiros
- `949165d` feat(asset-detail): navegação in-app + delete 2 passos
- `e5827b9` feat(app): pass onSelectAsset to AssetDetailPage
- `2d459cb` + `a8cd47e` + `67d5354` Rust commands

**Verificação:** lint ✅ · tsc ✅ · 24/24 testes ✅ · cargo build ✅

---

### Sessao 5 — Correção CI/CD (format:check, cargo clippy, placeholders) — CONCLUIDO

**Problema:** GitHub Actions `ci.yml` e `build.yml` com erros em TODAS as plataformas.

**Diagnóstico:**

- `lint-and-test` (Ubuntu): `format:check` falhava — 63 ficheiros não formatados com Prettier
- `rust-check` (Windows/macOS): `cargo clippy` falhava — `tauri_build::build()` exige binários `externalBin` (FFmpeg/FFprobe) que não existem no CI (estão no `.gitignore`)
- `rust-check` (Linux): `cargo fmt --check` falhava — código Rust nunca formatado com `cargo fmt`
- `rust-check` (macOS/Linux): `libc` não declarado em `Cargo.toml` — código Unix usava `libc::kill()` sem a crate
- `build.yml`: usava `npm install` em vez de `npm ci`; tinha input inválido `includeUpdaterJson`; `bundle.targets: "all"` tentava `.rpm` no Linux sem tooling

**Correcções aplicadas:**

1. `npm run format` + `cargo fmt` — formatados todos os ficheiros (63 Prettier + ~15 Rust)
2. `ci.yml` — adicionado step "Create resource placeholders" no job `rust-check` (cria ficheiros vazios para FFmpeg/FFprobe + sidecar antes do `cargo clippy`)
3. Código Rust — corrigidos 7 erros de Clippy:
   - `drop(state)` removido (`State` não implementa `Drop`)
   - `n % 100 == 0` → `n.is_multiple_of(100)`
   - `.max(1).min(8)` → `.clamp(1, 8)`
   - `#[allow(clippy::type_complexity)]` no tipo `Vec<(...11 tipos...)>`
   - `#[allow(clippy::too_many_arguments)]` na função `run_job` (13 args)
   - `nets.iter().map(|(_, n)| ...)` → `nets.values().map(...)` (2 ocorrências)
4. `Cargo.toml` — adicionada dependência condicional `[target.'cfg(not(target_os = "windows"))'.dependencies] libc = "0.2"`
5. `build.yml` — `npm install` → `npm ci`; removido `includeUpdaterJson: true`
6. `tauri.conf.json` — `bundle.targets: "all"` → `["deb", "appimage", "msi", "nsis", "dmg", "app"]`

**Verificação local:**

- `npm run format:check`: OK
- `npm run lint`: OK
- `cargo fmt --check`: OK
- `cargo clippy -- -D warnings`: OK

**Verificação GitHub Actions (run #92):**

- `lint-and-test` (Ubuntu): ✅ OK
- `rust-check` Windows: ✅ OK
- `rust-check` macOS: ✅ OK
- `rust-check` Linux: ✅ OK
- Todas as plataformas passaram

---

### Sessão 7 — v0.23.0 Sincronização e Documentação — CONCLUÍDO

**Tarefas realizadas:**

1. Bump de versão para 0.23.0 em package.json, Cargo.toml, tauri.conf.json, version.ts
2. Actualização do CHANGELOG.md com entradas v0.22.0 e v0.23.0
3. Actualização do USER_MANUAL.md:
   - Navegação in-app para ficheiros processados
   - Popup de reprocessamento em foreground (portal)
   - Pipeline Summary clicável com painel expansível
   - Delete e factory reset com autorização explícita de ficheiros
4. Actualização do SCREEN_GUIDE.md:
   - Versão, sidebar version badge
   - Pipeline Summary clicável / painel inline
   - Reprocess popup (portal)
   - MediaInfo tabs
   - Two-step delete dialog
   - Two-step factory reset
5. Actualização do FUNCTIONS.md:
   - `find_asset_by_path`, `list_assets_slim`, `scan_directory`
   - Assinaturas corrigidas: `delete_asset` (hard delete + delete_files), `factory_reset` (delete_files)
   - Persistence: `tauri-plugin-store` (não localStorage)
   - Evento `sidecar:event`
6. Actualização do INSTALL.md e RELEASE.md com versão 0.23.0
7. **Screenshots capturados manualmente** — todos os 10 screenshots (6 existentes + 4 novos v0.23.0) capturados em 2026-05-18 a 1280×800, light mode. Índice em `docs/screenshots/README.md`, histórico de captura em `docs/screenshots/PENDING_CAPTURE.md`.
8. Actualização do PROGRESS-DESKTOP.md

**Verificação:** lint ✅ · tsc ✅ · 24/24 testes ✅ · cargo build ✅

---

## Estado das branches

- `dev`: v0.23.0 UX fixes committed (Sessao 6) — NÃO pushed para remote ainda
- `main`: commit anterior (v0.20.0 area)
- Remote: apenas `main` e `dev`

---

### Sessao 8 — v0.23.0 HelpModal Remodelado — CONCLUIDO

**Melhorias no HelpModal.tsx:**

1. **Sidebar vertical remodelada**: w-48 (180px) com items empilhados verticalmente, indicador de activo com borda azul esquerda + fundo azul claro.
2. **Badges numéricos na sidebar**: Tabs com múltiplos cards mostram contagem (Queue=3, Library=2, Settings=2).
3. **Dimensões fixas do modal**: `h-[85vh]` + `min-h-[600px]` para evitar saltos entre tabs.
4. **`openFullGuide` corrigido**: Toast de erro com botão "Copiar URL" via `tauri-plugin-clipboard-manager` (plugin nativo, não navigator.clipboard).
5. **Tips nos 4 novos cards v0.23.0**: Delete Confirm, Pipeline Summary, Reprocess Popup, Factory Reset Confirm — todos com tips informativos descritivos.

**Plugin instalado:**

- `tauri-plugin-clipboard-manager` v2.3.2 (cargo + npm)
- Registado em `lib.rs` (`tauri_plugin_clipboard_manager::init()`)
- Permissão `clipboard-manager:allow-write-text` em `capabilities/default.json`

**Ficheiros alterados:** `HelpModal.tsx`, `lib.rs`, `default.json`, `Cargo.toml`, `Cargo.lock`, `package.json`, `package-lock.json`.

**Verificação:** lint ✅ · tsc ✅ · 24/24 testes ✅ · cargo check ✅

---

### Sessao 9 — v0.23.x Bugs Pós-Reset e Workers — CONCLUIDO

**Problemas reportados:**

1. Jobs ficavam presos em "processing" indefinidamente
2. "Error performing reset" — toast de erro após factory reset (mesmo sem dados)
3. Após reset + relaunch: jobs ficavam presos em "queued" sem processar
4. Página Logs ficava com ecrã preto após reset — impossível navegar sem reiniciar a app

**Diagnóstico e Causas Raiz:**

- **Jobs em "processing"**: AudioWorker era crítico (sem try/catch) — qualquer falha de áudio (ficheiro sem stream de áudio, codec incomum) terminava o worker sem completar o job, que ficava preso em "processing" para sempre.
- **Timeout excessivo**: AudioWorker usava 600s por pass (análise + normalização); QCPost VMAF usava 3600s — jobs podiam bloquear a fila durante horas.
- **Ecrã preto após relaunch em dev mode**: `relaunch()` do `tauri-plugin-process` em Tauri dev mode faz o novo processo conectar ao Vite dev server, mas o Vite demora a re-servir chunks lazy. `DashboardPage`, `LogsPage` e outras páginas com `lazy()` falham a importar, crashando o React sem qualquer UI de recuperação.
- **Jobs em "queued" após reset**: dois factores — (1) `settings.json` era apagado pelo factory_reset, causando crash do LazyStore no relaunch; (2) `relaunch()` em dev tornava a app inutilizável.
- **Double clearLogs**: `LogsPage.tsx` chamava `invoke('clear_logs')` directamente E via `clearLogs()` hook em simultâneo.
- **Mutex poison**: se um thread panicar enquanto segura o lock da DB na queue, o `Mutex` fica "poisoned" e todos os polls subsequentes falham com erro não recuperável.

**Correcções (3 commits):**

**`0347df9` fix(workers):**

- `NexoraDesktopOrchestrator.ts`: AudioWorker envolvido em try/catch não-crítico (como Proxy, Thumbnail, QCPost)
- `audio-worker.ts`: timeouts 600s → 120s (2 ocorrências: analysis pass + normalize pass)
- `qc-post-worker.ts`: timeout VMAF 3600s → 300s
- `sidecar/dist/nexora-sidecar.cjs`: reconstruído com `npm run sidecar:build`

**`76f1dbd` fix(reset):**

- `system.rs` (`factory_reset`): `settings.json` excluído da lista de ficheiros a apagar; após cleanup, escreve `{}` para reinicializar o store sem crash do LazyStore
- `queue.rs` (`poll`): lock da DB usa `unwrap_or_else(|poison| poison.into_inner())` para recuperar de Mutex poisoned; log diagnóstico `[queue] N job(s) em fila` adicionado
- `LogsPage.tsx`: removida chamada directa duplicada a `invoke('clear_logs')` (mantida apenas via `clearLogs()`)
- `ErrorBoundary.tsx` (novo): componente React class-based com botão "Tentar novamente"
- `App.tsx`: `<ErrorBoundary key={activeTab}>` envolve o `<Suspense>` — `key` reseta o boundary ao navegar entre tabs

**`61590f9` fix(reset):**

- `SettingsPage.tsx`: após `invoke('factory_reset')` resolver com sucesso, usa `import.meta.env.DEV` para bifurcar: dev → `exit(0)` + toast a pedir reinício manual; produção → `relaunch()`
- `default.json`: adicionada permissão `process:allow-exit`

**Ficheiros alterados:** `NexoraDesktopOrchestrator.ts`, `audio-worker.ts`, `qc-post-worker.ts`, `nexora-sidecar.cjs`, `system.rs`, `queue.rs`, `LogsPage.tsx`, `ErrorBoundary.tsx` (novo), `App.tsx`, `SettingsPage.tsx`, `default.json`

**Verificação:** confirmado pelo utilizador ("works fine") após testes com múltiplos ficheiros e factory reset

---

### Sessao 10 — Settings: Apply Live + Cache Display — CONCLUIDO

**Funcionalidades implementadas:**

1. **Settings aplicam ao vivo** — Alterações de idioma e concorrência da fila tomam efeito imediato sem reiniciar a app:
   - `update_settings` (Rust) emite evento `settings:changed` após cada upsert SQLite
   - `SettingsPage.tsx` ouve o evento e chama `i18n.changeLanguage()` para língua; `invoke('set_queue_concurrency')` para concorrência

2. **Cache display na aba System** — Nova secção "Cache" com dois cards:
   - **Cache de Processamento**: soma `nexora-transcode-*` + `nexora-proxy-*` em temp dir — tamanho, contagem, botões Abrir/Limpar
   - **Cache de Thumbnails**: `nexora-thumbs/` — tamanho, contagem, botões Abrir/Limpar
   - Limpeza guardada: Rust verifica jobs activos na BD antes de apagar (`queued` ou `processing`)

3. **Fix de persistência de settings** — `handleUpdateSetting` passava `value` como número/booleano JS para Rust `String`, causando falha silenciosa do serde_json. Corrigido com `String(value)` — afectava `max_concurrent_jobs`, `gpu_acceleration`, `notifications_enabled`.

**Novos comandos Rust (em `system.rs`):**

- `get_temp_info` — devolve `TempInfo` (caminhos, tamanhos, contagens)
- `clear_transcode_cache` — remove dirs `nexora-transcode-*` e `nexora-proxy-*`
- `clear_thumbs_cache` — purga conteúdo de `nexora-thumbs/`
- `open_path` — abre pasta no explorador de ficheiros do SO
- `set_queue_concurrency` — stub (Ok(())) para notificar sidecar no futuro

**Ficheiros alterados:** `settings.rs`, `system.rs`, `lib.rs`, `SettingsPage.tsx`

**Commits (branch dev):**

- `4f32c89` fix(system): include nexora-proxy-\* in transcode cache size and clear
- `028a1ff` fix(settings-page): add TB support, fix useEffect cleanup, coerce types
- `b4b2988` feat(settings-live-apply+cache): emit settings:changed event and system tab cache section
- `4f11024` fix(settings): coerce value to String before invoke to fix settings persistence

**Verificação:** todos os testes manuais confirmados pelo utilizador ✅

---

### Sessao 11 — Correcao CI: Prettier + rustfmt — CONCLUIDO

**Problema:** GitHub Actions `CI — Verificacao de Qualidade` falhou apos merge de `dev` e tag `v0.24.0`.

**Diagnóstico:**

- `format:check` — 120 ficheiros nao formatados (Prettier)
- `cargo fmt --check` (Linux) — 3 ficheiros Rust mal formatados (`settings.rs`, `system.rs`)

**Correcções aplicadas:**

1. `npm run format` — formatados 120 ficheiros (`.ts`, `.tsx`, `.json`, `.md`, `.yml`, `.rs` em docs, scripts, src, sidecar, tests)
2. `cargo fmt` em `src-tauri` — formatados 3 ficheiros Rust
3. Verificacao local completa:
   - `tsc --noEmit` ✅
   - `sidecar:check` ✅
   - `eslint . --max-warnings 0` ✅
   - `prettier --check .` ✅
   - `vitest run` — 24/24 passed ✅
   - `cargo fmt --check` ✅
   - `cargo clippy -- -D warnings` ✅

**Ficheiros alterados:** ~120 ficheiros em todo o repo (apenas formatacao, nenhuma alteracao funcional)

---

### Sessao 13 — Sistema de Logging Completo — CONCLUIDO

**Pedido:** Sistema completo de logging com: (1) ficheiros rotativos diários, (2) captura de acções UI com verbosidade configurável, (3) aba "Logs" nas Settings, (4) envio de logs ao desenvolvedor por email e upload.

**Implementacao (9 tasks, 11 commits):**

1. **`zip = "2"` e `reqwest = { version = "0.12", features = ["multipart"] }`** adicionados ao `Cargo.toml`

2. **`src-tauri/src/file_logger.rs`** (novo) — escrita thread-safe via `OnceLock<Mutex<Option<FileLoggerState>>>`:
   - `get_log_dir(app)` → `AppData\Local\Nexora\logs\`
   - `init(app)` — abre ficheiro do dia, corre rotação + retenção no arranque; lê `log_retention_days`/`log_max_size_mb` das settings SQLite (fallback 30/200)
   - `write(level, source, message)` — formato `{ISO8601} [{level}] {source} — {message}\n`; rola para novo ficheiro automaticamente ao mudar de dia
   - `rotate_old_logs(dir)` — comprime `.log` antigos para `.log.zip` com `zip::CompressionMethod::Deflated`; apaga original
   - `enforce_retention(dir, days, mb)` — apaga por idade e por tamanho total

3. **`logger.rs`** — `crate::file_logger::write()` chamado no fim de `write()` → dual-channel (SQLite + ficheiro)

4. **5 novos comandos Tauri** em `commands/logs.rs`:
   - `get_log_storage_info` → `LogStorageInfo { logDir, totalSizeBytes, fileCount, oldestFileDate }`
   - `export_logs_bundle` → ZIP em temp dir com todos os ficheiros nexora-\*.log e .log.zip
   - `clear_log_files` → remove todos os ficheiros nexora-\* da pasta
   - `upload_logs_to_server` → POST multipart/form-data com `reqwest`; retorna body da resposta
   - `log_user_action` → filtra por verbosidade (BASIC=0, NORMAL=1, DEBUG=2); escreve `ACTION:{LEVEL}` em ambos os canais

5. **4 novas settings** em `default_settings()`: `log_verbosity` ("normal"), `log_retention_days` ("30"), `log_max_size_mb` ("200"), `log_upload_endpoint` ("")

6. **`src/store/settings.ts`** — `logVerbosity`, `logRetentionDays`, `logMaxSizeMb`, `logUploadEndpoint` + setters

7. **`src/hooks/useActionLog.ts`** (novo) — `logAction(event, details?)` com `getEventLevel()` e `shouldLog()` por rank; invoca `log_user_action`

8. **`src/pages/SettingsPage.tsx`** — nova aba "Logs" com:
   - Verbosidade: 3 radio buttons (Básico/Normal/Debug)
   - Armazenamento: path, tamanho, nº ficheiros, data mais antiga, inputs de retenção (dias/MB), botões Abrir/Limpar
   - Enviar ao desenvolvedor: input de endpoint URL, botão email (mailto:), botão upload (disabled se sem endpoint)

9. **`src/App.tsx`** — listener global `document.addEventListener('click', ...)` que lê `data-log-id` e chama `logAction('button:{id}')` — activo apenas a nível Debug

**Commits:**

- `0b3c886` build(deps): add zip and reqwest for logging system
- `4a09763` feat(logging): create file_logger module
- `a9007b9` feat(logging): integrate file_logger — dual-channel
- `94af49d` feat(logging): add 5 new commands to commands/logs.rs
- `32753ec` feat(logging): register log commands and add settings defaults
- `0631db6` feat(logging): add log settings to Zustand store
- `0303c17` feat(logging): add useActionLog hook with verbosity filtering
- `3ccea62` feat(logging): add Logs settings tab
- `839d5dd` feat(logging): add global Debug click listener in App.tsx
- `7cba385` fix(logging): correct log dir path (Nexora segment)

**Verificacao:** cargo check ✅ · tsc --noEmit ✅ · spec compliance review ✅

---

## Proximos passos (v0.24.0 ou seguinte)

| Tarefa                                                              | Prioridade | Estado    |
| ------------------------------------------------------------------- | ---------- | --------- |
| Push dev + merge/PR para main (v0.23.0)                             | Alta       | Pronto    |
| B6: dedup startup_checks — cachear resultado em AppState            | Baixa      | Pendente  |
| Traducao profissional dos locales nao-pt (fallback em pt por agora) | Media      | Pendente  |
| Screenshots / documentacao visual actualizada                       | Baixa      | Concluido |
| tauri dev golden path — testar drag-drop end-to-end                 | Alta       | Pendente  |

---

### Sessao 8b — Fix: opener scope para URLs externas — CONCLUIDO

**Problema:** O botão "Abrir Guia Completo" no HelpModal falhava silenciosamente. Manualmente o URL funcionava, mas via `openUrl` do Tauri não.

**Diagnóstico:** A permissão `opener:allow-open-url` em Tauri v2 exige um `scope` que define que URLs são permitidos. Sem scope, o comando IPC é rejeitado pelo router de segurança.

**Correcção:** `src-tauri/capabilities/default.json` — `opener:allow-open-url` mudou de string simples para objecto com scope:

```json
{
  "identifier": "opener:allow-open-url",
  "allow": [{ "url": "https://*" }, { "url": "http://*" }]
}
```

**Ficheiro alterado:** `src-tauri/capabilities/default.json`

**Verificação:** lint ✅ · tsc ✅ · cargo check ✅ · capabilities.json gerado com scope ✅

---

### Sessao 11b — Merge dev → main — CONCLUIDO

**Merge realizado:** `dev` → `main` (commit `219c542`)

- CI anterior em `main` falhava (formatacao)
- Correcao aplicada em `dev` (commit `7ea36fc`), depois merge para `main`
- Push `main` disparou novo CI run (#26182500765)

---

### Sessao 11c — Release v0.24.0 no GitHub — CONCLUIDO

**Tag:** `v0.24.0` → commit `0d3b805` (inclui build.yml reescrito + release notes)

**Actions tomadas:**

1. Tag `v0.24.0` movida de `4e86384` → `0d3b805` (force push)
2. `build.yml` reescrito com:
   - Job `quality-gate` (tsc, lint, testes, cargo fmt, cargo clippy)
   - Node.js 22 (era 20)
   - Step `Create resource placeholders` em todas as plataformas
   - `needs: quality-gate` no job `build`
3. `ci.yml` atualizado para Node.js 22
4. Release draft criado via `gh release create` com notas detalhadas (`release-notes-v0.24.0.md`)
5. Workflow `Build Nexora Desktop` disparado automaticamente pelo push da tag
6. Todos os 4 jobs passaram:
   - Quality Gate: 2m57s ✅
   - Build — macOS (Universal): 4m42s ✅
   - Build — Windows: 10m16s ✅
   - Build — Linux: 5m21s ✅
7. Release publicado (draft → public): https://github.com/ideiasestrondosas-ctrl/nexora-desktop/releases/tag/v0.24.0

---

## Notas tecnicas para o proximo agente

- **Sidecar dist nao esta no git** — correr `npm run sidecar:build` antes de cada `tauri dev`
- **15 linguas i18n completas** — ao adicionar texto novo, traduzir SEMPRE todos os 15 locales em `src/i18n/locales/`
- **FFmpeg execFile** — NUNCA usar `exec` com string; sempre `execFile` com array de argumentos
- **VMAF model escaping no Windows** — no filtergraph `-lavfi`, os caminhos absolutos como `C:/path` no Windows geram erro. Substituir sempre por `C\:/path` no `libvmaf=model='path=...'`.
- **active_pids** — `AppState` tem `active_pids: Mutex<HashMap<String, u32>>` para matar processos Node.js ao cancelar
- **list_assets_slim** — usar em listagens (Dashboard, LibraryPage) em vez de `list_assets` para evitar metadata JSON pesado
- **sidecar:event** — QueuePage e DashboardPage ouvem este evento para actualizacoes em tempo real; polling e fallback a 30s
- **tauri-plugin-store** — settings persistem em ficheiro nativo; nao usar localStorage
- **Videos_Tests/** — ja no git; 18 samples de video de teste
- **Workers não-críticos**: AudioWorker, Proxy, Thumbnail, QCPost — envolvidos em try/catch; falha não bloqueia o job
- **Workers críticos**: Ingest, QCPre, Transcode, Delivery — falha termina o job com erro
- **relaunch() em dev mode** — NUNCA usar `relaunch()` directamente; bifurcar em `import.meta.env.DEV`: dev → `exit(0)` + toast; prod → `relaunch()`
- **settings.json** — factory_reset NUNCA apaga este ficheiro; escreve `{}` para reset limpo sem crash do LazyStore
- **Mutex poison em queue.rs** — usar `unwrap_or_else(|poison| poison.into_inner())` no lock da DB
- **invoke() com Rust String** — sempre converter com `String(value)` antes de passar número ou booleano para um comando Rust que espera `String`; serde_json falha silenciosamente caso contrário
- **Cloud credentials** — guardadas no keychain do SO via `keyring v3` (`save_credentials`/`load_credentials`/`delete_credentials`); backward-compat com perfis antigos (fallback config blob em `run_cloud_uploads`); campos de password vazios no modal de edição = manter keychain existente
- **process_cloud_destinations** — usa retry manual 3 tentativas (nao `retry_with_backoff`): `async_trait` nao aceita `FnMut() -> Fut` com lifetime da trait; qualquer refactor deve manter este padrao
- **GDrive OAuth** — Device Flow: `gdrive_start_auth` retorna url + user_code; frontend poll `gdrive_poll_auth` a cada 5s ate receber `access_token`; token guardado como `oauth_token` em `config_json`
- **iCloud auto-detect** — `%USERPROFILE%\iCloudDrive` (Windows), `~/Library/Mobile Documents/com~apple~CloudDocs` (macOS); nao e suportado em Linux
- **S3 crate** — `rust-s3 = "0.37"` (NAO `s3 = "0.35"` — crate diferente); usar `default-features = false, features = ["tokio-rustls-tls"]`
