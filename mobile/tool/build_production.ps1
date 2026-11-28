<#
.SYNOPSIS
    FarmConnect - production release build (Windows).

.DESCRIPTION
    Produces the release APK and the Play Store App Bundle against the live
    FarmConnect backend on Render. The API host is pinned here so a release
    build can never accidentally ship the local emulator URL
    (http://10.0.2.2:5000).

.PARAMETER Target
    "apk", "bundle" or "all" (default: all).

.EXAMPLE
    .\tool\build_production.ps1
    .\tool\build_production.ps1 -Target apk
#>
[CmdletBinding()]
param(
    [ValidateSet('apk', 'bundle', 'all')]
    [string]$Target = 'all'
)

$ErrorActionPreference = 'Stop'

$ApiBaseUrl = 'https://farmconnect-api-sn98.onrender.com/api'
$SocketUrl  = 'https://farmconnect-api-sn98.onrender.com'

$ScriptDir  = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Split-Path -Parent $ScriptDir
Push-Location $ProjectDir

try {
    if (-not (Get-Command flutter -ErrorAction SilentlyContinue)) {
        throw 'flutter was not found on the PATH'
    }

    Write-Host '==> FarmConnect production build' -ForegroundColor Cyan
    Write-Host "    API_BASE_URL = $ApiBaseUrl"
    Write-Host "    SOCKET_URL   = $SocketUrl"
    Write-Host "    target       = $Target"
    Write-Host ''

    Write-Host '==> flutter pub get' -ForegroundColor Cyan
    flutter pub get
    if ($LASTEXITCODE -ne 0) { throw 'flutter pub get failed' }
    Write-Host ''

    Write-Host '==> flutter analyze' -ForegroundColor Cyan
    flutter analyze
    if ($LASTEXITCODE -ne 0) { throw 'flutter analyze failed' }
    Write-Host ''

    Write-Host '==> flutter test' -ForegroundColor Cyan
    flutter test
    if ($LASTEXITCODE -ne 0) { throw 'flutter test failed' }
    Write-Host ''

    function Invoke-ReleaseBuild([string]$Format) {
        flutter build $Format --release `
            --dart-define="API_BASE_URL=$ApiBaseUrl" `
            --dart-define="SOCKET_URL=$SocketUrl"
        if ($LASTEXITCODE -ne 0) { throw "flutter build $Format --release failed" }
    }

    switch ($Target) {
        'apk'    { Invoke-ReleaseBuild 'apk' }
        'bundle' { Invoke-ReleaseBuild 'appbundle' }
        'all'    { Invoke-ReleaseBuild 'apk'; Write-Host ''; Invoke-ReleaseBuild 'appbundle' }
    }

    Write-Host ''
    Write-Host '==> Artefacts' -ForegroundColor Cyan
    $artefacts = @(
        'build\app\outputs\flutter-apk\app-release.apk',
        'build\app\outputs\bundle\release\app-release.aab'
    )
    foreach ($artefact in $artefacts) {
        $path = Join-Path $ProjectDir $artefact
        if (Test-Path $path) {
            $size = '{0:N1} MB' -f ((Get-Item $path).Length / 1MB)
            Write-Host "    $artefact  ($size)"
        }
    }

    Write-Host ''
    Write-Host 'Done. Remember: a release artefact is Play Store ready ONLY when' -ForegroundColor Yellow
    Write-Host 'android\key.properties points at the owner''s upload keystore.' -ForegroundColor Yellow
}
finally {
    Pop-Location
}
