#Requires -Version 5.1

param(
    [switch]$Info,
    [switch]$Dev,
    [switch]$Clean,
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
    Write-Host "       NEXORA DESKTOP -- Dev Tools  v0.4.0" -ForegroundColor DarkCyan
    Write-Host "  ============================================================" -ForegroundColor DarkCyan
    Write-Host ""
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
    nxStep "Limpeza de artefactos de build"
    foreach ($rel in @("dist", "sidecar\dist", "src-tauri\gen")) {
        $full = Join-Path $ProjectRoot $rel
        if (Test-Path $full) { Remove-Item -Recurse -Force $full; nxOk "Removido: $rel" }
    }
    $null = New-Item -ItemType Directory -Force (Join-Path $ProjectRoot "sidecar\dist")
    $null = New-Item -ItemType File      -Force (Join-Path $ProjectRoot "sidecar\dist\.gitkeep")
    
    # Nova funcionalidade: Limpeza Profunda (Factory Reset)
    Write-Host ""
    $clearData = Read-Host "  Desejas realizar uma limpeza profunda (Apagar definições e BD)? [s/N]"
    if ($clearData -match '^[sS]$') {
        # Garantir que a app e o sidecar nao estao a correr para nao bloquear ficheiros
        Write-Host "     A fechar processos Nexora e Sidecar..." -ForegroundColor DarkGray
        Get-Process "Nexora Desktop", "nexora-desktop" -ErrorAction SilentlyContinue | Stop-Process -Force
        
        # Tentar matar o sidecar Node.js se estiver solto
        Get-CimInstance Win32_Process -Filter "name = 'node.exe' AND CommandLine LIKE '%nexora-sidecar%'" -ErrorAction SilentlyContinue | Invoke-CimMethod -MethodName Terminate | Out-Null
        
        Start-Sleep -Seconds 1

        $AppData = [System.Environment]::GetFolderPath('ApplicationData')
        # O Tauri usa o identificador definido em tauri.conf.json (com.nexora.desktop)
        $DataDir = Join-Path $AppData "com.nexora.desktop"
        
        if (Test-Path $DataDir) {
            Write-Host "     A remover pasta de dados: $DataDir ..." -ForegroundColor DarkGray
            Remove-Item $DataDir -Recurse -Force
            nxOk "Dados de utilizador removidos."
        } else {
            nxWarn "Pasta de dados nao encontrada: $DataDir"
        }
        
        $TempDir = Join-Path $env:TEMP "nexora-output"
        if (Test-Path $TempDir) {
            Remove-Item $TempDir -Recurse -Force
            nxOk "Ficheiros temporários de saída removidos."
        }
    }

    nxOk "Limpeza concluida."
}

function nxNuclear {
    nxBanner
    Write-Host "  RESET NUCLEAR" -ForegroundColor Red
    Write-Host "  Remove node_modules/, src-tauri/target/, dist/, sidecar/dist/, gen/" -ForegroundColor DarkGray
    Write-Host "  ATENCAO: recompilacao Rust do zero pode demorar 5-15 minutos." -ForegroundColor DarkGray
    Write-Host ""
    $confirm = Read-Host "  Tens a certeza? [s = confirmar]"
    if ($confirm -notmatch '^[sS]$') { nxWarn "Cancelado."; return }

    nxStep "A apagar tudo..."
    foreach ($rel in @("node_modules", "dist", "sidecar\dist", "src-tauri\target", "src-tauri\gen")) {
        $full = Join-Path $ProjectRoot $rel
        if (Test-Path $full) {
            Write-Host "     Removendo $rel ..." -ForegroundColor DarkGray
            Remove-Item -Recurse -Force $full
            nxOk "Removido: $rel"
        }
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

function nxDev {
    nxVerifyEnvironment
    nxStep "A arrancar Tauri Dev Server  [Ctrl+C para parar]"
    Write-Host "     Frontend: http://localhost:1420" -ForegroundColor DarkGray
    npm run tauri dev
}

function nxFull {
    nxStep "BUILD COMPLETO DE PRODUCAO"
    nxClean
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
    Write-Host "  -Clean       Apagar dist/, sidecar/dist/, gen/ (node_modules e target/ ficam)" -ForegroundColor White
    Write-Host "  -Full        Build de producao completo (sem dev server)" -ForegroundColor White
    Write-Host "  -Nuclear     Reset total: apaga tudo + reinstala" -ForegroundColor White
    Write-Host "  -Sidecar     Reconstruir so o sidecar (nexora-sidecar.cjs)" -ForegroundColor White
    Write-Host "  -TypeCheck   tsc --noEmit no frontend e no sidecar" -ForegroundColor White
    Write-Host "  -Test        vitest run" -ForegroundColor White
    Write-Host ""
    Write-Host "  COMBINACOES VALIDAS" -ForegroundColor White
    Write-Host "  -------------------" -ForegroundColor DarkGray
    Write-Host "  -Clean -Dev        Limpar artefactos + arrancar dev" -ForegroundColor White
    Write-Host "  -Sidecar -Dev      Reconstruir sidecar + arrancar dev" -ForegroundColor White
    Write-Host "  -TypeCheck -Test   CI local (sem arrancar a app)" -ForegroundColor White
    Write-Host "  -Nuclear -Dev      Reset total + arrancar dev" -ForegroundColor White
    Write-Host ""
    Write-Host "  EXEMPLOS" -ForegroundColor White
    Write-Host "  --------" -ForegroundColor DarkGray
    Write-Host "  .\scripts\06-run-dev.ps1              # Menu interactivo" -ForegroundColor DarkGray
    Write-Host "  .\scripts\06-run-dev.ps1 -Dev         # Dev normal" -ForegroundColor DarkGray
    Write-Host "  .\scripts\06-run-dev.ps1 -Clean -Dev  # Limpar + dev" -ForegroundColor DarkGray
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
        Write-Host "    2   Clean        apagar dist/, sidecar/dist/, gen/" -ForegroundColor White
        Write-Host "    3   Full         build completo de producao" -ForegroundColor White
        Write-Host "    4   Nuclear      reset total (apaga tudo e reinstala)" -ForegroundColor White
        Write-Host "    5   Sidecar      reconstruir so o sidecar Node.js" -ForegroundColor White
        Write-Host "    6   TypeCheck    verificar TypeScript (frontend + sidecar)" -ForegroundColor White
        Write-Host "    7   Tests        correr vitest" -ForegroundColor White
        Write-Host "    8   Ajuda        ver parametros e exemplos" -ForegroundColor White
        Write-Host "    0   Sair" -ForegroundColor DarkGray
        Write-Host ""
        $choice = Read-Host "  Opcao"
        switch ($choice) {
            '1' { nxDev;       break }
            '2' { nxClean;     Write-Host ""; Read-Host "  Prima Enter para continuar"; break }
            '3' { nxFull;      Write-Host ""; Read-Host "  Prima Enter para continuar"; break }
            '4' { nxNuclear;   Write-Host ""; Read-Host "  Prima Enter para continuar"; break }
            '5' { nxSidecar;   Write-Host ""; Read-Host "  Prima Enter para continuar"; break }
            '6' { nxTypeCheck; Write-Host ""; Read-Host "  Prima Enter para continuar"; break }
            '7' { nxTest;      Write-Host ""; Read-Host "  Prima Enter para continuar"; break }
            '8' { nxInfo;      Write-Host ""; Read-Host "  Prima Enter para continuar"; break }
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
        '-f'  { $Full      = $true }
        '-n'  { $Nuclear   = $true }
        '-s'  { $Sidecar   = $true }
        '-tc' { $TypeCheck = $true }
        '-t'  { $Test      = $true }
    }
}

$anyFlag = $Info -or $Dev -or $Clean -or $Full -or $Nuclear -or $Sidecar -or $TypeCheck -or $Test

if (-not $anyFlag) { nxMenu; exit 0 }
if ($Info)         { nxInfo; exit 0 }

try {
    if ($Nuclear) {
        nxNuclear
        if ($Dev) { nxDev }
        exit 0
    }
    if ($Clean)     { nxClean }
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
