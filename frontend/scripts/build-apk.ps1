# Builds the CivicFix Android app and drops the APK where the backend serves it for download.
# Requires: Android SDK / Gradle toolchain available (e.g. via Android Studio).
#
# -ApiBaseUrl: where the app looks for the backend. Defaults to the Android emulator's
# alias for the host machine (10.0.2.2). For a physical device on the same Wi-Fi, pass
# your PC's LAN IP instead, e.g. -ApiBaseUrl http://192.168.1.42:4000
param(
    [string]$ApiBaseUrl = "http://10.0.2.2:4000"
)

$ErrorActionPreference = "Stop"

$FrontendDir = Split-Path -Parent $PSScriptRoot
$RepoRoot = Split-Path -Parent $FrontendDir
$env:VITE_API_BASE_URL = $ApiBaseUrl
Write-Host "Building app against API base URL: $ApiBaseUrl"

# Gradle needs a JDK. Reuse Android Studio's bundled JBR if the user hasn't set JAVA_HOME.
if (-not $env:JAVA_HOME) {
    $bundledJdkCandidates = @(
        "$env:ProgramFiles\Android\Android Studio\jbr",
        "$env:LOCALAPPDATA\Programs\Android Studio\jbr",
        "$env:ProgramFiles\Android\Android Studio\jre"
    )
    $bundledJdk = $bundledJdkCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
    if ($bundledJdk) {
        Write-Host "JAVA_HOME not set - using Android Studio's bundled JDK at $bundledJdk"
        $env:JAVA_HOME = $bundledJdk
    } else {
        throw "JAVA_HOME is not set and no bundled Android Studio JDK was found. Install Android Studio or set JAVA_HOME to a JDK 17+ install."
    }
}

Push-Location $FrontendDir
try {
    Write-Host "Building web bundle..."
    npm run build

    Write-Host "Syncing into Android native shell..."
    npx cap sync android

    Write-Host "Assembling debug APK..."
    Push-Location "android"
    try {
        & ./gradlew.bat assembleDebug
    } finally {
        Pop-Location
    }

    $ApkSource = Join-Path $FrontendDir "android\app\build\outputs\apk\debug\app-debug.apk"
    $DownloadsDir = Join-Path $RepoRoot "backend\public\downloads"
    New-Item -ItemType Directory -Force -Path $DownloadsDir | Out-Null
    $ApkDest = Join-Path $DownloadsDir "civicfix.apk"

    Copy-Item -Path $ApkSource -Destination $ApkDest -Force
    Write-Host "APK copied to $ApkDest"
} finally {
    Pop-Location
}
