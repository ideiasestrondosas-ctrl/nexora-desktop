# Estado de Sincronização — Nexora Desktop

> Handoff entre Claude Code e Google Antigravity.
> Actualizar no FIM de cada sessão. Lido no INÍCIO de cada sessão.

---

Actualizado: 2026-05-13 (Sessão Actual)
Agente: Antigravity (Gemini 3.1 Pro / Gemini 3 Flash)

## O que foi feito

### Sessão Actual — Novas Funcionalidades e Manutenção — CONCLUÍDO

**1. Funcionalidade de Sair e Gestão de Janela**
- **Rust Backend**: Adicionado comando `exit_app` em `system.rs` para encerramento seguro da aplicação.
- **Frontend**: Adicionado botão "Sair do Programa" na Sidebar (`App.tsx`) com ícone intuitivo e feedback visual.

**2. Reset Total (Factory Reset) — NUCLEAR & ROBUSTO**
- **Rust Backend**: Comando `factory_reset` aprimorado para realizar uma limpeza profunda em 3 níveis:
    1. **Dados Internos**: Executa `DELETE` em todas as tabelas (assets, jobs, logs, audit, settings) e `VACUUM`.
    2. **Ficheiros Gerados**: Localiza e apaga automaticamente transcodes, proxies e thumbnails referenciados na BD, **preservando sempre os originais**.
    3. **Ambiente**: Tenta apagar a directoria `AppData` e reinicia a app.
- **Frontend**: Botão em **Definições > Avançado** com aviso crítico. Novo separador de **Suporte** no manual para diagnóstico.
- **Scripts**: Opção 2 do `06-run-dev.ps1` corrigida para:
    - Encerrar processos bloqueantes (App e Sidecar Node.js).
    - Apagar a pasta correcta (`com.nexora.desktop`).

**3. Correcções de Build e Dependências**
- **Rust**: Adicionada dependência `tokio` (features: `time`, `sync`) para suportar operações assíncronas no backend.
- **Diagnostics**: Script `06-run-dev.ps1` agora abre automaticamente logs em caso de erro fatal.

**4. Correções de Ambiente (Sessão Anterior)**
- **package.json**: Fix de encoding UTF-8 sem BOM para evitar erros no Vite/PostCSS.
- **download-media-binaries.js**: Implementada lógica de fallback para downloads do FFmpeg via GitHub (BtbN).

---

## Estado de compilação

- `cargo check`: **OK**
- `npm run dev`: **OK** (Botões de Sair e Reset DB verificados na estrutura)
- `npm run download:binaries`: **OK**

---

## Próximos passos

| Tarefa | Prioridade |
|---|---|
| Executar `.\scripts\06-run-dev.ps1 -Dev` para validar as novas interações | Crítica |
| Validar o fluxo de "Reset de Base de Dados" com dados reais | Alta |
| Continuar com os testes de fluxo de importação real | Média |

---

## Ficheiros modificados (sessão actual)

```
src-tauri/src/commands/system.rs (Add exit_app)
src-tauri/src/commands/logs.rs   (Add reset_database)
src-tauri/src/lib.rs            (Register new commands)
scripts/06-run-dev.ps1          (DB cleanup in Option 2 + Auto-open log)
src/App.tsx                     (Add Exit button to sidebar)
src/pages/SettingsPage.tsx       (Add Reset Database button + confirm)
```

## Notas técnicas para o próximo agente

- **Tauri 2**: Os novos comandos `exit_app` e `reset_database` requerem permissões se estiveres a usar o sistema de capabilities do Tauri 2. Verificar `src-tauri/capabilities/` se houver erros de acesso negado.
- **Base de Dados**: O reset manual via script apaga o ficheiro físico, enquanto o reset via UI apaga apenas os dados das tabelas via SQL.
- **Logs**: O ficheiro de log aberto pelo script está em `.logs/dev-session-TIMESTAMP.log`.
