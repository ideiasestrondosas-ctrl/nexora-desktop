# sync.ps1 — GitHub Actions Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar à opção 3 (Release) do sync.ps1 a capacidade de aguardar os GitHub Actions e mostrar o resultado em tempo real, identificando os runs pelo commit SHA.

**Architecture:** Uma nova função PowerShell `Watch-GitHubActions` é inserida no bloco de funções do topo do script; um bloco de chamada de 15 linhas é inserido no fluxo Release após o merge para main. Nenhuma outra parte do script é alterada.

**Tech Stack:** PowerShell 7+, GitHub REST API (`/actions/runs?head_sha=`), GITHUB_TOKEN via `.env`.

---

## Ficheiros

| Ficheiro           | Alteração                                                                                         |
| ------------------ | ------------------------------------------------------------------------------------------------- |
| `scripts/sync.ps1` | **Inserir** função `Watch-GitHubActions` após linha 65; **modificar** bloco Release linha 797-800 |

---

### Task 1: Adicionar a função `Watch-GitHubActions`

**Files:**

- Modify: `scripts/sync.ps1:65` (inserir depois da linha 65, antes do bloco `-Help`)

- [ ] **Step 1: Abrir sync.ps1 e localizar o ponto de inserção**

  A função `Invoke-MergeToMain` termina na linha 65 com `}`. Inserir a nova função **imediatamente a seguir** (linha 66), antes do comentário `# AJUDA (-Help)`.

- [ ] **Step 2: Inserir a função `Watch-GitHubActions`**

  Inserir o seguinte bloco completo entre a linha 65 e a linha 67 (`# ---------------------------------------------------------`):

  ```powershell
  # ---------------------------------------------------------
  # FUNCAO: Monitorizar GitHub Actions apos release
  # ---------------------------------------------------------
  function Watch-GitHubActions($sha, $version, $token) {
      $headers    = @{ "Authorization" = "token $token"; "Accept" = "application/vnd.github+json" }
      $apiUrl     = "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/actions/runs?head_sha=$sha"
      $targets    = @("CI — Verificacao de Qualidade", "Build Nexora Desktop")
      $startTime  = Get-Date

      Write-Host ""
      Write-Host "  [AGUARDAR] GitHub Actions — v$version  ·  Ctrl+C para sair" -ForegroundColor Cyan

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
              $run = $runs | Where-Object { $_.name -eq $wfName } | Select-Object -First 1

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
                          $anyFailed = $true
                      }
                  }
              }
          }

          if ($allDone) {
              Write-Host ""
              if ($anyFailed) {
                  Write-Err "Um ou mais workflows falharam. Corrige os erros e volta a lancar."
              } else {
                  Write-Success "Todos os Actions passaram! Release v$version concluida."
              }
              return
          }

          Start-Sleep -Seconds 30
      }
  }
  ```

- [ ] **Step 3: Verificar que o script ainda tem sintaxe válida**

  ```powershell
  powershell -NoProfile -Command "& { . 'C:\Dev\nexora-desktop\scripts\sync.ps1' -Help }"
  ```

  Resultado esperado: o menu de ajuda é apresentado sem erros de parsing.

---

### Task 2: Adicionar o bloco de chamada após o merge

**Files:**

- Modify: `scripts/sync.ps1:797-800`

O bloco actual (linhas 797-800) é:

```powershell
    if ($Release) {
        $devBranch = $branch
        Invoke-MergeToMain $newVersion $devBranch $authenticatedUrl | Out-Null
    }
```

- [ ] **Step 1: Substituir o bloco pelo novo bloco com chamada a `Watch-GitHubActions`**

  ```powershell
      if ($Release) {
          $devBranch = $branch
          $mergeOk   = Invoke-MergeToMain $newVersion $devBranch $authenticatedUrl
          if ($mergeOk) {
              if ($script:GITHUB_TOKEN) {
                  Write-Host ""
                  $watchAns = Read-Host "  Queres aguardar pelos GitHub Actions? [S/N] (Padrao: N)"
                  if ($watchAns -match '^[Ss]$') {
                      $mainSha = git rev-parse main 2>$null
                      Watch-GitHubActions $mainSha $newVersion $script:GITHUB_TOKEN
                  } else {
                      Write-Info "Ver Actions em: https://github.com/$REPO_OWNER/$REPO_NAME/actions"
                  }
              } else {
                  Write-Warn "GITHUB_TOKEN nao configurado -- nao e possivel monitorizar os Actions."
                  Write-Info "Ver Actions em: https://github.com/$REPO_OWNER/$REPO_NAME/actions"
              }
          }
      }
  ```

- [ ] **Step 2: Verificar sintaxe**

  ```powershell
  powershell -NoProfile -Command "& { . 'C:\Dev\nexora-desktop\scripts\sync.ps1' -Help }"
  ```

  Resultado esperado: menu de ajuda sem erros.

- [ ] **Step 3: Teste manual — sem token**

  Temporariamente remover ou comentar `GITHUB_TOKEN` no `.env` e correr o script em modo Release (ou simular chegando ao ponto do merge). Verificar:
  - Mensagem `GITHUB_TOKEN nao configurado` aparece
  - Link para GitHub é mostrado
  - Script não crasha

  Repor o `GITHUB_TOKEN` depois do teste.

- [ ] **Step 4: Teste manual — resposta N**

  Com token configurado, chegar ao ponto pós-merge e responder `N` ao prompt. Verificar:
  - Link `Ver Actions em: https://github.com/...` é mostrado
  - Script termina normalmente

- [ ] **Step 5: Teste manual — polling com SHA real**

  Para validar o polling sem fazer uma release completa, chamar a função directamente no PowerShell com um SHA de um push recente:

  ```powershell
  cd "C:\Dev\nexora-desktop"
  . .\scripts\sync.ps1 -Help  # carrega o script sem correr
  # Obter SHA de um push recente para main (ou dev):
  $sha = git rev-parse HEAD
  $token = (Get-Content .env | Select-String "GITHUB_TOKEN").ToString().Split("=")[1].Trim()
  Watch-GitHubActions $sha "TEST" $token
  ```

  Resultado esperado: tabela de estado aparece; runs reais do GitHub são mostrados.

- [ ] **Step 6: Commit**

  ```powershell
  cd "C:\Dev\nexora-desktop"
  git add scripts/sync.ps1
  git commit -m "feat(sync): watch GitHub Actions after release and report pass/fail"
  ```

  Mensagem esperada: `[dev xxxxxxx] feat(sync): watch GitHub Actions after release and report pass/fail`
