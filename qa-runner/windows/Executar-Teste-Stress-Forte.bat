@echo off
setlocal
cd /d "%~dp0.."
echo Nexora QA Runner - Stress Forte
echo Este teste cria varias copias temporarias de videos na area QA.
echo.
node scripts\qa-runner.mjs --suite stress-heavy
pause
