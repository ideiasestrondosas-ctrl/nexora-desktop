#Requires -Version 5.1
# Nexora Desktop - Script de Migracao para workspace independente
# USAGE: powershell -ExecutionPolicy Bypass -File "nexora-desktop\scripts\01-migrate-workspace.ps1"
# Correr a partir de: C:\Dev\Nexora Media Processing

param()
Set-StrictMode -Version Latest
$ErrorActionPreference = "Continue"

$SOURCE = "C:\Dev\Nexora Media Processing\nexora-desktop"
$TARGET = "C:\Dev\nexora-desktop"
$BASE   = "C:\Dev\Nexora Media Processing"

function Show-Header([string]$text) {
    Write-Host ""
    Write-Host "  ============================================" -ForegroundColor Cyan
    Write-Host "  $text" -ForegroundColor Cyan
    Write-Host "  ============================================" -ForegroundColor Cyan
}
function Show-OK([string]$text)   { Write-Host "  [OK]    $text" -ForegroundColor Green }
function Show-WARN([string]$text) { Write-Host "  [AVISO] $text" -ForegroundColor Yellow }
function Show-ERR([string]$text)  { Write-Host "  [ERRO]  $text" -ForegroundColor Red }
function Show-INFO([string]$text) { Write-Host "          $text" -ForegroundColor Gray }

function Ask-Confirm([string]$question) {
    $answer = Read-Host "  $question [S/N]"
    return ($answer -eq "S" -or $answer -eq "s")
}

Clear-Host
Write-Host ""
Write-Host "  ================================================" -ForegroundColor Cyan
Write-Host "  NEXORA DESKTOP - Script de Migracao v1.1" -ForegroundColor Cyan
Write-Host "  ================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Este script vai:" -ForegroundColor White
Write-Host "  [1] Criar novo workspace: $TARGET" -ForegroundColor Gray
Write-Host "  [2] Copiar ficheiros de:  $SOURCE" -ForegroundColor Gray
Write-Host "  [3] Criar .gitignore e .env.example" -ForegroundColor Gray
Write-Host "  [4] Inicializar repositorio Git independente" -ForegroundColor Gray
Write-Host "  [5] Perguntar antes de remover a pasta original" -ForegroundColor Gray
Write-Host ""
Write-Host "  NAO sera alterado:" -ForegroundColor Yellow
Write-Host "  $BASE  (projecto base - intacto)" -ForegroundColor Gray
Write-Host ""

if (-not (Ask-Confirm "Queres continuar com a migracao?")) {
    Write-Host "  Migracao cancelada." -ForegroundColor Yellow
    exit 0
}

# ---- PASSO 1: Verificar origem --------------------------------
Show-Header "PASSO 1 - Verificar origem"

if (-not (Test-Path $SOURCE)) {
    Show-ERR "Pasta de origem nao encontrada: $SOURCE"
    Show-INFO "Certifica-te que corres este script a partir de: C:\Dev\Nexora Media Processing"
    Show-INFO "Comando: powershell -ExecutionPolicy Bypass -File nexora-desktop\scripts\01-migrate-workspace.ps1"
    exit 1
}
Show-OK "Origem encontrada: $SOURCE"

# ---- PASSO 2: Criar destino -----------------------------------
Show-Header "PASSO 2 - Criar workspace de destino"

if (Test-Path $TARGET) {
    Show-WARN "$TARGET ja existe."
    if (-not (Ask-Confirm "Continuar mesmo assim (nao apaga ficheiros existentes)?")) {
        Write-Host "  Cancelado." -ForegroundColor Yellow
        exit 0
    }
} else {
    New-Item -ItemType Directory -Path $TARGET -Force | Out-Null
    Show-OK "Criado: $TARGET"
}

# ---- PASSO 3: Copiar ficheiros --------------------------------
Show-Header "PASSO 3 - Copiar ficheiros"
Show-INFO "A usar robocopy para copiar..."

$robocopyArgs = @(
    $SOURCE,
    $TARGET,
    "/E",
    "/XD", "node_modules", "target", "dist", ".git", "coverage",
    "/XF", "*.db", "*.db-shm", "*.db-wal", "*.log",
    "/NP", "/NFL", "/NDL"
)

& robocopy @robocopyArgs

if ($LASTEXITCODE -le 1) {
    Show-OK "Ficheiros copiados com sucesso"
} else {
    Show-WARN "robocopy terminou com codigo $LASTEXITCODE - verifica os ficheiros manualmente"
}

# Verificar ficheiros criticos
Show-INFO "A verificar ficheiros criticos..."
$criticalFiles = @(
    "CLAUDE.md",
    "BOUNDARIES.md",
    "PROGRESS-DESKTOP.md",
    "SYNC-STATE.md",
    "nexora-desktop-documento.md",
    "nexora-desktop-guia-execucao.md",
    "nexora-desktop.code-workspace"
)
foreach ($f in $criticalFiles) {
    $fp = Join-Path $TARGET $f
    if (Test-Path $fp) { Show-OK "$f copiado" }
    else { Show-WARN "$f nao encontrado no destino" }
}

# ---- PASSO 4: .gitignore -------------------------------------
Show-Header "PASSO 4 - Criar .gitignore"

$gitignorePath = Join-Path $TARGET ".gitignore"
if (-not (Test-Path $gitignorePath)) {
    $gitignoreContent = @"
# Dependencias
node_modules/
.pnp

# Build
dist/
build/
out/

# Rust (GRANDE - nunca commitar)
target/
src-tauri/target/

# Sidecar compilado
sidecar/dist/

# Binarios de media (incluidos no instalador - nao commitar)
src-tauri/binaries/

# SQLite
*.db
*.db-shm
*.db-wal

# Ambiente
.env
.env.local
!.env.example

# Logs
*.log
logs/

# SO
.DS_Store
Thumbs.db
desktop.ini

# IDEs
.idea/

# Testes
coverage/
.tmp/
temp/
WixTools/
"@
    [System.IO.File]::WriteAllText($gitignorePath, $gitignoreContent, [System.Text.Encoding]::UTF8)
    Show-OK ".gitignore criado"
} else {
    Show-OK ".gitignore ja existe"
}

# ---- PASSO 5: .env.example -----------------------------------
$envExPath = Join-Path $TARGET ".env.example"
if (-not (Test-Path $envExPath)) {
    $envContent = @"
# Nexora Desktop - Variaveis de Ambiente
# Copia para .env e preenche os valores reais

NEXORA_OUTPUT_DIR=./output
NEXORA_MAX_CONCURRENT_JOBS=2
NEXORA_BINARIES_DIR=./src-tauri/binaries
NEXORA_DEBUG=false
NEXORA_BASE_PROJECT=C:\Dev\Nexora Media Processing
"@
    [System.IO.File]::WriteAllText($envExPath, $envContent, [System.Text.Encoding]::UTF8)
    Show-OK ".env.example criado"
}

# ---- PASSO 6: Inicializar Git --------------------------------
Show-Header "PASSO 6 - Inicializar Git"

$gitDir = Join-Path $TARGET ".git"
if (Test-Path $gitDir) {
    Show-OK "Git ja existe em $TARGET"
} else {
    Push-Location $TARGET
    try {
        & git init
        & git config core.autocrlf true
        & git add .
        & git commit -m "feat(desktop): workspace inicial Nexora Desktop"
        Show-OK "Git inicializado com commit inicial"
    } catch {
        Show-WARN "Erro ao inicializar Git: $_ - tenta manualmente depois"
        Show-INFO "cd `"$TARGET`" && git init && git add . && git commit -m 'feat(desktop): initial'"
    } finally {
        Pop-Location
    }
}

# ---- PASSO 7: Remover pasta original (OPCIONAL) --------------
Show-Header "PASSO 7 - Remover pasta original (OPCIONAL)"
Write-Host ""
Write-Host "  A pasta original ainda existe em:" -ForegroundColor White
Write-Host "  $SOURCE" -ForegroundColor Yellow
Write-Host ""
Show-WARN "ATENCAO: Esta operacao e IRREVERSIVEL sem backup git"
Write-Host ""

if (Ask-Confirm "Queres remover $SOURCE do projecto base?") {
    try {
        Remove-Item $SOURCE -Recurse -Force
        Show-OK "Pasta removida: $SOURCE"

        Push-Location $BASE
        try {
            & git add nexora-desktop
            & git commit -m "chore: nexora-desktop migrado para C:\Dev\nexora-desktop"
            Show-OK "Remocao registada no git do projecto base"
        } catch {
            Show-WARN "Commit automatico falhou - faz manualmente se necessario"
        } finally {
            Pop-Location
        }
    } catch {
        Show-ERR "Erro ao remover: $_ - remove manualmente:"
        Show-INFO "Remove-Item '$SOURCE' -Recurse -Force"
    }
} else {
    Show-OK "Pasta original mantida - podes remover depois quando confirmares que esta tudo OK"
    Show-INFO "Para remover depois: Remove-Item '$SOURCE' -Recurse -Force"
}

# ---- RESUMO --------------------------------------------------
Show-Header "MIGRACAO CONCLUIDA"
Write-Host ""
Write-Host "  Workspace criado: $TARGET" -ForegroundColor Green
Write-Host ""
Write-Host "  Proximos passos (correr a partir de $TARGET):" -ForegroundColor White
Write-Host ""
Write-Host "  cd `"$TARGET`"" -ForegroundColor Cyan
Write-Host "  powershell -ExecutionPolicy Bypass -File scripts\02-setup-claude-env.ps1" -ForegroundColor Cyan
Write-Host "  powershell -ExecutionPolicy Bypass -File scripts\03-setup-antigravity-env.ps1" -ForegroundColor Cyan
Write-Host "  powershell -ExecutionPolicy Bypass -File scripts\04-setup-github.ps1" -ForegroundColor Cyan
Write-Host "  powershell -ExecutionPolicy Bypass -File scripts\05-validate-environment.ps1" -ForegroundColor Cyan
Write-Host ""
