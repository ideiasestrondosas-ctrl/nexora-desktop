# sync.ps1 — Validação de GitHub Actions pós-Release

**Data:** 2026-05-20
**Estado:** Aprovado — pronto para implementação

---

## Contexto

O script `scripts/sync.ps1` tem uma opção 3 (Release) que faz commit + bump de versão + push dev + merge main + criação de GitHub Release. Após o push, os GitHub Actions disparam automaticamente (CI + Build), mas o script termina imediatamente sem dar feedback sobre o resultado desses workflows. O utilizador tem de ir ao GitHub verificar manualmente se a release passou.

---

## Âmbito

### Incluído

- Nova pergunta interactiva após o merge para main: "Queres aguardar pelos GitHub Actions? [S/N]"
- Nova função PowerShell `Watch-GitHubActions` com polling à GitHub API a cada 30 segundos
- Monitorização dos dois workflows: `CI — Verificacao de Qualidade` (`ci.yml`) e `Build Nexora Desktop` (`build.yml`)
- Display em tempo real do estado de cada workflow (em fila / a correr / sucesso / falhou)
- Espera indefinida até ambos completarem; Ctrl+C para sair a qualquer momento
- Apresentação de URL directo ao run falhado para diagnóstico rápido
- Graceful degradation: sem `GITHUB_TOKEN` no `.env`, avisa e salta a funcionalidade

### Excluído

- Timeout máximo (o utilizador aguarda indefinidamente ou cancela com Ctrl+C)
- Monitorização de Dependabot (corre em schedule próprio, não é despoletado pelo push)
- Re-trigger automático de workflows falhados
- Notificação sonora ou de sistema operativo ao terminar

---

## Arquitectura

### Identificação dos Runs

A identificação dos runs correctos usa o **commit SHA do HEAD de main após o merge**:

```powershell
$mainSha = git rev-parse main
```

API endpoint:

```
GET https://api.github.com/repos/{owner}/{repo}/actions/runs?head_sha={sha}
```

A resposta inclui `workflow_runs[]` com os campos relevantes: `name`, `status`, `conclusion`, `html_url`, `created_at`, `updated_at`.

O SHA é determinístico e funciona para ambos os workflows (ci.yml e build.yml correm no push para main), mesmo se houver pushes simultâneos noutras branches.

### Workflows a monitorizar

| Nome na API                     | Ficheiro    |
| ------------------------------- | ----------- |
| `CI — Verificacao de Qualidade` | `ci.yml`    |
| `Build Nexora Desktop`          | `build.yml` |

A filtragem é por nome exacto no campo `name` dos workflow runs devolvidos pela API.

### Função `Watch-GitHubActions`

```powershell
function Watch-GitHubActions($sha, $version, $token)
```

**Parâmetros:**

- `$sha` — SHA do commit HEAD em main após merge
- `$version` — string da versão (ex: `0.24.0`) para mostrar no cabeçalho
- `$token` — GITHUB_TOKEN

**Algoritmo:**

```
loop:
  GET /actions/runs?head_sha={sha}
  filtrar por nome os 2 workflows

  se nenhum run encontrado ainda:
    mostrar "A aguardar início dos Actions..."
    aguardar 30s → repetir

  mostrar tabela de estado (ver Display abaixo)

  se todos completed:
    se todos conclusion=success → [OK] mensagem + sair com $true
    se algum conclusion≠success → [ERROR] mensagem com URLs + sair com $false

  aguardar 30s → repetir
```

**Estados possíveis por run:**

| `status`      | `conclusion` | Display        |
| ------------- | ------------ | -------------- |
| `queued`      | null         | `em fila`      |
| `in_progress` | null         | `a correr`     |
| `completed`   | `success`    | `sucesso ✅`   |
| `completed`   | `failure`    | `falhou ❌`    |
| `completed`   | `cancelled`  | `cancelado ⚠️` |
| `completed`   | outros       | `{conclusion}` |

### Display durante o polling

```
[AGUARDAR] GitHub Actions — v0.24.0 · Ctrl+C para sair
  Elapsed: 4m30s · próxima verificação em 30s

  ✅  CI — Verificacao de Qualidade    sucesso     (3m12s)
  ⏳  Build Nexora Desktop             a correr    (4m28s)
```

A duração de cada run é calculada com `(Get-Date) - [datetime]$run.created_at`.

### Display no final — sucesso total

```
  ✅  CI — Verificacao de Qualidade    sucesso     (3m12s)
  ✅  Build Nexora Desktop             sucesso     (22m04s)

[OK] Todos os Actions passaram! Release v0.24.0 concluida.
```

### Display no final — falha

```
  ✅  CI — Verificacao de Qualidade    sucesso     (3m12s)
  ❌  Build Nexora Desktop             falhou      (8m42s)
     https://github.com/ideiasestrondosas-ctrl/nexora-desktop/actions/runs/123456789

[ERROR] 1 workflow falhou. Corrige os erros e volta a lançar.
```

---

## Integração no sync.ps1

A função `Watch-GitHubActions` é definida no bloco de funções no topo do script (junto a `Invoke-MergeToMain`).

O bloco de chamada é inserido após `Invoke-MergeToMain` retornar com sucesso, **dentro do bloco `if ($Release)`**:

```powershell
# Após merge com sucesso
if ($script:GITHUB_TOKEN) {
    $ans = Read-Host "  Queres aguardar pelos GitHub Actions? [S/N] (Padrao: N)"
    if ($ans -match '^[Ss]$') {
        $mainSha = git rev-parse main 2>$null
        Watch-GitHubActions $mainSha $newVersion $script:GITHUB_TOKEN
    } else {
        Write-Info "Ver Actions em: https://github.com/$REPO_OWNER/$REPO_NAME/actions"
    }
} else {
    Write-Warn "GITHUB_TOKEN nao configurado — nao e possivel monitorizar os Actions."
    Write-Info "Ver Actions em: https://github.com/$REPO_OWNER/$REPO_NAME/actions"
}
```

---

## Tratamento de Erros

| Cenário                                  | Comportamento                                                |
| ---------------------------------------- | ------------------------------------------------------------ |
| `GITHUB_TOKEN` ausente ou vazio          | Aviso + link para GitHub + sai da função                     |
| Runs não encontrados nas primeiras polls | Mensagem "A aguardar início..." + retry cada 30s             |
| Erro HTTP na API (ex: 403, 500)          | `Write-Warn` com o erro + retry na próxima poll              |
| Workflow com `conclusion: cancelled`     | Tratado como falha — mostra URL e conta no total de falhas   |
| Ctrl+C durante o polling                 | PowerShell interrompe o loop; estado parcial já foi mostrado |
| `git rev-parse main` falha               | `Write-Warn` + salta a monitorização                         |

---

## Ficheiros a Modificar

| Ficheiro           | Alteração                                                                           |
| ------------------ | ----------------------------------------------------------------------------------- |
| `scripts/sync.ps1` | Adicionar função `Watch-GitHubActions` + bloco de chamada após `Invoke-MergeToMain` |

Nenhum outro ficheiro é modificado.

---

## Plano de Verificação

| Teste                    | Procedimento                           | Resultado esperado                         |
| ------------------------ | -------------------------------------- | ------------------------------------------ |
| Sem token                | Remover GITHUB_TOKEN do .env → opção 3 | Aviso + link, sem crash                    |
| Resposta N ao polling    | Opção 3 → responder N                  | Mostra link e sai imediatamente            |
| Polling em sucesso       | Opção 3 → S → aguardar CI pass         | Tabela actualiza, mensagem OK no final     |
| Polling em falha         | Forçar falha no CI → opção 3 → S       | URL do run falhado visível, mensagem ERROR |
| Runs ainda não iniciados | Primeira poll logo após push           | Mensagem "A aguardar início..." sem crash  |
| Ctrl+C                   | Ctrl+C durante polling                 | Script termina; sem estado corrompido      |
