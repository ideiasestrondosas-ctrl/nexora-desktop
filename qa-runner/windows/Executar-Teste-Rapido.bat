@echo off
setlocal
cd /d "%~dp0.."
echo Nexora QA Runner - Teste Rapido
echo.
node scripts\qa-runner.mjs --suite quick
pause
