# PowerShell script to migrate player inventory from old store to new store
# Usage: .\migrate-inventory.ps1 -OldPackageId <package_id> -OldStoreObjectId <store_object_id> -PlayerAddress <player_address>

param(
    [Parameter(Mandatory=$true)]
    [string]$OldPackageId,
    
    [Parameter(Mandatory=$true)]
    [string]$OldStoreObjectId,
    
    [Parameter(Mandatory=$true)]
    [string]$PlayerAddress
)

$apiUrl = "http://localhost:3000/api/store/migrate"

$body = @{
    playerAddress = $PlayerAddress
    oldPackageId = $OldPackageId
    oldStoreObjectId = $OldStoreObjectId
} | ConvertTo-Json

Write-Host "🔄 Migrating inventory for player: $PlayerAddress" -ForegroundColor Cyan
Write-Host "   Old Package: $OldPackageId" -ForegroundColor Gray
Write-Host "   Old Store: $OldStoreObjectId" -ForegroundColor Gray
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri $apiUrl -Method POST -Body $body -ContentType "application/json"
    
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
    if ($_.ErrorDetails.Message) {
        Write-Host "Details: $($_.ErrorDetails.Message)" -ForegroundColor Yellow
    }
}

