@echo off
setlocal
cd /d "%~dp0.."
echo Nexora QA Runner - Stress Leve
echo.
node scripts\qa-runner.mjs --suite stress-light
pause
