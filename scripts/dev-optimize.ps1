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

# ── Show-Status ──────────────────────────────────────────────────────────────
function Show-Status {
    Write-Header "STATUS DO SISTEMA"

    # RAM
    $os = Get-CimInstance Win32_OperatingSystem
    $totalGB = [math]::Round($os.TotalVisibleMemorySize / 1MB, 1)
    $freeGB  = [math]::Round($os.FreePhysicalMemory  / 1MB, 1)
    $usedGB  = [math]::Round(($os.TotalVisibleMemorySize - $os.FreePhysicalMemory) / 1MB, 1)
    $freeColor = if ($freeGB -lt 4) { "Yellow" } else { "Green" }
    Write-Host ""
    Write-Host "  RAM:      " -NoNewline
    Write-Host "$usedGB GB usada" -ForegroundColor White -NoNewline
    Write-Host " / " -NoNewline
    Write-Host "$freeGB GB livre" -ForegroundColor $freeColor -NoNewline
    Write-Host " ($totalGB GB total)"

    # Modo dev
    $devOn = Test-Path $StateFile
    Write-Host "  Modo Dev: " -NoNewline
    if ($devOn) { Write-Host "ON" -ForegroundColor Green }
    else        { Write-Host "OFF" -ForegroundColor Gray }

    Write-Host ""
    Write-Host "  ── Configuração permanente (setup) ─────────────────" -ForegroundColor DarkCyan

    # Defender
    $setupDone = Test-Path $BackupFile
    if ($setupDone) { Write-Ok  "Defender:  exclusões aplicadas" }
    else            { Write-Warn "Defender:  setup ainda não executado" }

    # WSearch
    if ($setupDone) { Write-Ok  "WSearch:   exclusões aplicadas" }
    else            { Write-Warn "WSearch:   setup ainda não executado" }

    # Docker
    if (Test-Path $DockerCfgPath) {
        $d = Get-Content $DockerCfgPath -Raw | ConvertFrom-Json
        $hasMem  = $d.PSObject.Properties.Name -contains "memoryMiB"
        $hasCpus = $d.PSObject.Properties.Name -contains "cpus"
        if ($hasMem -and $hasCpus -and [int]$d.memoryMiB -gt 0 -and [int]$d.cpus -gt 0) {
            Write-Ok "Docker:    $([math]::Round([int]$d.memoryMiB/1024,1)) GB / $([int]$d.cpus) CPUs"
        } else {
            Write-Warn "Docker:    sem limites definidos"
        }
    } else {
        Write-Info "Docker:    settings-store.json não encontrado"
    }

    # WSL
    $wslCfg = "$HOME\.wslconfig"
    if (Test-Path $wslCfg) {
        $wslContent = Get-Content $wslCfg -Raw
        if ($wslContent -match "memory" -and $wslContent -match "processors") {
            Write-Ok "WSL:       .wslconfig presente"
        } else {
            Write-Warn "WSL:       .wslconfig incompleto"
        }
    } else {
        Write-Warn "WSL:       .wslconfig não encontrado"
    }

    Write-Host ""
    Write-Host "  ── Serviços (dev-on/off) ───────────────────────────" -ForegroundColor DarkCyan

    foreach ($svc in $DevServices) {
        $s = Get-Service $svc -ErrorAction SilentlyContinue
        if ($s) {
            $color = if ($s.Status -eq "Running") { "Gray" } else { "Green" }
            $label = if ($s.Status -eq "Running") {
                "Running (normal)"
            } elseif ($devOn) {
                "Stopped (dev-on activo)"
            } else {
                "Stopped"
            }
            Write-Host "  $($svc.PadRight(12))" -NoNewline
            Write-Host $label -ForegroundColor $color
        }
    }

    Write-Host ""
    Write-Host "  ── Top 5 processos por RAM ─────────────────────────" -ForegroundColor DarkCyan
    Get-Process | Sort-Object WorkingSet -Descending | Select-Object -First 5 |
        ForEach-Object {
            $mb = [math]::Round($_.WorkingSet / 1MB, 0)
            Write-Host "  $($_.Name.PadRight(28)) $mb MB"
        }
    Write-Host ""
}

# ── Helper: Windows Search exclusão via COM ──────────────────────────────────
function Set-WSearchExclusion {
    param([string]$FolderPath, [bool]$Exclude = $true)
    # ISearchManager via CLSID 7D096C5F-AC08-4F1F-BEB7-5C22C517CE39
    try {
        $type = [Type]::GetTypeFromCLSID([Guid]"7D096C5F-AC08-4F1F-BEB7-5C22C517CE39")
        if (-not $type) { throw "COM não disponível" }
        $sm  = [Activator]::CreateInstance($type)
        $cat = $sm.GetCatalog("SystemIndex")
        $csm = $cat.GetCrawlScopeManager()
        $url = "file:///" + $FolderPath.Replace("\", "/").TrimEnd("/") + "/"
        if ($Exclude) {
            $csm.AddDefaultScopeRule($url, 0, 1)   # 0 = excluir, 1 = persistente
        } else {
            try { $csm.RemoveScopeRule($url) } catch { <# já não existe #> }
        }
        $csm.SaveAll()
        return $true
    } catch {
        Write-Warn "WSearch COM falhou para '$FolderPath': $_"
        return $false
    }
}

# ── Invoke-Setup ─────────────────────────────────────────────────────────────
function Invoke-Setup {
    Require-Admin

    if (Test-Path $BackupFile) {
        Write-Warn "Setup já foi executado anteriormente. Use 'reset' primeiro se quiser re-aplicar."
        return
    }

    Write-Header "SETUP — Configuração Permanente"

    # ── Backup do estado actual ───────────────────────────────────────────
    Write-Info "A guardar backup do estado actual..."
    try {
        $existingDefenderPaths = @((Get-MpPreference).ExclusionPath)
        $existingDefenderProcs = @((Get-MpPreference).ExclusionProcess)
    } catch {
        $existingDefenderPaths = @()
        $existingDefenderProcs = @()
    }

    # Resolver caminho CanonicalGroupLimited* aqui (evita I/O em cada invocação)
    $allDefenderPaths = [System.Collections.Generic.List[string]]$DefenderPaths
    $canonicalPkg = Get-ChildItem "$HOME\AppData\Local\Packages" `
        -Filter "CanonicalGroupLimited*" -Directory -ErrorAction SilentlyContinue |
        Select-Object -First 1
    if ($canonicalPkg) { $allDefenderPaths.Add($canonicalPkg.FullName) }

    $backup = [PSCustomObject]@{
        timestamp          = (Get-Date -Format "o")
        defenderPaths      = $existingDefenderPaths
        defenderProcesses  = $existingDefenderProcs
        dockerBefore       = $null
        addedDefenderPaths = [System.Collections.Generic.List[string]]@()
        addedDefenderProcs = [System.Collections.Generic.List[string]]@()
    }

    # ── Passo 1: Defender — exclusões de pastas ───────────────────────────
    Write-Info ""
    Write-Info "Passo 1/5 — Windows Defender: exclusões de pastas..."
    foreach ($p in $allDefenderPaths) {
        if (Test-Path $p -ErrorAction SilentlyContinue) {
            Add-MpPreference -ExclusionPath $p -ErrorAction SilentlyContinue
            $backup.addedDefenderPaths.Add($p)
            Write-Ok "Defender excluiu: $p"
        } else {
            Write-Info "Pasta não existe (ignorada): $p"
        }
    }

    # ── Passo 2: Defender — exclusões de processos ────────────────────────
    Write-Info ""
    Write-Info "Passo 2/5 — Windows Defender: exclusões de processos..."
    foreach ($proc in $DefenderProcesses) {
        Add-MpPreference -ExclusionProcess $proc -ErrorAction SilentlyContinue
        $backup.addedDefenderProcs.Add($proc)
        Write-Ok "Defender excluiu processo: $proc"
    }

    # ── Passo 3: WSearch — excluir pastas da indexação ────────────────────
    Write-Info ""
    Write-Info "Passo 3/5 — Windows Search: excluir pastas da indexação..."
    $wSearchOk = $true
    foreach ($p in $allDefenderPaths) {
        if (Test-Path $p -ErrorAction SilentlyContinue) {
            $ok = Set-WSearchExclusion -FolderPath $p -Exclude $true
            if ($ok) { Write-Ok "WSearch excluiu: $p" }
            else     { $wSearchOk = $false }
        }
    }
    if (-not $wSearchOk) {
        Write-Warn "Algumas exclusões WSearch falharam. Pode continuar — o Defender já foi configurado."
    }

    # [Task 4 continues here — Docker, WSL, backup save]
    Write-Warn "Passos 4-5 (Docker/WSL) ainda não implementados — aguarda Task 4."
}

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
