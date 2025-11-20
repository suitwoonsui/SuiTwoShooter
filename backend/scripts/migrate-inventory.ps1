# PowerShell script to migrate player inventory from old store to new store
# Usage: 
#   With environment variables set: .\migrate-inventory.ps1 -PlayerAddress <player_address>
#   Override env vars: .\migrate-inventory.ps1 -PlayerAddress <player_address> -OldPackageId <package_id> -OldStoreObjectId <store_object_id>

param(
    [Parameter(Mandatory=$true)]
    [string]$PlayerAddress,
    
    [Parameter(Mandatory=$false)]
    [string]$OldPackageId,
    
    [Parameter(Mandatory=$false)]
    [string]$OldStoreObjectId,
    
    [Parameter(Mandatory=$false)]
    [string]$ApiUrl = "http://localhost:3000/api/store/migrate"
)

# Build request body - only include old store IDs if provided (otherwise API will use env vars)
$body = @{
    playerAddress = $PlayerAddress
}

if ($OldPackageId) {
    $body.oldPackageId = $OldPackageId
    Write-Host "📦 Using provided Old Package ID: $OldPackageId" -ForegroundColor Yellow
} else {
    Write-Host "📦 Using Old Package ID from environment variable (OLD_PREMIUM_STORE_CONTRACT_TESTNET)" -ForegroundColor Cyan
}

if ($OldStoreObjectId) {
    $body.oldStoreObjectId = $OldStoreObjectId
    Write-Host "📦 Using provided Old Store Object ID: $OldStoreObjectId" -ForegroundColor Yellow
} else {
    Write-Host "📦 Using Old Store Object ID from environment variable (OLD_PREMIUM_STORE_OBJECT_ID_TESTNET)" -ForegroundColor Cyan
}

$bodyJson = $body | ConvertTo-Json

Write-Host "🔄 Migrating inventory for player: $PlayerAddress" -ForegroundColor Cyan
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri $ApiUrl -Method POST -Body $bodyJson -ContentType "application/json"
    
    if ($response.success) {
        Write-Host "✅ Migration successful!" -ForegroundColor Green
        Write-Host "   Transaction Digest: $($response.digest)" -ForegroundColor Gray
        Write-Host "   Player: $($response.playerAddress)" -ForegroundColor Gray
        Write-Host "   Message: $($response.message)" -ForegroundColor Gray
    } else {
        Write-Host "❌ Migration failed: $($response.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error calling migration API:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    # Try to get more details from the error response
    if ($_.ErrorDetails.Message) {
        Write-Host "Details: $($_.ErrorDetails.Message)" -ForegroundColor Yellow
        try {
            $errorObj = $_.ErrorDetails.Message | ConvertFrom-Json
            if ($errorObj.error) {
                Write-Host "Error: $($errorObj.error)" -ForegroundColor Red
            }
            if ($errorObj.message) {
                Write-Host "Message: $($errorObj.message)" -ForegroundColor Yellow
            }
        } catch {
            # If it's not JSON, just show the raw message
        }
    }
    
    # Check if it's a web exception with response
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body: $responseBody" -ForegroundColor Yellow
    }
}

