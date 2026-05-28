#Requires -Version 5.1

param(
    [switch]$Info,
    [switch]$Dev,
    [switch]$Clean,
    [switch]$CleanBuild,
    [switch]$Full,
    [switch]$Nuclear,
    [switch]$Sidecar,
    [switch]$TypeCheck,
    [switch]$Test
)

# ── Setup ──────────────────────────────────────────────────────────────────────

$ErrorActionPreference = 'Stop'
$ProjectRoot = Resolve-Path "$PSScriptRoot\.."
Set-Location $ProjectRoot

# Setup Logs
$LogsDir = Join-Path $ProjectRoot ".logs"
if (-not (Test-Path $LogsDir)) { New-Item -ItemType Directory -Force $LogsDir | Out-Null }
$LogFile = Join-Path $LogsDir "dev-session-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"
try { Start-Transcript -Path $LogFile -Append -Force | Out-Null } catch {}

# ── Output helpers ─────────────────────────────────────────────────────────────

function nxStep  { param([string]$m) Write-Host "`n  > $m" -ForegroundColor Cyan }
function nxOk    { param([string]$m) Write-Host "  OK $m" -ForegroundColor Green }
function nxWarn  { param([string]$m) Write-Host "  !! $m" -ForegroundColor Yellow }
function nxFail  { param([string]$m) Write-Host "`n  ERR: $m`n" -ForegroundColor Red }

function nxBanner {
    Write-Host ""
    Write-Host "  ============================================================" -ForegroundColor DarkCyan
    Write-Host "       NEXORA DESKTOP -- Dev Tools  v0.5.0" -ForegroundColor DarkCyan
    Write-Host "  ============================================================" -ForegroundColor DarkCyan
    Write-Host ""
}

# ── Safety helpers ─────────────────────────────────────────────────────────────

function nxFormatBytes {
    param([double]$Bytes)
    if ($Bytes -lt 1KB) { return "$([math]::Round($Bytes, 0)) B" }
    if ($Bytes -lt 1MB) { return "$([math]::Round($Bytes / 1KB, 1)) KB" }
    if ($Bytes -lt 1GB) { return "$([math]::Round($Bytes / 1MB, 1)) MB" }
    return "$([math]::Round($Bytes / 1GB, 2)) GB"
}

function nxGetPathSize {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) { return 0 }
    $item = Get-Item -LiteralPath $Path -Force
    if (-not $item.PSIsContainer) { return $item.Length }
    $sum = 0
    Get-ChildItem -LiteralPath $Path -Recurse -Force -ErrorAction SilentlyContinue | ForEach-Object {
        if (-not $_.PSIsContainer) { $sum += $_.Length }
    }
    return $sum
}

function nxNewDeleteTarget {
    param(
        [string]$RelativePath,
        [string]$Description,
        [string]$Impact,
        [string]$Risk = "MEDIO"
    )
    $full = [System.IO.Path]::GetFullPath((Join-Path $ProjectRoot $RelativePath))
    $exists = Test-Path -LiteralPath $full
    $type = "Nao existe"
    $size = 0
    if ($exists) {
        $item = Get-Item -LiteralPath $full -Force
        $type = if ($item.PSIsContainer) { "Directoria" } else { "Ficheiro" }
        $size = nxGetPathSize $full
    }
    [pscustomobject]@{
        RelativePath = $RelativePath
        FullPath     = $full
        Exists       = $exists
        Type         = $type
        SizeBytes    = $size
        Size         = nxFormatBytes $size
        Description  = $Description
        Impact       = $Impact
        Risk         = $Risk
    }
}

function nxAssertSafeDeleteTargets {
    param([array]$Targets)

    $root = [System.IO.Path]::GetFullPath($ProjectRoot).TrimEnd('\')
    $protected = @(
        "src",
        "src-tauri\src",
        "sidecar\src",
        "scripts",
        "docs",
        "qa-runner",
        ".git",
        "package.json",
        "package-lock.json",
        "Cargo.toml",
        "Cargo.lock"
    )

    foreach ($target in $Targets) {
        $full = [System.IO.Path]::GetFullPath($target.FullPath).TrimEnd('\')
        if ($full -eq $root -or -not $full.StartsWith("$root\", [System.StringComparison]::OrdinalIgnoreCase)) {
            throw "Alvo bloqueado fora do projecto: $full"
        }

        foreach ($rel in $protected) {
            $protectedFull = [System.IO.Path]::GetFullPath((Join-Path $ProjectRoot $rel)).TrimEnd('\')
            if ($full -eq $protectedFull -or $full.StartsWith("$protectedFull\", [System.StringComparison]::OrdinalIgnoreCase)) {
                throw "Alvo bloqueado por proteccao de source/desenvolvimento: $full"
            }
        }
    }
}

function nxShowDeletionPlan {
    param(
        [string]$Title,
        [array]$Targets,
        [string]$Risk
    )

    nxBanner
    $color = if ($Risk -in @("ALTO", "CRITICO")) { "Red" } elseif ($Risk -eq "MEDIO") { "Yellow" } else { "Green" }
    Write-Host "  $Title" -ForegroundColor $color
    Write-Host "  RISCO: $Risk" -ForegroundColor $color
    if ($Risk -in @("ALTO", "CRITICO")) {
        Write-Host "  ATENCAO: se confirmares, assumes a responsabilidade pela limpeza." -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "  O script pretende eliminar os seguintes alvos:" -ForegroundColor White
    Write-Host ""

    foreach ($target in $Targets) {
        $status = if ($target.Exists) { "$($target.Type), $($target.Size)" } else { "nao existe, sera ignorado" }
        Write-Host "  - $($target.FullPath)" -ForegroundColor Cyan
        Write-Host "      Estado: $status" -ForegroundColor DarkGray
        Write-Host "      O que e: $($target.Description)" -ForegroundColor Gray
        Write-Host "      Impacto: $($target.Impact)" -ForegroundColor Gray
        Write-Host ""
    }
}

function nxCreateDevelopmentBackup {
    param([string]$Reason)

    $backupRoot = Join-Path (Split-Path $ProjectRoot -Parent) "nexora-desktop-backups"
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $backupDir = Join-Path $backupRoot $stamp

    nxStep "A criar backup de desenvolvimento essencial"
    Write-Host "     Motivo: $Reason" -ForegroundColor DarkGray
    Write-Host "     Destino: $backupDir" -ForegroundColor DarkGray

    New-Item -ItemType Directory -Force $backupDir | Out-Null

    $items = @(
        "src",
        "src-tauri\src",
        "src-tauri\capabilities",
        "sidecar\src",
        "scripts",
        "docs",
        "qa-runner",
        "package.json",
        "package-lock.json",
        "tsconfig.json",
        "vite.config.ts",
        "tailwind.config.js",
        "eslint.config.js",
        "README.md",
        "PROGRESS-DESKTOP.md",
        "SYNC-STATE.md",
        "src-tauri\Cargo.toml",
        "src-tauri\Cargo.lock",
        "src-tauri\tauri.conf.json"
    )

    foreach ($rel in $items) {
        $src = Join-Path $ProjectRoot $rel
        if (Test-Path -LiteralPath $src) {
            $dest = Join-Path $backupDir $rel
            $destParent = Split-Path $dest -Parent
            New-Item -ItemType Directory -Force $destParent | Out-Null
            Copy-Item -LiteralPath $src -Destination $dest -Recurse -Force
        }
    }

    nxOk "Backup criado: $backupDir"
    return $backupDir
}

function nxCreateUserDataBackup {
    param([array]$Targets)

    $backupRoot = Join-Path (Split-Path $ProjectRoot -Parent) "nexora-desktop-backups"
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $backupDir = Join-Path $backupRoot "$stamp-user-data"

    nxStep "A criar backup dos dados locais da app"
    Write-Host "     Destino: $backupDir" -ForegroundColor DarkGray
    New-Item -ItemType Directory -Force $backupDir | Out-Null

    foreach ($target in $Targets) {
        if ($target.Exists) {
            $name = Split-Path $target.FullPath -Leaf
            Copy-Item -LiteralPath $target.FullPath -Destination (Join-Path $backupDir $name) -Recurse -Force
        }
    }

    nxOk "Backup de dados criado: $backupDir"
    return $backupDir
}

function nxAskBackupPreference {
    param(
        [string]$Risk,
        [switch]$DefaultBackup
    )

    if (-not $DefaultBackup) {
        $answer = Read-Host "  Criar backup antes de limpar? [s/N]"
        return ($answer -match '^[sS]$')
    }

    Write-Host ""
    Write-Host "  Backup por defeito: ACTIVADO" -ForegroundColor Yellow
    Write-Host "  Para continuar SEM backup, escreve exactamente: SEM BACKUP" -ForegroundColor Yellow
    $answer = Read-Host "  Enter = criar backup"
    if ($answer -eq "SEM BACKUP") {
        Write-Host "  Vais continuar sem backup por escolha explicita." -ForegroundColor Red
        return $false
    }
    return $true
}

function nxConfirmDeletion {
    param(
        [string]$Risk,
        [switch]$DoubleConfirm
    )

    Write-Host ""
    $confirm = Read-Host "  Para autorizar a limpeza, escreve LIMPAR"
    if ($confirm -ne "LIMPAR") {
        nxWarn "Cancelado. Nada foi eliminado."
        return $false
    }

    if ($DoubleConfirm) {
        $projectConfirm = Read-Host "  Confirmacao final: escreve nexora-desktop"
        if ($projectConfirm -ne "nexora-desktop") {
            nxWarn "Cancelado na segunda confirmacao. Nada foi eliminado."
            return $false
        }
    }

    if ($Risk -eq "CRITICO") {
        Write-Host ""
        Write-Host "  ULTIMO AVISO: esta e uma accao critica." -ForegroundColor Red
        $last = Read-Host "  Escreve ACEITO para assumir a accao"
        if ($last -ne "ACEITO") {
            nxWarn "Cancelado no aviso final. Nada foi eliminado."
            return $false
        }
    }

    return $true
}

function nxRemoveTargetsSafely {
    param([array]$Targets)

    nxStep "A eliminar alvos confirmados"
    foreach ($target in $Targets) {
        if (-not $target.Exists) {
            nxWarn "Ignorado (nao existe): $($target.RelativePath)"
            continue
        }

        Remove-Item -LiteralPath $target.FullPath -Recurse -Force
        nxOk "Removido: $($target.RelativePath)"
    }
}

function nxRunDeletionWorkflow {
    param(
        [string]$Title,
        [array]$Targets,
        [string]$Risk = "MEDIO",
        [switch]$DefaultBackup,
        [switch]$DoubleConfirm,
        [switch]$UserDataBackup
    )

    if (-not $UserDataBackup) {
        nxAssertSafeDeleteTargets $Targets
    }
    nxShowDeletionPlan -Title $Title -Targets $Targets -Risk $Risk

    $existingTargets = @($Targets | Where-Object { $_.Exists })
    if ($existingTargets.Count -eq 0) {
        nxWarn "Nao ha alvos existentes para eliminar."
        return "NO_TARGETS"
    }

    $doBackup = nxAskBackupPreference -Risk $Risk -DefaultBackup:$DefaultBackup
    if ($doBackup) {
        if ($UserDataBackup) {
            nxCreateUserDataBackup -Targets $existingTargets | Out-Null
        } else {
            nxCreateDevelopmentBackup -Reason $Title | Out-Null
        }
    }

    if (-not (nxConfirmDeletion -Risk $Risk -DoubleConfirm:$DoubleConfirm)) { return $false }
    nxRemoveTargetsSafely $existingTargets
    return $true
}

# ── Accoes ─────────────────────────────────────────────────────────────────────

function nxVerifyEnvironment {
    nxStep "Verificar Dependencias e Ambiente"

    # Verificar node_modules
    if (-not (Test-Path (Join-Path $ProjectRoot "node_modules"))) {
        nxWarn "Pasta node_modules nao encontrada. A instalar dependencias..."
        npm install
    } else {
        nxOk "node_modules presente"
    }

    # Verificar FFmpeg
    $ffmpegBin = Join-Path $ProjectRoot "src-tauri\binaries\ffmpeg-x86_64-pc-windows-msvc.exe"
    if (-not (Test-Path $ffmpegBin) -or (Get-Item $ffmpegBin).Length -lt 100KB) {
        nxWarn "Binario FFmpeg para Windows ausente ou corrompido. A descarregar..."
        npm run download:binaries
    } else {
        nxOk "Binarios de media (FFmpeg) presentes"
    }

    # Verificar Sidecar
    $sidecarBin = Join-Path $ProjectRoot "sidecar\dist\nexora-sidecar.cjs"
    if (-not (Test-Path $sidecarBin)) {
        nxWarn "Sidecar Node.js nao compilado. A compilar..."
        npm run sidecar:build
    } else {
        nxOk "Sidecar Node.js presente"
    }
}

function nxClean {
    $null = nxCleanLight

    # Limpeza profunda (Factory Reset) fica separada e com confirmacao forte.
    Write-Host ""
    $clearData = Read-Host "  Queres tambem APAGAR DADOS DA APP (BD/definicoes)? [s/N]"
    if ($clearData -match '^[sS]$') {
        nxCleanUserData
    }

    nxOk "Limpeza concluida."
}

function nxCleanLight {
    $targets = @(
        nxNewDeleteTarget "dist" "Build Vite/frontend gerado para producao." "Recriavel com npm run build; nao remove codigo fonte." "BAIXO"
        nxNewDeleteTarget "sidecar\dist" "Sidecar Node.js compilado em JavaScript/CJS." "Recriavel com npm run sidecar:build; dev pode recompilar automaticamente." "BAIXO"
        nxNewDeleteTarget "src-tauri\gen" "Ficheiros gerados pelo Tauri." "Recriavel pelo Tauri; nao remove source Rust/React." "BAIXO"
    )

    $removed = nxRunDeletionWorkflow -Title "CLEAN - LIMPEZA LEVE DE ARTEFACTOS" -Targets $targets -Risk "BAIXO"
    $null = New-Item -ItemType Directory -Force (Join-Path $ProjectRoot "sidecar\dist")
    $null = New-Item -ItemType File      -Force (Join-Path $ProjectRoot "sidecar\dist\.gitkeep")
    return $removed
}

function nxCleanUserData {
    $AppData = [System.Environment]::GetFolderPath('ApplicationData')
    # O Tauri usa o identificador definido em tauri.conf.json (com.nexora.desktop)
    $DataDir = Join-Path $AppData "com.nexora.desktop"
    $TempDir = Join-Path $env:TEMP "nexora-output"

    $targets = @(
        nxNewDeleteTargetFromFullPath $DataDir "Dados locais da app: base de dados, definicoes e estado Tauri." "Pode apagar biblioteca, fila, settings e estado local da app. Backup recomendado." "ALTO"
        nxNewDeleteTargetFromFullPath $TempDir "Saidas temporarias geradas pela app." "Pode apagar ficheiros temporarios de output; normalmente recriavel." "MEDIO"
    )

    nxShowDeletionPlan -Title "APAGAR DADOS DA APP - PERIGO" -Targets $targets -Risk "ALTO"
    $existingTargets = @($targets | Where-Object { $_.Exists })
    if ($existingTargets.Count -eq 0) {
        nxWarn "Nao ha dados locais existentes para eliminar."
        return
    }

    $doBackup = nxAskBackupPreference -Risk "ALTO" -DefaultBackup
    if ($doBackup) { nxCreateUserDataBackup -Targets $existingTargets | Out-Null }

    if (-not (nxConfirmDeletion -Risk "ALTO" -DoubleConfirm)) { return }

    # Garantir que a app e o sidecar nao estao a correr para nao bloquear ficheiros.
    Write-Host "     A fechar processos Nexora e Sidecar..." -ForegroundColor DarkGray
    Get-Process "Nexora Desktop", "nexora-desktop" -ErrorAction SilentlyContinue | Stop-Process -Force

    # Tentar matar o sidecar Node.js se estiver solto.
    Get-CimInstance Win32_Process -Filter "name = 'node.exe' AND CommandLine LIKE '%nexora-sidecar%'" -ErrorAction SilentlyContinue | Invoke-CimMethod -MethodName Terminate | Out-Null

    Start-Sleep -Seconds 1
    nxRemoveTargetsSafely $existingTargets
}

function nxNewDeleteTargetFromFullPath {
    param(
        [string]$FullPath,
        [string]$Description,
        [string]$Impact,
        [string]$Risk = "MEDIO"
    )
    $full = [System.IO.Path]::GetFullPath($FullPath)
    $exists = Test-Path -LiteralPath $full
    $type = "Nao existe"
    $size = 0
    if ($exists) {
        $item = Get-Item -LiteralPath $full -Force
        $type = if ($item.PSIsContainer) { "Directoria" } else { "Ficheiro" }
        $size = nxGetPathSize $full
    }
    [pscustomobject]@{
        RelativePath = $full
        FullPath     = $full
        Exists       = $exists
        Type         = $type
        SizeBytes    = $size
        Size         = nxFormatBytes $size
        Description  = $Description
        Impact       = $Impact
        Risk         = $Risk
    }
}

function nxCleanBuild {
    $targets = @(
        nxNewDeleteTarget "dist" "Build Vite/frontend gerado para producao." "Recriavel com npm run build." "BAIXO"
        nxNewDeleteTarget "sidecar\dist" "Sidecar Node.js compilado." "Recriavel com npm run sidecar:build." "BAIXO"
        nxNewDeleteTarget "src-tauri\gen" "Ficheiros gerados pelo Tauri." "Recriavel pelo Tauri." "BAIXO"
        nxNewDeleteTarget "src-tauri\target" "Build Rust/Tauri completo: .exe, MSI/NSIS, bundles e cache Cargo." "Recriavel, mas o primeiro build Rust apos limpeza pode demorar bastante." "ALTO"
    )

    $removed = nxRunDeletionWorkflow -Title "CLEANBUILD - LIMPAR BUILDS E EXECUTAVEIS GERADOS" -Targets $targets -Risk "ALTO" -DefaultBackup -DoubleConfirm
    $null = New-Item -ItemType Directory -Force (Join-Path $ProjectRoot "sidecar\dist")
    $null = New-Item -ItemType File      -Force (Join-Path $ProjectRoot "sidecar\dist\.gitkeep")
    return $removed
}

function nxNuclear {
    $targets = @(
        nxNewDeleteTarget "node_modules" "Dependencias npm instaladas localmente." "Recriavel com npm install; remove o ambiente JS instalado." "ALTO"
        nxNewDeleteTarget "dist" "Build Vite/frontend gerado." "Recriavel com npm run build." "BAIXO"
        nxNewDeleteTarget "sidecar\dist" "Sidecar Node.js compilado." "Recriavel com npm run sidecar:build." "BAIXO"
        nxNewDeleteTarget "src-tauri\target" "Build Rust/Tauri completo: .exe, MSI/NSIS, bundles e cache Cargo." "Recriavel, mas recompilacao Rust do zero pode demorar 5-15 minutos ou mais." "CRITICO"
        nxNewDeleteTarget "src-tauri\gen" "Ficheiros gerados pelo Tauri." "Recriavel pelo Tauri." "BAIXO"
    )

    $removed = nxRunDeletionWorkflow -Title "NUCLEAR - PERIGO CRITICO" -Targets $targets -Risk "CRITICO" -DefaultBackup -DoubleConfirm
    if ($removed -ne $true) {
        nxWarn "Reset nuclear cancelado ou sem alvos. Nao vou reinstalar dependencias."
        return
    }
    $null = New-Item -ItemType Directory -Force (Join-Path $ProjectRoot "sidecar\dist")
    $null = New-Item -ItemType File      -Force (Join-Path $ProjectRoot "sidecar\dist\.gitkeep")

    nxStep "A reinstalar dependencias npm"
    npm install
    nxStep "A reconstruir sidecar Node.js"
    npm run sidecar:build
    nxOk "Reset nuclear concluido. Corre -Dev para arrancar."
}

function nxSidecar {
    nxStep "A construir sidecar Node.js"
    npm run sidecar:build
    nxOk "Sidecar: sidecar/dist/nexora-sidecar.cjs"
}

function nxTypeCheck {
    nxStep "TypeScript -- frontend"
    npm run typecheck
    nxOk "Frontend: sem erros"
    nxStep "TypeScript -- sidecar"
    npm run sidecar:check
    nxOk "Sidecar: sem erros"
}

function nxTest {
    nxStep "A correr testes (vitest run)"
    npm test
}

function nxFreePort {
    param([int]$Port = 1420)
    $conn = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($conn) {
        $procId = $conn.OwningProcess
        $procName = (Get-Process -Id $procId -ErrorAction SilentlyContinue).ProcessName
        nxWarn "Porta $Port ocupada por '$procName' (PID $procId). A libertar..."
        Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
        Start-Sleep -Milliseconds 500
        nxOk "Porta $Port libertada"
    }
}

function nxDev {
    nxFreePort 1420
    nxVerifyEnvironment
    nxStep "A arrancar Tauri Dev Server  [Ctrl+C para parar]"
    Write-Host "     Frontend: http://localhost:1420" -ForegroundColor DarkGray
    npm run tauri dev
}

function nxFull {
    nxStep "BUILD COMPLETO DE PRODUCAO"
    $cleaned = nxCleanLight
    if ($cleaned -eq $false) {
        nxWarn "Build completo cancelado porque a limpeza inicial nao foi autorizada."
        return
    }
    nxVerifyEnvironment
    nxTypeCheck
    nxTest
    nxStep "A compilar Rust (cargo build --release)"
    Push-Location (Join-Path $ProjectRoot "src-tauri")
    try { cargo build --release } finally { Pop-Location }
    nxOk "Rust compilado"
    nxStep "A compilar frontend (vite build)"
    npm run build
    nxOk "Frontend compilado"
    Write-Host ""
    Write-Host "  BUILD COMPLETO terminado!" -ForegroundColor Green
    Write-Host "  Instalador em: src-tauri\target\release\bundle\" -ForegroundColor DarkGray
    Write-Host ""
}

function nxInfo {
    $s = $MyInvocation.ScriptName
    if (-not $s) { $s = ".\scripts\06-run-dev.ps1" }
    nxBanner
    Write-Host "  PARAMETROS" -ForegroundColor White
    Write-Host "  ----------" -ForegroundColor DarkGray
    Write-Host "  -Info        Mostrar esta ajuda (-h ou --help)" -ForegroundColor White
    Write-Host "  -Dev         install + sidecar:build + tauri dev" -ForegroundColor White
    Write-Host "  -Clean       RISCO BAIXO: apagar dist/, sidecar/dist/, gen/ (com plano + LIMPAR)" -ForegroundColor White
    Write-Host "  -CleanBuild  RISCO ALTO: apagar builds/executaveis gerados, incluindo src-tauri/target/" -ForegroundColor Yellow
    Write-Host "  -Full        Build de producao completo (sem dev server)" -ForegroundColor White
    Write-Host "  -Nuclear     RISCO CRITICO: RESET NUCLEAR, backup por defeito + confirmacao tripla" -ForegroundColor Red
    Write-Host "  -Sidecar     Reconstruir so o sidecar (nexora-sidecar.cjs)" -ForegroundColor White
    Write-Host "  -TypeCheck   tsc --noEmit no frontend e no sidecar" -ForegroundColor White
    Write-Host "  -Test        vitest run" -ForegroundColor White
    Write-Host ""
    Write-Host "  SEGURANCA DAS LIMPEZAS" -ForegroundColor White
    Write-Host "  ---------------------" -ForegroundColor DarkGray
    Write-Host "  Todas as opcoes de limpeza mostram os caminhos absolutos, tamanho, descricao e impacto antes de apagar." -ForegroundColor White
    Write-Host "  RISCO BAIXO/MEDIO: exige escrever LIMPAR." -ForegroundColor White
    Write-Host "  RISCO ALTO/CRITICO: backup por defeito, exige LIMPAR + nexora-desktop." -ForegroundColor White
    Write-Host "  RISCO CRITICO: ainda exige ACEITO como aviso final." -ForegroundColor White
    Write-Host "  Para saltar backup quando ele esta activo por defeito, escreve exactamente SEM BACKUP." -ForegroundColor Yellow
    Write-Host "  Guardas defensivas bloqueiam apagar source, scripts, docs, qa-runner, .git e ficheiros raiz criticos." -ForegroundColor White
    Write-Host "  Backups: C:\Dev\nexora-desktop-backups\<timestamp>\" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "  DETALHE DAS OPCOES" -ForegroundColor White
    Write-Host "  ------------------" -ForegroundColor DarkGray
    Write-Host "  -Clean      Remove apenas artefactos leves: dist/, sidecar/dist/, src-tauri/gen/." -ForegroundColor White
    Write-Host "              Depois pergunta separadamente se quer apagar dados locais da app (BD/definicoes)." -ForegroundColor DarkGray
    Write-Host "  -CleanBuild Remove tambem src-tauri/target/, onde ficam .exe, MSI/NSIS, bundles e cache Rust." -ForegroundColor White
    Write-Host "              Mantem codigo fonte e dependencias npm; cria backup por defeito." -ForegroundColor DarkGray
    Write-Host "  -Full       Executa limpeza leve segura, verifica ambiente, TypeScript, testes e build de producao." -ForegroundColor White
    Write-Host "              Nao apaga dados locais da app." -ForegroundColor DarkGray
    Write-Host "  -Nuclear    REMOVE node_modules/, builds, executaveis e cache Rust. Reinstala dependencias depois." -ForegroundColor Red
    Write-Host "              Nao deve ser usado por rotina; e a opcao mais critica." -ForegroundColor Red
    Write-Host ""
    Write-Host "  COMBINACOES VALIDAS" -ForegroundColor White
    Write-Host "  -------------------" -ForegroundColor DarkGray
    Write-Host "  -Clean -Dev        Limpar artefactos + arrancar dev" -ForegroundColor White
    Write-Host "  -CleanBuild -Dev   Limpar builds/executaveis + arrancar dev" -ForegroundColor White
    Write-Host "  -Sidecar -Dev      Reconstruir sidecar + arrancar dev" -ForegroundColor White
    Write-Host "  -TypeCheck -Test   CI local (sem arrancar a app)" -ForegroundColor White
    Write-Host "  -Nuclear -Dev      Reset total + arrancar dev" -ForegroundColor White
    Write-Host ""
    Write-Host "  EXEMPLOS" -ForegroundColor White
    Write-Host "  --------" -ForegroundColor DarkGray
    Write-Host "  .\scripts\06-run-dev.ps1              # Menu interactivo" -ForegroundColor DarkGray
    Write-Host "  .\scripts\06-run-dev.ps1 -Dev         # Dev normal" -ForegroundColor DarkGray
    Write-Host "  .\scripts\06-run-dev.ps1 -Clean -Dev  # Limpar + dev" -ForegroundColor DarkGray
    Write-Host "  .\scripts\06-run-dev.ps1 -CleanBuild  # Limpar builds/executaveis gerados" -ForegroundColor DarkGray
    Write-Host "  .\scripts\06-run-dev.ps1 -Nuclear     # Reset total" -ForegroundColor DarkGray
    Write-Host "  .\scripts\06-run-dev.ps1 -Full        # Build producao" -ForegroundColor DarkGray
    Write-Host "  .\scripts\06-run-dev.ps1 -Sidecar     # So reconstruir sidecar" -ForegroundColor DarkGray
    Write-Host "  .\scripts\06-run-dev.ps1 -TypeCheck -Test  # CI local" -ForegroundColor DarkGray
    Write-Host "  .\scripts\06-run-dev.ps1 -Info        # Esta ajuda" -ForegroundColor DarkGray
    Write-Host ""
}

function nxMenu {
    while ($true) {
        Clear-Host
        nxBanner
        Write-Host "    1   Dev          install + sidecar:build + tauri dev" -ForegroundColor White
        Write-Host "    2   Clean        RISCO BAIXO: apagar dist/, sidecar/dist/, gen/" -ForegroundColor White
        Write-Host "    3   CleanBuild   RISCO ALTO: apagar builds/executaveis gerados" -ForegroundColor Yellow
        Write-Host "    4   Full         build completo de producao (limpeza segura + testes)" -ForegroundColor White
        Write-Host "    5   NUCLEAR      PERIGO CRITICO: reset pesado + reinstala" -ForegroundColor Red
        Write-Host "    6   Sidecar      reconstruir so o sidecar Node.js" -ForegroundColor White
        Write-Host "    7   TypeCheck    verificar TypeScript (frontend + sidecar)" -ForegroundColor White
        Write-Host "    8   Tests        correr vitest" -ForegroundColor White
        Write-Host "    9   Ajuda        ver parametros, riscos e exemplos" -ForegroundColor White
        Write-Host "    0   Sair" -ForegroundColor DarkGray
        Write-Host ""
        $choice = Read-Host "  Opcao"
        switch ($choice) {
            '1' { nxDev;       break }
            '2' { nxClean;     Write-Host ""; Read-Host "  Prima Enter para continuar"; break }
            '3' { $null = nxCleanBuild; Write-Host ""; Read-Host "  Prima Enter para continuar"; break }
            '4' { nxFull;      Write-Host ""; Read-Host "  Prima Enter para continuar"; break }
            '5' { nxNuclear;   Write-Host ""; Read-Host "  Prima Enter para continuar"; break }
            '6' { nxSidecar;   Write-Host ""; Read-Host "  Prima Enter para continuar"; break }
            '7' { nxTypeCheck; Write-Host ""; Read-Host "  Prima Enter para continuar"; break }
            '8' { nxTest;      Write-Host ""; Read-Host "  Prima Enter para continuar"; break }
            '9' { nxInfo;      Write-Host ""; Read-Host "  Prima Enter para continuar"; break }
            '0' { Write-Host "`n  Ate logo!`n" -ForegroundColor DarkGray; exit 0 }
            default { nxWarn "Opcao invalida: '$choice'"; Start-Sleep -Seconds 1 }
        }
    }
}

# ── Ponto de entrada ───────────────────────────────────────────────────────────

# Suporte a aliases curtos passados como args nao vinculados
foreach ($a in $args) {
    switch ($a) {
        { $_ -in '-h', '--help' } { $Info      = $true }
        '-d'  { $Dev       = $true }
        '-c'  { $Clean     = $true }
        '-cb' { $CleanBuild = $true }
        '-f'  { $Full      = $true }
        '-n'  { $Nuclear   = $true }
        '-s'  { $Sidecar   = $true }
        '-tc' { $TypeCheck = $true }
        '-t'  { $Test      = $true }
    }
}

$anyFlag = $Info -or $Dev -or $Clean -or $CleanBuild -or $Full -or $Nuclear -or $Sidecar -or $TypeCheck -or $Test

if (-not $anyFlag) { nxMenu; exit 0 }
if ($Info)         { nxInfo; exit 0 }

try {
    if ($Nuclear) {
        nxNuclear
        if ($Dev) { nxDev }
        exit 0
    }
    if ($Clean)     { nxClean }
    if ($CleanBuild) { $null = nxCleanBuild }
    if ($Sidecar)   { nxSidecar }
    if ($TypeCheck) { nxTypeCheck }
    if ($Test)      { nxTest }
    if ($Full)      { nxFull }
    if ($Dev)       { nxDev }
} catch {
    try { Stop-Transcript | Out-Null } catch {}
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Red
    Write-Host " ERRO FATAL - " -ForegroundColor Red -NoNewline
    Write-Host "Ocorreu um problema ao correr o Nexora Desktop." -ForegroundColor White
    Write-Host "============================================================" -ForegroundColor Red
    Write-Host ""
    Write-Host " O registo detalhado do erro foi guardado em:" -ForegroundColor Yellow
    Write-Host " > $LogFile" -ForegroundColor Cyan
    Write-Host ""
    Write-Host " Precisa de ajuda para resolver? Copie o ficheiro de log e peca a Inteligencia Artificial:" -ForegroundColor White
    Write-Host " `"Este erro ocorreu a correr o Nexora. O ficheiro de log e este: [colar ou arrastar log aqui]`"" -ForegroundColor DarkGray
    Write-Host ""
    nxFail $_
    
    # Abrir log automaticamente para facilitar suporte
    if (Test-Path $LogFile) {
        Write-Host "  A abrir o ficheiro de log para análise..." -ForegroundColor Gray
        Start-Sleep -Seconds 1
        Start-Process $LogFile
    }
    exit 1
}
