#!/usr/bin/env pwsh
# scripts/init-agent-board.ps1
# Inicializa o .agent-board.json com o estado actual do git.
# Correr uma vez ao configurar o projecto, ou para resetar o board.

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$boardFile   = Join-Path $projectRoot '.agent-board.json'

$lastCommit = (git log -1 --format="%h" 2>$null).Trim()
$lastMsg    = (git log -1 --format="%s" 2>$null).Trim()
$branch     = (git branch --show-current 2>$null).Trim()

$board = [ordered]@{
    schema  = 1
    updated = [datetime]::UtcNow.ToString('o')
    session = [ordered]@{
        active       = $false
        agent        = $null
        model        = $null
        started      = $null
        task         = $null
        files_locked = @()
    }
    last_session = [ordered]@{
        agent   = 'init'
        model   = 'n/a'
        ended   = [datetime]::UtcNow.ToString('o')
        commit  = $lastCommit
        branch  = $branch
        status  = 'clean'
        task    = 'inicializacao do board'
    }
    git = [ordered]@{
        branch          = $branch
        last_commit     = $lastCommit
        last_commit_msg = $lastMsg
        build_status    = 'unknown'
        last_build_run  = ''
    }
}

$board | ConvertTo-Json -Depth 4 | Set-Content $boardFile -Encoding UTF8
Write-Host "[OK] .agent-board.json criado em $boardFile"
Write-Host "     Branch: $branch @ $lastCommit"
Write-Host "     Adiciona .agent-board.json ao .gitignore se ainda nao esta la."
