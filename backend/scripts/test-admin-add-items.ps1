# Test script for admin add items endpoint
# Usage: .\test-admin-add-items.ps1 -ApiKey "your-api-key-here"

param(
    [Parameter(Mandatory=$true)]
    [string]$ApiKey,
    
    [string]$PlayerAddress = "0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0",
    
    [string]$ItemId = "extraLives",
    
    [int]$Level = 2,
    
    [int]$Quantity = 1
)

$uri = "http://localhost:3000/api/store/admin/add-items"

$body = @{
    playerAddress = $PlayerAddress
    items = @(
        @{
            itemId = $ItemId
            level = $Level
            quantity = $Quantity
        }
    )
} | ConvertTo-Json

Write-Host "🧪 Testing admin add items endpoint..." -ForegroundColor Cyan
Write-Host "   Player: $PlayerAddress" -ForegroundColor Gray
Write-Host "   Item: $ItemId level $Level quantity $Quantity" -ForegroundColor Gray
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri $uri `
        -Method POST `
        -Headers @{
            "Content-Type" = "application/json"
            "Authorization" = "Bearer $ApiKey"
        } `
        -Body $body
    
    Write-Host "✅ Success!" -ForegroundColor Green
    Write-Host ""
    $response | ConvertTo-Json -Depth 10
    Write-Host ""
    Write-Host "Transaction Digest: $($response.digest)" -ForegroundColor Cyan
    
} catch {
    Write-Host "❌ Error occurred!" -ForegroundColor Red
    Write-Host ""
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Yellow
        Write-Host "Response: $responseBody" -ForegroundColor Yellow
    } else {
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

