#Requires -Version 5.1
# Nexora Desktop - Setup do ambiente Claude Code
# USAGE: powershell -ExecutionPolicy Bypass -File scripts\02-setup-claude-env.ps1
# Correr a partir de: C:\Dev\nexora-desktop

Set-StrictMode -Version Latest
$ErrorActionPreference = "Continue"
$WORKSPACE = "C:\Dev\nexora-desktop"

function Hdr([string]$t)  { Write-Host ""; Write-Host "  ============================================" -ForegroundColor Cyan; Write-Host "  $t" -ForegroundColor Cyan; Write-Host "  ============================================" -ForegroundColor Cyan }
function OK([string]$t)   { Write-Host "  [OK]    $t" -ForegroundColor Green }
function WARN([string]$t) { Write-Host "  [AVISO] $t" -ForegroundColor Yellow }
function ERR([string]$t)  { Write-Host "  [ERRO]  $t" -ForegroundColor Red }
function INFO([string]$t) { Write-Host "          $t" -ForegroundColor Gray }
function FIX([string]$t)  { Write-Host "  -> FIX: $t" -ForegroundColor Cyan }

Clear-Host
Write-Host ""
Write-Host "  Nexora Desktop - Setup Claude Code" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path $WORKSPACE)) {
    ERR "Workspace nao encontrado: $WORKSPACE"
    FIX "Corre primeiro: scripts\01-migrate-workspace.ps1"
    exit 1
}

# ---- FERRAMENTAS --------------------------------------------
Hdr "VERIFICAR FERRAMENTAS"

# Node.js (v20 LTS recomendado, mas v22/v24 tambem funcionam com Claude Code)
try {
    $v = node --version 2>&1
    if ($v -match "v2[02468]\.") { OK "Node.js $v" }
    elseif ($v -match "v1[68]\.") { WARN "Node.js $v - minimo recomendado v20.x"; FIX "choco install nodejs-lts -y" }
    else { OK "Node.js $v (versao recente - compativel)" }
} catch { ERR "Node.js nao encontrado"; FIX "choco install nodejs-lts -y" }

# Rust (necessario para Tauri - pode instalar depois)
try {
    $v = cargo --version 2>&1; OK "Rust: $v"
} catch {
    WARN "Rust nao encontrado - necessario para compilar o Tauri"
    FIX "winget install Rustlang.Rustup   (recomendado)"
    FIX "   ou: choco install rustup.install -y"
    INFO "Depois de instalar: fecha e reabre o terminal, depois corre 'rustup default stable'"
    INFO "Podes continuar o setup sem Rust por agora - instala antes de fazer 'npm run tauri dev'"
}

# Git
try {
    $v = git --version 2>&1; OK "Git: $v"
    $n = git config user.name 2>&1; $e = git config user.email 2>&1
    if ($n -and $e) { OK "Git identidade: $n <$e>" }
    else { WARN "Git sem identidade"; FIX "git config --global user.name 'Nome'" ; FIX "git config --global user.email 'email@exemplo.com'" }
} catch { ERR "Git nao encontrado"; FIX "choco install git -y" }

# FFmpeg
try { $v = (ffmpeg -version 2>&1 | Select-Object -First 1); OK "FFmpeg: $v" }
catch { WARN "FFmpeg nao encontrado (necessario para testes de media)"; FIX "choco install ffmpeg -y" }

# Claude Code
try {
    $v = claude --version 2>&1; OK "Claude Code: $v"

    # Verificar autenticacao via ficheiro de credenciais (criado pelo claude login)
    $credFile = Join-Path $env:USERPROFILE ".claude\.credentials.json"
    if (Test-Path $credFile) {
        OK "Claude Code autenticado (claude login - conta Pro)"
    } elseif ($env:ANTHROPIC_API_KEY) {
        OK "Claude Code autenticado (ANTHROPIC_API_KEY)"
    } else {
        WARN "Claude Code instalado mas sem credenciais encontradas"
        FIX "claude login   (usa a tua conta Pro - sem API key necessaria)"
        INFO "Abre browser, autentica com claude.ai, fecha e volta ao terminal"
    }
} catch {
    ERR "Claude Code nao encontrado"
    FIX "npm install -g @anthropic-ai/claude-code"
    INFO "Depois de instalar: claude login   (autentica com conta Pro, sem API key)"
}

# GitHub CLI
try {
    $v = (gh --version 2>&1 | Select-Object -First 1); OK "GitHub CLI: $v"
    if ((gh auth status 2>&1) -match "Logged in") { OK "GitHub CLI autenticado" }
    else { WARN "GitHub CLI nao autenticado"; FIX "gh auth login" }
} catch { WARN "GitHub CLI nao encontrado (necessario para o script 04)"; FIX "winget install GitHub.cli   ou   choco install gh -y" }

# Autenticacao Claude - resumo
Hdr "AUTENTICACAO CLAUDE CODE"
Write-Host ""
Write-Host "  Tens duas opcoes para autenticar o Claude Code:" -ForegroundColor White
Write-Host ""
Write-Host "  OPCAO A - Conta Pro (recomendado, sem API key)" -ForegroundColor Green
Write-Host "  ------------------------------------------------" -ForegroundColor Gray
Write-Host "  claude login" -ForegroundColor Cyan
Write-Host "  (abre browser -> autentica com claude.ai -> volta ao terminal)" -ForegroundColor Gray
Write-Host ""
Write-Host "  OPCAO B - API Key (para uso programatico)" -ForegroundColor Yellow
Write-Host "  ------------------------------------------" -ForegroundColor Gray
Write-Host "  `$env:ANTHROPIC_API_KEY = 'sk-ant-api03-XXXXXXXXX'" -ForegroundColor Cyan
Write-Host "  (definir em cada sessao, ou adicionar ao perfil PowerShell)" -ForegroundColor Gray
Write-Host ""

# Verificar estado actual
if ($env:ANTHROPIC_API_KEY) {
    OK "ANTHROPIC_API_KEY ja definida (Opcao B activa)"
} else {
    INFO "ANTHROPIC_API_KEY nao definida - usa 'claude login' para autenticar com conta Pro"
}

# ---- CONFIGURAR CLAUDE CODE ----------------------------------
Hdr "CONFIGURAR CLAUDE CODE"
Push-Location $WORKSPACE

if (-not (Test-Path ".claude")) { New-Item -ItemType Directory -Path ".claude" -Force | Out-Null }

if (-not (Test-Path ".claude\settings.json")) {
    $settingsContent = @"
{
  "project_name": "Nexora Desktop",
  "workspace": "C:\\Dev\\nexora-desktop",
  "base_project": "C:\\Dev\\Nexora Media Processing",
  "base_project_access": "read-only",
  "permissions": {
    "allow": [
      "Bash(git:*)",
      "Bash(npm:*)",
      "Bash(cargo:*)",
      "Bash(npx:*)",
      "Read(C:\\Dev\\nexora-desktop\\**)",
      "Read(C:\\Dev\\Nexora Media Processing\\src\\workers\\**)",
      "Read(C:\\Dev\\Nexora Media Processing\\src\\pipeline\\**)",
      "Read(C:\\Dev\\Nexora Media Processing\\arquitetura\\**)",
      "Write(C:\\Dev\\nexora-desktop\\**)"
    ],
    "deny": [
      "Write(C:\\Dev\\Nexora Media Processing\\**)"
    ]
  }
}
"@
    [System.IO.File]::WriteAllText((Join-Path $WORKSPACE ".claude\settings.json"), $settingsContent, [System.Text.Encoding]::UTF8)
    OK ".claude\settings.json criado"
} else { OK ".claude\settings.json ja existe" }

if (Test-Path "CLAUDE.md") { OK "CLAUDE.md presente - Claude Code vai le-lo automaticamente" }
else { WARN "CLAUDE.md nao encontrado" }

Pop-Location

# ---- INSTRUCOES FINAIS --------------------------------------
Hdr "COMO INICIAR O CLAUDE CODE"
Write-Host ""
Write-Host "  PASSO 1 - Instalar (se ainda nao tiveres)" -ForegroundColor White
Write-Host "  npm install -g @anthropic-ai/claude-code" -ForegroundColor Cyan
Write-Host ""
Write-Host "  PASSO 2 - Autenticar com conta Pro (uma vez so)" -ForegroundColor White
Write-Host "  claude login" -ForegroundColor Cyan
Write-Host ""
Write-Host "  PASSO 3 - Abrir no workspace desktop" -ForegroundColor White
Write-Host "  cd `"$WORKSPACE`"" -ForegroundColor Cyan
Write-Host "  claude" -ForegroundColor Cyan
Write-Host ""
Write-Host "  ALTERNATIVA - Claude Code desktop app (GUI sem terminal)" -ForegroundColor White
Write-Host "  ----------------------------------------------------------" -ForegroundColor Gray
Write-Host "  Descarrega em: claude.ai/download" -ForegroundColor Gray
Write-Host "  Abre a app -> File -> Open Folder -> C:\Dev\nexora-desktop" -ForegroundColor Gray
Write-Host "  Autentica com conta Pro - mesmas capacidades, sem terminal" -ForegroundColor Gray
Write-Host ""
Write-Host "  Primeira mensagem (em qualquer das opcoes):" -ForegroundColor White
Write-Host "  Le PROGRESS-DESKTOP.md e SYNC-STATE.md e diz-me o estado actual." -ForegroundColor Cyan
Write-Host ""
Write-Host "  Proximo: scripts\03-setup-antigravity-env.ps1" -ForegroundColor Cyan
Write-Host ""
