# Hook UserPromptSubmit -- regista timestamp + avisa quando contexto esta a encher

# 1. Registar timestamp do ultimo prompt (usado pelo Stop hook para debounce)
Get-Date -Format 'o' | Set-Content "$env:TEMP\nexora-last-prompt.txt"

# 2. Ler dados do hook via stdin (Claude Code passa JSON com transcript_path, session_id, etc.)
# IsInputRedirected e falso quando o script corre manualmente no terminal -- evita bloqueio
$hookData = $null
if ([Console]::IsInputRedirected) {
    try {
        $raw = [Console]::In.ReadToEnd()
        if ($raw.Trim()) { $hookData = $raw | ConvertFrom-Json }
    } catch {}
}

# 3. Estimar uso do contexto pelo tamanho do ficheiro JSONL da sessao
# O transcript JSONL cresce com cada mensagem, tool call e resultado.
# Limiares calibrados para janela de 200K tokens (Claude Sonnet 4.6):
#   - JSONL tem overhead de metadata/JSON: ~1 byte no ficheiro por ~0.15 tokens
#   - 200K tokens * (1/0.15) bytes = ~1.3 MB para contexto cheio
#   - 75% = ~975 KB | 90% = ~1170 KB
$THRESHOLD_WARN_KB  = 975   # ~75% -- aviso precoce
$THRESHOLD_ALERT_KB = 1170  # ~90% -- alerta critico

$warningMsg = $null

$transcriptPath = if ($hookData -and $hookData.PSObject.Properties['transcript_path']) {
    $hookData.transcript_path
} else { $null }

if ($transcriptPath -and (Test-Path $transcriptPath)) {
    $sizeKB = [math]::Round((Get-Item $transcriptPath).Length / 1KB)
    # Percentagem estimada (cap a 99 para nao mostrar 100%+ antes do corte real)
    $pctFull = [math]::Min(99, [math]::Round($sizeKB / ($THRESHOLD_ALERT_KB / 0.90) * 100))

    if ($sizeKB -ge $THRESHOLD_ALERT_KB) {
        $warningMsg = "ALERTA CONTEXTO (~${pctFull}%): Janela de contexto quase cheia. Actualiza .wip-session.md AGORA com o estado exacto do trabalho (ficheiro, linha, proximo passo) e diz ao utilizador para escrever /clear."
    } elseif ($sizeKB -ge $THRESHOLD_WARN_KB) {
        $warningMsg = "AVISO CONTEXTO (~${pctFull}%): Contexto a 75%+. Quando terminares a resposta actual, actualiza .wip-session.md e sugere ao utilizador fazer /clear para continuar com contexto limpo."
    }
}

# 4. Fallback: contador de turnos (caso transcript_path nao esteja disponivel)
if (-not $warningMsg -and -not $transcriptPath) {
    $counterFile  = "$env:TEMP\nexora-turn-counter.txt"
    $sessionFile  = "$env:TEMP\nexora-session-id.txt"
    $currentSid   = if ($hookData -and $hookData.PSObject.Properties['session_id']) { $hookData.session_id } else { 'unknown' }
    $lastSid      = if (Test-Path $sessionFile) { (Get-Content $sessionFile -Raw).Trim() } else { '' }

    # Reset do contador em nova sessao
    if ($currentSid -ne $lastSid) {
        0 | Out-File $counterFile -Encoding utf8
        $currentSid | Out-File $sessionFile -Encoding utf8
    }

    $count = if (Test-Path $counterFile) { [int](Get-Content $counterFile -Raw).Trim() } else { 0 }
    $count++
    $count | Out-File $counterFile -Encoding utf8

    if ($count -ge 35) {
        $warningMsg = "ALERTA CONTEXTO (turno $count): Muitos turnos nesta sessao -- contexto provavelmente perto do limite. Actualiza .wip-session.md AGORA e diz ao utilizador para escrever /clear."
    } elseif ($count -ge 22) {
        $warningMsg = "AVISO CONTEXTO (turno $count): Sessao longa. Considera actualizar .wip-session.md e sugerir /clear ao utilizador."
    }
}

# 5. Emitir aviso como additionalContext (injectado no contexto do modelo)
if ($warningMsg) {
    @{
        hookSpecificOutput = @{
            hookEventName    = 'UserPromptSubmit'
            additionalContext = $warningMsg
        }
    } | ConvertTo-Json -Depth 3 -Compress
}
