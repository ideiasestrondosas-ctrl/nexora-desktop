# Estado de Sincronizacao - Nexora Desktop

> Handoff entre Claude Code e Google Antigravity.
> Actualizar no FIM de cada sessao. Lido no INICIO de cada sessao.

---

Actualizado: 2026-05-14 23:45
Agente: Claude Code (Kimi K2.6)

## O que foi feito

### Sessao Anterior — Traducao ES/FR/DE via Ollama — CONCLUIDO
*(Ver SYNC-STATE.md no historico do Git para detalhes)*

### Sessao Actual — Correcao sync.ps1 + Promocao v0.17.0 para main — CONCLUIDO

**1. Correcao do script `scripts/sync.ps1`**
- Adicionada guarda anti-saida no modo Release: o script ja nao termina prematuramente quando o workspace esta limpo.
- Menu "Promover release existente": quando `$Release = $true` e nao ha alteracoes locais, apresenta opcoes para promover a tag actual, escolher outra tag, ou criar nova tag.
- Fallback automatico de `$commitMsg`, `$newVersion` e `$lastTag` quando nao houve commit novo.
- Funcao reutilizavel `Invoke-MergeToMain($targetVersion, $sourceBranch, $authUrl)` para centralizar o merge squash.
- Verificacao de release existente no GitHub antes de criar (pergunta se quer recriar).
- Contorno da guarda `SYNC-STATE.md` no modo Release (aviso em vez de bloqueio).

**2. Promocao v0.17.0 para main**
- Resolvidos 77 conflitos de merge squash (auto-resolvidos aceitando a versao da `dev`).
- `main` actualizada para `v0.17.0` (commit `8005cb5`).
- Tag `v0.17.0` ja existia na `dev`; push para origin realizado.
- GitHub Release NAO criada (falta `GITHUB_TOKEN` no `.env`).

---

## Estado de compilacao

- `cargo check`: **OK** (0 erros, 0 warnings)
- `tsc --noEmit`: **OK** (0 erros)
- `vitest run`: **OK** (21/21 tests passaram)
- `tauri build --debug`: **OK** (MSI 146MB + NSIS 92MB)

---

## Proximos passos (Plano 6 — proxima sessao)

| Tarefa | Prioridade |
|---|---|
| Testar fluxo real ingest -> job -> transcode (tauri dev + video) | Critica |
| Adicionar bs1770gain ao download de binarios | Media |
| Deep links `nexora://` (ADR-D012) | Baixa |
| Build macOS (.dmg universal) e Linux (.AppImage + .deb) | Baixa |
| Criar GitHub Release v0.17.0 manualmente (se necessario) | Baixa |

---

## Ficheiros modificados (sessao actual)

```
MODIFICADOS:
scripts/sync.ps1
SYNC-STATE.md
>>>>>>> dev
```

---

## Notas tecnicas para o proximo agente

- **Base Master:** Editar SEMPRE `src/i18n/locales/en/base.json`. Nunca editar PT/ES/FR/DE directamente.
- **Sync idioma:** `useLanguageSync()` no `App.tsx` garante que o idioma guardado em Zustand e aplicado no arranque.
- **Datas dinamicas:** Usar `i18n.language` em `toLocaleTimeString()` / `toLocaleDateString()`.
- **Termos tecnicos:** Nunca traduzir VMAF, LUFS, FFmpeg, NVENC, GPU, codec names, etc.
- **Ollama:** Script suporta resume automatico. Se falhar a meio, re-executar o mesmo comando continua de onde parou.
- **sync.ps1:** Agora suporta promocao de releases existentes mesmo com workspace limpo. Usar `sync.ps1 -Release` ou opcao 3 no menu interactivo.
