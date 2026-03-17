@echo off
setlocal

cd /d "%~dp0frontend"

if not exist "package.json" (
    echo No se encontro package.json en frontend
    pause
    exit /b 1
)

echo Iniciando frontend con Vite
npm run dev -- --host 0.0.0.0

endlocal
