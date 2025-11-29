# Simple validation test
$baseUrl = "http://localhost:3000"

Write-Host "`nTesting Badge Validation`n" -ForegroundColor Cyan

# Test with invalid address
Write-Host "Test: Invalid address 'invalid'" -ForegroundColor Yellow
$body = @{
    playerAddress = "invalid"
} | ConvertTo-Json -Compress

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/badges/mint" `
        -Method POST `
        -Headers @{ "Content-Type" = "application/json" } `
        -Body $body `
        -ErrorAction Stop
    
    Write-Host "Unexpected success:" -ForegroundColor Red
    $response | ConvertTo-Json
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "Status Code: $statusCode" -ForegroundColor $(if ($statusCode -eq 400) { "Green" } else { "Red" })
    
    try {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        $reader.Close()
        
        if ($responseBody) {
            $errorResponse = $responseBody | ConvertFrom-Json
            Write-Host "`nResponse:" -ForegroundColor White
            Write-Host "  success: $($errorResponse.success)" -ForegroundColor White
            Write-Host "  error: $($errorResponse.error)" -ForegroundColor White
            if ($errorResponse.code) {
                Write-Host "  code: $($errorResponse.code)" -ForegroundColor Cyan
                Write-Host "`n✅ Validation working! Error code present." -ForegroundColor Green
            } else {
                Write-Host "  ⚠️ No error code field" -ForegroundColor Yellow
            }
        } else {
            Write-Host "Empty response body" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "Could not parse error response: $_" -ForegroundColor Red
    }
}

Write-Host "`n"

