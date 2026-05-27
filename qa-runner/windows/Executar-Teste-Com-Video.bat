@echo off
setlocal
cd /d "%~dp0.."
echo Nexora QA Runner - Teste Com Video
echo.
node scripts\qa-runner.mjs --suite video
pause
