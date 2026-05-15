# Download SumatraPDF portable exe for bundling with EasyInk.Printer.
# Run before packaging so src\SumatraPDF\SumatraPDF.exe is included in publish output.

param(
    [string]$Version = "3.5.2"
)

$ErrorActionPreference = "Stop"

$toolsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$printerDir = Split-Path -Parent $toolsDir
$targetDir = Join-Path $printerDir "src\SumatraPDF"
$url = "https://www.sumatrapdfreader.org/dl/rel/$Version/SumatraPDF-$Version.zip"

if (!(Test-Path $targetDir)) {
    New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
}

$targetFile = Join-Path $targetDir "SumatraPDF.exe"
if (Test-Path $targetFile) {
    Write-Host "SumatraPDF.exe already exists at $targetFile"
    exit 0
}

$tempFile = Join-Path $env:TEMP "SumatraPDF-$Version.zip"
$extractDir = Join-Path $env:TEMP "SumatraPDF-$Version"
Write-Host "Downloading SumatraPDF $Version portable (32-bit)..."

try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri $url -OutFile $tempFile -UseBasicParsing

    if (Test-Path $extractDir) { Remove-Item $extractDir -Recurse -Force }
    New-Item -ItemType Directory -Path $extractDir -Force | Out-Null

    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::ExtractToDirectory($tempFile, $extractDir)

    $downloadedExe = Get-ChildItem -Path $extractDir -Filter "SumatraPDF.exe" -Recurse | Select-Object -First 1
    if ($null -eq $downloadedExe) {
        throw "SumatraPDF.exe not found in downloaded archive"
    }

    Copy-Item $downloadedExe.FullName $targetFile -Force
    Write-Host "Done: $targetFile"
} finally {
    if (Test-Path $tempFile) { Remove-Item $tempFile -Force }
    if (Test-Path $extractDir) { Remove-Item $extractDir -Recurse -Force }
}
