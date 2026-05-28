# SEA Sidecar + Help Manual Fixes + Dependency Checker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminar a dependência de Node.js no sistema compilando o sidecar como binário standalone (SEA via @yao-pkg/pkg), corrigir todos os bugs do Help Manual (i18n, TAB_COUNTS, screenshots), e adicionar um painel de diagnóstico de dependências com badge na sidebar.

**Architecture:** Área 1 corrige bugs de UI puros e é independente. Área 2 migra `nexora-sidecar.cjs` para `nexora-engine` (binário autónomo) via `@yao-pkg/pkg`, actualiza o Rust para invocar o binário directamente sem Node.js, e actualiza o CI. Área 3 adiciona um Zustand store de saúde do sistema, um modal de diagnóstico (Radix Dialog), e um badge ⚠ no ícone de Definições da sidebar.

**Tech Stack:** React 19 + TypeScript + Zustand + Radix UI · Rust/Tauri 2.x · @yao-pkg/pkg · vitest · GitHub Actions

---

## Ficheiros tocados

### Área 1 — Help Manual

- Modify: `src/i18n/locales/en/common.json` — mover `help.comparator` → `help.screens.comparator`
- Modify: `src/i18n/locales/pt/common.json` — mesma mudança estrutural
- Modify: `src/i18n/locales/{ar,de,es,fr,it,ja,ko,nl,pl,ru,sv,tr,zh}/common.json` — mesma mudança (script)
- Modify: `src/components/HelpModal.tsx` — corrigir TAB_COUNTS + adicionar screenshot props
- Create: `public/screenshots/settings-cache.svg`
- Create: `public/screenshots/settings-shortcuts.svg`
- Create: `public/screenshots/cloud-upload.svg`
- Create: `public/screenshots/cloud-gdrive-oauth.svg`
- Create: `public/screenshots/cloud-s3.svg`
- Create: `public/screenshots/cloud-icloud.svg`

### Área 2 — SEA Sidecar

- Modify: `package.json` — adicionar script `engine:build` e dep `@yao-pkg/pkg`
- Modify: `src-tauri/tauri.conf.json` — actualizar `externalBin` e `resources`
- Modify: `src-tauri/src/sidecar.rs` — renomear `resolve_script_path` → `resolve_engine_path`, remover lógica Node.js
- Modify: `src-tauri/src/queue.rs:257-325` — invocar engine binary directamente
- Modify: `src-tauri/src/lib.rs:382-417` — simplificar `get_startup_status`
- Modify: `src/App.tsx:187-224` — substituir três toasts por um único `engineMissing`
- Modify: `src/i18n/locales/en/common.json` — actualizar chaves `startup.*`
- Modify: `src/i18n/locales/pt/common.json` — mesma actualização
- Modify: `.github/workflows/build.yml` — substituir steps de sidecar por engine SEA

### Área 3 — Dependency Checker UI

- Create: `src/store/systemHealth.ts` — Zustand store com estado de saúde
- Create: `src/components/SystemDiagnosticsModal.tsx` — modal de diagnóstico
- Modify: `src/App.tsx` — integrar health store, badge na sidebar, modal no startup

---

## Task 1: Fix i18n — mover comparator para help.screens (en)

**Files:**

- Modify: `src/i18n/locales/en/common.json`

O bloco `"comparator": {...}` está directamente sob `"help"` (após `"security"`), mas `HelpModal.tsx` usa `t('help.screens.comparator.*')`. É preciso movê-lo para dentro de `"help": { "screens": { ... } }`.

- [ ] **Step 1: Localizar os dois blocos no ficheiro**

No ficheiro `src/i18n/locales/en/common.json`, confirmar:

- Bloco `"screens"` termina antes de `"guideOpened"`
- Bloco `"comparator"` existe directamente sob `"help"` (após `"security"`)

```bash
grep -n '"comparator"\|"screens"\|"guideOpened"\|"security"' src/i18n/locales/en/common.json
```

Esperado: linhas ~64 (`screens`), ~227 (fim de `screens`), ~228 (`guideOpened`), ~237 (`security`), ~244 (`comparator`).

- [ ] **Step 2: Remover o bloco `comparator` standalone da raiz de `help`**

No final de `"security": { ... }` (antes do `},` que fecha o bloco de `help`), o JSON tem actualmente:

```json
    "security": {
      ...
    },
    "comparator": {
      "title": "Visual Comparator",
      ...
    }
  },
```

Apagar o bloco `"comparator": { ... }` que está entre `"security"` e o fecho do objecto `"help"` (linhas ~244-278).

- [ ] **Step 3: Adicionar `comparator` dentro de `help.screens`**

No final de `"screens"`, antes do seu `}` de fecho, adicionar a chave `"comparator"`. O final de `"screens"` fica assim:

```json
      "import": {
        "title": "Import — Adding Media",
        ...
      },
      "comparator": {
        "title": "Visual Comparator",
        "desc": "Compare the original and processed video side-by-side with synchronized playback, scrubbing, and adjustable divider.",
        "splitScreen": "Drag the vertical divider to reveal more of one side or the other",
        "scrubSync": "Move the timeline scrubber to navigate to any frame — both videos stay in sync",
        "playPause": "Use the Play/Pause button to toggle playback on both videos simultaneously",
        "tip1": "The comparator only appears when a processed output exists.",
        "tip2": "Both videos load from local paths via convertFileSrc for best performance.",
        "tip3": "Click the divider and drag horizontally to adjust the split between original and processed.",
        "onboarding": {
          "title": "Onboarding Wizard",
          "desc": "At first launch, a 4-step wizard guides new users through choosing an output directory, setting preferences, and completing privacy/telemetry settings.",
          "tip1": "Step 1: Welcome — overview of Nexora's core features.",
          "tip2": "Step 2: Output Directory — pick where processed files will be saved."
        },
        "watchFolders": {
          "title": "Watch Folders",
          "desc": "Automatically monitor local directories for new video files. When a new file is detected and stabilised (debounced), it is automatically ingested into the Library.",
          "tip1": "Add folders in Settings → Watch Folders.",
          "tip2": "A 3-second debounce prevents ingesting incomplete/copied files."
        },
        "privacy": {
          "title": "Privacy & Telemetry",
          "desc": "Telemetry is opt-in and disabled by default. When enabled, Nexora collects anonymised startup events for diagnostics.",
          "tip1": "Telemetry never sends file names, paths, or any personal data.",
          "tip2": "Telemetry can be enabled/disabled at any time in Settings → Privacy."
        },
        "bugReport": {
          "title": "Bug Reporting",
          "desc": "Report issues directly from the app via the orange bug icon in the TopBar. The Bug Report form lets you copy logs to clipboard or open a pre-filled GitHub issue.",
          "tip1": "Attach recent logs (50 lines) to provide context.",
          "tip2": "The GitHub issue link pre-fills the title and body from your report.",
          "tip3": "Bug reports are sent to GitHub — not to any Nexora server."
        }
      }
    },
```

- [ ] **Step 4: Verificar JSON válido**

```bash
node -e "JSON.parse(require('fs').readFileSync('src/i18n/locales/en/common.json','utf8')); console.log('JSON válido')"
```

Esperado: `JSON válido`

---

## Task 2: Fix i18n — pt locale + restantes 15 locales

**Files:**

- Modify: `src/i18n/locales/pt/common.json`
- Modify: `src/i18n/locales/{ar,de,es,fr,it,ja,ko,nl,pl,ru,sv,tr,zh}/common.json`

- [ ] **Step 1: Aplicar a mesma mudança ao pt/common.json**

O ficheiro `pt/common.json` tem o bloco `"comparator"` com texto em inglês directamente sob `"help"` (estrutura idêntica ao EN). Fazer a mesma operação da Task 1: mover `"comparator"` para dentro de `"help"."screens"`.

Verificar após editar:

```bash
node -e "JSON.parse(require('fs').readFileSync('src/i18n/locales/pt/common.json','utf8')); console.log('JSON válido')"
```

- [ ] **Step 2: Criar e correr script para os restantes 13 locales**

Criar `scripts/fix-i18n-comparator.mjs`:

```js
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const locales = ['ar', 'de', 'es', 'fr', 'it', 'ja', 'ko', 'nl', 'pl', 'ru', 'sv', 'tr', 'zh'];

for (const locale of locales) {
  const path = join('src/i18n/locales', locale, 'common.json');
  const data = JSON.parse(readFileSync(path, 'utf8'));

  if (!data.help?.comparator) {
    console.log(`${locale}: sem bloco comparator standalone — ignorado`);
    continue;
  }

  const comparatorBlock = data.help.comparator;
  delete data.help.comparator;

  if (!data.help.screens) data.help.screens = {};
  data.help.screens.comparator = comparatorBlock;

  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
  console.log(`${locale}: comparator movido para help.screens.comparator`);
}
```

Correr:

```bash
node scripts/fix-i18n-comparator.mjs
```

Esperado: 13 linhas `${locale}: comparator movido para help.screens.comparator`

- [ ] **Step 3: Verificar todos os ficheiros de locale**

```bash
node -e "
const locales = ['ar','de','en','es','fr','it','ja','ko','nl','pl','pt','ru','sv','tr','zh'];
let ok = true;
for (const l of locales) {
  const d = JSON.parse(require('fs').readFileSync('src/i18n/locales/'+l+'/common.json','utf8'));
  const hasOld = 'comparator' in (d.help ?? {});
  const hasNew = 'comparator' in (d.help?.screens ?? {});
  if (hasOld || !hasNew) { console.error(l+': FALHOU'); ok = false; }
  else console.log(l+': OK');
}
process.exit(ok ? 0 : 1);
"
```

Esperado: 15 linhas `${locale}: OK`, exit 0.

---

## Task 3: Fix TAB_COUNTS + batch screenshot

**Files:**

- Modify: `src/components/HelpModal.tsx`

- [ ] **Step 1: Corrigir o objecto TAB_COUNTS**

Em `HelpModal.tsx`, localizar o objecto `TAB_COUNTS` (linhas ~75-88). Substituir:

```ts
const TAB_COUNTS: Record<ScreenTab, number> = {
  intro: 4,
  dashboard: 1,
  library: 2,
  assetDetail: 3,
  import: 3,
  queue: 4,
  profiles: 1,
  settings: 6,
  cloud: 5,
  comparator: 2,
  logs: 1,
  betaGuide: 0,
};
```

Por:

```ts
const TAB_COUNTS: Record<ScreenTab, number> = {
  intro: 4,
  dashboard: 1,
  library: 2,
  assetDetail: 1,
  import: 2,
  queue: 3,
  profiles: 1,
  settings: 5,
  cloud: 6,
  comparator: 5,
  logs: 1,
  betaGuide: 0,
};
```

- [ ] **Step 2: Adicionar screenshot ao card de Batch Processing**

No tab `import`, o segundo ScreenCard (`batchTitle`) não tem `screenshot` prop. Adicionar:

```tsx
<ScreenCard
  title={t('help.screens.import.batchTitle')}
  icon={<Download className="w-4 h-4" />}
  tips={[t('help.screens.import.cloudPicker')]}
  screenshot={SCREENSHOTS['batch-submit']}
  onImageClick={() => setLightboxImage(SCREENSHOTS['batch-submit'])}
>
```

- [ ] **Step 3: Verificar TypeScript**

```bash
npm run typecheck 2>&1 | tail -5
```

Esperado: sem erros.

---

## Task 4: Criar 6 SVG placeholders + wire no HelpModal

**Files:**

- Create: `public/screenshots/settings-cache.svg`
- Create: `public/screenshots/settings-shortcuts.svg`
- Create: `public/screenshots/cloud-upload.svg`
- Create: `public/screenshots/cloud-gdrive-oauth.svg`
- Create: `public/screenshots/cloud-s3.svg`
- Create: `public/screenshots/cloud-icloud.svg`
- Modify: `src/components/HelpModal.tsx`

- [ ] **Step 1: Criar `public/screenshots/settings-cache.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360">
  <rect width="640" height="360" fill="#0f172a"/>
  <rect x="220" y="100" width="200" height="160" rx="12" fill="#1e293b" stroke="#334155" stroke-width="1.5"/>
  <ellipse cx="320" cy="148" rx="52" ry="18" fill="#0f172a" stroke="#475569" stroke-width="2"/>
  <rect x="268" y="148" width="104" height="44" fill="#0f172a" stroke="#475569" stroke-width="2"/>
  <ellipse cx="320" cy="192" rx="52" ry="18" fill="#1e293b" stroke="#475569" stroke-width="2"/>
  <path d="M348 214 a32 32 0 1 0-56 0" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round"/>
  <polygon points="292,214 298,206 292,200" fill="#3b82f6"/>
  <text x="320" y="246" text-anchor="middle" fill="#64748b" font-size="12" font-family="ui-monospace,monospace">Cache &amp; Temporary Files</text>
</svg>
```

- [ ] **Step 2: Criar `public/screenshots/settings-shortcuts.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360">
  <rect width="640" height="360" fill="#0f172a"/>
  <rect x="200" y="110" width="240" height="140" rx="12" fill="#1e293b" stroke="#334155" stroke-width="1.5"/>
  <rect x="222" y="135" width="44" height="34" rx="6" fill="#0f172a" stroke="#475569" stroke-width="1.5"/>
  <text x="244" y="158" text-anchor="middle" fill="#94a3b8" font-size="11" font-family="ui-monospace,monospace">Ctrl</text>
  <rect x="278" y="135" width="44" height="34" rx="6" fill="#0f172a" stroke="#3b82f6" stroke-width="1.5"/>
  <text x="300" y="158" text-anchor="middle" fill="#3b82f6" font-size="11" font-family="ui-monospace,monospace">⇧</text>
  <rect x="334" y="135" width="44" height="34" rx="6" fill="#0f172a" stroke="#475569" stroke-width="1.5"/>
  <text x="356" y="158" text-anchor="middle" fill="#94a3b8" font-size="11" font-family="ui-monospace,monospace">E</text>
  <rect x="222" y="181" width="156" height="34" rx="6" fill="#0f172a" stroke="#334155" stroke-width="1.5"/>
  <text x="300" y="204" text-anchor="middle" fill="#475569" font-size="11" font-family="ui-monospace,monospace">Space</text>
  <text x="320" y="270" text-anchor="middle" fill="#64748b" font-size="12" font-family="ui-monospace,monospace">Keyboard Shortcuts</text>
</svg>
```

- [ ] **Step 3: Criar `public/screenshots/cloud-upload.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360">
  <rect width="640" height="360" fill="#0f172a"/>
  <rect x="210" y="100" width="220" height="160" rx="12" fill="#1e293b" stroke="#334155" stroke-width="1.5"/>
  <path d="M320 145 c-22 0-40 16-40 36 c-12 0-20 8-20 20 h120 c0-12-8-20-20-20 c0-20-18-36-40-36z" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linejoin="round"/>
  <line x1="320" y1="175" x2="320" y2="215" stroke="#10b981" stroke-width="2.5" stroke-linecap="round"/>
  <polyline points="306,188 320,174 334,188" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
  <text x="320" y="268" text-anchor="middle" fill="#64748b" font-size="12" font-family="ui-monospace,monospace">Automatic Upload</text>
</svg>
```

- [ ] **Step 4: Criar `public/screenshots/cloud-gdrive-oauth.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360">
  <rect width="640" height="360" fill="#0f172a"/>
  <rect x="170" y="110" width="100" height="70" rx="8" fill="#1e293b" stroke="#334155" stroke-width="1.5"/>
  <text x="220" y="142" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="ui-monospace,monospace">Browser</text>
  <rect x="220" y="150" width="50" height="16" rx="3" fill="#1e40af"/>
  <text x="245" y="162" text-anchor="middle" fill="white" font-size="8" font-family="ui-monospace,monospace">Authorize</text>
  <line x1="270" y1="145" x2="318" y2="145" stroke="#475569" stroke-width="1.5" stroke-dasharray="4,3" marker-end="url(#arr)"/>
  <rect x="320" y="110" width="100" height="70" rx="8" fill="#1e293b" stroke="#3b82f6" stroke-width="1.5"/>
  <text x="370" y="142" text-anchor="middle" fill="#3b82f6" font-size="9" font-family="ui-monospace,monospace">Nexora</text>
  <text x="370" y="156" text-anchor="middle" fill="#64748b" font-size="8" font-family="ui-monospace,monospace">polling...</text>
  <line x1="420" y1="145" x2="468" y2="145" stroke="#475569" stroke-width="1.5" stroke-dasharray="4,3"/>
  <rect x="470" y="110" width="100" height="70" rx="8" fill="#1e293b" stroke="#334155" stroke-width="1.5"/>
  <text x="520" y="142" text-anchor="middle" fill="#ea4335" font-size="8" font-family="ui-monospace,monospace">Google</text>
  <text x="520" y="156" text-anchor="middle" fill="#64748b" font-size="8" font-family="ui-monospace,monospace">OAuth 2.0</text>
  <text x="320" y="268" text-anchor="middle" fill="#64748b" font-size="12" font-family="ui-monospace,monospace">Google Drive OAuth Device Flow</text>
</svg>
```

- [ ] **Step 5: Criar `public/screenshots/cloud-s3.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360">
  <rect width="640" height="360" fill="#0f172a"/>
  <rect x="220" y="100" width="200" height="160" rx="12" fill="#1e293b" stroke="#334155" stroke-width="1.5"/>
  <rect x="258" y="128" width="124" height="92" rx="6" fill="#0f172a" stroke="#f59e0b" stroke-width="1.5"/>
  <ellipse cx="320" cy="128" rx="62" ry="14" fill="#0f172a" stroke="#f59e0b" stroke-width="1.5"/>
  <ellipse cx="320" cy="128" rx="62" ry="14" fill="none" stroke="#f59e0b" stroke-width="1.5"/>
  <text x="320" y="180" text-anchor="middle" fill="#f59e0b" font-size="18" font-family="ui-monospace,monospace">S3</text>
  <text x="320" y="198" text-anchor="middle" fill="#64748b" font-size="9" font-family="ui-monospace,monospace">AWS · MinIO · Wasabi · B2</text>
  <text x="320" y="268" text-anchor="middle" fill="#64748b" font-size="12" font-family="ui-monospace,monospace">S3 &amp; Compatible Providers</text>
</svg>
```

- [ ] **Step 6: Criar `public/screenshots/cloud-icloud.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360">
  <rect width="640" height="360" fill="#0f172a"/>
  <rect x="210" y="100" width="220" height="160" rx="12" fill="#1e293b" stroke="#334155" stroke-width="1.5"/>
  <path d="M260 195 c0-22 16-40 36-40 c4-14 18-24 34-24 c20 0 36 14 38 32 c14 2 24 14 24 28 c0 16-12 28-28 28 H288 c-16 0-28-12-28-28z" fill="none" stroke="#94a3b8" stroke-width="2.5" stroke-linejoin="round"/>
  <text x="320" y="240" text-anchor="middle" fill="#64748b" font-size="10" font-family="ui-monospace,monospace">~/Library/Mobile Documents</text>
  <text x="320" y="268" text-anchor="middle" fill="#64748b" font-size="12" font-family="ui-monospace,monospace">iCloud Drive (local sync)</text>
</svg>
```

- [ ] **Step 7: Adicionar entradas ao mapa SCREENSHOTS e props nos ScreenCards**

Em `HelpModal.tsx`, adicionar ao objecto `SCREENSHOTS` (após `'batch-submit'`):

```ts
'settings-cache': '/screenshots/settings-cache.svg',
'settings-shortcuts': '/screenshots/settings-shortcuts.svg',
'cloud-upload': '/screenshots/cloud-upload.svg',
'cloud-gdrive-oauth': '/screenshots/cloud-gdrive-oauth.svg',
'cloud-s3': '/screenshots/cloud-s3.svg',
'cloud-icloud': '/screenshots/cloud-icloud.svg',
```

Adicionar `screenshot` e `onImageClick` a cada ScreenCard sem screenshot:

**Settings → Cache card:**

```tsx
<ScreenCard
  title={t('help.screens.settings.cache.title')}
  icon={<Settings className="w-4 h-4" />}
  screenshot={SCREENSHOTS['settings-cache']}
  onImageClick={() => setLightboxImage(SCREENSHOTS['settings-cache'])}
>
```

**Settings → Shortcuts card:**

```tsx
<ScreenCard
  title={t('help.screens.settings.shortcuts.title')}
  icon={<Settings className="w-4 h-4" />}
  screenshot={SCREENSHOTS['settings-shortcuts']}
  onImageClick={() => setLightboxImage(SCREENSHOTS['settings-shortcuts'])}
>
```

**Cloud → Upload card:** adicionar apenas `screenshot` e `onImageClick` — manter o prop `tips` existente intacto:

```tsx
<ScreenCard
  title={t('help.screens.cloud.upload.title')}
  icon={<Cloud className="w-4 h-4" />}
  screenshot={SCREENSHOTS['cloud-upload']}
  onImageClick={() => setLightboxImage(SCREENSHOTS['cloud-upload'])}
  tips={[
    t('help.screens.cloud.upload.tip1'),
    t('help.screens.cloud.upload.tip2'),
    t('help.screens.cloud.upload.tip3'),
  ]}
>
```

**Cloud → Google Drive OAuth card:** adicionar apenas `screenshot` e `onImageClick`:

```tsx
<ScreenCard
  title={t('help.screens.cloud.gdriveOAuth.title')}
  icon={<Cloud className="w-4 h-4" />}
  screenshot={SCREENSHOTS['cloud-gdrive-oauth']}
  onImageClick={() => setLightboxImage(SCREENSHOTS['cloud-gdrive-oauth'])}
  tips={[
    t('help.screens.cloud.gdriveOAuth.step1'),
    t('help.screens.cloud.gdriveOAuth.step2'),
    t('help.screens.cloud.gdriveOAuth.step3'),
  ]}
>
```

**Cloud → S3 card:** adicionar apenas `screenshot` e `onImageClick`:

```tsx
<ScreenCard
  title={t('help.screens.cloud.s3.title')}
  icon={<Cloud className="w-4 h-4" />}
  screenshot={SCREENSHOTS['cloud-s3']}
  onImageClick={() => setLightboxImage(SCREENSHOTS['cloud-s3'])}
  tips={[t('help.screens.cloud.s3.providers')]}
>
```

**Cloud → iCloud card:** adicionar apenas `screenshot` e `onImageClick`:

```tsx
<ScreenCard
  title={t('help.screens.cloud.icloud.title')}
  icon={<Cloud className="w-4 h-4" />}
  screenshot={SCREENSHOTS['cloud-icloud']}
  onImageClick={() => setLightboxImage(SCREENSHOTS['cloud-icloud'])}
  tips={[t('help.screens.cloud.icloud.localPath')]}
>
```

- [ ] **Step 8: TypeScript check**

```bash
npm run typecheck 2>&1 | tail -5
```

Esperado: sem erros.

---

## Task 5: Commit — Área 1

**Files:** todos os ficheiros das Tasks 1–4

- [ ] **Step 1: Stage e commit**

```bash
git add src/components/HelpModal.tsx \
        src/i18n/locales/en/common.json \
        src/i18n/locales/pt/common.json \
        "src/i18n/locales/ar/common.json" \
        "src/i18n/locales/de/common.json" \
        "src/i18n/locales/es/common.json" \
        "src/i18n/locales/fr/common.json" \
        "src/i18n/locales/it/common.json" \
        "src/i18n/locales/ja/common.json" \
        "src/i18n/locales/ko/common.json" \
        "src/i18n/locales/nl/common.json" \
        "src/i18n/locales/pl/common.json" \
        "src/i18n/locales/ru/common.json" \
        "src/i18n/locales/sv/common.json" \
        "src/i18n/locales/tr/common.json" \
        "src/i18n/locales/zh/common.json" \
        public/screenshots/settings-cache.svg \
        public/screenshots/settings-shortcuts.svg \
        public/screenshots/cloud-upload.svg \
        public/screenshots/cloud-gdrive-oauth.svg \
        public/screenshots/cloud-s3.svg \
        public/screenshots/cloud-icloud.svg \
        scripts/fix-i18n-comparator.mjs

git commit -m "fix(help): correct comparator i18n path, TAB_COUNTS, and add placeholder screenshots"
```

---

## Task 6: Instalar @yao-pkg/pkg + adicionar engine:build

**Files:**

- Modify: `package.json`

- [ ] **Step 1: Instalar @yao-pkg/pkg como dependência de dev**

```bash
npm install --save-dev @yao-pkg/pkg
```

Verificar:

```bash
npx pkg --version
```

Esperado: versão do pkg (ex: `5.x.x`)

- [ ] **Step 2: Adicionar script `engine:build` ao package.json**

No objecto `"scripts"` de `package.json`, adicionar após `sidecar:build`:

```json
"engine:build": "npm run sidecar:build && pkg sidecar/dist/nexora-sidecar.cjs --targets node20-win-x64,node20-mac-arm64,node20-mac-x64,node20-linux-x64 --output sidecar/bin/nexora-engine",
"engine:build:win": "npm run sidecar:build && pkg sidecar/dist/nexora-sidecar.cjs --targets node20-win-x64 --output sidecar/bin/nexora-engine",
"engine:build:mac": "npm run sidecar:build && pkg sidecar/dist/nexora-sidecar.cjs --targets node20-mac-arm64,node20-mac-x64 --output sidecar/bin/nexora-engine",
"engine:build:linux": "npm run sidecar:build && pkg sidecar/dist/nexora-sidecar.cjs --targets node20-linux-x64 --output sidecar/bin/nexora-engine",
```

- [ ] **Step 3: Adicionar `sidecar/bin/` ao .gitignore**

```bash
echo "sidecar/bin/" >> .gitignore
```

---

## Task 7: Build e verificar engine binary localmente

**Files:** nenhum (verificação)

- [ ] **Step 1: Criar diretório bin**

```bash
mkdir -p sidecar/bin
```

- [ ] **Step 2: Build para a plataforma actual (Windows)**

```bash
npm run engine:build:win
```

Esperado: ficheiro criado `sidecar/bin/nexora-engine-win.exe` (~50-70 MB). Este passo pode demorar 1-3 minutos.

- [ ] **Step 3: Verificar que o binário corre**

Criar ficheiro de teste `sidecar/bin/test-engine.json`:

```json
{
  "jobId": "test-001",
  "assetId": "test-asset",
  "assetPath": "C:/nonexistent/test.mp4",
  "profile": "web_hd",
  "outputDir": "C:/temp/nexora-test"
}
```

Correr:

```bash
echo '{"jobId":"test","assetId":"a","assetPath":"C:/fake.mp4","profile":"web_hd","outputDir":"C:/temp"}' | "sidecar/bin/nexora-engine-win.exe"
```

Esperado: output JSON com `{"type":"job:failed","error":"..."}` (falha esperada pois o asset não existe, mas o binário arrancou).

- [ ] **Step 4: Copiar para binaries/ com nome correcto para Tauri**

```bash
cp "sidecar/bin/nexora-engine-win.exe" "src-tauri/binaries/nexora-engine-x86_64-pc-windows-msvc.exe"
```

Adicionar ao .gitignore:

```bash
echo "src-tauri/binaries/nexora-engine*" >> .gitignore
```

---

## Task 8: Actualizar sidecar.rs → resolve_engine_path

**Files:**

- Modify: `src-tauri/src/sidecar.rs`

- [ ] **Step 1: Substituir o conteúdo do ficheiro**

Substituir `src-tauri/src/sidecar.rs` integralmente pelo seguinte:

```rust
use log::{info, warn};
use std::path::PathBuf;
use tauri::{AppHandle, Runtime};

/// Resolve o caminho absoluto do binário nexora-engine.
/// Ordem de prioridade:
/// 1. Ao lado do executável (desenvolvimento: target/debug/ ou target/release/)
/// 2. resource_dir() do Tauri (produção: bundle do instalador)
/// 3. Nome do comando no PATH (fallback)
pub fn resolve_engine_path<R: Runtime>(app: &AppHandle<R>) -> PathBuf {
    let name = if cfg!(target_os = "windows") {
        "nexora-engine.exe"
    } else {
        "nexora-engine"
    };

    // 1. Desenvolvimento: ao lado do executável
    if let Ok(exe) = std::env::current_exe() {
        if let Some(exe_dir) = exe.parent() {
            let candidate = exe_dir.join(name);
            if candidate.exists() {
                info!("nexora-engine encontrado ao lado do exe: {:?}", candidate);
                return candidate;
            }
        }
    }

    // 2. Produção: resource_dir do Tauri
    if let Ok(resource_dir) = app.path().resource_dir() {
        let candidate = resource_dir.join(name);
        if candidate.exists() {
            info!("nexora-engine encontrado em resource_dir: {:?}", candidate);
            return candidate;
        }
    }

    warn!("nexora-engine não encontrado — a usar '{}' do PATH", name);
    PathBuf::from(name)
}

/// Resolve o caminho absoluto de um binário media (ffmpeg ou ffprobe).
pub fn resolve_media_binary_path<R: Runtime>(app: &AppHandle<R>, name: &str) -> PathBuf {
    let ext = if cfg!(target_os = "windows") { ".exe" } else { "" };

    if let Ok(exe) = std::env::current_exe() {
        if let Some(exe_dir) = exe.parent() {
            let candidate = exe_dir.join(format!("{}{}", name, ext));
            if candidate.exists() {
                return candidate;
            }
        }
    }

    if let Ok(resource_dir) = app.path().resource_dir() {
        let candidate = resource_dir.join(format!("{}{}", name, ext));
        if candidate.exists() {
            return candidate;
        }
    }

    PathBuf::from(name)
}
```

- [ ] **Step 2: Verificar compilação Rust**

```bash
cd src-tauri && cargo check 2>&1 | tail -10
```

Esperado: `Finished` sem erros. (Haverá avisos de dead_code do `spawn()` antigo que já estava marcado como dead_code — esses são esperados. Se o `spawn()` ainda existir no ficheiro de alguma versão anterior, apagá-lo completamente.)

---

## Task 9: Actualizar queue.rs → invocar engine binary

**Files:**

- Modify: `src-tauri/src/queue.rs:257-325`

- [ ] **Step 1: Substituir as linhas 257-339 da função `run_job`**

Localizar o bloco:

```rust
let script_path = super::sidecar::resolve_script_path(app);
if !script_path.exists() {
    return Err(anyhow::anyhow!(
        "Sidecar script not found: {:?}",
        script_path
    ));
}
```

Substituir por:

```rust
let engine_path = super::sidecar::resolve_engine_path(app);
if !engine_path.exists() {
    return Err(anyhow::anyhow!(
        "Nexora Engine não encontrado: {:?}",
        engine_path
    ));
}
```

Localizar:

```rust
let mut cmd = Command::new("node");
cmd.arg(&script_path)
   .env("NEXORA_DB_PATH", db_path)
```

Substituir por:

```rust
let mut cmd = Command::new(&engine_path);
cmd.env("NEXORA_DB_PATH", db_path)
```

(remover `.arg(&script_path)` — o engine binary não precisa de argumento de script)

- [ ] **Step 2: Verificar compilação**

```bash
cd src-tauri && cargo check 2>&1 | tail -10
```

Esperado: `Finished` sem erros.

---

## Task 10: Actualizar get_startup_status + App.tsx + locales startup

**Files:**

- Modify: `src-tauri/src/lib.rs:380-417`
- Modify: `src/App.tsx:187-224`
- Modify: `src/i18n/locales/en/common.json` (startup section)
- Modify: `src/i18n/locales/pt/common.json` (startup section)

- [ ] **Step 1: Simplificar get_startup_status em lib.rs**

Substituir a função `get_startup_status` (linhas ~380-417) por:

```rust
#[tauri::command]
fn get_startup_status(app: tauri::AppHandle) -> serde_json::Value {
    use std::process::Command;

    let engine_path = sidecar::resolve_engine_path(&app);
    let engine_ok = engine_path.exists();

    let ffprobe_path = sidecar::resolve_media_binary_path(&app, "ffprobe");
    let ffprobe_ok = ffprobe_path.exists()
        || Command::new("ffprobe")
            .arg("-version")
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false);

    let ffmpeg_path = sidecar::resolve_media_binary_path(&app, "ffmpeg");
    let ffmpeg_ok = ffmpeg_path.exists()
        || Command::new("ffmpeg")
            .arg("-version")
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false);

    serde_json::json!({
        "engineOk": engine_ok,
        "ffprobeOk": ffprobe_ok,
        "ffmpegOk": ffmpeg_ok,
        "allOk": engine_ok && ffprobe_ok && ffmpeg_ok,
    })
}
```

- [ ] **Step 2: Verificar compilação Rust**

```bash
cd src-tauri && cargo check 2>&1 | tail -5
```

Esperado: `Finished` sem erros.

- [ ] **Step 3: Actualizar App.tsx — startup check**

Localizar o bloco `invoke<{...}>('get_startup_status')` (linhas ~187-224) e substituir por:

```tsx
invoke<{
  engineOk: boolean;
  ffprobeOk: boolean;
  ffmpegOk: boolean;
  allOk: boolean;
}>('get_startup_status')
  .then((status) => {
    setSystemHealth(status);
    if (!status.ffmpegOk || !status.ffprobeOk) {
      toast.error(t('startup.ffmpegMissing'), { duration: Number.POSITIVE_INFINITY });
    }
    if (!status.engineOk) {
      toast.warning(t('startup.engineMissing'), {
        duration: Number.POSITIVE_INFINITY,
        action: {
          label: t('startup.engineDetails'),
          onClick: () => setDiagnosticsOpen(true),
        },
      });
    }
  })
  .catch(console.error);
```

Nota: `setSystemHealth` e `setDiagnosticsOpen` serão adicionados na Área 3 (Task 13+). Por agora, declarar temporariamente para que o TypeScript compile:

Adicionar antes do bloco `invoke`:

```tsx
const setSystemHealth = (_: unknown) => {}; // substituído na Task 13
const [diagnosticsOpen, setDiagnosticsOpen] = useState(false); // substituído na Task 13
```

- [ ] **Step 4: Actualizar locales — startup keys**

Em `src/i18n/locales/en/common.json`, no objecto `"startup"`:

```json
"startup": {
  "ffmpegMissing": "Video conversion engine unavailable. Check the Help section to install requirements.",
  "engineMissing": "Nexora Engine not found. Reinstall the app to restore video processing.",
  "engineDetails": "View details"
},
```

(Remover `nodeMissing` e `sidecarMissing`)

Em `src/i18n/locales/pt/common.json`:

```json
"startup": {
  "ffmpegMissing": "O motor de conversão de vídeo não está disponível. Consulte a secção Ajuda para instalar os requisitos.",
  "engineMissing": "Nexora Engine não encontrado. Reinstala a aplicação para restaurar o processamento de vídeo.",
  "engineDetails": "Ver detalhes"
},
```

- [ ] **Step 5: TypeScript check**

```bash
npm run typecheck 2>&1 | tail -5
```

Esperado: sem erros.

---

## Task 11: Actualizar tauri.conf.json

**Files:**

- Modify: `src-tauri/tauri.conf.json`

- [ ] **Step 1: Actualizar externalBin e resources**

Substituir o bloco `"bundle"` → `"externalBin"` e `"resources"`:

```json
"externalBin": ["binaries/ffmpeg", "binaries/ffprobe", "binaries/nexora-engine"],
"resources": ["resources/vmaf_models"]
```

(Remover `"../sidecar/dist/nexora-sidecar.cjs"` dos `resources`)

- [ ] **Step 2: Verificar compilação Tauri**

```bash
cd src-tauri && cargo check 2>&1 | tail -5
```

Esperado: `Finished` sem erros.

---

## Task 12: Actualizar CI build.yml + commit Área 2

**Files:**

- Modify: `.github/workflows/build.yml`

- [ ] **Step 1: Actualizar quality-gate step de placeholders**

Localizar o step `Create resource placeholders` no job `quality-gate`. Substituir:

```yaml
- name: Create resource placeholders
  shell: bash
  run: |
    mkdir -p sidecar/dist sidecar/bin
    touch sidecar/dist/nexora-sidecar.cjs
    mkdir -p src-tauri/binaries
    touch src-tauri/binaries/ffmpeg-x86_64-unknown-linux-gnu
    touch src-tauri/binaries/ffprobe-x86_64-unknown-linux-gnu
    touch src-tauri/binaries/nexora-engine-x86_64-unknown-linux-gnu
```

- [ ] **Step 2: Actualizar o job `build` — substituir steps do sidecar**

Substituir os steps `Create resource placeholders` e `Build sidecar` no job `build` por:

```yaml
- name: Create binary placeholders
  shell: bash
  run: |
    mkdir -p src-tauri/binaries sidecar/bin
    if [[ "${{ matrix.platform }}" == "windows-latest" ]]; then
      touch src-tauri/binaries/ffmpeg-x86_64-pc-windows-msvc.exe
      touch src-tauri/binaries/ffprobe-x86_64-pc-windows-msvc.exe
      touch src-tauri/binaries/nexora-engine-x86_64-pc-windows-msvc.exe
    elif [[ "${{ matrix.platform }}" == "macos-latest" ]]; then
      touch src-tauri/binaries/ffmpeg-aarch64-apple-darwin
      touch src-tauri/binaries/ffprobe-aarch64-apple-darwin
      touch src-tauri/binaries/ffmpeg-x86_64-apple-darwin
      touch src-tauri/binaries/ffprobe-x86_64-apple-darwin
      touch src-tauri/binaries/ffmpeg-universal-apple-darwin
      touch src-tauri/binaries/ffprobe-universal-apple-darwin
      touch src-tauri/binaries/nexora-engine-aarch64-apple-darwin
      touch src-tauri/binaries/nexora-engine-x86_64-apple-darwin
      touch src-tauri/binaries/nexora-engine-universal-apple-darwin
    else
      touch src-tauri/binaries/ffmpeg-x86_64-unknown-linux-gnu
      touch src-tauri/binaries/ffprobe-x86_64-unknown-linux-gnu
      touch src-tauri/binaries/nexora-engine-x86_64-unknown-linux-gnu
    fi

- name: Download media binaries
  run: node scripts/download-media-binaries.js

- name: Build Nexora Engine (SEA)
  shell: bash
  run: |
    if [[ "${{ matrix.platform }}" == "windows-latest" ]]; then
      npm run engine:build:win
    elif [[ "${{ matrix.platform }}" == "macos-latest" ]]; then
      npm run engine:build:mac
    else
      npm run engine:build:linux
    fi

- name: Stage engine binary
  shell: bash
  run: |
    if [[ "${{ matrix.platform }}" == "windows-latest" ]]; then
      cp sidecar/bin/nexora-engine-win.exe \
         src-tauri/binaries/nexora-engine-x86_64-pc-windows-msvc.exe
    elif [[ "${{ matrix.platform }}" == "macos-latest" ]]; then
      cp sidecar/bin/nexora-engine-macos \
         src-tauri/binaries/nexora-engine-universal-apple-darwin
    else
      cp sidecar/bin/nexora-engine-linux \
         src-tauri/binaries/nexora-engine-x86_64-unknown-linux-gnu
    fi
```

- [ ] **Step 3: Commit Área 2**

```bash
git add \
  package.json \
  package-lock.json \
  .gitignore \
  src-tauri/tauri.conf.json \
  src-tauri/src/sidecar.rs \
  src-tauri/src/queue.rs \
  src-tauri/src/lib.rs \
  src/App.tsx \
  src/i18n/locales/en/common.json \
  src/i18n/locales/pt/common.json \
  .github/workflows/build.yml

git commit -m "feat(engine): compile sidecar as SEA binary via pkg, remove Node.js dependency"
```

---

## Task 13: Adicionar useSystemHealth store

**Files:**

- Create: `src/store/systemHealth.ts`

- [ ] **Step 1: Criar o store**

```ts
// src/store/systemHealth.ts
import { create } from 'zustand';

interface SystemHealth {
  engineOk: boolean;
  ffmpegOk: boolean;
  ffprobeOk: boolean;
  allOk: boolean;
  checked: boolean;
}

interface SystemHealthStore {
  health: SystemHealth;
  setHealth: (h: Omit<SystemHealth, 'checked'>) => void;
}

export const useSystemHealth = create<SystemHealthStore>((set) => ({
  health: {
    engineOk: true,
    ffmpegOk: true,
    ffprobeOk: true,
    allOk: true,
    checked: false,
  },
  setHealth: (h) => set({ health: { ...h, checked: true } }),
}));
```

- [ ] **Step 2: TypeScript check**

```bash
npm run typecheck 2>&1 | tail -5
```

Esperado: sem erros.

---

## Task 14: Criar SystemDiagnosticsModal

**Files:**

- Create: `src/components/SystemDiagnosticsModal.tsx`

- [ ] **Step 1: Criar o componente**

```tsx
// src/components/SystemDiagnosticsModal.tsx
import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, CheckCircle, XCircle, AlertTriangle, ExternalLink } from 'lucide-react';
import { openUrl } from '@tauri-apps/plugin-opener';
import { useTranslation } from 'react-i18next';
import { useSystemHealth } from '@/store/systemHealth';

const RELEASES_URL = 'https://github.com/ideiasestrondosas-ctrl/nexora-desktop/releases/latest';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SystemDiagnosticsModal: React.FC<Props> = ({ open, onOpenChange }) => {
  const { t } = useTranslation();
  const { health } = useSystemHealth();

  const items = [
    {
      label: 'FFmpeg',
      ok: health.ffmpegOk,
      detail: health.ffmpegOk ? t('diagnostics.bundled') : t('diagnostics.notFound'),
    },
    {
      label: 'FFprobe',
      ok: health.ffprobeOk,
      detail: health.ffprobeOk ? t('diagnostics.bundled') : t('diagnostics.notFound'),
    },
    {
      label: 'Nexora Engine',
      ok: health.engineOk,
      detail: health.engineOk ? t('diagnostics.bundled') : t('diagnostics.notFound'),
    },
  ];

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-bg-secondary border border-border rounded-xl shadow-2xl p-6 outline-none">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              <Dialog.Title className="text-base font-bold text-text-primary">
                {t('diagnostics.title')}
              </Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <button className="p-1.5 text-text-muted hover:text-text-primary rounded-full hover:bg-bg-hover transition-colors">
                <X className="w-4 h-4" />
              </button>
            </Dialog.Close>
          </div>

          <Dialog.Description className="text-xs text-text-muted mb-4">
            {t('diagnostics.desc')}
          </Dialog.Description>

          <div className="space-y-2 mb-5">
            {items.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between p-3 rounded-lg bg-bg-tertiary border border-border/50"
              >
                <div className="flex items-center gap-2.5">
                  {item.ok ? (
                    <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                  )}
                  <span className="text-sm font-medium text-text-primary">{item.label}</span>
                </div>
                <span className="text-xs text-text-muted">{item.detail}</span>
              </div>
            ))}
          </div>

          {!health.allOk && (
            <button
              onClick={() => openUrl(RELEASES_URL).catch(console.error)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-brand/10 text-brand hover:bg-brand/20 transition-colors text-sm font-semibold"
            >
              <ExternalLink className="w-4 h-4" />
              {t('diagnostics.reinstall')}
            </button>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
```

- [ ] **Step 2: Adicionar chaves i18n (en + pt)**

Em `en/common.json`, adicionar no nível raiz:

```json
"diagnostics": {
  "title": "System Diagnostics",
  "desc": "Status of the components required for video processing.",
  "bundled": "bundled ✓",
  "notFound": "not found",
  "reinstall": "Download latest release"
},
```

Em `pt/common.json`:

```json
"diagnostics": {
  "title": "Diagnóstico do Sistema",
  "desc": "Estado dos componentes necessários para o processamento de vídeo.",
  "bundled": "incluído ✓",
  "notFound": "não encontrado",
  "reinstall": "Descarregar versão mais recente"
},
```

- [ ] **Step 3: TypeScript check**

```bash
npm run typecheck 2>&1 | tail -5
```

Esperado: sem erros.

---

## Task 15: Integrar badge + modal + health check no App.tsx

**Files:**

- Modify: `src/App.tsx`

- [ ] **Step 1: Importar novos módulos**

Adicionar ao topo de `src/App.tsx`:

```tsx
import { useSystemHealth } from '@/store/systemHealth';
import { SystemDiagnosticsModal } from '@/components/SystemDiagnosticsModal';
```

- [ ] **Step 2: Substituir as declarações temporárias adicionadas na Task 10**

Substituir:

```tsx
const setSystemHealth = (_: unknown) => {}; // substituído na Task 13
const [diagnosticsOpen, setDiagnosticsOpen] = useState(false); // substituído na Task 13
```

Por:

```tsx
const { setHealth } = useSystemHealth();
const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
```

Actualizar o `invoke` para usar `setHealth`:

```tsx
.then((status) => {
  setHealth(status);
  ...
})
```

- [ ] **Step 3: Adicionar badge ⚠ ao botão de Definições na sidebar**

Localizar o botão de Settings no `navItems.map(...)`:

```tsx
<button
  key={item.id}
  onClick={() => handleNavigate(item.id)}
  className={cn(...)}
>
  <Icon ... />
  <span className="text-sm">{item.label}</span>
  {isActive && <div className="absolute left-0 w-1 h-6 bg-brand rounded-r-full"></div>}
</button>
```

Adicionar o badge para o item de Settings:

```tsx
{
  item.id === 'settings' && !health.allOk && health.checked && (
    <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-yellow-400" />
  );
}
```

Importar `health` do store:

```tsx
const { health } = useSystemHealth();
```

- [ ] **Step 4: Adicionar o modal ao JSX do App**

No final do componente, antes do `</div>` de fecho do return, adicionar:

```tsx
<SystemDiagnosticsModal open={diagnosticsOpen} onOpenChange={setDiagnosticsOpen} />
```

- [ ] **Step 5: TypeScript check + lint**

```bash
npm run typecheck 2>&1 | tail -5
npm run lint 2>&1 | tail -5
```

Esperado: sem erros.

- [ ] **Step 6: Commit Área 3**

```bash
git add \
  src/store/systemHealth.ts \
  src/components/SystemDiagnosticsModal.tsx \
  src/App.tsx \
  src/i18n/locales/en/common.json \
  src/i18n/locales/pt/common.json

git commit -m "feat(ui): add system diagnostics modal and health badge in sidebar"
```

---

## Critérios de sucesso

- [ ] `npm run typecheck` sem erros
- [ ] `npm run lint` sem warnings
- [ ] Comparador no Help Modal mostra texto real (não `help.screens.comparator.title`)
- [ ] Badges da sidebar mostram contagens correctas (ex: Comparator mostra 5)
- [ ] Cards de settings/cloud/import têm screenshot (SVG ou real)
- [ ] `sidecar/bin/nexora-engine-win.exe` existe e corre quando se envia JSON por stdin
- [ ] `src-tauri` compila sem erros: `cd src-tauri && cargo check`
- [ ] `get_startup_status` retorna `engineOk`, não `nodeOk`/`sidecarOk`
- [ ] Windows Sandbox: app arranca sem toast de "Componente interno em falta"
- [ ] Badge ⚠ aparece no ícone de Definições quando `engineOk=false`
- [ ] Modal de diagnóstico abre ao clicar em "Ver detalhes" no toast
