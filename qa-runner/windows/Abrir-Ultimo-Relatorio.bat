@echo off
setlocal
cd /d "%~dp0.."
echo Nexora QA Runner - Abrir Ultimo Relatorio
echo.
node scripts\open-latest-report.mjs
pause
