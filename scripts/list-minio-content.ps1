#Requires -Version 5.1
<#
.SYNOPSIS
    Lista o estado e conteudo da instancia MinIO local isolada para a Nexora Desktop.

.DESCRIPTION
    Este script le a configuracao de 'local-minio-config.json', verifica o estado do
    container Docker, lista buckets e objetos, e apresenta os dados de ligacao em
    formato texto e JSON prontos a copiar.

.NOTES
    Se o container nao estiver a correr, o script reporta o estado e sugere
    correr 'start-local-minio.ps1'.
    Datas apresentadas em ambos os formatos: ISO8601 e local amigavel.
#>

# --- CONFIGURATION ---
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$ConfigPath = Join-Path $ScriptDir "local-minio-config.json"

# Default configuration (used if JSON file does not exist)
$Defaults = @{
    containerName = "nexora-desktop-minio"
    apiPort       = 9010
    consolePort   = 9011
    bucket        = "nexora-desktop"
    region        = "us-east-1"
    endpoint      = "http://localhost:9010"
    basePath      = "uploads/"
    accessKey     = "desktopadmin"
    secretKey     = "desktop_secret_key"
    volumeName    = "nexora-desktop-minio-data"
}

# Load or create configuration
if (Test-Path $ConfigPath) {
    try {
        $Config = Get-Content $ConfigPath -Raw | ConvertFrom-Json
    } catch {
        Write-Warning "Falha ao ler '$ConfigPath'. A usar defaults."
        $Config = $Defaults
    }
} else {
    # Create default config file
    $Config = $Defaults
    $Config | ConvertTo-Json -Depth 3 | Set-Content $ConfigPath -Encoding UTF8
    Write-Host "Configuracao default criada em: $ConfigPath" -ForegroundColor Yellow
    Write-Host "Pode editar este ficheiro para alterar portas, credenciais, bucket, etc." -ForegroundColor Yellow
}

# Helper functions
function Write-Header($text) {
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "  $text" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
}

function Write-Info($label, $value, $color) {
    Write-Host "  $label : " -NoNewline -ForegroundColor Gray
    Write-Host $value -ForegroundColor $color
}

function Format-Size($bytes) {
    if ($bytes -ge 1GB) { "{0:N2} GB" -f ($bytes / 1GB) }
    elseif ($bytes -ge 1MB) { "{0:N2} MB" -f ($bytes / 1MB) }
    elseif ($bytes -ge 1KB) { "{0:N2} KB" -f ($bytes / 1KB) }
    else { "$bytes B" }
}

function Format-DateIso($dateStr) {
    try {
        $dt = [DateTime]::Parse($dateStr)
        return $dt.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    } catch {
        return $dateStr
    }
}

function Format-DateLocal($dateStr) {
    try {
        $dt = [DateTime]::Parse($dateStr)
        return $dt.ToString("dd/MM/yyyy HH:mm:ss")
    } catch {
        return $dateStr
    }
}

function Copy-ToClipboard($text) {
    try {
        if (Get-Command "Set-Clipboard" -ErrorAction SilentlyContinue) {
            Set-Clipboard -Value $text
            return $true
        } else {
            Add-Type -AssemblyName System.Windows.Forms
            [System.Windows.Forms.Clipboard]::SetText($text)
            return $true
        }
    } catch {
        return $false
    }
}

# --- MAIN ---

$ContainerName = $Config.containerName
$ApiPort       = $Config.apiPort
$ConsolePort   = $Config.consolePort
$BucketName    = $Config.bucket
$BasePrefix    = $Config.basePath
$Endpoint      = $Config.endpoint
$Region        = $Config.region
$AccessKey     = $Config.accessKey
$SecretKey     = $Config.secretKey

# --- SECTION 1: SERVICE STATUS ---
Write-Header "MINIO LOCAL - ESTADO"

# Check container status
$containerInfo = docker ps -a --filter "name=$ContainerName" --format "{{.Status}}" 2>$null
$containerRunning = docker ps -q --filter "name=$ContainerName" 2>$null

if (-not $containerInfo) {
    Write-Info "Container" "$ContainerName nao encontrado" "Red"
    Write-Host ""
    Write-Host "  Para criar e arrancar o MinIO local, corra:" -ForegroundColor Yellow
    Write-Host "    .\scripts\start-local-minio.ps1" -ForegroundColor White
    Write-Host ""
    exit 0
}

$statusText = $containerInfo.Trim()

if (-not $containerRunning) {
    Write-Info "Container" "$ContainerName - PARADO" "Red"
    Write-Info "Status" $statusText "Yellow"
    Write-Host ""
    Write-Host "  Para arrancar o MinIO local, corra:" -ForegroundColor Yellow
    Write-Host "    .\scripts\start-local-minio.ps1" -ForegroundColor White
    Write-Host ""
    exit 0
}

# Container is running
Write-Info "Container" "$ContainerName - A CORRER" "Green"
Write-Info "Status" $statusText "White"
Write-Info "API" "http://localhost:$ApiPort" "White"
Write-Info "Console" "http://localhost:$ConsolePort" "White"

# Health check
$healthStatus = "A verificar..."
$healthColor = "Yellow"
try {
    $resp = Invoke-RestMethod -Uri "http://localhost:$ApiPort/minio/health/live" -Method GET -TimeoutSec 3 -ErrorAction Stop
    $healthStatus = "Saudavel"
    $healthColor = "Green"
} catch {
    $healthStatus = "Indisponivel"
    $healthColor = "Red"
}
Write-Info "Health" $healthStatus $healthColor

# --- SECTION 2: BUCKETS ---
Write-Header "BUCKETS"

# Set alias in one command, then list buckets in another (using --json for robust parsing)
$mcAliasOnly = 'mc alias set local http://host.docker.internal:{0} {1} {2}' -f $ApiPort, $AccessKey, $SecretKey
$mcLsCmd = $mcAliasOnly + '; mc ls --json local'

$bucketOutput = docker run --rm --network host --entrypoint sh minio/mc -c $mcLsCmd 2>$null

$foundBuckets = @()
if ($bucketOutput) {
    $lines = $bucketOutput -split "`n" | Where-Object { $_.Trim() -ne "" -and $_.Trim().StartsWith("{") }
    foreach ($line in $lines) {
        try {
            $item = $line | ConvertFrom-Json
            if ($item.type -eq "folder" -and $item.key) {
                $name = $item.key -replace '/$',''
                if ($name) {
                    $foundBuckets += $name
                }
            }
        } catch {
            # Ignore parse errors for non-JSON lines
        }
    }
}

if ($foundBuckets.Count -gt 0) {
    foreach ($b in $foundBuckets) {
        $marker = if ($b -eq $BucketName) { " <-- configurado" } else { "" }
        Write-Host "  - $b$marker" -ForegroundColor White
    }
} else {
    Write-Host "  (nenhum bucket encontrado)" -ForegroundColor DarkGray
}

# --- SECTION 3: OBJECTS ---
Write-Header ("OBJETOS EM '{0}/{1}'" -f $BucketName, $BasePrefix)

$mcObjCmd = $mcAliasOnly + ('; mc ls --json --recursive local/{0}/{1}' -f $BucketName, $BasePrefix)
$objOutput = docker run --rm --network host --entrypoint sh minio/mc -c $mcObjCmd 2>$null

$objects = @()
if ($objOutput) {
    $lines = $objOutput -split "`n" | Where-Object { $_.Trim() -ne "" -and $_.Trim().StartsWith("{") }
    foreach ($line in $lines) {
        try {
            $item = $line | ConvertFrom-Json
            if ($item.type -eq "file" -and $item.key) {
                $objName = $item.key
                $sizeBytes = $item.size
                $dateStr = $item.lastModified

                $objects += [PSCustomObject]@{
                    Name      = Split-Path $objName -Leaf
                    FullPath  = $objName
                    SizeBytes = $sizeBytes
                    SizeHuman = Format-Size $sizeBytes
                    DateIso   = Format-DateIso $dateStr
                    DateLocal = Format-DateLocal $dateStr
                }
            }
        } catch {
            # Ignore parse errors for non-JSON lines
        }
    }
}

if ($objects.Count -gt 0) {
    $countMsg = "  ({0} objeto(s))" -f $objects.Count
    Write-Host $countMsg -ForegroundColor DarkGray
    Write-Host ""
    $headerLine = "  {0,-30} {1,12} {2,22} {3,20}" -f "Nome", "Tamanho", "Data ISO8601", "Data Local"
    Write-Host $headerLine -ForegroundColor DarkGray
    $sepLine = "  {0}" -f ("-" * 88)
    Write-Host $sepLine -ForegroundColor DarkGray
    foreach ($obj in $objects) {
        $objLine = "  {0,-30} {1,12} {2,22} {3,20}" -f $obj.Name, $obj.SizeHuman, $obj.DateIso, $obj.DateLocal
        Write-Host $objLine -ForegroundColor White
    }
} else {
    Write-Host "  (nenhum objeto encontrado no prefixo '$BasePrefix')" -ForegroundColor DarkGray
}

# --- SECTION 4: CONNECTION DATA (TEXT) ---
Write-Header "DADOS DE LIGACAO (TEXTO)"

$TextData = @"
Bucket:     $BucketName
Regiao:     $Region
Endpoint:   $Endpoint
Pasta base: $BasePrefix
Access Key: $AccessKey
Secret Key: $SecretKey
"@

Write-Host $TextData -ForegroundColor White

# --- SECTION 5: CONNECTION DATA (JSON) ---
Write-Header "DADOS DE LIGACAO (JSON)"

$JsonData = @{
    bucket    = $BucketName
    region    = $Region
    endpoint  = $Endpoint
    basePath  = $BasePrefix
    accessKey = $AccessKey
    secretKey = $SecretKey
} | ConvertTo-Json -Depth 3

Write-Host $JsonData -ForegroundColor White

# --- INTERACTIVE MENU ---
Write-Header "ACOES"
Write-Host "  [C] Copiar dados como texto para clipboard" -ForegroundColor Yellow
Write-Host "  [J] Copiar dados como JSON para clipboard" -ForegroundColor Yellow
Write-Host "  [O] Abrir Console Web no navegador" -ForegroundColor Yellow
Write-Host "  [R] Recarregar (executar novamente)" -ForegroundColor Yellow
Write-Host "  [Q] Sair" -ForegroundColor Yellow
Write-Host ""

$choice = Read-Host "  Escolha uma opcao"

switch ($choice.ToUpper()) {
    "C" {
        $ok = Copy-ToClipboard $TextData
        if ($ok) {
            Write-Host ""
            Write-Host "  Dados em formato texto copiados para o clipboard!" -ForegroundColor Green
        } else {
            Write-Host ""
            Write-Host "  Falha ao copiar para clipboard." -ForegroundColor Red
        }
    }
    "J" {
        $ok = Copy-ToClipboard $JsonData
        if ($ok) {
            Write-Host ""
            Write-Host "  Dados em formato JSON copiados para o clipboard!" -ForegroundColor Green
        } else {
            Write-Host ""
            Write-Host "  Falha ao copiar para clipboard." -ForegroundColor Red
        }
    }
    "O" {
        Start-Process "http://localhost:$ConsolePort"
        Write-Host ""
        Write-Host "  Console Web aberto no navegador." -ForegroundColor Green
    }
    "R" {
        & $MyInvocation.MyCommand.Definition
        exit 0
    }
    "Q" {
        Write-Host ""
        Write-Host "  A sair..." -ForegroundColor DarkGray
        exit 0
    }
    default {
        Write-Host ""
        Write-Host "  Opcao invalida. A sair..." -ForegroundColor Red
    }
}

Write-Host ""
