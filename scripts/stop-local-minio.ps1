#Requires -Version 5.1
<#
.SYNOPSIS
    Para a instancia MinIO local isolada para desenvolvimento da Nexora Desktop.

.DESCRIPTION
    Para de forma segura o container 'nexora-desktop-minio'.
    Os dados persistem no volume 'nexora-desktop-minio-data'.

.NOTES
    Para eliminar dados permanentemente, use start-local-minio.ps1 -Reset.
#>

$ContainerName = "nexora-desktop-minio"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  PARAR MinIO Local - Nexora Desktop" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$existing = docker ps -q --filter "name=$ContainerName"
if ($existing) {
    docker stop $ContainerName | Out-Null
    Write-Host "  Container '$ContainerName' parado com sucesso." -ForegroundColor Green
} else {
    Write-Host "  Container '$ContainerName' nao estava a correr." -ForegroundColor Yellow
}

Write-Host "`n  Nota: Os dados persistem no volume Docker." -ForegroundColor DarkGray
Write-Host "  Para eliminar tudo e recomecar, corra:" -ForegroundColor DarkGray
Write-Host '    .\scripts\start-local-minio.ps1 -Reset' -ForegroundColor DarkGray
Write-Host ""
