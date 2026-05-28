$stopFile   = "$env:TEMP\nexora-prev-stop.txt"
$promptFile = "$env:TEMP\nexora-last-prompt.txt"
$threshold  = 3  # minutos de inactividade do utilizador para disparar toast

# Determinar se o utilizador estava ausente antes de enviar a ultima mensagem
$shouldNotify = $true
if ((Test-Path $stopFile) -and (Test-Path $promptFile)) {
    try {
        $prevStop   = [datetime](Get-Content $stopFile  -Raw).Trim()
        $lastPrompt = [datetime](Get-Content $promptFile -Raw).Trim()
        # Tempo que o utilizador demorou a responder apos o turn anterior
        $idleMinutes = ($lastPrompt - $prevStop).TotalMinutes
        if ($idleMinutes -ge 0 -and $idleMinutes -lt $threshold) {
            $shouldNotify = $false
        }
    } catch {}
}

# Guardar timestamp deste Stop para o proximo ciclo
Get-Date -Format 'o' | Set-Content $stopFile

if ($shouldNotify) {
    try {
        Add-Type -AssemblyName System.Windows.Forms -ErrorAction Stop
        $notify = New-Object System.Windows.Forms.NotifyIcon
        $notify.Icon = [System.Drawing.SystemIcons]::Information
        $notify.Visible = $true
        $notify.ShowBalloonTip(8000, 'Claude Code — Nexora Desktop', 'Aguarda resposta tua! Volta ao terminal.', 'Info')
        Start-Sleep -Milliseconds 500
        $notify.Visible = $false
        $notify.Dispose()
    } catch {}
}

# Mensagem no UI do Claude Code
$f = 'C:\dev\nexora-desktop\.wip-session.md'
if (Test-Path $f) {
    @{ systemMessage = "WIP activo em .wip-session.md — actualiza se mudaste de tarefa." } | ConvertTo-Json -Compress
} else {
    @{ systemMessage = "Sessao parou — actualiza .wip-session.md com o que estavas a trabalhar!" } | ConvertTo-Json -Compress
}
