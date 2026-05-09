param (
    [string]$Message,
    [switch]$SkipRelease
)

<#
.SYNOPSIS
    Nexora Desktop Sync - Automatiza a sincronizacao, versionamento (SemVer) e releases no GitHub.
    Adapta o padrao nexora-sync.ps1 do servidor para o workspace Tauri/React.

.USAGE
    # Commit + versao + push (modo normal)
    powershell -ExecutionPolicy Bypass -File scripts\sync.ps1

    # Passar mensagem de commit directamente
    powershell -ExecutionPolicy Bypass -File scripts\sync.ps1 -Message "feat: adicionar painel de jobs"

    # Apenas push, sem bump de versao
    powershell -ExecutionPolicy Bypass -File scripts\sync.ps1 -SkipRelease
#>

# Configuracoes de codificacao para o terminal
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# Funcoes de Log
function Write-Step($msg)    { Write-Host "[STEP]  $msg" -ForegroundColor Cyan }
function Write-Success($msg) { Write-Host "[OK]    $msg" -ForegroundColor Green }
function Write-Warn($msg)    { Write-Host "[WARN]  $msg" -ForegroundColor Yellow }
function Write-Err($msg)     { Write-Host "[ERROR] $msg" -ForegroundColor Red }

$WORKSPACE  = "C:\Dev\nexora-desktop"
$REPO_OWNER = "ideiasestrondosas-ctrl"
$REPO_NAME  = "nexora-desktop"

if (-not (Test-Path $WORKSPACE)) {
    Write-Err "Workspace nao encontrado: $WORKSPACE"
    exit 1
}
Push-Location $WORKSPACE

# ---------------------------------------------------------
# VERIFICACAO DE AMBIENTE
# ---------------------------------------------------------
Write-Step "Verificando ambiente Git..."

if (-not (Test-Path ".git")) {
    Write-Warn "Repositorio Git nao inicializado. Inicializando..."
    git init
}

$remote = git remote get-url origin 2>$null
if (-not $remote) {
    Write-Warn "Remoto 'origin' nao configurado."
    $url = Read-Host "Introduza a URL do repositorio GitHub"
    if ($url) {
        git remote add origin $url
        Write-Success "Remoto origin adicionado: $url"
    } else {
        Write-Err "URL do repositorio e necessaria para continuar."
        Pop-Location; exit 1
    }
}

# ---------------------------------------------------------
# CARREGAMENTO DE CONFIGURACOES (.env)
# ---------------------------------------------------------
$script:GITHUB_TOKEN = ""
if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        if ($_ -match "^\s*GITHUB_TOKEN\s*=\s*(.*)$") {
            $val = $matches[1].Trim().Trim("'").Trim('"')
            if ($val) { $script:GITHUB_TOKEN = $val }
        }
    }
}

# ---------------------------------------------------------
# MOSTRAR SYNC-STATE (handoff Claude <-> Antigravity)
# ---------------------------------------------------------
Write-Step "Verificando estado do handoff (SYNC-STATE.md)..."
if (Test-Path "SYNC-STATE.md") {
    Write-Host ""
    Write-Host "  -- Ultimo handoff --" -ForegroundColor White
    Get-Content "SYNC-STATE.md" | Select-Object -First 15 | ForEach-Object {
        Write-Host "  $_" -ForegroundColor Gray
    }
    Write-Host ""
} else {
    Write-Warn "SYNC-STATE.md nao encontrado - recomendado para handoff Claude/Antigravity"
}

# ---------------------------------------------------------
# DETECAO DE ALTERACOES
# ---------------------------------------------------------
Write-Step "Analisando alteracoes no workspace..."

git update-index --refresh > $null 2>&1
$branch  = git branch --show-current
$status  = git status --porcelain
$unpushed = git log origin/$branch..HEAD --oneline 2>$null

if (-not $status -and -not $unpushed) {
    Write-Success "Workspace e GitHub estao sincronizados. Nada para fazer."
    Pop-Location; exit 0
}

# ---------------------------------------------------------
# COMMIT DE CODIGO
# ---------------------------------------------------------
$commitMsg  = ""
$isNewRelease = $false

if ($status) {
    $commitMsg = $Message
    if (-not $commitMsg) {
        Write-Host ""
        Write-Host "Convencoes de Commit (SemVer):" -ForegroundColor White
        Write-Host "1. feat:            (Nova funcionalidade -> Bump MINOR)"
        Write-Host "2. fix:             (Correcao de bug -> Bump PATCH)"
        Write-Host "3. docs:            (Documentacao -> Bump PATCH)"
        Write-Host "4. style:           (Estetica -> Bump PATCH)"
        Write-Host "5. refactor:        (Refatorizacao -> Bump PATCH)"
        Write-Host "6. BREAKING CHANGE: (Alteracao disruptiva -> Bump MAJOR)"

        $type = Read-Host "Escolha o tipo (Padrao: feat)"
        if (-not $type) { $type = "feat" }

        $desc = Read-Host "Descricao"
        if (-not $desc) { $desc = "atualizacoes gerais" }

        $commitMsg = "$($type): $desc"
    }

    Write-Step "Realizando commit: '$commitMsg'..."
    git add .
    git commit -m $commitMsg

    if ($LASTEXITCODE -ne 0) {
        Write-Err "Falha ao realizar o commit."
        Pop-Location; exit 1
    }

    # Graphify auto-commit (se existir grafo gerado automaticamente)
    Start-Sleep -Seconds 1
    if (git status --porcelain) {
        git add .
        git commit -m "docs: atualizar grafo e relatorios (auto)" --no-verify
    }
}

# ---------------------------------------------------------
# GESTAO DE VERSAO (SemVer) - Tauri: sincroniza 3 ficheiros
# ---------------------------------------------------------
if (-not $SkipRelease) {
    Write-Step "Iniciando processo de versionamento (Tauri)..."

    # 1. Ler versao actual a partir de package.json (ou Cargo.toml se package.json ausente)
    $currentVersion = "0.1.0"
    if (Test-Path "package.json") {
        $packageJson    = Get-Content "package.json" -Raw | ConvertFrom-Json
        $currentVersion = $packageJson.version
    } elseif (Test-Path "src-tauri\Cargo.toml") {
        $cargoContent = Get-Content "src-tauri\Cargo.toml" -Raw
        if ($cargoContent -match '(?m)^\[package\][^\[]*version\s*=\s*"([^"]+)"') {
            $currentVersion = $matches[1]
        }
    }

    Write-Host "Versao actual: $currentVersion" -ForegroundColor Gray

    # 2. Deduzir proxima versao com base no tipo de commit
    $vParts = $currentVersion.Split('.')
    $major  = [int]$vParts[0]
    $minor  = [int]$vParts[1]
    $patch  = [int]$vParts[2]

    $suggestedVersion = ""
    if ($commitMsg -match "BREAKING CHANGE") {
        $suggestedVersion = "$($major + 1).0.0"
    } elseif ($commitMsg -match "^feat:") {
        $suggestedVersion = "$major.$($minor + 1).0"
    } else {
        $suggestedVersion = "$major.$minor.$($patch + 1)"
    }

    # 3. Menu interactivo
    Write-Host ""
    Write-Host "Escolha a proxima versao:" -ForegroundColor Yellow
    Write-Host "1) Patch ($($major).$($minor).$($patch + 1))"
    Write-Host "2) Minor ($($major).$($minor + 1).0)"
    Write-Host "3) Major ($($major + 1).0.0)"
    Write-Host "4) Ignorar versao (apenas push)"

    $choice = Read-Host "Opcao (Padrao baseada no commit: $suggestedVersion)"

    $newVersion = ""
    switch ($choice) {
        "1"     { $newVersion = "$($major).$($minor).$($patch + 1)" }
        "2"     { $newVersion = "$major.$($minor + 1).0" }
        "3"     { $newVersion = "$($major + 1).0.0" }
        "4"     { $newVersion = "" }
        default { if (-not $choice) { $newVersion = $suggestedVersion } }
    }

    if ($newVersion) {
        Write-Step "Aplicando versao v$newVersion nos ficheiros Tauri..."

        # package.json
        if (Test-Path "package.json") {
            $packageJson.version = $newVersion
            $packageJson | ConvertTo-Json -Depth 20 | Out-File "package.json" -Encoding UTF8
            Write-Success "package.json -> $newVersion"
        }

        # src-tauri/Cargo.toml (apenas a linha version = "..." dentro de [package])
        if (Test-Path "src-tauri\Cargo.toml") {
            $cargoRaw  = Get-Content "src-tauri\Cargo.toml" -Raw
            # Substitui versao na primeira seccao [package] antes de qualquer [dependencies]
            $cargoNew  = $cargoRaw -replace '(?m)(^\[package\][^\[]*?version\s*=\s*")[^"]+(")', "`${1}$newVersion`${2}"
            [System.IO.File]::WriteAllText(
                (Join-Path $WORKSPACE "src-tauri\Cargo.toml"),
                $cargoNew,
                [System.Text.Encoding]::UTF8
            )
            Write-Success "src-tauri\Cargo.toml -> $newVersion"
        } else {
            Write-Warn "src-tauri\Cargo.toml nao encontrado (normal antes do scaffold Tauri)"
        }

        # src-tauri/tauri.conf.json (campo version, se existir)
        if (Test-Path "src-tauri\tauri.conf.json") {
            $tauriConf = Get-Content "src-tauri\tauri.conf.json" -Raw | ConvertFrom-Json
            if ($tauriConf.PSObject.Properties["version"]) {
                $tauriConf.version = $newVersion
                $tauriConf | ConvertTo-Json -Depth 20 | Out-File "src-tauri\tauri.conf.json" -Encoding UTF8
                Write-Success "src-tauri\tauri.conf.json -> $newVersion"
            }
        }

        # CHANGELOG.md — criar se nao existir
        $date     = Get-Date -Format "yyyy-MM-dd"
        $newEntry = "## [$newVersion] - $date`n`n### Added`n- $commitMsg`n"
        if (Test-Path "CHANGELOG.md") {
            $changelog = Get-Content "CHANGELOG.md" -Raw
            if ($changelog -match "## \[Unreleased\]") {
                $changelog = $changelog -replace "## \[Unreleased\]", "## [Unreleased]`n`n$newEntry"
            } else {
                $changelog = $changelog -replace "# Changelog", "# Changelog`n`n$newEntry"
            }
        } else {
            $changelog = "# Changelog`n`n## [Unreleased]`n`n$newEntry"
            Write-Warn "CHANGELOG.md nao existia - criado automaticamente"
        }
        [System.IO.File]::WriteAllText(
            (Join-Path $WORKSPACE "CHANGELOG.md"),
            $changelog,
            [System.Text.Encoding]::UTF8
        )

        # PROGRESS-DESKTOP.md (campo Versao na tabela de estado)
        if (Test-Path "PROGRESS-DESKTOP.md") {
            $progressContent = Get-Content "PROGRESS-DESKTOP.md" -Raw
            $progressContent = $progressContent -replace '\|\s*\*\*Versao\*\*\s*\|\s*[^\|]+\|', "| **Versao** | $newVersion |"
            [System.IO.File]::WriteAllText(
                (Join-Path $WORKSPACE "PROGRESS-DESKTOP.md"),
                $progressContent,
                [System.Text.Encoding]::UTF8
            )
        }

        # Commit de release + tag (verificar se tag ja existe)
        git add package.json src-tauri\Cargo.toml src-tauri\tauri.conf.json CHANGELOG.md PROGRESS-DESKTOP.md
        git commit -m "chore(release): v$newVersion" --no-verify
        $tagExists = git tag -l "v$newVersion" 2>$null
        if ($tagExists) {
            Write-Warn "Tag v$newVersion ja existe - a recriar..."
            git tag -d "v$newVersion" 2>$null | Out-Null
        }
        git tag -a "v$newVersion" -m "Nexora Desktop v$newVersion"
        Write-Success "Versao v$newVersion preparada com sucesso!"
        $isNewRelease = $true
    }
}

# ---------------------------------------------------------
# HANDOFF: verificar SYNC-STATE.md antes do push
# ---------------------------------------------------------
# Verificar se SYNC-STATE.md foi modificado nesta sessao (staged ou unstaged)
# ou se foi commitado num dos commits ainda nao publicados
$syncUncommitted = git status --porcelain "SYNC-STATE.md" 2>$null
$syncInUnpushed  = git log "origin/$branch..HEAD" --name-only --format="" 2>$null | Select-String "SYNC-STATE.md"
if (-not $syncUncommitted -and -not $syncInUnpushed) {
    Write-Warn "SYNC-STATE.md nao foi actualizado nesta sessao."
    Write-Host "  Recomendado: actualiza SYNC-STATE.md para o proximo agente saber onde paraste." -ForegroundColor Gray
    $ans = Read-Host "  Continuar o push sem actualizar SYNC-STATE.md? [S/N]"
    if ($ans -notmatch '^[Ss]$') {
        Write-Host "  Push cancelado. Actualiza SYNC-STATE.md e corre o script de novo." -ForegroundColor Yellow
        Pop-Location; exit 0
    }
} else {
    Write-Success "SYNC-STATE.md actualizado"
}

# ---------------------------------------------------------
# PUSH PARA O GITHUB
# ---------------------------------------------------------
Write-Step "Enviando para o GitHub..."

if ($script:GITHUB_TOKEN) {
    $remoteUrl        = git remote get-url origin
    $baseRepo         = $remoteUrl -replace "https://[^@]+@", "" -replace "https://", ""
    $authenticatedUrl = "https://$($REPO_OWNER):$($script:GITHUB_TOKEN)@$baseRepo"
    git push -u "$authenticatedUrl" $branch --tags
} else {
    git push -u origin $branch --tags
}

if ($LASTEXITCODE -eq 0) {
    Write-Success "Sincronizacao concluida!"

    # Criar GitHub Release se houver nova versao e token
    if ($isNewRelease -and $script:GITHUB_TOKEN) {
        Write-Step "Criando Release no GitHub via API..."
        try {
            $releaseBody = @{
                tag_name   = "v$newVersion"
                name       = "Nexora Desktop v$newVersion"
                body       = "### Alteracoes nesta versao`n`n- $commitMsg`n`nConsulte o CHANGELOG.md para detalhes."
                draft      = $false
                prerelease = $false
            } | ConvertTo-Json

            $headers = @{
                "Authorization" = "token $script:GITHUB_TOKEN"
                "Accept"        = "application/vnd.github+json"
            }

            $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($releaseBody)

            try {
                Invoke-RestMethod `
                    -Uri     "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/releases" `
                    -Method  Post `
                    -Headers $headers `
                    -Body    $bodyBytes `
                    -ContentType "application/json; charset=utf-8" > $null
                Write-Success "GitHub Release v$newVersion publicada!"
            } catch {
                $stream = $_.Exception.Response.GetResponseStream()
                if ($stream) {
                    $reader = New-Object System.IO.StreamReader($stream)
                    Write-Warn "Erro da API GitHub: $($reader.ReadToEnd())"
                } else {
                    Write-Warn "Nao foi possivel publicar a Release: $_"
                }
            }
        } catch {
            Write-Warn "Falha ao preparar JSON da Release: $_"
        }
    }
} else {
    Write-Err "Falha ao enviar para o GitHub."
}

Pop-Location
