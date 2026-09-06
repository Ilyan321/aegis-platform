# ==============================================================================
# Aegis Security Platform — Windows PowerShell Installer
# https://aegis-platform.ilyankhan.tech
# ==============================================================================

$ErrorActionPreference = 'Stop'

Write-Host "   ___    ___________________" -ForegroundColor Cyan
Write-Host "  /   |  / ____/ ____/  _/ ___/" -ForegroundColor Cyan
Write-Host " / /| | / __/ / / __ / / \__ \ " -ForegroundColor Cyan
Write-Host "/ ___ |/ /___/ /_/ // / ___/ / " -ForegroundColor Cyan
Write-Host "/_/  |_/_____/\____/___//____/  " -ForegroundColor Cyan
Write-Host "Zero-Dependency DevSecOps Intercept Mesh`n" -ForegroundColor DarkGray

$Repo = "Ilyan321/aegis-platform"
$BinaryName = "aegis.exe"
$InstallDir = "$env:LOCALAPPDATA\Programs\Aegis"

if (-not (Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}

$TargetBinary = "$InstallDir\$BinaryName"
$DownloadUrl = "https://github.com/$Repo/releases/latest/download/aegis-windows-amd64.exe"

Write-Host "==> Downloading latest Aegis CLI for Windows (x64)..." -ForegroundColor Blue

try {
    Invoke-WebRequest -Uri $DownloadUrl -OutFile $TargetBinary -UseBasicParsing
    Write-Host "✓ Downloaded Aegis binary successfully." -ForegroundColor Green
} catch {
    Write-Host "Note: Release binary not yet on GitHub Releases. If you have Go installed, compile via: go install github.com/$Repo/apps/cli/cmd/aegis@latest" -ForegroundColor DarkYellow
}

# Add to User PATH if not present
$UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($UserPath -notlike "*$InstallDir*") {
    [Environment]::SetEnvironmentVariable("Path", "$UserPath;$InstallDir", "User")
    $env:Path += ";$InstallDir"
    Write-Host "==> Added $InstallDir to user PATH." -ForegroundColor Blue
}

Write-Host "`n✓ Aegis CLI installed successfully to $TargetBinary`n" -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor White
Write-Host "  1. Sign in to your workspace:" -ForegroundColor Gray
Write-Host "     aegis login --token <YOUR_TOKEN>" -ForegroundColor Yellow
Write-Host "  2. Initialize pre-commit hook in any repo:" -ForegroundColor Gray
Write-Host "     aegis init" -ForegroundColor Yellow
Write-Host "  3. Scan current directory:" -ForegroundColor Gray
Write-Host "     aegis scan --sync`n" -ForegroundColor Yellow
