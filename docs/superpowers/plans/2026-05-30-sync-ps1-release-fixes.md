# sync.ps1 — 3 Bugs Recorrentes de Release — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir 3 bugs recorrentes no `scripts/sync.ps1` que causam falhas de CI manuais após cada release bump: versão semver no tauri.conf.json, prettier falha no CI, e loop infinito do monitor de Actions.

**Architecture:** Todas as alterações estão num único ficheiro PowerShell (`scripts/sync.ps1`). Fix 1 e Fix 2 estão na secção de release bump (≈linha 1959 e ≈linha 2082). Fix 3 está na função `Watch-GitHubActions` (≈linhas 85 e 173). Sem novas dependências.

**Tech Stack:** PowerShell 5+ · `scripts/sync.ps1` · GitHub Actions REST API (já em uso)

---

## File Map

| Ficheiro           | Alteração                                                                                                                                   |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/sync.ps1` | Fix 1: linha ~1959 (1 char change) · Fix 2: bloco ~10 linhas antes de `git add` · Fix 3: 2 vars + bloco ~18 linhas em `Watch-GitHubActions` |

---

## Task 1: Fix 1 + Fix 2 — Versão numérica e Prettier no release bump

**Files:**

- Modify: `scripts/sync.ps1` (linha ~1959 e bloco ~2082)

- [ ] **Step 1: Aplicar Fix 1 — versão numérica em tauri.conf.json**

Localizar (linha ~1959, dentro do bloco `# src-tauri/tauri.conf.json`):

```powershell
                $tauriConf.version = $newVersion
```

Substituir por:

```powershell
                $tauriConf.version = ($newVersion -split '-')[0]
```

O resto do bloco (WiX version, `ConvertTo-Json`, `WriteAllText`) fica inalterado.

- [ ] **Step 2: Verificar Fix 1**

Confirmar que a linha foi alterada:

```powershell
Select-String -Path scripts/sync.ps1 -Pattern "tauriConf\.version\s*="
```

Expected output deve conter: `$tauriConf.version = ($newVersion -split '-')[0]`

- [ ] **Step 3: Aplicar Fix 2 — Prettier antes do git add**

Localizar o bloco de commit (≈linha 2075-2083):

```powershell
        $filesToAdd = @("package.json", "src-tauri\Cargo.toml", "src-tauri\tauri.conf.json", "CHANGELOG.md", "PROGRESS-DESKTOP.md")
        if ($Release -and $releaseNotesPath) {
            $filesToAdd += "release-notes-v$newVersion.md"
            $filesToAdd += "SYNC-STATE.md"
            $filesToAdd += "src\lib\version.ts"
        }
        git add $filesToAdd
        git commit -m "chore(release): v$newVersion" --no-verify
```

Substituir por (inserir o bloco Prettier entre a definição de `$filesToAdd` e o `git add`):

```powershell
        $filesToAdd = @("package.json", "src-tauri\Cargo.toml", "src-tauri\tauri.conf.json", "CHANGELOG.md", "PROGRESS-DESKTOP.md")
        if ($Release -and $releaseNotesPath) {
            $filesToAdd += "release-notes-v$newVersion.md"
            $filesToAdd += "SYNC-STATE.md"
            $filesToAdd += "src\lib\version.ts"
        }
        # Formatar ficheiros antes do commit — evita prettier fail no CI
        $existingFiles = $filesToAdd | Where-Object { Test-Path $_ }
        if ($existingFiles.Count -gt 0) {
            Write-Info "A formatar $($existingFiles.Count) ficheiro(s) com Prettier..."
            $npmArgs = @("run", "format", "--") + $existingFiles
            $proc = Start-Process "npm" -ArgumentList $npmArgs `
                -WorkingDirectory $WORKSPACE -NoNewWindow -PassThru -Wait
            if ($proc.ExitCode -ne 0) {
                Write-Warn "Prettier terminou com exit code $($proc.ExitCode) — continuar de qualquer forma"
            }
        }
        git add $filesToAdd
        git commit -m "chore(release): v$newVersion" --no-verify
```

- [ ] **Step 4: Verificar Fix 2**

```powershell
Select-String -Path scripts/sync.ps1 -Pattern "A formatar"
```

Expected: linha com `Write-Info "A formatar $($existingFiles.Count) ficheiro(s) com Prettier..."`

- [ ] **Step 5: Commit**

```bash
git add scripts/sync.ps1
git commit -m "fix(sync): tauri.conf.json versao numerica + prettier pre-commit"
```

---

## Task 2: Fix 3 — Watch-GitHubActions sai quando CI verde + Build invisível

**Files:**

- Modify: `scripts/sync.ps1` (função `Watch-GitHubActions`, ≈linhas 85 e 173)

- [ ] **Step 1: Adicionar variáveis de rastreio antes do while**

Localizar (≈linha 85, logo após `$minCreatedAt = ...`):

```powershell
    $minCreatedAt = $startTime.AddMinutes(-2)

    Write-Host ""
    Write-Host "  [AGUARDAR] GitHub Actions — v$version  ·  branch: $branch  ·  Ctrl+C para sair" -ForegroundColor Cyan

    while ($true) {
```

Substituir por:

```powershell
    $minCreatedAt        = $startTime.AddMinutes(-2)
    $ciPassedAt          = $null
    $BUILD_STALL_TIMEOUT = 300   # 5 minutos — sair se CI verde e Build não aparece

    Write-Host ""
    Write-Host "  [AGUARDAR] GitHub Actions — v$version  ·  branch: $branch  ·  Ctrl+C para sair" -ForegroundColor Cyan

    while ($true) {
```

- [ ] **Step 2: Verificar Step 1**

```powershell
Select-String -Path scripts/sync.ps1 -Pattern "BUILD_STALL_TIMEOUT"
```

Expected: linha com `$BUILD_STALL_TIMEOUT = 300`

- [ ] **Step 3: Adicionar bloco de detecção de stall após o foreach**

Localizar o bloco de exit (≈linha 171-177):

```powershell
        }

        if ($allDone) {
            Write-Host ""
            Write-Success "Todos os Actions passaram! Release v$version concluida."
            return
        }
```

(O `}` na primeira linha fecha o `foreach ($wfName in $targets)`)

Substituir por:

```powershell
        }

        # Detecção de stall: CI verde mas Build não aparece na janela de tempo
        $ciPassed  = [bool]($runs | Where-Object { $_.name -eq "CI — Verificacao de Qualidade" -and $_.conclusion -eq "success" })
        $buildDone = [bool]($runs | Where-Object { $_.name -eq "Build Nexora Desktop" -and $_.status -eq "completed" -and $_.conclusion -eq "success" })

        if ($ciPassed -and -not $ciPassedAt) { $ciPassedAt = Get-Date }

        if ($ciPassedAt -and -not $buildDone) {
            $stallSec = [math]::Round(((Get-Date) - $ciPassedAt).TotalSeconds)
            if ($stallSec -gt $BUILD_STALL_TIMEOUT) {
                Write-Host ""
                Write-Host ("  ⚠  CI passou mas Build nao detectado ha " + [math]::Round($stallSec / 60) + "min.") -ForegroundColor Yellow
                Write-Host "     O Build pode ter corrido antes da janela de monitorizacao." -ForegroundColor DarkGray
                Write-Host "     Verifica: https://github.com/$REPO_OWNER/$REPO_NAME/actions" -ForegroundColor DarkCyan
                Write-Host ""
                Write-Success "CI passou. A assumir Build OK — release v$version concluida."
                return
            }
        }

        if ($allDone) {
            Write-Host ""
            Write-Success "Todos os Actions passaram! Release v$version concluida."
            return
        }
```

- [ ] **Step 4: Verificar Step 3**

```powershell
Select-String -Path scripts/sync.ps1 -Pattern "BUILD_STALL_TIMEOUT|stallSec|A assumir Build OK"
```

Expected: 3 matches — `$BUILD_STALL_TIMEOUT` (declaração), `$stallSec -gt $BUILD_STALL_TIMEOUT` (condição), `A assumir Build OK` (mensagem de saída).

- [ ] **Step 5: Verificar sintaxe PowerShell**

```powershell
$errors = $null
$null = [System.Management.Automation.Language.Parser]::ParseFile(
    (Resolve-Path "scripts/sync.ps1").Path,
    [ref]$null,
    [ref]$errors
)
if ($errors.Count -gt 0) { $errors | ForEach-Object { Write-Host $_.Message -ForegroundColor Red } }
else { Write-Host "Sem erros de sintaxe." -ForegroundColor Green }
```

Expected: `Sem erros de sintaxe.`

- [ ] **Step 6: Commit**

```bash
git add scripts/sync.ps1
git commit -m "fix(sync): Watch-GitHubActions sai graciosamente quando CI verde + Build invisivel"
```

---

## Verificação manual (próximo release bump)

Após o próximo `sync.ps1` Release:

- [ ] `Select-String -Path src-tauri/tauri.conf.json -Pattern '"version"'` → deve mostrar `"0.30.X"` (sem sufixo)
- [ ] CI no GitHub Actions passa sem `fix(ci): prettier` manual
- [ ] Se Build não aparecer em 5 min com CI ✅ → script sai com `⚠  CI passou mas Build nao detectado...` em vez de loop infinito
