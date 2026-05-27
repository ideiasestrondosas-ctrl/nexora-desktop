# dev-optimize.ps1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar `scripts/dev-optimize.ps1` — script PowerShell que optimiza o ambiente Windows para desenvolvimento com Tauri/Rust/Node/Docker, com modo toggle por sessão e configuração permanente de exclusões.

**Architecture:** Um único ficheiro PowerShell com funções isoladas por comando (`Show-Help`, `Show-Status`, `Invoke-Setup`, `Invoke-DevOn`, `Invoke-DevOff`, `Invoke-Reset`). Estado persistido em dois ficheiros JSON no perfil do utilizador. Nenhuma dependência externa.

**Tech Stack:** PowerShell 7+, Windows Defender API (`Add-MpPreference`), Windows Search COM API (CLSID `7D096C5F-AC08-4F1F-BEB7-5C22C517CE39`), Docker `settings-store.json`.

---

## Ficheiros

| Ficheiro                      | Acção                                  |
| ----------------------------- | -------------------------------------- |
| `scripts/dev-optimize.ps1`    | Criar — script principal (~400 linhas) |
| `~\.dev-optimize-backup.json` | Criado em runtime pelo `setup`         |
| `~\.dev-optimize-state.json`  | Criado em runtime pelo `dev-on`        |

---

## Task 1: Scaffold + dispatcher + `help`

**Files:**

- Create: `scripts/dev-optimize.ps1`

- [ ] **Step 1: Criar o script com scaffold base e função `Show-Help`**

```powershell
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

# ── Constantes ──────────────────────────────────────────────────────────────
$BackupFile = "$HOME\.dev-optimize-backup.json"
$StateFile  = "$HOME\.dev-optimize-state.json"

$DefenderPaths = @(
    "C:\dev",
    "$HOME\.cargo",
    "$HOME\AppData\Roaming\npm",
    "$HOME\.npm",
    "$HOME\.antigravity",
    "$HOME\AppData\Local\GitHubDesktop",
    "$HOME\AppData\Local\Docker\wsl"
)
# Pacote WSL Ubuntu (wildcard)
$canonicalPkg = Get-ChildItem "$HOME\AppData\Local\Packages" `
    -Filter "CanonicalGroupLimited*" -Directory -ErrorAction SilentlyContinue |
    Select-Object -First 1
if ($canonicalPkg) { $DefenderPaths += $canonicalPkg.FullName }

$DefenderProcesses = @("cargo.exe", "rustc.exe", "node.exe", "docker.exe", "com.docker.backend.exe")
$DevServices       = @("SysMain", "DiagTrack", "WerSvc")
$NeverTouchProcs   = @("iCloudDrive", "iCloudHome", "iCloudCKKS", "ApplePhotoStreams", "OneDrive", "chrome")
$DockerCfgPath     = "$HOME\AppData\Roaming\Docker\settings-store.json"

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

# ── Dispatcher ───────────────────────────────────────────────────────────────
switch ($Command) {
    "help"    { Show-Help }
    "status"  { Show-Status }
    "setup"   { Invoke-Setup }
    "dev-on"  { Invoke-DevOn }
    "dev-off" { Invoke-DevOff }
    "reset"   { Invoke-Reset }
}
```

- [ ] **Step 2: Verificar que o scaffold funciona**

```powershell
cd C:\dev\nexora-desktop
pwsh -NonInteractive -File scripts\dev-optimize.ps1 help
```

Esperado: imprime o banner "DEV OPTIMIZER" e todos os comandos.

- [ ] **Step 3: Commit**

```powershell
git add scripts/dev-optimize.ps1
git commit -m "feat(dev-optimize): scaffold base + comando help"
```

---

## Task 2: Comando `status`

**Files:**

- Modify: `scripts/dev-optimize.ps1` — adicionar função `Show-Status` antes do dispatcher

- [ ] **Step 1: Adicionar `Show-Status` no script, logo antes do bloco `switch`**

```powershell
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
    $dockerCfg = "$HOME\AppData\Roaming\Docker\settings-store.json"
    if (Test-Path $dockerCfg) {
        $d = Get-Content $dockerCfg -Raw | ConvertFrom-Json
        if ($d.memoryMiB -and $d.cpus) {
            Write-Ok "Docker:    $([math]::Round($d.memoryMiB/1024,1)) GB / $($d.cpus) CPUs"
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
            $label = if ($s.Status -eq "Running") { "Running (normal)" } else { "Stopped (dev-on activo)" }
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
```

- [ ] **Step 2: Testar `status`**

```powershell
pwsh -NonInteractive -File scripts\dev-optimize.ps1 status
```

Esperado: imprime RAM, Modo Dev OFF, avisos de setup não executado, serviços, top 5 processos.

- [ ] **Step 3: Commit**

```powershell
git add scripts/dev-optimize.ps1
git commit -m "feat(dev-optimize): comando status"
```

---

## Task 3: Comando `setup` — Defender e WSearch

**Files:**

- Modify: `scripts/dev-optimize.ps1` — adicionar função `Invoke-Setup` e helper `Set-WSearchExclusion`

- [ ] **Step 1: Adicionar helpers de WSearch e a função `Invoke-Setup` (Defender + WSearch)**

```powershell
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
        $existingDefenderPaths = (Get-MpPreference).ExclusionPath
        $existingDefenderProcs = (Get-MpPreference).ExclusionProcess
    } catch {
        $existingDefenderPaths = @()
        $existingDefenderProcs = @()
    }
    $dockerCfgPath = $DockerCfgPath
    $dockerBefore  = if (Test-Path $dockerCfgPath) {
        Get-Content $dockerCfgPath -Raw | ConvertFrom-Json |
            Select-Object memoryMiB, cpus | ConvertTo-Json
    } else { $null }

    $backup = [PSCustomObject]@{
        timestamp          = (Get-Date -Format "o")
        defenderPaths      = $existingDefenderPaths
        defenderProcesses  = $existingDefenderProcs
        dockerBefore       = $dockerBefore
        addedDefenderPaths = @()
        addedDefenderProcs = @()
    }

    # ── Passo 1: Defender — exclusões de pastas ───────────────────────────
    Write-Info ""
    Write-Info "Passo 1/4 — Windows Defender: exclusões de pastas..."
    foreach ($p in $DefenderPaths) {
        if (Test-Path $p -PathType Container -ErrorAction SilentlyContinue) {
            Add-MpPreference -ExclusionPath $p -ErrorAction SilentlyContinue
            $backup.addedDefenderPaths += $p
            Write-Ok "  Defender excluiu: $p"
        } else {
            Write-Info "  Pasta não existe (ignorada): $p"
        }
    }

    # ── Passo 2: Defender — exclusões de processos ────────────────────────
    Write-Info ""
    Write-Info "Passo 2/4 — Windows Defender: exclusões de processos..."
    foreach ($proc in $DefenderProcesses) {
        Add-MpPreference -ExclusionProcess $proc -ErrorAction SilentlyContinue
        $backup.addedDefenderProcs += $proc
        Write-Ok "  Defender excluiu processo: $proc"
    }

    # ── Passo 3: WSearch — excluir pastas da indexação ────────────────────
    Write-Info ""
    Write-Info "Passo 3/4 — Windows Search: excluir pastas da indexação..."
    $wSearchOk = $true
    foreach ($p in $DefenderPaths) {
        if (Test-Path $p -PathType Container -ErrorAction SilentlyContinue) {
            $ok = Set-WSearchExclusion -FolderPath $p -Exclude $true
            if ($ok) { Write-Ok "  WSearch excluiu: $p" }
            else     { $wSearchOk = $false }
        }
    }
    if (-not $wSearchOk) {
        Write-Warn "Algumas exclusões WSearch falharam. O Windows Search pode continuar a indexar essas pastas."
    }

    # ── Guardar backup ────────────────────────────────────────────────────
    $backup | ConvertTo-Json -Depth 5 | Set-Content -Path $BackupFile -Encoding UTF8
    Write-Ok "Backup guardado em: $BackupFile"
}
```

- [ ] **Step 2: Testar com Admin (verificar que pede admin se não for)**

```powershell
# Sem admin — deve imprimir erro e sair
pwsh -NonInteractive -File scripts\dev-optimize.ps1 setup
```

Esperado: `[ERRO] Este comando requer privilégios de Administrador.`

- [ ] **Step 3: Commit**

```powershell
git add scripts/dev-optimize.ps1
git commit -m "feat(dev-optimize): setup Defender e WSearch exclusions"
```

---

## Task 4: Comando `setup` — Docker + WSL + finalizar

**Files:**

- Modify: `scripts/dev-optimize.ps1` — completar `Invoke-Setup` com Passo 4 e 5

- [ ] **Step 1: Adicionar Passos 4 e 5 ao `Invoke-Setup`, dentro da função, após o bloco WSearch**

Substituir o bloco `# ── Guardar backup ───` pelo seguinte (que inclui Docker e WSL antes de guardar):

```powershell
    # ── Passo 4: Docker — limites de recursos ────────────────────────────
    Write-Info ""
    Write-Info "Passo 4/5 — Docker Desktop: configurar limites..."
    $dockerCfgPath = $DockerCfgPath
    if (Test-Path $dockerCfgPath) {
        try {
            $dockerCfg = Get-Content $dockerCfgPath -Raw | ConvertFrom-Json
            $dockerCfg | Add-Member -NotePropertyName memoryMiB -NotePropertyValue 4096 -Force
            $dockerCfg | Add-Member -NotePropertyName cpus      -NotePropertyValue 4    -Force
            $dockerCfg | ConvertTo-Json -Depth 20 | Set-Content -Path $dockerCfgPath -Encoding UTF8
            Write-Ok "Docker: 4 GB RAM / 4 CPUs configurados"
            Write-Warn "Reinicia o Docker Desktop para aplicar os limites."
        } catch {
            Write-Warn "Não foi possível configurar Docker: $_"
        }
    } else {
        Write-Warn "Docker settings-store.json não encontrado — configura manualmente em Docker Desktop > Settings > Resources"
    }

    # ── Passo 5: WSL — validar .wslconfig ────────────────────────────────
    Write-Info ""
    Write-Info "Passo 5/5 — WSL: validar .wslconfig..."
    $wslCfg = "$HOME\.wslconfig"
    if (Test-Path $wslCfg) {
        Write-Ok ".wslconfig já existe — não foi alterado:"
        Get-Content $wslCfg | ForEach-Object { Write-Info "    $_" }
    } else {
        $wslContent = @"
[wsl2]
memory=6GB
processors=4
swap=2GB
autoMemoryReclaim=gradual
"@
        Set-Content -Path $wslCfg -Value $wslContent -Encoding UTF8
        Write-Ok ".wslconfig criado com valores recomendados"
    }

    # ── Guardar backup ────────────────────────────────────────────────────
    $backup | ConvertTo-Json -Depth 5 | Set-Content -Path $BackupFile -Encoding UTF8
    Write-Ok ""
    Write-Ok "Setup concluído! Backup guardado em: $BackupFile"
    Write-Info ""
    Write-Info "Próximo passo: .\dev-optimize.ps1 dev-on"
    Write-Host ""
```

- [ ] **Step 2: Verificar estrutura da função `Invoke-Setup` está completa e sem syntax errors**

```powershell
pwsh -NonInteractive -Command "& { . 'scripts\dev-optimize.ps1'; Write-Host 'Parse OK' }" 2>&1
```

Esperado: `Parse OK` (sem erros de parsing).

- [ ] **Step 3: Commit**

```powershell
git add scripts/dev-optimize.ps1
git commit -m "feat(dev-optimize): setup Docker + WSL + backup"
```

---

## Task 5: Comandos `dev-on` e `dev-off`

**Files:**

- Modify: `scripts/dev-optimize.ps1` — adicionar `Invoke-DevOn` e `Invoke-DevOff`

- [ ] **Step 1: Adicionar `Invoke-DevOn` antes do dispatcher**

```powershell
function Invoke-DevOn {
    if (Test-Path $StateFile) {
        Write-Warn "Modo dev já está ON. Usa 'dev-off' primeiro."
        return
    }

    Write-Header "DEV-ON — Activar Modo Desenvolvimento"

    # Verificar se é admin; se não, re-lançar como admin
    if (-not (Test-IsAdmin)) {
        Write-Info "A re-lançar como Administrador para parar serviços..."
        $scriptPath = (Get-Item $PSCommandPath).FullName
        Start-Process pwsh -Verb RunAs `
            -ArgumentList "-NonInteractive", "-File", "`"$scriptPath`"", "dev-on" `
            -Wait
        return
    }

    # RAM check
    $os     = Get-CimInstance Win32_OperatingSystem
    $freeGB = [math]::Round($os.FreePhysicalMemory / 1MB, 1)
    if ($freeGB -lt 4) {
        Write-Warn "RAM livre: $freeGB GB (< 4 GB) — considera fechar algumas aplicações"
    }

    # Docker RAM check
    $dockerProc = Get-Process "Docker Desktop" -ErrorAction SilentlyContinue
    if ($dockerProc) {
        $dockerMB = [math]::Round(($dockerProc | Measure-Object WorkingSet -Sum).Sum / 1MB, 0)
        if ($dockerMB -gt 2048) {
            Write-Warn "Docker Desktop a usar $dockerMB MB — considera se precisas dele nesta sessão"
        }
    }

    # Parar serviços e guardar estado
    $stopped = @()
    foreach ($svc in $DevServices) {
        $s = Get-Service $svc -ErrorAction SilentlyContinue
        if ($s -and $s.Status -eq "Running") {
            try {
                Stop-Service $svc -Force -ErrorAction Stop
                $stopped += $svc
                Write-Ok "Parado: $svc"
            } catch {
                Write-Warn "Não foi possível parar $svc`: $_"
            }
        } else {
            Write-Info "Já estava parado (ignorado): $svc"
        }
    }

    # Elevar prioridade do terminal que invocou este script (processo pai)
    try {
        $parentPid = (Get-CimInstance Win32_Process -Filter "ProcessId=$PID").ParentProcessId
        $parentProc = Get-Process -Id $parentPid -ErrorAction SilentlyContinue
        if ($parentProc) {
            $parentProc.PriorityClass = [System.Diagnostics.ProcessPriorityClass]::High
            Write-Ok "Prioridade do terminal elevada para High (PID $parentPid)"
        }
    } catch {
        Write-Info "Não foi possível elevar prioridade do terminal (não crítico)"
    }

    # Guardar estado
    [PSCustomObject]@{ stoppedServices = $stopped; startedAt = (Get-Date -Format "o") } |
        ConvertTo-Json | Set-Content -Path $StateFile -Encoding UTF8

    Write-Host ""
    Write-Ok "Modo dev ON. Usa 'dev-off' para repor o estado."
    Write-Host ""
}
```

- [ ] **Step 2: Adicionar `Invoke-DevOff` a seguir**

```powershell
function Invoke-DevOff {
    if (-not (Test-Path $StateFile)) {
        Write-Warn "Modo dev não está ON (ficheiro de estado não encontrado)."
        return
    }

    Write-Header "DEV-OFF — Desactivar Modo Desenvolvimento"

    if (-not (Test-IsAdmin)) {
        Write-Info "A re-lançar como Administrador para retomar serviços..."
        $scriptPath = (Get-Item $PSCommandPath).FullName
        Start-Process pwsh -Verb RunAs `
            -ArgumentList "-NonInteractive", "-File", "`"$scriptPath`"", "dev-off" `
            -Wait
        return
    }

    $state = Get-Content $StateFile -Raw | ConvertFrom-Json

    # Retomar serviços que foram parados (só esses)
    foreach ($svc in $state.stoppedServices) {
        try {
            Start-Service $svc -ErrorAction Stop
            Write-Ok "Retomado: $svc"
        } catch {
            Write-Warn "Não foi possível retomar $svc`: $_"
        }
    }

    # Repor prioridade do terminal
    try {
        $parentPid = (Get-CimInstance Win32_Process -Filter "ProcessId=$PID").ParentProcessId
        $parentProc = Get-Process -Id $parentPid -ErrorAction SilentlyContinue
        if ($parentProc) {
            $parentProc.PriorityClass = [System.Diagnostics.ProcessPriorityClass]::Normal
            Write-Ok "Prioridade do terminal reposta para Normal"
        }
    } catch {
        Write-Info "Não foi possível repor prioridade do terminal (não crítico)"
    }

    Remove-Item $StateFile -Force
    Write-Ok "Modo dev OFF. Sistema reposto."
    Write-Host ""
}
```

- [ ] **Step 3: Verificar parse**

```powershell
pwsh -NonInteractive -Command "& { . 'scripts\dev-optimize.ps1'; Write-Host 'Parse OK' }" 2>&1
```

Esperado: `Parse OK`

- [ ] **Step 4: Testar `dev-on` sem admin (deve pedir elevação)**

```powershell
pwsh -NonInteractive -File scripts\dev-optimize.ps1 dev-on
```

Esperado: abre prompt UAC ou imprime mensagem de re-lançamento.

- [ ] **Step 5: Commit**

```powershell
git add scripts/dev-optimize.ps1
git commit -m "feat(dev-optimize): comandos dev-on e dev-off"
```

---

## Task 6: Comando `reset`

**Files:**

- Modify: `scripts/dev-optimize.ps1` — adicionar `Invoke-Reset`

- [ ] **Step 1: Adicionar `Invoke-Reset` antes do dispatcher**

```powershell
function Invoke-Reset {
    Require-Admin

    if (-not (Test-Path $BackupFile)) {
        Write-Warn "Backup não encontrado — setup não foi executado ou já foi feito reset."
        return
    }

    Write-Header "RESET — Desfazer Configuração Permanente"

    $backup = Get-Content $BackupFile -Raw | ConvertFrom-Json

    # ── Remover exclusões Defender adicionadas ────────────────────────────
    Write-Info "A remover exclusões do Windows Defender..."
    foreach ($p in $backup.addedDefenderPaths) {
        Remove-MpPreference -ExclusionPath $p -ErrorAction SilentlyContinue
        Write-Ok "  Defender: removeu exclusão de pasta $p"
    }
    foreach ($proc in $backup.addedDefenderProcs) {
        Remove-MpPreference -ExclusionProcess $proc -ErrorAction SilentlyContinue
        Write-Ok "  Defender: removeu exclusão de processo $proc"
    }

    # ── Remover exclusões WSearch ─────────────────────────────────────────
    Write-Info "A remover exclusões do Windows Search..."
    foreach ($p in $backup.addedDefenderPaths) {
        Set-WSearchExclusion -FolderPath $p -Exclude $false
        Write-Ok "  WSearch: removeu exclusão $p"
    }

    # ── Restaurar Docker ──────────────────────────────────────────────────
    Write-Info "A restaurar configuração Docker..."
    $dockerCfgPath = $DockerCfgPath
    if ($backup.dockerBefore -and (Test-Path $dockerCfgPath)) {
        try {
            $before = $backup.dockerBefore | ConvertFrom-Json
            $current = Get-Content $dockerCfgPath -Raw | ConvertFrom-Json
            $current | Add-Member -NotePropertyName memoryMiB -NotePropertyValue $before.memoryMiB -Force
            $current | Add-Member -NotePropertyName cpus      -NotePropertyValue $before.cpus      -Force
            $current | ConvertTo-Json -Depth 20 | Set-Content -Path $dockerCfgPath -Encoding UTF8
            Write-Ok "Docker: configuração restaurada do backup"
        } catch {
            Write-Warn "Não foi possível restaurar Docker: $_"
        }
    }

    # ── Limpar ficheiros de estado ────────────────────────────────────────
    Remove-Item $BackupFile -Force
    if (Test-Path $StateFile) { Remove-Item $StateFile -Force }

    Write-Ok ""
    Write-Ok "Reset concluído. Sistema no estado pré-setup."
    Write-Host ""
}
```

- [ ] **Step 2: Verificar parse final do script completo**

```powershell
pwsh -NonInteractive -Command "& { . 'scripts\dev-optimize.ps1'; Write-Host 'Parse OK' }" 2>&1
```

Esperado: `Parse OK`

- [ ] **Step 3: Testar `reset` sem backup (deve avisar)**

```powershell
pwsh -NonInteractive -File scripts\dev-optimize.ps1 reset
```

Esperado (sem admin): `[ERRO] Este comando requer privilégios de Administrador.`

- [ ] **Step 4: Commit**

```powershell
git add scripts/dev-optimize.ps1
git commit -m "feat(dev-optimize): comando reset"
```

---

## Task 7: Verificação end-to-end

**Files:** nenhum ficheiro novo

- [ ] **Step 1: Verificar `help` e `status`**

```powershell
pwsh -File scripts\dev-optimize.ps1 help
pwsh -File scripts\dev-optimize.ps1 status
```

Esperado:

- `help`: banner + todos os 6 comandos documentados
- `status`: RAM, Modo Dev OFF, avisos de setup não executado, top 5 processos

- [ ] **Step 2: Executar `setup` como Admin e verificar resultados**

```powershell
# Abre terminal Admin e corre:
pwsh -File C:\dev\nexora-desktop\scripts\dev-optimize.ps1 setup
```

Verificar após:

```powershell
# Defender — deve listar as pastas adicionadas:
(Get-MpPreference).ExclusionPath | Where-Object { $_ -like "*dev*" -or $_ -like "*.cargo*" }

# Backup criado:
Test-Path "$HOME\.dev-optimize-backup.json"   # True
Get-Content "$HOME\.dev-optimize-backup.json" | ConvertFrom-Json | Select-Object addedDefenderPaths

# Docker limites:
(Get-Content "$HOME\AppData\Roaming\Docker\settings-store.json" | ConvertFrom-Json) |
    Select-Object memoryMiB, cpus
```

Esperado: exclusões visíveis, backup com paths, Docker com `memoryMiB=4096, cpus=4`.

- [ ] **Step 3: Executar `status` após setup**

```powershell
pwsh -File scripts\dev-optimize.ps1 status
```

Esperado: `Defender: exclusões aplicadas ✓`, `WSearch: exclusões aplicadas ✓`, `Docker: 4 GB / 4 CPUs ✓`

- [ ] **Step 4: Executar `dev-on` (como Admin) e verificar serviços**

```powershell
pwsh -File scripts\dev-optimize.ps1 dev-on

# Verificar serviços parados:
Get-Service SysMain, DiagTrack, WerSvc | Select-Object Name, Status
```

Esperado: `Status = Stopped` nos 3 serviços (ou nos que estavam Running).

- [ ] **Step 5: Executar `dev-off` e verificar serviços retomados**

```powershell
pwsh -File scripts\dev-optimize.ps1 dev-off
Get-Service SysMain, DiagTrack | Select-Object Name, Status
```

Esperado: `Status = Running`.

- [ ] **Step 6: Commit final**

```powershell
git add scripts/dev-optimize.ps1
git commit -m "feat(dev-optimize): script completo e verificado"
```

---

## Critérios de Aceitação (do spec)

- [ ] `setup` aplica todas as exclusões sem erros e cria backup
- [ ] `dev-on` para os 3 serviços e confirma no terminal
- [ ] `dev-off` retoma apenas os serviços que `dev-on` parou (idempotente)
- [ ] `status` detecta correctamente se setup foi executado
- [ ] `reset` restaura ao estado pré-setup sem deixar resíduos
- [ ] Nenhum comando toca em iCloud, OneDrive ou Chrome
- [ ] `help` imprime documentação legível sem flags adicionais
