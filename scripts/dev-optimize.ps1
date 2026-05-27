#Requires -Version 7.0
<#
.SYNOPSIS
    Optimizador de ambiente de desenvolvimento para Windows 11.
.DESCRIPTION
    Comandos: help | status | setup | dev-on | dev-off | reset
.EXAMPLE
    .\dev-optimize.ps1 setup    # primeira vez, como Admin
    .\dev-optimize.ps1 dev-on   # início de sessão de dev
    .\dev-optimize.ps1 status   # verificar estado
    .\dev-optimize.ps1 dev-off  # fim de sessão
#>
param(
    [Parameter(Position = 0)]
    [ValidateSet("help", "status", "setup", "dev-on", "dev-off", "reset")]
    [string]$Command = "help"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# ── Constantes ──────────────────────────────────────────────────────────────
$BackupFile = "$HOME\.dev-optimize-backup.json"
$StateFile  = "$HOME\.dev-optimize-state.json"
$DockerCfgPath = "$HOME\AppData\Roaming\Docker\settings-store.json"

$DefenderPaths = @(
    "C:\dev",
    "$HOME\.cargo",
    "$HOME\AppData\Roaming\npm",
    "$HOME\.npm",
    "$HOME\.antigravity",
    "$HOME\AppData\Local\GitHubDesktop",
    "$HOME\AppData\Local\Docker\wsl"
)
# Nota: o caminho CanonicalGroupLimited* (WSL Ubuntu .vhdx) é resolvido
# dentro de Invoke-Setup para evitar I/O desnecessário em cada invocação.

$DefenderProcesses = @("cargo.exe", "rustc.exe", "node.exe", "docker.exe", "com.docker.backend.exe")
$DevServices       = @("SysMain", "DiagTrack", "WerSvc")
$NeverTouchProcs   = @("iCloudDrive", "iCloudHome", "iCloudCKKS", "ApplePhotoStreams", "OneDrive", "chrome")

# ── Helpers ──────────────────────────────────────────────────────────────────
function Test-IsAdmin {
    ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
        [Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Require-Admin {
    if (-not (Test-IsAdmin)) {
        Write-Host ""
        Write-Host "  [ERRO] Este comando requer privilégios de Administrador." -ForegroundColor Red
        Write-Host "  Execute: Start-Process pwsh -Verb RunAs -ArgumentList '-File','$($(Get-Item $PSCommandPath).FullName)',$Command" -ForegroundColor Yellow
        Write-Host ""
        exit 1
    }
}

function Write-Header {
    param([string]$Title)
    $line = "─" * 50
    Write-Host ""
    Write-Host "  $line" -ForegroundColor DarkCyan
    Write-Host "  $Title" -ForegroundColor Cyan
    Write-Host "  $line" -ForegroundColor DarkCyan
}

function Write-Ok   { param([string]$Msg) Write-Host "  [OK] $Msg" -ForegroundColor Green }
function Write-Warn { param([string]$Msg) Write-Host "  [AVISO] $Msg" -ForegroundColor Yellow }
function Write-Info { param([string]$Msg) Write-Host "  $Msg" -ForegroundColor Gray }
function Write-Err  { param([string]$Msg) Write-Host "  [ERRO] $Msg" -ForegroundColor Red }

# ── Show-Help ────────────────────────────────────────────────────────────────
function Show-Help {
    Write-Host ""
    Write-Host "╔══════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║        DEV OPTIMIZER — Nexora Desktop                ║" -ForegroundColor Cyan
    Write-Host "║        Optimizador de ambiente Windows 11            ║" -ForegroundColor Cyan
    Write-Host "╚══════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  UTILIZAÇÃO:" -ForegroundColor White
    Write-Host "    .\dev-optimize.ps1 <comando>" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  COMANDOS:" -ForegroundColor White
    Write-Host ""
    Write-Host "  setup" -ForegroundColor Yellow -NoNewline
    Write-Host "      Configuração permanente (UMA VEZ, como Admin)"
    Write-Host "            - Adiciona exclusões ao Windows Defender (pastas + processos)"
    Write-Host "            - Exclui pastas de dev da indexação do Windows Search"
    Write-Host "            - Configura limites Docker Desktop (4 GB RAM / 4 CPUs)"
    Write-Host "            - Valida .wslconfig (6 GB / 4 cores / gradual reclaim)"
    Write-Host "            - Guarda backup do estado original"
    Write-Host "            Requer: Administrador | Reversível com: reset"
    Write-Host ""
    Write-Host "  dev-on" -ForegroundColor Yellow -NoNewline
    Write-Host "     Activa modo desenvolvimento (por sessão)"
    Write-Host "            - Para: SysMain (Superfetch), DiagTrack (telemetria), WerSvc"
    Write-Host "            - Eleva prioridade do terminal para High"
    Write-Host "            - Avisa se RAM livre < 4 GB ou Docker > 2 GB"
    Write-Host "            NÃO toca em: iCloud, OneDrive, Chrome"
    Write-Host "            Reversível com: dev-off"
    Write-Host ""
    Write-Host "  dev-off" -ForegroundColor Yellow -NoNewline
    Write-Host "    Desactiva modo desenvolvimento"
    Write-Host "            - Retoma: SysMain, DiagTrack, WerSvc (só os que dev-on parou)"
    Write-Host "            - Repõe prioridade do terminal para Normal"
    Write-Host ""
    Write-Host "  status" -ForegroundColor Yellow -NoNewline
    Write-Host "     Estado actual do sistema"
    Write-Host "            - RAM usada/livre, modo dev, exclusões, Docker, WSL"
    Write-Host "            - Top 5 processos por memória"
    Write-Host "            Não requer Admin"
    Write-Host ""
    Write-Host "  reset" -ForegroundColor Yellow -NoNewline
    Write-Host "      Desfaz tudo o que o setup fez"
    Write-Host "            - Remove exclusões Defender e WSearch adicionadas"
    Write-Host "            - Restaura configuração Docker do backup"
    Write-Host "            - Remove ficheiros de estado"
    Write-Host "            Requer: Administrador"
    Write-Host ""
    Write-Host "  help" -ForegroundColor Yellow -NoNewline
    Write-Host "       Esta mensagem"
    Write-Host ""
    Write-Host "  FLUXO TÍPICO:" -ForegroundColor White
    Write-Host "    1ª vez (Admin):  .\dev-optimize.ps1 setup"
    Write-Host "    Início de dev:   .\dev-optimize.ps1 dev-on"
    Write-Host "    Verificar:       .\dev-optimize.ps1 status"
    Write-Host "    Fim de dev:      .\dev-optimize.ps1 dev-off"
    Write-Host ""
    Write-Host "  PROCESSOS QUE NUNCA SÃO TOCADOS:" -ForegroundColor White
    Write-Host "    iCloudDrive, iCloudHome, iCloudCKKS, ApplePhotoStreams, OneDrive, Chrome"
    Write-Host ""
}

# ── Show-Status (placeholder — implementado na Task 2) ────────────────────────
function Show-Status { Write-Warn "Comando 'status' ainda não implementado." }

# ── Invoke-Setup (placeholder — implementado nas Tasks 3-4) ──────────────────
function Invoke-Setup { Write-Warn "Comando 'setup' ainda não implementado." }

# ── Invoke-DevOn (placeholder — implementado na Task 5) ──────────────────────
function Invoke-DevOn { Write-Warn "Comando 'dev-on' ainda não implementado." }

# ── Invoke-DevOff (placeholder — implementado na Task 5) ─────────────────────
function Invoke-DevOff { Write-Warn "Comando 'dev-off' ainda não implementado." }

# ── Invoke-Reset (placeholder — implementado na Task 6) ──────────────────────
function Invoke-Reset { Write-Warn "Comando 'reset' ainda não implementado." }

# ── Dispatcher ───────────────────────────────────────────────────────────────
switch ($Command) {
    "help"    { Show-Help }
    "status"  { Show-Status }
    "setup"   { Invoke-Setup }
    "dev-on"  { Invoke-DevOn }
    "dev-off" { Invoke-DevOff }
    "reset"   { Invoke-Reset }
}
