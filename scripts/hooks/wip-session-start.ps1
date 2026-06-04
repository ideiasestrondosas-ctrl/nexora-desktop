# scripts/hooks/wip-session-start.ps1 (versão com Agent Board)

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$wipFile     = Join-Path $projectRoot '.wip-session.md'
$boardFile   = Join-Path $projectRoot '.agent-board.json'

$messages = @()

# 1. Ler WIP (como antes)
if (Test-Path $wipFile) {
    $wip = (Get-Content $wipFile -Raw -Encoding UTF8).Trim()
    $messages += "=== WIP SESSAO ANTERIOR ===`n$wip`n=== FIM WIP ==="
}

# 2. Ler Agent Board — detectar sessão activa de outro agente
if (Test-Path $boardFile) {
    try {
        $board = Get-Content $boardFile -Raw -Encoding UTF8 | ConvertFrom-Json
        $session = $board.session

        if ($session.active -eq $true) {
            # Verificar se a sessão não está abandonada (> 4h)
            $started  = [datetime]$session.started
            $ageHours = ([datetime]::UtcNow - $started).TotalHours

            if ($ageHours -lt 4) {
                $lockedFiles = ($session.files_locked | ForEach-Object { "  - $_" }) -join "`n"
                $alert = @"
ATENCAO: Ha uma sessao activa de outro agente!
  Agente  : $($session.agent) ($($session.model))
  Iniciada: $($session.started) (ha $([math]::Round($ageHours,1))h)
  Tarefa  : $($session.task)
  Ficheiros bloqueados:
$lockedFiles

NAO edites os ficheiros bloqueados sem confirmar com o utilizador.
"@
                $messages += $alert
            } else {
                # Sessão abandonada — limpar o board
                $board.session.active = $false
                $board.session.agent  = $null
                $board | ConvertTo-Json -Depth 4 | Set-Content $boardFile -Encoding UTF8
                $messages += "INFO: Sessao de $($session.agent) estava activa ha $([math]::Round($ageHours,1))h — marcada como abandonada."
            }
        }

        # Mostrar estado do último commit e build
        if ($board.git) {
            $messages += "Git: $($board.git.branch) @ $($board.git.last_commit) | Build: $($board.git.build_status)"
        }
    } catch {
        # Board corrompido — ignorar silenciosamente
    }
}

# Emitir contexto
if ($messages.Count -gt 0) {
    @{
        hookSpecificOutput = @{
            hookEventName     = 'SessionStart'
            additionalContext = ($messages -join "`n`n")
        }
    } | ConvertTo-Json -Depth 3 -Compress
}
