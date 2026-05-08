# Download SumatraPDF portable exe for bundling
# Run this script once before building to fetch the SumatraPDF binary

param(
    [string]$Version = "3.5.2"
)

$ErrorActionPreference = "Stop"

$toolsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$targetDir = Join-Path (Split-Path -Parent $toolsDir) "src\bin\SumatraPDF"
$url = "https://www.sumatrapdfreader.org/dl/rel/$Version/SumatraPDF-$Version-64.exe"

if (!(Test-Path $targetDir)) {
    New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
}

$targetFile = Join-Path $targetDir "SumatraPDF.exe"
if (Test-Path $targetFile) {
    Write-Host "SumatraPDF.exe already exists at $targetFile"
    exit 0
}

Write-Host "Downloading SumatraPDF $Version (64-bit)..."
$tempFile = Join-Path $env:TEMP "SumatraPDF-$Version-64.exe"

try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri $url -OutFile $tempFile -UseBasicParsing
    Copy-Item $tempFile $targetFile -Force
    Write-Host "Done: $targetFile"
} finally {
    if (Test-Path $tempFile) { Remove-Item $tempFile -Force }
}
