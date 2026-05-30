---
title: 'Fix: sync.ps1 — 3 Bugs Recorrentes de Release'
date: 2026-05-30
version: v0.30.8+
status: approved
---

# Fix: sync.ps1 — 3 Bugs Recorrentes de Release

## Contexto

A cada ciclo de release (`sync.ps1` opção Release), surgem os mesmos 3 bugs:

1. **`tauri.conf.json` com versão semver** — falha silenciosa no `tauri-action` (Signature not found ou nomes de instalador errados).
2. **Prettier falha no CI** — `ConvertTo-Json` e edições PowerShell produzem JSON/Markdown que o prettier reformata; o commit usa `--no-verify`, bypassando lint-staged.
3. **`Watch-GitHubActions` em loop eterno** — o filtro `minCreatedAt` exclui o Build run real quando este foi criado antes do início da monitorização; o script nunca detecta a conclusão e fica preso a mostrar "Build em fila" indefinidamente.

**Evidência:** commits `fix(release): tauri.conf.json versao numerica 0.30.4/5/6/7` e `fix(ci): prettier — formatar ficheiros do release v0.30.4/5/7-beta.1` presentes no histório do repositório — 4 e 3 ocorrências respectivas.

---

## Fix 1 — `tauri.conf.json` versão numérica pura

### Causa raiz

Linha 1959 de `scripts/sync.ps1`:

```powershell
$tauriConf.version = $newVersion   # escreve "0.30.7-beta.1"
```

`$newVersion` contém o semver completo (ex: `0.30.7-beta.1`). O `tauri-action` requer versão puramente numérica (ex: `0.30.7`). O campo WiX já é correctamente calculado com `Get-WixVersion` — o mesmo princípio deve aplicar-se ao campo `version` principal.

### Fix

```powershell
# ANTES (linha 1959):
$tauriConf.version = $newVersion

# DEPOIS:
$tauriConf.version = ($newVersion -split '-')[0]
```

Resultado: `tauri.conf.json.version = "0.30.7"` independentemente do sufixo de pre-release.

---

## Fix 2 — Prettier antes do commit de release

### Causa raiz

O `sync.ps1` usa `--no-verify` no commit de release (linha 2083) para evitar problemas do lint-staged com caminhos PowerShell. Consequência: o Prettier nunca corre sobre os ficheiros modificados pelo PowerShell (`ConvertTo-Json`, edições de Markdown), que ficam com formatação divergente.

### Fix

Adicionar chamada explícita ao Prettier imediatamente antes do `git add`, sobre os ficheiros que vão ser commitados:

```powershell
# --- Formatar ficheiros antes do commit (evita prettier fail no CI) ---
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
# --- fim prettier ---
git add $filesToAdd
git commit -m "chore(release): v$newVersion" --no-verify
```

**Porquê manter `--no-verify`:** o lint-staged tem problemas com caminhos relativos gerados pelo PowerShell em ambiente Windows. Correr Prettier explicitamente é equivalente e mais fiável.

---

## Fix 3 — `Watch-GitHubActions` — sair quando Build invisível + CI verde

### Causa raiz

O filtro `$minCreatedAt = $startTime.AddMinutes(-2)` exclui runs criados mais de 2 minutos antes do início da monitorização. O Build run real é frequentemente criado quando a tag é pushed — que pode ser vários minutos antes de o utilizador responder "S" ao prompt de monitorização. Com o run excluído de `$runs`, o código cai no `if (-not $run)` e mostra "em fila" indefinidamente, mesmo que o Build tenha concluído com sucesso.

### Fix

Introduzir rastreio separado de quando o CI passou (`$ciPassedAt`). Quando CI está ✅ e o Build continua a não aparecer (ou continua em `queued`) há mais de `$BUILD_STALL_TIMEOUT` segundos (300s = 5 min), o script imprime aviso e sai graciosamente:

```powershell
# Antes do `while ($true)` — declarar fora do loop:
$ciPassedAt          = $null
$BUILD_STALL_TIMEOUT = 300   # 5 minutos

# Dentro do loop — após o bloco foreach ($wfName in $targets) e antes do `if ($allDone)`:
# Detectar se CI passou mas Build está invisível/preso
$ciWorkflow    = "CI — Verificacao de Qualidade"
$buildWorkflow = "Build Nexora Desktop"

$ciRuns    = @($runs | Where-Object { $_.name -eq $ciWorkflow })
$buildRuns = @($runs | Where-Object { $_.name -eq $buildWorkflow })

$ciPassed  = ($ciRuns | Where-Object { $_.conclusion -eq "success" }) -ne $null
$buildDone = ($buildRuns | Where-Object { $_.status -eq "completed" -and $_.conclusion -eq "success" }) -ne $null

if ($ciPassed -and -not $ciPassedAt) { $ciPassedAt = Get-Date }

if ($ciPassedAt -and -not $buildDone) {
    $stallSec = [math]::Round(((Get-Date) - $ciPassedAt).TotalSeconds)
    if ($stallSec -gt $BUILD_STALL_TIMEOUT) {
        Write-Host ""
        Write-Host "  ⚠  CI passou mas Build nao detectado ha $([math]::Round($stallSec/60))min." -ForegroundColor Yellow
        Write-Host "     O Build pode ter corrido antes da janela de monitorizacao." -ForegroundColor DarkGray
        Write-Host "     Verifica: https://github.com/$REPO_OWNER/$REPO_NAME/actions" -ForegroundColor DarkCyan
        Write-Host ""
        Write-Success "CI passou. A assumir Build OK — release v$version concluida."
        return
    }
}
```

**Comportamento resultante:**

- Se o Build for detectado normalmente → fluxo actual, sem alteração
- Se o CI ✅ e o Build não aparecer em 5 min → aviso + saída graciosa com URL para verificar manualmente
- O timeout de 45 minutos existente (para falhas) mantém-se inalterado

---

## Scope

| Fix                        | Ficheiro           | Linhas afectadas                              |
| -------------------------- | ------------------ | --------------------------------------------- |
| 1 — tauri.conf.json versão | `scripts/sync.ps1` | ~1959 (1 linha)                               |
| 2 — Prettier pré-commit    | `scripts/sync.ps1` | ~2082 (bloco ~10 linhas)                      |
| 3 — Watch loop             | `scripts/sync.ps1` | ~90-95 (2 vars) + ~160-175 (bloco ~18 linhas) |

**Sem novas dependências. Sem alterações a outros ficheiros.**

---

## Critérios de verificação

- [ ] Após `sync.ps1` Release bump: `grep '"version"' src-tauri/tauri.conf.json` mostra `"0.30.X"` (sem sufixo)
- [ ] CI passa sem `fix(ci): prettier` manual após release bump
- [ ] Se Build não aparecer em 5 min com CI ✅, `Watch-GitHubActions` sai com aviso e URL em vez de ficar em loop
- [ ] Build que aparece normalmente continua a ser monitorizado e reportado correctamente
