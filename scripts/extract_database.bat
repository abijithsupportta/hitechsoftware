@echo off
REM =====================================================================
REM Hi Tech Software - Database Extraction Batch File
REM =====================================================================

echo === HI TECH SOFTWARE - DATABASE EXTRACTION ===
echo.
echo Starting database extraction from live Supabase project...
echo.

REM Check if PowerShell is available
powershell -Command "Get-Host" >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: PowerShell not available
    pause
    exit /b 1
)

REM Run the PowerShell script
echo Running database extraction script...
powershell -ExecutionPolicy Bypass -File "extract_database.ps1"

if %errorlevel% equ 0 (
    echo.
    echo === EXTRACTION COMPLETED SUCCESSFULLY ===
    echo.
    echo Check the database_exports folder for generated files.
    echo.
) else (
    echo.
    echo === EXTRACTION FAILED ===
    echo.
    echo Please check the error messages above.
    echo.
)

pause
