# Menarium local preview setup (Windows PowerShell)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "Checking Docker..." -ForegroundColor Cyan
docker info *> $null
if ($LASTEXITCODE -ne 0) {
  Write-Host "Docker is not running. Start Docker Desktop, then run this script again." -ForegroundColor Red
  exit 1
}

Write-Host "Starting PostgreSQL and Redis..." -ForegroundColor Cyan
docker compose -f docker-compose.local.yml up -d
Start-Sleep -Seconds 10

$envPath = Join-Path $root ".env"
$dockerDb = 'DATABASE_URL="postgresql://menarium:menarium_local_password@localhost:5432/menarium2?schema=public"'
if (Test-Path $envPath) {
  $content = Get-Content $envPath -Raw
  if ($content -match 'DATABASE_URL=') {
    $content = $content -replace 'DATABASE_URL="[^"]*"', $dockerDb
  } else {
    $content = "$dockerDb`n$content"
  }
  if ($content -notmatch 'REDIS_URL=') {
    $content = "REDIS_URL=`"redis://localhost:6379`"`n$content"
  }
  Set-Content -Path $envPath -Value $content.TrimEnd() -NoNewline
  Add-Content -Path $envPath -Value "`n"
  Write-Host "Updated .env DATABASE_URL for Docker." -ForegroundColor Green
}

Write-Host "Applying migrations..." -ForegroundColor Cyan
npm run db:deploy
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Seeding demo data..." -ForegroundColor Cyan
npm run db:seed
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "Ready. Run: npm run dev" -ForegroundColor Green
Write-Host "Open: http://localhost:3000" -ForegroundColor Green
Write-Host "Demo: maria@menarium.ru / MenariumDemo2026!" -ForegroundColor Yellow
