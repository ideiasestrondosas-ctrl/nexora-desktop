$ErrorActionPreference = 'Stop'
Write-Host "🚀 Inicializando o ambiente de desenvolvimento Nexora Desktop..." -ForegroundColor Cyan

# Ensure we are in the root directory (parent of scripts/)
$ProjectRoot = Resolve-Path "$PSScriptRoot\.."
Set-Location $ProjectRoot

Write-Host "`n[1/3] A instalar/atualizar dependências do NPM..." -ForegroundColor Yellow
npm install

Write-Host "`n[2/3] A compilar o Sidecar Node.js..." -ForegroundColor Yellow
npm run sidecar:build

Write-Host "`n[3/3] A iniciar o Tauri Dev Server..." -ForegroundColor Green
npm run tauri dev
