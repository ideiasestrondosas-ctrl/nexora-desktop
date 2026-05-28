# Design Spec — SEA Sidecar + Help Manual Fixes + Dependency Checker UI

**Data:** 2026-05-28  
**Branch:** dev  
**Versão alvo:** v0.31.0

---

## Contexto

Teste no Windows Sandbox com v0.30.1-beta.1 revelou três problemas:

1. **Toast "Componente interno em falta"** — `nexora-sidecar.cjs` não encontrado OU Node.js ausente no sistema limpo. O sidecar requer Node.js instalado pelo utilizador, o que falha em ambientes novos (Windows Sandbox, máquinas limpas).
2. **Help Manual — i18n, TAB_COUNTS, screenshots** — o tab Comparador mostra chaves brutas; badges na sidebar mostram contagens erradas; vários cards não têm screenshot.
3. **Ausência de diagnóstico de dependências** — não há forma do utilizador perceber o que falta nem como resolver.

---

## Área 1 — Bugs do Help Manual

### 1a. Fix i18n — Comparador

**Problema:** `HelpModal.tsx` chama `t('help.screens.comparator.*')` mas o JSON tem o bloco `comparator` directamente sob `help` (não sob `help.screens`).

**Fix:** Em todos os 17 ficheiros de locale (`en`, `pt`, `de`, `fr`, `es`, `it`, `nl`, `pl`, `sv`, `ru`, `ar`, `ja`, `ko`, `tr`, `zh`, mais `en/base.json`), mover o objecto `comparator` de `help.comparator` para `help.screens.comparator`.

Estrutura correcta:

```json
"help": {
  "screens": {
    "dashboard": {...},
    "comparator": {
      "title": "...",
      "desc": "...",
      "onboarding": {...},
      "watchFolders": {...},
      "privacy": {...},
      "bugReport": {...}
    }
  }
}
```

### 1b. Fix TAB_COUNTS

Em `HelpModal.tsx`, corrigir o objecto `TAB_COUNTS`:

| Tab           | De  | Para |
| ------------- | --- | ---- |
| `comparator`  | 2   | 5    |
| `cloud`       | 5   | 6    |
| `settings`    | 6   | 5    |
| `queue`       | 4   | 3    |
| `import`      | 3   | 2    |
| `assetDetail` | 3   | 1    |

### 1c. Placeholder screenshots

Criar 6 imagens SVG (640×360px, tema escuro) em `public/screenshots/`:

| Ficheiro                 | Card                       |
| ------------------------ | -------------------------- |
| `settings-cache.svg`     | Settings → Cache           |
| `settings-shortcuts.svg` | Settings → Shortcuts       |
| `cloud-upload.svg`       | Cloud → Auto Upload        |
| `cloud-gdrive-oauth.svg` | Cloud → Google Drive OAuth |
| `cloud-s3.svg`           | Cloud → S3 & Compatible    |
| `cloud-icloud.svg`       | Cloud → iCloud Drive       |

Cada SVG: fundo `#0f172a`, ícone central representativo, label descritivo. Adicionar entradas ao mapa `SCREENSHOTS` e ao `screenshot` prop dos respectivos ScreenCards.

**Nota:** `batch-submit.png` já existe em `public/screenshots/` — o card de Import → Batch só precisa do prop `screenshot={SCREENSHOTS['batch-submit']}` adicionado (sem criar SVG novo).

---

## Área 2 — SEA: Nexora Engine (binário autónomo)

### Motivação

O sidecar actual (`nexora-sidecar.cjs`) requer Node.js no PATH do sistema. Em Windows Sandbox e máquinas limpas, Node.js não está instalado → o sidecar não corre.

**Solução:** Compilar o sidecar como binário standalone com `@yao-pkg/pkg`. O resultado (`nexora-engine.exe` / `nexora-engine`) embute o runtime Node.js e é tratado exactamente como o FFmpeg — listado em `externalBin`.

### Ficheiros novos/alterados

**`package.json`** — adicionar script:

```json
"engine:build": "pkg sidecar/dist/nexora-sidecar.cjs --targets node20-win-x64,node20-mac-arm64,node20-mac-x64,node20-linux-x64 --output sidecar/bin/nexora-engine"
```

E dependência de dev: `@yao-pkg/pkg`.

**`tauri.conf.json`** — substituir:

```json
"externalBin": ["binaries/ffmpeg", "binaries/ffprobe", "binaries/nexora-engine"],
"resources": ["resources/vmaf_models"]
```

(remover `nexora-sidecar.cjs` dos `resources`)

**`src-tauri/src/sidecar.rs`** — renomear `resolve_script_path` → `resolve_engine_path`. Procura `nexora-engine` (+ `.exe` no Windows) em:

1. Ao lado do executável (dev)
2. `resource_dir` (produção)
3. PATH como fallback

Remover toda a lógica de `Command::new("node")`.

**`src-tauri/src/lib.rs` (`get_startup_status`)** — remover `node_ok` e `sidecarOk`; adicionar `engineOk`:

```rust
let engine_path = sidecar::resolve_engine_path(&app);
let engine_ok = engine_path.exists();
serde_json::json!({
    "engineOk": engine_ok,
    "ffmpegOk": ffmpeg_ok,
    "ffprobeOk": ffprobe_ok,
    "allOk": engine_ok && ffmpeg_ok && ffprobe_ok,
})
```

**`src/App.tsx`** — substituir os três toasts (`nodeMissing`, `sidecarMissing`) por um único:

```tsx
if (!status.engineOk) {
  toast.warning(t('startup.engineMissing'), {
    duration: Infinity,
    action: { label: t('startup.engineDetails'), onClick: openDiagnosticsModal },
  });
}
```

**Locales** — em `startup`:

- Remover `nodeMissing`, `sidecarMissing`
- Adicionar `engineMissing`, `engineDetails`

### CI — `.github/workflows/build.yml`

Substituir o step "Build sidecar" + "Create resource placeholders" para o sidecar por:

```yaml
- name: Build Nexora Engine (SEA)
  run: npm run sidecar:build && npm run engine:build

- name: Stage engine binary
  shell: bash
  run: |
    if [[ "${{ matrix.platform }}" == "windows-latest" ]]; then
      cp sidecar/bin/nexora-engine-win.exe src-tauri/binaries/nexora-engine-x86_64-pc-windows-msvc.exe
    elif [[ "${{ matrix.platform }}" == "macos-latest" ]]; then
      cp sidecar/bin/nexora-engine-macos src-tauri/binaries/nexora-engine-universal-apple-darwin
    else
      cp sidecar/bin/nexora-engine-linux src-tauri/binaries/nexora-engine-x86_64-unknown-linux-gnu
    fi
```

O placeholder `touch` do sidecar no quality-gate é removido; em vez disso cria-se um placeholder para o binário do engine.

---

## Área 3 — Dependency Checker UI (Opção C)

### Componentes

**`SystemHealthBadge`** — badge ⚠ sobreposto ao ícone de Definições na sidebar quando `engineOk=false`. Implementado como dot indicator em CSS absoluto sobre o ícone.

**`SystemDiagnosticsModal`** — modal (Radix Dialog) com:

- Três linhas: FFmpeg, FFprobe, Nexora Engine (✓/✗ + versão + caminho)
- Botão "Reinstalar aplicação" → abre releases GitHub
- Botão "Fechar"
- Aberto via: (a) action do toast, (b) clique no badge

**Settings → System tab** — sub-tab existente (ou nova) em Definições que mostra o mesmo diagnóstico de forma permanente + botão "Verificar novamente" que re-invoca `get_startup_status`.

### Estado global

Adicionar ao Zustand store (`useAppStore` ou store dedicado):

```ts
interface SystemHealth {
  engineOk: boolean;
  ffmpegOk: boolean;
  ffprobeOk: boolean;
  checked: boolean; // evita re-check desnecessário
}
```

### Fluxo completo

```
app arranque
  → invoke('get_startup_status')
  → store.setSystemHealth(status)
  → se !engineOk: toast.warning + store.setShowDiagBadge(true)
  → badge ⚠ aparece no ícone de Definições na sidebar
  → utilizador clica em "Ver detalhes" no toast OU no badge
  → SystemDiagnosticsModal abre
  → mostra: ✓ FFmpeg 7.1 | ✓ FFprobe 7.1 | ✗ Nexora Engine (caminho esperado: ...)
  → botão "Reinstalar" → openUrl(releases GitHub)
  → badge persiste até próximo arranque com engine OK
```

---

## Sequência de implementação recomendada

1. **Área 1** (bugs) — independente, pode ir a build imediatamente
2. **Área 2** (SEA) — requer testar localmente antes de commitar CI
3. **Área 3** (checker UI) — implementada depois do SEA estar funcional (os tipos mudam)

---

## Critérios de sucesso

- [ ] Comparador mostra texto real (não chaves i18n)
- [ ] Badges da sidebar mostram contagens correctas
- [ ] Cards de settings/cloud/import têm imagem (placeholder ou real)
- [ ] Windows Sandbox: app arranca sem toast de erro (nexora-engine bundled)
- [ ] `get_startup_status` não verifica Node.js
- [ ] Badge ⚠ aparece na sidebar quando engine não encontrado
- [ ] Modal de diagnóstico mostra estado de cada componente
