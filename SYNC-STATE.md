# Estado de Sincronizacao - Nexora Desktop

> Handoff entre Claude Code e Google Antigravity.
> Actualizar no FIM de cada sessao. Lido no INICIO de cada sessao.

---

Actualizado: 2026-05-14 23:55
Agente: Claude Code (Kimi K2.6)

## O que foi feito

### Sessao Anterior — Traducao ES/FR/DE via Ollama — CONCLUIDO
*(Ver SYNC-STATE.md no historico do Git para detalhes)*

### Sessao Actual — Correcao sync.ps1 (Opção A) + Merge main actualizado — CONCLUIDO

**1. Correcao do script `scripts/sync.ps1` (Opção A)**
- Substituído `git merge --squash` por `git merge -X theirs --no-edit` na funcao `Invoke-MergeToMain`.
- Motivo: o squash merge nao actualiza o merge-base entre `main` e `dev`, causando conflitos recorrentes em releases consecutivas.
- O merge normal com `-X theirs` resolve automaticamente conflitos a favor da `dev` e mantem o merge-base actualizado.

**2. Merge main <- dev (com merge normal)**
- Abortado o merge squash falhado na `main`.
- Reset da `main` para `origin/main` (limpo).
- Merge `dev` para `main` com `git merge -X theirs --no-edit dev`.
- Resultado: sucesso sem conflitos, 35 ficheiros alterados.
- `main` actualizada para `48693e2`.
- Push para origin realizado.

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
```

---

## Notas tecnicas para o proximo agente

- **Base Master:** Editar SEMPRE `src/i18n/locales/en/base.json`. Nunca editar PT/ES/FR/DE directamente.
- **Sync idioma:** `useLanguageSync()` no `App.tsx` garante que o idioma guardado em Zustand e aplicado no arranque.
- **Datas dinamicas:** Usar `i18n.language` em `toLocaleTimeString()` / `toLocaleDateString()`.
- **Termos tecnicos:** Nunca traduzir VMAF, LUFS, FFmpeg, NVENC, GPU, codec names, etc.
- **Ollama:** Script suporta resume automatico. Se falhar a meio, re-executar o mesmo comando continua de onde parou.
- **sync.ps1:** Agora suporta promocao de releases existentes mesmo com workspace limpo. Usar `sync.ps1 -Release` ou opcao 3 no menu interactivo.
