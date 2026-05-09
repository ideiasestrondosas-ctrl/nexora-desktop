param (
    [string]$Message,
    [switch]$SkipRelease,
    [switch]$Release,
    [switch]$Help
)

# Configuracoes de codificacao para o terminal
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# Funcoes de Log (definidas cedo para usar no bloco Help)
function Write-Step($msg)    { Write-Host "[STEP]  $msg" -ForegroundColor Cyan }
function Write-Success($msg) { Write-Host "[OK]    $msg" -ForegroundColor Green }
function Write-Warn($msg)    { Write-Host "[WARN]  $msg" -ForegroundColor Yellow }
function Write-Err($msg)     { Write-Host "[ERROR] $msg" -ForegroundColor Red }
function Write-Info($msg)    { Write-Host "        $msg" -ForegroundColor Gray }

# ---------------------------------------------------------
# AJUDA (-Help)
# ---------------------------------------------------------
if ($Help) {
    Clear-Host
    Write-Host ""
    Write-Host "  ============================================" -ForegroundColor Cyan
    Write-Host "  NEXORA DESKTOP SYNC  --  Ajuda" -ForegroundColor Cyan
    Write-Host "  ============================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  UTILIZACAO" -ForegroundColor White
    Write-Host "  ----------" -ForegroundColor Gray
    Write-Host "  powershell -ExecutionPolicy Bypass -File scripts\sync.ps1 [opcoes]" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  OPCOES" -ForegroundColor White
    Write-Host "  ------" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  (sem opcoes)" -ForegroundColor Cyan
    Write-Host "    Abre menu interactivo com 5 opcoes." -ForegroundColor Gray
    Write-Host "    Ideal para uso diario -- nao precisas de decorar flags." -ForegroundColor Gray
    Write-Host ""
    Write-Host "  -Message  <texto>" -ForegroundColor Cyan
    Write-Host "    Define a mensagem de commit directamente." -ForegroundColor Gray
    Write-Host "    Salta as perguntas de tipo e descricao." -ForegroundColor Gray
    Write-Host "    Usa convencoes SemVer: feat:, fix:, docs:, refactor:, BREAKING CHANGE:" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  -SkipRelease" -ForegroundColor Cyan
    Write-Host "    Faz commit e push para dev SEM perguntar versao." -ForegroundColor Gray
    Write-Host "    Util para guardar trabalho rapido sem bump de versao." -ForegroundColor Gray
    Write-Host ""
    Write-Host "  -Release" -ForegroundColor Cyan
    Write-Host "    Modo lancamento completo:" -ForegroundColor Gray
    Write-Host "    commit + bump versao + push dev + merge main + push main + GitHub Release" -ForegroundColor Gray
    Write-Host "    Dispara automaticamente o GitHub Actions (build .exe/.dmg/.deb)." -ForegroundColor Gray
    Write-Host "    Usar quando um Prompt Desktop (1/2/3/4) estiver completo." -ForegroundColor Gray
    Write-Host ""
    Write-Host "  -Help" -ForegroundColor Cyan
    Write-Host "    Mostra esta ajuda." -ForegroundColor Gray
    Write-Host ""
    Write-Host "  CONVENCOES DE COMMIT (SemVer)" -ForegroundColor White
    Write-Host "  -----------------------------" -ForegroundColor Gray
    Write-Host "  feat:            Nova funcionalidade     -> bump MINOR (0.1.0 -> 0.2.0)" -ForegroundColor Gray
    Write-Host "  fix:             Correcao de bug         -> bump PATCH (0.1.0 -> 0.1.1)" -ForegroundColor Gray
    Write-Host "  docs:            Documentacao            -> bump PATCH" -ForegroundColor Gray
    Write-Host "  style:           Estetica/formatacao     -> bump PATCH" -ForegroundColor Gray
    Write-Host "  refactor:        Refatorizacao           -> bump PATCH" -ForegroundColor Gray
    Write-Host "  chore:           Manutencao/scripts      -> bump PATCH" -ForegroundColor Gray
    Write-Host "  BREAKING CHANGE: Alteracao disruptiva    -> bump MAJOR (0.1.0 -> 1.0.0)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  EXEMPLOS" -ForegroundColor White
    Write-Host "  --------" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  # Menu interactivo (recomendado para uso diario)" -ForegroundColor Green
    Write-Host "  powershell -ExecutionPolicy Bypass -File scripts\sync.ps1" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  # Guardar trabalho do dia com mensagem directa" -ForegroundColor Green
    Write-Host "  powershell -ExecutionPolicy Bypass -File scripts\sync.ps1 -Message ""feat: adicionar painel de jobs""" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  # Guardar rapido sem bump de versao" -ForegroundColor Green
    Write-Host "  powershell -ExecutionPolicy Bypass -File scripts\sync.ps1 -SkipRelease" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  # Guardar rapido com mensagem e sem bump" -ForegroundColor Green
    Write-Host "  powershell -ExecutionPolicy Bypass -File scripts\sync.ps1 -SkipRelease -Message ""docs: actualizar SYNC-STATE""" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  # Versao pronta -- Prompt Desktop 2 completo (merge main + GitHub Release)" -ForegroundColor Green
    Write-Host "  powershell -ExecutionPolicy Bypass -File scripts\sync.ps1 -Release -Message ""feat: sidecar + queue + workers""" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  # Versao pronta -- com menu de versao interactivo" -ForegroundColor Green
    Write-Host "  powershell -ExecutionPolicy Bypass -File scripts\sync.ps1 -Release" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  # Ver estado do repositorio sem fazer nada" -ForegroundColor Green
    Write-Host "  powershell -ExecutionPolicy Bypass -File scripts\sync.ps1  -> escolhe opcao 4" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  FLUXO DE TRABALHO TIPICO" -ForegroundColor White
    Write-Host "  ------------------------" -ForegroundColor Gray
    Write-Host "  Dia de trabalho normal:" -ForegroundColor Gray
    Write-Host "    sync.ps1              -> opcao 1 (guardar + bump patch)" -ForegroundColor Gray
    Write-Host "    sync.ps1 -SkipRelease -> guardar sem alterar versao" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  Quando um Prompt Desktop fica completo:" -ForegroundColor Gray
    Write-Host "    sync.ps1 -Release     -> opcao 3 (merge main + build instaladores)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  ATALHO (adiciona ao perfil PowerShell)" -ForegroundColor White
    Write-Host "  ----------------------------------------" -ForegroundColor Gray
    Write-Host "  function nsync { powershell -ExecutionPolicy Bypass -File ""C:\Dev\nexora-desktop\scripts\sync.ps1"" @args }" -ForegroundColor Cyan
    Write-Host "  # Depois podes usar apenas: nsync / nsync -Release / nsync -Help" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  ============================================" -ForegroundColor Cyan
    Write-Host ""
    exit 0
}

$WORKSPACE  = "C:\Dev\nexora-desktop"
$REPO_OWNER = "ideiasestrondosas-ctrl"
$REPO_NAME  = "nexora-desktop"

# Limite de tamanho para ficheiros (GitHub rejeita >100 MB; aviso a 50 MB)
$LARGE_FILE_LIMIT_MB = 50

# Placeholders de binarios FFmpeg/FFprobe (devem ter sempre <=10 bytes no git)
# Os binarios reais sao descarregados pelo CI via download-media-binaries.js
$BINARY_PLACEHOLDERS = @(
    "src-tauri\binaries\ffmpeg-x86_64-pc-windows-msvc.exe",
    "src-tauri\binaries\ffprobe-x86_64-pc-windows-msvc.exe",
    "src-tauri\binaries\ffmpeg-aarch64-apple-darwin",
    "src-tauri\binaries\ffprobe-aarch64-apple-darwin",
    "src-tauri\binaries\ffmpeg-x86_64-apple-darwin",
    "src-tauri\binaries\ffprobe-x86_64-apple-darwin",
    "src-tauri\binaries\ffmpeg-x86_64-unknown-linux-gnu",
    "src-tauri\binaries\ffprobe-x86_64-unknown-linux-gnu",
    "src-tauri\binaries\ffmpeg-universal-apple-darwin",
    "src-tauri\binaries\ffprobe-universal-apple-darwin"
)

if (-not (Test-Path $WORKSPACE)) {
    Write-Err "Workspace nao encontrado: $WORKSPACE"
    exit 1
}
Push-Location $WORKSPACE

# ---------------------------------------------------------
# MENU INTERACTIVO (quando nao ha flags passadas)
# ---------------------------------------------------------
if (-not $SkipRelease -and -not $Release -and -not $Message) {
    $branch = git branch --show-current 2>$null
    $dirty  = git status --short 2>$null
    $currentVersion = "0.1.0"
    if (Test-Path "package.json") {
        try { $currentVersion = (Get-Content "package.json" -Raw | ConvertFrom-Json).version } catch {}
    }

    Clear-Host
    Write-Host ""
    Write-Host "  ============================================" -ForegroundColor Cyan
    Write-Host "  NEXORA DESKTOP SYNC" -ForegroundColor Cyan
    Write-Host "  ============================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Branch:  $branch" -ForegroundColor White
    Write-Host "  Versao:  $currentVersion" -ForegroundColor White
    if ($dirty) {
        Write-Host "  Estado:  $(@($dirty).Count) ficheiro(s) modificado(s)" -ForegroundColor Yellow
    } else {
        Write-Host "  Estado:  Workspace limpo" -ForegroundColor Green
    }
    Write-Host ""
    Write-Host "  O que queres fazer?" -ForegroundColor White
    Write-Host ""
    Write-Host "  1) Guardar trabalho do dia                     (commit + bump versao + push dev)" -ForegroundColor Cyan
    Write-Host "  2) Guardar sem alterar versao                  (commit + push dev, sem bump)" -ForegroundColor Cyan
    Write-Host "  3) Versao pronta para lancamento               (commit + bump + push dev + merge main + GitHub Release)" -ForegroundColor Green
    Write-Host "  4) Ver estado actual                           (git status + ultimos commits)" -ForegroundColor Gray
    Write-Host "  5) Sair" -ForegroundColor Gray
    Write-Host ""

    $choice = Read-Host "  Opcao [1-5]"

    switch ($choice) {
        "1" { <# modo normal -- continua o script #> }
        "2" { $SkipRelease = $true }
        "3" { $Release = $true }
        "4" {
            Write-Host ""
            Write-Host "  -- Ficheiros modificados --" -ForegroundColor White
            git status --short | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
            Write-Host ""
            Write-Host "  -- Ultimos 5 commits --" -ForegroundColor White
            git log --oneline -5 | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
            Write-Host ""
            Write-Host "  -- Branches --" -ForegroundColor White
            git branch -a | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
            Write-Host ""
            Pop-Location; exit 0
        }
        "5" {
            Write-Host "  Saindo." -ForegroundColor Gray
            Pop-Location; exit 0
        }
        default {
            Write-Warn "Opcao invalida. A usar modo 1 (guardar trabalho do dia)."
        }
    }
}

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
# GUARDIA: placeholders + ficheiros grandes
# ---------------------------------------------------------
Write-Step "Verificando placeholders e ficheiros grandes..."

# 1. Restaurar placeholders de binarios FFmpeg/FFprobe substituidos por binarios reais
$restoredCount = 0
foreach ($binRelPath in $BINARY_PLACEHOLDERS) {
    $fullPath = Join-Path $WORKSPACE $binRelPath
    if (Test-Path $fullPath) {
        $fileSize = (Get-Item $fullPath).Length
        if ($fileSize -gt 100) {
            $sizeMB = [math]::Round($fileSize / 1MB, 1)
            Write-Warn "Binario real em placeholder: $binRelPath ($sizeMB MB) -> a restaurar para 1 byte"
            [System.IO.File]::WriteAllBytes($fullPath, [byte[]](0))
            $restoredCount++
        }
    }
}
if ($restoredCount -gt 0) {
    Write-Success "$restoredCount placeholder(s) restaurado(s). Binarios sao descarregados pelo CI."
} else {
    Write-Success "Placeholders OK"
}

# 2. Detectar ficheiros grandes no workspace (excluindo dirs de build conhecidos)
$largeFiles = @()
try {
    $largeFiles = Get-ChildItem -Path $WORKSPACE -Recurse -File -ErrorAction SilentlyContinue |
        Where-Object {
            $p = $_.FullName
            $p -notmatch [regex]::Escape("\\.git\\") -and
            $p -notmatch [regex]::Escape("\\node_modules\\") -and
            $p -notmatch [regex]::Escape("\\src-tauri\\target\\") -and
            $p -notmatch [regex]::Escape("\\dist\\") -and
            ($_.Length / 1MB) -gt $LARGE_FILE_LIMIT_MB
        }
} catch {}

if ($largeFiles.Count -gt 0) {
    Write-Warn "$($largeFiles.Count) ficheiro(s) acima de $($LARGE_FILE_LIMIT_MB) MB -- serao excluidos do commit:"
    $largeFiles | ForEach-Object {
        $rel  = $_.FullName.Substring($WORKSPACE.Length + 1)
        $sizeMB = [math]::Round($_.Length / 1MB, 1)
        Write-Info "  $rel ($sizeMB MB)"
    }
} else {
    Write-Success "Nenhum ficheiro grande detectado"
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

    # Staging seguro: adiciona tudo e depois remove ficheiros grandes e runtime
    git add --all

    # Unstage ficheiros grandes detectados
    if ($largeFiles.Count -gt 0) {
        $largeFiles | ForEach-Object {
            $relPath = $_.FullName.Substring($WORKSPACE.Length + 1)
            git restore --staged $relPath 2>$null | Out-Null
            Write-Info "Excluido do staging: $relPath"
        }
    }

    # Unstage ficheiros de runtime/IDE que nunca devem ser commitados
    $runtimeFiles = @(
        ".claude\settings.local.json",
        ".claude\scheduled_tasks.lock",
        ".antigravity\settings.json"
    )
    foreach ($rf in $runtimeFiles) {
        $rfFull = Join-Path $WORKSPACE $rf
        if (Test-Path $rfFull) {
            git restore --staged $rf 2>$null | Out-Null
        }
    }

    git commit -m $commitMsg

    if ($LASTEXITCODE -ne 0) {
        Write-Err "Falha ao realizar o commit."
        Pop-Location; exit 1
    }

    # Graphify auto-commit (se existir grafo gerado automaticamente)
    Start-Sleep -Seconds 1
    if (git status --porcelain) {
        git add --all
        # Garantir que ficheiros grandes nao entram neste commit tambem
        if ($largeFiles.Count -gt 0) {
            $largeFiles | ForEach-Object {
                $relPath = $_.FullName.Substring($WORKSPACE.Length + 1)
                git restore --staged $relPath 2>$null | Out-Null
            }
        }
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

        # CHANGELOG.md -- criar se nao existir
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
    Write-Success "Push dev concluido!"

    # ---------------------------------------------------------
    # MERGE PARA MAIN (apenas com -Release)
    # ---------------------------------------------------------
    if ($Release) {
        Write-Step "Modo Release: a fazer merge dev -> main..."

        $devBranch = $branch

        git checkout main 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Write-Err "Nao foi possivel mudar para main"
            Pop-Location; exit 1
        }

        git merge $devBranch --ff-only 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Warn "Fast-forward falhou -- a tentar merge normal..."
            git merge $devBranch -m "chore(release): merge $devBranch -> main v$newVersion" 2>&1
        }

        if ($script:GITHUB_TOKEN) {
            git push -u "$authenticatedUrl" main --tags 2>&1
        } else {
            git push -u origin main --tags 2>&1
        }

        if ($LASTEXITCODE -eq 0) {
            Write-Success "main actualizado com v$newVersion!"
        } else {
            Write-Err "Push para main falhou -- faz manualmente: git checkout main && git merge $devBranch && git push origin main"
        }

        # Voltar para dev
        git checkout $devBranch 2>&1 | Out-Null
        Write-Success "De volta ao branch $devBranch"
    }

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
