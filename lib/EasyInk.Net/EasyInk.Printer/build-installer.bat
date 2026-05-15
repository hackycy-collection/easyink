@echo off
setlocal EnableDelayedExpansion

set PROJECT_DIR=%~dp0src
set ISS_FILE=%~dp0installer.iss
set VERSION=%~1
set DOTNET_VERSION_ARGS=
set ISCC_VERSION_ARG=

if defined VERSION (
    call :prepare_version_args "%VERSION%"
    if errorlevel 1 exit /b 1
)

echo [1/3] Preparing bundled SumatraPDF...
call :ensure_sumatra
if errorlevel 1 exit /b 1

echo [2/3] Publishing...
dotnet publish "%PROJECT_DIR%\EasyInk.Printer.csproj" -c Release --nologo %DOTNET_VERSION_ARGS%
if errorlevel 1 (
    echo Publish failed
    exit /b 1
)

call :verify_sqlite_interop "%PROJECT_DIR%\bin\Release\net48\publish"
if errorlevel 1 exit /b 1

echo [3/3] Building installer...
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

"%ISCC%" %ISCC_VERSION_ARG% "%ISS_FILE%"
if errorlevel 1 (
    echo Build failed
    exit /b 1
)

echo.
echo Done: output\EasyInkPrinter-Setup.exe
exit /b 0

:ensure_sumatra
if exist "%PROJECT_DIR%\SumatraPDF\SumatraPDF.exe" exit /b 0
powershell -ExecutionPolicy Bypass -File "%~dp0tools\download-sumatra.ps1"
if errorlevel 1 (
    echo Failed to prepare bundled SumatraPDF
    exit /b 1
)
exit /b 0

:verify_sqlite_interop
set PUBLISH_DIR=%~1
if not exist "%PUBLISH_DIR%\x64\SQLite.Interop.dll" (
    echo Missing SQLite native dependency: %PUBLISH_DIR%\x64\SQLite.Interop.dll
    exit /b 1
)
if not exist "%PUBLISH_DIR%\x86\SQLite.Interop.dll" (
    echo Missing SQLite native dependency: %PUBLISH_DIR%\x86\SQLite.Interop.dll
    exit /b 1
)
if not exist "%PUBLISH_DIR%\x64\pdfium.dll" (
    echo Missing pdfium native dependency: %PUBLISH_DIR%\x64\pdfium.dll
    exit /b 1
)
if not exist "%PUBLISH_DIR%\x86\pdfium.dll" (
    echo Missing pdfium native dependency: %PUBLISH_DIR%\x86\pdfium.dll
    exit /b 1
)
if not exist "%PUBLISH_DIR%\SumatraPDF\SumatraPDF.exe" (
    echo Missing bundled SumatraPDF: %PUBLISH_DIR%\SumatraPDF\SumatraPDF.exe
    echo Place SumatraPDF.exe under %PROJECT_DIR%\SumatraPDF before packaging.
    exit /b 1
)
exit /b 0

:prepare_version_args
set INPUT_VERSION=%~1
for /f "tokens=1 delims=-+" %%A in ("%INPUT_VERSION%") do set BASE_VERSION=%%A
for /f "tokens=1-4 delims=." %%A in ("%BASE_VERSION%") do (
    set V1=%%A
    set V2=%%B
    set V3=%%C
    set V4=%%D
)

if not defined V1 goto :invalid_version
if not defined V2 goto :invalid_version
if not defined V3 goto :invalid_version
if not defined V4 set V4=0

set ASSEMBLY_VERSION=%V1%.%V2%.%V3%.%V4%
set DOTNET_VERSION_ARGS=/p:Version=%INPUT_VERSION% /p:AssemblyVersion=%ASSEMBLY_VERSION% /p:FileVersion=%ASSEMBLY_VERSION% /p:InformationalVersion=%INPUT_VERSION%
set ISCC_VERSION_ARG=/DAppVersion=%INPUT_VERSION%
echo Using version %INPUT_VERSION% ^(assembly/file %ASSEMBLY_VERSION%^)
exit /b 0

:invalid_version
echo Invalid version: %INPUT_VERSION%
echo Expected format: major.minor.patch or major.minor.patch.suffix
exit /b 1
