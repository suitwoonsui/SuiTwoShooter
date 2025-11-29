# ==========================================
# Test Badge Service Validation
# ==========================================

$baseUrl = "http://localhost:3000"

Write-Host "`n🧪 Testing Badge Service Validation`n" -ForegroundColor Cyan

# Test 1: Invalid Address
Write-Host "Test 1: Invalid Address" -ForegroundColor Yellow
$body = @{
    playerAddress = "invalid"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/badges/mint" `
        -Method POST `
        -Headers @{ "Content-Type" = "application/json" } `
        -Body $body `
        -ErrorAction Stop
    
    Write-Host "❌ Expected 400 error, got: $($response.StatusCode)" -ForegroundColor Red
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 400) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        $errorResponse = $responseBody | ConvertFrom-Json
        
        Write-Host "✅ Got expected 400 error:" -ForegroundColor Green
        Write-Host "   Error: $($errorResponse.error)" -ForegroundColor White
        if ($errorResponse.code) {
            Write-Host "   Code: $($errorResponse.code)" -ForegroundColor Cyan
            Write-Host "   ✅ Validation is working! Error code present." -ForegroundColor Green
        } else {
            Write-Host "   ⚠️ No error code (old format)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "❌ Unexpected status code: $statusCode" -ForegroundColor Red
    }
}

Write-Host "`n" -NoNewline

# Test 2: Missing Address
Write-Host "Test 2: Missing Address" -ForegroundColor Yellow
$body = @{} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/badges/mint" `
        -Method POST `
        -Headers @{ "Content-Type" = "application/json" } `
        -Body $body `
        -ErrorAction Stop
    
    Write-Host "❌ Expected 400 error, got: $($response.StatusCode)" -ForegroundColor Red
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 400) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        $errorResponse = $responseBody | ConvertFrom-Json
        
        Write-Host "✅ Got expected 400 error:" -ForegroundColor Green
        Write-Host "   Error: $($errorResponse.error)" -ForegroundColor White
        if ($errorResponse.code) {
            Write-Host "   Code: $($errorResponse.code)" -ForegroundColor Cyan
            Write-Host "   ✅ Validation is working! Error code present." -ForegroundColor Green
        } else {
            Write-Host "   ⚠️ No error code (old format)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "❌ Unexpected status code: $statusCode" -ForegroundColor Red
    }
}

Write-Host "`n" -NoNewline

# Test 3: Invalid Tier (Upgrade endpoint)
Write-Host "Test 3: Invalid Tier (Upgrade)" -ForegroundColor Yellow
$body = @{
    playerAddress = "0xccf281e7d5a183ff4b63339a4da42220f30653f46e475463e997793f80b56ea3"
    badgeId = "0x92ad1cf65a99c73ad0d4199df0e25b798df64b1ec8ca6d65b7a3823630cd6c03"
    newTier = 99
    sessionId = "test"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/badges/upgrade" `
        -Method POST `
        -Headers @{ "Content-Type" = "application/json" } `
        -Body $body `
        -ErrorAction Stop
    
    Write-Host "❌ Expected 400 error, got: $($response.StatusCode)" -ForegroundColor Red
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 400) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        $errorResponse = $responseBody | ConvertFrom-Json
        
        Write-Host "✅ Got expected 400 error:" -ForegroundColor Green
        Write-Host "   Error: $($errorResponse.error)" -ForegroundColor White
        if ($errorResponse.code) {
            Write-Host "   Code: $($errorResponse.code)" -ForegroundColor Cyan
            Write-Host "   ✅ Validation is working! Error code present." -ForegroundColor Green
        } else {
            Write-Host "   ⚠️ No error code (old format)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "❌ Unexpected status code: $statusCode" -ForegroundColor Red
    }
}

Write-Host "`n" -NoNewline

# Test 4: Valid Address Format (Should work or give different error)
Write-Host "Test 4: Valid Address Format (but may not have badge)" -ForegroundColor Yellow
$body = @{
    playerAddress = "0xccf281e7d5a183ff4b63339a4da42220f30653f46e475463e997793f80b56ea3"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/badges/mint" `
        -Method POST `
        -Headers @{ "Content-Type" = "application/json" } `
        -Body $body `
        -ErrorAction Stop
    
    $result = $response.Content | ConvertFrom-Json
    if ($result.success) {
        Write-Host "✅ Request succeeded (validation passed)" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Request failed but validation passed:" -ForegroundColor Yellow
        Write-Host "   Error: $($result.error)" -ForegroundColor White
        Write-Host "   (This is a business logic error, not validation)" -ForegroundColor Gray
    }
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 400) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        $errorResponse = $responseBody | ConvertFrom-Json
        
        if ($errorResponse.code -eq "INVALID_ADDRESS") {
            Write-Host "❌ Validation failed (unexpected)" -ForegroundColor Red
        } else {
            Write-Host "✅ Validation passed (address format is valid)" -ForegroundColor Green
            Write-Host "   Error: $($errorResponse.error)" -ForegroundColor White
            Write-Host "   (This is a business logic error, not validation)" -ForegroundColor Gray
        }
    } else {
        Write-Host "✅ Request succeeded or different error" -ForegroundColor Yellow
    }
}

Write-Host "`n✅ Validation testing complete!`n" -ForegroundColor Cyan

