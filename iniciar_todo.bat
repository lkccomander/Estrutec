@echo off
setlocal EnableExtensions EnableDelayedExpansion
title PROYECTOS

call :kill_port 8000 "backend"
call :kill_port 5173 "frontend"

start "Backend Elatilo" cmd /k "%~dp0ini.bat"
start "Frontend Elatilo" cmd /k "%~dp0ininpm.bat"

endlocal
exit /b 0

:kill_port
set "TARGET_PORT=%~1"
set "TARGET_NAME=%~2"
set "FOUND_PID="

for /f "tokens=5" %%P in ('netstat -ano ^| findstr /r /c:":%TARGET_PORT% .*LISTENING"') do (
    set "FOUND_PID=%%P"
    goto :kill_pid
)

echo No habia proceso escuchando en el puerto %TARGET_PORT% para %TARGET_NAME%.
exit /b 0

:kill_pid
echo Reiniciando %TARGET_NAME% en puerto %TARGET_PORT% ^(PID !FOUND_PID!^).
taskkill /PID !FOUND_PID! /F >nul 2>&1
timeout /t 1 /nobreak >nul
exit /b 0
