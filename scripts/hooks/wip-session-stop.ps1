# scripts/hooks/wip-session-stop.ps1 (versão com Agent Board)

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$wipFile     = Join-Path $projectRoot '.wip-session.md'
$boardFile   = Join-Path $projectRoot '.agent-board.json'
$stopFile    = "$env:TEMP\project-prev-stop.txt"
$promptFile  = "$env:TEMP\project-last-prompt.txt"
$threshold   = 3  # minutos

# 1. Notificação Windows (como antes)
$shouldNotify = $true
if ((Test-Path $stopFile) -and (Test-Path $promptFile)) {
    try {
        $idle = ([datetime](Get-Content $promptFile -Raw).Trim() -
                 [datetime](Get-Content $stopFile   -Raw).Trim()).TotalMinutes
        if ($idle -ge 0 -and $idle -lt $threshold) { $shouldNotify = $false }
    } catch {}
}
Get-Date -Format 'o' | Set-Content $stopFile -Encoding UTF8

if ($shouldNotify) {
    try {
        Add-Type -AssemblyName System.Windows.Forms -ErrorAction Stop
        $n = New-Object System.Windows.Forms.NotifyIcon
        $n.Icon = [System.Drawing.SystemIcons]::Information
        $n.Visible = $true
        $n.ShowBalloonTip(8000, 'Claude Code', 'Resposta pronta! Volta ao terminal.', 'Info')
        Start-Sleep -Milliseconds 400
        $n.Visible = $false
        $n.Dispose()
    } catch {}
}

# 2. Actualizar Agent Board — marcar sessão como inactiva
if (Test-Path $boardFile) {
    try {
        $board = Get-Content $boardFile -Raw -Encoding UTF8 | ConvertFrom-Json

        # Guardar info da última sessão antes de limpar
        if ($board.session.active -eq $true) {
            $lastCommit = (git log -1 --format="%h" 2>$null).Trim()
            $lastMsg    = (git log -1 --format="%s" 2>$null).Trim()
            $branch     = (git branch --show-current 2>$null).Trim()

            $board.last_session = @{
                agent      = $board.session.agent ?? 'claude-code'
                model      = $board.session.model ?? 'unknown'
                ended      = [datetime]::UtcNow.ToString('o')
                commit     = $lastCommit
                branch     = $branch
                status     = 'clean'
                task       = $board.session.task ?? ''
            }
            $board.git = @{
                branch           = $branch
                last_commit      = $lastCommit
                last_commit_msg  = $lastMsg
                build_status     = 'unknown'
                last_build_run   = ''
            }
        }

        # Limpar sessão activa
        $board.session  = @{ active = $false; agent = $null; model = $null; started = $null; task = $null; files_locked = @() }
        $board.updated  = [datetime]::UtcNow.ToString('o')

        $board | ConvertTo-Json -Depth 4 | Set-Content $boardFile -Encoding UTF8
    } catch {}
}

# 3. Mensagem no UI
$msg = if (Test-Path $wipFile) {
    "WIP activo em .wip-session.md — actualiza se mudaste de tarefa."
} else {
    "Sessao parou — cria .wip-session.md com o estado actual!"
}

@{ systemMessage = $msg } | ConvertTo-Json -Compress
