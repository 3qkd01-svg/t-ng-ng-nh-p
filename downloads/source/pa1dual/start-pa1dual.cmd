@echo off
setlocal DisableDelayedExpansion
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Can Node.js 22+ tu https://nodejs.org/ va Edge/Chrome.
  pause
  exit /b 1
)
node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 22 ? 0 : 1)"
if errorlevel 1 (
  echo Can Node.js 22 hoac moi hon.
  pause
  exit /b 1
)
node -e "try { process.exit(require('./node_modules/playwright-core/package.json').version === '1.63.0' ? 0 : 1) } catch { process.exit(1) }"
if errorlevel 1 (
  call npm ci --ignore-scripts --no-audit --no-fund --cache "%~dp0.npm-cache"
  if errorlevel 1 (
    echo Khong tai duoc thu vien. Kiem tra npm va mang.
    pause
    exit /b 1
  )
)
node pa1dual.mjs
set "pa1dual_result=%errorlevel%"
pause
exit /b %pa1dual_result%
