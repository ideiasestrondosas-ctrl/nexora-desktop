#Requires -Version 5.1
# Nexora Desktop - Criar repositorio GitHub publico e configurar Git
# USAGE: powershell -ExecutionPolicy Bypass -File scripts\04-setup-github.ps1
# Correr a partir de: C:\Dev\nexora-desktop

Set-StrictMode -Version Latest
$ErrorActionPreference = "Continue"
$WORKSPACE    = "C:\Dev\nexora-desktop"
$REPO_NAME    = "nexora-desktop"
$REPO_DESC    = "Nexora Media Processing - Desktop Nativo (Tauri + React + Node.js)"

function Hdr([string]$t)  { Write-Host ""; Write-Host "  ============================================" -ForegroundColor Cyan; Write-Host "  $t" -ForegroundColor Cyan; Write-Host "  ============================================" -ForegroundColor Cyan }
function OK([string]$t)   { Write-Host "  [OK]    $t" -ForegroundColor Green }
function WARN([string]$t) { Write-Host "  [AVISO] $t" -ForegroundColor Yellow }
function ERR([string]$t)  { Write-Host "  [ERRO]  $t" -ForegroundColor Red }
function INFO([string]$t) { Write-Host "          $t" -ForegroundColor Gray }
function FIX([string]$t)  { Write-Host "  -> FIX: $t" -ForegroundColor Cyan }

function Ask-Confirm([string]$question) {
    $answer = Read-Host "  $question [S/N]"
    return ($answer -eq "S" -or $answer -eq "s")
}

Clear-Host
Write-Host ""
Write-Host "  Nexora Desktop - Setup GitHub" -ForegroundColor Cyan
Write-Host ""

# ---- PRE-REQUISITOS -----------------------------------------
Hdr "PRE-REQUISITOS"

if (-not (Test-Path $WORKSPACE)) {
    ERR "Workspace nao encontrado: $WORKSPACE"
    FIX "Corre primeiro: scripts\01-migrate-workspace.ps1"
    exit 1
}
OK "Workspace: $WORKSPACE"
Push-Location $WORKSPACE

if (-not (Test-Path ".git")) {
    ERR "Git nao inicializado"
    FIX "git init && git add . && git commit -m 'feat(desktop): initial commit'"
    Pop-Location; exit 1
}
OK "Git inicializado"

try {
    $ghV = gh --version 2>&1 | Select-Object -First 1
    OK "GitHub CLI: $ghV"
} catch {
    ERR "GitHub CLI nao encontrado"
    FIX "choco install gh -y  e depois: gh auth login"
    Pop-Location; exit 1
}

gh auth status 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    ERR "GitHub CLI nao autenticado"
    FIX "gh auth login"
    Pop-Location; exit 1
}
$ghUser = gh api user --jq '.login' 2>&1
OK "Autenticado como: $ghUser"

# ---- VERIFICAR REMOTE EXISTENTE -----------------------------
Hdr "VERIFICAR REMOTE"
$existingRemote = git remote get-url origin 2>&1
if ($LASTEXITCODE -eq 0) {
    OK "Remote ja configurado: $existingRemote"
    if (Ask-Confirm "Fazer push para o remote existente?") {
        git push -u origin main 2>&1
        if ($LASTEXITCODE -eq 0) { OK "Push realizado" }
        else { WARN "Push falhou - verifica permissoes" }
    }
    Pop-Location
    exit 0
}

# ---- CRIAR REPOSITORIO --------------------------------------
Hdr "CRIAR REPOSITORIO GITHUB"
Write-Host ""
Write-Host "  Nome:         $REPO_NAME" -ForegroundColor White
Write-Host "  Descricao:    $REPO_DESC" -ForegroundColor White
Write-Host "  Visibilidade: Publico" -ForegroundColor White
Write-Host "  Utilizador:   $ghUser" -ForegroundColor White
Write-Host ""

if (-not (Ask-Confirm "Confirmas a criacao do repositorio publico?")) {
    Write-Host "  Cancelado." -ForegroundColor Yellow
    Pop-Location; exit 0
}

try {
    gh repo create $REPO_NAME --public --description $REPO_DESC --source . --remote origin --push
    if ($LASTEXITCODE -eq 0) {
        OK "Repositorio criado e push inicial realizado!"
        $url = gh repo view $REPO_NAME --json url --jq '.url' 2>&1
        OK "URL: $url"
    } else { throw "Falhou com codigo $LASTEXITCODE" }
} catch {
    WARN "Erro: $_ - tenta manualmente:"
    INFO "gh repo create $REPO_NAME --public"
    INFO "git remote add origin https://github.com/$ghUser/$REPO_NAME.git"
    INFO "git push -u origin main"
}

# ---- ADICIONAR TOPICOS --------------------------------------
try {
    gh repo edit $REPO_NAME --add-topic tauri --add-topic rust --add-topic react --add-topic typescript --add-topic desktop --add-topic video-processing --add-topic ffmpeg 2>&1 | Out-Null
    OK "Topicos adicionados ao repositorio"
} catch { WARN "Nao foi possivel adicionar topicos" }

# ---- CRIAR BRANCH DEV ---------------------------------------
Hdr "CRIAR BRANCH DEV"
try {
    git checkout -b dev 2>&1 | Out-Null
    git push -u origin dev 2>&1 | Out-Null
    git checkout main 2>&1 | Out-Null
    OK "Branch 'dev' criado e publicado"
} catch { WARN "Cria manualmente: git checkout -b dev && git push -u origin dev && git checkout main" }

# ---- CONFIGURAR GIT LOCAL -----------------------------------
git config core.autocrlf true
git config push.default current
git config pull.rebase false
OK "Git local configurado"

Pop-Location

Hdr "GITHUB - CONCLUIDO"
Write-Host ""
try {
    Push-Location $WORKSPACE
    $url = gh repo view --json url --jq '.url' 2>&1
    Pop-Location
    Write-Host "  Repositorio: $url" -ForegroundColor Green
} catch {}
Write-Host ""
Write-Host "  Branches: main (estavel) e dev (desenvolvimento)" -ForegroundColor White
Write-Host ""
Write-Host "  Para nova funcionalidade:" -ForegroundColor White
Write-Host "  git checkout dev" -ForegroundColor Cyan
Write-Host "  git checkout -b feature/desktop-[nome]" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Proximo: scripts\05-validate-environment.ps1" -ForegroundColor Cyan
Write-Host ""
