#Requires -Version 5.1
<#
.SYNOPSIS
    Arranca ou verifica a instancia MinIO local isolada para desenvolvimento da Nexora Desktop.

.DESCRIPTION
    Este script verifica se o container 'nexora-desktop-minio' esta a correr.
    Se nao estiver, cria-o automaticamente com as configuracoes isoladas.
    No final, apresenta todas as informacoes de acesso.

.NOTES
    Nome do Container: nexora-desktop-minio
    Portas: 9010 (API S3), 9011 (Console Web)
    Volume isolado: nexora-desktop-minio-data
    Isolamento garantido: Nao interfere no 'nexora-minio' (portas 9000/9001).
#>

param(
    [switch]$Reset,
    [switch]$Stop
)

$ContainerName = "nexora-desktop-minio"
$DataVolume    = "nexora-desktop-minio-data"
$ApiPort       = 9010
$ConsolePort   = 9011
$MinioImage    = "minio/minio:latest"
$RootUser      = "desktopadmin"
$RootPassword  = "desktop_secret_key"
$BucketName    = "nexora-desktop"
$BasePrefix    = "uploads/"

function Write-Header($text) {
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "  $text" -ForegroundColor Cyan
    Write-Host "========================================`n" -ForegroundColor Cyan
}

function Write-Info($label, $value) {
    Write-Host "  $label" -NoNewline -ForegroundColor Gray
    Write-Host "$value" -ForegroundColor White
}

# --- STOP ---
if ($Stop) {
    Write-Header "PARAR MinIO Local"
    $existing = docker ps -q --filter "name=$ContainerName"
    if ($existing) {
        docker stop $ContainerName | Out-Null
        Write-Host "  Container '$ContainerName' parado com sucesso." -ForegroundColor Green
    } else {
        Write-Host "  Container '$ContainerName' nao estava a correr." -ForegroundColor Yellow
    }
    exit 0
}

# --- RESET ---
if ($Reset) {
    Write-Header "REINICIAR MinIO Local (dados serao perdidos)"
    $existing = docker ps -aq --filter "name=$ContainerName"
    if ($existing) {
        docker rm -f $ContainerName | Out-Null
        Write-Host "  Container removido." -ForegroundColor Green
    }
    docker volume rm $DataVolume 2>$null | Out-Null
    Write-Host "  Volume removido." -ForegroundColor Green
}

# --- START / VERIFY ---
Write-Header "MinIO Local - Nexora Desktop"

$existingContainer = docker ps -q --filter "name=$ContainerName"
if ($existingContainer) {
    Write-Host "  Container '$ContainerName' ja esta a correr." -ForegroundColor Green
} else {
    $existed = docker ps -aq --filter "name=$ContainerName"
    if ($existed) {
        Write-Host "  Container existente encontrado. A iniciar..." -ForegroundColor Yellow
        docker start $ContainerName | Out-Null
    } else {
        Write-Host "  A criar container '$ContainerName' pela primeira vez..." -ForegroundColor Yellow
        docker run -d `
            --name $ContainerName `
            -p "${ApiPort}:9000" `
            -p "${ConsolePort}:9001" `
            -v "${DataVolume}:/data" `
            -e "MINIO_ROOT_USER=$RootUser" `
            -e "MINIO_ROOT_PASSWORD=$RootPassword" `
            $MinioImage `
            server /data --console-address ":9001" | Out-Null
        Write-Host "  Container criado. A aguardar arranque..." -ForegroundColor Yellow

        # Wait for health
        $maxWait = 30
        $elapsed = 0
        while ($elapsed -lt $maxWait) {
            try {
                $resp = Invoke-RestMethod -Uri "http://localhost:$ApiPort/minio/health/live" -Method GET -TimeoutSec 2 -ErrorAction Stop
                break
            } catch {
                Start-Sleep -Milliseconds 500
                $elapsed++
            }
        }
        if ($elapsed -ge $maxWait) {
            Write-Error "  Falha ao aguardar arranque do MinIO. Verifique 'docker logs $ContainerName'."
            exit 1
        }

        # Create bucket and uploads prefix (PowerShell 5.1 safe approach)
        $mcAliasCmd = 'mc alias set local http://host.docker.internal:{0} {1} {2}' -f $ApiPort, $RootUser, $RootPassword
        $mcMbCmd    = $mcAliasCmd + '; mc mb --ignore-existing local/{0}' -f $BucketName
        $mcPipeCmd  = 'mc alias set local http://host.docker.internal:{0} {1} {2}; echo keep | mc pipe local/{3}/{4}.keep' -f $ApiPort, $RootUser, $RootPassword, $BucketName, $BasePrefix

        docker run --rm --network host --entrypoint sh minio/mc -c $mcAliasCmd 2>$null | Out-Null
        docker run --rm --network host --entrypoint sh minio/mc -c $mcMbCmd 2>$null | Out-Null
        docker run --rm --network host --entrypoint sh minio/mc -c $mcPipeCmd 2>$null | Out-Null
        Write-Host "  Bucket '$BucketName' com prefixo '$BasePrefix' configurado." -ForegroundColor Green
    }
}

# --- HEALTH CHECK ---
try {
    $health = Invoke-RestMethod -Uri "http://localhost:$ApiPort/minio/health/live" -Method GET -TimeoutSec 3
    $status = "Saudavel"
    $statusColor = "Green"
} catch {
    $status = "Indisponivel"
    $statusColor = "Red"
}

# --- OUTPUT ---
Write-Header "ESTADO DO SERVICO"
Write-Info "Status do Container  : " "$status"
Write-Info "Nome do Container    : " "$ContainerName"
Write-Info "Imagem               : " "$MinioImage"
Write-Info "Volume Persistente   : " "$DataVolume"
Write-Info 'Porta API (S3)       : ' "http://localhost:$ApiPort"
Write-Info "Porta Console Web    : " "http://localhost:$ConsolePort"

Write-Header "CREDENCIAIS DE ACESSO"
Write-Info 'Access Key (User)    : ' "$RootUser"
Write-Info 'Secret Key (Password): ' "$RootPassword"

Write-Header "DADOS PARA LIGACAO NA APLICACAO"
Write-Info "Bucket               : " "$BucketName"
Write-Info "Regiao               : " "us-east-1"
Write-Info "Endpoint             : " "http://localhost:$ApiPort"
Write-Info 'Pasta base (Prefixo) : ' "$BasePrefix"
Write-Info "Access Key           : " "$RootUser"
Write-Info "Secret Key           : " "$RootPassword"

Write-Header "ACESSO AO CONSOLE WEB"
Write-Host "  URL: http://localhost:$ConsolePort" -ForegroundColor White
Write-Host "  User: $RootUser" -ForegroundColor White
Write-Host "  Pass: $RootPassword" -ForegroundColor White

Write-Host "`n  Dica: O prefixo 'uploads/' significa que os ficheiros serao armazenados" -ForegroundColor DarkGray
Write-Host "  como 's3://nexora-desktop/uploads/<nome-do-ficheiro>'." -ForegroundColor DarkGray
Write-Host "`n  Comandos uteis:" -ForegroundColor DarkGray
Write-Host "    .\scripts\start-local-minio.ps1        # Verificar/Arrancar" -ForegroundColor DarkGray
Write-Host "    .\scripts\start-local-minio.ps1 -Stop  # Parar container" -ForegroundColor DarkGray
Write-Host "    .\scripts\start-local-minio.ps1 -Reset # Eliminar dados e recomecar" -ForegroundColor DarkGray
