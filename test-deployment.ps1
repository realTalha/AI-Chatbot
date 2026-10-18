# Test Railway Deployment
$railwayUrl = "https://ai-chatbot-production-7d29.up.railway.app"

Write-Host "Testing Railway Deployment..." -ForegroundColor Cyan
Write-Host "URL: $railwayUrl" -ForegroundColor Yellow

# Test health endpoint
Write-Host "`nTesting /health endpoint..." -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$railwayUrl/health" -Method Get
    Write-Host "Success! Health check passed!" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json) -ForegroundColor White
} catch {
    Write-Host "Failed! Health check failed!" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

Write-Host "`nDeployment test complete!" -ForegroundColor Cyan
