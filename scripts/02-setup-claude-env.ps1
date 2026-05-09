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

# Node.js
try {
    $v = node --version 2>&1
    if ($v -match "v20\.") { OK "Node.js $v" }
    else { WARN "Node.js $v - recomendado v20.x"; FIX "choco install nodejs-lts -y" }
} catch { ERR "Node.js nao encontrado"; FIX "choco install nodejs-lts -y" }

# Rust
try {
    $v = cargo --version 2>&1; OK "Rust: $v"
} catch { ERR "Rust nao encontrado"; FIX "choco install rustup.install -y  (depois fechar e reabrir terminal)" }

# Git
try {
    $v = git --version 2>&1; OK "Git: $v"
    $n = git config user.name 2>&1; $e = git config user.email 2>&1
    if ($n -and $e) { OK "Git identidade: $n <$e>" }
    else { WARN "Git sem identidade"; FIX "git config --global user.name 'Nome'" ; FIX "git config --global user.email 'email@exemplo.com'" }
} catch { ERR "Git nao encontrado"; FIX "choco install git -y" }

# FFmpeg
try { $v = (ffmpeg -version 2>&1 | Select-Object -First 1); OK "FFmpeg: $v" }
catch { WARN "FFmpeg nao encontrado (necessario para testes)"; FIX "choco install ffmpeg -y" }

# Claude Code
try { $v = claude --version 2>&1; OK "Claude Code: $v" }
catch { ERR "Claude Code nao encontrado"; FIX "npm install -g @anthropic-ai/claude-code"; FIX "claude login" }

# GitHub CLI
try {
    $v = (gh --version 2>&1 | Select-Object -First 1); OK "GitHub CLI: $v"
    if ((gh auth status 2>&1) -match "Logged in") { OK "GitHub CLI autenticado" }
    else { WARN "GitHub CLI nao autenticado"; FIX "gh auth login" }
} catch { WARN "GitHub CLI nao encontrado (recomendado)"; FIX "choco install gh -y" }

# ANTHROPIC_API_KEY
if ($env:ANTHROPIC_API_KEY) { OK "ANTHROPIC_API_KEY definida" }
else { WARN "ANTHROPIC_API_KEY nao definida"; FIX "`$env:ANTHROPIC_API_KEY = 'sk-ant-api03-XXXXXXXXX'" }

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

Hdr "SETUP CONCLUIDO"
Write-Host ""
Write-Host "  Para iniciar o Claude Code:" -ForegroundColor White
Write-Host "  cd `"$WORKSPACE`"" -ForegroundColor Cyan
Write-Host "  claude" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Primeira mensagem:" -ForegroundColor White
Write-Host "  Le PROGRESS-DESKTOP.md e SYNC-STATE.md e diz-me o estado actual." -ForegroundColor Cyan
Write-Host ""
Write-Host "  Proximo: scripts\03-setup-antigravity-env.ps1" -ForegroundColor Cyan
Write-Host ""
