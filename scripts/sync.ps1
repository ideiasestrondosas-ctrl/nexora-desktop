param (
    [string]$Message,
    [switch]$SkipRelease,
    [switch]$Release,
    [switch]$PublishDraft,
    [switch]$Help
)

# Configuracoes de codificacao para o terminal — UTF-8 em todo o pipeline
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding  = [System.Text.Encoding]::UTF8  # decodifica output de git/externos como UTF-8

# Funcoes de Log (definidas cedo para usar no bloco Help)
function Write-Step($msg)    { Write-Host "[STEP]  $msg" -ForegroundColor Cyan }
function Write-Success($msg) { Write-Host "[OK]    $msg" -ForegroundColor Green }
function Write-Warn($msg)    { Write-Host "[WARN]  $msg" -ForegroundColor Yellow }
function Write-Err($msg)     { Write-Host "[ERROR] $msg" -ForegroundColor Red }
function Write-Info($msg)    { Write-Host "        $msg" -ForegroundColor Gray }

# ---------------------------------------------------------
# FUNCAO: Merge dev -> main (reutilizavel)
# ---------------------------------------------------------
function Invoke-MergeToMain($targetVersion, $sourceBranch, $authUrl) {
    Write-Step "Modo Release: a fazer merge $sourceBranch -> main..."

    git checkout main 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Err "Nao foi possivel mudar para main"
        return $false
    }

    # Sincronizar com origin/main (que pode ter history reescrito)
    git fetch origin main 2>&1 | Out-Null
    git reset --hard origin/main 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Err "Nao foi possivel sincronizar com origin/main"
        git checkout $sourceBranch 2>&1 | Out-Null
        return $false
    }

    # Merge normal com theirs: evita conflitos recorrentes ao actualizar merge-base
    git merge -X theirs --no-edit $sourceBranch 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Err "Merge falhou. Possiveis conflitos de ficheiros."
        Write-Info "Resolva manualmente: git checkout main && git merge -X theirs --no-edit $sourceBranch"
        git checkout $sourceBranch 2>&1 | Out-Null
        return $false
    }

    if ($authUrl) {
        git push -u "$authUrl" main --tags 2>&1
    } else {
        git push -u origin main --tags 2>&1
    }

    if ($LASTEXITCODE -eq 0) {
        Write-Success "main actualizado com v$targetVersion!"
    } else {
        Write-Err "Push para main falhou"
    }

    # Voltar para dev
    git checkout $sourceBranch 2>&1 | Out-Null
    Write-Success "De volta ao branch $sourceBranch"
    return $true
}

# ---------------------------------------------------------
# FUNCAO: Monitorizar GitHub Actions apos release
# ---------------------------------------------------------
function Watch-GitHubActions($sha, $version, $token, $branch = "main") {
    $headers   = @{ "Authorization" = "token $token"; "Accept" = "application/vnd.github+json" }
    # Usa branch em vez de head_sha para apanhar sempre o run mais recente,
    # mesmo após um push de correcção (fix do cargo fmt, lint, etc.)
    $apiUrl    = "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/actions/runs?branch=$branch&per_page=20"
    $targets   = @("CI — Verificacao de Qualidade", "Build Nexora Desktop")
    $startTime = Get-Date

    Write-Host ""
    Write-Host "  [AGUARDAR] GitHub Actions — v$version  ·  branch: $branch  ·  Ctrl+C para sair" -ForegroundColor Cyan

    while ($true) {
        $runs = @()
        try {
            $resp = Invoke-RestMethod -Uri $apiUrl -Headers $headers -Method Get -ErrorAction Stop
            $runs = @($resp.workflow_runs | Where-Object { $targets -contains $_.name })
        } catch {
            Write-Warn "Erro ao consultar API GitHub: $($_.Exception.Message)"
        }

        $elapsed    = [math]::Round(((Get-Date) - $startTime).TotalSeconds)
        $elapsedStr = if ($elapsed -lt 60) { "${elapsed}s" } else { "$([math]::Floor($elapsed/60))m$($elapsed % 60)s" }

        if ($runs.Count -eq 0) {
            Write-Host "  A aguardar inicio dos Actions... (elapsed: $elapsedStr)" -ForegroundColor Gray
            Start-Sleep -Seconds 30
            continue
        }

        Write-Host ""
        Write-Host "  [AGUARDAR] GitHub Actions — v$version  ·  elapsed: $elapsedStr  ·  Ctrl+C para sair" -ForegroundColor Cyan
        Write-Host ""

        $allDone   = $true
        $anyFailed = $false

        foreach ($wfName in $targets) {
            # Pegar sempre o run MAIS RECENTE para este workflow (Sort por created_at desc)
            $run = $runs | Where-Object { $_.name -eq $wfName } | Sort-Object { [datetime]$_.created_at } -Descending | Select-Object -First 1

            if (-not $run) {
                Write-Host ("  ⏳  " + $wfName.PadRight(42) + " em fila") -ForegroundColor Gray
                $allDone = $false
                continue
            }

            $runSec = [math]::Round(((Get-Date) - [datetime]$run.created_at).TotalSeconds)
            $runStr = if ($runSec -lt 60) { "${runSec}s" } else { "$([math]::Floor($runSec/60))m$($runSec % 60)s" }

            switch ($run.status) {
                "queued" {
                    Write-Host ("  ⏳  " + $wfName.PadRight(42) + " em fila        ($runStr)") -ForegroundColor Gray
                    $allDone = $false
                }
                "in_progress" {
                    Write-Host ("  ⏳  " + $wfName.PadRight(42) + " a correr       ($runStr)") -ForegroundColor Yellow
                    $allDone = $false
                }
                "completed" {
                    if ($run.conclusion -eq "success") {
                        Write-Host ("  ✅  " + $wfName.PadRight(42) + " sucesso        ($runStr)") -ForegroundColor Green
                    } else {
                        $label = if ($run.conclusion) { $run.conclusion } else { "falhou" }
                        Write-Host ("  ❌  " + $wfName.PadRight(42) + " $($label.PadRight(15)) ($runStr)") -ForegroundColor Red
                        Write-Host "       $($run.html_url)" -ForegroundColor DarkRed
                        Write-Host "       (a aguardar novo push para retry...)" -ForegroundColor DarkGray
                        $anyFailed = $true
                        # Não marca como allDone — mantém loop à espera de novo push
                        $allDone = $false
                    }
                }
            }
        }

        if ($allDone) {
            Write-Host ""
            Write-Success "Todos os Actions passaram! Release v$version concluida."
            return
        }

        # Se só há falhas e nenhum workflow está em progresso, espera por novo push
        $anyActive = $runs | Where-Object { $_.name -in $targets -and $_.status -in @("queued","in_progress") }
        if ($anyFailed -and -not $anyActive) {
            Write-Host ""
            Write-Host "  💡  Corrige os erros, faz push, e o monitor actualiza automaticamente." -ForegroundColor Yellow
        }

        Start-Sleep -Seconds 30
    }
}

# ---------------------------------------------------------
# FUNCAO: Detectar se versao e pre-release (alpha/beta/rc/dev/pre)
# ---------------------------------------------------------
function Get-IsPreRelease([string]$version) {
    return [bool]($version -match '-(?:alpha|beta|rc|dev|pre)\.')
}

# ---------------------------------------------------------
# FUNCAO: Gerar titulo automatico da release
# ---------------------------------------------------------
function Get-ReleaseTitle($version, $changelogSection) {
    $lines = $changelogSection -split "`n"
    $features = @()
    $fixes = @()
    $docs = @()
    $infra = @()
    $currentCategory = ""

    foreach ($line in $lines) {
        $trimmed = $line.Trim()
        # Detectar categoria atual (secao ### Added, ### Fixed, etc.)
        if ($trimmed -match "^###\s+(.+)$") {
            $currentCategory = $matches[1].Trim().ToLower()
            continue
        }
        if ($trimmed -match "^-\s*(.+)$") {
            $item = $matches[1].Trim()
            # Classificar primeiro pela categoria, depois pelo conteudo do item
            switch -Regex ($currentCategory) {
                "fix|security|bug" { $fixes += $item; continue }
                "added|add|feature|feat|new" { $features += $item; continue }
                "changed|change|updated|update|refactor|style" { $features += $item; continue }
                "docs|doc|infrastructure|infra|i18n|test|build|ci" { $docs += $item; continue }
            }
            # Fallback: classificar pelo conteudo do item
            if ($item -match "(?i)fix|corrig|bug|crash|falha|erro|timeout|mutex|poison|race|bloqueio") {
                $fixes += $item
            } elseif ($item -match "(?i)doc|manual|guia|screenshot|readme|changelog") {
                $docs += $item
            } elseif ($item -match "(?i)ci/cd|pipeline|workflow|dependabot|lint|format|build|infrastructure|plugin|depend") {
                $infra += $item
            } else {
                $features += $item
            }
        }
    }

    # Extrair nome da feature principal (primeira feature ou primeiro item se so houver um tipo)
    $featureName = ""
    if ($features.Count -gt 0) {
        $firstFeature = $features[0]
        # Remover prefixos de conventional commits (feat:, fix:, docs:, etc.)
        $firstFeature = $firstFeature -replace '^\s*(feat|fix|docs|style|refactor|chore|test|build|ci)(\([^)]*\))?:\s*', ''
        # Extrair nome curto: ate primeira virgula, ponto, ou "com", "para", "no", "em"
        if ($firstFeature -match '^(.*?)(?:,|\.|\s+com\s+|\s+para\s+|\s+no\s+|\s+em\s+|\s+—\s+)') {
            $featureName = $matches[1].Trim()
        } else {
            $featureName = $firstFeature
        }
        # Limitar a 40 chars
        if ($featureName.Length -gt 40) {
            $featureName = $featureName.Substring(0, 40).TrimEnd()
        }
    }

    # Determinar combinacao de tipos
    $hasFeatures = $features.Count -gt 0
    $hasFixes = $fixes.Count -gt 0
    $hasDocs = $docs.Count -gt 0
    $hasInfra = $infra.Count -gt 0

    if ($hasFeatures -and $hasFixes) {
        if ($featureName) {
            return "$featureName, Bug Fixes & Platform Polish"
        } else {
            return "Bug Fixes & Platform Polish"
        }
    } elseif ($hasFeatures) {
        if ($featureName) {
            return "$featureName & Enhancements"
        } else {
            return "New Features & Enhancements"
        }
    } elseif ($hasFixes) {
        return "Bug Fixes & Stability"
    } elseif ($hasDocs -or $hasInfra) {
        return "Documentation & Platform Updates"
    } else {
        return "Nexora Desktop v$version"
    }
}

# ---------------------------------------------------------
# FUNCAO: Extrair secao da versao do CHANGELOG.md
# ---------------------------------------------------------
function Parse-ChangelogSection($version) {
    $changelogPath = Join-Path $WORKSPACE "CHANGELOG.md"
    if (-not (Test-Path $changelogPath)) {
        return $null
    }

    $content = Get-Content $changelogPath -Raw -Encoding utf8
    # Procurar secao ## [X.Y.Z] ate a proxima ## [ ou fim do ficheiro
    # (?s) ativa single-line mode (. captura newlines); $ so matcha fim de string
    $pattern = "(?s)## \[$version\].*?(?=## \[|$)"
    if ($content -match $pattern) {
        $section = $matches[0].Trim()
        # Remover a linha de cabecalho (## [X.Y.Z] - data)
        $lines = $section -split "`n"
        $cleanLines = @()
        $skipHeader = $true
        foreach ($line in $lines) {
            if ($skipHeader -and $line -match "^## \[$version\]") {
                $skipHeader = $false
                continue
            }
            $cleanLines += $line
        }
        return ($cleanLines -join "`n").Trim()
    }
    return $null
}

# ---------------------------------------------------------
# FUNCAO: Montar corpo estruturado da release
# ---------------------------------------------------------
function Build-ReleaseBody($version, $commitMsg) {
    $body = ""

    # Prioridade 1: release-notes-vX.Y.Z.md
    $releaseNotesPath = Join-Path $WORKSPACE "release-notes-v$version.md"
    if (Test-Path $releaseNotesPath) {
        $notesContent = Get-Content $releaseNotesPath -Raw -Encoding utf8
        # Remover o header "## What's New" se existir para evitar duplicacao
        $notesContent = $notesContent -replace "^## What's New\s*`n+", ""
        $body = $notesContent.Trim()
        Write-Info "Corpo da release: release-notes-v$version.md (prioridade 1)"
        return $body
    }

    # Prioridade 2: CHANGELOG.md
    $changelogSection = Parse-ChangelogSection $version
    if ($changelogSection) {
        Write-Info "Corpo da release: CHANGELOG.md secao v$version (prioridade 2)"

        # Analisar e categorizar itens
        $lines = $changelogSection -split "`n"
        $bugFixes = @()
        $newFeatures = @()
        $changed = @()
        $docsInfra = @()
        $currentCategory = ""

        foreach ($line in $lines) {
            $trimmed = $line.Trim()
            if ($trimmed -match "^###\s+(.+)$") {
                $currentCategory = $matches[1].Trim().ToLower()
                continue
            }
            if ($trimmed -match "^-\s*(.+)$") {
                $item = $matches[1].Trim()
                switch -Regex ($currentCategory) {
                    "fix|security" { $bugFixes += $item }
                    "added|add|feature|feat|new" { $newFeatures += $item }
                    "changed|change|updated|update|refactor|style" { $changed += $item }
                    "docs|doc|infrastructure|infra|i18n|test|build|ci" { $docsInfra += $item }
                    default {
                        # Inferir do conteudo do item
                        if ($item -match "(?i)fix|corrig|bug|crash|falha|erro") {
                            $bugFixes += $item
                        } elseif ($item -match "(?i)doc|manual|guia|screenshot|traduc|i18n|locale") {
                            $docsInfra += $item
                        } elseif ($item -match "(?i)ci/cd|pipeline|workflow|dependabot|build|plugin") {
                            $docsInfra += $item
                        } else {
                            $newFeatures += $item
                        }
                    }
                }
            }
        }

        # Montar corpo estruturado
        $parts = @()

        if ($newFeatures.Count -gt 0) {
            $parts += "### New Features"
            foreach ($feat in $newFeatures) {
                $parts += "- $feat"
            }
            $parts += ""
        }

        if ($bugFixes.Count -gt 0) {
            $parts += "### Bug Fixes"
            foreach ($fix in $bugFixes) {
                $parts += "- $fix"
            }
            $parts += ""
        }

        if ($changed.Count -gt 0) {
            $parts += "### Changed"
            foreach ($chg in $changed) {
                $parts += "- $chg"
            }
            $parts += ""
        }

        if ($docsInfra.Count -gt 0) {
            $parts += "### Infrastructure & Documentation"
            foreach ($di in $docsInfra) {
                $parts += "- $di"
            }
            $parts += ""
        }

        $parts += "---"
        $parts += ""
        $parts += "### Installers"
        $parts += ""
        $parts += "| Platform | File |"
        $parts += "| -------- | ---- |"
        $parts += "| Windows | `.msi` or `.exe` (NSIS) |"
        $parts += "| macOS | `.dmg` (Universal: Intel + Apple Silicon) |"
        $parts += "| Linux | `.deb` (Debian/Ubuntu) or `.AppImage` |"
        $parts += ""
        $parts += "See [CHANGELOG.md](CHANGELOG.md) for full details."

        return ($parts -join "`n")
    }

    # Prioridade 3: fallback com mensagem de commit
    Write-Info "Corpo da release: fallback com mensagem de commit (prioridade 3)"
    return "### Changes in this version`n`n- $commitMsg`n`nSee [CHANGELOG.md](CHANGELOG.md) for full details."
}

# ---------------------------------------------------------
# FUNCAO: Detectar/Identificar Agente (Claude/Antigravity/OpenCode)
# ---------------------------------------------------------
function Get-AgentInfo {
    $detectedAgent = $null
    $detectedModel = $null

    # 1. Tentar ler do SYNC-STATE.md (ultima sessao)
    $syncStatePath = Join-Path $WORKSPACE "SYNC-STATE.md"
    if (Test-Path $syncStatePath) {
        $syncContent = Get-Content $syncStatePath -Raw
        # Procurar "Agente: ..." na primeira parte do ficheiro
        if ($syncContent -match '(?m)^Agente:\s*(.+)$') {
            $detectedAgent = $matches[1].Trim()
        }
    }

    # 2. Tentar variavel de ambiente NEXORA_AGENT
    if (-not $detectedAgent -and $env:NEXORA_AGENT) {
        $detectedAgent = $env:NEXORA_AGENT.Trim()
    }

    # 3. Tentar ficheiro .agent no workspace
    $agentFile = Join-Path $WORKSPACE ".agent"
    if (-not $detectedAgent -and (Test-Path $agentFile)) {
        $agentContent = Get-Content $agentFile -Raw
        if ($agentContent -match 'agent\s*=\s*"([^"]+)"') {
            $detectedAgent = $matches[1].Trim()
        } elseif ($agentContent -match '^(.+)$') {
            $detectedAgent = $agentContent.Trim()
        }
    }

    # 4. Pergunta interativa se nao detectou
    if (-not $detectedAgent) {
        Write-Host ""
        Write-Host "Agente nao detectado automaticamente." -ForegroundColor Yellow
        Write-Host "[1] Claude Code" -ForegroundColor Cyan
        Write-Host "[2] Google Antigravity" -ForegroundColor Cyan
        Write-Host "[3] OpenCode" -ForegroundColor Cyan
        Write-Host "[4] Outro (especificar)" -ForegroundColor Cyan
        Write-Host "[Enter] para continuar sem agente" -ForegroundColor Gray
        $agentChoice = Read-Host "Escolha"
        switch ($agentChoice) {
            "1" { $detectedAgent = "Claude Code"; $detectedModel = Read-Host "Modelo (ex: claude-sonnet-4-6) [opcional, Enter para ignorar]" }
            "2" { $detectedAgent = "Google Antigravity"; $detectedModel = Read-Host "Modelo [opcional]" }
            "3" { $detectedAgent = "OpenCode"; $detectedModel = Read-Host "Modelo [opcional]" }
            "4" { $detectedAgent = Read-Host "Nome do agente"; $detectedModel = Read-Host "Modelo [opcional]" }
            default { $detectedAgent = "Agente nao especificado" }
        }
    } else {
        # Confirmar agente detectado
        Write-Host ""
        Write-Host "Agente detectado: $detectedAgent" -ForegroundColor Cyan
        if ($detectedModel) {
            Write-Host "Modelo: $detectedModel" -ForegroundColor Gray
        }
        $confirm = Read-Host "Confirmar agente? [S/N] (Padrao: S)"
        if ($confirm -match '^[Nn]$') {
            $detectedAgent = Read-Host "Nome do agente"
            $detectedModel = Read-Host "Modelo [opcional]"
        }
    }

    $result = @{ Agent = $detectedAgent; Model = $detectedModel }
    return $result
}

# ---------------------------------------------------------
# FUNCAO: Listar commits desde a ultima tag
# ---------------------------------------------------------
function Get-CommitsSinceLastTag {
    $lastTag = git describe --tags --abbrev=0 2>$null
    if (-not $lastTag) {
        Write-Warn "Nenhuma tag encontrada. A usar todos os commits do branch."
        $commits = git log --pretty=format:"%h|%s" --no-merges
    } else {
        $commits = git log "${lastTag}..HEAD" --pretty=format:"%h|%s" --no-merges
    }

    $commitList = @()
    foreach ($line in $commits -split "`n") {
        if ($line -match '^([^|]+)\|(.+)$') {
            $commitList += @{
                Hash    = $matches[1].Trim()
                Message = $matches[2].Trim()
            }
        }
    }
    return $commitList
}

# ---------------------------------------------------------
# FUNCAO: Categorizar commits em Added/Fixed/Changed/Infra/Docs
# ---------------------------------------------------------
function CategorizeCommits($commits) {
    $added   = @()
    $fixed  = @()
    $changed = @()
    $infra   = @()
    $docs    = @()
    $other  = @()

    foreach ($c in $commits) {
        $msg = $c.Message
        $cleanMsg = $msg -replace '^(feat|fix|docs|style|refactor|chore|test|build|ci)(\([^)]*\))?:\s*', ''

        if ($msg -match '^(feat|feature)') { $added += $cleanMsg }
        elseif ($msg -match '^(fix|bug|hotfix)') { $fixed += $cleanMsg }
        elseif ($msg -match '^(refactor|style|perf|update)') { $changed += $cleanMsg }
        elseif ($msg -match '^(docs|doc)') { $docs += $cleanMsg }
        elseif ($msg -match '^(build|ci|chore|deps|infra|test)') { $infra += $cleanMsg }
        else { $other += $cleanMsg }
    }

    return @{
        Added   = $added
        Fixed   = $fixed
        Changed = $changed
        Infra   = $infra
        Docs    = $docs
        Other   = $other
    }
}

# ---------------------------------------------------------
# FUNCAO: Gerar ficheiro release-notes-vX.Y.Z.md
# ---------------------------------------------------------
function Generate-ReleaseNotesFile($version, $categorized, $sessionInfo) {
    $lines = @()

    # Resumo: uma linha descritiva baseada no conteudo
    $totalItems = 0
    foreach ($key in @('Added','Fixed','Changed','Infra','Docs','Other','Security','i18n','Documentation','Infrastructure','Deprecated','Removed')) {
        if ($categorized.ContainsKey($key)) { $totalItems += $categorized[$key].Count }
    }
    $lines += "## Resumo"
    $lines += ""
    $lines += "Release v$version — $totalItems alteracoes."
    $lines += ""

    if ($categorized.Added.Count -gt 0) {
        $lines += "## Novas Funcionalidades"
        $lines += ""
        foreach ($item in $categorized.Added) { $lines += "- $item" }
        $lines += ""
    }

    if ($categorized.Fixed.Count -gt 0) {
        $lines += "## Correccoes"
        $lines += ""
        foreach ($item in $categorized.Fixed) { $lines += "- $item" }
        $lines += ""
    }

    if ($categorized.Changed.Count -gt 0) {
        $lines += "## Alteracoes"
        $lines += ""
        foreach ($item in $categorized.Changed) { $lines += "- $item" }
        $lines += ""
    }

    # Melhorias = Security + i18n juntos (categorias especiais do CategorizeCommits expandido)
    $melhorias = @()
    foreach ($key in @('Security','i18n')) {
        if ($categorized.ContainsKey($key)) { $melhorias += $categorized[$key] }
    }
    if ($melhorias.Count -gt 0) {
        $lines += "## Melhorias"
        $lines += ""
        foreach ($item in $melhorias) { $lines += "- $item" }
        $lines += ""
    }

    # Infra / Docs — agrupados
    $infraDocs = @()
    foreach ($key in @('Infra','Docs','Documentation','Infrastructure','Other')) {
        if ($categorized.ContainsKey($key)) { $infraDocs += $categorized[$key] }
    }
    if ($infraDocs.Count -gt 0) {
        $lines += "## Infraestrutura e Documentacao"
        $lines += ""
        foreach ($item in $infraDocs) { $lines += "- $item" }
        $lines += ""
    }

    # Session info — breaking changes e dependencias
    if ($sessionInfo -and $sessionInfo.BreakingChanges.Count -gt 0) {
        $lines += "## :warning: Breaking Changes"
        $lines += ""
        foreach ($item in $sessionInfo.BreakingChanges) { $lines += "- $item" }
        $lines += ""
    }

    if ($sessionInfo -and ($sessionInfo.DependenciesAdded.Count -gt 0 -or $sessionInfo.DependenciesRemoved.Count -gt 0)) {
        $lines += "## Dependencias"
        $lines += ""
        if ($sessionInfo.DependenciesAdded.Count -gt 0) {
            $lines += "**Adicionadas:**"
            foreach ($item in $sessionInfo.DependenciesAdded) { $lines += "- $item" }
        }
        if ($sessionInfo.DependenciesRemoved.Count -gt 0) {
            $lines += "**Removidas:**"
            foreach ($item in $sessionInfo.DependenciesRemoved) { $lines += "- $item" }
        }
        $lines += ""
    }

    $lines += "---"
    $lines += ""
    $lines += "## Instaladores"
    $lines += ""
    $lines += "| Plataforma | Ficheiro                                  |"
    $lines += "| ---------- | ----------------------------------------- |"
    $lines += "| Windows    | `.msi` ou `.exe` (NSIS)                   |"
    $lines += "| macOS      | `.dmg` (Universal: Intel + Apple Silicon) |"
    $lines += "| Linux      | `.deb` (Debian/Ubuntu) ou `.AppImage`     |"
    $lines += ""
    $lines += "Consulta o [CHANGELOG.md](CHANGELOG.md) para detalhes das alteracoes."

    $content = $lines -join "`n"
    $filePath = Join-Path $WORKSPACE "release-notes-v$version.md"
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($filePath, $content, $utf8NoBom)
    return $filePath
}

# ---------------------------------------------------------
# FUNCAO: Atualizar SYNC-STATE.md com nova sessao
# ---------------------------------------------------------
function Update-SyncState($version, $agentInfo, $categorized, $filesChanged, $sessionInfo) {
    $syncPath = Join-Path $WORKSPACE "SYNC-STATE.md"
    if (-not (Test-Path $syncPath)) {
        Write-Warn "SYNC-STATE.md nao encontrado. A criar..."
        $syncContent = "# Estado de Sincronizacao - Nexora Desktop`n`n"
    } else {
        $syncContent = Get-Content $syncPath -Raw
    }

    # Detectar proximo numero de sessao
    $lastSession = 0
    if ($syncContent -match '(?m)^### Sessao (\d+)') {
        $lastSession = [int]$matches[1]
        # Procurar o maior numero de sessao
        $allSessions = [regex]::Matches($syncContent, '(?m)^### Sessao (\d+)')
        foreach ($m in $allSessions) {
            $num = [int]$m.Groups[1].Value
            if ($num -gt $lastSession) { $lastSession = $num }
        }
    }
    $newSessionNum = $lastSession + 1
    $date = Get-Date -Format "yyyy-MM-dd"
    $agentStr = $agentInfo.Agent
    if ($agentInfo.Model) { $agentStr += " ($($agentInfo.Model))" }

    # Contar itens por categoria
    $totalItems = $categorized.Added.Count + $categorized.Fixed.Count + $categorized.Changed.Count + $categorized.Docs.Count + $categorized.Infra.Count + $categorized.Other.Count

    # Construir nova entrada
    $newEntry = @"
### Sessao $newSessionNum — Release v$version — CONCLUIDO

**Agente:** $agentStr  
**Data:** $date

**Resumo:** $(if ($totalItems -gt 0) { "$totalItems itens" } else { "Release v$version" })

$(if ($categorized.Added.Count -gt 0) { "**Novas funcionalidades:**`n" + ($categorized.Added | ForEach-Object { "- $_" } | Join-String "`n") + "`n`n" })
$(if ($categorized.Fixed.Count -gt 0) { "**Correcoes:**`n" + ($categorized.Fixed | ForEach-Object { "- $_" } | Join-String "`n") + "`n`n" })
$(if ($categorized.Changed.Count -gt 0) { "**Alteracoes:**`n" + ($categorized.Changed | ForEach-Object { "- $_" } | Join-String "`n") + "`n`n" })
$(if ($categorized.Infra.Count -gt 0) { "**Infraestrutura:**`n" + ($categorized.Infra | ForEach-Object { "- $_" } | Join-String "`n") + "`n`n" })
$(if ($categorized.Docs.Count -gt 0) { "**Documentacao:**`n" + ($categorized.Docs | ForEach-Object { "- $_" } | Join-String "`n") + "`n`n" })
$(if ($filesChanged.Count -gt 0) { "**Ficheiros alterados:** $(($filesChanged | Select-Object -First 10) -join ', ')$(if ($filesChanged.Count -gt 10) { " e mais $($filesChanged.Count - 10)" })`n`n" })
$(if ($sessionInfo.NotesNextAgent) { "**Notas para o proximo agente:**`n$($sessionInfo.NotesNextAgent)`n`n" })
---

"@

    # Inserir apos "## O que foi feito"
    if ($syncContent -match '(?m)^## O que foi feito\s*$') {
        $syncContent = $syncContent -replace '(?m)^## O que foi feito\s*$', "## O que foi feito`n`n$newEntry"
    } else {
        $syncContent = $newEntry + $syncContent
    }

    # Atualizar header
    $syncContent = $syncContent -replace '(?m)^Actualizado:.*$', "Actualizado: $date"
    $syncContent = $syncContent -replace '(?m)^Agente:.*$', "Agente: $agentStr"

    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($syncPath, $syncContent, $utf8NoBom)
    Write-Success "SYNC-STATE.md actualizado (Sessao $newSessionNum)"
}

# ---------------------------------------------------------
# FUNCAO: Atualizar src/lib/version.ts
# ---------------------------------------------------------
function Update-VersionTs($version, $categorized) {
    $versionPath = Join-Path $WORKSPACE "src\lib\version.ts"
    if (-not (Test-Path $versionPath)) {
        Write-Warn "src/lib/version.ts nao encontrado — a ignorar"
        return
    }

    $content = Get-Content $versionPath -Raw
    $date = Get-Date -Format "yyyy-MM-dd"

    # Construir descricao resumida
    $descParts = @()
    if ($categorized.Added.Count -gt 0) {
        $descParts += ($categorized.Added | Select-Object -First 2) -join ", "
    }
    if ($categorized.Fixed.Count -gt 0) {
        $descParts += ($categorized.Fixed | Select-Object -First 2) -join ", "
    }
    $description = "v$version"
    if ($descParts.Count -gt 0) {
        $description += ": " + ($descParts -join ", ")
    }
    # Limitar descricao
    if ($description.Length -gt 200) {
        $description = $description.Substring(0, 197).TrimEnd() + "..."
    }

    # Verificar se entrada ja existe
    if ($content -match "version:\s*'$version'") {
        Write-Warn "Entrada v$version ja existe em version.ts — a ignorar"
        return
    }

    # Atualizar APP_VERSION
    $content = $content -replace "APP_VERSION\s*=\s*'[^']+'", "APP_VERSION = '$version'"

    # Adicionar nova entrada no topo do array
    $newEntry = @"
  {
    version: '$version',
    description:
      '$description.',
  },
"@

    # Procurar inicio do array VERSION_HISTORY
    $pattern = '(export const VERSION_HISTORY: VersionEntry\[\] = \[)'
    $content = $content -replace $pattern, "$1`n$newEntry"

    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($versionPath, $content, $utf8NoBom)
    Write-Success "src/lib/version.ts actualizado -> v$version"
}

# ---------------------------------------------------------
# FUNCAO: Preview interativo do release
# ---------------------------------------------------------
function Show-ReleasePreview($version, $agentInfo, $categorized, $filesChanged) {
    Clear-Host
    Write-Host ""
    Write-Host "  ============================================" -ForegroundColor Cyan
    Write-Host "  PREVIEW DO RELEASE v$version" -ForegroundColor Cyan
    Write-Host "  ============================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Agente: $($agentInfo.Agent)$(if ($agentInfo.Model) { " ($($agentInfo.Model))" })" -ForegroundColor White
    Write-Host ""
    Write-Host "  Ficheiros que serao criados/atualizados:" -ForegroundColor White
    Write-Host "    CREATE  release-notes-v$version.md" -ForegroundColor Green
    Write-Host "    UPDATE  CHANGELOG.md (agregar commits)" -ForegroundColor Yellow
    Write-Host "    UPDATE  SYNC-STATE.md (adicionar sessao)" -ForegroundColor Yellow
    Write-Host "    UPDATE  PROGRESS-DESKTOP.md (versao $version)" -ForegroundColor Yellow
    Write-Host "    UPDATE  src/lib/version.ts" -ForegroundColor Yellow
    Write-Host "    UPDATE  package.json, Cargo.toml, tauri.conf.json" -ForegroundColor Yellow
    Write-Host ""

    $totalItems = $categorized.Added.Count + $categorized.Fixed.Count + $categorized.Changed.Count + $categorized.Docs.Count + $categorized.Infra.Count + $categorized.Other.Count
    Write-Host "  Commits desde ultima tag: $totalItems" -ForegroundColor White
    if ($categorized.Added.Count -gt 0) { Write-Host "    + $($categorized.Added.Count) funcionalidades" -ForegroundColor Gray }
    if ($categorized.Fixed.Count -gt 0) { Write-Host "    + $($categorized.Fixed.Count) correcoes" -ForegroundColor Gray }
    if ($categorized.Changed.Count -gt 0) { Write-Host "    + $($categorized.Changed.Count) alteracoes" -ForegroundColor Gray }
    if ($categorized.Infra.Count -gt 0) { Write-Host "    + $($categorized.Infra.Count) infraestrutura" -ForegroundColor Gray }
    if ($categorized.Docs.Count -gt 0) { Write-Host "    + $($categorized.Docs.Count) documentacao" -ForegroundColor Gray }
    Write-Host ""

    $changelogSection = Parse-ChangelogSection $version
    $releaseTitle = Get-ReleaseTitle $version $changelogSection
    Write-Host "  Titulo gerado: $releaseTitle" -ForegroundColor Cyan
    Write-Host ""

    Write-Host "  [Enter] Continuar com o release" -ForegroundColor Green
    Write-Host "  [M]     Modo manual (editar ficheiros primeiro)" -ForegroundColor Yellow
    Write-Host "  [C]     Cancelar" -ForegroundColor Red
    Write-Host ""

    $choice = Read-Host "  Escolha"
    switch ($choice.Trim().ToUpper()) {
        "" { return "CONTINUE" }
        "M" { return "MANUAL" }
        "C" { return "CANCEL" }
        default {
            Write-Warn "Opcao invalida. A continuar..."
            return "CONTINUE"
        }
    }
}

# ---------------------------------------------------------
# FUNCAO: Ler .session-info.md e extrair dados estruturados
# ---------------------------------------------------------
function Read-SessionInfo {
    $sessionPath = Join-Path $WORKSPACE ".session-info.md"
    $result = @{
        HasData         = $false
        Agente          = $null
        Modelo          = $null
        Data_Inicio     = $null
        Data_Fim        = $null
        Versao          = $null
        Titulo          = $null
        Descricao       = $null
        Added           = @()
        Fixed           = @()
        Changed         = @()
        Deprecated      = @()
        Removed         = @()
        Security        = @()
        Infrastructure  = @()
        Documentation   = @()
        i18n            = @()
        FilesChanged    = @()
        BreakingChanges = @()
        DependenciesAdded = @()
        DependenciesRemoved = @()
        Screenshots     = @()
        NotesNextAgent  = $null
    }

    if (-not (Test-Path $sessionPath)) {
        return $result
    }

    $content = Get-Content $sessionPath -Raw -Encoding utf8
    if (-not $content) { return $result }

    # Helper to extract section content
    function Extract-Section($text, $header) {
        $pattern = '(?ms)^#{2,3}\s+' + [regex]::Escape($header) + '\s*\n(.*?)(?=^#{2,3}\s+|\z)'
        if ($text -match $pattern) {
            return $matches[1].Trim()
        }
        return $null
    }

    # Helper to extract list items
    function Extract-List($sectionText) {
        if (-not $sectionText) { return @() }
        $items = @()
        foreach ($line in $sectionText -split "`n") {
            $trimmed = $line.Trim()
            if ($trimmed -match '^[-*]\s+(.+)$') {
                $item = $matches[1].Trim()
                if ($item -and $item -notmatch '^#{1,3}\s') {
                    $items += $item
                }
            }
        }
        return $items
    }

    # Helper to extract key-value pairs
    function Extract-KeyValue($text, $key) {
        $pattern = '(?m)^' + [regex]::Escape($key) + ':\s*(.*)$'
        if ($text -match $pattern) {
            return $matches[1].Trim()
        }
        return $null
    }

    # Extract identity
    $identitySection = Extract-Section $content "Identidade"
    if ($identitySection) {
        $result.Agente      = Extract-KeyValue $identitySection "Agente"
        $result.Modelo      = Extract-KeyValue $identitySection "Modelo"
        $result.Data_Inicio = Extract-KeyValue $identitySection "Data_Inicio"
        $result.Data_Fim    = Extract-KeyValue $identitySection "Data_Fim"
    }

    # Extract task
    $taskSection = Extract-Section $content "Tarefa"
    if ($taskSection) {
        $result.Versao    = Extract-KeyValue $taskSection "Versao"
        $result.Titulo    = Extract-KeyValue $taskSection "Titulo"
        $result.Descricao = Extract-KeyValue $taskSection "Descricao"
    }

    # Extract changes by category
    $changesSection = Extract-Section $content "Alteracoes"
    if ($changesSection) {
        $result.Added          = Extract-List (Extract-Section $changesSection "Added (novas funcionalidades)")
        $result.Fixed          = Extract-List (Extract-Section $changesSection "Fixed (correcoes de bugs)")
        $result.Changed        = Extract-List (Extract-Section $changesSection "Changed (alteracoes/refactor)")
        $result.Deprecated     = Extract-List (Extract-Section $changesSection "Deprecated (funcionalidades obsoletas)")
        $result.Removed        = Extract-List (Extract-Section $changesSection "Removed (funcionalidades removidas)")
        $result.Security       = Extract-List (Extract-Section $changesSection "Security (correcoes de seguranca)")
        $result.Infrastructure = Extract-List (Extract-Section $changesSection "Infrastructure (build, CI/CD, deps)")
        $result.Documentation  = Extract-List (Extract-Section $changesSection "Documentation (docs, screenshots, manual)")
        $result.i18n           = Extract-List (Extract-Section $changesSection "i18n (traducoes, locales)")
    }

    # Extract other sections
    $result.FilesChanged     = Extract-List (Extract-Section $content "Ficheiros Alterados")
    $result.BreakingChanges  = Extract-List (Extract-Section $content "Breaking Changes")

    $depsSection = Extract-Section $content "Dependencias"
    if ($depsSection) {
        $result.DependenciesAdded   = Extract-List (Extract-Section $depsSection "Adicionadas")
        $result.DependenciesRemoved = Extract-List (Extract-Section $depsSection "Removidas")
    }

    $result.Screenshots     = Extract-List (Extract-Section $content "Screenshots / Links")
    $result.NotesNextAgent  = Extract-Section $content "Notas para o proximo agente"

    # Determine if we have meaningful data
    $hasItems = $result.Added.Count -gt 0 -or
                $result.Fixed.Count -gt 0 -or
                $result.Changed.Count -gt 0 -or
                $result.Descricao
    $result.HasData = $hasItems

    return $result
}

# ---------------------------------------------------------
# FUNCAO: Merge session info with git commits
# ---------------------------------------------------------
function Merge-SessionWithCommits($sessionInfo, $gitCommits) {
    # If session info has data, use it as primary source
    # If not, fall back to git commits
    $merged = @{
        Added           = if ($sessionInfo.Added.Count -gt 0) { $sessionInfo.Added } else { $gitCommits.Added }
        Fixed           = if ($sessionInfo.Fixed.Count -gt 0) { $sessionInfo.Fixed } else { $gitCommits.Fixed }
        Changed         = if ($sessionInfo.Changed.Count -gt 0) { $sessionInfo.Changed } else { $gitCommits.Changed }
        Deprecated      = $sessionInfo.Deprecated
        Removed         = $sessionInfo.Removed
        Security        = $sessionInfo.Security
        Infrastructure  = if ($sessionInfo.Infrastructure.Count -gt 0) { $sessionInfo.Infrastructure } else { $gitCommits.Infra }
        Documentation   = if ($sessionInfo.Documentation.Count -gt 0) { $sessionInfo.Documentation } else { $gitCommits.Docs }
        i18n            = $sessionInfo.i18n
        FilesChanged    = if ($sessionInfo.FilesChanged.Count -gt 0) { $sessionInfo.FilesChanged } else { @() }
        BreakingChanges = $sessionInfo.BreakingChanges
        DependenciesAdded = $sessionInfo.DependenciesAdded
        DependenciesRemoved = $sessionInfo.DependenciesRemoved
        Screenshots     = $sessionInfo.Screenshots
        NotesNextAgent  = $sessionInfo.NotesNextAgent
        Descricao       = $sessionInfo.Descricao
        Titulo          = $sessionInfo.Titulo
    }
    return $merged
}

# ---------------------------------------------------------
# AJUDA (-Help)
# ---------------------------------------------------------
if ($Help) {
    Clear-Host
    Write-Host ""
    Write-Host "  ============================================" -ForegroundColor Cyan
    Write-Host "  NEXORA DESKTOP SYNC  --  Ajuda" -ForegroundColor Cyan
    Write-Host "  ============================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  UTILIZACAO" -ForegroundColor White
    Write-Host "  ----------" -ForegroundColor Gray
    Write-Host "  powershell -ExecutionPolicy Bypass -File scripts\sync.ps1 [opcoes]" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  OPCOES" -ForegroundColor White
    Write-Host "  ------" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  (sem opcoes)" -ForegroundColor Cyan
    Write-Host "    Abre menu interactivo com 5 opcoes." -ForegroundColor Gray
    Write-Host "    Ideal para uso diario -- nao precisas de decorar flags." -ForegroundColor Gray
    Write-Host ""
    Write-Host "  -Message  <texto>" -ForegroundColor Cyan
    Write-Host "    Define a mensagem de commit directamente." -ForegroundColor Gray
    Write-Host "    Salta as perguntas de tipo e descricao." -ForegroundColor Gray
    Write-Host "    Usa convencoes SemVer: feat:, fix:, docs:, refactor:, BREAKING CHANGE:" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  -SkipRelease" -ForegroundColor Cyan
    Write-Host "    Faz commit e push para dev SEM perguntar versao." -ForegroundColor Gray
    Write-Host "    Util para guardar trabalho rapido sem bump de versao." -ForegroundColor Gray
    Write-Host ""
    Write-Host "  -Release" -ForegroundColor Cyan
    Write-Host "    Modo lancamento completo:" -ForegroundColor Gray
    Write-Host "    commit + bump versao + push dev + merge main + push main + GitHub Release" -ForegroundColor Gray
    Write-Host "    Dispara automaticamente o GitHub Actions (build .exe/.dmg/.deb)." -ForegroundColor Gray
    Write-Host "    Usar quando um Prompt Desktop (1/2/3/4) estiver completo." -ForegroundColor Gray
    Write-Host ""
    Write-Host "  -PublishDraft" -ForegroundColor Magenta
    Write-Host "    Publica o draft release da tag mais recente no GitHub." -ForegroundColor Gray
    Write-Host "    Util quando o build.yml criou um draft automatico (apos push da tag)" -ForegroundColor Gray
    Write-Host "    e queres actualizar o titulo/corpo e publicar sem refazer o release completo." -ForegroundColor Gray
    Write-Host "    Equivalente a opcao 6 do menu interactivo." -ForegroundColor Gray
    Write-Host ""
    Write-Host "  -Help" -ForegroundColor Cyan
    Write-Host "    Mostra esta ajuda." -ForegroundColor Gray
    Write-Host ""
    Write-Host "  CONVENCOES DE COMMIT (SemVer)" -ForegroundColor White
    Write-Host "  -----------------------------" -ForegroundColor Gray
    Write-Host "  feat:            Nova funcionalidade     -> bump MINOR (0.1.0 -> 0.2.0)" -ForegroundColor Gray
    Write-Host "  fix:             Correcao de bug         -> bump PATCH (0.1.0 -> 0.1.1)" -ForegroundColor Gray
    Write-Host "  docs:            Documentacao            -> bump PATCH" -ForegroundColor Gray
    Write-Host "  style:           Estetica/formatacao     -> bump PATCH" -ForegroundColor Gray
    Write-Host "  refactor:        Refatorizacao           -> bump PATCH" -ForegroundColor Gray
    Write-Host "  chore:           Manutencao/scripts      -> bump PATCH" -ForegroundColor Gray
    Write-Host "  BREAKING CHANGE: Alteracao disruptiva    -> bump MAJOR (0.1.0 -> 1.0.0)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  EXEMPLOS" -ForegroundColor White
    Write-Host "  --------" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  # Menu interactivo (recomendado para uso diario)" -ForegroundColor Green
    Write-Host "  powershell -ExecutionPolicy Bypass -File scripts\sync.ps1" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  # Guardar trabalho do dia com mensagem directa" -ForegroundColor Green
    Write-Host "  powershell -ExecutionPolicy Bypass -File scripts\sync.ps1 -Message ""feat: adicionar painel de jobs""" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  # Guardar rapido sem bump de versao" -ForegroundColor Green
    Write-Host "  powershell -ExecutionPolicy Bypass -File scripts\sync.ps1 -SkipRelease" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  # Guardar rapido com mensagem e sem bump" -ForegroundColor Green
    Write-Host "  powershell -ExecutionPolicy Bypass -File scripts\sync.ps1 -SkipRelease -Message ""docs: actualizar SYNC-STATE""" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  # Versao pronta -- Prompt Desktop 2 completo (merge main + GitHub Release)" -ForegroundColor Green
    Write-Host "  powershell -ExecutionPolicy Bypass -File scripts\sync.ps1 -Release -Message ""feat: sidecar + queue + workers""" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  # Versao pronta -- com menu de versao interactivo" -ForegroundColor Green
    Write-Host "  powershell -ExecutionPolicy Bypass -File scripts\sync.ps1 -Release" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  # Ver estado do repositorio sem fazer nada" -ForegroundColor Green
    Write-Host "  powershell -ExecutionPolicy Bypass -File scripts\sync.ps1  -> escolhe opcao 4" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  # Publicar draft release criado automaticamente pelo build.yml" -ForegroundColor Green
    Write-Host "  powershell -ExecutionPolicy Bypass -File scripts\sync.ps1 -PublishDraft" -ForegroundColor Magenta
    Write-Host ""
    Write-Host "  FLUXO DE TRABALHO TIPICO" -ForegroundColor White
    Write-Host "  ------------------------" -ForegroundColor Gray
    Write-Host "  Dia de trabalho normal:" -ForegroundColor Gray
    Write-Host "    sync.ps1              -> opcao 1 (guardar + bump patch)" -ForegroundColor Gray
    Write-Host "    sync.ps1 -SkipRelease -> guardar sem alterar versao" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  Quando um Prompt Desktop fica completo:" -ForegroundColor Gray
    Write-Host "    sync.ps1 -Release     -> opcao 3 (merge main + build instaladores)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  ATALHO (adiciona ao perfil PowerShell)" -ForegroundColor White
    Write-Host "  ----------------------------------------" -ForegroundColor Gray
    Write-Host "  function nsync { powershell -ExecutionPolicy Bypass -File ""C:\Dev\nexora-desktop\scripts\sync.ps1"" @args }" -ForegroundColor Cyan
    Write-Host "  # Depois podes usar apenas: nsync / nsync -Release / nsync -Help" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  ============================================" -ForegroundColor Cyan
    Write-Host ""
    exit 0
}

# ---------------------------------------------------------
# FUNCAO: Publicar draft release existente no GitHub
# ---------------------------------------------------------
function Invoke-PublishDraft {
    param([string]$token, [string]$repoOwner, [string]$repoName, [string]$workspace)

    # Determinar versao a publicar
    $latestTag = git describe --tags --abbrev=0 2>$null
    if (-not $latestTag) {
        Write-Err "Nao foi encontrada nenhuma tag git. Corre 'git tag' para verificar."
        return
    }

    $version = $latestTag -replace '^v', ''
    Write-Host ""
    Write-Host "  Tag detectada: $latestTag" -ForegroundColor Cyan
    $confirm = Read-Host "  Publicar draft release para $latestTag? [S/N]"
    if ($confirm -notmatch '^[Ss]$') {
        Write-Host "  Cancelado." -ForegroundColor Gray
        return
    }

    $headers = @{
        "Authorization" = "token $token"
        "Accept"        = "application/vnd.github+json"
    }

    # Listar TODAS as releases — GET /releases/tags/{tag} so devolve nao-drafts,
    # pelo que o draft criado pelo CI ficaria invisivel com o endpoint antigo.
    Write-Step "A procurar releases para $latestTag no GitHub..."
    $allReleases = @()
    try {
        $allReleases = Invoke-RestMethod `
            -Uri     "https://api.github.com/repos/$repoOwner/$repoName/releases?per_page=50" `
            -Method  Get `
            -Headers $headers
    } catch {
        Write-Err "Nao foi possivel listar releases: $_"
        return
    }

    $draftRelease     = $allReleases | Where-Object { $_.tag_name -eq $latestTag -and $_.draft -eq $true  } | Select-Object -First 1
    $publishedRelease = $allReleases | Where-Object { $_.tag_name -eq $latestTag -and $_.draft -eq $false } | Select-Object -First 1

    # Preferir draft (tem assets do CI); se so existir publicada, actualizar essa
    $targetRelease = if ($draftRelease) { $draftRelease } else { $publishedRelease }

    if ($draftRelease) {
        Write-Info "Draft com assets encontrado (id=$($draftRelease.id), assets=$($draftRelease.assets.Count)). A actualizar..."
    } elseif ($publishedRelease) {
        Write-Warn "Nao existe draft para $latestTag. A actualizar release ja publicada (id=$($publishedRelease.id))."
    } else {
        Write-Warn "Nao existe nenhuma release para $latestTag no GitHub."
        $create = Read-Host "  Queres criar uma nova release para $latestTag? [S/N]"
        if ($create -notmatch '^[Ss]$') { return }
    }

    # Gerar release-notes-vX.Y.Z.md a partir dos commits do range desta tag
    $prevTag = git describe --tags --abbrev=0 "${latestTag}^" 2>$null
    $commitRange = if ($prevTag) { "${prevTag}..${latestTag}" } else { $latestTag }
    $rawCommits = git log $commitRange --pretty=format:"%h|%s" --no-merges 2>$null
    $commitList = @()
    foreach ($line in ($rawCommits -split "`n")) {
        if ($line -match '^([^|]+)\|(.+)$') {
            $commitList += @{ Hash = $matches[1].Trim(); Message = $matches[2].Trim() }
        }
    }
    if ($commitList.Count -gt 0) {
        $categorized = CategorizeCommits $commitList
        Generate-ReleaseNotesFile $version $categorized $null | Out-Null
        Write-Info "release-notes-v$version.md gerado de $($commitList.Count) commits"
    }

    # Titulo e corpo ricos (Build-ReleaseBody usa release-notes file como prioridade 1)
    $changelogSection = Parse-ChangelogSection $version
    $releaseTitle     = "v$version — $(Get-ReleaseTitle $version $changelogSection)"
    $releaseBodyText  = Build-ReleaseBody $version ""

    Write-Step "Titulo: $releaseTitle"

    if ($targetRelease) {
        # PATCH — actualizar release (draft ou publicada) com titulo/corpo ricos e publicar
        try {
            $payload = @{
                name       = $releaseTitle
                body       = $releaseBodyText
                draft      = $false
                prerelease = (Get-IsPreRelease $version)
            } | ConvertTo-Json
            $payloadBytes = [System.Text.Encoding]::UTF8.GetBytes($payload)
            Invoke-RestMethod `
                -Uri     "https://api.github.com/repos/$repoOwner/$repoName/releases/$($targetRelease.id)" `
                -Method  Patch `
                -Headers $headers `
                -Body    $payloadBytes `
                -ContentType "application/json; charset=utf-8" > $null
            Write-Success "Release $latestTag actualizada e publicada!"
            Write-Info "https://github.com/$repoOwner/$repoName/releases/tag/$latestTag"

            # Apagar release publicada duplicada sem assets (criada pelo sync.ps1 antes do CI terminar)
            if ($draftRelease -and $publishedRelease -and $publishedRelease.assets.Count -eq 0) {
                Write-Step "A apagar release duplicada vazia (id=$($publishedRelease.id))..."
                try {
                    Invoke-RestMethod `
                        -Uri     "https://api.github.com/repos/$repoOwner/$repoName/releases/$($publishedRelease.id)" `
                        -Method  Delete `
                        -Headers $headers
                    Write-Success "Release duplicada apagada."
                } catch {
                    Write-Warn "Nao foi possivel apagar release duplicada: $_"
                }
            }
        } catch {
            $stream = $_.Exception.Response.GetResponseStream()
            if ($stream) {
                Write-Warn "Erro da API GitHub: $((New-Object System.IO.StreamReader($stream)).ReadToEnd())"
            } else {
                Write-Warn "Falhou: $_"
            }
        }
    } else {
        # POST — criar nova release (nao havia nenhuma)
        try {
            $payload = @{
                tag_name   = $latestTag
                name       = $releaseTitle
                body       = $releaseBodyText
                draft      = $false
                prerelease = (Get-IsPreRelease $version)
            } | ConvertTo-Json
            $payloadBytes = [System.Text.Encoding]::UTF8.GetBytes($payload)
            Invoke-RestMethod `
                -Uri     "https://api.github.com/repos/$repoOwner/$repoName/releases" `
                -Method  Post `
                -Headers $headers `
                -Body    $payloadBytes `
                -ContentType "application/json; charset=utf-8" > $null
            Write-Success "Release $latestTag criada e publicada!"
            Write-Info "https://github.com/$repoOwner/$repoName/releases/tag/$latestTag"
        } catch {
            $stream = $_.Exception.Response.GetResponseStream()
            if ($stream) {
                Write-Warn "Erro da API GitHub: $((New-Object System.IO.StreamReader($stream)).ReadToEnd())"
            } else {
                Write-Warn "Falhou: $_"
            }
        }
    }
}

$WORKSPACE  = "C:\Dev\nexora-desktop"
$REPO_OWNER = "ideiasestrondosas-ctrl"
$REPO_NAME  = "nexora-desktop"

# Limite de tamanho para ficheiros (GitHub rejeita >100 MB; aviso a 50 MB)
$LARGE_FILE_LIMIT_MB = 50

# Placeholders de binarios FFmpeg/FFprobe (devem ter sempre <=10 bytes no git)
# Os binarios reais sao descarregados pelo CI via download-media-binaries.js
$BINARY_PLACEHOLDERS = @(
    "src-tauri\binaries\ffmpeg-x86_64-pc-windows-msvc.exe",
    "src-tauri\binaries\ffprobe-x86_64-pc-windows-msvc.exe",
    "src-tauri\binaries\ffmpeg-aarch64-apple-darwin",
    "src-tauri\binaries\ffprobe-aarch64-apple-darwin",
    "src-tauri\binaries\ffmpeg-x86_64-apple-darwin",
    "src-tauri\binaries\ffprobe-x86_64-apple-darwin",
    "src-tauri\binaries\ffmpeg-x86_64-unknown-linux-gnu",
    "src-tauri\binaries\ffprobe-x86_64-unknown-linux-gnu",
    "src-tauri\binaries\ffmpeg-universal-apple-darwin",
    "src-tauri\binaries\ffprobe-universal-apple-darwin"
)

if (-not (Test-Path $WORKSPACE)) {
    Write-Err "Workspace nao encontrado: $WORKSPACE"
    exit 1
}
Push-Location $WORKSPACE

# ---------------------------------------------------------
# MENU INTERACTIVO (quando nao ha flags passadas)
# ---------------------------------------------------------
if (-not $SkipRelease -and -not $Release -and -not $PublishDraft -and -not $Message) {
    $branch = git branch --show-current 2>$null
    $dirty  = git status --short 2>$null
    $currentVersion = "0.1.0"
    if (Test-Path "package.json") {
        try { $currentVersion = (Get-Content "package.json" -Raw | ConvertFrom-Json).version } catch {}
    }

    Clear-Host
    Write-Host ""
    Write-Host "  ============================================" -ForegroundColor Cyan
    Write-Host "  NEXORA DESKTOP SYNC" -ForegroundColor Cyan
    Write-Host "  ============================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Branch:  $branch" -ForegroundColor White
    Write-Host "  Versao:  $currentVersion" -ForegroundColor White
    if ($dirty) {
        Write-Host "  Estado:  $(@($dirty).Count) ficheiro(s) modificado(s)" -ForegroundColor Yellow
    } else {
        Write-Host "  Estado:  Workspace limpo" -ForegroundColor Green
    }
    Write-Host ""
    Write-Host "  O que queres fazer?" -ForegroundColor White
    Write-Host ""
    Write-Host "  1) Guardar trabalho do dia                     (commit + bump versao + push dev)" -ForegroundColor Cyan
    Write-Host "  2) Guardar sem alterar versao                  (commit + push dev, sem bump)" -ForegroundColor Cyan
    Write-Host "  3) Versao pronta para lancamento               (commit + bump + push dev + merge main + GitHub Release)" -ForegroundColor Green
    Write-Host "  4) Ver estado actual                           (git status + ultimos commits)" -ForegroundColor Gray
    Write-Host "  5) Sair" -ForegroundColor Gray
    Write-Host "  6) Publicar draft release existente            (actualiza e publica draft do GitHub Actions)" -ForegroundColor Magenta
    Write-Host ""

    $choice = Read-Host "  Opcao [1-6]"

    switch ($choice) {
        "1" { <# modo normal -- continua o script #> }
        "2" { $SkipRelease = $true }
        "3" { $Release = $true }
        "4" {
            Write-Host ""
            Write-Host "  -- Ficheiros modificados --" -ForegroundColor White
            git status --short | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
            Write-Host ""
            Write-Host "  -- Ultimos 5 commits --" -ForegroundColor White
            git log --oneline -5 | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
            Write-Host ""
            Write-Host "  -- Branches --" -ForegroundColor White
            git branch -a | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
            Write-Host ""
            Pop-Location; exit 0
        }
        "5" {
            Write-Host "  Saindo." -ForegroundColor Gray
            Pop-Location; exit 0
        }
        "6" { $PublishDraft = $true }
        default {
            Write-Warn "Opcao invalida. A usar modo 1 (guardar trabalho do dia)."
        }
    }
}

# ---------------------------------------------------------
# VERIFICACAO DE AMBIENTE
# ---------------------------------------------------------
Write-Step "Verificando ambiente Git..."

if (-not (Test-Path ".git")) {
    Write-Warn "Repositorio Git nao inicializado. Inicializando..."
    git init
}

$remote = git remote get-url origin 2>$null
if (-not $remote) {
    Write-Warn "Remoto 'origin' nao configurado."
    $url = Read-Host "Introduza a URL do repositorio GitHub"
    if ($url) {
        git remote add origin $url
        Write-Success "Remoto origin adicionado: $url"
    } else {
        Write-Err "URL do repositorio e necessaria para continuar."
        Pop-Location; exit 1
    }
}

# ---------------------------------------------------------
# CARREGAMENTO DE CONFIGURACOES (.env)
# ---------------------------------------------------------
$script:GITHUB_TOKEN = ""
if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        if ($_ -match "^\s*GITHUB_TOKEN\s*=\s*(.*)$") {
            $val = $matches[1].Trim().Trim("'").Trim('"')
            if ($val) { $script:GITHUB_TOKEN = $val }
        }
    }
}

# ---------------------------------------------------------
# MODO: PUBLICAR DRAFT RELEASE EXISTENTE (-PublishDraft / opcao 6)
# ---------------------------------------------------------
if ($PublishDraft) {
    if (-not $script:GITHUB_TOKEN) {
        Write-Err "GITHUB_TOKEN nao encontrado. Adiciona GITHUB_TOKEN=<token> ao ficheiro .env"
        Pop-Location; exit 1
    }
    Invoke-PublishDraft `
        -token     $script:GITHUB_TOKEN `
        -repoOwner $REPO_OWNER `
        -repoName  $REPO_NAME `
        -workspace $WORKSPACE
    Pop-Location; exit 0
}

# ---------------------------------------------------------
# MOSTRAR SYNC-STATE (handoff Claude <-> Antigravity)
# ---------------------------------------------------------
Write-Step "Verificando estado do handoff (SYNC-STATE.md)..."
if (Test-Path "SYNC-STATE.md") {
    Write-Host ""
    Write-Host "  -- Ultimo handoff --" -ForegroundColor White
    Get-Content "SYNC-STATE.md" | Select-Object -First 15 | ForEach-Object {
        Write-Host "  $_" -ForegroundColor Gray
    }
    Write-Host ""
} else {
    Write-Warn "SYNC-STATE.md nao encontrado - recomendado para handoff Claude/Antigravity"
}

# ---------------------------------------------------------
# DETECAO DE ALTERACOES
# ---------------------------------------------------------
Write-Step "Analisando alteracoes no workspace..."

git update-index --refresh > $null 2>&1
$branch  = git branch --show-current
$status  = git status --porcelain
$unpushed = git log origin/$branch..HEAD --oneline 2>$null

if (-not $status -and -not $unpushed) {
    if ($Release) {
        Write-Warn "Workspace limpo, mas modo Release activo. A continuar..."
    } else {
        Write-Success "Workspace e GitHub estao sincronizados. Nada para fazer."
        Pop-Location; exit 0
    }
}

# ---------------------------------------------------------
# GUARDIA: placeholders + ficheiros grandes
# ---------------------------------------------------------
Write-Step "Verificando placeholders e ficheiros grandes..."

# 1. Restaurar placeholders de binarios FFmpeg/FFprobe substituidos por binarios reais
$restoredCount = 0
foreach ($binRelPath in $BINARY_PLACEHOLDERS) {
    $fullPath = Join-Path $WORKSPACE $binRelPath
    if (Test-Path $fullPath) {
        $fileSize = (Get-Item $fullPath).Length
        if ($fileSize -gt 100) {
            $sizeMB = [math]::Round($fileSize / 1MB, 1)
            Write-Warn "Binario real em placeholder: $binRelPath ($sizeMB MB) -> a restaurar para 1 byte"
            [System.IO.File]::WriteAllBytes($fullPath, [byte[]](0))
            $restoredCount++
        }
    }
}
if ($restoredCount -gt 0) {
    Write-Success "$restoredCount placeholder(s) restaurado(s). Binarios sao descarregados pelo CI."
} else {
    Write-Success "Placeholders OK"
}

# 2. Detectar ficheiros grandes no workspace (excluindo dirs de build conhecidos)
$largeFiles = @()
try {
    $largeFiles = Get-ChildItem -Path $WORKSPACE -Recurse -File -ErrorAction SilentlyContinue |
        Where-Object {
            $p = $_.FullName
            $p -notmatch [regex]::Escape("\\.git\\") -and
            $p -notmatch [regex]::Escape("\\node_modules\\") -and
            $p -notmatch [regex]::Escape("\\src-tauri\\target\\") -and
            $p -notmatch [regex]::Escape("\\dist\\") -and
            ($_.Length / 1MB) -gt $LARGE_FILE_LIMIT_MB
        }
} catch {}

if ($largeFiles.Count -gt 0) {
    Write-Warn "$($largeFiles.Count) ficheiro(s) acima de $($LARGE_FILE_LIMIT_MB) MB -- serao excluidos do commit:"
    $largeFiles | ForEach-Object {
        $rel  = $_.FullName.Substring($WORKSPACE.Length + 1)
        $sizeMB = [math]::Round($_.Length / 1MB, 1)
        Write-Info "  $rel ($sizeMB MB)"
    }
} else {
    Write-Success "Nenhum ficheiro grande detectado"
}

# 3. Detectar ficheiros processados / media (Nao devem ir para o github)
$processedFiles = @()
try {
    $processedFiles = Get-ChildItem -Path $WORKSPACE -Recurse -File -ErrorAction SilentlyContinue |
        Where-Object {
            $p = $_.FullName
            $p -notmatch [regex]::Escape("\\.git\\") -and
            $p -notmatch [regex]::Escape("\\node_modules\\") -and
            $p -notmatch [regex]::Escape("\\src\\assets\\") -and
            $p -notmatch [regex]::Escape("\\src-tauri\\icons\\") -and
            ($p -match "\.(mp4|mkv|mov|avi|webm|wav|mp3|flac)$" -or $p -match "_(proxy|thumb|normalized)\.(jpg|png|mp4|wav)$" -or $p -match "sample.*\.(mp4|wav|jpg|png)$")
        }
} catch {}

if ($processedFiles.Count -gt 0) {
    Write-Warn "$($processedFiles.Count) ficheiro(s) de media/processados detectados -- serao excluidos do commit:"
    $processedFiles | ForEach-Object {
        $rel  = $_.FullName.Substring($WORKSPACE.Length + 1)
        Write-Info "  $rel"
    }
} else {
    Write-Success "Nenhum ficheiro processado/media detectado"
}

# ---------------------------------------------------------
# COMMIT DE CODIGO
# ---------------------------------------------------------
$commitMsg  = ""
$isNewRelease = $false

if ($status) {
    $commitMsg = $Message
    if (-not $commitMsg) {
        Write-Host ""
        Write-Host "Convencoes de Commit (SemVer):" -ForegroundColor White
        Write-Host "1. feat:            (Nova funcionalidade -> Bump MINOR)"
        Write-Host "2. fix:             (Correcao de bug -> Bump PATCH)"
        Write-Host "3. docs:            (Documentacao -> Bump PATCH)"
        Write-Host "4. style:           (Estetica -> Bump PATCH)"
        Write-Host "5. refactor:        (Refatorizacao -> Bump PATCH)"
        Write-Host "6. BREAKING CHANGE: (Alteracao disruptiva -> Bump MAJOR)"

        $type = Read-Host "Escolha o tipo (Padrao: feat)"
        if (-not $type) { $type = "feat" }

        $desc = Read-Host "Descricao"
        if (-not $desc) { $desc = "atualizacoes gerais" }

        $commitMsg = "$($type): $desc"
    }

    Write-Step "Realizando commit: '$commitMsg'..."

    # OPÇÃO A: Limpar atributos de "Somente Leitura" (Read-Only) automaticamente para evitar erros de bloqueio
    Write-Step "Limpando atributos de Somente Leitura (Read-Only) nos ficheiros do workspace..."
    try {
        Get-ChildItem -Path $WORKSPACE -File -Recurse -ErrorAction SilentlyContinue |
            Where-Object {
                $p = $_.FullName
                $p -notmatch [regex]::Escape("\\.git\\") -and
                $p -notmatch [regex]::Escape("\\node_modules\\") -and
                $p -notmatch [regex]::Escape("\\src-tauri\\target\\") -and
                $p -notmatch [regex]::Escape("\\dist\\")
            } | ForEach-Object {
                if ($_.IsReadOnly) {
                    $_.IsReadOnly = $false
                }
            }
        Write-Success "Atributos Read-Only limpos com sucesso!"
    } catch {
        Write-Warn "Nao foi possivel limpar alguns atributos de ficheiros: $_"
    }

    # Staging seguro: adiciona tudo e depois remove ficheiros grandes e runtime
    git add --all

    # Unstage ficheiros grandes detectados
    if ($largeFiles.Count -gt 0) {
        $largeFiles | ForEach-Object {
            $relPath = $_.FullName.Substring($WORKSPACE.Length + 1)
            git restore --staged $relPath 2>$null | Out-Null
            Write-Info "Excluido do staging: $relPath"
        }
    }

    # Unstage ficheiros processados detectados
    if ($processedFiles.Count -gt 0) {
        $processedFiles | ForEach-Object {
            $relPath = $_.FullName.Substring($WORKSPACE.Length + 1)
            git restore --staged $relPath 2>$null | Out-Null
            Write-Info "Excluido do staging (media/processado): $relPath"
        }
    }

    # Unstage ficheiros de runtime/IDE que nunca devem ser commitados
    $runtimeFiles = @(
        ".claude\settings.local.json",
        ".claude\scheduled_tasks.lock",
        ".antigravity\settings.json"
    )
    foreach ($rf in $runtimeFiles) {
        $rfFull = Join-Path $WORKSPACE $rf
        if (Test-Path $rfFull) {
            git restore --staged $rf 2>$null | Out-Null
        }
    }

    git commit -m $commitMsg

    if ($LASTEXITCODE -ne 0) {
        Write-Warn "O commit com validacao falhou (devido a bloqueio de ficheiros ou erro de linter/formatter)."
        Write-Host ""
        Write-Host "Desejas tentar a OPÇÃO B (forcar o commit ignorando Prettier/ESLint com --no-verify)? [S/N]" -ForegroundColor Yellow
        $ans = Read-Host "Escolha [S/N] (Padrao: N)"
        if ($ans -match '^[Ss]$') {
            Write-Step "A forcar commit sem ganchos (--no-verify)..."
            git commit -m $commitMsg --no-verify
            if ($LASTEXITCODE -ne 0) {
                Write-Err "Falha critica ao realizar o commit forcado."
                Pop-Location; exit 1
            }
            Write-Success "Commit forcado realizado com sucesso!"
        } else {
            Write-Err "Commit cancelado pelo utilizador."
            Pop-Location; exit 1
        }
    }

    # Graphify auto-commit (se existir grafo gerado automaticamente)
    Start-Sleep -Seconds 1
    if (git status --porcelain) {
        git add --all
        # Garantir que ficheiros grandes nao entram neste commit tambem
        if ($largeFiles.Count -gt 0) {
            $largeFiles | ForEach-Object {
                $relPath = $_.FullName.Substring($WORKSPACE.Length + 1)
                git restore --staged $relPath 2>$null | Out-Null
            }
        }
        # Garantir que ficheiros processados nao entram neste commit tambem
        if ($processedFiles.Count -gt 0) {
            $processedFiles | ForEach-Object {
                $relPath = $_.FullName.Substring($WORKSPACE.Length + 1)
                git restore --staged $relPath 2>$null | Out-Null
            }
        }
        foreach ($rf in $runtimeFiles) {
            $rfFull = Join-Path $WORKSPACE $rf
            if (Test-Path $rfFull) {
                git restore --staged $rf 2>$null | Out-Null
            }
        }
        
        $stagedChanges = git diff --staged --name-only
        if ($stagedChanges) {
            git commit -m "docs: atualizar grafo e relatorios (auto)" --no-verify
        }
    }
}

# ---------------------------------------------------------
# FALLBACK: detectar tag e mensagem quando nao houve commit novo
# ---------------------------------------------------------
if (-not $commitMsg) {
    $commitMsg = (git log -1 --pretty=%B 2>$null) | Select-Object -First 1
}
$lastTag = git describe --tags --abbrev=0 2>$null
if (-not $newVersion -and $lastTag) {
    $newVersion = $lastTag -replace '^v',''
}

# ---------------------------------------------------------
# MENU: PROMOVER RELEASE EXISTENTE (quando Release=true e workspace limpo)
# ---------------------------------------------------------
$promoteExisting = $false
if ($Release -and -not $status) {
    if ($lastTag) {
        Write-Host ""
        Write-Host "Release detectada: $lastTag (ultima tag na dev)" -ForegroundColor Cyan
        Write-Host "O que queres fazer?" -ForegroundColor White
        Write-Host ""
        Write-Host "1) Promover $lastTag para main + criar GitHub Release"
        Write-Host "2) Escolher outra tag existente"
        Write-Host "3) Criar nova tag (bump versao manual)"
        Write-Host "4) Cancelar"
        Write-Host ""
        $promoteChoice = Read-Host "Opcao [1-4]"
        switch ($promoteChoice) {
            "1" {
                $newVersion = $lastTag -replace '^v',''
                $commitMsg = (git log -1 --pretty=%B 2>$null) | Select-Object -First 1
                $isNewRelease = $true
                $promoteExisting = $true
            }
            "2" {
                $allTags = git tag -l | Sort-Object -Property @{Expression={[version]($_ -replace '^v','')}} -Descending
                Write-Host ""
                Write-Host "Tags disponiveis:" -ForegroundColor White
                $idx = 1
                $tagList = @()
                $allTags | ForEach-Object {
                    Write-Host "  $idx) $_" -ForegroundColor Gray
                    $tagList += $_
                    $idx++
                }
                $tagChoice = Read-Host "Escolha a tag (numero)"
                $selectedTag = $tagList[$tagChoice - 1]
                if ($selectedTag) {
                    $newVersion = $selectedTag -replace '^v',''
                    $commitMsg = (git log -1 $selectedTag --pretty=%B 2>$null) | Select-Object -First 1
                    $isNewRelease = $true
                    $promoteExisting = $true
                } else {
                    Write-Warn "Tag invalida. A cancelar."
                    Pop-Location; exit 0
                }
            }
            "3" {
                # continua para o fluxo normal de bump
                $promoteExisting = $false
            }
            "4" {
                Write-Host "Cancelado." -ForegroundColor Gray
                Pop-Location; exit 0
            }
            default {
                Write-Warn "Opcao invalida. A cancelar."
                Pop-Location; exit 0
            }
        }
    } else {
        Write-Warn "Nenhuma tag detectada na dev. A continuar com bump de versao..."
    }
}

# ---------------------------------------------------------
# GESTAO DE VERSAO (SemVer) - Tauri: sincroniza 3 ficheiros
# ---------------------------------------------------------
if (-not $SkipRelease -and -not $promoteExisting) {
    Write-Step "Iniciando processo de versionamento (Tauri)..."

    # 1. Ler versao actual a partir de package.json (ou Cargo.toml se package.json ausente)
    $currentVersion = "0.1.0"
    if (Test-Path "package.json") {
        $packageJson    = Get-Content "package.json" -Raw | ConvertFrom-Json
        $currentVersion = $packageJson.version
    } elseif (Test-Path "src-tauri\Cargo.toml") {
        $cargoContent = Get-Content "src-tauri\Cargo.toml" -Raw
        if ($cargoContent -match '(?m)^\[package\][^\[]*version\s*=\s*"([^"]+)"') {
            $currentVersion = $matches[1]
        }
    }

    Write-Host "Versao actual: $currentVersion" -ForegroundColor Gray

    # 2. Deduzir proxima versao com base no tipo de commit
    # Suporte a versoes com pre-release tag: "1.2.3-beta.1" → patch = 3
    $vParts = $currentVersion.Split('.')
    $major  = [int]$vParts[0]
    $minor  = [int]$vParts[1]
    $patch  = [int]($vParts[2] -replace '[-+].*$', '')

    $suggestedVersion = ""
    if ($commitMsg -match "BREAKING CHANGE") {
        $suggestedVersion = "$($major + 1).0.0"
    } elseif ($commitMsg -match "^feat:") {
        $suggestedVersion = "$major.$($minor + 1).0"
    } else {
        $suggestedVersion = "$major.$minor.$($patch + 1)"
    }

    # 3. Menu interactivo — nivel de versao
    Write-Host ""
    Write-Host "Escolha a proxima versao:" -ForegroundColor Yellow
    Write-Host "1) Patch ($($major).$($minor).$($patch + 1))"
    Write-Host "2) Minor ($($major).$($minor + 1).0)"
    Write-Host "3) Major ($($major + 1).0.0)"
    Write-Host "4) Ignorar versao (apenas push)"

    $choice = Read-Host "Opcao (Padrao baseada no commit: $suggestedVersion)"

    $baseVersion = ""
    switch ($choice) {
        "1"     { $baseVersion = "$($major).$($minor).$($patch + 1)" }
        "2"     { $baseVersion = "$major.$($minor + 1).0" }
        "3"     { $baseVersion = "$($major + 1).0.0" }
        "4"     { $baseVersion = "" }
        default { if (-not $choice) { $baseVersion = $suggestedVersion } }
    }

    # 4. Menu interactivo — tipo de versao (lê .release-channel para o default)
    $defaultChannel = "stable"
    $channelFile = Join-Path $WORKSPACE ".release-channel"
    if (Test-Path $channelFile) {
        $ch = (Get-Content $channelFile -Raw -Encoding utf8).Trim().ToLower()
        if (@("alpha","beta","rc","stable") -contains $ch) { $defaultChannel = $ch }
    }

    $newVersion = ""
    if ($baseVersion) {
        # Pre-calcular numeros de pre-release para cada tipo (auto-incremento)
        $preNums = @{ alpha = 1; beta = 1; rc = 1 }
        if ($currentVersion -match '^(\d+\.\d+\.\d+)-([a-zA-Z]+)\.(\d+)$') {
            $curBase = $matches[1]; $curLbl = $matches[2]; $curNum = [int]$matches[3]
            if ($curBase -eq $baseVersion -and $preNums.ContainsKey($curLbl)) {
                $preNums[$curLbl] = $curNum + 1
            }
        }

        $defaultHint = if ($defaultChannel -eq "stable") { $baseVersion } else { "$baseVersion-$defaultChannel.$($preNums[$defaultChannel])" }

        Write-Host ""
        Write-Host "Tipo de versao (canal: $defaultChannel):" -ForegroundColor Yellow
        Write-Host "  Enter  Padrao    ($defaultHint)" -ForegroundColor Green
        Write-Host "  s      Estavel   ($baseVersion)"
        Write-Host "  a      Alpha     ($baseVersion-alpha.$($preNums['alpha']))"
        Write-Host "  b      Beta      ($baseVersion-beta.$($preNums['beta']))"
        Write-Host "  r      RC        ($baseVersion-rc.$($preNums['rc']))"
        $preChoice = (Read-Host "Tipo [Enter=$defaultChannel / s / a / b / r]").Trim().ToLower()

        # Enter usa o canal por defeito
        if (-not $preChoice) {
            $preChoice = if ($defaultChannel -eq "stable") { "s" } else { $defaultChannel }
        }

        $preMap = @{ "s"=""; "stable"=""; "a"="alpha"; "alpha"="alpha"; "b"="beta"; "beta"="beta"; "r"="rc"; "rc"="rc" }
        $preLabel = if ($preMap.ContainsKey($preChoice)) { $preMap[$preChoice] } else { "" }

        if ($preLabel) {
            $newVersion = "$baseVersion-$preLabel.$($preNums[$preLabel])"
        } else {
            $newVersion = $baseVersion
        }
    }

    if ($newVersion) {
        # ---------------------------------------------------------
        # PREVIEW INTERATIVO (apenas modo Release)
        # ---------------------------------------------------------
        $agentInfo = $null
        $categorizedForPreview = $null
        $filesChanged = @()
        if ($Release) {
            $agentInfo = Get-AgentInfo
            $commitsForPreview = Get-CommitsSinceLastTag
            $categorizedForPreview = CategorizeCommits $commitsForPreview
            $filesChanged = git diff --name-only HEAD~1..HEAD 2>$null
            if (-not $filesChanged) { $filesChanged = git diff --cached --name-only 2>$null }
            if (-not $filesChanged) { $filesChanged = @(git status --porcelain | ForEach-Object { ($_ -split '\s+', 2)[1] }) }

            $previewResult = Show-ReleasePreview $newVersion $agentInfo $categorizedForPreview $filesChanged
            switch ($previewResult) {
                "CANCEL" {
                    Write-Host "Release cancelado pelo utilizador." -ForegroundColor Yellow
                    Pop-Location; exit 0
                }
                "MANUAL" {
                    Write-Host ""
                    Write-Host "Modo manual activo. Edita os ficheiros manualmente:" -ForegroundColor Yellow
                    Write-Host "  - release-notes-v$newVersion.md" -ForegroundColor Cyan
                    Write-Host "  - SYNC-STATE.md" -ForegroundColor Cyan
                    Write-Host "  - CHANGELOG.md" -ForegroundColor Cyan
                    Write-Host "  - src/lib/version.ts" -ForegroundColor Cyan
                    Write-Host "Depois corre o script novamente com -Release." -ForegroundColor Gray
                    Pop-Location; exit 0
                }
            }

            # Verificar se .session-info.md existe (recomendado mas nao obrigatorio)
            $sessionInfoPath = Join-Path $WORKSPACE ".session-info.md"
            if (-not (Test-Path $sessionInfoPath)) {
                Write-Warn ".session-info.md nao encontrado!"
                Write-Host "  Este ficheiro e preenchido pelo agente durante a sessao." -ForegroundColor Gray
                Write-Host "  Sem ele, o release usara apenas as mensagens de commit." -ForegroundColor Gray
                Write-Host "  Queres continuar mesmo assim? [S/N]" -ForegroundColor Yellow
                $continueWithout = Read-Host "Escolha"
                if ($continueWithout -notmatch '^[Ss]$') {
                    Write-Host "A cancelar. Cria .session-info.md no root do projeto e corre de novo." -ForegroundColor Gray
                    Pop-Location; exit 0
                }
            }

            # Ler .session-info.md (se existir)
            $sessionInfo = Read-SessionInfo
            if ($sessionInfo.HasData) {
                Write-Success ".session-info.md encontrado e carregado"
                # Merge com dados dos commits
                $categorizedForPreview = Merge-SessionWithCommits $sessionInfo $categorizedForPreview
                # Usar descricao e titulo do session info se disponiveis
                if ($sessionInfo.Descricao) { $commitMsg = $sessionInfo.Descricao }
                if ($sessionInfo.Titulo) { $releaseTitle = $sessionInfo.Titulo }
            } else {
                Write-Warn ".session-info.md nao encontrado ou vazio. A usar apenas commits git."
                Write-Host "  Dica: Cria .session-info.md no root para um release mais completo." -ForegroundColor Gray
            }
        }

        Write-Step "Aplicando versao v$newVersion nos ficheiros Tauri..."

        # package.json
        if (Test-Path "package.json") {
            $packageJson.version = $newVersion
            $utf8NoBom = New-Object System.Text.UTF8Encoding $false
            $packageJsonContent = $packageJson | ConvertTo-Json -Depth 20
            [System.IO.File]::WriteAllText(
                (Join-Path $WORKSPACE "package.json"),
                $packageJsonContent,
                $utf8NoBom
            )
            Write-Success "package.json -> $newVersion"
        }

        # src-tauri/Cargo.toml (apenas a linha version = "..." dentro de [package])
        if (Test-Path "src-tauri\Cargo.toml") {
            $cargoRaw  = Get-Content "src-tauri\Cargo.toml" -Raw
            # Substitui versao na primeira seccao [package] antes de qualquer [dependencies]
            $cargoNew  = $cargoRaw -replace '(?m)(^\[package\][^\[]*?version\s*=\s*")[^"]+(")', "`${1}$newVersion`${2}"
            $utf8NoBom = New-Object System.Text.UTF8Encoding $false
            [System.IO.File]::WriteAllText(
                (Join-Path $WORKSPACE "src-tauri\Cargo.toml"),
                $cargoNew,
                $utf8NoBom
            )
            Write-Success "src-tauri\Cargo.toml -> $newVersion"
        } else {
            Write-Warn "src-tauri\Cargo.toml nao encontrado (normal antes do scaffold Tauri)"
        }

        # src-tauri/tauri.conf.json (campo version, se existir)
        if (Test-Path "src-tauri\tauri.conf.json") {
            $tauriConf = Get-Content "src-tauri\tauri.conf.json" -Raw | ConvertFrom-Json
            if ($tauriConf.PSObject.Properties["version"]) {
                $tauriConf.version = $newVersion
                # Escrever sem BOM — Tauri nao suporta UTF-8 BOM no parser JSON
                $utf8NoBom = New-Object System.Text.UTF8Encoding $false
                $tauriJson = $tauriConf | ConvertTo-Json -Depth 20
                [System.IO.File]::WriteAllText(
                    (Join-Path $WORKSPACE "src-tauri\tauri.conf.json"),
                    $tauriJson,
                    $utf8NoBom
                )
                Write-Success "src-tauri\tauri.conf.json -> $newVersion"
            }
        }

        # CHANGELOG.md -- agregar commits desde ultima tag (modo Release) ou so a mensagem
        $date = Get-Date -Format "yyyy-MM-dd"
        if ($Release) {
            # Modo Release: agregar TODOS os commits desde a ultima tag
            Write-Step "A agregar commits no CHANGELOG.md..."
            $allCommits = Get-CommitsSinceLastTag
            $categorizedForChangelog = CategorizeCommits $allCommits

            $changelogEntry = "## [$newVersion] - $date`n`n"
            if ($categorizedForChangelog.Added.Count -gt 0) {
                $changelogEntry += "### Added`n"
                foreach ($item in $categorizedForChangelog.Added) { $changelogEntry += "- $item`n" }
                $changelogEntry += "`n"
            }
            if ($categorizedForChangelog.Fixed.Count -gt 0) {
                $changelogEntry += "### Fixed`n"
                foreach ($item in $categorizedForChangelog.Fixed) { $changelogEntry += "- $item`n" }
                $changelogEntry += "`n"
            }
            if ($categorizedForChangelog.Changed.Count -gt 0) {
                $changelogEntry += "### Changed`n"
                foreach ($item in $categorizedForChangelog.Changed) { $changelogEntry += "- $item`n" }
                $changelogEntry += "`n"
            }
            if ($categorizedForChangelog.Docs.Count -gt 0) {
                $changelogEntry += "### Documentation`n"
                foreach ($item in $categorizedForChangelog.Docs) { $changelogEntry += "- $item`n" }
                $changelogEntry += "`n"
            }
            if ($categorizedForChangelog.Infra.Count -gt 0) {
                $changelogEntry += "### Infrastructure`n"
                foreach ($item in $categorizedForChangelog.Infra) { $changelogEntry += "- $item`n" }
                $changelogEntry += "`n"
            }
            if ($categorizedForChangelog.Other.Count -gt 0) {
                $changelogEntry += "### Other`n"
                foreach ($item in $categorizedForChangelog.Other) { $changelogEntry += "- $item`n" }
                $changelogEntry += "`n"
            }
        } else {
            # Modo normal: apenas a mensagem de commit
            $changelogEntry = "## [$newVersion] - $date`n`n### Added`n- $commitMsg`n`n"
        }

        if (Test-Path "CHANGELOG.md") {
            $changelog = Get-Content "CHANGELOG.md" -Raw
            if ($changelog -match "## \[Unreleased\]") {
                $changelog = $changelog -replace "## \[Unreleased\]", "## [Unreleased]`n`n$changelogEntry"
            } else {
                $changelog = $changelog -replace "# Changelog", "# Changelog`n`n$changelogEntry"
            }
        } else {
            $changelog = "# Changelog`n`n## [Unreleased]`n`n$changelogEntry"
            Write-Warn "CHANGELOG.md nao existia - criado automaticamente"
        }
        [System.IO.File]::WriteAllText(
            (Join-Path $WORKSPACE "CHANGELOG.md"),
            $changelog,
            $utf8NoBom
        )

        # PROGRESS-DESKTOP.md (campo Versao na tabela de estado)
        if (Test-Path "PROGRESS-DESKTOP.md") {
            $progressContent = Get-Content "PROGRESS-DESKTOP.md" -Raw
            $progressContent = $progressContent -replace '\|\s*\*\*Versao\*\*\s*\|\s*[^\|]+\|', "| **Versao** | $newVersion |"
            [System.IO.File]::WriteAllText(
                (Join-Path $WORKSPACE "PROGRESS-DESKTOP.md"),
                $progressContent,
                $utf8NoBom
            )
        }

        # Modo Release: gerar ficheiros adicionais automaticamente
        $releaseNotesPath = $null
        if ($Release) {
            Write-Step "A gerar ficheiros de release automaticamente..."

            # 1. release-notes-vX.Y.Z.md
            $releaseNotesPath = Generate-ReleaseNotesFile $newVersion $categorizedForPreview $sessionInfo
            Write-Success "release-notes-v$newVersion.md criado"

            # 2. SYNC-STATE.md
            Update-SyncState $newVersion $agentInfo $categorizedForPreview $filesChanged $sessionInfo

            # 3. version.ts
            Update-VersionTs $newVersion $categorizedForPreview
        }

        # Commit de release + tag (verificar se tag ja existe)
        $filesToAdd = @("package.json", "src-tauri\Cargo.toml", "src-tauri\tauri.conf.json", "CHANGELOG.md", "PROGRESS-DESKTOP.md")
        if ($Release -and $releaseNotesPath) {
            $filesToAdd += "release-notes-v$newVersion.md"
            $filesToAdd += "SYNC-STATE.md"
            $filesToAdd += "src\lib\version.ts"
        }
        git add $filesToAdd
        git commit -m "chore(release): v$newVersion" --no-verify
        $tagExists = git tag -l "v$newVersion" 2>$null
        if ($tagExists) {
            Write-Warn "Tag v$newVersion ja existe - a recriar..."
            git tag -d "v$newVersion" 2>$null | Out-Null
        }
        git tag -a "v$newVersion" -m "Nexora Desktop v$newVersion"
        Write-Success "Versao v$newVersion preparada com sucesso!"
        $isNewRelease = $true
    }
}

# ---------------------------------------------------------
# HANDOFF: verificar SYNC-STATE.md antes do push
# ---------------------------------------------------------
# Verificar se SYNC-STATE.md foi modificado nesta sessao (staged ou unstaged)
# ou se foi commitado num dos commits ainda nao publicados
$syncUncommitted = git status --porcelain "SYNC-STATE.md" 2>$null
$syncInUnpushed  = git log "origin/$branch..HEAD" --name-only --format="" 2>$null | Select-String "SYNC-STATE.md"
if (-not $syncUncommitted -and -not $syncInUnpushed) {
    if ($Release) {
        Write-Warn "SYNC-STATE.md nao foi actualizado nesta sessao, mas modo Release activo."
        Write-Host "  A continuar com a promocao da release..." -ForegroundColor Gray
    } else {
        Write-Warn "SYNC-STATE.md nao foi actualizado nesta sessao."
        Write-Host "  Recomendado: actualiza SYNC-STATE.md para o proximo agente saber onde paraste." -ForegroundColor Gray
        $ans = Read-Host "  Continuar o push sem actualizar SYNC-STATE.md? [S/N]"
        if ($ans -notmatch '^[Ss]$') {
            Write-Host "  Push cancelado. Actualiza SYNC-STATE.md e corre o script de novo." -ForegroundColor Yellow
            Pop-Location; exit 0
        }
    }
} else {
    Write-Success "SYNC-STATE.md actualizado"
}

# ---------------------------------------------------------
# PUSH PARA O GITHUB
# ---------------------------------------------------------
Write-Step "Enviando para o GitHub..."

if ($script:GITHUB_TOKEN) {
    $remoteUrl        = git remote get-url origin
    $baseRepo         = $remoteUrl -replace "https://[^@]+@", "" -replace "https://", ""
    $authenticatedUrl = "https://$($REPO_OWNER):$($script:GITHUB_TOKEN)@$baseRepo"
    git push -u "$authenticatedUrl" $branch --tags
} else {
    git push -u origin $branch --tags
}

if ($LASTEXITCODE -eq 0) {
    Write-Success "Push dev concluido!"

    # ---------------------------------------------------------
    # MERGE PARA MAIN (apenas com -Release)
    # ---------------------------------------------------------
    if ($Release) {
        $devBranch = $branch
        $mergeOk   = Invoke-MergeToMain $newVersion $devBranch $authenticatedUrl
        if ($mergeOk -and $script:GITHUB_TOKEN) {
            Write-Host ""
            $watchAns = Read-Host "  Queres aguardar pelos GitHub Actions? [S/N] (Padrao: N)"
            if ($watchAns -match '^[Ss]$') {
                $mainSha = git rev-parse main 2>$null
                Watch-GitHubActions $mainSha $newVersion $script:GITHUB_TOKEN "main"
            }
        }
    }

    # Criar GitHub Release se houver nova versao e token
    if ($isNewRelease -and $script:GITHUB_TOKEN) {
        Write-Step "Criando Release no GitHub via API..."

        # Verificar se release ja existe para esta tag
        $releaseExists = $false
        $existingReleaseId = $null
        $headers = @{
            "Authorization" = "token $script:GITHUB_TOKEN"
            "Accept"        = "application/vnd.github+json"
        }

        try {
            $existing = Invoke-RestMethod `
                -Uri "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/releases/tags/v$newVersion" `
                -Method Get `
                -Headers $headers
            $releaseExists = $true
            $existingReleaseId = $existing.id
            Write-Warn "Release v$newVersion ja existe no GitHub."
        } catch {
            # 404 esperado se nao existir
            $releaseExists = $false
        }

        # Gerar titulo e corpo ricos (usado tanto no PATCH como no POST)
        $changelogSection = Parse-ChangelogSection $newVersion
        $releaseTitle     = "v$newVersion — $(Get-ReleaseTitle $newVersion $changelogSection)"
        $releaseBodyText  = Build-ReleaseBody $newVersion $commitMsg

        if ($releaseExists) {
            # O build.yml cria um draft automaticamente ao fazer push da tag.
            # Actualizamos esse draft (PATCH) para nao perder os assets ja anexados.
            Write-Step "Draft release v$newVersion detectado. A actualizar com conteudo rico e a publicar..."
            try {
                $patchPayload = @{
                    name       = "$releaseTitle"
                    body       = $releaseBodyText
                    draft      = $false
                    prerelease = (Get-IsPreRelease $newVersion)
                } | ConvertTo-Json

                $patchBytes = [System.Text.Encoding]::UTF8.GetBytes($patchPayload)

                Invoke-RestMethod `
                    -Uri     "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/releases/$existingReleaseId" `
                    -Method  Patch `
                    -Headers $headers `
                    -Body    $patchBytes `
                    -ContentType "application/json; charset=utf-8" > $null
                Write-Success "GitHub Release v$newVersion actualizada e publicada!"
            } catch {
                $stream = $_.Exception.Response.GetResponseStream()
                if ($stream) {
                    $reader = New-Object System.IO.StreamReader($stream)
                    Write-Warn "Erro da API GitHub (PATCH): $($reader.ReadToEnd())"
                } else {
                    Write-Warn "Nao foi possivel actualizar a Release: $_"
                }
            }
        } else {
            # Nao ha draft pre-existente — criar a release directamente.
            try {
                Write-Step "A criar GitHub Release: '$releaseTitle'"

                $postPayload = @{
                    tag_name   = "v$newVersion"
                    name       = "$releaseTitle"
                    body       = $releaseBodyText
                    draft      = $false
                    prerelease = (Get-IsPreRelease $newVersion)
                } | ConvertTo-Json

                $postBytes = [System.Text.Encoding]::UTF8.GetBytes($postPayload)

                Invoke-RestMethod `
                    -Uri     "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/releases" `
                    -Method  Post `
                    -Headers $headers `
                    -Body    $postBytes `
                    -ContentType "application/json; charset=utf-8" > $null
                Write-Success "GitHub Release v$newVersion publicada!"
            } catch {
                $stream = $_.Exception.Response.GetResponseStream()
                if ($stream) {
                    $reader = New-Object System.IO.StreamReader($stream)
                    Write-Warn "Erro da API GitHub (POST): $($reader.ReadToEnd())"
                } else {
                    Write-Warn "Nao foi possivel publicar a Release: $_"
                }
            }
        }
    }
} else {
    Write-Err "Falha ao enviar para o GitHub."
}

Pop-Location
