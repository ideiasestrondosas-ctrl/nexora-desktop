@echo off
setlocal
cd /d "%~dp0.."
echo Nexora QA Runner - Teste Completo
echo.
node scripts\qa-runner.mjs --suite complete
pause
