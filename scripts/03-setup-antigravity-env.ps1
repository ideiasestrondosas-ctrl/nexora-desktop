#Requires -Version 5.1
# Nexora Desktop - Setup do ambiente Google Antigravity IDE
# Cria ficheiros de configuracao e mostra instrucoes de configuracao manual.
# USAGE: powershell -ExecutionPolicy Bypass -File scripts\03-setup-antigravity-env.ps1
# Correr a partir de: C:\Dev\nexora-desktop

Set-StrictMode -Version Latest
$WORKSPACE    = "C:\Dev\nexora-desktop"
$BASE_PROJECT = "C:\Dev\Nexora Media Processing"

function Hdr([string]$t)  { Write-Host ""; Write-Host "  ============================================" -ForegroundColor Cyan; Write-Host "  $t" -ForegroundColor Cyan; Write-Host "  ============================================" -ForegroundColor Cyan }
function OK([string]$t)   { Write-Host "  [OK]    $t" -ForegroundColor Green }
function WARN([string]$t) { Write-Host "  [AVISO] $t" -ForegroundColor Yellow }
function ERR([string]$t)  { Write-Host "  [ERRO]  $t" -ForegroundColor Red }
function INFO([string]$t) { Write-Host "          $t" -ForegroundColor Gray }

Clear-Host
Write-Host ""
Write-Host "  Nexora Desktop - Setup Google Antigravity IDE" -ForegroundColor Cyan
Write-Host ""

# ---- VERIFICAR FICHEIROS ------------------------------------
Hdr "VERIFICAR FICHEIROS DE CONFIGURACAO"
Push-Location $WORKSPACE

@(".antigravity\rules.md", ".antigravity\settings.json", ".agents\rules\graphify.md",
  ".agents\rules\karpathy_guidelines.md", "CLAUDE.md", "BOUNDARIES.md",
  "PROGRESS-DESKTOP.md", "nexora-desktop.code-workspace") | ForEach-Object {
    if (Test-Path $_) { OK "$_" }
    else { ERR "$_ em falta - verifica a migracao" }
}

# ---- VERIFICAR SEPARACAO DO SERVIDOR ------------------------
Hdr "VERIFICAR SEPARACAO DO SERVIDOR"
$serverRules  = Join-Path $BASE_PROJECT ".antigravity\rules.md"
$desktopRules = ".antigravity\rules.md"

if (Test-Path $serverRules)  { OK "Servidor tem .antigravity\rules.md proprio (intacto)" }
else { WARN "Servidor: .antigravity\rules.md nao encontrado" }

if (Test-Path $desktopRules) { OK "Desktop tem .antigravity\rules.md proprio" }
else { ERR "Desktop: .antigravity\rules.md em falta" }

Pop-Location

# ---- INSTRUCOES MANUAIS ------------------------------------
Hdr "PASSOS MANUAIS NO ANTIGRAVITY"

Write-Host ""
Write-Host "  PASSO 1 - Abrir o workspace correcto" -ForegroundColor White
Write-Host "  --------------------------------------" -ForegroundColor Gray
Write-Host "  1. Abre o Google Antigravity" -ForegroundColor Gray
Write-Host "  2. File -> Open Workspace from File" -ForegroundColor Gray
Write-Host "  3. Selecciona: $WORKSPACE\nexora-desktop.code-workspace" -ForegroundColor Gray
Write-Host ""
Write-Host "  PASSO 2 - Configurar Regras de IA" -ForegroundColor White
Write-Host "  -----------------------------------" -ForegroundColor Gray
Write-Host "  1. File -> Preferences -> Settings (Ctrl+,)" -ForegroundColor Gray
Write-Host "  2. Procura: AI Instructions ou Custom Instructions ou Rules for AI" -ForegroundColor Gray
Write-Host "  3. Cola EXACTAMENTE o texto abaixo:" -ForegroundColor Gray
Write-Host ""

Write-Host "  +-- COPIAR PARA O ANTIGRAVITY -----------------------------------------------+" -ForegroundColor Green
Write-Host "  |                                                                             |" -ForegroundColor Green
Write-Host "  |  NEXORA DESKTOP - Regras obrigatorias (workspace: C:\Dev\nexora-desktop)   |" -ForegroundColor White
Write-Host "  |                                                                             |" -ForegroundColor Green
Write-Host "  |  ANTES de qualquer trabalho, le SEMPRE:                                    |" -ForegroundColor White
Write-Host "  |  1. PROGRESS-DESKTOP.md  (estado do projecto)                              |" -ForegroundColor White
Write-Host "  |  2. SYNC-STATE.md        (o que o Claude fez recentemente)                 |" -ForegroundColor White
Write-Host "  |  3. BOUNDARIES.md        (zonas permitidas/proibidas)                      |" -ForegroundColor White
Write-Host "  |                                                                             |" -ForegroundColor Green
Write-Host "  |  WORKSPACE ACTIVO (podes escrever):                                        |" -ForegroundColor White
Write-Host "  |     C:\Dev\nexora-desktop\                                                 |" -ForegroundColor White
Write-Host "  |                                                                             |" -ForegroundColor Green
Write-Host "  |  PROJECTO BASE - NUNCA MODIFICAR:                                          |" -ForegroundColor White
Write-Host "  |     C:\Dev\Nexora Media Processing\                                        |" -ForegroundColor White
Write-Host "  |                                                                             |" -ForegroundColor Green
Write-Host "  |  REGRAS:                                                                    |" -ForegroundColor White
Write-Host "  |  - TypeScript strict - sem 'any' implicito                                 |" -ForegroundColor White
Write-Host "  |  - FFmpeg: execFile com array - NUNCA exec com string                      |" -ForegroundColor White
Write-Host "  |  - Codigo em ingles, comentarios em portugues de Portugal                  |" -ForegroundColor White
Write-Host "  |  - Paleta: #1A6FD4 (azul) e #4FB8A0 (verde)                               |" -ForegroundColor White
Write-Host "  |                                                                             |" -ForegroundColor Green
Write-Host "  |  APOS cada resposta com codigo:                                             |" -ForegroundColor White
Write-Host "  |  - Actualiza PROGRESS-DESKTOP.md                                           |" -ForegroundColor White
Write-Host "  |  - Actualiza SYNC-STATE.md                                                  |" -ForegroundColor White
Write-Host "  |                                                                             |" -ForegroundColor Green
Write-Host "  +-----------------------------------------------------------------------------+" -ForegroundColor Green

Write-Host ""
Write-Host "  PASSO 3 - Instalar Extensoes" -ForegroundColor White
Write-Host "  -----------------------------" -ForegroundColor Gray
Write-Host "  O ficheiro .vscode\extensions.json ja define as extensoes." -ForegroundColor Gray
Write-Host "  O Antigravity deve perguntar automaticamente." -ForegroundColor Gray
Write-Host "  Se nao perguntar, instala manualmente (Ctrl+Shift+X):" -ForegroundColor Gray
Write-Host "    ESLint, Prettier, Rust Analyzer, Tauri, GitLens, Error Lens" -ForegroundColor Gray
Write-Host ""
Write-Host "  PASSO 4 - Confirmar que nao esta aberto no servidor" -ForegroundColor White
Write-Host "  -----------------------------------------------------" -ForegroundColor Gray
Write-Host "  Confirma que o Antigravity esta aberto em C:\Dev\nexora-desktop" -ForegroundColor Gray
Write-Host "  e NAO em C:\Dev\Nexora Media Processing." -ForegroundColor Gray
Write-Host "  Podes ter ambos abertos em janelas SEPARADAS sem problema." -ForegroundColor Gray
Write-Host ""
Write-Host "  PASSO 5 - Primeiro Prompt no Antigravity" -ForegroundColor White
Write-Host "  ------------------------------------------" -ForegroundColor Gray
Write-Host "  Prime Ctrl+Shift+I para abrir o painel de IA e usa este prompt:" -ForegroundColor Gray
Write-Host ""

Write-Host "  +-- PRIMEIRO PROMPT NO ANTIGRAVITY ------------------------------------------+" -ForegroundColor Magenta
Write-Host "  |                                                                             |" -ForegroundColor Magenta
Write-Host "  |  Persona: Nexora Desktop Architect. Engenheiro Senior especialista         |" -ForegroundColor White
Write-Host "  |  em Tauri/Rust, React 18, TypeScript e processamento de media.            |" -ForegroundColor White
Write-Host "  |                                                                             |" -ForegroundColor Magenta
Write-Host "  |  Le estes ficheiros nesta ordem e confirma cada um:                        |" -ForegroundColor White
Write-Host "  |  1. PROGRESS-DESKTOP.md                                                    |" -ForegroundColor White
Write-Host "  |  2. SYNC-STATE.md                                                          |" -ForegroundColor White
Write-Host "  |  3. BOUNDARIES.md                                                          |" -ForegroundColor White
Write-Host "  |  4. nexora-desktop-documento.md (apenas o indice e PARTE 0)                |" -ForegroundColor White
Write-Host "  |                                                                             |" -ForegroundColor Magenta
Write-Host "  |  Depois diz-me:                                                            |" -ForegroundColor White
Write-Host "  |  a) O que esta concluido                                                   |" -ForegroundColor White
Write-Host "  |  b) O que esta por fazer                                                   |" -ForegroundColor White
Write-Host "  |  c) O que o Claude fez na ultima sessao                                    |" -ForegroundColor White
Write-Host "  |  d) Qual e o proximo passo exacto                                          |" -ForegroundColor White
Write-Host "  |                                                                             |" -ForegroundColor Magenta
Write-Host "  |  Workspace: C:\Dev\nexora-desktop                                          |" -ForegroundColor White
Write-Host "  |  Projecto base (so leitura): C:\Dev\Nexora Media Processing                |" -ForegroundColor White
Write-Host "  |                                                                             |" -ForegroundColor Magenta
Write-Host "  +-----------------------------------------------------------------------------+" -ForegroundColor Magenta

Write-Host ""
Write-Host "  Proximo passo: scripts\04-setup-github.ps1" -ForegroundColor Cyan
Write-Host ""
