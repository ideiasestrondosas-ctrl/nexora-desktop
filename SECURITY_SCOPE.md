# Security Scope — Nexora Desktop

> Documento vivo. Define o âmbito de segurança, o modelo de ameaça e a superfície
> de ataque do Nexora Desktop, para orientar revisões futuras e triagem de achados.
> Última revisão: **2026-06-02** (auditoria → v0.32.0-beta.1).

## 1. O que é o Nexora Desktop

Aplicação **desktop nativa local** (Tauri 2.x) para processamento de média e
entrega para serviços cloud. Stack:

- **Shell nativa:** Tauri 2.x (Rust stable)
- **Frontend:** React 19 + TypeScript (bundled, servido localmente)
- **Sidecar:** Node.js (engine de média via SEA) + FFmpeg/ffprobe
- **Dados:** SQLite (better-sqlite3 / rusqlite)
- **Cloud:** upload para SFTP, FTP, S3, Google Drive, SMB

## 2. Modelo de ameaça

O Nexora Desktop **não é uma aplicação web nem um serviço exposto**. Não há
servidor a receber pedidos não confiáveis. O utilizador controla a máquina onde a
app corre. Daí decorrem os vectores **realistas**:

| #   | Vector                               | Descrição                                                                                                                             |
| --- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| A   | **Atacante de rede (uploads cloud)** | MITM/spoofing nas ligações a SFTP/FTP/S3/Drive — roubo de credenciais ou de ficheiros em trânsito. **Maior risco da app.**            |
| B   | **Supply-chain (build-time)**        | Binários de terceiros (FFmpeg), actions de CI, packaging do sidecar — comprometimento da cadeia de build.                             |
| C   | **Defesa-em-profundidade**           | Caso surja injecção de conteúdo (hoje inexistente), limitar o estrago: scope de FS, CSP, validação de paths, permissões de ficheiros. |
| D   | **Máquina multi-utilizador**         | Outro utilizador local a ler ficheiros da app (BD, logs). Baixo, mas mitigável.                                                       |

### Fora do modelo de ameaça (não-objectivos)

- Defesa contra um atacante que já tem **execução de código** na máquina do
  utilizador (game over — as credenciais estão no keyring do SO, acessível ao
  utilizador).
- Resistência a um **utilizador malicioso a atacar a própria app** (é a máquina dele).
- XSS no frontend: mitigado por construção — `script-src 'self'`, sem
  `dangerouslySetInnerHTML`, frontend totalmente bundled.

## 3. Superfície de ataque

| Componente             | Entrada não confiável?           | Notas                                                            |
| ---------------------- | -------------------------------- | ---------------------------------------------------------------- |
| Comandos IPC Tauri     | Parcial (paths, JSON de config)  | Validados/canonicalizados; base64 só de assets registados na BD  |
| Cloud providers        | **Sim** (rede)                   | SFTP com verificação de host key (TOFU); validação de paths `..` |
| FFmpeg/ffprobe         | Ficheiros de média do utilizador | Sempre via `execFile`/`Command` com array — nunca shell string   |
| SQLite                 | Dados da própria app             | Queries parametrizadas; ficheiro 0o600 em Unix                   |
| Auto-updater           | Rede (HTTPS)                     | Assinatura minisign + pubkey embebida                            |
| Deep links `nexora://` | Sistema operativo                | —                                                                |

## 4. Princípios de segurança em vigor

- **Credenciais cloud no keyring do SO** — nunca em SQLite, localStorage ou ficheiros.
- **SQL sempre parametrizado** (rusqlite + better-sqlite3).
- **FFmpeg sempre via array** (`execFile`/`Command`), nunca `exec`/shell string.
- **CSP restritiva** — `default-src 'self'`, `script-src 'self'`, `connect-src` limitado a IPC.
- **assetProtocol com scope estático** — sem `**` global; apenas dirs do utilizador.
- **Auto-updater assinado** — minisign + HTTPS + verificação de assinatura.
- **Sem secrets hardcoded** no código (`.env` gitignored).
- **SFTP TOFU** — fingerprint do host confirmada na 1ª ligação, rejeição em mismatch.

## 5. Riscos aceites (documentados)

| ID  | Risco                                        | Justificação                                                                                                                                                                                                    |
| --- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L1  | CSP `style-src 'unsafe-inline'`              | Radix UI injecta estilos inline em runtime (posicionamento/animações). `script-src` continua `'self'` — sem execução de script inline. Risco limitado a CSS, sem vector de injecção de conteúdo.                |
| L4  | Sidecar empacotado com `@yao-pkg/pkg` (fork) | Tool de packaging; migração planeada no roadmap. Não introduz exposição em runtime.                                                                                                                             |
| M3  | Actions de CI por major tag (sem SHA-pin)    | Apenas actions oficiais bem mantidas (actions/\*, dtolnay, swatinem, tauri-apps). Pin por SHA avaliado; churn elevado vs. ganho marginal. Reavaliar se forem adicionadas actions de terceiros menos conhecidas. |

## 6. Como reportar uma vulnerabilidade

Contacto privado ao mantenedor. Não abrir issue pública para vulnerabilidades não
divulgadas.

## 7. Histórico de auditorias

| Data       | Versão        | Âmbito                                       | Relatório                                     |
| ---------- | ------------- | -------------------------------------------- | --------------------------------------------- |
| 2026-06-02 | 0.32.0-beta.1 | 1ª auditoria defensiva completa (C1–L3 + I1) | `docs/SECURITY_AUDIT_REPORT_0.32.0-beta.1.md` |
