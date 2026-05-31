# UI/UX Fixes v0.30.9 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir 7 problemas visuais e funcionais identificados em testes Windows Sandbox com v0.30.8-beta.1.

**Architecture:** Alterações cirúrgicas em 8 ficheiros frontend + 2 ficheiros Rust + 1 script CI + CHANGELOG.md. Sem novas dependências. Sem refactoring.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Tauri 2 (Rust), i18next, Node.js (script CI)

---

## File Map

| Ficheiro                               | O que muda                                                                                                           |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `CHANGELOG.md`                         | Limpeza de mojibake existente                                                                                        |
| `scripts/ci-generate-updater-json.mjs` | Corrigir regex overly-escaped em `extractChangelogSection`                                                           |
| `src/components/HelpModal.tsx`         | Remover `/50` em bordas estruturais, solidificar sidebar bg                                                          |
| `src/pages/LibraryPage.tsx`            | Overlay hover `bg-black/50`, badge fallback com dark variants, info text contrast                                    |
| `src/pages/SettingsPage.tsx`           | Badge "já actualizado" inline + botão "Criar atalho no desktop"                                                      |
| `src/components/UpdateModal.tsx`       | Link "Ver release notes completas" com `openUrl`                                                                     |
| `src-tauri/src/commands/system.rs`     | Novos commands: `create_desktop_shortcut` (Linux), `create_macos_alias` (macOS), `create_windows_shortcut` (Windows) |
| `src-tauri/src/lib.rs`                 | Registar os 3 novos commands no `invoke_handler`                                                                     |
| `src/i18n/locales/pt/common.json`      | 3 novas chaves: `update.viewFullRelease`, `settings.about.createShortcut`, `settings.about.shortcutCreated`          |
| `src/i18n/locales/en/common.json`      | Mesmas 3 chaves em inglês                                                                                            |

> **Nota:** As restantes 13 línguas (ar, de, es, fr, it, ja, ko, nl, pl, ru, sv, tr, zh) recebem as mesmas chaves em inglês por agora — i18next usa `en` como fallback automático.

---

## Task 1: Limpar CHANGELOG.md (mojibake)

**Ficheiros:**

- Modify: `CHANGELOG.md`

- [ ] **Step 1: Identificar e substituir as linhas com mojibake**

Abrir `CHANGELOG.md` e substituir as ocorrências garbled. As linhas afectadas são identificáveis por `Ã` ou `â€`. Substituições exactas:

```
Ã¢â‚¬â€œ  →  "
Ã¢â‚¬â€   →  -
Ã¢â‚¬â„¢  →  '
Ã§Ã£o     →  ção  (se aparecer)
```

Na linha 25 do CHANGELOG.md actual:

```
- 2: Titulo: 4 Bugs UI/UX Sandbox Ã¢â‚¬â€ Update Modal, Thumbnails, Player, Comparador
```

Corrigir para:

```
- 2: Titulo: 4 Bugs UI/UX Sandbox - Update Modal, Thumbnails, Player, Comparador
```

Verificar todo o ficheiro com:

```bash
grep -n "Ã\|â€\|Â" CHANGELOG.md
```

Corrigir todas as ocorrências encontradas (substituir por equivalente ASCII simples: `—` → `-`, `"` → `"`, etc.).

- [ ] **Step 2: Verificar que o ficheiro ficou limpo**

```bash
grep -c "Ã\|â€\|Â" CHANGELOG.md
```

Esperado: `0`

- [ ] **Step 3: Commit**

```bash
git add CHANGELOG.md
git commit -m "fix(changelog): limpar mojibake UTF-8 -- caracteres garbled substituidos"
```

---

## Task 2: Corrigir regex em ci-generate-updater-json.mjs

O problema: os padrões usam `\\\\s` (4 backslashes no código = `\\s` no regex = barra literal + s). O correcto é `\\s` no código = `\s` no regex = whitespace.

**Ficheiros:**

- Modify: `scripts/ci-generate-updater-json.mjs:25-39`

- [ ] **Step 1: Corrigir a função `extractChangelogSection`**

Substituir a função inteira (linhas 25-40):

```javascript
function extractChangelogSection(changelogText, ver) {
  const escaped = ver.replace(/\./g, '\\.');
  const patterns = [
    // Keep a Changelog format: ## [0.30.4-beta.1] - date
    new RegExp('##\\s+\\[' + escaped + '[^\\]]*\\][^\\n]*\\n([\\s\\S]*?)(?=\\n##\\s|$)'),
    // Plain format: ## v0.30.4 or ## 0.30.4
    new RegExp('##\\s+v?' + escaped + '[^\\n]*\\n([\\s\\S]*?)(?=\\n##\\s|$)'),
  ];
  for (const pattern of patterns) {
    const match = changelogText.match(pattern);
    if (match?.[1]?.trim()) return match[1].trim();
  }
  return null;
}
```

- [ ] **Step 2: Adicionar limite de 500 chars ao bloco de extracção (linhas 66-79)**

Substituir o bloco `let notes = ...` (linhas 66-79):

```javascript
let notes = 'Ver CHANGELOG.md para detalhes das alterações.';
try {
  const changelog = readFileSync('CHANGELOG.md', 'utf8');
  const extracted = extractChangelogSection(changelog, version);
  if (extracted) {
    notes = extracted.length > 500 ? extracted.substring(0, 497) + '...' : extracted;
    console.log(`\nExtracted CHANGELOG section for v${version} (${notes.length} chars)`);
  } else {
    console.log(`\nNo CHANGELOG section found for v${version}, using default notes`);
  }
} catch (e) {
  console.log(`\nCould not read CHANGELOG.md: ${e.message}`);
}
```

- [ ] **Step 3: Testar a função localmente com Node.js**

```bash
node -e "
const { readFileSync } = require('fs');
const changelog = readFileSync('CHANGELOG.md', 'utf8');
const escaped = '0\\.30\\.8';
const pattern = new RegExp('##\\\\s+\\\\[' + escaped + '[^\\\\]]*\\\\][^\\\\n]*\\\\n([\\\\s\\\\S]*?)(?=\\\\n##\\\\s|\$)');
const match = changelog.match(pattern);
console.log('Match:', match ? match[1].substring(0, 200) : 'null');
"
```

Esperado: Mostra o conteúdo da secção `[0.30.8-beta.1]` do CHANGELOG.

- [ ] **Step 4: Commit**

```bash
git add scripts/ci-generate-updater-json.mjs
git commit -m "fix(ci): corrigir regex overly-escaped em extractChangelogSection -- notes do latest.json agora populadas"
```

---

## Task 3: UpdateModal — link "Ver release notes completas"

**Ficheiros:**

- Modify: `src/components/UpdateModal.tsx`

- [ ] **Step 1: Adicionar import de `openUrl` e `ExternalLink`**

No topo do ficheiro, junto aos imports existentes:

```tsx
// já existente:
import { Download, RefreshCw, X } from 'lucide-react';
// adicionar ExternalLink:
import { Download, ExternalLink, RefreshCw, X } from 'lucide-react';

// adicionar após os imports de tauri:
import { openUrl } from '@tauri-apps/plugin-opener';
```

- [ ] **Step 2: Adicionar constante RELEASES_URL antes do componente**

Após os imports, antes de `interface Props`:

```tsx
const RELEASES_URL = 'https://github.com/ideiasestrondosas-ctrl/nexora-desktop/releases/latest';
```

- [ ] **Step 3: Adicionar o link ao bloco de notas de release**

Localizar o bloco `{update.body && (` (linhas 110-119). Após o `</div>` interior (que mostra `{update.body}`), adicionar o botão antes do `</div>` exterior:

```tsx
{
  update.body && (
    <div className="mb-5">
      <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
        {t('update.whatsNew')}
      </p>
      <div className="text-sm text-text-secondary bg-bg-secondary border border-border rounded-lg p-3 max-h-40 overflow-y-auto whitespace-pre-wrap leading-relaxed">
        {update.body}
      </div>
      <button
        onClick={() => openUrl(RELEASES_URL).catch(console.error)}
        className="mt-2 flex items-center gap-1 text-xs text-brand hover:underline"
      >
        <ExternalLink size={11} /> {t('update.viewFullRelease')}
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Adicionar chave i18n `update.viewFullRelease`**

Em `src/i18n/locales/pt/common.json`, dentro de `"update": { ... }`, adicionar após `"devModeRestart"`:

```json
"viewFullRelease": "Ver release notes completas"
```

Em `src/i18n/locales/en/common.json`, dentro de `"update": { ... }`:

```json
"viewFullRelease": "View full release notes"
```

- [ ] **Step 5: Commit**

```bash
git add src/components/UpdateModal.tsx src/i18n/locales/pt/common.json src/i18n/locales/en/common.json
git commit -m "feat(update-modal): adicionar link 'Ver release notes completas' ao popup de actualizacao"
```

---

## Task 4: HelpModal — contraste claro/escuro

**Ficheiros:**

- Modify: `src/components/HelpModal.tsx`

- [ ] **Step 1: Corrigir o contentor principal do modal**

Localizar a linha (≈366) com `glass-surface rounded-xl border border-border/50`:

```tsx
// ANTES:
<div className="glass-surface rounded-xl border border-border/50 shadow-2xl w-full max-w-5xl h-[85vh] min-h-[600px] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

// DEPOIS:
<div className="glass-surface rounded-xl border border-border shadow-2xl w-full max-w-5xl h-[85vh] min-h-[600px] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
```

- [ ] **Step 2: Corrigir o separador do header**

Localizar a linha (≈368) com `border-b border-border/50 bg-gradient-to-r`:

```tsx
// ANTES:
<div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-gradient-to-r from-brand/5 to-transparent shrink-0">

// DEPOIS:
<div className="flex items-center justify-between px-6 py-4 border-b border-border bg-gradient-to-r from-brand/5 to-transparent shrink-0">
```

- [ ] **Step 3: Corrigir o sidebar — background e separator**

Localizar a linha (≈407) com `w-48 shrink-0 border-r border-border/50 bg-bg-secondary/50`:

```tsx
// ANTES:
<div className="w-48 shrink-0 border-r border-border/50 bg-bg-secondary/50 flex flex-col overflow-y-auto h-full">

// DEPOIS:
<div className="w-48 shrink-0 border-r border-border bg-bg-secondary flex flex-col overflow-y-auto h-full">
```

- [ ] **Step 4: Corrigir o active state do sidebar**

Localizar dentro do `cn(...)` dos botões do sidebar (≈412-417) a string `'bg-brand/10 text-brand border-l-2 border-brand'`:

```tsx
// ANTES:
activeTab === tab.id
  ? 'bg-brand/10 text-brand border-l-2 border-brand'
  : 'text-text-muted hover:bg-bg-hover hover:text-text-secondary border-l-2 border-transparent',

// DEPOIS:
activeTab === tab.id
  ? 'bg-brand/15 text-brand border-l-2 border-brand'
  : 'text-text-muted hover:bg-bg-hover hover:text-text-secondary border-l-2 border-transparent',
```

- [ ] **Step 5: Corrigir os cards de conteúdo (ScreenCard)**

Localizar a função `ScreenCard` (≈129-191), a linha com `bg-bg-secondary/80 backdrop-blur-sm rounded-xl border border-border/50`:

```tsx
// ANTES:
<div className="bg-bg-secondary/80 backdrop-blur-sm rounded-xl border border-border/50 overflow-hidden">

// DEPOIS:
<div className="bg-bg-secondary rounded-xl border border-border overflow-hidden">
```

- [ ] **Step 6: Commit**

```bash
git add src/components/HelpModal.tsx
git commit -m "fix(help-modal): melhorar contraste bordas e sidebar em modo claro e escuro"
```

---

## Task 5: LibraryPage — overlay hover + badges + info contrast

**Ficheiros:**

- Modify: `src/pages/LibraryPage.tsx`

- [ ] **Step 1: Corrigir o overlay de hover do thumbnail**

Localizar a linha (≈561) com `bg-bg-primary/80`:

```tsx
// ANTES:
<div className="absolute inset-0 bg-bg-primary/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">

// DEPOIS:
<div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
```

- [ ] **Step 2: Corrigir o badge de status para estados de fallback (grid mode)**

Localizar o bloco do badge de status (≈534-542). A linha com `'bg-gray-700 text-text-secondary'`:

```tsx
// ANTES:
: 'bg-gray-700 text-text-secondary'

// DEPOIS:
: 'bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-gray-300'
```

O bloco completo após a correcção:

```tsx
<div
  className={`absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${
    asset.status === 'done'
      ? 'bg-green-500 text-white'
      : asset.status === 'processing'
        ? 'bg-brand text-white animate-pulse'
        : asset.status === 'error'
          ? 'bg-red-500 text-white'
          : 'bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-gray-300'
  }`}
>
```

- [ ] **Step 3: Corrigir a info abaixo do card**

Localizar a linha (≈608) com `text-[11px] font-bold text-text-muted uppercase tracking-tighter`:

```tsx
// ANTES:
<div className="flex items-center justify-between text-[11px] font-bold text-text-muted uppercase tracking-tighter">

// DEPOIS:
<div className="flex items-center justify-between text-[11px] font-bold text-text-secondary uppercase tracking-tighter">
```

- [ ] **Step 4: Corrigir o badge de status na vista de lista**

Localizar o bloco da lista (≈677-688). A classe da span de status:

```tsx
// ANTES:
<span
  className={`px-6 text-[10px] font-black uppercase tracking-widest ${
    asset.status === 'done'
      ? 'text-green-500'
      : asset.status === 'processing'
        ? 'text-brand'
        : asset.status === 'error'
          ? 'text-red-500'
          : 'text-text-muted'
  }`}
>

// DEPOIS:
<span
  className={`px-6 text-[10px] font-black uppercase tracking-widest ${
    asset.status === 'done'
      ? 'text-green-500'
      : asset.status === 'processing'
        ? 'text-brand'
        : asset.status === 'error'
          ? 'text-red-500'
          : 'text-slate-500 dark:text-text-muted'
  }`}
>
```

- [ ] **Step 5: Commit**

```bash
git add src/pages/LibraryPage.tsx
git commit -m "fix(library): hover overlay escuro em modo claro + badges de status visiveis"
```

---

## Task 6: SettingsPage — badge "já actualizado" inline

**Ficheiros:**

- Modify: `src/pages/SettingsPage.tsx`

- [ ] **Step 1: Adicionar import de `CheckCircle`**

Localizar a linha dos imports lucide-react (≈13-37). Adicionar `CheckCircle` à lista:

```tsx
import {
  // ... existentes ...
  CheckCircle,
  // ... resto ...
} from 'lucide-react';
```

- [ ] **Step 2: Adicionar estado `checkResult`**

Junto dos outros estados no topo do componente `SettingsPage` (≈249-264), adicionar:

```tsx
const [checkResult, setCheckResult] = useState<'up_to_date' | null>(null);
```

- [ ] **Step 3: Actualizar a função `handleCheckUpdates`**

Localizar o bloco `else` de `handleCheckUpdates` (≈497-499):

```tsx
// ANTES:
} else {
  toast(t('settings.advanced.latestVersion'), { icon: '✅' });
}

// DEPOIS:
} else {
  toast.success(t('settings.about.latestVersion'), { duration: 5000 });
  setCheckResult('up_to_date');
  setTimeout(() => setCheckResult(null), 6000);
}
```

- [ ] **Step 4: Adicionar o badge inline junto ao botão "Verificar Actualizações"**

Localizar o bloco de botões da tab About (≈1802-1817). Adicionar o badge após o botão de verificação:

```tsx
<div className="flex flex-wrap items-center gap-3 mt-6">
  <button
    onClick={handleCheckUpdates}
    disabled={checkingUpdate}
    className="px-4 py-2 bg-brand hover:bg-blue-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
  >
    <RefreshCw size={14} className={checkingUpdate ? 'animate-spin' : ''} />{' '}
    {t('settings.about.checkUpdates')}
  </button>
  {checkResult === 'up_to_date' && (
    <span className="text-xs text-green-500 flex items-center gap-1 animate-in fade-in duration-300">
      <CheckCircle size={12} /> {t('settings.about.latestVersion')}
    </span>
  )}
  <button
    onClick={handleOpenDataDir}
    className="px-4 py-2 bg-surface hover:bg-surface-hover text-text-primary text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
  >
    <ExternalLink size={14} /> {t('settings.about.openData')}
  </button>
</div>
```

- [ ] **Step 5: Adicionar a chave i18n `settings.about.latestVersion`**

Em `src/i18n/locales/pt/common.json`, dentro de `"settings": { "about": { ... } }`:

```json
"latestVersion": "Já tens a versão mais recente"
```

Em `src/i18n/locales/en/common.json`:

```json
"latestVersion": "You have the latest version"
```

> **Nota:** Verificar se `settings.advanced.latestVersion` já existe (existe — linha 704 do pt/common.json). Usar `settings.about.latestVersion` para manter a chave no contexto correcto da tab Sobre.

- [ ] **Step 6: Commit**

```bash
git add src/pages/SettingsPage.tsx src/i18n/locales/pt/common.json src/i18n/locales/en/common.json
git commit -m "feat(settings): badge 'ja actualizado' inline com auto-dismiss 6s"
```

---

## Task 7: Rust — commands de criação de atalhos

**Ficheiros:**

- Modify: `src-tauri/src/commands/system.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Adicionar os 3 commands em `system.rs`**

Adicionar ao fim de `src-tauri/src/commands/system.rs`, após `get_changelog`:

```rust
/// Cria um atalho no Desktop do Windows (.lnk via PowerShell WScript.Shell)
#[tauri::command]
pub fn create_windows_shortcut() -> Result<(), String> {
    let exe = std::env::current_exe().map_err(|e| e.to_string())?;
    let exe_str = exe.to_string_lossy();
    // Usa o Desktop do utilizador corrente (%USERPROFILE%\Desktop)
    let script = format!(
        r#"$shell = New-Object -ComObject WScript.Shell; $s = $shell.CreateShortcut([System.IO.Path]::Combine([System.Environment]::GetFolderPath('Desktop'), 'Nexora Desktop.lnk')); $s.TargetPath = '{}'; $s.Save()"#,
        exe_str.replace('\'', "''")
    );
    let status = std::process::Command::new("powershell")
        .args(["-NoProfile", "-NonInteractive", "-Command", &script])
        .status()
        .map_err(|e| e.to_string())?;
    if status.success() {
        Ok(())
    } else {
        Err("PowerShell CreateShortcut falhou".to_string())
    }
}

/// Cria um ficheiro .desktop no Desktop do Linux
#[tauri::command]
pub fn create_desktop_shortcut() -> Result<(), String> {
    let home = std::env::var("HOME").map_err(|e| e.to_string())?;
    let exe = std::env::current_exe().map_err(|e| e.to_string())?;
    let content = format!(
        "[Desktop Entry]\nName=Nexora Desktop\nExec={}\nIcon=nexora-desktop\nType=Application\nCategories=AudioVideo;Video;\nTerminal=false\n",
        exe.display()
    );
    let path = format!("{}/Desktop/Nexora Desktop.desktop", home);
    std::fs::write(&path, &content).map_err(|e| e.to_string())?;
    // chmod +x
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        std::fs::set_permissions(&path, std::fs::Permissions::from_mode(0o755))
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Cria um Alias macOS no Desktop via Finder AppleScript
#[tauri::command]
pub fn create_macos_alias() -> Result<(), String> {
    let script =
        r#"tell application "Finder" to make alias file to POSIX file "/Applications/Nexora Desktop.app" at desktop"#;
    let status = std::process::Command::new("osascript")
        .args(["-e", script])
        .status()
        .map_err(|e| e.to_string())?;
    if status.success() {
        Ok(())
    } else {
        Err("osascript falhou — verifica que a app está em /Applications".to_string())
    }
}
```

- [ ] **Step 2: Registar os commands em `lib.rs`**

Localizar o `invoke_handler` em `src-tauri/src/lib.rs` (procurar `commands::system::get_changelog`). Adicionar os 3 novos commands na mesma lista:

```rust
// Adicionar junto a get_changelog:
commands::system::create_windows_shortcut,
commands::system::create_desktop_shortcut,
commands::system::create_macos_alias,
```

- [ ] **Step 3: Verificar que compila**

```bash
cd src-tauri && cargo check 2>&1 | tail -20
```

Esperado: `warning: ...` (avisos de dead_code para os novos commands são normais), sem erros.

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/commands/system.rs src-tauri/src/lib.rs
git commit -m "feat(rust): commands create_windows_shortcut, create_desktop_shortcut, create_macos_alias"
```

---

## Task 8: SettingsPage — botão "Criar atalho no desktop"

**Ficheiros:**

- Modify: `src/pages/SettingsPage.tsx`
- Modify: `src/i18n/locales/pt/common.json`
- Modify: `src/i18n/locales/en/common.json`

- [ ] **Step 1: Adicionar import de `os` do Tauri**

No topo de `SettingsPage.tsx`, após os imports existentes do Tauri:

```tsx
import { platform } from '@tauri-apps/plugin-os';
```

> **Nota:** `@tauri-apps/plugin-os` já está instalado no projecto (verifica em `package.json`). Se não estiver: `npm install @tauri-apps/plugin-os`.

- [ ] **Step 2: Adicionar estado de plataforma**

Junto dos outros estados (≈249):

```tsx
const [currentPlatform, setCurrentPlatform] = useState<string>('');

useEffect(() => {
  platform()
    .then(setCurrentPlatform)
    .catch(() => {});
}, []);
```

- [ ] **Step 3: Adicionar handler para criar atalho**

Junto dos outros handlers em `SettingsPage.tsx`:

```tsx
const handleCreateShortcut = async () => {
  try {
    if (currentPlatform === 'windows') {
      await invoke('create_windows_shortcut');
    } else if (currentPlatform === 'linux') {
      await invoke('create_desktop_shortcut');
    } else if (currentPlatform === 'macos') {
      await invoke('create_macos_alias');
    }
    toast.success(t('settings.about.shortcutCreated'));
  } catch (err: unknown) {
    toast.error(err instanceof Error ? err.message : String(err));
  }
};
```

- [ ] **Step 4: Adicionar o botão na tab About**

Localizar o bloco de botões da tab About (logo após o botão "Abrir Dados"). Adicionar o botão de atalho:

```tsx
{
  (currentPlatform === 'windows' || currentPlatform === 'linux' || currentPlatform === 'macos') && (
    <button
      onClick={handleCreateShortcut}
      className="px-4 py-2 bg-surface hover:bg-surface-hover text-text-primary text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
    >
      <ExternalLink size={14} />{' '}
      {currentPlatform === 'macos'
        ? t('settings.about.createAlias')
        : t('settings.about.createShortcut')}
    </button>
  );
}
```

- [ ] **Step 5: Adicionar chaves i18n**

Em `src/i18n/locales/pt/common.json`, dentro de `"settings": { "about": { ... } }`:

```json
"createShortcut": "Criar atalho no desktop",
"createAlias": "Criar Alias no Desktop",
"shortcutCreated": "Atalho criado com sucesso"
```

Em `src/i18n/locales/en/common.json`:

```json
"createShortcut": "Create desktop shortcut",
"createAlias": "Create Desktop Alias",
"shortcutCreated": "Shortcut created successfully"
```

- [ ] **Step 6: Verificar se `@tauri-apps/plugin-os` está disponível**

```bash
node -e "require('./node_modules/@tauri-apps/plugin-os/dist/index.cjs'); console.log('ok')"
```

Se falhar: `npm install @tauri-apps/plugin-os` e adicionar o plugin ao `lib.rs`:

```rust
.plugin(tauri_plugin_os::init())
```

e ao `Cargo.toml`:

```toml
tauri-plugin-os = "2"
```

- [ ] **Step 7: Commit**

```bash
git add src/pages/SettingsPage.tsx src/i18n/locales/pt/common.json src/i18n/locales/en/common.json
git commit -m "feat(settings): botao 'Criar atalho no desktop' adaptativo por plataforma (Windows/Linux/macOS)"
```

---

## Task 9: Verificação visual e commit final

- [ ] **Step 1: Executar o build de desenvolvimento**

```bash
npm run dev
```

- [ ] **Step 2: Verificar checklist visual**

Abrir a app e verificar cada item:

| #   | Verificação                                                     | Resultado esperado                                                                |
| --- | --------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| 1   | HelpModal em modo **claro**                                     | Bordas visíveis, sidebar com fundo cinzento, item activo azul                     |
| 2   | HelpModal em modo **escuro**                                    | Sem regressão — igual ao anterior                                                 |
| 3   | Biblioteca em modo **claro** → hover no thumbnail               | Overlay escuro com botões visíveis                                                |
| 4   | Biblioteca em modo **claro** → badge de status                  | "PENDING" / "INGESTING" legível (fundo claro, texto cinzento)                     |
| 5   | Biblioteca em modo **claro** → info abaixo do card              | Texto size/duration/codec mais contrastado                                        |
| 6   | Definições > Sobre → "Verificar Actualizações" (já actualizado) | Toast verde + badge inline "✓ Já tens a versão mais recente" que desaparece em 6s |
| 7   | Definições > Sobre → botão "Criar atalho no desktop"            | Visível na plataforma certa; toast de sucesso ao clicar                           |
| 8   | Tab Sobre → "Notas de Lançamento"                               | Sem carácteres garbled (Ã, â€, etc.)                                              |

- [ ] **Step 3: Verificar UpdateModal** (requer build com novo latest.json)

No próximo release, o popup de actualização mostrará notas reais do CHANGELOG + link "Ver release notes completas". Para testar localmente sem um release real, modificar temporariamente `update.body` em `UpdateModal.tsx` com texto de exemplo e verificar que o link aparece.

- [ ] **Step 4: Actualizar PROGRESS-DESKTOP.md e SYNC-STATE.md**

Marcar v0.30.9 como próxima versão com os 7 fixes. Actualizar "O que está concluído".

- [ ] **Step 5: Commit final da sessão**

```bash
git add PROGRESS-DESKTOP.md SYNC-STATE.md
git commit -m "docs(session): fechar sessao 41 -- 7 fixes UI/UX v0.30.9"
```

---

## Self-Review

**Spec coverage:**

- ✅ Issue 1 (HelpModal contraste): Task 4
- ✅ Issue 2 (Shortcuts Windows/Linux/macOS): Tasks 7 + 8
- ✅ Issue 3 (Feedback "já actualizado"): Task 6
- ✅ Issue 4 (Overlay hover modo claro): Task 5 step 1
- ✅ Issue 5 (UpdateModal "O que há de novo" Opção C): Tasks 2 + 3
- ✅ Issue 6 (Badge status modo claro): Task 5 steps 2-4
- ✅ Issue 7 (CHANGELOG mojibake): Task 1
- ✅ i18n keys para todas as novas features: Tasks 3, 6, 8

**Placeholder scan:** Sem TBD, sem "implement later", sem passos sem código.

**Type consistency:** `invoke('create_windows_shortcut')` em TS ↔ `pub fn create_windows_shortcut()` em Rust — consistente. `checkResult: 'up_to_date' | null` declarado antes de usado.

**Nota sobre `plugin-os`:** O Step 6 da Task 8 tem verificação antes do commit. Se o plugin não estiver instalado, os passos extra estão descritos.
