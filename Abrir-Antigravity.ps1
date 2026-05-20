# Lança o Antigravity para Nexora Desktop (perfil padrão, partilhado com Claude)
$antigravity = "$env:LOCALAPPDATA\Programs\Antigravity\Antigravity IDE.exe"
$workspace   = "C:\Dev\nexora-desktop\nexora-desktop.code-workspace"

if (-not (Test-Path $antigravity)) {
    Write-Host "[ERRO] Antigravity não encontrado em: $antigravity" -ForegroundColor Red
    exit 1
}

Write-Host "[Nexora Desktop] A abrir Antigravity..." -ForegroundColor Blue
Start-Process -FilePath $antigravity -ArgumentList "`"$workspace`""
