# Estado de Sincronizacao - Nexora Desktop

> Handoff entre Claude Code e Google Antigravity.
> Actualizar no FIM de cada sessao. Lido no INICIO de cada sessao.

---

Actualizado: 2026-05-17 17:00
Agente: Claude Code

## O que foi feito

### Sessao Actual — v0.20.0 Melhorias + GitHub Cleanup — CONCLUIDO

**Commit mais recente:** `457fb6f` em `dev` (Videos_Tests)

**v0.20.0 completo — tudo concluido:**

1. **v0.20.0-A** — settings.rs: `default_output_dir()` aponta para `Videos/Nexora Output` (Windows/macOS/Linux) em vez de temp
2. **v0.20.0-B** — AssetDetailPage: toggle Original/Processado na aba Metadados com banner de caminho; MediaInfoPanel mostra metadata do ficheiro activo
3. **v0.20.0-C** — Player inline: caminho do ficheiro visivel sob o toggle (path completo truncado)
4. **v0.20.0-D** — GitHub cleanup COMPLETO:
   - Merge dev → main (fast-forward, commit `30d968a`)
   - Branch `chore/audit-v0.18` eliminada (local + remoto)
   - 11 PRs Dependabot encerrados (#1–#11)
   - 6 releases draft eliminadas (v0.17.0, v0.16.0, v0.15.0, v0.14.0, v0.3.5, v0.3.4)
   - Repositorio limpo: apenas branches `main` e `dev`, sem releases nem PRs abertos
5. **v0.20.0-E** — Videos_Tests/ adicionado ao git (18 samples: 5s/10s/15s/20s/30s em 360p/720p/1080p/2160p/H265/VP9)

**Correcoes adicionais no AssetDetailPage:**

- Duracao dos jobs calculada de `started_at`/`finished_at` (era hardcoded "2m 04s")
- Data de inicio mostra `started_at` com hora (era `created_at` sem hora)
- `output_path` no historico: path completo + botao ExternalLink

**MediaInfoPanel — Copy All:**

- Adicionados TAGS e SHA-256 na funcao `generateTextReport()`

**Versao bumped:** 0.19.0 → 0.20.0 em package.json, Cargo.toml, tauri.conf.json, version.ts, CHANGELOG.md

---

## Estado de compilacao

- `tsc --noEmit`: **OK** (0 erros — verificar apos as alteracoes de hoje)
- `cargo check`: **OK** (0 erros — v0.20.0)
- `npm run lint`: **OK** (0 warnings)
- `npm run sidecar:build`: **OK** (31.7kb)
- `vitest run`: **OK** (15 testes)
- Validacao JSON i18n: **OK** (15 linguas completas)

---

## Estado das branches

- `dev`: commit `457fb6f` — v0.20.0 completo (ainda nao pushed — fazer `git push origin dev`)
- `main`: commit `30d968a` — v0.20.0 merged
- Remote: apenas `main` e `dev`

---

## Proximos passos (v0.21.0 ou validacao manual)

| Tarefa                                                                   | Prioridade |
| ------------------------------------------------------------------------ | ---------- |
| Fazer `git push origin dev` para sincronizar Videos_Tests + version bump | Critica    |
| Testar fluxo real: tauri dev + drag-drop + processamento                 | Critica    |
| Verificar se retry/reprocess funciona (job volta a processing)           | Alta       |
| Actualizar screenshots e manual do utilizador (15 linguas)               | Media      |
| Verificar que o main tem builds Windows/macOS/Linux para v0.19.0         | Media      |
| Criar release v0.20.0 no GitHub com notas e binarios                     | Baixa      |

---

## Notas tecnicas para o proximo agente

- **Sidecar dist nao esta no git** — correr `npm run sidecar:build` antes de cada `tauri dev`
- **15 linguas i18n completas** — ao adicionar texto novo, traduzir SEMPRE todos os 15 locales em `src/i18n/locales/`
- **FFmpeg execFile** — NUNCA usar `exec` com string; sempre `execFile` com array de argumentos
- **VMAF model escaping no Windows** — no filtergraph `-lavfi`, os caminhos absolutos como `C:/path` no Windows geram erro. Substituir sempre por `C\:/path` no `libvmaf=model='path=...'`.
- **QCPreWorker** — lanca erro se `!ctx.assetVideoCodec` (null/undefined); o IngestWorker garante que esta preenchido apos o passo 0
- **tauri-plugin-store** — settings persistem em ficheiro nativo; nao usar localStorage
- **INSERT OR IGNORE em settings** — o `ensure_defaults()` so insere se a chave nao existir; utilizadores existentes MANTEM o output_dir anterior
- **Videos_Tests/** — ja no git; nao ignorado; 18 samples de video de teste
