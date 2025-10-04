$maxAttempts = 30
$attempt = 0

Write-Host "Waiting for App Runner service to be ready..." -ForegroundColor Yellow

while ($attempt -lt $maxAttempts) {
    $attempt++
    Write-Host "Checking status (attempt $attempt/$maxAttempts)..." -ForegroundColor Cyan

    $serviceInfo = aws apprunner describe-service `
        --service-arn "arn:aws:apprunner:us-east-1:772081360719:service/voicetrans-backend/ffc02867093a4b52817459e25f59f9c7" `
        --region us-east-1 | ConvertFrom-Json

    $status = $serviceInfo.Service.Status

    Write-Host "Status: $status" -ForegroundColor White

    if ($status -eq "RUNNING") {
        $url = "https://" + $serviceInfo.Service.ServiceUrl
        Write-Host "`n=== Service Running! ===" -ForegroundColor Green
        Write-Host "Backend URL: $url" -ForegroundColor Cyan
        Write-Output $url | Out-File -FilePath "backend-url.txt" -Encoding utf8
        exit 0
    }

    Start-Sleep -Seconds 10
}

Write-Host "`nTimeout. Check AWS Console." -ForegroundColor Red
exit 1
