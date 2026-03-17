@echo off
setlocal

cd /d "%~dp0backend"

if not exist ".venv\Scripts\activate.bat" (
    echo No se encontro el entorno virtual en backend\.venv
    echo Crea el venv primero con: python -m venv .venv
    pause
    exit /b 1
)

call ".venv\Scripts\activate.bat"

echo Iniciando backend en http://0.0.0.0:8000
uvicorn main:app --reload --host 0.0.0.0 --port 8000

endlocal
