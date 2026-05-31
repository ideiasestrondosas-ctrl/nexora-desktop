---
name: ui-ux-fixes-2026-05-31
description: 7 melhorias UI/UX identificadas em testes Windows Sandbox — temas, badges, modal de actualização, shortcuts, encoding
metadata:
  type: spec
  version: v0.30.9-beta.1
  session: 41
---

# Spec: 7 Melhorias UI/UX — Nexora Desktop v0.30.9

**Data:** 2026-05-31  
**Branch:** dev  
**Sessão:** 41

---

## Contexto

Testes em Windows Sandbox com v0.30.8-beta.1 revelaram 7 problemas visuais e funcionais. Este spec descreve as correcções a implementar.

---

## 1. HelpModal — Contraste claro/escuro

### Problema

O `HelpModal` usa `border-border/50` e `bg-bg-secondary/50` em toda a estrutura. Em modo claro (`--color-border: #e2e8f0`, `--color-bg-secondary: #f8fafc`) as 50% de transparência tornam bordas e separadores quase invisíveis. Em modo escuro funciona mas o layout fica flat.

### Ficheiros afectados

- `src/components/HelpModal.tsx`

### Solução

**Bordas estruturais do modal:** remover o sufixo `/50` das bordas que definem a estrutura visual (header separator, sidebar separator, cards de conteúdo). A 50% de opacidade fica reservada para elementos decorativos secundários.

**Sidebar background:** mudar de `bg-bg-secondary/50` para `bg-bg-secondary` (sólido). Em modo claro fica ligeiramente cinzento (f8fafc), em modo escuro mantém o efeito desejado.

**Active state do sidebar:** mudar de `bg-brand/10` para `bg-brand/15` para aumentar a distinção do item seleccionado em modo claro.

**Sidebar inactive hover:** manter `hover:bg-bg-hover` — em modo claro `bg-hover = rgba(0,0,0,0.04)` é suficiente.

**Resumo das mudanças em HelpModal.tsx:**

```
// Linha que define o contentor principal do modal
antes:  glass-surface rounded-xl border border-border/50 shadow-2xl ...
depois: glass-surface rounded-xl border border-border shadow-2xl ...

// Linha do header separator
antes:  border-b border-border/50
depois: border-b border-border

// Sidebar container
antes:  w-48 shrink-0 border-r border-border/50 bg-bg-secondary/50
depois: w-48 shrink-0 border-r border-border bg-bg-secondary

// Active state do sidebar
antes:  bg-brand/10 text-brand border-l-2 border-brand
depois: bg-brand/15 text-brand border-l-2 border-brand

// Cards de conteúdo (ScreenCard)
antes:  bg-bg-secondary/80 backdrop-blur-sm rounded-xl border border-border/50
depois: bg-bg-secondary rounded-xl border border-border
```

---

## 2. Shortcuts na Instalação

### Plataformas

| Plataforma | Mecanismo                                      | Implementação                             |
| ---------- | ---------------------------------------------- | ----------------------------------------- |
| Windows    | NSIS installer checkbox                        | `tauri.conf.json` → `bundle.windows.nsis` |
| Linux      | Botão em Definições → cria `.desktop`          | Tauri command `create_desktop_shortcut`   |
| macOS      | Botão em Definições → cria Alias via osascript | Tauri command `create_macos_alias`        |

### Windows — tauri.conf.json

Adicionar na secção `bundle.windows`:

```json
"nsis": {
  "displayLanguageSelector": false,
  "shortcuts": {
    "enable": true
  }
}
```

Nota: Em Tauri 2, o NSIS cria por defeito shortcut no Start Menu. A opção `shortcuts.enable` activa a checkbox para o utilizador escolher Desktop também. Verificar o esquema exacto da versão de Tauri em uso (2.x).

### Linux — Rust command

```rust
#[tauri::command]
pub fn create_desktop_shortcut() -> Result<(), String> {
    // Escreve ~/.local/share/applications/nexora-desktop.desktop
    // E cria link simbólico em ~/Desktop/Nexora Desktop.desktop
    let home = std::env::var("HOME").map_err(|e| e.to_string())?;
    let desktop_content = format!(
        "[Desktop Entry]\nName=Nexora Desktop\nExec={exe}\nIcon=nexora-desktop\nType=Application\nCategories=AudioVideo;Video;\n",
        exe = std::env::current_exe().map_err(|e| e.to_string())?.display()
    );
    let desktop_path = format!("{}/Desktop/Nexora Desktop.desktop", home);
    std::fs::write(&desktop_path, &desktop_content).map_err(|e| e.to_string())?;
    // chmod +x
    use std::os::unix::fs::PermissionsExt;
    std::fs::set_permissions(&desktop_path, std::fs::Permissions::from_mode(0o755))
        .map_err(|e| e.to_string())?;
    Ok(())
}
```

### macOS — Rust command

```rust
#[tauri::command]
pub fn create_macos_alias() -> Result<(), String> {
    let script = r#"tell application "Finder" to make alias file to POSIX file "/Applications/Nexora Desktop.app" at desktop"#;
    let status = std::process::Command::new("osascript")
        .arg("-e")
        .arg(script)
        .status()
        .map_err(|e| e.to_string())?;
    if status.success() { Ok(()) } else { Err("osascript falhou".to_string()) }
}
```

### Frontend — Definições > Sobre

Adicionar botão "Criar atalho no desktop" na secção About do `SettingsPage.tsx`, junto aos botões existentes. Exibe feedback de sucesso/erro via toast.

```tsx
// Detectar plataforma e mostrar botão adequado
// Windows: sempre visível
// Linux: sempre visível
// macOS: label "Criar Alias no Desktop"
```

---

## 3. Feedback "Já Actualizado"

### Ficheiro

`src/pages/SettingsPage.tsx` — função `handleCheckUpdates`

### Solução

**Estado inline:** adicionar `const [checkResult, setCheckResult] = useState<'up_to_date' | null>(null)` com auto-reset ao fim de 6s via `setTimeout`.

```tsx
// No bloco `else` de handleCheckUpdates (quando update === null):
toast.success(t('settings.advanced.latestVersion'), { duration: 5000 });
setCheckResult('up_to_date');
setTimeout(() => setCheckResult(null), 6000);
```

**Badge inline junto ao botão:**

```tsx
{
  checkResult === 'up_to_date' && (
    <span className="text-xs text-green-500 flex items-center gap-1 animate-in fade-in">
      <CheckCircle size={12} /> {t('settings.advanced.latestVersion')}
    </span>
  );
}
```

O badge aparece junto ao botão "Verificar Versão" e desaparece após 6s.

---

## 4. Hover Overlay na Biblioteca (Modo Claro)

### Ficheiro

`src/pages/LibraryPage.tsx`

### Problema

Overlay de hover usa `bg-bg-primary/80`. Em modo claro `bg-bg-primary = #ffffff` → overlay branco + botões brancos = invisível.

### Solução

**Overlay de thumbnail:** mudar de `bg-bg-primary/80` para `bg-black/50` — escuro independente do tema, consistente com o VMAF badge (`bg-black/60`).

```tsx
// linha ~561
antes: 'absolute inset-0 bg-bg-primary/80 opacity-0 group-hover:opacity-100 ...';
depois: 'absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 ...';
```

**Info abaixo do card:** mudar `text-text-muted` para `text-text-secondary` no bloco de size/duration/codec para melhor contraste em modo claro.

```tsx
// linha ~608
antes: 'flex items-center justify-between text-[11px] font-bold text-text-muted uppercase tracking-tighter';
depois: 'flex items-center justify-between text-[11px] font-bold text-text-secondary uppercase tracking-tighter';
```

---

## 5. UpdateModal "O que há de novo" — Opção C

### Parte A — sync.ps1: notas reais no latest.json

Adicionar ao script uma função `Get-VersionChangelog` que extrai as linhas do CHANGELOG.md entre `## [VERSION]` e o próximo `##`:

```powershell
function Get-VersionChangelog {
    param([string]$Version, [string]$ChangelogPath)
    $lines = Get-Content $ChangelogPath -Encoding UTF8
    $inBlock = $false
    $notes = @()
    foreach ($line in $lines) {
        if ($line -match "^## \[$([regex]::Escape($Version))\]") {
            $inBlock = $true
            continue
        }
        if ($inBlock -and $line -match "^## ") { break }
        if ($inBlock -and $line.Trim() -ne '') { $notes += $line }
    }
    # Máximo 500 caracteres para não rebentar o modal
    $text = ($notes -join "`n").Trim()
    if ($text.Length -gt 500) { $text = $text.Substring(0, 497) + "..." }
    return $text
}
```

O campo `notes` do `latest.json` passa a conter o conteúdo real do CHANGELOG em vez do texto estático.

### Parte B — UpdateModal.tsx: link para releases

Após o bloco de notas, adicionar:

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

Adicionar `RELEASES_URL` e import de `openUrl` e `ExternalLink` ao `UpdateModal.tsx`.

Adicionar chave de tradução `update.viewFullRelease` nos ficheiros i18n.

---

## 6. Badge de Status na Biblioteca (Modo Claro)

### Ficheiro

`src/pages/LibraryPage.tsx`

### Problema

Classe de fallback para estados `pending`/`ingesting`/`qc_passed`: `bg-gray-700 text-text-secondary`.

Em modo claro: `bg-gray-700` (cinza escuro #374151) + `text-text-secondary` (#475569 dark) → texto escuro em fundo escuro. Ilegível sobre thumbnails claros.

### Solução

```tsx
// linha ~534-542: badge de status (grid mode)
antes:  : 'bg-gray-700 text-text-secondary'
depois: : 'bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-gray-300'
```

Aplicar a mesma correcção na vista de lista (`linha ~677-687`):

```tsx
// lista mode — texto de status
antes:  : 'text-text-muted'   (para estados non-done/processing/error)
depois: : 'text-slate-500 dark:text-text-muted'
```

Os estados `done` (bg-green-500 text-white), `processing` (bg-brand text-white), `error` (bg-red-500 text-white) já têm contraste correcto em ambos os modos — não alterar.

---

## 7. Carácteres Garbled no CHANGELOG.md

### Root Cause

O CHANGELOG.md contém UTF-8 mojibake — bytes UTF-8 de caracteres especiais (em dash `—`, aspas tipográficas) foram interpretados como Latin-1 e re-gravados. O `get_changelog()` usa `include_str!` (compile-time), pelo que o binário contém exactamente o que está no ficheiro.

Exemplo confirmado (linha 25): `Ã¢â‚¬â€` = mojibake de `—` (U+2014, E2 80 94 em UTF-8).

### Solução

**1. Limpar CHANGELOG.md:** substituir todas as ocorrências de mojibake por equivalentes ASCII ou UTF-8 correctos. Usar PowerShell:

```powershell
# Detectar e substituir os padrões mais comuns de mojibake PT
$content = [System.IO.File]::ReadAllText("CHANGELOG.md", [System.Text.Encoding]::UTF8)
$content = $content -replace 'Ã¢â‚¬â€œ', '"'   # " (left double quote)
$content = $content -replace 'Ã¢â‚¬â€', '-'    # — (em dash) → ASCII hyphen
$content = $content -replace 'Ã§Ã£o', 'ção'    # ção
$content = $content -replace 'Ã¢â‚¬â„¢', "'"   # ' (right single quote)
# ... outros padrões identificados
[System.IO.File]::WriteAllText("CHANGELOG.md", $content, [System.Text.Encoding]::UTF8)
```

Na prática, o mais simples é editar manualmente as linhas com mojibake — são poucas (versões 0.30.6, etc.).

**2. Corrigir sync.ps1:** garantir que qualquer escrita no CHANGELOG.md usa UTF-8 explicitamente:

```powershell
# Em vez de: Add-Content ou Out-File por defeito
# Usar sempre:
[System.IO.File]::WriteAllText($changelogPath, $newContent, [System.Text.Encoding]::UTF8)
# OU
$newContent | Set-Content -Path $changelogPath -Encoding UTF8
```

**3. Verificar no About tab:** após correcção do CHANGELOG.md e rebuild, o `<pre>` na tab Sobre deve mostrar texto limpo.

---

## Ficheiros a Alterar

| Ficheiro                           | Alterações                                                      |
| ---------------------------------- | --------------------------------------------------------------- |
| `src/components/HelpModal.tsx`     | Remoção de `/50` em bordas, sidebar background sólido           |
| `src/pages/LibraryPage.tsx`        | Overlay de hover, badge de status, info text contrast           |
| `src/pages/SettingsPage.tsx`       | Badge "já actualizado" + botão shortcut                         |
| `src/components/UpdateModal.tsx`   | Link "Ver release notes" + import openUrl                       |
| `src-tauri/src/commands/system.rs` | Novos commands: `create_desktop_shortcut`, `create_macos_alias` |
| `src-tauri/src/lib.rs`             | Registar novos commands                                         |
| `src/i18n/pt.json` (e outros)      | Chave `update.viewFullRelease`, `settings.about.createShortcut` |
| `tauri.conf.json`                  | `bundle.windows.nsis.shortcuts`                                 |
| `CHANGELOG.md`                     | Limpeza de mojibake existente                                   |
| `scripts/sync.ps1`                 | `Get-VersionChangelog`, encoding UTF-8 explícito                |

---

## Critérios de Verificação

1. HelpModal em modo claro: bordas e separadores visíveis, sidebar items distinguíveis
2. HelpModal em modo escuro: sem regressão visual
3. Instalar no Windows Sandbox com a nova opção de shortcut
4. Botão "Criar atalho" em Definições > Sobre funciona em Linux e macOS
5. Verificar versão → badge "já actualizado" aparece e desaparece em 6s
6. Biblioteca em modo claro: hover overlay escuro, botões visíveis
7. Biblioteca em modo claro: badges de status legíveis
8. UpdateModal: campo "O que há de novo" com conteúdo real do CHANGELOG
9. UpdateModal: link "Ver release notes completas" abre browser
10. Tab Sobre: CHANGELOG sem carácteres garbled
