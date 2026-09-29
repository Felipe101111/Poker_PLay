param(
  [Parameter(Mandatory = $true)]
  [string]$FrontendUrl,
  [Parameter(Mandatory = $true)]
  [string]$BackendUrl
)

$frontend = Invoke-WebRequest -Uri $FrontendUrl -UseBasicParsing
$health = Invoke-WebRequest -Uri "$BackendUrl/health" -UseBasicParsing
$healthBody = $health.Content | ConvertFrom-Json

if ($frontend.StatusCode -ne 200) {
  throw "Frontend returned HTTP $($frontend.StatusCode)"
}

if ($health.StatusCode -ne 200 -or $healthBody.status -ne 'ok' -or $healthBody.dependencies.database -ne 'ok') {
  throw "Backend health check failed: $($health.Content)"
}

Write-Output "Public deployment smoke check passed for $FrontendUrl"