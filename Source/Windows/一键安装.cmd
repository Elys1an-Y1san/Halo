@echo off
setlocal
powershell.exe -NoLogo -NoProfile -STA -ExecutionPolicy Bypass -File "%~dp0Install-Halo.ps1" -Mode Standalone
if errorlevel 1 (
    echo Installer did not finish. See the message above.
    pause
    exit /b 1
)
endlocal
