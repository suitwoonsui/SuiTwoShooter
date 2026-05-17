# Run package upgrade via Sui CLI (avoids SDK FeatureNotYetSupported).
# REQUIRED: Sui CLI 1.67+ for testnet protocol 114: choco upgrade sui -y (as Admin) or suiup install sui@testnet
# Run from PowerShell OUTSIDE Cursor (avoids "Unable to save config" / file lock).
# Uses the same key as deploy.js so the UpgradeCap owner signs the upgrade.

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

# UpgradeCap owner (must sign the upgrade); same as deploy.js wallet
$upgradeCapOwner = "0xccf281e7d5a183ff4b63339a4da42220f30653f46e475463e997793f80b56ea3"

# Use a writable config dir so CLI can save (avoids OneDrive/Cursor lock on project client.yaml)
$configDir = "$env:LOCALAPPDATA\SuiUpgrade"
if (-not (Test-Path $configDir)) {
    New-Item -ItemType Directory -Path $configDir -Force | Out-Null
}

$env:SUI_CONFIG_DIR = $configDir

# Ensure we use the key that owns the UpgradeCap (from deploy.js)
$deployJs = Join-Path $PSScriptRoot "deploy.js"
$needImport = $false
if (-not (Test-Path "$configDir\client.yaml")) {
    $needImport = $true
} else {
    $activeAddr = (sui client active-address 2>&1) -replace "`r`n?$", ""
    if ($activeAddr -ne $upgradeCapOwner) {
        $sw = sui client switch --address $upgradeCapOwner 2>&1
        if ($LASTEXITCODE -ne 0) { $needImport = $true }
    }
}

if ($needImport) {
    if (-not (Test-Path $deployJs)) {
        Write-Host "ERROR: deploy.js not found. Cannot import UpgradeCap owner key." -ForegroundColor Red
        exit 1
    }
    $content = Get-Content $deployJs -Raw
    if ($content -match "privateKey\s*=\s*['\`"](suiprivkey1[^'\`"]+)['\`"]") {
        $key = $Matches[1]
        Write-Host "Importing UpgradeCap owner key into SuiUpgrade config..." -ForegroundColor Cyan
        & sui keytool import $key ed25519 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Write-Host "ERROR: Failed to import key from deploy.js" -ForegroundColor Red
            exit 1
        }
        sui client switch --address $upgradeCapOwner 2>&1 | Out-Null
        sui client switch --env testnet 2>&1 | Out-Null
        Write-Host "Using address: $upgradeCapOwner" -ForegroundColor Green
    } else {
        Write-Host "ERROR: Could not find privateKey in deploy.js. Upgrade must be signed by $upgradeCapOwner" -ForegroundColor Red
        exit 1
    }
}

# Check CLI version (warn if old; testnet is protocol 114 / API 1.67)
$versionLine = sui --version 2>&1
if ($versionLine -notmatch "1\.(6[7-9]|[7-9][0-9])") {
    Write-Host "WARNING: Sui CLI should be 1.67+ for testnet protocol 114. Current: $versionLine" -ForegroundColor Yellow
    Write-Host "Run as Admin: choco upgrade sui -y  OR  suiup install sui@testnet" -ForegroundColor Yellow
}

# Read UpgradeCap from UPGRADE_CAP.json (single source of truth)
$capJson = Join-Path $PSScriptRoot "UPGRADE_CAP.json"
if (-not (Test-Path $capJson)) {
    Write-Host "ERROR: UPGRADE_CAP.json not found. Run deploy.js (fresh publish) first." -ForegroundColor Red
    exit 1
}
$cap = (Get-Content $capJson | ConvertFrom-Json).upgradeCapId
if (-not $cap) {
    Write-Host "ERROR: upgradeCapId not found in UPGRADE_CAP.json" -ForegroundColor Red
    exit 1
}
Write-Host "UpgradeCap from UPGRADE_CAP.json: $cap" -ForegroundColor Cyan
sui client upgrade --upgrade-capability $cap --gas-budget 500000000 .
