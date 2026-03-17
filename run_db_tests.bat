@echo off
setlocal

echo Ejecutando prueba 001_validar_moneda_presupuesto.sql
psql -U postgres -d gastos_db -f C:\Projects\Elatilo\DATABASE\tests\001_validar_moneda_presupuesto.sql
if errorlevel 1 goto :fail

echo.
echo Ejecutando prueba 002_aprobar_comprobante_misma_moneda.sql
psql -U postgres -d gastos_db -f C:\Projects\Elatilo\DATABASE\tests\002_aprobar_comprobante_misma_moneda.sql
if errorlevel 1 goto :fail

echo.
echo Ejecutando prueba 003_rechazar_comprobante.sql
psql -U postgres -d gastos_db -f C:\Projects\Elatilo\DATABASE\tests\003_rechazar_comprobante.sql
if errorlevel 1 goto :fail

echo.
echo Todas las pruebas SQL terminaron correctamente.
goto :end

:fail
echo.
echo Una prueba fallo. Revisa la salida anterior.
exit /b 1

:end
endlocal
