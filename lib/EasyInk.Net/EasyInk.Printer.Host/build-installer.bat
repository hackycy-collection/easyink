@echo off
setlocal

set PROJECT_DIR=%~dp0src
set ISS_FILE=%~dp0installer.iss

echo [1/2] Publishing...
dotnet publish "%PROJECT_DIR%\EasyInk.Printer.Host.csproj" -c Release --nologo
if errorlevel 1 (
    echo Publish failed
    exit /b 1
)

echo [2/2] Building installer...
set "ISCC="
where iscc >nul 2>&1 && set "ISCC=iscc"
if not defined ISCC if exist "E:\Program Files (x86)\Inno Setup 6\iscc.exe" set "ISCC=E:\Program Files (x86)\Inno Setup 6\iscc.exe"
if not defined ISCC if exist "C:\Program Files (x86)\Inno Setup 6\iscc.exe" set "ISCC=C:\Program Files (x86)\Inno Setup 6\iscc.exe"
if not defined ISCC if exist "C:\Program Files\Inno Setup 6\iscc.exe" set "ISCC=C:\Program Files\Inno Setup 6\iscc.exe"
if not defined ISCC (
    echo Inno Setup not found. Install Inno Setup 6 first.
    echo Download: https://jrsoftware.org/isinfo.php
    exit /b 1
)

"%ISCC%" "%ISS_FILE%"
if errorlevel 1 (
    echo Build failed
    exit /b 1
)

echo.
echo Done: output\EasyInkPrinterHost-Setup.exe