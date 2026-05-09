#Requires -Version 5.1
# Nexora Desktop - Validacao completa do ambiente de desenvolvimento
# Verifica Claude Code e Google Antigravity em C:\Dev\nexora-desktop
# USAGE: powershell -ExecutionPolicy Bypass -File scripts\05-validate-environment.ps1
# Correr a partir de: C:\Dev\nexora-desktop

Set-StrictMode -Version Latest
$ErrorActionPreference = "Continue"

$WORKSPACE    = "C:\Dev\nexora-desktop"
$BASE_PROJECT = "C:\Dev\Nexora Media Processing"

$script:CountOK   = 0
$script:CountWARN = 0
$script:CountERR  = 0

function Hdr([string]$t)  { Write-Host ""; Write-Host "  ============================================" -ForegroundColor Cyan; Write-Host "  $t" -ForegroundColor Cyan; Write-Host "  ============================================" -ForegroundColor Cyan }
function OK([string]$t)   { Write-Host "  [OK]    $t" -ForegroundColor Green;   $script:CountOK++ }
function WARN([string]$t) { Write-Host "  [AVISO] $t" -ForegroundColor Yellow;  $script:CountWARN++ }
function ERR([string]$t)  { Write-Host "  [ERRO]  $t" -ForegroundColor Red;     $script:CountERR++ }
function INFO([string]$t) { Write-Host "          $t" -ForegroundColor Gray }
function FIX([string]$t)  { Write-Host "  -> FIX: $t" -ForegroundColor Cyan }

Clear-Host
Write-Host ""
Write-Host "  NEXORA DESKTOP - Relatorio de Validacao" -ForegroundColor Cyan
Write-Host "  $(Get-Date -Format 'yyyy-MM-dd HH:mm')" -ForegroundColor Gray
Write-Host ""

# ---- 1. FERRAMENTAS DO SISTEMA ------------------------------
Hdr "1. FERRAMENTAS DO SISTEMA"

try {
    $v = node --version 2>&1
    if ($v -match "v20\.") { OK "Node.js $v" }
    else { WARN "Node.js $v instalado mas recomendado v20.x"; FIX "choco install nodejs-lts -y" }
} catch { ERR "Node.js nao encontrado"; FIX "choco install nodejs-lts -y" }

try { $v = cargo --version 2>&1; OK "Rust: $v" }
catch { ERR "Rust nao encontrado"; FIX "choco install rustup.install -y" }

try {
    $v = git --version 2>&1; OK "Git: $v"
    $n = git config user.name 2>&1; $e = git config user.email 2>&1
    if ($n -and $n -ne "") { OK "Git identidade: $n <$e>" }
    else { WARN "Git sem identidade"; FIX "git config --global user.name 'Nome' && git config --global user.email 'email'" }
} catch { ERR "Git nao encontrado" }

try { OK "FFmpeg: $((ffmpeg -version 2>&1 | Select-Object -First 1))" }
catch { WARN "FFmpeg nao encontrado"; FIX "choco install ffmpeg -y" }

try { OK "Claude Code: $(claude --version 2>&1)" }
catch { ERR "Claude Code nao encontrado"; FIX "npm install -g @anthropic-ai/claude-code && claude login" }

try {
    $v = gh --version 2>&1 | Select-Object -First 1; OK "GitHub CLI: $v"
    if ((gh auth status 2>&1) -match "Logged in") { OK "GitHub CLI autenticado" }
    else { WARN "GitHub CLI nao autenticado"; FIX "gh auth login" }
} catch { WARN "GitHub CLI nao encontrado"; FIX "choco install gh -y" }

if ($env:ANTHROPIC_API_KEY) { OK "ANTHROPIC_API_KEY definida" }
else { WARN "ANTHROPIC_API_KEY nao definida (pode usar claude login)"; FIX "`$env:ANTHROPIC_API_KEY = 'sk-ant-...'" }

# ---- 2. WORKSPACE NEXORA DESKTOP ----------------------------
Hdr "2. WORKSPACE ($WORKSPACE)"

if (Test-Path $WORKSPACE) {
    OK "Workspace existe"
    Push-Location $WORKSPACE

    # Ficheiros criticos
    @("CLAUDE.md","BOUNDARIES.md","PROGRESS-DESKTOP.md","SYNC-STATE.md",
      "nexora-desktop-documento.md","nexora-desktop-guia-execucao.md",
      ".gitignore",".env.example","nexora-desktop.code-workspace",
      ".antigravity\rules.md",".antigravity\settings.json",
      ".agents\rules\graphify.md",".agents\rules\karpathy_guidelines.md",
      ".vscode\extensions.json") | ForEach-Object {
        if (Test-Path $_) { OK "$_" }
        else { ERR "$_ em falta"; FIX "Verifica a migracao (script 01)" }
    }

    # Git
    if (Test-Path ".git") {
        OK "Git inicializado"
        $branch = git branch --show-current 2>&1; OK "Branch: $branch"
        $remote = git remote get-url origin 2>&1
        if ($LASTEXITCODE -eq 0) {
            OK "Remote: $remote"
            if ($remote -match "nexora-desktop") { OK "Remote aponta para repositorio correcto" }
            else { WARN "Remote pode nao ser o repositorio correcto do desktop" }
        } else { WARN "Sem remote configurado"; FIX "Corre script 04-setup-github.ps1" }
    } else { ERR "Git nao inicializado"; FIX "git init && git add . && git commit -m 'initial'" }

    # .claude/settings.json
    if (Test-Path ".claude\settings.json") { OK ".claude\settings.json presente" }
    else { WARN ".claude\settings.json em falta"; FIX "Corre script 02-setup-claude-env.ps1" }

    Pop-Location
} else {
    ERR "Workspace nao encontrado: $WORKSPACE"
    FIX "Corre o script 01-migrate-workspace.ps1 a partir de 'C:\Dev\Nexora Media Processing'"
}

# ---- 3. PROJECTO BASE ---------------------------------------
Hdr "3. PROJECTO BASE (C:\Dev\Nexora Media Processing)"

if (Test-Path $BASE_PROJECT) {
    OK "Projecto base acessivel"
    @("package.json","docker-compose.yml",".antigravity\rules.md","PROGRESS.md") | ForEach-Object {
        $fp = Join-Path $BASE_PROJECT $_
        if (Test-Path $fp) { OK "Base intacto: $_" }
        else { WARN "Base: $_ nao encontrado" }
    }
    $old = Join-Path $BASE_PROJECT "nexora-desktop"
    if (Test-Path $old) {
        WARN "nexora-desktop\ ainda existe no projecto base - pode ser removida"
        FIX "Remove-Item '$old' -Recurse -Force  (depois de confirmar que migracao esta OK)"
    } else {
        OK "nexora-desktop\ removida do projecto base (migracao completa)"
    }
} else {
    ERR "Projecto base nao encontrado: $BASE_PROJECT"
    INFO "O projecto base e necessario como referencia (somente leitura)"
}

# ---- 4. SEPARACAO DOS AMBIENTES ANTIGRAVITY -----------------
Hdr "4. SEPARACAO DOS AMBIENTES ANTIGRAVITY"

$serverRules  = Join-Path $BASE_PROJECT ".antigravity\rules.md"
$desktopRules = Join-Path $WORKSPACE ".antigravity\rules.md"

if (Test-Path $serverRules)  { OK "Servidor: .antigravity\rules.md proprio (intacto)" }
else { WARN "Servidor: .antigravity\rules.md nao encontrado" }

if (Test-Path $desktopRules) {
    OK "Desktop: .antigravity\rules.md proprio"
    if ((Test-Path $serverRules) -and (Test-Path $desktopRules)) {
        $sc = Get-Content $serverRules -Raw 2>&1
        $dc = Get-Content $desktopRules -Raw 2>&1
        if ($sc -ne $dc) { OK "As regras sao diferentes (correcto - cada workspace tem as suas)" }
        else { WARN "As regras parecem identicas - deviam ser diferentes" }
    }
} else { ERR "Desktop: .antigravity\rules.md em falta"; FIX "Verifica a migracao" }

# ---- 5. TAURI SCAFFOLD (se existir) -------------------------
Hdr "5. TAURI SCAFFOLD (desenvolvimento)"

if (Test-Path (Join-Path $WORKSPACE "src-tauri")) {
    OK "src-tauri\ existe - scaffold criado"
    Push-Location (Join-Path $WORKSPACE "src-tauri")
    $cc = cargo check 2>&1
    if ($LASTEXITCODE -eq 0) { OK "cargo check - sem erros" }
    else { WARN "cargo check retornou erros" }
    Pop-Location
} else {
    INFO "src-tauri\ nao existe - scaffold ainda nao criado (normal em Fase 1)"
    INFO "Proximo passo: npm create tauri-app@latest . -- --template react-ts"
}

if (Test-Path (Join-Path $WORKSPACE "package.json")) {
    OK "package.json presente"
    if (Test-Path (Join-Path $WORKSPACE "node_modules")) { OK "node_modules presente" }
    else { WARN "node_modules em falta"; FIX "npm install" }
}

# ---- 6. GITHUB ----------------------------------------------
Hdr "6. REPOSITORIO GITHUB"

Push-Location $WORKSPACE -ErrorAction SilentlyContinue
$remote = git remote get-url origin 2>&1
if ($LASTEXITCODE -eq 0) {
    OK "Remote: $remote"
    $branches = git branch -r 2>&1
    if ($branches -match "origin/main") { OK "Branch main no remote" }
    else { WARN "Branch main nao encontrado no remote"; FIX "git push -u origin main" }
    if ($branches -match "origin/dev") { OK "Branch dev no remote" }
    else { WARN "Branch dev nao existe"; FIX "git checkout -b dev && git push -u origin dev && git checkout main" }
} else {
    WARN "Sem remote GitHub configurado"
    FIX "Corre script 04-setup-github.ps1"
}
Pop-Location -ErrorAction SilentlyContinue

# ---- RELATORIO FINAL ----------------------------------------
Write-Host ""
Write-Host "  ==================================================" -ForegroundColor Cyan
Write-Host "  RESULTADO FINAL" -ForegroundColor Cyan
Write-Host "  ==================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  [OK]    OK:      $($script:CountOK)" -ForegroundColor Green
Write-Host "  [AVISO] Avisos:  $($script:CountWARN)" -ForegroundColor Yellow
Write-Host "  [ERRO]  Erros:   $($script:CountERR)" -ForegroundColor Red
Write-Host ""

if ($script:CountERR -eq 0 -and $script:CountWARN -eq 0) {
    Write-Host "  AMBIENTE 100% PRONTO - podes iniciar o desenvolvimento!" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Claude Code:  cd `"$WORKSPACE`" && claude" -ForegroundColor Cyan
    Write-Host "  Antigravity:  Abre nexora-desktop.code-workspace" -ForegroundColor Cyan
} elseif ($script:CountERR -eq 0) {
    Write-Host "  Sem erros criticos - podes avancar." -ForegroundColor Green
    Write-Host "  Resolve os avisos quando possivel." -ForegroundColor Yellow
} else {
    Write-Host "  Existem $($script:CountERR) erros criticos - resolve antes de continuar." -ForegroundColor Red
    Write-Host "  Cada erro tem uma sugestao FIX: acima." -ForegroundColor Gray
}
Write-Host ""
Write-Host "  Gerado em: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
Write-Host ""
