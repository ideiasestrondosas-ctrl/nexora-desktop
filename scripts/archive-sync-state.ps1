#!/usr/bin/env pwsh
# scripts/archive-sync-state.ps1
# Arquiva o conteudo acumulado do SYNC-STATE.md (sessoes antigas)
# e recria o ficheiro com apenas a sessao mais recente.
#
# Correr quando SYNC-STATE.md > 20 KB, ou no inicio de cada release.
# O arquivo fica em docs/sessions/ (pode ir para git como historico).
#
# Uso:
#   pwsh scripts/archive-sync-state.ps1
#   pwsh scripts/archive-sync-state.ps1 -DryRun   (so mostra, nao altera)

param([switch]$DryRun)

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$syncFile    = Join-Path $projectRoot 'SYNC-STATE.md'
$archiveDir  = Join-Path $projectRoot 'docs' 'sessions'

if (-not (Test-Path $syncFile)) {
    Write-Host "[ERRO] SYNC-STATE.md nao encontrado em $syncFile"
    exit 1
}

$sizeBefore = [math]::Round((Get-Item $syncFile).Length / 1KB, 1)
Write-Host "[INFO] SYNC-STATE.md actual: $sizeBefore KB"

$content = Get-Content $syncFile -Raw -Encoding UTF8
$lines   = $content -split "`n"

# Encontrar indices de todas as sessoes (linhas "### Sessao N")
$sessionStarts = @()
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match '^### Sess[aã]o \d+') {
        $sessionStarts += $i
    }
}

if ($sessionStarts.Count -lt 2) {
    Write-Host "[INFO] Menos de 2 sessoes documentadas — nada a arquivar."
    exit 0
}

Write-Host "[INFO] $($sessionStarts.Count) sessoes encontradas. A manter a mais recente."

# Separar: manter do inicio ate antes da 2a sessao; arquivar o resto
$cutLine     = $sessionStarts[1]
$keepLines   = $lines[0..($cutLine - 1)]
$archiveLines = $lines[$cutLine..($lines.Count - 1)]

$keepContent    = $keepLines    -join "`n"
$archiveContent = $archiveLines -join "`n"

if ($DryRun) {
    Write-Host "[DRY-RUN] Manteria $($keepLines.Count) linhas em SYNC-STATE.md"
    Write-Host "[DRY-RUN] Arquivaria $($archiveLines.Count) linhas"
    exit 0
}

# Criar pasta de arquivo
if (-not (Test-Path $archiveDir)) {
    New-Item -ItemType Directory -Path $archiveDir | Out-Null
}

# Nome do ficheiro de arquivo com data e versao (para nao sobrescrever)
$date        = Get-Date -Format 'yyyy-MM-dd'
$archiveFile = Join-Path $archiveDir "sync-state-$date.md"
$counter     = 1
while (Test-Path $archiveFile) {
    $archiveFile = Join-Path $archiveDir "sync-state-$date-$counter.md"
    $counter++
}

# Escrever arquivo
"# SYNC-STATE Archive — $date`n`n$archiveContent" | Set-Content $archiveFile -Encoding UTF8

# Reescrever SYNC-STATE.md so com a sessao mais recente
$keepContent | Set-Content $syncFile -Encoding UTF8

$sizeAfter   = [math]::Round((Get-Item $syncFile).Length / 1KB, 1)
$archiveSize = [math]::Round((Get-Item $archiveFile).Length / 1KB, 1)

Write-Host "[OK] Arquivado: $(Split-Path $archiveFile -Leaf) ($archiveSize KB)"
Write-Host "[OK] SYNC-STATE.md: $sizeBefore KB -> $sizeAfter KB (reducao de $([math]::Round(($sizeBefore - $sizeAfter) / $sizeBefore * 100))%)"
