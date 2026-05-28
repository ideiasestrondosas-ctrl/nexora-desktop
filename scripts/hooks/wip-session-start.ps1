$f = 'C:\dev\nexora-desktop\.wip-session.md'
if (Test-Path $f) {
    $c = (Get-Content $f -Raw).Trim()
    $msg = "=== WIP SESSAO ANTERIOR ===`n$c`n=== FIM WIP ==="
    @{ hookSpecificOutput = @{ hookEventName = 'SessionStart'; additionalContext = $msg } } | ConvertTo-Json -Depth 3 -Compress
}
