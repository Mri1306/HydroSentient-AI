$headers = @{
    "Content-Type" = "application/json"
    "X-API-Key" = "hydro-secret-key-123"
}

$body = @{
    timestamp = "2024-01-01"
    ph = 7.2
    Hardness = 200
    Solids = 20000
    Chloramines = 7.0
    Sulfate = 300
    Conductivity = 400
    Organic_carbon = 15
    Trihalomethanes = 60
    Turbidity = 3.5
    pressure = 20.0
} | ConvertTo-Json

# 1. Test Health Check
Write-Host "--- Testing /health ---"
Invoke-RestMethod -Uri "http://127.0.0.1:8000/health" -Method Get

# 2. Test Anomaly Prediction
Write-Host "`n--- Testing /predict-anomaly ---"
$response = Invoke-RestMethod -Uri "http://127.0.0.1:8000/predict-anomaly" -Method Post -Headers $headers -Body $body
$response | ConvertTo-Json -Depth 5
