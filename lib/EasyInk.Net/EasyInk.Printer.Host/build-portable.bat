@echo off
setlocal

set PROJECT_DIR=%~dp0src
set OUTPUT_DIR=%~dp0output
set ZIP_NAME=EasyInkPrinterHost-Portable

echo [1/2] Publishing...
dotnet publish "%PROJECT_DIR%\EasyInk.Printer.Host.csproj" -c Release --nologo
if errorlevel 1 (
    echo Publish failed
    exit /b 1
)

echo [2/2] Packaging portable...
if exist "%OUTPUT_DIR%\%ZIP_NAME%.zip" del "%OUTPUT_DIR%\%ZIP_NAME%.zip"
if not exist "%OUTPUT_DIR%" mkdir "%OUTPUT_DIR%"

powershell -NoProfile -Command "Compress-Archive -Path '%PROJECT_DIR%\bin\Release\net48\publish\*' -DestinationPath '%OUTPUT_DIR%\%ZIP_NAME%.zip' -Force"
if errorlevel 1 (
    echo Package failed
    exit /b 1
)

echo.
echo Done: output\%ZIP_NAME%.zip
echo Run EasyInk.Printer.Host.exe directly after extract