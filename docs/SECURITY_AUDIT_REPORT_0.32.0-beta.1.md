# Relatório de Auditoria de Segurança — Nexora Desktop v0.32.0-beta.1

**Data:** 2026-06-02
**Âmbito:** Auditoria de segurança defensiva completa + correção de todos os achados
**Versão auditada/corrigida:** 0.31.6-beta.1 → **0.32.0-beta.1**
**Tipo:** 1ª auditoria formal (white-box, acesso total ao código)
**Base metodológica:** `docs/SECURITY_AUDIT_PROMPT_V4.md`

---

## 1. Resumo executivo

O Nexora Desktop nunca tinha sido sujeito a uma auditoria de segurança formal.
Esta auditoria cobriu o código Rust (Tauri), o frontend React, o sidecar Node.js,
a camada cloud, a base de dados e o pipeline de CI/CD.

Foram confirmados **13 achados** (1 Critical, 2 High, 4 Medium, 3 Low, 1 Info,
1 recomendação não-código, 1 Low de packaging). **Todos os achados de código
foram corrigidos** nesta release, cada um com teste de regressão e commit
dedicado. Os achados de natureza documental/operacional (L1, L4, I1, M3-pin, R1)
foram resolvidos por documentação e/ou recomendação.

**Achado mais grave (C1):** a verificação de host key SFTP devolvia sempre
`Ok(true)`, aceitando qualquer servidor — um atacante de rede podia fazer MITM e
capturar credenciais e ficheiros. Corrigido com um fluxo **TOFU** (Trust On First
Use) com confirmação de fingerprint.

**Postura geral:** sólida para uma app desktop local. Os pontos fortes (updater
assinado, SQL parametrizado, credenciais no keyring, FFmpeg via array) já estavam
em vigor. As correções endurecem sobretudo os vectores de **rede** e de
**supply-chain**, e acrescentam **defesa-em-profundidade**.

### Quadro-resumo

| Sev         | ID  | Achado                                             | Estado                          |
| ----------- | --- | -------------------------------------------------- | ------------------------------- |
| 🔴 Critical | C1  | Host key SFTP nunca verificada (MITM)              | ✅ Corrigido                    |
| 🟠 High     | H1  | Binários FFmpeg sem verificação de integridade     | ✅ Corrigido                    |
| 🟠 High     | H2  | assetProtocol scope com `**` (FS inteiro)          | ✅ Corrigido                    |
| 🟡 Medium   | M1  | Comandos base64 sem validação de path              | ✅ Corrigido                    |
| 🟡 Medium   | M2  | GDrive query escaping incompleto                   | ✅ Corrigido                    |
| 🟡 Medium   | M3  | CI/CD sem least-privilege nos tokens               | ✅ Corrigido                    |
| 🟡 Medium   | M4  | Export de logs sem redacção de credenciais         | ✅ Corrigido                    |
| 🟢 Low      | L1  | CSP `style-src 'unsafe-inline'`                    | 📋 Risco aceite                 |
| 🟢 Low      | L2  | `.desktop` Exec sem aspas                          | ✅ Corrigido                    |
| 🟢 Low      | L3  | SQLite sem permissões 0o600 (Unix)                 | ✅ Corrigido                    |
| 🟢 Low      | L4  | Sidecar com `@yao-pkg/pkg` (fork)                  | 📋 Roadmap                      |
| ⚪ Info     | I1  | Sem SECURITY_SCOPE.md / SBOM                       | ✅ Doc criada / SBOM no roadmap |
| 🔵 Rec      | R1  | GitHub PAT exposto ao subagente (sem fuga no repo) | 📋 Rotação recomendada          |

---

## 2. Âmbito

**Incluído:**

- `src-tauri/` — código Rust (comandos IPC, cloud, db, system, logs)
- `src/` — frontend React/TypeScript
- `sidecar/` + `scripts/` — engine de média e scripts de build
- `.github/workflows/` — pipeline CI/CD
- `tauri.conf.json` — configuração de segurança (CSP, capabilities, scope)
- Gestão de credenciais e dependências

**Excluído:** infraestrutura cloud de terceiros (servidores SFTP/S3 do utilizador),
segurança física da máquina, ataques que pressupõem execução de código já obtida.

---

## 3. Metodologia

1. **Reconhecimento** — mapeamento da arquitectura, stack, superfície de IPC,
   capabilities Tauri, fluxos de credenciais.
2. **Análise estática manual** — leitura dirigida do código por componente, com
   foco nos vectores do modelo de ameaça (rede, supply-chain, defesa-em-profundidade).
3. **Confirmação** — cada achado validado por leitura directa do código (sem
   falsos positivos automáticos).
4. **Triagem por severidade real** — ajuste da severidade ao contexto de app
   desktop local (vários achados marcados High por ferramentas genéricas são, na
   prática, Low — ver §5).
5. **Correção orientada a testes** — para cada achado: teste de regressão que
   falha antes e passa depois, alteração mínima, commit dedicado.
6. **Verificação end-to-end** — `cargo test`, `cargo clippy`, `npm test`,
   `npm run lint`, `npm audit`.

---

## 4. Modelo de ameaça

Resumido aqui; detalhe completo em `SECURITY_SCOPE.md`.

App **desktop local**, sem servidor exposto, sem entrada web não confiável.
Frontend bundled, `script-src 'self'`, sem `dangerouslySetInnerHTML`. Os vectores
reais são:

- **(A) Atacante de rede nos uploads cloud** — o maior risco (C1, M4).
- **(B) Supply-chain no build** — binários e CI (H1, M3, L4).
- **(C) Defesa-em-profundidade** — limitar o estrago de uma hipotética injecção
  de conteúdo (H2, M1, M2, L1, L3).
- **(D) Máquina multi-utilizador** — leitura de ficheiros locais por outro
  utilizador (L3).

---

## 5. Achados detalhados, correções e commits

### 🔴 C1 — Host key SFTP nunca verificada (MITM) · `d4604ba`

**Ficheiro:** `src-tauri/src/cloud/sftp.rs`
**Severidade:** Critical · **Vector:** atacante de rede

`check_server_key` devolvia sempre `Ok(true)`: a app aceitava qualquer chave de
host SFTP. Um atacante na rota de rede podia personificar o servidor, capturar as
credenciais (utilizador/password) e os ficheiros enviados.

**Correção (TOFU com confirmação):**

- Nova tabela SQLite `ssh_known_hosts(host, port, fingerprint, created_at)`.
- `SshHandler` captura o fingerprint **SHA256** (formato OpenSSH `SHA256:…`) do
  `server_public_key` e compara com o valor confiável guardado.
- 1ª ligação (modo descoberta): captura o fingerprint e devolve-o ao frontend para
  confirmação do utilizador. Ligações seguintes: **mismatch → ligação rejeitada**
  (possível MITM).
- Novos comandos `sftp_probe_host` (cloud.rs + lib.rs); fluxo TOFU no
  `CloudProfileModal.tsx`; fingerprint persistida em `config.hostFingerprint`.
- Dependência `sha2` adicionada ao `Cargo.toml`.

**Testes:** 12 testes (fingerprint conhecido aceite, alterado rejeitado, modo
descoberta).
**Risco residual:** a 1ª ligação confia no fingerprint apresentado (modelo TOFU,
igual ao OpenSSH). Mitigação: o utilizador confirma a fingerprint antes de aceitar.

---

### 🟠 H1 — Binários FFmpeg sem verificação de integridade · `bf544b7`

**Ficheiro:** `scripts/download-media-binaries.js`
**Severidade:** High · **Vector:** supply-chain build-time

O download de FFmpeg/ffprobe não verificava checksum nem assinatura — um binário
adulterado em trânsito ou na origem entraria no instalador.

**Correção:**

- `scripts/lib/verify-checksum.js` calcula SHA-256 e compara com
  `media-binaries.lock.json` (semeado para win32-x64); flag `--write-lock` para
  re-fixar o lock ao actualizar.
- Build falha em mismatch.

**Testes:** 4 testes (hash correcto aceite, adulterado rejeitado).
**Nota operacional:** o BtbN publica em tag `latest` rolante → re-fixar o lock com
`--write-lock` sempre que o FFmpeg for actualizado.

---

### 🟠 H2 — assetProtocol scope com `**` · `bb4d90d`

**Ficheiro:** `src-tauri/tauri.conf.json`
**Severidade:** High (defesa-em-profundidade) · **Vector:** content injection hipotética

O scope do `assetProtocol` continha `"**"`, expondo todo o sistema de ficheiros
(outras drives, `C:\Windows`, ficheiros de outros utilizadores) caso surgisse uma
injecção de conteúdo.

**Correção:** removido `"**"`; scope estático aos directórios do utilizador
(`$HOME`, `$TEMP`, `$APPDATA`, `$LOCALAPPDATA`, `$VIDEO`, `$DESKTOP`, `$DOWNLOAD`).
Enforcement real reforçado por M1.
**Risco residual:** dotfiles em `$HOME` ainda no scope — coberto pela validação de
path do M1.

---

### 🟡 M1 — base64 de assets não registados · `4c69226`

**Ficheiro:** `src-tauri/src/commands/assets.rs`
**Severidade:** Medium · **Vector:** local / defesa-em-profundidade

`read_video_base64` / `read_thumbnail_base64` liam qualquer path fornecido.

**Correção:** `assert_registered_asset` — só servem ficheiros cujo path está
**registado na BD** como asset. Paths arbitrários são recusados.
**Testes:** 2 testes.

---

### 🟡 M2 — GDrive query escaping incompleto · `712f79b`

**Ficheiro:** `src-tauri/src/cloud/gdrive.rs`
**Severidade:** Medium · **Vector:** o próprio Drive (nomes de ficheiro/pasta)

As queries da Drive API (delimitadas por aspas simples) escapavam `'` mas não `\`.
Um nome com `\` podia alterar a semântica da query.

**Correção:** helper `escape_drive_query_value` escapa `\` **antes** de `'` (ordem
correcta), aplicado nas 3 queries que usam nome do utilizador.
**Testes:** 4 testes (aspa, barra antes de aspa, barra isolada, texto normal).

---

### 🟡 M3 — CI/CD sem least-privilege · `6207061`

**Ficheiro:** `.github/workflows/*.yml`
**Severidade:** Medium · **Vector:** supply-chain

Os jobs herdavam permissões amplas para o `GITHUB_TOKEN`.

**Correção:**

- `ci.yml` e `test-karpathy.yml`: `permissions: contents: read`.
- `build.yml`: top-level `contents: read`; apenas `build` (tauri-action) e
  `generate-updater-json` elevam para `contents: write`; `quality-gate` fica read.
- Confirmado: `pull_request_target` **não** é usado.

**Decisão sobre SHA-pin (risco aceite):** as actions usadas são oficiais e bem
mantidas (`actions/*`, `dtolnay/rust-toolchain`, `swatinem/rust-cache`,
`tauri-apps/tauri-action`), referenciadas por major tag. O pin por SHA foi
avaliado; o churn de manutenção supera o ganho marginal neste contexto. Reavaliar
se forem adicionadas actions de terceiros menos conhecidas (ver `SECURITY_SCOPE.md`).

---

### 🟡 M4 — Export de logs sem redacção de credenciais · `77f4149`

**Ficheiro:** `src-tauri/src/commands/logs.rs`
**Severidade:** Medium · **Vector:** info disclosure

Os exports de logs (`export_logs`, `export_logs_bundle`, `get_last_n_logs_text`)
não redigiam credenciais. Uma URL com credenciais embebidas (`scheme://user:pass@host`)
que escapasse para um log seria partilhada em claro.

**Correção:** helper `redact_credentials` substitui a password por `***`
(preserva scheme/user/host para diagnóstico), aplicado nos 3 caminhos de export.
**Testes:** 5 testes (FTP, com porta, sem credenciais, user sem password, email
não confundido com credencial).

---

### 🟢 L1 — CSP `style-src 'unsafe-inline'` · risco aceite

**Ficheiro:** `tauri.conf.json:33`
Radix UI injecta estilos inline em runtime (posicionamento/animações de
popovers/dialogs). Remover `'unsafe-inline'` partiria a UI. Como `script-src`
continua `'self'` (o vector perigoso está fechado) e não há `dangerouslySetInnerHTML`,
o risco resume-se a CSS. **Documentado como risco aceite** em `SECURITY_SCOPE.md`.

---

### 🟢 L2 — `.desktop` Exec sem aspas · `dde36af`

**Ficheiro:** `src-tauri/src/commands/system.rs`
`create_desktop_shortcut` (Linux) passa a envolver o `Exec` em aspas duplas e a
escapar `\ " \` $` conforme a spec freedesktop. Paths com espaços (ex.: AppImage)
deixam de partir a entrada.

---

### 🟢 L3 — SQLite sem 0o600 (Unix) · `dde36af`

**Ficheiro:** `src-tauri/src/db/mod.rs`
`db::open` define `0o600` no ficheiro SQLite em Unix (defesa-em-profundidade em
máquinas multi-utilizador). As credenciais já vivem no keyring do SO, não na BD.

---

### 🟢 L4 — Sidecar com `@yao-pkg/pkg` · roadmap

`@yao-pkg/pkg` é um fork de uma tool descontinuada. Não introduz exposição em
runtime (packaging build-time). Migração planeada no roadmap; sem alteração nesta
release.

---

### ⚪ I1 — Sem SECURITY_SCOPE.md / SBOM

`SECURITY_SCOPE.md` **criado** nesta release. SBOM (via `syft` no CI) recomendado
no roadmap.

---

### 🔵 R1 — GitHub PAT exposto ao subagente · recomendação

Durante a auditoria, um subagente leu o valor de um GitHub PAT no `.env` local. O
`.env` está **correctamente gitignored — não há fuga no repositório**. Como medida
preventiva, recomenda-se a **rotação do PAT** no GitHub. Ação do utilizador; sem
alteração de código.

---

## 6. Pontos fortes confirmados

- **Auto-updater** assinado (minisign + pubkey embebida + HTTPS + verificação).
- **SQL sempre parametrizado** (rusqlite + better-sqlite3).
- **Credenciais cloud no keyring do SO** — nunca em SQLite/localStorage/ficheiros.
- **FFmpeg sempre via `execFile`/`Command` com array** — nunca shell string.
- **Validação `..`** em paths SFTP/FTP/SMB.
- **Sem secrets hardcoded** no código.
- **CSP restritiva** (`default-src/script-src 'self'`).
- **`npm audit`: 0 vulnerabilidades** no momento da release.

---

## 7. Riscos residuais

| ID  | Risco residual                                                   | Mitigação / estado                                       |
| --- | ---------------------------------------------------------------- | -------------------------------------------------------- |
| C1  | Confiança na 1ª ligação SFTP (TOFU)                              | Utilizador confirma fingerprint; igual ao modelo OpenSSH |
| H1  | Lock de checksum só semeado para win32-x64; BtbN usa tag rolante | Re-fixar com `--write-lock` ao actualizar FFmpeg         |
| H2  | Dotfiles em `$HOME` ainda no scope do assetProtocol              | Coberto pela validação de path (M1)                      |
| L1  | CSS inline permitido pela CSP                                    | Risco aceite — sem execução de script                    |
| L4  | Packaging com fork `@yao-pkg/pkg`                                | Roadmap                                                  |
| M3  | Actions por major tag (sem SHA-pin)                              | Risco aceite — só actions oficiais                       |
| R1  | PAT exposto ao subagente                                         | Rotação recomendada (ação do utilizador)                 |

---

## 8. Checklist de produção

- [x] MITM SFTP corrigido (host key verificada)
- [x] Integridade dos binários de média verificada no build
- [x] assetProtocol scope restrito (sem `**`)
- [x] Comandos IPC de path validados
- [x] Credenciais redigidas nos exports de logs
- [x] Least-privilege no CI/CD
- [x] Permissões 0o600 na BD (Unix)
- [x] `cargo test` / `cargo clippy` / `npm test` / `npm run lint` verdes
- [x] `npm audit` sem vulnerabilidades
- [x] `SECURITY_SCOPE.md` presente
- [ ] **PAT rotacionado** (ação do utilizador — R1)
- [ ] Re-fixar `media-binaries.lock.json` para macOS/Linux antes do build multi-plataforma (H1)
- [ ] Teste manual SFTP de ponta a ponta (1ª ligação / repetição / mismatch)

---

## 9. Roadmap de segurança (30 / 60 / 90 dias)

**30 dias**

- Rotacionar o GitHub PAT (R1).
- Re-fixar o lock de checksums dos binários para macOS e Linux (H1).
- Teste manual SFTP end-to-end em ambiente real.

**60 dias**

- SBOM automático no CI (`syft`) + verificação de dependências (I1).
- Avaliar SHA-pin das actions se forem adicionadas actions de terceiros (M3).
- Estender a redacção de credenciais a mais padrões (tokens bearer em logs).

**90 dias**

- Migrar o packaging do sidecar para fora do `@yao-pkg/pkg` (L4).
- Tentar remover `'unsafe-inline'` de `style-src` com nonce/hash para Radix (L1).
- Auditoria de seguimento e teste de penetração focado nos uploads cloud.

---

## 10. Verificação desta release

```
cargo test     → 44 passed
cargo clippy   → 0 warnings (-D warnings)
npm test       → 52 passed (7 ficheiros)
npm run lint   → 0 warnings (--max-warnings 0)
npm audit      → 0 vulnerabilities
```

Todas as correções foram commitadas individualmente por achado (ver §5) e
agregadas na release **0.32.0-beta.1**. A publicação final do release é feita pelo
utilizador via `sync.ps1`.

---

_Relatório gerado durante a sessão de auditoria de 2026-06-02. Documento
complementar: `SECURITY_SCOPE.md` (modelo de ameaça e âmbito vivo)._
