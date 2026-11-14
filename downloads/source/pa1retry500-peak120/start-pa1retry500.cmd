@echo off
setlocal DisableDelayedExpansion
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Can cai Node.js 24 LTS tu https://nodejs.org/
  pause
  exit /b 1
)
node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 22 ? 0 : 1)"
if errorlevel 1 (
  echo Can Node.js 22 hoac moi hon.
  pause
  exit /b 1
)
call npm ci --ignore-scripts --no-audit --no-fund --cache "%~dp0.npm-cache"
if errorlevel 1 (
  echo Khong cai duoc thu vien. Kiem tra npm va mang.
  pause
  exit /b 1
)
node pa1retry500.mjs
set "pa1retry500_result=%errorlevel%"
pause
exit /b %pa1retry500_result%